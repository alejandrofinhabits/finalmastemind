
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_TOKEN = process.env.N8N_TOKEN;

app.get('/env', (req,res)=>{
  res.json({ N8N_WEBHOOK_URL: N8N_WEBHOOK_URL || null });
});

app.post('/submit', async (req, res) => {
  try {
    if (!N8N_WEBHOOK_URL || !N8N_TOKEN) {
      return res.status(500).json({ ok:false, error: 'Missing N8N_WEBHOOK_URL or N8N_TOKEN in server env.' });
    }
    const r = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${N8N_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ intake: req.body })
    });
    const ct = r.headers.get('content-type') || '';
    let data;
    if (ct.includes('application/json')) data = await r.json();
    else data = { raw: await r.text() };
    res.status(r.status).json({ ok: r.ok, status: r.status, data });
  } catch (err) {
    res.status(500).json({ ok:false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log('Finhabits Wizard running on port', PORT);
});
