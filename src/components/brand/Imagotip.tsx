// Imagotip: "La" en cursiva (Gwendolyn) i "Carmanyola" a sota.

interface Props {
  className?: string;
  versio?: "granat" | "groc";
}

export function Imagotip({ className = "", versio = "granat" }: Props) {
  const color = versio === "granat" ? "text-granat" : "text-groc";
  return (
    <span className={`relative inline-block leading-none ${color} ${className}`}>
      <span aria-hidden className="absolute -top-2.5 -left-1 font-logo text-[0.8em]">
        La
      </span>
      <span aria-hidden className="font-titol text-[1.45em] tracking-tight">Carmanyola</span>
      <span className="sr-only">La Carmanyola</span>
    </span>
  );
}
