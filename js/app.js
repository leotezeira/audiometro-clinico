/**
 * APP.JS
 * InicializaciÃ³n y wiring general
 */

function initApp() {
  // Fecha por defecto: hoy
  const fechaInput = document.getElementById("pac-fecha");
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().split("T")[0];
  }

  // Tonal
  if (document.getElementById("freq-btns")) {
    Tonal.buildFreqBtns();
  }
  if (document.getElementById("db-slider")) {
    Tonal.setDB(State.dB);
    Tonal.updateDbColor();
  }

  if (document.getElementById("audiogram")) {
    Audiogram.render("audiogram");
  }
  if (document.getElementById("clasif-content")) {
    Tonal.actualizarClasificacion();
  }

  // Logo
  if (document.getElementById("logo-tabla")) {
    Logo.reiniciarUI();
    Logo.renderTabla();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

