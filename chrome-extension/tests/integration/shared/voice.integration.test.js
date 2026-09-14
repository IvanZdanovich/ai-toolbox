/**
 * Voice Integration Tests
 *
 * Covers the three pieces voice input and voice control rest on: the spoken
 * command grammar, resolving a spoken name to a template/workflow, and the
 * recognition session wrapper (restart while listening, stop, one mic at a
 * time) driven by a fake SpeechRecognition.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseVoiceCommand,
  findByName,
} from '../../../shared/voice-commands.js';
import {
  createVoiceSession,
  ensureMicrophoneAccess,
  isVoiceSupported,
} from '../../../shared/voice.js';
import { attachDictation } from '../../../shared/components/mic-button.js';

// Stands in for Chrome's webkitSpeechRecognition: the tests drive onresult /
// onend / onerror directly instead of speaking.
class FakeRecognition {
  static instances = [];

  constructor() {
    this.started = 0;
    this.stopped = 0;
    FakeRecognition.instances.push(this);
  }

  start() {
    this.started += 1;
  }

  stop() {
    this.stopped += 1;
  }

  hear(transcript) {
    this.onresult({
      resultIndex: 0,
      results: [[{ transcript }]],
    });
  }
}

describe('Voice command grammar', () => {
  describe('Scenario: Navigating and creating by voice', () => {
    it.each([
      ['templates', 'section', 'templates'],
      ['go to workflows', 'section', 'workflows'],
      ['show history', 'section', 'history'],
      ['open settings', 'settings', ''],
      ['new template', 'new-template', ''],
      ['create workflow', 'new-workflow', ''],
      ['new chat', 'new-chat', ''],
    ])('maps "%s" to %s', (phrase, action, arg) => {
      expect(parseVoiceCommand(phrase)).toEqual({ action, arg });
    });
  });

  describe('Scenario: Commands that carry an argument', () => {
    it('routes "open <name>" to the open action with the name', () => {
      expect(parseVoiceCommand('open email response')).toEqual({
        action: 'open',
        arg: 'email response',
      });
    });

    it('keeps "edit <name>" distinct from "open <name>"', () => {
      expect(parseVoiceCommand('edit email response')).toEqual({
        action: 'edit',
        arg: 'email response',
      });
    });

    it('accepts "search for <text>" as well as "search <text>"', () => {
      expect(parseVoiceCommand('search for invoices')).toEqual({
        action: 'search',
        arg: 'invoices',
      });
      expect(parseVoiceCommand('find invoices')).toEqual({
        action: 'search',
        arg: 'invoices',
      });
    });

    it('sends the rest of the phrase to the AI after "ask"', () => {
      expect(parseVoiceCommand('Ask what the weather is?')).toEqual({
        action: 'ask',
        arg: 'what the weather is',
      });
    });
  });

  describe('Scenario: Phrases that must not be swallowed by the catch-alls', () => {
    it('prefers the section command over "open <name>"', () => {
      expect(parseVoiceCommand('open templates').action).toBe('section');
    });

    it('prefers the settings command over "open <name>"', () => {
      expect(parseVoiceCommand('open settings').action).toBe('settings');
    });

    it('returns null for anything the grammar does not cover', () => {
      expect(parseVoiceCommand('please do something clever')).toBeNull();
      expect(parseVoiceCommand('')).toBeNull();
    });
  });
});

describe('Resolving a spoken name', () => {
  const ITEMS = [
    { id: '1', name: 'Email Response' },
    { id: '2', name: 'Code Documentation' },
  ];

  it('matches regardless of case and punctuation', () => {
    expect(findByName(ITEMS, 'email response!')?.id).toBe('1');
  });

  it('matches on part of a longer name', () => {
    expect(findByName(ITEMS, 'documentation')?.id).toBe('2');
  });

  it('prefers an exact match over a containing one', () => {
    const items = [
      { id: 'long', name: 'Daily Report Summary' },
      { id: 'exact', name: 'Report' },
    ];
    expect(findByName(items, 'report')?.id).toBe('exact');
  });

  it('returns null when nothing is close', () => {
    expect(findByName(ITEMS, 'tax return')).toBeNull();
    expect(findByName(ITEMS, '')).toBeNull();
  });
});

describe('Voice session', () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    globalThis.webkitSpeechRecognition = FakeRecognition;
  });

  afterEach(() => {
    delete globalThis.webkitSpeechRecognition;
  });

  it('reports support from whatever the browser provides', () => {
    expect(isVoiceSupported()).toBe(true);
    delete globalThis.webkitSpeechRecognition;
    expect(isVoiceSupported()).toBe(false);
  });

  it('returns null when the browser has no recognizer', () => {
    delete globalThis.webkitSpeechRecognition;
    expect(createVoiceSession({})).toBeNull();
  });

  it('reports transcripts and listening state to the caller', () => {
    const onTranscript = vi.fn();
    const onStateChange = vi.fn();
    const session = createVoiceSession({ onTranscript, onStateChange });

    session.start();
    expect(session.isListening()).toBe(true);
    expect(onStateChange).toHaveBeenCalledWith(true);

    FakeRecognition.instances[0].hear('  open email response  ');
    expect(onTranscript).toHaveBeenCalledWith('open email response');

    session.stop();
    expect(session.isListening()).toBe(false);
    expect(onStateChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps a continuous session alive when Chrome ends the run on a pause', async () => {
    const session = createVoiceSession({ continuous: true });
    session.start();

    const recognition = FakeRecognition.instances[0];
    recognition.onend();
    // The restart is deferred out of the onend handler, where Chrome would
    // throw InvalidStateError.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(recognition.started).toBe(2);
    expect(session.isListening()).toBe(true);
  });

  it('stays stopped once the user stops a continuous session', async () => {
    const session = createVoiceSession({ continuous: true });
    session.start();
    session.stop();

    const recognition = FakeRecognition.instances[0];
    recognition.onend();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(recognition.started).toBe(1);
    expect(session.isListening()).toBe(false);
  });

  it('stops the session already holding the microphone when another starts', () => {
    const first = createVoiceSession({});
    const second = createVoiceSession({});

    first.start();
    second.start();

    expect(FakeRecognition.instances[0].stopped).toBe(1);
    expect(first.isListening()).toBe(false);
    expect(second.isListening()).toBe(true);
  });

  it('does not bother the user about silence while continuously listening', () => {
    const onError = vi.fn();
    const session = createVoiceSession({ continuous: true, onError });
    session.start();

    FakeRecognition.instances[0].onerror({ error: 'no-speech' });
    expect(onError).not.toHaveBeenCalled();

    FakeRecognition.instances[0].onerror({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledWith('not-allowed');
  });
});

describe('Microphone permission', () => {
  const CLOCK_BASE = Date.now();
  let createdTabs;
  let testIndex = 0;

  beforeEach(() => {
    // Opening the permission tab is rate limited, so each test runs well
    // clear of the previous one's cooldown.
    vi.useFakeTimers();
    testIndex += 1;
    vi.setSystemTime(CLOCK_BASE + testIndex * 120000);

    createdTabs = [];
    vi.spyOn(chrome.tabs, 'create').mockImplementation((properties) => {
      createdTabs.push(properties.url);
      return Promise.resolve({ id: 1 });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete navigator.permissions;
    delete navigator.mediaDevices;
  });

  function micOpens() {
    const track = { stop: vi.fn() };
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }),
    };
    return track;
  }

  function micBlocked() {
    const error = new Error('Permission dismissed');
    error.name = 'NotAllowedError';
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockRejectedValue(error),
    };
  }

  it('lets listening start when the microphone actually opens', async () => {
    const track = micOpens();

    await expect(ensureMicrophoneAccess()).resolves.toBe(true);
    expect(createdTabs).toHaveLength(0);
    // The check must not keep the mic — the recognizer opens its own stream.
    expect(track.stop).toHaveBeenCalled();
  });

  // Regression: an earlier version trusted
  // navigator.permissions.query({name:'microphone'}), which reports 'prompt'
  // for an extension origin even when the mic opens fine — so every press was
  // refused and the mic button did nothing at all.
  it('starts listening even while the permission registry still says "prompt"', async () => {
    micOpens();
    navigator.permissions = {
      query: vi.fn().mockResolvedValue({ state: 'prompt' }),
    };

    await expect(ensureMicrophoneAccess()).resolves.toBe(true);
    expect(createdTabs).toHaveLength(0);
  });

  it('sends the user to the permission tab when the microphone is blocked', async () => {
    micBlocked();

    await expect(ensureMicrophoneAccess()).resolves.toBe(false);
    expect(createdTabs[0]).toContain('permissions/microphone.html');
  });

  // A press must always do something visible, so an explicit attempt opens
  // the tab even inside the rate limit that suppresses repeat failures.
  it('opens the tab on every press rather than letting one be a no-op', async () => {
    micBlocked();

    await ensureMicrophoneAccess();
    await ensureMicrophoneAccess();

    expect(createdTabs).toHaveLength(2);
  });

  it('falls through to recognition when the browser has no mediaDevices', async () => {
    navigator.mediaDevices = undefined;

    await expect(ensureMicrophoneAccess()).resolves.toBe(true);
    expect(createdTabs).toHaveLength(0);
  });
});

describe('Dictation buttons', () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    globalThis.webkitSpeechRecognition = FakeRecognition;
    navigator.mediaDevices = {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    };
    document.body.innerHTML = `
      <div id="toastContainer"></div>
      <form id="root">
        <textarea data-voice></textarea>
        <input type="text" id="plain" />
      </form>
    `;
  });

  afterEach(() => {
    delete globalThis.webkitSpeechRecognition;
    delete navigator.mediaDevices;
  });

  function attach() {
    attachDictation(document.getElementById('root'));
  }

  // The mic button checks microphone permission before starting, so a click
  // only takes effect on the next microtask.
  async function clickMic() {
    document.querySelector('.mic-btn').click();
    await Promise.resolve();
  }

  it('adds a mic only to fields that opted in', () => {
    attach();

    expect(document.querySelectorAll('.mic-btn')).toHaveLength(1);
    expect(
      document.querySelector('textarea').nextElementSibling.className
    ).toBe('mic-btn');
  });

  it('does not add a second mic when called again after a re-render', () => {
    attach();
    attach();

    expect(document.querySelectorAll('.mic-btn')).toHaveLength(1);
  });

  it('appends what it hears to the field and announces the change', async () => {
    attach();
    const field = document.querySelector('textarea');
    const onInput = vi.fn();
    field.addEventListener('input', onInput);
    field.value = 'Summarize';

    await clickMic();
    FakeRecognition.instances[0].hear('this page');

    expect(field.value).toBe('Summarize this page');
    expect(onInput).toHaveBeenCalled();
  });

  it('marks the button while it is listening', async () => {
    attach();
    const button = document.querySelector('.mic-btn');

    await clickMic();
    expect(button.classList.contains('mic-btn--listening')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');

    await clickMic();
    expect(button.classList.contains('mic-btn--listening')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});
