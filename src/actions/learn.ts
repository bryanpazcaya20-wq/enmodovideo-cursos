"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({ lessonId: z.string().uuid(), courseId: z.string().uuid(), done: z.boolean() });

/** Marca o desmarca una clase como completada. RLS exige acceso al curso. */
export async function setLessonDoneAction(input: z.input<typeof Input>): Promise<{ ok: boolean; error?: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar." };

  const supabase = await createClient();
  const { lessonId, courseId, done } = parsed.data;
  const { error } = done
    ? await supabase
        .from("lesson_progress")
        .upsert({ user_id: user.id, lesson_id: lessonId, course_id: courseId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true })
    : await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  if (error) {
    console.error("[progreso]", error.message);
    return { ok: false, error: "No se pudo guardar tu avance." };
  }
  revalidatePath("/mis-cursos");
  return { ok: true };
}
