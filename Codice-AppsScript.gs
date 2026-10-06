/**
 * NRL Rilievi — backend di sincronizzazione su Google Sheets
 * ---------------------------------------------------------------------------
 * Riceve i rilievi inviati dall'app Android (PWA) e li registra su un foglio
 * Google. Gestisce l'aggiornamento delle righe già presenti (upsert per ID),
 * così un'area di saggio modificata e risincronizzata non viene duplicata.
 *
 * INSTALLAZIONE (gia' eseguita per il foglio "NRL Rilievi - dati")
 * 1. Crea un nuovo foglio Google e copia il suo ID dall'indirizzo, poi incollalo
 *    in ID_FOGLIO qui sotto (oppure lascialo vuoto se incolli questo codice in
 *    Estensioni > Apps Script del foglio stesso, cioe' in un progetto collegato).
 * 2. Salva, poi Distribuisci > Nuova distribuzione > tipo "App web":
 *      - Esegui come: Me
 *      - Chi ha accesso: Chiunque
 * 3. Autorizza l'accesso quando Google lo chiede (Avanzate > Apri ... non sicuro).
 * 4. Copia l'URL che termina con /exec e incollalo in app > Impostazioni.
 * ---------------------------------------------------------------------------
 */

var CARTELLA_FOTO = '';   // ID di una cartella Drive per le foto (se vuoto si usa PERCORSO_FOTO)
/* Percorso della cartella delle foto dentro "Il mio Drive" dell'account che possiede lo script (creata se manca).
   E' l'archivio delle foto: il progetto QGIS le scarica nella cartella locale 02_DATI/foto_app con lo script
   03_SCRIPT/aggiorna_da_foglio.py (doGet ...?formato=foto&id=ID_FILE&token=...), senza dipendere da Drive per desktop. */
var PERCORSO_FOTO = ['NRL Rilievi - foto'];

/* Elenco dei nomi utente autorizzati a inviare dati. Se lasciato vuoto accetta
   qualunque invio. Poiché l'indirizzo di sincronizzazione è incorporato nell'app
   pubblicata, compilarlo con i nomi utente dei rilevatori (es. ['gennaro','mrossi'])
   è il modo più semplice per scartare invii estranei: l'elenco sta qui sul server
   e non è visibile a chi legge il codice dell'app. */
var RILEVATORI_AMMESSI = [];

/* Chiave di lettura per l'esportazione CSV/JSON verso QGIS (doGet ...?formato=csv&foglio=Aree_di_saggio&token=...).
   Senza chiave, o con chiave errata, il servizio non restituisce dati. Cambiarla a piacere (e nello script
   03_SCRIPT/aggiorna_da_foglio.py del progetto QGIS). Vuota = esportazione disattivata. */
var TOKEN_LETTURA = 'qgis-cfbc7d24850b8ae49d8afa38';

/* ID del foglio Google dei dati. Se valorizzato lo script funziona anche come
   progetto autonomo (non collegato al foglio); se vuoto usa il foglio contenitore. */
var ID_FOGLIO = '1saH8hb_BqJzmc34wSVtHCJ6NRqg8lG3HfOqk2XJ_pHo';
function foglioDati() {
  return ID_FOGLIO ? SpreadsheetApp.openById(ID_FOGLIO) : SpreadsheetApp.getActiveSpreadsheet();
}

/* ------------------------------------------------------------------ doGet */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.formato === 'csv' || p.formato === 'json') return esporta(p);
  if (p.formato === 'foto') return esportaFoto(p);
  if (p.cartella_foto === '1') { try { return json({ ok: true, cartella: cartellaFoto().getName(), id: cartellaFoto().getId() }); } catch (e) { return json({ ok: false, errore: String(e) }); } }
  return json({ ok: true, servizio: 'NRL Rilievi', versione: 3, ora: new Date().toISOString() });
}

/* Esportazione di lettura per QGIS: ?formato=csv|json&foglio=Aree_di_saggio|Schede|Dettaglio_elementi&token=CHIAVE
   (il progetto QGIS la usa tramite lo script aggiorna_da_foglio.py, che segue il reindirizzamento di Google). */
