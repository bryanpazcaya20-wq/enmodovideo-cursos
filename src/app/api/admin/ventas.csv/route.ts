import { NextResponse, type NextRequest } from "next/server";
import { AdminError, assertAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Evita fórmulas al abrir en Excel y escapa comillas
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

// Exporta las ventas (con los mismos filtros de la página) para Excel / Google Sheets.
export async function GET(req: NextRequest) {
  try {
    await assertAdmin();
  } catch (e) {
    return NextResponse.json({ error: e instanceof AdminError ? e.message : "No autorizado" }, { status: 403 });
  }
  const estado = req.nextUrl.searchParams.get("estado") ?? "paid";
  const curso = req.nextUrl.searchParams.get("curso");

  const admin = createAdminClient();
  let query = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(5000);
  if (estado !== "all") query = query.eq("status", estado as "paid");
  if (curso) query = query.eq("course_id", curso);
  const [{ data: orders }, { data: courses }, { data: people }] = await Promise.all([
    query,
    admin.from("courses").select("id, title"),
    admin.from("profiles").select("id, email, full_name"),
  ]);
  const title = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const person = new Map((people ?? []).map((p) => [p.id, p]));

  const header = ["fecha_pago", "estado", "curso", "alumno", "correo", "correo_paypal", "precio", "descuento", "cupon", "total_usd", "medio", "id_pedido", "id_captura_paypal"];
  const rows = (orders ?? []).map((o) => {
    const p = o.user_id ? person.get(o.user_id) : null;
    return [
      o.paid_at ?? o.created_at,
      o.status,
      (o.course_id && title.get(o.course_id)) ?? "",
      p?.full_name ?? "",
      p?.email ?? "",
      o.payer_email ?? "",
      o.list_price,
      o.discount,
      o.coupon_code ?? "",
      o.amount,
      o.provider,
      o.id,
      o.paypal_capture_id ?? "",
    ].map(cell).join(",");
  });
  const csv = "﻿" + [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
