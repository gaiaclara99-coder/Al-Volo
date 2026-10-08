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
    sc.appendChild(FredDiagram.render(proc, { size: "compact", onSelect: opts.onSelect, selectedId: opts.selectedId,
                                              selectedIds: opts.selectedIds }));
    card._redraw = (ids) => {
      sc.innerHTML = "";
      sc.appendChild(FredDiagram.render(proc, { size: "compact", onSelect: opts.onSelect, selectedIds: ids }));
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

  async function askQuestion(run, q, ctx) {
    const text = fill(q.text, { passaggio: ctx.node ? ctx.node.label : "" });
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
        { k: "elimina", l: "Eliminalo", ok: !isTerminal(node) },
        { k: "prima", l: "Aggiungi un passaggio prima", ok: node.type !== "start" },
        { k: "dopo", l: "Aggiungi un passaggio dopo", ok: node.type !== "end" },
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
        node.label = a.text; node.status = "confirmed"; delete node.note; node.isNew = true;
        record = { azione: "riscritto", passaggio: before, testo: a.text };
        log.push("hai riscritto " + q2(before) + " come " + q2(a.text));
      } else if (pick.k === "elimina") {
        deleteNode(p, node.id);
        record = { azione: "eliminato", passaggio: before };
        log.push("hai eliminato " + q2(before));
      } else if (pick.k === "prima" || pick.k === "dopo") {
        await fredSay("Scrivi il nuovo passaggio con le tue parole.", run);
        const a = await askText({ placeholder: "Scrivi qui…" });
        guard(run); clearComposer(); addMsg("user", a.text);
        const lane = await askLane(run, p, "Chi lo fa?");
        const nid = newNodeId(p);
        p.nodes.push({ id: nid, type: "task", lane: lane, status: "confirmed", label: a.text, isNew: true });
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
        node.lane = lane; node.isNew = true;
        pruneLanes(p);
        record = { azione: "cambiato ruolo", passaggio: before, ruolo: p.lanes[node.lane] };
        log.push("hai indicato che " + q2(before) + " lo fa: " + p.lanes[node.lane]);
      } else if (pick.k === "commento") {
        await fredSay("Scrivi il tuo commento: lo riporto così come lo scrivi.", run);
        const a = await askText({ placeholder: "Scrivi qui…" });
        guard(run); clearComposer(); addMsg("user", a.text);
        node.status = "variant"; node.note = "Detto da te: «" + a.text + "»"; node.isNew = true;
        record = { azione: "commento", passaggio: before, testo: a.text };
        log.push("hai commentato " + q2(before));
      }
      p = FredDiagram.autoLayout(p);
      saveAnswer("modifica_mappa", JSON.stringify(record), before);
      state.memory.proc = p;
      state.memory.lastChange = { node: before, text: log.join("; "), summary: null, edits: true };
      state.memory.followUps = null;
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
  async function runEsplorazione(run, ses) {
    const proc = FredDiagram.autoLayout(clone(state.memory.approvedProc || state.memory.proc || FLOW.process));
    proc.nodes.forEach((n) => { delete n.isNew; });
    const groups = ses.tappe || [ses.questions.map((q) => q.id)];
    const i = alflyIndex();
    const qs = ses.questions.filter((q) => groups[i].indexOf(q.id) >= 0);
    const usesMap = (q) => ["selectStep", "selectSteps", "mapChange"].indexOf(q.type) >= 0;
    if (i === 0) {
      scene();
      for (const line of ses.greeting) await fredSay(line, run);
      if (ses.intro) await fredSay(ses.intro, run);
      diagramCard({ proc: proc });
      await new Promise((resolve) => actions([{ label: "Va bene", primary: true, onClick: resolve },
                                              { label: "Più tardi", onClick: minimize }]));
      guard(run);
      clearComposer();
    } else {
      for (const line of ses.greetingAgain || []) await fredSay(line, run);
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
    const greeting = (mine && ses.greetingIfChange) ? ses.greetingIfChange : ses.greeting;

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
