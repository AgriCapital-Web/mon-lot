import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDeleteLot,
  adminListLots,
  adminListRequests,
  adminSaveLot,
  adminUpdateRequestStatus,
  getAdminContext,
  type AdminLotInput,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administration — Mon Lot" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

type AdminContext = Awaited<ReturnType<typeof getAdminContext>>;
type Lots = Awaited<ReturnType<typeof adminListLots>>;
type Requests = Awaited<ReturnType<typeof adminListRequests>>;

const emptyLot: AdminLotInput = {
  reference: "",
  title: "",
  city: "",
  area_name: "",
  region: "",
  area_sqm: 0,
  cash_price: 0,
  status: "disponible",
  cover_image_url: "",
  description: "",
  access_details: "",
  documents: [],
  latitude: null,
  longitude: null,
  is_featured: false,
  featured_priority: null,
  is_published: false,
};

const statusOptions = [
  ["nouvelle", "Nouvelle"],
  ["contactee", "Contactée"],
  ["traitee", "Traitée"],
  ["archivee", "Archivée"],
] as const;

function AdminPage() {
  const loadContext = useServerFn(getAdminContext);
  const loadLots = useServerFn(adminListLots);
  const loadRequests = useServerFn(adminListRequests);
  const saveLot = useServerFn(adminSaveLot);
  const deleteLot = useServerFn(adminDeleteLot);
  const updateRequest = useServerFn(adminUpdateRequestStatus);

  const [context, setContext] = useState<AdminContext | null>(null);
  const [lots, setLots] = useState<Lots>([]);
  const [requests, setRequests] = useState<Requests | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<AdminLotInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setError("");
    const nextContext = await loadContext();
    setContext(nextContext);
    if (!nextContext.isAdmin) {
      setLots([]);
      setRequests(null);
      return;
    }
    const [nextLots, nextRequests] = await Promise.all([loadLots(), loadRequests()]);
    setLots(nextLots);
    setRequests(nextRequests);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) await refresh();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Impossible de vérifier la session.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connexion impossible.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setContext(null);
      setLots([]);
      setRequests(null);
      setEditing(null);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  async function handleLotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    const numberOrNull = (value: FormDataEntryValue | null) => {
      const text = String(value ?? "").trim();
      return text ? Number(text) : null;
    };
    try {
      await saveLot({ data: {
        ...(editing?.id ? { id: editing.id } : {}),
        reference: String(form.get("reference") ?? "").trim(),
        title: String(form.get("title") ?? "").trim(),
        city: String(form.get("city") ?? "").trim(),
        area_name: String(form.get("area_name") ?? "").trim(),
        region: String(form.get("region") ?? "").trim(),
        area_sqm: Number(form.get("area_sqm")),
        cash_price: Number(form.get("cash_price")),
        status: String(form.get("status") ?? "disponible") as AdminLotInput["status"],
        cover_image_url: String(form.get("cover_image_url") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        access_details: String(form.get("access_details") ?? "").trim(),
        documents: String(form.get("documents") ?? "").split("\n").map((value) => value.trim()).filter(Boolean),
        latitude: numberOrNull(form.get("latitude")),
        longitude: numberOrNull(form.get("longitude")),
        is_featured: form.get("is_featured") === "on",
        featured_priority: numberOrNull(form.get("featured_priority")),
        is_published: form.get("is_published") === "on",
      } });
      setEditing(null);
      setNotice("Le terrain a été enregistré.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le terrain n’a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLot(id: string) {
    if (!window.confirm("Supprimer ce terrain ? Cette action peut être bloquée s’il possède des demandes liées.")) return;
    setBusy(true);
    setError("");
    try {
      await deleteLot({ data: { id } });
      setNotice("Terrain supprimé.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(table: "reservation_requests" | "contact_requests", id: string, status: string) {
    setBusy(true);
    setError("");
    try {
      await updateRequest({ data: { table, id, status: status as "nouvelle" | "contactee" | "traitee" | "archivee" } });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le statut n’a pas pu être modifié.");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
  const button = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60";

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Espace sécurisé</p>
            <h1 className="mt-1 text-3xl font-semibold">Administration Mon Lot</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gestion du catalogue et suivi des demandes.</p>
          </div>
          {context?.isAdmin ? <button type="button" onClick={handleLogout} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold"><LogOut className="size-4" /> Déconnexion</button> : null}
        </div>

        {error ? <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
        {notice ? <p role="status" className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">{notice}</p> : null}

        {loading ? <p className="py-16 text-center text-muted-foreground">Vérification de la session…</p> : null}

        {!loading && !context ? (
          <section className="mx-auto mt-12 max-w-md rounded-xl border border-border bg-card p-7 shadow-sm">
            <h2 className="text-xl font-semibold">Connexion administrateur</h2>
            <p className="mt-2 text-sm text-muted-foreground">Utilisez un compte Mon Lot disposant du rôle administrateur.</p>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">Adresse email<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className={field} /></label>
              <label className="block text-sm font-medium">Mot de passe<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={field} /></label>
              <button type="submit" disabled={busy} className={button}>{busy ? "Connexion…" : "Se connecter"}</button>
            </form>
          </section>
        ) : null}

        {!loading && context && !context.isAdmin ? (
          <section className="mt-12 rounded-xl border border-border bg-card p-7">
            <h2 className="text-xl font-semibold">Accès non autorisé</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ce compte est connecté, mais ne possède pas le rôle administrateur. Contactez le responsable de la plateforme.</p>
            <button type="button" onClick={handleLogout} className={button + " mt-5"}>Changer de compte</button>
          </section>
        ) : null}

        {!loading && context?.isAdmin ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Terrains</p><p className="mt-2 text-3xl font-semibold tabular-nums">{lots.length}</p></div>
              <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Publiés</p><p className="mt-2 text-3xl font-semibold tabular-nums">{lots.filter((lot) => lot.is_published).length}</p></div>
              <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Demandes reçues</p><p className="mt-2 text-3xl font-semibold tabular-nums">{(requests?.reservations.length ?? 0) + (requests?.contacts.length ?? 0)}</p></div>
            </section>

            <section className="mt-10 grid gap-8 xl:grid-cols-[1.1fr_1fr]">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Catalogue des terrains</h2><button type="button" onClick={() => setEditing({ ...emptyLot })} className={button}><Plus className="size-4" /> Nouveau terrain</button></div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead><tr className="border-b border-border text-muted-foreground"><th className="py-3 pr-3">Référence</th><th className="py-3 pr-3">Terrain</th><th className="py-3 pr-3">Statut</th><th className="py-3 pr-3">Publication</th><th className="py-3">Actions</th></tr></thead>
                    <tbody>{lots.map((lot) => <tr key={lot.id} className="border-b border-border/70"><td className="py-3 pr-3 font-semibold">{lot.reference}</td><td className="py-3 pr-3">{lot.title}<span className="block text-xs text-muted-foreground">{lot.city} · {lot.area_sqm.toLocaleString("fr-FR")} m²</span></td><td className="py-3 pr-3">{lot.status}</td><td className="py-3 pr-3">{lot.is_published ? "Publié" : "Brouillon"}</td><td className="py-3"><div className="flex gap-2"><button type="button" aria-label={"Modifier " + lot.reference} onClick={() => setEditing({ ...lot, region: lot.region ?? "", access_details: lot.access_details ?? "", documents: lot.documents ?? [] })} className="rounded-md border border-border p-2"><Pencil className="size-4" /></button><button type="button" aria-label={"Supprimer " + lot.reference} onClick={() => void handleDeleteLot(lot.id)} className="rounded-md border border-border p-2 text-destructive"><Trash2 className="size-4" /></button></div></td></tr>)}</tbody>
                  </table>
                  {!lots.length ? <p className="py-8 text-center text-sm text-muted-foreground">Aucun terrain enregistré.</p> : null}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-xl font-semibold">{editing?.id ? "Modifier un terrain" : editing ? "Créer un terrain" : "Fiche terrain"}</h2>
                {editing ? (
                  <form key={editing.id ?? "new"} onSubmit={handleLotSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Référence<input name="reference" required defaultValue={editing.reference} className={field} /></label>
                    <label className="text-sm font-medium">Titre<input name="title" required defaultValue={editing.title} className={field} /></label>
                    <label className="text-sm font-medium">Ville<input name="city" required defaultValue={editing.city} className={field} /></label>
                    <label className="text-sm font-medium">Zone / quartier<input name="area_name" required defaultValue={editing.area_name} className={field} /></label>
                    <label className="text-sm font-medium">Région<input name="region" defaultValue={editing.region ?? ""} className={field} /></label>
                    <label className="text-sm font-medium">Superficie (m²)<input name="area_sqm" type="number" min="1" required defaultValue={editing.area_sqm || ""} className={field} /></label>
                    <label className="text-sm font-medium">Prix comptant (FCFA)<input name="cash_price" type="number" min="1" required defaultValue={editing.cash_price || ""} className={field} /></label>
                    <label className="text-sm font-medium">Statut<select name="status" defaultValue={editing.status} className={field}><option value="disponible">Disponible</option><option value="reserve">Réservé</option><option value="vendu">Vendu</option></select></label>
                    <label className="text-sm font-medium sm:col-span-2">URL de l’image principale<input name="cover_image_url" type="url" required defaultValue={editing.cover_image_url} className={field} /></label>
                    <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" required minLength={10} rows={3} defaultValue={editing.description} className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm" /></label>
                    <label className="text-sm font-medium sm:col-span-2">Accès<textarea name="access_details" rows={2} defaultValue={editing.access_details ?? ""} className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm" /></label>
                    <label className="text-sm font-medium sm:col-span-2">Documents (un par ligne)<textarea name="documents" rows={2} defaultValue={(editing.documents ?? []).join("\n")} className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm" /></label>
                    <label className="text-sm font-medium">Latitude<input name="latitude" type="number" step="any" defaultValue={editing.latitude ?? ""} className={field} /></label>
                    <label className="text-sm font-medium">Longitude<input name="longitude" type="number" step="any" defaultValue={editing.longitude ?? ""} className={field} /></label>
                    <label className="text-sm font-medium">Priorité vedette<input name="featured_priority" type="number" min="1" defaultValue={editing.featured_priority ?? ""} className={field} /></label>
                    <div className="flex flex-wrap gap-4 sm:col-span-2"><label className="flex items-center gap-2 text-sm"><input name="is_featured" type="checkbox" defaultChecked={editing.is_featured} /> Mettre en vedette</label><label className="flex items-center gap-2 text-sm"><input name="is_published" type="checkbox" defaultChecked={editing.is_published} /> Publier</label></div>
                    <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={busy} className={button}><Save className="size-4" /> {busy ? "Enregistrement…" : "Enregistrer"}</button><button type="button" onClick={() => setEditing(null)} className="h-10 rounded-lg border border-border px-4 text-sm font-semibold">Annuler</button></div>
                  </form>
                ) : <p className="mt-4 text-sm text-muted-foreground">Sélectionnez un terrain à modifier ou créez une nouvelle fiche.</p>}
              </div>
            </section>

            <section className="mt-10 rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Demandes de réservation</h2><button type="button" onClick={() => void refresh()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm"><RefreshCw className="size-4" /> Actualiser</button></div>
              <div className="mt-4 space-y-3">{requests?.reservations.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-3"><div><p className="font-semibold">{item.full_name} · {item.lot_reference}</p><p className="text-xs text-muted-foreground">{item.phone} · {item.duration_months ? item.duration_months + " mois" : "Comptant"} · {Number(item.total_price).toLocaleString("fr-FR")} FCFA</p></div><select aria-label={"Statut demande " + item.lot_reference} value={item.status} onChange={(event) => void handleStatus("reservation_requests", item.id, event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">{statusOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></article>)}{!requests?.reservations.length ? <p className="py-5 text-sm text-muted-foreground">Aucune demande de réservation.</p> : null}</div>
            </section>

            <section className="mt-8 rounded-xl border border-border bg-card p-5">
              <h2 className="text-xl font-semibold">Demandes de contact</h2>
              <div className="mt-4 space-y-3">{requests?.contacts.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 py-3"><div><p className="font-semibold">{item.full_name} · {item.subject}</p><p className="text-xs text-muted-foreground">{item.phone} · {item.email ?? "Sans email"}</p><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{item.message}</p></div><select aria-label={"Statut contact " + item.subject} value={item.status} onChange={(event) => void handleStatus("contact_requests", item.id, event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">{statusOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></article>)}{!requests?.contacts.length ? <p className="py-5 text-sm text-muted-foreground">Aucune demande de contact.</p> : null}</div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
