import Image from "next/image";
import { CreditCard, Infinity as InfinityIcon, MessageCircle, MousePointerClick, PlayCircle, ShieldCheck, Smartphone, Sparkles, Zap } from "lucide-react";
import { CourseCard } from "@/components/courses/course-card";
import { LinkButton } from "@/components/ui/button";
import type { CourseCard as CourseCardData } from "@/lib/courses/public";
import { SITE, whatsappLink } from "@/lib/site";
import heroImage from "../../../public/landing/hero-cursos.webp";

// ---------- Portada ----------
export function Hero({ totalLessons, totalCourses }: { totalLessons: number; totalCourses: number }) {
  return (
    <section className="relative isolate -mt-16 overflow-hidden pt-16 lg:min-h-[44rem]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[80vw] [mask-image:linear-gradient(to_bottom,black_55%,transparent)] sm:h-[60vw] lg:inset-y-0 lg:h-auto lg:[mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
      >
        <Image src={heroImage} alt="" fill priority sizes="100vw" placeholder="blur" className="object-cover object-[75%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-bg/40 lg:bg-gradient-to-r lg:from-bg lg:via-bg/75 lg:to-bg/10" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-[56vw] sm:pt-[40vw] lg:pb-28 lg:pt-28">
        <div className="max-w-xl text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-bg/60 px-3.5 py-1.5 text-xs font-semibold text-violet backdrop-blur sm:text-sm">
            <Sparkles className="size-4" /> Cursos completos de CapCut
          </p>
          <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight drop-shadow-lg sm:text-6xl lg:text-7xl">
            De cero a <span className="text-gradient">editor pro</span> con CapCut
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted lg:mx-0">
            Cursos paso a paso para editar desde tu <strong className="text-text">celular</strong> o tu{" "}
            <strong className="text-text">PC</strong>. Paga una sola vez y aprende a tu ritmo, para siempre.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <LinkButton href="#cursos" size="lg" className="w-full sm:w-auto">
              Ver los cursos
            </LinkButton>
            <LinkButton href="#como-funciona" variant="secondary" size="lg" className="w-full backdrop-blur sm:w-auto">
              <PlayCircle className="size-4" /> Cómo funciona
            </LinkButton>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-subtle lg:justify-start">
            <ShieldCheck className="size-4 text-success" /> Pago único y seguro con PayPal · Acceso inmediato
          </p>

          <dl className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3 lg:mx-0">
            <Stat value={totalCourses > 0 ? String(totalCourses) : "📱 + 💻"} label={totalCourses > 0 ? "cursos completos" : "celular y PC"} />
            <Stat value={totalLessons > 0 ? `${totalLessons}+` : "100%"} label={totalLessons > 0 ? "clases en video" : "en español"} />
            <Stat value="∞" label="acceso de por vida" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 px-2 py-3 text-center backdrop-blur">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-xl font-semibold sm:text-2xl">{value}</dd>
      <dd className="mt-0.5 text-[11px] leading-tight text-subtle sm:text-xs">{label}</dd>
    </div>
  );
}

