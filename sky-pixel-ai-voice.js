(function (global) {
  'use strict';

  const SpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
  const synth = global.speechSynthesis;
  const SETTINGS_KEY = 'skyPixelAtlas.voice.v1';

  const state = {
    recognition: null,
    listening: false,
    speaking: false,
    transcript: '',
    finalTranscript: '',
    autoSpeak: true,
    voiceProfile: 'aurora',
    voiceName: '',
    rate: 0.94,
    pitch: 1.03,
    volume: 1,
    els: {}
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (typeof saved.autoSpeak === 'boolean') state.autoSpeak = saved.autoSpeak;
      if (['aurora', 'atlas', 'system'].includes(saved.voiceProfile)) state.voiceProfile = saved.voiceProfile;
      if (typeof saved.voiceName === 'string') state.voiceName = saved.voiceName;
      if (Number.isFinite(saved.rate)) state.rate = saved.rate;
      if (Number.isFinite(saved.pitch)) state.pitch = saved.pitch;
      if (Number.isFinite(saved.volume)) state.volume = saved.volume;
    } catch (_) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        autoSpeak: state.autoSpeak,
        voiceProfile: state.voiceProfile,
        voiceName: state.voiceName,
        rate: state.rate,
        pitch: state.pitch,
        volume: state.volume
      }));
    } catch (_) {}
  }

  function buildOverlay() {
    if (document.getElementById('skyPixelAtlasVoice')) return;
    const root = document.createElement('section');
    root.id = 'skyPixelAtlasVoice';
    root.className = 'atlas-voice';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="atlas-voice__veil"></div>
      <div class="atlas-voice__panel" role="dialog" aria-modal="true" aria-label="Atlas voice mode">
        <button class="atlas-voice__close" id="skyPixelAtlasVoiceClose" type="button" aria-label="Close voice mode">×</button>
        <div class="atlas-voice__eyebrow">Sky Pixel Atlas</div>
        <div class="atlas-voice__orb-wrap" aria-hidden="true">
          <div class="atlas-voice__rings"><i></i><i></i><i></i></div>
          <div class="atlas-voice__orb">
            <div class="atlas-voice__aurora atlas-voice__aurora--one"></div>
            <div class="atlas-voice__aurora atlas-voice__aurora--two"></div>
            <div class="atlas-voice__aurora atlas-voice__aurora--three"></div>
            <div class="atlas-voice__stars"></div>
            <div class="atlas-voice__glass"></div>
          </div>
        </div>
        <div class="atlas-voice__status" id="skyPixelAtlasVoiceStatus">Tap the orb and speak</div>
        <div class="atlas-voice__transcript" id="skyPixelAtlasVoiceTranscript" aria-live="polite">Atlas is ready.</div>
        <div class="atlas-voice__levels" aria-hidden="true">${'<i></i>'.repeat(18)}</div>
        <div class="atlas-voice__actions">
          <button id="skyPixelAtlasVoiceListen" class="atlas-voice__primary" type="button"><span>🎙</span><span>Start listening</span></button>
          <button id="skyPixelAtlasVoiceStopSpeech" class="atlas-voice__secondary" type="button">Stop speaking</button>
        </div>
        <div class="atlas-voice__settings">
          <label class="atlas-voice__profile"><span>Voice</span><select id="skyPixelAtlasVoiceProfile" aria-label="Atlas voice profile"><option value="aurora">Aurora · Female</option><option value="atlas">Atlas · Male</option><option value="system">System default</option></select></label>
          <label class="atlas-voice__toggle"><input id="skyPixelAtlasVoiceAutoSpeak" type="checkbox"><span>Read Atlas replies aloud</span></label>
        </div>
        <div class="atlas-voice__privacy">Microphone audio is handled by your browser's speech recognition service. Atlas receives only the transcript.</div>
      </div>`;
    document.body.appendChild(root);

    state.els = {
      root,
      close: root.querySelector('#skyPixelAtlasVoiceClose'),
      status: root.querySelector('#skyPixelAtlasVoiceStatus'),
      transcript: root.querySelector('#skyPixelAtlasVoiceTranscript'),
      listen: root.querySelector('#skyPixelAtlasVoiceListen'),
      stopSpeech: root.querySelector('#skyPixelAtlasVoiceStopSpeech'),
      autoSpeak: root.querySelector('#skyPixelAtlasVoiceAutoSpeak'),
      profile: root.querySelector('#skyPixelAtlasVoiceProfile'),
      orb: root.querySelector('.atlas-voice__orb')
    };
    state.els.autoSpeak.checked = state.autoSpeak;
    state.els.profile.value = state.voiceProfile;
    bindOverlay();
  }

  function injectControls() {
    const composer = document.querySelector('#skyPixelAtlasForm');
    if (composer && !document.getElementById('skyPixelAtlasMic')) {
      const mic = document.createElement('button');
      mic.id = 'skyPixelAtlasMic';
      mic.className = 'atlas-mic';
      mic.type = 'button';
      mic.title = SpeechRecognition ? 'Talk to Atlas' : 'Voice recognition is not supported in this browser';
      mic.setAttribute('aria-label', 'Talk to Atlas');
      mic.innerHTML = '<span class="atlas-mic__icon">🎙</span>';
      const send = document.getElementById('skyPixelAtlasSend');
      composer.insertBefore(mic, send || null);
      mic.addEventListener('click', openVoice);
      if (!SpeechRecognition) mic.classList.add('is-unsupported');
    }

    const actions = document.querySelector('.atlas-header__actions');
    if (actions && !document.getElementById('skyPixelAtlasSpeaker')) {
      const speaker = document.createElement('button');
      speaker.id = 'skyPixelAtlasSpeaker';
      speaker.className = 'atlas-icon-button atlas-speaker';
      speaker.type = 'button';
      speaker.title = 'Toggle spoken replies';
      speaker.setAttribute('aria-label', 'Toggle spoken replies');
      speaker.textContent = state.autoSpeak ? '🔊' : '🔇';
      actions.insertBefore(speaker, actions.firstChild);
      speaker.addEventListener('click', () => {
        state.autoSpeak = !state.autoSpeak;
        state.els.autoSpeak.checked = state.autoSpeak;
        speaker.textContent = state.autoSpeak ? '🔊' : '🔇';
        if (!state.autoSpeak) stopSpeaking();
        saveSettings();
      });
    }
  }

  function setMode(mode, status, transcript) {
    const root = state.els.root;
    root.dataset.mode = mode;
    if (status) state.els.status.textContent = status;
    if (typeof transcript === 'string') state.els.transcript.textContent = transcript;
    const label = state.els.listen.querySelector('span:last-child');
    if (label) label.textContent = mode === 'listening' ? 'Stop listening' : 'Start listening';
  }

  function openVoice() {
    buildOverlay();
    state.els.root.classList.add('is-open');
    state.els.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('atlas-voice-open');
    if (!SpeechRecognition) {
      setMode('unsupported', 'Voice recognition unavailable', 'Use Chrome or Edge to speak to Atlas. Spoken replies may still work.');
      return;
    }
    setMode('idle', 'Tap the orb and speak', 'Atlas is ready.');
    setTimeout(startListening, 220);
  }

  function closeVoice() {
    stopListening();
    state.els.root?.classList.remove('is-open');
    state.els.root?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('atlas-voice-open');
  }

  function createRecognition() {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || navigator.language || 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.listening = true;
      state.transcript = '';
      state.finalTranscript = '';
      setMode('listening', 'Listening…', 'Speak naturally to Atlas.');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += text;
        else interim += text;
      }
      if (finalText) state.finalTranscript += finalText;
      state.transcript = `${state.finalTranscript} ${interim}`.trim();
      state.els.transcript.textContent = state.transcript || 'Listening…';
    };

    recognition.onerror = (event) => {
      state.listening = false;
      const messages = {
        'not-allowed': 'Microphone permission was denied. Allow microphone access and try again.',
        'service-not-allowed': 'Speech recognition is disabled by this browser.',
        'no-speech': 'I did not hear anything. Tap the orb to try again.',
        'audio-capture': 'No microphone was detected.',
        'network': 'The browser speech service could not connect.'
      };
      setMode('error', 'Voice unavailable', messages[event.error] || `Voice recognition stopped: ${event.error}`);
    };

    recognition.onend = async () => {
      const wasListening = state.listening;
      state.listening = false;
      if (!wasListening) return;
      const message = (state.finalTranscript || state.transcript || '').trim();
      if (!message) {
        setMode('idle', 'Tap the orb and speak', 'I did not catch that. Try again.');
        return;
      }
      await submitVoiceMessage(message);
    };
    return recognition;
  }

  function startListening() {
    if (!SpeechRecognition || state.listening) return;
    stopSpeaking();
    try {
      state.recognition = createRecognition();
      state.recognition.start();
    } catch (error) {
      setMode('error', 'Could not start listening', error?.message || String(error));
    }
  }

  function stopListening() {
    if (!state.recognition) return;
    const recognition = state.recognition;
    state.recognition = null;
    state.listening = false;
    try { recognition.stop(); } catch (_) {}
  }

  async function submitVoiceMessage(message) {
    setMode('thinking', 'Atlas is thinking…', message);
    try {
      const answer = await global.SkyPixelAtlas?.ask?.(message, { source: 'voice' });
      const response = String(answer || 'Atlas returned no spoken response.');
      setMode('speaking', state.autoSpeak ? `${state.voiceProfile === 'aurora' ? 'Aurora' : 'Atlas'} is speaking…` : 'Atlas answered', response);
      if (state.autoSpeak) speak(response);
      else setTimeout(() => setMode('idle', 'Tap the orb and speak', response), 500);
    } catch (error) {
      setMode('error', 'Atlas could not answer', error?.message || String(error));
    }
  }

  function cleanForSpeech(text) {
    return String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[*_`#>~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function voiceScore(voice, profile) {
    const name = String(voice?.name || '');
    const lang = String(voice?.lang || '');
    let score = /^en(?:-|$)/i.test(lang) ? 25 : 0;
    if (/en-US/i.test(lang)) score += 8;
    if (/natural|neural|premium|enhanced/i.test(name)) score += 18;
    if (profile === 'aurora') {
      if (/aria/i.test(name)) score += 100;
      if (/jenny|samantha|karen|zira|victoria|ava|serena|susan|female/i.test(name)) score += 80;
      if (/google us english/i.test(name)) score += 55;
      if (/david|mark|guy|daniel|male/i.test(name)) score -= 70;
    } else if (profile === 'atlas') {
      if (/guy|david|mark|daniel|alex|george|male/i.test(name)) score += 85;
      if (/aria|jenny|samantha|karen|zira|victoria|ava|female/i.test(name)) score -= 55;
    }
    return score;
  }

  function pickVoice() {
    const voices = synth?.getVoices?.() || [];
    if (!voices.length) return null;
    if (state.voiceProfile === 'system') return voices.find((voice) => voice.default) || voices[0];
    const exact = voices.find((voice) => voice.name === state.voiceName);
    if (exact && voiceScore(exact, state.voiceProfile) > 20) return exact;
    return [...voices].sort((a, b) => voiceScore(b, state.voiceProfile) - voiceScore(a, state.voiceProfile))[0]
      || voices.find((voice) => voice.default)
      || voices[0];
  }

  function speak(text) {
    if (!synth || !global.SpeechSynthesisUtterance) {
      setMode('idle', 'Spoken replies unavailable', text);
      return;
    }
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      state.voiceName = voice.name;
    }
    utterance.rate = state.voiceProfile === 'aurora' ? Math.min(state.rate, 0.96) : state.rate;
    utterance.pitch = state.voiceProfile === 'aurora' ? Math.max(state.pitch, 1.02) : state.pitch;
    utterance.volume = state.volume;
    utterance.onstart = () => { state.speaking = true; setMode('speaking', `${state.voiceProfile === 'aurora' ? 'Aurora' : 'Atlas'} is speaking…`, text); };
    utterance.onend = () => { state.speaking = false; setMode('idle', 'Tap the orb and speak', text); saveSettings(); };
    utterance.onerror = () => { state.speaking = false; setMode('idle', 'Tap the orb and speak', text); };
    synth.speak(utterance);
  }

  function stopSpeaking() {
    if (synth?.speaking || synth?.pending) synth.cancel();
    state.speaking = false;
  }

  function bindOverlay() {
    state.els.close.addEventListener('click', closeVoice);
    state.els.listen.addEventListener('click', () => state.listening ? stopListening() : startListening());
    state.els.orb.addEventListener('click', () => state.listening ? stopListening() : startListening());
    state.els.stopSpeech.addEventListener('click', () => {
      stopSpeaking();
      setMode('idle', 'Tap the orb and speak', state.els.transcript.textContent);
    });
    state.els.profile.addEventListener('change', () => {
      state.voiceProfile = state.els.profile.value;
      state.voiceName = '';
      if (state.voiceProfile === 'aurora') { state.rate = 0.94; state.pitch = 1.03; }
      else if (state.voiceProfile === 'atlas') { state.rate = 0.96; state.pitch = 0.96; }
      else { state.rate = 1; state.pitch = 1; }
      stopSpeaking();
      saveSettings();
      setMode('idle', `${state.voiceProfile === 'aurora' ? 'Aurora' : state.voiceProfile === 'atlas' ? 'Atlas' : 'System voice'} selected`, 'Tap the orb and speak.');
    });
    state.els.autoSpeak.addEventListener('change', () => {
      state.autoSpeak = state.els.autoSpeak.checked;
      const speaker = document.getElementById('skyPixelAtlasSpeaker');
      if (speaker) speaker.textContent = state.autoSpeak ? '🔊' : '🔇';
      if (!state.autoSpeak) stopSpeaking();
      saveSettings();
    });
    state.els.root.addEventListener('click', (event) => {
      if (event.target === state.els.root || event.target.classList.contains('atlas-voice__veil')) closeVoice();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.els.root?.classList.contains('is-open')) closeVoice();
    });
  }

  function init() {
    loadSettings();
    buildOverlay();
    injectControls();
    global.addEventListener('sky-pixel-atlas:ready', injectControls);
    if (synth) synth.addEventListener?.('voiceschanged', () => pickVoice());
    global.SkyPixelAtlasVoice = Object.freeze({ open: openVoice, close: closeVoice, listen: startListening, stop: stopListening, speak, stopSpeaking });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
