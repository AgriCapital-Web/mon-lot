import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { submitContactRequest } from "@/lib/catalogue.functions";
import { SITE } from "@/lib/site";

const title = "Contact — Mon Lot";
const description = "Contactez Mon Lot à Daloa pour votre projet d’achat de terrain en Côte d’Ivoire.";
export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Contact,
});

function Contact() {
  const submit = useServerFn(submitContactRequest);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const inputClass = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending"); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await submit({ data: { fullName: String(form.get("fullName") ?? ""), phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? ""), subject: String(form.get("subject") ?? ""), message: String(form.get("message") ?? ""), website: String(form.get("website") ?? "") } });
      formElement.reset(); setState("success");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Votre message n’a pas pu être envoyé."); setState("error"); }
  }
  return <div className="min-h-dvh"><SiteHeader /><main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
    <p className="text-sm font-semibold uppercase text-primary">Nous sommes à votre écoute</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Parlons de votre projet</h1><p className="mt-3 max-w-2xl text-muted-foreground">Dites-nous ce que vous recherchez. Un conseiller Mon Lot vous recontactera.</p>
    <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr]">
      <form onSubmit={handleSubmit} className="space-y-5 border-t-2 border-primary pt-6">
        <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">Ne pas remplir<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
        <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Nom complet<input name="fullName" required minLength={2} className={`${inputClass} mt-1.5`} /></label><label className="text-sm font-medium">Téléphone<input name="phone" type="tel" required minLength={8} className={`${inputClass} mt-1.5`} /></label></div>
        <label className="block text-sm font-medium">Email (facultatif)<input name="email" type="email" className={`${inputClass} mt-1.5`} /></label>
        <label className="block text-sm font-medium">Objet<input name="subject" required minLength={2} className={`${inputClass} mt-1.5`} placeholder="Recherche de terrain, visite…" /></label>
        <label className="block text-sm font-medium">Votre message<textarea name="message" rows={6} required minLength={5} className="mt-1.5 w-full rounded-lg border border-input bg-card p-3 text-sm" /></label>
        <Button type="submit" size="lg" disabled={state === "sending"}>{state === "sending" ? "Envoi en cours…" : "Envoyer ma demande"}</Button>
        {state === "success" ? <p role="status" className="font-medium text-primary">Merci. Votre demande a bien été transmise à notre équipe.</p> : null}
        {state === "error" ? <p role="alert" className="font-medium text-destructive">{error}</p> : null}
      </form>
      <aside className="bg-secondary p-7"><h2 className="text-xl font-semibold">Nous joindre directement</h2><ul className="mt-6 space-y-5 text-sm">
        <li><a href={SITE.phoneHref} className="flex items-center gap-3"><Phone className="size-5 text-primary" /> {SITE.phoneDisplay}</a></li>
        <li><a href={SITE.whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3"><MessageCircle className="size-5 text-primary" /> WhatsApp</a></li>
        <li><a href={SITE.emailHref} className="flex items-center gap-3"><Mail className="size-5 text-primary" /> {SITE.email}</a></li>
        <li className="flex items-center gap-3"><MapPin className="size-5 text-primary" /> {SITE.address}</li>
      </ul></aside>
    </div>
  </main><SiteFooter /></div>;
}