function esporta(p) {
  if (!TOKEN_LETTURA || String(p.token) !== TOKEN_LETTURA) return testo('token non valido');
  var nome = p.foglio || 'Aree_di_saggio';
  var sh = foglioDati().getSheetByName(nome);
  if (!sh) return testo('foglio non trovato: ' + nome);
  var v = sh.getDataRange().getDisplayValues();
  if (p.formato === 'json') return json({ ok: true, foglio: nome, intestazioni: v[0] || [], righe: v.slice(1) });
  var csv = v.map(function (r) {
    return r.map(function (c) { return '"' + String(c === null || c === undefined ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
  }).join('\r\n');
  return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
}
function testo(t) { return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.TEXT); }

/* Scarica una foto per QGIS: ?formato=foto&id=ID_FILE_DRIVE&token=CHIAVE -> JSON { ok, nome, base64 }
   (ContentService non restituisce file binari: l'immagine viaggia in base64 e lo script Python la decodifica). */
function esportaFoto(p) {
  if (!TOKEN_LETTURA || String(p.token) !== TOKEN_LETTURA) return json({ ok: false, errore: 'token non valido' });
  try {
    var file = DriveApp.getFileById(String(p.id || ''));
    var blob = file.getBlob();
    return json({ ok: true, nome: file.getName(), tipo: blob.getContentType(), dimensione: blob.getBytes().length,
      base64: Utilities.base64Encode(blob.getBytes()) });
  } catch (e) { return json({ ok: false, errore: String(e) }); }
}

/* ----------------------------------------------------------------- doPost */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var p = JSON.parse(e.postData.contents);

    if (RILEVATORI_AMMESSI.length && RILEVATORI_AMMESSI.indexOf(String(p.utente)) < 0) {
      return json({ ok: false, errore: 'Rilevatore non autorizzato: ' + p.utente });
    }

    var ss = foglioDati();
    var righe = 0;

    righe += scriviAree(ss, p);
    righe += scriviSchede(ss, p);
    righe += scriviDettaglio(ss, p);
    var foto = salvaFoto(p);

    return json({ ok: true, righe: righe, foto: foto, ricevuto: new Date().toISOString() });
  } catch (err) {
    return json({ ok: false, errore: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* -------------------------------------------------------------- AREE DI SAGGIO */
var COL_AREE = ['id', 'codice', 'progetto', 'data', 'comune', 'localita', 'localita_2', 'lat', 'lon', 'quota_gps',
  'precisione_m', 'regione', 'provincia', 'foglio', 'particella', 'particella_forestale', 'proprieta',
  'quota', 'esposizione', 'pendenza', 'giacitura', 'forma_ads', 'raggio_m', 'superficie_m2',
  'categoria_forestale', 'forma_governo', 'stadio', 'copertura_pct', 'eta_stimata', 'ultimo_intervento',
  'natura2000', 'codice_sito', 'habitat', 'disturbi', 'rilevatore', 'nome_rilevatore', 'stato',
  'creato', 'modificato', 'sincronizzato',
  // colonne del piano di campionamento (integrazione QGIS/QField, app v1.1)
  'ads_pianificata', 'strato', 'tipologia_forestale', 'ruolo', 'punto_ascolto', 'lat_pian', 'lon_pian', 'x_pian', 'y_pian', 'scostamento_m'];

function scriviAree(ss, p) {
  var sh = foglio(ss, 'Aree_di_saggio', COL_AREE);
  var idx = indice(sh);
  var n = 0;
  (p.plots || []).forEach(function (pl) {
    var d = pl.data || {}, g = d.gps || {};
    var riga = [pl.id, pl.codice, d.progetto || p.progetto, d.data, d.comune, d.localita, '',
      g.lat || '', g.lon || '', g.alt || '', g.acc || '', d.regione, d.provincia, d.foglio, d.particella,
      d.part_forestale, d.proprieta, d.quota, d.esposizione, d.pendenza, d.giacitura, d.ads_forma,
      d.ads_raggio, superficie(d), d.categoria, d.governo, d.stadio, d.copertura, d.eta_stimata,
      d.ultimo_intervento, d.natura2000 ? 'SI' : 'NO', d.cod_sito, d.habitat,
      (d.disturbi || []).join(', '), pl.utente, p.nomeUtente, pl.stato, pl.creato, pl.modificato,
      new Date().toISOString()];
    var q = pl.pianificato || {};
    riga = riga.concat([q.ads_id || '', q.strato || '', q.tipologia_forestale || '', q.ruolo || '', q.punto_ascolto ? 1 : 0,
      q.lat_pian || '', q.lon_pian || '', q.x_pian || '', q.y_pian || '',
      (q.lat_pian && g.lat) ? Math.round(distanzaM(g.lat, g.lon, q.lat_pian, q.lon_pian)) : '']);
    upsert(sh, idx, pl.id, riga); n++;
  });
  return n;
}

/* ------------------------------------------------------- MANUTENZIONE (da eseguire dall'editor Apps Script: Esegui) */
/* Compila il codice AdS mancante nelle righe di Schede e Dettaglio_elementi (righe inviate da app < 1.3 senza l'area nello stesso invio). */
function riparaCodiciArea() {
  var ss = foglioDati();
  var codici = mappaCodici(ss, {});
  var n = 0;
  [['Schede', 2, 3], ['Dettaglio_elementi', 2, 3]].forEach(function (cfg) {
    var sh = ss.getSheetByName(cfg[0]); if (!sh || sh.getLastRow() < 2) return;
    var colId = cfg[1], colCod = cfg[2];
    if (cfg[0] === 'Dettaglio_elementi') {
      // il dettaglio ha id_scheda, non id_area: si passa dalla scheda
      var shS = ss.getSheetByName('Schede'); if (!shS || shS.getLastRow() < 2) return;
      var vs = shS.getRange(2, 1, shS.getLastRow() - 1, 3).getValues();
      var perScheda = {}; vs.forEach(function (r) { if (r[0]) perScheda[r[0]] = r[2] || codici[r[1]] || ''; });
      var vd = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
      for (var i = 0; i < vd.length; i++) if (vd[i][0] && !vd[i][2] && perScheda[vd[i][1]]) { sh.getRange(i + 2, 3).setValue(perScheda[vd[i][1]]); n++; }
      return;
    }
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
    for (var j = 0; j < v.length; j++) if (v[j][0] && !v[j][colCod - 1] && codici[v[j][colId - 1]]) { sh.getRange(j + 2, colCod).setValue(codici[v[j][colId - 1]]); n++; }
  });
  Logger.log('codici compilati: ' + n);
  return n;
}

/* Elimina un'area di saggio (per codice) con le sue schede, righe di dettaglio e foto dal foglio (i file su Drive restano).
   Uso: nell'editor scrivere il codice nella costante qui sotto ed eseguire eliminaAreaDiSaggio. Attenzione: irreversibile. */
var CODICE_DA_ELIMINARE = '';
function eliminaAreaDiSaggio(codice) {
  codice = codice || CODICE_DA_ELIMINARE;
  if (!codice) throw new Error('indicare il codice AdS in CODICE_DA_ELIMINARE');
  var ss = foglioDati();
  var sh = ss.getSheetByName('Aree_di_saggio'); if (!sh) return;
  var v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues();
  var ids = [];
  for (var i = v.length - 1; i >= 0; i--) if (String(v[i][1]).toUpperCase() === String(codice).toUpperCase()) { ids.push(v[i][0]); sh.deleteRow(i + 2); }
  var shS = ss.getSheetByName('Schede'), idSchede = [];
  if (shS && shS.getLastRow() > 1) {
    var vs = shS.getRange(2, 1, shS.getLastRow() - 1, 3).getValues();
    for (var j = vs.length - 1; j >= 0; j--) if (ids.indexOf(vs[j][1]) >= 0 || String(vs[j][2]).toUpperCase() === String(codice).toUpperCase()) { idSchede.push(vs[j][0]); shS.deleteRow(j + 2); }
  }
  var shD = ss.getSheetByName('Dettaglio_elementi');
  if (shD && shD.getLastRow() > 1) {
    var vd = shD.getRange(2, 1, shD.getLastRow() - 1, 3).getValues();
    for (var k = vd.length - 1; k >= 0; k--) if (idSchede.indexOf(vd[k][1]) >= 0 || String(vd[k][2]).toUpperCase() === String(codice).toUpperCase()) shD.deleteRow(k + 2);
  }
  var shF = ss.getSheetByName('Foto');
  if (shF && shF.getLastRow() > 1) {
    var vf = shF.getRange(2, 1, shF.getLastRow() - 1, 1).getValues();
    for (var m = vf.length - 1; m >= 0; m--) if (String(vf[m][0]).toUpperCase() === String(codice).toUpperCase()) shF.deleteRow(m + 2);
  }
  Logger.log('eliminata ' + codice + ': aree ' + ids.length + ', schede ' + idSchede.length);
}

/* -------------------------------------------------------------------- SCHEDE */
var COL_SCHEDE = ['id', 'id_area', 'codice_area', 'scheda', 'nome_scheda', 'valore_indicatore', 'unita',
  'stato', 'rilevatore', 'modificato', 'note', 'dettagli_calcolo', 'dati_json'];

function mappaCodici(ss, p) {
  // id area -> codice: dal payload (app >= 1.3 invia tutti i codici), dalle aree del payload e, in mancanza, dal foglio Aree_di_saggio
  var codici = {};
  Object.keys(p.codici || {}).forEach(function (k) { codici[k] = p.codici[k]; });
  (p.plots || []).forEach(function (pl) { codici[pl.id] = pl.codice; });
  var sh = ss.getSheetByName('Aree_di_saggio');
  if (sh && sh.getLastRow() > 1) {
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    v.forEach(function (r) { if (r[0] && !codici[r[0]]) codici[r[0]] = r[1]; });
  }
  return codici;
}

function scriviSchede(ss, p) {
  var sh = foglio(ss, 'Schede', COL_SCHEDE);
  var idx = indice(sh);
  var codici = mappaCodici(ss, p);
  var n = 0;
  (p.schede || []).forEach(function (s) {
    var ind = s.indicatore || {};
    var dett = (ind.dettagli || []).map(function (x) { return x.l + ': ' + x.v; }).join(' | ');
    var d = s.data || {};
    var riga = [s.id, s.plotId, codici[s.plotId] || '', s.schedaId, nomeScheda(s.schedaId),
      ind.valore !== undefined ? ind.valore : '', ind.unita || '', s.stato, s.utente, s.modificato,
      d._note || '', dett, JSON.stringify(pulisci(d)).slice(0, 45000)];
    upsert(sh, idx, s.id, riga); n++;
  });
  return n;
}

/* ----------------------------------------------------------------- DETTAGLIO
   Una riga per ogni elemento delle tabelle (alberi morti, tronchi, piante
   cavallettate, contatti ornitici): è il foglio da usare per le elaborazioni. */
var COL_DETT = ['id_riga', 'id_scheda', 'codice_area', 'scheda', 'tabella', 'n_riga',
  'specie', 'diametro', 'diametro_2', 'altezza_lunghezza', 'classe_decadimento', 'n_individui',
  'altri_campi', 'rilevatore', 'modificato'];

function scriviDettaglio(ss, p) {
  var sh = foglio(ss, 'Dettaglio_elementi', COL_DETT);
  var idx = indice(sh);
  var codici = mappaCodici(ss, p);
  var n = 0;
  (p.schede || []).forEach(function (s) {
    var d = s.data || {};
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (!Array.isArray(v) || !v.length || typeof v[0] !== 'object') return;
      v.forEach(function (r, i) {
        var vuota = !Object.keys(r).some(function (ck) { return r[ck] !== '' && r[ck] !== null && r[ck] !== undefined && r[ck] !== false; });
        if (vuota) return;
        var idRiga = s.id + '#' + k + '#' + i;
        var altri = {};
        Object.keys(r).forEach(function (ck) {
          if (['sp', 'd', 'd1', 'd2', 'db', 'h', 'lung', 'dec', 'n'].indexOf(ck) < 0) altri[ck] = r[ck];
        });
        var riga = [idRiga, s.id, codici[s.plotId] || '', s.schedaId, k, i + 1,
          r.sp || '', r.d || r.d1 || '', r.d2 || r.db || '', r.h || r.lung || '', r.dec || '', r.n || '',
          JSON.stringify(altri), s.utente, s.modificato];
        upsert(sh, idx, idRiga, riga); n++;
      });
    });
  });
  return n;
}

/* --------------------------------------------------------------------- FOTO */
function cartellaFoto() {
  if (CARTELLA_FOTO) return DriveApp.getFolderById(CARTELLA_FOTO);
  var dir = DriveApp.getRootFolder();
  PERCORSO_FOTO.forEach(function (nome) {
    var it = dir.getFoldersByName(nome);
    dir = it.hasNext() ? it.next() : dir.createFolder(nome);
  });
  return dir;
}

function sottocartella(dir, nome) {
  var it = dir.getFoldersByName(nome);
  return it.hasNext() ? it.next() : dir.createFolder(nome);
}

var COL_FOTO = ['codice', 'scheda', 'campo', 'n', 'file', 'url', 'id_foto', 'id_area', 'rilevatore', 'ricevuto', 'id_file', 'byte'];

/* Salva le foto in Drive: foto_app/<codice AdS>/<codice>_<SCHEDA>_<campo>_<n>.jpg (sostituisce l'omonimo) e
   registra ogni file nel foglio "Foto" (upsert per id_foto). Le foto senza codice vanno in "senza_codice". */
function salvaFoto(p) {
  var foto = p.foto || [];
  if (!foto.length) return 0;
  var base = cartellaFoto();
  var ss = foglioDati();
  var sh = foglio(ss, 'Foto', COL_FOTO);
  var idx = indice(sh, 7);
  var n = 0;
  foto.forEach(function (f) {
    try {
      var codice = String(f.codice || '').trim() || 'senza_codice';
      var sigla = String(f.sigla || f.schedaId || 'scheda').replace(/^NRL-/, '').replace(/[^A-Za-z0-9]+/g, '');
      var nome = [codice, sigla, f.campo || 'foto', f.n || 1].join('_') + '.jpg';
      var dir = sottocartella(base, codice);
      var vecchi = dir.getFilesByName(nome);
      while (vecchi.hasNext()) vecchi.next().setTrashed(true);
      // righe del foglio Foto con lo stesso nome file ma altro id (foto eliminata e rifatta nell'app): svuotate
      var righe = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, COL_FOTO.length).getValues() : [];
      for (var r = 0; r < righe.length; r++) {
        if (righe[r][4] === nome && righe[r][6] !== f.id) { sh.getRange(r + 2, 1, 1, COL_FOTO.length).clearContent(); delete idx[righe[r][6]]; }
      }
      var parti = String(f.dati).split(',');
      var file = dir.createFile(Utilities.newBlob(Utilities.base64Decode(parti[1]), 'image/jpeg', nome));
      upsert(sh, idx, f.id, [codice, sigla, f.campo || '', f.n || 1, nome, file.getUrl(), f.id, f.plotId || '', p.utente || '',
        new Date().toISOString(), file.getId(), file.getSize()]);
      n++;
    } catch (e) {}
  });
  return n;
}

/* ------------------------------------------------------------------ UTILITÀ */
function foglio(ss, nome, intestazioni) {
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, intestazioni.length).setValues([intestazioni])
      .setFontWeight('bold').setBackground('#14532d').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < intestazioni.length) {
    // foglio creato da una versione precedente: aggiunge le nuove colonne in coda
    var da = sh.getLastColumn();
    sh.getRange(1, da + 1, 1, intestazioni.length - da).setValues([intestazioni.slice(da)])
      .setFontWeight('bold').setBackground('#14532d').setFontColor('#ffffff');
  }
  return sh;
}

