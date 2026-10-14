/* =====================================================================
   FRED QUENZA – LOGICA DEL MOCK-UP
   Conversazione simulata: nessun dato esce dal browser.
   Punti di aggancio per il team di sviluppo segnati con "AGGANCIO".
   ===================================================================== */
(function () {
  const FLOW = window.FRED_FLOW;
  const PILOT = window.AL_VOLO_PILOTA || {};

  /* ---------------- pilota: attività e mappa dalla configurazione ---------------- */
  const PREP = { "il": ["del", "nel", "sul"], "lo": ["dello", "nello", "sullo"], "la": ["della", "nella", "sulla"],
                 "l'": ["dell'", "nell'", "sull'"], "i": ["dei", "nei", "sui"], "gli": ["degli", "negli", "sugli"],
                 "le": ["delle", "nelle", "sulle"] };
  function activityForms(activity) {
    const act = String(activity || "questa attività").trim();
    const m = act.match(/^(il|lo|la|i|gli|le)\s+(.+)$/i) || act.match(/^(l['’])\s*(.+)$/i);
    if (!m) return { attivita: act, di_attivita: "di " + act, in_attivita: "in " + act, su_attivita: "su " + act };
    const p = PREP[m[1].toLowerCase().replace("’", "'")], rest = m[2];
    const join = (prep) => (prep.slice(-1) === "'" ? prep + rest : prep + " " + rest);
    return { attivita: act, di_attivita: join(p[0]), in_attivita: join(p[1]), su_attivita: join(p[2]) };
  }
  (function applyPilotConfig() {
    const forms = activityForms(PILOT.attivita);
    let raw = JSON.stringify(FLOW.sessions);
    Object.keys(forms).forEach((k) => { raw = raw.split("{" + k + "}").join(JSON.stringify(forms[k]).slice(1, -1)); });
    FLOW.sessions = JSON.parse(raw);
    if (PILOT.mappa && Array.isArray(PILOT.mappa.nodes)) {
      FLOW.process = FredDiagram.autoLayout(JSON.parse(JSON.stringify(PILOT.mappa)));
    }
    FLOW.process2 = FLOW.process;
    if (window.FredLLM) FredLLM.setProvider("demo");     // nel pilota nessun modello: le correzioni si annotano testuali
  })();
  const ASSETS = window.FRED_ASSETS || {
    alflyAvatar: "assets/alfly-avatar.jpg",
    allyAvatar: "assets/ally-avatar.jpg",
    roseAvatar: "assets/rose-avatar.jpg",
    alflyScene: "assets/alfly-scena.jpg",
    avatar: "assets/fred-avatar.jpg",
    scene: "assets/fred-scena.jpg"
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const ui = {
    launcher: $("launcher"), launcherBtn: $("launcherBtn"), teaser: $("teaser"), badge: $("badge"),
    popup: $("popup"), log: $("log"), composer: $("composer"),
    dayLabel: $("dayLabel"), charName: $("charName"), privacy: $("privacy"), minimize: $("minimizeBtn"),
    modal: $("modal"), modalTitle: $("modalTitle"), modalHint: $("modalHint"),
    modalDiagram: $("modalDiagram"), modalNotes: $("modalNotes"), modalClose: $("modalClose"),
    bpmnDownload: $("bpmnDownload"), bpmnCopy: $("bpmnCopy"),
    canvasCol: $("canvasCol"), canvasTitle: $("canvasTitle"), canvasVersion: $("canvasVersion"),
    canvasNote: $("canvasNote"), canvasEmpty: $("canvasEmpty"), canvasSimple: $("canvasSimple"),
    canvasBpmn: $("canvasBpmn"), viewSimple: $("viewSimple"), viewBpmn: $("viewBpmn"),
    exportSvg: $("exportSvg"), exportCopy: $("exportCopy"), exportBpmn: $("exportBpmn")
  };

  // Stato della demo
  const state = {
    mode: "mercoledi",   // "mercoledi" | "venerdi"
    started: false,      // la conversazione è già partita?
    done: false,         // il dipendente ha finito per oggi?
    busy: false,         // Fred sta "scrivendo"
    answers: {},         // risposte raccolte → nel prodotto vanno al backend
    memory: {},          // ciò che resta tra una tappa e l'altra del percorso
    doneSteps: {},       // tappe del percorso già concluse
    run: 0               // serve a interrompere una demo quando se ne avvia un'altra
  };

  /* ------------------------------------------------------------------
     AGGANCIO 1 – risposta di Fred
     Nel mock-up sceglie una frase da flow.js. Nel prodotto qui va la
     chiamata al backend, che passa domanda e risposta al modello
     linguistico e restituisce il commento (ed eventuali domande di
     approfondimento).
     ------------------------------------------------------------------ */
  async function fredReply(question, answer) {
    const list = question.ack || ["Grazie."];
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ------------------------------------------------------------------
     AGGANCIO 2 – salvataggio delle risposte
     Nel prodotto: invio al backend con solo divisione e ruolo.
     ------------------------------------------------------------------ */
  /* ---------------- pilota: profilo, progressi e invio delle risposte ---------------- */
  const STORE = "alvolo-pilota";
  const QUEUE = "alvolo-pilota-coda";
  const endpointOk = () => /^https:\/\/script\.google\.com\/.+\/exec$/.test(String(PILOT.endpoint || ""));
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* memoria piena o disattivata */ } }
  let profile = load(STORE, {}).profile || null;
  function saveProgress() {
    store(STORE, { profile: profile, doneSteps: state.doneSteps, memory: state.memory });
  }
  let flushing = false;
  async function flush() {
    if (flushing || !endpointOk()) return;
    flushing = true;
    try {
      let q = load(QUEUE, []);
      while (q.length) {
        const batch = q.slice(0, 20);
        try {
          // text/plain e no-cors: è il modo in cui Google Apps Script accetta dati da un'altra pagina
          await fetch(PILOT.endpoint, { method: "POST", mode: "no-cors", keepalive: true,
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ chiave: PILOT.chiave, righe: batch }) });
        } catch (e) { break; }        // niente rete: le risposte restano in coda e ripartono dopo
        q = load(QUEUE, []).slice(batch.length);
        store(QUEUE, q);
      }
    } finally { flushing = false; }
  }
  window.addEventListener("online", flush);
  // finché ci sono risposte in coda, si riprova da soli ogni 20 secondi
  setInterval(() => { if (load(QUEUE, []).length) flush(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  function characterName() {
    const ses = FLOW.sessions[state.mode] || {};
    return (ses.character && ses.character.name) || FLOW.character.name;
  }
  function saveAnswer(key, value, steps) {
    state.answers[key] = value;
    if (!profile) return;
    const row = {
      data_ora: new Date().toISOString(), codice: profile.codice, divisione: profile.divisione, ruolo: profile.ruolo,
      personaggio: characterName(), tappa: (FLOW.sessions[state.mode] || {}).dayLabel || state.mode,
      domanda_id: key, domanda: state.lastFredText || "",
      risposta: value == null ? "" : (typeof value === "string" ? value : JSON.stringify(value)),
      passaggi: steps || ""
    };
    const q = load(QUEUE, []); q.push(row); store(QUEUE, q);
    saveProgress();
    flush();
  }

  /* ---------------- utilità ---------------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? Math.min(ms, 150) : ms));
  const scrollDown = () => { ui.log.scrollTop = ui.log.scrollHeight; };

  function guard(run) { if (run !== state.run) throw new Error("demo interrotta"); }

  function addMsg(from, text, extraCls) {
    const m = el("div", "msg msg-" + from + (extraCls ? " " + extraCls : ""), text);
    ui.log.appendChild(m);
    scrollDown();
    return m;
  }

  async function fredSay(text, run) {
    state.lastFredText = text;
    state.busy = true;
    const t = el("div", "typing");
    t.setAttribute("aria-label", "Fred sta scrivendo");
    t.innerHTML = "<i></i><i></i><i></i>";
    ui.log.appendChild(t);
    scrollDown();
    await sleep(500 + Math.min(text.length * 12, 900));
    t.remove();
    guard(run);
    addMsg("fred", text);
    state.busy = false;
  }

  function clearComposer() { ui.composer.innerHTML = ""; }

  // Indicatore lungo (attesa del modello), con testo
  function thinking(text) {
    const t = el("div", "typing thinking");
    t.setAttribute("role", "status");
    t.innerHTML = "<i></i><i></i><i></i>";
    t.appendChild(el("span", null, text));
    ui.log.appendChild(t);
    scrollDown();
    return t;
  }

  function actions(buttons) {
    clearComposer();
    const row = el("div", "row");
    buttons.forEach((b) => {
      const btn = el("button", "btn " + (b.primary ? "btn-primary" : "btn-ghost"), b.label);
      btn.type = "button";
      btn.addEventListener("click", b.onClick);
      row.appendChild(btn);
    });
    ui.composer.appendChild(row);
    row.querySelector("button").focus({ preventScroll: true });
    scrollDown();
  }

  // Campo di testo libero (con eventuali risposte rapide sopra)
  function askText(opts) {
    return new Promise((resolve) => {
      clearComposer();
      if (opts.options && opts.options.length) {
        const chips = el("div", "chips");
        opts.options.forEach((o) => {
          const c = el("button", "chip", o);
          c.type = "button";
          c.addEventListener("click", () => resolve({ text: o, kind: "choice" }));
          chips.appendChild(c);
        });
        ui.composer.appendChild(chips);
      }
      const fieldId = "f" + Date.now();
      if (opts.options && opts.options.length) {
        const lab = el("label", "field-label", "Oppure scrivilo tu");
        lab.setAttribute("for", fieldId);
        ui.composer.appendChild(lab);
      }
      const row = el("div", "input-row");
      const ta = el("textarea");
      ta.id = fieldId;
      ta.rows = 1;
      ta.placeholder = opts.placeholder || "Scrivi qui…";
      if (!opts.options || !opts.options.length) ta.setAttribute("aria-label", "La tua risposta");
      const send = el("button", "send");
      send.type = "button";
      send.disabled = true;
      send.setAttribute("aria-label", "Invia risposta");
      send.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      row.appendChild(ta);
      row.appendChild(send);
      ui.composer.appendChild(row);

      const hint = el("div", "hint", "Invio per mandare, Maiusc+Invio per andare a capo");
      ui.composer.appendChild(hint);

      if (opts.optional || opts.skipLabel) {
        const skip = el("button", "link-btn", opts.skipLabel || "Salta questa domanda");
        skip.type = "button";
        skip.addEventListener("click", () => resolve({ text: null, kind: "skip" }));
        ui.composer.appendChild(skip);
      }

      const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; };
      if (opts.value) { ta.value = opts.value; send.disabled = false; setTimeout(grow, 0); }
      const submit = () => { const v = ta.value.trim(); if (v) resolve({ text: v, kind: "open" }); };
      ta.addEventListener("input", () => { send.disabled = !ta.value.trim(); grow(); });
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
      });
      send.addEventListener("click", submit);
      ta.focus({ preventScroll: true });
      scrollDown();
    });
  }

  function progress(done, total, label) {
    const p = el("div", "progress");
    for (let i = 0; i < total; i++) p.appendChild(el("i", i < done ? "on" : ""));
    p.appendChild(el("span", null, label));
    ui.log.appendChild(p);
    scrollDown();
  }

  function scene() {
    const f = el("figure", "scene");
    const img = el("img");
    img.src = currentCharacter() === "alfly" ? ASSETS.alflyScene : ASSETS.scene;
    img.alt = "Fred Quenza alla radio di bordo, nell'hangar";
    f.appendChild(img);
    ui.log.appendChild(f);
  }

  /* ---------------- schema ---------------- */
  // opts: { proc, onSelect, version, bpmn }
  function diagramCard(opts) {
    opts = opts || {};
    const proc = opts.proc || FLOW.process;
    const card = el("div", "diagram-card");
    if (opts.version) card.appendChild(el("div", "version", proc.title + ", versione " + opts.version));
    const sc = el("div", "diagram-scroll");
    // il ruolo scelto da approfondire resta evidenziato nella mappa intera (tranne nella mappa aggregata)
    if (opts.highlightLane === undefined && state.memory.focus && !proc.aggregated) {
      const li = proc.lanes.indexOf(state.memory.focus.ruolo);
      if (li >= 0) opts.highlightLane = li;
    }
    const view = () => ({ size: "compact", onSelect: opts.onSelect, highlightLane: opts.highlightLane,
                          dimOthers: opts.dimOthers, selectableIds: opts.selectableIds });
    sc.appendChild(FredDiagram.render(proc, Object.assign(view(), { selectedId: opts.selectedId, selectedIds: opts.selectedIds })));
    card._redraw = (ids) => {
      sc.innerHTML = "";
      sc.appendChild(FredDiagram.render(proc, Object.assign(view(), { selectedIds: ids })));
    };
    // dopo la scelta lo schema non è più toccabile: niente tocchi "a vuoto" sulle mappe precedenti
    card._freeze = (ids) => { opts.onSelect = null; card._redraw(ids || []); };
    card.appendChild(sc);
    card.appendChild(FredDiagram.legend(proc));
    if (opts.quote) {
      const q = el("blockquote", "quote");
      q.appendChild(el("strong", null, "Le tue parole"));
      q.appendChild(document.createTextNode("«" + opts.quote + "»"));
      card.appendChild(q);
    }
    const row = el("div", "row");
    const big = el("button", "btn btn-ghost", "Ingrandisci lo schema");
    big.type = "button";
    big.addEventListener("click", () => openModal(opts.onSelect, proc));
    row.appendChild(big);
    if (opts.bpmn) {
      const dl = el("button", "btn btn-ghost", "Scarica BPMN");
      dl.type = "button";
      dl.addEventListener("click", () => downloadBPMN(proc));
      row.appendChild(dl);
    }
    card.appendChild(row);
    ui.log.appendChild(card);
    scrollDown();
    return card;
  }

  /* ---------------- scarica / copia ---------------- */
  function downloadText(text, fileName, mime) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: mime }));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      FredLog.error("[Fred] download non riuscito", err);
    }
  }

  async function copyText(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
    }
    if (btn) {
      const old = btn.textContent;
      btn.textContent = ok ? "Copiato" : "Copia non riuscita";
      setTimeout(() => { btn.textContent = old; }, 1800);
    }
  }

  function downloadBPMN(proc) {
    downloadText(FredBPMN.toXML(proc), FredBPMN.fileName(proc), "application/xml");
  }
  function copyBPMN(proc, btn) { return copyText(FredBPMN.toXML(proc), btn); }

  let modalProc = null;
  let lastFocus = null;
  function openModal(onSelect, proc) {
    proc = proc || FLOW.process;
    lastFocus = document.activeElement;
    modalProc = proc;
    ui.modalTitle.textContent = proc.title;
    ui.modalHint.textContent = onSelect
      ? "Tocca il passaggio che per te va in modo diverso."
      : proc.nodes.some((n) => n.isNew) ? "In verde i passaggi che hai cambiato tu."
      : (proc === FLOW.process || proc === FLOW.process2) ? "Mappa di partenza, da correggere con le tue parole."
      : "La tua versione della mappa. Puoi scaricarla in formato BPMN 2.0.";
    ui.modalDiagram.innerHTML = "";
    ui.modalDiagram.appendChild(FredDiagram.render(proc, {
      size: "full",
      onSelect: onSelect ? (n) => { closeModal(); onSelect(n); } : null
    }));
    ui.modalDiagram.appendChild(FredDiagram.legend(proc));
    ui.modalNotes.innerHTML = "";
    proc.nodes.filter((n) => n.status !== "confirmed" || n.isNew).forEach((n) => {
      const box = el("div", "note" + (n.isNew ? " note-new" : n.status === "variant" ? " note-var" : ""));
      box.appendChild(el("strong", null, n.label));
      box.appendChild(document.createTextNode(
        n.note ? n.note
        : n.isNew ? "Cambiato da te."
        : n.status === "variant" ? "Variante segnalata."
        : "Da verificare: passaggio dedotto, da confermare."));
      ui.modalNotes.appendChild(box);
    });
    ui.modal.hidden = false;
    ui.modalClose.focus();
  }
  function closeModal() {
    ui.modal.hidden = true;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  ui.modalClose.addEventListener("click", closeModal);
  ui.bpmnDownload.addEventListener("click", () => { if (modalProc) downloadBPMN(modalProc); });
  ui.bpmnCopy.addEventListener("click", () => { if (modalProc) copyBPMN(modalProc, ui.bpmnCopy); });
  ui.modal.addEventListener("click", (e) => { if (e.target === ui.modal) closeModal(); });
  ui.modal.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  /* ---------------- sessione del mercoledì: domande ---------------- */
  /* ---------------- motore delle domande (Fred e Al Fly) ---------------- */
  const CHANGE_TEXTS = {
    thinkingIntegrate: "Sto aggiornando la mappa…",
    reflectIntro: "Quindi, se ho capito, {summary}. Ho aggiornato la mappa così:",
    reflectAsk: "È così?", askCorrect: "Dimmi cosa correggere.", correctPlaceholder: "Scrivi qui…",
    fallbackNote: "Ho annotato le tue parole sul passaggio “{passaggio}”, così come le hai scritte."
  };

  function askFrequency(q) {
    return new Promise((resolve) => {
      clearComposer();
      const num = el("input", "num-input");
      num.type = "number"; num.min = "0"; num.step = "1"; num.placeholder = "N° volte";
      num.setAttribute("aria-label", "Numero di volte");
      const row = el("div", "input-row"); row.appendChild(num); ui.composer.appendChild(row);
      ui.composer.appendChild(el("div", "field-label", "…e scegli l'unità:"));
      const chips = el("div", "chips");
      q.units.forEach((u) => {
        const b = el("button", "chip", u); b.type = "button";
        b.addEventListener("click", () => {
          const n = parseInt(num.value, 10);
          if (!(n >= 0)) { num.focus(); num.classList.add("needs-value"); return; }
          resolve(n + " " + u);
        });
        chips.appendChild(b);
      });
      ui.composer.appendChild(chips);
      num.focus({ preventScroll: true });
      scrollDown();
    });
  }

  function askMulti(q) {
    return new Promise((resolve) => {
      clearComposer();
      const picked = [];
      const chips = el("div", "chips");
      const ta = el("textarea"); ta.rows = 1; ta.placeholder = q.placeholder || "Altro…"; ta.setAttribute("aria-label", "Altro");
      const done = el("button", "btn btn-primary", q.doneLabel || "Fatto"); done.type = "button"; done.disabled = true;
      const refresh = () => { done.disabled = !picked.length && !ta.value.trim(); };
      q.options.forEach((o) => {
        const b = el("button", "chip", o); b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => {
          const i = picked.indexOf(o);
          if (i >= 0) picked.splice(i, 1); else picked.push(o);
          b.setAttribute("aria-pressed", String(i < 0)); b.classList.toggle("chip-on", i < 0); refresh();
        });
        chips.appendChild(b);
      });
      ta.addEventListener("input", refresh);
      const row = el("div", "input-row"); row.appendChild(ta);
      ui.composer.appendChild(chips); ui.composer.appendChild(row); ui.composer.appendChild(done);
      done.addEventListener("click", () => resolve({ options: picked.slice(), other: ta.value.trim() }));
      scrollDown();
    });
  }

  function pickSteps(q, proc, multiple) {
    return new Promise((done) => {
      const chosen = [];
      const resolve = (nodes) => { card._freeze(nodes.map((n) => n.id)); done(nodes); };
      let doneBtn = null;
      const card = diagramCard({ proc: proc, selectedIds: [], onSelect: (node) => {
        if (!multiple) { resolve([node]); return; }
        const i = chosen.findIndex((n) => n.id === node.id);
        if (i >= 0) chosen.splice(i, 1); else chosen.push(node);
        card._redraw(chosen.map((n) => n.id));
        doneBtn.disabled = !chosen.length;
        doneBtn.textContent = (q.doneLabel || "Fatto") + (chosen.length ? " (" + chosen.length + ")" : "");
      } });
      const buttons = [];
      if (multiple) buttons.push({ label: q.doneLabel || "Fatto", primary: true, onClick: () => resolve(chosen.slice()) });
      buttons.push({ label: q.noneLabel, onClick: () => resolve([]) });
      actions(buttons);
      if (multiple) { doneBtn = ui.composer.querySelector(".btn-primary"); doneBtn.disabled = true; }
    });
  }

  /* ---------------- la mappa nasce dalle parole della persona ----------------
     "steps": la persona scrive i passaggi uno alla volta; ognuno diventa un riquadro, testo invariato.
     "assignRoles": per ogni passaggio indica chi lo fa; i ruoli diventano le colonne della mappa. */
  function splitSteps(text) {
    return String(text).split(/\r?\n|;/)
      .map((s) => s.replace(/^\s*(?:\d+\s*[.)\-:]|[-•*–])\s*/, "").trim())
      .filter(Boolean);
  }
  function askSteps(q) {
    return new Promise((resolve) => {
      clearComposer();
      const steps = [];
      const list = el("ol", "steps-list");
      const row = el("div", "input-row");
      const inp = el("input", "step-input");
      inp.type = "text"; inp.enterKeyHint = "next"; inp.setAttribute("aria-label", "Nuovo passaggio");
      const add = el("button", "send"); add.type = "button"; add.setAttribute("aria-label", "Aggiungi il passaggio");
      add.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
      row.appendChild(inp); row.appendChild(add);
      const done = el("button", "btn btn-primary", q.doneLabel || "Ho finito"); done.type = "button";
      const hint = el("div", "steps-hint", q.hint || "");
      const redraw = () => {
        list.innerHTML = "";
        steps.forEach((s, i) => {
          const li = el("li");
          li.appendChild(el("span", "n", String(i + 1)));
          li.appendChild(el("span", "t", s));
          const x = el("button", "x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Togli il passaggio " + (i + 1));
          x.addEventListener("click", () => { steps.splice(i, 1); redraw(); inp.focus({ preventScroll: true }); });
          li.appendChild(x);
          list.appendChild(li);
        });
        list.hidden = !steps.length;
        inp.placeholder = "Passaggio " + (steps.length + 1) + "…";
        add.disabled = !inp.value.trim();
        done.disabled = steps.length < 2 && !(steps.length === 1 && inp.value.trim());
        list.scrollTop = list.scrollHeight;
        scrollDown();
      };
      const push = () => { splitSteps(inp.value).forEach((s) => steps.push(s)); inp.value = ""; redraw(); inp.focus({ preventScroll: true }); };
      inp.addEventListener("input", redraw);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (inp.value.trim()) push(); } });
      inp.addEventListener("paste", (e) => {
        const t = (e.clipboardData || window.clipboardData).getData("text");
        if (/\n/.test(t)) { e.preventDefault(); inp.value = t; push(); }
      });
      add.addEventListener("click", () => { if (inp.value.trim()) push(); });
      done.addEventListener("click", () => {
        if (inp.value.trim()) splitSteps(inp.value).forEach((s) => steps.push(s));
        if (steps.length >= 2) resolve(steps.slice());
      });
      ui.composer.appendChild(hint); ui.composer.appendChild(list); ui.composer.appendChild(row); ui.composer.appendChild(done);
      redraw();
      inp.focus({ preventScroll: true });
    });
  }
  function procFromSteps(steps) {
    const nodes = steps.map((s, i) => ({ id: "p" + (i + 1), type: i === 0 ? "start" : i === steps.length - 1 ? "end" : "task",
                                         lane: 0, status: "confirmed", label: s }));
    const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
    const t = String(PILOT.attivita || "Attività");
    return FredDiagram.autoLayout({ title: t.charAt(0).toUpperCase() + t.slice(1), lanes: ["Da indicare"], nodes: nodes, edges: edges });
  }
  function askRoles(q, proc) {
    return new Promise((resolve) => {
      const order = proc.nodes.slice();
      const roles = [];
      const chosen = [];
      let i = 0;
      const step = () => {
        clearComposer();
        const n = order[i];
        const box = el("div", "role-step");
        box.appendChild(el("small", null, "Passaggio " + (i + 1) + " di " + order.length));
        box.appendChild(document.createTextNode(n.label));
        ui.composer.appendChild(box);
        const chips = el("div", "chips");
        roles.concat([q.noneLabel || "Non saprei"]).forEach((r) => {
          const c = el("button", "chip", r); c.type = "button";
          c.addEventListener("click", () => pick(r));
          chips.appendChild(c);
        });
        ui.composer.appendChild(chips);
        if (roles.length) { const lab = el("div", "field-label", "Oppure scrivilo tu"); ui.composer.appendChild(lab); }
        const row = el("div", "input-row");
        const inp = el("input", "step-input"); inp.type = "text"; inp.placeholder = q.placeholder || "Scrivi il ruolo…";
        inp.setAttribute("aria-label", "Chi fa questo passaggio");
        const ok = el("button", "send"); ok.type = "button"; ok.disabled = true; ok.setAttribute("aria-label", "Conferma il ruolo");
        ok.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        inp.addEventListener("input", () => { ok.disabled = !inp.value.trim(); });
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (inp.value.trim()) pick(inp.value.trim()); } });
        ok.addEventListener("click", () => { if (inp.value.trim()) pick(inp.value.trim()); });
        row.appendChild(inp); row.appendChild(ok); ui.composer.appendChild(row);
        if (i > 0) {
          const back = el("button", "link-btn role-back", "‹ Passaggio precedente"); back.type = "button";
          back.addEventListener("click", () => { i--; chosen.pop(); step(); });
          ui.composer.appendChild(back);
        }
        if (!roles.length) inp.focus({ preventScroll: true });
        scrollDown();
      };
      const pick = (r) => {
        const same = roles.find((x) => x.toLowerCase() === r.toLowerCase());
        if (!same && r !== (q.noneLabel || "Non saprei")) roles.push(r);
        chosen.push(same || r);
        i++;
        if (i < order.length) step(); else resolve(chosen.slice());
      };
      step();
    });
  }

  async function askQuestion(run, q, ctx) {
    const text = fill(q.text, { passaggio: ctx.node ? ctx.node.label : "" });
    if (q.type === "steps") {
      await fredSay(text, run);
      const steps = await askSteps(q);
      guard(run); clearComposer();
      addMsg("user", steps.map((s, i) => (i + 1) + ". " + s).join("\n"), "msg-list");
      saveAnswer(q.id, steps.join("\n"));
      if (PILOT.mappaDaRacconto !== false) {
        ctx.proc = procFromSteps(steps);
        ctx.built = true;
        state.memory.proc = ctx.proc;
        saveProgress();
      }
      return;
    }
    if (q.type === "pickRole") {
      // dopo la mappa dell'intero processo si analizza il lavoro di un solo ruolo
      const lanes = ctx.proc.lanes.filter((l, i) => l !== "Non indicato" && ctx.proc.nodes.some((n) => n.lane === i));
      if (!lanes.length) return;
      await fredSay(text, run);
      let role = lanes[0];
      if (lanes.length > 1) { const k = await choose(lanes); guard(run); clearComposer(); role = lanes[k]; }
      addMsg("user", role);
      ctx.role = role;
      state.memory.focus = { ruolo: role };
      saveAnswer(q.id, role);
      return;
    }
    if (q.type === "pickActivity") {
      const role = ctx.role || (state.memory.focus || {}).ruolo;
      const li = ctx.proc.lanes.indexOf(role);
      const nodes = ctx.proc.nodes.filter((n) => n.lane === li);
      if (!nodes.length) return;
      let node = nodes[0];
      if (nodes.length > 1) {
        await fredSay(fill(q.text, { ruolo: role }), run);
        let card = null;
        node = await new Promise((resolve) => {
          card = diagramCard({ proc: ctx.proc, highlightLane: li, dimOthers: true, selectableIds: nodes.map((n) => n.id), onSelect: resolve });
          choose(nodes.map((n) => n.label)).then((k) => resolve(nodes[k]));
        });
        guard(run); clearComposer();
        if (card) card._freeze([node.id]);
        addMsg("user", "“" + node.label + "”");
      }
      state.memory.focus = { ruolo: role, id: node.id, label: node.label };
      saveAnswer(q.id, node.id, node.label);
      saveProgress();
      if (q.intro) await fredSay(fill(q.intro, { passaggio: node.label }), run);
      return;
    }
    if (q.type === "assignRoles") {
      if (!ctx.built) return askQuestion(run, Object.assign({}, q, { type: "selectSteps",
        text: "Collocale nella mappa: tocca i passaggi in cui intervengono, poi premi «Fatto»." }), ctx);
      await fredSay(text, run);
      const chosen = await askRoles(q, ctx.proc);
      guard(run); clearComposer();
      const p = clone(ctx.proc);
      const lanes = [];
      p.nodes.forEach((n, k) => {
        const r = chosen[k] === (q.noneLabel || "Non saprei") ? "Non indicato" : chosen[k];
        let li = lanes.indexOf(r);
        if (li < 0) { lanes.push(r); li = lanes.length - 1; }
        n.lane = li;
      });
      p.lanes = lanes;
      ctx.proc = FredDiagram.autoLayout(p);
      state.memory.proc = ctx.proc;
      addMsg("user", p.nodes.map((n) => "“" + n.label + "”: " + lanes[n.lane]).join("\n"), "msg-list");
      saveAnswer(q.id, JSON.stringify(p.nodes.map((n) => ({ passaggio: n.label, ruolo: lanes[n.lane] }))));
      saveAnswer("schema_iniziale", JSON.stringify({ title: p.title, lanes: p.lanes,
        nodes: p.nodes.map((n) => ({ id: n.id, type: n.type, lane: n.lane, label: n.label })),
        edges: p.edges.map((e) => ({ from: e.from, to: e.to, label: e.label || "" })) }));
      await fredSay("Ecco la mappa con i tuoi passaggi e le tue parole.", run);
      diagramCard({ proc: ctx.proc });
      return;
    }
    if (q.type === "selectStep" || q.type === "selectSteps") {
      await fredSay(text, run);
      const nodes = await pickSteps(q, ctx.proc, q.type === "selectSteps");
      guard(run); clearComposer();
      if (!nodes.length) { addMsg("user", q.noneLabel); saveAnswer(q.id, "nessuno"); return; }
      addMsg("user", nodes.map((n) => "“" + n.label + "”").join(", "));
      saveAnswer(q.id, nodes.map((n) => n.id).join(","), nodes.map((n) => n.label).join(" | "));
      const target = nodes.length === 1 ? nodes[0] : { id: null, label: nodes.map((n) => n.label).join(", ") };
      for (const f of q.followUps || []) await askQuestion(run, f, Object.assign({}, ctx, { node: target }));
      return;
    }
    if (q.type === "mapChange") {
      await fredSay(text, run);
      const yes = await new Promise((resolve) => actions([
        { label: q.options[0], primary: true, onClick: () => resolve(true) },
        { label: q.options[1], onClick: () => resolve(false) }]));
      guard(run); clearComposer();
      addMsg("user", yes ? q.options[0] : q.options[1]);
      if (!yes) return;
      const res = await editMap(run, ctx.proc, { askSelect: q.askSelect, askHow: q.askHow });
      if (res.changed) ctx.proc = FredDiagram.autoLayout(clone(res.proc));
      return;
    }
    await fredSay(text, run);
    let answer;
    if (q.type === "frequency") {
      answer = await askFrequency(q);
      guard(run); clearComposer(); addMsg("user", answer); saveAnswer(q.id, answer);
    } else if (q.type === "multiChoice") {
      const m = await askMulti(q);
      guard(run); clearComposer();
      answer = m.options.concat(m.other ? [m.other] : []).join(", ");
      addMsg("user", answer); saveAnswer(q.id, answer);
    } else {
      const ans = await askText({ options: q.type === "choice" ? q.options : null, placeholder: q.placeholder, optional: q.optional });
      guard(run); clearComposer();
      if (ans.kind === "skip") { addMsg("user", "Domanda saltata", "msg-skip"); saveAnswer(q.id, null); return; }
      answer = ans.text; addMsg("user", answer); saveAnswer(q.id, answer);
      if (ctx.collected) ctx.collected.push("Domanda: " + text + " Risposta: " + answer);
    }
    for (const f of ((q.followUpsIf || {})[answer] || [])) await askQuestion(run, f, ctx);
    for (const f of q.followUps || []) await askQuestion(run, f, ctx);
  }

  async function runDomande(run, ses) {
    if (ses.showScene) scene();
    let greeting = ses.greeting;
    let qs = ses.questions;
    const lc = state.memory.lastChange;
    const followUp = !!(ses.greetingIfChange && lc && lc.edits);
    if (followUp) {
      greeting = ses.greetingIfChange
        .map((l) => fill(l, { summary: lc.summary, passaggio: lc.node, testo: lc.text }));
      // domande sul caso che ha descritto lui, poi quelle generali
      const asks = ses.modelFollowUps === false ? [] : (state.memory.followUps || ses.fallbackFollowUps || []);
      qs = asks.map((t, i) => ({ id: "approfondimento-" + (i + 1), type: "open", text: t,
        placeholder: "Racconta con parole tue…", ack: ["Grazie, mi è utile."] }))
        .concat(ses.questions);   // prima le domande sul suo caso, poi tutte quelle della tappa
    }
    const collected = [];
    const focus = state.memory.focus && state.memory.focus.label;
    greeting = greeting.filter((l) => focus || l.indexOf("{focus}") < 0).map((l) => fill(l, { focus: focus || "" }));
    for (const line of greeting) await fredSay(line, run);
    guard(run);
    await new Promise((resolve) => actions([
      { label: ses.showStart ? "Iniziamo" : "Va bene", primary: true, onClick: resolve },
      { label: "Più tardi", onClick: minimize }
    ]));
    guard(run);
    clearComposer();

    // mappa su cui indicare i passaggi: quella della persona, se l'ha già corretta, altrimenti quella di base
    const ctx = { ses: ses, proc: FredDiagram.autoLayout(clone(state.memory.proc || FLOW.process)), node: null, collected: collected };
    ctx.proc.nodes.forEach((n) => { delete n.isNew; });
    let shown = false;
    for (const q of qs) {
      if (!shown && ["selectStep", "selectSteps", "mapChange"].includes(q.type)) { diagramCard({ proc: ctx.proc }); shown = true; }
      if (q.type === "assignRoles") shown = true;      // la mappa compare alla fine dell'assegnazione
      await askQuestion(run, q, ctx);
    }
    if (followUp) state.memory.answers2 = collected.join("\n");
    await fredSay(ses.closing, run);
    if (ses.progress) progress(ses.progress.done, ses.progress.total, ses.progress.label);
    finish();
  }

  /* ---------------- sessione di verifica (venerdì) ----------------
     Se il dipendente dice "Non proprio" e spiega come lavora, Fred:
     1. chiede al modello di integrare ESATTAMENTE le sue parole nello schema;
     2. gli restituisce una riformulazione ("Quindi, se ho capito bene, …")
        e lo schema aggiornato, con i passaggi nuovi evidenziati;
     3. gli chiede se è giusto e, se no, corregge.
     Senza modello, annota le sue parole sul passaggio, così come le ha scritte.
     Le tappe successive ripartono da questo schema. */
  const clone = (p) => JSON.parse(JSON.stringify(p));
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

  // segna come "nuovi" i passaggi aggiunti o cambiati rispetto allo schema precedente
  function markNew(prev, next) {
    const old = {};
    (prev ? prev.nodes : []).forEach((n) => { old[n.id] = n; });
    const outs = (p, id) => p.edges.filter((e) => e.from === id).map((e) => e.to + ":" + (e.label || "")).sort().join("|");
    next.nodes.forEach((n) => {
      const o = old[n.id];
      n.isNew = !!prev && (!o || o.label !== n.label || o.type !== n.type || outs(prev, n.id) !== outs(next, n.id));
    });
    return next;
  }

  function localAnnotate(proc, node, text) {
    const p = clone(proc);
    p.nodes.forEach((n) => { n.isNew = false; });
    const n = p.nodes.find((x) => x.id === node.id);
    if (n) { n.status = "variant"; n.note = "Detto da te: «" + text + "»"; n.isNew = true; }
    return p;
  }

  async function integrateChange(run, ses, proc, node, text, opts) {
    opts = opts || {};
    let current = proc;
    let userText = text;
    for (let round = 0; round < 3; round++) {
      const wait = thinking(ses.thinkingIntegrate);
      let res = null;
      try { res = await FredLLM.integrate(current, { kind: "fix", node: node.label, text: userText }); }
      catch (err) { FredLog.error("[Fred] integrazione non riuscita", err); }
      wait.remove();
      guard(run);

      if (!res || !res.summary) {
        // nessun modello (o nessun cambiamento capito): le sue parole restano, testuali
        const annotated = localAnnotate(current, node, text);
        await fredSay(fill(ses.fallbackNote, { passaggio: node.label }), run);
        diagramCard({ proc: annotated, bpmn: true, quote: text });
        state.memory.proc = annotated;
        state.memory.lastChange = { node: node.label, text: text, summary: null };
        state.memory.followUps = null;
        return annotated;
      }

      const updated = markNew(proc, FredDiagram.autoLayout(res.process));
      await fredSay(fill(ses.reflectIntro, { summary: res.summary }), run);
      diagramCard({ proc: updated, bpmn: true, quote: text });
      if (opts.noConfirm) {          // la conferma arriva con la domanda di approvazione
        state.memory.proc = updated;
        state.memory.lastChange = { node: node.label, text: text, summary: res.summary };
        return updated;
      }
      await fredSay(ses.reflectAsk, run);
      const right = await new Promise((resolve) => actions([
        { label: "Sì, è così", primary: true, onClick: () => resolve(true) },
        { label: "Non esattamente", onClick: () => resolve(false) }
      ]));
      guard(run);
      clearComposer();
      addMsg("user", right ? "Sì, è così" : "Non esattamente");

      state.memory.proc = updated;
      state.memory.lastChange = { node: node.label, text: text, summary: res.summary };
      state.memory.followUps = res.followUps && res.followUps.length ? res.followUps : null;
      if (right || round === 2) return updated;

      await fredSay(ses.askCorrect, run);
      const corr = await askText({ placeholder: ses.correctPlaceholder });
      guard(run);
      clearComposer();
      addMsg("user", corr.text);
      saveAnswer("correzione", corr.text);
      current = updated;
      userText = text + " — Correzione del dipendente alla tua interpretazione: " + corr.text;
    }
  }


  /* ---------------- la persona modifica la mappa (senza modello) ----------------
     Ogni modifica esegue alla lettera ciò che la persona sceglie e scrive:
     riscrivere, eliminare, aggiungere prima o dopo, cambiare chi lo fa, commentare. */
  const isTerminal = (n) => n.type === "start" || n.type === "end";
  const q2 = (s) => "“" + s + "”";

  function choose(list) {          // pulsanti a scelta; restituisce l'indice
    return new Promise((resolve) => {
      clearComposer();
      const chips = el("div", "chips");
      list.forEach((label, i) => {
        const b = el("button", "chip", label); b.type = "button";
        b.addEventListener("click", () => resolve(i));
        chips.appendChild(b);
      });
      ui.composer.appendChild(chips);
      chips.querySelector("button").focus({ preventScroll: true });
      scrollDown();
    });
  }
  function newNodeId(p) { let i = 1; while (p.nodes.some((n) => n.id === "u" + i)) i++; return "u" + i; }
  function pruneLanes(p) {         // toglie le colonne rimaste vuote
    const used = Array.from(new Set(p.nodes.map((n) => n.lane))).sort((a, b) => a - b);
    const idx = {}; used.forEach((l, i) => { idx[l] = i; });
    p.lanes = used.map((l) => p.lanes[l]);
    p.nodes.forEach((n) => { n.lane = idx[n.lane]; });
  }
  function deleteNode(p, id) {     // toglie il passaggio e ricollega chi viene prima con chi viene dopo
    const ins = p.edges.filter((e) => e.to === id && e.from !== id);
    const outs = p.edges.filter((e) => e.from === id && e.to !== id);
    p.edges = p.edges.filter((e) => e.from !== id && e.to !== id);
    p.nodes = p.nodes.filter((n) => n.id !== id);
    ins.forEach((i) => outs.forEach((o) => {
      if (i.from === o.to || p.edges.some((e) => e.from === i.from && e.to === o.to)) return;
      const label = i.label || o.label;
      p.edges.push(label ? { from: i.from, to: o.to, label: label } : { from: i.from, to: o.to });
    }));
    pruneLanes(p);
  }
  async function askLane(run, p, prompt) {
    await fredSay(prompt, run);
    const ans = await askText({ options: p.lanes.slice(), placeholder: "Scrivi il ruolo…" });
    guard(run); clearComposer(); addMsg("user", ans.text);
    let i = p.lanes.indexOf(ans.text);
    if (i < 0) { p.lanes.push(ans.text); i = p.lanes.length - 1; }
    return i;
  }

  // opts: { askSelect, askHow, node }  → restituisce la mappa modificata (o quella di prima, se annulla)
  async function editMap(run, proc, opts) {
    opts = opts || {};
    let p = clone(proc);
    p.nodes.forEach((n) => { delete n.isNew; });
    const log = [];
    let pre = opts.node ? p.nodes.find((n) => n.id === opts.node.id) : null;
    for (;;) {
      let node = pre; pre = null;
      if (!node) {
        await fredSay(opts.askSelect || "Tocca nella mappa il passaggio da modificare.", run);
        node = (await pickSteps({ noneLabel: "Annulla" }, p, false))[0];
        guard(run); clearComposer();
        if (!node) { addMsg("user", "Annulla", "msg-skip"); break; }
        node = p.nodes.find((n) => n.id === node.id);
        addMsg("user", "Il passaggio " + q2(node.label));
      }
      await fredSay("Cosa vuoi fare con " + q2(node.label) + "?", run);
      const menu = [
        { k: "riscrivi", l: "Riscrivilo" },
        { k: "elimina", l: "Eliminalo", ok: p.nodes.length > 2 },
        { k: "prima", l: "Aggiungi un passaggio prima" },
        { k: "dopo", l: "Aggiungi un passaggio dopo" },
        { k: "ruolo", l: "Cambia chi lo fa" },
        { k: "commento", l: "Lascia un commento" },
        { k: "annulla", l: "Annulla" }
      ].filter((m) => m.ok !== false);
      const pick = menu[await choose(menu.map((m) => m.l))];
      guard(run); clearComposer(); addMsg("user", pick.l, pick.k === "annulla" ? "msg-skip" : null);
      if (pick.k === "annulla") break;

      const before = node.label;
      let record = null;
      if (pick.k === "riscrivi") {
        await fredSay("Scrivilo con le tue parole: comparirà nella mappa esattamente così.", run);
        const a = await askText({ value: node.label, placeholder: "Scrivi qui…" });
        guard(run); clearComposer(); addMsg("user", a.text);
        node.label = a.text; node.status = "confirmed"; delete node.note; node.isNew = true; delete node.level; delete node.count;
        record = { azione: "riscritto", passaggio: before, testo: a.text };
        log.push("hai riscritto " + q2(before) + " come " + q2(a.text));
      } else if (pick.k === "elimina") {
        const wasType = node.type;
        const nextIds = p.edges.filter((e) => e.from === node.id).map((e) => e.to);
        const prevIds = p.edges.filter((e) => e.to === node.id).map((e) => e.from);
        deleteNode(p, node.id);
        // se era l'inizio (o la fine), il passaggio subito dopo (o prima) diventa l'inizio (o la fine)
        if (wasType === "start") nextIds.forEach((id) => { const n = p.nodes.find((x) => x.id === id); if (n && n.type === "task") n.type = "start"; });
        if (wasType === "end") prevIds.forEach((id) => {
          const n = p.nodes.find((x) => x.id === id);
          if (n && n.type === "task" && !p.edges.some((e) => e.from === id)) n.type = "end";
        });
        record = { azione: "eliminato", passaggio: before };
        log.push("hai eliminato " + q2(before));
      } else if (pick.k === "prima" || pick.k === "dopo") {
        await fredSay("Scrivi il nuovo passaggio con le tue parole.", run);
        const a = await askText({ placeholder: "Scrivi qui…" });
        guard(run); clearComposer(); addMsg("user", a.text);
        const lane = await askLane(run, p, "Chi lo fa?");
        const nid = newNodeId(p);
        let newType = "task";
        if (pick.k === "dopo" && node.type === "end") { node.type = "task"; newType = "end"; }        // nuovo ultimo passaggio
        if (pick.k === "prima" && node.type === "start") { node.type = "task"; newType = "start"; }   // nuovo primo passaggio
        p.nodes.push({ id: nid, type: newType, lane: lane, status: "confirmed", label: a.text, isNew: true });
        let branch = "";
        if (pick.k === "prima") {
          p.edges.filter((e) => e.to === node.id).forEach((e) => { e.to = nid; });
          p.edges.push({ from: nid, to: node.id });
        } else {
          let outs = p.edges.filter((e) => e.from === node.id);
          if (outs.length > 1) {
            const name = (e) => (e.label ? e.label + ": " : "") + "prima di " + q2((p.nodes.find((n) => n.id === e.to) || {}).label || "");
            await fredSay("In quale caso?", run);
            const i = await choose(outs.map(name));
            guard(run); clearComposer(); addMsg("user", name(outs[i]));
            outs = [outs[i]];
            branch = outs[0].label || "";
          }
          outs.forEach((e) => { e.from = nid; delete e.label; });
          p.edges.push(branch ? { from: node.id, to: nid, label: branch } : { from: node.id, to: nid });
        }
        record = { azione: "aggiunto " + pick.k, passaggio: before, testo: a.text, ruolo: p.lanes[lane], caso: branch };
        log.push("hai aggiunto " + q2(a.text) + " " + pick.k + " " + q2(before));
      } else if (pick.k === "ruolo") {
        const lane = await askLane(run, p, "Chi lo fa?");
        node.lane = lane; node.isNew = true; delete node.level; delete node.count;
        pruneLanes(p);
        record = { azione: "cambiato ruolo", passaggio: before, ruolo: p.lanes[node.lane] };
        log.push("hai indicato che " + q2(before) + " lo fa: " + p.lanes[node.lane]);
      } else if (pick.k === "commento") {
        await fredSay("Scrivi il tuo commento: lo riporto così come lo scrivi.", run);
        const a = await askText({ placeholder: "Scrivi qui…" });
        guard(run); clearComposer(); addMsg("user", a.text);
        node.status = "variant"; node.note = "Detto da te: «" + a.text + "»"; node.isNew = true; delete node.level; delete node.count;
        record = { azione: "commento", passaggio: before, testo: a.text };
        log.push("hai commentato " + q2(before));
      }
      p = FredDiagram.autoLayout(p);
      saveAnswer("modifica_mappa", JSON.stringify(record), before);
      if (opts.memKey) state.memory[opts.memKey] = p;
      else {
        state.memory.proc = p;
        state.memory.lastChange = { node: before, text: log.join("; "), summary: null, edits: true };
        state.memory.followUps = null;
      }
      saveProgress();
      await fredSay("Ecco la mappa con la tua modifica.", run);
      diagramCard({ proc: p, bpmn: true });
      await fredSay("Vuoi cambiare altro?", run);
      const more = await new Promise((resolve) => actions([
        { label: "Sì, un altro passaggio", primary: true, onClick: () => resolve(true) },
        { label: "No, ho finito", onClick: () => resolve(false) }]));
      guard(run); clearComposer(); addMsg("user", more ? "Sì, un altro passaggio" : "No, ho finito");
      if (!more) break;
    }
    return { proc: p, changed: log.length > 0, log: log };
  }

  // Domanda finale facoltativa di una verifica (es. "C'è altro che vuoi aggiungere?")
  async function finalQuestion(run, ses) {
    const q = ses.finalQuestion;
    if (!q) return;
    await fredSay(q.text, run);
    const ans = await askText({ placeholder: q.placeholder, optional: true });
    guard(run);
    clearComposer();
    if (ans.kind === "skip") addMsg("user", "Domanda saltata", "msg-skip");
    else { addMsg("user", ans.text); saveAnswer(q.id, ans.text); }
  }

  // Ultima fase: la persona approva lo schema (che finisce tra gli schemi confermati) o lo corregge
  async function runApproval(run, ses, proc) {
    const rounds = ses.maxRounds || 3;
    let approved = false;
    for (let round = 0; round < rounds; round++) {
      await fredSay(ses.approvalQuestion, run);
      const yes = await new Promise((resolve) => actions([
        { label: ses.approveLabel, primary: true, onClick: () => resolve(true) },
        { label: ses.notYetLabel, onClick: () => resolve(false) }
      ]));
      guard(run);
      clearComposer();
      addMsg("user", yes ? ses.approveLabel : ses.notYetLabel);
      if (yes) { approved = true; break; }
      if (round === rounds - 1) break;
      const res = await editMap(run, proc, { askSelect: ses.askSelect, askHow: ses.askHow });
      if (res.changed) proc = res.proc;
    }
    if (approved) {
      proc = clone(proc);
      proc.nodes.forEach((n) => { if (n.status === "verify") n.status = "confirmed"; });   // confermati da chi approva
      state.memory.approvedProc = proc;          // nel prodotto: file nella cartella degli schemi confermati
      saveAnswer("schema_confermato", JSON.stringify({ title: proc.title, lanes: proc.lanes,
        nodes: proc.nodes.map((n) => ({ id: n.id, type: n.type, lane: n.lane, label: n.label, note: n.note })),
        edges: proc.edges.map((e) => ({ from: e.from, to: e.to, label: e.label || "" })) }));
      saveAnswer("approvazione", "approvato");
    }
    await fredSay(approved ? ses.approvedText : ses.notApprovedText, run);
    await finalQuestion(run, ses);
    await fredSay(approved ? ses.thanksYes : ses.thanksFix, run);
    finish();
  }

  /* ---------------- Al Fly: punti critici a partire dallo schema approvato ---------------- */
  /* ---------------- Al Fly: la mappa che unisce le mappe di tutti ----------------
     Le mappe confermate arrivano dal foglio (script, ?mappe=1). I passaggi simili
     (stesse parole importanti) diventano un solo riquadro; il colore dice in quante
     mappe compare: verde quasi tutte, arancio alcune, rosso poche. */
  const STOP = new Set(("il lo la i gli le l un uno una di a da in con su per tra fra del dello della dei degli delle dell al allo alla ai agli alle all " +
    "dal dallo dalla dai dagli dalle dall nel nello nella nei negli nelle nell sul sullo sulla sui sugli sulle sull e ed o che se poi " +
    "quando ci si mi ti vi ne non è viene vengono").split(" "));
  function keyWords(label) {
    return String(label).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, " ")
      .replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => w.slice(0, 5));
  }
  function similar(a, b) {
    if (!a.length || !b.length) return 0;
    const A = new Set(a), B = new Set(b);
    let common = 0; A.forEach((w) => { if (B.has(w)) common++; });
    return (2 * common) / (A.size + B.size);
  }
  function orderOf(p) {          // passaggi in ordine di percorso, dall'inizio
    const out = {}; p.nodes.forEach((n) => { out[n.id] = []; });
    p.edges.forEach((e) => { if (out[e.from]) out[e.from].push(e.to); });
    const seen = new Set(), list = [];
    const starts = p.nodes.filter((n) => n.type === "start").map((n) => n.id);
    const queue = starts.length ? starts.slice() : (p.nodes[0] ? [p.nodes[0].id] : []);
    while (queue.length) { const id = queue.shift(); if (seen.has(id)) continue; seen.add(id); list.push(id); (out[id] || []).forEach((t) => queue.push(t)); }
    p.nodes.forEach((n) => { if (!seen.has(n.id)) list.push(n.id); });
    return list;
  }
  function aggregateMaps(maps, ses) {
    const soglie = (ses && ses.soglie) || { alta: 0.75, media: 0.4 };
    const clusters = [];
    maps.forEach((p, mi) => {
      const ids = orderOf(p);
      const used = new Set();
      ids.forEach((id, k) => {
        const n = p.nodes.find((x) => x.id === id);
        if (!n || !String(n.label || "").trim()) return;
        const kw = keyWords(n.label);
        let best = null, bestS = 0;
        clusters.forEach((c) => {
          if (used.has(c)) return;
          const sc = similar(kw, c.kw);
          if (sc > bestS) { bestS = sc; best = c; }
        });
        if (!best || bestS < 0.5) { best = { kw: kw, labels: {}, maps: new Set(), pos: [], roles: {} }; clusters.push(best); }
        used.add(best);
        best.labels[n.label] = (best.labels[n.label] || 0) + 1;
        best.maps.add(mi);
        best.pos.push(ids.length > 1 ? k / (ids.length - 1) : 0);
        const role = String((p.lanes || [])[n.lane] || "Non indicato").trim();
        best.roles[role] = (best.roles[role] || 0) + 1;
      });
    });
    const total = maps.length;
    const top = (o) => Object.keys(o).sort((a, b) => o[b] - o[a])[0];
    clusters.forEach((c) => { c.avg = c.pos.reduce((a, b) => a + b, 0) / c.pos.length; });
    clusters.sort((a, b) => a.avg - b.avg);
    const lanes = [];
    const nodes = clusters.map((c, i) => {
      const role = top(c.roles);
      if (lanes.indexOf(role) < 0) lanes.push(role);
      const ratio = c.maps.size / total;
      return { id: "a" + (i + 1), type: i === 0 ? "start" : i === clusters.length - 1 ? "end" : "task", lane: lanes.indexOf(role),
               status: "confirmed", label: top(c.labels), count: c.maps.size + "/" + total,
               level: ratio >= soglie.alta ? "alta" : ratio >= soglie.media ? "media" : "bassa" };
    });
    const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
    const title = (maps[0] && maps[0].title) || "Mappa unita";
    return FredDiagram.autoLayout({ title: title, lanes: lanes.length ? lanes : ["Non indicato"], nodes: nodes, edges: edges, aggregated: true, total: total });
  }
  async function fetchMaps() {
    if (!endpointOk()) return [];
    try {
      const res = await fetch(PILOT.endpoint + "?mappe=1", { method: "GET", cache: "no-store" });
      const data = await res.json();
      return (data && data.ok && Array.isArray(data.mappe)) ? data.mappe : [];
    } catch (e) { return []; }
  }
  async function buildAggregate(run, ses) {
    const own = state.memory.approvedProc || state.memory.proc || FLOW.process;
    const wait = thinking(ses.thinkingAggregate || "Al Fly sta unendo le mappe…");
    const remote = await fetchMaps();
    wait.remove(); guard(run);
    const others = remote.filter((m) => m && m.mappa && Array.isArray(m.mappa.nodes) && (!profile || m.codice !== profile.codice))
                         .map((m) => m.mappa);
    return aggregateMaps([own].concat(others), ses);
  }

  async function runEsplorazione(run, ses) {
    const groups = ses.tappe || [ses.questions.map((q) => q.id)];
    const i = alflyIndex();
    const qs = ses.questions.filter((q) => groups[i].indexOf(q.id) >= 0);
    const usesMap = (q) => ["selectStep", "selectSteps", "mapChange"].indexOf(q.type) >= 0;
    let proc;
    if (i === 0 || !state.memory.alflyProc) {
      scene();
      for (const line of ses.greeting) await fredSay(line, run);
      proc = await buildAggregate(run, ses);
      state.memory.alflyProc = proc;
      saveProgress();
      const n = proc.total || 1;
      await fredSay(fill(n > 1 ? ses.intro : (ses.introAlone || ses.intro), { n: n }), run);
      diagramCard({ proc: proc });
      saveAnswer("mappa_aggregata", JSON.stringify({ mappe: n, nodes: proc.nodes.map((x) => ({ label: x.label, ruolo: proc.lanes[x.lane], quante: x.count })) }));
      // la persona può modificare ancora una volta la mappa
      await fredSay(ses.askEdit || "Vuoi modificare qualcosa in questa mappa?", run);
      const edit = await new Promise((resolve) => actions([{ label: "Sì", primary: true, onClick: () => resolve(true) },
                                                           { label: "No", onClick: () => resolve(false) }]));
      guard(run); clearComposer(); addMsg("user", edit ? "Sì" : "No");
      if (edit) {
        const res = await editMap(run, proc, { memKey: "alflyProc" });
        if (res.changed) {
          proc = res.proc;
          saveAnswer("mappa_aggregata_modificata", JSON.stringify({ nodes: proc.nodes.map((x) => ({ label: x.label, ruolo: proc.lanes[x.lane] })) }));
        }
      }
      await new Promise((resolve) => actions([{ label: "Va bene, iniziamo", primary: true, onClick: resolve },
                                              { label: "Più tardi", onClick: minimize }]));
      guard(run);
      clearComposer();
    } else {
      proc = FredDiagram.autoLayout(clone(state.memory.alflyProc));
      const ga = ses.greetingAgain || [];
      if (ga.length) await fredSay(ga[(i - 1) % ga.length], run);
      if (qs.length && !usesMap(qs[0])) diagramCard({ proc: proc });   // la mappa resta sotto gli occhi
    }
    const ctx = { ses: ses, proc: proc, node: null };
    for (const q of qs) await askQuestion(run, q, ctx);
    state.memory.alflyTappa = i + 1;
    const last = i + 1 >= groups.length;
    await fredSay(last ? (ses.closingLast || ses.closing) : ses.closing, run);
    if (last) { finish(); return; }
    // tappa finita, ma Al Fly ha ancora domande: si riprende quando si vuole
    state.done = true;
    saveProgress();
    ui.badge.hidden = true;
    ui.teaser.hidden = true;
    actions([{ label: "Torna all'equipaggio", primary: true, onClick: goHome },
             { label: "Un'altra domanda adesso", onClick: () => startFromHome("alfly") }]);
  }

  async function runVerifica(run, ses) {
    // si parte sempre dalla versione della persona, se l'ha già modificata; altrimenti dalla mappa di partenza
    const mine = state.memory.proc;
    const proc = FredDiagram.autoLayout(clone(mine || FLOW.process));
    proc.nodes.forEach((n) => { delete n.isNew; });
    const edited = mine && state.memory.lastChange && state.memory.lastChange.edits;
    const greeting = (edited && ses.greetingIfChange) ? ses.greetingIfChange : ses.greeting;

    if (ses.approval) {
      for (const line of greeting) await fredSay(line, run);
      diagramCard({ proc: proc, bpmn: true });
      await runApproval(run, ses, proc);
      return;
    }
    for (const line of greeting.slice(0, -1)) await fredSay(line, run);
    diagramCard({ proc: proc, bpmn: true });
    await fredSay(greeting[greeting.length - 1], run);

    const yesLabel = ses.confirmLabel || "Sì, è così", noLabel = ses.rejectLabel || "Non proprio";
    const ok = await new Promise((resolve) => actions([
      { label: yesLabel, primary: true, onClick: () => resolve(true) },
      { label: noLabel, onClick: () => resolve(false) }
    ]));
    guard(run);
    clearComposer();
    addMsg("user", ok ? yesLabel : noLabel);

    if (ok) {
      saveAnswer("verifica", "confermato");
      if (ses.yesQuestion) await askQuestion(run, ses.yesQuestion, { ses: ses, proc: proc, node: null });
      await finalQuestion(run, ses);
      await fredSay(ses.thanksYes, run);
      finish();
      return;
    }

    saveAnswer("verifica", "da correggere");
    await editMap(run, proc, { askSelect: ses.askSelect, askHow: ses.askHow });
    await finalQuestion(run, ses);
    await fredSay(ses.thanksFix, run);
    finish();
  }

  /* ---------------- area dello schema (schermo diviso) ----------------
     Visibile solo nella modalità con AI e su schermi larghi.
     Due viste dello stesso processo: schema semplice di Fred ed editor BPMN. */
  const ws = { proc: null, version: 0, view: "bpmn", editorOk: false, editorLoaded: false };
  const wideMQ = window.matchMedia("(min-width: 900px)");

  function isWide() { return state.mode === "libero" && wideMQ.matches; }

  function applyLayout() {
    const wide = isWide();
    ui.popup.classList.toggle("wide", wide);
    ui.canvasCol.hidden = !wide;
    if (wide) {
      if (!ws.editorOk) {
        ws.editorOk = FredCanvas.init(ui.canvasBpmn);
        if (!ws.editorOk) { ws.view = "simple"; ui.viewBpmn.disabled = true; }
      }
      refreshCanvas();
    }
  }
  if (wideMQ.addEventListener) wideMQ.addEventListener("change", applyLayout);
  else if (wideMQ.addListener) wideMQ.addListener(applyLayout);

  function resetCanvas() {
    ws.proc = null;
    ws.version = 0;
    ws.editorLoaded = false;
    ui.canvasTitle.textContent = "Schema del processo";
    ui.canvasVersion.textContent = "";
    ui.canvasNote.hidden = true;
    ui.canvasSimple.innerHTML = "";
    [ui.exportSvg, ui.exportCopy, ui.exportBpmn].forEach((b) => { b.disabled = true; });
    refreshCanvas();
  }

  function renderSimple() {
    ui.canvasSimple.innerHTML = "";
    if (!ws.proc) return;
    ui.canvasSimple.appendChild(FredDiagram.render(ws.proc, { size: "full" }));
    ui.canvasSimple.appendChild(FredDiagram.legend(ws.proc));
  }

  function refreshCanvas() {
    const has = !!ws.proc;
    ui.canvasEmpty.hidden = has;
    ui.canvasSimple.hidden = !has || ws.view !== "simple";
    // l'editor non va mai nascosto con display:none, altrimenti bpmn-js
    // calcola dimensioni nulle e il diagramma diventa invisibile
    ui.canvasBpmn.classList.toggle("is-off", !has || ws.view !== "bpmn");
    ui.viewSimple.setAttribute("aria-pressed", String(ws.view === "simple"));
    ui.viewBpmn.setAttribute("aria-pressed", String(ws.view === "bpmn"));
    if (has && ws.view === "bpmn") requestAnimationFrame(() => FredCanvas.fit());
  }

  async function showVersion(proc, version) {
    ws.proc = proc;
    ws.version = version;
    refreshCanvas(); // prima rendo visibile l'area, poi carico il diagramma
    ui.canvasTitle.textContent = proc.title;
    ui.canvasVersion.textContent = "Versione " + version;
    ui.canvasNote.hidden = true;
    [ui.exportSvg, ui.exportCopy, ui.exportBpmn].forEach((b) => { b.disabled = false; });
    renderSimple();
    if (ws.editorOk) ws.editorLoaded = await FredCanvas.load(proc);
    refreshCanvas();
  }

  // Le modifiche fatte a mano nell'editor aggiornano anche lo schema semplice
  function syncFromEditor() {
    if (!ws.editorOk || !FredCanvas.isDirty()) return false;
    const p = FredCanvas.toProcess();
    if (!p || !p.nodes.length) return false;
    ws.proc = FredDiagram.autoLayout(p);
    renderSimple();
    return true;
  }

  FredCanvas.onChange(() => {
    ui.canvasNote.textContent = FLOW.sessions.libero.editedNote;
    ui.canvasNote.hidden = false;
  });

  function setView(v) {
    if (v === "simple") syncFromEditor();
    ws.view = v === "bpmn" && ws.editorOk ? "bpmn" : "simple";
    refreshCanvas();
  }
  ui.viewSimple.addEventListener("click", () => setView("simple"));
  ui.viewBpmn.addEventListener("click", () => setView("bpmn"));

  async function currentXML() {
    if (ws.editorOk && ws.editorLoaded) {
      try { return await FredCanvas.exportXML(); } catch (e) { FredLog.error(e); }
    }
    return ws.proc ? FredBPMN.toXML(ws.proc) : "";
  }

  async function currentSVG() {
    if (ws.editorOk && ws.editorLoaded) {
      try { return await FredCanvas.exportSVG(); } catch (e) { FredLog.error(e); }
    }
    if (!ws.proc) return "";
    const svg = FredDiagram.render(ws.proc, { size: "full" });
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(svg);
  }

  ui.exportBpmn.addEventListener("click", async () => {
    if (!ws.proc) return;
    downloadText(await currentXML(), FredBPMN.fileName(ws.proc), "application/xml");
  });
  ui.exportCopy.addEventListener("click", async () => {
    if (!ws.proc) return;
    copyText(await currentXML(), ui.exportCopy);
  });
  ui.exportSvg.addEventListener("click", async () => {
    if (!ws.proc) return;
    const svg = await currentSVG();
    if (svg) downloadText(svg, FredBPMN.fileName(ws.proc).replace(/\.bpmn$/, ".svg"), "image/svg+xml");
  });

  /* ---------------- modalità libera: descrivi → schema → correggi ----------------
     È il ciclo iterativo: l'utente descrive un processo a parole, il modello
     produce il JSON, il codice disegna lo schema (e il BPMN), l'utente corregge
     a parole e si genera una nuova versione, finché non va bene. */
  async function runLibero(run) {
    const ses = FLOW.sessions.libero;
    let proc = null;
    let version = 0;
    const history = [];
    for (const line of ses.greeting) await fredSay(line, run);

    while (true) {
      const ans = await askText({
        placeholder: proc ? ses.refinePlaceholder : ses.firstPlaceholder,
        skipLabel: proc ? ses.finishLabel : null
      });
      guard(run);
      clearComposer();

      // modifiche fatte a mano nell'editor: diventano lo schema attuale
      let edited = false;
      if (isWide() && syncFromEditor()) { proc = ws.proc; edited = true; }

      if (ans.kind === "skip") {
        addMsg("user", ses.finishLabel, "msg-skip");
        saveAnswer("processo-libero", proc);
        await fredSay(ses.closing, run);
        finish();
        return;
      }
      addMsg("user", ans.text);
      history.push(ans.text);

      const wait = thinking(proc ? ses.thinkingUpdate : ses.thinkingFirst);
      let result;
      try {
        result = await FredLLM.update(proc, history, ans.text, edited);
      } catch (err) {
        wait.remove();
        guard(run);
        FredLog.error("[Fred] errore del modello", err);
        history.pop();
        if (err.kind === "lungo") addMsg("fred", ses.errorTooLong, "msg-error");
        else if (err.kind === "formato") addMsg("fred", ses.errorFormat, "msg-error");
        else offerDemo(ses);
        continue; // l'utente può riprovare o riformulare
      }
      wait.remove();
      guard(run);
      if (edited) FredCanvas.markClean();

      const sig = (p) => JSON.stringify([p.title, p.lanes,
        p.nodes.map((n) => [n.id, n.type, n.lane, n.label, n.status]),
        p.edges.map((e) => [e.from, e.to, e.label || ""])]);
      const changed = !proc || sig(result.process) !== sig(proc);
      if (changed) {
        proc = markNew(proc, FredDiagram.autoLayout(result.process));
        version++;
        saveAnswer("processo-v" + version, proc);
        await showVersion(proc, version);
        guard(run);
        // prima lo schema, poi il commento di Fred (che può contenere una domanda)
        if (isWide()) addNote("Versione " + version + " pronta nello schema a destra.");
        else diagramCard({ proc: proc, version: version, bpmn: true });
      } else if (edited) {
        await showVersion(proc, version);
        guard(run);
      }
      addMsg("fred", result.reply);
    }
  }

  function addNote(text) {
    ui.log.appendChild(el("div", "log-note", text));
    scrollDown();
  }

  // Modello non raggiungibile: si può passare alla modalità dimostrativa
  function offerDemo(ses) {
    const box = el("div", "msg msg-fred msg-error");
    box.appendChild(document.createTextNode(ses.errorNetwork));
    if (FredLLM.CONFIG.provider !== "demo") {
      const b = el("button", "btn btn-ghost btn-sm demo-switch", ses.demoButton);
      b.type = "button";
      b.addEventListener("click", () => {
        FredLLM.setProvider("demo");
        b.disabled = true;
        addMsg("fred", ses.demoOn);
        const ta = ui.composer.querySelector("textarea");
        if (ta) ta.focus({ preventScroll: true });
      });
      box.appendChild(b);
    }
    ui.log.appendChild(box);
    scrollDown();
  }

  /* ---------------- cellulare: pagina iniziale con l'equipaggio ---------------- */
  const phoneMQ = window.matchMedia("(max-width: 760px)");
  const isPhone = () => true;          // il pilota mostra sempre la versione per cellulare
  const homeEl = document.getElementById("home");
  // percorso sul cellulare: le tappe di Fred, poi Al Fly
  const PHONE_PATH = ["mercoledi", "venerdi", "mercoledi2", "venerdi2", "alfly"];

  const FRED_STEPS = ["mercoledi", "venerdi", "mercoledi2", "venerdi2"];
  function alflyCount() { const s = FLOW.sessions.alfly; return (s && s.tappe) ? s.tappe.length : 1; }
  function alflyIndex() { return Math.min(state.memory.alflyTappa || 0, alflyCount() - 1); }
  const nextFredStep = () => FRED_STEPS.find((m) => !state.doneSteps[m]) || null;
  function renderHome() {
    const fredCard = homeEl.querySelector('[data-start="mercoledi"]');
    const alCard = homeEl.querySelector('[data-start="alfly"]');
    const next = nextFredStep();
    const doneCount = FRED_STEPS.filter((m) => state.doneSteps[m]).length;
    fredCard.querySelector(".crew-meta").textContent = next ? (doneCount ? "Riprendi: tappa " + (doneCount + 1) + " di 4" : "4 tappe")
                                                            : "Completato ✓";
    fredCard.disabled = !next;
    const alReady = !!state.memory.approvedProc && !state.doneSteps.alfly;
    alCard.disabled = !alReady;
    const alT = alflyIndex(), alN = alflyCount();
    alCard.querySelector(".crew-meta").textContent = state.doneSteps.alfly ? "Completato ✓"
      : !alReady ? "Disponibile dopo aver confermato la mappa con Fred"
      : alT ? "Riprendi: tappa " + (alT + 1) + " di " + alN
      : alN + " tappe brevi, dalla tua mappa confermata";
    document.getElementById("homeCode").textContent = profile ? "Il tuo codice di test: " + profile.codice : "";
  }

  function goHome() {
    renderHome();
    ui.popup.hidden = true;
    homeEl.hidden = false;
    const first = homeEl.querySelector(".crew-card");
    if (first) first.focus({ preventScroll: true });
  }
  function startFromHome(mode) {
    reset(mode);
    homeEl.hidden = true;
    open();
  }
  homeEl.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => {
    if (b.disabled) return;
    startFromHome(b.dataset.start === "mercoledi" ? (nextFredStep() || "venerdi2") : b.dataset.start);
  }));
  homeEl.querySelectorAll("[data-crew]").forEach((img) => {
    img.src = { alfly: ASSETS.alflyAvatar, ally: ASSETS.allyAvatar, rose: ASSETS.roseAvatar }[img.dataset.crew] || ASSETS.avatar;
  });
  /* ---------------- Rose Deiventi: problemi emersi e progetti per risolverli ----------------
     I dati arrivano dalla scheda "Progetti" del foglio Google (tramite lo script).
     Se non arrivano (nessuna rete, script non aggiornato, scheda vuota) si usa l'ultima
     versione vista su questo telefono; se non c'è nemmeno quella, un esempio. */
  const roseEl = document.getElementById("rose");
  const ROSE_CACHE = "alvolo-progetti", ROSE_VIEW = "alvolo-rose-vista";
  const ROSE_ESEMPIO = [
    { problema: "I documenti di un acquisto sono sparsi tra mail, cartelle condivise e gestionale", progetto: "Un'unica interfaccia per trovare tutti i documenti di un acquisto",
      completamento: 55, prossimo_passo: "Prova con un primo gruppo di buyer", aggiornato_il: "", segnalazioni: 9 },
    { problema: "Il controllo delle firme digitali su offerte e contratti si fa a mano, documento per documento", progetto: "Modello che riconosce le firme digitali nei documenti",
      completamento: 35, stato: "In addestramento", prossimo_passo: "Addestramento del modello su un archivio di documenti di esempio", aggiornato_il: "", segnalazioni: 6 },
    { problema: "Le richieste d'acquisto arrivano senza alcune informazioni e vanno completate più volte", progetto: "Modulo di richiesta con le informazioni necessarie già indicate",
      completamento: 20, prossimo_passo: "Raccolta dei campi necessari con chi fa le richieste", aggiornato_il: "", segnalazioni: 7 },
    { problema: "Non si vede a che punto è l'approvazione di un ordine", progetto: "Stato dell'approvazione visibile a chi ha fatto la richiesta",
      completamento: 100, stato: "Completato", prossimo_passo: "", aggiornato_il: "", segnalazioni: 5 },
    { problema: "Gli stessi dati del fornitore vengono ricopiati in più sistemi", progetto: "Anagrafica fornitori in un unico punto",
      completamento: 0, prossimo_passo: "Mappatura dei sistemi in cui compaiono i dati dei fornitori", aggiornato_il: "", segnalazioni: 4 }
  ];

  const rose = { list: null, source: "", filter: "tutti", view: "barre" };
  try { rose.view = localStorage.getItem(ROSE_VIEW) === "cerchi" ? "cerchi" : "barre"; } catch (e) { /* niente memoria */ }

  function pctOf(p) {
    const n = parseFloat(String(p.completamento == null ? "" : p.completamento).replace(",", ".").replace("%", ""));
    return isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }
  function stateOf(p) {
    const pct = pctOf(p);
    const kind = pct >= 100 ? "done" : pct <= 0 ? "idle" : "run";
    const label = String(p.stato || "").trim() || { done: "Completato", idle: "Da avviare", run: "In corso" }[kind];
    return { pct: pct, kind: kind, label: label, icon: { done: "✓", idle: "○", run: "→" }[kind] };
  }
  function ringSvg(pct) {
    const r = 30, c = 2 * Math.PI * r;
    return '<svg viewBox="0 0 72 72" aria-hidden="true"><circle class="trk" cx="36" cy="36" r="' + r + '" fill="none" stroke-width="7"/>' +
      '<circle class="val" cx="36" cy="36" r="' + r + '" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) +
      '" stroke-dashoffset="' + c.toFixed(2) + '" data-off="' + (c * (1 - pct / 100)).toFixed(2) + '"/></svg>';
  }
  function renderRose() {
    const list = rose.list || [];
    const st = list.map(stateOf);
    const done = st.filter((s) => s.kind === "done").length;
    const avg = list.length ? Math.round(st.reduce((a, s) => a + s.pct, 0) / list.length) : 0;
    document.getElementById("roseStats").innerHTML =
      '<div class="stat"><b>' + list.length + '</b><span>progetti</span></div>' +
      '<div class="stat"><b>' + done + '</b><span>completati</span></div>' +
      '<div class="stat"><b>' + avg + '%</b><span>avanzamento medio</span></div>';
    const src = document.getElementById("roseSource");
    src.textContent = rose.source;
    src.classList.toggle("is-example", rose.isExample);
    roseEl.querySelectorAll("#roseFilter button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === rose.filter)));
    roseEl.querySelectorAll("#roseView button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === rose.view)));

    const box = document.getElementById("roseList");
    box.innerHTML = "";
    const shown = list.map((p, i) => ({ p: p, s: st[i] })).filter((x) =>
      rose.filter === "tutti" || (rose.filter === "fatti" ? x.s.kind === "done" : x.s.kind !== "done"));
    if (!shown.length) {
      box.appendChild(el("div", "rose-empty", list.length ? "Nessun progetto in questo gruppo." : "Non ci sono ancora progetti da mostrare."));
      return;
    }
    shown.forEach(({ p, s }) => {
      const card = el("article", "proj is-" + s.kind);
      card.setAttribute("aria-label", (p.progetto || "Progetto") + ": " + s.pct + "% completato, " + s.label);
      const top = el("div", "proj-top");
      const txt = el("div", "proj-text");
      txt.appendChild(el("span", "proj-kicker", "Problema emerso"));
      txt.appendChild(el("p", "proj-problem", p.problema || ""));
      txt.appendChild(el("h2", "proj-title", p.progetto || ""));
      if (rose.view === "cerchi") {
        const ring = el("div", "ring");
        ring.innerHTML = ringSvg(s.pct);
        ring.appendChild(el("span", "pct", s.pct + "%"));
        top.appendChild(txt); top.appendChild(ring);
        card.appendChild(top);
      } else {
        top.appendChild(txt);
        card.appendChild(top);
        const row = el("div", "proj-bar");
        const bar = el("div", "bar"); const fill = el("i"); fill.style.width = "0%"; fill.dataset.w = s.pct + "%";
        bar.appendChild(fill); row.appendChild(bar); row.appendChild(el("span", "pct", s.pct + "%"));
        card.appendChild(row);
      }
      const meta = el("div", "proj-meta");
      meta.appendChild(el("span", "badge-st", s.icon + " " + s.label));
      const n = parseInt(p.segnalazioni, 10);
      if (n > 0) meta.appendChild(el("span", null, "Segnalato da " + n + (n === 1 ? " collega" : " colleghi")));
      if (p.aggiornato_il) meta.appendChild(el("span", null, "Aggiornato il " + p.aggiornato_il));
      card.appendChild(meta);
      if (p.prossimo_passo && s.kind !== "done") {
        const nx = el("p", "proj-next"); nx.appendChild(el("b", null, "Prossimo passo: ")); nx.appendChild(document.createTextNode(p.prossimo_passo));
        card.appendChild(nx);
      }
      card.appendChild(voteBox(p));
      box.appendChild(card);
    });
    // le barre e i cerchi si riempiono dopo il disegno
    requestAnimationFrame(() => requestAnimationFrame(() => {
      box.querySelectorAll(".bar i").forEach((f) => { f.style.width = f.dataset.w; });
      box.querySelectorAll(".ring .val").forEach((c) => { c.setAttribute("stroke-dashoffset", c.dataset.off); });
    }));
  }
  /* valutazione di ogni progetto: mi piace / non mi piace + commento, salvati nel foglio */
  const ROSE_VOTI = "alvolo-rose-voti";
  function sendVote(p, v) {
    if (!profile) return;
    const q = load(QUEUE, []);
    q.push({ data_ora: new Date().toISOString(), codice: profile.codice, divisione: profile.divisione, ruolo: profile.ruolo,
             personaggio: "Rose Deiventi", tappa: "Cruscotto", domanda_id: "valutazione_progetto", domanda: p.progetto || "",
             risposta: JSON.stringify({ progetto: p.progetto || "", voto: v.voto || "", commento: v.commento || "" }), passaggi: "" });
    store(QUEUE, q); flush();
  }
  function voteBox(p) {
    const key = p.progetto || p.problema || "";
    const all = load(ROSE_VOTI, {});
    const mine = all[key] || { voto: "", commento: "" };
    const wrap = el("div", "vote");
    wrap.appendChild(el("span", "vote-title", "La tua valutazione"));
    const row = el("div", "vote-row");
    const mk = (v, icon, label, base) => {
      const b = el("button", "vote-btn");
      b.type = "button"; b.setAttribute("aria-pressed", String(mine.voto === v));
      b.setAttribute("aria-label", label);
      b.appendChild(el("span", "vote-ico", icon));
      b.appendChild(el("span", "vote-n", String((base || 0) + (mine.voto === v ? 1 : 0))));
      b.addEventListener("click", () => {
        mine.voto = mine.voto === v ? "" : v;          // un secondo tocco toglie il voto
        const a = load(ROSE_VOTI, {}); a[key] = mine; store(ROSE_VOTI, a);
        sendVote(p, mine);
        wrap.replaceWith(voteBox(p));
      });
      return b;
    };
    row.appendChild(mk("su", "👍", "Mi piace", rose.isExample ? 0 : p.mi_piace));
    row.appendChild(mk("giu", "👎", "Non mi piace", rose.isExample ? 0 : p.non_mi_piace));
    wrap.appendChild(row);
    const ta = el("textarea", "vote-text");
    ta.rows = 2; ta.placeholder = "Scrivi cosa ne pensi (facoltativo)"; ta.value = mine.commento || "";
    ta.setAttribute("aria-label", "Commento su " + key);
    const send = el("button", "btn btn-ghost btn-sm", mine.commento ? "Aggiorna il commento" : "Invia il commento");
    send.type = "button"; send.disabled = true;
    const note = el("span", "vote-note", mine.commento ? "Commento inviato." : "");
    ta.addEventListener("input", () => { send.disabled = !ta.value.trim() || ta.value.trim() === (mine.commento || ""); });
    send.addEventListener("click", () => {
      mine.commento = ta.value.trim();
      const a = load(ROSE_VOTI, {}); a[key] = mine; store(ROSE_VOTI, a);
      sendVote(p, mine);
      send.disabled = true; send.textContent = "Aggiorna il commento"; note.textContent = "Grazie, commento inviato.";
    });
    wrap.appendChild(ta);
    const foot = el("div", "vote-foot"); foot.appendChild(send); foot.appendChild(note);
    wrap.appendChild(foot);
    return wrap;
  }
  function setRoseList(list, source, isExample) {
    rose.list = list; rose.source = source; rose.isExample = !!isExample;
    if (!roseEl.hidden) renderRose();
    updateRoseMeta();
  }
  function updateRoseMeta() {
    const meta = document.getElementById("roseMeta");
    if (!meta || !rose.list || rose.isExample) return;
    const open = rose.list.filter((p) => pctOf(p) < 100).length;
    meta.textContent = rose.list.length + " progetti, " + open + " in corso";
  }
  function loadRoseCache() {
    const cached = load(ROSE_CACHE, null);
    if (cached && Array.isArray(cached.progetti) && cached.progetti.length) {
      setRoseList(cached.progetti, "Ultimo aggiornamento ricevuto il " + cached.ricevuto + ". Sto controllando se ci sono novità…", false);
    } else {
      setRoseList(ROSE_ESEMPIO, "Esempio: i progetti veri compariranno qui quando il gruppo di progetto compila la scheda “Progetti” del foglio.", true);
    }
  }
  async function fetchRose() {
    if (!endpointOk()) { loadRoseCache(); return; }
    try {
      const res = await fetch(PILOT.endpoint + "?progetti=1&codice=" + encodeURIComponent(profile ? profile.codice : ""), { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.progetti)) throw new Error("risposta senza progetti");
      const list = data.progetti.filter((p) => p && (p.progetto || p.problema));
      if (!list.length) {
        setRoseList(ROSE_ESEMPIO, "Esempio: la scheda “Progetti” del foglio è ancora vuota.", true);
        return;
      }
      const ricevuto = new Date().toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      store(ROSE_CACHE, { progetti: list, ricevuto: ricevuto });
      setRoseList(list, "Dati del gruppo di progetto, aggiornati al " + ricevuto + ".", false);
    } catch (err) {
      const cached = load(ROSE_CACHE, null);
      if (cached && Array.isArray(cached.progetti) && cached.progetti.length) {
        setRoseList(cached.progetti, "Senza connessione: ultimo aggiornamento ricevuto il " + cached.ricevuto + ".", false);
      } else {
        setRoseList(ROSE_ESEMPIO, "Esempio: per ora non riesco a leggere i progetti dal foglio.", true);
      }
    }
  }
  function openRose() {
    homeEl.hidden = true;
    ui.popup.hidden = true;
    roseEl.hidden = false;
    document.getElementById("roseAvatar").src = ASSETS.roseAvatar;
    loadRoseCache();
    renderRose();
    fetchRose();
    window.scrollTo(0, 0);
    document.getElementById("roseBack").focus({ preventScroll: true });
    if (profile) {                // per il pilota: chi apre il cruscotto e quando
      const q = load(QUEUE, []);
      q.push({ data_ora: new Date().toISOString(), codice: profile.codice, divisione: profile.divisione, ruolo: profile.ruolo,
               personaggio: "Rose Deiventi", tappa: "Cruscotto", domanda_id: "cruscotto_aperto", domanda: "", risposta: "aperto", passaggi: "" });
      store(QUEUE, q); flush();
    }
  }
  function closeRose() { roseEl.hidden = true; goHome(); }
  homeEl.querySelector("[data-rose]").addEventListener("click", openRose);
  document.getElementById("roseBack").addEventListener("click", closeRose);
  roseEl.querySelectorAll("#roseFilter button").forEach((b) => b.addEventListener("click", () => { rose.filter = b.dataset.f; renderRose(); }));
  roseEl.querySelectorAll("#roseView button").forEach((b) => b.addEventListener("click", () => {
    rose.view = b.dataset.v; try { localStorage.setItem(ROSE_VIEW, rose.view); } catch (e) { /* niente memoria */ }
    renderRose();
  }));
  roseEl.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRose(); });

  /* ---------------- ingresso: privacy, divisione, ruolo → codice ---------------- */
  const welcomeEl = document.getElementById("welcome");
  function setupWelcome() {
    document.getElementById("privacyText").textContent = PILOT.notaPrivacy || "";
    document.getElementById("configWarning").hidden = endpointOk();
    document.getElementById("welcomeGo").addEventListener("click", () => {
      // codice di test: prefisso + 3 cifre casuali + suffisso (es. T123TT); divisione e ruolo arriveranno da Workday
      const n = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      profile = { codice: (PILOT.codicePrefisso || "T") + n + (PILOT.codiceSuffisso || "TT"), divisione: "", ruolo: "" };
      saveProgress();
      welcomeEl.hidden = true;
      goHome();
    });
  }
  function applyPhoneLayout() {
    document.body.classList.add("phone", "pilot");
    if (!profile) { welcomeEl.hidden = false; homeEl.hidden = true; return; }
    welcomeEl.hidden = true;
    if (ui.popup.hidden) { renderHome(); homeEl.hidden = false; }
  }
  if (phoneMQ.addEventListener) phoneMQ.addEventListener("change", applyPhoneLayout);
  else if (phoneMQ.addListener) phoneMQ.addListener(applyPhoneLayout);

  function finish() {
    state.done = true;
    state.doneSteps[state.mode] = true;
    renderTour();
    ui.badge.hidden = true;
    ui.teaser.hidden = true;
    if (isPhone()) {
      // sul cellulare non c'è la barra della presentazione: la tappa successiva si apre da qui
      saveProgress();
      const i = PHONE_PATH.indexOf(state.mode);
      let next = i >= 0 && i < PHONE_PATH.length - 1 ? PHONE_PATH[i + 1] : null;
      if (next === "alfly" && !state.memory.approvedProc) next = null;     // Al Fly parte solo da una mappa confermata
      const step = next && FLOW.tour.find((t) => t.mode === next);
      const buttons = [];
      if (step) buttons.push({ label: "Prossima tappa: " + step.title, primary: true, onClick: () => startFromHome(next) });
      buttons.push({ label: "Torna all'equipaggio", primary: !step, onClick: goHome });
      actions(buttons);
      return;
    }
    actions([{ label: "Chiudi", primary: true, onClick: minimize }]);
  }

  /* ---------------- apertura / chiusura ---------------- */
  function open() {
    ui.launcher.hidden = true;
    ui.popup.hidden = false;
    ui.popup.classList.remove("opening");
    void ui.popup.offsetWidth;
    ui.popup.classList.add("opening");
    applyLayout();
    if (!state.started) {
      state.started = true;
      const run = state.run;
      const ses = FLOW.sessions[state.mode];
      const flow = ses.type === "verifica" ? (r) => runVerifica(r, ses)
        : ses.type === "esplorazione" ? (r) => runEsplorazione(r, ses)
        : ses.type === "libero" ? runLibero
        : (r) => runDomande(r, ses);
      flow(run).catch((err) => {
        if (err && err.message === "demo interrotta") return; // demo riavviata: tutto normale
        // Errore vero: lo mostriamo invece di lasciare la conversazione ferma
        FredLog.error("[Fred] errore nella conversazione", err);
        state.busy = false;
        ui.log.querySelectorAll(".typing").forEach((t) => t.remove());
        addMsg("fred", "Qualcosa è andato storto e la conversazione si è fermata. Puoi ricominciare da capo.", "msg-error");
        actions([{ label: "Ricomincia", primary: true, onClick: () => { const m = state.mode; reset(m); open(); } }]);
      });
    } else {
      const f = ui.composer.querySelector("textarea, button");
      if (f) f.focus({ preventScroll: true });
    }
  }

  function minimize() {
    if (isPhone()) { goHome(); return; }
    ui.popup.hidden = true;
    ui.launcher.hidden = false;
    ui.launcherBtn.focus({ preventScroll: true });
  }

  // Personaggio della tappa: Fred Quenza oppure Al Fly
  function currentCharacter() {
    const ses = FLOW.sessions[state.mode] || {};
    return (ses.character && ses.character.id) || "fred";
  }
  function applyCharacter(ses) {
    const alfly = ses.character && ses.character.id === "alfly";
    document.querySelectorAll('[data-asset="avatar"]').forEach((img) => {
      img.src = alfly ? ASSETS.alflyAvatar : ASSETS.avatar;
    });
    ui.charName.textContent = alfly ? ses.character.name : FLOW.character.name;
  }

  function reset(mode) {
    state.run++;
    state.mode = mode;
    state.started = false;
    state.done = false;
    state.answers = {};
    const ses = FLOW.sessions[mode];
    if (ses.tappe) ses.dayLabel = "Tappa " + (alflyIndex() + 1) + " di " + ses.tappe.length;
    applyCharacter(ses);
    ui.log.innerHTML = "";
    clearComposer();
    ui.dayLabel.textContent = ses.dayLabel;
    ui.teaser.textContent = ses.teaser;
    ui.teaser.hidden = false;
    ui.badge.hidden = false;
    ui.popup.hidden = true;
    ui.launcher.hidden = false;
    closeModal();
    resetCanvas();
    applyLayout();
    renderTour();
  }

  /* ---------------- barra della presentazione (percorso a tappe) ----------------
     Solo per la demo: permette di mostrare in sequenza più interazioni.
     Le tappe successive ricordano le risposte delle precedenti. */
  const tourEl = document.getElementById("tourSteps");
  const tourNext = document.getElementById("tourNext");
  const tourRestart = document.getElementById("tourRestart");

  function tourIndex() { return FLOW.tour.findIndex((t) => t.mode === state.mode); }

  function renderTour() {
    if (!tourEl) return;
    const cur = tourIndex();
    tourEl.querySelectorAll("[data-demo]").forEach((b, i) => {
      b.classList.toggle("is-current", i === cur);
      b.classList.toggle("is-done", !!state.doneSteps[b.dataset.demo]);
      if (i === cur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    const last = cur >= FLOW.tour.length - 1;
    tourNext.disabled = last;
    tourNext.classList.toggle("is-ready", !!state.done && !last);
  }

  function buildTour() {
    if (!tourEl) return;
    FLOW.tour.forEach((t, i) => {
      const b = el("button", "tour-step");
      b.type = "button";
      b.dataset.demo = t.mode;
      const n = el("span", "tour-num", String(i + 1));
      const txt = el("span", "tour-txt");
      txt.appendChild(el("span", "tour-day", t.day));
      txt.appendChild(el("span", "tour-title", t.title));
      b.appendChild(n);
      b.appendChild(txt);
      tourEl.appendChild(b);
    });
    tourNext.addEventListener("click", () => {
      const i = tourIndex();
      if (i < FLOW.tour.length - 1) reset(FLOW.tour[i + 1].mode);
    });
    tourRestart.addEventListener("click", () => {
      state.memory = {};
      state.doneSteps = {};
      FredLLM.setProvider(FredLLM.CONFIG.defaultProvider || "anthropic");
      reset(FLOW.tour[0].mode);
    });
  }

  /* ---------------- avvio ---------------- */
  document.querySelectorAll('[data-asset="avatar"]').forEach((img) => { img.src = ASSETS.avatar; });
  ui.charName.textContent = FLOW.character.name;
  ui.privacy.textContent = FLOW.privacyNote;
  ui.launcherBtn.addEventListener("click", open);
  ui.minimize.addEventListener("click", minimize);
  buildTour();
  document.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", () => reset(b.dataset.demo)));
  // progressi salvati sul telefono: chi riapre la pagina riprende da dove era
  const saved = load(STORE, {});
  if (saved.doneSteps) state.doneSteps = saved.doneSteps;
  if (saved.memory) state.memory = saved.memory;
  reset(nextFredStep() || "venerdi2");
  setupWelcome();
  applyPhoneLayout();
  flush();
})();
