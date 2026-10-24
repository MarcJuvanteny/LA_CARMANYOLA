import { redirect } from "next/navigation";

// La web pública encara no existeix: de moment, l'arrel porta al panell.
export default function Home() {
  redirect("/panel");
}
