import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requirePartner(context: any) {
  const { data, error } = await context.supabase.from("user_roles").select("role")
    .eq("user_id", context.userId).eq("role", "partner").maybeSingle();
  if (error || !data) throw new Error("Votre compte partenaire doit être approuvé par Mon Lot.");
  const { data: profile } = await context.supabase.from("profiles").select("partner_status")
    .eq("id", context.userId).maybeSingle();
  if (profile?.partner_status !== "approved") throw new Error("Votre accès partenaire n’est pas actif.");
}
async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.from("user_roles").select("role")
    .eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Accès réservé à l’administration.");
}

export const getPartnerWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
    await requirePartner(context);
    const db = context.supabase as any;
    const [lots, plans, entitlements, payments, profile] = await Promise.all([
      db.from("lots").select("id,reference,title,city,area_name,area_sqm,cash_price,status,cover_image_url,moderation_status,moderation_note,is_published,publication_expires_at,created_at").eq("owner_id", context.userId).order("created_at",{ascending:false}),
      db.from("publication_plans").select("id,code,name,billing_type,lot_limit,credits,duration_days,price_fcfa,description").eq("is_active",true).order("sort_order"),
      db.from("partner_entitlements").select("id,entitlement_type,credits_total,credits_remaining,lot_limit,starts_at,expires_at,status,plan:publication_plans(name)").eq("partner_id",context.userId).order("created_at",{ascending:false}),
      db.from("partner_payments").select("id,amount_fcfa,status,created_at,provider_reference,plan:publication_plans(name)").eq("partner_id",context.userId).order("created_at",{ascending:false}).limit(10),
      db.from("profiles").select("display_name,company_name,partner_status").eq("id",context.userId).maybeSingle()
    ]);
    for (const result of [lots,plans,entitlements,payments]) if (result.error) throw new Error("Les données de l’espace partenaire ne sont pas encore disponibles. Vérifiez le déploiement de la migration Mon Lot.");
    return { lots:lots.data??[], plans:plans.data??[], entitlements:entitlements.data??[], payments:payments.data??[], profile:profile.data };
  });

const partnerLotSchema=z.object({
  reference:z.string().trim().min(3).max(50), title:z.string().trim().min(5).max(120),
  city:z.string().trim().min(2).max(100), areaName:z.string().trim().min(2).max(160),
  region:z.string().trim().max(120).optional().or(z.literal("")),
  areaSqm:z.number().int().positive(), cashPrice:z.number().int().positive(),
  coverImageUrl:z.string().trim().url().max(2000), galleryUrls:z.array(z.string().url().max(2000)).max(12),
  description:z.string().trim().min(30).max(3000), accessDetails:z.string().trim().max(1000).optional().or(z.literal("")),
  documents:z.array(z.string().trim().min(1).max(2000)).max(12),
  sellerName:z.string().trim().min(2).max(120), sellerPhone:z.string().trim().min(8).max(30),
  landType:z.string().trim().min(2).max(80), titleStatus:z.string().trim().min(2).max(100),
});
export const partnerSaveLot=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.validator((data:unknown)=>partnerLotSchema.parse(data)).handler(async({data,context})=>{
  await requirePartner(context);
  const db=context.supabase as any;
  const payload={owner_id:context.userId,reference:data.reference,title:data.title,city:data.city,area_name:data.areaName,region:data.region||null,area_sqm:data.areaSqm,cash_price:data.cashPrice,status:"disponible",cover_image_url:data.coverImageUrl,gallery_urls:data.galleryUrls,description:data.description,access_details:data.accessDetails||null,documents:data.documents,moderation_status:"draft",is_published:false,is_featured:false};
  const {data:lot,error}=await db.from("lots").insert(payload).select("id").single();
  if(error) throw new Error("L’annonce n’a pas pu être enregistrée. Vérifiez les champs et la migration.");
  const {error:metaError}=await db.from("lots").update({seller_name:data.sellerName,seller_phone:data.sellerPhone,land_type:data.landType,title_status:data.titleStatus}).eq("id",lot.id);
  // Metadata columns may not exist in the current base schema; keep core listing if absent.
  if(metaError && !/column .* does not exist/i.test(metaError.message)) throw new Error(metaError.message);
  return {id:lot.id};
});
export const partnerSubmitLot=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.validator((data:unknown)=>z.object({lotId:z.string().uuid()}).parse(data)).handler(async({data,context})=>{
  await requirePartner(context);
  const {error}=await (context.supabase as any).rpc("partner_submit_lot",{_lot_id:data.lotId});
  if(error) throw new Error(error.message);
  return {ok:true as const};
});
export const partnerCreatePayment=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.validator((data:unknown)=>z.object({planId:z.string().uuid()}).parse(data)).handler(async({data,context})=>{
  await requirePartner(context);
  const {data:id,error}=await (context.supabase as any).rpc("partner_create_payment",{_plan_id:data.planId});
  if(error) throw new Error(error.message);
  return {paymentId:id};
});

export const getAdminMarketplace=getPartnerWorkspace; // not used for admin access
export const adminMarketplaceData=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  await requireAdmin(context); const db=context.supabase as any;
  const [plans,applications,lots,payments]=await Promise.all([
    db.from("publication_plans").select("*").order("sort_order"),
    db.from("partner_applications").select("*").order("created_at",{ascending:false}),
    db.from("lots").select("id,reference,title,city,owner_id,moderation_status,moderation_note,created_at").not("owner_id","is",null).order("created_at",{ascending:false}),
    db.from("partner_payments").select("id,partner_id,amount_fcfa,status,provider_reference,created_at,plan:publication_plans(name)").order("created_at",{ascending:false})
  ]);
  for(const x of [plans,applications,lots,payments]) if(x.error) throw new Error("Les données marketplace ne sont pas disponibles. Migration Supabase requise.");
  return {plans:plans.data??[],applications:applications.data??[],lots:lots.data??[],payments:payments.data??[]};
});
export const adminUpdatePlan=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.validator((data:unknown)=>z.object({id:z.string().uuid(),priceFcfa:z.number().int().positive().nullable(),active:z.boolean()}).parse(data))
.handler(async({data,context})=>{await requireAdmin(context);const {error}=await(context.supabase as any).from("publication_plans").update({price_fcfa:data.priceFcfa,is_active:data.active}).eq("id",data.id);if(error)throw new Error(error.message);return{ok:true as const};});
export const adminReviewPartnerLot=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.validator((data:unknown)=>z.object({lotId:z.string().uuid(),approve:z.boolean(),note:z.string().max(1000).optional()}).parse(data))
.handler(async({data,context})=>{await requireAdmin(context);const {error}=await(context.supabase as any).rpc("admin_review_partner_lot",{_lot_id:data.lotId,_approve:data.approve,_note:data.note||null});if(error)throw new Error(error.message);return{ok:true as const};});
export const adminConfirmPartnerPayment=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.validator((data:unknown)=>z.object({paymentId:z.string().uuid(),providerReference:z.string().trim().min(3).max(200)}).parse(data))
.handler(async({data,context})=>{await requireAdmin(context);const {error}=await(context.supabase as any).rpc("admin_confirm_partner_payment",{_payment_id:data.paymentId,_provider_reference:data.providerReference});if(error)throw new Error(error.message);return{ok:true as const};});
