// ============================================================
//  NPC AI Voice Chat - Backend (versi Vercel, GRATIS, TANPA KARTU)
//  File ini otomatis jadi endpoint: https://nama-project-kamu.vercel.app/api/npc-chat
// ============================================================

// Memori percakapan sederhana. Catatan: karena ini serverless,
// memori bisa "reset" kalau server lama tidak aktif (cold start).
// Untuk NPC obrolan santai ini biasanya tidak masalah.
const conversationMemory = new Map();
const MAX_HISTORY = 6;

function getHistoryKey(userId, npcId) {
  return `${userId}_${npcId}`;
}

module.exports = async (req, res) => {
  // Izinkan request dari Roblox
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-shared-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SHARED_SECRET = process.env.SHARED_SECRET || 'prabbbz';
  const secret = req.headers['x-shared-secret'];
  if (secret !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, npcId, npcPersona, playerMessage } = req.body || {};

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
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
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

    history.push({ role: 'user', content: playerMessage });
    history.push({ role: 'assistant', content: reply });
    while (history.length > MAX_HISTORY) history.shift();
    conversationMemory.set(key, history);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
