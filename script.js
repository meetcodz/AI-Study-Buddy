document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");
    const typingIndicator = document.getElementById("typing-indicator");

    // Dummy array of responses for Phase 1 Demo
    const dummyResponses = [
        "That's a great question! For your studies, it's important to remember...",
        "I can help with that. The core concept here is roughly...",
        "Let me simplify that for you. It basically means...",
        "Interesting study topic. Here is a breakdown of the subject...",
        "I'm your study assistant, and I'd say the best way to understand this is to look at practical examples."
    ];

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // 1. Add User Message
        appendMessage(message, 'user');
        userInput.value = '';

        // 2. Show Typing Indicator
        typingIndicator.classList.remove('hidden');
        scrollToBottom();

        // 3. Simulate API Delay and Bot Response
        setTimeout(() => {
            typingIndicator.classList.add('hidden');
            
            // Pick a random dummy response
            const randomResponse = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
            
            appendMessage(randomResponse, 'bot');
        }, 1500); // 1.5 seconds delay
    });

    function appendMessage(text, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", `${sender}-message`);

        const avatarDiv = document.createElement("div");
        avatarDiv.classList.add("avatar");
        avatarDiv.textContent = sender === 'user' ? 'U' : 'N'; // U for User, N for Nexus

        const contentDiv = document.createElement("div");
        contentDiv.classList.add("message-content");
        contentDiv.textContent = text;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
