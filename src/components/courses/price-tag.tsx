import { currentPrice, formatUsd, saleActive, salePercent } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/database";

type Props = { course: Pick<Course, "price_usd" | "sale_price_usd" | "sale_ends_at">; size?: "md" | "lg"; className?: string };

/** Precio con la promoción (precio normal tachado y % de ahorro) si está vigente. */
export function PriceTag({ course, size = "md", className }: Props) {
  const onSale = saleActive(course);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-display font-semibold", size === "lg" ? "text-4xl" : "text-2xl")}>
        {formatUsd(currentPrice(course))}
      </span>
      <span className="text-xs font-medium text-subtle">USD</span>
      {onSale && (
        <>
          <span className={cn("text-muted line-through", size === "lg" ? "text-lg" : "text-sm")}>{formatUsd(course.price_usd)}</span>
          <span className="rounded-full bg-coral-soft px-2 py-0.5 text-xs font-bold text-coral">-{salePercent(course)}%</span>
        </>
      )}
    </div>
  );
}