function distanzaM(lat1, lon1, lat2, lon2) {
  var R = 6371000, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function indice(sh, colonna) {
  var ultima = sh.getLastRow();
  var mappa = {};
  if (ultima < 2) return mappa;
  var ids = sh.getRange(2, colonna || 1, ultima - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0]) mappa[ids[i][0]] = i + 2;
  return mappa;
}

function upsert(sh, idx, id, riga) {
  if (idx[id]) {
    sh.getRange(idx[id], 1, 1, riga.length).setValues([riga]);
  } else {
    sh.appendRow(riga);
    idx[id] = sh.getLastRow();
  }
}

function superficie(d) {
  if (d.ads_forma === 'Quadrata' || d.ads_forma === 'Rettangolare') {
    var l1 = Number(d.ads_lato1) || 0, l2 = Number(d.ads_lato2) || l1;
    return Math.round(l1 * l2 * 10) / 10;
  }
  var r = Number(d.ads_raggio) || 13;
  return Math.round(Math.PI * r * r * 10) / 10;
}

function nomeScheda(id) {
  var m = {
    anagrafica: 'Anagrafica area di saggio',
    f1_legno_morto_piedi: 'NRL-F1 Legno morto in piedi',
    f2_legno_morto_terra: 'NRL-F2 Legno morto a terra',
    f3_disetaneita: 'NRL-F3 Struttura disetanea',
    f4_connettivita: 'NRL-F4 Connettività forestale',
    f5_carbonio: 'NRL-F5 Stock di carbonio organico',
    f6_autoctone: 'NRL-F6 Specie arboree autoctone',
    f7_diversita: 'NRL-F7 Diversità di specie arboree',
    f8_uccelli: 'NRL-F8 Indice uccelli forestali comuni'
  };
  return m[id] || id;
}

