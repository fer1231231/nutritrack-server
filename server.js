// NutriTrack Backend — Express proxy for Anthropic API
// Deploy to Render.com (free tier) — set ANTHROPIC_API_KEY in environment variables

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // large enough for base64 images

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'NutriTrack API running', ready: !!API_KEY });
});

// Main proxy endpoint — forwards requests to Anthropic
app.post('/analyze', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const { messages, system } = req.body;
  if (!messages || !system) {
    return res.status(400).json({ error: 'Missing messages or system prompt' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      return res.status(response.status).json({ error: err?.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    res.json({ result: text });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`NutriTrack server running on port ${PORT}`);
  console.log(`API key configured: ${!!API_KEY}`);
});
