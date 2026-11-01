/* kiwerbung.de – Frontend-Logik: Navigation, Reveal, ROI-Rechner, Anzeigen-Generator, Kontaktformular, KI-Chat */
(function () {
  'use strict';

  const API = (window.KIW_CONFIG && window.KIW_CONFIG.apiBase) || '/api';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function postJSON(path, payload) {
    const res = await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* leer */ }
    if (!res.ok || !data || data.ok === false) {
      const msg = (data && data.error) || `Serverfehler (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtEur = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtNum = (n, d = 0) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: d }).format(n);

  /* ---------- Navigation ---------- */
  const toggle = $('.nav-toggle');
  const links = $('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => { if (e.target.tagName === 'A') links.classList.remove('open'); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
    // Sicherheitsnetz: nach 4 s alles sichtbar machen (Crawler, Druck, exotische Browser)
    setTimeout(() => revealEls.forEach((el) => el.classList.add('in')), 4000);
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- ROI-Rechner ---------- */
  const roi = $('#roi-form');
  if (roi) {
    const out = {
      clicks: $('#roi-clicks'), leads: $('#roi-leads'), revenue: $('#roi-revenue'),
      roas: $('#roi-roas'), profit: $('#roi-profit'), uplift: $('#roi-uplift'),
      upliftLabel: $('#roi-uplift-label'),
    };
    const calc = () => {
      const budget = +$('#roi-budget').value || 0;
      const cpc = +$('#roi-cpc').value || 0;
      const cr = (+$('#roi-cr').value || 0) / 100;
      const aov = +$('#roi-aov').value || 0;
      const margin = (+$('#roi-margin').value || 0) / 100;
      const uplift = (+$('#roi-upliftpct').value || 0) / 100;

      const clicks = cpc > 0 ? budget / cpc : 0;
      const leads = clicks * cr;
      const revenue = leads * aov;
      const profit = revenue * margin - budget;
      const roas = budget > 0 ? revenue / budget : 0;

      const leadsUp = clicks * cr * (1 + uplift);
      const revenueUp = leadsUp * aov;
      const profitUp = revenueUp * margin - budget;

      out.clicks.textContent = fmtNum(clicks);
      out.leads.textContent = fmtNum(leads, 1);
      out.revenue.textContent = fmtEur(revenue);
      out.roas.textContent = fmtNum(roas, 2) + 'x';
      out.profit.textContent = fmtEur(profit);
      out.profit.classList.toggle('accent', profit >= 0);
      out.uplift.textContent = fmtEur(profitUp);
      out.upliftLabel.textContent = `+${Math.round(uplift * 100)} % Conversion`;
    };
    roi.addEventListener('input', calc);
    calc();
  }

  /* ---------- Anzeigen-Generator ---------- */
  const gen = $('#gen-form');
  if (gen) {
    const results = $('#gen-results');
    const msg = $('#gen-msg');
    const btn = $('#gen-submit');

    const copyBtn = (text) => `<button type="button" class="copy" data-copy="${escapeHtml(text)}">Kopieren</button>`;

    const render = (r) => {
      const variants = (r.variants || []).map((v, i) => `
        <article class="variant">
          <div class="variant-head"><span class="angle">Variante ${i + 1} · ${escapeHtml(v.angle)}</span>${copyBtn(`${v.hook}\n\n${v.primary}\n\n${v.headline}\n${v.cta}`)}</div>
          <dl>
            <div><dt>Hook</dt><dd>${escapeHtml(v.hook)}</dd></div>
            <div><dt>Primärtext</dt><dd>${escapeHtml(v.primary)}</dd></div>
            <div><dt>Headline</dt><dd>${escapeHtml(v.headline)}</dd></div>
            <div><dt>Call-to-Action</dt><dd>${escapeHtml(v.cta)}</dd></div>
          </dl>
        </article>`).join('');

      const s = r.tiktok_script || { scenes: [] };
      const scriptText = [s.hook, ...(s.scenes || []).map((sc, i) => `Szene ${i + 1}: ${sc.visual} — „${sc.voice}“`), s.cta].join('\n');
      const script = `
        <article class="variant">
          <div class="variant-head"><span class="angle">TikTok / Reels-Skript (20–35 Sek.)</span>${copyBtn(scriptText)}</div>
          <dl><div><dt>Hook (0–2 Sek.)</dt><dd>${escapeHtml(s.hook)}</dd></div></dl>
          ${(s.scenes || []).map((sc, i) => `<div class="script-scene"><span>🎬 Szene ${i + 1}: ${escapeHtml(sc.visual)}</span><span>🗣 „${escapeHtml(sc.voice)}“</span></div>`).join('')}
          <dl style="margin-top:12px"><div><dt>Abschluss / CTA</dt><dd>${escapeHtml(s.cta)}</dd></div></dl>
        </article>`;

      const tips = (r.tips || []).length ? `<article class="variant"><div class="variant-head"><span class="angle">Tipps für Test & Targeting</span></div><ul class="tips">${r.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul></article>` : '';

      results.innerHTML = variants + script + tips;
      results.classList.add('show');
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    results.addEventListener('click', async (e) => {
      const b = e.target.closest('.copy');
      if (!b) return;
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = 'Kopiert ✓';
        setTimeout(() => { b.textContent = 'Kopieren'; }, 1800);
      } catch (_) { b.textContent = 'Fehler'; }
    });

    gen.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(gen);
      const payload = Object.fromEntries(fd.entries());
      msg.className = 'form-msg';
      msg.textContent = 'Die KI schreibt deine Anzeigen – das dauert etwa 20–40 Sekunden …';
      btn.disabled = true;
      results.classList.add('show');
      results.innerHTML = '<div class="skeleton"><div style="width:40%"></div><div></div><div style="width:85%"></div><div style="width:70%"></div><div style="width:55%"></div></div>';
      try {
        const data = await postJSON('/generate.php', payload);
        render(data.result);
        msg.textContent = 'Fertig. Gefällt dir das? Im Erstgespräch bauen wir daraus eine komplette Kampagne.';
        msg.classList.add('ok');
      } catch (err) {
        results.classList.remove('show');
        results.innerHTML = '';
        msg.textContent = err.message;
        msg.classList.add('error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Kontaktformular ---------- */
  const contact = $('#contact-form');
  if (contact) {
    const msg = $('#contact-msg');
    const btn = $('#contact-submit');
    contact.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'form-msg';
      msg.textContent = 'Wird gesendet …';
      btn.disabled = true;
      try {
        await postJSON('/contact.php', Object.fromEntries(new FormData(contact).entries()));
        contact.reset();
        msg.textContent = 'Danke! Deine Anfrage ist angekommen – wir melden uns innerhalb von 24 Stunden.';
        msg.classList.add('ok');
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add('error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- KI-Chat-Widget ---------- */
  const fab = $('#chat-fab');
  const panel = $('#chat-panel');
  if (fab && panel) {
    const log = $('.chat-log', panel);
    const form = $('.chat-form', panel);
    const input = $('input', form);
    const quick = $('.chat-quick', panel);
    const STORE = 'kiw_chat_v1';
    let history = [];
    try { history = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch (_) { history = []; }

    const add = (role, text, cls = '') => {
      const el = document.createElement('div');
      el.className = `msg ${role === 'user' ? 'user' : 'bot'} ${cls}`.trim();
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    };

    const greeting = 'Hi! Ich bin der KI-Assistent von kiwerbung.de. Erzähl mir kurz, was du machst – dann zeige ich dir, wo KI dir am meisten Zeit und Umsatz bringt.';
    const restore = () => {
      log.innerHTML = '';
      add('assistant', greeting);
      history.forEach((m) => add(m.role, m.content));
    };
    restore();

    const open = (state) => {
      panel.classList.toggle('open', state);
      fab.setAttribute('aria-expanded', String(state));
      if (state) input.focus();
    };
    fab.addEventListener('click', () => open(!panel.classList.contains('open')));
    $('.chat-close', panel).addEventListener('click', () => open(false));
    $$('[data-open-chat]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(true); }));

    let busy = false;
    const send = async (text) => {
      text = (text || '').trim();
      if (!text || busy) return;
      busy = true;
      input.value = '';
      quick.style.display = 'none';
      add('user', text);
      history.push({ role: 'user', content: text });
      const typing = add('assistant', 'schreibt …', 'typing');
      try {
        const data = await postJSON('/chat.php', { messages: history.slice(-20) });
        typing.remove();
        add('assistant', data.reply);
        history.push({ role: 'assistant', content: data.reply });
        try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-20))); } catch (_) { /* privat */ }
      } catch (err) {
        typing.remove();
        history.pop();
        add('assistant', `Ups: ${err.message}`);
      } finally {
        busy = false;
      }
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
    quick.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
  }
})();
