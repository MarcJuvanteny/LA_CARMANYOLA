import { cx } from "@/components/panel/ui";

export interface Barra {
  etiqueta: string;
  actual: number;
  anterior: number;
}

interface Props {
  dades: Barra[];
  format: (v: number) => string;
  llegendaActual: string;
  llegendaAnterior: string;
  titolTaula: string;
  alcada?: number;
  className?: string;
}

/**
 * Barres aparellades: el període actual (granat) amb el context de l'anterior (rosa).
 * Etiqueta directa només a la barra actual; la resta, al tooltip i a la taula oculta.
 */
export function BarresComparades({
  dades,
  format,
  llegendaActual,
  llegendaAnterior,
  titolTaula,
  alcada = 210,
  className,
}: Props) {
  const max = Math.max(1, ...dades.flatMap((d) => [d.actual, d.anterior]));
  return (
    <div className={className}>
      <div className="flex items-end justify-around gap-2" style={{ height: alcada + 28 }} aria-hidden>
        {dades.map((d) => (
          <div key={d.etiqueta} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-tinta px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
              <span className="font-semibold">{d.etiqueta}</span> · {llegendaActual}: {format(d.actual)}
              <br />
              {llegendaAnterior}: {format(d.anterior)}
            </div>
            <div className="flex items-end gap-[3px]">
              <span
                className="w-[clamp(10px,2.4vw,30px)] rounded-t bg-rosa"
                style={{ height: Math.max(2, (d.anterior / max) * alcada) }}
              />
              <span className="relative flex w-[clamp(10px,2.4vw,30px)] flex-col items-center">
                {d.actual > 0 && (
                  <span className="absolute -top-6 whitespace-nowrap text-[0.72rem] text-tinta">{format(d.actual)}</span>
                )}
                <span
                  className={cx("w-full rounded-t", d.actual > 0 ? "bg-granat" : "bg-transparent")}
                  style={{ height: d.actual > 0 ? (d.actual / max) * alcada : 0 }}
                />
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-around gap-2 text-[0.78rem] text-suau" aria-hidden>
        {dades.map((d) => (
          <span key={d.etiqueta} className="flex-1 text-center">
            {d.etiqueta}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{titolTaula}</caption>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">{llegendaActual}</th>
            <th scope="col">{llegendaAnterior}</th>
          </tr>
        </thead>
        <tbody>
          {dades.map((d) => (
            <tr key={d.etiqueta}>
              <th scope="row">{d.etiqueta}</th>
              <td>{format(d.actual)}</td>
              <td>{format(d.anterior)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Llegenda({ items }: { items: { label: string; className: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-suau">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={cx("size-3 rounded-[3px]", i.className)} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
