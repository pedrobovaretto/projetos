-- Cria as tabelas de produtos, locais de estoque e movimentações.
-- Rode isto uma única vez no SQL Editor do painel do Supabase.

create table public.products (
  id text primary key,
  name text not null,
  product_class text not null,
  active_ingredient text not null default '',
  unit text not null,
  active boolean not null default true
);

create table public.stock_locations (
  id text primary key,
  name text not null,
  active boolean not null default true
);

create table public.movements (
  id text primary key,
  date date not null,
  type text not null check (type in ('entrada', 'saida')),
  product_id text not null references public.products(id),
  quantity numeric not null,
  unit_price numeric not null default 0,
  location text not null,
  activity text,
  note text,
  os_number text,
  created_at timestamptz not null default now()
);

create index on public.movements (product_id);
create index on public.movements (location);

alter table public.products enable row level security;
alter table public.stock_locations enable row level security;
alter table public.movements enable row level security;

-- Sem login ainda: qualquer um com a chave pública (já embutida no site) pode ler/escrever.
-- Mesmo nível de exposição que o site já tem hoje (sem senha).
create policy "public all" on public.products for all using (true) with check (true);
create policy "public all" on public.stock_locations for all using (true) with check (true);
create policy "public all" on public.movements for all using (true) with check (true);
