/* main.js — orchestration SPA, routing onglets, lifecycle */

(function() {
  'use strict';

  const App = {
    currentView: 'eval',
    onLogin(profCode) {
      this.show('eval');
      // Démarrer polling
      inerwebResults.startPolling();
      // Init des modules
      Eval.init();
      Radar.init();
      Tournant.init();
      Bulletin.init();
      // Préremplir config iCal
      const ic = Store.get(`ical.url.${profCode}`, '');
      const inp = document.getElementById('config-ical-url');
      if (inp) inp.value = ic;
      const cu = document.getElementById('config-collecteur-url');
      if (cu) cu.textContent = inerwebResults.COLLECTEUR_URL;
      updateBufferCount();
      inerwebResults.onUpdate(updateBufferCount);
    },
    show(view) {
      this.currentView = view;
      document.querySelectorAll('section.view').forEach(s => s.classList.remove('visible'));
      document.getElementById('view-' + view)?.classList.add('visible');
      document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
      // Hooks par vue
      if (view === 'agenda') Agenda.refresh();
      if (view === 'radar') Radar.render();
      if (view === 'bulletin') Bulletin.render();
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
    // Config
    document.getElementById('btn-save-ical').onclick = () => {
      const cur = Store.get('prof.current');
      if (!cur) return;
      const v = document.getElementById('config-ical-url').value.trim();
      Store.set(`ical.url.${cur}`, v);
      toast('iCal sauvegardé', 'success');
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
  });

  window.App = App;

})();
