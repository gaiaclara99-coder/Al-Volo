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
    verify: "#7C8496", select: "#2F6FB0", fresh: "#2E7D4F", freshFill: "#ECF7F0",
    // mappa aggregata: quante mappe riportano il passaggio
    hi: "#2E7D4F", hiFill: "#E7F3EC", mid: "#B86200", midFill: "#FFF0DC", lo: "#B3261E", loFill: "#FCE8E6",
    laneHi: "#FBEBC4"
  };

  // un colore per ogni ruolo (colonna): quando il colore cambia, il lavoro passa a un altro ruolo
  const PALETTE = ["#1E9E78", "#7B6FE0", "#E0582E", "#C2389B", "#2C8FB8", "#B58A00", "#6B8E23", "#8C564B", "#D6455D", "#4F6D7A"];
  const CTX = "#9AA1AE";      // attività prima e dopo
  function isContextLane(proc, i) {
    const name = proc.lanes[i];
    return proc.nodes.some((n) => n.lane === i && n.status === "context") ||
      name === "Attività precedenti" || name === "Attività successive";
  }
  function laneColors(proc) {
    const cols = []; let k = 0;
    proc.lanes.forEach((_, i) => { cols[i] = isContextLane(proc, i) ? CTX : PALETTE[k++ % PALETTE.length]; });
    return cols;
  }
  // colore chiaro per lo sfondo, dalla stessa tinta
  function tint(hex, a) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const mix = (c) => Math.round(c * a + 255 * (1 - a));
    return "rgb(" + mix(r) + "," + mix(g) + "," + mix(b) + ")";
  }

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
  /* MAPPA DI AL FLY: all'inizio tutti i riquadri uguali; poi le risposte cambiano la grafica.
     frequenza → forma (alta quadrato, media rombo, bassa cerchio); tempo → misura (poco piccolo, molto grande);
     rischio → sfumatura di rosso (procedurale chiaro, economico medio, reputazionale pieno);
     attenzione → triangolo di avviso; attese → clessidra; inefficienze → fulmine. */
  const RISK = { procedurale: "#F9D7D3", economico: "#EE9389", reputazionale: "#C62828" };
  const SIZE_K = { poco: 0.8, abbastanza: 1, molto: 1.25 };
  function alDims(n, S) {
    const k = SIZE_K[n.durata] || 1;
    const base = S.nodeH;                        // lato di riferimento
    if (n.freq === "alta") { const a = Math.min(S.laneW - 8, base * 1.12 * k); return { kind: "square", w: a, h: a }; }
    if (n.freq === "media") { const a = Math.min(S.laneW - 4, base * 1.5 * k); return { kind: "diamond", w: a, h: a }; }
    if (n.freq === "bassa") { const a = Math.min(S.laneW - 8, base * 1.2 * k); return { kind: "circle", w: a, h: a }; }
    return { kind: "rect", w: Math.min(S.laneW - 6, S.nodeW * k), h: S.nodeH * k };
  }

  function render(proc, opts) {
    opts = opts || {};
    let S = SIZES[opts.size || "full"];
    const AL = !!proc.alAnalisi;
    if (AL) S = Object.assign({}, S, { rowH: S.rowH * 1.45 });     // spazio per i riquadri grandi
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

    const hl = opts.highlightLane;
    const cols = laneColors(proc);
    proc.lanes.forEach((name, i) => {
      s("rect", { x: i * S.laneW, y: 0, width: S.laneW, height: H, fill: i === hl ? C.laneHi : tint(cols[i], i % 2 ? 0.05 : 0.09) }, svg);
      s("rect", { x: i * S.laneW, y: 0, width: S.laneW, height: 5, fill: cols[i] }, svg);   // il colore del ruolo
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
      if (AL) { n._dim = alDims(n, S); n._hh = n._dim.h / 2; }
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
      const isTerminal = !AL && (n.type === "start" || n.type === "end");   // nella mappa di Al Fly anche inizio e fine sono riquadri normali
      const rc = cols[n.lane] || C.ink;
      let fill = "#FFFFFF", stroke = rc, sw = 2.2, dash = null, text = C.ink;
      if (isTerminal) { fill = rc; stroke = rc; text = "#FFFFFF"; }
      if (n.status === "variant") { fill = C.variantFill; }          // il bordo resta del colore del ruolo; il "!" la segnala
      if (n.status === "verify") { dash = "4 3"; if (isTerminal) { fill = "#FFFFFF"; text = C.ink; } }
      if (n.status === "context") { stroke = "#8E97A8"; fill = "#F1F2F5"; dash = "2 3"; text = C.ink; }   // attività prima e dopo
      if (n.isNew) { sw = 2.8; dash = null; if (!isTerminal) fill = C.freshFill; }   // bordo del ruolo, sfondo verde ed etichetta "DA TE"
      if (n.level) {                 // mappa aggregata: verde, arancio, rosso
        const L = { alta: [C.hi, C.hiFill], media: [C.mid, C.midFill], bassa: [C.lo, C.loFill] }[n.level];
        if (L) { stroke = L[0]; fill = L[1]; text = C.ink; sw = 2.6; dash = null; }
      }
      if (hl != null && opts.dimOthers && n.lane !== hl) g.setAttribute("opacity", "0.5");
      if (opts.selectedId === n.id || (opts.selectedIds && opts.selectedIds.indexOf(n.id) >= 0)) {
        stroke = C.select; sw = 3; dash = null;
      }

      if (AL && n.rischio && RISK[n.rischio]) { fill = RISK[n.rischio]; text = n.rischio === "reputazionale" ? "#FFFFFF" : C.ink; }
      const x = n._cx - S.nodeW / 2, y = n._cy - S.nodeH / 2;
      let shape;
      const D = n._dim;
      if (AL) {
        if (D.kind === "diamond") shape = s("polygon", { points: [n._cx, n._cy - D.h / 2, n._cx + D.w / 2, n._cy, n._cx, n._cy + D.h / 2, n._cx - D.w / 2, n._cy].join(" ") }, g);
        else if (D.kind === "circle") shape = s("circle", { cx: n._cx, cy: n._cy, r: D.w / 2 }, g);
        else shape = s("rect", { x: n._cx - D.w / 2, y: n._cy - D.h / 2, width: D.w, height: D.h, rx: D.kind === "square" ? 1 : 6 }, g);
      } else if (n.type === "decision") {
        const hw = S.nodeW / 2, hh = decH / 2;
        shape = s("polygon", { points: [n._cx, n._cy - hh, n._cx + hw, n._cy, n._cx, n._cy + hh, n._cx - hw, n._cy].join(" ") }, g);
      } else {
        shape = s("rect", { x: x, y: y, width: S.nodeW, height: S.nodeH, rx: isTerminal ? S.nodeH / 2 : 6 }, g);
      }
      shape.setAttribute("fill", fill);
      shape.setAttribute("stroke", stroke);
      shape.setAttribute("stroke-width", sw);
      if (dash) shape.setAttribute("stroke-dasharray", dash);

      let usableW = n.type === "decision" ? S.nodeW * 0.62 : S.nodeW - (isTerminal ? 12 : 8);
      let usableH = n.type === "decision" ? decH * 0.7 : S.nodeH - 4;
      if (AL) {
        const f = { diamond: [0.56, 0.56], circle: [0.74, 0.74] }[D.kind] || [1, 1];
        usableW = D.w * f[0] - 6; usableH = D.h * f[1] - 4;
      }
      const maxC = Math.max(5, Math.floor(usableW / (S.font * 0.52)));
      let lines = wrap(n.label, maxC);
      const maxLines = Math.max(1, Math.floor(usableH / S.lineH));
      if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += "…"; }
      multiline(g, lines, n._cx, n._cy, S, text, isTerminal ? 600 : 500);
      if (AL) {
        const r = S.font * 0.95, top = n._cy - n._hh, bot = n._cy + n._hh, left = n._cx - D.w / 2, right = n._cx + D.w / 2;
        if (n.attenzione) {          // triangolo di avviso, in alto a sinistra
          const cx = left + 2, cy = top + 2;
          s("polygon", { points: [cx, cy - r * 1.05, cx + r, cy + r * 0.75, cx - r, cy + r * 0.75].join(" "), fill: "#E8A317", stroke: "#FFFFFF", "stroke-width": 1.2 }, g);
          const tt = s("text", { x: cx, y: cy + r * 0.55, "text-anchor": "middle", fill: C.ink, "font-size": r * 1.1, "font-weight": 800, "font-family": "Archivo, sans-serif" }, g);
          tt.textContent = "!";
        }
        if (n.attesa) {              // clessidra, in basso a sinistra
          const cx = left + 2, cy = bot - 2;
          s("circle", { cx: cx, cy: cy, r: r, fill: "#FFFFFF", stroke: "#4A6FA5", "stroke-width": 1.4 }, g);
          const h = r * 0.55;
          s("path", { d: "M" + (cx - h) + " " + (cy - h) + " H" + (cx + h) + " L" + (cx - h) + " " + (cy + h) + " H" + (cx + h) + " Z", fill: "#4A6FA5" }, g);
        }
        if (n.inefficienza) {        // fulmine, in basso a destra
          const cx = right - 2, cy = bot - 2;
          s("circle", { cx: cx, cy: cy, r: r, fill: "#6B4FA0", stroke: "#FFFFFF", "stroke-width": 1.2 }, g);
          const u = r * 0.6;
          s("path", { d: "M" + (cx + u * 0.2) + " " + (cy - u) + " L" + (cx - u * 0.6) + " " + (cy + u * 0.15) + " H" + (cx - u * 0.05) + " L" + (cx - u * 0.25) + " " + (cy + u) + " L" + (cx + u * 0.6) + " " + (cy - u * 0.15) + " H" + (cx + u * 0.05) + " Z", fill: "#FFFFFF" }, g);
        }
      }

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

      if (n.count) {
        const bw = S.font * 3.1, bh = S.font * 1.35;
        const bx = n._cx + S.nodeW / 2 - bw + 4, by = n._cy - n._hh - bh + 3;   // sopra il bordo, senza coprire il testo
        const col = { alta: C.hi, media: C.mid, bassa: C.lo }[n.level] || C.ink;
        s("rect", { x: bx, y: by, width: bw, height: bh, rx: bh / 2, fill: col }, g);
        const bt = s("text", { x: bx + bw / 2, y: by + bh * 0.72, "text-anchor": "middle", fill: "#FFFFFF",
          "font-size": S.font * 0.8, "font-weight": 700, "font-family": "Archivo, sans-serif" }, g);
        bt.textContent = n.count;
      }
      const alText = !AL ? "" : [
        n.freq ? "frequenza " + n.freq : "", n.durata ? "durata " + ({ poco: "breve", abbastanza: "moderata", molto: "lunga" }[n.durata]) : "", n.rischio ? "rischio " + n.rischio : "",
        n.attenzione ? "richiede più attenzione" : "", n.attesa ? "attese" : "", n.inefficienza ? "inefficienze" : ""].filter(Boolean).join(", ");
      const statusText0 = n.level ? ({ alta: "in quasi tutte le mappe", media: "in alcune mappe", bassa: "in poche mappe" }[n.level] + (n.count ? ": " + n.count : ""))
        : ({ confirmed: "confermato", variant: "variante da approfondire", verify: "da verificare",
           context: n.context === "before" ? "attività precedente" : "attività successiva" }[n.status] || "") + (n.isNew ? ", cambiato da te" : "");
      const statusText = [statusText0, alText].filter(Boolean).join(", ");
      const title = s("title", {}, g);
      title.textContent = n.label + (statusText ? " (" + statusText + ")" : "");
      if (opts.onSelect && (!opts.selectableIds || opts.selectableIds.indexOf(n.id) >= 0)) {
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
    el.className = "fd-legend fd-legend-roles";
    if (!proc || !proc.nodes) return el;
    const cols = laneColors(proc);
    const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const roles = proc.lanes.map((name, i) => proc.nodes.some((n) => n.lane === i)
      ? '<span><i class="lg" style="border:2.5px solid ' + cols[i] + ';background:' + tint(cols[i], 0.12) + '"></i>' + esc(name) + "</span>" : "").join("");
    const hasNew = proc.nodes.some((n) => n.isNew);
    let stati;
    if (proc.nodes.some((n) => n.level)) {
      stati = (hasNew ? '<span><i class="lg lg-new"></i>Cambiato da te</span>' : "") +
        '<span><i class="lg lg-hi"></i>In quasi tutte le mappe</span>' +
        '<span><i class="lg lg-mid"></i>In alcune mappe</span>' +
        '<span><i class="lg lg-lo"></i>In poche mappe</span>';
    } else {
      const has = (f) => proc.nodes.some(f);
      stati = (hasNew ? '<span><i class="lg" style="border:1.5px solid #7C8496;background:#ECF7F0"></i>Cambiato da te (DA TE)</span>' : "") +
        (has((n) => n.status === "context") ? '<span><i class="lg lg-ctx"></i>Attività prima e dopo</span>' : "") +
        (has((n) => n.status === "variant") ? '<span><i class="lg" style="border:1.5px solid #7C8496;background:#FFF5E2"></i>Variante (con il segno !)</span>' : "") +
        (has((n) => n.status === "verify") ? '<span><i class="lg lg-ver"></i>Da verificare</span>' : "");
    }
    let al = "";
    if (proc.alAnalisi) {
      const ic = (inner, w) => '<svg width="' + (w || 20) + '" height="20" viewBox="0 0 ' + (w || 20) + ' 20" aria-hidden="true">' + inner + "</svg>";
      const it = (svg, txt) => "<span>" + svg + txt + "</span>";
      const st = 'fill="#fff" stroke="#7C8496" stroke-width="1.8"';
      const has = (f) => proc.nodes.some(f);
      const grp = (title, items) => items.length ? '<div class="lg-group"><strong>' + title + "</strong>" + items.join("") + "</div>" : "";
      const fq = [];
      if (has((n) => n.freq === "alta")) fq.push(it(ic('<rect x="3" y="3" width="14" height="14" ' + st + "/>"), "Alta"));
      if (has((n) => n.freq === "media")) fq.push(it(ic('<polygon points="10,1.5 18.5,10 10,18.5 1.5,10" ' + st + "/>"), "Media"));
      if (has((n) => n.freq === "bassa")) fq.push(it(ic('<circle cx="10" cy="10" r="7.5" ' + st + "/>"), "Bassa"));
      const tm = [];
      if (has((n) => n.durata === "poco")) tm.push(it(ic('<rect x="6" y="7" width="8" height="6" rx="1.5" ' + st + "/>"), "Breve"));
      if (has((n) => n.durata === "abbastanza")) tm.push(it(ic('<rect x="3.5" y="5.5" width="13" height="9" rx="2" ' + st + "/>"), "Moderata"));
      if (has((n) => n.durata === "molto")) tm.push(it(ic('<rect x="1" y="3" width="18" height="14" rx="2" ' + st + "/>"), "Lunga"));
      const rk = [];
      [["procedurale", "Procedurale"], ["economico", "Economico"], ["reputazionale", "Reputazionale"]].forEach((r) => {
        if (has((n) => n.rischio === r[0])) rk.push(it(ic('<rect x="2" y="4" width="16" height="12" rx="2" fill="' + RISK[r[0]] + '" stroke="#7C8496" stroke-width="1.2"/>'), r[1]));
      });
      const sg = [];
      if (has((n) => n.attenzione)) sg.push(it(ic('<polygon points="10,2 18,16 2,16" fill="#E8A317"/><text x="10" y="14.5" text-anchor="middle" font-size="9" font-weight="800" fill="#1F2A44" font-family="sans-serif">!</text>'), "Richiede più attenzione"));
      if (has((n) => n.attesa)) sg.push(it(ic('<circle cx="10" cy="10" r="8" fill="#fff" stroke="#4A6FA5" stroke-width="1.6"/><path d="M6 6 H14 L6 14 H14 Z" fill="#4A6FA5"/>'), "Attese"));
      if (has((n) => n.inefficienza)) sg.push(it(ic('<circle cx="10" cy="10" r="8" fill="#6B4FA0"/><path d="M11 4.5 L6.5 10.8 H9.7 L8.8 15.5 L13.5 9.2 H10.3 Z" fill="#fff"/>'), "Inefficienze"));
      al = grp("Frequenza (forma)", fq) + grp("Tempo (misura)", tm) + grp("Rischio (colore)", rk) + grp("Segni", sg);
    }
    el.innerHTML =
      '<p class="lg-how">' + (proc.alAnalisi ? "Ogni colore di bordo è un ruolo. Forma, misura, colore e segni dei riquadri raccontano le tue risposte ad Al Fly." : "Ogni colore è un ruolo: quando il colore del riquadro cambia, il lavoro passa a un altro ruolo.") + "</p>" +
      '<div class="lg-group"><strong>Ruoli</strong>' + roles + "</div>" +
      (stati && !proc.alAnalisi ? '<div class="lg-group"><strong>Passaggi</strong>' + stati + "</div>" : "") + al;
    return el;
  }

  return { render: render, legend: legend, autoLayout: autoLayout };
})();
