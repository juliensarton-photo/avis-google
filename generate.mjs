// Génère docs/badge.png (note + nombre d'avis Google) et docs/index.html (signature à copier).
// Variables : GOOGLE_API_KEY, PLACE_ID  — ou MOCK_RATING / MOCK_COUNT pour tester sans API.
import fs from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const OUT = '.';
const SCALE = 2 * 1.25;   // 2x pour les écrans Retina, et badge 25 % plus grand
const W = 144, H = 36;    // unités de dessin
const DW = Math.round(W * 1.25), DH = Math.round(H * 1.25); // taille affichée dans Gmail
const VERSION = 4; // à incrémenter quand le design change, pour forcer un nouveau rendu
const LOGO = ['google-g.svg', 'google-g.png'].find((f) => fs.existsSync(f)); // logo officiel déposé par toi        // taille affichée dans la signature (px)

async function getPlace() {
  if (process.env.MOCK_RATING) {
    return { rating: +process.env.MOCK_RATING, count: +process.env.MOCK_COUNT };
  }
  const { GOOGLE_API_KEY, PLACE_ID } = process.env;
  if (!GOOGLE_API_KEY || !PLACE_ID) throw new Error('GOOGLE_API_KEY et PLACE_ID requis');
  const r = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}`, {
    headers: { 'X-Goog-Api-Key': GOOGLE_API_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount' },
  });
  if (!r.ok) throw new Error(`API Places ${r.status} : ${await r.text()}`);
  const j = await r.json();
  if (typeof j.rating !== 'number') throw new Error('Pas de note renvoyée : ' + JSON.stringify(j));
  return { rating: j.rating, count: j.userRatingCount ?? 0 };
}

// 5 étoiles, remplies proportionnellement à la note (ex. 4,7 → 4 pleines + 70 %)
function starsSvg(rating, size) {
  const gap = size * 0.18, w = size * 5 + gap * 4;
  const star = (x) => {
    const s = size / 24;
    return `<path transform="translate(${x} 0) scale(${s})" d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z"/>`;
  };
  let paths = '';
  for (let i = 0; i < 5; i++) paths += star(i * (size + gap));
  // largeur remplie : chaque étoile pleine + fraction de la suivante
  const full = Math.floor(rating), frac = rating - full;
  const fillW = full * (size + gap) + frac * size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${w} ${size}">
    <defs><clipPath id="c"><rect width="${fillW}" height="${size}"/></clipPath></defs>
    <g fill="#E3E3E3">${paths}</g>
    <g fill="#F5B301" clip-path="url(#c)">${paths}</g></svg>`;
  return { uri: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), w, h: size };
}

async function render({ rating, count }) {
  const font = (w) => fs.readFileSync(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff`);
  const s = (n) => n * SCALE;
  const st = starsSvg(rating, s(11));
  const note = rating.toFixed(1).replace('.', ',');
  const el = (type, style, children) => ({ type, props: { style, children } });

  const logo = LOGO && {
    type: 'img', props: { width: s(16), height: s(16), style: { marginRight: s(7) },
      src: `data:image/${LOGO.endsWith('.svg') ? 'svg+xml' : 'png'};base64,` + fs.readFileSync(LOGO).toString('base64') },
  };
  const tree = el('div', {
    width: s(W), height: s(H), display: 'flex', alignItems: 'center',
    background: '#FFFFFF', border: `${s(1)}px solid #E6E6E6`, borderRadius: s(8),
    padding: `0 ${s(9)}px`, fontFamily: 'Inter', color: '#1F1F1F',
  }, [
    ...(logo ? [logo] : []),
    el('div', { fontSize: s(17), fontWeight: 800, letterSpacing: s(-0.5), marginRight: s(7), flexShrink: 0 }, note),
    el('div', { display: 'flex', flexDirection: 'column' }, [
      { type: 'img', props: { src: st.uri, width: st.w, height: st.h } },
      el('div', { display: 'flex', alignItems: 'center', fontSize: s(9), color: '#5F6368', marginTop: s(2), fontWeight: 600 }, [
        `${count.toLocaleString('fr-FR')} avis`,
        { type: 'img', props: { width: s(4.5), height: s(7), style: { marginLeft: s(4) },
          src: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 12"><path d="M1.5 1l5 5-5 5" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>').toString('base64') } },
      ]),
    ]),
  ]);

  const svg = await satori(tree, {
    width: s(W), height: s(H),
    fonts: [400, 600, 800].map((w) => ({ name: 'Inter', data: font(w), weight: w, style: 'normal' })),
  });
  return new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
}

function signatureHtml(placeId) {
  const reviews = `https://search.google.com/local/reviews?placeid=${placeId}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Signature Julien Sarton</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#222}
.bloc{border:2px dashed #ccc;padding:20px;border-radius:8px;margin:12px 0 8px}button{font-size:15px;padding:8px 16px;cursor:pointer;margin-bottom:28px}</style>
</head><body>
<h1>Ma signature Gmail</h1>
<p>Clique sur « Copier », puis colle (⌘V) au bon endroit dans Gmail → Paramètres → Voir tous les paramètres → Signature.</p>
<h2>Photo</h2>
<div class="bloc" id="photo"><a href="https://juliensarton.fr" target="_blank"><img src="__BASE__photo.png" width="110" height="110" alt="Julien Sarton" style="display:block;border:0;width:110px;height:110px;border-radius:50%"></a></div>
<button onclick="copy('photo',this)">Copier la photo</button>
<h2>Badge avis Google</h2>
<div class="bloc" id="badge"><a href="${reviews}" target="_blank"><img src="__BASE__badge.png?v=${VERSION}" width="${DW}" height="${DH}" alt="Avis Google – Julien Sarton" style="display:block;border:0;width:${DW}px;height:${DH}px"></a></div>
<button onclick="copy('badge',this)">Copier le badge</button>
<script>
// remplace __BASE__ par l'adresse absolue de la page, pour que Gmail récupère les bonnes URL
const base=location.href.replace(/[^/]*$/,'');
document.querySelectorAll('img').forEach(i=>i.src=i.getAttribute('src').replace('__BASE__',base));
function copy(id,btn){const r=document.createRange();r.selectNode(document.getElementById(id).firstElementChild);
const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('copy');s.removeAllRanges();btn.textContent='Copié ✔';}
</script></body></html>`;
}

const place = await getPlace();
const prev = fs.existsSync(`${OUT}/data.json`) ? JSON.parse(fs.readFileSync(`${OUT}/data.json`)) : {};
fs.mkdirSync(OUT, { recursive: true });
if (prev.v !== VERSION || prev.rating !== place.rating || prev.count !== place.count || !fs.existsSync(`${OUT}/badge.png`) || process.env.FORCE) {
  fs.writeFileSync(`${OUT}/badge.png`, await render(place));
  fs.writeFileSync(`${OUT}/data.json`, JSON.stringify({ ...place, v: VERSION, updated: new Date().toISOString() }, null, 2));
  console.log('Badge mis à jour :', place);
} else {
  console.log('Rien de neuf :', place);
}
fs.writeFileSync(`${OUT}/index.html`, signatureHtml(process.env.PLACE_ID || 'PLACE_ID'));