// ---------- Cursos ----------
export function CoursesSection({ courses }: { courses: CourseCardData[] }) {
  return (
    <section id="cursos" className="scroll-mt-20 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Nuestros cursos" title="Elige dónde quieres editar" description="Cada curso es completo por sí solo: empieza por el que tengas a la mano." />
        {courses.length ? (
          <div className={courses.length >= 3 ? "mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2"}>
            {courses.map((c, i) => (
              <CourseCard key={c.id} course={c} priority={i < 2} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted">Muy pronto publicaremos los cursos.</p>
        )}
      </div>
    </section>
  );
}

// ---------- Cómo funciona ----------
const STEPS = [
  { icon: MousePointerClick, title: "Elige tu curso", text: "Mira el temario completo y prueba la clase gratis antes de decidir." },
  { icon: CreditCard, title: "Paga con PayPal", text: "Pago único con tu cuenta PayPal o con tarjeta de débito o crédito. Sin suscripciones." },
  { icon: Zap, title: "Empieza al instante", text: "Ingresa con Google o tu correo y el curso aparece en «Mis cursos» de inmediato." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="Así de fácil" title="Cómo funciona" />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <span className="absolute right-5 top-5 font-display text-5xl font-semibold text-surface-2">{i + 1}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-coral to-violet text-white">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------- Beneficios ----------
const BENEFITS = [
  { icon: InfinityIcon, title: "Acceso de por vida", text: "Pagas una vez y el curso es tuyo, incluidas las actualizaciones." },
  { icon: Smartphone, title: "Desde cualquier dispositivo", text: "Mira las clases en tu celular, tablet o computadora." },
  { icon: PlayCircle, title: "Clases cortas y prácticas", text: "Videos al grano, con ejercicios reales y un proyecto final." },
  { icon: MessageCircle, title: "Soporte por WhatsApp", text: "¿Te trabaste? Escríbenos y te ayudamos." },
];

export function Benefits() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle align="left" eyebrow="Por qué con nosotros" title="Aprende haciendo, sin perder tiempo" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-border bg-surface/70 p-5">
                <Icon className="size-6 text-coral" />
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
          <Image src="/landing/celular.webp" alt="Editando en CapCut desde el celular" width={448} height={560} className="rounded-3xl border border-border object-cover shadow-2xl" />
          <Image src="/landing/pc.webp" alt="Editando en CapCut PC" width={550} height={415} className="mt-16 rounded-3xl border border-border object-cover shadow-2xl" />
        </div>
      </div>
    </section>
  );
}

// ---------- Preguntas frecuentes ----------
const FAQ = [
  {
    q: "¿Necesito experiencia previa?",
    a: "No. Los cursos empiezan desde cero: instalación, interfaz y primeros cortes. Avanzamos paso a paso hasta técnicas profesionales.",
  },
  {
    q: "¿Es un pago único o una suscripción?",
    a: "Es un pago único por curso. No hay cobros mensuales ni renovaciones automáticas.",
  },
  {
    q: "¿Puedo pagar sin cuenta de PayPal?",
    a: "Sí. En el botón de PayPal eliges «Tarjeta de débito o crédito» y pagas como invitado.",
  },
  {
    q: "¿Cuánto tiempo tengo acceso?",
    a: "De por vida. Puedes ver las clases cuantas veces quieras, a tu ritmo.",
  },
  {
    q: "Ya compré en la web anterior, ¿pierdo mi curso?",
    a: "No. Tu acceso ya está migrado: entra con Google o crea tu cuenta con el mismo correo con el que compraste y verás tu curso en «Mis cursos».",
  },
  {
    q: "¿Puedo pedir un reembolso?",
    a: "No. Al ser contenido digital con acceso inmediato, todas las ventas son finales. Por eso puedes ver el temario completo y una clase gratis antes de comprar.",
  },
  {
    q: "¿Puedo usar mi cuenta en varios dispositivos?",
    a: "Sí, pero en uno a la vez: al iniciar sesión en un dispositivo nuevo, se cierra la sesión anterior. La cuenta es personal.",
  },
];

export function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-20 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionTitle eyebrow="Resolvemos tus dudas" title="Preguntas frecuentes" />
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-border bg-surface px-5 open:bg-surface-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-lg leading-none text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-muted">
          ¿Otra pregunta?{" "}
          <a href={whatsappLink(`${SITE.whatsappSupportText} los cursos`)} target="_blank" rel="noopener noreferrer" className="font-semibold text-coral hover:text-coral-hover">
            Escríbenos por WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}

// ---------- Llamado final ----------
export function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-coral via-[#c4456b] to-purple p-8 text-center sm:p-14">
        <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">¿Listo para ponerte en modo video?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">Elige tu curso y empieza hoy mismo. Acceso inmediato y de por vida.</p>
        <LinkButton href="#cursos" size="lg" variant="secondary" className="mt-8 border-0 bg-white text-bg shadow-xl hover:bg-white/90">
          Elegir mi curso
        </LinkButton>
      </div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-coral">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-lg text-muted">{description}</p>}
    </div>
  );
}
