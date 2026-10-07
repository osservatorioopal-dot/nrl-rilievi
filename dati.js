/* ============================================================================
   NRL Rilievi — Basi dati di riferimento
   Specie arboree, densità del legno, coefficienti di espansione, classi di
   decadimento. Tutti i valori sono modificabili da Impostazioni > Coefficienti.
   ========================================================================== */

/* Specie arboree.
   aut = autoctona per l'Italia meridionale (usata per l'indicatore 6).
   wd  = densità basale del legno (t s.s. / m3 fresco), fonti IPCC GPG /
         INFC / Giordano; bef = fattore di espansione della biomassa
         (fusto -> parte epigea); r2s = rapporto radici/parte epigea. */
const SPECIE = [
  // Latifoglie autoctone
  { c: 'FASY', n: 'Faggio (Fagus sylvatica)',              g: 'latifoglia', aut: true,  wd: 0.58, bef: 1.36, r2s: 0.20 },
  { c: 'QUCE', n: 'Cerro (Quercus cerris)',                g: 'latifoglia', aut: true,  wd: 0.69, bef: 1.42, r2s: 0.20 },
  { c: 'QUFR', n: 'Farnetto (Quercus frainetto)',          g: 'latifoglia', aut: true,  wd: 0.67, bef: 1.42, r2s: 0.20 },
  { c: 'QUPU', n: 'Roverella (Quercus pubescens)',         g: 'latifoglia', aut: true,  wd: 0.69, bef: 1.42, r2s: 0.20 },
  { c: 'QUIL', n: 'Leccio (Quercus ilex)',                 g: 'latifoglia', aut: true,  wd: 0.80, bef: 1.42, r2s: 0.20 },
  { c: 'QUPE', n: 'Rovere (Quercus petraea)',              g: 'latifoglia', aut: true,  wd: 0.65, bef: 1.42, r2s: 0.20 },
  { c: 'QURO', n: 'Farnia (Quercus robur)',                g: 'latifoglia', aut: true,  wd: 0.65, bef: 1.42, r2s: 0.20 },
  { c: 'QUSU', n: 'Sughera (Quercus suber)',               g: 'latifoglia', aut: true,  wd: 0.70, bef: 1.42, r2s: 0.20 },
  { c: 'CASA', n: 'Castagno (Castanea sativa)',            g: 'latifoglia', aut: true,  wd: 0.48, bef: 1.33, r2s: 0.20 },
  { c: 'OSCA', n: 'Carpino nero (Ostrya carpinifolia)',    g: 'latifoglia', aut: true,  wd: 0.70, bef: 1.42, r2s: 0.20 },
  { c: 'CABE', n: 'Carpino bianco (Carpinus betulus)',     g: 'latifoglia', aut: true,  wd: 0.68, bef: 1.42, r2s: 0.20 },
  { c: 'FROR', n: 'Orniello (Fraxinus ornus)',             g: 'latifoglia', aut: true,  wd: 0.63, bef: 1.42, r2s: 0.20 },
  { c: 'FRAN', n: 'Frassino ossifillo (Fraxinus angustifolia)', g: 'latifoglia', aut: true, wd: 0.57, bef: 1.42, r2s: 0.20 },
  { c: 'FREX', n: 'Frassino maggiore (Fraxinus excelsior)',g: 'latifoglia', aut: true,  wd: 0.56, bef: 1.42, r2s: 0.20 },
  { c: 'ACCA', n: 'Acero campestre (Acer campestre)',      g: 'latifoglia', aut: true,  wd: 0.58, bef: 1.42, r2s: 0.20 },
  { c: 'ACOP', n: 'Acero napoletano (Acer opalus/obtusatum)', g: 'latifoglia', aut: true, wd: 0.56, bef: 1.42, r2s: 0.20 },
  { c: 'ACPS', n: 'Acero di monte (Acer pseudoplatanus)',  g: 'latifoglia', aut: true,  wd: 0.52, bef: 1.42, r2s: 0.20 },
  { c: 'ACMO', n: 'Acero minore (Acer monspessulanum)',    g: 'latifoglia', aut: true,  wd: 0.60, bef: 1.42, r2s: 0.20 },
  { c: 'SOTO', n: 'Ciavardello (Sorbus torminalis)',       g: 'latifoglia', aut: true,  wd: 0.65, bef: 1.42, r2s: 0.20 },
  { c: 'SODO', n: 'Sorbo domestico (Sorbus domestica)',    g: 'latifoglia', aut: true,  wd: 0.66, bef: 1.42, r2s: 0.20 },
  { c: 'SOAR', n: 'Sorbo montano (Sorbus aria)',           g: 'latifoglia', aut: true,  wd: 0.64, bef: 1.42, r2s: 0.20 },
  { c: 'PRAV', n: 'Ciliegio selvatico (Prunus avium)',     g: 'latifoglia', aut: true,  wd: 0.49, bef: 1.42, r2s: 0.20 },
  { c: 'ULMI', n: 'Olmo campestre (Ulmus minor)',          g: 'latifoglia', aut: true,  wd: 0.56, bef: 1.42, r2s: 0.20 },
  { c: 'TICO', n: 'Tiglio selvatico (Tilia cordata)',      g: 'latifoglia', aut: true,  wd: 0.43, bef: 1.42, r2s: 0.20 },
  { c: 'TIPL', n: 'Tiglio nostrano (Tilia platyphyllos)',  g: 'latifoglia', aut: true,  wd: 0.43, bef: 1.42, r2s: 0.20 },
  { c: 'ALGL', n: 'Ontano nero (Alnus glutinosa)',         g: 'latifoglia', aut: true,  wd: 0.45, bef: 1.42, r2s: 0.20 },
  { c: 'ALCO', n: 'Ontano napoletano (Alnus cordata)',     g: 'latifoglia', aut: true,  wd: 0.45, bef: 1.42, r2s: 0.20 },
  { c: 'SAAL', n: 'Salice bianco (Salix alba)',            g: 'latifoglia', aut: true,  wd: 0.35, bef: 1.42, r2s: 0.20 },
  { c: 'PONI', n: 'Pioppo nero (Populus nigra)',           g: 'latifoglia', aut: true,  wd: 0.35, bef: 1.42, r2s: 0.20 },
  { c: 'POAL', n: 'Pioppo bianco (Populus alba)',          g: 'latifoglia', aut: true,  wd: 0.35, bef: 1.42, r2s: 0.20 },
  { c: 'POTR', n: 'Pioppo tremulo (Populus tremula)',      g: 'latifoglia', aut: true,  wd: 0.35, bef: 1.42, r2s: 0.20 },
  { c: 'COAV', n: 'Nocciolo (Corylus avellana)',           g: 'latifoglia', aut: true,  wd: 0.52, bef: 1.42, r2s: 0.20 },
  { c: 'ILAQ', n: 'Agrifoglio (Ilex aquifolium)',          g: 'latifoglia', aut: true,  wd: 0.66, bef: 1.42, r2s: 0.20 },
  { c: 'ARUN', n: 'Corbezzolo (Arbutus unedo)',            g: 'latifoglia', aut: true,  wd: 0.72, bef: 1.42, r2s: 0.20 },
  { c: 'PHLA', n: 'Fillirea (Phillyrea latifolia)',        g: 'latifoglia', aut: true,  wd: 0.75, bef: 1.42, r2s: 0.20 },
  { c: 'CEAU', n: 'Bagolaro (Celtis australis)',           g: 'latifoglia', aut: true,  wd: 0.58, bef: 1.42, r2s: 0.20 },
  // v1.4: specie delle gravine e delle formazioni ripariali/costiere (Gravine di Matera, Valle del Basento)
  { c: 'QUTR', n: 'Fragno (Quercus trojana)',               g: 'latifoglia', aut: true,  wd: 0.75, bef: 1.42, r2s: 0.20 },
  { c: 'TAMA', n: 'Tamerice (Tamarix africana / gallica)',  g: 'latifoglia', aut: true,  wd: 0.60, bef: 1.42, r2s: 0.20 },
  { c: 'SASP', n: 'Salice (Salix spp., altre specie)',      g: 'latifoglia', aut: true,  wd: 0.35, bef: 1.42, r2s: 0.20 },
  { c: 'FICA', n: 'Fico (Ficus carica)',                    g: 'latifoglia', aut: true,  wd: 0.43, bef: 1.42, r2s: 0.20 },
  { c: 'OLEU', n: 'Olivastro / olivo (Olea europaea)',      g: 'latifoglia', aut: true,  wd: 0.80, bef: 1.42, r2s: 0.20 },
  { c: 'PITE', n: 'Terebinto (Pistacia terebinthus)',       g: 'latifoglia', aut: true,  wd: 0.70, bef: 1.42, r2s: 0.20 },
  { c: 'PYSP', n: 'Perastro (Pyrus spinosa)',               g: 'latifoglia', aut: true,  wd: 0.70, bef: 1.42, r2s: 0.20 },
  { c: 'CRMO', n: 'Biancospino (Crataegus monogyna)',       g: 'latifoglia', aut: true,  wd: 0.70, bef: 1.42, r2s: 0.20 },
  { c: 'RHAL', n: 'Alaterno (Rhamnus alaternus)',           g: 'latifoglia', aut: true,  wd: 0.70, bef: 1.42, r2s: 0.20 },
  // Conifere autoctone
  { c: 'ABAL', n: 'Abete bianco (Abies alba)',             g: 'conifera',   aut: true,  wd: 0.38, bef: 1.30, r2s: 0.29 },
  { c: 'PINL', n: 'Pino laricio (Pinus nigra subsp. calabrica)', g: 'conifera', aut: true, wd: 0.47, bef: 1.30, r2s: 0.29 },
  { c: 'PIHA', n: 'Pino d\'Aleppo (Pinus halepensis)',     g: 'conifera',   aut: true,  wd: 0.51, bef: 1.30, r2s: 0.29 },
  { c: 'PISY', n: 'Pino silvestre (Pinus sylvestris)',     g: 'conifera',   aut: true,  wd: 0.42, bef: 1.30, r2s: 0.29 },
  { c: 'TABA', n: 'Tasso (Taxus baccata)',                 g: 'conifera',   aut: true,  wd: 0.55, bef: 1.30, r2s: 0.29 },
  { c: 'JUSP', n: 'Ginepro (Juniperus spp.)',              g: 'conifera',   aut: true,  wd: 0.55, bef: 1.30, r2s: 0.29 },
  // Specie non autoctone / esotiche o di impianto
  { c: 'PINI', n: 'Pino nero d\'Austria (Pinus nigra subsp. nigra)', g: 'conifera', aut: false, wd: 0.47, bef: 1.30, r2s: 0.29 },
  { c: 'PIPI', n: 'Pino domestico (Pinus pinea)',          g: 'conifera',   aut: false, wd: 0.49, bef: 1.30, r2s: 0.29 },
  { c: 'PIPT', n: 'Pino marittimo (Pinus pinaster)',       g: 'conifera',   aut: false, wd: 0.47, bef: 1.30, r2s: 0.29 },
  { c: 'PSME', n: 'Douglasia (Pseudotsuga menziesii)',     g: 'conifera',   aut: false, wd: 0.45, bef: 1.30, r2s: 0.29 },
  { c: 'PIAB', n: 'Abete rosso (Picea abies)',             g: 'conifera',   aut: false, wd: 0.38, bef: 1.30, r2s: 0.29 },
  { c: 'CEDR', n: 'Cedro (Cedrus spp.)',                   g: 'conifera',   aut: false, wd: 0.48, bef: 1.30, r2s: 0.29 },
  { c: 'CUSE', n: 'Cipresso (Cupressus sempervirens)',     g: 'conifera',   aut: false, wd: 0.48, bef: 1.30, r2s: 0.29 },
  { c: 'ROPS', n: 'Robinia (Robinia pseudoacacia)',        g: 'latifoglia', aut: false, wd: 0.63, bef: 1.42, r2s: 0.20 },
  { c: 'AIAL', n: 'Ailanto (Ailanthus altissima)',         g: 'latifoglia', aut: false, wd: 0.48, bef: 1.42, r2s: 0.20 },
  { c: 'EUSP', n: 'Eucalitto (Eucalyptus spp.)',           g: 'latifoglia', aut: false, wd: 0.65, bef: 1.42, r2s: 0.20 },
  { c: 'ACDE', n: 'Acacia dealbata (Acacia dealbata)',     g: 'latifoglia', aut: false, wd: 0.60, bef: 1.42, r2s: 0.20 },
  { c: 'JUNI', n: 'Noce nero (Juglans nigra)',             g: 'latifoglia', aut: false, wd: 0.55, bef: 1.42, r2s: 0.20 },
  { c: 'PLHI', n: 'Platano (Platanus x hispanica)',        g: 'latifoglia', aut: false, wd: 0.56, bef: 1.42, r2s: 0.20 },
  { c: 'POCA', n: 'Pioppo ibrido / canadese (Populus x canadensis)', g: 'latifoglia', aut: false, wd: 0.35, bef: 1.42, r2s: 0.20 },
  { c: 'ELAN', n: 'Olivagno (Elaeagnus angustifolia)',      g: 'latifoglia', aut: false, wd: 0.55, bef: 1.42, r2s: 0.20 },
  // Generiche
  { c: 'ALTL', n: 'Altra latifoglia',                      g: 'latifoglia', aut: true,  wd: 0.58, bef: 1.42, r2s: 0.20 },
  { c: 'ALTC', n: 'Altra conifera',                        g: 'conifera',   aut: true,  wd: 0.45, bef: 1.30, r2s: 0.29 },
  { c: 'NDET', n: 'Non determinabile',                     g: 'nd',         aut: null,  wd: 0.50, bef: 1.35, r2s: 0.22 }
];

