/* ical-parser.js — fetch + parse iCal EcoleDirecte + agenda fusion 4 profs */

(function() {
  'use strict';

  const KEYWORDS = ['cap', 'ifca', 'froid', 'cvc', 'mfer'];

  async function fetchICalForProf(code) {
    // Priorité 1 : texte .ics collé manuellement (contourne CORS)
    const pasted = Store.get(`ical.text.${code}`);
    if (pasted) return parseICalText(pasted, code);

    // Priorité 2 : URL fetch direct (souvent bloqué par CORS EcoleDirecte)
    const url = Store.get(`ical.url.${code}`);
    if (!url) return [];
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text();
      return parseICalText(text, code);
    } catch (e) {
      console.warn(`[iCal ${code}] fetch échec — utiliser le mode "coller le contenu" en Config`, e);
      return [];
    }
  }

  function parseICalText(text, code) {
    if (typeof ICAL === 'undefined') {
      console.warn('ical.js pas chargé');
      return [];
    }
    try {
      const jcal = ICAL.parse(text);
      const comp = new ICAL.Component(jcal);
      const events = comp.getAllSubcomponents('vevent');
      return events.map(ev => {
        const e = new ICAL.Event(ev);
        return {
          uid: e.uid,
          summary: e.summary || '',
          location: e.location || '',
          description: e.description || '',
          start: e.startDate.toJSDate(),
          end: e.endDate.toJSDate(),
          prof: code
        };
      }).filter(ev => isCAPIFCA(ev));
    } catch (e) {
      console.error('[iCal] parse échec', e);
      return [];
    }
  }

  function isCAPIFCA(ev) {
    const txt = (ev.summary + ' ' + ev.description + ' ' + ev.location).toLowerCase();
    return KEYWORDS.some(k => txt.includes(k));
  }

  function classeFromSummary(summary) {
    const s = summary.toUpperCase();
    if (s.includes('IFCA 1') || s.includes('IFCA1') || s.includes('1 CAP IFCA') || s.includes('1CAP')) return 'CAP IFCA 1';
    if (s.includes('IFCA 2') || s.includes('IFCA2') || s.includes('2 CAP IFCA') || s.includes('2CAP')) return 'CAP IFCA 2';
    return 'CAP IFCA ?';
  }

  function fmtDate(d) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }
  function fmtTime(d) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  async function refreshAgenda() {
    const status = document.getElementById('agenda-status');
    status.textContent = 'Chargement…';
    const allEvents = [];
    for (const p of PROFS) {
      const evs = await fetchICalForProf(p.code);
      allEvents.push(...evs);
    }
    if (allEvents.length === 0) {
      const haveURL = PROFS.some(p => Store.get(`ical.url.${p.code}`));
      const msg = haveURL
        ? 'Aucun événement CAP IFCA trouvé (vérifier les iCal). Note : EcoleDirecte peut bloquer CORS — alternative : coller le contenu .ics dans Config.'
        : 'Aucune URL iCal renseignée. Allez dans ⚙ Config pour saisir votre URL EcoleDirecte (Mon agenda > Exporter).';
      document.getElementById('agenda-content').innerHTML = `<p style="color:var(--text-soft)">${msg}</p>`;
      status.textContent = '0 événement';
      return;
    }
    // Group by jour
    allEvents.sort((a, b) => a.start - b.start);
    const byDay = {};
    allEvents.forEach(ev => {
      const k = ev.start.toISOString().slice(0, 10);
      (byDay[k] ||= []).push(ev);
    });
    const html = Object.keys(byDay).sort().map(k => {
      const day = new Date(k);
      return `<div class="agenda-day">
        <h4 style="margin-bottom:6px;">${fmtDate(day)} — ${k}</h4>
        ${byDay[k].map(ev => {
          const prof = PROFS.find(p => p.code === ev.prof) || { couleur: '#777', code: '?' };
          return `<div class="agenda-event">
            <div class="horaire">${fmtTime(ev.start)} – ${fmtTime(ev.end)}</div>
            <div>
              <span class="prof-pill" style="background:${prof.couleur};">${prof.code}</span>
              <strong>${classeFromSummary(ev.summary)}</strong> — ${escapeHtml(ev.summary)}
              ${ev.location ? `<br/><small style="color:var(--text-soft)">📍 ${escapeHtml(ev.location)}</small>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
    document.getElementById('agenda-content').innerHTML = html;
    status.textContent = `${allEvents.length} événement(s) sur ${Object.keys(byDay).length} jour(s)`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-refresh-agenda').onclick = refreshAgenda;
  });

  window.Agenda = { refresh: refreshAgenda };

})();
