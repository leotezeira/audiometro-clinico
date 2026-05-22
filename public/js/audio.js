/**
 * AUDIO.JS
 * Generación de tonos y control de audio
 */

const Audio = {
  audioCtx: null,
  _voiceCache: new Map(),

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

    // Fallback: gain separado por canal L/R usando ChannelMerger
    const merger = ctx.createChannelMerger(2);
    const gainL = ctx.createGain();
    const gainR = ctx.createGain();

    // -1 = izquierda, 0 = ambos, +1 = derecha
    gainL.gain.setValueAtTime(panValue < 0 ? 1 : panValue === 0 ? 1 : 0, ctx.currentTime);
    gainR.gain.setValueAtTime(panValue > 0 ? 1 : panValue === 0 ? 1 : 0, ctx.currentTime);

    gainL.connect(merger, 0, 0);
    gainR.connect(merger, 0, 1);
    merger.connect(ctx.destination);

    // input: nodo al que conectar la fuente de audio
    // ambos gains reciben la misma señal mono
    const inputGain = ctx.createGain();
    inputGain.connect(gainL);
    inputGain.connect(gainR);

    return {
      input: inputGain,
      output: null  // ya conectado a destination
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
    if (panNode.input) {
      // Fallback: output ya conectado a destination en createPanner
      gainMain.connect(panNode.input);
    } else {
      // StereoPannerNode: conectar normalmente
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
    if (panNode.input) {
      // Fallback: output ya conectado a destination en createPanner
      gainMask.connect(panNode.input);
    } else {
      // StereoPannerNode: conectar normalmente
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

    const ear = arguments.length >= 2 ? arguments[1] : State.logoOido;

    // Intento 1: reproducir archivo de audio paneado (si existe)
    this._playWordAudio(palabra, ear)
      .catch(() => this._speakFallback(palabra))
      .finally(() => {
        State.logoHablando = false;
        btn.disabled = false;
        btn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-volume"></use></svg> Reproducir Palabra';
      });
  }
  ,

  async _playWordAudio(palabra, ear) {
    const ctx = this.getContext();

    // Rutas posibles (podÃ©s agregar tus propios audios)
    const base = "audio/palabras/";
    const candidates = [
      `${base}${encodeURIComponent(palabra)}.mp3`,
      `${base}${encodeURIComponent(palabra)}.wav`,
      `${base}${encodeURIComponent(palabra)}.ogg`
    ];

    let arrayBuffer = null;
    let cacheKey = null;

    for (const url of candidates) {
      cacheKey = url;
      if (this._voiceCache.has(cacheKey)) break;

      const resp = await fetch(url, { cache: "force-cache" });
      if (!resp.ok) continue;
      arrayBuffer = await resp.arrayBuffer();
      break;
    }

    let audioBuffer = this._voiceCache.get(cacheKey);
    if (!audioBuffer) {
      if (!arrayBuffer) throw new Error("no-audio-file");
      audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      this._voiceCache.set(cacheKey, audioBuffer);
    }

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;

    const gain = ctx.createGain();
    const amp = Math.min(1, Math.max(0.05, State.dB / 100));
    gain.gain.setValueAtTime(amp, ctx.currentTime);

    src.connect(gain);

    const panNode = this.createPanner(ctx, this.panForEar(ear));
    if (panNode.input) {
      // Fallback: output ya conectado a destination en createPanner
      gain.connect(panNode.input);
    } else {
      // StereoPannerNode: conectar normalmente
      gain.connect(panNode);
      panNode.connect(ctx.destination);
    }

    return await new Promise((resolve) => {
      src.onended = () => resolve();
      src.start(ctx.currentTime);
    });
  },

  _speakFallback(palabra) {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(palabra);
      utterance.lang = "es-ES";
      utterance.rate = 0.85;
      utterance.volume = Math.min(1, Math.max(0.05, State.dB / 100));
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
};
