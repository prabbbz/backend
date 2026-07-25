// ============================================================
//  NPC AI Voice Chat - Backend v2 "AAA Edition" (Vercel, GRATIS)
//  Endpoint: https://nama-project-kamu.vercel.app/api/npc-chat
//
//  Fitur v2:
//  - Balasan AI sekarang termasuk "emotion" (netral/senang/sedih/marah/
//    penasaran) supaya Roblox bisa ubah warna subtitle & nada suara NPC
//  - Mode "greeting": NPC bisa menyapa duluan begitu didekati player,
//    tanpa player perlu ngomong dulu
//  - Parsing JSON yang lebih tangguh (kalau AI kasih output aneh, tetap
//    fallback aman, tidak bikin request gagal total)
// ============================================================

const conversationMemory = new Map();
const MAX_HISTORY = 8;

function getHistoryKey(userId, npcId) {
  return `${userId}_${npcId}`;
}

const VALID_EMOTIONS = ['netral', 'senang', 'sedih', 'marah', 'penasaran', 'takut'];

// Coba parse JSON dari balasan AI. Kalau AI membungkus dengan ```json atau
// nambah teks lain di luar JSON, tetap diusahakan diselamatkan.
function parseAIResponse(raw) {
  if (!raw) return { reply: 'Maaf, aku tidak mengerti.', emotion: 'netral' };

  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const reply = String(parsed.reply || parsed.text || cleaned).trim();
      let emotion = String(parsed.emotion || 'netral').toLowerCase().trim();
      if (!VALID_EMOTIONS.includes(emotion)) emotion = 'netral';
      return { reply, emotion };
    } catch (e) {
      // lanjut ke fallback di bawah
    }
  }

  // Fallback: anggap semua teks adalah reply polos, emosi netral
  return { reply: cleaned, emotion: 'netral' };
}

async function callGroq(messages, maxTokens) {
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.85,
      max_tokens: maxTokens || 220,
      response_format: { type: 'json_object' },
    }),
  });

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    throw new Error(`Groq error ${groqResponse.status}: ${errText}`);
  }

  const data = await groqResponse.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function buildSystemPrompt(npcPersona) {
  const basePersona = npcPersona ||
    'Kamu adalah NPC/warga di sebuah game Roblox. Ramah dan sesuai karakter.';

  return `${basePersona}

ATURAN PENTING:
- Jawab singkat, maksimal 2-3 kalimat pendek, gaya bicara natural seperti orang mengobrol langsung (bukan menulis).
- JANGAN pakai markdown, emoji, tanda kurung aksi (seperti *tersenyum*), atau simbol aneh, karena jawabanmu akan diubah jadi suara.
- Kamu HARUS selalu balas dalam format JSON persis seperti ini, tanpa teks lain di luar JSON:
{"reply": "isi balasanmu di sini", "emotion": "salah satu dari: netral, senang, sedih, marah, penasaran, takut"}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-shared-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SHARED_SECRET = process.env.SHARED_SECRET || 'ganti-ini-dengan-kode-rahasia';
  const secret = req.headers['x-shared-secret'];
  if (secret !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, npcId, npcPersona, playerMessage, isGreeting } = req.body || {};

    if (!npcId) {
      return res.status(400).json({ error: 'npcId wajib diisi' });
    }
    if (!isGreeting && !playerMessage) {
      return res.status(400).json({ error: 'playerMessage wajib diisi (kecuali mode greeting)' });
    }

    const key = getHistoryKey(userId || 'anon', npcId);
    const history = conversationMemory.get(key) || [];
    const systemPrompt = buildSystemPrompt(npcPersona);

    const userTurn = isGreeting
      ? '(Player baru saja mendekatimu dan belum bicara apa-apa. Sapa dia duluan secara singkat dan sesuai karaktermu.)'
      : playerMessage;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userTurn },
    ];

    const rawReply = await callGroq(messages, isGreeting ? 100 : 220);
    const { reply, emotion } = parseAIResponse(rawReply);

    history.push({ role: 'user', content: userTurn });
    history.push({ role: 'assistant', content: reply });
    while (history.length > MAX_HISTORY) history.shift();
    conversationMemory.set(key, history);

    return res.status(200).json({ reply, emotion });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
