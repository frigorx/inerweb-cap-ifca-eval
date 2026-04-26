/* auth.js — écran login prof + persistence */

(function() {
  'use strict';

  function renderProfs() {
    const grid = document.getElementById('profs-grid');
    grid.innerHTML = '';
    PROFS.forEach(p => {
      const btn = document.createElement('div');
      btn.className = 'prof-choice';
      btn.dataset.code = p.code;
      btn.innerHTML = `
        <div class="initials" style="color:${p.couleur}">${p.code}</div>
        <div class="full-name">${p.nom}</div>`;
      btn.onclick = () => {
        grid.querySelectorAll('.prof-choice').forEach(x => x.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('btn-login').dataset.profCode = p.code;
      };
      grid.appendChild(btn);
    });
  }

  async function login() {
    const code = document.getElementById('btn-login').dataset.profCode;
    const ical = document.getElementById('ical-url').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const err = document.getElementById('login-error');
    if (!code) {
      err.textContent = 'Sélectionner un enseignant.';
      return;
    }
    err.textContent = '';

    // Tenter le déverrouillage si mot de passe saisi
    if (password) {
      err.textContent = 'Déverrouillage de la liste élèves…';
      try {
        await Correspondance.unlock(password);
        err.style.color = 'var(--vert)';
        err.textContent = '✅ 24 élèves chargés';
      } catch (e) {
        err.style.color = 'var(--rouge)';
        err.textContent = '❌ Mot de passe incorrect';
        return;
      }
    }

    Store.set('prof.current', code);
    if (ical) Store.set(`ical.url.${code}`, ical);
    showApp(code);
  }

  function showApp(code) {
    const prof = PROFS.find(p => p.code === code);
    if (!prof) return;
    document.getElementById('view-login').classList.remove('visible');
    document.getElementById('tabs').hidden = false;
    document.getElementById('prof-badge').hidden = false;
    document.getElementById('prof-dot').style.background = prof.couleur;
    document.getElementById('prof-label').textContent = `${prof.code} — ${prof.nom}`;
    if (window.App && App.onLogin) App.onLogin(code);
  }

  function logout() {
    Store.remove('prof.current');
    location.reload();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderProfs();
    document.getElementById('btn-login').onclick = login;
    document.getElementById('btn-logout').onclick = logout;
    document.getElementById('ical-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    document.getElementById('login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    // Auto-login si déjà connecté
    const cur = Store.get('prof.current');
    if (cur) {
      const ic = Store.get(`ical.url.${cur}`, '');
      if (ic) document.getElementById('ical-url').value = ic;
      // Pré-sélectionne le bouton mais reste sur l'écran login si on veut changer
      document.querySelector(`.prof-choice[data-code="${cur}"]`)?.classList.add('selected');
      document.getElementById('btn-login').dataset.profCode = cur;
      // Auto-bascule directement sans forcer reclick
      showApp(cur);
    }
  });

  window.Auth = { login, logout, showApp };

})();
