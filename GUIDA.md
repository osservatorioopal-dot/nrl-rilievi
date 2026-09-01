# NRL Rilievi — piattaforma di rilievo degli indicatori forestali

App di campo per Android (PWA installabile) per il rilievo degli indicatori di
biodiversità degli ecosistemi forestali previsti dal **Regolamento (UE) 2024/1991**
(*Nature Restoration Law*), art. 12 e Allegato VI.

Funziona **integralmente offline**: i dati restano sul dispositivo in un database
locale e vengono inviati a un foglio Google quando torna la connessione.

---

## 1. Contenuto del pacchetto

```
nrl-rilievi/
├── index.html                 interfaccia e fogli di stile
├── manifest.webmanifest       configurazione dell'app installabile
├── sw.js                      service worker (funzionamento offline)
├── dati.js                    specie arboree, densità del legno, coefficienti
├── schede.js                  definizione delle 9 schede e delle formule
├── app.js                     motore dell'applicazione
├── icon-192.png, icon-512.png, icon-512-maskable.png
├── Codice-AppsScript.gs       backend di sincronizzazione su Google Sheets
└── GUIDA.md                   questo documento
```

Tutti i file stanno nella stessa cartella, senza sottocartelle: è la struttura
già pubblicata su GitHub Pages.

---

## 2. Installazione

### 2.1 L'app è già pubblicata

**Indirizzo dell'app: https://osservatorioopal-dot.github.io/nrl-rilievi/**

È ospitata su GitHub Pages (https, gratuito) dal repository pubblico
`osservatorioopal-dot/nrl-rilievi`. Il codice è visibile a chiunque; i dati dei
rilievi **non** stanno lì: restano sul telefono e vanno sul tuo foglio Google.

Per aggiornare l'app dopo una modifica: apri il repository su GitHub, entra nel file
da cambiare, matita "Edit", incolla la nuova versione e "Commit changes" — oppure
"Add file → Upload files" trascinando i file modificati. Ricorda di incrementare
`const CACHE = 'nrl-rilievi-v1'` in `sw.js` (v2, v3, …), altrimenti i telefoni già
installati continuano a usare la versione in cache.

### 2.2 Installazione sul telefono del rilevatore

1. Apri l'indirizzo con Chrome su Android.
2. Menu ⋮ → **Installa app** (o "Aggiungi a schermata Home").
3. L'app compare tra le applicazioni e si apre a tutto schermo, senza barra del browser.
4. **Aprila una volta con la connessione attiva**: è il momento in cui salva i propri
   file per l'uso offline. Da lì in avanti funziona anche in modalità aereo.
5. Al primo avvio si crea l'utenza di amministrazione (nome, nome utente, password).
   Da Impostazioni → Utenti si aggiungono gli altri rilevatori.

### 2.3 Backend di sincronizzazione (Google Sheets)

1. Crea un foglio Google, per esempio *NRL Rilievi — dati*.
2. Estensioni → **Apps Script**; cancella il contenuto e incolla `Codice-AppsScript.gs`.
3. Salva, poi **Distribuisci → Nuova distribuzione → App web**:
   - *Esegui come*: **Me**
   - *Chi ha accesso*: **Chiunque**
4. Copia l'URL che finisce con `/exec`.
5. Nell'app: ⚙ Impostazioni → incolla l'URL → **Salva** → **Prova la connessione**.

Il foglio si popola da solo con quattro schede:

| Foglio | Contenuto |
|---|---|
| `Aree_di_saggio` | una riga per area di saggio, con coordinate e caratteri stazionali |
| `Schede` | una riga per scheda compilata, **con il valore dell'indicatore già calcolato** |
| `Dettaglio_elementi` | una riga per ogni albero morto, tronco, pianta cavallettata, contatto ornitico |
| `Riepilogo` | medie per indicatore (menu **NRL → Aggiorna riepilogo**) |

La sincronizzazione è un *upsert*: se modifichi un rilievo già inviato e risincronizzi,
la riga viene **aggiornata**, non duplicata.

Per archiviare anche le fotografie: crea una cartella su Drive, copia il suo ID
dall'URL e incollalo in `var CARTELLA_FOTO = '';` nella prima riga dello script;
poi attiva l'opzione corrispondente nelle impostazioni dell'app.

---

## 3. Come si lavora in campo

1. **+ Nuova area di saggio** → si apre l'anagrafica: codice, GPS, comune, geometria
   dell'area di saggio (di default cerchio di raggio 13 m = 531 m², standard INFC),
   categoria forestale, forma di governo, foto.
