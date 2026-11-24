-- =============================================================
-- En Modo Video · Cursos — 0005: archivos descargables
-- Bucket público "course-files": material descargable de las clases (zip, pdf).
-- Cada archivo va en una ruta con un código al azar
-- (p. ej. paginas-web/<código>/archivo.zip) y el enlace solo aparece dentro
-- de la clase, que ven únicamente quienes tienen el curso.
-- Ya aplicado en producción el 24-11-2026.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-files', 'course-files', true, 50 * 1024 * 1024, array['application/zip', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
