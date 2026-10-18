/* ============================================================
   CABAX · Configuración del sitio
   Es el único archivo que se edita para conectar el sitio con las hojas de Google.
   ============================================================ */
window.CABAX_CONFIG = {
  /* WhatsApp del negocio: indicativo del país + número, sin + ni espacios. Ejemplo: "573001234567".
     Si queda vacío, el cliente elige a quién enviar el mensaje. */
  WHATSAPP: "573123686649",

  /* Enlaces CSV de las hojas de Google (Archivo > Compartir > Publicar en la web > elegir la pestaña > CSV).
     Si los tres quedan vacíos, el sitio muestra los datos de demostración. */
  HOJAS: {
    inventario: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRniaKoG3zI0t2dldr0p5EOVA68iBPd5kb1CTOJvnaaSPqReVpi8NKLYvcNiX6uSym03tz-NjGzu_xU/pub?gid=1999356035&single=true&output=csv",
    pedidos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRniaKoG3zI0t2dldr0p5EOVA68iBPd5kb1CTOJvnaaSPqReVpi8NKLYvcNiX6uSym03tz-NjGzu_xU/pub?gid=2069214571&single=true&output=csv",
    clientes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRniaKoG3zI0t2dldr0p5EOVA68iBPd5kb1CTOJvnaaSPqReVpi8NKLYvcNiX6uSym03tz-NjGzu_xU/pub?gid=771194098&single=true&output=csv"
  },

  /* Integrantes que registran pedidos (aparecen en el asistente de registro). */
  EQUIPO: ["Albert", "Britani", "Xairy", "Angelly", "Claudia"],

  /* Un producto con 1 unidad disponible se marca "Bajo"; con 0, "Reponer". */
  UMBRAL_BAJO: 1
};
