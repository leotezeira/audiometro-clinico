/**
 * PDF.JS — v3 PWA-compatible
 * Genera PDF directamente en el cliente usando jsPDF
 * Sin window.open(), sin window.print()
 * Funciona en Android TWA, iOS PWA, Desktop
 */

const PDF = {

  async descargar() {
    try {
      if (!State?.paciente?.nombre) {
        alert("⚠️ Completá los datos del paciente primero");
        return;
      }

      UI?.showMsg?.("msg-resultado", "⏳ Generando PDF...", "#f59e0b");

      // Carga jsPDF dinámicamente (CDN, se cachea en SW)
      await this._cargarJsPDF();

      const doc = this._construirDocumento();

      const nombre = (State.paciente.nombre || "paciente")
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, "")
        .trim()
        .replace(/\s+/g, "_");

      const fecha = State.paciente.fecha || new Date().toISOString().split("T")[0];
      const filename = `audiograma_${nombre}_${fecha}.pdf`;

      // Descarga directa — funciona en PWA Android, iOS, Desktop
      doc.save(filename);

      UI?.showMsg?.("msg-resultado", "✓ PDF generado y descargado", "#10b981");

    } catch (err) {
      console.error("Error PDF:", err);
      UI?.showMsg?.("msg-resultado", "❌ Error al generar PDF", "#ef4444");
      alert("Error al generar PDF:\n" + err.message);
    }
  },

  _cargarJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jspdf || window.jsPDF) return resolve();

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar jsPDF. Verificá la conexión."));
      document.head.appendChild(script);
    });
  },

  _construirDocumento() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const P = State.paciente || {};
    const resultados = State.resultados || { OD: {}, OI: {} };
    const maskResultados = State.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State.logoResultados || { OD: [], OI: [] };

    const ptaOD = Classifications.calcularPTA(resultados.OD);
    const ptaOI = Classifications.calcularPTA(resultados.OI);
    const cOD = Classifications.clasificar(ptaOD);
    const cOI = Classifications.clasificar(ptaOI);

    const W = 210; // A4 width mm
    const ml = 15; // margin left
    const mr = 15; // margin right
    const cw = W - ml - mr; // content width
    let y = 15;

    const NA = "N/A";

    // ── Helpers ──────────────────────────────────────────
    const nextLine = (h = 6) => { y += h; };

    const checkPage = (needed = 20) => {
      if (y + needed > 280) {
        doc.addPage();
        y = 15;
      }
    };

    const hLine = (color = [220, 220, 230]) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.3);
      doc.line(ml, y, W - mr, y);
      nextLine(4);
    };

    // ── Header ────────────────────────────────────────────
    // Fondo header
    doc.setFillColor(26, 32, 60);
    doc.rect(0, 0, W, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("AUDIOGRAMA CLÍNICO", W / 2, 12, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 190, 210);
    doc.text("INFORME DE EVALUACIÓN AUDITIVA", W / 2, 19, { align: "center" });
    doc.text(`Generado: ${new Date().toLocaleDateString("es-AR")}`, W / 2, 24, { align: "center" });

    y = 35;

    // ── Datos del Paciente ────────────────────────────────
    doc.setFillColor(245, 247, 252);
    doc.setDrawColor(220, 225, 237);
    doc.setLineWidth(0.3);
    doc.roundedRect(ml, y, cw, 36, 2, 2, "FD");

    doc.setTextColor(26, 32, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PACIENTE", ml + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 60, 80);

    const col1x = ml + 4;
    const col2x = ml + cw / 2 + 2;
    let yd = y + 13;

    const campo = (label, valor, x, yy) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 100, 140);
      doc.text(label + ":", x, yy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 40, 60);
      const v = valor || NA;
      doc.text(v.length > 28 ? v.substring(0, 26) + "…" : v, x + doc.getTextWidth(label + ": "), yy);
    };

    campo("Paciente", P.nombre, col1x, yd);
    campo("Edad", P.edad ? P.edad + " años" : null, col2x, yd);
    yd += 7;
    campo("H.C.", P.hc, col1x, yd);
    campo("Fecha", P.fecha, col2x, yd);
    yd += 7;
    campo("Motivo", P.motivo, col1x, yd);

    y += 42;

    // ── Audiograma SVG ─────────────────────────────────────
    checkPage(70);
    doc.setFillColor(26, 32, 60);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.rect(ml, y, cw, 7, "F");
    doc.text("AUDIOGRAMA", ml + 4, y + 5);
    y += 10;

    this._dibujarAudiograma(doc, resultados, ml, y, cw, 60);
    y += 68;

    // ── Tabla Tonal ───────────────────────────────────────
    checkPage(50);
    doc.setFillColor(26, 32, 60);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.rect(ml, y, cw, 7, "F");
    doc.text("AUDIOMETRÍA TONAL — UMBRALES", ml + 4, y + 5);
    y += 10;

    // Encabezado tabla
    const colFreq = 35, colOD = 60, colOI = 60;
    const fx = ml, odx = ml + colFreq, oix = ml + colFreq + colOD;

    doc.setFillColor(240, 243, 250);
    doc.setDrawColor(200, 210, 225);
    doc.rect(fx, y, colFreq, 7, "FD");
    doc.rect(odx, y, colOD, 7, "FD");
    doc.rect(oix, y, colOI, 7, "FD");

    doc.setTextColor(26, 32, 60);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Frecuencia", fx + colFreq / 2, y + 5, { align: "center" });
    doc.setTextColor(37, 99, 235);
    doc.text("OD — Oído Derecho", odx + colOD / 2, y + 5, { align: "center" });
    doc.setTextColor(20, 184, 166);
    doc.text("OI — Oído Izquierdo", oix + colOI / 2, y + 5, { align: "center" });
    y += 7;

    // Filas
    const FREQS = [250, 500, 1000, 2000, 4000, 8000];
    FREQS.forEach((f, idx) => {
      checkPage(8);
      const bg = idx % 2 === 0 ? [255, 255, 255] : [247, 249, 253];
      doc.setFillColor(...bg);
      doc.setDrawColor(210, 218, 230);
      doc.rect(fx, y, colFreq, 7, "FD");
      doc.rect(odx, y, colOD, 7, "FD");
      doc.rect(oix, y, colOI, 7, "FD");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 70, 90);
      doc.setFontSize(8);
      doc.text((f >= 1000 ? f / 1000 + " kHz" : f + " Hz"), fx + colFreq / 2, y + 5, { align: "center" });

      const odVal = resultados.OD?.[f] !== undefined ? resultados.OD[f] + " dB" : NA;
      const oiVal = resultados.OI?.[f] !== undefined ? resultados.OI[f] + " dB" : NA;
      const odM = maskResultados.OD?.[f] !== undefined ? ` (NE:${maskResultados.OD[f]})` : "";
      const oiM = maskResultados.OI?.[f] !== undefined ? ` (NE:${maskResultados.OI[f]})` : "";

      doc.setFont("helvetica", "normal");
      doc.setTextColor(37, 99, 235);
      doc.text(odVal + odM, odx + colOD / 2, y + 5, { align: "center" });
      doc.setTextColor(20, 184, 166);
      doc.text(oiVal + oiM, oix + colOI / 2, y + 5, { align: "center" });
      y += 7;
    });

    nextLine(4);

    // ── Clasificación Diagnóstica ──────────────────────────
    checkPage(40);
    doc.setFillColor(26, 32, 60);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.rect(ml, y, cw, 7, "F");
    doc.text("CLASIFICACIÓN DIAGNÓSTICA (PTA)", ml + 4, y + 5);
    y += 10;

    const clasificaciones = [
      { label: "OD — Oído Derecho", pta: ptaOD, c: cOD, color: [37, 99, 235] },
      { label: "OI — Oído Izquierdo", pta: ptaOI, c: cOI, color: [20, 184, 166] }
    ];

    clasificaciones.forEach(({ label, pta, c, color }) => {
      checkPage(14);
      doc.setFillColor(248, 250, 254);
      doc.setDrawColor(200, 210, 225);
      doc.roundedRect(ml, y, cw, 12, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...color);
      doc.text(label, ml + 4, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 90, 110);
      doc.text(pta !== null ? `PTA: ${pta.toFixed(1)} dB` : "Sin datos", ml + 4, y + 10);

      if (c) {
        const badge = c.label;
        const badgeColors = {
          normal: [16, 185, 129],
          leve: [212, 175, 55],
          moderada: [245, 158, 11],
          severa: [234, 88, 12],
          profunda: [239, 68, 68]
        };
        const bc = badgeColors[c.cls] || [100, 100, 100];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...bc);
        doc.text("▶ " + badge, ml + 70, y + 7.5);
      }
      y += 15;
    });

    nextLine(2);

    // ── Logoaudiometría ────────────────────────────────────
    const tieneLogoOD = logoResultados.OD?.length > 0;
    const tieneLogoOI = logoResultados.OI?.length > 0;

    if (tieneLogoOD || tieneLogoOI) {
      checkPage(20);
      doc.setFillColor(26, 32, 60);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.rect(ml, y, cw, 7, "F");
      doc.text("LOGOAUDIOMETRÍA — DISCRIMINACIÓN VERBAL", ml + 4, y + 5);
      y += 10;

      ["OD", "OI"].forEach(oido => {
        const resp = logoResultados[oido] || [];
        if (!resp.length) return;

        checkPage(30);
        const pct = Classifications.calcularDiscriminacion(resp);
        const colorOido = oido === "OD" ? [37, 99, 235] : [20, 184, 166];

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...colorOido);
        doc.text(`${oido} — Discriminación: ${pct}%`, ml, y + 4);
        y += 8;

        // Encabezado mini-tabla
        const cPal = 55, cNiv = 30, cRes = 25;
        doc.setFillColor(240, 243, 250);
        doc.setDrawColor(200, 210, 225);
        doc.setTextColor(26, 32, 60);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        ["Palabra", "Nivel", "Resultado"].forEach((h, i) => {
          const cx = ml + [0, cPal, cPal + cNiv][i];
          const cw2 = [cPal, cNiv, cRes][i];
          doc.rect(cx, y, cw2, 6, "FD");
          doc.text(h, cx + cw2 / 2, y + 4.2, { align: "center" });
        });
        y += 6;

        resp.forEach((r, idx) => {
          checkPage(7);
          const bg = idx % 2 === 0 ? [255, 255, 255] : [247, 249, 253];
          doc.setFillColor(...bg);
          doc.setDrawColor(210, 218, 230);
          [cPal, cNiv, cRes].forEach((cw2, i) => {
            doc.rect(ml + [0, cPal, cPal + cNiv][i], y, cw2, 6, "FD");
          });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(50, 60, 80);
          doc.text(r.palabra || "", ml + cPal / 2, y + 4.2, { align: "center" });
          doc.text(r.dB + " dB", ml + cPal + cNiv / 2, y + 4.2, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.setTextColor(r.correcta ? 22 : 220, r.correcta ? 163 : 38, r.correcta ? 74 : 38);
          doc.text(r.correcta ? "✓" : "✗", ml + cPal + cNiv + cRes / 2, y + 4.2, { align: "center" });
          y += 6;
        });

        nextLine(6);
      });
    }

    // ── Footer ─────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(245, 247, 252);
      doc.rect(0, 287, W, 10, "F");
      doc.setTextColor(140, 150, 170);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Audiómetro Clínico Pro · Solo referencia clínica · Usar auriculares calibrados", W / 2, 292, { align: "center" });
      doc.text(`Página ${i} de ${totalPages}`, W - mr, 292, { align: "right" });
    }

    return doc;
  },

  /**
   * Dibuja el audiograma directamente en el PDF con jsPDF
   */
  _dibujarAudiograma(doc, resultados, originX, originY, width, height) {
    const FREQS = [250, 500, 1000, 2000, 4000, 8000];
    const DB_MIN = -10, DB_MAX = 120;
    const padL = 12, padR = 4, padT = 4, padB = 10;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const xp = i => originX + padL + (i / (FREQS.length - 1)) * chartW;
    const yp = db => originY + padT + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * chartH;

    // Fondo
    doc.setFillColor(252, 253, 255);
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.3);
    doc.rect(originX + padL, originY + padT, chartW, chartH, "FD");

    // Zona normal (0-25 dB)
    doc.setFillColor(220, 240, 255, 0.3);
    doc.rect(originX + padL, yp(-10), chartW, yp(25) - yp(-10), "F");

    // Grid horizontal
    [-10, 0, 20, 40, 60, 80, 100, 120].forEach(db => {
      doc.setDrawColor(db === 0 ? 150 : 210, db === 0 ? 160 : 218, db === 0 ? 180 : 230);
      doc.setLineWidth(db === 0 ? 0.4 : 0.2);
      doc.line(originX + padL, yp(db), originX + padL + chartW, yp(db));
      doc.setTextColor(120, 130, 150);
      doc.setFontSize(5.5);
      doc.text(String(db), originX + padL - 2, yp(db) + 1.5, { align: "right" });
    });

    // Grid vertical + etiquetas Hz
    FREQS.forEach((f, i) => {
      doc.setDrawColor(210, 218, 230);
      doc.setLineWidth(0.2);
      doc.line(xp(i), originY + padT, xp(i), originY + padT + chartH);
      doc.setTextColor(80, 90, 110);
      doc.setFontSize(5.5);
      doc.text(f >= 1000 ? f / 1000 + "k" : String(f), xp(i), originY + padT + chartH + 5, { align: "center" });
    });

    // Etiquetas ejes
    doc.setTextColor(100, 110, 130);
    doc.setFontSize(5);
    doc.text("Hz", originX + padL + chartW / 2, originY + padT + chartH + 9, { align: "center" });
    doc.text("dB", originX + padL - 8, originY + padT + chartH / 2, { align: "center" });

    // Curvas
    const earConfig = [
      { ear: "OD", color: [37, 99, 235], sym: "O" },
      { ear: "OI", color: [20, 184, 166], sym: "X" }
    ];

    earConfig.forEach(({ ear, color, sym }) => {
      const puntos = FREQS.map((f, i) => {
        const db = resultados[ear]?.[f];
        return db !== undefined ? { x: xp(i), y: yp(db) } : null;
      }).filter(Boolean);

      if (puntos.length >= 2) {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.6);
        for (let i = 0; i < puntos.length - 1; i++) {
          doc.line(puntos[i].x, puntos[i].y, puntos[i + 1].x, puntos[i + 1].y);
        }
      }

      puntos.forEach(p => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...color);
        doc.setLineWidth(0.5);
        doc.circle(p.x, p.y, 1.5, "FD");
        doc.setTextColor(...color);
        doc.setFontSize(4.5);
        doc.setFont("helvetica", "bold");
        doc.text(sym, p.x, p.y + 1.5, { align: "center" });
      });
    });

    // Leyenda
    const lx = originX + padL + chartW - 28;
    const ly = originY + padT + 3;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 210, 225);
    doc.roundedRect(lx - 1, ly - 1, 30, 10, 1, 1, "FD");
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text("O OD (Derecho)", lx + 1, ly + 3.5);
    doc.setTextColor(20, 184, 166);
    doc.text("X OI (Izquierdo)", lx + 1, ly + 8);
  }
};

window.PDF = PDF;