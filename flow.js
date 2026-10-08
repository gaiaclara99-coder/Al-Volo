/* =====================================================================
   FRED QUENZA – CONFIGURAZIONE DEL MOCK-UP
   ---------------------------------------------------------------------
   Questo è l'unico file da toccare per cambiare testi, domande e schema.
   Non serve conoscere il resto del codice.

   DOMANDE
   - type: "open"    → campo di testo libero
   - type: "choice"  → risposte rapide + campo libero ("Oppure scrivilo tu")
   - optional: true  → compare il pulsante "Salta"
   - ack: risposte simulate di Fred. Nel prodotto vero le genererà il
          modello linguistico (vedi fredReply() in app.js).

   PROCESSO
   - lanes: gli attori (colonne dello schema)
   - nodes: i passaggi. lane = indice della colonna, row = riga (dall'alto)
            type: "start" | "task" | "decision" | "end"
            status: "confirmed" | "variant" | "verify"
            note: testo mostrato per le varianti
   - edges: i collegamenti. label facoltativa (es. "Sì"/"No").
            exit: "right" | "left" | "bottom" (da dove esce la freccia
            da un nodo decisione); route: "side" fa passare la freccia
            lungo il bordo della colonna per non attraversare altri nodi.
   Nel prodotto vero lane e row andranno calcolati in automatico
   dal JSON prodotto dal modello.
   ===================================================================== */

