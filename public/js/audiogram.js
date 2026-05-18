/**
 * AUDIOGRAM.JS
 * Renderizado del audiograma en SVG
 */

const Audiogram = {
  /**
   * Crea elemento SVG
   */
  svgEl(tag, attrs, text) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    if (text !== undefined) el.textContent = text;
    return el;
  },

  /**
   * Calcula posición X en el SVG
   */
  xPos(i) {
    return PAD_L + (i / (FREQUENCIES.length - 1)) * CHART_W;
  },

  /**
   * Calcula posición Y en el SVG
   */
  yPos(db) {
    return PAD_T + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * CHART_H;
  },

  /**
   * Renderiza el audiograma completo
   */
  render(svgId, resultados = null, maskResultados = null) {
    if (!resultados) resultados = State.resultados;
    if (!maskResultados) maskResultados = State.maskResultados;

    const svg = document.getElementById(svgId);
    svg.innerHTML = "";

    // Zona normal (hasta 25 dB)
    svg.appendChild(this.svgEl("rect", {
      x: PAD_L,
      y: this.yPos(-10),
      width: CHART_W,
      height: this.yPos(25) - this.yPos(-10),
      fill: "rgba(124,163,200,0.05)"
    }));

    // Grid horizontal (dB)
    [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].forEach(db => {
      svg.appendChild(this.svgEl("line", {
        x1: PAD_L,
        y1: this.yPos(db),
        x2: SVG_W - PAD_R,
        y2: this.yPos(db),
        stroke: "rgba(15,23,42,0.12)",
        "stroke-width": db === 0 ? 1 : 0.5
      }));

      svg.appendChild(this.svgEl("text", {
        x: PAD_L - 5,
        y: this.yPos(db),
        "text-anchor": "end",
        "dominant-baseline": "middle",
        fill: "rgba(15,23,42,0.55)",
        "font-size": 8
      }, String(db)));
    });

    // Grid vertical (Hz)
    FREQUENCIES.forEach((f, i) => {
      svg.appendChild(this.svgEl("line", {
        x1: this.xPos(i),
        y1: PAD_T,
        x2: this.xPos(i),
        y2: SVG_H - PAD_B,
        stroke: "rgba(15,23,42,0.12)",
        "stroke-width": 0.5
      }));

      svg.appendChild(this.svgEl("text", {
        x: this.xPos(i),
        y: SVG_H - PAD_B + 12,
        "text-anchor": "middle",
        fill: "rgba(15,23,42,0.55)",
        "font-size": 8
      }, f >= 1000 ? `${f / 1000}k` : String(f)));
    });

    // Etiquetas de ejes
    svg.appendChild(this.svgEl("text", {
      x: PAD_L - 36,
      y: PAD_T + CHART_H / 2,
      "text-anchor": "middle",
      fill: "rgba(15,23,42,0.55)",
      "font-size": 8,
      transform: `rotate(-90,${PAD_L - 36},${PAD_T + CHART_H / 2})`
    }, "dB HL"));

    svg.appendChild(this.svgEl("text", {
      x: PAD_L + CHART_W / 2,
      y: SVG_H - 1,
      "text-anchor": "middle",
      fill: "rgba(15,23,42,0.55)",
      "font-size": 8
    }, "Hz"));

    // Traza curvas para ambos oídos
    this.trazarCurva(svg, resultados, maskResultados, "OD", COLOR_OD, "○", COLOR_OD_M, "▽");
    this.trazarCurva(svg, resultados, maskResultados, "OI", COLOR_OI, "×", COLOR_OI_M, "□");
  },

  /**
   * Traza una curva de un oído específico
   */
  trazarCurva(svg, resultados, maskResultados, ear, color, symbol, colorMask, symbolMask) {
    const puntos = FREQUENCIES.map((f, i) => {
      const db = resultados[ear][f];
      return db !== undefined ? { x: this.xPos(i), y: this.yPos(db) } : null;
    }).filter(Boolean);

    // Línea conectando puntos
    if (puntos.length >= 2) {
      const d = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      svg.appendChild(this.svgEl("path", {
        d,
        fill: "none",
        stroke: color,
        "stroke-width": 2,
        "stroke-opacity": 0.7
      }));
    }

    // Puntos principales
    puntos.forEach(p => {
      svg.appendChild(this.svgEl("text", {
        x: p.x,
        y: p.y,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        fill: color,
        "font-size": 13,
        "font-weight": "bold"
      }, symbol));
    });

    // Símbolos de máscara
    FREQUENCIES.forEach((f, i) => {
      if (maskResultados[ear][f] !== undefined) {
        svg.appendChild(this.svgEl("text", {
          x: this.xPos(i),
          y: this.yPos(resultados[ear][f] || 0),
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: colorMask,
          "font-size": 11
        }, symbolMask));
      }
    });
  }
};
