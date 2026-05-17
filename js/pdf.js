/**
 * PDF.JS
 * Exportación simple a PDF/impresión (vía window.print)
 */

const PDF = {
  exportar() {
    const paciente = State.paciente || {};
    const resultados = State.resultados || { OD: {}, OI: {} };
    const maskResultados = State.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State.logoResultados || { OD: [], OI: [] };

    const ptaOD = Classifications.calcularPTA(resultados.OD);
    const ptaOI = Classifications.calcularPTA(resultados.OI);
    const cOD = Classifications.clasificar(ptaOD);
    const cOI = Classifications.clasificar(ptaOI);

    const filasTonal = FREQUENCIES.map(f => {
      const od = resultados.OD[f] !== undefined ? `${resultados.OD[f]} dB` : "â€”";
      const oi = resultados.OI[f] !== undefined ? `${resultados.OI[f]} dB` : "â€”";
      const odMask = maskResultados.OD[f] !== undefined ? ` (NE:${maskResultados.OD[f]}dB)` : "";
      const oiMask = maskResultados.OI[f] !== undefined ? ` (NE:${maskResultados.OI[f]}dB)` : "";
      return `<tr><td>${f} Hz</td><td style="color:#c04040">${od}${odMask}</td><td style="color:#2a60a0">${oi}${oiMask}</td></tr>`;
    }).join("");

    const filasLogo = (oido) => (logoResultados[oido] || []).map(r =>
      `<tr><td>${r.palabra}</td><td>${r.dB} dB</td><td>${r.correcta ? "âœ“" : "âœ—"}</td></tr>`
    ).join("");

    const pctLogo = (oido) => {
      const pct = Classifications.calcularDiscriminacion(logoResultados[oido] || []);
      return pct === null ? "â€”" : `${pct}%`;
    };

    const win = window.open("", "_blank");
    if (!win) {
      alert("No se pudo abrir la ventana de impresión. Revisa el bloqueador de pop-ups.");
      return;
    }

    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8" />
      <title>Audiograma — ${this._esc(paciente.nombre || "Paciente")}</title>
      <style>
        body{font-family:Georgia,serif;margin:40px;color:#111}
        h1{text-align:center;font-size:20px;letter-spacing:2px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:4px}
        h2{font-size:14px;margin-top:24px;border-left:3px solid #111;padding-left:8px}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
        th{background:#1a1a2e;color:#fff;padding:7px}
        td{border:1px solid #ccc;padding:5px 10px;text-align:center}
        .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px}
        .info div{padding:6px 10px;background:#f5f5f5;border-radius:4px}
        .muted{color:#555}
        @media print{button{display:none}}
      </style>
    </head><body>
      <h1>AUDIOGRAMA CLÍNICO</h1>
      <div class="info">
        <div><strong>Paciente:</strong> ${this._esc(paciente.nombre) || "â€”"}</div>
        <div><strong>Edad:</strong> ${this._esc(paciente.edad) || "â€”"}</div>
        <div><strong>HC:</strong> ${this._esc(paciente.hc) || "â€”"}</div>
        <div><strong>Fecha:</strong> ${this._esc(paciente.fecha) || new Date().toLocaleDateString("es-AR")}</div>
        <div style="grid-column:1/-1"><strong>Motivo:</strong> <span class="muted">${this._esc(paciente.motivo) || "â€”"}</span></div>
        <div style="grid-column:1/-1"><strong>Obs:</strong> <span class="muted">${this._esc(paciente.obs) || "â€”"}</span></div>
      </div>

      <h2>Audiometría Tonal — Umbrales</h2>
      <table><tr><th>Frecuencia</th><th>OD (Derecho)</th><th>OI (Izquierdo)</th></tr>${filasTonal}</table>

      <h2>Clasificación Diagnóstica</h2>
      <p style="font-size:12px;margin-top:8px">
        ${ptaOD !== null ? `<strong>OD — PTA: ${ptaOD.toFixed(0)} dB → ${this._esc(cOD?.label) || "—"}</strong><br>` : "OD: Sin datos<br>"}
        ${ptaOI !== null ? `<strong>OI — PTA: ${ptaOI.toFixed(0)} dB → ${this._esc(cOI?.label) || "—"}</strong>` : "OI: Sin datos"}
      </p>

      ${(logoResultados.OD?.length || logoResultados.OI?.length) ? `
        <h2>Logoaudiometría</h2>
        ${logoResultados.OD?.length ? `<p style="font-size:12px"><strong>Oído Derecho — Discriminación: ${pctLogo("OD")}</strong></p><table><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr>${filasLogo("OD")}</table>` : ""}
        ${logoResultados.OI?.length ? `<p style="font-size:12px;margin-top:12px"><strong>Oído Izquierdo — Discriminación: ${pctLogo("OI")}</strong></p><table><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr>${filasLogo("OI")}</table>` : ""}
      ` : ""}

      <br><hr style="margin-top:30px">
      <p style="font-size:10px;color:#666;text-align:center">Generado con Audiómetro Clínico Pro · Solo referencia clínica</p>
      <br>
      <button onclick="window.print()" style="padding:10px 24px;background:#1a1a2e;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer">
        Imprimir / Guardar PDF
      </button>
    </body></html>`);

    win.document.close();
    win.focus();
  },

  _esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
};
