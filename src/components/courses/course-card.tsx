import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers, MonitorPlay, Smartphone } from "lucide-react";
import { PriceTag } from "@/components/courses/price-tag";
import { LEVEL_LABEL } from "@/lib/pricing";
import type { CourseCard as CourseCardData } from "@/lib/courses/public";

export function DeviceIcon({ label, className = "size-4" }: { label: string | null; className?: string }) {
  return /pc|computadora|mac/i.test(label ?? "") ? <MonitorPlay className={className} /> : <Smartphone className={className} />;
}

export function CourseCard({ course, priority }: { course: CourseCardData; priority?: boolean }) {
  return (
    <Link
      href={`/cursos/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-all hover:-translate-y-1 hover:border-violet/50 hover:shadow-[0_20px_50px_-20px_#a77bdb55]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {course.cover_url && (
          <Image
            src={course.cover_url}
            alt={course.title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-surface to-transparent" />
        {course.device_label && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-bg/80 px-3 py-1 text-xs font-semibold backdrop-blur">
            <DeviceIcon label={course.device_label} className="size-3.5" /> {course.device_label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-2xl font-semibold leading-tight">{course.title}</h3>
        {course.subtitle && <p className="text-sm leading-relaxed text-muted">{course.subtitle}</p>}
        <p className="flex items-center gap-3 text-xs text-subtle">
          <span className="inline-flex items-center gap-1"><Layers className="size-3.5" /> {course.modules_count} módulos</span>
          <span>·</span>
          <span>{course.lessons_count} clases</span>
          <span>·</span>
          <span>{LEVEL_LABEL[course.level]}</span>
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceTag course={course} />
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-coral">
            Ver curso <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
