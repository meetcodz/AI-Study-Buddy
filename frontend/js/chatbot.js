(async function initChatbot() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/chatbot.css';
  document.head.appendChild(link);

  
  const container = document.createElement('div');
  container.id = 'study-bot-container';
  document.body.appendChild(container);

  try {
   
    const response = await fetch('chatbot.html');
    if (!response.ok) throw new Error('Failed to load chatbot.html');
    const htmlText = await response.text();
    container.innerHTML = htmlText;

    
    setupChatbotLogic();
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error('StudyBot initialization error:', error);
    if (window.location.protocol === 'file:') {
      console.warn('Note: To load chatbot.html, please run your site via a local server (like Live Server in VSCode) to prevent CORS issues on file:// protocol.');
    }
  }

  function setupChatbotLogic() {
    const botWindow = document.getElementById('study-bot-window');
    const btn = document.getElementById('study-bot-btn');
    const messagesDiv = document.getElementById('study-bot-messages');
    const inputEl = document.getElementById('study-bot-input');
    const sendBtn = document.getElementById('study-bot-send');
    const stopBtn = document.getElementById('study-bot-stop');
    const clearBtn = document.getElementById('h-btn-clear');
    const fullscreenBtn = document.getElementById('h-btn-fullscreen');

    let isOpen = false;
    let isGenerating = false;
    let isFullscreen = false;
    let stopRequested = false;
    let conversationHistory = [];

    
    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      if (isOpen) {
        botWindow.classList.add('open');
        btn.classList.add('open');
        setTimeout(() => inputEl.focus(), 100);
      } else {
        botWindow.classList.remove('open');
        btn.classList.remove('open');
      }
    });

    
    fullscreenBtn.addEventListener('click', () => {
      isFullscreen = !isFullscreen;
      if (isFullscreen) {
        botWindow.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '<i data-lucide="minimize-2" style="width: 14px; height: 14px;"></i>';
      } else {
        botWindow.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '<i data-lucide="maximize" style="width: 14px; height: 14px;"></i>';
      }
      if (window.lucide) lucide.createIcons();
    });

    
    clearBtn.addEventListener('click', () => {
      messagesDiv.innerHTML = `
        <div class="bot-msg-row ai">
          <div class="chat-bubble">Chat history cleared. Let's start fresh!</div>
        </div>
      `;
    });

    
    messagesDiv.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.copy-btn');
      if (copyBtn) {
        const textToCopy = copyBtn.getAttribute('data-text');
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
          setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
        });
      }
    });

    function setGenerating(gen) {
      isGenerating = gen;
      if (gen) {
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        stopRequested = false;
      } else {
        sendBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
      }
    }

    
    stopBtn.addEventListener('click', () => {
      if (isGenerating) stopRequested = true;
    });

    function showTypingEl() {
      const row = document.createElement('div');
      row.className = 'bot-msg-row ai typing-indicator';
      row.innerHTML = '<div class="chat-bubble bot-typing"><div class="bot-typing-dot"></div><div class="bot-typing-dot"></div><div class="bot-typing-dot"></div></div>';
      messagesDiv.appendChild(row);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return row;
    }

    function createAIMessageBubble() {
      const row = document.createElement('div');
      row.className = 'bot-msg-row ai';
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      row.appendChild(bubble);
      messagesDiv.appendChild(row);
      return { row, bubble };
    }

    async function typeTextSequence(containerBubble, textToType, rowElement) {
      let currentText = '';
      for(let i = 0; i < textToType.length; i++) {
        if (stopRequested) {
           currentText += ' [Stopped]';
           containerBubble.textContent = currentText;
           break;
        }
        currentText += textToType[i];
        containerBubble.textContent = currentText;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        await new Promise(r => setTimeout(r, 2)); // Fast 2ms typing
      }
      
      const currentTextFinal = containerBubble.textContent;
      const actionsHtml = document.createElement('div');
      actionsHtml.className = 'msg-actions';
      const safeText = currentTextFinal.replace(/"/g, '&quot;');
      actionsHtml.innerHTML = `
         <button class="action-btn copy-btn" data-text="${safeText}">
           <i data-lucide="copy" style="width: 12px; height: 12px; margin-right: 4px;"></i>
           Copy
         </button>
      `;
      rowElement.appendChild(actionsHtml);
      if (window.lucide) lucide.createIcons();
      setGenerating(false);
    }

    function appendUserMessage(text) {
      const row = document.createElement('div');
      row.className = 'bot-msg-row user';
      const escapedText = document.createElement('div');
      escapedText.textContent = text;
      row.innerHTML = '<div class="chat-bubble">' + escapedText.innerHTML + '</div>';
      messagesDiv.appendChild(row);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async function handleSend() {
      const text = inputEl.value.trim();
      if (!text || isGenerating) return;

      appendUserMessage(text);
      inputEl.value = '';

      // Add to conversation history (Gemini format)
      conversationHistory.push({ role: 'user', parts: [{ text }] });

      setGenerating(true);
      const typingEl = showTypingEl();

      try {
        const res = await fetch('http://localhost:8000/api/chat/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: conversationHistory }),
        });
        
        // Remove dot animation when response lands
        if (messagesDiv.contains(typingEl)) messagesDiv.removeChild(typingEl);
        
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        const replyText = data.reply || 'Sorry, I could not generate a response.';

        // Save assistant reply to history
        conversationHistory.push({ role: 'model', parts: [{ text: replyText }] });

        const { row, bubble } = createAIMessageBubble();
        typeTextSequence(bubble, replyText, row);
      } catch (err) {
        if (messagesDiv.contains(typingEl)) messagesDiv.removeChild(typingEl);
        const { row, bubble } = createAIMessageBubble();
        typeTextSequence(bubble, `Error: ${err.message}. Make sure backend is running.`, row);
      }
    }

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
})();
