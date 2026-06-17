import fs from 'node:fs/promises';
import path from 'node:path';

const KEY = process.env.LOVABLE_API_KEY;
if (!KEY) { console.error('missing LOVABLE_API_KEY'); process.exit(1); }

const LANGS = {
  es: 'Spanish (Spain)',
  ca: 'Catalan',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese (Brazil)',
  ja: 'Japanese',
  tr: 'Turkish',
  ar: 'Arabic',
};

const en = JSON.parse(await fs.readFile('src/i18n/locales/en/common.json', 'utf8'));
const slice = {
  pipeline: en.home.pipeline,
  moat: en.home.moat,
  dpp: en.home.dpp,
  gtm: en.home.gtm,
};

async function translate(targetLabel) {
  const sys = `Translate every string value in the JSON object below to ${targetLabel}. Keep JSON structure and keys identical. Preserve numbers, currency symbols, brand names (Eko, TikTok, Reels, Shorts, Topo Chico, Coca-Cola, Masafi, Mirriad, Kantar, C2PA, EU AI Act, LatAm, US-Hispanic, MENA, UAE, Saudi Arabia, Abu Dhabi, UK, EU, CPM, CAC), and the middle-dot "·" character. Never use em-dashes (—); use commas or periods instead. Return ONLY the JSON, no commentary, no markdown fences.`;
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: JSON.stringify(slice, null, 2) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = await res.json();
  let txt = data.choices[0].message.content.trim();
  txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  txt = txt.replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(txt); } catch (e) {
    console.error('parse fail, raw:', txt.slice(0, 2000));
    throw e;
  }
}

for (const [code, label] of Object.entries(LANGS)) {
  const p = `src/i18n/locales/${code}/common.json`;
  const json = JSON.parse(await fs.readFile(p, 'utf8'));
  console.log(`→ ${code}`);
  const translated = await translate(label);
  json.home = { ...json.home, ...translated };
  await fs.writeFile(p, JSON.stringify(json, null, 2) + '\n');
  console.log(`  wrote ${p}`);
}
console.log('done');
