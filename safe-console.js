/* =====================================================================
   CONSOLE SICURA
   Alcuni ambienti (anteprime, browser integrati, piattaforme aziendali)
   forniscono una console incompleta: per esempio console.info non esiste.
   Chiamarla blocca tutto. Questo file, caricato per primo:
   1. completa la console con i metodi mancanti (per noi e per bpmn-js);
   2. offre FredLog.info/warn/error, che non possono mai generare errori.
   ===================================================================== */
(function () {
  var noop = function () {};
  var c;
  try { c = window.console; } catch (e) { c = null; }
  if (!c || (typeof c !== "object" && typeof c !== "function")) {
    try { window.console = c = {}; } catch (e) { c = {}; }
  }
  var base = typeof c.log === "function" ? c.log : noop;
  ["log", "info", "warn", "error", "debug", "trace", "group", "groupCollapsed", "groupEnd", "table", "time", "timeEnd"]
    .forEach(function (m) {
      if (typeof c[m] !== "function") {
        try { c[m] = function () { try { base.apply(c, arguments); } catch (e) { /* niente */ } }; }
        catch (e) { /* console non modificabile: FredLog la evita comunque */ }
      }
    });

  function make(level) {
    return function () {
      try {
        var con = window.console;
        var fn = con && (typeof con[level] === "function" ? con[level] : con.log);
        if (typeof fn === "function") fn.apply(con, arguments);
      } catch (e) { /* un messaggio di log non deve mai fermare l'app */ }
    };
  }
  window.FredLog = { info: make("info"), warn: make("warn"), error: make("error") };
})();
