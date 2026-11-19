-- SQL схема для Supabase: «ТаксиДрайв» (TaxiPulse)
-- Выполните в SQL Editor в консоли Supabase (supabase.com)

-- 1. Таблица профилей водителей
create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text not null default 'Водитель',
  car_model text default 'Эконом',
  fuel_type text default 'ai95',
  default_rent numeric not null default 2200,
  default_goal numeric not null default 5000,
  default_fuel_consumption numeric not null default 8.5,
  default_fuel_price numeric not null default 58,
  pin_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс по номеру телефона
create index if not exists idx_driver_profiles_phone on public.driver_profiles(phone);

-- 2. Таблица смен
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.driver_profiles(id) on delete cascade not null,
  date date not null default current_date,
  start_time text not null,
  end_time text,
  duration_hours numeric not null default 0,
  mileage_km numeric not null default 0,
  start_odometer numeric,
  end_odometer numeric,
  
  -- Финансы
  gross_revenue numeric not null default 0,
  fuel_liters numeric not null default 0,
  fuel_cost numeric not null default 0,
  rent_cost numeric not null default 0,
  other_expenses_total numeric not null default 0,
  expenses jsonb default '[]'::jsonb,
  
  -- Расчетные метрики
  total_expenses numeric not null default 0,
  net_profit numeric not null default 0,
  hourly_rate numeric not null default 0,
  cost_per_km numeric not null default 0,
  revenue_per_km numeric not null default 0,
  fuel_consumption_per_100km numeric not null default 0,
  
  status text not null default 'completed' check (status in ('active', 'completed')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс по водителю и дате
create index if not exists idx_shifts_driver_date on public.shifts(driver_id, date desc);

-- 3. Таблица доп. расходов смены (еда, кофе, мойка, штрафы и т.д.)
create table if not exists public.shift_expenses (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references public.shifts(id) on delete cascade not null,
  category text not null,
  amount numeric not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс по смене
create index if not exists idx_shift_expenses_shift_id on public.shift_expenses(shift_id);

-- RLS (Row Level Security) политики
alter table public.driver_profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_expenses enable row level security;

-- Публичные политики для доступа по anon ключу
create policy "Allow all actions for anon client" on public.driver_profiles
  for all using (true) with check (true);

create policy "Allow all actions for anon client on shifts" on public.shifts
  for all using (true) with check (true);

create policy "Allow all actions for anon client on shift_expenses" on public.shift_expenses
  for all using (true) with check (true);
