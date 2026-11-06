import { redirect } from "next/navigation";

// Franges s'ha unit a Vendes: l'adreça antiga porta a la secció "Quan es ven".
export default function FrangesPage() {
  redirect("/panel/vendes#quan");
}
