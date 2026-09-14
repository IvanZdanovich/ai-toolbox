// Speech recognition, the browser's own (webkitSpeechRecognition) — no
// library, no audio upload of our own. Two callers sit on top of this:
// dictation into a text field (components/mic-button.js) and the side
// panel's spoken command mode (voice-commands.js).

// Read at call time, not import time: jsdom has no recognizer, and tests
// install one after importing this module.
function recognitionCtor() {
  return globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
}

export function isVoiceSupported() {
  return Boolean(recognitionCtor());
}

// Chrome allows only one recognizer to hold the mic at a time, so starting
// dictation while command mode is listening (or the reverse) has to stop the
// other one rather than fail silently.
let activeSession = null;

// The recognition language from settings. Held here rather than passed down
// through every component, since it is one page-wide preference and each
// call site would otherwise have to read settings just to make a mic button.
let preferredLanguage = '';

export function setVoiceLanguage(lang) {
  preferredLanguage = lang || '';
}

// Chrome never shows a microphone prompt inside the side panel, so the grant
// has to come from a normal tab. The grant is per extension origin, so this
// is a one-time detour.
let permissionPageOpenedAt = 0;
const PERMISSION_PAGE_COOLDOWN_MS = 60000;

export const MIC_PERMISSION_HINT =
  'Allow the microphone in the tab that just opened, then press the mic again.';

export function openMicPermissionPage() {
  // Every failed recognition attempt would otherwise stack another tab, and
  // the panel can fail several times in quick succession.
  const now = Date.now();
  if (now - permissionPageOpenedAt < PERMISSION_PAGE_COOLDOWN_MS) {
    return;
  }
  permissionPageOpenedAt = now;

  chrome.tabs.create({
    url: chrome.runtime.getURL('permissions/microphone.html'),
  });
}

/**
 * Whether the extension already holds the microphone, sending the user to the
 * permission tab when it doesn't. Checked before starting rather than waiting
 * for recognition to fail, so the very first attempt explains itself instead
 * of reporting a blocked mic after the fact.
 *
 * @returns {Promise<boolean>} false when the caller should not start listening.
 */
export async function ensureMicrophoneAccess() {
  // Firefox and older Chrome don't expose the microphone permission here; let
  // recognition run and fall back to the error path.
  if (!navigator.permissions?.query) {
    return true;
  }

  try {
    const { state } = await navigator.permissions.query({ name: 'microphone' });
    if (state === 'granted') {
      return true;
    }
    openMicPermissionPage();
    return false;
  } catch {
    return true;
  }
}

export function voiceErrorMessage(error) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Opening the permission page…';
    case 'no-speech':
      return 'No speech detected';
    case 'audio-capture':
      return 'No microphone found';
    case 'network':
      return 'Speech recognition is offline';
    default:
      return `Speech recognition failed: ${error}`;
  }
}

/**
 * One recognition session bound to a set of callbacks.
 *
 * @param {object} options
 * @param {boolean} options.continuous Keep listening until stopped — used by
 *   command mode. Chrome ends a run on its own after a pause, so this restarts it.
 * @param {string} options.lang BCP-47 tag; falls back to the configured
 *   language, then the browser's.
 * @param {(text: string) => void} options.onTranscript Final transcripts only.
 * @param {(listening: boolean) => void} options.onStateChange
 * @param {(error: string) => void} options.onError
 * @returns {{start: Function, stop: Function, toggle: Function, isListening: Function}|null}
 *   null when the browser has no speech recognition.
 */
export function createVoiceSession({
  continuous = false,
  lang = '',
  onTranscript,
  onStateChange,
  onError,
} = {}) {
  const Recognition = recognitionCtor();
  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();
  recognition.continuous = continuous;
  recognition.interimResults = false;
  recognition.lang = lang || preferredLanguage || navigator.language || 'en-US';

  let listening = false;
  let keepAlive = false;

  function setListening(value) {
    if (listening === value) {
      return;
    }
    listening = value;
    onStateChange?.(value);
  }

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0]?.transcript?.trim();
      if (text) {
        onTranscript?.(text);
      }
    }
  };

  recognition.onerror = (event) => {
    // Logged unconditionally: when speech silently fails to come through,
    // the recognizer's own error code is the only thing that says why.
    console.warn('Speech recognition error:', event.error, event.message || '');

    // A pause in continuous mode reports 'no-speech' and ends the run; the
    // restart in onend covers it, so it isn't worth bothering the user about.
    if (event.error === 'no-speech' && keepAlive) {
      return;
    }
    if (
      event.error === 'not-allowed' ||
      event.error === 'service-not-allowed'
    ) {
      keepAlive = false;
    }
    onError?.(event.error);
  };

  recognition.onend = () => {
    if (keepAlive) {
      // Out of the event handler, not inside it: Chrome is still tearing the
      // run down here and start() throws InvalidStateError if called now.
      setTimeout(() => {
        if (!keepAlive) {
          return;
        }
        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to resume listening:', error);
          keepAlive = false;
          setListening(false);
        }
      }, 0);
      return;
    }
    if (activeSession === session) {
      activeSession = null;
    }
    setListening(false);
  };

  const session = {
    start() {
      if (listening) {
        return;
      }
      activeSession?.stop();
      activeSession = session;
      keepAlive = continuous;
      try {
        recognition.start();
        setListening(true);
      } catch (error) {
        // start() throws if the recognizer is still winding down from a
        // previous run; the user can just press again.
        console.error('Failed to start listening:', error);
        activeSession = null;
        keepAlive = false;
      }
    },

    stop() {
      keepAlive = false;
      if (!listening) {
        return;
      }
      recognition.stop();
      setListening(false);
    },

    toggle() {
      if (listening) {
        session.stop();
      } else {
        session.start();
      }
    },

    isListening() {
      return listening;
    },
  };

  return session;
}
