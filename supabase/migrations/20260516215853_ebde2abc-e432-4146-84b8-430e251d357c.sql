insert into storage.buckets (id, name, public) values ('bg-music', 'bg-music', true) on conflict (id) do update set public = true;

create policy "Public read bg-music" on storage.objects for select using (bucket_id = 'bg-music');