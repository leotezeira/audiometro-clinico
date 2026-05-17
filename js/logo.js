/**
 * LOGO.JS
 * Logoaudiometría - discriminación verbal
 */

const Logo = {
  /**
   * Cambia de oído en logo
   */
  setOido(oido) {
    State.logoOido = oido;
    document.getElementById("logo-btn-od").classList.toggle("active", oido === "OD");
    document.getElementById("logo-btn-oi").classList.toggle("active", oido === "OI");
    this.reiniciarUI();
    this.renderTabla();
  },

  /**
   * Reproduce la palabra actual
   */
  hablarPalabra() {
    if (State.logoIdx >= PALABRAS.length) return;
    Audio.hablarPalabra(PALABRAS[State.logoIdx], State.logoOido);
  },

  /**
   * Registra respuesta del paciente
   */
  registrarRespuesta(correcta) {
    const palabra = PALABRAS[State.logoIdx];
    StateManager.addLogoRespuesta(State.logoOido, {
      palabra,
      dB: State.dB,
      correcta
    });

    State.logoIdx++;
    document.getElementById("logo-respuesta").value = "";

    if (State.logoIdx >= PALABRAS.length) {
      this.mostrarResultado();
    } else {
      document.getElementById("logo-counter").textContent = 
        `PALABRA ${State.logoIdx + 1} de ${PALABRAS.length}`;
    }

    this.renderTabla();
  },

  /**
   * Muestra resultado final de discriminación
   */
  mostrarResultado() {
    document.getElementById("logo-main").style.display = "none";
    document.getElementById("logo-done").style.display = "";

    const respuestas = State.logoResultados[State.logoOido];
    const pct = Classifications.calcularDiscriminacion(respuestas);
    document.getElementById("logo-pct-display").innerHTML = 
      `Discriminación: <strong>${pct}%</strong>`;
  },

  /**
   * Reinicia la prueba para el oído actual
   */
  reiniciar() {
    State.logoIdx = 0;
    State.logoResultados[State.logoOido] = [];
    this.reiniciarUI();
    this.renderTabla();
  },

  /**
   * Reinicia la UI (muestra/oculta elementos)
   */
  reiniciarUI() {
    State.logoIdx = State.logoResultados[State.logoOido].length;
    document.getElementById("logo-main").style.display = 
      State.logoIdx < PALABRAS.length ? "" : "none";
    document.getElementById("logo-done").style.display = 
      State.logoIdx >= PALABRAS.length ? "" : "none";
    document.getElementById("logo-counter").textContent = 
      `PALABRA ${Math.min(State.logoIdx + 1, PALABRAS.length)} de ${PALABRAS.length}`;
  },

  /**
   * Renderiza tabla de resultados
   */
  renderTabla() {
    let html = "";

    ["OD", "OI"].forEach(oido => {
      const respuestas = State.logoResultados[oido];
      if (!respuestas.length) return;

      const pct = Classifications.calcularDiscriminacion(respuestas);
      const color = oido === "OD" ? COLOR_OD : COLOR_OI;

      html += `<div style="margin-bottom:12px">
        <div style="font-size:12px;color:${color};letter-spacing:0.5px;margin-bottom:8px;font-weight:700">
          ${oido} — Discriminación: <strong>${pct}%</strong>
        </div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">`;

      respuestas.forEach(r => {
        const colorRespuesta = r.correcta ? "#10b981" : "#ef4444";
        html += `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #334155;color:#f1f5f9">${r.palabra}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #334155;color:#94a3b8">${r.dB} dB</td>
          <td style="padding:6px 8px;border-bottom:1px solid #334155;color:${colorRespuesta};font-weight:700">
            ${r.correcta ? "✓" : "✗"}
          </td>
        </tr>`;
      });

      html += "</table></div>";
    });

    if (!html) {
      html = '<span style="color:#64748b;font-size:13px">Sin resultados aún</span>';
    }

    document.getElementById("logo-tabla").innerHTML = html;
  }
};
