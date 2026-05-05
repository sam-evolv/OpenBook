-- Fix: Google OAuth signups failed with "Database error saving new user".
--
-- Root cause: handle_new_auth_user() used ON CONFLICT (user_id), but the
-- customers table has only a *partial* unique index on user_id
-- (WHERE user_id IS NOT NULL). Postgres cannot infer a partial index for
-- ON CONFLICT without the matching predicate, so the insert raised
-- 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
-- specification"). That aborted the transaction containing the
-- auth.users insert, so handle_new_owner() never got to create the
-- owners row either.
--
-- Add the WHERE predicate so ON CONFLICT matches the partial index.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (user_id, email, name, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (user_id) where user_id is not null do nothing;
  return new;
end;
$$;