2. Si torna all'elenco delle 8 schede degli indicatori e si compilano quelle previste
   dal protocollo della campagna. Ogni scheda mostra **in alto il valore dell'indicatore
   che si aggiorna a ogni misura inserita**: un errore di battitura si vede subito.
3. Ogni scheda si chiude con note, stato (bozza / completata / validata) e firma del
   rilevatore tracciata a dito.
4. Il salvataggio è automatico e continuo: se il telefono si spegne non si perde nulla.
5. A fine giornata, in rete: ⟳ **Sincronizza**. Il numero sull'icona indica quante aree
   di saggio sono ancora solo sul dispositivo.

L'ordine consigliato è: **F5 (cavallettamento) prima di F3, F6 e F7**, perché queste
tre schede importano le piante già misurate con il pulsante *Importa il cavallettamento*
ed evitano di ripetere le misure.

---

## 4. Le schede e i calcoli

### AdS — Anagrafica dell'area di saggio
Identificazione, GPS (lat/lon/quota/precisione), catasto e particella forestale,
quota, esposizione, pendenza, giacitura, geometria dell'area di saggio con superficie
calcolata, categoria forestale, forma di governo, stadio di sviluppo, copertura,
Rete Natura 2000 e habitat, disturbi osservati, foto.

### NRL-F1 — Legno morto in piedi → **m³/ha**
Per ogni elemento: specie, tipologia (albero intero / troncone / ceppaia), diametro a
1,30 m, diametro alla base, altezza, classe di decadimento 1-5, cavità, carpofori.

- albero intero: `V = π/4 · d² · h · f` con f = 0,50
- troncone/moncone: stessa formula con f = 0,60
- ceppaia: cilindro sul diametro di base

Restituisce anche densità (elementi/ha), quota di elementi con cavità, volume per
classe di decadimento e carbonio della necromassa
(`V · densità basale · fattore di riduzione per decadimento · 0,47`).

### NRL-F2 — Legno morto a terra → **m³/ha**
Due metodi selezionabili.

- **Cavallettamento in AdS**: per ogni tronco d₁, d₂, lunghezza, decadimento, contatto
  col suolo, origine → `V = π · L · (d₁² + d₂²) / 80000`
- **Line Intersect Sampling** (Van Wagner): transetti di lunghezza nota, si misura il
  diametro di ogni pezzo nel punto di intersezione → `V(m³/ha) = π² · Σd² / (8 · L)`,
  con correzione per l'inclinazione del pezzo.

