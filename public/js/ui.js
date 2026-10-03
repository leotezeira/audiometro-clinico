/**
 * UI.JS
 * Gestión de interfaz de usuario y navegación
 */

const UI = {
  /**
   * Navega a una página
   */
  goPage(pageId) {
    // Oculta todas las páginas
    document.querySelectorAll(".page").forEach(p => {
      p.classList.remove("active");
    });

    // Muestra página seleccionada
    document.getElementById(pageId).classList.add("active");

    // Actualiza botones de nav
    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.remove("active");
    });

    const pageIds = ["pg-paciente", "pg-tonal", "pg-logo", "pg-resultado", "pg-historial"];
    const idx = pageIds.indexOf(pageId);
    document.querySelectorAll(".nav-btn")[idx].classList.add("active");

    // Acciones específicas por página
    if (pageId === "pg-resultado") {
      this.actualizarResultado();
    } else if (pageId === "pg-historial") {
      Storage.renderHistorial();
    } else if (pageId === "pg-tonal") {
      Audiogram.render("audiogram");
      Tonal.actualizarClasificacion();
    }
  },

  /**
   * Muestra mensaje temporal
   */
  showMsg(elementId, text, color) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.textContent = text;
    el.style.color = color;

    setTimeout(() => {
      el.textContent = "";
    }, 2500);
  },

  /**
   * Actualiza página de resultados
   */
  actualizarResultado() {
    this.actualizarDatosResumen();
    this.actualizarClasificacionResultado();
    this.actualizarGraficosResultado();
    Audiogram.render("audiogram2", State.resultados, State.maskResultados);
  },

  /**
   * Actualiza los gráficos del resumen final
   */
  actualizarGraficosResultado() {
    this.renderGraficoReconocimiento();
    this.renderGraficoComparativo();
  },

  renderGraficoReconocimiento() {
    const svg = document.getElementById("logo-curve-chart");
    if (!svg) return;

    const odPoints = Classifications.obtenerCurvaDiscriminacion(State.logoResultados.OD);
    const oiPoints = Classifications.obtenerCurvaDiscriminacion(State.logoResultados.OI);

    const width = 500;
    const height = 220;
    const pad = { top: 18, right: 28, bottom: 46, left: 60 };

    const allDb = [...odPoints.map(p => p.dB), ...oiPoints.map(p => p.dB)];
    const minDb = allDb.length ? Math.min(...allDb, 0) : 0;
    const maxDb = allDb.length ? Math.max(...allDb, 100) : 100;
    const x = db => pad.left + ((db - minDb) / (Math.max(maxDb - minDb, 1))) * (width - pad.left - pad.right);
    const y = pct => height - pad.bottom - (pct / 100) * (height - pad.top - pad.bottom);

    const linePath = points => points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.dB).toFixed(2)} ${y(p.pct).toFixed(2)}`).join(" ");

    const grid = [0, 20, 40, 60, 80, 100].map(v => `
      <line x1="${pad.left}" y1="${y(v)}" x2="${width - pad.right}" y2="${y(v)}" stroke="#dfe7f3" stroke-width="1"/>
      <text x="${pad.left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#64748b">${v}%</text>
    `).join("");

    const xLabels = Array.from({ length: 6 }, (_, i) => {
      const value = Math.round(minDb + ((maxDb - minDb) / 5) * i);
      return `
        <text x="${x(value)}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#64748b">${value} dB</text>
      `;
    }).join("");

    const odFinal = Classifications.calcularDiscriminacion(State.logoResultados.OD) ?? 0;
    const oiFinal = Classifications.calcularDiscriminacion(State.logoResultados.OI) ?? 0;
    const odLast = odPoints[odPoints.length - 1];
    const oiLast = oiPoints[oiPoints.length - 1];

    svg.innerHTML = `
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="#f8fafc"/>
      ${grid}
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#94a3b8" stroke-width="1.5"/>
      ${odPoints.length ? `<path d="${linePath(odPoints)}" fill="none" stroke="${COLOR_OD}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      ${oiPoints.length ? `<path d="${linePath(oiPoints)}" fill="none" stroke="${COLOR_OI}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      ${odPoints.map(p => `<circle cx="${x(p.dB)}" cy="${y(p.pct)}" r="3.5" fill="${COLOR_OD}"/>`).join("")}
      ${oiPoints.map(p => `<circle cx="${x(p.dB)}" cy="${y(p.pct)}" r="3.5" fill="${COLOR_OI}"/>`).join("")}
      ${xLabels}
      <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-size="12" fill="#475569" font-weight="700">Nivel de presentación (dB HL)</text>
      <text x="20" y="${height / 2}" transform="rotate(-90 20 ${height / 2})" text-anchor="middle" font-size="12" fill="#475569" font-weight="700">Desempeño (%)</text>
      <text x="${width - 32}" y="${y(odLast ? odLast.pct : odFinal) - 12}" text-anchor="end" font-size="11" fill="${COLOR_OD}" font-weight="700">OD ${odLast ? odLast.pct : odFinal}%</text>
      <text x="${width - 32}" y="${y(oiLast ? oiLast.pct : oiFinal) - 12}" text-anchor="end" font-size="11" fill="${COLOR_OI}" font-weight="700">OI ${oiLast ? oiLast.pct : oiFinal}%</text>
    `;
  },

  renderGraficoComparativo() {
    const svg = document.getElementById("logo-bar-chart");
    if (!svg) return;

    const odPct = Classifications.calcularDiscriminacion(State.logoResultados.OD) ?? 0;
    const oiPct = Classifications.calcularDiscriminacion(State.logoResultados.OI) ?? 0;
    const width = 500;
    const height = 200;
    const pad = { left: 60, right: 18, top: 18, bottom: 42 };

    const values = [
      { label: "OD", value: odPct, color: COLOR_OD, x: 70 },
      { label: "OI", value: oiPct, color: COLOR_OI, x: 220 }
    ];

    const barWidth = 90;
    const yForValue = value => height - pad.bottom - (value / 100) * (height - pad.top - pad.bottom);

    const grid = [0, 20, 40, 60, 80, 100].map(v => {
      const y = yForValue(v);
      return `
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#64748b">${v}</text>
      `;
    }).join("");

    const bars = values.map(({ label, value, color, x }) => {
      const barHeight = (value / 100) * (height - pad.top - pad.bottom);
      const y = height - pad.bottom - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="10" fill="${color}" opacity="0.82"/>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="12" fill="${color}" font-weight="700">${value}%</text>
        <text x="${x + barWidth / 2}" y="${height - pad.bottom + 18}" text-anchor="middle" font-size="11" fill="#475569" font-weight="700">${label}</text>
      `;
    }).join("");

    svg.innerHTML = `
      <rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="#f8fafc"/>
      <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#94a3b8" stroke-width="1.5"/>
      ${grid}
      ${bars}
      <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#475569" font-weight="700">Reconocimiento del habla (%)</text>
    `;
  },

  /**
   * Actualiza datos y resumen en página de resultados
   */
  actualizarDatosResumen() {
    // Datos del paciente
    document.getElementById("res-pac-data").innerHTML = Patient.obtenerDatosFormateados();

    // Resumen grid
    const ptaOD = Classifications.calcularPTA(State.resultados.OD);
    const ptaOI = Classifications.calcularPTA(State.resultados.OI);
    const logoODpct = Classifications.calcularDiscriminacion(State.logoResultados.OD);
    const logoOIpct = Classifications.calcularDiscriminacion(State.logoResultados.OI);

    let rg = "";
    rg += this.resItem("PTA Oído Derecho", ptaOD !== null ? `${ptaOD.toFixed(0)} dB` : "—", COLOR_OD);
    rg += this.resItem("PTA Oído Izquierdo", ptaOI !== null ? `${ptaOI.toFixed(0)} dB` : "—", COLOR_OI);
    rg += this.resItem("Discrimin. OD", logoODpct !== null ? `${logoODpct}%` : "—", COLOR_OD);
    rg += this.resItem("Discrimin. OI", logoOIpct !== null ? `${logoOIpct}%` : "—", COLOR_OI);

    document.getElementById("resumen-grid").innerHTML = rg;
  },

  /**
   * Actualiza clasificación en resultado
   */
  actualizarClasificacionResultado() {
    const html = Classifications.renderClasificacion();
    document.getElementById("res-clasif").innerHTML = html;
  },

  /**
   * Crea elemento de resumen
   */
  resItem(label, value, color) {
    return `<div class="resumen-item">
              <div class="ri-label">${label}</div>
              <div class="ri-val" style="color:${color}">${value}</div>
            </div>`;
  }
};
