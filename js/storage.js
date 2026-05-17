/**
 * STORAGE.JS
 * Gestión de localStorage e historial de sesiones
 */

const Storage = {
  STORAGE_KEY: "audiometro_historial",

  /**
   * Guarda sesión actual en historial
   */
  guardarSesion() {
    if (!State.paciente.nombre) {
      UI.showMsg("msg-resultado", "⚠ Completá los datos del paciente primero", "#f59e0b");
      return;
    }

    const sesion = StateManager.exportarSesion();
    const historial = this.obtenerHistorial();
    historial.push(sesion);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(historial));
    UI.showMsg("msg-resultado", "✓ Sesión guardada en historial", "#10b981");
  },

  /**
   * Obtiene historial desde localStorage
   */
  obtenerHistorial() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  },

  /**
   * Carga una sesión del historial
   */
  cargarSesion(sesionId) {
    const historial = this.obtenerHistorial();
    const sesion = historial.find(s => s.id === sesionId);

    if (!sesion) return false;

    StateManager.importarSesion(sesion);

    // Actualiza inputs del formulario
    document.getElementById("pac-nombre").value = State.paciente.nombre;
    document.getElementById("pac-edad").value = State.paciente.edad;
    document.getElementById("pac-hc").value = State.paciente.hc;
    document.getElementById("pac-fecha").value = State.paciente.fecha;
    document.getElementById("pac-motivo").value = State.paciente.motivo;
    document.getElementById("pac-obs").value = State.paciente.obs;

    // Renderiza datos
    Logo.renderTabla();
    UI.goPage("pg-resultado");

    return true;
  },

  /**
   * Renderiza lista de historial
   */
  renderHistorial() {
    const historial = this.obtenerHistorial();
    const container = document.getElementById("historial-lista");

    if (!historial.length) {
      container.innerHTML = '<div class="no-sessions">Sin sesiones guardadas</div>';
      return;
    }

    container.innerHTML = historial
      .slice()
      .reverse()
      .map(sesion => this.renderSessionCard(sesion))
      .join("");
  },

  /**
   * Renderiza tarjeta de sesión
   */
  renderSessionCard(sesion) {
    const clasificaciones = Classifications.obtenerClasificaciones();
    const ptaOD = Classifications.calcularPTA(sesion.resultados.OD);
    const ptaOI = Classifications.calcularPTA(sesion.resultados.OI);
    const cOD = Classifications.clasificar(ptaOD);
    const cOI = Classifications.clasificar(ptaOI);

    let badges = "";
    if (cOD) badges += `<span class="sc-badge clasif-badge clasif-${cOD.cls}">OD: ${cOD.label}</span>`;
    if (cOI) badges += `<span class="sc-badge clasif-badge clasif-${cOI.cls}">OI: ${cOI.label}</span>`;

    return `
      <div class="session-card" onclick="Storage.cargarSesion(${sesion.id})">
        <div class="sc-header">
          <span class="sc-name">${sesion.paciente.nombre}</span>
          <span class="sc-date">${sesion.fecha}</span>
        </div>
        ${sesion.paciente.hc ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:8px;font-weight:500">HC: ${sesion.paciente.hc}</div>` : ""}
        <div class="sc-badges">${badges || '<span style="color:#64748b;font-size:11px">Sin clasificación</span>'}</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;text-align:right;font-weight:500">Toca para cargar →</div>
      </div>
    `;
  },

  /**
   * Borra todo el historial
   */
  borrarTodo() {
    if (!confirm("¿Borrar todo el historial? Esta acción no se puede deshacer.")) return;
    localStorage.removeItem(this.STORAGE_KEY);
    this.renderHistorial();
  }
};
