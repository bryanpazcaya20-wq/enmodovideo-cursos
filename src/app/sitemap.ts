import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/courses/public";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getCatalog();
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    ...courses.map((c) => ({ url: `${siteUrl}/cursos/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...["/ingresar", "/registro", "/terminos", "/privacidad", "/reembolsos"].map((path) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
