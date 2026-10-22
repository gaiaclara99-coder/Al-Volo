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
      "dayLabel": "Tappa 2 di 4",
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
      "dayLabel": "Tappa 3 di 4",
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
      "dayLabel": "Tappa 4 di 4",
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
      "approvalQuestion": "Conferma la mappa, se c'è qualche errore modificala secondo la tua prospettiva!",
      "nextMapLine": "Ora la mappa dell'attività «{y}».",
      "approveLabel": "Confermo",
      "notYetLabel": "Voglio modificarla",
      "approvedText": "Grazie. La mappa è registrata come confermata da te.",
      "approvedTextMany": "Grazie. Le mappe sono registrate come confermate da te.",
      "notApprovedText": "Grazie. Ho registrato le tue correzioni.",
      "maxRounds": 3
    },

    alfly: {
      "type": "esplorazione",
      "dayLabel": "Una domanda al giorno",
      "teaser": "Al Fly ha qualche domanda per te",
      "showScene": true,
      "greeting": [
        "Ciao! Sono Al Fly, il pilota di Al Volo."
      ],
      "intro": "Questa mappa unisce le mappe {di_attivita} di {n} colleghi, tu compreso. Il colore dice in quante mappe compare ogni passaggio: verde in quasi tutte, arancio in alcune, rosso in poche.",
      "introOthers": "Questa mappa unisce le mappe {di_attivita} confermate da {n} colleghi. Il colore dice in quante mappe compare ogni passaggio: verde in quasi tutte, arancio in alcune, rosso in poche.",
      "introExample": "Questa è una mappa di esempio: quando i colleghi avranno confermato le loro mappe con Fred, qui vedrai la mappa che le unisce.",
      "introAlone": "Questa è la mappa {di_attivita}. Per ora è l'unica confermata: quando arriveranno quelle dei colleghi, qui le vedrai unite.",
      "thinkingAggregate": "Al Fly sta unendo le mappe dei colleghi…",
      "askEdit": "Vuoi modificare qualcosa in questa mappa?",
      // quota di mappe in cui deve comparire un passaggio per essere verde (alta) o arancio (media); sotto è rosso
      "soglie": { "alta": 0.75, "media": 0.4 },
      // Al Fly è diviso in tappe brevi: ogni riga è una tappa, con gli id delle domande che contiene
      // (le domande di approfondimento seguono la loro domanda). Per raggrupparle, es. [["frequenza", "tempo"], …]
      "tappe": [["frequenza"], ["ripetitive"], ["tempo"], ["delega"], ["attenzione"], ["rischi"], ["inefficienze"]],
      // saluti delle tappe successive alla prima, uno per tappa (si ripetono in giro se le tappe sono di più)
      "greetingAgain": ["Cinture allacciate? Si riparte!", "Torre, qui Al Fly: pronto al decollo!", "Motori accesi, rotta confermata!", "Pista libera, si vola!", "Quota di crociera raggiunta!", "Ultimo controllo prima dell'atterraggio!"],
      // una tappa al giorno: la successiva si apre il giorno dopo
      // APERTO SUBITO per le prove: Al Fly si usa anche senza aver fatto Fred (rimettere false a fine prova)
      "apertoSubito": true,
      "unaAlGiorno": false,   // SBLOCCATO per le prove: rimettere true per una domanda al giorno
      "closingDay": "Grazie! Per oggi è tutto: domani ti faccio la prossima domanda. Riparto.",
      "closingLast": "Grazie! Per questa mappa le domande sono finite. Riparto.",
      "questions": [
        {
          "id": "frequenza",
          "type": "choice",
          "text": "Con quale frequenza svolgi le singole attività?",
          "options": [
            "Più volte al giorno",
            "Ogni giorno",
            "2/3 volte a settimana",
            "1 volta a settimana",
            "1 volta al mese",
            "Altro"
          ],
          "followUpsIf": {
            "Altro": [
              {
                "id": "frequenza-altro",
                "type": "open",
                "text": "Altro: specifica.",
                "placeholder": "Scrivi qui…"
              }
            ]
          }
        },
        {
          "id": "ripetitive",
          "type": "choice",
          "text": "Ci sono attività ripetitive?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "Sì": [
              {
                "id": "ripetitive-quali",
                "type": "selectSteps",
                "text": "Segnalale nella mappa, poi premi «Fatto».",
                "noneLabel": "Nessuna",
                "doneLabel": "Fatto"
              }
            ]
          }
        },
        {
          "id": "tempo",
          "type": "choice",
          "text": "Quanto tempo impieghi a svolgere ciascuna attività?",
          "options": [
            "Poco",
            "Abbastanza",
            "Molto"
          ],
          "followUpsIf": {
            "Molto": [
              {
                "id": "tempo-quali",
                "type": "selectSteps",
                "text": "Indica nella mappa e motiva la tua risposta: tocca le attività, poi premi «Fatto».",
                "noneLabel": "Nessuna",
                "doneLabel": "Fatto",
                "followUps": [
                  {
                    "id": "tempo-quali-motivo",
                    "type": "open",
                    "text": "Motiva la tua risposta.",
                    "placeholder": "Scrivi qui…"
                  }
                ]
              }
            ]
          }
        },
        {
          "id": "delega",
          "type": "choice",
          "text": "Ci sono attività che delegheresti volentieri?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "Sì": [
              {
                "id": "delega-quali",
                "type": "selectSteps",
                "text": "Indicale nella mappa e motiva: tocca le attività, poi premi «Fatto».",
                "noneLabel": "Nessuna",
                "doneLabel": "Fatto",
                "followUps": [
                  {
                    "id": "delega-quali-motivo",
                    "type": "open",
                    "text": "Motiva la tua risposta.",
                    "placeholder": "Scrivi qui…"
                  }
                ]
              }
            ]
          }
        },
        {
          "id": "attenzione",
          "type": "choice",
          "text": "Ci sono attività che richiedono una maggior attenzione?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "Sì": [
              {
                "id": "attenzione-quali",
                "type": "selectSteps",
                "text": "Indicale nella mappa e motiva: tocca le attività, poi premi «Fatto».",
                "noneLabel": "Nessuna",
                "doneLabel": "Fatto",
                "followUps": [
                  {
                    "id": "attenzione-quali-motivo",
                    "type": "open",
                    "text": "Motiva la tua risposta.",
                    "placeholder": "Scrivi qui…"
                  }
                ]
              }
            ]
          }
        },
        {
          "id": "rischi",
          "type": "choice",
          "text": "Ci sono attività che comportano dei rischi?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "Sì": [
              {
                "id": "rischi-quali",
                "type": "selectSteps",
                "text": "Indicale nella mappa, poi premi «Fatto».",
                "noneLabel": "Nessuna",
                "doneLabel": "Fatto"
              },
              {
                "id": "rischi-tipo",
                "type": "multiChoice",
                "text": "Che tipo di rischio pongono?",
                "options": [
                  "Economico",
                  "Procedurale",
                  "Reputazionale"
                ],
                "placeholder": "Altro (facoltativo)…",
                "doneLabel": "Fatto"
              }
            ]
          }
        },
        {
          "id": "inefficienze",
          "type": "choice",
          "text": "Ci sono delle inefficienze o problematiche nel processo che non sono ancora emerse?",
          "options": [
            "Sì",
            "No"
          ],
          "followUpsIf": {
            "Sì": [
              {
                "id": "inefficienze-motivo",
                "type": "open",
                "text": "Motiva (attese, passaggi inutili, duplicazioni, sovraccarichi, strumenti inadeguati, misurazione insufficiente, priorità instabili, altro).",
                "placeholder": "Scrivi qui…"
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

    // Ally Fly: aperta da subito; la persona sceglie un passaggio e risponde ai blocchi A-D
    ally: {
      "type": "ally",
      "dayLabel": "Un passaggio alla volta",
      "teaser": "Ally Fly ha qualche domanda per te",
      "greeting": [
        "Ciao! Sono Ally Fly, pilota di Al Volo.",
        "Guardiamo insieme un passaggio del lavoro: ti faccio qualche domanda su come si svolge. Rispondi con le parole che preferisci."
      ],
      "greetingAgain": [
        "Ally Fly in cabina: ripartiamo!"
      ],
      "thinkingAggregate": "Ally Fly sta preparando la mappa…",
      "askStep": "Quale passaggio vuoi guardare con me? Toccalo nella mappa.",
      "askStepText": "Di quale passaggio del tuo lavoro vuoi parlare? Scrivilo in poche parole.",
      "stepLine": "Parliamo di «{passaggio}».",
      "organizzative": [
        "Dall'attesa di una persona, di un'approvazione o di un altro reparto",
        "Dalla quantità di lavoro rispetto alle persone disponibili",
        "Da come arrivano materiali o oggetti (imballi, consegne, spazi)"
      ],
      "closing": "Grazie! Per questo passaggio le domande sono finite.",
      "againLabel": "Guarda un altro passaggio",
      "blocchi": [
        {
          "id": "A",
          "titolo": "Di che natura è il problema",
          "questions": [
            {
              "id": "A1",
              "type": "multiChoice",
              "text": "Da cosa dipende soprattutto? Puoi scegliere più risposte.",
              "options": [
                "Dal tempo per cercare, ricopiare o controllare informazioni",
                "Dall'attesa di una persona, di un'approvazione o di un altro reparto",
                "Dalla quantità di lavoro rispetto alle persone disponibili",
                "Da come arrivano materiali o oggetti (imballi, consegne, spazi)",
                "Da informazioni poco chiare o incomplete"
              ],
              "placeholder": "Altro…",
              "doneLabel": "Fatto"
            }
          ]
        },
        {
          "id": "B",
          "titolo": "Regole fisse o giudizio",
          "questions": [
            {
              "id": "B1",
              "type": "choice",
              "text": "In questo passaggio si fanno sempre le stesse operazioni, nello stesso ordine?",
              "options": [
                "Sempre",
                "Quasi sempre",
                "Dipende dal caso",
                "Ogni volta è diverso"
              ]
            },
            {
              "id": "B2",
              "type": "choice",
              "text": "Per decidere cosa fare, ti basi su indicazioni scritte (procedure, tabelle, soglie) o sull'esperienza?",
              "options": [
                "Indicazioni scritte",
                "Un po' tutte e due",
                "Soprattutto l'esperienza"
              ]
            },
            {
              "id": "B3",
              "type": "multiChoice",
              "text": "In che forma ti arrivano le informazioni che usi? Puoi scegliere più risposte.",
              "options": [
                "Campi del gestionale o di una tabella",
                "File Excel",
                "Email o messaggi scritti a parole",
                "Documenti PDF o cartacei",
                "Telefonate o a voce",
                "Foto, oggetti o merce da guardare"
              ],
              "placeholder": "Altro (facoltativo)…",
              "doneLabel": "Fatto"
            },
            {
              "id": "B4",
              "type": "choice",
              "text": "A un collega appena arrivato, quanto tempo servirebbe per imparare a farlo bene?",
              "options": [
                "Pochi minuti",
                "Qualche giorno",
                "Settimane o mesi"
              ]
            },
            {
              "id": "B5",
              "type": "choice",
              "text": "Capitano casi fuori dal solito?",
              "options": [
                "Quasi mai",
                "Ogni tanto",
                "Spesso"
              ]
            }
          ]
        },
        {
          "id": "C",
          "titolo": "Obiettivo chiaro",
          "questions": [
            {
              "id": "C1",
              "type": "open",
              "text": "Quando questo passaggio è fatto bene, come te ne accorgi?",
              "placeholder": "Scrivi qui…"
            },
            {
              "id": "C2",
              "type": "choice",
              "text": "Il risultato è sempre dello stesso tipo, ad esempio un modulo compilato, un sì/no o un numero, o cambia ogni volta?",
              "options": [
                "Sempre dello stesso tipo",
                "Cambia"
              ]
            }
          ]
        },
        {
          "id": "D",
          "titolo": "Conseguenze e tempi",
          "questions": [
            {
              "id": "D1",
              "type": "choice",
              "text": "Se in questo passaggio scappa un errore, cosa succede?",
              "options": [
                "Quasi nulla, si sistema subito",
                "Ritardi o lavoro in più",
                "Conseguenze serie (costi, sicurezza, clienti, norme)"
              ]
            },
            {
              "id": "D2",
              "type": "choice",
              "text": "Un errore si scopre facilmente?",
              "options": [
                "Subito",
                "Dopo un po'",
                "Difficilmente"
              ]
            },
            {
              "id": "D3",
              "type": "choice",
              "text": "Quanto tempo c'è, di solito, tra quando arriva la richiesta e quando serve il risultato?",
              "options": [
                "Minuti",
                "Ore",
                "Giorni"
              ]
            },
            {
              "id": "D4",
              "type": "choice",
              "text": "Oggi qualcuno deve dare l'ok finale?",
              "options": [
                "Nessuno",
                "Lo do io",
                "Un'altra persona"
              ]
            },
            {
              "id": "D5",
              "type": "open",
              "text": "Se questo passaggio cambiasse, cosa vorresti che restasse com'è?",
              "placeholder": "Scrivi qui…",
              "optional": true
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
    { mode: "alfly",      day: "Al Fly",        title: "Punti critici" },
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
