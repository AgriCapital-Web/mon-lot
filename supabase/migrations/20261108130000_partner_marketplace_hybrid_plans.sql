-- Mon Lot marketplace: partner onboarding, hybrid plans and controlled publishing.
-- All prices are intentionally configurable by administrators; no commercial amount is assumed.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual'
    CHECK (account_type IN ('individual','agent_independant','agence','promoteur','amenageur','proprietaire')),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS business_registration text,
  ADD COLUMN IF NOT EXISTS partner_status text NOT NULL DEFAULT 'none'
    CHECK (partner_status IN ('none','pending','approved','rejected','suspended'));

ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('draft','pending','approved','rejected','suspended')),
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS publication_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS lots_owner_created_idx ON public.lots(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lots_moderation_idx ON public.lots(moderation_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('agent_independant','agence','promoteur','amenageur','proprietaire')),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 30),
  company_name text,
  business_registration text,
  city text NOT NULL,
  experience text,
  portfolio_url text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.partner_applications TO authenticated;
GRANT ALL ON public.partner_applications TO service_role;
CREATE POLICY partner_application_read ON public.partner_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY partner_application_create ON public.partner_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY partner_application_admin_update ON public.partner_applications FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.publication_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  billing_type text NOT NULL CHECK (billing_type IN ('credit_pack','subscription')),
  lot_limit integer,
  credits integer,
  duration_days integer NOT NULL DEFAULT 90 CHECK (duration_days = 90),
  price_fcfa bigint CHECK (price_fcfa IS NULL OR price_fcfa >= 0),
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (billing_type = 'credit_pack' AND credits IS NOT NULL AND credits > 0 AND lot_limit IS NULL)
    OR
    (billing_type = 'subscription' AND lot_limit IS NOT NULL AND lot_limit > 0 AND credits IS NULL)
  )
);
ALTER TABLE public.publication_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.publication_plans TO anon, authenticated;
GRANT ALL ON public.publication_plans TO service_role;
CREATE POLICY active_publication_plans_read ON public.publication_plans FOR SELECT TO anon, authenticated
  USING (is_active = true OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY publication_plans_admin_manage ON public.publication_plans FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

INSERT INTO public.publication_plans(code,name,billing_type,credits,duration_days,sort_order,description)
VALUES
 ('credits_5','Pack 5 publications','credit_pack',5,90,10,'5 crédits de publication utilisables pendant 90 jours.'),
 ('credits_10','Pack 10 publications','credit_pack',10,90,20,'10 crédits de publication utilisables pendant 90 jours.'),
 ('credits_20','Pack 20 publications','credit_pack',20,90,30,'20 crédits de publication utilisables pendant 90 jours.'),
 ('credits_25','Pack 25 publications','credit_pack',25,90,40,'25 crédits de publication utilisables pendant 90 jours.'),
 ('credits_50','Pack 50 publications','credit_pack',50,90,50,'50 crédits de publication utilisables pendant 90 jours.'),
 ('credits_unlimited','Pack publications illimitées','credit_pack',999999,90,60,'Pack à capacité très élevée, soumis à la politique anti-abus Mon Lot.')
ON CONFLICT(code) DO NOTHING;

INSERT INTO public.publication_plans(code,name,billing_type,lot_limit,duration_days,sort_order,description)
VALUES
 ('sub_5','Abonnement 5 annonces','subscription',5,90,110,'Jusqu’à 5 annonces actives pendant 90 jours.'),
 ('sub_10','Abonnement 10 annonces','subscription',10,90,120,'Jusqu’à 10 annonces actives pendant 90 jours.'),
 ('sub_20','Abonnement 20 annonces','subscription',20,90,130,'Jusqu’à 20 annonces actives pendant 90 jours.'),
 ('sub_25','Abonnement 25 annonces','subscription',25,90,140,'Jusqu’à 25 annonces actives pendant 90 jours.'),
 ('sub_50','Abonnement 50 annonces','subscription',50,90,150,'Jusqu’à 50 annonces actives pendant 90 jours.'),
 ('sub_unlimited','Abonnement illimité','subscription',999999,90,160,'Publication sans plafond contractuel pendant 90 jours, selon les règles Mon Lot.')
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.partner_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.publication_plans(id) ON DELETE RESTRICT,
  entitlement_type text NOT NULL CHECK (entitlement_type IN ('credit_pack','subscription')),
  credits_total integer,
  credits_remaining integer,
  lot_limit integer,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at),
  CHECK (
    (entitlement_type = 'credit_pack' AND credits_total IS NOT NULL AND credits_remaining IS NOT NULL AND credits_remaining BETWEEN 0 AND credits_total AND lot_limit IS NULL)
    OR
    (entitlement_type = 'subscription' AND lot_limit IS NOT NULL AND credits_total IS NULL AND credits_remaining IS NULL)
  )
);
ALTER TABLE public.partner_entitlements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.partner_entitlements TO authenticated;
GRANT ALL ON public.partner_entitlements TO service_role;
CREATE POLICY partner_entitlements_read ON public.partner_entitlements FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.partner_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.publication_plans(id) ON DELETE RESTRICT,
  entitlement_id uuid REFERENCES public.partner_entitlements(id) ON DELETE SET NULL,
  amount_fcfa bigint NOT NULL CHECK (amount_fcfa > 0),
  currency text NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  provider text NOT NULL DEFAULT 'pending_configuration',
  provider_reference text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed','refunded')),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.partner_payments TO authenticated;
