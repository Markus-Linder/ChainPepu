// ChainPepu – kleiner Server ohne Abhängigkeiten.
// - liefert die 3D-Oberfläche aus /public
// - /api/search?q=...      Websuche (Brave Search API wenn BRAVE_API_KEY gesetzt, sonst Wikipedia)
// - /api/frameable?url=... prüft, ob eine Seite im iframe angezeigt werden darf
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 8080;
const BRAVE_KEY = process.env.BRAVE_API_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function searchBrave(q, lang) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=20&search_lang=${lang}`;
  const r = await fetch(url, { headers: { accept: 'application/json', 'x-subscription-token': BRAVE_KEY } });
  if (!r.ok) throw new Error(`Brave ${r.status}`);
  const j = await r.json();
  return (j.web?.results || []).map((x) => ({
    title: x.title,
    url: x.url,
    snippet: (x.description || '').replace(/<[^>]+>/g, ''),
    source: x.meta_url?.hostname || new URL(x.url).hostname,
  }));
}

async function searchWikipedia(q, lang) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(q)}&gsrlimit=20&prop=pageimages|extracts&exintro=1&explaintext=1` +
    `&exsentences=4&exlimit=20&piprop=thumbnail&pithumbsize=800`;
  const r = await fetch(url, { headers: { 'user-agent': 'ChainPepu/0.1 (3D search prototype)' } });
  if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
  const j = await r.json();
  return Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index).map((x) => ({
    title: x.title,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g, '_'))}`,
    snippet: x.extract || '',
    image: x.thumbnail?.source || null,
    source: `${lang}.wikipedia.org`,
  }));
}

// Darf die Seite in einem iframe eingebettet werden? (X-Frame-Options / CSP frame-ancestors)
const frameCache = new Map();
async function isFrameable(target) {
  if (frameCache.has(target)) return frameCache.get(target);
  let ok = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(target, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 ChainPepu' } });
    clearTimeout(t);
    r.body?.cancel().catch(() => {});
    const xfo = (r.headers.get('x-frame-options') || '').toLowerCase();
    const csp = (r.headers.get('content-security-policy') || '').toLowerCase();
    const fa = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('frame-ancestors'));
    ok = !xfo && (!fa || /frame-ancestors\s+(\*|https?:)/.test(fa));
  } catch {
    ok = false;
  }
  frameCache.set(target, ok);
  return ok;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (u.pathname === '/api/search') {
      const q = (u.searchParams.get('q') || '').trim();
      const lang = /^[a-z]{2}$/.test(u.searchParams.get('lang') || '') ? u.searchParams.get('lang') : 'de';
      if (!q) return sendJson(res, 400, { error: 'q fehlt' });
      let results = [];
      let engine = 'wikipedia';
      if (BRAVE_KEY) {
        try { results = await searchBrave(q, lang); engine = 'brave'; } catch (e) { console.warn(e.message); }
      }
      if (!results.length) results = await searchWikipedia(q, lang);
      return sendJson(res, 200, { engine, results });
    }
    if (u.pathname === '/api/frameable') {
      const target = u.searchParams.get('url') || '';
      if (!/^https?:\/\//.test(target)) return sendJson(res, 400, { error: 'url ungültig' });
      return sendJson(res, 200, { frameable: await isFrameable(target) });
    }

    // statische Dateien
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^([/\\])+/, '');
    if (!p || p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    const s = await stat(file).catch(() => null);
    if (!s || !s.isFile()) { res.writeHead(404); return res.end('Nicht gefunden'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch (e) {
    console.error(e);
    sendJson(res, 500, { error: 'Serverfehler' });
  }
});

server.listen(PORT, () => {
  console.log(`ChainPepu läuft auf http://localhost:${PORT}  (Suche: ${BRAVE_KEY ? 'Brave Web' : 'Wikipedia'})`);
});
