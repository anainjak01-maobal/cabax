/**
 * CABAX · Registro automático de pedidos.
 * Va dentro de la hoja de Google (Extensiones > Apps Script). Recibe el pedido desde el catálogo o el tablero
 * y lo anota solo en las pestañas Pedidos, Clientes y Directorio. No hay que pegar nada a mano.
 */
var ZONA = "America/Bogota";
var MAX_PRENDAS = 10;

/* Clave del equipo: solo la sabe el equipo. Cámbiala por una tuya y vuelve a implementar (ver LEEME). */
var CLAVE = "Cabax12345";

/*  GET ?catalogo=1                  -> inventario disponible para el cliente (sin costos, sin clientes ni pedidos)
    GET ?hoja=inventario&clave=...   -> datos del tablero (solo con la clave del equipo)
    GET (sin nada)                   -> comprobación */
function doGet(e) {
  var q = (e && e.parameter) || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (q.catalogo) return csvSalida(catalogoCsv(ss));
  if (q.hoja) {
    if (String(q.clave || "") !== CLAVE) return salida({ ok: false, error: "Clave incorrecta." });
    var nombres = { inventario: "Inventario", pedidos: "Pedidos", clientes: "Clientes" };
    var h = nombres[q.hoja];
    if (!h) return salida({ ok: false, error: "Hoja no válida." });
    return csvSalida(aCsv(ss.getSheetByName(h).getDataRange().getValues()));
  }
  return salida({ ok: true, mensaje: "Registro de CABAX activo." });
}

function csvSalida(t) { return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.CSV); }
function celdaCsv(v) {
  if (v instanceof Date) v = Utilities.formatDate(v, ZONA, "yyyy-MM-dd");
  var t = String(v == null ? "" : v);
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}
function aCsv(filas) { return filas.map(function (f) { return f.map(celdaCsv).join(","); }).join("\n") + "\n"; }

