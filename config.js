/* =====================================================================
   AL VOLO – CONFIGURAZIONE DEL PILOTA
   È l'unico file da modificare. Dopo ogni modifica va ricaricato su GitHub.
   ===================================================================== */
window.AL_VOLO_PILOTA = {

  // 1. Indirizzo dello script di Google Fogli (passo 2 delle istruzioni): finisce con /exec
  endpoint: "https://script.google.com/macros/s/AKfycbzZeAyyPZBStPGKmWV36DtBkCIB8e5Tw5TNpmga4xc1X8JJ6buvoDEFMZW2RlaMksQ/exec",

  // 2. Chiave del pilota: deve essere UGUALE a quella scritta nello script di Google Fogli
  chiave: "i_fratelli_Fly_sono_i_migliori",

  // 3. Attività su cui lavora il pilota, con l'articolo (es. "il collaudo del pezzo", "l'emissione dell'ordine")
  attivita: "la richiesta di materiale dal magazzino",

  // 4. Codice dei partecipanti al test: prefisso + 3 cifre casuali + suffisso (es. T123TT).
  //    Divisione e ruolo non vengono chiesti: in produzione arriveranno da Workday.
  codicePrefisso: "T",
  codiceSuffisso: "TT",

  // 5. Frase sulla privacy mostrata all'ingresso
  notaPrivacy: "Non ti chiediamo il nome. Le tue risposte sono legate a un codice di test e vengono salvate in un foglio di calcolo usato solo dal gruppo di progetto per questo pilota. Non sarà possibile risalire al tuo nome e cognome, le tue risposte rimarranno anonime.",

  // 6. Mappa di partenza dell'attività (quella che Fred mostra e che le persone correggono).
  //    lanes = attori; nodes = passaggi (type: start, task, decision, end; lane = numero dell'attore);
  //    edges = collegamenti. Se la lasci vuota (null) si usa questo esempio.
  mappa: {
    "title": "Richiesta di materiale al magazzino",
    "lanes": [
      "Operatore di linea",
      "Capo reparto",
      "Magazzino",
      "Ufficio acquisti"
    ],
    "nodes": [
      {
        "id": "s",
        "type": "start",
        "lane": 0,
        "status": "confirmed",
        "label": "Si accorge che manca il materiale"
      },
      {
        "id": "n2",
        "type": "task",
        "lane": 0,
        "status": "variant",
        "label": "Avvisa il capo reparto",
        "note": "Alcune persone avvisano direttamente il magazzino."
      },
      {
        "id": "n3",
        "type": "task",
        "lane": 1,
        "status": "confirmed",
        "label": "Compila la richiesta di prelievo"
      },
      {
        "id": "n4",
        "type": "decision",
        "lane": 2,
        "status": "confirmed",
        "label": "Materiale disponibile?"
      },
      {
        "id": "n5",
        "type": "task",
        "lane": 3,
        "status": "confirmed",
        "label": "Apre la richiesta d'acquisto"
      },
      {
        "id": "n6",
        "type": "task",
        "lane": 3,
        "status": "verify",
        "label": "Sceglie il fornitore e invia l'ordine"
      },
      {
        "id": "n7",
        "type": "task",
        "lane": 2,
        "status": "verify",
        "label": "Riceve e controlla la merce"
      },
      {
        "id": "n8",
        "type": "task",
        "lane": 2,
        "status": "confirmed",
        "label": "Prepara il materiale"
      },
      {
        "id": "e",
        "type": "end",
        "lane": 0,
        "status": "confirmed",
        "label": "Ritira il materiale in reparto"
      }
    ],
    "edges": [
      {
        "from": "s",
        "to": "n2"
      },
      {
        "from": "n2",
        "to": "n3"
      },
      {
        "from": "n3",
        "to": "n4"
      },
      {
        "from": "n4",
        "to": "n5",
        "label": "No"
      },
      {
        "from": "n4",
        "to": "n8",
        "label": "Sì"
      },
      {
        "from": "n5",
        "to": "n6"
      },
      {
        "from": "n6",
        "to": "n7"
      },
      {
        "from": "n7",
        "to": "n8"
      },
      {
        "from": "n8",
        "to": "e"
      }
    ]
  }
};
