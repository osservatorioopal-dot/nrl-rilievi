/* ============================================================================
   NRL Rilievi — motore applicativo
   PWA offline-first per il rilievo degli indicatori forestali NRL
   ========================================================================== */
'use strict';

/* ============================== 1. DATABASE ============================== */
const DB = (() => {
  const NOME = 'nrl-rilievi', VER = 1;
  let db = null;
  function apri() {
    return new Promise((res, rej) => {
      if (db) return res(db);
      const rq = indexedDB.open(NOME, VER);
      rq.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('plots')) d.createObjectStore('plots', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('schede')) {
          const s = d.createObjectStore('schede', { keyPath: 'id' });
          s.createIndex('plotId', 'plotId');
        }
        if (!d.objectStoreNames.contains('foto')) {
          const f = d.createObjectStore('foto', { keyPath: 'id' });
          f.createIndex('plotId', 'plotId');
        }
      };
      rq.onsuccess = e => { db = e.target.result; res(db); };
      rq.onerror = e => rej(e.target.error);
    });
  }
  const tx = async (store, mode, fn) => {
    const d = await apri();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let rq; try { rq = fn(s); } catch (e) { return rej(e); }
      t.oncomplete = () => res(rq && typeof rq === 'object' && 'result' in rq ? rq.result : undefined);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (store, k) => tx(store, 'readonly', s => s.get(k)),
    all: (store) => tx(store, 'readonly', s => s.getAll()),
    byIndex: (store, idx, val) => tx(store, 'readonly', s => s.index(idx).getAll(val)),
    put: (store, v, k) => tx(store, 'readwrite', s => s.put(v, k)),
    del: (store, k) => tx(store, 'readwrite', s => s.delete(k)),
    clear: (store) => tx(store, 'readwrite', s => s.clear())
  };
})();

/* ============================== 2. STATO ================================= */
const S = {
  utente: null, utenti: [], coeff: { ...COEFF_DEFAULT }, config: {},
  plots: [], plot: null, schede: {}, vista: 'login', dirty: false
};
window.COEFF = S.coeff;

