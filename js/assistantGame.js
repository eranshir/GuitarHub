// Guitar Assistant - AI-powered teaching assistant with fretboard visualization
class AssistantGame {
    constructor(guitar, audio, chordTheory) {
        this.guitar = guitar;
        this.audio = audio;
        this.chordTheory = chordTheory;

        // API endpoint
        // For local development: http://localhost:5001/api/assistant
        // For production: https://livehive.events/guitar-api/api/assistant
        this.apiEndpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5001/api/assistant'
            : 'https://livehive.events/guitar-api/api/assistant';

        // Mode: 'assistant' or 'composer'
        this.mode = 'assistant';

        // Chat state
        this.conversationHistory = [];
        this.isWaitingForResponse = false;

        // Fretboard sequence state (Assistant mode)
        this.currentSequence = [];
        this.currentIndex = 0;
        this.previousIndex = null;

        // Composition state (Composer mode)
        this.composition = new TabComposition();
        this.tabRenderer = null;
        this.fretboardState = new FretboardState();
        this.selectedDuration = 0.25; // Default: quarter note
        this.detectedChord = null;

        // Metronome state
        this.bpm = 120;
        this.metronomeInterval = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentBeat = 0;

        // UI elements
        this.fretboardDisplay = null;

        this.init();
    }

    init() {
        this.initializeFretboard();
        this.initializeComposer();
        this.setupEventListeners();
        this.setupComposerEventListeners();
        this.loadSettings();
    }

    initializeFretboard() {
        if (!this.fretboardDisplay) {
            // In composer mode, fretboard needs to be interactive
            this.fretboardDisplay = new FretboardDisplay('fretboard-assistant', false, 15);
        }
    }

    initializeComposer() {
        // Initialize TAB renderer
        this.tabRenderer = new TabRenderer('composition-tab-display');

        // Set up note click handler for editing
        this.tabRenderer.setNoteClickHandler((measureIndex, event) => {
            this.loadNoteForEditing(measureIndex, event);
        });
    }

