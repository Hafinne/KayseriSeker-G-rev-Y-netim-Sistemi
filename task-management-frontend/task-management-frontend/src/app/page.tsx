import { redirect } from "next/navigation";

export default function Home() {
  // Ana adrese gelen herkesi otomatik olarak login klasörüne yönlendirir
  redirect("/login");
}