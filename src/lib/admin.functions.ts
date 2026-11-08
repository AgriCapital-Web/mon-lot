import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const lotSchema = z.object({
  id: z.string().uuid().optional(),
  reference: z.string().trim().min(2).max(50),
  title: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  area_name: z.string().trim().min(2).max(160),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  area_sqm: z.number().int().positive(),
  cash_price: z.number().int().positive(),
  status: z.enum(["disponible", "reserve", "vendu"]),
  cover_image_url: z.string().trim().min(5).max(2000),
  description: z.string().trim().min(10).max(3000),
  access_details: z.string().trim().max(1000).optional().or(z.literal("")),
  documents: z.array(z.string().trim().min(1).max(160)).max(12),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  is_featured: z.boolean(),
  featured_priority: z.number().int().positive().nullable(),
  is_published: z.boolean(),
});

export type AdminLotInput = z.infer<typeof lotSchema>;

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Accès réservé aux administrateurs.");
}

export const getAdminContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      isAdmin: Boolean(role),
      displayName: profile?.display_name ?? null,
      email: (context.claims as { email?: string }).email ?? null,
    };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ displayName: z.string().trim().min(2).max(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, display_name: data.displayName });
    if (error) throw new Error("Le profil n'a pas pu être enregistré.");
    return { ok: true as const };
  });

export const adminListLots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("lots")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Les terrains n'ont pas pu être chargés.");
    return data ?? [];
  });

export const adminSaveLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => lotSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const payload = {
      reference: data.reference,
      title: data.title,
      city: data.city,
      area_name: data.area_name,
      region: data.region ? data.region : null,
      area_sqm: data.area_sqm,
      cash_price: data.cash_price,
      status: data.status,
      cover_image_url: data.cover_image_url,
      description: data.description,
      access_details: data.access_details ? data.access_details : null,
      documents: data.documents,
      latitude: data.latitude,
      longitude: data.longitude,
      is_featured: data.is_featured,
      featured_priority: data.is_featured ? data.featured_priority : null,
      is_published: data.is_published,
      published_at: data.is_published ? new Date().toISOString() : null,
    };

    if (data.id) {
      const { error } = await context.supabase.from("lots").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("lots").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminDeleteLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("lots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [reservations, contacts] = await Promise.all([
      context.supabase
        .from("reservation_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    return {
      reservations: reservations.data ?? [],
      contacts: contacts.data ?? [],
    };
  });

export const adminUpdateRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        table: z.enum(["reservation_requests", "contact_requests"]),
        id: z.string().uuid(),
        status: z.enum(["nouvelle", "contactee", "traitee", "archivee"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from(data.table)
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
