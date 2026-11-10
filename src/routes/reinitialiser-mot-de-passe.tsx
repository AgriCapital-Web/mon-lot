import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  head: () => ({ meta: [{ title: "Réinitialiser le mot de passe — Mon Lot" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PasswordRecoveryPage,
});

function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setRecovery(true);
    }).catch(() => undefined);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sendReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      });
      if (resetError) throw resetError;
      setNotice("Si cette adresse correspond à un compte, un lien de réinitialisation vient d’être envoyé. Consultez également vos courriers indésirables.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’envoi du lien a échoué. Réessayez plus tard.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (password.length < 8) { setError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirmation) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setRecovery(false); setPassword(""); setConfirmation("");
      setNotice("Votre mot de passe a été mis à jour. Vous pouvez maintenant vous reconnecter.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La mise à jour du mot de passe a échoué.");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
  return <div className="min-h-dvh"><SiteHeader /><main className="mx-auto flex min-h-[65vh] w-full max-w-xl items-center px-4 py-12 sm:px-6">
    <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/> Retour à l’administration</Link>
      <div className="mt-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">{recovery ? <KeyRound className="size-6"/> : <ShieldCheck className="size-6"/>}</div>
      <h1 className="mt-4 text-2xl font-semibold">{recovery ? "Choisir un nouveau mot de passe" : "Mot de passe oublié ?"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{recovery ? "Définissez un nouveau mot de passe sécurisé pour votre compte Mon Lot." : "Indiquez l’adresse email de votre compte. Un lien sécurisé vous permettra de réinitialiser votre mot de passe."}</p>
      {error && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg bg-primary/5 p-3 text-sm text-primary">{notice}</p>}
      {recovery ? <form onSubmit={updatePassword} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Nouveau mot de passe<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className={field}/></label>
        <label className="block text-sm font-medium">Confirmer le mot de passe<input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className={field}/></label>
        <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Mise à jour…" : "Enregistrer le nouveau mot de passe"}</button>
      </form> : <form onSubmit={sendReset} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Adresse email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={field}/></label>
        <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"><Mail className="size-4"/>{busy ? "Envoi…" : "Envoyer le lien de réinitialisation"}</button>
      </form>}
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">La réception du lien dépend de la configuration email et des URL de redirection autorisées dans le projet d’authentification Mon Lot.</p>
    </section>
  </main><SiteFooter/></div>;
}
