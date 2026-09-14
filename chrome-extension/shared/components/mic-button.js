import {
  createVoiceSession,
  ensureMicrophoneAccess,
  isVoiceSupported,
  openMicPermissionPage,
  voiceErrorMessage,
  MIC_PERMISSION_HINT,
} from '../voice.js';
import Toast from './toast.js';

// Dictation: a mic toggle next to a text field that appends what it hears.
// Fields opt in with a `data-voice` attribute, so only the ones worth
// speaking into (prompts, chat, run inputs, search) get a button — the call
// sites just mark up the field and call attachDictation on their container.

function micButtonHTML() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mic-btn';
  button.title = 'Dictate (click to start, click again to stop)';
  button.setAttribute('aria-label', 'Dictate');
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML =
    '<svg class="icon icon--sm"><use href="#icon-mic"></use></svg>';
  return button;
}

function appendTranscript(field, text) {
  const current = field.value;
  const separator = !current || /\s$/.test(current) ? '' : ' ';
  field.value = current + separator + text;
  // Variable extraction, search and autosave all listen for this.
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Adds a dictation button to every `[data-voice]` field under `root`.
 * Safe to call again after a re-render — already-wired fields are skipped.
 *
 * @param {ParentNode} root
 */
export function attachDictation(root) {
  if (!root || !isVoiceSupported()) {
    return;
  }

  root.querySelectorAll('[data-voice]').forEach((field) => {
    if (field.dataset.voiceBound) {
      return;
    }
    field.dataset.voiceBound = 'true';

    const button = micButtonHTML();
    field.insertAdjacentElement('afterend', button);

    const session = createVoiceSession({
      onTranscript: (text) => appendTranscript(field, text),
      onStateChange: (listening) => {
        button.classList.toggle('mic-btn--listening', listening);
        button.setAttribute('aria-pressed', String(listening));
        if (!listening) {
          field.focus();
        }
      },
      onError: (error) => {
        Toast.show(voiceErrorMessage(error), 'error');
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          openMicPermissionPage();
        }
      },
    });

    button.addEventListener('click', async () => {
      if (session.isListening()) {
        session.stop();
        return;
      }
      if (await ensureMicrophoneAccess()) {
        session.start();
      } else {
        Toast.show(MIC_PERMISSION_HINT, 'warning');
      }
    });
  });
}
