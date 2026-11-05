import { Benefits, CoursesSection, Faq, FinalCta, Hero, HowItWorks } from "@/components/landing/home-sections";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getCatalog } from "@/lib/courses/public";

// Estática: se regenera sola cada hora y al guardar un curso en el panel (etiqueta "courses").
export const revalidate = 3600;

export default async function HomePage() {
  const courses = await getCatalog();
  const totalLessons = courses.reduce((n, c) => n + c.lessons_count, 0);

  return (
    <div className="bg-brand-glow">
      <SiteHeader />
      <main>
        <Hero totalLessons={totalLessons} totalCourses={courses.length} />
        <CoursesSection courses={courses} />
        <HowItWorks />
        <Benefits />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