const SPECIE_OPZIONI = SPECIE.map(s => ({ v: s.c, l: s.n }));
const SPECIE_MAP = Object.fromEntries(SPECIE.map(s => [s.c, s]));

/* Classi di decadimento del legno morto (scala a 5 classi, INFC/Hunter).
   rid = fattore di riduzione della densità rispetto al legno fresco. */
const CLASSI_DECADIMENTO = [
  { v: '1', l: '1 — Legno fresco, corteccia intatta, ramificazione fine presente', rid: 0.95 },
  { v: '2', l: '2 — Inizio alterazione, corteccia parzialmente distaccata, rami principali', rid: 0.80 },
  { v: '3', l: '3 — Legno alterato, corteccia assente, penetrabile con coltello per 1-2 cm', rid: 0.60 },
  { v: '4', l: '4 — Legno molto degradato, sezione deformata, penetrabile per intero', rid: 0.45 },
  { v: '5', l: '5 — Legno polverulento, contorni indistinti, incorporato nella lettiera', rid: 0.30 }
];
const DECAD_MAP = Object.fromEntries(CLASSI_DECADIMENTO.map(c => [c.v, c.rid]));

/* Categorie forestali (semplificate, coerenti con INFC/Carta Forestale) */
const CATEGORIE_FORESTALI = [
  'Faggete', 'Cerrete, boschi di farnetto e roverella', 'Boschi a prevalenza di leccio',
  'Castagneti', 'Ostrieti e carpineti', 'Boschi igrofili ripariali',
  'Boschi di altre latifoglie', 'Abetine', 'Pinete di pini mediterranei',
  'Pinete di pino nero e laricio', 'Rimboschimenti di conifere',
  'Rimboschimenti di latifoglie', 'Macchia mediterranea alta', 'Altro'
].map(x => ({ v: x, l: x }));

const FORME_GOVERNO = ['Fustaia', 'Ceduo semplice', 'Ceduo matricinato', 'Ceduo composto',
  'Ceduo in conversione', 'Fustaia transitoria', 'Bosco non gestito', 'Impianto artificiale']
  .map(x => ({ v: x, l: x }));

const ESPOSIZIONI = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'Pianeggiante']
  .map(x => ({ v: x, l: x }));

/* Coefficienti di calcolo modificabili dall'utente */
const COEFF_DEFAULT = {
  fattoreForma: 0.50,        // f per volume albero morto in piedi con chioma
  fattoreFormaMoncone: 0.60, // f per moncone/troncone senza chioma
  frazioneCarbonio: 0.47,    // IPCC 2006: t C / t s.s.
  sogliaAutoctone: 75,       // % di area basimetrica per definire "dominato da autoctone" (capitolato BRM-CAP-02)
  sogliaDiamLegnoMorto: 10,  // cm — soglia di cavallettamento del legno morto
  sogliaDiamVivi: 4.5,       // cm — soglia INFC per il piano arboreo
  nClassiDisetaneo: 3,       // n. minimo di classi diametriche con >=10% dei fusti
  raggioDefault: 13.0        // m — raggio dell'area di saggio circolare (531 m2)
};