const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const oggi = () => new Date().toISOString().slice(0, 10);
const adesso = () => new Date().toISOString();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ============================== 3. AVVIO ================================ */
async function avvio() {
  S.utenti = (await DB.get('kv', 'utenti')) || [];
  S.config = (await DB.get('kv', 'config')) || { syncUrl: '', progetto: '', autoSync: true };
  const c = await DB.get('kv', 'coeff'); if (c) Object.assign(S.coeff, c);
  const specieOv = await DB.get('kv', 'specieOverride');
  if (specieOv) Object.entries(specieOv).forEach(([k, v]) => { if (SPECIE_MAP[k]) Object.assign(SPECIE_MAP[k], v); });
  const sess = sessionStorage.getItem('nrl_utente');
  if (sess && S.utenti.find(u => u.u === sess)) S.utente = S.utenti.find(u => u.u === sess);
  await caricaPlots();
  render();
  window.addEventListener('online', aggiornaStatoRete);
  window.addEventListener('offline', aggiornaStatoRete);
  aggiornaStatoRete();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function caricaPlots() {
  S.plots = (await DB.all('plots')) || [];
  S.plots.sort((a, b) => (b.modificato || '').localeCompare(a.modificato || ''));
}

function aggiornaStatoRete() {
  const el = document.getElementById('rete');
  if (!el) return;
  const on = navigator.onLine;
  el.className = 'rete ' + (on ? 'on' : 'off');
  el.textContent = on ? '● online' : '● offline';
  if (on && S.config.autoSync && S.config.syncUrl && S.utente) setTimeout(() => sincronizza(true), 1500);
}

/* ============================== 4. ROUTER =============================== */
function vai(vista, param) { S.vista = vista; S.param = param; window.scrollTo(0, 0); render(); }

function render() {
  const app = document.getElementById('app');
  if (!S.utente) return app.innerHTML = S.utenti.length ? vistaLogin() : vistaPrimoAvvio(), bind();
  let html = '';
  switch (S.vista) {
    case 'plot': html = vistaPlot(); break;
    case 'scheda': html = vistaScheda(); break;
    case 'impostazioni': html = vistaImpostazioni(); break;
    case 'riepilogo': html = vistaRiepilogoProgetto(); break;
    default: html = vistaHome();
  }
  app.innerHTML = intestazione() + html;
  bind();
}

/* ============================== 5. VISTE ================================ */
function intestazione() {
  const pend = S.plots.filter(p => !p.sync).length;
  return `<header class="top">
    <div class="top-l"><span class="logo">NRL</span><div><div class="tit">Rilievi indicatori forestali</div>
      <div class="sub">Reg. (UE) 2024/1991 — Allegato VI</div></div></div>
    <div class="top-r">
      <span id="rete" class="rete">●</span>
      <button class="ico" data-a="sync" title="Sincronizza">⟳${pend ? `<b>${pend}</b>` : ''}</button>
      <button class="ico" data-a="impostazioni" title="Impostazioni">⚙</button>
      <button class="ico" data-a="logout" title="Esci">⏻</button>
    </div></header>`;
}

function vistaPrimoAvvio() {
  return `<div class="wrap login">
    <div class="card">
      <h1>NRL Rilievi</h1>
      <p class="muted">Primo avvio: crea l'utenza di amministrazione. Le utenze restano su questo dispositivo e permettono l'accesso anche senza connessione.</p>
      <label>Nome e cognome<input id="i-nome" placeholder="Mario Rossi"></label>
      <label>Nome utente<input id="i-user" autocapitalize="none" placeholder="mrossi"></label>
      <label>Password<input id="i-pwd" type="password" placeholder="almeno 6 caratteri"></label>
      <label>Conferma password<input id="i-pwd2" type="password"></label>
      <button class="primario" data-a="crea-admin">Crea utenza e inizia</button>
      <p class="err" id="err"></p>
    </div></div>`;
}

function vistaLogin() {
  return `<div class="wrap login">
    <div class="card">
      <h1>NRL Rilievi</h1>
      <p class="muted">Rilievo degli indicatori di biodiversità forestale — Reg. (UE) 2024/1991</p>
      <label>Nome utente<input id="i-user" autocapitalize="none" autocomplete="username"></label>
      <label>Password<input id="i-pwd" type="password" autocomplete="current-password"></label>
      <button class="primario" data-a="login">Accedi</button>
      <p class="err" id="err"></p>
    </div></div>`;
}

function vistaHome() {
  const q = (S.filtro || '').toLowerCase();
  const lista = S.plots.filter(p => !q || (p.codice + ' ' + (p.data.comune || '') + ' ' + (p.data.localita || '')).toLowerCase().includes(q));
  return `<div class="wrap">
    <div class="barra">
      <input id="cerca" class="cerca" placeholder="Cerca per codice, comune, località…" value="${esc(S.filtro || '')}">
      <button class="primario" data-a="nuovo-plot">+ Nuova area di saggio</button>
    </div>
    <div class="stats">
      <div class="stat"><b>${S.plots.length}</b><span>aree di saggio</span></div>
      <div class="stat"><b>${S.plots.filter(p => p.stato === 'completata').length}</b><span>completate</span></div>
      <div class="stat"><b>${S.plots.filter(p => !p.sync).length}</b><span>da sincronizzare</span></div>
      <div class="stat clic" data-a="riepilogo"><b>↗</b><span>riepilogo indicatori</span></div>
    </div>
    ${lista.length ? lista.map(cardPlot).join('') : `<div class="vuoto">Nessuna area di saggio.<br>Premi <b>+ Nuova area di saggio</b> per iniziare il rilievo.</div>`}
  </div>`;
}

function cardPlot(p) {
  const n = p.schedeCompilate || 0;
  return `<div class="card plot" data-a="apri-plot" data-id="${p.id}">
    <div class="plot-h">
      <div><div class="plot-cod">${esc(p.codice || 'senza codice')}</div>
      <div class="muted">${esc(p.data.comune || '—')}${p.data.localita ? ' · ' + esc(p.data.localita) : ''} · ${esc(p.data.data || '')}</div></div>
      <div class="badges">
        <span class="badge ${p.sync ? 'ok' : 'warn'}">${p.sync ? 'sincronizzata' : 'locale'}</span>
        <span class="badge">${n}/8 schede</span>
      </div>
    </div>
    <div class="prog"><i style="width:${n / 8 * 100}%"></i></div>
  </div>`;
}

function vistaPlot() {
  const p = S.plot; if (!p) return vistaHome();
  const righe = SCHEDE.map(sc => {
    const dati = S.schede[sc.id];
    const stato = dati && dati.stato ? dati.stato : 'vuota';
    const cls = { vuota: '', bozza: 'warn', completata: 'ok', validata: 'ok2' }[stato];
    let val = '';
    if (dati && sc.calcolo) { try { const r = calcolaScheda(sc, dati); val = r.valore + ' ' + (r.unita || ''); } catch (e) { val = ''; } }
    return `<div class="card scheda-riga" data-a="apri-scheda" data-id="${sc.id}" style="border-left-color:${sc.colore}">
      <div class="sr-ico">${sc.icona}</div>
      <div class="sr-txt"><div class="sr-cod">${sc.cod}</div><div class="sr-nome">${esc(sc.nome)}</div>
      <div class="muted small">${esc(sc.sub)}</div></div>
      <div class="sr-dx">${val ? `<div class="valore">${esc(val)}</div>` : ''}<span class="badge ${cls}">${stato}</span></div>
    </div>`;
  }).join('');
  return `<div class="wrap">
    <button class="link" data-a="home">← Tutte le aree di saggio</button>
    <div class="card testata">
      <h2>${esc(p.codice || 'Nuova area di saggio')}</h2>
      <div class="muted">${esc(p.data.comune || 'comune non indicato')} · ${esc(p.data.categoria || 'categoria non indicata')} · ${esc(p.data.data || '')}</div>
      <div class="azioni">
        <button data-a="apri-scheda" data-id="anagrafica">Modifica anagrafica</button>
        <button data-a="riepilogo-plot">Riepilogo indicatori</button>
        <button data-a="esporta-plot">Esporta</button>
        <button class="pericolo" data-a="elimina-plot">Elimina</button>
      </div>
    </div>
    ${righe}
  </div>`;
}

function vistaScheda() {
  const sc = SCHEDE_MAP[S.param]; if (!sc) return vistaPlot();
  const dati = S.schede[sc.id] || { data: {}, stato: 'bozza' };
  const d = applicaDefault(sc.id, dati.data || {});
  const sezioni = sc.sezioni.map((sez, i) => {
    if (sez.showIfS && !visibile(sez.showIfS, d)) return '';
    return `<div class="card sez"><h3>${esc(sez.t)}</h3>${sez.f.map(f => campo(f, d, sc)).join('')}</div>`;
  }).join('');
  const calc = sc.calcolo ? boxCalcolo(sc, dati) : '';
  return `<div class="wrap scheda-form">
    <button class="link" data-a="apri-plot" data-id="${S.plot.id}">← ${esc(S.plot.codice || 'Area di saggio')}</button>
    <div class="card intestazione-scheda" style="border-top-color:${sc.colore}">
      <div class="is-ico">${sc.icona}</div>
      <div><div class="sr-cod">${sc.cod}</div><h2>${esc(sc.nome)}</h2><div class="muted small">${esc(sc.sub)}</div></div>
    </div>
    ${calc}
    ${sezioni}
    <div class="card sez"><h3>Validazione</h3>
      ${campo({ k: '_note', l: 'Note del rilevatore', t: 'textarea' }, d, sc)}
      ${campo({ k: '_stato', l: 'Stato della scheda', t: 'sel', def: 'bozza', o: [
        { v: 'bozza', l: 'Bozza — rilievo in corso' },
        { v: 'completata', l: 'Completata — dati definitivi' },
        { v: 'validata', l: 'Validata — controllata dal responsabile' }] }, d, sc)}
      ${campo({ k: '_firma', l: 'Firma del rilevatore', t: 'sign' }, d, sc)}
      <div class="muted small">Rilevatore: ${esc(S.utente.nome)} (${esc(S.utente.u)}) — ultimo salvataggio: ${dati.modificato ? new Date(dati.modificato).toLocaleString('it-IT') : 'mai'}</div>
    </div>
    <div class="fondo"><button class="primario" data-a="salva-scheda">Salva e torna</button></div>
  </div>`;
}

function boxCalcolo(sc, dati) {
  let r; try { r = calcolaScheda(sc, dati); } catch (e) { return `<div class="card calc err">Errore di calcolo: ${esc(e.message)}</div>`; }
  return `<div class="card calc" style="border-color:${sc.colore}">
    <div class="calc-top"><span>Valore dell'indicatore</span>
      <b style="color:${sc.colore}">${esc(r.valore)} <small>${esc(r.unita || '')}</small></b></div>
    <table class="dett">${r.dettagli.map(x => `<tr><td>${esc(x.l)}</td><td>${esc(x.v)}</td></tr>`).join('')}</table>
  </div>`;
}

/* ---------- renderer dei campi ---------- */
function visibile(cond, d) {
  if (!cond) return true;
  const v = d[cond.k];
  if (Array.isArray(cond.v)) return cond.v.includes(v);
  if (cond.v === true) return !!v;
  if (cond.v === false) return true;
  return v === cond.v;
}
const opz = f => typeof f.o === 'function' ? f.o() : (f.o || []);

function campo(f, d, sc) {
  if (f.showIf && !visibile(f.showIf, d)) return '';
  const v = d[f.k] !== undefined ? d[f.k] : (f.def !== undefined ? f.def : '');
  const req = f.req ? '<i class="req">*</i>' : '';
  const help = f.help ? `<div class="help">${esc(f.help)}</div>` : '';
  const lab = t => `<label class="campo" data-k="${f.k}"><span class="lab">${esc(f.l)}${req}${f.u ? ` <em>(${esc(f.u)})</em>` : ''}</span>${t}${help}</label>`;
  switch (f.t) {
    case 'info': return `<div class="nota">${esc(f.l)}</div>`;
    case 'text': return lab(`<input data-f="${f.k}" value="${esc(v)}">`);
    case 'textarea': return lab(`<textarea data-f="${f.k}" rows="3">${esc(v)}</textarea>`);
    case 'num': return lab(`<input data-f="${f.k}" type="number" inputmode="decimal" step="${f.dec === 0 ? 1 : Math.pow(10, -(f.dec ?? 2))}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} value="${esc(v)}">`);
    case 'date': return lab(`<input data-f="${f.k}" type="date" value="${esc(v || (f.k === 'data' ? oggi() : ''))}">`);
    case 'time': return lab(`<input data-f="${f.k}" type="time" value="${esc(v)}">`);
    case 'check': return `<label class="campo check"><input data-f="${f.k}" type="checkbox" ${v ? 'checked' : ''}><span>${esc(f.l)}</span>${help}</label>`;
    case 'sel': return lab(`<select data-f="${f.k}"><option value="">— seleziona —</option>${opz(f).map(o => `<option value="${esc(o.v)}" ${String(v) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`);
    case 'multi': {
      const sel = Array.isArray(v) ? v : [];
      return lab(`<div class="chips">${opz(f).map(o => `<button type="button" class="chip ${sel.includes(o.v) ? 'on' : ''}" data-multi="${f.k}" data-v="${esc(o.v)}">${esc(o.l)}</button>`).join('')}</div>`);
    }
    case 'calc': return `<div class="campo calcolo"><span class="lab">${esc(f.l)}${f.u ? ` <em>(${esc(f.u)})</em>` : ''}</span><output data-calc="${f.k}">${esc(f.fn(d))}</output></div>`;
    case 'gps': {
      const g = v || {};
      return `<div class="campo gps"><span class="lab">${esc(f.l)}${req}</span>
        <div class="gps-box">
          <div class="gps-val">${g.lat ? `${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}<br><small>quota ${g.alt != null ? Math.round(g.alt) + ' m' : 'n.d.'} · precisione ±${Math.round(g.acc || 0)} m · ${new Date(g.ts).toLocaleTimeString('it-IT')}</small>` : '<i>coordinate non rilevate</i>'}</div>
          <button type="button" data-gps="${f.k}">📡 Rileva</button>
        </div>${help}</div>`;
    }
    case 'photo': {
      const ids = Array.isArray(v) ? v : (v ? [v] : []);
      return `<div class="campo"><span class="lab">${esc(f.l)}</span>
        <div class="foto-griglia" data-foto-box="${f.k}">${ids.map(id => `<div class="foto"><img data-foto-id="${id}" alt=""><button type="button" class="x" data-delfoto="${f.k}|${id}">✕</button></div>`).join('')}
        <label class="foto-add">＋<input type="file" accept="image/*" capture="environment" data-photo="${f.k}" hidden></label></div>${help}</div>`;
    }
    case 'sign': {
      return `<div class="campo"><span class="lab">${esc(f.l)}</span>
        ${v ? `<div class="firma-box"><img src="${v}" alt="firma"><button type="button" data-delfirma="${f.k}">Cancella</button></div>`
            : `<div class="firma-box"><canvas data-sign="${f.k}" width="600" height="200"></canvas>
               <div class="firma-az"><button type="button" data-clearsign="${f.k}">Pulisci</button><button type="button" data-savesign="${f.k}">Conferma firma</button></div></div>`}</div>`;
    }
    case 'import': return `<button type="button" class="importa" data-import="${f.from}|${f.fromKey}|${f.toKey}">⇩ ${esc(f.l)}</button>`;
    case 'table': return tabella(f, d, sc);
    default: return '';
  }
}

function tabella(f, d, sc) {
  const rows = Array.isArray(d[f.k]) ? d[f.k] : [];
  const totali = f.calcCols ? f.calcCols.map(cc => {
    const t = rows.reduce((a, r) => a + N((f.calc ? f.calc(r, d) : r)[cc.k]), 0);
    return `${cc.l}: <b>${R(t, 3)} ${cc.u || ''}</b>`;
  }).join(' · ') : '';
  return `<div class="campo tabella" data-tab="${f.k}">
    <span class="lab">${esc(f.l)} <em>(${rows.length} righe)</em></span>
    <div class="righe">${rows.map((r, i) => rigaTabella(f, r, i, d)).join('')}</div>
    <button type="button" class="agg" data-addrow="${f.k}">＋ Aggiungi elemento</button>
    ${totali ? `<div class="tot">${totali}</div>` : ''}
  </div>`;
}

function sintesiRiga(f, r) {
  return f.cols.slice(0, 3).map(c => {
    let v = r[c.k];
    if (c.t === 'sel') { const o = (typeof c.o === 'function' ? c.o() : c.o).find(x => String(x.v) === String(v)); v = o ? o.l.split(' —')[0] : v; }
    return v ? `<span>${esc(v)}${c.u ? ' ' + c.u : ''}</span>` : '';
  }).join('') || '<i>vuoto</i>';
}
function calcRiga(f, r, d) {
  if (!f.calcCols) return '';
  const calc = f.calc ? f.calc(r, d) : {};
  return f.calcCols.map(cc => R(calc[cc.k], 3) + ' ' + (cc.u || '')).join(' ');
}
function rigaTabella(f, r, i, d) {
  return `<div class="riga" data-i="${i}">
    <div class="riga-h" data-togglerow="${f.k}|${i}">
      <b>#${i + 1}</b><div class="riga-sint">${sintesiRiga(f, r)}</div>
      ${f.calcCols ? `<div class="riga-calc">${calcRiga(f, r, d)}</div>` : ''}
      <button type="button" class="x" data-delrow="${f.k}|${i}">✕</button>
    </div>
    <div class="riga-b ${S.rigaAperta === f.k + '|' + i ? 'aperta' : ''}">
      ${f.cols.map(c => `<label class="cella ${c.w ? 'w' + c.w : ''}"><span>${esc(c.l)}${c.u ? ` (${c.u})` : ''}</span>
        ${c.t === 'sel'
          ? `<select data-row="${f.k}|${i}|${c.k}"><option value="">—</option>${(typeof c.o === 'function' ? c.o() : c.o).map(o => `<option value="${esc(o.v)}" ${String(r[c.k]) === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`
          : c.t === 'num'
            ? `<input type="number" inputmode="decimal" step="${c.dec === 0 ? 1 : Math.pow(10, -(c.dec ?? 2))}" data-row="${f.k}|${i}|${c.k}" value="${esc(r[c.k] ?? '')}">`
            : `<input data-row="${f.k}|${i}|${c.k}" value="${esc(r[c.k] ?? '')}">`}
      </label>`).join('')}
    </div>
  </div>`;
}

/* ============================== 6. CALCOLI ============================== */
function calcolaScheda(sc, dati) {
  window.COEFF = S.coeff;
  window.getSchedaData = id => (S.schede[id] && S.schede[id].data) || {};
  window.getCarbonioNecromassa = () => {
    let c = 0;
    ['f1_legno_morto_piedi', 'f2_legno_morto_terra'].forEach(id => {
      const s = S.schede[id]; if (!s) return;
      const r = SCHEDE_MAP[id].calcolo(s.data || {}, (S.plot && S.plot.data) || {});
      const riga = r.dettagli.find(x => x.l.startsWith('Carbonio'));
      if (riga) c += N(String(riga.v).split(' ')[0]);
    });
    return c;
  };
  return sc.calcolo(dati.data || {}, (S.plot && S.plot.data) || {});
}

/* ============================== 7. AZIONI =============================== */
function bind() {
  const app = document.getElementById('app');

  app.querySelectorAll('[data-a]').forEach(el => el.onclick = ev => {
    ev.stopPropagation(); azione(el.dataset.a, el.dataset.id, el);
  });
  const cerca = document.getElementById('cerca');
  if (cerca) cerca.oninput = e => { S.filtro = e.target.value; const y = window.scrollY; render(); window.scrollTo(0, y); };

  app.querySelectorAll('[data-f]').forEach(el => {
    const k = el.dataset.f;
    const h = () => { setVal(k, el.type === 'checkbox' ? el.checked : el.value); };
    el.onchange = h;
    if (el.tagName === 'INPUT' && el.type !== 'checkbox' || el.tagName === 'TEXTAREA')
      el.oninput = () => { setVal(k, el.value, true); aggiornaCalcBox(); };
  });
  app.querySelectorAll('[data-multi]').forEach(el => el.onclick = () => {
    const k = el.dataset.multi, v = el.dataset.v;
    const d = datiCorrenti(); const arr = Array.isArray(d[k]) ? [...d[k]] : [];
    const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v);
    setVal(k, arr); ridisegna();
  });
  app.querySelectorAll('[data-gps]').forEach(el => el.onclick = () => rilevaGps(el.dataset.gps, el));
  app.querySelectorAll('[data-photo]').forEach(el => el.onchange = e => aggiungiFoto(el.dataset.photo, e.target.files[0]));
  app.querySelectorAll('[data-delfoto]').forEach(el => el.onclick = () => {
    const [k, id] = el.dataset.delfoto.split('|');
    const d = datiCorrenti(); setVal(k, (d[k] || []).filter(x => x !== id)); DB.del('foto', id); ridisegna();
  });
  app.querySelectorAll('[data-foto-id]').forEach(async img => {
    const f = await DB.get('foto', img.dataset.fotoId); if (f) img.src = f.dati;
  });
  app.querySelectorAll('[data-addrow]').forEach(el => el.onclick = () => {
    const k = el.dataset.addrow, d = datiCorrenti();
    const f = trovaCampo(k); const nuova = {};
    f.cols.forEach(c => { if (c.def !== undefined) nuova[c.k] = c.def; });
    const arr = [...(d[k] || []), nuova];
    S.rigaAperta = k + '|' + (arr.length - 1);
    setVal(k, arr); ridisegna();
  });
  app.querySelectorAll('[data-delrow]').forEach(el => el.onclick = ev => {
    ev.stopPropagation();
    const [k, i] = el.dataset.delrow.split('|'); const d = datiCorrenti();
    const arr = [...(d[k] || [])]; arr.splice(+i, 1); setVal(k, arr); ridisegna();
  });
  app.querySelectorAll('[data-togglerow]').forEach(el => el.onclick = () => {
    S.rigaAperta = S.rigaAperta === el.dataset.togglerow ? null : el.dataset.togglerow; ridisegna();
  });
  app.querySelectorAll('[data-row]').forEach(el => {
    const [k, i, c] = el.dataset.row.split('|');
    const scrivi = () => {
      const d = datiCorrenti(); const arr = [...(d[k] || [])];
      arr[+i] = { ...arr[+i], [c]: el.value }; setVal(k, arr, true);
      aggiornaRiga(k, +i); aggiornaCalcBox();
    };
    el.oninput = scrivi;
    el.onchange = scrivi;
  });
  app.querySelectorAll('[data-import]').forEach(el => el.onclick = () => {
    const [from, fk, tk] = el.dataset.import.split('|');
    const src = (S.schede[from] && S.schede[from].data && S.schede[from].data[fk]) || [];
    if (!src.length) return avviso('La scheda NRL-F5 non contiene ancora piante cavallettate.');
    setVal(tk, JSON.parse(JSON.stringify(src)));
    avviso(src.length + ' piante importate dalla scheda del cavallettamento.'); ridisegna();
  });
  app.querySelectorAll('[data-sign]').forEach(cv => firmaInit(cv));
  app.querySelectorAll('[data-savesign]').forEach(el => el.onclick = () => {
    const cv = app.querySelector(`[data-sign="${el.dataset.savesign}"]`);
    if (!cv || !cv.dataset.tratti) return avviso('Traccia la firma nel riquadro prima di confermare.');
    setVal(el.dataset.savesign, cv.toDataURL('image/png')); ridisegna();
  });
  app.querySelectorAll('[data-clearsign]').forEach(el => el.onclick = () => {
    const cv = app.querySelector(`[data-sign="${el.dataset.clearsign}"]`);
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); delete cv.dataset.tratti;
  });
  app.querySelectorAll('[data-delfirma]').forEach(el => el.onclick = () => { setVal(el.dataset.delfirma, ''); ridisegna(); });
}

function trovaCampo(k) {
  const sc = SCHEDE_MAP[S.param];
  for (const sez of sc.sezioni) for (const f of sez.f) if (f.k === k) return f;
  return null;
}
function datiCorrenti() {
  const id = S.param;
  if (!S.schede[id]) S.schede[id] = { id: uid('s'), plotId: S.plot.id, schedaId: id, data: applicaDefault(id, {}), stato: 'bozza' };
  return S.schede[id].data;
}

/* precompila i valori predefiniti delle schede (metodo, soglie, raggio, data) */
function applicaDefault(schedaId, data) {
  const sc = SCHEDE_MAP[schedaId]; if (!sc) return data;
  sc.sezioni.forEach(sez => sez.f.forEach(f => {
    if (data[f.k] === undefined || data[f.k] === '') {
      if (f.def !== undefined) data[f.k] = f.def;
      else if (f.t === 'date' && f.k === 'data') data[f.k] = oggi();
    }
  }));
  return data;
}
let tSalva;
function setVal(k, v, differito) {
  const d = datiCorrenti(); d[k] = v;
  S.schede[S.param].modificato = adesso();
  clearTimeout(tSalva);
  tSalva = setTimeout(() => salvaSchedaCorrente(), differito ? 700 : 100);
  aggiornaCampiCalcolati();
  if (!differito && ['ads_forma', 'metodo', 'assenza'].includes(k)) ridisegna();
}

/* ricalcola i campi di tipo "calc" (superficie dell'AdS, lunghezza dei transetti…) */
function aggiornaCampiCalcolati() {
  const sc = SCHEDE_MAP[S.param]; if (!sc) return;
  const d = datiCorrenti();
  document.querySelectorAll('[data-calc]').forEach(out => {
    for (const sez of sc.sezioni) for (const f of sez.f)
      if (f.k === out.dataset.calc && f.fn) out.textContent = f.fn(d);
  });
}
/* Aggiorna in posto la sintesi di una riga di tabella e i totali, senza
   ridisegnare il form: durante la digitazione il campo non deve perdere il fuoco. */
function aggiornaRiga(k, i) {
  const f = trovaCampo(k); if (!f) return;
  const d = datiCorrenti(); const r = (d[k] || [])[i]; if (!r) return;
  const box = document.querySelector(`[data-tab="${k}"] .riga[data-i="${i}"]`);
  if (box) {
    const s = box.querySelector('.riga-sint'); if (s) s.innerHTML = sintesiRiga(f, r);
    const c = box.querySelector('.riga-calc'); if (c) c.textContent = calcRiga(f, r, d);
  }
  const tot = document.querySelector(`[data-tab="${k}"] .tot`);
  if (tot && f.calcCols) tot.innerHTML = f.calcCols.map(cc => {
    const t = (d[k] || []).reduce((a, x) => a + N((f.calc ? f.calc(x, d) : x)[cc.k]), 0);
    return `${cc.l}: <b>${R(t, 3)} ${cc.u || ''}</b>`;
  }).join(' · ');
}

/* aggiorna solo il riquadro del valore dell'indicatore, senza ridisegnare il form
   (così il campo in cui si sta scrivendo non perde il fuoco) */
let tCalc;
function aggiornaCalcBox() {
  clearTimeout(tCalc);
  tCalc = setTimeout(() => {
    const sc = SCHEDE_MAP[S.param]; if (!sc || !sc.calcolo) return;
    const box = document.querySelector('.wrap > .calc'); if (!box) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = boxCalcolo(sc, S.schede[S.param]);
    box.replaceWith(tmp.firstElementChild);
  }, 220);
}

function ridisegna() {
  const y = window.scrollY;
  const app = document.getElementById('app');
  app.innerHTML = intestazione() + vistaScheda();
  bind(); window.scrollTo(0, y); aggiornaStatoRete();
}

async function salvaSchedaCorrente() {
  const s = S.schede[S.param]; if (!s) return;
  s.stato = s.data._stato || 'bozza';
  s.utente = S.utente.u; s.modificato = adesso(); s.sync = false;
  await DB.put('schede', s);
  if (S.param === 'anagrafica') {
    S.plot.codice = s.data.codice || S.plot.codice;
    S.plot.data = s.data;
  }
  S.plot.modificato = adesso(); S.plot.sync = false;
  S.plot.schedeCompilate = Object.values(S.schede).filter(x => x.schedaId !== 'anagrafica' && x.stato && x.stato !== 'vuota').length;
  S.plot.stato = Object.values(S.schede).filter(x => x.stato === 'completata' || x.stato === 'validata').length >= 8 ? 'completata' : 'in corso';
  await DB.put('plots', S.plot);
}

async function azione(a, id, el) {
  switch (a) {
    case 'crea-admin': return creaAdmin();
    case 'login': return login();
    case 'logout': S.utente = null; sessionStorage.removeItem('nrl_utente'); return render();
    case 'home': S.plot = null; return vai('home');
    case 'impostazioni': return vai('impostazioni');
    case 'riepilogo': return vai('riepilogo');
    case 'sync': return sincronizza(false);
    case 'nuovo-plot': return nuovoPlot();
    case 'apri-plot': return apriPlot(id);
    case 'apri-scheda': return apriScheda(id);
    case 'salva-scheda': await salvaSchedaCorrente(); await caricaPlots(); return vai('plot');
    case 'elimina-plot': return eliminaPlot();
    case 'riepilogo-plot': return mostraRiepilogoPlot();
    case 'esporta-plot': return esporta('json', S.plot.id);
    case 'exp-json': return esporta('json');
    case 'exp-csv': return esporta('csv');
    case 'exp-geojson': return esporta('geojson');
    case 'exp-dett': return esporta('dettaglio');
    case 'salva-config': return salvaConfig();
    case 'nuovo-utente': return nuovoUtente();
    case 'del-utente': return delUtente(id);
    case 'salva-coeff': return salvaCoeff();
    case 'test-sync': return testSync();
    case 'importa-backup': return document.getElementById('file-backup').click();
    case 'reset-app': return resetApp();
  }
}

/* ---------- autenticazione ---------- */
async function creaAdmin() {
  const nome = val('i-nome'), u = val('i-user').trim().toLowerCase(), p = val('i-pwd'), p2 = val('i-pwd2');
  if (!nome || !u) return err('Inserisci nome e nome utente.');
  if (p.length < 6) return err('La password deve avere almeno 6 caratteri.');
  if (p !== p2) return err('Le due password non coincidono.');
  const salt = uid('s'); const hash = await sha256(salt + p);
  S.utenti = [{ u, nome, salt, hash, ruolo: 'admin', creato: adesso() }];
  await DB.put('kv', S.utenti, 'utenti');
  S.utente = S.utenti[0]; sessionStorage.setItem('nrl_utente', u);
  vai('home');
}
async function login() {
  const u = val('i-user').trim().toLowerCase(), p = val('i-pwd');
  const ut = S.utenti.find(x => x.u === u);
  if (!ut) return err('Utente non riconosciuto.');
  if (await sha256(ut.salt + p) !== ut.hash) return err('Password errata.');
  S.utente = ut; sessionStorage.setItem('nrl_utente', u); vai('home');
}
const val = id => (document.getElementById(id) || {}).value || '';
const err = m => { const e = document.getElementById('err'); if (e) e.textContent = m; };
function avviso(m) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = m;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}

/* ---------- aree di saggio ---------- */
async function nuovoPlot() {
  const p = {
    id: uid('p'), codice: 'AdS-' + String(S.plots.length + 1).padStart(3, '0'),
    data: { codice: 'AdS-' + String(S.plots.length + 1).padStart(3, '0'), data: oggi(), ads_forma: 'Circolare', ads_raggio: S.coeff.raggioDefault, regione: 'Basilicata', progetto: S.config.progetto || '' },
    utente: S.utente.u, creato: adesso(), modificato: adesso(), sync: false, stato: 'in corso', schedeCompilate: 0
  };
  await DB.put('plots', p);
  await caricaPlots();
  S.plot = p; S.schede = {};
  const s = { id: uid('s'), plotId: p.id, schedaId: 'anagrafica', data: { ...p.data }, stato: 'bozza', utente: S.utente.u, modificato: adesso(), sync: false };
  S.schede['anagrafica'] = s; await DB.put('schede', s);
  vai('scheda', 'anagrafica');
}
async function apriPlot(id) {
  S.plot = S.plots.find(p => p.id === id);
  const arr = await DB.byIndex('schede', 'plotId', id);
  S.schede = {}; arr.forEach(s => S.schede[s.schedaId] = s);
  vai('plot');
}
function apriScheda(id) {
  S.rigaAperta = null;
  if (S.schede[id]) applicaDefault(id, S.schede[id].data = S.schede[id].data || {});
  vai('scheda', id);
}
async function eliminaPlot() {
  if (!confirm('Eliminare definitivamente l\'area di saggio ' + S.plot.codice + ' e tutte le sue schede? I dati già sincronizzati restano sul foglio Google.')) return;
  const arr = await DB.byIndex('schede', 'plotId', S.plot.id);
  for (const s of arr) await DB.del('schede', s.id);
  const fs = await DB.byIndex('foto', 'plotId', S.plot.id);
  for (const f of fs) await DB.del('foto', f.id);
  await DB.del('plots', S.plot.id);
  S.plot = null; await caricaPlots(); vai('home');
}

/* ---------- GPS, foto, firma ---------- */
function rilevaGps(k, btn) {
  if (!navigator.geolocation) return avviso('Geolocalizzazione non disponibile su questo dispositivo.');
  btn.textContent = '⏳ rilevo…'; btn.disabled = true;
  navigator.geolocation.getCurrentPosition(pos => {
    setVal(k, { lat: pos.coords.latitude, lon: pos.coords.longitude, alt: pos.coords.altitude, acc: pos.coords.accuracy, ts: Date.now() });
    const d = datiCorrenti();
    if (pos.coords.altitude != null && !d.quota) d.quota = Math.round(pos.coords.altitude);
    ridisegna();
  }, e => { btn.textContent = '📡 Rileva'; btn.disabled = false; avviso('GPS non disponibile: ' + e.message); },
    { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}

async function aggiungiFoto(k, file) {
  if (!file) return;
  const dataUrl = await ridimensiona(file, 1280, 0.72);
  const id = uid('f');
  await DB.put('foto', { id, plotId: S.plot.id, schedaId: S.param, campo: k, dati: dataUrl, ts: adesso(), sync: false });
  const d = datiCorrenti(); setVal(k, [...(d[k] || []), id]); ridisegna();
}
function ridimensiona(file, max, q) {
  return new Promise(res => {
    const img = new Image(), fr = new FileReader();
    fr.onload = () => { img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = img.width * sc; cv.height = img.height * sc;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', q));
    }; img.src = fr.result; };
    fr.readAsDataURL(file);
  });
}

function firmaInit(cv) {
  const c = cv.getContext('2d'); c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#0f172a';
  let giu = false;
  const pos = e => {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [(t.clientX - r.left) * cv.width / r.width, (t.clientY - r.top) * cv.height / r.height];
  };
  const start = e => { e.preventDefault(); giu = true; c.beginPath(); c.moveTo(...pos(e)); cv.dataset.tratti = '1'; };
  const move = e => { if (!giu) return; e.preventDefault(); c.lineTo(...pos(e)); c.stroke(); };
  const end = () => giu = false;
  cv.onmousedown = start; cv.onmousemove = move; window.addEventListener('mouseup', end);
  cv.ontouchstart = start; cv.ontouchmove = move; cv.ontouchend = end;
}

/* ============================== 8. RIEPILOGHI =========================== */
function mostraRiepilogoPlot() {
  const righe = SCHEDE_INDICATORI.map(sc => {
    const dati = S.schede[sc.id];
    if (!dati) return `<tr><td>${sc.cod}</td><td>${esc(sc.nome)}</td><td class="muted">non rilevato</td></tr>`;
    let r; try { r = calcolaScheda(sc, dati); } catch (e) { r = { valore: 'errore', unita: '' }; }
    return `<tr><td>${sc.cod}</td><td>${esc(sc.nome)}</td><td><b>${esc(r.valore)}</b> ${esc(r.unita || '')}</td></tr>`;
  }).join('');
  modale(`Riepilogo indicatori — ${esc(S.plot.codice)}`,
    `<table class="riep"><thead><tr><th>Cod.</th><th>Indicatore</th><th>Valore</th></tr></thead><tbody>${righe}</tbody></table>
     <p class="muted small">Valori riferiti alla sola area di saggio. L'indicatore a scala di popolamento o di sito si ottiene come media (o quota percentuale, per gli indicatori categoriali) delle aree di saggio del campione.</p>`);
}

function vistaRiepilogoProgetto() {
  return `<div class="wrap"><button class="link" data-a="home">← Aree di saggio</button>
    <div class="card"><h2>Riepilogo del progetto</h2>
      <p class="muted">Il riepilogo è calcolato su tutte le aree di saggio presenti sul dispositivo. Per l'elaborazione completa esporta i dati.</p>
      <div id="riep-box">Calcolo in corso…</div>
      <div class="azioni">
        <button data-a="exp-csv">Esporta CSV indicatori</button>
        <button data-a="exp-dett">Esporta CSV dettaglio</button>
        <button data-a="exp-geojson">Esporta GeoJSON</button>
        <button data-a="exp-json">Backup JSON completo</button>
      </div>
    </div></div>`;
}

async function calcolaRiepilogoProgetto() {
  const box = document.getElementById('riep-box'); if (!box) return;
  const tutte = await DB.all('schede');
  const perPlot = {};
  tutte.forEach(s => { (perPlot[s.plotId] = perPlot[s.plotId] || {})[s.schedaId] = s; });
  const acc = {}; let n = 0;
  const plotSalvato = S.plot, schedeSalvate = S.schede;
  for (const p of S.plots) {
    S.plot = p; S.schede = perPlot[p.id] || {};
    n++;
    SCHEDE_INDICATORI.forEach(sc => {
      const d = S.schede[sc.id]; if (!d) return;
      let r; try { r = calcolaScheda(sc, d); } catch (e) { return; }
      acc[sc.id] = acc[sc.id] || { n: 0, somma: 0, valori: [], testo: {} };
      const v = parseFloat(r.valore);
      if (isFinite(v)) { acc[sc.id].n++; acc[sc.id].somma += v; acc[sc.id].valori.push(v); }
      else { acc[sc.id].testo[r.valore] = (acc[sc.id].testo[r.valore] || 0) + 1; acc[sc.id].n++; }
    });
  }
  S.plot = plotSalvato; S.schede = schedeSalvate;
  box.innerHTML = `<table class="riep"><thead><tr><th>Cod.</th><th>Indicatore</th><th>AdS</th><th>Media</th><th>Min-Max</th></tr></thead><tbody>` +
    SCHEDE_INDICATORI.map(sc => {
      const a = acc[sc.id];
      if (!a) return `<tr><td>${sc.cod}</td><td>${esc(sc.nome)}</td><td colspan="3" class="muted">nessun dato</td></tr>`;
      if (a.valori.length) {
        const media = a.somma / a.valori.length;
        return `<tr><td>${sc.cod}</td><td>${esc(sc.nome)}</td><td>${a.n}</td><td><b>${R(media, 2)}</b> ${esc(sc.unita || '')}</td><td>${R(Math.min(...a.valori), 2)} – ${R(Math.max(...a.valori), 2)}</td></tr>`;
      }
      const t = Object.entries(a.testo).map(([k, v]) => `${k}: ${v} (${R(v / a.n * 100, 0)}%)`).join('<br>');
      return `<tr><td>${sc.cod}</td><td>${esc(sc.nome)}</td><td>${a.n}</td><td colspan="2">${t}</td></tr>`;
    }).join('') + `</tbody></table><p class="muted small">Aree di saggio considerate: ${n}</p>`;
}

function modale(titolo, html) {
  const d = document.createElement('div'); d.className = 'modale';
  d.innerHTML = `<div class="modale-box"><div class="modale-h"><h3>${titolo}</h3><button class="x">✕</button></div><div class="modale-c">${html}</div></div>`;
  d.onclick = e => { if (e.target === d || e.target.className === 'x') d.remove(); };
  document.body.appendChild(d);
}

/* ============================== 9. IMPOSTAZIONI ========================= */
function vistaImpostazioni() {
  return `<div class="wrap"><button class="link" data-a="home">← Aree di saggio</button>
  <div class="card"><h2>Sincronizzazione</h2>
    <label>URL dell'applicazione web Google Apps Script
      <input id="c-url" value="${esc(S.config.syncUrl || '')}" placeholder="https://script.google.com/macros/s/…/exec"></label>
    <label>Nome del progetto / campagna<input id="c-prog" value="${esc(S.config.progetto || '')}"></label>
    <label class="campo check"><input id="c-auto" type="checkbox" ${S.config.autoSync ? 'checked' : ''}><span>Sincronizza automaticamente quando torna la connessione</span></label>
    <label class="campo check"><input id="c-foto" type="checkbox" ${S.config.syncFoto ? 'checked' : ''}><span>Includi le fotografie nella sincronizzazione (più lenta, consuma dati)</span></label>
    <div class="azioni"><button class="primario" data-a="salva-config">Salva</button><button data-a="test-sync">Prova la connessione</button><button data-a="sync">Sincronizza ora</button></div>
    <div id="sync-log" class="log"></div>
  </div>
  <div class="card"><h2>Utenti</h2>
    <p class="muted small">Le utenze sono locali al dispositivo e servono a identificare il rilevatore anche senza connessione. Non sostituiscono un controllo di accesso lato server.</p>
    <table class="riep"><tbody>${S.utenti.map(u => `<tr><td><b>${esc(u.nome)}</b><br><span class="muted">${esc(u.u)} · ${esc(u.ruolo)}</span></td>
      <td style="text-align:right">${u.u !== S.utente.u ? `<button class="pericolo" data-a="del-utente" data-id="${esc(u.u)}">Elimina</button>` : '<span class="muted">in uso</span>'}</td></tr>`).join('')}</tbody></table>
    <h3>Nuovo utente</h3>
    <label>Nome e cognome<input id="u-nome"></label>
    <label>Nome utente<input id="u-user" autocapitalize="none"></label>
    <label>Password<input id="u-pwd" type="password"></label>
    <label>Ruolo<select id="u-ruolo"><option value="rilevatore">Rilevatore</option><option value="admin">Amministratore</option></select></label>
    <button data-a="nuovo-utente">Aggiungi utente</button>
  </div>
  <div class="card"><h2>Coefficienti di calcolo</h2>
    <p class="muted small">Valori usati dalle formule delle schede. Modificarli solo con riferimenti documentati.</p>
    ${[['fattoreForma', 'Fattore di forma — albero intero', ''], ['fattoreFormaMoncone', 'Fattore di forma — troncone/moncone', ''],
       ['frazioneCarbonio', 'Frazione di carbonio nella sostanza secca', 't C / t s.s.'], ['sogliaAutoctone', 'Soglia di dominanza delle specie autoctone', '% di G'],
       ['sogliaDiamLegnoMorto', 'Soglia di diametro del legno morto', 'cm'], ['sogliaDiamVivi', 'Soglia di cavallettamento', 'cm'],
       ['nClassiDisetaneo', 'N. minimo di classi diametriche per struttura disetanea', ''], ['raggioDefault', 'Raggio predefinito dell\'area di saggio', 'm']]
      .map(([k, l, u]) => `<label>${l}${u ? ` <em>(${u})</em>` : ''}<input id="k-${k}" type="number" step="0.01" value="${S.coeff[k]}"></label>`).join('')}
    <button data-a="salva-coeff">Salva coefficienti</button>
  </div>
  <div class="card"><h2>Dati e backup</h2>
    <div class="azioni">
      <button data-a="exp-json">Esporta backup completo (JSON)</button>
      <button data-a="importa-backup">Importa backup</button>
      <button class="pericolo" data-a="reset-app">Cancella tutti i dati locali</button>
    </div>
    <input type="file" id="file-backup" accept=".json" hidden>
    <p class="muted small">Versione app 1.0 · schede conformi all'Allegato VI del Reg. (UE) 2024/1991</p>
  </div></div>`;
}

async function salvaConfig() {
  S.config.syncUrl = val('c-url').trim();
  S.config.progetto = val('c-prog').trim();
  S.config.autoSync = document.getElementById('c-auto').checked;
  S.config.syncFoto = document.getElementById('c-foto').checked;
  await DB.put('kv', S.config, 'config'); avviso('Impostazioni salvate.');
}
async function nuovoUtente() {
  const nome = val('u-nome'), u = val('u-user').trim().toLowerCase(), p = val('u-pwd');
  if (!nome || !u || p.length < 6) return avviso('Compila i campi: la password deve avere almeno 6 caratteri.');
  if (S.utenti.find(x => x.u === u)) return avviso('Nome utente già presente.');
  const salt = uid('s');
  S.utenti.push({ u, nome, salt, hash: await sha256(salt + p), ruolo: val('u-ruolo'), creato: adesso() });
  await DB.put('kv', S.utenti, 'utenti'); avviso('Utente aggiunto.'); render();
}
async function delUtente(u) {
  if (!confirm('Eliminare l\'utente ' + u + '?')) return;
  S.utenti = S.utenti.filter(x => x.u !== u);
  await DB.put('kv', S.utenti, 'utenti'); render();
}
async function salvaCoeff() {
  Object.keys(S.coeff).forEach(k => { const e = document.getElementById('k-' + k); if (e) S.coeff[k] = parseFloat(e.value); });
  window.COEFF = S.coeff; await DB.put('kv', S.coeff, 'coeff'); avviso('Coefficienti salvati.');
}
async function resetApp() {
  if (!confirm('Cancellare TUTTI i dati locali (aree di saggio, schede, foto, utenti)? Operazione irreversibile.')) return;
  if (!confirm('Confermi definitivamente?')) return;
  for (const s of ['plots', 'schede', 'foto', 'kv']) await DB.clear(s);
  sessionStorage.clear(); location.reload();
}

/* ============================== 10. SINCRONIZZAZIONE ==================== */
async function testSync() {
  const url = val('c-url').trim() || S.config.syncUrl;
  if (!url) return avviso('Inserisci prima l\'URL dell\'applicazione web.');
  log('Prova di connessione…');
  try {
    const r = await fetch(url + '?ping=1', { method: 'GET' });
    const t = await r.text();
    log('Risposta: ' + t.slice(0, 200));
  } catch (e) { log('Errore: ' + e.message); }
}
function log(m) {
  const el = document.getElementById('sync-log');
  if (el) el.innerHTML += `<div>${new Date().toLocaleTimeString('it-IT')} — ${esc(m)}</div>`;
  else avviso(m);
}

async function sincronizza(silenzioso) {
  if (!S.config.syncUrl) { if (!silenzioso) avviso('Configura prima l\'URL di sincronizzazione in Impostazioni.'); return; }
  if (!navigator.onLine) { if (!silenzioso) avviso('Nessuna connessione: i dati restano in coda sul dispositivo.'); return; }
  const plots = S.plots.filter(p => !p.sync);
  const tutte = await DB.all('schede');
  const schede = tutte.filter(s => !s.sync);
  if (!plots.length && !schede.length) { if (!silenzioso) avviso('Tutto già sincronizzato.'); return; }
  log(`Invio di ${plots.length} aree di saggio e ${schede.length} schede…`);
  let foto = [];
  if (S.config.syncFoto) {
    const tf = await DB.all('foto');
    foto = tf.filter(f => !f.sync);
  }
  const payload = {
    versione: 1, dispositivo: navigator.userAgent.slice(0, 80),
    utente: S.utente.u, nomeUtente: S.utente.nome, progetto: S.config.progetto,
    inviato: adesso(),
    plots: plots.map(p => ({ ...p })),
    schede: schede.map(s => ({ ...s, indicatore: calcolaPerSync(s) })),
    foto: foto.map(f => ({ id: f.id, plotId: f.plotId, schedaId: f.schedaId, campo: f.campo, dati: f.dati }))
  };
  try {
    const r = await fetch(S.config.syncUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const txt = await r.text();
    let res; try { res = JSON.parse(txt); } catch (e) { throw new Error('Risposta non valida dal server: ' + txt.slice(0, 120)); }
    if (!res.ok) throw new Error(res.errore || 'Errore lato server');
    for (const p of plots) { p.sync = true; p.sincronizzato = adesso(); await DB.put('plots', p); }
    for (const s of schede) { s.sync = true; await DB.put('schede', s); }
    for (const f of foto) { const ff = await DB.get('foto', f.id); if (ff) { ff.sync = true; await DB.put('foto', ff); } }
    await caricaPlots();
    log(`Sincronizzazione completata: ${res.righe || schede.length} righe registrate.`);
    avviso('Sincronizzazione completata.');
    if (S.vista !== 'scheda') render();
  } catch (e) {
    log('Errore di sincronizzazione: ' + e.message);
    if (!silenzioso) avviso('Sincronizzazione non riuscita: ' + e.message + ' — i dati restano salvati sul dispositivo.');
  }
}

function calcolaPerSync(s) {
  const sc = SCHEDE_MAP[s.schedaId]; if (!sc || !sc.calcolo) return null;
  const plot = S.plots.find(p => p.id === s.plotId);
  const pSalvato = S.plot, schSalvate = S.schede;
  S.plot = plot || S.plot;
  try { const r = sc.calcolo(s.data || {}, (plot && plot.data) || {}); return { valore: r.valore, unita: r.unita, dettagli: r.dettagli }; }
  catch (e) { return null; }
  finally { S.plot = pSalvato; S.schede = schSalvate; }
}

/* ============================== 11. ESPORTAZIONI ======================== */
function scarica(nome, contenuto, tipo) {
  const b = new Blob([contenuto], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';

async function esporta(formato, soloPlot) {
  const plots = soloPlot ? S.plots.filter(p => p.id === soloPlot) : S.plots;
  const tutte = await DB.all('schede');
  const perPlot = {}; tutte.forEach(s => { (perPlot[s.plotId] = perPlot[s.plotId] || {})[s.schedaId] = s; });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '');
  if (formato === 'json') {
    const foto = S.config.syncFoto ? await DB.all('foto') : [];
    scarica(`nrl_backup_${stamp}.json`, JSON.stringify({ versione: 1, esportato: adesso(), progetto: S.config.progetto, utenti: S.utenti.map(u => ({ u: u.u, nome: u.nome, ruolo: u.ruolo })), plots, schede: tutte, foto }, null, 1), 'application/json');
    return avviso('Backup esportato.');
  }
  if (formato === 'geojson') {
    const fc = { type: 'FeatureCollection', features: plots.filter(p => p.data.gps).map(p => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.data.gps.lon, p.data.gps.lat] },
      properties: { codice: p.codice, comune: p.data.comune, localita: p.data.localita, data: p.data.data,
        categoria: p.data.categoria, governo: p.data.governo, quota: p.data.quota, rilevatore: p.utente,
        ...Object.fromEntries(SCHEDE_INDICATORI.map(sc => {
          const s = (perPlot[p.id] || {})[sc.id]; if (!s) return [sc.cod, null];
          const pS = S.plot; S.plot = p; S.schede = perPlot[p.id] || {};
          let v = null; try { v = sc.calcolo(s.data || {}, p.data).valore; } catch (e) {}
          S.plot = pS; return [sc.cod, v];
        })) } })) };
    scarica(`nrl_punti_${stamp}.geojson`, JSON.stringify(fc, null, 1), 'application/geo+json');
    return avviso('GeoJSON esportato.');
  }
  if (formato === 'csv') {
    const intest = ['codice', 'data', 'comune', 'localita', 'lat', 'lon', 'quota', 'categoria', 'governo', 'superficie_m2', 'rilevatore',
      ...SCHEDE_INDICATORI.map(sc => sc.cod + ' — ' + sc.nome)];
    const righe = plots.map(p => {
      const g = p.data.gps || {};
      S.plot = p; S.schede = perPlot[p.id] || {};
      const vals = SCHEDE_INDICATORI.map(sc => {
        const s = S.schede[sc.id]; if (!s) return '';
        try { return sc.calcolo(s.data || {}, p.data).valore; } catch (e) { return 'errore'; }
      });
      return [p.codice, p.data.data, p.data.comune, p.data.localita, g.lat || '', g.lon || '', p.data.quota,
        p.data.categoria, p.data.governo, R(areaHa(p.data) * 10000, 1), p.utente, ...vals].map(csvCell).join(';');
    });
    scarica(`nrl_indicatori_${stamp}.csv`, '﻿' + [intest.map(csvCell).join(';'), ...righe].join('\n'), 'text/csv');
    return avviso('CSV degli indicatori esportato.');
  }
  if (formato === 'dettaglio') {
    const righe = [['area_saggio', 'scheda', 'tabella', 'n_riga', 'campo', 'valore'].map(csvCell).join(';')];
    plots.forEach(p => {
      Object.values(perPlot[p.id] || {}).forEach(s => {
        const sc = SCHEDE_MAP[s.schedaId]; if (!sc) return;
        Object.entries(s.data || {}).forEach(([k, v]) => {
          if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
            v.forEach((r, i) => Object.entries(r).forEach(([ck, cv]) =>
              righe.push([p.codice, sc.cod, k, i + 1, ck, cv].map(csvCell).join(';'))));
          } else if (typeof v !== 'object') {
            righe.push([p.codice, sc.cod, '', '', k, v].map(csvCell).join(';'));
          }
        });
      });
    });
    scarica(`nrl_dettaglio_${stamp}.csv`, '﻿' + righe.join('\n'), 'text/csv');
    return avviso('CSV di dettaglio esportato.');
  }
}

async function importaBackup(file) {
  try {
    const testo = await file.text(); const j = JSON.parse(testo);
    if (!j.plots) throw new Error('File non riconosciuto');
    for (const p of j.plots) await DB.put('plots', p);
    for (const s of j.schede || []) await DB.put('schede', s);
    for (const f of j.foto || []) await DB.put('foto', f);
    await caricaPlots(); render();
    avviso(`Importate ${j.plots.length} aree di saggio.`);
  } catch (e) { avviso('Importazione non riuscita: ' + e.message); }
}

/* ============================== 12. BOOTSTRAP =========================== */
document.addEventListener('DOMContentLoaded', () => {
  avvio();
  document.addEventListener('change', e => {
    if (e.target.id === 'file-backup' && e.target.files[0]) importaBackup(e.target.files[0]);
  });
  const osserva = new MutationObserver(() => { if (document.getElementById('riep-box') && document.getElementById('riep-box').textContent === 'Calcolo in corso…') calcolaRiepilogoProgetto(); });
  osserva.observe(document.getElementById('app'), { childList: true, subtree: true });
});
window.addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
