// Isotip: el morter vist des de dalt, amb la C a dins.
// Provisional en SVG fins que hi hagi els fitxers definitius a public/brand/.

interface Props {
  className?: string;
  /** "granat" (per defecte) o "groc" */
  versio?: "granat" | "groc";
  title?: string;
}

export function Isotip({ className = "size-5", versio = "granat", title }: Props) {
  const color = versio === "granat" ? "var(--color-granat)" : "var(--color-groc)";
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M16 2.5 L29.5 16 L16 29.5 L2.5 16 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="7.2" fill="none" stroke={color} strokeWidth="2" />
      <path
        d="M18.6 13.6 A3.4 3.4 0 1 0 18.6 18.4"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
