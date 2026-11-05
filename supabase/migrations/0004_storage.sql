-- =============================================================
-- En Modo Video · Cursos — 0004: almacenamiento de imágenes
-- Bucket público "course-media": portadas e imágenes de los cursos.
-- Solo el servidor sube archivos (URL firmada que genera tras validar al admin).
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-media', 'course-media', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
