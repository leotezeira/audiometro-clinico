/**
 * PDF.JS - Exportar audiograma como PDF/HTML
 * Funciona en móviles (Web Share) y escritorio (Descarga + Modal)
 * Sin dependencias externas, sin librerías CDN
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
      const nombreArchivo = `Audiograma_${paciente.nombre}_${new Date().toISOString().split('T')[0]}`;
      
      // Detectar si es móvil/PWA
      const esMobil = /Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent) || 
                      (window.navigator.standalone === true);
      
      console.log("Intentando exportar. ¿Móvil?", esMobil);
      
      if (esMobil) {
        // En móvil: intentar Web Share primero
        this._compartirViaWebShare(htmlContent, nombreArchivo)
          .catch(() => {
            // Si Web Share falla: mostrar en modal
            this._mostrarModal(htmlContent);
          });
      } else {
        // En escritorio: ofrecer ambas opciones
        this._mostrarOpcionesEscritorio(htmlContent, nombreArchivo);
      }
      
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error: " + error.message);
    }
  },

  async _compartirViaWebShare(htmlContent, nombreArchivo) {
    // Verificar si el navegador soporta Web Share
    if (!navigator.share) {
      throw new Error("Web Share no disponible");
    }
    
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const archivo = new File([blob], `${nombreArchivo}.html`, { type: "text/html" });
    
    try {
      await navigator.share({
        title: 'Audiograma Clínico',
        text: `Informe de audiometría - ${nombreArchivo}`,
        files: [archivo]
      });
      UI?.showMsg?.('msg-resultado', '✓ Compartido exitosamente', '#10b981');
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error; // Re-lanzar para que se capture en descargar()
      }
    }
  },

  _mostrarOpcionesEscritorio(htmlContent, nombreArchivo) {
    // Crear modal con opciones
    const modal = document.createElement('div');
    modal.id = 'pdf-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    const contenedor = document.createElement('div');
    contenedor.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `;
    
    contenedor.innerHTML = `
      <h2 style="margin-top:0;color:#1a1a3e;font-size:20px">Exportar Audiograma</h2>
      <p style="color:#666;margin:15px 0">¿Cómo deseas exportar el informe?</p>
      <div style="display:flex;gap:10px;margin-top:25px">
        <button id="btn-descargar" style="
          flex:1;padding:12px;background:#3b82f6;color:white;border:none;
          border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;
        ">📥 Descargar HTML</button>
        <button id="btn-modal" style="
          flex:1;padding:12px;background:#10b981;color:white;border:none;
          border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;
        ">👁 Ver e Imprimir</button>
      </div>
      <button id="btn-cerrar" style="
        width:100%;margin-top:10px;padding:10px;background:#e5e7eb;color:#333;
        border:none;border-radius:6px;cursor:pointer;font-size:14px;
      ">Cancelar</button>
    `;
    
    modal.appendChild(contenedor);
    document.body.appendChild(modal);
    
    // Agregar estilos de animación
    if (!document.getElementById('pdf-styles')) {
      const style = document.createElement('style');
      style.id = 'pdf-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Event listeners
    document.getElementById('btn-descargar').addEventListener('click', () => {
      this._descargarHTML(htmlContent, nombreArchivo);
      modal.remove();
    });
    
    document.getElementById('btn-modal').addEventListener('click', () => {
      this._mostrarModal(htmlContent);
      modal.remove();
    });
    
    document.getElementById('btn-cerrar').addEventListener('click', () => {
      modal.remove();
    });
  },

  _descargarHTML(htmlContent, nombreArchivo) {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreArchivo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    UI?.showMsg?.('msg-resultado', '✓ Descargado como HTML', '#10b981');
  },

  _mostrarModal(htmlContent) {
    const modal = document.createElement('div');
    modal.id = 'pdf-preview-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      z-index: 9999;
      padding: 10px;
    `;
    
    // Barra superior con botones
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      background: white;
      padding: 15px;
      border-radius: 8px 8px 0 0;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    toolbar.innerHTML = `
      <h3 style="margin:0;color:#1a1a3e;font-size:18px">Vista Previa</h3>
      <div style="display:flex;gap:8px">
        <button id="btn-imprimir" style="
          padding:8px 16px;background:#10b981;color:white;border:none;
          border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;
        ">🖨 Imprimir/PDF</button>
        <button id="btn-cerrar-preview" style="
          padding:8px 16px;background:#ef4444;color:white;border:none;
          border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;
        ">✕ Cerrar</button>
      </div>
    `;
    
    // iFrame para mostrar HTML
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      flex: 1;
      border: none;
      border-radius: 0 0 8px 8px;
      background: white;
    `;
    
    modal.appendChild(toolbar);
    modal.appendChild(iframe);
    document.body.appendChild(modal);
    
    // Escribir contenido en iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlContent);
    iframe.contentDocument.close();
    
    // Event listeners
    document.getElementById('btn-imprimir').addEventListener('click', () => {
      iframe.contentWindow.print();
    });
    
    document.getElementById('btn-cerrar-preview').addEventListener('click', () => {
      modal.remove();
    });
    
    // Cerrar con ESC
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', closeOnEscape);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    
    UI?.showMsg?.('msg-resultado', '✓ Previsualización cargada. Haz clic en "Imprimir/PDF" para guardar como PDF', '#3b82f6');
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
    
    // Frecuencias estándar
    const FREQS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
    
    // Tabla tonal
    const filasTonal = FREQS.map(f => {
      const od = resultados.OD?.[f] !== undefined ? resultados.OD[f] + ' dB' : NA;
      const oi = resultados.OI?.[f] !== undefined ? resultados.OI[f] + ' dB' : NA;
      const odMask = maskResultados.OD?.[f] !== undefined ? ` (NE: ${maskResultados.OD[f]} dB)` : '';
      const oiMask = maskResultados.OI?.[f] !== undefined ? ` (NE: ${maskResultados.OI[f]} dB)` : '';
      return `
        <tr>
          <td style="font-weight:600;text-align:left;padding:8px">${f} Hz</td>
          <td style="color:#c04040;padding:8px">${od}${odMask}</td>
          <td style="color:#2a60a0;padding:8px">${oi}${oiMask}</td>
        </tr>`;
    }).join('');
    
    // Tabla logoaudiometría
    const filasLogo = (oido) => {
      const resp = logoResultados[oido] || [];
      if (!resp.length) return '';
      return resp.map(r => `
        <tr>
          <td style="text-align:left;padding:8px">${this._esc(r.palabra)}</td>
          <td style="padding:8px">${r.dB} dB</td>
          <td style="color:${r.correcta ? '#16a34a' : '#dc2626'};font-weight:700;padding:8px">${r.correcta ? '✓' : '✗'}</td>
        </tr>`).join('');
    };
    
    const pctLogo = (oido) => {
      const pct = Classifications?.calcularDiscriminacion?.(logoResultados[oido] || []);
      return pct !== null ? pct + '%' : NA;
    };

    // HTML completo
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audiograma - ${this._esc(paciente.nombre || 'Paciente')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      color: #333; 
      background: #fff;
      padding: 30px 20px;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; }
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
    .info-full { grid-column: 1 / -1; }
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
    tbody tr:nth-child(even) { background: #f5f7fa; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-normal { background: rgba(16,185,129,0.15); color: #065f46; border: 1px solid #10b981; }
    .badge-leve { background: rgba(212,175,55,0.2); color: #78620a; border: 1px solid #d4af37; }
    .badge-moderada { background: rgba(245,158,11,0.18); color: #92400e; border: 1px solid #f59e0b; }
    .badge-severa { background: rgba(234,88,12,0.18); color: #7c2d12; border: 1px solid #ea580c; }
    .badge-profunda { background: rgba(239,68,68,0.18); color: #7f1d1d; border: 1px solid #ef4444; }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #dde3ed;
      text-align: center;
      font-size: 11px;
      color: #999;
    }
    @media print {
      body { padding: 0; }
      .container { max-width: 100%; }
      .footer { margin-bottom: 20px; }
    }
  </style>
</head>
<body>
<div class="container">
  
  <h1>AUDIOGRAMA CLÍNICO</h1>
  <div class="subtitle">Informe de Evaluación Auditiva</div>

  <!-- DATOS DEL PACIENTE -->
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

  <!-- AUDIOMETRÍA TONAL -->
  <div class="section-title">Audiometría Tonal — Umbrales</div>
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

  <!-- CLASIFICACIÓN -->
  <div class="section-title">Clasificación Diagnóstica</div>
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
        <td style="text-align:left">OD — Oído Derecho</td>
        <td>${ptaOD !== null ? ptaOD.toFixed(1) + ' dB' : NA}</td>
        <td>
          ${ptaOD !== null && cOD ? `<span class="badge badge-${cOD.cls}">${cOD.label}</span>` : NA}
        </td>
      </tr>
      <tr>
        <td style="text-align:left">OI — Oído Izquierdo</td>
        <td>${ptaOI !== null ? ptaOI.toFixed(1) + ' dB' : NA}</td>
        <td>
          ${ptaOI !== null && cOI ? `<span class="badge badge-${cOI.cls}">${cOI.label}</span>` : NA}
        </td>
      </tr>
    </tbody>
  </table>

  ${logoResultados.OD?.length || logoResultados.OI?.length ? `
  <!-- LOGOAUDIOMETRÍA -->
  <div class="section-title">Logoaudiometría — Discriminación Verbal</div>
  ${logoResultados.OD?.length ? `
  <div style="margin-bottom:20px">
    <div style="font-size:13px;font-weight:700;color:#c04040;margin-bottom:8px">Oído Derecho (OD) — Discriminación: ${pctLogo('OD')}</div>
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
    <div style="font-size:13px;font-weight:700;color:#2a60a0;margin-bottom:8px">Oído Izquierdo (OI) — Discriminación: ${pctLogo('OI')}</div>
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
    <strong>Audiómetro Clínico Pro</strong> — Solo referencia clínica.<br>
    Usar auriculares calibrados. Los valores obtenidos deben ser interpretados por un profesional habilitado.<br>
    Generado: ${hoy}
  </div>

</div>
</body>
</html>`;
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

// Exponer globalmente
window.PDF = PDF;
console.log('PDF cargado correctamente. Método descargar:', typeof PDF.descargar);