GRANT ALL ON public.partner_payments TO service_role;
CREATE POLICY partner_payments_read ON public.partner_payments FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY partner_payments_create ON public.partner_payments FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid() AND status = 'pending' AND confirmed_at IS NULL);
CREATE POLICY partner_payments_admin_read_all ON public.partner_payments FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.lot_publication_debits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL UNIQUE REFERENCES public.lots(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL REFERENCES public.partner_entitlements(id) ON DELETE RESTRICT,
  debited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lot_publication_debits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.lot_publication_debits TO authenticated;
GRANT ALL ON public.lot_publication_debits TO service_role;
CREATE POLICY lot_publication_debits_read ON public.lot_publication_debits FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION private.is_monlot_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT private.has_role(auth.uid(), 'admin') $$;
REVOKE ALL ON FUNCTION private.is_monlot_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_monlot_admin() TO authenticated, service_role;

-- Partner-created lots are private drafts until reviewed and funded.
DROP POLICY IF EXISTS "Admins insert lots" ON public.lots;
DROP POLICY IF EXISTS "Admins update lots" ON public.lots;
DROP POLICY IF EXISTS "Admins delete lots" ON public.lots;
CREATE POLICY lots_admin_insert ON public.lots FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY lots_admin_update ON public.lots FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY lots_admin_delete ON public.lots FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY lots_partner_insert ON public.lots FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND moderation_status = 'draft'
    AND is_published = false
    AND is_featured = false
    AND private.has_role(auth.uid(), 'partner')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.partner_status = 'approved')
  );
CREATE POLICY lots_partner_read_own ON public.lots FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY lots_partner_update_own_draft ON public.lots FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND moderation_status IN ('draft','rejected'))
  WITH CHECK (
    owner_id = auth.uid() AND is_published = false AND is_featured = false
    AND moderation_status IN ('draft','pending','rejected')
  );

