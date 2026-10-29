// Isotip: el morter vist des de dalt, amb la C a dins (public/brand/isotip-*.svg).

interface Props {
  className?: string;
  /** "granat" (per defecte) o "groc" */
  versio?: "granat" | "groc";
  /** Text alternatiu; sense títol és decoratiu. */
  title?: string;
}

export function Isotip({ className = "size-5", versio = "granat", title }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG de marca, sense optimització d'imatge
    <img
      src={`/brand/isotip-${versio}.svg`}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      className={`inline-block object-contain ${className}`}
      draggable={false}
    />
  );
}
