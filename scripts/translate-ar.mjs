import fs from 'node:fs/promises';
const KEY = process.env.LOVABLE_API_KEY;
const en = JSON.parse(await fs.readFile('src/i18n/locales/en/common.json', 'utf8'));
const slice = { pipeline: en.home.pipeline, moat: en.home.moat, dpp: en.home.dpp, gtm: en.home.gtm };

async function translate() {
  const sys = `You translate JSON values from English to Arabic.
Rules:
- Output VALID JSON only. No markdown, no commentary.
- Keep all keys identical and in English.
- Translate only string values.
- Use Arabic commas only inside strings; never break the JSON syntax.
- All JSON syntax characters (",:{}[]) stay ASCII.
- Preserve numbers, "·", and brand names: Eko, TikTok, Reels, Shorts, Topo Chico, Coca-Cola, Masafi, Mirriad, Kantar, C2PA, EU AI Act, LatAm, US-Hispanic, MENA, UAE, Saudi Arabia, Abu Dhabi, UK, EU, CPM, CAC, Axessplayer.
- Never use em-dashes.`;
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
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
  return JSON.parse(txt);
}

const translated = await translate();
const p = 'src/i18n/locales/ar/common.json';
const json = JSON.parse(await fs.readFile(p, 'utf8'));
json.home = { ...json.home, ...translated };
await fs.writeFile(p, JSON.stringify(json, null, 2) + '\n');
console.log('ar done');
