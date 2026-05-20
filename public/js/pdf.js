/**
 * PDF.JS
 * Generación de PDF real con html2pdf + funciones de descarga y correo
 */

const PDF = {
  /**
   * Genera y descarga el PDF
   */
  descargar() {
    const paciente = State.paciente || {};
    
    // Verifica que html2pdf esté disponible
    if (typeof html2pdf === 'undefined') {
      UI.showMsg("msg-resultado", "⚠ Librería de PDF no cargada. Recarga la página.", "#ef4444");
      return;
    }
    
    const html = this._generarHTML(paciente);
    const filename = `Audiograma_${paciente.nombre || 'Paciente'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    try {
      html2pdf().set(opt).from(html).save();
      UI.showMsg("msg-resultado", "✓ PDF descargado", "#10b981");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      UI.showMsg("msg-resultado", "✗ Error al generar PDF", "#ef4444");
    }
  },

  /**
   * Genera contenido para enviar por correo
   */
  enviarPorCorreo() {
    const paciente = State.paciente || {};
    if (!paciente.nombre) {
      UI.showMsg("msg-resultado", "⚠ Completa los datos del paciente primero", "#f59e0b");
      return;
    }

    // Primero descarga el PDF
    this.descargar();

    // Luego abre el cliente de correo con delay
    const subject = `Audiograma - ${paciente.nombre}`;
    const body = `Adjunto encontrará el audiograma clínico de ${paciente.nombre}.\n\nFecha: ${paciente.fecha || new Date().toLocaleDateString('es-AR')}\nH.C.: ${paciente.hc || 'N/A'}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    setTimeout(() => {
      window.location.href = mailtoLink;
    }, 1500);
  },

  /**
   * Exporta PDF (acción clásica)
   */
  exportar() {
    this.descargar();
  },

  /**
   * Genera HTML del audiograma
   */
  _generarHTML(paciente) {
    const resultados = State.resultados || { OD: {}, OI: {} };
    const maskResultados = State.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State.logoResultados || { OD: [], OI: [] };

    const ptaOD = Classifications.calcularPTA(resultados.OD);
    const ptaOI = Classifications.calcularPTA(resultados.OI);
    const cOD = Classifications.clasificar(ptaOD);
    const cOI = Classifications.clasificar(ptaOI);

    const NA = "N/A";

    const filasTonal = FREQUENCIES.map(f => {
      const od = resultados.OD[f] !== undefined ? `${resultados.OD[f]} dB` : NA;
      const oi = resultados.OI[f] !== undefined ? `${resultados.OI[f]} dB` : NA;
      const odMask = maskResultados.OD[f] !== undefined ? ` (NE:${maskResultados.OD[f]}dB)` : "";
      const oiMask = maskResultados.OI[f] !== undefined ? ` (NE:${maskResultados.OI[f]}dB)` : "";
      return `<tr><td>${f} Hz</td><td style="color:#c04040">${od}${odMask}</td><td style="color:#2a60a0">${oi}${oiMask}</td></tr>`;
    }).join("");

    const filasLogo = (oido) => (logoResultados[oido] || []).map(r =>
      `<tr><td>${r.palabra}</td><td>${r.dB} dB</td><td>${r.correcta ? "✓" : "✗"}</td></tr>`
    ).join("");

    const pctLogo = (oido) => {
      const pct = Classifications.calcularDiscriminacion(logoResultados[oido] || []);
      return pct === null ? NA : `${pct}%`;
    };

    return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
      <title>Audiograma — ${this._esc(paciente.nombre || "Paciente")}</title>
      <style>
        body{font-family:Georgia,serif;margin:0;padding:20px;color:#111}
        h1{text-align:center;font-size:20px;letter-spacing:2px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:4px}
        h2{font-size:14px;margin-top:24px;border-left:3px solid #111;padding-left:8px}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
        th{background:#1a1a2e;color:#fff;padding:7px}
        td{border:1px solid #ccc;padding:5px 10px;text-align:center}
        .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px}
        .info div{padding:6px 10px;background:#f5f5f5;border-radius:4px}
        .muted{color:#555}
      </style>
    </head><body>
      <h1>AUDIOGRAMA CLÍNICO</h1>
      <div class="info">
        <div><strong>Paciente:</strong> ${this._esc(paciente.nombre) || NA}</div>
        <div><strong>Edad:</strong> ${this._esc(paciente.edad) || NA}</div>
        <div><strong>HC:</strong> ${this._esc(paciente.hc) || NA}</div>
        <div><strong>Fecha:</strong> ${this._esc(paciente.fecha) || new Date().toLocaleDateString("es-AR")}</div>
        <div style="grid-column:1/-1"><strong>Motivo:</strong> <span class="muted">${this._esc(paciente.motivo) || NA}</span></div>
        <div style="grid-column:1/-1"><strong>Obs:</strong> <span class="muted">${this._esc(paciente.obs) || NA}</span></div>
      </div>

      <h2>Audiometría Tonal — Umbrales</h2>
      <table><tr><th>Frecuencia</th><th>OD (Derecho)</th><th>OI (Izquierdo)</th></tr>${filasTonal}</table>

      <h2>Clasificación Diagnóstica</h2>
      <p style="font-size:12px;margin-top:8px">
        ${ptaOD !== null ? `<strong>OD — PTA: ${ptaOD.toFixed(0)} dB → ${this._esc(cOD?.label) || NA}</strong><br>` : `OD: ${NA}<br>`}
        ${ptaOI !== null ? `<strong>OI — PTA: ${ptaOI.toFixed(0)} dB → ${this._esc(cOI?.label) || NA}</strong>` : `OI: ${NA}`}
      </p>

      ${(logoResultados.OD?.length || logoResultados.OI?.length) ? `
        <h2>Logoaudiometría</h2>
        ${logoResultados.OD?.length ? `<p style="font-size:12px"><strong>Oído Derecho — Discriminación: ${pctLogo("OD")}</strong></p><table><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr>${filasLogo("OD")}</table>` : ""}
        ${logoResultados.OI?.length ? `<p style="font-size:12px;margin-top:12px"><strong>Oído Izquierdo — Discriminación: ${pctLogo("OI")}</strong></p><table><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr>${filasLogo("OI")}</table>` : ""}
      ` : ""}

      <br><hr style="margin-top:30px">
      <p style="font-size:10px;color:#666;text-align:center">Generado con Audiómetro Clínico Pro · Solo referencia clínica</p>
    </body></html>`;
  },

  _esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};
