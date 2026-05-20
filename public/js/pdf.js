/**
 * AUDIOGRAM.JS
 * Renderizado del audiograma en SVG
 */

const PDF = {

  descargar: async function () {
    try {
      const pdfBlob = await this._crearPDFBlob();
      const paciente = State.paciente || {};
      const filename = `Audiograma_${paciente.nombre || "Paciente"}_${Date.now()}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      UI?.showMsg?.("msg-resultado", "✓ PDF descargado", "#10b981");
    } catch (err) {
      console.error(err);
      alert("Error al generar PDF");
    }
  },

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

  compartirPDF: async function () {
    try {
      const pdfBlob = await this._crearPDFBlob();
      const paciente = State.paciente || {};
      const filename = `Audiograma_${paciente.nombre || "Paciente"}.pdf`;
      const file = new File([pdfBlob], filename, { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Audiograma Clínico", text: "Audiograma clínico adjunto", files: [file] });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error(err);
      alert("Error al compartir PDF");
    }
  },

  _crearPDFBlob: async function () {
    if (typeof html2pdf === "undefined") throw new Error("html2pdf no está cargado");
    const paciente = State.paciente || {};
    const html = this._generarHTML(paciente);
    const container = document.createElement("div");
    container.innerHTML = html;
    container.style.position = "fixed";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.width = "210mm";
    container.style.background = "#ffffff";
    document.body.appendChild(container);
    const filename = `Audiograma_${paciente.nombre || "Paciente"}.pdf`;
    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: window.devicePixelRatio > 1 ? 2 : 1,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        backgroundColor: "#ffffff"
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };
    try {
      const worker = html2pdf().set(opt).from(container);
      const pdfBlob = await worker.outputPdf("blob");
      document.body.removeChild(container);
      return pdfBlob;
    } catch (err) {
      document.body.removeChild(container);
      throw err;
    }
  },

  // ─────────────────────────────────────────────
  // SVG AUDIOGRAMA PARA PDF
  // Misma lógica que Audiogram.js pero genera string
  // ─────────────────────────────────────────────
  _svgTag(tag, attrs, text) {
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    if (text !== undefined) {
      return `<${tag} ${attrStr}>${String(text)}</${tag}>`;
    }
    return `<${tag} ${attrStr}/>`;
  },

  _generarSVGAudiograma(resultados, maskResultados) {
    // Constantes de layout — ajustá según tus globales reales
    const SVG_W = 520;
    const SVG_H = 340;
    const PAD_L = 55;
    const PAD_R = 20;
    const PAD_T = 20;
    const PAD_B = 30;
    const CHART_W = SVG_W - PAD_L - PAD_R;
    const CHART_H = SVG_H - PAD_T - PAD_B;
    const DB_MIN = -10;
    const DB_MAX = 120;
    const FREQS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
    const COLOR_OD = "#c04040";
    const COLOR_OI = "#2a60a0";
    const COLOR_OD_M = "#e07070";
    const COLOR_OI_M = "#6090d0";

    const xPos = (i) => PAD_L + (i / (FREQS.length - 1)) * CHART_W;
    const yPos = (db) => PAD_T + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CHART_H;

    const t = this._svgTag.bind(this);
    let els = [];

    // Fondo zona normal (≤25 dB)
    els.push(t("rect", {
      x: PAD_L, y: yPos(-10),
      width: CHART_W,
      height: yPos(25) - yPos(-10),
      fill: "rgba(124,163,200,0.08)"
    }));

    // Fondo general del gráfico
    els.push(t("rect", {
      x: PAD_L, y: PAD_T,
      width: CHART_W, height: CHART_H,
      fill: "none",
      stroke: "rgba(15,23,42,0.25)",
      "stroke-width": 1
    }));

    // Grid horizontal
    [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].forEach(db => {
      els.push(t("line", {
        x1: PAD_L, y1: yPos(db),
        x2: SVG_W - PAD_R, y2: yPos(db),
        stroke: "rgba(15,23,42,0.15)",
        "stroke-width": db === 0 ? 1.2 : 0.6
      }));
      els.push(t("text", {
        x: PAD_L - 5, y: yPos(db),
        "text-anchor": "end",
        "dominant-baseline": "middle",
        fill: "rgba(15,23,42,0.6)",
        "font-size": 9,
        "font-family": "Arial,sans-serif"
      }, String(db)));
    });

    // Grid vertical
    FREQS.forEach((f, i) => {
      els.push(t("line", {
        x1: xPos(i), y1: PAD_T,
        x2: xPos(i), y2: SVG_H - PAD_B,
        stroke: "rgba(15,23,42,0.15)",
        "stroke-width": 0.6
      }));
      els.push(t("text", {
        x: xPos(i), y: SVG_H - PAD_B + 14,
        "text-anchor": "middle",
        fill: "rgba(15,23,42,0.6)",
        "font-size": 9,
        "font-family": "Arial,sans-serif"
      }, f >= 1000 ? `${f / 1000}k` : String(f)));
    });

    // Etiqueta eje Y
    els.push(t("text", {
      x: PAD_L - 38,
      y: PAD_T + CHART_H / 2,
      "text-anchor": "middle",
      fill: "rgba(15,23,42,0.55)",
      "font-size": 9,
      "font-family": "Arial,sans-serif",
      transform: `rotate(-90,${PAD_L - 38},${PAD_T + CHART_H / 2})`
    }, "dB HL"));

    // Etiqueta eje X
    els.push(t("text", {
      x: PAD_L + CHART_W / 2,
      y: SVG_H - 1,
      "text-anchor": "middle",
      fill: "rgba(15,23,42,0.55)",
      "font-size": 9,
      "font-family": "Arial,sans-serif"
    }, "Frecuencia (Hz)"));

    // ── Función para trazar curva de un oído ──
    const trazarCurva = (ear, color, symbol, colorM, symbolM) => {
      const puntos = FREQS.map((f, i) => {
        const db = resultados[ear]?.[f];
        return db !== undefined ? { x: xPos(i), y: yPos(db), f, i } : null;
      }).filter(Boolean);

      // Línea
      if (puntos.length >= 2) {
        const d = puntos.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        els.push(t("path", {
          d,
          fill: "none",
          stroke: color,
          "stroke-width": 2.2,
          "stroke-opacity": 0.85,
          "stroke-linejoin": "round"
        }));
      }

      // Símbolos principales
      puntos.forEach(p => {
        els.push(t("text", {
          x: p.x.toFixed(1),
          y: p.y.toFixed(1),
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: color,
          "font-size": 14,
          "font-weight": "bold",
          "font-family": "Arial,sans-serif"
        }, symbol));
      });

      // Símbolos máscara
      FREQS.forEach((f, i) => {
        if (maskResultados[ear]?.[f] !== undefined) {
          const db = resultados[ear]?.[f] ?? 0;
          els.push(t("text", {
            x: xPos(i).toFixed(1),
            y: yPos(db).toFixed(1),
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            fill: colorM,
            "font-size": 12,
            "font-family": "Arial,sans-serif"
          }, symbolM));
        }
      });
    };

    trazarCurva("OD", COLOR_OD, "○", COLOR_OD_M, "▽");
    trazarCurva("OI", COLOR_OI, "×", COLOR_OI_M, "□");

    // ── Leyenda ──
    const leyendaY = PAD_T + 10;
    const leyendaX = PAD_L + CHART_W - 140;

    els.push(t("rect", {
      x: leyendaX - 8, y: leyendaY - 14,
      width: 148, height: 46,
      fill: "white",
      stroke: "rgba(15,23,42,0.2)",
      "stroke-width": 0.8,
      rx: 4
    }));

    [
      { sym: "○", color: COLOR_OD, label: "OD (Oído Derecho)", dy: 0 },
      { sym: "×", color: COLOR_OI, label: "OI (Oído Izquierdo)", dy: 20 }
    ].forEach(({ sym, color, label, dy }) => {
      els.push(t("text", {
        x: leyendaX + 4, y: leyendaY + dy,
        "dominant-baseline": "middle",
        fill: color,
        "font-size": 13,
        "font-weight": "bold",
        "font-family": "Arial,sans-serif"
      }, sym));
      els.push(t("text", {
        x: leyendaX + 20, y: leyendaY + dy,
        "dominant-baseline": "middle",
        fill: "#333",
        "font-size": 9,
        "font-family": "Arial,sans-serif"
      }, label));
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">${els.join("")}</svg>`;
  },

  _generarHTML: function (paciente) {
    const resultados = State.resultados || { OD: {}, OI: {} };
    const maskResultados = State.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State.logoResultados || { OD: [], OI: [] };

    const ptaOD = Classifications.calcularPTA(resultados.OD);
    const ptaOI = Classifications.calcularPTA(resultados.OI);
    const cOD = Classifications.clasificar(ptaOD);
    const cOI = Classifications.clasificar(ptaOI);
    const NA = "N/A";

    const svgAudiograma = this._generarSVGAudiograma(resultados, maskResultados);

    const filasTonal = FREQUENCIES.map(f => {
      const od = resultados.OD[f] !== undefined ? resultados.OD[f] + " dB" : NA;
      const oi = resultados.OI[f] !== undefined ? resultados.OI[f] + " dB" : NA;
      const odMask = maskResultados.OD[f] !== undefined ? ` (NE:${maskResultados.OD[f]}dB)` : "";
      const oiMask = maskResultados.OI[f] !== undefined ? ` (NE:${maskResultados.OI[f]}dB)` : "";
      return `
        <tr>
          <td>${f} Hz</td>
          <td class="od">${od}${odMask}</td>
          <td class="oi">${oi}${oiMask}</td>
        </tr>
      `;
    }).join("");

    return `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Audiograma</title>
<style>
* { box-sizing: border-box; }
body {
  font-family: Arial, sans-serif;
  color: #111;
  background: #fff;
  margin: 0;
  padding: 20px;
  width: 190mm;
}
h1 {
  text-align: center;
  font-size: 22px;
  margin-bottom: 16px;
  border-bottom: 2px solid #111;
  padding-bottom: 8px;
}
h2 {
  margin-top: 20px;
  font-size: 15px;
  border-left: 4px solid #151530;
  padding-left: 10px;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  page-break-inside: avoid;
}
th {
  background: #151530;
  color: white;
  padding: 8px;
  font-size: 12px;
}
td {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: center;
  font-size: 11px;
}
.od { color: #c04040; }
.oi { color: #2a60a0; }
.info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}
.info div {
  background: #f3f3f3;
  padding: 8px;
  border-radius: 6px;
  font-size: 11px;
}
.full { grid-column: 1/-1; }
p, table, h2, .info { break-inside: avoid; }
.audiograma-wrap {
  text-align: center;
  margin: 10px 0;
  page-break-inside: avoid;
}
.audiograma-wrap svg {
  max-width: 100%;
  height: auto;
}
.footer {
  margin-top: 24px;
  text-align: center;
  color: #666;
  font-size: 10px;
}
</style>
</head>
<body>

<h1>AUDIOGRAMA CLÍNICO</h1>

<div class="info">
  <div><strong>Paciente:</strong> ${this._esc(paciente.nombre) || NA}</div>
  <div><strong>Edad:</strong> ${this._esc(paciente.edad) || NA}</div>
  <div><strong>HC:</strong> ${this._esc(paciente.hc) || NA}</div>
  <div><strong>Fecha:</strong> ${this._esc(paciente.fecha) || new Date().toLocaleDateString("es-AR")}</div>
  <div class="full"><strong>Motivo:</strong> ${this._esc(paciente.motivo) || NA}</div>
  <div class="full"><strong>Observaciones:</strong> ${this._esc(paciente.obs) || NA}</div>
</div>

<h2>Audiograma Tonal</h2>
<div class="audiograma-wrap">
  ${svgAudiograma}
</div>

<h2>Valores por Frecuencia</h2>
<table>
  <tr>
    <th>Frecuencia</th>
    <th>OD</th>
    <th>OI</th>
  </tr>
  ${filasTonal}
</table>

<h2>Clasificación Diagnóstica</h2>
<p>
  ${ptaOD !== null
    ? `<strong>OD: ${ptaOD.toFixed(0)} dB → ${cOD?.label || NA}</strong>`
    : "OD: N/A"
  }
  <br><br>
  ${ptaOI !== null
    ? `<strong>OI: ${ptaOI.toFixed(0)} dB → ${cOI?.label || NA}</strong>`
    : "OI: N/A"
  }
</p>

<div class="footer">Generado con Audiómetro Clínico Pro</div>

</body>
</html>
`;
  },

  _esc: function (value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};
