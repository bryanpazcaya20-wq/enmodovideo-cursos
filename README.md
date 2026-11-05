# En Modo Video — Cursos (cursos.enmodovideo.com)

Venta de cursos de CapCut con pago único por PayPal, acceso inmediato y de por vida.
Next.js 16 · Supabase · PayPal Orders v2 · Bunny Stream · Resend · Vercel. Base y diseño heredados de tutos.enmodovideo.com.

- **Cómo ponerlo en línea (paso a paso): [docs/GUIA-CONFIGURACION.md](docs/GUIA-CONFIGURACION.md)**
- Base de datos: `supabase/migrations` (0001–0004) + `supabase/seed/0101_cursos.sql` (cursos migrados del WordPress)
- Alumnos migrados (datos personales, fuera de Git): `supabase/privado/`
- Variables de entorno: `.env.example` → `.env.local`

## Rutas

| Público | Alumno | Panel |
|---|---|---|
| `/` · `/cursos/[slug]` · `/terminos` · `/privacidad` · `/reembolsos` | `/mis-cursos` · `/aprender/[slug]/[clase]` · `/comprar/[slug]` · `/mi-cuenta` | `/admin` (cursos, ventas, cupones, alumnos, accesos, admins, auditoría) |

## Seguridad en resumen

- El precio y el cupón se calculan **siempre en el servidor**; el monto cobrado por PayPal se compara con el pedido antes de dar acceso.
- `fulfill_order` (Postgres) es atómico e idempotente: el navegador y el webhook pueden confirmar el mismo pago sin duplicar nada.
- Videos con URL firmada de Bunny (1 h) que solo se entrega a inscritos (RLS en `lesson_content`); clases marcadas como gratis, a todos.
- Una sola sesión activa por cuenta (heredado de tutos); los admins pueden cerrar la sesión de un alumno.

## Desarrollo

```bash
npm install
npm run dev
```
