CREATE TYPE public.app_role AS ENUM ('admin_manager', 'editor');
CREATE TYPE public.draft_status AS ENUM ('pending', 'approved', 'rejected', 'on_hold');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT 'Integrante',
  title TEXT NOT NULL DEFAULT 'Fundador',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_count INT;
BEGIN
  SELECT count(*) INTO existing_count FROM public.profiles;
  IF existing_count >= 3 THEN
    RAISE EXCEPTION 'El equipo ZYTEON solo admite 3 cuentas registradas.';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, 'integrante'), '@', 1)));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN existing_count = 0 THEN 'admin_manager'::public.app_role ELSE 'editor'::public.app_role END);

  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.site_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number TEXT NOT NULL,
  version_name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  published_by UUID REFERENCES auth.users ON DELETE SET NULL,
  source_draft_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_versions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_versions TO authenticated;
GRANT ALL ON public.site_versions TO service_role;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_versions_anon_active" ON public.site_versions FOR SELECT TO anon USING (is_active);
CREATE POLICY "site_versions_team_read" ON public.site_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_versions_admin_insert" ON public.site_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin_manager'));
CREATE POLICY "site_versions_admin_update" ON public.site_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin_manager'));

CREATE TABLE public.site_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Borrador sin titulo',
  message TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL,
  base_version_id UUID REFERENCES public.site_versions ON DELETE SET NULL,
  status public.draft_status NOT NULL DEFAULT 'pending',
  submitted BOOLEAN NOT NULL DEFAULT false,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by UUID REFERENCES auth.users ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_drafts TO authenticated;
GRANT ALL ON public.site_drafts TO service_role;
ALTER TABLE public.site_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts_read" ON public.site_drafts FOR SELECT TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'));
CREATE POLICY "drafts_insert_own" ON public.site_drafts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "drafts_update" ON public.site_drafts FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'));
CREATE POLICY "drafts_delete" ON public.site_drafts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'));
CREATE TRIGGER drafts_touch BEFORE UPDATE ON public.site_drafts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  image_url TEXT,
  platform TEXT NOT NULL DEFAULT 'lovable',
  sort_order INT NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_projects TO authenticated;
GRANT ALL ON public.portfolio_projects TO service_role;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolio_anon_read" ON public.portfolio_projects FOR SELECT TO anon USING (visible);
CREATE POLICY "portfolio_team_read" ON public.portfolio_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "portfolio_team_insert" ON public.portfolio_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "portfolio_update" ON public.portfolio_projects FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'));
CREATE POLICY "portfolio_delete" ON public.portfolio_projects FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'));
CREATE TRIGGER portfolio_touch BEFORE UPDATE ON public.portfolio_projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nota nueva',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_own" ON public.notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER notes_touch BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read" ON public.messages FOR SELECT TO authenticated USING (recipient_id IS NULL OR sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "messages_send" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_delete_own" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_team_read" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

INSERT INTO public.site_versions (version_number, version_name, config, is_active)
VALUES ('1.0', 'Lanzamiento ZYTEON', '{
  "brand": {"name": "ZYTEON", "legalName": "Agencia Zyteon", "logoUrl": null, "tagline": "Ingenieria digital para marcas que no pasan desapercibidas"},
  "language": "es",
  "theme": {"background": "grid", "accent": "cian"},
  "desktop": {
    "hero": {"videoUrl": null, "orientation": "horizontal", "title": "ZYTEON", "subtitle": "Disenamos, desarrollamos y desplegamos experiencias web de alto impacto.", "ctaLabel": "Ver portafolio", "ctaHref": "#portafolio", "showLogo": true, "overlay": 60},
    "about": {"title": "Quienes somos", "body": "Somos tres fundadores obsesionados con el detalle: diseno, desarrollo y estrategia en un mismo equipo.", "visible": true},
    "sections": {"plans": true, "portfolio": true, "team": true}
  },
  "mobile": {
    "hero": {"videoUrl": null, "orientation": "vertical", "title": "ZYTEON", "subtitle": "Webs de alto impacto, hechas a medida.", "ctaLabel": "Ver portafolio", "ctaHref": "#portafolio", "showLogo": true, "overlay": 70},
    "about": {"title": "Quienes somos", "body": "Tres fundadores: diseno, desarrollo y estrategia.", "visible": true},
    "sections": {"plans": true, "portfolio": true, "team": true}
  },
  "plans": [
    {"id": "esencial", "name": "Esencial", "price": "$450.000", "period": "proyecto", "highlight": false, "features": ["Landing page de una seccion", "Diseno responsive", "Formulario de contacto", "Entrega en 7 dias"]},
    {"id": "profesional", "name": "Profesional", "price": "$1.200.000", "period": "proyecto", "highlight": true, "features": ["Hasta 5 secciones", "Identidad visual aplicada", "SEO base + analitica", "Panel editable", "Soporte 30 dias"]},
    {"id": "elite", "name": "Elite", "price": "A medida", "period": "por acuerdo", "highlight": false, "features": ["Aplicacion web completa", "Backend y base de datos", "Integraciones y automatizaciones", "Soporte prioritario"]}
  ],
  "experiences": [
    {"id": "e1", "author": "Cliente piloto", "role": "Emprendedor", "quote": "El proceso fue claro y el resultado superó lo que imaginaba."}
  ],
  "contact": {"email": "hola@zyteon.com", "whatsapp": "", "visible": true}
}'::jsonb, true);