/** rimuove firme e foto (troppo pesanti) dal JSON archiviato */
function pulisci(d) {
  var out = {};
  Object.keys(d).forEach(function (k) {
    if (k === '_firma' || k === 'foto') { out[k] = d[k] ? 'presente' : ''; return; }
    out[k] = d[k];
  });
  return out;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------- MANUTENZIONE
   Funzioni da lanciare SOLO dall'editor Apps Script (selezionarle in alto e premere Esegui): non sono raggiungibili
   dall'app né dal web. Servono a togliere i dati di prova prima dell'inizio della campagna. */

/* Svuota TUTTI i dati (Aree_di_saggio, Schede, Dettaglio_elementi, Foto, Riepilogo): restano le intestazioni;
   le foto in Drive vengono spostate nel cestino. Irreversibile (salvo ripristino dal cestino e dalla cronologia del foglio). */
function svuotaDatiDiProva() {
  var ss = foglioDati();
  ['Aree_di_saggio', 'Schede', 'Dettaglio_elementi', 'Foto', 'Riepilogo'].forEach(function (nome) {
    var sh = ss.getSheetByName(nome);
    if (sh && sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  });
  try {
    var dir = cartellaFoto();
    var sotto = dir.getFolders(); while (sotto.hasNext()) sotto.next().setTrashed(true);
    var file = dir.getFiles(); while (file.hasNext()) file.next().setTrashed(true);
  } catch (e) {}
  Logger.log('Dati di prova eliminati');
}

/* Elimina solo le aree di saggio elencate in CODICI_DA_ELIMINARE (schede, dettaglio e foto comprese). */
var CODICI_DA_ELIMINARE = [];   // es. ['GM-LEC-05', 'GM-LEC-07']

function eliminaAreeElencate() {
  var ss = foglioDati();
  var codici = {}; CODICI_DA_ELIMINARE.forEach(function (c) { codici[String(c).trim().toUpperCase()] = true; });
  if (!Object.keys(codici).length) { Logger.log('Compilare CODICI_DA_ELIMINARE'); return; }
  var idAree = {}, idSchede = {};
  var sh = ss.getSheetByName('Aree_di_saggio');
  if (sh) {
    var v = sh.getDataRange().getValues();
    for (var r = v.length - 1; r >= 1; r--) {
      var cod = String(v[r][1] || '').toUpperCase(), pian = String(v[r][40] || '').toUpperCase();
      if (codici[cod] || codici[pian]) { idAree[v[r][0]] = true; sh.deleteRow(r + 1); }
    }
  }
  sh = ss.getSheetByName('Schede');
  if (sh) {
    v = sh.getDataRange().getValues();
    for (r = v.length - 1; r >= 1; r--) {
      if (idAree[v[r][1]] || codici[String(v[r][2] || '').toUpperCase()]) { idSchede[v[r][0]] = true; sh.deleteRow(r + 1); }
    }
  }
  sh = ss.getSheetByName('Dettaglio_elementi');
  if (sh) {
    v = sh.getDataRange().getValues();
    for (r = v.length - 1; r >= 1; r--) {
      if (idSchede[v[r][1]] || codici[String(v[r][2] || '').toUpperCase()]) sh.deleteRow(r + 1);
    }
  }
  sh = ss.getSheetByName('Foto');
  if (sh) {
    v = sh.getDataRange().getValues();
    for (r = v.length - 1; r >= 1; r--) {
      if (codici[String(v[r][0] || '').toUpperCase()] || idAree[v[r][7]]) sh.deleteRow(r + 1);
    }
  }
  try {
    var dir = cartellaFoto();
    Object.keys(codici).forEach(function (c) { var it = dir.getFoldersByName(c); while (it.hasNext()) it.next().setTrashed(true); });
  } catch (e) {}
  Logger.log('Eliminate le aree: ' + Object.keys(codici).join(', '));
}

/* -------------------------------------------------- riepilogo (facoltativo)
   Menu > NRL > Aggiorna riepilogo: calcola le medie degli indicatori per
   comune e per categoria forestale in un foglio dedicato. */
/* Con progetto autonomo il menu non compare nel foglio: la funzione
   aggiornaRiepilogo() si lancia dall'editor Apps Script (pulsante Esegui)
   oppure con un attivatore a tempo. Con progetto collegato al foglio,
   il menu NRL compare normalmente. */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('NRL')
      .addItem('Aggiorna riepilogo indicatori', 'aggiornaRiepilogo').addToUi();
  } catch (e) {}
}

