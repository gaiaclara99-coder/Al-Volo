/* =====================================================================
   SCHEMA DEL PROCESSO – disegna in SVG un processo nel formato JSON
   di Fred (lanes / nodes / edges).
   - render(proc, opts): disegna. Formati "compact" (pop-up) e "full".
   - autoLayout(proc): calcola righe e percorsi delle frecce per i
     processi generati dal modello (quelli scritti a mano in flow.js
     hanno già "row" e non ne hanno bisogno).
   ===================================================================== */

window.FredDiagram = (function () {
  const NS = "http://www.w3.org/2000/svg";
  let uid = 0;

  const SIZES = {
    compact: { laneW: 86, nodeW: 74, rowH: 66, nodeH: 50, headH: 36, font: 9.5, lineH: 11, headFont: 9.5 },
    full:    { laneW: 200, nodeW: 164, rowH: 92, nodeH: 56, headH: 46, font: 13, lineH: 16, headFont: 13 }
  };

  const C = {
    ink: "#1F2A44", ink2: "#4A4740", paper: "#FBF8F2", band: "#F3EDE1",
    line: "#DDD6C8", brass: "#8A5A12", brassLine: "#B7791F", variantFill: "#FFF5E2",
    verify: "#7C8496", select: "#2F6FB0", fresh: "#2E7D4F", freshFill: "#ECF7F0"
  };

  function s(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function wrap(text, maxChars) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    words.forEach((w) => {
      const next = cur ? cur + " " + w : w;
      if (next.length > maxChars && cur) { lines.push(cur); cur = w; }
      else cur = next;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function multiline(parent, lines, cx, cy, S, fill, weight) {
    const t = s("text", {
      x: cx, "text-anchor": "middle", fill: fill,
      "font-size": S.font, "font-weight": weight || 500,
      "font-family": "Archivo, 'Helvetica Neue', sans-serif"
    }, parent);
    const startY = cy - ((lines.length - 1) * S.lineH) / 2 + S.font * 0.35;
    lines.forEach((ln, i) => {
      const ts = s("tspan", { x: cx, y: startY + i * S.lineH }, t);
      ts.textContent = ln;
    });
    return t;
  }

  /* ------------------------------------------------------------------
     IMPAGINAZIONE AUTOMATICA
     1. trova i cicli (frecce che tornano indietro);
     2. assegna a ogni nodo la riga = percorso più lungo dall'inizio;
     3. se due nodi dello stesso attore finiscono sulla stessa riga,
        sposta giù il secondo e ricalcola;
     4. sceglie da dove far uscire le frecce per non attraversare nodi.
     ------------------------------------------------------------------ */
  function autoLayout(proc) {
    const nodes = proc.nodes, edges = proc.edges;
    const byId = {};
    nodes.forEach((n) => { byId[n.id] = n; });
    const valid = edges.filter((e) => byId[e.from] && byId[e.to] && e.from !== e.to);
    const out = {};
    nodes.forEach((n) => { out[n.id] = []; });
    valid.forEach((e) => out[e.from].push(e));

    // 1. cicli
    const color = {};
    const back = new Set();
    const order = nodes.filter((n) => n.type === "start").concat(nodes.filter((n) => n.type !== "start"));
    function dfs(id) {
      color[id] = 1;
      out[id].forEach((e) => {
        if (color[e.to] === 1) back.add(e);
        else if (!color[e.to]) dfs(e.to);
      });
      color[id] = 2;
    }
    order.forEach((n) => { if (!color[n.id]) dfs(n.id); });

    // 2-3. righe
    const minRank = {};
    let rank = {};
    for (let iter = 0; iter < 300; iter++) {
      rank = {};
      nodes.forEach((n) => { rank[n.id] = minRank[n.id] || 0; });
      for (let k = 0; k <= nodes.length; k++) {
        let changed = false;
        valid.forEach((e) => {
          if (back.has(e)) return;
          if (rank[e.to] < rank[e.from] + 1) { rank[e.to] = rank[e.from] + 1; changed = true; }
        });
        if (!changed) break;
      }
      const seen = {};
      let bumped = false;
      nodes.slice().sort((a, b) => rank[a.id] - rank[b.id]).forEach((n) => {
        const key = n.lane + ":" + rank[n.id];
        if (seen[key]) { minRank[n.id] = rank[n.id] + 1; bumped = true; }
        else seen[key] = true;
      });
      if (!bumped) break;
    }
    nodes.forEach((n) => { n.row = rank[n.id]; });

    // 4. uscite delle frecce
    const blockedInLane = (lane, r1, r2, a, b) =>
      nodes.some((m) => m !== a && m !== b && m.lane === lane && m.row > Math.min(r1, r2) && m.row < Math.max(r1, r2));

    valid.forEach((e) => { e.exit = null; e.route = null; e.bendLate = false; });
    nodes.forEach((n) => {
      let usedBottom = false, usedRight = false, usedLeft = false;
      out[n.id].filter((e) => !back.has(e)).forEach((e) => {
        const t = byId[e.to];
        if (t.lane === n.lane) {
          if (!usedBottom && !blockedInLane(n.lane, n.row, t.row, n, t)) usedBottom = true;
          else { e.exit = usedLeft ? "right" : "left"; e.route = "side"; if (e.exit === "left") usedLeft = true; else usedRight = true; }
          return;
        }
        const goRight = t.lane > n.lane;
        const targetBlocked = blockedInLane(t.lane, n.row, t.row, n, t);
        if (n.type === "decision" && !targetBlocked && !(goRight ? usedRight : usedLeft)) {
          e.exit = goRight ? "right" : "left";
          if (goRight) usedRight = true; else usedLeft = true;
          return;
        }
        // uscita dal basso: se la colonna di arrivo è occupata, curva più tardi
        if (targetBlocked) e.bendLate = true;
        usedBottom = true;
      });
    });
    return proc;
  }

  /* ------------------------------------------------------------------
     DISEGNO
     ------------------------------------------------------------------ */
  function render(proc, opts) {
    opts = opts || {};
    const S = SIZES[opts.size || "full"];
    const id = "fd" + (++uid);
    const rows = Math.max.apply(null, proc.nodes.map((n) => n.row || 0)) + 1;
    const W = proc.lanes.length * S.laneW;
    const H = S.headH + rows * S.rowH + 8;
    const decH = S.nodeH + 14;

    const svg = s("svg", {
      viewBox: "0 0 " + W + " " + H, width: W, height: H,
      role: "group", "aria-label": "Schema del processo: " + proc.title,
      class: "fd-svg fd-" + (opts.size || "full")
    });

    const defs = s("defs", {}, svg);
    const m = s("marker", {
      id: id + "-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse"
    }, defs);
    s("path", { d: "M0 0 L10 5 L0 10 z", fill: C.ink }, m);

    proc.lanes.forEach((name, i) => {
      s("rect", { x: i * S.laneW, y: 0, width: S.laneW, height: H, fill: i % 2 ? C.paper : C.band }, svg);
      if (i > 0) s("line", { x1: i * S.laneW, y1: 0, x2: i * S.laneW, y2: H, stroke: C.line, "stroke-width": 1 }, svg);
      const maxC = Math.floor((S.laneW - 8) / (S.headFont * 0.56));
      multiline(svg, wrap(name, maxC).slice(0, 2), i * S.laneW + S.laneW / 2, S.headH / 2,
        Object.assign({}, S, { font: S.headFont, lineH: S.headFont + 2 }), C.ink2, 700);
    });
    s("line", { x1: 0, y1: S.headH, x2: W, y2: S.headH, stroke: C.line, "stroke-width": 1 }, svg);

    const byId = {};
    proc.nodes.forEach((n) => {
      byId[n.id] = n;
      n._cx = n.lane * S.laneW + S.laneW / 2;
      n._cy = S.headH + (n.row || 0) * S.rowH + S.rowH / 2;
      n._hh = n.type === "decision" ? decH / 2 : S.nodeH / 2;
    });

    const edgeLayer = s("g", { class: "fd-edges" }, svg);
    proc.edges.forEach((e) => {
      const a = byId[e.from], b = byId[e.to];
      if (!a || !b || a === b) return;
      let d, lx, ly, anchor = "start";
      const isBack = (b.row || 0) <= (a.row || 0);

      if (isBack) {
        // ciclo: esce a destra, risale lungo il bordo, rientra da destra
        const x1 = a._cx + S.nodeW / 2, y1 = a._cy;
        const sideX = (Math.max(a.lane, b.lane) + 1) * S.laneW - 4;
        d = "M" + x1 + " " + y1 + " H" + sideX + " V" + b._cy + " H" + (b._cx + S.nodeW / 2);
        lx = x1 + 3; ly = y1 - 5;
      } else if (e.exit === "right" || e.exit === "left") {
        const dir = e.exit === "right" ? 1 : -1;
        const x1 = a._cx + dir * (S.nodeW / 2), y1 = a._cy;
        if (e.route === "side") {
          const sideX = e.exit === "left" ? a.lane * S.laneW + 4 : (a.lane + 1) * S.laneW - 4;
          const tx = b._cx - (S.nodeW / 2) * (e.exit === "left" ? 1 : -1);
          d = "M" + x1 + " " + y1 + " H" + sideX + " V" + b._cy + " H" + tx;
        } else {
          d = "M" + x1 + " " + y1 + " H" + b._cx + " V" + (b._cy - b._hh);
        }
        lx = x1 + dir * 4; ly = y1 - 5; anchor = dir > 0 ? "start" : "end";
      } else {
        const x1 = a._cx, y1 = a._cy + a._hh, x2 = b._cx, y2 = b._cy - b._hh;
        if (Math.abs(x1 - x2) < 1) d = "M" + x1 + " " + y1 + " V" + y2;
        else {
          const mid = e.bendLate ? y2 - 10 : y1 + Math.min(12, (y2 - y1) / 2);
          d = "M" + x1 + " " + y1 + " V" + mid + " H" + x2 + " V" + y2;
        }
        lx = x1 + 5; ly = y1 + S.font + 2;
      }
      s("path", { d: d, fill: "none", stroke: C.ink, "stroke-width": 1.3, "marker-end": "url(#" + id + "-arrow)" }, edgeLayer);
      if (e.label) {
        const t = s("text", {
          x: lx, y: ly, "text-anchor": anchor, fill: C.brass, "font-size": S.font, "font-weight": 700,
          "font-family": "Archivo, 'Helvetica Neue', sans-serif"
        }, edgeLayer);
        t.textContent = e.label;
      }
    });

    proc.nodes.forEach((n) => {
      const g = s("g", { class: "fd-node", "data-id": n.id }, svg);
      const isTerminal = n.type === "start" || n.type === "end";
      let fill = "#FFFFFF", stroke = C.ink, sw = 1.4, dash = null, text = C.ink;
      if (isTerminal) { fill = C.ink; text = "#FFFFFF"; }
      if (n.status === "variant") { fill = C.variantFill; stroke = C.brassLine; sw = 2.4; }
      if (n.status === "verify") { stroke = C.verify; dash = "4 3"; if (isTerminal) { fill = "#FFFFFF"; text = C.ink; } }
      if (n.isNew) { stroke = C.fresh; sw = 2.6; dash = null; if (!isTerminal) fill = C.freshFill; }
      if (opts.selectedId === n.id || (opts.selectedIds && opts.selectedIds.indexOf(n.id) >= 0)) {
        stroke = C.select; sw = 3; dash = null;
      }

      const x = n._cx - S.nodeW / 2, y = n._cy - S.nodeH / 2;
      let shape;
      if (n.type === "decision") {
        const hw = S.nodeW / 2, hh = decH / 2;
        shape = s("polygon", { points: [n._cx, n._cy - hh, n._cx + hw, n._cy, n._cx, n._cy + hh, n._cx - hw, n._cy].join(" ") }, g);
      } else {
        shape = s("rect", { x: x, y: y, width: S.nodeW, height: S.nodeH, rx: isTerminal ? S.nodeH / 2 : 6 }, g);
      }
      shape.setAttribute("fill", fill);
      shape.setAttribute("stroke", stroke);
      shape.setAttribute("stroke-width", sw);
      if (dash) shape.setAttribute("stroke-dasharray", dash);

      const usableW = n.type === "decision" ? S.nodeW * 0.62 : S.nodeW - (isTerminal ? 12 : 8);
      const maxC = Math.max(6, Math.floor(usableW / (S.font * 0.52)));
      let lines = wrap(n.label, maxC);
      const maxLines = Math.floor((n.type === "decision" ? decH * 0.7 : S.nodeH - 4) / S.lineH);
      if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += "…"; }
      multiline(g, lines, n._cx, n._cy, S, text, isTerminal ? 600 : 500);

      if (n.status === "variant") {
        const bx = n._cx + S.nodeW / 2 - 2, by = n._cy - S.nodeH / 2 + 2, r = S.font * 0.75;
        s("circle", { cx: bx, cy: by, r: r, fill: C.brass, stroke: "#FFFFFF", "stroke-width": 1.5 }, g);
        const t = s("text", {
          x: bx, y: by + r * 0.42, "text-anchor": "middle", fill: "#FFFFFF", "font-size": r * 1.25, "font-weight": 700,
          "font-family": "Archivo, sans-serif"
        }, g);
        t.textContent = "!";
      }

      if (n.isNew) {
        // etichetta "Nuovo": il dipendente vede subito cosa è cambiato grazie a lui
        const bw = S.font * 3.4, bh = S.font * 1.35;
        const bx = n._cx - bw / 2, by = n._cy - n._hh - bh / 2;
        s("rect", { x: bx, y: by, width: bw, height: bh, rx: bh / 2, fill: C.fresh }, g);
        const t = s("text", {
          x: n._cx, y: by + bh * 0.72, "text-anchor": "middle", fill: "#FFFFFF", "font-size": S.font * 0.8, "font-weight": 700,
          "font-family": "Archivo, sans-serif"
        }, g);
        t.textContent = "DA TE";
      }

      const statusText = ({ confirmed: "confermato", variant: "variante da approfondire", verify: "da verificare" }[n.status] || "") + (n.isNew ? ", cambiato da te" : "");
      const title = s("title", {}, g);
      title.textContent = n.label + (statusText ? " (" + statusText + ")" : "");
      if (opts.onSelect) {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", n.label + ", " + statusText);
        g.classList.add("fd-selectable");
        const pick = () => opts.onSelect(n);
        g.addEventListener("click", pick);
        g.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); }
        });
      }
    });

    return svg;
  }

  function legend(proc) {
    const el = document.createElement("div");
    el.className = "fd-legend";
    const hasNew = proc && proc.nodes && proc.nodes.some((n) => n.isNew);
    el.innerHTML =
      (hasNew ? '<span><i class="lg lg-new"></i>Cambiato da te</span>' : "") +
      '<span><i class="lg lg-ok"></i>Confermato</span>' +
      '<span><i class="lg lg-var"></i>Variante</span>' +
      '<span><i class="lg lg-ver"></i>Da verificare</span>';
    return el;
  }

  return { render: render, legend: legend, autoLayout: autoLayout };
})();
