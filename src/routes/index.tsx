import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, MapPin, MessageCircle, ShieldCheck } from "lucide-react";

import { LotCard } from "@/components/lot-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listFeaturedLots } from "@/lib/catalogue.functions";
import { SITE } from "@/lib/site";
import heroTerrain from "@/assets/hero-terrain.jpg";

const title = "Mon Lot — Terrains en Côte d’Ivoire";
const description =
  "Trouvez votre terrain en Côte d’Ivoire et choisissez un paiement au comptant ou échelonné jusqu’à 12 mois.";

export const Route = createFileRoute("/")({
  loader: () => listFeaturedLots(),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Accueil,
});

const avantages = [
  { icon: ShieldCheck, titre: "Des offres vérifiées", texte: "Chaque terrain publié est contrôlé avant sa mise en vente." },
  { icon: CalendarClock, titre: "Des paiements souples", texte: "Choisissez le comptant ou une formule sur 3, 6, 9 ou 12 mois." },
  { icon: MapPin, titre: "Des informations claires", texte: "Consultez la superficie, l’emplacement, l’accès et les documents annoncés." },
];

function Accueil() {
  const featured = Route.useLoaderData();

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <section className="relative isolate min-h-[72vh] overflow-hidden bg-primary-dark text-primary-foreground">
          <img src={featured[0]?.cover_image_url || heroTerrain} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = heroTerrain; }} alt="" className="absolute inset-0 -z-20 size-full object-cover opacity-65" />
          <div className="hero-overlay absolute inset-0 -z-10" />
          <div className="mx-auto flex min-h-[72vh] w-full max-w-6xl items-center px-4 py-20 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-sand">Terrains en Côte d’Ivoire</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">Votre terrain, votre avenir.</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
                Mon Lot vous accompagne pour choisir un terrain adapté à votre projet et à votre budget.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/terrains" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-sand px-6 font-semibold text-sand-foreground">
                  Découvrir les terrains <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a href={SITE.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-primary-foreground/40 px-6 font-semibold">
                  <MessageCircle className="size-4" aria-hidden="true" /> Parler à un conseiller
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Mon Lot</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Achetez avec confiance</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">Un accompagnement humain, des informations utiles et des modalités de paiement lisibles à chaque étape.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {avantages.map(({ icon: Icon, titre, texte }) => (
                <article key={titre} className="border-t-2 border-primary pt-5">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{texte}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-secondary/60 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-sm font-semibold uppercase text-primary">Sélection</p><h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Terrains à la une</h2></div>
              <Link to="/terrains" className="inline-flex items-center gap-2 font-semibold text-primary">Voir le catalogue <ArrowRight className="size-4" /></Link>
            </div>
            {featured.some((lot) => lot.is_demo) ? <p className="mt-6 rounded-lg border border-sand/60 bg-sand/10 px-4 py-3 text-sm text-muted-foreground">Mode démonstration : ces annonces, prix et caractéristiques sont fictifs. Les offres réelles seront publiées après validation par l’équipe Mon Lot.</p> : null}{featured.length ? <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.slice(0, 3).map((lot) => <LotCard key={lot.id} lot={lot} demo={Boolean(lot.is_demo)} />)}</div> : <div className="mt-9 border border-dashed border-border bg-background/70 p-8 text-center"><h3 className="text-lg font-semibold">Notre sélection arrive bientôt</h3><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Aucun terrain n’est actuellement publié. Revenez prochainement ou contactez notre équipe pour nous présenter votre recherche.</p><Link to="/contact" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Présenter mon projet</Link></div>}
          </div>
        </section>


        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-primary">Un parcours simple</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Comment ça marche ?</h2>
            <p className="mt-3 text-muted-foreground">De la recherche à la demande de réservation, Mon Lot vous accompagne à chaque étape.</p>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {[
              { number: "01", title: "Explorez les terrains", text: "Comparez les emplacements, superficies, photos et informations disponibles." },
              { number: "02", title: "Choisissez votre formule", text: "Consultez le prix comptant et simulez les possibilités de paiement échelonné." },
              { number: "03", title: "Échangez avec l’équipe", text: "Transmettez votre demande et faites-vous accompagner pour les vérifications et les étapes suivantes." },
            ].map((step) => (
              <article key={step.number} className="surface-card p-6">
                <span className="font-display text-3xl font-semibold text-sand">{step.number}</span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 bg-primary-dark p-8 text-primary-foreground sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><h2 className="text-3xl font-semibold">Un projet de terrain ?</h2><p className="mt-3 max-w-2xl text-primary-foreground/80">Notre équipe vous aide à préciser votre budget, votre zone et votre formule de paiement.</p></div>
            <Link to="/contact" className="inline-flex h-12 items-center justify-center rounded-lg bg-sand px-6 font-semibold text-sand-foreground">Nous contacter</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}