    setupEventListeners() {
        // BPM control
        const bpmSlider = document.getElementById('assistant-bpm-slider');
        const bpmDisplay = document.getElementById('assistant-bpm-display');
        if (bpmSlider && bpmDisplay) {
            bpmSlider.addEventListener('input', (e) => {
                this.bpm = parseInt(e.target.value);
                bpmDisplay.textContent = this.bpm;
                this.saveSettings();

                // Restart metronome if playing
                if (this.isPlaying) {
                    this.stopPlayback();
                    this.startPlayback();
                }
            });
        }

        // Playback controls
        document.getElementById('assistant-start')?.addEventListener('click', () => this.startPlayback());
        document.getElementById('assistant-pause')?.addEventListener('click', () => this.pausePlayback());
        document.getElementById('assistant-resume')?.addEventListener('click', () => this.resumePlayback());
        document.getElementById('assistant-stop')?.addEventListener('click', () => this.stopPlayback());
        document.getElementById('assistant-play-shape')?.addEventListener('click', () => this.playCurrentShape());

        // Chat controls
        const sendBtn = document.getElementById('send-message');
        const chatInput = document.getElementById('chat-input');
        const clearChatBtn = document.getElementById('clear-chat');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                // Send on Cmd+Enter or Ctrl+Enter
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearChat());
        }
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message || this.isWaitingForResponse) return;

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        chatInput.value = '';

        // Show loading indicator
        this.showLoading(true);
        this.isWaitingForResponse = true;

        try {
            // Call backend API
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversation_history: this.conversationHistory,
                    context: {
                        bpm: this.bpm,
                        fretboard_range: [0, 15]
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // DEBUG: Log the full response from GPT
            console.log('=== GPT Response ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('==================');

            // Add to conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: data.chat_response }
            );

            // Display assistant response
            this.handleAssistantResponse(data);

        } catch (error) {
            console.error('Error calling assistant API:', error);
            this.addMessageToChat(
                `Sorry, I encountered an error: ${error.message}. Make sure the backend server is running.`,
                'assistant',
                true
            );
        } finally {
            this.showLoading(false);
            this.isWaitingForResponse = false;
        }
    }

    handleAssistantResponse(data) {
        // Add chat response to conversation
        this.addMessageToChat(data.chat_response, 'assistant');

        // Handle fretboard sequence if provided
        if (data.fretboard_sequence && Array.isArray(data.fretboard_sequence) && data.fretboard_sequence.length > 0) {
            console.log('Loading sequence:', data.fretboard_sequence);
            this.loadSequence(data.fretboard_sequence);

            // Check if any shapes have strumming patterns
            const hasStrumming = data.fretboard_sequence.some(s => s.strumming_pattern && s.strumming_pattern.length > 0);
            const hasFingers = data.fretboard_sequence.some(s => s.positions.some(p => p.left_finger));

            console.log('Has strumming patterns:', hasStrumming);
            console.log('Has finger numbers:', hasFingers);

            this.addSystemMessage(`Loaded ${data.fretboard_sequence.length} shapes. Click "Start" to play through the sequence.`);
        }

        // Display tab if provided
        if (data.tab_display) {
            document.getElementById('assistant-tab-display').textContent = data.tab_display;
        }

        // Display additional notes if provided
        if (data.additional_notes) {
            const notesContainer = document.getElementById('assistant-additional-notes');
            notesContainer.textContent = data.additional_notes;
            notesContainer.style.display = 'block';
        } else {
            document.getElementById('assistant-additional-notes').style.display = 'none';
        }
    }

    addMessageToChat(message, sender, isError = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message${isError ? ' error-message' : ''}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `<p>${this.escapeHtml(message)}</p>`;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addSystemMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message system-message';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `<p>ℹ️ ${this.escapeHtml(message)}</p>`;

        messageDiv.appendChild(content);
        chatMessages.appendChild(messageDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="chat-message assistant-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p data-i18n="assistant.welcome">Hi! I'm your guitar assistant. Ask me about chord progressions, scales, techniques, or anything guitar-related. I can show you shapes on the fretboard!</p>
                </div>
            </div>
        `;
        this.conversationHistory = [];
        this.stopPlayback();
        this.currentSequence = [];
        this.updateDisplay();

        // Re-translate the welcome message
        if (window.i18n) {
            window.i18n.updateDOM();
        }
    }

    showLoading(show) {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = show ? 'flex' : 'none';
        }
    }

    loadSequence(sequence) {
        this.stopPlayback();
        this.currentSequence = sequence;
        this.currentIndex = 0;
        this.previousIndex = null;
        this.updateDisplay();
    }

    startPlayback() {
        if (this.currentSequence.length === 0) {
            this.addSystemMessage('No sequence loaded. Ask the assistant to show you chords or progressions!');
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.currentIndex = 0;
        this.previousIndex = null;

        // Update UI
        document.getElementById('assistant-start').style.display = 'none';
        document.getElementById('assistant-pause').style.display = 'inline-block';
        document.getElementById('assistant-stop').style.display = 'inline-block';

        // Display first shape immediately
        this.updateDisplay();

        // Calculate timing
        const beatDuration = (60 / this.bpm) * 1000; // ms per beat

        // Check if current shape has strumming pattern
        const currentShape = this.currentSequence[this.currentIndex];
        if (currentShape.strumming_pattern && currentShape.strumming_pattern.length > 0) {
            // Play with strumming pattern animation
            this.playStrummingPattern(currentShape, beatDuration);
        } else {
            // Simple advance after duration
            this.scheduleNextShape(beatDuration);
        }
    }

    scheduleNextShape(beatDuration) {
        if (!this.isPlaying || this.isPaused) return;

        const currentShape = this.currentSequence[this.currentIndex];
        const duration = currentShape.duration_beats * beatDuration;

        this.metronomeInterval = setTimeout(() => {
            if (!this.isPlaying || this.isPaused) return;

            this.advanceToNextShape();

            // Schedule next shape
            if (this.isPlaying && this.currentIndex < this.currentSequence.length) {
                const nextBeatDuration = (60 / this.bpm) * 1000;
                this.scheduleNextShape(nextBeatDuration);
            } else {
                // Sequence complete
                this.stopPlayback();
                this.addSystemMessage('Sequence complete! Click "Start" to play again.');
            }
        }, duration);
    }

    advanceToNextShape() {
        this.previousIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.currentSequence.length;
        this.updateDisplay();
    }

    pausePlayback() {
        this.isPaused = true;
        if (this.metronomeInterval) {
            clearTimeout(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        document.getElementById('assistant-pause').style.display = 'none';
        document.getElementById('assistant-resume').style.display = 'inline-block';
    }

    resumePlayback() {
        this.isPaused = false;
        document.getElementById('assistant-pause').style.display = 'inline-block';
        document.getElementById('assistant-resume').style.display = 'none';

        const beatDuration = (60 / this.bpm) * 1000;
        this.scheduleNextShape(beatDuration);
    }

    stopPlayback() {
        this.isPlaying = false;
        this.isPaused = false;

        if (this.metronomeInterval) {
            clearTimeout(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        document.getElementById('assistant-start').style.display = 'inline-block';
        document.getElementById('assistant-pause').style.display = 'none';
        document.getElementById('assistant-resume').style.display = 'none';
        document.getElementById('assistant-stop').style.display = 'none';

        // Reset to first shape
        this.currentIndex = 0;
        this.previousIndex = null;
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.fretboardDisplay) return;

        this.fretboardDisplay.clearHighlights();

        if (this.currentSequence.length === 0) {
            document.getElementById('assistant-chord-name').textContent = '-';
            document.getElementById('assistant-position-info').textContent = 'Ready';
            return;
        }

        const currentShape = this.currentSequence[this.currentIndex];
        const previousShape = this.previousIndex !== null ? this.currentSequence[this.previousIndex] : null;

        // Display previous shape in gray
        if (previousShape && previousShape !== currentShape) {
            this.displayShape(previousShape, true);
        }

        // Display current shape in red
        if (currentShape) {
            this.displayShape(currentShape, false);

            // Update text display
            document.getElementById('assistant-chord-name').textContent = currentShape.chord_name;
            const posInfo = `${this.isPlaying ? 'Playing' : 'Showing'}: ${this.currentIndex + 1} of ${this.currentSequence.length}`;
            document.getElementById('assistant-position-info').textContent = posInfo;
        }
    }

    displayShape(shape, isPrevious) {
        if (!shape || !this.fretboardDisplay.container) return;

        // Display chord positions
        shape.positions.forEach(pos => {
            const position = this.fretboardDisplay.container.querySelector(`#pos-${pos.string}-${pos.fret}`);
            if (position) {
                const marker = position.querySelector('.position-marker');
                if (marker) {
                    marker.classList.add('active');

                    if (isPrevious) {
                        marker.classList.add('previous-chord');
                        marker.style.opacity = '0.5';
                    } else {
                        marker.classList.remove('previous-chord');
                        marker.style.opacity = '1';
                    }

                    // Add left-hand finger number if provided (only for current shape)
                    if (!isPrevious && pos.left_finger) {
                        const fingerNum = document.createElement('span');
                        fingerNum.className = 'finger-number';
                        fingerNum.textContent = pos.left_finger;
                        marker.appendChild(fingerNum);
                    }

                    // Prepare right-hand finger indicator (hidden until played)
                    if (!isPrevious) {
                        const rightFinger = document.createElement('span');
                        rightFinger.className = 'right-finger';
                        marker.appendChild(rightFinger);
                    }
                }
            }
        });

        // Display muted strings
        if (shape.muted && shape.muted.length > 0) {
            shape.muted.forEach(stringNum => {
                const openPosition = this.fretboardDisplay.container.querySelector(`#pos-${stringNum}-0`);
                if (openPosition) {
                    const marker = openPosition.querySelector('.position-marker');
                    if (marker) {
                        marker.classList.add('muted-string');
                        marker.innerHTML = 'X';

                        if (isPrevious) {
                            marker.classList.add('previous-chord');
                            marker.style.opacity = '0.5';
                        } else {
                            marker.classList.remove('previous-chord');
                            marker.style.opacity = '1';
                        }
                    }
                }
            });
        }
    }

    playStrummingPattern(shape, beatDuration) {
        if (!shape.strumming_pattern || !this.isPlaying) return;

        let cumulativeDelay = 0;

        shape.strumming_pattern.forEach((strum, index) => {
            const delay = cumulativeDelay;
            const duration = strum.duration_beats * beatDuration;

            setTimeout(() => {
                if (!this.isPlaying || this.isPaused) return;

                // Highlight the strings being played (green)
                this.highlightPlayingStrings(strum.strings, strum.right_finger);

                // Play the notes
                this.playStrings(shape, strum.strings);

                // Remove green highlight after a short time
                setTimeout(() => {
                    this.clearPlayingHighlights();
                }, Math.min(duration * 0.8, 400));

            }, delay);

            cumulativeDelay += duration;
        });

        // After pattern completes, advance to next shape
        setTimeout(() => {
            if (!this.isPlaying || this.isPaused) return;

            this.advanceToNextShape();

            // Schedule next shape
            if (this.isPlaying && this.currentIndex < this.currentSequence.length) {
                const nextShape = this.currentSequence[this.currentIndex];
                const nextBeatDuration = (60 / this.bpm) * 1000;

                if (nextShape.strumming_pattern && nextShape.strumming_pattern.length > 0) {
                    this.playStrummingPattern(nextShape, nextBeatDuration);
                } else {
                    this.scheduleNextShape(nextBeatDuration);
                }
            } else {
                this.stopPlayback();
                this.addSystemMessage('Sequence complete! Click "Start" to play again.');
            }
        }, cumulativeDelay);
    }

    highlightPlayingStrings(strings, rightFinger) {
        if (!this.fretboardDisplay.container) return;

        strings.forEach(stringNum => {
            // Find the position for this string in current shape
            const currentShape = this.currentSequence[this.currentIndex];
            const pos = currentShape.positions.find(p => p.string === stringNum);

            if (pos) {
                const position = this.fretboardDisplay.container.querySelector(`#pos-${pos.string}-${pos.fret}`);
                if (position) {
                    const marker = position.querySelector('.position-marker');
                    if (marker) {
                        marker.classList.add('playing-now');

                        // Show right finger if provided
                        if (rightFinger) {
                            const rightFingerSpan = marker.querySelector('.right-finger');
                            if (rightFingerSpan) {
                                rightFingerSpan.textContent = rightFinger.toUpperCase();
                            }
                        }
                    }
                }
            }
        });
    }

    clearPlayingHighlights() {
        if (!this.fretboardDisplay.container) return;

        this.fretboardDisplay.container.querySelectorAll('.playing-now').forEach(marker => {
            marker.classList.remove('playing-now');
        });
    }

    playStrings(shape, strings) {
        // Play the notes for the specified strings
        const frequencies = [];

        strings.forEach(stringNum => {
            const pos = shape.positions.find(p => p.string === stringNum);
            if (pos && !shape.muted.includes(stringNum)) {
                const freq = this.guitar.getFrequency(pos.string, pos.fret);
                if (freq) frequencies.push(freq);
            }
        });

        if (frequencies.length > 0) {
            if (frequencies.length === 1) {
                this.audio.playNote(frequencies[0], 800);
            } else {
                this.audio.playChord(frequencies, 800);
            }
        }
    }

    playCurrentShape() {
        if (this.currentSequence.length === 0) return;

        const currentShape = this.currentSequence[this.currentIndex];
        if (!currentShape) return;

        // If has strumming pattern, play through it
        if (currentShape.strumming_pattern && currentShape.strumming_pattern.length > 0) {
            const beatDuration = (60 / this.bpm) * 1000;
            this.playStrummingPattern(currentShape, beatDuration);
        } else {
            // Build chord object compatible with chordTheory.playChord
            const chordData = {
                positions: currentShape.positions,
                muted: currentShape.muted || []
            };

            this.chordTheory.playChord(chordData, this.guitar, this.audio);
        }
    }

    saveSettings() {
        localStorage.setItem('assistantSettings', JSON.stringify({
            bpm: this.bpm,
            apiEndpoint: this.apiEndpoint
        }));
    }

    loadSettings() {
        const saved = localStorage.getItem('assistantSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.bpm = settings.bpm || 80;
            this.apiEndpoint = settings.apiEndpoint || this.apiEndpoint;

            // Update UI
            const bpmSlider = document.getElementById('assistant-bpm-slider');
            const bpmDisplay = document.getElementById('assistant-bpm-display');
            if (bpmSlider && bpmDisplay) {
                bpmSlider.value = this.bpm;
                bpmDisplay.textContent = this.bpm;
            }
        }
    }

    cleanup() {
        this.stopPlayback();
    }
}
