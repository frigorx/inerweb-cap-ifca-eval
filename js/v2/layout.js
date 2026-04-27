/* layout.js — refonte 4 pôles V6-style + sous-onglets
   Pôles :
     📅 Atelier      = accueil (calendrier + séance du jour + biblio TP)
     🗺 Carte        = progression (vue année)
     ✅ Évaluer      = par tâches du TP (Progression / CCF)
     📊 Élèves       = fiches individuelles (radar progression + radar CCF)
   Conserve les vues v1.9 existantes en les regroupant sous les pôles. */

(function() {
  'use strict';

  const POLES = [
    {
      id: 'atelier',
      label: '📅 Atelier',
      title: 'Atelier — séance du jour',
      tabs: [
        { view: 'aujourdhui', label: '🏠 Aujourd\'hui' },
        { view: 'agenda',     label: '📅 Calendrier' },
        { view: 'tournant',   label: '🔁 TP-056 tournant' }
      ],
      defaultTab: 'aujourdhui'
    },
    {
      id: 'carte',
      label: '🗺 Carte',
      title: 'Carte de progression — vue annuelle',
      tabs: [
        { view: 'progression', label: '🗺 Progression révisions' }
      ],
      defaultTab: 'progression'
    },
    {
      id: 'evaluer',
      label: '✅ Évaluer',
      title: 'Évaluation — progression et CCF',
      tabs: [
        { view: 'ccf',        label: '✅ CCF EP3' },
        { view: 'ccf-radar',  label: '🎯 Radar CCF' },
        { view: 'eval',       label: '✍ Progression libre' },
        { view: 'radar',      label: '📈 Radar progression' },
        { view: 'bulletin',   label: '🖨 Bulletin' }
      ],
      defaultTab: 'ccf'
    },
    {
      id: 'eleves',
      label: '📊 Élèves',
      title: 'Élèves — fiches individuelles',
      tabs: [
        { view: 'eleves', label: '👥 Fiches' }
      ],
      defaultTab: 'eleves'
    },
    {
      id: 'config',
      label: '⚙',
      title: 'Configuration',
      tabs: [
        { view: 'config', label: '⚙ Paramètres app' }
      ],
      defaultTab: 'config'
    }
  ];

  let currentPole = 'atelier';

  function renderPolesBar() {
    const bar = document.getElementById('poles-bar');
    if (!bar) return;
    bar.innerHTML = '';
    POLES.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'pole-btn' + (p.id === currentPole ? ' active' : '');
      btn.dataset.pole = p.id;
      btn.textContent = p.label;
      btn.onclick = () => switchPole(p.id);
      bar.appendChild(btn);
    });
  }

  function renderSubTabs() {
    const sub = document.getElementById('sub-tabs');
    const pole = POLES.find(p => p.id === currentPole);
    if (!sub || !pole) return;
    sub.innerHTML = '';
    /* Si le pôle n'a qu'un seul onglet, on cache la barre */
    if (pole.tabs.length <= 1) {
      sub.style.display = 'none';
      return;
    }
    sub.style.display = 'flex';
    pole.tabs.forEach(t => {
      const btn = document.createElement('button');
      btn.dataset.view = t.view;
      btn.textContent = t.label;
      sub.appendChild(btn);
    });
  }

  function switchPole(poleId) {
    const pole = POLES.find(p => p.id === poleId);
    if (!pole) return;
    currentPole = poleId;
    renderPolesBar();
    renderSubTabs();
    /* Affiche la vue par défaut du pôle */
    showView(pole.defaultTab);
    /* Active le bouton sous-onglet correspondant */
    const sub = document.getElementById('sub-tabs');
    if (sub) {
      sub.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.view === pole.defaultTab);
      });
    }
  }

  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('visible'));
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.add('visible');
    /* Hook v2.0 : init lazy des modules quand leur vue s'ouvre */
    if (viewName === 'ccf'       && window.CCFUI         && CCFUI.onShown)         CCFUI.onShown();
    if (viewName === 'ccf-radar' && window.CCFRadar      && CCFRadar.onShown)      CCFRadar.onShown();
    if (viewName === 'eleves'    && window.ClasseOverview && ClasseOverview.onShown) ClasseOverview.onShown();
    /* Hook legacy : permet aux modules existants de réagir */
    if (window.App && typeof window.App.onViewShown === 'function') {
      try { window.App.onViewShown(viewName); } catch (e) { console.warn(e); }
    }
  }

  /** Initialise la nav 4 pôles. Appelé après login. */
  function init() {
    /* Cache l'ancienne barre d'onglets, n'utilise plus que le double niveau */
    const oldTabs = document.getElementById('tabs');
    if (oldTabs) oldTabs.style.display = 'none';

    renderPolesBar();
    renderSubTabs();

    /* Délégation : clics sur sous-onglets */
    const sub = document.getElementById('sub-tabs');
    if (sub) {
      sub.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-view]');
        if (!btn) return;
        sub.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showView(btn.dataset.view);
      });
    }

    /* Démarre sur la vue d'ensemble Élèves — vue de pilotage immédiate */
    switchPole('eleves');
  }

  window.Layout = { init, switchPole, showView, POLES };
})();
