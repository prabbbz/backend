'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '../lib/supabase-browser';

type Device = {
  id: string;
  device_uuid: string;
  device_name: string;
  model: string | null;
  android_version: string | null;
  battery: number;
  is_charging: boolean;
  last_seen: string;
};

type Notice = {
  id: number;
  device_id: string;
  app_name: string | null;
  title: string | null;
  content: string | null;
  posted_at: string;
};

type Health = {
  ok: boolean;
  config: Record<string, boolean>;
};

const ONLINE_MS = 25_000;

function onlineNow(lastSeen: string, now: number) {
  return now - new Date(lastSeen).getTime() < ONLINE_MS;
}

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const browserConfigured = hasSupabaseBrowserConfig();

  const [session, setSession] = useState<any>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selected, setSelected] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const [health, setHealth] = useState<Health | null>(null);

  const onlineCount = useMemo(
    () => devices.filter((d) => onlineNow(d.last_seen, now)).length,
    [devices, now]
  );

  async function load() {
    if (!supabase) return;
    const [deviceResult, noticeResult] = await Promise.all([
      supabase.from('devices').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('posted_at', { ascending: false }).limit(100),
    ]);

    if (deviceResult.error) {
      setMessage(`Devices: ${deviceResult.error.message}`);
      return;
    }
    if (noticeResult.error) {
      setMessage(`Notifications: ${noticeResult.error.message}`);
      return;
    }

    setDevices((deviceResult.data ?? []) as Device[]);
    setNotices((noticeResult.data ?? []) as Notice[]);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session || !supabase) return;
    load();
    const channel = supabase
      .channel('prabu-remote-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Login berhasil');
    setBusy(false);
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSelected(null);
  }

  async function command(deviceId: string, action: 'HOME' | 'BACK' | 'RECENTS') {
    if (!supabase) return;
    setBusy(true);
    setMessage(`Mengirim ${action}…`);
    const { error } = await supabase.from('commands').insert({ device_id: deviceId, action });
    setMessage(error ? error.message : `${action} dikirim`);
    setBusy(false);
  }

  if (!browserConfigured || health?.config && !health.ok) {
    const config = health?.config;
    return (
      <main className="auth-page">
        <section className="setup-card">
          <div className="brand">PRABU <span>REMOTE</span></div>
          <h1>Konfigurasi belum lengkap</h1>
          <p className="muted">Website sudah berhasil dijalankan, tetapi environment variables belum lengkap. Setelah diisi di Vercel, lakukan Redeploy.</p>
          <div className="checks">
            {[
              ['Supabase URL', config?.supabaseUrl ?? browserConfigured],
              ['Supabase Publishable/Anon Key', config?.supabasePublicKey ?? browserConfigured],
              ['Supabase Secret Key', config?.supabaseSecretKey],
              ['OWNER_USER_ID', config?.ownerUserId],
              ['INSTALL_KEY', config?.installKey],
            ].map(([label, ok]) => (
              <div className="check" key={String(label)}><span>{ok ? '✓' : '×'}</span><div>{label}</div><strong>{ok ? 'OK' : 'BELUM ADA'}</strong></div>
            ))}
          </div>
          <div className="setup-code">
            <div>Vercel → Settings → Environment Variables</div>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
            <code>SUPABASE_SECRET_KEY</code>
            <code>OWNER_USER_ID</code>
            <code>INSTALL_KEY</code>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={login}>
          <div className="brand">PRABU <span>REMOTE</span></div>
          <p className="muted">Private Android device dashboard</p>
          <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy}>Masuk</button>
          {message && <div className="error">{message}</div>}
        </form>
      </main>
    );
  }

  const detail = selected;
  const selectedNotices = detail ? notices.filter((n) => n.device_id === detail.id).slice(0, 20) : [];

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="brand">PRABU <span>REMOTE</span></div><div className="subtitle">Android fleet control</div></div>
        <div className="top-actions"><div className="online-pill">● {onlineCount} ONLINE</div><button className="ghost" onClick={logout}>Keluar</button></div>
      </header>

      <section className="hero"><div><h1>Devices</h1><p>APK yang sudah terdaftar akan muncul otomatis tanpa pairing.</p></div><button className="ghost" onClick={load}>Refresh</button></section>

      <section className="grid">
        {devices.map((d) => {
          const online = onlineNow(d.last_seen, now);
          return (
            <button className={`device-card ${selected?.id === d.id ? 'active' : ''}`} key={d.id} onClick={() => setSelected(d)}>
              <div className="card-head"><span className={`status-dot ${online ? 'online' : ''}`}></span><span>{online ? 'ONLINE' : 'OFFLINE'}</span></div>
              <h2>{d.device_name}</h2>
              <div className="model">{d.model || 'Android device'} · {d.android_version || 'Unknown Android'}</div>
              <div className="battery-row"><span>Battery</span><strong>{d.battery}% {d.is_charging ? '⚡' : ''}</strong></div>
              <div className="lastseen">Last seen {new Date(d.last_seen).toLocaleString('id-ID')}</div>
            </button>
          );
        })}
        {!devices.length && <div className="empty">Belum ada device terdaftar. Install APK, buka sekali, lalu device akan auto-enroll ke sini.</div>}
      </section>

      {detail && (
        <section className="detail">
          <div className="detail-main">
            <div className="detail-title"><div><span className="eyebrow">DEVICE</span><h2>{detail.device_name}</h2><p>{detail.model} · Android {detail.android_version}</p></div><button className="ghost" onClick={() => setSelected(null)}>Tutup</button></div>
            <div className="screen-placeholder"><div className="phone-icon">▯</div><h3>Live Screen</h3><p>Modul MediaProjection + WebRTC belum diaktifkan pada v0.2. Tombol navigasi di bawah sudah memakai command bridge.</p></div>
            <div className="controls"><button onClick={() => command(detail.id, 'BACK')} disabled={busy}>◀ BACK</button><button onClick={() => command(detail.id, 'HOME')} disabled={busy}>● HOME</button><button onClick={() => command(detail.id, 'RECENTS')} disabled={busy}>▣ RECENTS</button></div>
          </div>
          <aside className="sidepanel"><div className="side-head"><h3>Notifications</h3><span>{selectedNotices.length}</span></div>{selectedNotices.map((n) => <div className="notice" key={n.id}><strong>{n.app_name || 'Notification'}</strong><div>{n.title || '(tanpa judul)'}</div><p>{n.content || '(tanpa isi)'}</p><small>{new Date(n.posted_at).toLocaleString('id-ID')}</small></div>)}{!selectedNotices.length && <div className="empty">Belum ada notifikasi.</div>}</aside>
        </section>
      )}

      {message && <button className="toast" onClick={() => setMessage('')}>{message}</button>}
    </main>
  );
}
