/**
 * PDF-V2.JS
 * Exportación estable para PWA/Android
 * Sin librerías externas
 * Generación mediante HTML + window.print()
 */

const PDF = {

  descargar() {

    try {

      const paciente = State?.paciente || {};

      if (!paciente.nombre) {
        alert("⚠️ Completa los datos del paciente primero");
        return;
      }

      const htmlContent = this._generarHTML();

      console.log("Generando informe PDF...");

      // Abrir nueva ventana
      const ventana = window.open("", "_blank");

      if (!ventana) {

        alert(
          "⚠️ El navegador bloqueó la ventana.\n\n" +
          "Permite ventanas emergentes para continuar."
        );

        return;
      }

      // Escribir contenido
      ventana.document.open();
      ventana.document.write(htmlContent);
      ventana.document.close();

      // Esperar renderizado
      ventana.onload = () => {

        setTimeout(() => {

          try {

            ventana.focus();

            // Abrir diálogo de impresión/PDF
            ventana.print();

            UI?.showMsg?.(
              'msg-resultado',
              '✓ Informe listo para guardar como PDF',
              '#10b981'
            );

          } catch (err) {

            console.error("Error print:", err);

            alert(
              "❌ Error al abrir impresión.\n\n" +
              "Prueba abrir el informe manualmente."
            );

          }

        }, 700);

      };

    } catch (error) {

      console.error("Error PDF:", error);

      alert(
        "❌ Error al generar informe:\n\n" +
        error.message
      );

    }

  },

  _generarHTML() {

    const paciente = State?.paciente || {};
    const resultados = State?.resultados || { OD: {}, OI: {} };
    const maskResultados = State?.maskResultados || { OD: {}, OI: {} };
    const logoResultados = State?.logoResultados || { OD: [], OI: [] };

    const hoy = new Date().toLocaleDateString("es-AR");

    const ptaOD = Classifications?.calcularPTA?.(resultados.OD);
    const ptaOI = Classifications?.calcularPTA?.(resultados.OI);

    const cOD = Classifications?.clasificar?.(ptaOD);
    const cOI = Classifications?.clasificar?.(ptaOI);

    const NA = "N/A";

    const FREQS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

    const filasTonal = FREQS.map(f => {

      const od = resultados.OD?.[f] !== undefined
        ? resultados.OD[f] + ' dB'
        : NA;

      const oi = resultados.OI?.[f] !== undefined
        ? resultados.OI[f] + ' dB'
        : NA;

      const odMask = maskResultados.OD?.[f] !== undefined
        ? ` (NE: ${maskResultados.OD[f]} dB)`
        : '';

      const oiMask = maskResultados.OI?.[f] !== undefined
        ? ` (NE: ${maskResultados.OI[f]} dB)`
        : '';

      return `
        <tr>
          <td style="font-weight:600;text-align:left;padding:8px">${f} Hz</td>
          <td style="color:#c04040;padding:8px">${od}${odMask}</td>
          <td style="color:#2a60a0;padding:8px">${oi}${oiMask}</td>
        </tr>
      `;

    }).join('');

    const filasLogo = (oido) => {

      const resp = logoResultados[oido] || [];

      if (!resp.length) return '';

      return resp.map(r => `

        <tr>
          <td style="text-align:left;padding:8px">
            ${this._esc(r.palabra)}
          </td>

          <td style="padding:8px">
            ${r.dB} dB
          </td>

          <td style="
            color:${r.correcta ? '#16a34a' : '#dc2626'};
            font-weight:700;
            padding:8px
          ">
            ${r.correcta ? '✓' : '✗'}
          </td>
        </tr>

      `).join('');

    };

    const pctLogo = (oido) => {

      const pct =
        Classifications?.calcularDiscriminacion?.(
          logoResultados[oido] || []
        );

      return pct !== null ? pct + '%' : NA;

    };

    return `

<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  Audiograma - ${this._esc(paciente.nombre || 'Paciente')}
</title>

<style>

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {

  font-family: 'Segoe UI', Arial, sans-serif;
  color: #333;
  background: #fff;

  padding: 30px 20px;

  line-height: 1.6;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

h1 {

  text-align: center;

  font-size: 28px;

  margin-bottom: 10px;

  color: #1a1a3e;

  letter-spacing: 1px;
}

.subtitle {

  text-align: center;

  color: #666;

  font-size: 14px;

  margin-bottom: 30px;

  text-transform: uppercase;

  letter-spacing: 2px;
}

.info-grid {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 12px;

  margin-bottom: 30px;

  padding: 20px;

  background: #f5f7fa;

  border-radius: 8px;

  border: 1px solid #dde3ed;
}

.info-item {
  font-size: 13px;
}

.info-item strong {

  color: #1a1a3e;

  display: block;

  margin-bottom: 3px;
}

.info-full {
  grid-column: 1 / -1;
}

.section-title {

  font-size: 16px;

  font-weight: 700;

  color: #1a1a3e;

  margin-top: 25px;

  margin-bottom: 12px;

  border-left: 4px solid #1a1a3e;

  padding-left: 10px;

  text-transform: uppercase;

  letter-spacing: 1px;
}

table {

  width: 100%;

  border-collapse: collapse;

  margin-bottom: 20px;

  font-size: 13px;
}

thead tr {

  background: #1a1a3e;

  color: #fff;
}

th {

  padding: 10px 8px;

  text-align: center;

  font-weight: 700;

  border: 1px solid #1a1a3e;
}

td {

  padding: 8px;

  border: 1px solid #dde3ed;

  text-align: center;
}

tbody tr:nth-child(even) {
  background: #f5f7fa;
}

.badge {

  display: inline-block;

  padding: 4px 12px;

  border-radius: 16px;

  font-size: 12px;

  font-weight: 700;
}

.badge-normal {
  background: rgba(16,185,129,0.15);
  color: #065f46;
  border: 1px solid #10b981;
}

.badge-leve {
  background: rgba(212,175,55,0.2);
  color: #78620a;
  border: 1px solid #d4af37;
}

.badge-moderada {
  background: rgba(245,158,11,0.18);
  color: #92400e;
  border: 1px solid #f59e0b;
}

.badge-severa {
  background: rgba(234,88,12,0.18);
  color: #7c2d12;
  border: 1px solid #ea580c;
}

.badge-profunda {
  background: rgba(239,68,68,0.18);
  color: #7f1d1d;
  border: 1px solid #ef4444;
}

.footer {

  margin-top: 30px;

  padding-top: 15px;

  border-top: 1px solid #dde3ed;

  text-align: center;

  font-size: 11px;

  color: #999;
}

@media print {

  @page {
    size: A4;
    margin: 12mm;
  }

  body {
    padding: 0;
  }

  .container {
    max-width: 100%;
  }

  .footer {
    margin-bottom: 20px;
  }

}

</style>

</head>

<body>

<div class="container">

<h1>AUDIOGRAMA CLÍNICO</h1>

<div class="subtitle">
  Informe de Evaluación Auditiva
</div>

<div class="info-grid">

  <div class="info-item">
    <strong>Paciente:</strong>
    ${this._esc(paciente.nombre || NA)}
  </div>

  <div class="info-item">
    <strong>Edad:</strong>
    ${paciente.edad ? this._esc(paciente.edad) + ' años' : NA}
  </div>

  <div class="info-item">
    <strong>H.C.:</strong>
    ${this._esc(paciente.hc || NA)}
  </div>

  <div class="info-item">
    <strong>Fecha:</strong>
    ${this._esc(paciente.fecha || hoy)}
  </div>

  <div class="info-item info-full">
    <strong>Motivo de Consulta:</strong>
    ${this._esc(paciente.motivo || NA)}
  </div>

  <div class="info-item info-full">
    <strong>Observaciones:</strong>
    ${this._esc(paciente.obs || NA)}
  </div>

</div>

<div class="section-title">
  Audiometría Tonal — Umbrales
</div>

<table>

<thead>

<tr>
  <th>Frecuencia</th>
  <th>OD (Derecho)</th>
  <th>OI (Izquierdo)</th>
</tr>

</thead>

<tbody>

${filasTonal}

</tbody>

</table>

<div class="section-title">
  Clasificación Diagnóstica
</div>

<table>

<thead>

<tr>
  <th>Oído</th>
  <th>PTA</th>
  <th>Clasificación</th>
</tr>

</thead>

<tbody>

<tr>

<td style="text-align:left">
  OD — Oído Derecho
</td>

<td>
  ${ptaOD !== null ? ptaOD.toFixed(1) + ' dB' : NA}
</td>

<td>
  ${ptaOD !== null && cOD
    ? `<span class="badge badge-${cOD.cls}">${cOD.label}</span>`
    : NA}
</td>

</tr>

<tr>

<td style="text-align:left">
  OI — Oído Izquierdo
</td>

<td>
  ${ptaOI !== null ? ptaOI.toFixed(1) + ' dB' : NA}
</td>

<td>
  ${ptaOI !== null && cOI
    ? `<span class="badge badge-${cOI.cls}">${cOI.label}</span>`
    : NA}
</td>

</tr>

</tbody>

</table>

${logoResultados.OD?.length || logoResultados.OI?.length ? `

<div class="section-title">
  Logoaudiometría — Discriminación Verbal
</div>

${logoResultados.OD?.length ? `

<div style="margin-bottom:20px">

<div style="
  font-size:13px;
  font-weight:700;
  color:#c04040;
  margin-bottom:8px
">
  Oído Derecho (OD) — Discriminación: ${pctLogo('OD')}
</div>

<table>

<thead>

<tr>
  <th>Palabra</th>
  <th>Nivel</th>
  <th>Resultado</th>
</tr>

</thead>

<tbody>

${filasLogo('OD')}

</tbody>

</table>

</div>

` : ''}

${logoResultados.OI?.length ? `

<div>

<div style="
  font-size:13px;
  font-weight:700;
  color:#2a60a0;
  margin-bottom:8px
">
  Oído Izquierdo (OI) — Discriminación: ${pctLogo('OI')}
</div>

<table>

<thead>

<tr>
  <th>Palabra</th>
  <th>Nivel</th>
  <th>Resultado</th>
</tr>

</thead>

<tbody>

${filasLogo('OI')}

</tbody>

</table>

</div>

` : ''}

` : ''}

<div class="footer">

<strong>Audiómetro Clínico Pro</strong>

<br>

Solo referencia clínica.

<br>

Usar auriculares calibrados.

<br>

Los valores obtenidos deben ser interpretados
por un profesional habilitado.

<br>

Generado: ${hoy}

</div>

</div>

</body>

</html>

`;

  },

  _esc(str) {

    if (!str) return "";

    return String(str)

      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

};

window.PDF = PDF;

console.log(
  "PDF-V2 cargado correctamente:",
  typeof PDF.descargar
);