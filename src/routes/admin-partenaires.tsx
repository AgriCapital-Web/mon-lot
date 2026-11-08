import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { adminListPartnerApplications, adminReviewPartnerApplication } from "@/lib/partner.functions";

export const Route = createFileRoute("/admin-partenaires")({
  head: () => ({ meta: [{ title: "Demandes partenaires — Administration Mon Lot" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PartnerAdminPage,
});
type Applications = Awaited<ReturnType<typeof adminListPartnerApplications>>;
const field = "mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
function PartnerAdminPage() {
  const list = useServerFn(adminListPartnerApplications);
  const review = useServerFn(adminReviewPartnerApplication);
  const [items,setItems] = useState<Applications>([]);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [logged,setLogged] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [note,setNote] = useState<Record<string,string>>({});
  async function refresh(){ setError(""); setItems(await list()); }
  useEffect(()=>{ let active=true; void supabase.auth.getSession().then(async ({data})=>{ if(!active)return; if(data.session){setLogged(true);try{await refresh()}catch(e){setError(e instanceof Error?e.message:"Accès refusé.")}} }).catch(e=>active&&setError(e instanceof Error?e.message:"Connexion impossible.")); return ()=>{active=false}; },[]);
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;setLogged(true);await refresh()}catch(e){setError(e instanceof Error?e.message:"Connexion impossible.")}finally{setBusy(false)}}
  async function decide(id:string,approve:boolean){setBusy(true);setError("");try{await review({data:{applicationId:id,approve,note:note[id]||""}});await refresh()}catch(e){setError(e instanceof Error?e.message:"Décision impossible.")}finally{setBusy(false)}}
  return <div className="min-h-dvh"><SiteHeader/><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Administration sécurisée</p><h1 className="mt-1 text-3xl font-semibold">Demandes partenaires</h1><p className="mt-2 text-sm text-muted-foreground">Examinez les dossiers avant d’accorder le rôle partenaire.</p></div><Link to="/admin" className="text-sm font-semibold text-primary underline">Administration générale</Link></div>
    {error&&<p role="alert" className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!logged?<form onSubmit={login} className="mx-auto mt-10 max-w-md space-y-4 rounded-xl border border-border p-6"><h2 className="text-xl font-semibold">Connexion administrateur</h2><label className="block text-sm">Email<input className={field} type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm">Mot de passe<input className={field} type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy} className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Se connecter</button></form>
    :<><div className="mt-7 flex items-center justify-between"><p className="text-sm text-muted-foreground">{items.length} dossier(s)</p><button onClick={()=>void refresh()} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm"><RefreshCw className="size-4"/> Actualiser</button></div>
    <div className="mt-5 space-y-4">{items.map((a:any)=><article key={a.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{a.full_name} · {a.company_name||"Activité indépendante"}</h2><p className="mt-1 text-sm text-muted-foreground">{String(a.account_type).replaceAll("_"," ")} · {a.city} · {a.phone}</p><p className="mt-1 text-xs text-muted-foreground">{a.business_registration||"Aucun RCCM communiqué"} · {a.created_at?new Date(a.created_at).toLocaleDateString("fr-FR"):""}</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{a.status}</span></div>
    {a.experience&&<p className="mt-4 text-sm">{a.experience}</p>}{a.message&&<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>}{a.portfolio_url&&<a className="mt-2 inline-block text-sm text-primary underline" href={a.portfolio_url} target="_blank" rel="noreferrer">Voir le portfolio</a>}
    {a.status==="pending"&&<div className="mt-5 border-t border-border pt-4"><label className="block text-sm font-medium">Note administrative (facultatif)<textarea rows={2} value={note[a.id]||""} onChange={e=>setNote(s=>({...s,[a.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm"/></label><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void decide(a.id,true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Check className="size-4"/> Approuver le partenaire</button><button disabled={busy} onClick={()=>void decide(a.id,false)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-semibold text-destructive"><X className="size-4"/> Refuser</button></div></div>}
    </article>)}{!items.length&&<div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucune demande partenaire pour le moment.</div>}</div></>}
  </main><SiteFooter/></div>;
}
