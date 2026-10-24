import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Isotip } from "@/components/brand/Isotip";
import { Rich } from "@/components/Rich";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/* ---------- Superfícies ---------- */

/** El que ja és de l'amo: targeta blanca. */
export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-targeta bg-white p-5 sm:p-6", className)} {...rest}>
      {children}
    </section>
  );
}

/** El que proposa o escriu la IA: targeta groga amb l'isotip. */
export function AiCard({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-targeta bg-groc p-5 sm:p-6", className)} {...rest}>
      {children}
    </section>
  );
}

export function AiEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("eyebrow flex items-center gap-2 text-granat", className)}>
      <Isotip className="size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function CardTitle({ children, className, as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" }) {
  return <Tag className={cx("text-xl text-tinta", className)}>{children}</Tag>;
}

/* ---------- Capçalera de pàgina ---------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-[2rem] text-tinta sm:text-[2.25rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-suau">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------- Botons ---------- */

type Variant = "primary" | "outline" | "ghost" | "soft";

const variants: Record<Variant, string> = {
  primary: "bg-granat text-groc hover:bg-granat-clar",
  outline: "border border-linia bg-white text-tinta hover:border-tinta/40",
  ghost: "border border-granat/30 text-granat hover:bg-granat/5",
  soft: "bg-groc text-granat hover:bg-groc-intens/60",
};

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className, ...rest }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cx(btnBase, variants[variant], className)} {...rest} />;
}

export function ButtonLink({ variant = "primary", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(btnBase, variants[variant], className)} {...rest} />;
}

/* ---------- Selector segmentat ---------- */

export interface Opcio<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Opcio<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx("inline-flex max-w-full overflow-x-auto rounded-full border border-linia bg-white p-1", className)}
    >
      {options.map((o) => {
        const actiu = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={actiu}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors",
              actiu ? "bg-tinta font-semibold text-white" : "text-tinta hover:bg-crema",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cx("ml-1", actiu ? "text-white/70" : "text-suau")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Peces petites ---------- */

export function Pill({ children, className, dashed }: { children: ReactNode; className?: string; dashed?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border bg-white px-3.5 py-1.5 text-[0.8rem] text-tinta",
        dashed ? "border-dashed border-suau/50" : "border-linia",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <Card className="!p-5">
      <p className="eyebrow text-tinta">{label}</p>
      <p className="font-titol mt-1.5 text-[2rem] leading-none text-tinta">{value}</p>
      <p className="mt-3 text-[0.82rem] text-suau">{note}</p>
    </Card>
  );
}

/** Llista numerada amb cercles granat: els "per què" de la IA. */
export function NumberedList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ol className={cx("space-y-3.5", className)}>
      {items.map((t, i) => (
        <li key={i} className="flex gap-3.5">
          <span
            aria-hidden
            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-granat text-xs font-semibold text-groc"
          >
            {i + 1}
          </span>
          <span className="text-[0.92rem] leading-relaxed">
            <Rich text={t} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Barra horitzontal (fracció 0-1). */
export function Meter({ value, className, label }: { value: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={cx("block h-1.5 overflow-hidden rounded-full bg-crema", className)}
    >
      <span className="block h-full rounded-full bg-granat" style={{ width: `${pct}%` }} />
    </span>
  );
}

/** Les 8 paraules del carnet. */
export function CarnetDots({ filled, total = 8, label }: { filled: number; total?: number; label: string }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx("size-2 rounded-full border border-granat", i < filled ? "bg-granat" : "bg-transparent")}
        />
      ))}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "grid h-5 min-w-5 place-items-center rounded-full bg-groc px-1.5 text-[0.7rem] font-semibold text-granat",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Taula amb scroll horitzontal propi en mòbil. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">{children}</div>;
}

export const th = "eyebrow px-2 pb-3 pt-1 text-left text-tinta first:pl-2";
export const td = "border-t border-linia px-2 py-3.5 align-middle";
