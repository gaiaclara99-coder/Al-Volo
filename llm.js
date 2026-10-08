/* =====================================================================
   COLLEGAMENTO AL MODELLO LINGUISTICO
   ---------------------------------------------------------------------
   Il modello riceve: lo schema attuale (JSON) + la richiesta dell'utente.
   Restituisce: lo schema aggiornato (JSON) + una breve risposta di Fred.
   Il JSON viene controllato; se non è valido si chiede al modello di
   correggerlo una volta.

   SCELTA DEL MODELLO: CONFIG.provider
   - "anthropic": Claude. Nell'anteprima di Claude (claude.ai) funziona
                  così com'è, senza chiave.
   - "gemini":    Gemini (es. gemini-2.5-pro) passando da un backend
                  aziendale che aggiunge la chiave e inoltra la richiesta
                  a Google. Indirizzo in CONFIG.gemini.endpoint.
   - "backend":   un backend aziendale qualsiasi (anche con un modello
                  on-premise). Riceve {system, messages}, restituisce {text}.
   - "demo":      nessun modello: risposte dimostrative preparate, per
                  presentare il mock-up senza connessione.
   La chiave API non va MAI messa in questo file.
   ===================================================================== */

window.FredLLM = (function () {
  const CONFIG = {
    provider: "anthropic",
    defaultProvider: "anthropic", // a cui si torna con "Ricomincia" nella barra della presentazione
    maxHistory: 6, // quanti messaggi precedenti dell'utente passare al modello
    anthropic: {
      endpoint: "https://api.anthropic.com/v1/messages",
      model: "claude-sonnet-4-6",
      maxTokens: 1000
    },
    gemini: {
      endpoint: "/api/gemini",   // backend che inoltra a generativelanguage.googleapis.com
      model: "gemini-2.5-pro",
      maxTokens: 8192            // per Gemini 2.5 il limite comprende anche il "ragionamento"
    },
    backend: {
      endpoint: "/api/fred"
    }
  };

  const SYSTEM = [
    "Sei Fred Quenza, il radiofonista dell'equipaggio di Al Volo. Aiuti i dipendenti di un'azienda a descrivere i loro processi di lavoro, che tu trasformi in uno schema.",
    "Ricevi lo schema attuale (oppure nessuno, se è la prima descrizione) e un messaggio dell'utente: una descrizione del processo o una correzione.",
    "Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo e senza backtick, con questa forma:",
    '{"reply":"...","process":{"title":"...","lanes":["..."],"nodes":[{"id":"n1","type":"start","lane":0,"label":"..."}],"edges":[{"from":"n1","to":"n2"}]}}',
    "Regole:",
    "- title: nome breve del processo, in italiano.",
    "- lanes: gli attori (ruoli, uffici o sistemi, mai nomi di persone), al massimo 6, nell'ordine in cui entrano in gioco.",
    "- nodes: al massimo 16. type è uno tra start (esattamente uno), end (almeno uno), task, decision. lane è l'indice dell'attore che svolge il passaggio.",
    "- label: al massimo 6 parole, in italiano. Per i task usa un verbo al presente in terza persona (es. \"Compila la richiesta\"). Le decision sono domande che finiscono con il punto interrogativo.",
    "- edges: from e to sono id di nodi esistenti. Ogni decision ha almeno due uscite, ciascuna con label (es. \"Sì\" e \"No\"). I cicli (rifacimenti, ripetizioni) sono ammessi.",
    "- status: scrivi \"verify\" solo per i passaggi che hai dedotto tu per completare il flusso; ometti status per quelli detti dall'utente.",
    "- label degli edges: solo quando serve (uscite delle decision); altrimenti omettila.",
    "- Se lo schema attuale è stato modificato a mano dall'utente, rispetta quelle modifiche: sono la versione corretta.",
    "- Se c'è già uno schema, applica la correzione modificandolo, senza riscriverlo da zero. Mantieni gli id dei nodi che non cambiano.",
    "- reply: da 1 a 3 frasi in italiano, tono cordiale e semplice. Di' cosa hai disegnato o cambiato, senza commentare né valutare quello che l'utente ha raccontato. Se manca un'informazione, fai UNA sola domanda di chiarimento, aperta e neutra, che riprenda le sue parole (vedi le regole sulle domande).",
    "- Se il messaggio non descrive un processo di lavoro, lascia lo schema com'è e nella reply chiedi gentilmente di descriverne uno.",
    "- Non sostituire mai una condizione o un passaggio descritto dall'utente con uno diverso o inventato: usa le sue parole. Se qualcosa non è chiaro, chiedilo nella reply invece di indovinare.",
    "- Usa id brevi (n1, n2...) e niente spazi superflui nel JSON.",
    "Regole per QUALSIASI domanda o commento rivolto all'utente:",
    "- Non suggerire risposte: non nominare niente che l'utente non abbia nominato (problemi, attese, errori, ritardi, miglioramenti, cause).",
    "- Nessun giudizio e nessuna valutazione: niente aggettivi come bene, male, ottimo, giusto, sbagliato, semplice, difficile, efficiente; niente complimenti.",
    "- Nessuna aspettativa: niente \"dovresti\", \"bisogna\", \"sarebbe meglio\", niente soluzioni proposte.",
    "- Mai \"perché\" o \"come mai\": possono suonare come una richiesta di giustificazione.",
    "- Riprendi le parole esatte dell'utente, tra virgolette basse, e usa strutture neutre come: «E quando succede «...», cosa succede?», «E poi cosa succede?», «Che tipo di ... è «...»?», «C'è altro, su «...»?», «Da dove arriva «...»?»."
  ].join("\n");

  function buildPrompt(current, history, text, editedByHand) {
    const prev = history.slice(-CONFIG.maxHistory - 1, -1);
    return [
      editedByHand ? "SCHEMA ATTUALE (modificato a mano dall'utente nell'editor):" : "SCHEMA ATTUALE:",
      current ? JSON.stringify(stripLayout(current)) : "nessuno, è la prima descrizione",
      "",
      "MESSAGGI PRECEDENTI DELL'UTENTE:",
      prev.length ? prev.map((m, i) => (i + 1) + ". " + m).join("\n") : "nessuno",
      "",
      "NUOVO MESSAGGIO DELL'UTENTE:",
      text
    ].join("\n");
  }

  // Al modello passiamo solo il contenuto, non i dati di impaginazione
  function stripLayout(p) {
    return {
      title: p.title,
      lanes: p.lanes,
      nodes: p.nodes.map((n) => ({ id: n.id, type: n.type, lane: n.lane, label: n.label, status: n.status })),
      edges: p.edges.map((e) => ({ from: e.from, to: e.to, label: e.label || "" }))
    };
  }

  /* ---------------- adattatori per i diversi fornitori ---------------- */
  async function post(url, body) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (err) {
      throw new FredError("rete", "Connessione non riuscita: " + (err && err.message));
    }
    if (!res.ok) throw new FredError("rete", "Il servizio ha risposto con errore " + res.status);
    try { return await res.json(); }
    catch (err) { throw new FredError("rete", "Risposta del servizio non leggibile"); }
  }

  const PROVIDERS = {
    anthropic: async (messages) => {
      const c = CONFIG.anthropic;
      const data = await post(c.endpoint, { model: c.model, max_tokens: c.maxTokens, system: SYSTEM, messages: messages });
      const text = (data.content || []).map((x) => (x.type === "text" ? x.text : "")).join("");
      if (data.stop_reason === "max_tokens") throw new FredError("lungo", "Risposta troncata", text);
      return text;
    },
    gemini: async (messages) => {
      const c = CONFIG.gemini;
      const data = await post(c.endpoint, {
        model: c.model,
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: c.maxTokens }
      });
      const cand = (data.candidates || [])[0] || {};
      const text = ((cand.content || {}).parts || []).map((p) => p.text || "").join("");
      if (cand.finishReason === "MAX_TOKENS") throw new FredError("lungo", "Risposta troncata", text);
      return text;
    },
    backend: async (messages) => {
      const data = await post(CONFIG.backend.endpoint, { system: SYSTEM, messages: messages });
      return String(data.text || "");
    },
    demo: async (messages) => {
      await new Promise((r) => setTimeout(r, 900));
      // nella modalità dimostrativa l'integrazione non è possibile: l'app usa l'annotazione locale
      if (messages[0].content.indexOf("ISTRUZIONI SPECIALI") >= 0) throw new FredError("rete", "Modalità dimostrativa: integrazione non disponibile");
      const first = messages[0].content.indexOf("nessuno, è la prima descrizione") >= 0;
      return JSON.stringify(first ? DEMO[0] : DEMO[1]);
    }
  };

  async function call(messages) {
    const fn = PROVIDERS[CONFIG.provider];
    if (!fn) throw new FredError("rete", "Fornitore sconosciuto: " + CONFIG.provider);
    return fn(messages);
  }

  function parse(text) {
    const clean = text.replace(/```json|```/g, "").trim();
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    if (a < 0 || b < a) throw new Error("nessun oggetto JSON nella risposta");
    return JSON.parse(clean.slice(a, b + 1));
  }

  // Controlla e ripulisce il JSON. Restituisce l'elenco dei problemi.
  function validate(obj) {
    const problems = [];
    if (!obj || typeof obj !== "object") return ["la risposta non è un oggetto"];
    const p = obj.process;
    if (!p || !Array.isArray(p.lanes) || !Array.isArray(p.nodes) || !Array.isArray(p.edges)) {
      return ["manca process con lanes, nodes ed edges"];
    }
    p.title = String(p.title || "Processo");
    p.lanes = p.lanes.map((l) => String(l)).slice(0, 8);
    if (!p.lanes.length) problems.push("lanes è vuoto");
    const ids = new Set();
    const types = ["start", "end", "task", "decision"];
    p.nodes.forEach((n, i) => {
      if (!n || !n.id) { problems.push("il nodo " + i + " non ha id"); return; }
      n.id = String(n.id);
      if (ids.has(n.id)) problems.push("id ripetuto: " + n.id);
      ids.add(n.id);
      if (types.indexOf(n.type) < 0) problems.push("tipo non valido nel nodo " + n.id);
      n.lane = parseInt(n.lane, 10);
      if (!(n.lane >= 0 && n.lane < p.lanes.length)) problems.push("lane non valida nel nodo " + n.id);
      n.label = String(n.label || "").trim();
      if (!n.label) problems.push("label vuota nel nodo " + n.id);
      if (["confirmed", "verify", "variant"].indexOf(n.status) < 0) n.status = "confirmed";
    });
    if (!p.nodes.some((n) => n.type === "start")) problems.push("manca il nodo start");
    if (!p.nodes.some((n) => n.type === "end")) problems.push("manca almeno un nodo end");
    p.edges.forEach((e, i) => {
      if (!e || !ids.has(String(e.from)) || !ids.has(String(e.to))) problems.push("il collegamento " + i + " punta a nodi inesistenti");
      else { e.from = String(e.from); e.to = String(e.to); e.label = e.label ? String(e.label) : ""; }
    });
    obj.reply = String(obj.reply || "Ecco lo schema.");
    return problems;
  }

  /* ------------------------------------------------------------------
     INTEGRAZIONE DI UNA CORREZIONE DEL DIPENDENTE (tappe del venerdì)
     info = { kind: "fix",    node: "etichetta del passaggio", text: "parole del dipendente" }
          | { kind: "refine", text: "risposte di approfondimento" }
     Restituisce { process, summary, followUps }:
     - summary: riformulazione fedele di ciò che ha detto il dipendente
       (seconda persona, iniziale minuscola, senza punto finale), oppure
       "" se nello schema non è cambiato niente;
     - followUps: due domande aperte per approfondire proprio quel caso.
     ------------------------------------------------------------------ */
  const INTEGRATE_RULES = [
    "ISTRUZIONI SPECIALI PER QUESTA RICHIESTA (prevalgono sulle regole sul campo reply):",
    "Rispondi SOLO con un oggetto JSON di questa forma: {\"summary\":\"...\",\"followUps\":[\"...\",\"...\"],\"process\":{...}}",
    "- Integra nello schema ESATTAMENTE quello che ha detto il dipendente. Non generalizzare, non cambiare la condizione, non sostituirla con una condizione diversa o inventata.",
    "  Esempio: se dice \"contatto il magazzino direttamente solo quando il capo reparto è in vacanza o malato\", la decisione è \"Capo reparto presente?\" (oppure \"Capo reparto assente?\"), con il ramo verso il magazzino per il caso di assenza. NON \"È urgente?\".",
    "- Usa il più possibile le sue parole nelle etichette. Mantieni invariati gli id e i passaggi che non c'entrano con la correzione.",
    "- I nuovi passaggi detti dal dipendente hanno status confermato (ometti status); usa \"verify\" solo per ciò che aggiungi tu per collegare il flusso.",
    "- summary: una frase in seconda persona singolare che riformula fedelmente ciò che ha detto, con l'iniziale minuscola e senza punto finale, massimo 25 parole (es. \"quando il capo reparto è in vacanza o malato, avvisi direttamente il magazzino\"). Se le sue parole non cambiano lo schema, summary è una stringa vuota.",
    "- followUps: due domande aperte e brevi sul caso che ha descritto, in italiano, dando del tu. Ogni domanda riprende tra virgolette basse le sue parole esatte e segue le regole sulle domande: niente presupposizioni, niente giudizi, niente perché. Esempio, se ha scritto «solo se il capo è in vacanza o malato»: «E quando il capo è «in vacanza o malato», cosa succede?» e «C'è altro, su «solo se il capo è in vacanza o malato»?». NON: «Chi lo sostituisce?» (presuppone un sostituto), NON: «È un problema?» (presuppone un problema)."
  ].join("\n");

  async function integrate(current, info) {
    const parts = [
      "SCHEMA ATTUALE:",
      JSON.stringify(stripLayout(current)),
      ""
    ];
    if (info.kind === "fix") {
      parts.push("Il dipendente ha guardato lo schema e ha detto che il passaggio \"" + info.node + "\" per lui va in modo diverso. Ha spiegato con queste parole:");
    } else {
      parts.push("Il dipendente ha risposto a domande di approfondimento su una correzione che aveva già segnalato. Aggiorna lo schema solo se le risposte aggiungono informazioni sul processo; summary deve dire solo cosa hai aggiunto. Le sue risposte:");
    }
    parts.push("«" + info.text + "»", "", INTEGRATE_RULES);

    const messages = [{ role: "user", content: parts.join("\n") }];
    let raw = await call(messages);
    let obj, problems;
    try { obj = parse(raw); problems = validate(obj); }
    catch (err) { problems = ["JSON non leggibile: " + err.message]; }
    if (problems.length) {
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: "Il JSON non è valido: " + problems.join("; ") + ". Correggilo e rispondi solo con il JSON completo." });
      raw = await call(messages);
      try { obj = parse(raw); problems = validate(obj); }
      catch (err) { problems = ["JSON non leggibile: " + err.message]; }
      if (problems.length) throw new FredError("formato", problems.join("; "), raw);
    }
    obj.summary = String(obj.summary || "").trim().replace(/[.!?]+$/, "");
    if (obj.summary) obj.summary = obj.summary.charAt(0).toLowerCase() + obj.summary.slice(1);
    obj.followUps = Array.isArray(obj.followUps)
      ? obj.followUps.map((q) => String(q || "").trim()).filter(Boolean).slice(0, 2)
      : [];
    return obj;
  }

  /* Funzione principale: (schema attuale, storia, nuovo messaggio) → {reply, process} */
  async function update(current, history, text, editedByHand) {
    const messages = [{ role: "user", content: buildPrompt(current, history, text, editedByHand) }];
    let raw = await call(messages);
    let obj, problems;
    try { obj = parse(raw); problems = validate(obj); }
    catch (err) { problems = ["JSON non leggibile: " + err.message]; }

    if (problems.length) {
      // secondo tentativo: rimandiamo al modello gli errori trovati
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: "Il JSON non è valido: " + problems.join("; ") + ". Correggilo e rispondi solo con il JSON completo." });
      raw = await call(messages);
      try { obj = parse(raw); problems = validate(obj); }
      catch (err) { problems = ["JSON non leggibile: " + err.message]; }
      if (problems.length) throw new FredError("formato", problems.join("; "), raw);
    }
    return obj;
  }

  function FredError(kind, message, raw) {
    const e = new Error(message);
    e.kind = kind;
    e.raw = raw;
    return e;
  }

  /* Risposte della modalità "demo" (nessun modello collegato) */
  const DEMO_NODES = [
    { id: "n1", type: "start", lane: 0, label: "Serve un materiale" },
    { id: "n2", type: "task", lane: 0, label: "Compila la richiesta d'acquisto" },
    { id: "n3", type: "task", lane: 1, label: "Verifica la richiesta" },
    { id: "n4", type: "decision", lane: 1, label: "Richiesta completa?" },
    { id: "n5", type: "task", lane: 1, label: "Chiede le informazioni mancanti", status: "verify" },
    { id: "n6", type: "task", lane: 1, label: "Chiede i preventivi" },
    { id: "n7", type: "task", lane: 3, label: "Invia il preventivo" },
    { id: "n8", type: "decision", lane: 1, label: "Importo sopra soglia?" },
    { id: "n9", type: "task", lane: 2, label: "Approva l'acquisto" },
    { id: "n10", type: "task", lane: 1, label: "Emette l'ordine" }
  ];
  const DEMO_EDGES = [
    { from: "n1", to: "n2" }, { from: "n2", to: "n3" }, { from: "n3", to: "n4" },
    { from: "n4", to: "n6", label: "Sì" }, { from: "n4", to: "n5", label: "No" }, { from: "n5", to: "n2" },
    { from: "n6", to: "n7" }, { from: "n7", to: "n8" },
    { from: "n8", to: "n9", label: "Sì" }, { from: "n8", to: "n10", label: "No" }, { from: "n9", to: "n10" }
  ];
  const DEMO_LANES = ["Richiedente", "Buyer", "Responsabile", "Fornitore"];
  const DEMO = [
    {
      reply: "Ecco una prima versione. (Modalità dimostrativa: è uno schema di esempio preparato, non generato dalla tua descrizione.)",
      process: {
        title: "Richiesta d'acquisto", lanes: DEMO_LANES,
        nodes: DEMO_NODES.concat([{ id: "n11", type: "end", lane: 1, label: "Ordine inviato" }]),
        edges: DEMO_EDGES.concat([{ from: "n10", to: "n11" }])
      }
    },
    {
      reply: "Ho aggiunto il ricevimento della merce da parte del richiedente. (Modalità dimostrativa: la modifica è preparata in anticipo.)",
      process: {
        title: "Richiesta d'acquisto", lanes: DEMO_LANES,
        nodes: DEMO_NODES.concat([
          { id: "n11", type: "task", lane: 0, label: "Riceve la merce" },
          { id: "n12", type: "end", lane: 0, label: "Materiale disponibile" }
        ]),
        edges: DEMO_EDGES.concat([{ from: "n10", to: "n11" }, { from: "n11", to: "n12" }])
      }
    }
  ];

  function setProvider(name) { if (PROVIDERS[name]) CONFIG.provider = name; }

  return { update: update, integrate: integrate, CONFIG: CONFIG, setProvider: setProvider };

})();
