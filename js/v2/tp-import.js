/* tp-import.js — drag-and-drop import de TP dans la bibliothèque
   Le fichier HTML/PDF est lu en base64 et stocké en localStorage
   (clé `tp.user.{id}`). Métadonnées (titre, semaine, comp) synchronisées
   via Google Sheet (Module TP-USER) → tous les profs voient le TP, mais
   le contenu binaire reste local sur le poste qui l'a importé.
   Pour partager le contenu : bouton 📥 "Exporter ce TP" télécharge le HTML
   que le collègue redroppe sur son poste.
*/

(function() {
  'use strict';

  let bareme = null;
  let pendingFile = null;
  let pendingDataUrl = null;
  let pendingTitre = '';

  async function ensureLoaded() {
    if (!bareme && window.CCF) bareme = await CCF.load('ep3');
  }

  /** Liste des TP user stockés en local. */
  function listUserTPs() {
    const out = [];
    const fullPrefix = 'inerweb.cap-ifca.tp.user.';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        try {
          const meta = JSON.parse(localStorage[k]);
          out.push(meta);
        } catch (e) {}
      }
    }
    return out.sort((a, b) => (a.semaine || '').localeCompare(b.semaine || ''));
  }

  function get(id) { return Store.get(`tp.user.${id}`); }

  function save(meta) {
    const id = meta.id || ('TP-U-' + Date.now().toString(36).toUpperCase());
    meta.id = id;
    meta.updatedAt = new Date().toISOString();
    meta.importPar = meta.importPar || (Store.get('prof.current') || '');
    Store.set(`tp.user.${id}`, meta);
    /* Push Sheet : seulement les méta, pas le binaire (trop gros) */
    if (window.inerwebResults) {
      inerwebResults.write({
        Module: 'TP-USER',
        TpId: id,
        Titre: meta.titre,
        Semaine: meta.semaine,
        Duree: meta.duree,
        CompJSON: JSON.stringify(meta.comp || []),
        ImportPar: meta.importPar,
        UpdatedAt: meta.updatedAt,
        TailleKo: meta.tailleKo || 0,
        TypeFichier: meta.typeFichier || ''
      }).catch(() => {});
    }
    return meta;
  }

  function remove(id) {
    if (!confirm('Supprimer ce TP de ta bibliothèque ? Les autres profs le verront toujours dans leur Sheet.')) return false;
    Store.remove(`tp.user.${id}`);
    /* Note : pas de delete sync via Sheet pour l'instant — le TP reste
       dans le journal mais ne peut plus être ouvert depuis ce poste. */
    if (window.toast) toast('TP supprimé localement', 'info');
    if (window.BiblioTP && BiblioTP.refresh) BiblioTP.refresh();
    return true;
  }

  function readableSize(bytes) {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / 1024 / 1024).toFixed(1) + ' Mo';
  }

  /** Ouverture d'un TP user (HTML/PDF) en nouvel onglet via blob URL. */
  function openTP(id) {
    const meta = get(id);
    if (!meta || !meta.dataUrl) {
      alert('Ce TP a été importé sur un autre poste. Demande au collègue de te transmettre le fichier ou exporte-le depuis son poste.');
      return;
    }
    /* Convert dataUrl → blob URL pour ouverture clean */
    const w = window.open();
    if (w) {
      w.document.title = meta.titre || 'TP user';
      if (meta.typeFichier === 'application/pdf') {
        w.location.href = meta.dataUrl;
      } else {
        /* HTML : on injecte directement */
        const html = atob(meta.dataUrl.split(',')[1]);
        w.document.open();
        w.document.write(html);
        w.document.close();
      }
    }
  }

  /** Export d'un TP user → téléchargement local pour transmission. */
  function exportTP(id) {
    const meta = get(id);
    if (!meta || !meta.dataUrl) return;
    const a = document.createElement('a');
    a.href = meta.dataUrl;
    a.download = (meta.titre || meta.id).replace(/[^a-z0-9]+/gi, '_') + (meta.typeFichier === 'application/pdf' ? '.pdf' : '.html');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
    if (window.toast) toast('💾 TP exporté', 'success');
  }

  /* ============== Modal de configuration au drop ============== */
  async function handleFile(file) {
    await ensureLoaded();
    pendingFile = file;
    pendingTitre = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    /* Lit en base64 */
    pendingDataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    /* Si HTML, tente d'extraire <title> */
    if (file.type.includes('html')) {
      try {
        const html = atob(pendingDataUrl.split(',')[1]);
        const m = html.match(/<title>([^<]+)<\/title>/i);
        if (m && m[1]) pendingTitre = m[1].trim();
      } catch (e) {}
    }
    showImportModal();
  }

  function showImportModal() {
    closeIfOpen();
    const compsKeys = bareme ? Object.keys(bareme.competences) : [];
    const overlay = document.createElement('div');
    overlay.id = 'tpimport-overlay';
    overlay.className = 'tpimport-overlay';
    overlay.innerHTML = `
      <div class="tpimport-card">
        <header>
          <h2>📥 Importer ce TP</h2>
          <button class="btn-x" id="tpimport-close" title="Annuler">×</button>
        </header>
        <div class="tpimport-body">
          <div class="tpimport-file-info">
            📄 <strong>${escapeHtml(pendingFile.name)}</strong> · ${readableSize(pendingFile.size)}
          </div>

          <label>Titre du TP (modifiable)</label>
          <input type="text" id="tpimport-titre" value="${escapeHtml(pendingTitre)}" />

          <label>Semaine de session</label>
          <select id="tpimport-semaine">
            <option value="S1">Semaine 1 (27/04)</option>
            <option value="S2">Semaine 2 (04/05)</option>
            <option value="S3">Semaine 3 (11/05)</option>
            <option value="S-">Hors session (stock)</option>
          </select>

          <label>Durée estimée</label>
          <input type="text" id="tpimport-duree" placeholder="ex : 2 h" value="2 h" />

          <label>Compétences mobilisées par ce TP <span class="opt">(coche celles qui s'appliquent)</span></label>
          <div class="tpimport-comps">
            ${compsKeys.map(c => `
              <label class="tpimport-comp-row">
                <input type="checkbox" name="tpimport-comp" value="${c}" />
                <span class="tpimport-comp-id">${c}</span>
                <span class="tpimport-comp-lab">${escapeHtml(bareme.competences[c])}</span>
              </label>
            `).join('')}
          </div>

          <div class="tpimport-rgpd">
            🔒 Le fichier reste <strong>uniquement sur ton poste</strong> (localStorage navigateur).
            La Sheet ne reçoit que le titre, la semaine et les compétences cochées.
            Pour le partager : bouton 💾 Exporter sur la carte du TP, puis le collègue le redrop sur son poste.
          </div>
        </div>
        <footer>
          <button class="btn small ghost" id="tpimport-cancel">Annuler</button>
          <button class="btn orange" id="tpimport-save">📥 Importer ce TP</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('tpimport-close').onclick = closeIfOpen;
    document.getElementById('tpimport-cancel').onclick = closeIfOpen;
    document.getElementById('tpimport-save').onclick = doSave;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeIfOpen(); });
  }

  function doSave() {
    const titre = document.getElementById('tpimport-titre').value.trim();
    if (!titre) { alert('Donne un titre au TP.'); return; }
    const semaine = document.getElementById('tpimport-semaine').value;
    const duree = document.getElementById('tpimport-duree').value.trim() || '?';
    const comp = Array.from(document.querySelectorAll('input[name="tpimport-comp"]:checked')).map(c => c.value);
    const meta = {
      id: 'TP-U-' + Date.now().toString(36).toUpperCase(),
      titre,
      semaine,
      duree,
      comp,
      typeFichier: pendingFile.type,
      tailleKo: Math.round(pendingFile.size / 1024),
      dataUrl: pendingDataUrl,
      importPar: Store.get('prof.current') || '',
      isUser: true
    };
    save(meta);
    if (window.toast) toast(`✅ ${titre} ajouté à la bibliothèque`, 'success');
    closeIfOpen();
    pendingFile = null;
    pendingDataUrl = null;
    if (window.BiblioTP && BiblioTP.refresh) BiblioTP.refresh();
  }

  function closeIfOpen() {
    const o = document.getElementById('tpimport-overlay');
    if (o) o.remove();
  }

  /* ============== Branchement zone drop ============== */
  function bindDropZone(el) {
    if (!el || el.dataset.dropBound) return;
    el.dataset.dropBound = '1';

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      const f = files[0];
      const ok = f.type.includes('html') || f.type.includes('pdf') || /\.(html?|pdf)$/i.test(f.name);
      if (!ok) {
        alert('Format non supporté. Glisse un fichier .html ou .pdf.');
        return;
      }
      if (f.size > 4 * 1024 * 1024) {
        alert('Fichier > 4 Mo. Le localStorage est limité — exporte-le en plus léger ou utilise un PDF compressé.');
        return;
      }
      handleFile(f);
    });

    /* Clic sur la zone → ouvre un input file */
    el.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.htm,.pdf,application/pdf,text/html';
      input.onchange = () => { if (input.files[0]) handleFile(input.files[0]); };
      input.click();
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.TPImport = { handleFile, bindDropZone, listUserTPs, get, save, remove, openTP, exportTP };
})();
