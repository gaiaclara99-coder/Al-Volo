/* =====================================================================
   EDITOR BPMN (bpmn-js) E SINCRONIZZAZIONE CON FRED
   ---------------------------------------------------------------------
   - load(proc): converte il JSON di Fred in BPMN e lo apre nell'editor.
   - L'utente può modificare il diagramma a mano (spostare, rinominare,
     aggiungere passaggi e collegamenti).
   - toProcess(): riconverte il diagramma modificato nel JSON di Fred,
     così alla richiesta successiva il modello lavora sulla versione
     corretta a mano e non su quella vecchia.
   - exportXML() / exportSVG(): esportazione dal diagramma attuale.
   Se bpmn-js non è disponibile, available() restituisce false e
   l'app usa solo lo schema semplice.
   ===================================================================== */

window.FredCanvas = (function () {
  let modeler = null;
  let importing = false;
  let dirty = false;
  let listeners = [];
  let current = null; // ultimo JSON caricato (per i dati che il BPMN non conserva)

  function available() {
    return typeof window.BpmnJS === "function";
  }

  function init(container) {
    if (modeler || !available()) return !!modeler;
    try {
      // la tastiera (Canc per eliminare, Ctrl+Z per annullare…) funziona
      // quando l'area dell'editor ha il focus, senza disturbare la chat
      container.setAttribute("tabindex", "0");
      container.setAttribute("aria-label", "Editor BPMN del processo");
      modeler = new window.BpmnJS({ container: container, keyboard: { bindTo: container } });
      container.addEventListener("mousedown", (e) => {
        if (e.target.closest && e.target.closest('[contenteditable="true"]')) return;
        container.focus({ preventScroll: true });
      });
      modeler.on("commandStack.changed", () => {
        if (importing) return;
        dirty = true;
        listeners.forEach((fn) => { try { fn(); } catch (e) { FredLog.error(e); } });
      });
      return true;
    } catch (err) {
      FredLog.error("[Fred] bpmn-js non avviato", err);
      modeler = null;
      return false;
    }
  }

  function onChange(fn) { listeners.push(fn); }

  async function load(proc) {
    current = proc;
    dirty = false;
    if (!modeler) return false;
    importing = true;
    try {
      const res = await modeler.importXML(window.FredBPMN.toXML(proc));
      if (res && res.warnings && res.warnings.length) FredLog.warn("[Fred] avvisi bpmn-js", res.warnings);
      fit();
      return true;
    } catch (err) {
      FredLog.error("[Fred] importazione BPMN non riuscita", err);
      return false;
    } finally {
      importing = false;
    }
  }

  function fit() {
    if (!modeler) return;
    try {
      const canvas = modeler.get("canvas");
      canvas.resized();                 // ricalcola le dimensioni del contenitore
      // adatta il diagramma all'area lasciando spazio alla tavolozza a sinistra
      const vb = canvas.viewbox();
      const inner = vb.inner, outer = vb.outer;
      if (!inner || !inner.width || !outer.width || !outer.height) return;
      const left = 120, pad = 24;
      const scale = Math.min((outer.width - left - pad) / inner.width, (outer.height - 2 * pad) / inner.height, 1);
      if (!isFinite(scale) || scale <= 0) return;
      const w = outer.width / scale, h = outer.height / scale;
      canvas.viewbox({
        x: inner.x - left / scale,
        y: inner.y - (h - inner.height) / 2,
        width: w,
        height: h
      });
    } catch (e) { /* contenitore non ancora visibile: si riprova quando lo è */ }
  }

  function isDirty() { return dirty; }
  function markClean() { dirty = false; }

  // Diagramma attuale dell'editor → JSON nel formato di Fred
  function toProcess() {
    if (!modeler) return current;
    const defs = modeler.getDefinitions();
    if (!defs) return current;
    const roots = defs.rootElements || [];
    const process = roots.find((r) => r.$type === "bpmn:Process");
    if (!process) return current;
    const collab = roots.find((r) => r.$type === "bpmn:Collaboration");
    const participant = collab && (collab.participants || []).find((p) => p.processRef === process);

    const lanes = [];
    const laneOf = {};
    (process.laneSets || []).forEach((ls) => {
      (ls.lanes || []).forEach((lane) => {
        const idx = lanes.length;
        lanes.push(lane.name || "Attore " + (idx + 1));
        (lane.flowNodeRef || []).forEach((n) => { laneOf[n.id] = idx; });
      });
    });
    if (!lanes.length) lanes.push("Attore");

    const toId = (bpmnId) => bpmnId.indexOf("N_") === 0 ? bpmnId.slice(2) : bpmnId;
    const typeOf = (el) => {
      const t = el.$type;
      if (t === "bpmn:StartEvent") return "start";
      if (t === "bpmn:EndEvent") return "end";
      if (/Gateway$/.test(t)) return "decision";
      if (/Task$|SubProcess$|CallActivity$|IntermediateCatchEvent$|IntermediateThrowEvent$/.test(t)) return "task";
      return null;
    };

    const nodes = [];
    const edges = [];
    const known = new Set();
    (process.flowElements || []).forEach((el) => {
      const type = typeOf(el);
      if (!type) return;
      const doc = (el.documentation || []).map((d) => d.text || "").join(" ");
      nodes.push({
        id: toId(el.id),
        type: type,
        lane: laneOf[el.id] != null ? laneOf[el.id] : 0,
        label: (el.name || "").trim() || "(senza nome)",
        status: /verificare/i.test(doc) ? "verify" : "confirmed"
      });
      known.add(el.id);
    });
    (process.flowElements || []).forEach((el) => {
      if (el.$type !== "bpmn:SequenceFlow" || !el.sourceRef || !el.targetRef) return;
      if (!known.has(el.sourceRef.id) || !known.has(el.targetRef.id)) return;
      edges.push({ from: toId(el.sourceRef.id), to: toId(el.targetRef.id), label: el.name || "" });
    });

    return {
      title: (participant && participant.name) || (current && current.title) || "Processo",
      lanes: lanes,
      nodes: nodes,
      edges: edges
    };
  }

  async function exportXML() {
    if (!modeler) return current ? window.FredBPMN.toXML(current) : "";
    const res = await modeler.saveXML({ format: true });
    return res.xml;
  }

  async function exportSVG() {
    if (!modeler) return null;
    const res = await modeler.saveSVG();
    return res.svg;
  }

  return {
    available: available, init: init, load: load, fit: fit, onChange: onChange,
    isDirty: isDirty, markClean: markClean, toProcess: toProcess,
    exportXML: exportXML, exportSVG: exportSVG
  };
})();
