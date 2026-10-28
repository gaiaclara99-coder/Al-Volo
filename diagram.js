/* =====================================================================
   SCHEMA DEL PROCESSO – disegna in SVG un processo nel formato JSON
   di Fred (lanes / nodes / edges), come una mappa della metro.
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
     DISEGNO A "MAPPA DELLA METRO"
     - ogni ruolo (colonna "lanes") è una linea orizzontale con il suo colore;
     - ogni passaggio è una fermata (cerchio) sulla linea di chi lo fa;
     - da sinistra a destra, nell'ordine in cui si svolge il lavoro (row);
     - dove il lavoro passa a un altro ruolo, la linea scende o sale in
       diagonale fino alla fermata successiva: quella è una fermata di
       "cambio ruolo" (cerchio più grande, bordo scuro);
     - tutte le fermate sono cerchi (i bivi hanno un "?"); i ritorni indietro sono frecce tratteggiate.
     ------------------------------------------------------------------ */
  const METRO = {
    // orizzontale (computer): step = distanza tra fermate, gap = distanza tra linee
    compact: { stepW: 92, gap: 74, r: 7, rx: 10, line: 5, font: 9.5, lineH: 11, pad: 14 },
    full:    { stepW: 150, gap: 104, r: 10, rx: 14, line: 7, font: 13, lineH: 16, pad: 22 },
    // verticale (cellulare): le linee scendono dall'alto, i nomi stanno a destra delle fermate
    vcompact: { stepW: 52, gap: 44, r: 7, rx: 10, line: 5, font: 10, lineH: 12, pad: 14, labelW: 128 },
    vfull:    { stepW: 66, gap: 58, r: 9, rx: 12, line: 6, font: 12.5, lineH: 15, pad: 18, labelW: 170 }
  };
  // colori delle linee: distinti tra loro e dal blu della selezione
  const PALETTE = ["#1E9E78", "#7B6FE0", "#E0582E", "#C2389B", "#2C8FB8", "#B58A00", "#6B8E23", "#8C564B", "#D6455D", "#4F6D7A"];
  const CTX = "#9AA1AE";      // attività prima e dopo
  // per ora tutte le fermate sono cerchi identici (stessa misura e stesso bordo, del colore del ruolo):
  // false = si tornano a distinguere cambio di ruolo, bivi, da verificare, varianti, ecc.
  const UNIFORME = true;
  const FONT = "Archivo, 'Helvetica Neue', sans-serif";

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
  function interchanges(proc) {
    const byId = {}; proc.nodes.forEach((n) => { byId[n.id] = n; });
    const set = new Set();
    proc.edges.forEach((e) => {
      const a = byId[e.from], b = byId[e.to];
      if (!a || !b || a.lane === b.lane) return;
      if (a.status === "context" || b.status === "context") return;
      set.add(a.id); set.add(b.id);
    });
    return set;
  }
  function halo(t, w) { t.setAttribute("stroke", "#FFFFFF"); t.setAttribute("stroke-width", w || 3); t.setAttribute("stroke-linejoin", "round"); t.setAttribute("paint-order", "stroke"); }
  // sul cellulare la mappa scorre in verticale, sul computer in orizzontale
  function wantsVertical(opts) {
    if (opts.orientation) return opts.orientation === "vertical";
    return typeof window !== "undefined" && window.innerWidth < 700;
  }

  function render(proc, opts) {
    opts = opts || {};
    const size = opts.size || "full";
    const V = wantsVertical(opts);
    const M = METRO[(V ? "v" : "") + size];
    const id = "fd" + (++uid);
    const cols = laneColors(proc);
    const inter = interchanges(proc);
    const byId = {};
    proc.nodes.forEach((n) => { byId[n.id] = n; });
    const rows = Math.max.apply(null, proc.nodes.map((n) => n.row || 0).concat([0])) + 1;
    const nL = proc.lanes.length;
    const maxC = Math.max(8, Math.floor(((V ? M.labelW : M.stepW) - 8) / (M.font * 0.52)));
    const labelLines = (n) => { let l = wrap(n.label, maxC); if (l.length > 3) { l = l.slice(0, 3); l[2] += "…"; } return l; };
    const labelH = 3 * M.lineH + 6;
    const badgeH = M.font * 1.4 + 4;
    const hasBack = proc.edges.some((e) => byId[e.from] && byId[e.to] && e.from !== e.to && (byId[e.to].row || 0) <= (byId[e.from].row || 0));

    // p = avanzamento del lavoro, q = linea (ruolo)
    let p0, q0, W, H;
    if (V) {
      q0 = M.pad + (hasBack ? 14 : 8) + M.rx;            // a sinistra: spazio per le curve e i ritorni
      p0 = M.pad + badgeH + M.rx;
      W = q0 + (nL - 1) * M.gap + M.rx + 6 + M.labelW + M.pad;
      H = p0 + (rows - 1) * M.stepW + Math.max(M.rx, 2 * M.lineH) + M.pad;
    } else {
      p0 = M.pad + M.stepW / 2;
      q0 = M.pad + labelH + badgeH;
      W = M.pad * 2 + rows * M.stepW;
      H = q0 + (nL - 1) * M.gap + M.rx + labelH + M.pad + (hasBack ? 18 : 0);
    }
    const P = (row) => p0 + row * M.stepW;
    const Q = (lane) => q0 + lane * M.gap;
    const xy = (p, q) => (V ? [q, p] : [p, q]);
    const pt = (p, q) => xy(p, q).join(" ");

    const svg = s("svg", {
      viewBox: "0 0 " + W + " " + H, width: W, height: H,
      role: "group", "aria-label": "Mappa della metro del processo: " + proc.title,
      class: "fd-svg fd-metro fd-" + size + (V ? " fd-vertical" : "")
    });
    const defs = s("defs", {}, svg);
    const mk = s("marker", { id: id + "-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, defs);
    s("path", { d: "M0 0 L10 5 L0 10 z", fill: C.ink2 }, mk);
    s("rect", { x: 0, y: 0, width: W, height: H, fill: "#FFFFFF" }, svg);

    proc.nodes.forEach((n) => {
      n._p = P(n.row || 0); n._q = Q(n.lane);
      const c = xy(n._p, n._q); n._cx = c[0]; n._cy = c[1];
      n._r = UNIFORME ? M.r : n.type === "decision" ? M.rx : inter.has(n.id) ? M.rx : M.r;
    });

    const hl = opts.highlightLane;
    const dimLane = (lane) => hl != null && opts.dimOthers && lane !== hl;
    if (hl != null && proc.lanes[hl] != null) {
      const band = M.gap * 0.84;
      if (V) s("rect", { x: Q(hl) - band / 2, y: 0, width: band, height: H, fill: C.laneHi, opacity: 0.7 }, svg);
      else s("rect", { x: 0, y: Q(hl) - band / 2, width: W, height: band, fill: C.laneHi, opacity: 0.7 }, svg);
    }

    // --- linee (sotto le fermate)
    const lines = s("g", { class: "fd-lines", "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, svg);
    const between = (lane, p1, p2, a, b) => proc.nodes.some((m) => m !== a && m !== b && m.lane === lane &&
      m._p > Math.min(p1, p2) + 1 && m._p < Math.max(p1, p2) - 1);
    const labels = [];
    proc.edges.forEach((e) => {
      const a = byId[e.from], b = byId[e.to];
      if (!a || !b || a === b) return;
      const ctx = a.status === "context" || b.status === "context";
      const color = ctx ? CTX : cols[a.lane];
      const attrs = { stroke: color, "stroke-width": ctx ? M.line * 0.6 : M.line };
      if (ctx) attrs["stroke-dasharray"] = (M.line * 1.2) + " " + (M.line * 1.1);
      if (dimLane(a.lane) && dimLane(b.lane)) attrs.opacity = 0.3;
      let d, lp, lq;
      if (b._p <= a._p) {
        // si torna a un passaggio precedente: freccia tratteggiata fuori dalle linee
        const qb = V ? M.pad / 2 + 4 : Q(nL - 1) + M.rx + labelH + 8;
        const off = V ? -(a._r + 2) : a._r;
        d = "M" + pt(a._p, a._q + (V ? -a._r : a._r)) + " L" + pt(a._p, qb) + " L" + pt(b._p, qb) + " L" + pt(b._p, b._q + (V ? -(b._r + 2) : b._r + 2));
        s("path", { d: d, stroke: C.ink2, "stroke-width": 1.4, "stroke-dasharray": "5 4", "marker-end": "url(#" + id + "-arrow)" }, lines);
        lp = (a._p + b._p) / 2; lq = qb + (V ? 10 : -4); void off;
      } else if (a.lane === b.lane) {
        if (between(a.lane, a._p, b._p, a, b)) {
          // salta le fermate in mezzo: la linea passa di lato, lontano dai nomi
          const side = V ? -1 : (a.lane === 0 ? 1 : -1);
          const qc = a._q + side * M.gap * 0.42;
          const k = Math.min(M.stepW * 0.45, Math.abs(qc - a._q));
          d = "M" + pt(a._p, a._q) + " Q" + pt(a._p + k, a._q) + " " + pt(a._p + k, (a._q + qc) / 2) +
              " T" + pt(a._p + 2 * k, qc) + " L" + pt(b._p - 2 * k, qc) +
              " Q" + pt(b._p - k, qc) + " " + pt(b._p - k, (b._q + qc) / 2) + " T" + pt(b._p, b._q);
          lp = (a._p + b._p) / 2; lq = qc + (V ? -6 : -4);
        } else {
          d = "M" + pt(a._p, a._q) + " L" + pt(b._p, b._q);
          lp = a._p + a._r + (V ? 10 : 6); lq = a._q + (V ? -M.line - 4 : -M.line);
        }
        s("path", Object.assign({ d: d }, attrs), lines);
      } else {
        const dq = Math.abs(b._q - a._q);
        const lateP = b._p - dq, earlyP = a._p + dq;
        if (lateP >= a._p && !between(a.lane, a._p, lateP + 1, a, b)) {
          d = "M" + pt(a._p, a._q) + " L" + pt(lateP, a._q) + " L" + pt(b._p, b._q);          // dritto, poi in diagonale
          lp = lateP + (b._p - lateP) * 0.35; lq = a._q + (b._q - a._q) * 0.35;
        } else if (earlyP <= b._p && !between(b.lane, earlyP - 1, b._p, a, b)) {
          d = "M" + pt(a._p, a._q) + " L" + pt(earlyP, b._q) + " L" + pt(b._p, b._q);         // in diagonale, poi dritto
          lp = a._p + (earlyP - a._p) * 0.5; lq = a._q + (b._q - a._q) * 0.5;
        } else {
          d = "M" + pt(a._p, a._q) + " L" + pt(b._p, b._q);
          lp = (a._p + b._p) / 2; lq = (a._q + b._q) / 2;
        }
        s("path", Object.assign({ d: d }, attrs), lines);
      }
      if (e.label) { const c = xy(lp, lq); labels.push({ x: c[0], y: c[1], text: e.label }); }
    });

    // --- fermate
    proc.nodes.forEach((n) => {
      const g = s("g", { class: "fd-node", "data-id": n.id }, svg);
      const isInter = !UNIFORME && inter.has(n.id);
      const color = n.status === "context" ? CTX : cols[n.lane];
      let fill = "#FFFFFF", stroke = color, sw = isInter ? 3.6 : 2.8, dash = null, weight = isInter ? 700 : 500, txt = C.ink;
      if (!UNIFORME) {
      if (n.status === "verify") { dash = "3 2.5"; }
      if (n.status === "context") { fill = "#F1F2F5"; stroke = CTX; dash = "2.5 2"; txt = C.ink2; }
      if (n.status === "variant") { fill = C.variantFill; }
      if (n.isNew) { stroke = C.fresh; fill = C.freshFill; sw = 3.4; dash = null; }
      if (n.level) {
        const L = { alta: [C.hi, C.hiFill], media: [C.mid, C.midFill], bassa: [C.lo, C.loFill] }[n.level];
        if (L) { fill = L[0]; stroke = L[0]; dash = null; }
      }
      }
      const selected = opts.selectedId === n.id || (opts.selectedIds && opts.selectedIds.indexOf(n.id) >= 0);
      if (selected) { stroke = C.select; fill = "#DCE9F7"; sw = 4; dash = null; txt = C.select; weight = 700; }
      if (dimLane(n.lane)) g.setAttribute("opacity", "0.35");

      const ln = labelLines(n);
      const above = !V && n.lane === 0;
      // area toccabile: fermata + nome
      let hit;
      if (V) {
        const lx = Q(nL - 1) + M.rx + 6;
        const tw = Math.min(M.labelW, Math.max.apply(null, ln.map((x) => x.length)) * M.font * 0.56 + 6);
        hit = { x: n._cx - n._r - 6, y: n._cy - Math.max(n._r, M.lineH) - 4, width: (lx - n._cx) + n._r + 6 + tw, height: Math.max(2 * n._r, ln.length * M.lineH) + 10 };
      } else {
        const hTop = above ? n._cy - n._r - 4 - ln.length * M.lineH - 4 : n._cy - n._r - 6;
        const hBot = above ? n._cy + n._r + 6 : n._cy + n._r + 4 + ln.length * M.lineH + 4;
        hit = { x: n._cx - M.stepW / 2 + 3, y: hTop, width: M.stepW - 6, height: hBot - hTop };
      }
      s("rect", Object.assign({ fill: "#000", "fill-opacity": 0 }, hit), g);

      let shape;
      {
        // tutte le fermate sono rotonde; cambio di ruolo: fermata più grande, con un anello scuro attorno (come gli interscambi della metro)
        if (isInter && !selected) s("circle", { cx: n._cx, cy: n._cy, r: n._r + sw / 2 + 1.6, fill: "#FFFFFF", stroke: C.ink, "stroke-width": 1.6 }, g);
        shape = s("circle", { cx: n._cx, cy: n._cy, r: n._r }, g);
      }
      shape.setAttribute("class", "fd-st");
      shape.setAttribute("fill", fill); shape.setAttribute("stroke", stroke); shape.setAttribute("stroke-width", sw);
      if (dash) shape.setAttribute("stroke-dasharray", dash);
      if (n.type === "decision" && !UNIFORME) {
        const q = s("text", { x: n._cx, y: n._cy + M.font * 0.36, "text-anchor": "middle", "font-size": M.font, "font-weight": 700, fill: selected ? C.select : C.ink, "font-family": FONT }, g);
        q.textContent = "?";
      }

      // nome del passaggio: in verticale a destra di tutte le linee; in orizzontale sopra (prima linea) o sotto
      let t;
      if (V) {
        const lx = Q(nL - 1) + M.rx + 6;
        if (lx - n._cx > n._r + 4) {   // un filo leggero collega la fermata al suo nome
          s("line", { x1: n._cx + n._r + 2, y1: n._cy, x2: lx - 3, y2: n._cy, stroke: "#C9CED8", "stroke-width": 1, "stroke-dasharray": "1.5 2.5" }, g);
        }
        t = s("text", { x: lx, "text-anchor": "start", fill: txt, "font-size": M.font, "font-weight": weight, "font-family": FONT }, g);
        const y0 = n._cy + M.font * 0.35 - (ln.length - 1) * M.lineH / 2;
        ln.forEach((x, i) => { const ts = s("tspan", { x: lx, y: y0 + i * M.lineH }, t); ts.textContent = x; });
      } else {
        t = s("text", { x: n._cx, "text-anchor": "middle", fill: txt, "font-size": M.font, "font-weight": weight, "font-family": FONT }, g);
        const y0 = above ? n._cy - n._r - 6 - (ln.length - 1) * M.lineH : n._cy + n._r + 4 + M.font;
        ln.forEach((x, i) => { const ts = s("tspan", { x: n._cx, y: y0 + i * M.lineH }, t); ts.textContent = x; });
      }
      halo(t, 3);

      // etichette DA TE / n su N: dalla parte opposta al nome
      const pill = (text, col) => {
        const bw = Math.max(M.font * 2.6, text.length * M.font * 0.62 + M.font), bh = M.font * 1.35;
        let bx, by;
        if (V) { bx = n._cx - bw / 2; by = n._cy - n._r - 2 - bh; }
        else { bx = n._cx - bw / 2; by = above ? n._cy + n._r + 3 : n._cy - n._r - 3 - bh; }
        s("rect", { x: bx, y: by, width: bw, height: bh, rx: bh / 2, fill: col }, g);
        const bt = s("text", { x: bx + bw / 2, y: by + bh * 0.72, "text-anchor": "middle", fill: "#FFFFFF", "font-size": M.font * 0.8, "font-weight": 700, "font-family": FONT }, g);
        bt.textContent = text;
      };
      if (n.isNew) pill("DA TE", C.fresh);
      else if (n.count) pill(String(n.count), { alta: C.hi, media: C.mid, bassa: C.lo }[n.level] || C.ink);
      if (n.status === "variant" && !UNIFORME) {
        const bx = n._cx + n._r * 0.85, by = n._cy - n._r * 0.85, r = M.font * 0.62;
        s("circle", { cx: bx, cy: by, r: r, fill: C.brass, stroke: "#FFFFFF", "stroke-width": 1.2 }, g);
        const vt = s("text", { x: bx, y: by + r * 0.45, "text-anchor": "middle", fill: "#FFFFFF", "font-size": r * 1.3, "font-weight": 700, "font-family": FONT }, g);
        vt.textContent = "!";
      }

      const role = proc.lanes[n.lane] || "";
      const statusText = n.level ? ({ alta: "in quasi tutte le mappe", media: "in alcune mappe", bassa: "in poche mappe" }[n.level] + (n.count ? ": " + n.count : ""))
        : ({ confirmed: "confermato", variant: "variante da approfondire", verify: "da verificare",
             context: n.context === "before" ? "attività precedente" : "attività successiva" }[n.status] || "") + (n.isNew ? ", cambiato da te" : "");
      const title = s("title", {}, g);
      title.textContent = n.label + (role ? " – " + role : "") + (statusText ? " (" + statusText + ")" : "");
      if (opts.onSelect && (!opts.selectableIds || opts.selectableIds.indexOf(n.id) >= 0)) {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", n.label + ", " + (role ? role + ", " : "") + statusText);
        g.classList.add("fd-selectable");
        const pick = () => opts.onSelect(n);
        g.addEventListener("click", pick);
        g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); } });
      }
    });

    // scritte dei bivi (Sì / No), sopra a tutto
    labels.forEach((L) => {
      const t = s("text", { x: L.x, y: L.y, "text-anchor": "middle", fill: C.brass, "font-size": M.font, "font-weight": 700, "font-family": FONT }, svg);
      halo(t, 3.5);
      t.textContent = L.text;
    });
    return svg;
  }

  /* LEGENDA: le linee (ruoli) e il significato delle fermate presenti nella mappa */
  function legend(proc) {
    const el = document.createElement("div");
    el.className = "fd-legend fd-legend-metro";
    if (!proc || !proc.nodes) return el;
    const cols = laneColors(proc);
    const inter = interchanges(proc);
    const ic = (inner, w) => '<svg width="' + (w || 18) + '" height="18" viewBox="0 0 ' + (w || 18) + ' 18" aria-hidden="true">' + inner + "</svg>";
    const st = (fill, stroke, extra, r) => ic('<circle cx="9" cy="9" r="' + (r || 5.5) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.4"' + (extra || "") + "/>");
    const item = (icon, text) => "<span>" + icon + text + "</span>";
    const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const byId = {}; proc.nodes.forEach((n) => { byId[n.id] = n; });

    const roles = [];
    proc.lanes.forEach((name, i) => {
      if (!proc.nodes.some((n) => n.lane === i)) return;
      const ctx = cols[i] === CTX;
      roles.push(item(ic('<line x1="2" y1="9" x2="26" y2="9" stroke="' + cols[i] + '" stroke-width="' + (ctx ? 3 : 5) + '" stroke-linecap="round"' + (ctx ? ' stroke-dasharray="4 3"' : "") + "/>", 28), esc(name)));
    });
    const stops = [];
    stops.push(item(st("#FFFFFF", "#7C8496"), "Attività"));
    if (UNIFORME) {
      if (proc.nodes.some((n) => n.isNew)) stops.push(item(ic('<rect x="1" y="4" width="26" height="10" rx="5" fill="' + C.fresh + '"/><text x="14" y="11.6" text-anchor="middle" font-size="6.5" font-weight="700" fill="#fff" font-family="sans-serif">DA TE</text>', 28), "Cambiato da te"));
    } else {
    if (inter.size) stops.push(item(ic('<circle cx="9" cy="9" r="7.6" fill="#fff" stroke="' + C.ink + '" stroke-width="1.4"/><circle cx="9" cy="9" r="5" fill="#fff" stroke="#7C8496" stroke-width="2.6"/>'), "Cambio di ruolo"));
    if (proc.nodes.some((n) => n.type === "decision")) stops.push(item(ic('<circle cx="9" cy="9" r="6.5" fill="#fff" stroke="#7C8496" stroke-width="2.2"/><text x="9" y="12" text-anchor="middle" font-size="8.5" font-weight="700" fill="' + C.ink + '" font-family="sans-serif">?</text>'), "Domanda (bivio)"));
    if (proc.nodes.some((n) => n.level)) {
      stops.push(item(st(C.hi, C.hi), "In quasi tutte le mappe"));
      stops.push(item(st(C.mid, C.mid), "In alcune mappe"));
      stops.push(item(st(C.lo, C.lo), "In poche mappe"));
    }
    if (proc.nodes.some((n) => n.status === "verify" && !n.level)) stops.push(item(st("#FFFFFF", "#7C8496", ' stroke-dasharray="3 2.5"'), "Da verificare"));
    if (proc.nodes.some((n) => n.status === "variant")) stops.push(item(ic('<circle cx="8" cy="10" r="5.5" fill="' + C.variantFill + '" stroke="#7C8496" stroke-width="2.4"/><circle cx="13" cy="5" r="4" fill="' + C.brass + '"/><text x="13" y="7.6" text-anchor="middle" font-size="6.5" font-weight="700" fill="#fff" font-family="sans-serif">!</text>'), "Variante da approfondire"));
    if (proc.nodes.some((n) => n.isNew)) stops.push(item(st(C.freshFill, C.fresh), "Cambiato da te"));
    if (proc.nodes.some((n) => n.status === "context")) stops.push(item(st("#F1F2F5", CTX, ' stroke-dasharray="2.5 2"'), "Attività prima e dopo"));
    }
    if (proc.edges.some((e) => byId[e.from] && byId[e.to] && e.from !== e.to && (byId[e.to].row || 0) <= (byId[e.from].row || 0)))
      stops.push(item(ic('<path d="M2 9 H20" stroke="' + C.ink2 + '" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M18 5 L24 9 L18 13 z" fill="' + C.ink2 + '"/>', 26), "Si torna indietro"));

    el.innerHTML =
      '<p class="lg-how">' + (wantsVertical({}) ? "Ogni linea colorata è un ruolo, ogni cerchio un'attività: il lavoro va dall'alto in basso. Quando la linea si sposta in diagonale, il lavoro passa a un altro ruolo." : "Ogni linea colorata è un ruolo, ogni cerchio un'attività: il lavoro va da sinistra a destra. Quando la linea scende o sale, il lavoro passa a un altro ruolo.") + "</p>" +
      '<div class="lg-group"><strong>Linee (chi lo fa)</strong>' + roles.join("") + "</div>" +
      '<div class="lg-group"><strong>Fermate</strong>' + stops.join("") + "</div>";
    return el;
  }

  return { render: render, legend: legend, autoLayout: autoLayout };
})();