function aggiornaRiepilogo() {
  var ss = foglioDati();
  var sh = ss.getSheetByName('Schede'); if (!sh) return;
  var dati = sh.getDataRange().getValues(); dati.shift();
  var acc = {};
  dati.forEach(function (r) {
    var scheda = r[3], val = parseFloat(r[5]);
    if (!scheda || scheda === 'anagrafica') return;
    acc[scheda] = acc[scheda] || { n: 0, somma: 0, min: Infinity, max: -Infinity, testo: {} };
    if (isFinite(val)) {
      acc[scheda].n++; acc[scheda].somma += val;
      acc[scheda].min = Math.min(acc[scheda].min, val);
      acc[scheda].max = Math.max(acc[scheda].max, val);
    } else if (r[5]) {
      acc[scheda].testo[r[5]] = (acc[scheda].testo[r[5]] || 0) + 1;
    }
  });
  var out = ss.getSheetByName('Riepilogo') || ss.insertSheet('Riepilogo');
  out.clear();
  out.appendRow(['Indicatore', 'N. aree di saggio', 'Media', 'Minimo', 'Massimo', 'Valori categoriali']);
  out.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#14532d').setFontColor('#ffffff');
  Object.keys(acc).sort().forEach(function (k) {
    var a = acc[k];
    out.appendRow([nomeScheda(k), a.n, a.n ? a.somma / a.n : '',
      isFinite(a.min) ? a.min : '', isFinite(a.max) ? a.max : '',
      Object.keys(a.testo).map(function (t) { return t + ': ' + a.testo[t]; }).join(' | ')]);
  });
  out.autoResizeColumns(1, 6);
}
