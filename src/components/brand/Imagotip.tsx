// Imagotip: "La" en cursiva i "Carmanyola" (public/brand/imagotip-*.svg).

interface Props {
  className?: string;
  versio?: "granat" | "groc";
}

export function Imagotip({ className = "h-7", versio = "granat" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG de marca, sense optimització d'imatge
    <img
      src={`/brand/imagotip-${versio}.svg`}
      alt="La Carmanyola"
      className={`block w-auto ${className}`}
      draggable={false}
    />
  );
}
