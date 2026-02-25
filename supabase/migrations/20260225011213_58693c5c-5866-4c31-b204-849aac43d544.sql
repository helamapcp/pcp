
-- Create role enum
create type public.app_role as enum ('admin', 'gerente', 'operador');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  created_at timestamptz default now()
);

-- User roles table (separate per security requirements)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  unit_weight_kg numeric not null default 0,
  created_at timestamptz default now()
);

-- Inventory logs (audit trail)
create table public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  quantity integer not null default 0,
  from_sector text,
  to_sector text,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  action_type text not null,
  notes text,
  created_at timestamptz default now()
);

-- Stock snapshots (current stock per product per sector)
create table public.stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  sector text not null,
  quantity integer not null default 0,
  unit text not null default 'units',
  total_kg numeric not null default 0,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  created_at timestamptz default now()
);

-- Separations (pending physical transfers)
create table public.separations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  product_name text not null,
  quantity integer not null,
  from_sector text not null,
  to_sector text not null,
  status text not null default 'pending',
  operator text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Get user role
create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', 'Novo Usuário')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies

-- Profiles
create policy "Authenticated can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Admins can delete profiles" on public.profiles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- User roles
create policy "Users can view own or admin views all" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Categories
create policy "Authenticated can view categories" on public.categories for select to authenticated using (true);
create policy "Admins can insert categories" on public.categories for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update categories" on public.categories for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Products
create policy "Authenticated can view products" on public.products for select to authenticated using (true);
create policy "Admins can insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Inventory logs
create policy "Authenticated can view logs" on public.inventory_logs for select to authenticated using (true);
create policy "Authenticated can insert logs" on public.inventory_logs for insert to authenticated with check (true);

-- Stock snapshots
create policy "Authenticated can view snapshots" on public.stock_snapshots for select to authenticated using (true);
create policy "Authenticated can insert snapshots" on public.stock_snapshots for insert to authenticated with check (true);

-- Separations
create policy "Authenticated can view separations" on public.separations for select to authenticated using (true);
create policy "Authenticated can insert separations" on public.separations for insert to authenticated with check (true);
create policy "Authenticated can update separations" on public.separations for update to authenticated using (true);
