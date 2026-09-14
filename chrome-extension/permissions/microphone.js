// A tab whose only job is to trigger Chrome's microphone prompt for the
// extension's origin — the side panel cannot show that prompt itself. The
// grant is remembered per origin, so this page is a one-time detour.
//
// The request fires on load rather than waiting for a click: the side panel
// opens this tab the moment recognition reports blocked access, and a page
// that only asks after a button press leaves the user with a tab that
// granted nothing. The button is the retry.

import {
  createVoiceSession,
  isVoiceSupported,
  voiceErrorMessage,
} from '../shared/voice.js';

const grantBtn = document.getElementById('grantBtn');
const status = document.getElementById('micStatus');
const testBtn = document.getElementById('testBtn');
const testOutput = document.getElementById('testOutput');

function report(message, state) {
  status.textContent = message;
  status.className = `mic-status mic-status--${state}`;
}

function showGranted() {
  report(
    'Microphone enabled. Go back to the side panel — voice input and commands work now. You can close this tab.',
    'success'
  );
  grantBtn.disabled = true;
  grantBtn.textContent = 'Microphone enabled';
}

async function requestMicrophone() {
  grantBtn.disabled = true;
  report('Waiting for your answer to Chrome’s microphone prompt…', 'pending');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Nothing here needs the audio; releasing it immediately turns the
    // recording indicator back off. The permission itself sticks.
    stream.getTracks().forEach((track) => track.stop());
    showGranted();
  } catch (error) {
    console.error('Microphone permission denied:', error);
    report(
      'Microphone access was blocked. Click the camera/mic icon in the address bar, allow the microphone for this page, then press Try again.',
      'error'
    );
    grantBtn.disabled = false;
    grantBtn.textContent = 'Try again';
  }
}

grantBtn.addEventListener('click', requestMicrophone);

// A live end-to-end check in a normal tab, where speech recognition is least
// constrained. Words appearing here but not in the side panel separates a
// browser-level problem from a side-panel one.
const testSession = isVoiceSupported()
  ? createVoiceSession({
      continuous: true,
      onTranscript: (text) => {
        testOutput.textContent = `${testOutput.textContent} ${text}`.trim();
      },
      onStateChange: (listening) => {
        testBtn.textContent = listening ? 'Stop test' : 'Start test';
        if (listening && !testOutput.textContent) {
          testOutput.textContent = 'Listening — say something…';
        }
      },
      onError: (error) => {
        testOutput.textContent = voiceErrorMessage(error);
      },
    })
  : null;

testBtn.addEventListener('click', () => {
  if (!testSession) {
    testOutput.textContent =
      'This browser has no speech recognition (Chrome and Edge do).';
    return;
  }
  if (!testSession.isListening()) {
    testOutput.textContent = '';
  }
  testSession.toggle();
});

// Already granted from an earlier visit? Say so instead of re-prompting.
if (navigator.permissions?.query) {
  navigator.permissions
    .query({ name: 'microphone' })
    .then((permission) =>
      permission.state === 'granted' ? showGranted() : requestMicrophone()
    )
    .catch(() => requestMicrophone());
} else {
  requestMicrophone();
}
