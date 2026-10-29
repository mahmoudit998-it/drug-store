-- Sharjah Drug Store: catalog schema, row-level security and media storage.
-- Consolidated from the migrations applied to the project (init_schema, grant_helpers_to_anon,
-- move_helpers_private, guard_only_signed_in_non_admins).

create table public.settings (
  id int primary key default 1 check (id = 1),
  site_name_en text not null default 'Sharjah Drug Store',
  site_name_ar text not null default 'مستودع الشارقة للأدوية',
  whatsapp text not null default '971500000000',
  phone text not null default '+971 6 000 0000',
  email text not null default 'info@sharjahdrugstore.ae',
  address_en text not null default 'Industrial Area, Sharjah, UAE',
  address_ar text not null default 'المنطقة الصناعية، الشارقة، الإمارات',
  working_hours_en text not null default 'Sat – Thu, 8:00 AM – 10:00 PM',
  working_hours_ar text not null default 'السبت – الخميس، 8 صباحًا – 10 مساءً',
  free_delivery_min numeric(10,2) not null default 100,
  founded_year int not null default 2003,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  tagline_en text,
  tagline_ar text,
  description_en text,
  description_ar text,
  logo_url text,
  cover_url text,
  brand_color text not null default '#006E3A',
  phone text,
  email text,
  website text,
  established_year int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  icon text not null default 'pill',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  subtitle_en text,
  subtitle_ar text,
  description_en text,
  description_ar text,
  active_ingredient text,
  pack_size text,
  price numeric(10,2) not null default 0,
  compare_at_price numeric(10,2),
  image_url text,
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  reviews_count int not null default 0,
  requires_prescription boolean not null default false,
  in_stock boolean not null default true,
  is_active boolean not null default true,
  is_best_seller boolean not null default false,
  best_seller_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_company_idx on public.products(company_id);
create index products_category_idx on public.products(category_id);
create index products_best_seller_idx on public.products(is_best_seller, best_seller_order) where is_best_seller;

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  eyebrow_en text,
  eyebrow_ar text,
  title_en text not null,
  title_ar text not null,
  body_en text,
  body_ar text,
  bullets_en text[] not null default '{}',
  bullets_ar text[] not null default '{}',
  badge_en text,
  badge_ar text,
  button_text_en text,
  button_text_ar text,
  button_url text,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'company')),
  company_id uuid references public.companies(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  check (role = 'admin' or company_id is not null)
);
create index profiles_company_idx on public.profiles(company_id);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

-- Helpers live in a schema the API doesn't expose; security definer so policies can read profiles.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function private.my_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = (select auth.uid()) and role = 'company';
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Only admins decide what is featured; server-side jobs (no auth.uid()) are trusted.
create or replace function public.guard_product_admin_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.is_best_seller := false;
      new.best_seller_order := 0;
    else
      new.is_best_seller := old.is_best_seller;
      new.best_seller_order := old.best_seller_order;
    end if;
  end if;
  return new;
end;
$$;

-- Company accounts may not change their own visibility, ordering or URL
create or replace function public.guard_company_admin_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.is_active := old.is_active;
    new.sort_order := old.sort_order;
    new.slug := old.slug;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_product_admin_fields() from anon, authenticated, public;
revoke execute on function public.guard_company_admin_fields() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;

create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger companies_touch before update on public.companies for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();
create trigger products_guard before insert or update on public.products for each row execute function public.guard_product_admin_fields();
create trigger companies_guard before update on public.companies for each row execute function public.guard_company_admin_fields();

-- Row-level security
alter table public.settings enable row level security;
alter table public.companies enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.banners enable row level security;
alter table public.profiles enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "settings readable" on public.settings for select using (true);
create policy "settings admin update" on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "companies readable" on public.companies for select
  using (is_active or (select private.is_admin()) or id = (select private.my_company_id()));
create policy "companies admin insert" on public.companies for insert to authenticated with check ((select private.is_admin()));
create policy "companies admin or owner update" on public.companies for update to authenticated
  using ((select private.is_admin()) or id = (select private.my_company_id()))
  with check ((select private.is_admin()) or id = (select private.my_company_id()));
create policy "companies admin delete" on public.companies for delete to authenticated using ((select private.is_admin()));

create policy "categories readable" on public.categories for select using (true);
create policy "categories admin insert" on public.categories for insert to authenticated with check ((select private.is_admin()));
create policy "categories admin update" on public.categories for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "categories admin delete" on public.categories for delete to authenticated using ((select private.is_admin()));

create policy "products readable" on public.products for select
  using (
    (is_active and exists (select 1 from public.companies c where c.id = company_id and c.is_active))
    or (select private.is_admin())
    or company_id = (select private.my_company_id())
  );
create policy "products admin or owner insert" on public.products for insert to authenticated
  with check ((select private.is_admin()) or company_id = (select private.my_company_id()));
create policy "products admin or owner update" on public.products for update to authenticated
  using ((select private.is_admin()) or company_id = (select private.my_company_id()))
  with check ((select private.is_admin()) or company_id = (select private.my_company_id()));
create policy "products admin or owner delete" on public.products for delete to authenticated
  using ((select private.is_admin()) or company_id = (select private.my_company_id()));

create policy "banners readable" on public.banners for select using (is_active or (select private.is_admin()));
create policy "banners admin insert" on public.banners for insert to authenticated with check ((select private.is_admin()));
create policy "banners admin update" on public.banners for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "banners admin delete" on public.banners for delete to authenticated using ((select private.is_admin()));

create policy "profiles self or admin read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles admin update" on public.profiles for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "profiles admin delete" on public.profiles for delete to authenticated using ((select private.is_admin()));

create policy "newsletter anyone subscribes" on public.newsletter_subscribers for insert to anon, authenticated with check (true);
create policy "newsletter admin read" on public.newsletter_subscribers for select to authenticated using ((select private.is_admin()));
create policy "newsletter admin delete" on public.newsletter_subscribers for delete to authenticated using ((select private.is_admin()));

-- Storage: public "media" bucket; admins write anywhere, companies only under companies/<their id>/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml']);

create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and ((select private.is_admin()) or (storage.foldername(name))[1] = 'companies' and (storage.foldername(name))[2] = (select private.my_company_id())::text));
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and ((select private.is_admin()) or (storage.foldername(name))[1] = 'companies' and (storage.foldername(name))[2] = (select private.my_company_id())::text));
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((select private.is_admin()) or (storage.foldername(name))[1] = 'companies' and (storage.foldername(name))[2] = (select private.my_company_id())::text));

insert into public.settings (id) values (1);
