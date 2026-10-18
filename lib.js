/* CABAX · Funciones comunes: leer las hojas de Google, calcular el stock, formatear. */
(function (w) {
  "use strict";
  var CFG = w.CABAX_CONFIG || {};

  function norm(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + Math.round(+n || 0).toLocaleString("es-CO"); }
  function toNum(v) { var s = String(v == null ? "" : v).replace(/[^\d-]/g, ""); return s ? parseInt(s, 10) : 0; }
  function pct(a, b) { return b ? Math.round(a * 100 / b) + " %" : "—"; }
  function sum(list, fn) { return list.reduce(function (a, x) { return a + fn(x); }, 0); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  /* Acepta 2026-09-01, 01/09/2026 (día/mes/año) y fechas con hora. Devuelve "aaaa-mm-dd" o "". */
  function parseDate(v) {
    var s = String(v == null ? "" : v).trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    return "";
  }
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fmtDate(iso) { var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? (+m[3]) + " " + MESES[+m[2] - 1] : "—"; }
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function dayName(iso) { var d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : DIAS[d.getDay()]; }

  function parseCSV(t) {
    var rows = [], row = [], cur = "", q = false, i, ch;
    t = String(t || "").replace(/^﻿/, "");
    for (i = 0; i < t.length; i++) {
      ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.join("").trim() !== ""; });
  }

  /* Busca cada campo por el título de su columna (sin importar mayúsculas ni tildes). */
  var ALIAS = {
    inventario: { codigo: ["codigo"], prenda: ["prenda", "producto"], categoria: ["categoria"], talla: ["talla"], stock: ["stock inicial", "stock"], precio: ["precio"], costo: ["costo unitario", "costo"], calidad: ["calidad", "descripcion"], foto: ["foto", "imagen"] },
    pedidos: { id: ["id"], fecha: ["fecha"], cliente: ["clienteid", "id cliente", "cliente"], categoria: ["categoria"], prenda: ["prenda"], talla: ["talla"], precio: ["precio"], canal: ["canal"], estado: ["estado"], registro: ["registro", "registro"] },
    clientes: { id: ["id", "id cliente"], edad: ["edad"], sexo: ["sexo"], canal: ["canal de contacto", "canal"], preguntoPrecio: ["pregunto precio antes", "pregunto precio"], preguntoTalla: ["pregunto talla o calidad", "pregunto talla"], frecuencia: ["frecuencia que dice comprar", "frecuencia de compra", "frecuencia"] }
  };
  function findCol(headers, aliases) {
    var i, j;
    for (j = 0; j < aliases.length; j++) for (i = 0; i < headers.length; i++) if (headers[i] === aliases[j]) return i;
    for (j = 0; j < aliases.length; j++) for (i = 0; i < headers.length; i++) if (headers[i].indexOf(aliases[j]) === 0) return i;
    return -1;
  }
  function toObjects(kind, csv) {
    var rows = parseCSV(csv);
    if (rows.length < 2) return { rows: [], missing: ["(la hoja está vacía)"] };
    var headers = rows[0].map(norm), map = {}, missing = [];
    Object.keys(ALIAS[kind]).forEach(function (k) { map[k] = findCol(headers, ALIAS[kind][k]); });
    var required = { inventario: ["prenda", "talla", "stock", "precio"], pedidos: ["fecha", "prenda", "talla", "precio", "estado"], clientes: ["id"] }[kind];
    required.forEach(function (k) { if (map[k] < 0) missing.push(ALIAS[kind][k][0]); });
    var out = rows.slice(1).map(function (r) {
      var o = {};
      Object.keys(map).forEach(function (k) { o[k] = map[k] >= 0 ? String(r[map[k]] == null ? "" : r[map[k]]).trim() : ""; });
      return o;
    }).filter(function (o) { return kind === "clientes" ? o.id : (o.prenda || o.id); });
    return { rows: out, missing: missing };
  }

  function clean(kind, list) {
    if (kind === "inventario") return list.map(function (o) { return { codigo: o.codigo, prenda: o.prenda, categoria: o.categoria || "Otros", talla: o.talla, stock: toNum(o.stock), precio: toNum(o.precio), costo: toNum(o.costo), calidad: o.calidad, foto: o.foto }; });
    if (kind === "pedidos") return list.map(function (o) { return { id: o.id, fecha: parseDate(o.fecha), cliente: o.cliente, categoria: o.categoria, prenda: o.prenda, talla: o.talla, precio: toNum(o.precio), canal: o.canal, estado: o.estado, registro: o.registro }; });
    return list.map(function (o) { return { id: o.id, edad: toNum(o.edad), sexo: o.sexo, canal: o.canal, preguntoPrecio: o.preguntoPrecio, preguntoTalla: o.preguntoTalla, frecuencia: o.frecuencia }; });
  }

  function fetchCsv(url) {
    var u = url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now();
    return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); });
  }

  /* Devuelve { inv, ped, cli, modo: "demo"|"hojas", avisos: [] } */
  function loadData() {
    var H = CFG.HOJAS || {}, any = H.inventario || H.pedidos || H.clientes, D = w.CABAX_DEMO;
    function demo(avisos) { return { inv: clean("inventario", D.inventario.map(demoInv)), ped: clean("pedidos", D.pedidos.map(demoPed)), cli: clean("clientes", D.clientes.map(demoCli)), modo: "demo", avisos: avisos || [] }; }
    function demoInv(o) { return { codigo: o.codigo, prenda: o.prenda, categoria: o.categoria, talla: o.talla, stock: o.stock, precio: o.precio, costo: o.costo, calidad: o.calidad, foto: o.foto }; }
    function demoPed(o) { return o; }
    function demoCli(o) { return o; }
    if (Array.isArray(CFG.ENLACES) && CFG.ENLACES.length) return loadAuto(CFG.ENLACES, demo);
    if (!any) return Promise.resolve(demo());
    if (!(H.inventario && H.pedidos && H.clientes)) return Promise.resolve(demo(["Faltan enlaces en config.js: se necesitan los tres (inventario, pedidos y clientes). Se muestran los datos de demostración."]));
    return Promise.all([fetchCsv(H.inventario), fetchCsv(H.pedidos), fetchCsv(H.clientes)]).then(function (t) {
      var a = toObjects("inventario", t[0]), b = toObjects("pedidos", t[1]), c = toObjects("clientes", t[2]), avisos = [];
      [["Inventario", a], ["Pedidos", b], ["Clientes", c]].forEach(function (x) { if (x[1].missing.length) avisos.push("En la hoja " + x[0] + " no encuentro la columna: " + x[1].missing.join(", ") + "."); });
      if (avisos.length) return { inv: clean("inventario", a.rows), ped: clean("pedidos", b.rows), cli: clean("clientes", c.rows), modo: "hojas", avisos: avisos };
      return { inv: clean("inventario", a.rows), ped: clean("pedidos", b.rows), cli: clean("clientes", c.rows), modo: "hojas", avisos: [] };
    }).catch(function () {
      var d = demo(["No se pudo leer la hoja de Google. Revisa que esté publicada en la web en formato CSV. Mientras tanto se muestran datos de demostración, NO los reales."]);
      return d;
    });
  }

  /* Modo automático: cada enlace se reconoce por los títulos de sus columnas. La hoja Directorio se ignora. */
  function detectKind(csv) {
    var h = (parseCSV(csv)[0] || []).map(norm).join("|");
    if (/stock/.test(h) && /precio/.test(h)) return "inventario";
    if (/estado/.test(h) && /prenda/.test(h)) return "pedidos";
    if (/edad/.test(h)) return "clientes";
    return "otra";
  }
  function loadAuto(urls, demo) {
    return Promise.all(urls.map(function (u) { return fetchCsv(u); })).then(function (texts) {
      var got = {}, avisos = [];
      texts.forEach(function (t) { var k = detectKind(t); if (k !== "otra" && !got[k]) got[k] = t; });
      ["inventario", "pedidos", "clientes"].forEach(function (k) { if (!got[k]) avisos.push("No encuentro la hoja de " + k + " entre los enlaces de config.js."); });
      if (avisos.length) return demo(avisos.concat("Se muestran datos de demostración."));
      var a = toObjects("inventario", got.inventario), b = toObjects("pedidos", got.pedidos), c = toObjects("clientes", got.clientes);
      [["Inventario", a], ["Pedidos", b], ["Clientes", c]].forEach(function (x) { if (x[1].missing.length) avisos.push("En la hoja " + x[0] + " no encuentro la columna: " + x[1].missing.join(", ") + "."); });
      return { inv: clean("inventario", a.rows), ped: clean("pedidos", b.rows), cli: clean("clientes", c.rows), modo: "hojas", avisos: avisos };
    }).catch(function () { return demo(["No se pudo leer la hoja de Google. Revisa que esté publicada en la web en formato CSV. Mientras tanto se muestran datos de demostración, NO los reales."]); });
  }

  /* Pedidos que reservan stock: entregados y pendientes. Cancelados y "No había talla" no. */
  function ocupa(p) { var e = norm(p.estado); return e === "entregado" || e === "pendiente"; }
  function entregado(p) { return norm(p.estado) === "entregado"; }
  function key(prenda, talla) { return norm(prenda) + "|" + norm(talla); }

  function stockTable(inv, ped) {
    var map = {}, sinMatch = [];
    inv.forEach(function (i) { map[key(i.prenda, i.talla)] = { item: i, ent: 0, pen: 0 }; });
    ped.forEach(function (p) {
      var s = map[key(p.prenda, p.talla)];
      if (!s) { if (ocupa(p)) sinMatch.push(p); return; }
      if (entregado(p)) s.ent++; else if (norm(p.estado) === "pendiente") s.pen++;
    });
    var umbral = CFG.UMBRAL_BAJO == null ? 1 : CFG.UMBRAL_BAJO;
    var rows = inv.map(function (i) {
      var s = map[key(i.prenda, i.talla)], disp = i.stock - s.ent - s.pen;
      return { item: i, ent: s.ent, pen: s.pen, disp: disp, alerta: disp <= 0 ? "Reponer" : (disp <= umbral ? "Bajo" : "Ok") };
    });
    return { rows: rows, map: map, sinMatch: sinMatch };
  }

  var ORDEN_TALLA = ["xs", "s", "m", "l", "xl", "xxl", "unica", "unico"];
  function tallaIdx(t) { var i = ORDEN_TALLA.indexOf(norm(t)); return i < 0 ? 99 : i; }

  /* Segmentos con reglas explícitas (en este orden; el primero que se cumple gana). */
  var SEGMENTOS = [
    { id: "inst", nombre: "Pedido institucional", regla: "La frecuencia dice “pedido grupal”.", test: function (c) { return /grupal/i.test(c.frecuencia); } },
    { id: "seguido", nombre: "Joven que ya compra seguido", regla: "Dice comprar 2 veces al mes.", test: function (c) { return norm(c.frecuencia).indexOf("2 veces") === 0; } },
    { id: "redes", nombre: "Estudiante de redes", regla: "Tiene 22 años o menos.", test: function (c) { return c.edad > 0 && c.edad <= 22; } },
    { id: "adulta", nombre: "Adulta que quiere verse clara", regla: "Tiene 28 años o más.", test: function (c) { return c.edad >= 28; } }
  ];
  function segmentoDe(c) { for (var i = 0; i < SEGMENTOS.length; i++) if (SEGMENTOS[i].test(c)) return SEGMENTOS[i].nombre; return "Otros"; }

  w.CX = { norm: norm, esc: esc, money: money, toNum: toNum, pct: pct, sum: sum, today: today, parseDate: parseDate, fmtDate: fmtDate, dayName: dayName, parseCSV: parseCSV, loadData: loadData, ocupa: ocupa, entregado: entregado, key: key, stockTable: stockTable, tallaIdx: tallaIdx, SEGMENTOS: SEGMENTOS, segmentoDe: segmentoDe, CFG: CFG };
})(window);
