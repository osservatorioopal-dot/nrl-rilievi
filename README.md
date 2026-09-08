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
