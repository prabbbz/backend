# PRABU Remote Web — Vercel

Deploy folder `web` sebagai project Next.js di Vercel.

Jika repository kamu berisi `android/`, `web/`, dan `supabase/`, set:

- Framework Preset: Next.js
- Root Directory: `web`

Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OWNER_USER_ID`
- `INSTALL_KEY`

`INSTALL_KEY` harus sama persis dengan GitHub Secret `PRABU_INSTALL_KEY` yang dipakai saat build APK.

`SUPABASE_SECRET_KEY` hanya boleh disimpan sebagai Environment Variable server-side di Vercel. Jangan taruh secret key di `NEXT_PUBLIC_*` dan jangan commit ke GitHub.

Setelah menambah/mengubah Environment Variables, lakukan Redeploy.