/* Inventario para el catálogo: el stock que se muestra ya descuenta lo entregado y lo pendiente. */
function catalogoCsv(ss) {
  var v = ss.getSheetByName("Inventario").getDataRange().getValues(), h = v[0].map(norm);
  var iCod = h.indexOf("codigo"), iPr = h.indexOf("prenda"), iCat = h.indexOf("categoria"), iT = h.indexOf("talla"), iS = h.indexOf("stock inicial"), iPrec = h.indexOf("precio"), iCal = h.indexOf("calidad"), iFo = h.indexOf("foto");
  var pv = ss.getSheetByName("Pedidos").getDataRange().getValues(), ph = pv[0].map(norm);
  var pP = ph.indexOf("prenda"), pT = ph.indexOf("talla"), pE = ph.indexOf("estado");
  var ocupa = {};
  pv.slice(1).forEach(function (r) {
    var e = norm(r[pE]); if (e !== "entregado" && e !== "pendiente") return;
    var k = norm(r[pP]) + "|" + norm(r[pT]); ocupa[k] = (ocupa[k] || 0) + 1;
  });
  var out = [["Código", "Prenda", "Categoría", "Talla", "Stock", "Precio", "Calidad", "Foto"]];
  v.slice(1).forEach(function (r) {
    if (!r[iPr]) return;
    var disp = Number(r[iS]) - (ocupa[norm(r[iPr]) + "|" + norm(r[iT])] || 0);
    out.push([r[iCod], r[iPr], r[iCat], r[iT], Math.max(0, disp), r[iPrec], r[iCal], r[iFo]]);
  });
  return aCsv(out);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var p = JSON.parse(e.postData.contents);
    return salida(registrar(p));
  } catch (err) {
    return salida({ ok: false, error: "No se pudo registrar: " + err });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function norm(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
function txt(s, n) { return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").trim().slice(0, n); }

function leer(hoja) { var v = hoja.getDataRange().getValues(); return { head: (v[0] || []).map(norm), rows: v.slice(1) }; }
function col(head, nombres) { for (var i = 0; i < nombres.length; i++) { var k = head.indexOf(nombres[i]); if (k >= 0) return k; } return -1; }
function sigId(ids, prefijo, ancho) {
  var max = 0;
  ids.forEach(function (x) { var m = String(x).match(/^([A-Za-z]+)(\d+)$/); if (m && m[1].toUpperCase() === prefijo && +m[2] > max) max = +m[2]; });
  return function (extra) { var n = String(max + 1 + (extra || 0)); while (n.length < ancho) n = "0" + n; return prefijo + n; };
}
function agregar(hoja, fila) {
  var a = hoja.getRange(1, 1, Math.max(hoja.getMaxRows(), 1), 1).getValues(), r = 1;
  for (var i = a.length - 1; i >= 0; i--) { if (String(a[i][0]).trim() !== "") { r = i + 1; break; } }
  hoja.getRange(r + 1, 1, 1, fila.length).setValues([fila]);
  return r + 1;
}

function registrar(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hInv = ss.getSheetByName("Inventario"), hPed = ss.getSheetByName("Pedidos"), hCli = ss.getSheetByName("Clientes"), hDir = ss.getSheetByName("Directorio");
  if (!hInv || !hPed || !hCli || !hDir) return { ok: false, error: "Faltan pestañas: Inventario, Pedidos, Clientes y Directorio deben existir." };

  var items = (p.items || []).slice(0, MAX_PRENDAS);
  if (!items.length) return { ok: false, error: "El pedido no tiene prendas." };
  var nombre = txt(p.nombre, 40), clienteID = txt(p.clienteID, 12).toUpperCase();
  if (!nombre && !clienteID) return { ok: false, error: "Falta el nombre del cliente." };

  var inv = leer(hInv), ped = leer(hPed), cli = leer(hCli), dir = leer(hDir);
  var iP = col(inv.head, ["prenda", "producto"]), iT = col(inv.head, ["talla"]), iS = col(inv.head, ["stock inicial", "stock"]), iPr = col(inv.head, ["precio"]), iC = col(inv.head, ["categoria"]);
  var pId = col(ped.head, ["id"]), pPr = col(ped.head, ["prenda"]), pT = col(ped.head, ["talla"]), pE = col(ped.head, ["estado"]);
  if ([iP, iT, iS, iPr, pId, pPr, pT, pE].some(function (x) { return x < 0; })) return { ok: false, error: "No encuentro las columnas esperadas. No cambies los títulos de la fila 1." };

  /* unidades que ya ocupan stock: entregadas y pendientes */
  var ocupa = {};
  ped.rows.forEach(function (r) {
    var e = norm(r[pE]); if (e !== "entregado" && e !== "pendiente") return;
    var k = norm(r[pPr]) + "|" + norm(r[pT]); ocupa[k] = (ocupa[k] || 0) + 1;
  });

  var lineas = [], agotado = [], noExiste = [];
  items.forEach(function (it) {
    var prenda = txt(it.prenda, 80), talla = txt(it.talla, 10), k = norm(prenda) + "|" + norm(talla), fila = null;
    for (var i = 0; i < inv.rows.length; i++) if (norm(inv.rows[i][iP]) + "|" + norm(inv.rows[i][iT]) === k) { fila = inv.rows[i]; break; }
    if (!fila) { noExiste.push(prenda + " talla " + talla); return; }
    var disp = Number(fila[iS]) - (ocupa[k] || 0);
    if (disp <= 0) { agotado.push(fila[iP] + " talla " + fila[iT]); return; }
    ocupa[k] = (ocupa[k] || 0) + 1;
    var precio = (p.usarPrecio && Number(it.precio) > 0) ? Number(it.precio) : Number(fila[iPr]);
    lineas.push({ cat: iC >= 0 ? fila[iC] : "", prenda: fila[iP], talla: fila[iT], precio: precio });
  });
  if (agotado.length || noExiste.length) return { ok: false, agotado: agotado, noExiste: noExiste, error: agotado.length ? "Se agotó: " + agotado.join(", ") : "No existe en el inventario: " + noExiste.join(", ") };

  /* cliente: el que indica el tablero, o el mismo nombre ya registrado, o uno nuevo */
  var cId = col(cli.head, ["id", "id cliente"]), dId = col(dir.head, ["id"]), dN = col(dir.head, ["nombre"]);
  var idsCli = cli.rows.map(function (r) { return r[cId]; }).concat(dir.rows.map(function (r) { return r[dId]; }));
  var cliente = "", nuevo = false;
  if (clienteID) {
    if (idsCli.indexOf(clienteID) < 0) return { ok: false, error: "El cliente " + clienteID + " no existe en la hoja Clientes." };
    cliente = clienteID;
  } else {
    for (var j = 0; j < dir.rows.length; j++) if (norm(dir.rows[j][dN]) === norm(nombre)) { cliente = String(dir.rows[j][dId]); break; }
    if (!cliente) { cliente = sigId(idsCli, "C", 2)(0); nuevo = true; }
  }

  var hoy = Utilities.formatDate(new Date(), ZONA, "yyyy-MM-dd");
  var nextP = sigId(ped.rows.map(function (r) { return r[pId]; }), "V", 3), ids = [];
  var canal = txt(p.canal, 20) || "WhatsApp", quien = txt(p.registro, 20) || "Web";
  lineas.forEach(function (l, i) {
    var id = nextP(i), fila = agregar(hPed, [id, hoy, cliente, l.cat, l.prenda, l.talla, l.precio, canal, "Pendiente", quien]);
    hPed.getRange(fila, 2).setNumberFormat("yyyy-mm-dd"); hPed.getRange(fila, 7).setNumberFormat("$#,##0");
    ids.push(id);
  });
  if (nuevo) {
    var edad = Number(p.edad) > 0 ? Number(p.edad) : "";
    agregar(hCli, [cliente, edad, txt(p.sexo, 10), txt(p.canalContacto, 20) || "Catálogo web", txt(p.preguntoPrecio, 3) || "Sí", txt(p.preguntoTalla, 3) || "Sí", txt(p.frecuencia, 40)]);
    agregar(hDir, [cliente, nombre, txt(p.contacto, 30)]);
  }
  return { ok: true, ids: ids, cliente: cliente, nuevo: nuevo, total: lineas.reduce(function (a, l) { return a + l.precio; }, 0) };
}
