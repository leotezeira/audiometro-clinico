/**
 * PDF.JS
 * Generación de informe audiométrico para exportar como PDF.
 *
 * Estrategia: genera un HTML completo de impresión en una ventana nueva
 * y llama a window.print() para que el navegador lo renderice limpiamente.
 * Esto evita los problemas de corte de contenido que tiene html2pdf.js.
 *
 * El usuario puede imprimir o "Guardar como PDF" desde el diálogo del navegador.
 */

const PDF = {

  // ─────────────────────────────────────────────────────────────────────────
  // PÚBLICO
  // ─────────────────────────────────────────────────────────────────────────

descargar() {

  try {

    // eliminar iframe anterior
    const oldFrame =
      document.getElementById("pdf-print-frame");

    if (oldFrame) {
      oldFrame.remove();
    }

    // crear iframe oculto
    const iframe =
      document.createElement("iframe");

    iframe.id = "pdf-print-frame";

    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";

    iframe.style.right = "0";
    iframe.style.bottom = "0";

    iframe.style.border = "0";

    iframe.style.opacity = "0";

    document.body.appendChild(iframe);

    // referencia
    const iframeWindow =
      iframe.contentWindow;

    const iframeDoc =
      iframeWindow.document;

    // escribir HTML
    iframeDoc.open();

    iframeDoc.write(
      this._generarHTML()
    );

    iframeDoc.close();

    // esperar carga
    iframe.onload = () => {

      setTimeout(() => {

        try {

          iframeWindow.focus();

          iframeWindow.print();

          UI?.showMsg?.(
            "msg-resultado",
            "✓ Preparando PDF...",
            "#10b981"
          );

        } catch (err) {

          console.error(
            "Error al imprimir:",
            err
          );

          alert(
            "No se pudo abrir el diálogo de impresión."
          );

        }

      }, 700);

    };

  } catch (err) {

    console.error(
      "Error generando PDF:",
      err
    );

    alert(
      "Ocurrió un error al generar el PDF."
    );

  }

},

  /** Alias para compatibilidad con el botón "Enviar por Correo" */
  enviarPorCorreo() {
    this.descargar();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SVG AUDIOGRAMA
  // ─────────────────────────────────────────────────────────────────────────

  /** Crea un tag SVG como string */
  _t(tag, attrs, text) {
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    if (text !== undefined) {
      return `<${tag} ${attrStr}>${String(text)}</${tag}>`;
    }
    return `<${tag} ${attrStr}/>`;
  },

  /**
   * Genera el SVG del audiograma como string HTML.
   * Incluye las 8 frecuencias estándar en la escala horizontal.
   */
  _generarSVGAudiograma(resultados, maskResultados) {
    const SVG_W   = 560;
    const SVG_H   = 320;
    const PAD_L   = 52;
    const PAD_R   = 20;
    const PAD_T   = 24;
    const PAD_B   = 36;
    const CHART_W = SVG_W - PAD_L - PAD_R;
    const CHART_H = SVG_H - PAD_T - PAD_B;
    const DB_MIN  = -10;
    const DB_MAX  = 120;

    // Frecuencias completas para el audiograma clínico
    const FREQS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

    const C_OD   = "#c03030";
    const C_OI   = "#1a55a8";
    const C_OD_M = "#d4880a";
    const C_OI_M = "#0891b2";

    const xPos = (i)  => PAD_L + (i / (FREQS.length - 1)) * CHART_W;
    const yPos = (db) => PAD_T + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CHART_H;
    const t    = this._t.bind(this);

    let els = [];

    // ── Fondo zona audición normal (≤ 25 dB) ──────────────────────────────
    els.push(t("rect", {
      x: PAD_L, y: yPos(DB_MIN).toFixed(1),
      width: CHART_W,
      height: (yPos(25) - yPos(DB_MIN)).toFixed(1),
      fill: "rgba(180,230,180,0.25)"
    }));

    // ── Marco del gráfico ─────────────────────────────────────────────────
    els.push(t("rect", {
      x: PAD_L, y: PAD_T,
      width: CHART_W, height: CHART_H,
      fill: "none",
      stroke: "rgba(15,23,42,0.3)",
      "stroke-width": 1
    }));

    // ── Grid horizontal (líneas de dB) ────────────────────────────────────
    [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].forEach(db => {
      const y     = yPos(db).toFixed(1);
      const isBold = db === 0;
      els.push(t("line", {
        x1: PAD_L, y1: y,
        x2: SVG_W - PAD_R, y2: y,
        stroke: "rgba(15,23,42,0.18)",
        "stroke-width": isBold ? 1.2 : 0.6,
        "stroke-dasharray": db === 25 ? "3,3" : "none"
      }));
      els.push(t("text", {
        x: PAD_L - 5, y: y,
        "text-anchor": "end",
        "dominant-baseline": "middle",
        fill: "rgba(15,23,42,0.65)",
        "font-size": 9,
        "font-family": "Arial,Helvetica,sans-serif"
      }, String(db)));
    });

    // ── Grid vertical (líneas de frecuencia) ──────────────────────────────
    FREQS.forEach((f, i) => {
      const x = xPos(i).toFixed(1);
      els.push(t("line", {
        x1: x, y1: PAD_T,
        x2: x, y2: SVG_H - PAD_B,
        stroke: "rgba(15,23,42,0.18)",
        "stroke-width": 0.6
      }));
      els.push(t("text", {
        x: x, y: SVG_H - PAD_B + 14,
        "text-anchor": "middle",
        fill: "rgba(15,23,42,0.65)",
        "font-size": 9,
        "font-family": "Arial,Helvetica,sans-serif"
      }, f >= 1000 ? `${f / 1000}k` : String(f)));
    });

    // ── Etiquetas de ejes ─────────────────────────────────────────────────
    const midY = (PAD_T + SVG_H - PAD_B) / 2;
    const midX = PAD_L + CHART_W / 2;

    els.push(t("text", {
      x: PAD_L - 38, y: midY.toFixed(1),
      "text-anchor": "middle",
      fill: "rgba(15,23,42,0.6)",
      "font-size": 10,
      "font-family": "Arial,Helvetica,sans-serif",
      transform: `rotate(-90,${(PAD_L - 38).toFixed(1)},${midY.toFixed(1)})`
    }, "dB HL"));

    els.push(t("text", {
      x: midX.toFixed(1), y: SVG_H - 2,
      "text-anchor": "middle",
      fill: "rgba(15,23,42,0.6)",
      "font-size": 10,
      "font-family": "Arial,Helvetica,sans-serif"
    }, "Frecuencia (Hz)"));

    // ── Curvas de los oídos ───────────────────────────────────────────────
    const trazarCurva = (ear, color, symbol, colorM, symbolM) => {
      const puntos = FREQS.map((f, i) => {
        const db = resultados[ear]?.[f];
        return db !== undefined ? { x: xPos(i), y: yPos(db), f } : null;
      }).filter(Boolean);

      // Línea de conexión
      if (puntos.length >= 2) {
        const d = puntos
          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");
        els.push(t("path", {
          d,
          fill: "none",
          stroke: color,
          "stroke-width": 2.5,
          "stroke-linejoin": "round",
          "stroke-linecap": "round"
        }));
      }

      // Símbolos principales
      puntos.forEach(p => {
        els.push(t("text", {
          x: p.x.toFixed(1), y: p.y.toFixed(1),
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: color,
          "font-size": 15,
          "font-weight": "bold",
          "font-family": "Arial,Helvetica,sans-serif"
        }, symbol));
      });

      // Símbolos de máscara
      FREQS.forEach((f, i) => {
        if (maskResultados[ear]?.[f] !== undefined) {
          const db = resultados[ear]?.[f] ?? 0;
          els.push(t("text", {
            x: xPos(i).toFixed(1), y: yPos(db).toFixed(1),
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            fill: colorM,
            "font-size": 12,
            "font-family": "Arial,Helvetica,sans-serif"
          }, symbolM));
        }
      });
    };

    trazarCurva("OD", C_OD, "○", C_OD_M, "▽");
    trazarCurva("OI", C_OI, "×", C_OI_M, "□");

    // ── Leyenda ───────────────────────────────────────────────────────────
    const legX = PAD_L + 8;
    const legY = PAD_T + 8;

    els.push(t("rect", {
      x: legX - 4, y: legY - 4,
      width: 156, height: 52,
      fill: "white",
      stroke: "rgba(15,23,42,0.2)",
      "stroke-width": 0.8,
      rx: 4, ry: 4
    }));

    const legendItems = [
      { sym: "○", color: C_OD,   label: "OD — Oído Derecho",    dy: 0  },
      { sym: "×", color: C_OI,   label: "OI — Oído Izquierdo",  dy: 22 }
    ];

    legendItems.forEach(({ sym, color, label, dy }) => {
      els.push(t("text", {
        x: legX + 6, y: legY + 12 + dy,
        "dominant-baseline": "middle",
        fill: color,
        "font-size": 14,
        "font-weight": "bold",
        "font-family": "Arial,Helvetica,sans-serif"
      }, sym));
      els.push(t("text", {
        x: legX + 24, y: legY + 12 + dy,
        "dominant-baseline": "middle",
        fill: "#222",
        "font-size": 9,
        "font-family": "Arial,Helvetica,sans-serif"
      }, label));
    });

    return `<svg xmlns="http://www.w3.org/2000/svg"
      width="${SVG_W}" height="${SVG_H}"
      viewBox="0 0 ${SVG_W} ${SVG_H}"
      style="max-width:100%;height:auto;display:block;margin:0 auto;">
      ${els.join("")}
    </svg>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HTML COMPLETO PARA IMPRIMIR
  // ─────────────────────────────────────────────────────────────────────────

  _generarHTML() {
    const paciente      = State.paciente        || {};
    const resultados    = State.resultados      || { OD: {}, OI: {} };
    const maskResultados= State.maskResultados  || { OD: {}, OI: {} };
    const logoResultados= State.logoResultados  || { OD: [], OI: [] };

    const ptaOD = Classifications.calcularPTA(resultados.OD);
    const ptaOI = Classifications.calcularPTA(resultados.OI);
    const cOD   = Classifications.clasificar(ptaOD);
    const cOI   = Classifications.clasificar(ptaOI);

    // ── SVG del audiograma ────────────────────────────────────────────────
    const svgAudiograma = this._generarSVGAudiograma(resultados, maskResultados);

    // ── Tabla de umbrales (8 frecuencias) ─────────────────────────────────
    const FREQS_PDF = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
    const NA = "—";

    const filasTonal = FREQS_PDF.map(f => {
      const odVal  = resultados.OD[f]    !== undefined ? `${resultados.OD[f]} dB`    : NA;
      const oiVal  = resultados.OI[f]    !== undefined ? `${resultados.OI[f]} dB`    : NA;
      const odMask = maskResultados.OD[f] !== undefined ? ` <span class="mask">(NE: ${maskResultados.OD[f]} dB)</span>` : "";
      const oiMask = maskResultados.OI[f] !== undefined ? ` <span class="mask">(NE: ${maskResultados.OI[f]} dB)</span>` : "";
      return `<tr>
        <td>${f >= 1000 ? `${f / 1000}.000` : f} Hz</td>
        <td class="od">${odVal}${odMask}</td>
        <td class="oi">${oiVal}${oiMask}</td>
      </tr>`;
    }).join("");

    // ── PTA calculado ─────────────────────────────────────────────────────
    const ptaRow = `<tr class="pta-row">
      <td><strong>PTA (500–4000 Hz)</strong></td>
      <td class="od"><strong>${ptaOD !== null ? `${ptaOD.toFixed(1)} dB` : NA}</strong></td>
      <td class="oi"><strong>${ptaOI !== null ? `${ptaOI.toFixed(1)} dB` : NA}</strong></td>
    </tr>`;

    // ── Clasificación ─────────────────────────────────────────────────────
    const clasifRow = (ear, pta, c) => {
      if (pta === null) return `<tr><td>${ear}</td><td colspan="2" class="muted">Sin datos suficientes</td></tr>`;
      const badgeColor = this._clasifColor(c?.cls);
      return `<tr>
        <td>${ear}</td>
        <td><strong>${pta.toFixed(1)} dB</strong></td>
        <td><span class="badge" style="background:${badgeColor.bg};color:${badgeColor.text};border:1px solid ${badgeColor.border}">${c?.label || NA}</span></td>
      </tr>`;
    };

    const tablaClasif = `<table>
      <thead><tr><th>Oído</th><th>PTA</th><th>Clasificación</th></tr></thead>
      <tbody>
        ${clasifRow("OD — Oído Derecho",   ptaOD, cOD)}
        ${clasifRow("OI — Oído Izquierdo", ptaOI, cOI)}
      </tbody>
    </table>`;

    // ── Logoaudiometría ───────────────────────────────────────────────────
    const logoODpct = Classifications.calcularDiscriminacion(logoResultados.OD);
    const logoOIpct = Classifications.calcularDiscriminacion(logoResultados.OI);

    const generarTablaLogo = (ear, respuestas, pct) => {
      if (!respuestas || !respuestas.length) return "";
      const color = ear === "OD" ? "#c03030" : "#1a55a8";
      const filas = respuestas.map(r => `<tr>
        <td>${this._esc(r.palabra)}</td>
        <td>${r.dB} dB</td>
        <td style="color:${r.correcta ? '#16a34a' : '#dc2626'};font-weight:700">${r.correcta ? "✓" : "✗"}</td>
      </tr>`).join("");

      return `<div class="logo-ear">
        <div class="logo-ear-header" style="color:${color}">
          ${ear} — Discriminación verbal:
          <strong>${pct !== null ? pct + "%" : "—"}</strong>
        </div>
        <table>
          <thead><tr><th>Palabra</th><th>Nivel</th><th>Correcta</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
    };

    const logoODHtml = generarTablaLogo("OD — Oído Derecho",   logoResultados.OD, logoODpct);
    const logoOIHtml = generarTablaLogo("OI — Oído Izquierdo", logoResultados.OI, logoOIpct);
    const hayLogo    = logoODHtml || logoOIHtml;

    // ── Fecha de impresión ────────────────────────────────────────────────
    const hoy = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });

    // ── HTML COMPLETO ─────────────────────────────────────────────────────
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audiograma — ${this._esc(paciente.nombre || "Paciente")}</title>
<style>
  /* ── Reset y base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    padding: 0;
    margin: 0;
  }

  .page-wrap {
    width: 185mm;
    margin: 0 auto;
    padding: 12mm 0 10mm;
  }

  /* ── Cabecera del informe ── */
  .report-header {
    text-align: center;
    border-bottom: 2.5px solid #1a1a3e;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .report-header h1 {
    font-size: 18pt;
    font-weight: 700;
    color: #1a1a3e;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }
  .report-header .subtitle {
    font-size: 9pt;
    color: #555;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* ── Datos del paciente ── */
  .patient-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px 12px;
    margin-bottom: 14px;
    padding: 10px 12px;
    background: #f5f7fa;
    border: 1px solid #dde3ed;
    border-radius: 6px;
  }
  .patient-grid .field {
    font-size: 9.5pt;
    line-height: 1.5;
  }
  .patient-grid .field .label {
    font-weight: 700;
    color: #333;
  }
  .patient-grid .full { grid-column: 1 / -1; }

  /* ── Secciones ── */
  .section {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .section-title {
    font-size: 10pt;
    font-weight: 700;
    color: #1a1a3e;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-left: 4px solid #1a1a3e;
    padding-left: 8px;
    margin-bottom: 8px;
  }

  /* ── Audiograma ── */
  .audiogram-box {
    background: #fff;
    border: 1px solid #dde3ed;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    page-break-inside: avoid;
  }
  .audiogram-box svg {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  /* ── Tablas ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  thead tr {
    background: #1a1a3e;
    color: #fff;
  }
  thead th {
    padding: 6px 8px;
    text-align: center;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  tbody tr:nth-child(even) { background: #f5f7fa; }
  tbody tr:hover           { background: #eef2ff; }
  tbody td {
    padding: 5px 8px;
    border-bottom: 1px solid #dde3ed;
    text-align: center;
  }
  tbody td:first-child { text-align: left; font-weight: 600; color: #333; }
  .pta-row td { background: #eef2ff !important; border-top: 1.5px solid #6070b0; }

  /* Colores de oído */
  .od   { color: #c03030; }
  .oi   { color: #1a55a8; }
  .mask { font-size: 8pt; color: #8a6a10; }
  .muted{ color: #888; font-style: italic; }

  /* Badges de clasificación */
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 8.5pt;
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Logoaudiometría ── */
  .logo-ear {
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .logo-ear-header {
    font-size: 9.5pt;
    font-weight: 700;
    margin-bottom: 5px;
    padding: 4px 8px;
    background: #f5f7fa;
    border-radius: 4px;
    border-left: 3px solid currentColor;
  }

  /* ── Resumen clínico ── */
  .summary-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    page-break-inside: avoid;
  }
  .summary-item {
    background: #f5f7fa;
    border: 1px solid #dde3ed;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;
  }
  .summary-item .si-label {
    font-size: 8pt;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
  }
  .summary-item .si-val {
    font-size: 14pt;
    font-weight: 700;
  }

  /* ── Pie de página ── */
  .report-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #dde3ed;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 8pt;
    color: #888;
    page-break-inside: avoid;
  }
  .report-footer .disclaimer {
    max-width: 55%;
    line-height: 1.4;
  }
  .report-footer .print-info {
    text-align: right;
  }

  /* ── Firma ── */
  .firma-area {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    page-break-inside: avoid;
  }
  .firma-box {
    width: 180px;
    text-align: center;
  }
  .firma-line {
    border-top: 1.5px solid #222;
    margin-bottom: 4px;
  }
  .firma-label {
    font-size: 8pt;
    color: #555;
  }

  /* ── Botón de impresión (oculto al imprimir) ── */
  .print-btn {
    display: block;
    margin: 20px auto 0;
    padding: 11px 32px;
    background: #1a1a3e;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.5px;
    transition: background 0.2s;
  }
  .print-btn:hover { background: #2d2d6e; }

  /* ── IMPRESIÓN ── */
  @media print {
    .print-btn { display: none !important; }
    body        { margin: 0; }
    .page-wrap  { width: 100%; padding: 8mm; }

    table        { page-break-inside: auto; }
    tr           { page-break-inside: avoid; page-break-after: auto; }
    thead        { display: table-header-group; }

    .section          { page-break-inside: avoid; }
    .audiogram-box    { page-break-inside: avoid; }
    .logo-ear         { page-break-inside: avoid; }
    .summary-box      { page-break-inside: avoid; }
    .report-footer    { page-break-inside: avoid; }
    .firma-area       { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page-wrap">

  <!-- ══ CABECERA ══ -->
  <div class="report-header">
    <h1>AUDIOGRAMA CLÍNICO</h1>
    <div class="subtitle">Informe de Evaluación Auditiva</div>
  </div>

  <!-- ══ DATOS DEL PACIENTE ══ -->
  <div class="patient-grid">
    <div class="field">
      <span class="label">Paciente:</span>
      ${this._esc(paciente.nombre) || '<span class="muted">No registrado</span>'}
    </div>
    <div class="field">
      <span class="label">Edad:</span>
      ${this._esc(paciente.edad) ? this._esc(paciente.edad) + " años" : '<span class="muted">—</span>'}
    </div>
    <div class="field">
      <span class="label">Nº HC:</span>
      ${this._esc(paciente.hc) || '<span class="muted">—</span>'}
    </div>
    <div class="field">
      <span class="label">Fecha:</span>
      ${this._esc(paciente.fecha) || hoy}
    </div>
    <div class="field full">
      <span class="label">Motivo de consulta:</span>
      ${this._esc(paciente.motivo) || '<span class="muted">—</span>'}
    </div>
    <div class="field full">
      <span class="label">Observaciones:</span>
      ${this._esc(paciente.obs) || '<span class="muted">—</span>'}
    </div>
  </div>

  <!-- ══ RESUMEN RÁPIDO ══ -->
  <div class="section">
    <div class="section-title">Resumen</div>
    <div class="summary-box">
      <div class="summary-item">
        <div class="si-label">PTA Oído Derecho</div>
        <div class="si-val od">${ptaOD !== null ? ptaOD.toFixed(1) + " dB" : "—"}</div>
      </div>
      <div class="summary-item">
        <div class="si-label">PTA Oído Izquierdo</div>
        <div class="si-val oi">${ptaOI !== null ? ptaOI.toFixed(1) + " dB" : "—"}</div>
      </div>
      <div class="summary-item">
        <div class="si-label">Discriminación OD</div>
        <div class="si-val od">${logoODpct !== null ? logoODpct + "%" : "—"}</div>
      </div>
      <div class="summary-item">
        <div class="si-label">Discriminación OI</div>
        <div class="si-val oi">${logoOIpct !== null ? logoOIpct + "%" : "—"}</div>
      </div>
    </div>
  </div>

  <!-- ══ AUDIOGRAMA ══ -->
  <div class="section">
    <div class="section-title">Audiograma Tonal</div>
    <div class="audiogram-box">
      ${svgAudiograma}
    </div>
  </div>

  <!-- ══ UMBRALES POR FRECUENCIA ══ -->
  <div class="section">
    <div class="section-title">Umbrales Auditivos por Frecuencia</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Frecuencia</th>
          <th>OD — Oído Derecho</th>
          <th>OI — Oído Izquierdo</th>
        </tr>
      </thead>
      <tbody>
        ${filasTonal}
        ${ptaRow}
      </tbody>
    </table>
  </div>

  <!-- ══ CLASIFICACIÓN DIAGNÓSTICA ══ -->
  <div class="section">
    <div class="section-title">Clasificación Diagnóstica (ISO 1999)</div>
    ${tablaClasif}
    <div style="font-size:8pt;color:#666;margin-top:5px;line-height:1.4">
      * Normal: ≤20 dB &nbsp;|&nbsp; Hipoacusia Leve: 21–40 dB &nbsp;|&nbsp; Hipoacusia Moderada: 41–60 dB &nbsp;|&nbsp; Hipoacusia Severa: 61–80 dB &nbsp;|&nbsp; Hipoacusia Profunda: &gt;80 dB
    </div>
  </div>

  ${hayLogo ? `
  <!-- ══ LOGOAUDIOMETRÍA ══ -->
  <div class="section">
    <div class="section-title">Logoaudiometría — Discriminación Verbal</div>
    ${logoODHtml}
    ${logoOIHtml}
  </div>
  ` : ""}

  <!-- ══ FIRMA ══ -->
  <div class="firma-area">
    <div class="firma-box">
      <div style="height:40px"></div>
      <div class="firma-line"></div>
      <div class="firma-label">Firma y sello del profesional</div>
    </div>
  </div>

  <!-- ══ PIE DE PÁGINA ══ -->
  <div class="report-footer">
    <div class="disclaimer">
      <strong>Audiómetro Clínico Pro</strong> — Solo referencia clínica.<br>
      Usar auriculares calibrados. Los valores obtenidos deben ser interpretados por un profesional habilitado.
    </div>
    <div class="print-info">
      Impreso: ${hoy}<br>
      HC: ${this._esc(paciente.hc) || "—"}
    </div>
  </div>

  <!-- Botón visible solo en pantalla -->
  <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>

</div><!-- /page-wrap -->
</body>
</html>`;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Escapa caracteres HTML peligrosos */
  _esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /** Devuelve colores para el badge de clasificación */
  _clasifColor(cls) {
    const map = {
      normal:    { bg: "rgba(16,185,129,0.15)",  text: "#065f46", border: "#10b981" },
      leve:      { bg: "rgba(212,175,55,0.2)",   text: "#78620a", border: "#d4af37" },
      moderada:  { bg: "rgba(245,158,11,0.18)",  text: "#92400e", border: "#f59e0b" },
      severa:    { bg: "rgba(234,88,12,0.18)",   text: "#7c2d12", border: "#ea580c" },
      profunda:  { bg: "rgba(239,68,68,0.18)",   text: "#7f1d1d", border: "#ef4444" }
    };
    return map[cls] || { bg: "#f0f0f0", text: "#333", border: "#ccc" };
  }
};