// NutriTrack Backend — Gemini API proxy
// Deploy to Render.com — set GEMINI_API_KEY in environment variables
// Get free key at: aistudio.google.com

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash
:generateContent?key=${API_KEY}`;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'NutriTrack API running', ready: !!API_KEY });
});

app.post('/analyze', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured on server' });

  const { messages, system } = req.body;
  if (!messages || !system) return res.status(400).json({ error: 'Missing messages or system' });

  try {
    // Convert Anthropic-style messages to Gemini format
    const parts = [];

    // Add system prompt as first user part
    parts.push({ text: system });

    // Add each message content
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            parts.push({ text: block.text });
          } else if (block.type === 'image') {
            parts.push({
              inlineData: {
                mimeType: block.source.media_type,
                data: block.source.data
              }
            });
          }
        }
      }
    }

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.3 }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'Gemini API error' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ result: text });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`NutriTrack server running on port ${PORT}`);
  console.log(`Gemini API key configured: ${!!API_KEY}`);
});
