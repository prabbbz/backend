# PRABU Remote v0.2 — AUTO ENROLL

Private multi-device Android dashboard.

## Arsitektur

- Android APK: auto-enroll, heartbeat, notification bridge, command bridge.
- Web: Next.js dashboard untuk melihat banyak device dari satu laptop.
- Backend: Supabase Auth + PostgreSQL + Realtime.
- Deploy web: Vercel.
- Build APK: GitHub Actions.

## Auto-enroll

Tidak ada pairing code atau pairing screen.
Setiap instalasi membuat UUID sendiri. Saat aplikasi pertama kali dibuka dan server dapat dihubungi, UUID dikirim ke endpoint register. Server membuat device token unik untuk instalasi tersebut.

Catatan: Android tidak mengizinkan aplikasi pihak ketiga menjalankan proses koneksi setelah paket baru selesai di-install tanpa interaksi pengguna. Karena itu auto-enroll dilakukan saat aplikasi pertama kali dibuka. Setelah itu service menjaga koneksi; token tersimpan lokal.

## Setup

1. Buat project Supabase.
2. Jalankan `supabase/schema.sql`.
3. Buat user admin di Supabase Authentication dan catat UUID user tersebut sebagai `OWNER_USER_ID`.
4. Deploy folder `web` ke Vercel dengan Root Directory `web`.
5. Isi environment variables Vercel.
6. Buat GitHub Secrets `PRABU_SERVER_URL` dan `PRABU_INSTALL_KEY`.
7. Jalankan GitHub Actions `Build PRABU Remote APK`.
8. Install APK dan buka sekali di Android.

## Permissions

- Notification Access untuk membaca notifikasi.
- Accessibility untuk command HOME/BACK/RECENTS.
- Foreground Service untuk menjaga bridge tetap berjalan.

Live screen / MediaProjection + WebRTC belum termasuk v0.2.
