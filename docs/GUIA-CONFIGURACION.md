# Guía para poner en línea los cursos de En Modo Video

**Estructura final del dominio**

| Dirección | Qué es | Carpeta |
|---|---|---|
| `www.enmodovideo.com` | Página principal de la marca (Cursos, Tutos, Talleres, Reels) + redirecciones del WordPress viejo | `principal/` |
| `cursos.enmodovideo.com` | Tienda y aula de los cursos (esta app) | `app/` |
| `tutos.enmodovideo.com` | Membresía de tutoriales (no cambia) | `WEB TUTORIALES` |
| `talleres.enmodovideo.com` | Talleres en vivo (no cambia) | `TALLERES` |

Sigue los pasos en orden. Ninguna clave se pega en un chat: todas van en el archivo `.env.local`
(para probar en tu computadora) y en **Vercel → Settings → Environment Variables** (producción).

---

## 1. Supabase (base de datos y cuentas)

1. Entra a [supabase.com](https://supabase.com) y crea un **proyecto nuevo** (ej. `enmodovideo-cursos`), región *South America (São Paulo)*.
2. **SQL Editor** → ejecuta, uno por uno y en este orden, el contenido de:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_rls.sql`
   4. `supabase/migrations/0004_storage.sql`
   5. `supabase/seed/0101_cursos.sql` → crea los 2 cursos, 24 módulos, 93 clases y los cupones TIKTOK30, TRIBU30 y TIKTOK50.
   6. `supabase/privado/0102_alumnos.sql` → los 28 alumnos migrados, su avance y el historial de ventas. ⚠️ Este archivo tiene datos personales: no lo subas a GitHub (ya está en `.gitignore`).
3. **Project Settings → API**: copia `Project URL`, `anon public` y `service_role` a `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
4. **Authentication → URL Configuration**
   - Site URL: `https://cursos.enmodovideo.com`
   - Redirect URLs: `https://cursos.enmodovideo.com/**` y `http://localhost:3000/**`
5. **Authentication → Email Templates** (para que los enlaces funcionen aunque se abran en otra app):
   - *Confirm signup*: el botón debe apuntar a `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup`
   - *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   - Puedes reutilizar los diseños de `supabase/email-templates/` (los mismos de tutos).

## 2. Iniciar sesión con Google

1. [console.cloud.google.com](https://console.cloud.google.com) → puedes usar el mismo proyecto de tutos → **APIs y servicios → Credenciales → Crear ID de cliente OAuth** (Aplicación web).
2. *URI de redireccionamiento autorizado*: `https://<tu-proyecto>.supabase.co/auth/v1/callback` (Supabase te lo muestra en Authentication → Providers → Google).
3. Pega el *Client ID* y el *Client secret* en **Supabase → Authentication → Providers → Google** y actívalo.

## 3. Bunny Stream (videos)

Los cursos usan la biblioteca cuyo CDN es `vz-e1730be6-c02.b-cdn.net` (distinta a la de tutos).

1. **Stream → esa biblioteca → API**: copia el *Library ID* → `BUNNY_LIBRARY_ID`.
2. **Security**: copia la *Embed view token authentication key* → `BUNNY_TOKEN_AUTH_KEY`.
3. ⚠️ **Activa "Embed view token authentication" SOLO cuando la nueva web ya esté en línea.** El WordPress actual usa los enlaces públicos `.m3u8` y dejaría de mostrar los videos. Hoy cualquiera con el enlace puede verlos; al activarlo, solo los alumnos con acceso.
4. En **Allowed domains** agrega `cursos.enmodovideo.com` (y quita `www.enmodovideo.com` cuando ya no exista el WordPress).

## 4. PayPal (cobros)

1. [developer.paypal.com](https://developer.paypal.com) con tu cuenta **Business** → **Apps & Credentials**.
2. Primero en **Sandbox**: crea una app → copia *Client ID* y *Secret* → `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_MODE=sandbox`.
3. En la app → **Webhooks → Add webhook**:
   - URL: `https://cursos.enmodovideo.com/api/paypal/webhook`
   - Eventos: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`
   - Copia el *Webhook ID* → `PAYPAL_WEBHOOK_ID`.
4. Prueba una compra con una cuenta de prueba del sandbox. Cuando todo funcione, repite los pasos 2 y 3 en **Live** y cambia `PAYPAL_MODE=live`.

## 5. Resend (correos)

Usa la misma cuenta y dominio de tutos: `RESEND_API_KEY` y `EMAIL_FROM=En Modo Video <hola@enmodovideo.com>`.
Envía: confirmación de compra al alumno, aviso de venta a `ADMIN_EMAIL`, accesos dados desde el panel y el aviso a los migrados.

## 6. Vercel y el dominio (Namecheap)

Son **dos proyectos** en Vercel, ambos gratis.

**A. Cursos (`app/`)**
1. Sube la carpeta `app` a un repositorio privado de GitHub e impórtalo en [vercel.com](https://vercel.com).
2. **Settings → Environment Variables**: todas las de `.env.example`, con `NEXT_PUBLIC_SITE_URL=https://cursos.enmodovideo.com`.
3. **Settings → Domains** → agrega `cursos.enmodovideo.com`.

**B. Página principal (`principal/`)**
1. Sube la carpeta `principal` a otro repositorio e impórtalo en Vercel (Framework: *Other*, sin comando de build).
2. **Settings → Domains** → agrega `www.enmodovideo.com` y `enmodovideo.com` (marca este último para que redirija al www).
3. Las redirecciones de `principal/vercel.json` llevan los enlaces viejos del WordPress a los cursos nuevos
   (ej. `/courses/capcut-para-celular/` → `cursos.enmodovideo.com/cursos/capcut-celular`), así no se rompen los links de TikTok, Google o correos.

**C. DNS en Namecheap** (Domain List → enmodovideo.com → Advanced DNS)

1. **Hoy mismo** (no afecta al WordPress): agrega `CNAME` `cursos` → `cname.vercel-dns.com`. Así puedes probar la tienda nueva con PayPal en modo prueba mientras el WordPress sigue funcionando.
2. **El día del cambio** (después de un último backup del WordPress):
   - `CNAME` `www` → `cname.vercel-dns.com`
   - `A` `@` → `76.76.21.21`
3. ⚠️ **No toques** los registros de `tutos`, `talleres` y `edicion`, ni los de correo (MX/TXT de Resend).
4. El cambio tarda de minutos a unas horas. Después cancela el hosting del WordPress solo cuando confirmes que todo funciona.

## 7. Primer ingreso y migración de alumnos

1. Entra a la web con tu correo de `ADMIN_EMAIL`: quedarás como administrador y verás el botón **Admin**.
2. **Admin → Dar acceso**: verás los accesos migrados pendientes. Pulsa **Enviar aviso** para que los alumnos reciban el correo "tu curso ya está en la nueva plataforma". Se envía una sola vez por persona.
3. Cuando cada alumno entra con Google o crea su cuenta **con el mismo correo**, recibe automáticamente su curso, su avance y su historial de compras.
4. Si alguien compró con otro correo: **Admin → Dar acceso**, escribe su correo nuevo y elige el curso.
5. Ya con la web en línea, activa el token de Bunny (paso 3.3).

## 8. Probar en tu computadora (opcional)

```bash
cd app
cp .env.example .env.local   # y completa los valores
npm install
npm run dev
```

Sin Supabase configurado, la web muestra igual el catálogo y el temario migrados (modo vista previa) para revisar el diseño.
El pago, el login y los videos necesitan las claves.

---

## Qué hace cada sección del panel

| Sección | Para qué |
|---|---|
| Inicio | Ventas de 30 días, totales, alumnos y ventas por curso |
| Cursos | Datos de venta, portada, precio y promoción (con fecha de fin), temario: módulos y clases, video de Bunny, clase gratis, publicar u ocultar |
| Ventas | Todos los pedidos, filtros, exportar a Excel (CSV) y reembolsar **solo cobros duplicados o por error** (devuelve el dinero por PayPal y quita el acceso) |
| Cupones y promos | Crear cupones (% o monto fijo, por curso, usos máximos, fechas), pausar, y copiar un enlace de compra con el cupón ya aplicado |
| Alumnos | Buscar, ver cursos y avance, dar o quitar acceso, bloquear la cuenta, cerrar su sesión |
| Dar acceso | Regalar cursos o registrar pagos por otro medio (Yape, transferencia), incluso a correos sin cuenta, y avisar a los migrados |
| Admins / Auditoría | Quién administra y el registro de cada acción |
