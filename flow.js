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
      "dayLabel": "Tappa 1 di 5",
      // una tappa di Fred al giorno (con ?prova nell'indirizzo, tutto di seguito)
      "unaTappaAlGiorno": true,
      "teaser": "Fred ha qualche domanda per te",
      "greeting": [
        "Ciao! Sono Fred Quenza, il radiofonista dell'equipaggio di Al Volo.",
        "Sto raccogliendo informazioni su come si svolge l'attività del procurement, raccontata da chi la vive. Rispondi con le parole che preferisci.",
        "Prima di cominciare: la mappa che costruiremo potrai modificarla in qualsiasi momento, anche dalla pagina dell'equipaggio con «Modifica la tua mappa»."
      ],
      "questions": [
        {
          "id": "racconto",
          "type": "steps",
          "text": "Puoi descrivere {attivita} passaggio per passaggio, dall'inizio alla fine?",
          "hint": "Scrivi un passaggio alla volta e premi Invio: ognuno diventa un riquadro della mappa, con le tue parole.",
          "placeholder": "Passaggio 1…",
          "doneLabel": "Ho finito"
        },
        {
          "id": "persone",
          "type": "open",
          "text": "Quante persone sono coinvolte {in_attivita} e con quali ruoli?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "persone-mappa",
          "type": "assignRoles",
          "text": "Collocale nella mappa: per ogni passaggio, indica chi lo fa.",
          "noneLabel": "Non saprei",
          "placeholder": "Scrivi il ruolo…",
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
          "id": "attivita-focus",
          "type": "pickActivity",
          "text": "Quale delle attività tracciate sopra vuoi approfondire? Seleziona nella mappa.",
          "followUps": [
            {
              "id": "attivita-focus-motivo",
              "type": "open",
              "text": "Perché? Motiva brevemente la risposta.",
              "placeholder": "Scrivi qui…"
            }
          ]
        },
        {
          "id": "racconto-attivita",
          "map": "y",
          "type": "steps",
          "text": "Puoi descrivere l'attività «{y}» passaggio per passaggio, dall'inizio alla fine?",
          "hint": "Scrivi un passaggio alla volta e premi Invio: ognuno diventa un riquadro della mappa, con le tue parole.",
          "placeholder": "Passaggio 1…",
          "doneLabel": "Ho finito"
        },
        {
          "id": "persone-attivita",
          "map": "y",
          "type": "open",
          "text": "Quante persone sono coinvolte in «{y}» e con quali ruoli?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "persone-mappa-attivita",
          "map": "y",
          "type": "assignRoles",
          "text": "Collocale nella mappa: per ogni passaggio, indica chi lo fa.",
          "noneLabel": "Non saprei",
          "placeholder": "Scrivi il ruolo…",
          "doneLabel": "Fatto"
        },
        {
          "id": "variazioni",
          "type": "choice",
          "map": "y",
          "text": "L'attività «{y}» si svolge sempre allo stesso modo?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "No": [
              {
                "id": "variazioni-quali",
                "type": "open",
                "text": "Quali variazioni possono esserci? Elenca. Da cosa dipendono?",
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
      "dayLabel": "Tappa 2 di 5",
      "teaser": "Fred ha uno schema da mostrarti",
      "greeting": [
        "Radio di bordo a rapporto! Ecco la mappa {di_attivita}.",
        "Il processo così mappato è corretto?"
      ],
      "askSelect": "Segnala il passaggio errato e correggi secondo la tua prospettiva: toccalo nella mappa.",
      "nextMapLine": "Ora la mappa dell'attività «{y}».",
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
      "dayLabel": "Tappa 3 di 5",
      "teaser": "Fred ha qualche altra domanda per te",
      "greeting": [
        "Qui Radio di bordo, mi ricevi? Passo.",
        "Riprendiamo da «{focus}»."
      ],
      "greetingIfChange": [
        "Qui Radio di bordo, mi ricevi? Passo. L'ultima volta hai modificato la mappa: {testo}.",
        "Riprendiamo da «{focus}»."
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
          "askWhich": "Quale mappa vuoi cambiare?",
          "whichX": "La mappa {di_attivita}",
          "whichY": "La mappa dell'attività «{y}»",
          "askHow": "Descrivi il cambiamento secondo la tua prospettiva."
        },
        {
          "id": "normative",
          "type": "open",
          "text": "A quali normative/documentazione interna aziendale fa riferimento la tua attività?",
          "placeholder": "Scrivi qui…"
        },
        {
          "id": "precedenti",
          "type": "contextSteps",
          "side": "before",
          "text": "Quali sono le attività precedenti alla tua? Elenca brevemente.",
          "hint": "Scrivi un'attività alla volta e premi Invio: le aggiungo alla mappa, prima dell'inizio.",
          "placeholder": "Attività 1…",
          "noneLabel": "Nessuna",
          "doneLabel": "Fatto"
        },
        {
          "id": "successive",
          "type": "contextSteps",
          "side": "after",
          "text": "Quali quelle successive? Elenca brevemente.",
          "hint": "Scrivi un'attività alla volta e premi Invio: le aggiungo alla mappa, dopo la fine.",
          "placeholder": "Attività 1…",
          "noneLabel": "Nessuna",
          "doneLabel": "Fatto"
        },
        {
          "id": "critiche",
          "type": "selectSteps",
          "text": "Quali attività, se ce ne sono, tra quelle precedenti e successive sono critiche* per l'attività da te svolta? Indicale nella mappa e premi «Fatto», poi motiva.",
          "note": "* È critica un'attività le cui inefficienze producono conseguenze rilevanti sull'efficacia, sui tempi, sui costi, sulla qualità o sulla continuità del processo considerato.",
          "noneLabel": "Nessuna",
          "doneLabel": "Fatto",
          "followUps": [
            {
              "id": "critiche-motivo",
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
      "dayLabel": "Tappa 4 di 5",
      "teaser": "Fred ha uno schema aggiornato da mostrarti",
      "greeting": [
        "Contatto radio ristabilito! Ecco la mappa {di_attivita}."
      ],
      "processKey": "process",
      "greetingIfChange": [
        "Contatto radio ristabilito! Ecco la mappa {di_attivita} con le modifiche che hai fatto tu."
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
      "thanksFix": "Per la tua mappa le domande sono finite. Manca solo l'ultima tappa, da domani.",
      "thanksYes": "Per la tua mappa le domande sono finite. Manca solo l'ultima tappa, da domani.",
      "finalQuestion": {
        "id": "aggiunte-finali",
        "type": "open",
        "optional": true,
        "text": "C'è altro che vuoi aggiungere?",
        "placeholder": "Scrivi qui…"
      },
      "approval": true,
      "approvalQuestion": "Conferma la mappa, se c'è qualche errore modificala secondo la tua prospettiva!",
      "nextMapLine": "Ora la mappa dell'attività «{y}».",
      "approveLabel": "Confermo",
      "notYetLabel": "Voglio modificarla",
      "approvedText": "Grazie. La mappa è registrata come confermata da te.",
      "approvedTextMany": "Grazie. Le mappe sono registrate come confermate da te.",
      "notApprovedText": "Grazie. Ho registrato le tue correzioni.",
      "maxRounds": 3
    },

    // Tappa 5 di Fred: in un giorno separato, una persona per ufficio scrive la mappa concordata; Al Fly parte da quella
    concordata: {
      "type": "concordata",
      "dayLabel": "Tappa 5 di 5",
      "teaser": "Fred ha l'ultima tappa per te",
      "greeting": [
        "Radio di bordo, ultima chiamata!",
        "Questa è l'ultima tappa: la mappa {di_attivita} concordata con il tuo ufficio o la tua divisione."
      ],
      "askWho": "Sei tu la persona che scrive, per il tuo ufficio o la tua divisione, la mappa concordata con i colleghi?",
      "whoYes": "Sì, la scrivo io",
      "whoNo": "No",
      "closingNo": "Va bene: la scriverà la persona indicata dal tuo ufficio. Grazie, con Fred hai finito!",
      "steps": {
        "id": "concordata-racconto",
        "type": "steps",
        "text": "Scrivi la mappa {di_attivita} così come l'avete concordata in ufficio: un passaggio alla volta, dall'inizio alla fine.",
        "hint": "Scrivi un passaggio alla volta e premi Invio: ognuno diventa una fermata della mappa, con le vostre parole.",
        "placeholder": "Passaggio 1…",
        "doneLabel": "Ho finito"
      },
      "roles": {
        "id": "concordata-ruoli",
        "type": "assignRoles",
        "text": "Per ogni passaggio, indica chi lo fa.",
        "noneLabel": "Non saprei",
        "placeholder": "Scrivi il ruolo…",
        "doneLabel": "Fatto"
      },
      "approveText": "Ecco la mappa concordata. È corretta? Se c'è qualche errore, modificala.",
      "approveLabel": "Confermo",
      "notYetLabel": "Voglio modificarla",
      "maxRounds": 5,
      "askSelect": "Tocca nella mappa il passaggio da modificare.",
      "closing": "Grazie! La mappa concordata è registrata: Al Fly partirà da questa per le sue domande.",
      "giornoSeparato": true
    },

    // Fred finito: toccando la scheda si vedono la propria mappa e quella concordata
    mappe: {
      "type": "vediMappe",
      "dayLabel": "Le tue mappe",
      "teaser": "Le tue mappe",
      "greeting": [
        "Radio di bordo in ascolto: ecco le mappe."
      ],
      "ownLine": "Questa è la tua mappa {di_attivita}.",
      "ownYLine": "E questa è la tua mappa dell'attività «{y}».",
      "thinking": "Fred cerca la mappa concordata…",
      "concLine": "Questa è la mappa concordata dal tuo ufficio, compilata dal o dalla responsabile.",
      "concNone": "La mappa concordata dal tuo ufficio non è ancora stata compilata: quando il o la responsabile l'avrà scritta, la troverai qui."
    },

    alfly: {
      "type": "analisi",
      "dayLabel": "Una domanda al giorno",
      "teaser": "Al Fly ha qualche domanda per te",
      "showScene": true,
      "greeting": [
        "Ciao! Sono Al Fly, il pilota di Al Volo."
      ],
      "intro": "Questa mappa unisce le mappe {di_attivita} di {n} colleghi, tu compreso. Il colore dice in quante mappe compare ogni passaggio: verde in quasi tutte, arancio in alcune, rosso in poche.",
      "waitConcordata": "La mappa concordata dal tuo ufficio non c'è ancora. Torna quando il o la responsabile l'avrà compilata!",
      "introConcordata": "Questa è la mappa {di_attivita} concordata dal tuo ufficio. Partiamo da qui per guardarla più da vicino.",
      "introOthers": "Questa mappa unisce le mappe {di_attivita} confermate da {n} colleghi. Il colore dice in quante mappe compare ogni passaggio: verde in quasi tutte, arancio in alcune, rosso in poche.",
      "introExample": "Questa è una mappa di esempio: quando i colleghi avranno confermato le loro mappe con Fred, qui vedrai la mappa che le unisce.",
      "introAlone": "Questa è la mappa {di_attivita}. Per ora è l'unica confermata: quando arriveranno quelle dei colleghi, qui le vedrai unite.",
      "thinkingAggregate": "Al Fly sta preparando la mappa concordata…",
      "askEdit": "Vuoi modificare qualcosa in questa mappa?",
      // quota di mappe in cui deve comparire un passaggio per essere verde (alta) o arancio (media); sotto è rosso
      "soglie": { "alta": 0.75, "media": 0.4 },
      // Al Fly è diviso in tappe brevi: ogni riga è una tappa, con gli id delle domande che contiene
      // (le domande di approfondimento seguono la loro domanda). Per raggrupparle, es. [["frequenza", "tempo"], …]
      // Al Fly: 6 domande, una al giorno. Le domande 1 e 2 riguardano solo le attività della persona.
      "tappe": [["frequenza"], ["tempo"], ["attenzione"], ["rischi"], ["attese"], ["inefficienze"]],
      // saluti delle tappe successive alla prima (si ripetono in giro)
      "greetingAgain": ["Cinture allacciate? Si riparte!", "Torre, qui Al Fly: pronto al decollo!", "Motori accesi, rotta confermata!", "Pista libera, si vola!", "Quota di crociera raggiunta!"],
      // Al Fly si apre dopo Fred (con la mappa concordata); per le prove usare l'indirizzo con ?prova
      "apertoSubito": false,
      "unaAlGiorno": true,    // una domanda al giorno (con ?prova nell'indirizzo, tutto di seguito)
      "closingDay": "Grazie! Per oggi è tutto: domani ti faccio la prossima domanda. Riparto.",
      "closing": "Grazie! Riparto.",
      "closingLast": "Grazie! Ecco la tua mappa completa: forme, misure, colori e segni raccontano le tue risposte. Riparto!",
      "mapUpdated": "Ecco la mappa aggiornata con le tue risposte.",
      "mie": "Prima di cominciare: tocca nella mappa le attività che svolgi tu, poi premi «Fatto». Le domande riguarderanno solo queste.",
      "q": {
        "frequenza": { "text": "Con quale frequenza svolgi le singole attività?", "each": "«{passaggio}»",
          "options": ["Più volte al giorno", "Ogni giorno", "2/3 volte a settimana", "1 volta a settimana", "1 volta al mese", "Altro"],
          "altro": "Altro: specifica la frequenza di «{passaggio}»." },
        "tempo": { "text": "Quanto tempo impieghi a svolgere ciascuna attività?", "each": "«{passaggio}»",
          "options": ["Poco", "Abbastanza", "Molto"],
          "motiva": "Hai indicato che «{passaggio}» richiede molto tempo: motiva la tua risposta." },
        "attenzione": { "text": "Ci sono attività che richiedono una maggior attenzione?", "select": "Indicale nella mappa, poi premi «Fatto».", "motiva": "Motiva la tua risposta." },
        "rischi": { "text": "Ci sono attività che comportano dei rischi?", "select": "Indicale nella mappa, poi premi «Fatto».",
          "tipo": "Che tipo di rischio pone «{passaggio}»? Puoi scegliere più risposte.", "tipi": ["Economico", "Procedurale", "Reputazionale"] },
        "attese": { "text": "Ti capita di aspettare informazioni, decisioni o passaggi per poter svolgere l'attività?", "select": "Indica l'attività nella mappa, poi premi «Fatto».", "specifica": "Specifica: cosa aspetti, e da chi?" },
        "inefficienze": { "text": "Ci sono delle inefficienze o problematiche nel processo che non sono ancora emerse?", "select": "Indica l'attività nella mappa, poi premi «Fatto».",
          "motiva": "Motiva (attese, passaggi inutili, duplicazioni, sovraccarichi, strumenti inadeguati, misurazione insufficiente, priorità instabili, altro)." }
      },
      // frequenza → forma del riquadro (alta = quadrato, media = rombo, bassa = cerchio; "Altro" = forma normale)
      "frequenzaLivello": { "Più volte al giorno": "alta", "Ogni giorno": "media", "2/3 volte a settimana": "media", "1 volta a settimana": "bassa", "1 volta al mese": "bassa" },
      "character": {
        "id": "alfly",
        "name": "Al Fly"
      }
    },

    // Ally Fly: aperta da subito; la persona sceglie un passaggio e risponde ai blocchi A-D
    // Ally Fly: dopo Al Fly, tre blocchi (uno al giorno) sulle attività critiche emerse con Al Fly
    ally: {
      "type": "allyBlocchi",
      "dayLabel": "Blocco 1 di 3",
      "teaser": "Ally Fly ha qualche domanda per te",
      "greeting": [
        "Ciao! Sono Ally Fly, pilota di Al Volo.",
        "Ripartiamo dalla mappa di Al Fly per guardare da vicino le attività critiche. Rispondi con le parole che preferisci."
      ],
      "greetingAgain": [
        "Ally Fly in cabina: ripartiamo!",
        "Torre, qui Ally Fly: pronta al decollo!"
      ],
      "unBloccoAlGiorno": true,
      "closingDay": "Grazie! Per oggi è tutto: domani il prossimo blocco. Riparto.",
      "closingLast": "Grazie! Le domande di Ally Fly sono finite. Riparto!",
      "elenco": "Dal passaggio precedente risulta che le attività {elenco} presentano delle possibili criticità.",
      "nessuna": "Dal passaggio precedente non sono emerse attività critiche.",
      "blocchi": [
        {
          "id": "B1",
          "titolo": "La priorità delle criticità e i legami tra loro",
          "domande": [
            {
              "id": "B1-1",
              "type": "conferma",
              "text": "Le confermi?",
              "options": [
                "Sì",
                "No"
              ],
              "seNo": "Cosa correggeresti?"
            },
            {
              "id": "B1-2",
              "type": "sinoMappa",
              "text": "Ci sono altre criticità che vorresti aggiungere o di cui vorresti parlare?",
              "options": [
                "Sì",
                "No"
              ],
              "select": "Indicale nella mappa, poi premi «Fatto».",
              "poi": "Di cosa vorresti parlare?",
              "aggiunge": true
            },
            {
              "id": "B1-3",
              "type": "sinoMappa",
              "text": "Le criticità evidenziate influiscono su altre attività?",
              "options": [
                "Sì",
                "No",
                "Non so"
              ],
              "select": "Quali? Indicale nella mappa, poi premi «Fatto».",
              "poi": "Perché?"
            },
            {
              "id": "B1-4",
              "type": "sinoTesto",
              "text": "Le criticità dipendono da un problema a monte?",
              "options": [
                "Sì",
                "No",
                "Non lo so"
              ],
              "seSi": "Quale?"
            },
            {
              "id": "B1-5",
              "type": "perCriticita",
              "text": "Segna quali criticità osservi direttamente e quali invece ti sono riportate da altri.",
              "options": [
                "La osservo direttamente",
                "Mi è riportata da altri"
              ]
            }
          ]
        },
        {
          "id": "B2",
          "titolo": "Le cause",
          "domande": [
            {
              "id": "B2-1",
              "type": "open",
              "text": "Pensando alle attività critiche, descrivi un caso recente in cui si è verificata una criticità: cosa doveva succedere, cosa è successo e con quali conseguenze?"
            },
            {
              "id": "B2-2",
              "type": "lista",
              "text": "Quali sono, secondo te, i fattori che hanno causato la criticità? Elenca.",
              "hint": "Scrivi un fattore alla volta e premi Invio."
            },
            {
              "id": "B2-3",
              "type": "multi",
              "text": "Qual è la natura di questi fattori? Puoi scegliere più risposte.",
              "options": [
                "Persone: cosa impedisce di lavorare bene",
                "Organizzazione: ruoli, responsabilità, coordinamento e decisioni",
                "Processo: procedure",
                "Strumenti: tecnologie e risorse utilizzate",
                "Dati: informazioni incomplete o difficili da reperire",
                "Contesto: norme, fornitori, clienti e condizioni esterne",
                "Non so"
              ],
              "placeholder": "Altro: specifica…"
            },
            {
              "id": "B2-4",
              "type": "open",
              "text": "Quanti casi «problematici» di questo tipo gestisci, indicativamente, in una settimana o in un mese?",
              "placeholder": "Es. 5 a settimana"
            }
          ]
        },
        {
          "id": "B3",
          "titolo": "Regole fisse o giudizio",
          "domande": [
            {
              "id": "B3-1",
              "type": "choice",
              "text": "In queste attività si fanno sempre le stesse operazioni, nello stesso ordine?",
              "options": [
                "Sempre",
                "Quasi sempre",
                "Dipende dal caso",
                "Ogni volta è diverso"
              ]
            },
            {
              "id": "B3-2",
              "type": "stima",
              "text": "Su circa 100 casi, quanti richiedono un trattamento diverso?",
              "options": [
                "Non so"
              ],
              "placeholder": "Scrivi un numero…",
              "poi": "Quali sono le eccezioni più frequenti?"
            },
            {
              "id": "B3-3",
              "type": "choice",
              "text": "Per decidere cosa fare, ti basi su indicazioni scritte (procedure, tabelle, soglie) o sull'esperienza?",
              "options": [
                "Indicazioni scritte",
                "Un po' tutte e due",
                "Soprattutto l'esperienza"
              ]
            },
            {
              "id": "B3-4",
              "type": "open",
              "text": "Le istruzioni coprono i casi abituali? Puoi descrivere una decisione che richiede esperienza e quali informazioni usi?"
            },
            {
              "id": "B3-5",
              "type": "sinoTesto",
              "text": "Quando inizi, hai tutte le informazioni necessarie? Sono corrette, aggiornate e coerenti?",
              "options": [
                "Sì",
                "No"
              ],
              "seNo": "Cosa manca di solito? Specifica."
            },
            {
              "id": "B3-6",
              "type": "multi",
              "text": "In che forma ti arrivano le informazioni che usi? Puoi scegliere più risposte.",
              "options": [
                "Campi del gestionale o di una tabella",
                "File Excel",
                "Email o messaggi scritti a parole",
                "Documenti PDF o cartacei",
                "Telefonate o a voce",
                "Foto, oggetti o merce da guardare"
              ],
              "placeholder": "Altro (facoltativo)…"
            },
            {
              "id": "B3-7",
              "type": "open",
              "text": "Quali dati e accessi ti servono? Chi ne autorizza l'uso?"
            },
            {
              "id": "B3-8",
              "type": "open",
              "text": "Dove sono conservati (se lo sono) i casi precedenti, i documenti e i risultati?"
            },
            {
              "id": "B3-9",
              "type": "sinoTesto",
              "text": "Esistono esempi corretti e casi problematici che si potrebbero usare per una verifica?",
              "options": [
                "Sì",
                "No",
                "Non so"
              ],
              "seSi": "Quali, e dove si trovano?"
            },
            {
              "id": "B3-10",
              "type": "open",
              "text": "In base a quali criteri il risultato viene approvato? Chi lo verifica? Esiste un esempio corretto?"
            },
            {
              "id": "B3-11",
              "type": "choice",
              "text": "Il risultato è sempre dello stesso tipo, ad esempio un modulo compilato, un sì/no o un numero, o cambia ogni volta?",
              "options": [
                "Sempre dello stesso tipo",
                "Cambia"
              ]
            },
            {
              "id": "B3-12",
              "type": "errori",
              "text": "Quali errori possono verificarsi, e con quali conseguenze? Elenca gli errori possibili.",
              "hint": "Scrivi un errore alla volta, con la sua conseguenza, e premi Invio.",
              "gravita": "Quanto è grave la conseguenza di «{errore}»?",
              "livelli": [
                "Trascurabile",
                "Media",
                "Grave"
              ],
              "ordinati": "Ecco gli errori in ordine di gravità:",
              "piuGrave": "Il più grave che hai indicato è: «{errore}»."
            },
            {
              "id": "B3-13",
              "type": "choice",
              "text": "Un errore si scopre facilmente?",
              "options": [
                "Sì, subito",
                "Dopo un po'",
                "Difficilmente"
              ]
            },
            {
              "id": "B3-14",
              "type": "open",
              "text": "Chi può accorgersene, con quale controllo o azione?"
            },
            {
              "id": "B3-15",
              "type": "open",
              "text": "Quanto tempo richiede il controllo?"
            },
            {
              "id": "B3-16",
              "type": "choice",
              "text": "Si perde meno tempo a correggere il problema o a rifare la procedura da capo?",
              "options": [
                "A correggere il problema",
                "A rifare da capo",
                "Non so"
              ]
            },
            {
              "id": "B3-17",
              "type": "open",
              "text": "Quali soluzioni hai già provato? Con quale risultato?"
            },
            {
              "id": "B3-18",
              "type": "open",
              "text": "Secondo te, quale cambiamento nel processo o negli strumenti potrebbe risolvere il problema?"
            }
          ]
        }
      ],
      "character": {
        "id": "ally",
        "name": "Ally Fly"
      }
    },

    // La persona riapre la sua mappa quando vuole, dalla pagina dell'equipaggio
    modifica: {
      "type": "modifica",
      "dayLabel": "La tua mappa",
      "teaser": "Modifica la tua mappa",
      "greeting": ["Radio di bordo in ascolto: ecco la tua mappa."],
      "askWhich": "Quale mappa vuoi modificare?",
      "whichX": "La mappa {di_attivita}",
      "whichY": "La mappa dell'attività «{y}»",
      "askSelect": "Tocca nella mappa il passaggio da modificare.",
      "closing": "Fatto: la mappa è aggiornata.",
      "closingNone": "Va bene, la mappa resta com'è."
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
    { mode: "concordata", day: "Ultima tappa",  title: "Mappa concordata" },
    { mode: "alfly",      day: "Al Fly",        title: "Punti critici" },
    { mode: "ally",       day: "Ally Fly",      title: "Le criticità" },
    { mode: "libero",     day: "Con AI",        title: "Descrivi un processo" }   // non usata nel pilota
  ],

  privacyNote: "Il tuo nome non viene registrato: le risposte sono legate a un codice di test.",

  process: {
    title: "Processo del procurement",
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
    title: "Processo del procurement",
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
