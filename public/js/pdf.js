/**
 * PDF.JS
 * Sistema profesional PDF para PWA Android/iOS
 * Compatible con:
 * - Android Chrome
 * - TWA
 * - PWA
 * - Gmail
 * - WhatsApp
 * - Compartir nativo
 */

const PDF = {

  /**
   * DESCARGAR PDF
   */
  descargar: async function () {

    try {

      const pdfBlob = await this._crearPDFBlob();

      const paciente = State.paciente || {};

      const filename =
        `Audiograma_${paciente.nombre || "Paciente"}_${Date.now()}.pdf`;

      const url = URL.createObjectURL(pdfBlob);

      const a = document.createElement("a");

      a.href = url;
      a.download = filename;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 3000);

      UI?.showMsg?.(
        "msg-resultado",
        "✓ PDF descargado",
        "#10b981"
      );

    } catch (err) {

      console.error(err);

      alert("Error al generar PDF");

    }

  },

  /**
   * VER PDF EN APP
   * Ideal para Android PWA
   */
  verPDF: async function () {

    try {

      const pdfBlob = await this._crearPDFBlob();

      const url = URL.createObjectURL(pdfBlob);

      window.open(url, "_blank");

    } catch (err) {

      console.error(err);

      alert("No se pudo abrir el PDF");

    }

  },

  /**
   * COMPARTIR PDF
   * Android/iPhone moderno
   */
  compartirPDF: async function () {

    try {

      const pdfBlob = await this._crearPDFBlob();

      const paciente = State.paciente || {};

      const filename =
        `Audiograma_${paciente.nombre || "Paciente"}.pdf`;

      const file = new File(
        [pdfBlob],
        filename,
        {
          type: "application/pdf"
        }
      );

      /**
       * SHARE NATIVO
       */
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {

        await navigator.share({

          title: "Audiograma Clínico",

          text:
            "Audiograma clínico adjunto",

          files: [file]

        });

      } else {

        /**
         * FALLBACK
         */
        const url = URL.createObjectURL(pdfBlob);

        window.open(url, "_blank");

      }

    } catch (err) {

      console.error(err);

      alert("Error al compartir PDF");

    }

  },

  /**
   * CREAR BLOB PDF
   */
  _crearPDFBlob: async function () {

    if (typeof html2pdf === "undefined") {

      throw new Error(
        "html2pdf no está cargado"
      );

    }

    const paciente = State.paciente || {};

    const html =
      this._generarHTML(paciente);

    /**
     * CONTENEDOR REAL
     * IMPORTANTE PARA MOBILE
     */
    const container =
      document.createElement("div");

    container.innerHTML = html;

    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";

    container.style.width = "210mm";

    container.style.background = "#ffffff";

    document.body.appendChild(container);

    const filename =
      `Audiograma_${paciente.nombre || "Paciente"}.pdf`;

    const opt = {

      margin: [8, 8, 8, 8],

      filename: filename,

      image: {
        type: "jpeg",
        quality: 1
      },

      html2canvas: {

        scale:
          window.devicePixelRatio > 1
            ? 2
            : 1,

        useCORS: true,

        letterRendering: true,

        scrollY: 0,

        backgroundColor: "#ffffff"

      },

      jsPDF: {

        unit: "mm",

        format: "a4",

        orientation: "portrait"

      },

      pagebreak: {

        mode: [
          "avoid-all",
          "css",
          "legacy"
        ]

      }

    };

    try {

      const worker =
        html2pdf()
          .set(opt)
          .from(container);

      const pdfBlob =
        await worker.outputPdf("blob");

      document.body.removeChild(container);

      return pdfBlob;

    } catch (err) {

      document.body.removeChild(container);

      throw err;

    }

  },

  /**
   * GENERAR HTML PDF
   */
  _generarHTML: function (paciente) {

    const resultados =
      State.resultados || {
        OD: {},
        OI: {}
      };

    const maskResultados =
      State.maskResultados || {
        OD: {},
        OI: {}
      };

    const logoResultados =
      State.logoResultados || {
        OD: [],
        OI: []
      };

    const ptaOD =
      Classifications.calcularPTA(
        resultados.OD
      );

    const ptaOI =
      Classifications.calcularPTA(
        resultados.OI
      );

    const cOD =
      Classifications.clasificar(
        ptaOD
      );

    const cOI =
      Classifications.clasificar(
        ptaOI
      );

    const NA = "N/A";

    const filasTonal =
      FREQUENCIES.map(f => {

        const od =
          resultados.OD[f] !== undefined
            ? resultados.OD[f] + " dB"
            : NA;

        const oi =
          resultados.OI[f] !== undefined
            ? resultados.OI[f] + " dB"
            : NA;

        const odMask =
          maskResultados.OD[f] !== undefined
            ? ` (NE:${maskResultados.OD[f]}dB)`
            : "";

        const oiMask =
          maskResultados.OI[f] !== undefined
            ? ` (NE:${maskResultados.OI[f]}dB)`
            : "";

        return `
          <tr>
            <td>${f} Hz</td>
            <td class="od">
              ${od}${odMask}
            </td>
            <td class="oi">
              ${oi}${oiMask}
            </td>
          </tr>
        `;

      }).join("");

    return `

<!doctype html>

<html lang="es">

<head>

<meta charset="utf-8">

<title>
Audiograma
</title>

<style>

*{
  box-sizing:border-box;
}

body{

  font-family:Arial,sans-serif;

  color:#111;

  background:#fff;

  margin:0;

  padding:20px;

  width:190mm;

}

h1{

  text-align:center;

  font-size:24px;

  margin-bottom:20px;

  border-bottom:2px solid #111;

  padding-bottom:10px;

}

h2{

  margin-top:25px;

  font-size:18px;

  border-left:4px solid #111;

  padding-left:10px;

}

table{

  width:100%;

  border-collapse:collapse;

  margin-top:10px;

  page-break-inside:avoid;

}

th{

  background:#151530;

  color:white;

  padding:10px;

  font-size:13px;

}

td{

  border:1px solid #ccc;

  padding:8px;

  text-align:center;

  font-size:12px;

}

.od{
  color:#c04040;
}

.oi{
  color:#2a60a0;
}

.info{

  display:grid;

  grid-template-columns:1fr 1fr;

  gap:8px;

  margin-bottom:20px;

}

.info div{

  background:#f3f3f3;

  padding:10px;

  border-radius:6px;

  font-size:12px;

}

.full{
  grid-column:1/-1;
}

p,table,h2,.info{
  break-inside:avoid;
}

.footer{

  margin-top:30px;

  text-align:center;

  color:#666;

  font-size:10px;

}

</style>

</head>

<body>

<h1>
AUDIOGRAMA CLÍNICO
</h1>

<div class="info">

  <div>
    <strong>Paciente:</strong>
    ${this._esc(paciente.nombre) || NA}
  </div>

  <div>
    <strong>Edad:</strong>
    ${this._esc(paciente.edad) || NA}
  </div>

  <div>
    <strong>HC:</strong>
    ${this._esc(paciente.hc) || NA}
  </div>

  <div>
    <strong>Fecha:</strong>
    ${this._esc(paciente.fecha) || new Date().toLocaleDateString("es-AR")}
  </div>

  <div class="full">
    <strong>Motivo:</strong>
    ${this._esc(paciente.motivo) || NA}
  </div>

  <div class="full">
    <strong>Observaciones:</strong>
    ${this._esc(paciente.obs) || NA}
  </div>

</div>

<h2>
Audiometría Tonal
</h2>

<table>

<tr>

<th>
Frecuencia
</th>

<th>
OD
</th>

<th>
OI
</th>

</tr>

${filasTonal}

</table>

<h2>
Clasificación Diagnóstica
</h2>

<p>

${
  ptaOD !== null
    ? `<strong>
        OD:
        ${ptaOD.toFixed(0)} dB
        →
        ${cOD?.label || NA}
      </strong>`
    : "OD: N/A"
}

<br><br>

${
  ptaOI !== null
    ? `<strong>
        OI:
        ${ptaOI.toFixed(0)} dB
        →
        ${cOI?.label || NA}
      </strong>`
    : "OI: N/A"
}

</p>

<div class="footer">

Generado con Audiómetro Clínico Pro

</div>

</body>

</html>

`;

  },

  /**
   * ESCAPE HTML
   */
  _esc: function (value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)

      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }

};