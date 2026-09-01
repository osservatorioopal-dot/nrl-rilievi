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

var CARTELLA_FOTO = '';   // opzionale: ID di una cartella Drive per le foto

/* Elenco dei nomi utente autorizzati a inviare dati. Se lasciato vuoto accetta
   qualunque invio. Poiché l'indirizzo di sincronizzazione è incorporato nell'app
   pubblicata, compilarlo con i nomi utente dei rilevatori (es. ['gennaro','mrossi'])
   è il modo più semplice per scartare invii estranei: l'elenco sta qui sul server
   e non è visibile a chi legge il codice dell'app. */
var RILEVATORI_AMMESSI = [];

/* ID del foglio Google dei dati. Se valorizzato lo script funziona anche come
   progetto autonomo (non collegato al foglio); se vuoto usa il foglio contenitore. */
var ID_FOGLIO = '1saH8hb_BqJzmc34wSVtHCJ6NRqg8lG3HfOqk2XJ_pHo';
function foglioDati() {
  return ID_FOGLIO ? SpreadsheetApp.openById(ID_FOGLIO) : SpreadsheetApp.getActiveSpreadsheet();
}

/* ------------------------------------------------------------------ doGet */
function doGet(e) {
  return json({ ok: true, servizio: 'NRL Rilievi', versione: 1, ora: new Date().toISOString() });
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
  'creato', 'modificato', 'sincronizzato'];

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
    upsert(sh, idx, pl.id, riga); n++;
  });
  return n;
}

/* -------------------------------------------------------------------- SCHEDE */
var COL_SCHEDE = ['id', 'id_area', 'codice_area', 'scheda', 'nome_scheda', 'valore_indicatore', 'unita',
  'stato', 'rilevatore', 'modificato', 'note', 'dettagli_calcolo', 'dati_json'];

function scriviSchede(ss, p) {
  var sh = foglio(ss, 'Schede', COL_SCHEDE);
  var idx = indice(sh);
  var codici = {};
  (p.plots || []).forEach(function (pl) { codici[pl.id] = pl.codice; });
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
  var codici = {};
  (p.plots || []).forEach(function (pl) { codici[pl.id] = pl.codice; });
  var n = 0;
  (p.schede || []).forEach(function (s) {
    var d = s.data || {};
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (!Array.isArray(v) || !v.length || typeof v[0] !== 'object') return;
      v.forEach(function (r, i) {
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
function salvaFoto(p) {
  var foto = p.foto || [];
  if (!foto.length || !CARTELLA_FOTO) return 0;
  var cartella = DriveApp.getFolderById(CARTELLA_FOTO);
  var n = 0;
  foto.forEach(function (f) {
    try {
      var parti = String(f.dati).split(',');
      var blob = Utilities.newBlob(Utilities.base64Decode(parti[1]), 'image/jpeg',
        [f.plotId, f.schedaId, f.campo, f.id].join('_') + '.jpg');
      cartella.createFile(blob); n++;
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
  }
  return sh;
}

function indice(sh) {
  var ultima = sh.getLastRow();
  var mappa = {};
  if (ultima < 2) return mappa;
  var ids = sh.getRange(2, 1, ultima - 1, 1).getValues();
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