-- Submission only changes a partner's own draft to the moderation queue.
CREATE OR REPLACE FUNCTION public.partner_submit_lot(_lot_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_lot public.lots%ROWTYPE;
BEGIN
  SELECT * INTO v_lot FROM public.lots WHERE id = _lot_id AND owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable ou accès refusé.'; END IF;
  IF NOT private.has_role(auth.uid(), 'partner') THEN RAISE EXCEPTION 'Compte partenaire non autorisé.'; END IF;
  IF v_lot.moderation_status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'Cette annonce ne peut pas être soumise dans son état actuel.'; END IF;
  UPDATE public.lots SET moderation_status = 'pending', is_published = false, is_featured = false WHERE id = _lot_id;
END;
$$;
REVOKE ALL ON FUNCTION public.partner_submit_lot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_submit_lot(uuid) TO authenticated;

-- Admin approval consumes one credit or checks an active subscription capacity.
CREATE OR REPLACE FUNCTION public.admin_review_partner_lot(_lot_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_lot public.lots%ROWTYPE; v_entitlement public.partner_entitlements%ROWTYPE; v_active_count integer;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès réservé à l’administration.'; END IF;
  SELECT * INTO v_lot FROM public.lots WHERE id = _lot_id FOR UPDATE;
  IF NOT FOUND OR v_lot.owner_id IS NULL THEN RAISE EXCEPTION 'Annonce partenaire introuvable.'; END IF;
  IF v_lot.moderation_status <> 'pending' THEN RAISE EXCEPTION 'Annonce non soumise à validation.'; END IF;
  IF NOT _approve THEN
    UPDATE public.lots SET moderation_status = 'rejected', moderation_note = left(_note,1000), reviewed_at = now(), reviewed_by = auth.uid(), is_published = false WHERE id = _lot_id;
    RETURN;
  END IF;
  SELECT * INTO v_entitlement
  FROM public.partner_entitlements
  WHERE partner_id = v_lot.owner_id AND status = 'active' AND starts_at <= now() AND expires_at > now()
  ORDER BY expires_at ASC FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucun forfait actif pour ce partenaire.'; END IF;
  IF v_entitlement.entitlement_type = 'credit_pack' THEN
    IF v_entitlement.credits_remaining < 1 THEN RAISE EXCEPTION 'Crédits de publication épuisés.'; END IF;
    UPDATE public.partner_entitlements SET credits_remaining = credits_remaining - 1 WHERE id = v_entitlement.id;
  ELSE
    SELECT count(*) INTO v_active_count FROM public.lots
      WHERE owner_id = v_lot.owner_id AND is_published = true AND publication_expires_at > now();
    IF v_active_count >= v_entitlement.lot_limit THEN RAISE EXCEPTION 'Capacité de publication du forfait atteinte.'; END IF;
  END IF;
  INSERT INTO public.lot_publication_debits(lot_id,partner_id,entitlement_id)
  VALUES (_lot_id,v_lot.owner_id,v_entitlement.id)
  ON CONFLICT(lot_id) DO NOTHING;
  UPDATE public.lots SET moderation_status = 'approved', moderation_note = NULL, reviewed_at = now(), reviewed_by = auth.uid(),
    is_published = true, published_at = now(), publication_expires_at = v_entitlement.expires_at
  WHERE id = _lot_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_partner_lot(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_partner_lot(uuid,boolean,text) TO authenticated;

-- Only an administrator can activate paid entitlements after provider confirmation.
CREATE OR REPLACE FUNCTION public.admin_confirm_partner_payment(_payment_id uuid, _provider_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_payment public.partner_payments%ROWTYPE; v_plan public.publication_plans%ROWTYPE; v_entitlement_id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès réservé à l’administration.'; END IF;
  SELECT * INTO v_payment FROM public.partner_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND OR v_payment.status <> 'pending' THEN RAISE EXCEPTION 'Paiement introuvable ou déjà traité.'; END IF;
  SELECT * INTO v_plan FROM public.publication_plans WHERE id = v_payment.plan_id AND is_active = true;
  IF NOT FOUND OR v_plan.price_fcfa IS DISTINCT FROM v_payment.amount_fcfa THEN RAISE EXCEPTION 'Le tarif du paiement ne correspond plus au forfait actif.'; END IF;
  IF v_plan.billing_type = 'credit_pack' THEN
    INSERT INTO public.partner_entitlements(partner_id,plan_id,entitlement_type,credits_total,credits_remaining,starts_at,expires_at,status)
    VALUES(v_payment.partner_id,v_plan.id,'credit_pack',v_plan.credits,v_plan.credits,now(),now()+interval '90 days','active')
    RETURNING id INTO v_entitlement_id;
  ELSE
    INSERT INTO public.partner_entitlements(partner_id,plan_id,entitlement_type,lot_limit,starts_at,expires_at,status)
    VALUES(v_payment.partner_id,v_plan.id,'subscription',v_plan.lot_limit,now(),now()+interval '90 days','active')
    RETURNING id INTO v_entitlement_id;
  END IF;
  UPDATE public.partner_payments SET status='confirmed', provider_reference=_provider_reference, confirmed_at=now(), entitlement_id=v_entitlement_id WHERE id=_payment_id;
  RETURN v_entitlement_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_confirm_partner_payment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_partner_payment(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_partner_application(_application_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_app public.partner_applications%ROWTYPE;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès réservé à l’administration.'; END IF;
  SELECT * INTO v_app FROM public.partner_applications WHERE id=_application_id FOR UPDATE;
  IF NOT FOUND OR v_app.status <> 'pending' THEN RAISE EXCEPTION 'Demande introuvable ou déjà traitée.'; END IF;
  UPDATE public.partner_applications SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    admin_note=left(_note,1000), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_application_id;
  UPDATE public.profiles SET account_type=v_app.account_type, display_name=v_app.full_name, phone=v_app.phone,
    company_name=v_app.company_name, business_registration=v_app.business_registration,
    partner_status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, updated_at=now()
    WHERE id=v_app.user_id;
  IF _approve THEN
    INSERT INTO public.user_roles(user_id,role) VALUES(v_app.user_id,'partner') ON CONFLICT(user_id,role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id=v_app.user_id AND role='partner';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_partner_application(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_partner_application(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_create_payment(_plan_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_plan public.publication_plans%ROWTYPE; v_payment_id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(),'partner') THEN RAISE EXCEPTION 'Compte partenaire validé requis.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND partner_status='approved') THEN RAISE EXCEPTION 'Compte partenaire non validé.'; END IF;
  SELECT * INTO v_plan FROM public.publication_plans WHERE id=_plan_id AND is_active=true FOR SHARE;
  IF NOT FOUND OR v_plan.price_fcfa IS NULL OR v_plan.price_fcfa <= 0 THEN RAISE EXCEPTION 'Forfait indisponible ou tarif non configuré.'; END IF;
  INSERT INTO public.partner_payments(partner_id,plan_id,amount_fcfa)
  VALUES(auth.uid(),v_plan.id,v_plan.price_fcfa) RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.partner_create_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_create_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.partner_expire_publications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.lots SET is_published=false, moderation_status='suspended'
  WHERE owner_id IS NOT NULL AND is_published=true AND publication_expires_at IS NOT NULL AND publication_expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.partner_entitlements SET status='expired'
  WHERE status='active' AND expires_at <= now();
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.partner_expire_publications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_expire_publications() TO service_role;

CREATE OR REPLACE FUNCTION public.set_partner_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS partner_applications_updated_at ON public.partner_applications;
CREATE TRIGGER partner_applications_updated_at BEFORE UPDATE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();
DROP TRIGGER IF EXISTS publication_plans_updated_at ON public.publication_plans;
CREATE TRIGGER publication_plans_updated_at BEFORE UPDATE ON public.publication_plans FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

