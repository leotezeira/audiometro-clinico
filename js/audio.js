/**
 * AUDIO.JS
 * Generación de tonos y control de audio
 */

const Audio = {
  audioCtx: null,

  /**
   * Devuelve el valor de paneo para un oÃ­do.
   * ConvenciÃ³n: OD -> derecha (+1), OI -> izquierda (-1)
   */
  panForEar(ear) {
    return ear === "OD" ? 1 : -1;
  },

  /**
   * Crea un nodo de paneo estÃ©reo (con fallback si no existe StereoPannerNode)
   */
  createPanner(ctx, panValue) {
    if (typeof ctx.createStereoPanner === "function") {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(panValue, ctx.currentTime);
      return p;
    }

    // Fallback: ChannelMerger + gains (L/R)
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const gainL = ctx.createGain();
    const gainR = ctx.createGain();

    // Si panValue es -1 => todo a L, +1 => todo a R
    const left = panValue <= 0 ? 1 : 0;
    const right = panValue >= 0 ? 1 : 0;
    gainL.gain.setValueAtTime(left, ctx.currentTime);
    gainR.gain.setValueAtTime(right, ctx.currentTime);

    // Entrada mono: duplicamos al splitter con 2 canales
    splitter.connect(gainL, 0);
    splitter.connect(gainR, 0);
    gainL.connect(merger, 0, 0);
    gainR.connect(merger, 0, 1);

    // Exponemos una interfaz "panner-like": input -> splitter, output -> merger
    return {
      input: splitter,
      output: merger
    };
  },

  /**
   * Obtiene o crea el AudioContext
   */
  getContext() {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioCtx;
  },

  /**
   * Emite un tono puro con duración de 1 segundo
   */
  emitirTono() {
    if (State.tonando) return;

    State.tonando = true;
    const btn = document.getElementById("btn-tone");
    btn.disabled = true;
    btn.textContent = "▶ Emitiendo...";

    const ctx = this.getContext();
    const freq = FREQUENCIES[State.freqIdx];
    const db = State.dB;
    const ear = State.oido;

    // Tono principal (sine wave)
    const gainMain = ctx.createGain();
    const osc = ctx.createOscillator();
    const amp = Math.pow(10, (db - 100) / 20);

    // Envelope: fade in, mantén, fade out
    gainMain.gain.setValueAtTime(0, ctx.currentTime);
    gainMain.gain.linearRampToValueAtTime(amp, ctx.currentTime + 0.02);
    gainMain.gain.setValueAtTime(amp, ctx.currentTime + 0.98);
    gainMain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(gainMain);

    // Panning: tono al oÃ­do seleccionado
    const panNode = this.createPanner(ctx, this.panForEar(ear));
    if (panNode.input && panNode.output) {
      gainMain.connect(panNode.input);
      panNode.output.connect(ctx.destination);
    } else {
      gainMain.connect(panNode);
      panNode.connect(ctx.destination);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);

    // Enmascaramiento (ruido blanco)
    if (State.maskActive) {
      // Enmascaramiento va al oÃ­do contralateral
      const contra = ear === "OD" ? "OI" : "OD";
      this.emitirEnmascaramiento(ctx, contra);
    }

    setTimeout(() => {
      State.tonando = false;
      btn.disabled = false;
      btn.textContent = "▶ Emitir Tono";
    }, 1100);
  },

  /**
   * Emite ruido blanco para enmascaramiento
   */
  emitirEnmascaramiento(ctx, ear) {
    const bufSize = ctx.sampleRate * 1.0;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);

    // Genera ruido blanco aleatorio
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gainMask = ctx.createGain();
    const ampM = Math.pow(10, (State.maskDB - 100) / 20) * 0.3;
    gainMask.gain.setValueAtTime(ampM, ctx.currentTime);

    src.connect(gainMask);

    // Panning: ruido al oÃ­do indicado
    const panNode = this.createPanner(ctx, this.panForEar(ear));
    if (panNode.input && panNode.output) {
      gainMask.connect(panNode.input);
      panNode.output.connect(ctx.destination);
    } else {
      gainMask.connect(panNode);
      panNode.connect(ctx.destination);
    }

    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + 1.0);
  },

  /**
   * Produce síntesis de voz para logoaudiometría
   */
  hablarPalabra(palabra) {
    if (State.logoHablando) return;

    State.logoHablando = true;
    const btn = document.getElementById("btn-hablar");
    btn.disabled = true;
    btn.textContent = "Reproduciendo...";

    const utterance = new SpeechSynthesisUtterance(palabra);
    utterance.lang = "es-ES";
    utterance.rate = 0.85;
    utterance.volume = Math.min(1, Math.max(0.05, State.dB / 100));

    utterance.onend = () => {
      State.logoHablando = false;
      btn.disabled = false;
      btn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-volume"></use></svg> Reproducir Palabra';
    };

    window.speechSynthesis.speak(utterance);
  }
};
