# Build APK dari GitHub Actions

Repository harus berisi folder `.github`, `android`, `web`, dan `supabase`.

## 1. Push project

Upload seluruh isi project ke repository GitHub, misalnya `PRABU-REMOTE`.

## 2. Tambahkan GitHub Secrets

Buka:

`Repository → Settings → Secrets and variables → Actions → New repository secret`

Tambahkan:

- `PRABU_SERVER_URL` = URL Vercel kamu, contoh `https://prabu-remote.vercel.app`
- `PRABU_INSTALL_KEY` = nilai random panjang yang sama dengan `INSTALL_KEY` di Vercel

Jangan commit secret ke source code.

## 3. Jalankan build

Buka:

`Actions → Build PRABU Remote APK → Run workflow`

Tunggu workflow hijau.

## 4. Ambil APK

Masuk ke hasil workflow → bagian `Artifacts` →

`PRABU-Remote-v0.2-debug-apk`

Di dalamnya ada `app-debug.apk`.

## 5. Catatan

Jika GitHub Secrets belum diisi, workflow tetap menghasilkan APK tetapi APK memakai placeholder dan belum bisa auto-connect. Setelah Secrets diisi, jalankan workflow lagi.
