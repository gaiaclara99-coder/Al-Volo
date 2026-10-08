/* =====================================================================
   ESPORTAZIONE BPMN 2.0
   Converte il processo JSON di Fred in un file .bpmn standard
   (modello + coordinate grafiche), apribile con bpmn.io, Camunda
   Modeler, Signavio, Bizagi e simili.
   La conversione è deterministica: il modello linguistico produce
   solo il JSON, mai l'XML (più veloce e senza XML malformato).
   Nel file BPMN le corsie sono orizzontali e il flusso va da sinistra
   a destra, come nella convenzione più diffusa.
   ===================================================================== */

window.FredBPMN = (function () {
  const COL = 170;        // larghezza di una colonna (una riga dello schema verticale)
  const LANE_H = 140;     // altezza di una corsia
  const X0 = 40, Y0 = 40; // margine
  const HEAD = 30;        // fascia con il nome del pool / della corsia
  const PAD = 30;
  const SIZE = {
    task: [110, 70], decision: [50, 50], start: [36, 36], end: [36, 36]
  };
  const TAG = { task: "task", decision: "exclusiveGateway", start: "startEvent", end: "endEvent" };

  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const nid = (id) => "N_" + String(id).replace(/[^A-Za-z0-9_-]/g, "_");

  function toXML(proc) {
    const nodes = proc.nodes;
    const byId = {};
    nodes.forEach((n) => { byId[n.id] = n; });
    const edges = proc.edges.filter((e) => byId[e.from] && byId[e.to] && e.from !== e.to);
    const cols = Math.max.apply(null, nodes.map((n) => n.row || 0)) + 1;
    const poolW = HEAD * 2 + PAD * 2 + cols * COL;
    const poolH = proc.lanes.length * LANE_H;

    const geo = {};
    nodes.forEach((n) => {
      const sz = SIZE[n.type] || SIZE.task;
      const cx = X0 + HEAD * 2 + PAD + (n.row || 0) * COL + COL / 2;
      const cy = Y0 + n.lane * LANE_H + LANE_H / 2;
      geo[n.id] = { cx: cx, cy: cy, w: sz[0], h: sz[1], x: cx - sz[0] / 2, y: cy - sz[1] / 2 };
    });

    const flows = edges.map((e, i) => ({ e: e, id: "Flow_" + (i + 1) }));
    const incoming = {}, outgoing = {};
    nodes.forEach((n) => { incoming[n.id] = []; outgoing[n.id] = []; });
    flows.forEach((f) => { outgoing[f.e.from].push(f.id); incoming[f.e.to].push(f.id); });

    // --- modello ---
    let x = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
      'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
      'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
      'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ' +
      'id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" ' +
      'exporter="Fred Quenza mock-up" exporterVersion="0.2">\n';
    x += '  <bpmn:collaboration id="Collaboration_1">\n' +
      '    <bpmn:participant id="Participant_1" name="' + esc(proc.title) + '" processRef="Process_1" />\n' +
      '  </bpmn:collaboration>\n';
    x += '  <bpmn:process id="Process_1" isExecutable="false">\n';
    x += '    <bpmn:laneSet id="LaneSet_1">\n';
    proc.lanes.forEach((name, li) => {
      x += '      <bpmn:lane id="Lane_' + li + '" name="' + esc(name) + '">\n';
      nodes.filter((n) => n.lane === li).forEach((n) => {
        x += '        <bpmn:flowNodeRef>' + nid(n.id) + '</bpmn:flowNodeRef>\n';
      });
      x += '      </bpmn:lane>\n';
    });
    x += '    </bpmn:laneSet>\n';
    nodes.forEach((n) => {
      const tag = TAG[n.type] || "task";
      x += '    <bpmn:' + tag + ' id="' + nid(n.id) + '" name="' + esc(n.label) + '">\n';
      if (n.status === "verify") {
        x += '      <bpmn:documentation>Passaggio da verificare con i colleghi</bpmn:documentation>\n';
      }
      incoming[n.id].forEach((f) => { x += '      <bpmn:incoming>' + f + '</bpmn:incoming>\n'; });
      outgoing[n.id].forEach((f) => { x += '      <bpmn:outgoing>' + f + '</bpmn:outgoing>\n'; });
      x += '    </bpmn:' + tag + '>\n';
    });
    flows.forEach((f) => {
      x += '    <bpmn:sequenceFlow id="' + f.id + '" sourceRef="' + nid(f.e.from) + '" targetRef="' + nid(f.e.to) + '"' +
        (f.e.label ? ' name="' + esc(f.e.label) + '"' : '') + ' />\n';
    });
    x += '  </bpmn:process>\n';

    // --- grafica ---
    x += '  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n' +
      '    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">\n';
    x += shape("Participant_1", X0, Y0, poolW, poolH, ' isHorizontal="true"');
    proc.lanes.forEach((_, li) => {
      x += shape("Lane_" + li, X0 + HEAD, Y0 + li * LANE_H, poolW - HEAD, LANE_H, ' isHorizontal="true"');
    });
    nodes.forEach((n) => {
      const g = geo[n.id];
      x += shape(nid(n.id), g.x, g.y, g.w, g.h, n.type === "decision" ? ' isMarkerVisible="true"' : "");
    });
    const bottom = Y0 + poolH - 14;
    flows.forEach((f) => {
      const a = geo[f.e.from], b = geo[f.e.to];
      let pts;
      if ((byId[f.e.to].row || 0) <= (byId[f.e.from].row || 0)) {
        // ciclo: passa sotto, lungo il fondo del pool
        pts = [[a.cx, a.y + a.h], [a.cx, bottom], [b.cx, bottom], [b.cx, b.y + b.h]];
      } else {
        const na = byId[f.e.from], nb = byId[f.e.to];
        const sx = a.x + a.w, tx = b.x;
        const laneTop = (lane) => Y0 + lane * LANE_H + 14;
        const sameLaneBlocked = blocked(nodes, nb.lane, na.row, nb.row, na, nb);
        if (na.lane === nb.lane) {
          // stessa corsia: dritto, oppure sopra gli altri nodi se in mezzo ce ne sono
          pts = !sameLaneBlocked ? [[sx, a.cy], [tx, b.cy]]
            : [[a.cx, a.y], [a.cx, laneTop(na.lane)], [b.cx, laneTop(na.lane)], [b.cx, b.y]];
        } else {
          const early = Math.round(sx + Math.min(30, (tx - sx) / 2)); // curva subito dopo l'origine
          const late = Math.round(tx - Math.min(30, (tx - sx) / 2));  // curva poco prima dell'arrivo
          if (!sameLaneBlocked) pts = [[sx, a.cy], [early, a.cy], [early, b.cy], [tx, b.cy]];
          else if (!blocked(nodes, na.lane, na.row, nb.row, na, nb)) pts = [[sx, a.cy], [late, a.cy], [late, b.cy], [tx, b.cy]];
          else pts = [[sx, a.cy], [early, a.cy], [early, laneTop(nb.lane)], [b.cx, laneTop(nb.lane)], [b.cx, b.y]];
        }
      }
      x += '      <bpmndi:BPMNEdge id="' + f.id + '_di" bpmnElement="' + f.id + '">\n';
      pts.forEach((p) => { x += '        <di:waypoint x="' + Math.round(p[0]) + '" y="' + Math.round(p[1]) + '" />\n'; });
      x += '      </bpmndi:BPMNEdge>\n';
    });
    x += '    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>\n</bpmn:definitions>\n';
    return x;
  }

  // c'è un altro nodo nella corsia "lane" tra le colonne r1 e r2?
  function blocked(nodes, lane, r1, r2, a, b) {
    return nodes.some((m) => m !== a && m !== b && m.lane === lane &&
      (m.row || 0) > Math.min(r1, r2) && (m.row || 0) < Math.max(r1, r2));
  }

  function shape(el, x, y, w, h, extra) {
    return '      <bpmndi:BPMNShape id="' + el + '_di" bpmnElement="' + el + '"' + (extra || "") + '>\n' +
      '        <dc:Bounds x="' + Math.round(x) + '" y="' + Math.round(y) + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '" />\n' +
      '      </bpmndi:BPMNShape>\n';
  }

  function fileName(proc) {
    const base = String(proc.title || "processo").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "processo";
    return base + ".bpmn";
  }

  return { toXML: toXML, fileName: fileName };
})();
