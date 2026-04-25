/**
 * inerWeb Collecteur Universel — Apps Script
 * Version 3.0 (2026-04-25) — ajout module eval-cap-ifca (lecture + écriture flexibles)
 * Sheet ID : 16T1T3yL6M49OhJUQS1SmFHwW7Bywp7m2kSXDiXdmItk
 */

var EVAL_CAPIFCA_SHEET = 'eval-cap-ifca';

// =========================================
// ENTRY POINTS
// =========================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Routing module : eval-cap-ifca a son propre schéma flexible
    var mod = data.module || (data.row && data.row.Module) || '';
    if (mod === 'eval-cap-ifca') {
      return writeEvalCapIfca_(data);
    }

    // Schéma legacy (modules existants : Frigolo, etc.)
    return writeLegacy_(data);

  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};

  // Lecture eval-cap-ifca
  if (params.action === 'read' && params.module === 'eval-cap-ifca') {
    return readEvalCapIfca_(params);
  }

  // Compatibilité existante
  if (params.key === 'LPPJR') return serveData_();

  return jsonResponse_({ status: 'ok', service: 'inerWeb Collecteur Universel v3.0' });
}

// =========================================
// EVAL-CAP-IFCA — schéma flexible
// =========================================

function writeEvalCapIfca_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EVAL_CAPIFCA_SHEET);
  var row = data.row || {};

  // Set des colonnes : on garde un en-tête fixe étendu si besoin
  var headers = [
    '_timestamp', 'Date', 'Module', 'Pseudo', 'Classe', 'Prof',
    'Epreuve', 'TP', 'Code', 'Niveau',
    'Note20', 'Score%', 'Detail', 'Temps', 'Visas', 'Commentaire'
  ];

  if (!sheet) {
    sheet = ss.insertSheet(EVAL_CAPIFCA_SHEET);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#1b3a63').setFontColor('#fff')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  } else {
    // S'assurer que les en-têtes existent (si feuille vide)
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  }

  // Construit la ligne dans l'ordre des en-têtes
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = headerRow.map(function(h) {
    if (!h) return '';
    var v = row[h];
    if (v === undefined || v === null) v = '';
    return v;
  });

  sheet.appendRow(values);
  var lr = sheet.getLastRow();

  // Coloriage selon Niveau si présent
  var niveauIdx = headerRow.indexOf('Niveau');
  if (niveauIdx >= 0) {
    var nivCell = sheet.getRange(lr, niveauIdx + 1);
    var col = colorForNiveau_(row.Niveau);
    if (col) nivCell.setBackground(col).setFontWeight('bold');
  }

  return jsonResponse_({ status: 'ok', module: 'eval-cap-ifca', row: lr });
}

function readEvalCapIfca_(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EVAL_CAPIFCA_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonResponse_({ status: 'ok', count: 0, data: [] });
  }
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var since = params.since ? new Date(params.since) : null;

  var out = rows.map(function(r) {
    var o = {};
    headers.forEach(function(h, i) { if (h) o[h] = r[i]; });
    if (o._timestamp instanceof Date) o._timestamp = o._timestamp.toISOString();
    if (o.Date instanceof Date) o.Date = o.Date.toISOString();
    return o;
  });

  if (since) {
    out = out.filter(function(o) {
      var ts = o._timestamp || o.Date || '';
      return ts && new Date(ts) > since;
    });
  }

  return jsonResponse_({ status: 'ok', count: out.length, data: out });
}

function colorForNiveau_(n) {
  if (!n) return null;
  switch (String(n).toUpperCase()) {
    case 'NA':  return '#fed7d7';
    case 'ECA': return '#feebc8';
    case 'A':   return '#c6f6d5';
    case 'M':   return '#bee3f8';
    default: return null;
  }
}

// =========================================
// LEGACY (modules existants — schéma fixe Frigolo etc.)
// =========================================

function writeLegacy_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Résultats');
  if (!sheet) sheet = createSheet_(ss);
  var score = data.score || 0;
  var note20 = data.note20 != null ? data.note20 : Math.round(score / 100 * 20 * 2) / 2;
  var appreciation = 'Non acquis';
  if (score >= 85) appreciation = 'Maîtrisé';
  else if (score >= 70) appreciation = 'Acquis';
  else if (score >= 50) appreciation = "En cours d'acquisition";
  var sec = data.temps || 0;
  var tempsStr = sec > 0 ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : '';
  var comps = data.competences || {};
  var c = [comps.C1 || '', comps.C2 || '', comps.C3 || '', comps.C4 || '', comps.C5 || '', comps.C6 || ''];
  sheet.appendRow([new Date(data.timestamp || new Date()), data.module || '', data.nom || '', data.prenom || '', data.classe || '', note20, score, data.detail || '', tempsStr, c[0], c[1], c[2], c[3], c[4], c[5], appreciation]);
  var lr = sheet.getLastRow();
  colorRow_(sheet, lr, note20, c, appreciation);
  return jsonResponse_({ status: 'ok', row: lr });
}

function serveData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Résultats');
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse_({ status: 'ok', data: [] });
  var raw = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
  var results = raw.map(function(r) {
    return {
      date: r[0] ? new Date(r[0]).toISOString() : '',
      module: r[1] || '', nom: r[2] || '', prenom: r[3] || '', classe: r[4] || '',
      note20: r[5] || 0, score: r[6] || 0, detail: r[7] || '', temps: r[8] || '',
      C1: r[9] || '', C2: r[10] || '', C3: r[11] || '', C4: r[12] || '', C5: r[13] || '', C6: r[14] || '',
      appreciation: r[15] || ''
    };
  });
  return jsonResponse_({ status: 'ok', count: results.length, data: results });
}

