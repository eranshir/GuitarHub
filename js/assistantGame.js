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
        this.editContext = null; // {measureIndex, time, originalEvents} when editing

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
        this.loadComposition(); // Load saved composition if exists
    }

    initializeFretboard() {
        if (!this.fretboardDisplay) {
            // Fretboard for Assistant/Composer - not using built-in click handler
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
        // Mode toggle buttons
        document.getElementById('mode-assistant')?.addEventListener('click', () => {
            this.switchMode('assistant');
        });

        document.getElementById('mode-composer')?.addEventListener('click', () => {
            this.switchMode('composer');
        });

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
            let response;

            // Different endpoints for different modes
            if (this.mode === 'composer') {
                // Composer mode - send composition context
                const composerEndpoint = this.apiEndpoint.replace('/api/assistant', '/api/composer/suggest');

                response = await fetch(composerEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        composition: {
                            title: this.composition.title,
                            tempo: this.composition.tempo,
                            timeSignature: this.composition.timeSignature,
                            measures: this.composition.measures
                        },
                        selected_region: null, // TODO: Implement region selection
                        context: {
                            tempo: this.composition.tempo,
                            time_signature: this.composition.timeSignature
                        }
                    })
                });
            } else {
                // Assistant mode - original behavior
                response = await fetch(this.apiEndpoint, {
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
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // DEBUG: Log the full response from GPT
            console.log('=== GPT Response ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('==================');

            if (this.mode === 'composer') {
                // Handle composer suggestion
                this.addMessageToChat(data.chat_response, 'assistant');
                console.log('TAB context sent to GPT:', data.tab_context_used);

                // If GPT provided structured TAB additions, offer to apply them
                if (data.tab_additions && data.tab_additions.length > 0) {
                    console.log('GPT suggested TAB additions:', data.tab_additions);
                    this.showTabAdditionsPreview(data.tab_additions);
                }
            } else {
                // Handle assistant response (fretboard sequences)
                this.conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.chat_response }
                );
                this.handleAssistantResponse(data);
            }

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

    showTransientNotification(message) {
        // Show a temporary notification that doesn't clutter the chat
        let notification = document.getElementById('transient-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'transient-notification';
            notification.className = 'transient-notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.display = 'block';
        notification.classList.add('show');

        // Auto-hide after 3 seconds
        clearTimeout(this._notificationTimer);
        this._notificationTimer = setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 3000);
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

    setupComposerEventListeners() {
        // Duration buttons (both old and new compact versions)
        document.querySelectorAll('.duration-btn, .duration-btn-compact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectDuration(parseFloat(e.target.dataset.duration));
            });
        });

        // Add Note button
        document.getElementById('add-note-btn')?.addEventListener('click', () => {
            this.addNoteToComposition();
        });

        // Clear fretboard button
        document.getElementById('clear-fretboard-btn')?.addEventListener('click', () => {
            this.clearComposerFretboard();
        });

        // Chord name input - bidirectional
        const chordInput = document.getElementById('chord-name-input');
        if (chordInput) {
            // Enter key to load chord shape onto fretboard
            chordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.loadChordShape(chordInput.value.trim());
                    e.preventDefault();
                }
            });
        }

        // Load Chord button
        document.getElementById('load-chord-btn')?.addEventListener('click', () => {
            const chordInput = document.getElementById('chord-name-input');
            if (chordInput) {
                this.loadChordShape(chordInput.value.trim());
            }
        });

        // Add Chord button
        document.getElementById('add-chord-btn')?.addEventListener('click', () => {
            this.addChordToComposition();
        });

        // Save/Export/Clear buttons
        document.getElementById('save-composition-btn')?.addEventListener('click', () => {
            this.saveComposition();
        });

        document.getElementById('export-tab-btn')?.addEventListener('click', () => {
            this.exportComposition();
        });

        document.getElementById('clear-composition-btn')?.addEventListener('click', () => {
            if (confirm('Clear entire composition? This cannot be undone.')) {
                this.clearComposition();
            }
        });

        // Time signature selector
        document.getElementById('time-signature-select')?.addEventListener('change', (e) => {
            this.composition.timeSignature = e.target.value;
        });

        // Keyboard shortcuts for Composer mode
        document.addEventListener('keydown', (e) => {
            if (this.mode !== 'composer') return;

            // Don't intercept if typing in chord input field
            if (e.target.id === 'chord-name-input') return;

            // Enter key to add note (only if not in input field and fretboard has notes)
            if (e.key === 'Enter' && !this.fretboardState.isEmpty()) {
                this.addNoteToComposition();
                e.preventDefault();
            }

            // Backspace/Delete to clear fretboard (only if not in input field)
            if ((e.key === 'Backspace' || e.key === 'Delete') && !this.fretboardState.isEmpty()) {
                this.clearComposerFretboard();
                e.preventDefault();
            }

            // Ctrl+S to save
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                this.saveComposition();
                e.preventDefault();
            }
        });

        // Make fretboard interactive in composer mode
        if (this.fretboardDisplay && this.fretboardDisplay.container) {
            this.fretboardDisplay.container.addEventListener('click', (e) => {
                if (this.mode !== 'composer') return;

                const pos = e.target.closest('.fret-position');
                if (pos) {
                    const string = parseInt(pos.dataset.string);
                    const fret = parseInt(pos.dataset.fret);
                    this.handleComposerFretboardClick(string, fret);
                }
            });
        }
    }

    switchMode(mode) {
        this.mode = mode;

        // Update mode toggle buttons
        document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (mode === 'assistant') {
            const modeBtn = document.getElementById('mode-assistant');
            if (modeBtn) modeBtn.classList.add('active');

            // Show assistant controls, hide composer controls
            const composerControls = document.getElementById('composer-controls-compact');
            const chordDetector = document.getElementById('composer-chord-detector');
            const compositionTab = document.getElementById('composition-tab-container');
            const assistantDisplay = document.getElementById('assistant-display-container');
            const playbackControls = document.querySelector('.playback-controls');
            const chordDisplay = document.querySelector('.current-chord-display');

            if (composerControls) composerControls.style.display = 'none';
            if (chordDetector) chordDetector.style.display = 'none';
            if (compositionTab) compositionTab.style.display = 'none';
            if (assistantDisplay) assistantDisplay.style.display = 'block';
            if (playbackControls) playbackControls.style.display = 'block';
            if (chordDisplay) chordDisplay.style.display = 'block';
        } else {
            const modeBtn = document.getElementById('mode-composer');
            if (modeBtn) modeBtn.classList.add('active');

            // Hide assistant controls, show composer controls
            const composerControls = document.getElementById('composer-controls-compact');
            const chordDetector = document.getElementById('composer-chord-detector');
            const compositionTab = document.getElementById('composition-tab-container');
            const assistantDisplay = document.getElementById('assistant-display-container');
            const playbackControls = document.querySelector('.playback-controls');
            const chordDisplay = document.querySelector('.current-chord-display');

            if (composerControls) composerControls.style.display = 'flex';
            if (chordDetector) chordDetector.style.display = 'flex';
            if (compositionTab) compositionTab.style.display = 'block';
            if (assistantDisplay) assistantDisplay.style.display = 'none';
            if (playbackControls) playbackControls.style.display = 'none';
            if (chordDisplay) chordDisplay.style.display = 'none';

            // Render current composition
            this.renderComposition();
        }
    }

    handleComposerFretboardClick(string, fret) {
        const notes = this.fretboardState.getNotes();
        const existingNote = notes.find(n => n.string === string && n.fret === fret);
        const isMuted = this.fretboardState.isStringMuted(string);

        if (fret === 0) {
            // Clicking nut (fret 0)
            if (existingNote || isMuted) {
                // If string has a note at fret 0 or is muted, cycle: open → muted → clear
                if (existingNote && !isMuted) {
                    // Currently open (fret 0) → mute it
                    this.fretboardState.addNote(string, -1);
                } else {
                    // Currently muted → clear
                    this.fretboardState.removeNote(string);
                }
            } else {
                // Add open string (fret 0)
                this.fretboardState.addNote(string, 0);
            }
        } else {
            // Clicking regular fret
            if (existingNote) {
                // Remove note if clicking same position
                this.fretboardState.removeNote(string);
            } else {
                // Add or update note in fretboard state
                this.fretboardState.addNote(string, fret);
            }
        }

        // Update visual display
        this.displayComposerFretboard();

        // Detect chord (always update after any fretboard change)
        this.updateDetectedChord();
    }

    displayComposerFretboard() {
        if (!this.fretboardDisplay) return;

        this.fretboardDisplay.clearHighlights();

        // Clear all muted string markers first
        for (let string = 1; string <= 6; string++) {
            const position = this.fretboardDisplay.container.querySelector(`#pos-${string}-0`);
            if (position) {
                const marker = position.querySelector('.position-marker');
                if (marker) {
                    marker.classList.remove('muted-string');
                    marker.textContent = '';
                }
            }
        }

        // Display notes
        const notes = this.fretboardState.getNotes();
        notes.forEach(note => {
            this.fretboardDisplay.highlightPosition(note.string, note.fret, false);
        });

        // Display muted strings with X
        const mutedStrings = this.fretboardState.getMutedStrings();
        mutedStrings.forEach(stringNum => {
            const position = this.fretboardDisplay.container.querySelector(`#pos-${stringNum}-0`);
            if (position) {
                const marker = position.querySelector('.position-marker');
                if (marker) {
                    marker.classList.add('active', 'muted-string');
                    marker.textContent = 'X';
                    marker.style.opacity = '1';
                }
            }
        });
    }

    updateDetectedChord() {
        const chordName = this.fretboardState.detectChord(this.chordTheory);
        this.detectedChord = chordName;

        const chordInput = document.getElementById('chord-name-input');
        const addChordBtn = document.getElementById('add-chord-btn');

        // Update input field with detected chord (user can edit it)
        if (chordInput) {
            if (chordName) {
                chordInput.value = chordName;
            } else if (this.fretboardState.isEmpty()) {
                // Clear input when fretboard is empty
                chordInput.value = '';
            }
        }

        if (addChordBtn) {
            addChordBtn.disabled = !chordName && !chordInput?.value.trim();
        }
    }

    loadChordShape(chordName) {
        if (!chordName) return;

        // Find chord in chordTheory (case-insensitive)
        const chord = this.chordTheory.getChord(chordName);

        if (!chord) {
            this.showTransientNotification(`Chord "${chordName}" not found. Try: C, Am, G7, etc.`);
            return;
        }

        // Clear current fretboard state
        this.fretboardState.clear();

        // Load chord positions onto fretboard
        chord.positions.forEach(pos => {
            this.fretboardState.addNote(pos.string, pos.fret);
        });

        // Display on fretboard
        this.displayComposerFretboard();

        // Detect chord (should match what was typed, but allow detection to verify)
        this.updateDetectedChord();

        this.showTransientNotification(`Loaded ${chord.name} onto fretboard`);
    }

    selectDuration(duration) {
        this.selectedDuration = duration;

        // Update button states (both old and compact versions)
        document.querySelectorAll('.duration-btn, .duration-btn-compact').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.duration) === duration);
        });
    }

    addNoteToComposition() {
        if (this.fretboardState.isEmpty()) return;

        const notes = this.fretboardState.getNotes();

        // Check if we're editing existing notes
        if (this.editContext) {
            // Remove old events at this time
            const measure = this.composition.measures[this.editContext.measureIndex];
            if (measure) {
                measure.events = measure.events.filter(e =>
                    Math.abs(e.time - this.editContext.time) >= 0.001
                );

                // Add updated notes at the same time position
                notes.forEach(note => {
                    measure.events.push({
                        time: this.editContext.time,
                        string: note.string,
                        fret: note.fret,
                        duration: this.selectedDuration,
                        leftFinger: null
                    });
                });

                this.showTransientNotification('Notes updated!');
            }

            // Clear edit context
            this.editContext = null;

        } else {
            // Normal add mode - append new notes
            const currentTime = this.composition.currentTime;

            // Ensure we have the current measure
            if (this.composition.currentMeasure >= this.composition.measures.length) {
                this.composition.addMeasure();
            }

            // Add each note to composition at the same time
            notes.forEach(note => {
                this.composition.addEvent(note.string, note.fret, this.selectedDuration, null, currentTime);
            });

            // Now advance time only once (after all notes added)
            this.composition.currentTime += this.selectedDuration;

            // Check if we need a new measure
            const beatsPerMeasure = this.composition.getBeatsPerMeasure();

            if (this.composition.currentTime >= beatsPerMeasure) {
                this.composition.currentTime = 0;
                this.composition.currentMeasure++;
                this.composition.addMeasure();
            }
        }

        // Clear fretboard state
        this.clearComposerFretboard();

        // Re-render composition
        this.renderComposition();

        // Auto-save
        this.autoSaveComposition();
    }

    clearComposerFretboard() {
        this.fretboardState.clear();
        this.displayComposerFretboard();
        this.updateDetectedChord();
    }

    addChordToComposition() {
        const chordInput = document.getElementById('chord-name-input');
        const chordName = chordInput?.value.trim() || this.detectedChord;

        if (!chordName) return;

        // Add chord annotation at current position
        const measureIdx = this.composition.currentMeasure;
        const time = this.composition.currentTime;

        this.composition.addChordAnnotation(measureIdx, time, chordName);

        // Re-render
        this.renderComposition();

        // Auto-save
        this.autoSaveComposition();

        this.showTransientNotification(`Added "${chordName}" annotation`);
    }

    renderComposition() {
        if (this.tabRenderer) {
            this.tabRenderer.render(this.composition);
        }
    }

    loadNoteForEditing(measureIndex, event) {
        console.log('Edit note:', measureIndex, event);

        // Find all notes at the same time position in this measure
        const measure = this.composition.measures[measureIndex];
        if (!measure) return;

        const notesAtSameTime = measure.events.filter(e =>
            Math.abs(e.time - event.time) < 0.001 // Same time (with floating point tolerance)
        );

        // Load these notes onto the fretboard
        this.fretboardState.clear();
        notesAtSameTime.forEach(note => {
            this.fretboardState.addNote(note.string, note.fret);
        });

        // Display on fretboard
        this.displayComposerFretboard();

        // Update detected chord
        this.updateDetectedChord();

        // Store edit context so we know to update rather than append
        this.editContext = {
            measureIndex: measureIndex,
            time: event.time,
            originalEvents: notesAtSameTime
        };

        // Show transient feedback (doesn't persist in chat)
        this.showTransientNotification(`Editing notes at measure ${measureIndex + 1}. Press Enter to save changes.`);

        // Scroll to top to see fretboard
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    saveComposition(showMessage = true) {
        const data = this.composition.serialize();
        localStorage.setItem('guitarHubComposition', data);
        console.log('Composition saved');
        if (showMessage) {
            this.addSystemMessage('Composition saved!');
        }
    }

    autoSaveComposition() {
        // Auto-save with debounce - silent (no chat message)
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => {
            this.saveComposition(false); // false = don't show message
        }, 2000);
    }

    loadComposition() {
        const data = localStorage.getItem('guitarHubComposition');
        if (data) {
            try {
                this.composition = TabComposition.deserialize(data);
                this.renderComposition();
                console.log('Composition loaded');
            } catch (e) {
                console.error('Error loading composition:', e);
            }
        }
    }

    exportComposition() {
        const textTab = this.composition.exportAsText();
        const blob = new Blob([textTab], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.composition.title || 'composition'}.txt`;
        a.click();

        URL.revokeObjectURL(url);
        this.addSystemMessage('Composition exported!');
    }

    clearComposition() {
        this.composition = new TabComposition();
        this.renderComposition();
        this.clearComposerFretboard();
        localStorage.removeItem('guitarHubComposition');
        this.showTransientNotification('Composition cleared!');
    }

    showTabAdditionsPreview(tabAdditions) {
        // Create a preview message with Accept/Reject buttons
        const chatMessages = document.getElementById('chat-messages');
        const previewDiv = document.createElement('div');
        previewDiv.className = 'chat-message system-message tab-preview';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `
            <p>💡 GPT suggested ${tabAdditions.length} notes to add to your composition.</p>
            <div class="preview-actions">
                <button class="preview-btn accept">✓ Add to Composition</button>
                <button class="preview-btn reject">✗ Decline</button>
            </div>
        `;

        // Accept button
        content.querySelector('.accept').addEventListener('click', () => {
            this.applyTabAdditions(tabAdditions);
            previewDiv.remove();
            this.showTransientNotification('Notes added to composition!');
        });

        // Reject button
        content.querySelector('.reject').addEventListener('click', () => {
            previewDiv.remove();
            this.showTransientNotification('Suggestion declined');
        });

        previewDiv.appendChild(content);
        chatMessages.appendChild(previewDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    applyTabAdditions(tabAdditions) {
        // Sort by time to maintain sequence
        const sortedAdditions = [...tabAdditions].sort((a, b) => (a.time || 0) - (b.time || 0));

        // Add each suggested note to the composition sequentially
        let currentTime = this.composition.currentTime;
        let currentMeasure = this.composition.currentMeasure;

        sortedAdditions.forEach(note => {
            // Ensure we have a measure
            if (this.composition.measures.length === 0) {
                this.composition.addMeasure();
            }

            // Add the note at the current cursor position
            this.composition.measures[currentMeasure].events.push({
                time: currentTime,
                string: note.string,
                fret: note.fret,
                duration: note.duration || 0.25,
                leftFinger: null
            });

            // Advance time
            currentTime += (note.duration || 0.25);

            // Check if we need a new measure
            const beatsPerMeasure = this.composition.getBeatsPerMeasure();
            if (currentTime >= beatsPerMeasure) {
                currentTime = 0;
                currentMeasure++;
                if (currentMeasure >= this.composition.measures.length) {
                    this.composition.addMeasure();
                }
            }
        });

        // Update composition cursor to end of added notes
        this.composition.currentTime = currentTime;
        this.composition.currentMeasure = currentMeasure;

        // Re-render and save
        this.renderComposition();
        this.autoSaveComposition();
    }

    cleanup() {
        this.stopPlayback();
    }
}
