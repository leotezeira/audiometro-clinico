/**
 * CONSTANTS.JS
 * Configuración global y constantes de la aplicación
 */

const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];
const PALABRAS = ["casa", "perro", "mar", "sol", "pan", "luz", "flor", "tren", "pez", "campo", "voz", "cielo", "agua", "verde", "noche"];

// Colores para OD/OI y máscaras
const COLOR_OD = "#2563eb";
const COLOR_OI = "#14b8a6";
const COLOR_OD_M = "#f59e0b";
const COLOR_OI_M = "#06b6d4";

// Configuración de audiograma SVG
const SVG_W = 500;
const SVG_H = 270;
const PAD_L = 52;
const PAD_T = 28;
const PAD_R = 18;
const PAD_B = 38;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;
const DB_MIN = -10;
const DB_MAX = 120;

// Configuración de clasificación
const CLASSIFICATION_THRESHOLDS = {
  normal: { max: 20, label: "Normal" },
  leve: { max: 40, label: "Hipoacusia Leve" },
  moderada: { max: 60, label: "Hipoacusia Moderada" },
  severa: { max: 80, label: "Hipoacusia Severa" },
  profunda: { max: Infinity, label: "Hipoacusia Profunda" }
};

// Frecuencias para PTA (Pure Tone Average)
const PTA_FREQUENCIES = [500, 1000, 2000, 4000];