### NRL-F3 — Struttura disetanea → **disetanea / non disetanea**
Distribuzione diametrica per classi di 5 cm, numero di piani, rinnovazione affermata,
classi cronologiche, tessitura (per piede d'albero, per gruppi, a collettivi), giudizio
del rilevatore, alberi habitat.
Il verdetto automatico richiede: almeno 3 classi diametriche con ≥10% dei fusti,
almeno 2 piani, distribuzione decrescente (curva a J rovesciata). Viene calcolato anche
il rapporto **q di De Liocourt** medio tra classi contigue.

### NRL-F4 — Connettività forestale → **indice 0-100**
L'indicatore ufficiale si calcola su base cartografica: questa scheda raccoglie le
**osservazioni di campo che lo validano** — uso del suolo nelle quattro direzioni entro
200 m, distanza dal nucleo forestale più vicino, barriere entro 500 m e loro ampiezza,
elementi di connessione (siepi, filari, corridoi ripari), qualità del margine.
L'indice sintetico (continuità + bonus connessioni − penalità barriere) è **speditivo**
e va usato come dato di supporto, non come valore dell'indicatore.

### NRL-F5 — Stock di carbonio organico → **t C/ha**
Cavallettamento completo (specie, diametro, altezza su un campione, posizione sociale,
origine, vitalità) + lettiera (spessore, copertura, campione) + suolo (profondità,
numero campioni, scheletro, densità apparente, % C da laboratorio).

- volume: `V = π/4 · d² · h · 0,50`; le piante senza altezza usano l'altezza media
  della stessa specie nell'area di saggio
- biomassa epigea `V · densità basale · BEF`, ipogea con rapporto radici/fusto
- carbonio `biomassa · 0,47` (IPCC), sommato a necromassa (F1+F2), lettiera e suolo
- restituisce anche G (m²/ha), volume (m³/ha) e CO₂ equivalente

Le densità basali e i BEF per 57 specie sono in `dati.js` e modificabili.

### NRL-F6 — Foreste dominate da specie autoctone → **% di area basimetrica**
Composizione specifica (importabile da F5), presenza e copertura di esotiche, elenco
delle invasive, rinnovazione autoctona, origine del popolamento.
Il carattere autoctono è precaricato per ogni specie; la soglia di dominanza (default
50% dell'area basimetrica) è modificabile nelle impostazioni.

### NRL-F7 — Diversità di specie arboree → **n. specie**
Ricchezza specifica, indice di **Shannon**, equiripartizione di **Pielou**, indice di
**Simpson**, specie presenti solo come rinnovazione, specie arbustive e sporadiche di pregio.

### NRL-F8 — Indice degli uccelli forestali comuni → **n. specie forestali**
Punto d'ascolto standard di 10 minuti: codice punto, ora, raggio, ripetizione stagionale,
condizioni (nuvolosità, vento Beaufort, pioggia, rumore di fondo) e, per ogni contatto,
specie, individui, tipo di contatto (canto territoriale, richiamo, vista, tambureggiamento),
distanza, intervallo temporale, transito.
Sono precaricate 48 specie con l'indicazione di quali rientrano nell'indice forestale;
i contatti in transito sono esclusi dal conteggio e il rilievo è segnalato **non valido**
se pioggia o vento superano il protocollo.

---

## 5. Esportazioni

Dal **Riepilogo indicatori** (freccia in home) o dalla singola area di saggio:

- **CSV indicatori** — una riga per area di saggio, una colonna per indicatore (per Excel/QGIS)
- **CSV dettaglio** — una riga per ogni elemento misurato, per le elaborazioni statistiche
- **GeoJSON** — i punti delle aree di saggio con i valori degli indicatori negli attributi,
  apribile direttamente in QGIS
- **Backup JSON** — copia completa, reimportabile da Impostazioni

---

## 6. Avvertenze e limiti

- **Le utenze sono locali al dispositivo.** Servono a identificare il rilevatore e a
  impedire l'uso del telefono altrui, ma non sono un controllo di accesso lato server:
  chi pubblica l'app la rende raggiungibile a chiunque abbia l'indirizzo. Se i dati
  sono riservati, pubblica l'app in un'area protetta da password del tuo hosting.
- **I coefficienti sono valori di letteratura** (densità basali, BEF, rapporti radici/fusto,
  fattori di forma, riduzione di densità per classe di decadimento). Sono ragionevoli per
  l'Appennino meridionale ma vanno verificati e, se serve, sostituiti con i valori della
  tua campagna: Impostazioni → Coefficienti, e `dati.js` per i valori per specie.
- **La connettività forestale (F4) non si rileva in campo**: la scheda produce un indice
  di supporto, il valore dell'indicatore va calcolato su cartografia.
- **Gli indicatori si riferiscono alla singola area di saggio.** Il valore a scala di
  popolamento, di sito o di piano è la media (o la quota percentuale, per gli indicatori
  categoriali come F3 e F6) delle aree di saggio del campione.
- **Il carbonio del suolo** resta a zero finché non si inseriscono i risultati di
  laboratorio (% C e densità apparente): il campo è nella scheda F5 e si compila
  dopo le analisi.
- Le fotografie sono compresse a 1280 px: bastano per la documentazione, non per
  fotointerpretazione.

---

## 7. Modifiche più frequenti

| Cosa | Dove |
|---|---|
| Aggiungere una specie arborea | `dati.js`, array `SPECIE` (codice, nome, gruppo, autoctona, densità, BEF) |
| Aggiungere una specie ornitica | `schede.js`, array `UCCELLI` (nome, 1 se rientra nell'indice forestale) |
| Aggiungere un campo a una scheda | `schede.js`, sezione `f: [...]` della scheda |
| Cambiare una formula | `schede.js`, funzione `calcolo` della scheda |
| Cambiare i coefficienti | dall'app, Impostazioni → Coefficienti |

Dopo ogni modifica ai file, incrementa `const CACHE = 'nrl-rilievi-v1'` in `sw.js`
(v2, v3, …): è ciò che dice ai telefoni già installati di scaricare la nuova versione.

---

*Verifica svolta: 24 test automatici sull'app (creazione utenze, GPS, tabelle di misura,
calcoli F1/F2/F3/F5/F6/F7/F8, firma, persistenza dopo riavvio, funzionamento in modalità
offline, sincronizzazione differita, upsert, esportazioni) e sul backend Apps Script.*
