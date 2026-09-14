import aiService from '../../ai-service.js';
import { sanitizeText, truncateText } from '../../helpers.js';
import Toast from '../toast.js';

// A follow-up chat thread shown under a template/workflow run once it
// completes, so the run's result isn't a dead end — the user can keep
// asking about it in the same conversation. Shared by template-run.js and
// workflow-run.js, which each seed the conversation differently.
export function chatSectionHTML(title = 'Continue the conversation') {
  return `
    <div data-role="chat-section" class="chat-section hidden">
      ${title ? `<h3 class="chat-section-title">${sanitizeText(title)}</h3>` : ''}
      <div
        data-role="chat-thread"
        class="chat-thread"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      ></div>
      <form data-role="chat-form" class="chat-form">
        <label class="sr-only" data-role="chat-input-label">Your message</label>
        <textarea
          data-role="chat-input"
          class="form-textarea chat-input"
          rows="2"
          placeholder="Type or dictate a message…"
          aria-label="Your message"
          data-voice
        ></textarea>
        <button type="submit" class="btn btn-primary btn-small" data-role="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  `;
}

export const chatMethods = {
  // Standalone chat tab (type: 'chat'), opened straight from the search box
  // in any list section instead of a fixed Chat tab. `seedText`, when given,
  // is sent immediately as the first message.
  async initChatTab(seedText) {
    this.setTitle('New Chat');
    this.initChatThread([]);

    if (seedText) {
      this.q('[data-role="chat-input"]').value = seedText;
      await this.sendChatMessage();
    }
  },

  // seedMessages is the neutral { role, content } history the run itself
  // produced (system prompt + rendered prompt/inputs + the run's output),
  // so the first follow-up reply already has full context.
  initChatThread(seedMessages) {
    this.conversation = [...seedMessages];
    this.q('[data-role="chat-section"]').classList.remove('hidden');
    this.renderChatThread();

    if (this.chatFormBound) {
      return;
    }
    this.chatFormBound = true;

    this.q('[data-role="chat-form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendChatMessage();
    });

    this.q('[data-role="chat-input"]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });
  },

  renderChatThread() {
    const thread = this.q('[data-role="chat-thread"]');
    thread.innerHTML = this.conversation
      .filter(
        (message) => message.role === 'user' || message.role === 'assistant'
      )
      .map(
        (message) => `
      <div class="chat-message chat-message--${message.role}">
        <span class="chat-message-role">${message.role === 'user' ? 'You' : 'Assistant'}</span>
        <p class="chat-message-content">${sanitizeText(message.content)}</p>
      </div>`
      )
      .join('');
    thread.scrollTop = thread.scrollHeight;
  },

  async sendChatMessage() {
    const input = this.q('[data-role="chat-input"]');
    const text = input.value.trim();
    if (!text || this.chatPending) {
      return;
    }

    const sendBtn = this.q('[data-role="chat-send-btn"]');
    this.conversation.push({ role: 'user', content: text });
    if (this.type === 'chat' && this.title === 'New Chat') {
      this.setTitle(truncateText(text, 40));
    }
    input.value = '';
    this.renderChatThread();

    this.chatPending = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    try {
      // A copy, not the live array — the thread keeps mutating while the
      // request is in flight.
      const { content } = await aiService.chat({
        messages: [...this.conversation],
      });
      if (!this.root) {
        return;
      }
      this.conversation.push({
        role: 'assistant',
        content: content || 'No response generated',
      });
      this.renderChatThread();
    } catch (error) {
      console.error('Chat follow-up failed:', error);
      Toast.show(error.message, 'error');
      // Drop the unanswered message and hand the text back, so a retry starts
      // from the same state the user was in before sending.
      this.conversation.pop();
      if (this.root) {
        this.renderChatThread();
        input.value = text;
      }
    } finally {
      this.chatPending = false;
      if (this.root) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        input.focus();
      }
    }
  },
};
