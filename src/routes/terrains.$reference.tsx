import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Compass, FileText, Maximize, Navigation, Share2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLotByReference, submitReservationRequest } from "@/lib/catalogue.functions";
import { ALL_DURATIONS, computePlan, formatFcfa, type PlanDuration } from "@/lib/pricing";

const statusLabel = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
} as const;

export const Route = createFileRoute("/terrains/$reference")({
  loader: async ({ params }) => {
    const lot = await getLotByReference({ data: { reference: params.reference } });
    if (!lot) throw notFound();
    return { lot };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Terrain introuvable — Mon Lot" }, { name: "robots", content: "noindex" }],
      };
    }
    const { lot } = loaderData;
    const title = `${lot.title} ${lot.reference} — ${lot.area_name}, ${lot.city} | Mon Lot`;
    const description = `${lot.area_sqm} m² à ${lot.area_name} (${lot.city}). Prix comptant ${formatFcfa(
      lot.cash_price,
    )} ou paiement échelonné sur 3 à 12 mois.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: TerrainIntrouvable,
  component: FicheTerrain,
});

function TerrainIntrouvable() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">Ce terrain n'est plus référencé</h1>
        <p className="mt-3 text-muted-foreground">
          La référence demandée n'existe pas ou a été retirée du catalogue.
        </p>
        <Link
          to="/terrains"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-dark"
        >
          Retour au catalogue
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

function FicheTerrain() {
  const { lot } = Route.useLoaderData();
  const sendReservation = useServerFn(submitReservationRequest);
  const [duree, setDuree] = useState<PlanDuration>(0);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationState, setReservationState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [reservationError, setReservationError] = useState("");
  async function handleReservationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReservationState("sending");
    setReservationError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await sendReservation({ data: {
        reference: lot.reference,
        duration: duree,
        fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        message: String(form.get("message") ?? ""),
      } });
      formElement.reset();
      setReservationState("success");
    } catch (error) {
      setReservationError(error instanceof Error ? error.message : "Votre demande n’a pas pu être enregistrée.");
      setReservationState("error");
    }
  }
  const plan = computePlan(lot.cash_price, duree);
  const achetable = lot.status === "disponible";
  const hasCoordinates = lot.latitude !== null && lot.longitude !== null;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/terrains"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Catalogue
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={lot.cover_image_url}
                alt={`${lot.title} — ${lot.area_name}, ${lot.city}`}
                width={1200}
                height={800}
                className="aspect-[3/2] w-full object-cover"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${lot.status === "disponible" ? "bg-primary text-primary-foreground" : lot.status === "reserve" ? "bg-sand text-sand-foreground" : "bg-muted text-muted-foreground"}`}>
                {statusLabel[lot.status]}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Réf. {lot.reference}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{lot.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-muted-foreground">
              <Compass className="size-4" aria-hidden="true" />
              {lot.area_name}, {lot.city}{lot.region ? ` — ${lot.region}` : ""}
            </p>

            <dl className={`mt-8 grid gap-4 ${hasCoordinates ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <div className="surface-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Superficie</dt>
                <dd className="mt-1 flex items-center gap-2 text-lg font-semibold">
                  <Maximize className="size-4 text-primary" aria-hidden="true" />
                  {lot.area_sqm.toLocaleString("fr-FR")} m²
                </dd>
              </div>
              <div className="surface-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Ville</dt>
                <dd className="mt-1 text-lg font-semibold">{lot.city}</dd>
              </div>
              {hasCoordinates ? (
                <div className="surface-card p-4">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Coordonnées GPS</dt>
                  <dd className="mt-1 text-sm font-semibold">{lot.latitude!.toFixed(5)}, {lot.longitude!.toFixed(5)}</dd>
                </div>
              ) : null}
            </dl>

            <section className="mt-10">
              <h2 className="text-xl font-semibold">Description</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{lot.description}</p>
              {lot.access_details ? <>
                <h3 className="mt-6 text-lg font-semibold">Accès</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{lot.access_details}</p>
              </> : null}
            </section>

            {lot.documents.length ? (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">Documents annoncés</h2>
                <ul className="mt-4 space-y-2">
                  {lot.documents.map((document) => (
                    <li key={document} className="flex items-center gap-2 text-sm">
                      <FileText className="size-4 text-primary" aria-hidden="true" />
                      {document}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasCoordinates ? (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">Localisation</h2>
                <div className="surface-card mt-4 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">Consultez l’itinéraire vers la localisation renseignée pour ce terrain.</p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lot.latitude},${lot.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                  >
                    <Navigation className="size-4" aria-hidden="true" /> Ouvrir la navigation
                  </a>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="surface-card p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Prix comptant officiel</p>
              <p className="mt-1 font-display text-3xl font-semibold text-primary">{formatFcfa(lot.cash_price)}</p>

              <p className="mt-6 text-sm font-semibold">Choisissez votre formule</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {ALL_DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setDuree(duration)}
                    aria-pressed={duree === duration}
                    className={`h-11 rounded-lg border text-sm font-semibold transition-colors ${duree === duration ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}
                  >
                    {duration === 0 ? "Cash" : `${duration}m`}
                  </button>
                ))}
              </div>

              <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Prix total de la formule</dt>
                  <dd className="font-semibold">{formatFcfa(plan.total)}</dd>
                </div>
                {duree !== 0 ? <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Premier versement (30 %)</dt>
                    <dd className="font-semibold">{formatFcfa(plan.reservation)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Solde à payer</dt>
                    <dd className="font-semibold">{formatFcfa(plan.balance)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Échéance mensuelle</dt>
                    <dd className="font-semibold">{formatFcfa(plan.monthly)} × {plan.duration}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Dernière échéance ajustée</dt>
                    <dd className="font-semibold">{formatFcfa(plan.lastInstallment)}</dd>
                  </div>
                </> : null}
              </dl>

              {achetable ? (
                <button
                  type="button"
                  onClick={() => { setReservationOpen((open) => !open); setReservationState("idle"); }}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-dark"
                  aria-expanded={reservationOpen}
                >
                  {reservationOpen ? "Fermer le formulaire" : duree === 0 ? "Demander l’achat" : "Demander une réservation"}
                </button>
              ) : (
                <p className="mt-6 rounded-lg bg-muted p-4 text-center text-sm font-medium text-muted-foreground">
                  Ce terrain n'est plus disponible à l'achat.
                </p>
              )}
              {reservationOpen && achetable ? (
                <form onSubmit={handleReservationSubmit} className="mt-5 space-y-3 border-t border-border pt-5">
                  <h3 className="font-semibold">{duree === 0 ? "Demande d’achat au comptant" : "Demande de réservation"}</h3>
                  <p className="text-xs text-muted-foreground">Réf. {lot.reference} · {duree === 0 ? "Comptant" : `${duree} mois`} · Total {formatFcfa(plan.total)}</p>
                  <label className="block text-sm font-medium">Nom complet
                    <input name="fullName" required minLength={2} maxLength={100} autoComplete="name" className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm" />
                  </label>
                  <label className="block text-sm font-medium">Téléphone
                    <input name="phone" required minLength={8} maxLength={30} type="tel" autoComplete="tel" className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm" />
                  </label>
                  <label className="block text-sm font-medium">Email (facultatif)
                    <input name="email" type="email" maxLength={254} autoComplete="email" className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm" />
                  </label>
                  <label className="block text-sm font-medium">Message (facultatif)
                    <textarea name="message" maxLength={1500} rows={3} className="mt-1.5 w-full rounded-lg border border-input bg-card p-3 text-sm" />
                  </label>
                  <button type="submit" disabled={reservationState === "sending"} className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {reservationState === "sending" ? "Transmission…" : "Transmettre ma demande"}
                  </button>
                  {reservationState === "success" ? <p role="status" className="text-sm font-medium text-primary">Votre demande a été enregistrée. Notre équipe vous recontactera pour la suite.</p> : null}
                  {reservationState === "error" ? <p role="alert" className="text-sm font-medium text-destructive">{reservationError}</p> : null}
                  <p className="text-xs leading-relaxed text-muted-foreground">Cette demande ne constitue pas une réservation définitive ni une attribution du terrain. Elle sera examinée par notre équipe.</p>
                </form>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    void navigator.share({ title: `${lot.title} — ${lot.reference}`, url: window.location.href });
                  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                    void navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary"
              >
                <Share2 className="size-4" aria-hidden="true" /> Partager la fiche
              </button>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
