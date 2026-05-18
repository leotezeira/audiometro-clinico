/**
 * CLASSIFICATIONS.JS
 * Lógica de clasificación y estadísticas audiométricas
 */

const Classifications = {
  /**
   * Calcula el promedio de frecuencias específicas
   */
  calcularPTA(datos, frecuencias = PTA_FREQUENCIES) {
    const valores = frecuencias
      .map(f => datos[f])
      .filter(v => v !== undefined);

    if (!valores.length) return null;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  },

  /**
   * Clasifica el nivel de audición según dB
   */
  clasificar(db) {
    if (db === null) return null;

    for (const [key, config] of Object.entries(CLASSIFICATION_THRESHOLDS)) {
      if (db <= config.max) {
        return { label: config.label, cls: key };
      }
    }
    return null;
  },

  /**
   * Obtiene clasificación para ambos oídos
   */
  obtenerClasificaciones() {
    const ptaOD = this.calcularPTA(State.resultados.OD);
    const ptaOI = this.calcularPTA(State.resultados.OI);

    return {
      ptaOD,
      ptaOI,
      cOD: this.clasificar(ptaOD),
      cOI: this.clasificar(ptaOI)
    };
  },

  /**
   * Obtiene HTML con clasificación formateada
   */
  renderClasificacion(clasificaciones = null) {
    if (!clasificaciones) {
      clasificaciones = this.obtenerClasificaciones();
    }

    const { ptaOD, ptaOI, cOD, cOI } = clasificaciones;
    let html = '<div style="display:flex;gap:14px;flex-wrap:wrap">';

    if (cOD) {
      html += `<div><div style="font-size:10px;color:#818cf8;margin-bottom:4px">OD — PTA: ${ptaOD.toFixed(0)} dB</div>
               <span class="clasif-badge clasif-${cOD.cls}">${cOD.label}</span></div>`;
    }

    if (cOI) {
      html += `<div><div style="font-size:10px;color:#818cf8;margin-bottom:4px">OI — PTA: ${ptaOI.toFixed(0)} dB</div>
               <span class="clasif-badge clasif-${cOI.cls}">${cOI.label}</span></div>`;
    }

    if (!cOD && !cOI) {
      html += '<span style="color:#64748b;font-size:12px">Sin datos suficientes</span>';
    }

    html += '</div>';
    return html;
  },

  /**
   * Calcula porcentaje de discriminación (logo)
   */
  calcularDiscriminacion(respuestas) {
    if (!respuestas || !respuestas.length) return null;
    const correctas = respuestas.filter(r => r.correcta).length;
    return Math.round((correctas / respuestas.length) * 100);
  }
};
