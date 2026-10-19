/* ============================================================
   CABAX · Configuración del sitio
   Es el único archivo que se edita para conectar el sitio con las hojas de Google.
   ============================================================ */
window.CABAX_CONFIG = {
  /* WhatsApp del negocio: indicativo del país + número, sin + ni espacios. Ejemplo: "573001234567".
     Si queda vacío, el cliente elige a quién enviar el mensaje. */
  WHATSAPP: "573011389596",

  /* Enlaces CSV de las hojas. Ya NO se necesitan si REGISTRO está configurado: el script entrega el catálogo.
     Déjalos vacíos y no publiques Inventario, Pedidos ni Clientes (ver LEEME). Solo sirven como respaldo sin script. */
  HOJAS: {
    inventario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRniaKoG3zI0t2dldr0p5EOVA68iBPd5kb1CTOJvnaaSPqReVpi8NKLYvcNiX6uSym03tz-NjGzu_xU/pub?gid=1999356035&single=true&output=csv",
    pedidos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRniaKoG3zI0t2dldr0p5EOVA68iBPd5kb1CTOJvnaaSPqReVpi8NKLYvcNiX6uSym03tz-NjGzu_xU/pub?gid=2069214571&single=true&output=csv",
    clientes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRniaKoG3zI0t2dldr0p5EOVA68iBPd5kb1CTOJvnaaSPqReVpi8NKLYvcNiX6uSym03tz-NjGzu_xU/pub?gid=771194098&single=true&output=csv"
  },

  /* OBLIGATORIO: dirección de la aplicación web de Apps Script (termina en /exec, ver LEEME, paso 6).
     Sin esto el catálogo no carga para los clientes y el tablero pide la URL en lugar de los datos. */
  REGISTRO: "https://script.google.com/macros/s/AKfycby2rR-Szq2Il15g65031ARDQTDVCCpaPKmL0OsARg-q2acuML2xVcG5lbdQgDKko_PtUA/exec",

  /* Integrantes que registran pedidos (aparecen en el asistente de registro). */
  EQUIPO: ["Albert", "Britani", "Xairy", "Angelly", "Claudia"],

  /* Un producto con 1 unidad disponible se marca "Bajo"; con 0, "Reponer". */
  UMBRAL_BAJO: 1
};
