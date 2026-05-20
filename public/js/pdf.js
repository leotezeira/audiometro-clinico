const PDF = {

  // ─────────────────────────────────────────────────────────────────────────
  // PÚBLICO
  // ─────────────────────────────────────────────────────────────────────────

  async descargar() {
    console.log("=== INICIANDO EXPORTACIÓN ===");
    
    // Verificar que State existe
    if (typeof State === 'undefined') {
      console.error("ERROR: State no está definido");
      alert("Error: Datos del paciente no disponibles");
      return;
    }
    
    const htmlContent = this._generarHTML();
    console.log("HTML generado, longitud:", htmlContent.length);
    
    // Verificar Web Share API
    if (this._puedeCompartirArchivos()) {
      console.log("Web Share API disponible, intentando compartir...");
      try {
        await this._compartirComoArchivo(htmlContent);
        console.log("Compartido exitosamente");
        if (typeof UI !== 'undefined' && UI.showMsg) {
          UI.showMsg("msg-resultado", "✓ Compartir / guardar abierto", "#10b981");
        }
        return;
      } catch (err) {
        console.error("Error en Web Share:", err);
        if (err.name === "AbortError") return;
      }
    }
    
    // Fallback a impresión
    console.log("Usando fallback de impresión");
    this._abrirVentanaImpresion(htmlContent);
  },

  enviarPorCorreo() {
    this.descargar();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WEB SHARE API
  // ─────────────────────────────────────────────────────────────────────────

  _puedeCompartirArchivos() {
    const disponible = !!(navigator.share && navigator.canShare);
    console.log("Web Share disponible?", disponible);
    
    if (disponible) {
      try {
        const testFile = new File(["test"], "test.pdf", { type: "application/pdf" });
        const puede = navigator.canShare({ files: [testFile] });
        console.log("Puede compartir archivos?", puede);
        return puede;
      } catch(e) {
        console.error("Error verificando canShare:", e);
        return false;
      }
    }
    return false;
  },

  async _compartirComoArchivo(htmlContent) {
    console.log("Preparando archivo para compartir...");
    
    const paciente = State.paciente || {};
    const nombre = paciente.nombre
      ? paciente.nombre.replace(/[^a-z0-9áéíóúüñ\s]/gi, "").trim().replace(/\s+/g, "_")
      : "Paciente";
    
    const fecha = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).replace(/\//g, "-");
    
    // PRUEBA: Guardar temporalmente para debug
    console.log("Nombre archivo:", `Audiograma_${nombre}_${fecha}.html`);
    
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const file = new File(
      [blob],
      `Audiograma_${nombre}_${fecha}.html`,
      { type: "text/html" }
    );
    
    console.log("Archivo creado, tamaño:", file.size, "bytes");
    
    try {
      await navigator.share({
        title: `Audiograma — ${paciente.nombre || "Paciente"}`,
        text: `Informe audiométrico de ${paciente.nombre || "Paciente"} — ${fecha}`,
        files: [file]
      });
      console.log("Compartido correctamente");
    } catch (err) {
      console.error("Error en navigator.share:", err);
      throw err;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FALLBACK: VENTANA DE IMPRESIÓN
  // ─────────────────────────────────────────────────────────────────────────

  _abrirVentanaImpresion(htmlContent) {
    console.log("Abriendo ventana de impresión...");
    
    const win = window.open("", "_blank");
    if (!win) {
      console.error("No se pudo abrir ventana - posiblemente bloqueada");
      alert(
        "El navegador bloqueó la ventana emergente.\n" +
        "Habilitá las ventanas emergentes para este sitio o usá la opción de compartir."
      );
      return;
    }
    
    win.document.write(htmlContent);
    win.document.close();
    
    win.addEventListener("load", () => {
      setTimeout(() => {
        console.log("Ejecutando impresión...");
        win.focus();
        win.print();
      }, 400);
    });
    
    if (typeof UI !== 'undefined' && UI.showMsg) {
      UI.showMsg("msg-resultado", "✓ Ventana de impresión abierta", "#10b981");
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GENERAR HTML
  // ─────────────────────────────────────────────────────────────────────────

  _generarHTML() {
    console.log("Generando HTML del audiograma...");
    
    // Verificar que State existe
    if (typeof State === 'undefined') {
      console.error("ERROR CRÍTICO: State no está definido");
      return "<html><body><h1>Error: Datos no disponibles</h1></body></html>";
    }
    
    const paciente = State.paciente || {};
    const resultados = State.resultados || { OD: {}, OI: {} };
    const maskResultados = State.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State.logoResultados || { OD: [], OI: [] };
    
    console.log("Paciente:", paciente.nombre || "Sin nombre");
    
    // Calcular PTAs
    let ptaOD = null, ptaOI = null;
    if (typeof Classifications !== 'undefined') {
      ptaOD = Classifications.calcularPTA(resultados.OD);
      ptaOI = Classifications.calcularPTA(resultados.OI);
    }
    
    const cOD = typeof Classifications !== 'undefined' ? Classifications.clasificar(ptaOD) : null;
    const cOI = typeof Classifications !== 'undefined' ? Classifications.clasificar(ptaOI) : null;
    
    const svgAudiograma = this._generarSVGAudiograma(resultados, maskResultados);
    
    // Generar tablas (simplificado para evitar errores)
    const FREQS_PDF = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
    const NA = "—";
    
    const filasTonal = FREQS_PDF.map(f => {
      const odVal = resultados.OD[f] !== undefined ? `${resultados.OD[f]} dB` : NA;
      const oiVal = resultados.OI[f] !== undefined ? `${resultados.OI[f]} dB` : NA;
      return `<tr>
        <td>${f >= 1000 ? `${f / 1000}.000` : f} Hz</td>
        <td class="od">${odVal}</td>
        <td class="oi">${oiVal}</td>
      </tr>`;
    }).join("");
    
    const hoy = new Date().toLocaleDateString("es-AR");
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Audiograma — ${this._escapeHtml(paciente.nombre || "Paciente")}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
  .od { color: #c03030; }
  .oi { color: #1a55a8; }
  button { display: none; }
  @media print {
    button { display: none; }
  }
</style>
</head>
<body>
<h1 style="text-align:center">AUDIOGRAMA CLÍNICO</h1>
<p><strong>Paciente:</strong> ${this._escapeHtml(paciente.nombre || "No registrado")}</p>
<p><strong>Fecha:</strong> ${paciente.fecha || hoy}</p>

<div>${svgAudiograma}</div>

<h3>Umbrales Auditivos</h3>
<table>
  <thead><tr><th>Frecuencia</th><th>OD</th><th>OI</th></tr></thead>
  <tbody>${filasTonal}</tbody>
</table>

<p style="margin-top: 40px; text-align:right">Impreso: ${hoy}</p>
</body>
</html>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SVG AUDIOGRAMA (VERSIÓN SIMPLIFICADA PARA PRUEBA)
  // ─────────────────────────────────────────────────────────────────────────

  _generarSVGAudiograma(resultados, maskResultados) {
    const SVG_W = 560;
    const SVG_H = 320;
    const PAD_L = 52;
    const PAD_R = 20;
    const PAD_T = 24;
    const PAD_B = 36;
    const CHART_W = SVG_W - PAD_L - PAD_R;
    const CHART_H = SVG_H - PAD_T - PAD_B;
    const DB_MIN = -10;
    const DB_MAX = 120;
    const FREQS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
    
    const xPos = (i) => PAD_L + (i / (FREQS.length - 1)) * CHART_W;
    const yPos = (db) => PAD_T + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CHART_H;
    
    let lines = [];
    
    // Grid
    for (let i = 0; i <= FREQS.length - 1; i++) {
      const x = xPos(i);
      lines.push(`<line x1="${x}" y1="${PAD_T}" x2="${x}" y2="${SVG_H - PAD_B}" stroke="#ddd" stroke-width="0.5"/>`);
    }
    
    return `<svg width="${SVG_W}" height="${SVG_H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${PAD_L}" y="${PAD_T}" width="${CHART_W}" height="${CHART_H}" fill="none" stroke="#333" stroke-width="1"/>
      ${lines.join("")}
      <text x="${PAD_L - 30}" y="${PAD_T + CHART_H/2}" transform="rotate(-90, ${PAD_L - 30}, ${PAD_T + CHART_H/2})" text-anchor="middle">dB HL</text>
    </svg>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  _escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

}; // ← Cierre correcto del objeto PDF