window.FRED_FLOW = {
  character: {
    name: "Fred Quenza",
    role: "Radio di bordo di Al Volo"
  },

  sessions: {
    mercoledi: {
      "type": "domande",
      "dayLabel": "Tappa 1 di 4",
      "teaser": "Fred ha qualche domanda per te",
      "greeting": [
        "Ciao! Sono Fred Quenza, il radiofonista dell'equipaggio di Al Volo.",
        "Sto raccogliendo come si svolge {attivita}, raccontata da chi la vive. Rispondi con le parole che preferisci."
      ],
      "questions": [
        {
          "id": "racconto",
          "type": "open",
          "text": "Puoi descrivere {attivita} passaggio per passaggio, dall'inizio alla fine?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "persone",
          "type": "open",
          "text": "Quante persone sono coinvolte nel processo e con quali ruoli?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "persone-mappa",
          "type": "selectSteps",
          "text": "Collocale nella mappa: tocca i passaggi in cui intervengono, poi premi «Fatto».",
          "noneLabel": "Non saprei",
          "doneLabel": "Fatto"
        },
        {
          "id": "aggiunte",
          "type": "open",
          "optional": true,
          "text": "Ti sembra che ci sia qualcosa da aggiungere?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "variazioni",
          "type": "choice",
          "text": "Si svolge sempre allo stesso modo?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "No": [
              {
                "id": "variazioni-quali",
                "type": "open",
                "text": "Quali variazioni possono esserci? Da cosa dipendono?",
                "placeholder": "Scrivi qui…"
              }
            ]
          }
        },
        {
          "id": "strumenti",
          "type": "open",
          "text": "Cosa utilizzi per portare a termine l'attività (piattaforme, strumenti…)?",
          "placeholder": "Scrivi qui…"
        }
      ],
      "closing": "Grazie. Venerdì ti mostro di nuovo la mappa: potrai correggerla come preferisci.",
      "showScene": true,
      "showStart": true,
      "progress": {
        "done": 1,
        "total": 3,
        "label": "Primo passaggio fatto"
      }
    },

    venerdi: {
      "type": "verifica",
      "dayLabel": "Tappa 2 di 4",
      "teaser": "Fred ha uno schema da mostrarti",
      "greeting": [
        "Ciao! Ecco la mappa {di_attivita}.",
        "Il processo così mappato è corretto?"
      ],
      "askSelect": "Segnala il passaggio errato: toccalo nella mappa.",
      "askHow": "Correggilo secondo la tua prospettiva.",
      "howPlaceholder": "Scrivi qui…",
      "processKey": "process",
      "thinkingIntegrate": "Fred sta aggiornando lo schema…",
      "reflectIntro": "Quindi, se ho capito, {summary}. Ho aggiornato lo schema così:",
      "reflectAsk": "È così?",
      "askCorrect": "Dimmi cosa correggere.",
      "correctPlaceholder": "Scrivi qui…",
      "fallbackNote": "Ho annotato le tue parole sul passaggio “{passaggio}”, così come le hai scritte.",
      "thanksFix": "Grazie. Mercoledì ti faccio qualche altra domanda.",
      "thanksYes": "Grazie. Mercoledì ti faccio qualche altra domanda.",
      "confirmLabel": "Sì",
      "rejectLabel": "No",
      "yesQuestion": {
        "id": "aspetti-non-mappati",
        "type": "open",
        "optional": true,
        "text": "Ci sono aspetti non mappati che vorresti fare presenti?",
        "placeholder": "Scrivi qui…"
      }
    },

    mercoledi2: {
      "type": "domande",
      "dayLabel": "Tappa 3 di 4",
      "teaser": "Fred ha qualche altra domanda per te",
      "greeting": [
        "Ciao, sono di nuovo Fred.",
        "Oggi ti faccio qualche altra domanda {su_attivita}."
      ],
      "greetingIfChange": [
        "Ciao, sono di nuovo Fred. L'ultima volta hai modificato la mappa: {testo}.",
        "Oggi ti faccio qualche altra domanda {su_attivita}."
      ],
      "questions": [
        {
          "id": "cambiamenti",
          "type": "mapChange",
          "text": "Rispetto alla settimana precedente, ci sono dei cambiamenti che vorresti apportare alla mappa?",
          "options": [
            "Sì",
            "No"
          ],
          "askSelect": "Tocca nella mappa il passaggio da cambiare.",
          "askHow": "Descrivi il cambiamento secondo la tua prospettiva."
        },
        {
          "id": "normative",
          "type": "open",
          "text": "A quali normative o documentazione interna aziendale fa riferimento la tua attività?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "precedenti",
          "type": "open",
          "text": "Quali sono le attività precedenti alla tua? Elencale brevemente.",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "successive",
          "type": "open",
          "text": "Quali quelle successive? Elencale brevemente.",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "strategiche",
          "type": "selectSteps",
          "text": "Quali attività, se ce ne sono, tra quelle precedenti e successive sono strategiche per l'attività da te svolta? Indicale nella mappa, poi premi «Fatto».",
          "noneLabel": "Nessuna",
          "doneLabel": "Fatto",
          "followUps": [
            {
              "id": "strategiche-motivo",
              "type": "open",
              "text": "Motiva la tua scelta.",
              "placeholder": "Scrivi qui…"
            }
          ]
        },
        {
          "id": "altri-aspetti",
          "type": "open",
          "optional": true,
          "text": "Ci sono, a tuo avviso, altri aspetti di cui non si è parlato ma che influenzano il processo?",
          "placeholder": "Scrivi qui…"
        }
      ],
      "closing": "Grazie. Venerdì ti mostro lo schema aggiornato.",
      "progress": {
        "done": 2,
        "total": 3,
        "label": "Secondo passaggio fatto"
      },
      "modelFollowUps": false
    },

    venerdi2: {
      "type": "verifica",
      "dayLabel": "Tappa 4 di 4",
      "teaser": "Fred ha uno schema aggiornato da mostrarti",
      "greeting": [
        "Ciao! Ecco lo schema {di_attivita}, aggiornato con le risposte raccolte."
      ],
      "processKey": "process",
      "greetingIfChange": [
        "Ciao! Ecco la mappa {di_attivita} con le modifiche che hai fatto tu."
      ],
      "refineLine": "Con le risposte di mercoledì ho aggiunto: {summary}.",
      "thinkingPrepare": "Fred sta preparando lo schema aggiornato…",
      "thinkingIntegrate": "Fred sta aggiornando lo schema…",
      "reflectIntro": "Quindi, se ho capito, {summary}. Ho aggiornato lo schema così:",
      "reflectAsk": "È così?",
      "askCorrect": "Dimmi cosa correggere.",
      "correctPlaceholder": "Scrivi qui…",
      "fallbackNote": "Ho annotato le tue parole sul passaggio “{passaggio}”, così come le hai scritte.",
      "askSelect": "Tocca nella mappa il passaggio da modificare.",
      "askHow": "Modificalo secondo la tua prospettiva.",
      "howPlaceholder": "Scrivi qui…",
      "thanksFix": "Per {attivita} le domande sono finite.",
      "thanksYes": "Per {attivita} le domande sono finite.",
      "finalQuestion": {
        "id": "aggiunte-finali",
        "type": "open",
        "optional": true,
        "text": "C'è altro che vuoi aggiungere?",
        "placeholder": "Scrivi qui…"
      },
      "approval": true,
      "approvalQuestion": "Conferma la mappa: se c'è qualche errore, modificala secondo la tua prospettiva!",
      "approveLabel": "Confermo",
      "notYetLabel": "Voglio modificarla",
      "approvedText": "Grazie. Lo schema è registrato come confermato da te.",
      "notApprovedText": "Grazie. Ho registrato le tue correzioni.",
      "maxRounds": 3
    },

    alfly: {
      "type": "esplorazione",
      "dayLabel": "Una domanda veloce e riparto!",
      "teaser": "Al Fly ha qualche domanda per te",
      "showScene": true,
      "greeting": [
        "Ciao! Sono Al Fly, il pilota di Al Volo."
      ],
      "intro": "Questa è la mappa {di_attivita}, confermata da te e dai colleghi.",
      // Al Fly è diviso in tappe brevi: ogni riga è una tappa, con gli id delle domande che contiene
      // (le domande di approfondimento seguono la loro domanda). Per raggrupparle, es. [["frequenza", "tempo"], …]
      "tappe": [["frequenza"], ["tempo"], ["attenzione"], ["fermo"], ["inefficienze"]],
      "greetingAgain": ["Ciao, sono di nuovo Al Fly."],
      "closingLast": "Grazie! Per questa mappa le domande sono finite. Riparto.",
      "questions": [
        {
          "id": "frequenza",
          "type": "frequency",
          "text": "Con quale frequenza svolgi l'attività?",
          "units": [
            "al giorno",
            "a settimana",
            "al mese",
            "all'anno"
          ]
        },
        {
          "id": "tempo",
          "type": "selectStep",
          "text": "Quale tra i passaggi richiede più tempo? Indicalo nella mappa.",
          "noneLabel": "Nessuno in particolare",
          "followUps": [
            {
              "id": "tempo-fattori",
              "type": "open",
              "text": "Perché? Quale o quali fattori lo rendono dispendioso in termini di tempo? Descrivi.",
              "placeholder": "Scrivi qui…"
            },
            {
              "id": "tempo-frequenza",
              "type": "choice",
              "text": "Qual è la sua frequenza?",
              "options": [
                "Ogni volta",
                "Spesso",
                "A volte",
                "Raramente"
              ]
            }
          ]
        },
        {
          "id": "attenzione",
          "type": "selectSteps",
          "text": "Quali sono invece i passaggi che meritano maggiore attenzione? Indicali nella mappa, poi premi «Fatto».",
          "noneLabel": "Nessuno",
          "doneLabel": "Fatto",
          "followUps": [
            {
              "id": "attenzione-motivo",
              "type": "open",
              "text": "Motiva la tua scelta.",
              "placeholder": "Scrivi qui…"
            },
            {
              "id": "attenzione-frequenza",
              "type": "choice",
              "text": "Quanto sono frequenti?",
              "options": [
                "Ogni volta",
                "Spesso",
                "A volte",
                "Raramente"
              ]
            }
          ]
        },
        {
          "id": "fermo",
          "type": "selectStep",
          "text": "C'è un punto in cui il lavoro si ferma o si accumula? Indicalo nella mappa.",
          "noneLabel": "Nessuno",
          "followUps": [
            {
              "id": "fermo-fattori",
              "type": "open",
              "text": "Perché? Indica i fattori che secondo te sono dirimenti.",
              "placeholder": "Scrivi qui…"
            }
          ]
        },
        {
          "id": "inefficienze",
          "type": "choice",
          "text": "Ci sono delle inefficienze nel processo?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "Sì": [
              {
                "id": "inefficienze-tipo",
                "type": "multiChoice",
                "text": "Di che tipo?",
                "options": [
                  "Attese",
                  "Passaggi inutili",
                  "Duplicazioni",
                  "Sovraccarichi",
                  "Strumenti inadeguati",
                  "Misurazione insufficiente"
                ],
                "placeholder": "Altro (facoltativo)…",
                "doneLabel": "Fatto"
              }
            ]
          }
        }
      ],
      "closing": "Grazie! Riparto.",
      "character": {
        "id": "alfly",
        "name": "Al Fly"
      }
    },

    // Modalità libera: il ciclo iterativo con il modello linguistico
    libero: {
      type: "libero",
      dayLabel: "Descrivi un processo",
      teaser: "Racconta a Fred come lavori",
      greeting: [
        "Ciao! Raccontami un'attività del tuo lavoro, dall'inizio alla fine, con le parole che preferisci.",
        "Io la trasformo in uno schema. Poi lo guardiamo insieme."
      ],
      firstPlaceholder: "Scrivi qui…",
      refinePlaceholder: "Scrivi cosa correggere o aggiungere…",
      finishLabel: "Ho finito",
      thinkingFirst: "Fred sta disegnando lo schema…",
      thinkingUpdate: "Fred sta aggiornando lo schema…",
      closing: "Grazie. Ho salvato lo schema.",
      errorNetwork: "Non riesco a collegarmi al modello. Questa modalità funziona nell'anteprima di Claude oppure collegata al backend aziendale. Puoi riprovare rimandando il messaggio, oppure continuare con esempi preparati.",
      errorTooLong: "Il processo è troppo lungo per una sola risposta. Prova a descriverne una parte alla volta, poi aggiungiamo il resto.",
      editedNote: "Hai modificato lo schema a mano. Alla prossima richiesta Fred partirà da questa versione.",
      demoButton: "Continua in modalità dimostrativa",
      demoOn: "D'accordo: uso la modalità dimostrativa, con schemi di esempio preparati in anticipo. Rimanda pure il messaggio.",
      errorFormat: "Non sono riuscito a costruire uno schema valido da questa descrizione. Prova a riformularla, magari indicando chi fa ogni passaggio."
    }
  },

  // Tappe della barra della presentazione (in ordine)
  tour: [
    { mode: "mercoledi",  day: "Mer · sett. 1", title: "Prime domande" },
    { mode: "venerdi",    day: "Ven · sett. 1", title: "Verifica dello schema" },
    { mode: "mercoledi2", day: "Mer · sett. 2", title: "Approfondimento" },
    { mode: "venerdi2",   day: "Ven · sett. 2", title: "Approvazione" },
    { mode: "alfly",      day: "Al Fly",        title: "Punti critici" },
    { mode: "libero",     day: "Con AI",        title: "Descrivi un processo" }   // non usata nel pilota
  ],

  privacyNote: "Il tuo nome non viene registrato: le risposte sono legate a un codice di test.",

  process: {
    title: "Richiesta di materiale al magazzino",
    lanes: ["Operatore di linea", "Capo reparto", "Magazzino", "Ufficio acquisti"],
    nodes: [
      { id: "s",  type: "start",    lane: 0, row: 0, status: "confirmed", label: "Si accorge che manca il materiale" },
      { id: "n2", type: "task",     lane: 0, row: 1, status: "variant",   label: "Avvisa il capo reparto",
        note: "Alcune persone avvisano direttamente il magazzino." },
      { id: "n3", type: "task",     lane: 1, row: 2, status: "confirmed", label: "Compila la richiesta di prelievo" },
      { id: "n4", type: "decision", lane: 2, row: 3, status: "confirmed", label: "Materiale disponibile?" },
      { id: "n5", type: "task",     lane: 3, row: 4, status: "confirmed", label: "Apre la richiesta d'acquisto" },
      { id: "n6", type: "task",     lane: 3, row: 5, status: "verify",    label: "Sceglie il fornitore e invia l'ordine" },
      { id: "n7", type: "task",     lane: 2, row: 6, status: "verify",    label: "Riceve e controlla la merce" },
      { id: "n8", type: "task",     lane: 2, row: 7, status: "confirmed", label: "Prepara il materiale" },
      { id: "e",  type: "end",      lane: 0, row: 8, status: "confirmed", label: "Ritira il materiale in reparto" }
    ],
    edges: [
      { from: "s",  to: "n2" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5", label: "No", exit: "right" },
      { from: "n4", to: "n8", label: "Sì", exit: "left", route: "side" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
      { from: "n8", to: "e" }
    ]
  },

  // Schema aggiornato dopo la settimana 2: la variante segnalata dai colleghi diventa un ramo
  // (chi avvisa direttamente il magazzino lo fa quando il capo reparto è assente)
  process2: {
    title: "Richiesta di materiale al magazzino",
    lanes: ["Operatore di linea", "Capo reparto", "Magazzino", "Ufficio acquisti"],
    nodes: [
      { id: "s",  type: "start",    lane: 0, row: 0, status: "confirmed", label: "Si accorge che manca il materiale" },
      { id: "d1", type: "decision", lane: 0, row: 1, status: "confirmed", label: "Capo reparto presente?" },
      { id: "n2", type: "task",     lane: 0, row: 2, status: "confirmed", label: "Avvisa il capo reparto" },
      { id: "n3", type: "task",     lane: 1, row: 3, status: "confirmed", label: "Compila la richiesta di prelievo" },
      { id: "n4", type: "decision", lane: 2, row: 4, status: "confirmed", label: "Materiale disponibile?" },
      { id: "n5", type: "task",     lane: 3, row: 5, status: "confirmed", label: "Apre la richiesta d'acquisto" },
      { id: "n6", type: "task",     lane: 3, row: 6, status: "confirmed", label: "Sceglie il fornitore e invia l'ordine" },
      { id: "n7", type: "task",     lane: 2, row: 7, status: "confirmed", label: "Riceve e controlla la merce" },
      { id: "n8", type: "task",     lane: 2, row: 8, status: "confirmed", label: "Prepara il materiale" },
      { id: "e",  type: "end",      lane: 0, row: 9, status: "confirmed", label: "Ritira il materiale in reparto" }
    ],
    edges: [
      { from: "s",  to: "d1" },
      { from: "d1", to: "n2", label: "Sì" },
      { from: "d1", to: "n4", label: "No, assente", exit: "right" },
      { from: "n2", to: "n3" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5", label: "No", exit: "right" },
      { from: "n4", to: "n8", label: "Sì", exit: "left", route: "side" },
      { from: "n5", to: "n6" },
      { from: "n6", to: "n7" },
      { from: "n7", to: "n8" },
      { from: "n8", to: "e" }
    ]
  },
};
