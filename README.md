# NRL Rilievi

App di campo (PWA installabile su Android, funzionante offline) per il rilievo degli
indicatori di biodiversità degli ecosistemi forestali previsti dall'**Allegato VI del
Regolamento (UE) 2024/1991** (*Nature Restoration Law*).

**App online:** https://osservatorioopal-dot.github.io/nrl-rilievi/

## Schede

| Cod. | Indicatore | Unità |
|---|---|---|
| AdS | Anagrafica area di saggio | — |
| NRL-F1 | Legno morto in piedi | m³/ha |
| NRL-F2 | Legno morto a terra | m³/ha |
| NRL-F3 | Struttura disetanea | classificazione |
| NRL-F4 | Connettività forestale (rilievo di campo) | indice 0-100 |
| NRL-F5 | Stock di carbonio organico | t C/ha |
| NRL-F6 | Foreste dominate da specie autoctone | % area basimetrica |
| NRL-F7 | Diversità di specie arboree | n. specie, H', J, 1-D |
| NRL-F8 | Indice degli uccelli forestali comuni | n. specie forestali |

I dati restano sul dispositivo (IndexedDB) e vengono sincronizzati su Google Sheets
tramite Google Apps Script quando torna la connessione. Accesso con utenza e password
per ogni rilevatore. GPS, foto e firma digitale su ogni scheda.

Istruzioni complete di installazione, formule di calcolo e avvertenze: **[GUIDA.md](GUIDA.md)**.

Osservatorio per l'Ambiente Lucano (O.P.A.L.)

**Versione 1.1 (08/09/2026):** integrazione con il progetto QGIS/QField del monitoraggio Natura 2000 (punti pianificati, apertura diretta con `?ads=CODICE`, scostamento dal punto, esportazione CSV per QGIS). Vedi GUIDA.md § 8.

**Versione 1.2 (08/09/2026):** codice AdS scelto dall'elenco dei punti pianificati, blocco dei codici doppi, collegamento delle AdS esistenti al piano. Vedi GUIDA.md § 8.

**Versione 1.3 (06/10/2026):** foto sincronizzate su Drive con il codice dell'area di saggio nel nome (archivio `NRL Rilievi - foto/<codice>/`, foglio `Foto` come indice) e scaricate dal progetto QGIS in `02_DATI/foto_app/` per le schede Atlas e i report; valori predefiniti del capitolato BRM-CAP-02 (D ≥ 9,5 cm, LIS 3 × 20 m, autoctone ≥ 75 % di G); funzioni di manutenzione nello script Google (pulizia dei dati di prova).

**Versione 1.5 (07/10/2026):** ruoli (amministratore con codice, rilevatori senza impostazioni), specie delle gravine e ripariali, valori del capitolato BRM-CAP-02.

**Versione 1.6 (09/11/2026):** **Archivio di progetto** per l'amministratore (tasto 📋): aree di saggio, schede e foto di tutti i rilevatori lette dal foglio Google tramite il servizio Apps Script (token di lettura inserito in Impostazioni), con riepilogo per rilevatore, aree pianificate ancora da rilevare, filtri, dettaglio delle schede e CSV. Vedi GUIDA.md § 8.

**Versione 1.7 (09/11/2026):** **☁ Le mie aree sul foglio**: ogni rilevatore recupera, con il codice squadra, le aree fatte con altri telefoni per completarle o correggerle; **protezione contro le sovrascritture** tra telefoni (*superata ↻*, *Ricarica dal foglio*); l'amministratore scarica dall'archivio le aree da correggere (colonna *revisore*); foto mai sovrascritte da un'altra area; NRL-F5 calcolato con F1/F2 della stessa area. Richiede lo script Google v4.2. Vedi GUIDA.md § 8.
