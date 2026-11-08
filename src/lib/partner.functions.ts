import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const applicationSchema = z.object({
  accountType: z.enum(["agent_independant","agence","promoteur","amenageur","proprietaire"]),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  businessRegistration: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(100),
  experience: z.string().trim().max(1000).optional().or(z.literal("")),
  portfolioUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
});

export const submitPartnerApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => applicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: existing, error: readError } = await db
      .from("partner_applications").select("id,status").eq("user_id", context.userId).maybeSingle();
    if (readError) throw new Error("Impossible de vérifier votre demande. Réessayez plus tard.");
    if (existing) return { ok: true as const, status: existing.status as string, existing: true };
    const { error } = await db.from("partner_applications").insert({
      user_id: context.userId,
      account_type: data.accountType,
      full_name: data.fullName,
      phone: data.phone,
      company_name: data.companyName || null,
      business_registration: data.businessRegistration || null,
      city: data.city,
      experience: data.experience || null,
      portfolio_url: data.portfolioUrl || null,
      message: data.message || null,
      status: "pending",
    });
    if (error) throw new Error("Votre demande n'a pas pu être enregistrée. Vérifiez que votre compte est confirmé.");
    return { ok: true as const, status: "pending", existing: false };
  });

export const getPartnerApplicationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const { data, error } = await db.from("partner_applications")
      .select("status,admin_note,created_at").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Impossible de charger le statut de votre demande.");
    return data ?? null;
  });
