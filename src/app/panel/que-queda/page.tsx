import { redirect } from "next/navigation";

// L'hora del Què Queda ara és dins de la Carta.
export default function QueQuedaPage() {
  redirect("/panel/carta#que-queda");
}
