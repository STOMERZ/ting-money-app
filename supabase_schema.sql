-- Create Transactions Table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date,
  type text,
  amount numeric,
  sender_name text,
  receiver_name text,
  bank text,
  shop text,
  note text,
  items text,
  shipping numeric default 0,
  cost numeric default 0,
  profit numeric default 0,
  image_url text
);

-- Enable Row Level Security (RLS)
alter table public.transactions enable row level security;

-- Create Policy to allow anonymous insert/select (For easier setup, can be restricted later)
create policy "Allow anonymous access"
on public.transactions
for all
to anon
using (true)
with check (true);

-- Create Storage Bucket for Slips
insert into storage.buckets (id, name, public)
values ('slips', 'slips', true);

-- Enable Storage Policy (Allow public uploads/read)
create policy "Public Access to Slips"
on storage.objects for all
to anon
using ( bucket_id = 'slips' )
with check ( bucket_id = 'slips' );
