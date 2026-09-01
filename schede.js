/* ============================================================================
   NRL Rilievi — Definizione delle schede di rilievo
   Indicatori di biodiversità degli ecosistemi forestali
   Reg. (UE) 2024/1991 (Nature Restoration Law), art. 12 e Allegato VI
   ==========================================================================
   Tipi di campo supportati dal renderer:
   text | textarea | num | sel | multi | date | time | check | gps | photo |
   sign | calc | table | info | import
   ========================================================================== */

/* Specie ornitiche forestali usate per l'indice degli uccelli forestali comuni.
   fbi = specie inclusa nell'indice forestale (Common Forest Bird Index). */
const UCCELLI = [
  ['Picchio rosso maggiore (Dendrocopos major)', 1], ['Picchio rosso minore (Dryobates minor)', 1],
  ['Picchio dorsobianco (Dendrocopos leucotos)', 1], ['Picchio verde (Picus viridis)', 1],
  ['Picchio nero (Dryocopus martius)', 1], ['Torcicollo (Jynx torquilla)', 1],
  ['Picchio muratore (Sitta europaea)', 1], ['Rampichino comune (Certhia brachydactyla)', 1],
  ['Rampichino alpestre (Certhia familiaris)', 1], ['Cincia mora (Periparus ater)', 1],
  ['Cinciarella (Cyanistes caeruleus)', 1], ['Cinciallegra (Parus major)', 1],
  ['Cincia bigia (Poecile palustris)', 1], ['Cincia dal ciuffo (Lophophanes cristatus)', 1],
  ['Codibugnolo (Aegithalos caudatus)', 1], ['Luì piccolo (Phylloscopus collybita)', 1],
  ['Luì verde (Phylloscopus sibilatrix)', 1], ['Fiorrancino (Regulus ignicapilla)', 1],
  ['Regolo (Regulus regulus)', 1], ['Pettirosso (Erithacus rubecula)', 1],
  ['Scricciolo (Troglodytes troglodytes)', 1], ['Merlo (Turdus merula)', 1],
  ['Tordo bottaccio (Turdus philomelos)', 1], ['Tordela (Turdus viscivorus)', 1],
  ['Capinera (Sylvia atricapilla)', 1], ['Colombaccio (Columba palumbus)', 1],
  ['Colombella (Columba oenas)', 1], ['Ghiandaia (Garrulus glandarius)', 1],
  ['Fringuello (Fringilla coelebs)', 1], ['Ciuffolotto (Pyrrhula pyrrhula)', 1],
  ['Frosone (Coccothraustes coccothraustes)', 1], ['Balia dal collare (Ficedula albicollis)', 1],
  ['Balia nera (Ficedula hypoleuca)', 1], ['Pigliamosche (Muscicapa striata)', 1],
  ['Allocco (Strix aluco)', 1], ['Sparviere (Accipiter nisus)', 1],
  ['Astore (Accipiter gentilis)', 1], ['Cuculo (Cuculus canorus)', 1],
  ['Beccaccia (Scolopax rusticola)', 1], ['Tortora selvatica (Streptopelia turtur)', 1],
  ['Rigogolo (Oriolus oriolus)', 1], ['Usignolo (Luscinia megarhynchos)', 0],
  ['Verdone (Chloris chloris)', 0], ['Cardellino (Carduelis carduelis)', 0],
  ['Cornacchia grigia (Corvus cornix)', 0], ['Gazza (Pica pica)', 0],
  ['Poiana (Buteo buteo)', 0], ['Altra specie (specificare in note)', 0]
];
const UCCELLI_OPZIONI = UCCELLI.map(u => ({ v: u[0], l: u[0] }));
const UCCELLI_FBI = new Set(UCCELLI.filter(u => u[1]).map(u => u[0]));

/* ---------- utilità di calcolo ---------- */
const N = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const R = (v, d = 2) => Math.round(N(v) * Math.pow(10, d)) / Math.pow(10, d);
const areaHa = (d) => {           // superficie dell'area di saggio in ettari
  const forma = d.ads_forma || 'Circolare';
  if (forma === 'Quadrata' || forma === 'Rettangolare') {
    const l1 = N(d.ads_lato1), l2 = N(d.ads_lato2) || N(d.ads_lato1);
    return (l1 * l2) / 10000;
  }
  const r = N(d.ads_raggio) || 13;
  return (Math.PI * r * r) / 10000;
};
const volCilindro = (dcm, hm, f) => Math.PI / 4 * Math.pow(dcm / 100, 2) * hm * f;

/* ---------- colonne riutilizzabili ---------- */
const COL_SPECIE = { k: 'sp', l: 'Specie', t: 'sel', o: () => SPECIE_OPZIONI, w: 2 };
const COL_DECAD = { k: 'dec', l: 'Classe decad.', t: 'sel', o: () => CLASSI_DECADIMENTO, w: 2 };

/* ============================================================================
   ELENCO SCHEDE
   ========================================================================== */
