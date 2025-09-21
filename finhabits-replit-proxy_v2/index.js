
import express from 'express';
import fetch from 'node-fetch';
import OpenAI from 'openai';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_TOKEN = process.env.N8N_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

app.get('/env', (req,res)=>{
  res.json({
    N8N_WEBHOOK_URL: N8N_WEBHOOK_URL || null,
    hasOpenAI: Boolean(OPENAI_API_KEY)
  });
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

function buildArticlePrompt(body){
  const {
    topic,
    primary_kw,
    secondary_kws = [],
    seo_title,
    meta_description,
    target_url,
    intent,
    language,
    word_count_min,
    word_count_max,
    author_name,
    author_credentials,
    last_updated,
    additional_notes,
    lead_paragraph_seed,
    outline_sections,
    serp_strategy,
    trust_signals,
    on_page_requirements,
    ux_modules,
    internal_linking,
    style_notes
  } = body;

  const listFromInput = (value, fallback) => {
    let arr = [];
    if (Array.isArray(value)) arr = value;
    else if (typeof value === 'string') {
      arr = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }
    if (!arr.length) arr = fallback;
    return arr;
  };

  const secondaryLine = secondary_kws.length
    ? secondary_kws.map((kw) => kw.trim()).filter(Boolean).join(', ')
    : 'None provided';

  const lang = language || 'US English';
  const intentLine = intent || 'Informational (education-first).';
  const minWords = word_count_min || 1400;
  const maxWords = word_count_max || 1900;
  const authorLine = author_name && author_credentials
    ? `${author_name}, ${author_credentials}`
    : (author_name || 'Finhabits Editorial Team');
  const updatedLine = last_updated || 'September 18, 2025';
  const notes = additional_notes ? `\n- Additional guardrails: ${additional_notes.trim()}` : '';
  const leadSeed = lead_paragraph_seed ? lead_paragraph_seed.trim() : '';

  const outlineBlock = listFromInput(outline_sections, [
    'Intro with outcome-first promise + DefinitionSnippet',
    `What it is (precise definition with the primary keyword “${primary_kw}” verbatim)`,
    'Why it matters (benefits, risks, trade-offs)',
    'Key regulatory or state-by-state requirements (group logically)',
    'Documents, steps, or process checklist',
    'Common mistakes and how to avoid delays',
    'FAQs resolving People-Also-Ask queries',
    'Glossary (definitions of 6–10 terms)',
    'CTA + support options'
  ]);

  const serpBlock = listFromInput(serp_strategy, [
    `DefinitionSnippet: a 40–55-word lead paragraph that defines the topic using “${primary_kw}” verbatim once.`,
    'PAA: add 5–7 FAQs with concise, direct answers (40–70 words each). Target comparison and compliance queries.',
    'Comparison blocks: use tables where relevant (e.g., inclusions vs exclusions, state differences).',
    'Visuals: propose 2–3 simple charts/tables and 1 calculator or checklist if the topic fits (don’t invent data).'
  ]);

  const trustBlock = listFromInput(trust_signals, [
    'Author line with relevant credentials; last-updated date.',
    'Cite neutral authorities (e.g., NAIC, state DMV pages) where needed; avoid brand bias.',
    'Add a clear disclaimer: informational, not legal/financial advice.',
    'Inclusive, plain language; explain jargon in the Glossary.'
  ]);

  const onPageBlock = listFromInput(on_page_requirements, [
    'Use the exact H1, Title, and Meta provided.',
    `Mention ${primary_kw} in the first 100 words and once in an H2/H3; keep density natural.`,
    'Weave the secondary keywords where they fit contextually.',
    'Add an actionable CTA at the end.',
    'Accessibility: descriptive alt text for all images; clear link text (no “click here”).'
  ]);

  const uxBlock = listFromInput(ux_modules, [
    'DefinitionSnippet (40–55 words) with the primary keyword verbatim in the first sentence',
    'Scannable TL;DR box (bulleted list of 4–6 items)',
    'Legal obligations & penalties matrix (high level)',
    'Proof of financial responsibility explainer (SR-22 overview)',
    'State-by-state requirement summary (grouped)',
    'DMV appointment & documents checklist'
  ]);

  const internalBlock = listFromInput(internal_linking, [
    'Link to the calculator page, the general car insurance hub, and related topics (full coverage, cost, registration, switching). Use descriptive anchors.'
  ]);

  const styleBlock = listFromInput(style_notes, [
    'Clear, direct, and helpful. No hype, no fluff.',
    'Use examples with realistic ranges; never fabricate sources.',
    'Avoid repetitive phrasing and AI-ish templates. Vary sentence openings and keep rhythm human.'
  ]);

  return `You are a senior SEO content strategist for Finhabits. Write a blog that fully satisfies user intent and is AI-Overviews-ready.

GOAL
- Build the best resource on: “${topic}”
- Primary keyword (use verbatim, keep original language): ${primary_kw}
- Secondary keywords (use naturally, no stuffing): ${secondaryLine}
- Intent: ${intentLine} Optimize for Featured Snippet (definition paragraph), People-Also-Ask, and rich results.

MANDATORIES
- H1 (visible on page): ${topic}
- SEO Title (≤60 chars, keep as provided): ${seo_title}
- Meta description (≤160 chars, keep as provided): ${meta_description}
- URL to target: ${target_url}
- Language: ${lang} for body copy; if the primary keyword is Spanish, include it verbatim in the H1 and in the first 100 words. Do not translate the primary keyword.
- Word count: ${minWords}–${maxWords} words. Short paragraphs (2–3 sentences), meaningful subheads every 150–200 words.${notes}

STRUCTURE & OUTLINE (use and adapt to the topic)
${outlineBlock.map((item) => `- ${item}`).join('\n')}

SERP STRATEGY
${serpBlock.map((item) => `- ${item}`).join('\n')}

TRUST & COMPLIANCE (E-E-A-T)
${trustBlock.map((item) => `- ${item}`).join('\n')}

ON-PAGE REQUIREMENTS
${onPageBlock.map((item) => `- ${item}`).join('\n')}

SCHEMA (JSON-LD)
- Add FAQPage for FAQs, HowTo if there is a step-by-step, WebPage + BreadcrumbList + Organization.
- Keep JSON-LD valid, minimal, and non-duplicative.

UX MODULES TO INCLUDE
${uxBlock.map((item) => `- ${item}`).join('\n')}

INTERNAL LINKING (anchor suggestions)
${internalBlock.map((item) => `- ${item}`).join('\n')}

STYLE & TONE
${styleBlock.map((item) => `- ${item}`).join('\n')}

LEAD PARAGRAPH (write this now, 40–55 words, includes “${primary_kw}” once)
>>>${leadSeed}

Then continue with the full article following the outline above. Close with:
- Author: ${authorLine}
- Last updated: ${updatedLine}
- Disclaimer: This content is for informational purposes only and does not constitute legal or financial advice. Always consult your state DMV or a licensed insurance professional.
`;
}

app.post('/generate-article', async (req, res) => {
  if (!openai) {
    return res.status(500).json({ ok: false, error: 'Missing OPENAI_API_KEY in server env.' });
  }

  try {
    const body = req.body || {};
    const required = ['topic', 'primary_kw', 'seo_title', 'meta_description', 'target_url'];
    const missing = required.filter((key) => !body[key]);
    if (missing.length) {
      return res.status(400).json({ ok: false, error: `Faltan campos obligatorios: ${missing.join(', ')}` });
    }

    const prompt = buildArticlePrompt(body);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an elite SEO content strategist who writes publication-ready articles for Finhabits.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    const text = completion?.choices?.[0]?.message?.content || '';
    res.json({ ok: true, article: text, prompt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log('Finhabits Wizard running on port', PORT);
});
