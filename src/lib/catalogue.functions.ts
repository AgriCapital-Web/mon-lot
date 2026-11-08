import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { PUBLIC_LOT_COLUMNS, type PublicLot } from "./lots";
import { computePlan, isPlanDuration, type PlanDuration } from "./pricing";

const referenceSchema = z.object({ reference: z.string().trim().min(1).max(50) });

const contactSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(5).max(1500),
});

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
});

/** Tous les terrains publiés, terrains en vedette disponibles d'abord. */
export const listLots = createServerFn({ method: "GET" }).handler(async (): Promise<PublicLot[]> => {
  const supabase = await getPublicSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lots")
    .select(PUBLIC_LOT_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[lots] listLots", error.message);
    return [];
  }
  return (data ?? []) as PublicLot[];
});

/** Terrains disponibles mis en vedette, triés par priorité puis par date de publication. */
export const listFeaturedLots = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicLot[]> => {
    const supabase = await getPublicSupabaseOrNull();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("lots")
      .select(PUBLIC_LOT_COLUMNS)
      .eq("is_featured", true)
      .eq("status", "disponible")
      .order("featured_priority", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);

    if (error) {
      console.error("[lots] listFeaturedLots", error.message);
      return [];
    }
    return (data ?? []) as PublicLot[];
  },
);

export const getLotByReference = createServerFn({ method: "GET" })
  .validator((data: unknown) => referenceSchema.parse(data))
  .handler(async ({ data }): Promise<PublicLot | null> => {
    const supabase = await getPublicSupabaseOrNull();
    if (!supabase) return null;

    const { data: lot, error } = await supabase
      .from("lots")
      .select(PUBLIC_LOT_COLUMNS)
      .ilike("reference", data.reference)
      .maybeSingle();

    if (error) {
      console.error("[lots] getLotByReference", error.message);
      return null;
    }
    return (lot as PublicLot | null) ?? null;
  });

export const submitContactRequest = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { createPublicSupabase } = await import("./supabase-public.server");
    const supabase = createPublicSupabase();

    const { error } = await supabase.from("contact_requests").insert({
      full_name: data.fullName,
      phone: data.phone,
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
    if (data.reference.toUpperCase().startsWith("DEMO-")) {
      throw new Error("Cette fiche est une démonstration : aucune réservation réelle ne peut être transmise.");
    }
    const { createPublicSupabase } = await import("./supabase-public.server");
    const supabase = createPublicSupabase();

    const { data: lot, error: lotError } = await supabase
      .from("lots")
      .select("id, reference, title, cash_price, status")
      .ilike("reference", data.reference)
      .maybeSingle();

    if (lotError || !lot) {
      throw new Error("Ce terrain n'est plus disponible.");
    }
    if (lot.status !== "disponible") {
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
      phone: data.phone,
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
