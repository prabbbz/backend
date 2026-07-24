// ============================================================
//  NPC AI Voice Chat - Backend Server
//  Fungsi: Terima pesan (hasil STT) dari Roblox -> tanya ke AI
//          (Groq, gratis) -> kembalikan teks balasan NPC.
//  Suara (TTS) dan mic (STT) diproses NATIVE di Roblox,
//  server ini HANYA mengurus "otak" NPC.
// ============================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SHARED_SECRET = process.env.SHARED_SECRET || 'prabbbz';

// Simpan riwayat percakapan per-player per-NPC di memori (sederhana).
// key: `${userId}_${npcId}` -> array pesan
const conversationMemory = new Map();
const MAX_HISTORY = 6; // jumlah pesan terakhir yang diingat (biar hemat & cepat)

function getHistoryKey(userId, npcId) {
  return `${userId}_${npcId}`;
}

// Middleware sederhana buat cek "kunci rahasia" dari Roblox,
// supaya orang lain di internet gak bisa sembarangan pakai server ini.
function checkSecret(req, res, next) {
  const secret = req.headers['x-shared-secret'];
  if (secret !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/', (req, res) => {
  res.send('NPC AI Voice Chat backend is running.');
});

// Endpoint utama yang dipanggil dari Roblox (server script)
app.post('/npc-chat', checkSecret, async (req, res) => {
  try {
    const { userId, npcId, npcPersona, playerMessage } = req.body;

    if (!playerMessage || !npcId) {
      return res.status(400).json({ error: 'playerMessage dan npcId wajib diisi' });
    }

    const key = getHistoryKey(userId || 'anon', npcId);
    const history = conversationMemory.get(key) || [];

    const systemPrompt = npcPersona ||
      'Kamu adalah NPC/warga di sebuah game Roblox. Jawab singkat (maksimal 2-3 kalimat), ' +
      'ramah, sesuai karakter, dan gunakan bahasa yang natural seperti orang mengobrol langsung. ' +
      'Jangan gunakan simbol markdown, emoji, atau tanda baca aneh karena jawabanmu akan diubah jadi suara.';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: playerMessage },
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq error:', errText);
      return res.status(500).json({ error: 'Gagal menghubungi AI', detail: errText });
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Maaf, aku tidak mengerti.';

    // Update memori percakapan
    history.push({ role: 'user', content: playerMessage });
    history.push({ role: 'assistant', content: reply });
    while (history.length > MAX_HISTORY) history.shift();
    conversationMemory.set(key, history);

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// Reset memori percakapan (opsional, dipanggil kalau player pergi dari NPC)
app.post('/npc-chat/reset', checkSecret, (req, res) => {
  const { userId, npcId } = req.body;
  conversationMemory.delete(getHistoryKey(userId || 'anon', npcId));
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`NPC AI backend jalan di port ${PORT}`);
});
