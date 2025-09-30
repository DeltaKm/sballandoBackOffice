# Linee Guida Progetto Sballando Backoffice

## Tipi e Modelli

- **Usa sempre i tipi TypeScript definiti in `/src/types/index.ts`** per tutte le entità (Event, location_, Product, EntryType, Collaborator, ecc).
- **Non ridefinire mai i tipi nelle pagine o nei componenti**: importa sempre da `~/types`.
- Se aggiungi un nuovo campo o modello, aggiorna prima `/src/types/index.ts`.

## API e Webservice

- Le chiamate API devono essere sempre in **POST** se richiedono autenticazione o dati sensibili.
- Passa sempre `user_token` nel body della richiesta per autenticare l’utente.
- L’id delle risorse (es. `id` del locale) deve essere passato come parametro dinamico nella route (`/api/locations/[id]`) e non nel body.
- **Ad ogni web service va inviato il token dell'utente che fa la richiesta** per verificare se è il proprietario dell'evento, del locale o della risorsa richiesta, oppure se è il `SUPERADMIN`.
- Nei webservice, **verifica sempre** che l’utente sia il proprietario della risorsa o abbia ruolo `SUPERADMIN` prima di restituire dati sensibili.
- Le API devono restituire sempre oggetti JSON validi, anche in caso di errore.

## Convenzioni di Codice

- Usa sempre i nomi dei campi come da database e tipi (es: `datetime_start`, `cover`, `title`, ecc).
- Per la visualizzazione delle date, usa sempre `toLocaleDateString('it-IT', ...)` per coerenza.
- Per la divisione eventi futuri/passati, confronta sempre con `datetime_start`.

## UI/UX

- Tema scuro di default.
- Mostra sempre stato di caricamento, errori e messaggi di empty state.
- Le statistiche (es. numero eventi) devono essere sempre visibili in alto nella pagina del locale.
- Gli eventi devono essere divisi in “Eventi Futuri” e “Eventi Passati”.

## Struttura del Progetto

- Tutti i tipi in `/src/types/index.ts`
- Tutte le chiamate API in `/src/app/api/`
- Tutte le pagine in `/src/app/`
- Componenti riutilizzabili in `/src/components/`

---

**Aggiorna questo file ogni volta che aggiungi una nuova regola o convenzione!**
