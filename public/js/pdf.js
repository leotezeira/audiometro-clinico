/**
 * PDF.JS
 * Generación de PDF real con html2pdf + funciones de descarga y correo
 */

const PDF = {
  descargar: function() {
    console.log("PDF.descargar() called");
    const paciente = State.paciente || {};
    
    if (typeof html2pdf === 'undefined') {
      alert("Librería de PDF no cargada. Recarga la página.");
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
      if (UI && UI.showMsg) {
        UI.showMsg("msg-resultado", "✓ PDF descargado", "#10b981");
      }
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar PDF: " + error.message);
    }
  },

  enviarPorCorreo: function() {
    console.log("PDF.enviarPorCorreo() called");
    const paciente = State.paciente || {};
    if (!paciente.nombre) {
      alert("Completa los datos del paciente primero");
      return;
    }

    this.descargar();

    const subject = "Audiograma - " + (paciente.nombre || "Paciente");
    const body = "Adjunto encontrará el audiograma clínico de " + paciente.nombre + ".\n\nFecha: " + (paciente.fecha || new Date().toLocaleDateString('es-AR')) + "\nH.C.: " + (paciente.hc || 'N/A');
    const mailtoLink = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    
    setTimeout(() => {
      window.location.href = mailtoLink;
    }, 1500);
  },

  exportar: function() {
    this.descargar();
  },

  _generarHTML: function(paciente) {
    const resultados = State.resultados || { OD: {}, OI: {} };
    const maskResultados = State.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State.logoResultados || { OD: [], OI: [] };

    const ptaOD = Classifications.calcularPTA(resultados.OD);
    const ptaOI = Classifications.calcularPTA(resultados.OI);
    const cOD = Classifications.clasificar(ptaOD);
    const cOI = Classifications.clasificar(ptaOI);

    const NA = "N/A";

    const filasTonal = FREQUENCIES.map(f => {
      const od = resultados.OD[f] !== undefined ? resultados.OD[f] + " dB" : NA;
      const oi = resultados.OI[f] !== undefined ? resultados.OI[f] + " dB" : NA;
      const odMask = maskResultados.OD[f] !== undefined ? " (NE:" + maskResultados.OD[f] + "dB)" : "";
      const oiMask = maskResultados.OI[f] !== undefined ? " (NE:" + maskResultados.OI[f] + "dB)" : "";
      return "<tr><td>" + f + " Hz</td><td style=\"color:#c04040\">" + od + odMask + "</td><td style=\"color:#2a60a0\">" + oi + oiMask + "</td></tr>";
    }).join("");

    const filasLogo = (oido) => (logoResultados[oido] || []).map(r =>
      "<tr><td>" + r.palabra + "</td><td>" + r.dB + " dB</td><td>" + (r.correcta ? "✓" : "✗") + "</td></tr>"
    ).join("");

    const pctLogo = (oido) => {
      const pct = Classifications.calcularDiscriminacion(logoResultados[oido] || []);
      return pct === null ? NA : pct + "%";
    };

    const pacienteNombre = this._esc(paciente.nombre) || NA;
    const pacienteEdad = this._esc(paciente.edad) || NA;
    const pacienteHC = this._esc(paciente.hc) || NA;
    const pacienteFecha = this._esc(paciente.fecha) || new Date().toLocaleDateString("es-AR");
    const pacienteMotivo = this._esc(paciente.motivo) || NA;
    const pacienteObs = this._esc(paciente.obs) || NA;

    let html = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\" />";
    html += "<title>Audiograma — " + pacienteNombre + "</title>";
    html += "<style>";
    html += "body{font-family:Georgia,serif;margin:0;padding:20px;color:#111}";
    html += "h1{text-align:center;font-size:20px;letter-spacing:2px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:4px}";
    html += "h2{font-size:14px;margin-top:24px;border-left:3px solid #111;padding-left:8px}";
    html += "table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}";
    html += "th{background:#1a1a2e;color:#fff;padding:7px}";
    html += "td{border:1px solid #ccc;padding:5px 10px;text-align:center}";
    html += ".info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px}";
    html += ".info div{padding:6px 10px;background:#f5f5f5;border-radius:4px}";
    html += ".muted{color:#555}";
    html += "</style>";
    html += "</head><body>";
    html += "<h1>AUDIOGRAMA CLÍNICO</h1>";
    html += "<div class=\"info\">";
    html += "<div><strong>Paciente:</strong> " + pacienteNombre + "</div>";
    html += "<div><strong>Edad:</strong> " + pacienteEdad + "</div>";
    html += "<div><strong>HC:</strong> " + pacienteHC + "</div>";
    html += "<div><strong>Fecha:</strong> " + pacienteFecha + "</div>";
    html += "<div style=\"grid-column:1/-1\"><strong>Motivo:</strong> <span class=\"muted\">" + pacienteMotivo + "</span></div>";
    html += "<div style=\"grid-column:1/-1\"><strong>Obs:</strong> <span class=\"muted\">" + pacienteObs + "</span></div>";
    html += "</div>";
    html += "<h2>Audiometría Tonal — Umbrales</h2>";
    html += "<table><tr><th>Frecuencia</th><th>OD (Derecho)</th><th>OI (Izquierdo)</th></tr>" + filasTonal + "</table>";
    html += "<h2>Clasificación Diagnóstica</h2>";
    html += "<p style=\"font-size:12px;margin-top:8px\">";
    if (ptaOD !== null) {
      html += "<strong>OD — PTA: " + ptaOD.toFixed(0) + " dB → " + (cOD && cOD.label ? this._esc(cOD.label) : NA) + "</strong><br>";
    } else {
      html += "OD: " + NA + "<br>";
    }
    if (ptaOI !== null) {
      html += "<strong>OI — PTA: " + ptaOI.toFixed(0) + " dB → " + (cOI && cOI.label ? this._esc(cOI.label) : NA) + "</strong>";
    } else {
      html += "OI: " + NA;
    }
    html += "</p>";

    if (logoResultados.OD && logoResultados.OD.length > 0 || logoResultados.OI && logoResultados.OI.length > 0) {
      html += "<h2>Logoaudiometría</h2>";
      if (logoResultados.OD && logoResultados.OD.length > 0) {
        html += "<p style=\"font-size:12px\"><strong>Oído Derecho — Discriminación: " + pctLogo("OD") + "</strong></p>";
        html += "<table><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr>" + filasLogo("OD") + "</table>";
      }
      if (logoResultados.OI && logoResultados.OI.length > 0) {
        html += "<p style=\"font-size:12px;margin-top:12px\"><strong>Oído Izquierdo — Discriminación: " + pctLogo("OI") + "</strong></p>";
        html += "<table><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr>" + filasLogo("OI") + "</table>";
      }
    }

    html += "<br><hr style=\"margin-top:30px\">";
    html += "<p style=\"font-size:10px;color:#666;text-align:center\">Generado con Audiómetro Clínico Pro · Solo referencia clínica</p>";
    html += "</body></html>";
    
    return html;
  },

  _esc: function(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};
