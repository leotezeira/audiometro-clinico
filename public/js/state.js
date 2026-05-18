/**
 * STATE.JS
 * Gestión del estado global de la aplicación
 */

const State = {
  // Paciente
  paciente: {
    nombre: "",
    edad: "",
    hc: "",
    fecha: "",
    motivo: "",
    obs: ""
  },

  // Datos de audiometría tonal
  resultados: {
    OD: {},
    OI: {}
  },

  // Datos de enmascaramiento
  maskResultados: {
    OD: {},
    OI: {}
  },

  // Datos de logoaudiometría
  logoResultados: {
    OD: [],
    OI: []
  },

  // Control de interfaz
  oido: "OD",
  freqIdx: 2, // 1000 Hz por defecto
  dB: 40,
  maskDB: 30,
  maskActive: false,

  // Control de logo
  logoOido: "OD",
  logoIdx: 0,
  logoHablando: false,

  // Audio context
  audioCtx: null,
  tonando: false
};

// Getters y setters para estado
const StateManager = {
  // Paciente
  setPaciente(data) {
    State.paciente = { ...State.paciente, ...data };
  },

  getPaciente() {
    return State.paciente;
  },

  limpiarPaciente() {
    State.paciente = {
      nombre: "",
      edad: "",
      hc: "",
      fecha: "",
      motivo: "",
      obs: ""
    };
  },

  // Resultados tonal
  setUmbral(oido, freq, db, maskDB = null) {
    State.resultados[oido][freq] = db;
    if (maskDB !== null) {
      State.maskResultados[oido][freq] = maskDB;
    }
  },

  borrarUmbral(oido, freq) {
    delete State.resultados[oido][freq];
    delete State.maskResultados[oido][freq];
  },

  getResultados() {
    return State.resultados;
  },

  getMaskResultados() {
    return State.maskResultados;
  },

  limpiarResultados() {
    State.resultados = { OD: {}, OI: {} };
    State.maskResultados = { OD: {}, OI: {} };
  },

  // Logoaudiometría
  addLogoRespuesta(oido, respuesta) {
    State.logoResultados[oido].push(respuesta);
  },

  getLogoResultados() {
    return State.logoResultados;
  },

  limpiarLogoResultados() {
    State.logoResultados = { OD: [], OI: [] };
    State.logoIdx = 0;
  },

  // Sesión completa
  limpiarTodo() {
    State.paciente = {
      nombre: "",
      edad: "",
      hc: "",
      fecha: "",
      motivo: "",
      obs: ""
    };
    State.resultados = { OD: {}, OI: {} };
    State.maskResultados = { OD: {}, OI: {} };
    State.logoResultados = { OD: [], OI: [] };
    State.oido = "OD";
    State.freqIdx = 2;
    State.dB = 40;
    State.maskDB = 30;
    State.maskActive = false;
    State.logoOido = "OD";
    State.logoIdx = 0;
    State.logoHablando = false;
  },

  // Export para serialización
  exportarSesion() {
    return {
      id: Date.now(),
      fecha: State.paciente.fecha || new Date().toLocaleDateString("es-AR"),
      paciente: JSON.parse(JSON.stringify(State.paciente)),
      resultados: JSON.parse(JSON.stringify(State.resultados)),
      maskResultados: JSON.parse(JSON.stringify(State.maskResultados)),
      logoResultados: JSON.parse(JSON.stringify(State.logoResultados))
    };
  },

  // Import desde serialización
  importarSesion(sesion) {
    const safeResultados = sesion.resultados || { OD: {}, OI: {} };
    const safeMaskResultados = sesion.maskResultados || { OD: {}, OI: {} };
    const safeLogoResultados = sesion.logoResultados || { OD: [], OI: [] };

    State.paciente = { ...State.paciente, ...(sesion.paciente || {}) };
    State.resultados = JSON.parse(JSON.stringify({ OD: {}, OI: {}, ...safeResultados }));
    State.maskResultados = JSON.parse(JSON.stringify({ OD: {}, OI: {}, ...safeMaskResultados }));
    State.logoResultados = JSON.parse(
      JSON.stringify({
        OD: Array.isArray(safeLogoResultados.OD) ? safeLogoResultados.OD : [],
        OI: Array.isArray(safeLogoResultados.OI) ? safeLogoResultados.OI : []
      })
    );

    State.oido = "OD";
    State.freqIdx = 2;
    State.dB = 40;
    State.maskDB = 30;
    State.maskActive = false;
    State.logoOido = "OD";
    State.logoIdx = State.logoResultados[State.logoOido].length;
    State.logoHablando = false;
  }
};
