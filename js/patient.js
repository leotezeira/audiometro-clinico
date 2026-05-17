/**
 * PATIENT.JS
 * Gestión de datos del paciente y sesión
 */

const Patient = {
  /**
   * Inicia una nueva sesión
   */
  iniciarSesion() {
    const nombre = document.getElementById("pac-nombre").value.trim();

    if (!nombre) {
      UI.showMsg("msg-paciente", "⚠ Ingresá el nombre del paciente", "#f59e0b");
      return;
    }

    StateManager.setPaciente({
      nombre: nombre,
      edad: document.getElementById("pac-edad").value,
      hc: document.getElementById("pac-hc").value.trim(),
      fecha: document.getElementById("pac-fecha").value,
      motivo: document.getElementById("pac-motivo").value.trim(),
      obs: document.getElementById("pac-obs").value.trim()
    });

    UI.showMsg("msg-paciente", `✓ Sesión iniciada: ${nombre}`, "#10b981");

    setTimeout(() => {
      UI.goPage("pg-tonal");
    }, 800);
  },

  /**
   * Limpia y comienza nueva sesión
   */
  limpiarSesion() {
    if (!confirm("¿Borrar sesión actual y comenzar una nueva?")) return;

    StateManager.limpiarTodo();

    // Limpia inputs
    document.getElementById("pac-nombre").value = "";
    document.getElementById("pac-edad").value = "";
    document.getElementById("pac-hc").value = "";
    document.getElementById("pac-fecha").value = "";
    document.getElementById("pac-motivo").value = "";
    document.getElementById("pac-obs").value = "";

    // Reinicia audiograma y logo
    Audiogram.render("audiogram");
    Logo.renderTabla();

    UI.showMsg("msg-paciente", "✓ Nueva sesión lista", "#10b981");
  },

  /**
   * Obtiene datos formateados del paciente
   */
  obtenerDatosFormateados() {
    const p = State.paciente;
    let html = `<strong>${p.nombre || "Sin nombre"}</strong>`;

    if (p.edad) html += ` · ${p.edad} años`;
    if (p.hc) html += ` · HC: ${p.hc}`;
    if (p.fecha) html += ` · ${p.fecha}`;
    if (p.motivo) {
      html += `<br><span style="color:#94a3b8;font-size:12px">${p.motivo}</span>`;
    }

    return html;
  }
};
