/**
 * TONAL.JS
 * Audiometría tonal puro - control de umbrales
 */

const Tonal = {
  /**
   * Cambia de oído (OD/OI)
   */
  setOido(oido) {
    State.oido = oido;

    // Actualiza botones
    document.getElementById("btn-od").classList.toggle("active", oido === "OD");
    document.getElementById("btn-oi").classList.toggle("active", oido === "OI");

    // Actualiza color del slider
    this.updateDbColor();

    // Renderiza audiograma
    Audiogram.render("audiogram");
    this.actualizarClasificacion();
  },

  /**
   * Establece la intensidad en dB
   */
  setDB(value) {
    State.dB = parseInt(value);
    document.getElementById("db-slider").value = State.dB;
    document.getElementById("db-display").textContent = State.dB;

    // Actualiza slider logo si existe
    if (document.getElementById("logo-db-slider")) {
      document.getElementById("logo-db-slider").value = State.dB;
      document.getElementById("logo-db-val").textContent = State.dB + " dB";
    }

    this.updateDbColor();
  },

  /**
   * Actualiza color del display de dB según oído
   */
  updateDbColor() {
    const color = State.oido === "OD" ? COLOR_OD : COLOR_OI;
    document.getElementById("db-display").style.color = color;
    document.getElementById("db-slider").style.accentColor = color;
  },

  /**
   * Establece dB de enmascaramiento
   */
  setMaskDB(value) {
    State.maskDB = parseInt(value);
    document.getElementById("mask-val").textContent = State.maskDB;
  },

  /**
   * Activa/desactiva enmascaramiento
   */
  toggleMask() {
    State.maskActive = document.getElementById("mask-check").checked;
    document.getElementById("mask-ctrl").style.display = State.maskActive ? "" : "none";
    document.getElementById("mask-db-display").style.display = State.maskActive ? "" : "none";
  },

  /**
   * Marca umbral en frecuencia actual
   */
  marcarUmbral() {
    const freq = FREQUENCIES[State.freqIdx];
    StateManager.setUmbral(State.oido, freq, State.dB, State.maskActive ? State.maskDB : null);

    const maskStr = State.maskActive ? ` NE:${State.maskDB}dB` : "";
    UI.showMsg(
      "msg-tonal",
      `✓ ${freq} Hz — ${State.dB} dB (${State.oido})${maskStr}`,
      "#10b981"
    );

    Audiogram.render("audiogram");
    this.actualizarClasificacion();
  },

  /**
   * Borra umbral en frecuencia actual
   */
  borrarUmbral() {
    const freq = FREQUENCIES[State.freqIdx];
    StateManager.borrarUmbral(State.oido, freq);

    UI.showMsg("msg-tonal", `✕ Borrado: ${freq} Hz (${State.oido})`, "#ef4444");

    Audiogram.render("audiogram");
    this.actualizarClasificacion();
  },

  /**
   * Actualiza clasificación mostrada
   */
  actualizarClasificacion() {
    const html = Classifications.renderClasificacion();
    document.getElementById("clasif-content").innerHTML = html;
  },

  /**
   * Construye botones de frecuencia
   */
  buildFreqBtns() {
    const container = document.getElementById("freq-btns");
    container.innerHTML = "";

    FREQUENCIES.forEach((freq, i) => {
      const btn = document.createElement("button");
      btn.className = "freq-btn" + (i === State.freqIdx ? " active" : "");
      btn.textContent = (freq >= 1000 ? `${freq / 1000}k` : freq) + " Hz";
      btn.onclick = () => {
        State.freqIdx = i;
        this.buildFreqBtns();
      };
      container.appendChild(btn);
    });
  }
};
