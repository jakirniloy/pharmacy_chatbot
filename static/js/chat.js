/**
 * MediCare Pharmacy Assistant - Frontend Client
 * Features:
 *  - Adaptive Typewriter Animation for real-time text streaming
 *  - Interactive Sound Feedback (Web Audio API)
 *  - Markdown & Safety Sanitization (Marked + DOMPurify)
 *  - Speech-to-Text & Text-to-Speech
 *  - Theme persistence & Quick Consultations
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const chatScrollArea = document.getElementById("chatScrollArea");
    const messagesContainer = document.getElementById("messagesContainer");
    const welcomeScreen = document.getElementById("welcomeScreen");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const voiceBtn = document.getElementById("voiceBtn");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const typingIndicator = document.getElementById("typingIndicator");
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const themeIcon = document.getElementById("themeIcon");
    const soundToggleBtn = document.getElementById("soundToggleBtn");
    const soundIcon = document.getElementById("soundIcon");

    // Emergency Modal Elements
    const emergencyBtn = document.getElementById("emergencyBtn");
    const emergencyModal = document.getElementById("emergencyModal");
    const closeEmergencyModal = document.getElementById("closeEmergencyModal");
    const ackEmergencyBtn = document.getElementById("ackEmergencyBtn");

    // Conversation State
    let conversationHistory = [];
    let isStreaming = false;
    let soundEnabled = false;

    // Emergency Trigger keywords
    const emergencyKeywords = [
        "chest pain", "difficulty breathing", "unconscious", 
        "stroke", "anaphylaxis", "severe bleeding", "poisoning", "overdose"
    ];

    // Configure Marked
    if (window.marked) {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // -------------------------------------------------------------------------
    // Sound Effects Engine (Web Audio API Synthesizer)
    // -------------------------------------------------------------------------
    let audioCtx = null;
    let lastSoundTime = 0;

    function playTypeSound() {
        if (!soundEnabled) return;
        const now = performance.now();
        if (now - lastSoundTime < 60) return; // throttle sounds
        lastSoundTime = now;

        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === "suspended") {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = "sine";
            // Soft random click frequency between 600Hz and 850Hz
            osc.frequency.setValueAtTime(600 + Math.random() * 250, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.04);
        } catch (e) {
            // Ignore audio context errors
        }
    }

    soundToggleBtn.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundToggleBtn.classList.add("active");
            soundIcon.className = "fa-solid fa-volume-high";
            playTypeSound();
        } else {
            soundToggleBtn.classList.remove("active");
            soundIcon.className = "fa-solid fa-volume-xmark";
        }
    });

    // -------------------------------------------------------------------------
    // Theme Management
    // -------------------------------------------------------------------------
    const savedTheme = localStorage.getItem("medicare_theme") || "dark";
    applyTheme(savedTheme);

    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(newTheme);
    });

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("medicare_theme", theme);
        if (theme === "light") {
            themeIcon.className = "fa-solid fa-sun";
        } else {
            themeIcon.className = "fa-solid fa-moon";
        }
    }

    // -------------------------------------------------------------------------
    // Emergency Modal Handlers
    // -------------------------------------------------------------------------
    emergencyBtn.addEventListener("click", () => emergencyModal.classList.remove("hidden"));
    closeEmergencyModal.addEventListener("click", () => emergencyModal.classList.add("hidden"));
    ackEmergencyBtn.addEventListener("click", () => emergencyModal.classList.add("hidden"));
    emergencyModal.addEventListener("click", (e) => {
        if (e.target === emergencyModal) emergencyModal.classList.add("hidden");
    });

    // -------------------------------------------------------------------------
    // Input Handling & Textarea Auto-expand
    // -------------------------------------------------------------------------
    messageInput.addEventListener("input", () => {
        messageInput.style.height = "auto";
        messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
        sendBtn.disabled = messageInput.value.trim().length === 0 || isStreaming;
    });

    messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled && !isStreaming) {
                sendMessage();
            }
        }
    });

    sendBtn.addEventListener("click", () => {
        if (!isStreaming) {
            sendMessage();
        }
    });

    // Quick Prompt Chips (Welcome Screen)
    document.querySelectorAll(".prompt-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const promptText = chip.getAttribute("data-prompt");
            if (promptText) {
                messageInput.value = promptText;
                messageInput.style.height = "auto";
                sendBtn.disabled = false;
                sendMessage();
            }
        });
    });

    // Quick Tag Bar (Above Input)
    document.querySelectorAll(".quick-tag").forEach(tag => {
        tag.addEventListener("click", () => {
            const tagPrompt = tag.getAttribute("data-tag");
            if (tagPrompt) {
                messageInput.value = tagPrompt;
                messageInput.style.height = "auto";
                sendBtn.disabled = false;
                sendMessage();
            }
        });
    });

    // Clear Chat
    clearChatBtn.addEventListener("click", () => {
        if (conversationHistory.length === 0) return;
        if (confirm("Start a new consultation? Current chat history will be cleared.")) {
            conversationHistory = [];
            messagesContainer.innerHTML = "";
            welcomeScreen.style.display = "block";
            messageInput.value = "";
            messageInput.style.height = "auto";
            sendBtn.disabled = true;
        }
    });

    // -------------------------------------------------------------------------
    // Voice Recognition (Speech-to-Text)
    // -------------------------------------------------------------------------
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add("listening");
            voiceBtn.title = "Listening... Speak now";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                messageInput.value = (messageInput.value ? messageInput.value + " " : "") + transcript;
                messageInput.dispatchEvent(new Event("input"));
            }
        };

        recognition.onerror = () => stopListening();
        recognition.onend = () => stopListening();

        voiceBtn.addEventListener("click", () => {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Speech recognition error:", e);
                }
            }
        });
    } else {
        voiceBtn.style.display = "none";
    }

    function stopListening() {
        isListening = false;
        voiceBtn.classList.remove("listening");
        voiceBtn.title = "Voice Input (Speech-to-Text)";
    }

    // -------------------------------------------------------------------------
    // Smooth Typewriter Engine (Character-by-Character Adaptive Stream)
    // -------------------------------------------------------------------------
    class SmoothTypewriter {
        constructor(contentElement, onComplete) {
            this.contentElement = contentElement;
            this.onComplete = onComplete;
            this.charQueue = [];
            this.typedText = "";
            this.isStreamingFinished = false;
            this.isTypingActive = false;
            this.renderTimer = null;
        }

        enqueue(textChunk) {
            for (let i = 0; i < textChunk.length; i++) {
                this.charQueue.push(textChunk[i]);
            }
            if (!this.isTypingActive) {
                this.isTypingActive = true;
                this.typeLoop();
            }
        }

        finishStream() {
            this.isStreamingFinished = true;
            if (!this.isTypingActive && this.charQueue.length === 0) {
                this.finalize();
            }
        }

        typeLoop() {
            if (this.charQueue.length > 0) {
                // Adaptive speed: If buffer has piled up, speed up smoothly
                let charsToTake = 1;
                const qLen = this.charQueue.length;

                if (qLen > 180) {
                    charsToTake = 8;
                } else if (qLen > 90) {
                    charsToTake = 5;
                } else if (qLen > 40) {
                    charsToTake = 3;
                } else if (qLen > 15) {
                    charsToTake = 2;
                } else {
                    charsToTake = 1;
                }

                for (let i = 0; i < charsToTake && this.charQueue.length > 0; i++) {
                    this.typedText += this.charQueue.shift();
                }

                // Render current markdown with blinking typewriter cursor
                this.renderWithCursor();
                playTypeSound();
                scrollToBottom();

                // Adaptive delay: 10ms - 18ms
                const nextDelay = qLen > 60 ? 10 : 16;
                this.renderTimer = setTimeout(() => this.typeLoop(), nextDelay);
            } else {
                if (this.isStreamingFinished) {
                    this.isTypingActive = false;
                    this.finalize();
                } else {
                    // Waiting for more chunks from network
                    this.renderTimer = setTimeout(() => this.typeLoop(), 25);
                }
            }
        }

        renderWithCursor() {
            if (window.marked && window.DOMPurify) {
                const parsed = marked.parse(this.typedText);
                this.contentElement.innerHTML = DOMPurify.sanitize(parsed) + `<span class="typing-cursor"></span>`;
            } else {
                this.contentElement.innerHTML = this.typedText + `<span class="typing-cursor"></span>`;
            }
        }

        finalize() {
            if (this.renderTimer) clearTimeout(this.renderTimer);
            if (window.marked && window.DOMPurify) {
                const parsed = marked.parse(this.typedText);
                this.contentElement.innerHTML = DOMPurify.sanitize(parsed);
            } else {
                this.contentElement.textContent = this.typedText;
            }
            if (typeof this.onComplete === "function") {
                this.onComplete(this.typedText);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Send Message & Response Streaming
    // -------------------------------------------------------------------------
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || isStreaming) return;

        // Hide welcome screen on first message
        if (welcomeScreen.style.display !== "none") {
            welcomeScreen.style.display = "none";
        }

        // Add User Message to UI
        appendUserMessage(text);

        // Reset Input
        messageInput.value = "";
        messageInput.style.height = "auto";
        sendBtn.disabled = true;
        isStreaming = true;

        // Show Thinking/Typing Indicator
        typingIndicator.classList.remove("hidden");
        scrollToBottom();

        // Create Assistant Bubble Container
        const botBubble = createAssistantMessageBubble();
        const contentDiv = botBubble.querySelector(".bot-text-content");
        const actionsDiv = botBubble.querySelector(".message-actions");
        actionsDiv.style.opacity = "0"; // hide actions until typing completes

        let accumulatedResponse = "";

        // Initialize Typewriter
        const typewriter = new SmoothTypewriter(contentDiv, (finalText) => {
            accumulatedResponse = finalText;
            typingIndicator.classList.add("hidden");
            isStreaming = false;

            // Show and activate action buttons
            actionsDiv.style.opacity = "1";
            actionsDiv.style.transition = "opacity 0.3s ease";

            // Check emergency protocols
            checkForEmergencyWarning(botBubble, finalText);

            // Save to conversation history
            conversationHistory.push({ role: "user", content: text });
            conversationHistory.push({ role: "assistant", content: finalText });

            // Re-enable send button if text exists
            sendBtn.disabled = messageInput.value.trim().length === 0;
            scrollToBottom();
        });

        try {
            // Attempt Streaming via /api/chat/stream/
            const response = await fetch("/api/chat/stream/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    history: conversationHistory
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            typingIndicator.classList.add("hidden");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop(); // save incomplete trailing line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        const jsonStr = trimmed.substring(6);
                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.chunk) {
                                typewriter.enqueue(data.chunk);
                            } else if (data.done) {
                                typewriter.finishStream();
                                break;
                            } else if (data.error) {
                                typewriter.enqueue(`\n\n*(Error: ${data.error})*`);
                                typewriter.finishStream();
                            }
                        } catch (e) {
                            // Ignored malformed chunk
                        }
                    }
                }
            }

            typewriter.finishStream();

        } catch (streamError) {
            console.warn("Streaming failed, falling back to sync endpoint:", streamError);
            try {
                const syncResponse = await fetch("/api/chat/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: text,
                        history: conversationHistory
                    })
                });

                const data = await syncResponse.json();
                const fallbackText = data.response || "I apologize, but I could not retrieve medication data at this moment.";
                typewriter.enqueue(fallbackText);
                typewriter.finishStream();
            } catch (syncError) {
                typingIndicator.classList.add("hidden");
                typewriter.enqueue("⚠️ Unable to connect to MediCare Pharmacy service. Please check your internet connection and try again.");
                typewriter.finishStream();
            }
        }
    }

    // -------------------------------------------------------------------------
    // UI Helpers & Renderers
    // -------------------------------------------------------------------------
    function appendUserMessage(text) {
        const row = document.createElement("div");
        row.className = "message-row user";

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.innerHTML = `<i class="fa-solid fa-user"></i>`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.textContent = text;

        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesContainer.appendChild(row);
        scrollToBottom();
    }

    function createAssistantMessageBubble() {
        const row = document.createElement("div");
        row.className = "message-row assistant";

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.innerHTML = `<i class="fa-solid fa-notes-medical"></i>`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        // Text Content Container
        const contentDiv = document.createElement("div");
        contentDiv.className = "bot-text-content";
        bubble.appendChild(contentDiv);

        // Actions toolbar
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "message-actions";

        const copyBtn = document.createElement("button");
        copyBtn.className = "btn-msg-action";
        copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy`;
        copyBtn.addEventListener("click", () => {
            const rawText = contentDiv.innerText;
            navigator.clipboard.writeText(rawText).then(() => {
                copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i> Copy`;
                }, 2000);
            });
        });

        const speakBtn = document.createElement("button");
        speakBtn.className = "btn-msg-action";
        speakBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Read`;
        speakBtn.addEventListener("click", () => {
            if ("speechSynthesis" in window) {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                    speakBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Read`;
                } else {
                    const utterance = new SpeechSynthesisUtterance(contentDiv.innerText);
                    utterance.rate = 1.0;
                    utterance.onend = () => {
                        speakBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Read`;
                    };
                    speakBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stop`;
                    window.speechSynthesis.speak(utterance);
                }
            }
        });

        const timeSpan = document.createElement("span");
        timeSpan.className = "msg-timestamp";
        timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(speakBtn);
        actionsDiv.appendChild(timeSpan);
        bubble.appendChild(actionsDiv);

        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesContainer.appendChild(row);
        return bubble;
    }

    function checkForEmergencyWarning(bubbleElement, text) {
        const lower = text.toLowerCase();
        const hasEmergency = emergencyKeywords.some(keyword => lower.includes(keyword)) || lower.includes("emergency medical care");
        
        if (hasEmergency && !bubbleElement.querySelector(".emergency-callout-inline")) {
            const banner = document.createElement("div");
            banner.className = "emergency-callout-inline";
            banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span><strong>Urgent Medical Alert:</strong> If you or someone else is experiencing critical symptoms, call emergency services (911 / 999) or visit the nearest ER immediately.</span>`;
            bubbleElement.insertBefore(banner, bubbleElement.firstChild);
        }
    }

    function scrollToBottom() {
        chatScrollArea.scrollTop = chatScrollArea.scrollHeight;
    }
});
