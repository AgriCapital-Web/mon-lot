import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { getPartnerApplicationStatus, submitPartnerApplication } from "@/lib/partner.functions";

export const Route = createFileRoute("/partenaire")({
  head: () => ({ meta: [{ title: "Devenir partenaire — Mon Lot" }, { name: "description", content: "Rejoignez le réseau de partenaires immobiliers Mon Lot." }] }),
  component: PartnerPage,
});

type Status = Awaited<ReturnType<typeof getPartnerApplicationStatus>>;
const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
const types = [
  ["agent_independant", "Agent immobilier indépendant"],
  ["agence", "Agence immobilière"],
  ["promoteur", "Promoteur immobilier"],
  ["amenageur", "Aménageur foncier"],
  ["proprietaire", "Propriétaire foncier"],
] as const;

function PartnerPage() {
  const submit = useServerFn(submitPartnerApplication);
  const getStatus = useServerFn(getPartnerApplicationStatus);
  const [session, setSession] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [accountType, setAccountType] = useState<(typeof types)[number][0]>("agent_independant");

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(Boolean(data.session));
      if (data.session) {
        try { setStatus(await getStatus()); } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
      }
    }).catch((e) => alive && setError(e instanceof Error ? e.message : "Connexion indisponible."));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(Boolean(next));
      if (next) void getStatus().then(setStatus).catch(() => undefined);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (authError) throw authError;
      if (data.session) { setSession(true); setNotice("Compte créé. Vous pouvez maintenant transmettre votre demande."); }
      else setNotice("Un email de confirmation vient de vous être envoyé. Confirmez votre adresse, puis reconnectez-vous pour envoyer votre demande.");
    } catch (e) { setError(e instanceof Error ? e.message : "Création du compte impossible."); }
    finally { setBusy(false); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (authError) throw authError; setSession(true); setStatus(await getStatus()); }
    catch (e) { setError(e instanceof Error ? e.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }

  async function application(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(""); setNotice("");
    try {
      const result = await submit({ data: {
        accountType, fullName: String(form.get("fullName") || ""), phone: String(form.get("phone") || ""),
        companyName: String(form.get("companyName") || ""), businessRegistration: String(form.get("registration") || ""),
        city: String(form.get("city") || ""), experience: String(form.get("experience") || ""),
        portfolioUrl: String(form.get("portfolio") || ""), message: String(form.get("message") || ""),
      } });
      setStatus({ status: result.status, admin_note: null, created_at: new Date().toISOString() });
      setNotice(result.existing ? "Une demande existe déjà pour ce compte." : "Votre demande a été transmise à l’équipe Mon Lot.");
    } catch (e) { setError(e instanceof Error ? e.message : "Envoi impossible."); }
    finally { setBusy(false); }
  }

  const statusLabel = status?.status === "pending" ? "En attente d’examen" : status?.status === "approved" ? "Demande approuvée" : status?.status === "rejected" ? "Demande non retenue" : status?.status === "suspended" ? "Compte suspendu" : "";
  return <div className="min-h-dvh"><SiteHeader /><main>
    <section className="bg-primary-dark px-4 py-16 text-primary-foreground sm:py-20"><div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-sand">Espace professionnel</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Développez vos ventes immobilières avec Mon Lot.</h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/80">Vous êtes agent, agence, promoteur, aménageur ou propriétaire foncier ? Présentez votre activité et soumettez votre demande d’accès à notre réseau de partenaires.</p>
    </div></section>
    <section className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[.8fr_1.2fr]">
      <aside className="space-y-5"><div className="rounded-xl border border-border p-6"><ShieldCheck className="size-7 text-primary"/><h2 className="mt-3 text-xl font-semibold">Un accès encadré</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Chaque demande est examinée par l’administration. L’accès aux outils de publication n’est accordé qu’après approbation.</p></div>
      <div className="rounded-xl border border-border p-6"><h2 className="text-lg font-semibold">Des outils professionnels</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground"><li>• Gestion de vos annonces et photos</li><li>• Suivi de la modération</li><li>• Packs de publications ou abonnements de 90 jours</li><li>• Services de mise en avant</li></ul><p className="mt-4 text-xs leading-relaxed text-muted-foreground">Les forfaits et leurs tarifs sont réservés aux partenaires dont le compte est validé. Aucun prix n’est affiché publiquement.</p></div></aside>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">{notice}</p>}
        {status ? <div><CheckCircle2 className="size-8 text-primary"/><h2 className="mt-3 text-2xl font-semibold">{statusLabel}</h2><p className="mt-2 text-sm text-muted-foreground">{status.status === "pending" ? "Votre dossier a bien été reçu. L’équipe Mon Lot l’examinera avant toute activation des fonctions partenaires." : status.status === "approved" ? "Votre accès partenaire est approuvé. Retrouvez vos outils de gestion dans votre espace professionnel." : status.admin_note || "Consultez l’équipe Mon Lot pour connaître la suite donnée à votre dossier."}</p>{status.status === "approved" ? <Link to="/espace-partenaire" className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Accéder à mon espace partenaire</Link> : null}</div>
        : !session ? <><h2 className="text-2xl font-semibold">{authMode === "signup" ? "Créer un compte professionnel" : "Se connecter"}</h2><p className="mt-2 text-sm text-muted-foreground">{authMode === "signup" ? "Créez votre compte pour déposer une candidature partenaire." : "Retrouvez votre compte pour poursuivre votre démarche."}</p><form onSubmit={authMode === "signup" ? createAccount : login} className="mt-6 space-y-4"><label className="block text-sm font-medium">Adresse email<input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm font-medium">Mot de passe<input className={inputClass} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={authMode === "signup" ? 8 : undefined} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Veuillez patienter…" : authMode === "signup" ? "Créer mon compte" : "Me connecter"} <ArrowRight className="size-4"/></button></form><div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">{authMode === "signup" ? "Vous avez déjà un compte ?" : "Vous n’avez pas encore de compte ?"} <button type="button" onClick={()=>{setAuthMode(authMode === "signup" ? "login" : "signup");setError("");setNotice("");}} className="ml-1 font-semibold text-primary underline underline-offset-4">{authMode === "signup" ? "Se connecter" : "Créer un compte"}</button></div></>
        : <><h2 className="text-2xl font-semibold">Votre demande partenaire</h2><p className="mt-2 text-sm text-muted-foreground">Renseignez les informations de votre activité. Votre compte ne sera pas automatiquement promu partenaire.</p><form onSubmit={application} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Votre profil<select className={inputClass} value={accountType} onChange={e=>setAccountType(e.target.value as typeof accountType)}>{types.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Nom complet<input name="fullName" required maxLength={120} className={inputClass}/></label><label className="block text-sm font-medium">Téléphone<input name="phone" required minLength={8} maxLength={30} className={inputClass}/></label></div>
          <label className="block text-sm font-medium">Ville principale<input name="city" required maxLength={100} className={inputClass}/></label>
          <label className="block text-sm font-medium">Nom de l’entreprise ou agence (si applicable)<input name="companyName" maxLength={160} className={inputClass}/></label>
          <label className="block text-sm font-medium">RCCM / Identifiant professionnel (facultatif)<input name="registration" maxLength={100} className={inputClass}/></label>
          <label className="block text-sm font-medium">Expérience et zones d’intervention<textarea name="experience" rows={3} maxLength={1000} className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm"/></label>
          <label className="block text-sm font-medium">Portfolio ou site web (facultatif)<input name="portfolio" type="url" className={inputClass}/></label>
          <label className="block text-sm font-medium">Présentez votre activité<textarea name="message" rows={4} maxLength={1500} className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm"/></label>
          <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">Envoyer ma demande <ArrowRight className="size-4"/></button>
        </form></>}
      </div>
    </section>
    <div className="mx-auto max-w-5xl px-4 pb-12 text-sm text-muted-foreground sm:px-6">Vous recherchez un terrain plutôt qu’un espace professionnel ? <Link to="/terrains" className="font-semibold text-primary underline">Consultez le catalogue public.</Link></div>
  </main><SiteFooter/></div>;
}
