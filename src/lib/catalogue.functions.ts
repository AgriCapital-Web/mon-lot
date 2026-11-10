import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { PUBLIC_LOT_COLUMNS, type PublicLot } from "./lots";
import { CATALOGUE_PREVIEW_LOTS } from "./catalogue-preview";
import { computePlan, isPlanDuration, type PlanDuration } from "./pricing";

const referenceSchema = z.object({ reference: z.string().trim().min(1).max(50) });

const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(5).max(1500),
  website: z.string().max(200).optional().default(""),
});

/** Limitation anti-spam best-effort par instance serverless, complétée par un champ honeypot. */
const recentSubmissions = new Map<string, number[]>();
function enforceSubmissionRate(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const recent = (recentSubmissions.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) throw new Error("Trop de demandes ont été envoyées. Merci de réessayer dans une minute.");
  recent.push(now);
  recentSubmissions.set(key, recent);
}
function clientRateKey() {
  try {
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || request.headers.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}
function normalizePhone(value: string) {
  const normalized = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!/^\+?\d{8,15}$/.test(normalized)) throw new Error("Veuillez saisir un numéro de téléphone valide.");
  return normalized;
}

/** Retourne null si les variables Supabase ne sont pas configurées sur l'hébergement.
 * Le site public reste consultable pendant la configuration de la base.
 */
async function getPublicSupabaseOrNull() {
  try {
    const { createPublicSupabase } = await import("./supabase-public.server");
    return createPublicSupabase();
  } catch (error) {
    console.warn("[lots] Supabase public configuration unavailable", error);
    return null;
  }
}

const reservationSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  duration: z.number().refine(isPlanDuration, "Formule invalide"),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  website: z.string().max(200).optional().default(""),
});

/** Tous les terrains publiés, terrains en vedette disponibles d'abord. */
export const listLots = createServerFn({ method: "GET" }).handler(async (): Promise<PublicLot[]> => {
  const supabase = await getPublicSupabaseOrNull();
  if (!supabase) return CATALOGUE_PREVIEW_LOTS;

  const { data, error } = await supabase
    .from("lots")
    .select(PUBLIC_LOT_COLUMNS)
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[lots] listLots", error.message);
    return CATALOGUE_PREVIEW_LOTS;
  }
  const liveLots = (data ?? []) as PublicLot[];
  const liveReferences = new Set(liveLots.map((lot) => lot.reference.toUpperCase()));
  return [...liveLots, ...CATALOGUE_PREVIEW_LOTS.filter((lot) => !liveReferences.has(lot.reference.toUpperCase()))];
});

/** Terrains disponibles mis en vedette, triés par priorité puis par date de publication. */
export const listFeaturedLots = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicLot[]> => {
    const supabase = await getPublicSupabaseOrNull();
    if (!supabase) return CATALOGUE_PREVIEW_LOTS.filter((lot) => lot.is_featured);

    const { data, error } = await supabase
      .from("lots")
      .select(PUBLIC_LOT_COLUMNS)
      .eq("is_published", true)
      .eq("is_featured", true)
      .eq("status", "disponible")
      .order("featured_priority", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);

    if (error) {
      console.error("[lots] listFeaturedLots", error.message);
      return CATALOGUE_PREVIEW_LOTS.filter((lot) => lot.is_featured);
    }
    const liveLots = (data ?? []) as PublicLot[];
    const liveReferences = new Set(liveLots.map((lot) => lot.reference.toUpperCase()));
    const catalogueLots = CATALOGUE_PREVIEW_LOTS.filter((lot) => lot.is_featured && !liveReferences.has(lot.reference.toUpperCase()));
    return [...liveLots, ...catalogueLots].slice(0, 8);
  },
);

export const getLotByReference = createServerFn({ method: "GET" })
  .validator((data: unknown) => referenceSchema.parse(data))
  .handler(async ({ data }): Promise<PublicLot | null> => {
    const supabase = await getPublicSupabaseOrNull();
    if (!supabase) return CATALOGUE_PREVIEW_LOTS.find((lot) => lot.reference.toLowerCase() === data.reference.toLowerCase()) ?? null;

    const { data: lot, error } = await supabase
      .from("lots")
      .select(PUBLIC_LOT_COLUMNS)
      .ilike("reference", data.reference)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      console.error("[lots] getLotByReference", error.message);
      return CATALOGUE_PREVIEW_LOTS.find((item) => item.reference.toLowerCase() === data.reference.toLowerCase()) ?? null;
    }
    if (!lot || !lot.is_published) return CATALOGUE_PREVIEW_LOTS.find((item) => item.reference.toLowerCase() === data.reference.toLowerCase()) ?? null;
    return lot as PublicLot;
  });

export const submitContactRequest = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };
    enforceSubmissionRate(`contact:${clientRateKey()}`, 5);
    const phone = normalizePhone(data.phone);
    const { createPublicSupabase } = await import("./supabase-public.server");
    const supabase = createPublicSupabase();

    const { error } = await supabase.from("contact_requests").insert({
      full_name: data.fullName,
      phone,
      email: data.email ? data.email : null,
      subject: data.subject,
      message: data.message,
      status: "nouvelle",
    });

    if (error) {
      console.error("[contact] insert", error.message);
      throw new Error("Votre message n'a pas pu être enregistré. Merci de réessayer.");
    }
    return { ok: true as const };
  });

export const submitReservationRequest = createServerFn({ method: "POST" })
  .validator((data: unknown) => reservationSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const, plan: null };
    enforceSubmissionRate(`reservation:${clientRateKey()}`, 3);
    const phone = normalizePhone(data.phone);
    const { createPublicSupabase } = await import("./supabase-public.server");
    const supabase = createPublicSupabase();

    const { data: lot, error: lotError } = await supabase
      .from("lots")
      .select("id, reference, title, cash_price, status, is_published")
      .ilike("reference", data.reference)
      .maybeSingle();

    if (lotError || !lot) {
      throw new Error("Ce terrain n'est plus disponible.");
    }
    if (!lot.is_published || lot.status !== "disponible") {
      throw new Error("Ce terrain n'est plus disponible à la réservation.");
    }

    const plan = computePlan(lot.cash_price, data.duration as PlanDuration);

    const { error } = await supabase.from("reservation_requests").insert({
      lot_id: lot.id,
      lot_reference: lot.reference,
      lot_title: lot.title,
      duration_months: plan.duration,
      total_price: plan.total,
      reservation_amount: plan.reservation,
      monthly_amount: plan.monthly,
      full_name: data.fullName,
      phone,
      email: data.email ? data.email : null,
      message: data.message ? data.message : null,
      status: "nouvelle",
    });

    if (error) {
      console.error("[reservation] insert", error.message);
      throw new Error("Votre demande n'a pas pu être enregistrée. Merci de réessayer.");
    }

    return { ok: true as const, plan };
  });