const SCHEDE = [

/* ---------------------------------------------------------------- ANAGRAFICA */
{
  id: 'anagrafica',
  cod: 'AdS',
  nome: 'Anagrafica area di saggio',
  sub: 'Identificazione, localizzazione e caratteri stazionali del punto di rilievo',
  icona: '📍',
  colore: '#475569',
  sezioni: [
    { t: 'Identificazione', f: [
      { k: 'codice', l: 'Codice area di saggio', t: 'text', req: true, help: 'Es. AdS-001 — deve essere univoco nel progetto' },
      { k: 'progetto', l: 'Progetto / campagna di rilievo', t: 'text' },
      { k: 'data', l: 'Data del rilievo', t: 'date', req: true },
      { k: 'ora_inizio', l: 'Ora di inizio', t: 'time' },
      { k: 'squadra', l: 'Altri operatori presenti', t: 'text' },
      { k: 'tipo_rilievo', l: 'Tipo di rilievo', t: 'sel', o: [
        { v: 'Primo rilievo', l: 'Primo rilievo (baseline)' },
        { v: 'Monitoraggio', l: 'Monitoraggio (ripetizione su AdS esistente)' },
        { v: 'Controllo', l: 'Controllo di qualità' }] }
    ]},
    { t: 'Localizzazione', f: [
      { k: 'gps', l: 'Coordinate GPS', t: 'gps', req: true, help: 'Rilevare al centro dell\'area di saggio' },
      { k: 'regione', l: 'Regione', t: 'text', def: 'Basilicata' },
      { k: 'provincia', l: 'Provincia', t: 'text' },
      { k: 'comune', l: 'Comune', t: 'text', req: true },
      { k: 'localita', l: 'Località', t: 'text' },
      { k: 'foglio', l: 'Foglio catastale', t: 'text' },
      { k: 'particella', l: 'Particella/e catastale/i', t: 'text' },
      { k: 'part_forestale', l: 'Particella forestale (PGF/PFIT)', t: 'text' },
      { k: 'proprieta', l: 'Proprietà', t: 'sel', o: [
        { v: 'Pubblica — Comune', l: 'Pubblica — Comune' },
        { v: 'Pubblica — Regione/Stato', l: 'Pubblica — Regione/Stato' },
        { v: 'Uso civico', l: 'Uso civico / proprietà collettiva' },
        { v: 'Privata', l: 'Privata' } ] }
    ]},
    { t: 'Caratteri stazionali', f: [
      { k: 'quota', l: 'Quota', t: 'num', u: 'm s.l.m.', dec: 0 },
      { k: 'esposizione', l: 'Esposizione', t: 'sel', o: () => ESPOSIZIONI },
      { k: 'pendenza', l: 'Pendenza', t: 'num', u: '%', dec: 0, max: 200 },
      { k: 'giacitura', l: 'Giacitura', t: 'sel', o: ['Crinale', 'Versante alto', 'Versante medio', 'Versante basso', 'Impluvio', 'Pianeggiante'].map(x => ({ v: x, l: x })) },
      { k: 'substrato', l: 'Substrato / rocciosità affiorante', t: 'sel', o: ['Assente', 'Scarsa (<10%)', 'Media (10-30%)', 'Elevata (>30%)'].map(x => ({ v: x, l: x })) }
    ]},
    { t: 'Geometria dell\'area di saggio', f: [
      { k: 'ads_forma', l: 'Forma dell\'area di saggio', t: 'sel', def: 'Circolare', req: true,
        o: [{ v: 'Circolare', l: 'Circolare' }, { v: 'Quadrata', l: 'Quadrata' }, { v: 'Rettangolare', l: 'Rettangolare' }] },
      { k: 'ads_raggio', l: 'Raggio', t: 'num', u: 'm', dec: 1, def: 13, showIf: { k: 'ads_forma', v: 'Circolare' },
        help: 'r = 13 m → 531 m² (standard INFC). Correggere il raggio in pendenza (distanza orizzontale).' },
      { k: 'ads_lato1', l: 'Lato 1', t: 'num', u: 'm', dec: 1, showIf: { k: 'ads_forma', v: ['Quadrata', 'Rettangolare'] } },
      { k: 'ads_lato2', l: 'Lato 2', t: 'num', u: 'm', dec: 1, showIf: { k: 'ads_forma', v: 'Rettangolare' } },
      { k: 'ads_sup', l: 'Superficie dell\'area di saggio', t: 'calc', u: 'm²',
        fn: d => R(areaHa(d) * 10000, 1) },
      { k: 'ads_ha', l: 'Fattore di espansione', t: 'calc', u: 'ha',
        fn: d => R(areaHa(d), 4) }
    ]},
    { t: 'Inquadramento del soprassuolo', f: [
      { k: 'categoria', l: 'Categoria forestale', t: 'sel', o: () => CATEGORIE_FORESTALI, req: true },
      { k: 'governo', l: 'Forma di governo/trattamento', t: 'sel', o: () => FORME_GOVERNO, req: true },
      { k: 'stadio', l: 'Stadio di sviluppo', t: 'sel', o: ['Novelleto/spessina', 'Perticaia', 'Fustaia giovane', 'Fustaia adulta', 'Fustaia matura', 'Ceduo giovane (<10 anni)', 'Ceduo adulto', 'Ceduo invecchiato'].map(x => ({ v: x, l: x })) },
      { k: 'copertura', l: 'Grado di copertura delle chiome', t: 'num', u: '%', dec: 0, max: 100 },
      { k: 'eta_stimata', l: 'Età stimata del soprassuolo', t: 'num', u: 'anni', dec: 0 },
      { k: 'ultimo_intervento', l: 'Ultimo intervento selvicolturale', t: 'text', help: 'Tipo e anno, se noto' },
      { k: 'natura2000', l: 'Area in Rete Natura 2000', t: 'check' },
      { k: 'cod_sito', l: 'Codice sito Natura 2000', t: 'text', showIf: { k: 'natura2000', v: true } },
      { k: 'habitat', l: 'Habitat All. I Dir. 92/43/CEE', t: 'text', showIf: { k: 'natura2000', v: true }, help: 'Es. 9210* Faggeti degli Appennini con Taxus e Ilex' },
      { k: 'disturbi', l: 'Disturbi / pressioni osservate', t: 'multi', o: ['Incendio', 'Schianti da vento', 'Schianti da neve', 'Attacchi parassitari', 'Deperimento', 'Tagli recenti', 'Pascolo', 'Ungulati (brucatura)', 'Erosione/frane', 'Discariche/rifiuti', 'Nessuno'].map(x => ({ v: x, l: x })) }
    ]},
    { t: 'Documentazione fotografica', f: [
      { k: 'foto', l: 'Foto dell\'area di saggio', t: 'photo', multi: true, help: 'Consigliate 4 foto nelle direzioni N-E-S-O dal centro' }
    ]}
  ],
  calcolo: null
},

/* ------------------------------------------------------- IND. 1 — LEGNO MORTO IN PIEDI */
{
  id: 'f1_legno_morto_piedi',
  cod: 'NRL-F1',
  nome: 'Legno morto in piedi',
  sub: 'Allegato VI — necromassa legnosa in piedi (standing deadwood)',
  icona: '🪵',
  colore: '#92400e',
  unita: 'm³/ha',
  sezioni: [
    { t: 'Metodo', f: [
      { k: 'info', t: 'info', l: 'Si rilevano tutti gli elementi legnosi morti in piedi (alberi interi, tronconi, monconi e ceppaie) con diametro ≥ soglia, radicati entro l\'area di saggio. Elementi con inclinazione > 45° rispetto alla verticale vanno rilevati come legno morto a terra (scheda NRL-F2).' },
      { k: 'soglia_d', l: 'Soglia minima di diametro', t: 'num', u: 'cm', dec: 1, def: 10, req: true },
      { k: 'soglia_h', l: 'Soglia minima di altezza', t: 'num', u: 'm', dec: 1, def: 1.3 },
      { k: 'assenza', l: 'Nessun elemento di legno morto in piedi presente', t: 'check', help: 'Spuntare se l\'area di saggio ne è priva: il valore dell\'indicatore sarà 0' }
    ]},
    { t: 'Elementi rilevati', f: [
      { k: 'elementi', l: 'Elenco degli elementi', t: 'table', showIf: { k: 'assenza', v: false },
        cols: [
          COL_SPECIE,
          { k: 'tipo', l: 'Tipologia', t: 'sel', w: 2, o: [
            { v: 'albero', l: 'Albero morto in piedi (con chioma)' },
            { v: 'troncone', l: 'Troncone / moncone (senza chioma)' },
            { v: 'ceppaia', l: 'Ceppaia alta (h < 1,3 m)' } ] },
          { k: 'd', l: 'Diametro a 1,30 m', t: 'num', u: 'cm', dec: 1 },
          { k: 'db', l: 'Diametro alla base', t: 'num', u: 'cm', dec: 1, help: 'Obbligatorio per le ceppaie' },
          { k: 'h', l: 'Altezza', t: 'num', u: 'm', dec: 1 },
          COL_DECAD,
          { k: 'cavita', l: 'Cavità / nidi', t: 'sel', o: [{ v: '', l: '—' }, { v: 'si', l: 'Sì' }, { v: 'no', l: 'No' }] },
          { k: 'funghi', l: 'Carpofori presenti', t: 'sel', o: [{ v: '', l: '—' }, { v: 'si', l: 'Sì' }, { v: 'no', l: 'No' }] },
          { k: 'note', l: 'Note', t: 'text', w: 2 }
        ],
        calc: (r, d) => {
          const coeff = window.COEFF || COEFF_DEFAULT;
          let v = 0;
          if (r.tipo === 'ceppaia') v = volCilindro(N(r.db) || N(r.d), N(r.h), 1.0);
          else if (r.tipo === 'troncone') v = volCilindro(N(r.d), N(r.h), coeff.fattoreFormaMoncone);
          else v = volCilindro(N(r.d), N(r.h), coeff.fattoreForma);
          return { vol: R(v, 3) };
        },
        calcCols: [{ k: 'vol', l: 'Volume', u: 'm³' }]
      }
    ]}
  ],
  calcolo: (d, plot) => {
    const ha = areaHa(plot) || 0.0531;
    const coeff = window.COEFF || COEFF_DEFAULT;
    const els = d.assenza ? [] : (d.elementi || []);
    let vTot = 0, cTot = 0, perDec = {}, nCav = 0;
    els.forEach(r => {
      let v = 0;
      if (r.tipo === 'ceppaia') v = volCilindro(N(r.db) || N(r.d), N(r.h), 1.0);
      else if (r.tipo === 'troncone') v = volCilindro(N(r.d), N(r.h), coeff.fattoreFormaMoncone);
      else v = volCilindro(N(r.d), N(r.h), coeff.fattoreForma);
      vTot += v;
      const sp = SPECIE_MAP[r.sp] || SPECIE_MAP['NDET'];
      const rid = DECAD_MAP[r.dec] ?? 0.8;
      cTot += v * sp.wd * rid * coeff.frazioneCarbonio;
      perDec[r.dec || '?'] = R((perDec[r.dec || '?'] || 0) + v / ha, 2);
      if (r.cavita === 'si') nCav++;
    });
    return {
      valore: R(vTot / ha, 2), unita: 'm³/ha',
      dettagli: [
        { l: 'Elementi rilevati', v: els.length },
        { l: 'Volume totale nell\'AdS', v: R(vTot, 3) + ' m³' },
        { l: 'Densità', v: R(els.length / ha, 0) + ' elementi/ha' },
        { l: 'Elementi con cavità', v: nCav + ' (' + R(els.length ? nCav / els.length * 100 : 0, 0) + '%)' },
        { l: 'Carbonio nella necromassa in piedi', v: R(cTot / ha, 2) + ' t C/ha' },
        { l: 'Volume per classe di decadimento', v: Object.keys(perDec).sort().map(k => 'cl.' + k + ': ' + perDec[k]).join(' | ') || '—' }
      ]
    };
  }
},

/* --------------------------------------------------- IND. 2 — LEGNO MORTO A TERRA */
{
  id: 'f2_legno_morto_terra',
  cod: 'NRL-F2',
  nome: 'Legno morto a terra',
  sub: 'Allegato VI — necromassa legnosa a terra (lying deadwood)',
  icona: '🌲',
  colore: '#7c2d12',
  unita: 'm³/ha',
  sezioni: [
    { t: 'Metodo di rilievo', f: [
      { k: 'metodo', l: 'Metodo', t: 'sel', req: true, def: 'ads',
        o: [{ v: 'ads', l: 'Cavallettamento nell\'area di saggio (misura di ogni tronco)' },
            { v: 'lis', l: 'Line Intersect Sampling — Van Wagner (transetti)' }] },
      { k: 'soglia_d', l: 'Soglia minima di diametro', t: 'num', u: 'cm', dec: 1, def: 10, req: true },
      { k: 'assenza', l: 'Nessun elemento di legno morto a terra presente', t: 'check' }
    ]},
    { t: 'Transetti (solo per metodo LIS)', showIfS: { k: 'metodo', v: 'lis' }, f: [
      { k: 'info_lis', t: 'info', l: 'Si misura il diametro di ogni pezzo legnoso intersecato dalla linea del transetto, nel punto esatto di intersezione. Formula di Van Wagner: V (m³/ha) = π² · Σd² / (8 · L), con d in cm e L lunghezza totale dei transetti in metri.' },
      { k: 'n_transetti', l: 'Numero di transetti', t: 'num', dec: 0, def: 3 },
      { k: 'lung_transetto', l: 'Lunghezza di ciascun transetto', t: 'num', u: 'm', dec: 1, def: 15 },
      { k: 'azimut', l: 'Azimut dei transetti', t: 'text', def: '0° / 120° / 240°' },
      { k: 'lung_tot', l: 'Lunghezza totale dei transetti', t: 'calc', u: 'm',
        fn: d => R(N(d.n_transetti) * N(d.lung_transetto), 1) }
    ]},
    { t: 'Tronchi e pezzi rilevati', f: [
      { k: 'tronchi', l: 'Metodo area di saggio — elenco tronchi', t: 'table', showIf: { k: 'metodo', v: 'ads' },
        cols: [
          COL_SPECIE,
          { k: 'd1', l: 'Diametro estremo minore', t: 'num', u: 'cm', dec: 1 },
          { k: 'd2', l: 'Diametro estremo maggiore', t: 'num', u: 'cm', dec: 1 },
          { k: 'lung', l: 'Lunghezza nell\'AdS', t: 'num', u: 'm', dec: 1 },
          COL_DECAD,
          { k: 'contatto', l: 'Contatto col suolo', t: 'sel', o: [{ v: '', l: '—' }, { v: 'tot', l: 'Totale' }, { v: 'parz', l: 'Parziale' }, { v: 'sosp', l: 'Sospeso' }] },
          { k: 'origine', l: 'Origine', t: 'sel', o: [{ v: '', l: '—' }, { v: 'nat', l: 'Naturale (schianto/mortalità)' }, { v: 'ant', l: 'Antropica (residui di taglio)' }] },
          { k: 'note', l: 'Note', t: 'text', w: 2 }
        ],
        calc: r => ({ vol: R(Math.PI * N(r.lung) * (Math.pow(N(r.d1), 2) + Math.pow(N(r.d2), 2)) / 80000, 3) }),
        calcCols: [{ k: 'vol', l: 'Volume', u: 'm³' }]
      },
      { k: 'intersezioni', l: 'Metodo LIS — intersezioni misurate', t: 'table', showIf: { k: 'metodo', v: 'lis' },
        cols: [
          { k: 'tr', l: 'N. transetto', t: 'num', dec: 0 },
          COL_SPECIE,
          { k: 'd', l: 'Diametro all\'intersezione', t: 'num', u: 'cm', dec: 1 },
          COL_DECAD,
          { k: 'incl', l: 'Inclinazione del pezzo', t: 'num', u: '°', dec: 0, help: 'Se > 0 il volume viene corretto per l\'inclinazione' },
          { k: 'note', l: 'Note', t: 'text', w: 2 }
        ]
      }
    ]}
  ],
  calcolo: (d, plot) => {
    const ha = areaHa(plot) || 0.0531;
    const coeff = window.COEFF || COEFF_DEFAULT;
    if (d.assenza) return { valore: 0, unita: 'm³/ha', dettagli: [{ l: 'Rilievo', v: 'Assenza di legno morto a terra' }] };
    let vha = 0, cha = 0, n = 0, perDec = {};
    if (d.metodo === 'lis') {
      const L = N(d.n_transetti) * N(d.lung_transetto);
      const rows = d.intersezioni || [];
      n = rows.length;
      if (L > 0) {
        rows.forEach(r => {
          const corr = Math.cos(N(r.incl) * Math.PI / 180) || 1;
          const v = (Math.PI * Math.PI * Math.pow(N(r.d), 2)) / (8 * L) / corr;
          vha += v;
          const sp = SPECIE_MAP[r.sp] || SPECIE_MAP['NDET'];
          cha += v * sp.wd * (DECAD_MAP[r.dec] ?? 0.6) * coeff.frazioneCarbonio;
          perDec[r.dec || '?'] = R((perDec[r.dec || '?'] || 0) + v, 2);
        });
      }
    } else {
      const rows = d.tronchi || [];
      n = rows.length;
      rows.forEach(r => {
        const v = Math.PI * N(r.lung) * (Math.pow(N(r.d1), 2) + Math.pow(N(r.d2), 2)) / 80000;
        vha += v / ha;
        const sp = SPECIE_MAP[r.sp] || SPECIE_MAP['NDET'];
        cha += (v / ha) * sp.wd * (DECAD_MAP[r.dec] ?? 0.6) * coeff.frazioneCarbonio;
        perDec[r.dec || '?'] = R((perDec[r.dec || '?'] || 0) + v / ha, 2);
      });
    }
    return {
      valore: R(vha, 2), unita: 'm³/ha',
      dettagli: [
        { l: 'Metodo', v: d.metodo === 'lis' ? 'Line Intersect Sampling' : 'Cavallettamento in AdS' },
        { l: 'Pezzi misurati', v: n },
        { l: 'Carbonio nella necromassa a terra', v: R(cha, 2) + ' t C/ha' },
        { l: 'Volume per classe di decadimento', v: Object.keys(perDec).sort().map(k => 'cl.' + k + ': ' + perDec[k]).join(' | ') || '—' }
      ]
    };
  }
},

/* ------------------------------------------------ IND. 3 — STRUTTURA DISETANEA */
{
  id: 'f3_disetaneita',
  cod: 'NRL-F3',
  nome: 'Struttura disetanea',
  sub: 'Allegato VI — quota di foreste con struttura disetanea (uneven-aged structure)',
  icona: '📊',
  colore: '#166534',
  unita: 'classificazione',
  sezioni: [
    { t: 'Dati strutturali', f: [
      { k: 'info', t: 'info', l: 'La classificazione si basa sulla distribuzione diametrica del piano arboreo e sulla stratificazione verticale. I dati dendrometrici possono essere importati dalla scheda NRL-F5 (cavallettamento) per non ripetere le misure.' },
      { k: 'importa', l: 'Importa il cavallettamento dalla scheda NRL-F5', t: 'import', from: 'f5_carbonio', fromKey: 'piante', toKey: 'piante' },
      { k: 'piante', l: 'Piante del piano arboreo (d ≥ soglia)', t: 'table',
        cols: [
          COL_SPECIE,
          { k: 'd', l: 'Diametro a 1,30 m', t: 'num', u: 'cm', dec: 1 },
          { k: 'strato', l: 'Posizione sociale', t: 'sel', o: [
            { v: 'dom', l: 'Dominante' }, { v: 'cod', l: 'Codominante' },
            { v: 'int', l: 'Intermedia' }, { v: 'dis', l: 'Dominata' }] }
        ]
      }
    ]},
    { t: 'Struttura verticale e cronologica', f: [
      { k: 'n_piani', l: 'Numero di piani (strati) distinguibili', t: 'sel', req: true,
        o: [{ v: '1', l: '1 — monoplano' }, { v: '2', l: '2 — biplano' }, { v: '3', l: '3 o più — pluriplano' }] },
      { k: 'rinnovazione', l: 'Rinnovazione affermata (h > 1,3 m, d < soglia)', t: 'sel',
        o: [{ v: 'assente', l: 'Assente' }, { v: 'scarsa', l: 'Scarsa e localizzata' },
            { v: 'diffusa', l: 'Diffusa e affermata' }, { v: 'abbondante', l: 'Abbondante su tutta l\'AdS' }] },
      { k: 'n_rinn', l: 'Densità della rinnovazione stimata', t: 'num', u: 'n/ha', dec: 0 },
      { k: 'classi_crono', l: 'Classi cronologiche riconoscibili in campo', t: 'num', dec: 0, help: 'Numero di gruppi di età distinguibili (es. per gruppi o per piede d\'albero)' },
      { k: 'tessitura', l: 'Tessitura della struttura', t: 'sel',
        o: [{ v: 'piede', l: 'Disetaneità per piede d\'albero' }, { v: 'gruppi', l: 'Disetaneità per gruppi (< 20 m)' },
            { v: 'collettivi', l: 'Struttura a collettivi/mosaico (20-50 m)' }, { v: 'uniforme', l: 'Struttura uniforme' }] },
      { k: 'giudizio', l: 'Giudizio del rilevatore sulla struttura', t: 'sel', req: true,
        o: [{ v: 'coetanea', l: 'Coetanea' }, { v: 'coetaneiforme', l: 'Coetaneiforme' },
            { v: 'disetaneiforme', l: 'Disetaneiforme / irregolare' }, { v: 'disetanea', l: 'Disetanea' }] },
      { k: 'alberi_habitat', l: 'Alberi habitat presenti (grandi dimensioni, cavità, cortecce)', t: 'num', u: 'n. nell\'AdS', dec: 0 },
      { k: 'foto', l: 'Foto del profilo verticale', t: 'photo', multi: true }
    ]}
  ],
  calcolo: (d, plot) => {
    const coeff = window.COEFF || COEFF_DEFAULT;
    const ha = areaHa(plot) || 0.0531;
    const piante = (d.piante && d.piante.length) ? d.piante : (window.getSchedaData ? (window.getSchedaData('f5_carbonio').piante || []) : []);
    const classi = {};
    piante.forEach(p => { const dd = N(p.d); if (dd <= 0) return; const c = Math.floor(dd / 5) * 5; classi[c] = (classi[c] || 0) + 1; });
    const tot = piante.length;
    const chiavi = Object.keys(classi).map(Number).sort((a, b) => a - b);
    const nClassiRappr = chiavi.filter(c => classi[c] / tot >= 0.10).length;
    // rapporto di De Liocourt (q) medio tra classi contigue
    let qs = [];
    for (let i = 0; i < chiavi.length - 1; i++) {
      if (chiavi[i + 1] - chiavi[i] === 5 && classi[chiavi[i + 1]] > 0) qs.push(classi[chiavi[i]] / classi[chiavi[i + 1]]);
    }
    const qMed = qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : 0;
    const decrescente = chiavi.length > 2 && classi[chiavi[0]] >= classi[chiavi[chiavi.length - 1]];
    const piani = N(d.n_piani);
    const disetanea = (nClassiRappr >= coeff.nClassiDisetaneo && piani >= 2 && decrescente) ||
      d.giudizio === 'disetanea' && piani >= 2;
    return {
      valore: disetanea ? 'DISETANEA' : 'NON disetanea', unita: '',
      dettagli: [
        { l: 'Piante conteggiate', v: tot + ' (' + R(tot / ha, 0) + ' n/ha)' },
        { l: 'Classi diametriche (5 cm) presenti', v: chiavi.length },
        { l: 'Classi con ≥10% dei fusti', v: nClassiRappr + ' (soglia: ' + coeff.nClassiDisetaneo + ')' },
        { l: 'Rapporto di De Liocourt (q medio)', v: R(qMed, 2) },
        { l: 'Distribuzione decrescente (J rovesciata)', v: decrescente ? 'sì' : 'no' },
        { l: 'Numero di piani', v: piani || '—' },
        { l: 'Distribuzione diametrica', v: chiavi.map(c => c + '-' + (c + 5) + ': ' + classi[c]).join(' | ') || '—' },
        { l: 'Giudizio del rilevatore', v: d.giudizio || '—' }
      ]
    };
  }
},

/* ------------------------------------------------ IND. 4 — CONNETTIVITÀ FORESTALE */
{
  id: 'f4_connettivita',
  cod: 'NRL-F4',
  nome: 'Connettività forestale',
  sub: 'Allegato VI — forest connectivity (rilievo speditivo di campo a supporto dell\'analisi cartografica)',
  icona: '🔗',
  colore: '#0e7490',
  unita: 'indice 0-100',
  sezioni: [
    { t: 'Nota metodologica', f: [
      { k: 'info', t: 'info', l: 'L\'indicatore ufficiale di connettività si calcola su base cartografica (analisi della struttura del paesaggio forestale). Questa scheda raccoglie le osservazioni di campo che validano e integrano il dato telerilevato: continuità del soprassuolo intorno all\'area di saggio, barriere e elementi di connessione.' }
    ]},
    { t: 'Continuità del soprassuolo (osservata dal centro dell\'AdS)', f: [
      ...['N', 'E', 'S', 'O'].map(dir => ({
        k: 'lato_' + dir, l: 'Uso del suolo verso ' + dir + ' (entro 200 m)', t: 'sel',
        o: [{ v: 'bosco_cont', l: 'Bosco continuo' }, { v: 'bosco_disc', l: 'Bosco discontinuo/radura' },
            { v: 'arbusteto', l: 'Arbusteto / macchia' }, { v: 'pascolo', l: 'Prato-pascolo' },
            { v: 'coltivo', l: 'Coltivo' }, { v: 'urbano', l: 'Edificato / infrastruttura' },
            { v: 'strada', l: 'Strada / viabilità principale' }, { v: 'acqua', l: 'Corpo idrico' },
            { v: 'nudo', l: 'Suolo nudo / cava' }]
      })),
      { k: 'dist_bosco', l: 'Distanza dal nucleo forestale più vicino (se AdS in bosco isolato)', t: 'num', u: 'm', dec: 0 },
      { k: 'sup_patch', l: 'Superficie stimata della macchia boscata', t: 'num', u: 'ha', dec: 1 }
    ]},
    { t: 'Barriere e discontinuità', f: [
      { k: 'barriere', l: 'Barriere presenti entro 500 m', t: 'multi',
        o: ['Strada asfaltata', 'Autostrada/SS a grande traffico', 'Ferrovia', 'Pista forestale', 'Elettrodotto', 'Gasdotto/metanodotto', 'Area agricola estesa', 'Edificato', 'Cava', 'Recinzioni continue', 'Nessuna'].map(x => ({ v: x, l: x })) },
      { k: 'larghezza_int', l: 'Larghezza massima dell\'interruzione del soprassuolo', t: 'num', u: 'm', dec: 0 },
      { k: 'attraversamenti', l: 'Presenza di attraversamenti faunistici / sottopassi', t: 'sel',
        o: [{ v: 'no', l: 'No' }, { v: 'si', l: 'Sì' }, { v: 'na', l: 'Non pertinente' }] }
    ]},
    { t: 'Elementi di connessione', f: [
      { k: 'elementi_conn', l: 'Elementi lineari o puntuali di connessione', t: 'multi',
        o: ['Siepi', 'Filari alberati', 'Boschetti isolati', 'Corridoio ripariale', 'Fascia arbustiva di margine', 'Muretti a secco con vegetazione', 'Nessuno'].map(x => ({ v: x, l: x })) },
      { k: 'qualita_margine', l: 'Qualità ecotonale del margine del bosco', t: 'sel',
        o: [{ v: 'netto', l: 'Margine netto (transizione brusca)' }, { v: 'graduale', l: 'Margine graduale con fascia arbustiva' }, { v: 'assente', l: 'AdS interna, margine non osservabile' }] },
      { k: 'giudizio_conn', l: 'Giudizio complessivo di connettività locale', t: 'sel', req: true,
        o: [{ v: '5', l: '5 — Molto elevata: bosco continuo in tutte le direzioni' },
            { v: '4', l: '4 — Elevata: continuità prevalente con interruzioni minori' },
            { v: '3', l: '3 — Media: bosco frammentato ma connesso da elementi lineari' },
            { v: '2', l: '2 — Bassa: nucleo isolato con connessioni residue' },
            { v: '1', l: '1 — Molto bassa: bosco isolato in matrice ostile' }] },
      { k: 'foto', l: 'Foto dei margini e delle discontinuità', t: 'photo', multi: true }
    ]}
  ],
  calcolo: (d) => {
    const lati = ['N', 'E', 'S', 'O'].map(x => d['lato_' + x]);
    const punteggi = { bosco_cont: 25, bosco_disc: 17, arbusteto: 12, pascolo: 6, coltivo: 4, acqua: 6, nudo: 2, strada: 0, urbano: 0 };
    let base = lati.reduce((a, l) => a + (punteggi[l] ?? 0), 0);
    const barriere = d.barriere || [];
    const pesanti = barriere.filter(b => ['Autostrada/SS a grande traffico', 'Ferrovia', 'Edificato', 'Cava', 'Recinzioni continue'].includes(b)).length;
    let penalita = Math.min(20, pesanti * 7 + (N(d.larghezza_int) > 50 ? 8 : N(d.larghezza_int) > 20 ? 4 : 0));
    const conn = (d.elementi_conn || []).filter(x => x !== 'Nessuno').length;
    let bonus = Math.min(10, conn * 3);
    const indice = Math.max(0, Math.min(100, base + bonus - penalita));
    return {
      valore: R(indice, 0), unita: '/100',
      dettagli: [
        { l: 'Lati con bosco continuo', v: lati.filter(l => l === 'bosco_cont').length + ' su 4' },
        { l: 'Punteggio di continuità', v: base + '/100' },
        { l: 'Penalità per barriere', v: '-' + penalita },
        { l: 'Bonus elementi di connessione', v: '+' + bonus },
        { l: 'Giudizio del rilevatore', v: (d.giudizio_conn || '—') + '/5' },
        { l: 'Nota', v: 'Indice speditivo di campo — non sostituisce il calcolo cartografico dell\'indicatore' }
      ]
    };
  }
},

/* ------------------------------------------- IND. 5 — STOCK DI CARBONIO ORGANICO */
{
  id: 'f5_carbonio',
  cod: 'NRL-F5',
  nome: 'Stock di carbonio organico',
  sub: 'Allegato VI — stock of organic carbon (biomassa epigea e ipogea, lettiera, suolo)',
  icona: '⚫',
  colore: '#1e293b',
  unita: 't C/ha',
  sezioni: [
    { t: 'Cavallettamento del piano arboreo', f: [
      { k: 'info', t: 'info', l: 'Si cavallettano tutte le piante vive con diametro a 1,30 m ≥ soglia radicate nell\'area di saggio. Le altezze possono essere misurate su un campione: per le piante prive di altezza il calcolo usa l\'altezza media della stessa specie nell\'AdS, o in mancanza l\'altezza media del popolamento.' },
      { k: 'soglia_d', l: 'Soglia di cavallettamento', t: 'num', u: 'cm', dec: 1, def: 4.5, req: true },
      { k: 'h_media_pop', l: 'Altezza media del popolamento (stima)', t: 'num', u: 'm', dec: 1 },
      { k: 'piante', l: 'Piante cavallettate', t: 'table', req: true,
        cols: [
          COL_SPECIE,
          { k: 'd', l: 'Diametro a 1,30 m', t: 'num', u: 'cm', dec: 1 },
          { k: 'h', l: 'Altezza (se misurata)', t: 'num', u: 'm', dec: 1 },
          { k: 'strato', l: 'Posizione sociale', t: 'sel', o: [
            { v: 'dom', l: 'Dominante' }, { v: 'cod', l: 'Codominante' },
            { v: 'int', l: 'Intermedia' }, { v: 'dis', l: 'Dominata' }] },
          { k: 'orig', l: 'Origine', t: 'sel', o: [{ v: 'seme', l: 'Da seme' }, { v: 'polloni', l: 'Da polloni' }, { v: 'matricina', l: 'Matricina' }] },
          { k: 'vitalita', l: 'Vitalità', t: 'sel', o: [{ v: 'buona', l: 'Buona' }, { v: 'media', l: 'Media' }, { v: 'deperiente', l: 'Deperiente' }] },
          { k: 'note', l: 'Note', t: 'text', w: 2 }
        ],
        calc: r => ({ g: R(Math.PI / 4 * Math.pow(N(r.d) / 100, 2), 4) }),
        calcCols: [{ k: 'g', l: 'Area basim.', u: 'm²' }]
      }
    ]},
    { t: 'Lettiera', f: [
      { k: 'lett_spess', l: 'Spessore medio della lettiera', t: 'num', u: 'cm', dec: 1, help: 'Media di almeno 4 misure nell\'AdS' },
      { k: 'lett_cop', l: 'Copertura della lettiera', t: 'num', u: '%', dec: 0, max: 100 },
      { k: 'lett_dens', l: 'Densità apparente della lettiera (se nota)', t: 'num', u: 'g/cm³', dec: 3, def: 0.1 },
      { k: 'lett_camp', l: 'Campione di lettiera prelevato', t: 'check' },
      { k: 'lett_id', l: 'ID campione lettiera', t: 'text', showIf: { k: 'lett_camp', v: true } }
    ]},
    { t: 'Suolo', f: [
      { k: 'suolo_prof', l: 'Profondità di campionamento', t: 'num', u: 'cm', dec: 0, def: 30 },
      { k: 'suolo_n', l: 'Numero di campioni prelevati', t: 'num', dec: 0 },
      { k: 'suolo_id', l: 'ID dei campioni di suolo', t: 'text' },
      { k: 'suolo_scheletro', l: 'Scheletro stimato (> 2 mm)', t: 'num', u: '%', dec: 0, max: 100 },
      { k: 'suolo_bd', l: 'Densità apparente del suolo (se nota)', t: 'num', u: 'g/cm³', dec: 2 },
      { k: 'suolo_soc', l: 'Carbonio organico da analisi di laboratorio', t: 'num', u: '% s.s.', dec: 2, help: 'Compilare a valle delle analisi; lasciare vuoto in campo' },
      { k: 'suolo_note', l: 'Osservazioni pedologiche', t: 'textarea' }
    ]}
  ],
  calcolo: (d, plot) => {
    const ha = areaHa(plot) || 0.0531;
    const coeff = window.COEFF || COEFF_DEFAULT;
    const piante = d.piante || [];
    // altezze medie per specie
    const hSp = {}, hCnt = {};
    piante.forEach(p => { if (N(p.h) > 0) { hSp[p.sp] = (hSp[p.sp] || 0) + N(p.h); hCnt[p.sp] = (hCnt[p.sp] || 0) + 1; } });
    const hMediaGen = piante.filter(p => N(p.h) > 0).length
      ? piante.reduce((a, p) => a + N(p.h), 0) / piante.filter(p => N(p.h) > 0).length
      : N(d.h_media_pop);
    let G = 0, V = 0, Bep = 0, Bip = 0;
    piante.forEach(p => {
      const sp = SPECIE_MAP[p.sp] || SPECIE_MAP['NDET'];
      const dd = N(p.d); if (dd <= 0) return;
      const g = Math.PI / 4 * Math.pow(dd / 100, 2);
      let h = N(p.h);
      if (h <= 0) h = hCnt[p.sp] ? hSp[p.sp] / hCnt[p.sp] : (hMediaGen || N(d.h_media_pop));
      const v = g * h * coeff.fattoreForma;
      G += g; V += v;
      const bep = v * sp.wd * sp.bef;
      Bep += bep; Bip += bep * sp.r2s;
    });
    const Cviva = (Bep + Bip) * coeff.frazioneCarbonio / ha;
    // lettiera
    const Clett = N(d.lett_spess) > 0
      ? (N(d.lett_spess) * (N(d.lett_dens) || 0.1) * 100) * (N(d.lett_cop) || 100) / 100 * 0.40
      : 0; // t/ha: spess(cm)*dens(g/cm3)*100 = t/ha di sostanza secca; 0.40 = frazione C lettiera
    // suolo
    const Csuolo = (N(d.suolo_soc) > 0 && N(d.suolo_bd) > 0)
      ? N(d.suolo_soc) / 100 * N(d.suolo_bd) * N(d.suolo_prof) * 100 * (1 - N(d.suolo_scheletro) / 100)
      : 0;
    // necromassa dalle schede F1/F2
    let Cnecro = 0;
    if (window.getCarbonioNecromassa) Cnecro = window.getCarbonioNecromassa();
    const tot = Cviva + Clett + Csuolo + Cnecro;
    return {
      valore: R(tot, 2), unita: 't C/ha',
      dettagli: [
        { l: 'Piante cavallettate', v: piante.length + ' (' + R(piante.length / ha, 0) + ' n/ha)' },
        { l: 'Area basimetrica', v: R(G / ha, 2) + ' m²/ha' },
        { l: 'Volume del soprassuolo', v: R(V / ha, 1) + ' m³/ha' },
        { l: 'Biomassa epigea', v: R(Bep / ha, 1) + ' t s.s./ha' },
        { l: 'Biomassa ipogea', v: R(Bip / ha, 1) + ' t s.s./ha' },
        { l: 'C biomassa viva', v: R(Cviva, 2) + ' t C/ha' },
        { l: 'C necromassa (schede F1+F2)', v: R(Cnecro, 2) + ' t C/ha' },
        { l: 'C lettiera (stima)', v: R(Clett, 2) + ' t C/ha' },
        { l: 'C suolo (da analisi)', v: Csuolo > 0 ? R(Csuolo, 2) + ' t C/ha' : 'in attesa di analisi' },
        { l: 'CO₂ equivalente immagazzinata', v: R(tot * 3.667, 1) + ' t CO₂/ha' }
      ]
    };
  }
},

/* --------------------------------------- IND. 6 — SPECIE ARBOREE AUTOCTONE */
{
  id: 'f6_autoctone',
  cod: 'NRL-F6',
  nome: 'Foreste dominate da specie arboree autoctone',
  sub: 'Allegato VI — share of forests dominated by native tree species',
  icona: '🌳',
  colore: '#15803d',
  unita: '% area basimetrica',
  sezioni: [
    { t: 'Composizione specifica', f: [
      { k: 'info', t: 'info', l: 'Il carattere autoctono di ciascuna specie è precaricato nell\'anagrafica specie ed è modificabile in Impostazioni. La dominanza si valuta sull\'area basimetrica; la soglia di default è 50%.' },
      { k: 'importa', l: 'Importa il cavallettamento dalla scheda NRL-F5', t: 'import', from: 'f5_carbonio', fromKey: 'piante', toKey: 'piante' },
      { k: 'piante', l: 'Piante rilevate (o riepilogo per specie)', t: 'table',
        cols: [
          COL_SPECIE,
          { k: 'd', l: 'Diametro a 1,30 m', t: 'num', u: 'cm', dec: 1 },
          { k: 'n', l: 'Numero di individui', t: 'num', dec: 0, def: 1, help: 'Usare > 1 per inserire un riepilogo aggregato per specie' }
        ]
      }
    ]},
    { t: 'Specie esotiche e rinnovazione', f: [
      { k: 'esotiche_pres', l: 'Presenza di specie arboree esotiche', t: 'sel',
        o: [{ v: 'no', l: 'Assenti' }, { v: 'sporadiche', l: 'Sporadiche' }, { v: 'diffuse', l: 'Diffuse' }, { v: 'dominanti', l: 'Dominanti' }] },
      { k: 'esotiche_inv', l: 'Specie esotiche invasive osservate', t: 'multi',
        o: ['Robinia pseudoacacia', 'Ailanthus altissima', 'Acacia dealbata', 'Prunus serotina', 'Amorpha fruticosa', 'Nessuna'].map(x => ({ v: x, l: x })) },
      { k: 'esotiche_cop', l: 'Copertura stimata delle esotiche', t: 'num', u: '%', dec: 0, max: 100 },
      { k: 'rinn_autoctona', l: 'Rinnovazione di specie autoctone', t: 'sel',
        o: [{ v: 'abbondante', l: 'Abbondante' }, { v: 'sufficiente', l: 'Sufficiente' }, { v: 'scarsa', l: 'Scarsa' }, { v: 'assente', l: 'Assente' }] },
      { k: 'origine_pop', l: 'Origine del popolamento', t: 'sel',
        o: [{ v: 'naturale', l: 'Naturale / seminaturale' }, { v: 'impianto_aut', l: 'Impianto con specie autoctone' }, { v: 'impianto_eso', l: 'Impianto con specie esotiche' }] }
    ]}
  ],
  calcolo: (d, plot) => {
    const coeff = window.COEFF || COEFF_DEFAULT;
    const piante = (d.piante && d.piante.length) ? d.piante : (window.getSchedaData ? (window.getSchedaData('f5_carbonio').piante || []) : []);
    let Gtot = 0, Gaut = 0, Ntot = 0, Naut = 0; const perSp = {};
    piante.forEach(p => {
      const sp = SPECIE_MAP[p.sp]; if (!sp) return;
      const n = N(p.n) || 1;
      const g = Math.PI / 4 * Math.pow(N(p.d) / 100, 2) * n;
      Gtot += g; Ntot += n;
      if (sp.aut) { Gaut += g; Naut += n; }
      perSp[sp.n] = R((perSp[sp.n] || 0) + g, 4);
    });
    const pct = Gtot > 0 ? Gaut / Gtot * 100 : 0;
    const pctN = Ntot > 0 ? Naut / Ntot * 100 : 0;
    return {
      valore: R(pct, 1), unita: '% G autoctone',
      dettagli: [
        { l: 'Esito', v: pct >= coeff.sogliaAutoctone ? 'BOSCO DOMINATO DA SPECIE AUTOCTONE' : 'Non dominato da specie autoctone' },
        { l: 'Soglia applicata', v: coeff.sogliaAutoctone + '% dell\'area basimetrica' },
        { l: '% autoctone sul numero di piante', v: R(pctN, 1) + '%' },
        { l: 'Area basimetrica totale', v: R(Gtot, 3) + ' m² nell\'AdS' },
        { l: 'Specie esotiche', v: d.esotiche_pres || '—' },
        { l: 'Ripartizione per specie (G, m²)', v: Object.entries(perSp).map(([k, v]) => k.split(' (')[0] + ': ' + v).join(' | ') || '—' }
      ]
    };
  }
},

/* ------------------------------------- IND. 7 — DIVERSITÀ DI SPECIE ARBOREE */
{
  id: 'f7_diversita',
  cod: 'NRL-F7',
  nome: 'Diversità di specie arboree',
  sub: 'Allegato VI — tree species diversity',
  icona: '🍃',
  colore: '#4d7c0f',
  unita: 'n. specie / H\'',
  sezioni: [
    { t: 'Specie del piano arboreo', f: [
      { k: 'info', t: 'info', l: 'Si conteggiano tutte le specie arboree presenti nel piano arboreo dell\'area di saggio. Gli indici di diversità (Shannon, Simpson, equiripartizione) sono calcolati sul numero di individui per specie.' },
      { k: 'importa', l: 'Importa il cavallettamento dalla scheda NRL-F5', t: 'import', from: 'f5_carbonio', fromKey: 'piante', toKey: 'piante' },
      { k: 'piante', l: 'Riepilogo per specie', t: 'table',
        cols: [
          COL_SPECIE,
          { k: 'n', l: 'Numero di individui', t: 'num', dec: 0, def: 1 },
          { k: 'd', l: 'Diametro medio', t: 'num', u: 'cm', dec: 1 },
          { k: 'cop', l: 'Copertura', t: 'num', u: '%', dec: 0, max: 100 }
        ]
      }
    ]},
    { t: 'Altri piani di vegetazione', f: [
      { k: 'sp_rinnovazione', l: 'Specie arboree presenti solo come rinnovazione', t: 'multi', o: () => SPECIE_OPZIONI },
      { k: 'n_sp_arbustive', l: 'Numero di specie arbustive presenti', t: 'num', dec: 0 },
      { k: 'sp_arbustive', l: 'Specie arbustive principali', t: 'text' },
      { k: 'sp_rare', l: 'Specie sporadiche o di pregio osservate', t: 'text', help: 'Es. Taxus baccata, Ilex aquifolium, Sorbus spp., Acer spp.' },
      { k: 'foto', l: 'Foto della composizione', t: 'photo', multi: true }
    ]}
  ],
  calcolo: (d) => {
    const piante = (d.piante && d.piante.length) ? d.piante : (window.getSchedaData ? (window.getSchedaData('f5_carbonio').piante || []) : []);
    const cnt = {};
    piante.forEach(p => { if (!p.sp || p.sp === 'NDET') return; cnt[p.sp] = (cnt[p.sp] || 0) + (N(p.n) || 1); });
    const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
    const S = Object.keys(cnt).length;
    let H = 0, D = 0;
    Object.values(cnt).forEach(n => { const p = n / tot; if (p > 0) { H += -p * Math.log(p); D += p * p; } });
    const J = S > 1 ? H / Math.log(S) : 0;
    const sPlus = new Set([...Object.keys(cnt), ...(d.sp_rinnovazione || [])]).size;
    return {
      valore: S, unita: 'specie arboree',
      dettagli: [
        { l: 'Ricchezza specifica (S)', v: S },
        { l: 'S incl. specie presenti solo in rinnovazione', v: sPlus },
        { l: 'Indice di Shannon (H\')', v: R(H, 3) },
        { l: 'Equiripartizione di Pielou (J)', v: R(J, 3) },
        { l: 'Indice di Simpson (1-D)', v: R(1 - D, 3) },
        { l: 'Classe di diversità', v: S >= 5 ? 'Elevata (≥5 specie)' : S >= 3 ? 'Media (3-4 specie)' : S === 2 ? 'Bassa (2 specie)' : 'Monospecifico' },
        { l: 'Individui conteggiati', v: tot },
        { l: 'Composizione', v: Object.entries(cnt).map(([k, v]) => (SPECIE_MAP[k] ? SPECIE_MAP[k].n.split(' (')[0] : k) + ': ' + v).join(' | ') || '—' }
      ]
    };
  }
},

/* --------------------------------- IND. 8 — INDICE UCCELLI FORESTALI COMUNI */
{
  id: 'f8_uccelli',
  cod: 'NRL-F8',
  nome: 'Indice degli uccelli forestali comuni',
  sub: 'Art. 12 e Allegato VI — common forest bird index (punto d\'ascolto)',
  icona: '🐦',
  colore: '#6d28d9',
  unita: 'n. specie / contatti',
  sezioni: [
    { t: 'Protocollo del punto d\'ascolto', f: [
      { k: 'info', t: 'info', l: 'Punto d\'ascolto di 10 minuti, da eseguire nelle prime 4 ore dopo l\'alba, in assenza di pioggia e con vento ≤ 3 Beaufort, nel periodo riproduttivo (indicativamente 15 aprile — 30 giugno alle quote medie).' },
      { k: 'cod_punto', l: 'Codice del punto d\'ascolto', t: 'text', req: true },
      { k: 'data', l: 'Data', t: 'date', req: true },
      { k: 'ora', l: 'Ora di inizio', t: 'time', req: true },
      { k: 'durata', l: 'Durata del rilievo', t: 'num', u: 'min', dec: 0, def: 10, req: true },
      { k: 'raggio', l: 'Raggio di rilevamento', t: 'sel', def: '100',
        o: [{ v: '50', l: '50 m' }, { v: '100', l: '100 m' }, { v: 'illimitato', l: 'Illimitato' }] },
      { k: 'ripetizione', l: 'Numero della ripetizione stagionale', t: 'sel',
        o: [{ v: '1', l: '1ª (aprile-metà maggio)' }, { v: '2', l: '2ª (metà maggio-giugno)' }] }
    ]},
    { t: 'Condizioni di rilievo', f: [
      { k: 'nuvolosita', l: 'Nuvolosità', t: 'num', u: '%', dec: 0, max: 100 },
      { k: 'vento', l: 'Vento (scala Beaufort)', t: 'sel',
        o: [{ v: '0', l: '0 — calma' }, { v: '1', l: '1 — bava di vento' }, { v: '2', l: '2 — brezza leggera' }, { v: '3', l: '3 — brezza tesa' }, { v: '4+', l: '4 o più — rilievo da rimandare' }] },
      { k: 'pioggia', l: 'Precipitazioni', t: 'sel', o: [{ v: 'no', l: 'Assenti' }, { v: 'leggera', l: 'Pioviggine' }, { v: 'si', l: 'Pioggia — rilievo non valido' }] },
      { k: 'temperatura', l: 'Temperatura', t: 'num', u: '°C', dec: 0 },
      { k: 'rumore', l: 'Rumore di fondo', t: 'sel', o: [{ v: 'assente', l: 'Assente' }, { v: 'basso', l: 'Basso' }, { v: 'medio', l: 'Medio (torrente, vento)' }, { v: 'alto', l: 'Alto (traffico, macchinari)' }] }
    ]},
    { t: 'Contatti rilevati', f: [
      { k: 'contatti', l: 'Elenco dei contatti', t: 'table',
        cols: [
          { k: 'sp', l: 'Specie', t: 'sel', w: 3, o: () => UCCELLI_OPZIONI },
          { k: 'n', l: 'N. individui', t: 'num', dec: 0, def: 1 },
          { k: 'tipo', l: 'Tipo di contatto', t: 'sel', w: 2, o: [
            { v: 'canto', l: 'Canto territoriale' }, { v: 'richiamo', l: 'Richiamo' },
            { v: 'vista', l: 'Osservazione visiva' }, { v: 'tamb', l: 'Tambureggiamento' },
            { v: 'nido', l: 'Nido / giovani' }] },
          { k: 'dist', l: 'Distanza', t: 'sel', o: [{ v: '<50', l: '< 50 m' }, { v: '50-100', l: '50-100 m' }, { v: '>100', l: '> 100 m' }] },
          { k: 'intervallo', l: 'Intervallo', t: 'sel', o: [{ v: '0-3', l: '0-3 min' }, { v: '3-5', l: '3-5 min' }, { v: '5-10', l: '5-10 min' }] },
          { k: 'transito', l: 'In transito', t: 'sel', o: [{ v: 'no', l: 'No' }, { v: 'si', l: 'Sì (escluso dal conteggio)' }] }
        ]
      },
      { k: 'audio_note', l: 'Registrazione audio effettuata (ID file)', t: 'text' }
    ]}
  ],
  calcolo: (d) => {
    const rows = (d.contatti || []).filter(r => r.transito !== 'si');
    const sp = new Set(rows.map(r => r.sp).filter(Boolean));
    const spFbi = [...sp].filter(s => UCCELLI_FBI.has(s));
    const ind = rows.reduce((a, r) => a + (N(r.n) || 1), 0);
    const indFbi = rows.filter(r => UCCELLI_FBI.has(r.sp)).reduce((a, r) => a + (N(r.n) || 1), 0);
    const terr = rows.filter(r => r.tipo === 'canto' || r.tipo === 'tamb').reduce((a, r) => a + (N(r.n) || 1), 0);
    const valido = d.pioggia !== 'si' && d.vento !== '4+';
    return {
      valore: spFbi.length, unita: 'specie forestali',
      dettagli: [
        { l: 'Validità del rilievo', v: valido ? 'Valido' : 'NON VALIDO — condizioni meteo fuori protocollo' },
        { l: 'Specie totali contattate', v: sp.size },
        { l: 'Specie dell\'indice forestale', v: spFbi.length },
        { l: 'Individui totali', v: ind },
        { l: 'Individui di specie forestali', v: indFbi },
        { l: 'Contatti territoriali (canto/tamburo)', v: terr },
        { l: 'Specie forestali rilevate', v: spFbi.map(s => s.split(' (')[0]).join(', ') || '—' }
      ]
    };
  }
}
];

const SCHEDE_MAP = Object.fromEntries(SCHEDE.map(s => [s.id, s]));
const SCHEDE_INDICATORI = SCHEDE.filter(s => s.id !== 'anagrafica');