function createSheet_(ss) {
  var sheet = ss.insertSheet('Résultats');
  var h = ['Date', 'Module', 'Nom', 'Prénom', 'Classe', 'Note /20', 'Score %', 'Détail', 'Temps', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'Appréciation'];
  sheet.appendRow(h);
  sheet.getRange(1, 1, 1, h.length).setFontWeight('bold').setBackground('#0f2d52').setFontColor('#fff').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 140); sheet.setColumnWidth(2, 200); sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 120); sheet.setColumnWidth(5, 90); sheet.setColumnWidth(6, 70);
  sheet.setColumnWidth(7, 70); sheet.setColumnWidth(8, 80); sheet.setColumnWidth(9, 60);
  for (var i = 10; i <= 15; i++) sheet.setColumnWidth(i, 100);
  sheet.setColumnWidth(16, 150);
  return sheet;
}

function colorRow_(sheet, row, note20, comps, appreciation) {
  var bg = { 'Maîtrisé': '#d5f5e3', 'Acquis': '#d4efdf', "En cours d'acquisition": '#fef9e7', 'En cours': '#fef9e7', 'Non acquis': '#fdedec', 'M': '#d5f5e3', 'A': '#d4efdf', 'ECA': '#fef9e7', 'NI': '#fdedec' };
  var nc = sheet.getRange(row, 6); nc.setNumberFormat('0.0').setFontWeight('bold');
  nc.setBackground(note20 >= 14 ? '#d5f5e3' : note20 >= 10 ? '#d4efdf' : note20 >= 8 ? '#fef9e7' : '#fdedec');
  comps.forEach(function(c, i) { if (c && bg[c]) sheet.getRange(row, 10 + i).setBackground(bg[c]); });
  if (appreciation && bg[appreciation]) sheet.getRange(row, 16).setBackground(bg[appreciation]);
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// =========================================
// MENUS UI (inchangés)
// =========================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('inerWeb')
    .addItem('Stats par classe', 'statsClasse').addItem('Stats par module', 'statsModule')
    .addSeparator().addItem('Créer vue classe', 'vueClasse').addSeparator().addItem('Réinitialiser', 'resetSheet').addToUi();
}

function statsClasse() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Résultats');
  if (!sheet || sheet.getLastRow() < 2) { SpreadsheetApp.getUi().alert('Aucun résultat.'); return; }
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues(), cl = {};
  data.forEach(function(r) { if (r[4] && r[5]) { if (!cl[r[4]]) cl[r[4]] = []; cl[r[4]].push(r[5]); } });
  var msg = 'STATS PAR CLASSE\n\n';
  Object.keys(cl).sort().forEach(function(k) {
    var n = cl[k], l = n.length, avg = n.reduce(function(a, b) { return a + b; }, 0) / l;
    msg += k + ' (' + l + ')\n  Moy:' + avg.toFixed(1) + '/20 Min:' + Math.min.apply(null, n).toFixed(1) + ' Max:' + Math.max.apply(null, n).toFixed(1) + '\n\n';
  });
  SpreadsheetApp.getUi().alert(msg);
}

function statsModule() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Résultats');
  if (!sheet || sheet.getLastRow() < 2) { SpreadsheetApp.getUi().alert('Aucun résultat.'); return; }
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues(), m = {};
  data.forEach(function(r) { if (r[1] && r[5]) { if (!m[r[1]]) m[r[1]] = []; m[r[1]].push(r[5]); } });
  var msg = 'STATS PAR MODULE\n\n';
  Object.keys(m).sort().forEach(function(k) {
    var n = m[k], l = n.length, avg = n.reduce(function(a, b) { return a + b; }, 0) / l;
    msg += k + '\n  ' + l + ' passages | Moy:' + avg.toFixed(1) + '/20\n\n';
  });
  SpreadsheetApp.getUi().alert(msg);
}

function vueClasse() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Classe (ex: 2 TNE):');
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var classe = r.getResponseText().trim(); if (!classe) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet(), src = ss.getSheetByName('Résultats');
  if (!src || src.getLastRow() < 2) { ui.alert('Aucun résultat.'); return; }
  var vn = 'Vue ' + classe, old = ss.getSheetByName(vn); if (old) ss.deleteSheet(old);
  var v = ss.insertSheet(vn);
  v.appendRow(src.getRange(1, 1, 1, 16).getValues()[0]);
  v.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#0f2d52').setFontColor('#fff'); v.setFrozenRows(1);
  var data = src.getRange(2, 1, src.getLastRow() - 1, 16).getValues(), cnt = 0;
  data.forEach(function(row) { if (row[4] === classe) { v.appendRow(row); cnt++; colorRow_(v, v.getLastRow(), row[5], [row[9], row[10], row[11], row[12], row[13], row[14]], row[15]); } });
  if (cnt > 0) v.getRange(2, 1, cnt, 16).sort([{ column: 3, ascending: true }]);
  ui.alert(cnt + ' résultat(s) pour ' + classe);
}

function resetSheet() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Tout supprimer ?', ui.ButtonSet.YES_NO) === ui.Button.YES) {
    var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Résultats');
    if (s) SpreadsheetApp.getActiveSpreadsheet().deleteSheet(s); ui.alert('OK');
  }
}
