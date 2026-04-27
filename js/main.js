/* main.js — orchestration SPA, routing onglets, lifecycle */

(function() {
  'use strict';

  const App = {
    currentView: 'aujourdhui',
    async onLogin(profCode) {
      /* v2.0 : Layout pilote la vue affichée — on n'appelle plus this.show() ici. */
      inerwebResults.startPolling();
      // Chargement silencieux de la correspondance LOCALE (jamais cloud)
      await Correspondance.load();
      /* v2.0 : Sync 4 profs via Google Sheet (pull initial + abonnement updates) */
      if (window.Sync && Sync.init) Sync.init();
      /* v2.0 : bandeau d'info dans le header v2 — pas de doublon en haut de main */
      Eval.init();
      Radar.init();
      Tournant.init();
      Bulletin.init();
      Dashboard.init();

      const ic = Store.get(`ical.url.${profCode}`, '');
      const inp = document.getElementById('config-ical-url');
      if (inp) inp.value = ic;
      const ictext = Store.get(`ical.text.${profCode}`, '');
      const inpTxt = document.getElementById('config-ical-text');
      if (inpTxt) inpTxt.value = ictext;
      const cu = document.getElementById('config-collecteur-url');
      if (cu) cu.textContent = inerwebResults.COLLECTEUR_URL;
      // Affichage état RGPD
      const rgpdEl = document.getElementById('config-rgpd-info');
      if (rgpdEl) {
        if (Correspondance.available()) {
          rgpdEl.innerHTML = `
            <strong style="color:var(--vert);">✅ Pseudonymisation forte active</strong><br/>
            • Tu vois : <code>MFrédéric — Frédéric MENDY</code><br/>
            • Le Sheet contient : <code>M14</code> (rien d'identifiant)<br/>
            • La table de correspondance est <strong>uniquement sur ce poste</strong> (fichier <code>data/correspondance_eleves.json</code>)<br/>
            • Si quelqu'un récupère le Sheet, il ne peut PAS retrouver les élèves`;
        } else {
          rgpdEl.style.borderLeftColor = 'var(--rouge)';
          rgpdEl.innerHTML = `
            <strong style="color:var(--rouge);">⚠️ Pseudonymisation partielle</strong><br/>
            • La table de correspondance n'est pas chargée sur ce poste<br/>
            • Le Sheet reçoit le pseudo affiché tel quel<br/>
            • Pour activer la pseudonymisation forte : copier <code>data/correspondance_eleves.json</code> depuis l'USB`;
        }
      }
      updateBufferCount();
      inerwebResults.onUpdate(updateBufferCount);
    },
    show(view) {
      this.currentView = view;
      document.querySelectorAll('section.view').forEach(s => s.classList.remove('visible'));
      document.getElementById('view-' + view)?.classList.add('visible');
      document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
      if (view === 'aujourdhui') Dashboard.renderAujourdhui();
      if (view === 'progression') Dashboard.renderProgression();
      if (view === 'eleves') Dashboard.renderEleves();
      if (view === 'agenda') Agenda.refresh();
      if (view === 'radar') Radar.render();
      if (view === 'bulletin') Bulletin.render();
    },
    showRadar(pseudo) {
      this.show('radar');
      const sel = document.getElementById('radar-eleve');
      if (sel) { sel.value = pseudo; sel.dispatchEvent(new Event('change')); }
    },
    showBulletin(pseudo) {
      this.show('bulletin');
      const sel = document.getElementById('bulletin-eleve');
      if (sel) { sel.value = pseudo; sel.dispatchEvent(new Event('change')); }
    }
  };

  function updateBufferCount() {
    const n = inerwebResults.bufferCount();
    const el = document.getElementById('config-buffer-count');
    if (el) el.textContent = n;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tabs')?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-view]');
      if (b) App.show(b.dataset.view);
    });
    document.getElementById('btn-save-ical').onclick = () => {
      const cur = Store.get('prof.current');
      if (!cur) return;
      const v = document.getElementById('config-ical-url').value.trim();
      Store.set(`ical.url.${cur}`, v);
      toast('iCal URL sauvegardée', 'success');
    };
    const btnSaveText = document.getElementById('btn-save-ical-text');
    if (btnSaveText) btnSaveText.onclick = () => {
      const cur = Store.get('prof.current');
      if (!cur) return;
      const v = document.getElementById('config-ical-text').value.trim();
      const status = document.getElementById('config-ical-text-status');
      if (!v) {
        Store.remove(`ical.text.${cur}`);
        status.textContent = 'Effacé.';
        toast('Contenu .ics effacé', 'info');
        return;
      }
      if (!v.includes('BEGIN:VCALENDAR')) {
        status.innerHTML = '<span style="color:var(--rouge);">⚠️ Ne ressemble pas à un .ics (BEGIN:VCALENDAR manquant)</span>';
        return;
      }
      Store.set(`ical.text.${cur}`, v);
      const lines = v.split('\n').length;
      status.innerHTML = `<span style="color:var(--vert);">✓ Sauvegardé (${lines} lignes)</span>`;
      toast('Contenu .ics sauvegardé', 'success');
    };
    document.getElementById('btn-retry-buffer').onclick = async () => {
      const r = await inerwebResults.retryBuffer();
      toast(`Renvoi : ${r.sent} envoyé(s), ${r.remaining} restant(s)`, r.remaining ? 'info' : 'success');
      updateBufferCount();
    };
    document.getElementById('btn-clear-buffer').onclick = () => {
      if (confirm('Vider le buffer offline ? Les évals non envoyées seront perdues.')) {
        inerwebResults.clearBuffer();
        updateBufferCount();
      }
    };

    // === Déverrouillage par mot de passe (Config) ===
    const btnUnlock = document.getElementById('btn-unlock');
    if (btnUnlock) btnUnlock.onclick = async () => {
      const pwd = document.getElementById('config-password').value.trim();
      const status = document.getElementById('upload-correspondance-status');
      if (!pwd) { status.innerHTML = '<span style="color:var(--rouge);">Mot de passe vide</span>'; return; }
      status.innerHTML = '<span style="color:var(--text-soft);">Déverrouillage…</span>';
      try {
        const data = await Correspondance.unlock(pwd);
        status.innerHTML = `<span style="color:var(--vert);font-weight:700;">✅ ${data.eleves.length} élèves chargés — recharge la page (F5)</span>`;
        toast(`${data.eleves.length} élèves chargés — F5 pour activer`, 'success');
        document.getElementById('config-password').value = '';
      } catch (err) {
        status.innerHTML = `<span style="color:var(--rouge);">❌ ${err.message}</span>`;
      }
    };
    const cfgPwd = document.getElementById('config-password');
    if (cfgPwd) cfgPwd.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnUnlock.click(); });

    const btnClearCorresp = document.getElementById('btn-clear-correspondance');
    if (btnClearCorresp) btnClearCorresp.onclick = () => {
      if (!confirm('Retirer la liste élèves de ce poste ? Tu reverras les codes M01..M24 au lieu des noms. Tu pourras tout récupérer en re-saisissant le mot de passe.')) return;
      Correspondance.clear();
      document.getElementById('upload-correspondance-status').innerHTML = '<span style="color:var(--text-soft);">Liste retirée. Recharge la page (F5).</span>';
      toast('Liste retirée — F5 pour appliquer', 'info');
    };
  });

  window.App = App;

})();
