import { EventEmitter } from 'https://unpkg.com/events@3.3.0/events.js';

export class Chatbot extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      theme: 'light',
      primaryColor: '#007bff',
      accentColor: '#28a745',
      fontSize: '14px',
      maxHeight: '600px',
      showTypingIndicator: true,
      enableVoice: false,
      ...options
    };
    
    this.messages = [];
    this.isTyping = false;
    this.userProfile = null;
    this.currentContext = {};
    this.suggestionOptions = [];
    
    this.init();
  }

  init() {
    this.createChatInterface();
    this.attachEventListeners();
    this.displayWelcomeMessage();
  }

  createChatInterface() {
    this.container.innerHTML = `
      <div class="sandy-chatbot" data-theme="${this.options.theme}">
        <div class="chat-header">
          <div class="header-content">
            <div class="bot-avatar">
              <div class="avatar-circle">S</div>
            </div>
            <div class="bot-info">
              <h3>Sandy</h3>
              <p class="bot-status">Your personal support assistant</p>
            </div>
            <div class="header-actions">
              <button class="btn-minimize" title="Minimize chat">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M4 8h8" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button class="btn-settings" title="Settings">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 1v2m0 10v2m7-7h-2M3 8H1m12.5-4.5L12 5m-8 6l-1.5 1.5M13.5 12.5L12 11m-8-6L2.5 3.5" stroke="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="profile-progress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-text">Profile: 0% complete</span>
          </div>
        </div>

        <div class="chat-messages" id="chat-messages">
          <!-- Messages will be inserted here -->
        </div>

        <div class="typing-indicator" style="display: none;">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">Sandy is typing...</span>
        </div>

        <div class="quick-suggestions" id="quick-suggestions" style="display: none;">
          <!-- Suggestion buttons will be inserted here -->
        </div>

        <div class="chat-input-container">
          <div class="input-wrapper">
            <textarea 
              id="chat-input" 
              placeholder="Type your message here..." 
              rows="1"
              maxlength="2000"
            ></textarea>
            <div class="input-actions">
              ${this.options.enableVoice ? '<button class="btn-voice" title="Voice input"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/><path d="M6 10v1a2 2 0 0 0 4 0v-1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 14v2m-3-1h6" stroke="currentColor" stroke-width="1.5"/></svg></button>' : ''}
              <button id="send-btn" class="btn-send" title="Send message">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M1 8l14-6-4 6 4 6z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="input-footer">
            <span class="char-count">0/2000</span>
            <div class="input-hints">
              <span class="hint">Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>

        <div class="chat-footer">
          <div class="footer-links">
            <button class="link-btn" data-action="profile">Complete Profile</button>
            <button class="link-btn" data-action="recommendations">Get Recommendations</button>
            <button class="link-btn" data-action="help">Help</button>
          </div>
        </div>
      </div>
    `;

    this.injectStyles();
  }

  injectStyles() {
    const styleId = 'sandy-chatbot-styles';
    if (document.getElementById(styleId)) return;

    const styles = `
      <style id="${styleId}">
        .sandy-chatbot {
          width: 100%;
          height: ${this.options.maxHeight};
          background: var(--chat-bg, #ffffff);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-size: ${this.options.fontSize};
          overflow: hidden;
          --primary-color: ${this.options.primaryColor};
          --accent-color: ${this.options.accentColor};
        }

        .sandy-chatbot[data-theme="dark"] {
          --chat-bg: #1a1a1a;
          --text-primary: #ffffff;
          --text-secondary: #b0b0b0;
          --border-color: #333333;
          --input-bg: #2a2a2a;
          --message-user-bg: var(--primary-color);
          --message-bot-bg: #2a2a2a;
        }

        .sandy-chatbot[data-theme="light"] {
          --chat-bg: #ffffff;
          --text-primary: #333333;
          --text-secondary: #666666;
          --border-color: #e0e0e0;
          --input-bg: #f8f9fa;
          --message-user-bg: var(--primary-color);
          --message-bot-bg: #f8f9fa;
        }

        .chat-header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
          color: white;
          padding: 16px;
          border-radius: 12px 12px 0 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bot-avatar .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .bot-info {
          flex: 1;
          margin-left: 12px;
        }

        .bot-info h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .bot-status {
          margin: 0;
          opacity: 0.8;
          font-size: 12px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .header-actions button {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .header-actions button:hover {
          background: rgba(255,255,255,0.3);
        }

        .profile-progress {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: rgba(255,255,255,0.8);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          opacity: 0.9;
          white-space: nowrap;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message {
          display: flex;
          flex-direction: column;
          max-width: 85%;
          animation: messageSlideIn 0.3s ease-out;
        }

        .message.user {
          align-self: flex-end;
          align-items: flex-end;
        }

        .message.bot {
          align-self: flex-start;
          align-items: flex-start;
        }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          word-wrap: break-word;
          position: relative;
        }

        .message.user .message-bubble {
          background: var(--message-user-bg);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.bot .message-bubble {
          background: var(--message-bot-bg);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .message-time {
          font-size: 11px;
          opacity: 0.6;
          margin-top: 4px;
          color: var(--text-secondary);
        }

        .message-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .message-actions button {
          background: none;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .message-actions button:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          opacity: 0.7;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
        }

        .typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--primary-color);
          border-radius: 50%;
          animation: typingPulse 1.4s infinite;
        }

        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .typing-text {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .quick-suggestions {
          padding: 0 16px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .suggestion-btn {
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: 16px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .suggestion-btn:hover {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .chat-input-container {
          border-top: 1px solid var(--border-color);
          padding: 16px;
          background: var(--chat-bg);
        }

        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: var(--input-bg);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          padding: 8px;
          transition: border-color 0.2s;
        }

        .input-wrapper:focus-within {
          border-color: var(--primary-color);
        }

        #chat-input {
          flex: 1;
          border: none;
          background: none;
          color: var(--text-primary);
          resize: none;
          font-family: inherit;
          font-size: inherit;
          line-height: 1.4;
          max-height: 120px;
          outline: none;
        }

        #chat-input::placeholder {
          color: var(--text-secondary);
        }

        .input-actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .input-actions button {
          background: none;
          border: none;
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .input-actions button:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }

        .btn-send {
          background: var(--primary-color) !important;
          color: white !important;
        }

        .btn-send:hover {
          opacity: 0.9;
        }

        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .chat-footer {
          border-top: 1px solid var(--border-color);
          padding: 12px 16px;
          background: var(--chat-bg);
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .link-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px;
        }

        .link-btn:hover {
          opacity: 0.8;
        }

        /* Responsive design */
        @media (max-width: 480px) {
          .sandy-chatbot {
            height: 100vh;
            border-radius: 0;
          }

          .header-actions {
            display: none;
          }

          .footer-links {
            flex-direction: column;
            gap: 8px;
          }
        }

        /* Animations */
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typingPulse {
          0%, 60%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          30% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Scrollbar styles */
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  attachEventListeners() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const suggestionsContainer = document.getElementById('quick-suggestions');

    // Send message on button click
    sendBtn.addEventListener('click', () => this.sendMessage());

    // Handle input events
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    chatInput.addEventListener('input', (e) => {
      this.updateCharCount(e.target.value.length);
      this.autoResizeTextarea(e.target);
      this.updateSendButton(e.target.value.trim().length > 0);
    });

    // Footer action buttons
    document.querySelectorAll('.link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleFooterAction(action);
      });
    });

    // Header action buttons
    document.querySelector('.btn-minimize')?.addEventListener('click', () => {
      this.emit('minimize');
    });

    document.querySelector('.btn-settings')?.addEventListener('click', () => {
      this.emit('settings');
    });

    // Voice input (if enabled)
    if (this.options.enableVoice) {
      document.querySelector('.btn-voice')?.addEventListener('click', () => {
        this.handleVoiceInput();
      });
    }

    // Suggestion clicks
    suggestionsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-btn')) {
        const suggestion = e.target.textContent;
        this.sendMessage(suggestion);
      }
    });
  }

  displayWelcomeMessage() {
    const welcomeMessage = this.userProfile 
      ? `Hi ${this.userProfile.personalInfo.name}! I'm here to help you with personalized support and recommendations. How are you feeling today?`
      : "Hello! I'm Sandy, your personal support assistant. I'm here to provide personalized recommendations and support based on your unique needs. To get started, I'd love to learn more about you. Would you like to complete your profile?";

    this.addMessage('bot', welcomeMessage, {
      showActions: true,
      actions: this.userProfile 
        ? ['How are you feeling?', 'Get recommendations', 'View my profile']
        : ['Complete profile', 'Tell me more about Sandy', 'I have a question']
    });
  }

  sendMessage(text = null) {
    const input = document.getElementById('chat-input');
    const message = text || input.value.trim();
    
    if (!message) return;

    // Clear input
    if (!text) {
      input.value = '';
      this.updateCharCount(0);
      this.autoResizeTextarea(input);
      this.updateSendButton(false);
    }

    // Add user message
    this.addMessage('user', message);

    // Show typing indicator
    this.showTypingIndicator();

    // Emit message event
    this.emit('message', {
      text: message,
      timestamp: new Date().toISOString(),
      context: this.currentContext
    });
  }

  addMessage(sender, text, options = {}) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    messageElement.id = messageId;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let actionsHtml = '';
    if (options.showActions && options.actions) {
      actionsHtml = `
        <div class="message-actions">
          ${options.actions.map(action => `
            <button onclick="window.chatbot?.handleQuickAction?.('${action}')">${action}</button>
          `).join('')}
        </div>
      `;
    }

    messageElement.innerHTML = `
      <div class="message-bubble">
        ${this.formatMessageText(text)}
      </div>
      <div class="message-time">${timestamp}</div>
      ${actionsHtml}
    `;

    messagesContainer.appendChild(messageElement);
    this.scrollToBottom();

    // Store message
    this.messages.push({
      id: messageId,
      sender,
      text,
      timestamp: new Date().toISOString(),
      options
    });

    return messageId;
  }

  formatMessageText(text) {
    // Convert markdown-like formatting
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    // Convert bullet points
    formatted = formatted.replace(/^[-•]\s(.+)/gm, '<li>$1</li>');
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    // Convert numbered lists
    formatted = formatted.replace(/^\d+\.\s(.+)/gm, '<li>$1</li>');

    return formatted;
  }

  showTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    indicator.style.display = 'flex';
    this.isTyping = true;
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    indicator.style.display = 'none';
    this.isTyping = false;
  }

  showSuggestions(suggestions) {
    const container = document.getElementById('quick-suggestions');
    
    if (!suggestions || suggestions.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.innerHTML = suggestions.map(suggestion => `
      <button class="suggestion-btn">${suggestion.text || suggestion}</button>
    `).join('');
    
    container.style.display = 'flex';
    this.suggestionOptions = suggestions;
  }

  hideSuggestions() {
    document.getElementById('quick-suggestions').style.display = 'none';
    this.suggestionOptions = [];
  }

  updateProfile(profile) {
    this.userProfile = profile;
    this.updateProfileProgress();
  }

  updateProfileProgress() {
    if (!this.userProfile) return;

    const progressContainer = document.querySelector('.profile-progress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    const percentage = this.userProfile.intakeStatus?.completionPercentage || 0;
    
    if (percentage > 0) {
      progressContainer.style.display = 'flex';
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `Profile: ${percentage}% complete`;
    } else {
      progressContainer.style.display = 'none';
    }
  }

  handleQuickAction(action) {
    this.sendMessage(action);
  }

  handleFooterAction(action) {
    switch (action) {
      case 'profile':
        this.emit('showProfile');
        break;
      case 'recommendations':
        this.emit('getRecommendations');
        break;
      case 'help':
        this.sendMessage('I need help');
        break;
    }
  }

  handleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.addMessage('bot', 'Sorry, voice input is not supported in your browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    const voiceBtn = document.querySelector('.btn-voice');
    voiceBtn.style.background = 'var(--accent-color)';
    voiceBtn.style.color = 'white';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('chat-input').value = transcript;
      this.updateCharCount(transcript.length);
      this.updateSendButton(transcript.trim().length > 0);
    };

    recognition.onerror = (event) => {
      this.addMessage('bot', 'Sorry, I had trouble hearing you. Please try again or type your message.');
    };

    recognition.onend = () => {
      voiceBtn.style.background = '';
      voiceBtn.style.color = '';
    };

    recognition.start();
  }

  updateCharCount(count) {
    const charCountElement = document.querySelector('.char-count');
    charCountElement.textContent = `${count}/2000`;
    charCountElement.style.color = count > 1800 ? 'var(--accent-color)' : 'var(--text-secondary)';
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const maxHeight = 120;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
  }

  updateSendButton(hasText) {
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = !hasText;
    sendBtn.style.opacity = hasText ? '1' : '0.5';
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addBotResponse(text, options = {}) {
    this.hideTypingIndicator();
    
    const messageId = this.addMessage('bot', text, options);
    
    // Show suggestions if provided
    if (options.suggestions) {
      this.showSuggestions(options.suggestions);
    }

    return messageId;
  }

  updateMessage(messageId, newText, options = {}) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;

    const bubble = messageElement.querySelector('.message-bubble');
    bubble.innerHTML = this.formatMessageText(newText);

    // Update stored message
    const messageIndex = this.messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      this.messages[messageIndex].text = newText;
      this.messages[messageIndex].options = { ...this.messages[messageIndex].options, ...options };
    }
  }

  clearChat() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';
    this.messages = [];
    this.hideTypingIndicator();
    this.hideSuggestions();
  }

  setTheme(theme) {
    this.options.theme = theme;
    this.container.querySelector('.sandy-chatbot').setAttribute('data-theme', theme);
  }

  setContext(context) {
    this.currentContext = { ...this.currentContext, ...context };
  }

  getMessages() {
    return [...this.messages];
  }

  exportConversation() {
    return {
      messages: this.messages,
      userProfile: this.userProfile,
      timestamp: new Date().toISOString()
    };
  }

  destroy() {
    this.removeAllListeners();
    this.container.innerHTML = '';
    
    const styles = document.getElementById('sandy-chatbot-styles');
    if (styles) styles.remove();
  }
}

// Make chatbot globally accessible for quick actions
window.Chatbot = Chatbot;