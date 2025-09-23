-- 1) Create public storage bucket for sign language clips
insert into storage.buckets (id, name, public)
values ('sign_language_clips', 'sign_language_clips', true)
on conflict (id) do nothing;

-- 2) Drop existing policies if they exist (ignore errors)
drop policy if exists "asl_public_read_sign_language_clips" on storage.objects;
drop policy if exists "asl_auth_insert_sign_language_clips" on storage.objects;
drop policy if exists "asl_auth_update_sign_language_clips" on storage.objects;
drop policy if exists "asl_auth_delete_sign_language_clips" on storage.objects;

-- 3) Create storage policies for bucket sign_language_clips
-- Public read for playback
create policy "asl_public_read_sign_language_clips"
  on storage.objects for select
  using (bucket_id = 'sign_language_clips');

-- Authenticated users can insert
create policy "asl_auth_insert_sign_language_clips"
  on storage.objects for insert
  with check (bucket_id = 'sign_language_clips' and auth.role() = 'authenticated');

-- Authenticated users can update
create policy "asl_auth_update_sign_language_clips"
  on storage.objects for update
  using (bucket_id = 'sign_language_clips' and auth.role() = 'authenticated')
  with check (bucket_id = 'sign_language_clips');

-- Authenticated users can delete
create policy "asl_auth_delete_sign_language_clips"
  on storage.objects for delete
  using (bucket_id = 'sign_language_clips' and auth.role() = 'authenticated');