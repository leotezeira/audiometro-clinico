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
    Audiogram.render("audiogram2", State.resultados, State.maskResultados);
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
