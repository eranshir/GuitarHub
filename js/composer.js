// Guitar TAB Composer - AI-powered composition assistant with fretboard visualization
class Composer {
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

        // Chat state
        this.conversationHistory = [];
        this.isWaitingForResponse = false;

        // Composition state
        this.composition = new TabComposition();
        this.tabRenderer = null; // Keep for compatibility during transition
        this.alphaTabAdapter = null; // New alphaTab renderer
        this.fretboardState = new FretboardState();
        this.selectedDuration = 0.25; // Default: quarter note
        this.detectedChord = null;
        this.editContext = null; // {measureIndex, time, originalEvents} when editing
        this.radialMenu = null; // Radial menu for direct TAB editing
        this.fretboardEditContext = null; // Track when editing a chord from TAB on fretboard

        // Playback state for composition
        this.isPlayingComposition = false;
        this.playbackTimeout = null;
        this.currentPlaybackMeasure = 0;
        this.currentPlaybackTime = 0;

        // Selection state for editing
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedNotes = [];
        this.isSelecting = false;

        // Clipboard for copy/paste
        this.clipboard = null; // {notes: [], relativePositions: []};

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

        // Check if there's a shared composition in the URL
        // First try backend share (new method)
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');

        if (shareId) {
            // Load from backend
            this.loadSharedComposition(shareId);
        } else {
            // Fallback: try legacy URL encoding method
            const sharedComposition = CompositionShareUtils.loadFromURL();
            if (sharedComposition) {
                this.loadCompositionFromData(sharedComposition, false);
                console.log('Loaded composition from URL (legacy):', sharedComposition.title);
            } else {
                // Load saved composition if exists (only if no URL composition)
                this.loadComposition();
            }
        }
    }

    initializeFretboard() {
        if (!this.fretboardDisplay) {
            // Fretboard for Assistant/Composer - not using built-in click handler
            this.fretboardDisplay = new FretboardDisplay('fretboard-assistant', false, 15);
        }
    }

    initializeComposer() {
        // Initialize alphaTab renderer
        this.alphaTabAdapter = new AlphaTabAdapter('composition-tab-display');
        this.alphaTabAdapter.initialize();

        // Set up click handler for alphaTab-rendered notes
        this.alphaTabAdapter.setNoteClickHandler((measureIndex, event, clickEvent, x, y) => {
            this.handleAlphaTabNoteClick(measureIndex, event, clickEvent, x, y);
        });

        // Set up click handler for adding new notes on empty TAB space
        this.alphaTabAdapter.setAddNoteHandler((measureIndex, stringNum, time, x, y) => {
            this.handleAlphaTabAddNote(measureIndex, stringNum, time, x, y);
        });
        // Set up callback for when chord annotation is added
        this.alphaTabAdapter.setChordAddedHandler(() => {
            this.renderComposition();
            this.autoSaveComposition();
        });

        // Keep old TabRenderer for fallback/reference (will remove later)
        this.tabRenderer = new TabRenderer('composition-tab-display-legacy');

        // Initialize radial menu
        this.radialMenu = new RadialNoteMenu(
            (fret, duration) => this.handleRadialMenuSelection(fret, duration),
            () => this.handleRadialMenuCancel()
        );

        // Set up drag selection
        this.setupDragSelection();

        // Set up direct TAB line editing (add notes by clicking empty space)
        // TODO: Update for alphaTab DOM structure
        this.setupDirectTABEditing();
    }

    setupDirectTABEditing() {
        const container = document.getElementById('composition-tab-display');
        if (!container) return;

        // Use event delegation for dynamically created TAB lines
        container.addEventListener('click', (e) => {
            // Check if clicking on or near a note element
            let clickedNote = e.target.closest('.tab-note');

            // If not directly on note, check if there's a note at the click position
            if (!clickedNote) {
                const tabLine = e.target.closest('.tab-line');
                if (tabLine) {
                    // Get all notes in this line
                    const notes = tabLine.querySelectorAll('.tab-note');
                    const rect = tabLine.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;

                    // Find if we clicked on a note position (within 20px)
                    notes.forEach(note => {
                        const noteLeft = parseFloat(note.style.left);
                        if (Math.abs(clickX - noteLeft) < 20) {
                            clickedNote = note;
                        }
                    });
                }
            }

            // If clicked on a note, trigger note edit
            if (clickedNote) {
                console.log('Clicked on note element:', clickedNote);
                e.stopPropagation();

                const measureIndex = parseInt(clickedNote.closest('[data-measure-index]').dataset.measureIndex);
                const event = {
                    time: parseFloat(clickedNote.dataset.time),
                    string: parseInt(clickedNote.dataset.string),
                    fret: parseInt(clickedNote.dataset.fret),
                    duration: parseFloat(clickedNote.dataset.duration)
                };

                this.handleNoteClickForRadialEdit(measureIndex, event, e);
                return;
            }

            // Otherwise, adding new note on empty space
            const tabLine = e.target.closest('.tab-line');
            if (!tabLine || e.target.closest('button')) return;

            // Stop propagation to prevent click-outside handler from firing
            e.stopPropagation();

            // Get string number from parent
            const stringLine = tabLine.closest('.tab-string-line');
            if (!stringLine) return;

            const stringNum = parseInt(stringLine.dataset.string);
            const measureDiv = stringLine.closest('.tab-measure');
            if (!measureDiv) return;

            const measureIndex = parseInt(measureDiv.dataset.measureIndex);

            // Calculate which time position was clicked (based on horizontal position)
            const rect = tabLine.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const position = Math.round(clickX / 50); // 50px per note

            // Calculate time based on position
            const measure = this.composition.measures[measureIndex];
            if (!measure) return;

            // Find if there's already a note at this position on any string
            const allTimes = this.getAllTimesInMeasure(measure);
            const time = allTimes[position] !== undefined ? allTimes[position] : position * 0.25; // Default to quarter note spacing

            // Show radial menu to add new note
            this.showRadialMenuForNewNote(e.clientX, e.clientY, measureIndex, stringNum, time);
        });
    }

    getAllTimesInMeasure(measure) {
        // Get all unique time positions in this measure
        const times = new Set();
        measure.events.forEach(event => {
            if (event && event.time !== null && event.time !== undefined) {
                times.add(event.time);
            }
        });
        return Array.from(times).sort((a, b) => a - b);
    }

    setupDragSelection() {
        const container = document.getElementById('composition-tab-display');
        if (!container) return;

        let selectionBox = null;
        let startX = 0, startY = 0;

        container.addEventListener('mousedown', (e) => {
            // Only if not clicking on a note/button
            if (e.target.closest('.tab-note') || e.target.closest('button') || e.target.closest('.duration-symbol')) return;

            this.isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;

            // Create selection box
            selectionBox = document.createElement('div');
            selectionBox.className = 'selection-box';
            selectionBox.style.left = `${e.pageX}px`;
            selectionBox.style.top = `${e.pageY}px`;
            document.body.appendChild(selectionBox);

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isSelecting || !selectionBox) return;

            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            selectionBox.style.left = `${e.pageX - (currentX - left)}px`;
            selectionBox.style.top = `${e.pageY - (currentY - top)}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.isSelecting) return;

            this.isSelecting = false;

            if (selectionBox) {
                // Get selection bounds
                const rect = selectionBox.getBoundingClientRect();

                // Only select if user dragged at least 10px (not a click)
                if (rect.width > 10 || rect.height > 10) {
                    // Find all notes within selection
                    this.selectNotesInRegion(rect);
                }

                // Remove selection box
                selectionBox.remove();
                selectionBox = null;
            }
        });
    }

    selectNotesInRegion(selectionRect) {
        console.log('selectNotesInRegion called', selectionRect);

        // Clear previous selection (both old tab-note and AlphaTab SVG text elements)
        document.querySelectorAll('.tab-note.selected, text.selected').forEach(note => {
            note.classList.remove('selected');
        });

        this.selectedNotes = [];

        // For AlphaTab: find text elements (note numbers) in the SVG
        const alphaTabSvg = document.querySelector('.at-surface-svg');
        if (!alphaTabSvg) {
            console.warn('No AlphaTab SVG found for selection');
            return;
        }

        // Find all note text elements (numeric content in beat groups)
        const textElements = alphaTabSvg.querySelectorAll('text');
        const noteElements = Array.from(textElements).filter(el => {
            const content = el.textContent.trim();
            const hasNumber = /^\d+$/.test(content);
            const parentGroup = el.closest('g');
            const isBeatGroup = parentGroup?.className.baseVal.match(/^b\d+$/);
            return hasNumber && isBeatGroup;
        });

        console.log('Found note elements:', noteElements.length);

        // Check each note element against selection rectangle
        noteElements.forEach(noteEl => {
            const noteRect = noteEl.getBoundingClientRect();

            // Check if rectangles overlap
            if (!(noteRect.right < selectionRect.left ||
                  noteRect.left > selectionRect.right ||
                  noteRect.bottom < selectionRect.top ||
                  noteRect.top > selectionRect.bottom)) {

                console.log('Note overlaps selection:', noteEl.textContent);

                // Highlight the note
                noteEl.classList.add('selected');

                // Map beat index to composition data
                const beatGroup = noteEl.closest('g');
                const beatClass = beatGroup?.className.baseVal;
                const beatIndex = parseInt(beatClass.replace('b', ''));
                const noteY = parseFloat(noteEl.getAttribute('y'));

                // Get tab line Y positions to determine string
                const tabLines = Array.from(alphaTabSvg.querySelectorAll('rect')).filter(rect => {
                    const width = parseFloat(rect.getAttribute('width'));
                    const height = parseFloat(rect.getAttribute('height'));
                    return width > 50 && height < 2;
                });

                const stringYPositions = [];
                tabLines.forEach(line => {
                    const y = parseFloat(line.getAttribute('y'));
                    const existing = stringYPositions.find(pos => Math.abs(pos - y) < 5);
                    if (!existing) stringYPositions.push(y);
                });
                stringYPositions.sort((a, b) => a - b);
                const tabOnlyYPositions = stringYPositions.slice(-6);

                // Use the alphaTabAdapter's mapping method
                const noteData = this.alphaTabAdapter?.mapBeatIndexToNote(beatIndex, noteY, tabOnlyYPositions);

                if (noteData) {
                    this.selectedNotes.push({
                        measureIndex: noteData.measureIndex,
                        time: noteData.event.time,
                        string: noteData.event.string,
                        fret: noteData.event.fret,
                        duration: noteData.event.duration
                    });
                }
            }
        });

        console.log('Selected notes:', this.selectedNotes);

        if (this.selectedNotes.length > 0) {
            this.showTransientNotification(`Selected ${this.selectedNotes.length} notes`);
        }
    }

    setupEventListeners() {
        // Mode toggle buttons
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

        // Arrow key navigation for chord shapes (works in both assistant and composer modes)
        document.addEventListener('keydown', (e) => {
            // Only handle arrow keys when in assistant module
            const isAssistantActive = document.getElementById('assistant-module')?.classList.contains('active');
            if (!isAssistantActive) return;

            // Don't intercept if user is typing in an input field (except in composer mode with chord input)
            if (e.target.tagName === 'TEXTAREA') return;
            if (e.target.tagName === 'INPUT' && e.target.id !== 'chord-name-input') return;

            // Handle arrow keys for shape navigation
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                // Check if we have shapes to navigate
                if (this.currentChordName && this.availableShapes.length > 1) {
                    e.preventDefault();
                    this.navigateShape(e.key === 'ArrowLeft' ? -1 : 1);
                }
            }
        });
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
            // Composer mode - send composition context
            const composerEndpoint = this.apiEndpoint.replace('/api/assistant', '/api/composer/suggest');

            // Prepare selected region if notes are selected
            const selectedRegion = this.selectedNotes.length > 0 ? {
                notes: this.selectedNotes,
                count: this.selectedNotes.length
            } : null;

            const response = await fetch(composerEndpoint, {
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
                    selected_region: selectedRegion,
                    context: {
                        tempo: this.composition.tempo,
                        time_signature: this.composition.timeSignature,
                        has_selection: !!selectedRegion
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Handle composer suggestion
            this.addMessageToChat(data.chat_response, 'assistant');

            // If GPT provided structured TAB additions, offer to apply them
            if (data.tab_additions && data.tab_additions.length > 0) {
                const hasSelection = this.selectedNotes.length > 0;
                this.showTabAdditionsPreview(data.tab_additions, hasSelection);
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

    formatDuration(duration) {
        const durationNames = {
            0.0625: 'sixteenth',
            0.125: 'eighth',
            0.1875: 'dotted eighth',
            0.25: 'quarter',
            0.375: 'dotted quarter',
            0.5: 'half',
            0.75: 'dotted half',
            1: 'whole'
        };
        return durationNames[duration] || `${duration}`;
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


    navigateShape(direction) {
        if (this.availableShapes.length <= 1) return;

        // Update shape index
        this.currentShapeIndex = (this.currentShapeIndex + direction + this.availableShapes.length) % this.availableShapes.length;

        // Get the new shape
        const newShape = this.availableShapes[this.currentShapeIndex];

        // Update the fretboard state with new shape
        this.fretboardState.clear();

        // Load new shape positions onto fretboard
        newShape.positions.forEach(pos => {
            this.fretboardState.addNote(pos.string, pos.fret);
        });

        // Display on fretboard
        this.displayComposerFretboard();

        // Update detected chord
        this.updateDetectedChord();

        // Provide visual feedback
        this.showTransientNotification(`Shape ${this.currentShapeIndex + 1} of ${this.availableShapes.length} for ${this.currentChordName}`);
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
            this.bpm = settings.bpm || 120;
            this.apiEndpoint = settings.apiEndpoint || this.apiEndpoint;
        }
    }

    setupComposerEventListeners() {
        // Duration buttons (both old and new compact versions)
        document.querySelectorAll('.duration-btn, .duration-btn-compact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Use currentTarget to always get the button, not the SVG child
                const duration = parseFloat(e.currentTarget.dataset.duration);
                console.log('Duration button clicked:', duration);
                this.selectDuration(duration);
            });
        });

        // Rest buttons
        document.querySelectorAll('.rest-btn-compact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const duration = parseFloat(e.currentTarget.dataset.rest);
                console.log('Rest button clicked:', duration);
                this.addRestToComposition(duration);
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

        // Save/Load/Export/Clear buttons
        document.getElementById('save-composition-btn')?.addEventListener('click', () => {
            this.saveComposition();
        });

        document.getElementById('load-composition-btn')?.addEventListener('click', () => {
            this.toggleLoadCompositionsList();
        });

        document.getElementById('share-composition-btn')?.addEventListener('click', () => {
            this.shareComposition();
        });

        document.getElementById('export-tab-btn')?.addEventListener('click', () => {
            this.exportComposition();
        });

        document.getElementById('clear-composition-btn')?.addEventListener('click', () => {
            if (confirm('Start a new composition? Current work will be saved.')) {
                this.clearComposition();
            }
        });

        // Play composition button
        document.getElementById('play-composition-btn')?.addEventListener('click', () => {
            this.toggleCompositionPlayback();
        });

        // Composition tempo control
        const tempoInput = document.getElementById('composition-tempo');
        if (tempoInput) {
            // Update on input (real-time)
            tempoInput.addEventListener('input', (e) => {
                const tempo = parseInt(e.target.value);
                if (tempo >= 1 && tempo <= 300) {
                    this.composition.tempo = tempo;
                    console.log('Tempo updated to:', tempo);
                }
            });

            // Auto-save on change (when user finishes editing)
            tempoInput.addEventListener('change', (e) => {
                const tempo = parseInt(e.target.value);
                if (tempo >= 40 && tempo <= 240) {
                    this.composition.tempo = tempo;
                    this.autoSaveComposition();
                }
            });
        }

        // Time signature selector
        document.getElementById('time-signature-select')?.addEventListener('change', (e) => {
            this.composition.timeSignature = e.target.value;
        });

        // Keyboard shortcuts for Composer mode
        document.addEventListener('keydown', (e) => {
            // Don't intercept if typing in chord input field or chat
            if (e.target.id === 'chord-name-input' || e.target.id === 'chat-input') return;

            console.log('Key pressed:', e.key, 'selectedNotes:', this.selectedNotes.length);

            // Enter key to add note (only if not in input field and fretboard has notes)
            if (e.key === 'Enter' && !this.fretboardState.isEmpty()) {
                this.addNoteToComposition();
                e.preventDefault();
            }

            // Backspace/Delete to delete selected notes (takes priority)
            if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectedNotes.length > 0) {
                console.log('Delete/Backspace key pressed with selected notes:', this.selectedNotes.length);
                this.deleteSelectedNotes();
                e.preventDefault();
            }
            // Backspace/Delete to clear fretboard (only if no selection)
            else if ((e.key === 'Backspace' || e.key === 'Delete') && !this.fretboardState.isEmpty()) {
                this.clearComposerFretboard();
                e.preventDefault();
            }

            // Ctrl+S to save
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                this.saveComposition();
                e.preventDefault();
            }

            // Ctrl+C to copy selected notes
            if (e.key === 'c' && (e.ctrlKey || e.metaKey) && this.selectedNotes.length > 0) {
                this.copySelectedNotes();
                e.preventDefault();
            }

            // Ctrl+V to paste
            if (e.key === 'v' && (e.ctrlKey || e.metaKey) && this.clipboard) {
                this.pasteNotes();
                e.preventDefault();
            }
        });

        // Make fretboard interactive in composer mode
        if (this.fretboardDisplay && this.fretboardDisplay.container) {
            this.fretboardDisplay.container.addEventListener('click', (e) => {
                const pos = e.target.closest('.fret-position');
                if (pos) {
                    const string = parseInt(pos.dataset.string);
                    const fret = parseInt(pos.dataset.fret);
                    this.handleComposerFretboardClick(string, fret);
                }
            });
        }
    }


    handleComposerFretboardClick(string, fret) {
        // Close radial menu if open (user is now editing on fretboard)
        if (this.radialMenu) {
            this.radialMenu.hide();
        }

        const notes = this.fretboardState.getNotes();
        const existingNoteAtThisFret = notes.find(n => n.string === string && n.fret === fret);
        const existingNoteOnString = notes.find(n => n.string === string);
        const isMuted = this.fretboardState.isStringMuted(string);

        // In edit mode: always set the note to the clicked fret (move, don't toggle)
        if (this.fretboardEditContext) {
            if (fret === 0) {
                // Clicking nut - set to open string
                this.fretboardState.addNote(string, 0);
            } else {
                // Clicking regular fret - move note to this fret
                this.fretboardState.addNote(string, fret);
            }
        } else {
            // Normal mode (not editing from TAB): use toggle behavior
            if (fret === 0) {
                // Clicking nut (fret 0)
                if (existingNoteAtThisFret || isMuted) {
                    // If string has a note at fret 0 or is muted, cycle: open → muted → clear
                    if (existingNoteAtThisFret && !isMuted) {
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
                if (existingNoteAtThisFret) {
                    // Toggle: remove note if clicking same position
                    this.fretboardState.removeNote(string);
                } else {
                    // Add or update note in fretboard state
                    this.fretboardState.addNote(string, fret);
                }
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

        console.log('=== loadChordShape called ===');
        console.log('Chord name:', chordName);

        // Initialize shape navigation for this chord (works even if chord not in library)
        this.currentChordName = chordName;
        this.availableShapes = this.chordTheory.getAllShapes(chordName, this.guitar);
        this.currentShapeIndex = 0;

        console.log('Available shapes:', this.availableShapes.length);
        console.log('Guitar instance:', this.guitar);
        console.log('Shapes:', this.availableShapes);

        // Check if we found any shapes
        if (this.availableShapes.length === 0) {
            this.showTransientNotification(`Chord "${chordName}" not recognized. Try: C, Am, G7, F#m7, etc.`);
            this.currentChordName = null;
            return;
        }

        // Get first shape
        const firstShape = this.availableShapes[0];

        // Clear current fretboard state
        this.fretboardState.clear();

        // Load chord positions onto fretboard
        firstShape.positions.forEach(pos => {
            this.fretboardState.addNote(pos.string, pos.fret);
        });

        // Display on fretboard
        this.displayComposerFretboard();

        // Detect chord (should match what was typed, but allow detection to verify)
        this.updateDetectedChord();

        // Show notification with shape info
        const shapeInfo = this.availableShapes.length > 1
            ? ` (Shape 1/${this.availableShapes.length}, use ← → to navigate)`
            : '';
        const isGenerated = firstShape.isGenerated ? ' [Generated]' : '';
        this.showTransientNotification(`Loaded ${firstShape.name}${isGenerated} onto fretboard${shapeInfo}`);
    }

    selectDuration(duration) {
        this.selectedDuration = duration;

        // Update button states (both old and compact versions)
        document.querySelectorAll('.duration-btn, .duration-btn-compact').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.duration) === duration);
        });
    }

    addRestToComposition(duration) {
        // Ensure we have the current measure
        if (this.composition.currentMeasure >= this.composition.measures.length) {
            this.composition.addMeasure();
        }

        // Add a rest event (special event with no string/fret, just duration)
        this.composition.measures[this.composition.currentMeasure].events.push({
            time: this.composition.currentTime,
            string: null,
            fret: null,
            duration: duration,
            isRest: true
        });

        // Advance time
        this.composition.currentTime += duration;

        // Check if we need a new measure
        const beatsPerMeasure = this.composition.getBeatsPerMeasure();
        if (this.composition.currentTime >= beatsPerMeasure) {
            this.composition.currentTime = 0;
            this.composition.currentMeasure++;
            this.composition.addMeasure();
        }

        // Re-render and save
        this.renderComposition();
        this.autoSaveComposition();

        this.showTransientNotification(`Added ${duration === 0.25 ? 'quarter' : duration === 0.5 ? 'half' : duration === 1 ? 'whole' : 'eighth'} rest`);
    }

    addNoteToComposition() {
        if (this.fretboardState.isEmpty()) return;

        const notes = this.fretboardState.getNotes();

        // Check if we're editing a chord from TAB
        if (this.fretboardEditContext) {
            // Remove old events at this time
            const measure = this.composition.measures[this.fretboardEditContext.measureIndex];
            if (measure) {
                // Get the duration from the original notes
                const originalDuration = this.fretboardEditContext.originalNotes[0]?.duration || this.selectedDuration;

                measure.events = measure.events.filter(e =>
                    Math.abs(e.time - this.fretboardEditContext.time) >= 0.001
                );

                // Add updated notes at the same time position with original duration
                notes.forEach(note => {
                    measure.events.push({
                        time: this.fretboardEditContext.time,
                        string: note.string,
                        fret: note.fret,
                        duration: originalDuration,
                        leftFinger: null
                    });
                });

                this.showTransientNotification('Chord updated in TAB!');
            }

            // Clear edit context
            this.fretboardEditContext = null;

        } else if (this.editContext) {
            // Legacy edit context
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
        // Clear edit context when manually clearing fretboard
        this.fretboardEditContext = null;
        this.editContext = null;
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
        // Use alphaTab for rendering
        if (this.alphaTabAdapter) {
            this.alphaTabAdapter.render(this.composition);
        }

        // Fallback to old renderer if alphaTab not initialized
        if (!this.alphaTabAdapter && this.tabRenderer) {
            this.tabRenderer.render(this.composition);
        }
    }

    handleAlphaTabNoteClick(measureIndex, event, clickEvent, x, y) {
        // alphaTab note clicked: { measureIndex, event, x, y }

        // Stop propagation handled in alphaTabAdapter
        // Load all notes at this time onto fretboard for editing
        const measure = this.composition.measures[measureIndex];
        const notesAtSameTime = measure.events.filter(e =>
            Math.abs(e.time - event.time) < 0.001
        );

        this.fretboardState.clear();
        notesAtSameTime.forEach(note => {
            this.fretboardState.addNote(note.string, note.fret);
        });
        this.displayComposerFretboard();

        // Set fretboard edit context so Enter key knows to update this chord
        this.fretboardEditContext = {
            measureIndex,
            time: event.time,
            originalNotes: notesAtSameTime.map(n => ({...n})) // Store copy of original
        };

        this.showTransientNotification('Edit chord on fretboard, then press Enter to update');

        // Store radial edit context for radial menu
        this.radialEditContext = {
            measureIndex,
            event,
            noteElement: null // alphaTab SVG element
        };

        // Show radial menu at the provided position
        this.radialMenu.show(x, y, null, event.fret);
    }

    handleAlphaTabAddNote(measureIndex, stringNum, clickedTime, x, y) {
        // Check if clicking near existing note to add chord (same time)
        const measure = this.composition.measures[measureIndex];
        let targetTime = this.composition.currentTime;
        let targetMeasure = this.composition.currentMeasure;
        let isChord = false;

        if (measure) {

            // Find notes near clicked time (within 0.15 beats ~ 40px tolerance)
            const nearbyEvents = measure.events.filter(e =>
                Math.abs(e.time - clickedTime) < 0.15
            );

            if (nearbyEvents.length > 0) {
                // Add as chord - use same time as nearby note
                targetTime = nearbyEvents[0].time;
                targetMeasure = measureIndex;
                isChord = true;

                // Check if there's already a note on THIS string at this time
                const existingOnThisString = nearbyEvents.find(e => e.string === stringNum);

                if (existingOnThisString) {
                    // Editing existing note on this string (show current fret in radial menu)
                    this.radialEditContext = {
                        measureIndex: targetMeasure,
                        stringNum,
                        time: targetTime,
                        isNew: false,
                        event: existingOnThisString,
                        useCursor: false
                    };
                    this.radialMenu.show(x, y, null, existingOnThisString.fret);
                    return;
                }
            } else {
                // Adding sequentially at cursor
            }
        }

        this.radialEditContext = {
            measureIndex: targetMeasure,
            stringNum,
            time: targetTime,
            isNew: true,
            useCursor: !isChord // Only advance cursor if not chord
        };

        // Show radial menu for selecting fret (no current fret since it's new)
        this.radialMenu.show(x, y, null, null);
    }

    handleNoteClickForRadialEdit(measureIndex, event, clickEvent) {
        console.log('handleNoteClickForRadialEdit called:', { measureIndex, event });

        // Stop propagation to prevent click-outside handler
        if (clickEvent) {
            clickEvent.stopPropagation();
        }

        // Get the note element that was clicked
        const noteEl = document.querySelector(`.tab-note[data-time="${event.time}"][data-string="${event.string}"]`);

        if (noteEl) {
            const rect = noteEl.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            // Store editing context
            this.radialEditContext = {
                measureIndex,
                event,
                noteElement: noteEl
            };

            // Load all notes at this time onto fretboard for visual context
            const measure = this.composition.measures[measureIndex];
            const notesAtSameTime = measure.events.filter(e =>
                Math.abs(e.time - event.time) < 0.001
            );

            this.fretboardState.clear();
            notesAtSameTime.forEach(note => {
                this.fretboardState.addNote(note.string, note.fret);
            });
            this.displayComposerFretboard();

            // Show radial menu
            this.radialMenu.show(x, y, noteEl, event.fret);
        }
    }

    showRadialMenuForNewNote(x, y, measureIndex, stringNum, time) {
        // Store context for adding new note
        this.radialEditContext = {
            measureIndex,
            stringNum,
            time,
            isNew: true
        };

        // Show radial menu for selecting fret
        this.radialMenu.show(x, y, null, null);
    }

    handleRadialMenuSelection(fret, duration) {

        const ctx = this.radialEditContext;

        if (fret === 'DELETE') {
            // Delete note
            if (ctx && !ctx.isNew && ctx.event) {
                const measure = this.composition.measures[ctx.measureIndex];
                if (measure) {
                    // Remove the note
                    measure.events = measure.events.filter(e =>
                        !(e.string === ctx.event.string && Math.abs(e.time - ctx.event.time) < 0.001)
                    );

                    // Reflow to close the gap
                    this.reflowMeasure(ctx.measureIndex);

                    this.showTransientNotification(`Note deleted`);
                    this.renderComposition();
                    this.autoSaveComposition();
                }
            }
            this.radialEditContext = null;
            return;
        }

        if (fret === 'REST') {
            // Replace chord/note with rest
            if (ctx && !ctx.isNew && ctx.event && duration) {
                const measure = this.composition.measures[ctx.measureIndex];
                if (measure) {
                    // Find all notes at this time position (chord)
                    const notesAtTime = measure.events.filter(e =>
                        Math.abs(e.time - ctx.event.time) < 0.001
                    );

                    // Remove all notes at this position
                    measure.events = measure.events.filter(e =>
                        Math.abs(e.time - ctx.event.time) >= 0.001
                    );

                    // Add a rest at this position
                    measure.events.push({
                        time: ctx.event.time,
                        isRest: true,
                        duration: duration,
                        string: null, // Rests don't have a string
                        fret: null
                    });

                    // Sort events by time
                    measure.events.sort((a, b) => a.time - b.time);

                    this.showTransientNotification(`Replaced with ${this.formatDuration(duration)} rest`);
                    this.renderComposition();
                    this.autoSaveComposition();
                }
            }
            this.radialEditContext = null;
            return;
        }

        if (fret !== null && fret !== 'DELETE') {
            // Fret selected - add or update note
            if (ctx.isNew) {
                // Adding new note
                const measure = this.composition.measures[ctx.measureIndex];
                if (measure) {
                    // Check if there's already a note on this string at this time
                    const existingNoteOnString = measure.events.find(e =>
                        e.string === ctx.stringNum &&
                        Math.abs(e.time - ctx.time) < 0.001
                    );

                    if (existingNoteOnString) {
                        // Replace the existing note on this string (update fret)
                        existingNoteOnString.fret = fret;
                        this.showTransientNotification(`Updated string ${ctx.stringNum} to fret ${fret}`);
                    } else {
                        // Add new note to the chord
                        measure.events.push({
                            time: ctx.time,
                            string: ctx.stringNum,
                            fret: fret,
                            duration: this.selectedDuration,
                            leftFinger: null
                        });

                        // Sort events by time to ensure proper rendering order
                        measure.events.sort((a, b) => a.time - b.time);

                        // Advance cursor if this was a sequential add (not a click-to-position add)
                        if (ctx.useCursor) {
                            this.composition.currentTime += this.selectedDuration;

                            // Check if we need a new measure
                            const beatsPerMeasure = this.composition.getBeatsPerMeasure();
                            if (this.composition.currentTime >= beatsPerMeasure) {
                                this.composition.currentTime = 0;
                                this.composition.currentMeasure++;
                                this.composition.addMeasure();
                            }
                        }

                        this.showTransientNotification(`Added note: String ${ctx.stringNum}, Fret ${fret}`);
                    }
                }
            } else {
                // Editing existing note
                const measure = this.composition.measures[ctx.measureIndex];
                if (measure) {
                    const noteToEdit = measure.events.find(e =>
                        e.string === ctx.event.string &&
                        Math.abs(e.time - ctx.event.time) < 0.001
                    );

                    if (noteToEdit) {
                        noteToEdit.fret = fret;
                        this.showTransientNotification(`Updated to fret ${fret}`);

                        // Update fretboard display
                        this.fretboardState.clear();
                        const notesAtSameTime = measure.events.filter(e =>
                            Math.abs(e.time - ctx.event.time) < 0.001
                        );
                        notesAtSameTime.forEach(note => {
                            this.fretboardState.addNote(note.string, note.fret);
                        });
                        this.displayComposerFretboard();
                    }
                }
            }

            // Re-render and save
            this.renderComposition();
            this.autoSaveComposition();

            // Ensure there's space for next note by adding measures if needed
            this.ensureMeasureCapacity();
        }

        if (duration !== null) {
            // Check if this is from duration symbol click (durationEditContext) or radial menu (radialEditContext)
            const durationCtx = this.durationEditContext;

            if (durationCtx) {
                // Update all events at this time with new duration
                durationCtx.events.forEach(event => {
                    event.duration = duration;
                });

                // Reflow measure - recalculate all time positions after this change
                this.reflowMeasure(durationCtx.measureIndex);

                this.showTransientNotification(`Duration updated - measure reflowed`);
                this.durationEditContext = null;
            } else if (ctx && ctx.event) {
                // Duration selected from note edit radial menu
                // Update ALL notes at this time position (entire chord)
                const measure = this.composition.measures[ctx.measureIndex];
                if (measure) {
                    const notesAtTime = measure.events.filter(e =>
                        Math.abs(e.time - ctx.event.time) < 0.001
                    );

                    notesAtTime.forEach(note => {
                        note.duration = duration;
                    });

                    this.reflowMeasure(ctx.measureIndex);
                    this.showTransientNotification(`Duration updated to ${this.formatDuration(duration)}`);
                }
            }

            this.renderComposition();
            this.autoSaveComposition();
        }

        this.radialEditContext = null;
    }

    reflowMeasure(measureIndex) {
        // Comprehensive reflow: recalculates ALL events from this measure forward
        // Handles both overflow (notes pushed forward) and pullback (notes pulled back)
        // PRESERVES CHORD GROUPINGS: Events at the same time stay together

        if (measureIndex >= this.composition.measures.length) return;

        const beatsPerMeasure = this.composition.getBeatsPerMeasure();

        // Collect all events from this measure forward
        const allEvents = [];
        for (let i = measureIndex; i < this.composition.measures.length; i++) {
            const measure = this.composition.measures[i];
            measure.events.forEach(event => {
                allEvents.push({ ...event, originalMeasure: i });
            });
        }

        // Sort by original time position
        allEvents.sort((a, b) => {
            const timeA = (a.originalMeasure - measureIndex) * beatsPerMeasure + a.time;
            const timeB = (b.originalMeasure - measureIndex) * beatsPerMeasure + b.time;
            return timeA - timeB;
        });

        // Group events by time to preserve chords
        const eventGroups = [];
        let currentGroup = [];
        let lastAbsoluteTime = -1;

        allEvents.forEach(event => {
            const absoluteTime = (event.originalMeasure - measureIndex) * beatsPerMeasure + event.time;

            // If this event is at the same time as previous (chord), add to current group
            if (Math.abs(absoluteTime - lastAbsoluteTime) < 0.001) {
                currentGroup.push(event);
            } else {
                // New time position - save previous group and start new one
                if (currentGroup.length > 0) {
                    eventGroups.push(currentGroup);
                }
                currentGroup = [event];
                lastAbsoluteTime = absoluteTime;
            }
        });

        // Don't forget the last group
        if (currentGroup.length > 0) {
            eventGroups.push(currentGroup);
        }

        // Clear all measures from measureIndex forward
        for (let i = measureIndex; i < this.composition.measures.length; i++) {
            this.composition.measures[i].events = [];
        }

        // Redistribute event groups across measures
        let currentMeasureIdx = measureIndex;
        let currentTime = 0;

        eventGroups.forEach((group, groupIdx) => {
            // All events in a group (chord) have the same duration
            const groupDuration = group[0].duration;

            // Check if group would fit in current measure
            if (currentTime + groupDuration <= beatsPerMeasure) {
                // Fits in current measure
                group.forEach(event => {
                    event.time = currentTime;
                    this.composition.measures[currentMeasureIdx].events.push(event);
                });
                currentTime += groupDuration;
            } else if (currentTime === 0 && groupDuration > beatsPerMeasure) {
                // Special case: duration longer than measure
                // Cap it to measure length
                group.forEach(event => {
                    event.duration = beatsPerMeasure;
                    event.time = 0;
                    this.composition.measures[currentMeasureIdx].events.push(event);
                });
                currentTime = beatsPerMeasure;
            } else {
                // Move to next measure
                currentMeasureIdx++;
                currentTime = 0;

                // Ensure measure exists
                if (currentMeasureIdx >= this.composition.measures.length) {
                    this.composition.addMeasure();
                }

                // Add group to new measure
                group.forEach(event => {
                    event.time = currentTime;
                    this.composition.measures[currentMeasureIdx].events.push(event);
                });
                currentTime += groupDuration;
            }
        });

        // Clean up any trailing empty measures (except keep one for editing)
        while (this.composition.measures.length > currentMeasureIdx + 2) {
            const lastMeasure = this.composition.measures[this.composition.measures.length - 1];
            if (lastMeasure.events.length === 0) {
                this.composition.measures.pop();
            } else {
                break;
            }
        }
    }

    handleRadialMenuCancel() {
        // Clear fretboard if we were editing (but NOT if we're in fretboard edit mode)
        if (this.radialEditContext && !this.radialEditContext.isNew && !this.fretboardEditContext) {
            this.fretboardState.clear();
            this.displayComposerFretboard();
        }

        this.radialEditContext = null;
    }

    ensureMeasureCapacity() {
        // Make sure we always have at least one empty measure at the end
        // This ensures users can always add more notes
        const lastMeasure = this.composition.measures[this.composition.measures.length - 1];

        if (!lastMeasure || lastMeasure.events.length > 0) {
            // Last measure has notes, add a new empty one
            this.composition.addMeasure();
            this.renderComposition();
        }
    }

    handleDurationSymbolClick(measureIndex, time, isRest, clickEvent) {
        if (clickEvent) {
            clickEvent.stopPropagation();
        }

        // Find the events at this time position
        const measure = this.composition.measures[measureIndex];
        if (!measure) return;

        const eventsAtTime = measure.events.filter(e =>
            Math.abs(e.time - time) < 0.001
        );

        if (eventsAtTime.length === 0) return;

        const currentDuration = eventsAtTime[0].duration;

        // Get click position for menu
        const durationSymbol = clickEvent.target.closest('.duration-symbol');
        if (!durationSymbol) return;

        const rect = durationSymbol.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Store context for duration editing
        this.durationEditContext = {
            measureIndex,
            time,
            isRest,
            events: eventsAtTime
        };

        // Show duration-only radial menu
        this.radialMenu.showDurationMenu(x, y, currentDuration);
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
        // Prompt for name if composition doesn't have one or is still "Untitled"
        if (!this.composition.title || this.composition.title === 'Untitled') {
            const name = prompt('Name your composition:', this.composition.title);
            if (!name) return; // User cancelled
            this.composition.title = name.trim();
        }

        // Save to localStorage with composition name as part of key
        const data = this.composition.serialize();
        const storageKey = `guitarHub_composition_${this.composition.title}`;
        localStorage.setItem(storageKey, data);

        // Update list of saved compositions
        this.updateSavedCompositionsList(this.composition.title);

        // Update UI title
        this.updateCompositionTitle();

        console.log('Composition saved:', this.composition.title);
        if (showMessage) {
            this.addSystemMessage(`Composition "${this.composition.title}" saved!`);
        }
    }

    updateSavedCompositionsList(compositionName) {
        // Get existing list
        const savedList = JSON.parse(localStorage.getItem('guitarHub_compositions_list') || '[]');

        // Add current composition if not already in list
        if (!savedList.includes(compositionName)) {
            savedList.push(compositionName);
            localStorage.setItem('guitarHub_compositions_list', JSON.stringify(savedList));
        }
    }

    getSavedCompositionsList() {
        return JSON.parse(localStorage.getItem('guitarHub_compositions_list') || '[]');
    }

    updateCompositionTitle() {
        const titleElement = document.getElementById('composition-title');
        if (titleElement) {
            titleElement.textContent = this.composition.title;
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
        // Try to load the most recently saved composition
        const savedList = this.getSavedCompositionsList();
        if (savedList.length > 0) {
            // Load the last saved composition
            const lastComposition = savedList[savedList.length - 1];
            this.loadCompositionByName(lastComposition);
        }
    }

    async loadSharedComposition(shareId) {
        try {
            // Get edit token if we have it
            const shareInfo = localStorage.getItem(`guitarHub_share_id_${shareId}`);
            const editToken = shareInfo ? JSON.parse(shareInfo).editToken : null;

            // Call backend API
            const endpoint = this.apiEndpoint.replace('/api/assistant', `/api/share/${shareId}`);
            const url = editToken ? `${endpoint}?editToken=${encodeURIComponent(editToken)}` : endpoint;

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    this.showTransientNotification('Share link expired or not found.');
                } else {
                    throw new Error(`Failed to load share: ${response.status}`);
                }
                return;
            }

            const result = await response.json();

            // Load the composition
            this.loadCompositionFromData(result.composition, result.isAuthor, shareId, editToken);

            // Show notification
            const authorMsg = result.isAuthor ? ' (You are the author - edits will update this share)' : ' (Read-only - Share button will create your own copy)';
            const message = (window.i18n?.t('composer.loadedFromURL') || 'Composition loaded from shared link!') + authorMsg;

            setTimeout(() => {
                this.showTransientNotification(message);
            }, 500);

            console.log('Loaded shared composition:', shareId, 'isAuthor:', result.isAuthor);

        } catch (error) {
            console.error('Error loading shared composition:', error);
            this.showTransientNotification('Failed to load share. Backend may be offline.');
        }
    }

    loadCompositionFromData(compositionData, isAuthor = false, shareId = null, editToken = null) {
        // Create composition from data
        const composition = new TabComposition();
        composition.title = compositionData.title;
        composition.tempo = compositionData.tempo;
        composition.timeSignature = compositionData.timeSignature;
        composition.measures = compositionData.measures;

        // Set cursor to end
        if (composition.measures.length > 0) {
            composition.currentMeasure = composition.measures.length - 1;
            const lastMeasure = composition.measures[composition.currentMeasure];
            let maxTime = 0;

            lastMeasure.events.forEach(event => {
                const endTime = event.time + event.duration;
                if (endTime > maxTime) {
                    maxTime = endTime;
                }
            });

            composition.currentTime = maxTime;

            const beatsPerMeasure = composition.getBeatsPerMeasure();
            if (composition.currentTime >= beatsPerMeasure) {
                composition.currentTime = 0;
                composition.currentMeasure++;
                composition.addMeasure();
            }
        }

        this.composition = composition;

        // Store share info if this is a backend share
        if (shareId && isAuthor && editToken) {
            localStorage.setItem(`guitarHub_share_id_${shareId}`, JSON.stringify({ editToken }));
            this.saveShareInfo(shareId, editToken);
        }

        this.updateCompositionTitle();
        this.updateTempoDisplay();
        this.renderComposition();
    }

    loadCompositionByName(name) {
        const storageKey = `guitarHub_composition_${name}`;
        const data = localStorage.getItem(storageKey);

        if (data) {
            try {
                this.composition = TabComposition.deserialize(data);
                this.updateCompositionTitle();
                this.updateTempoDisplay();
                this.renderComposition();
                console.log('Composition loaded:', name);
            } catch (e) {
                console.error('Error loading composition:', e);
            }
        }
    }

    updateTempoDisplay() {
        const tempoInput = document.getElementById('composition-tempo');
        if (tempoInput) {
            tempoInput.value = this.composition.tempo;
        }
    }

    async shareComposition() {
        if (this.composition.measures.length === 0) {
            this.showTransientNotification('Nothing to share! Compose something first.');
            return;
        }

        try {
            // Show loading state
            this.showTransientNotification('Creating share link...');

            // Get current share info if this composition was loaded from a share
            const currentShareInfo = this.getShareInfo();

            // Call backend API to create/update share
            const endpoint = this.apiEndpoint.replace('/api/assistant', '/api/share');

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    composition: {
                        title: this.composition.title,
                        tempo: this.composition.tempo,
                        timeSignature: this.composition.timeSignature,
                        measures: this.composition.measures
                    },
                    shareId: currentShareInfo?.shareId,
                    editToken: currentShareInfo?.editToken
                })
            });

            if (!response.ok) {
                throw new Error(`Share API error: ${response.status}`);
            }

            const result = await response.json();

            // Store edit token locally
            this.saveShareInfo(result.shareId, result.editToken);

            // Generate shareable URL
            const shareURL = this.generateBackendShareURL(result.shareId);

            // Copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareURL);

                const message = result.isNew
                    ? (window.i18n?.t('composer.shareSuccess') || 'Link copied to clipboard!')
                    : 'Share link updated and copied!';

                this.showTransientNotification(message + ` (Expires: ${new Date(result.expiresAt).toLocaleDateString()})`);
            } else {
                // Fallback for browsers that don't support clipboard API
                this.showShareURLDialog(shareURL);
            }

            console.log('Share created/updated:', result);

        } catch (error) {
            console.error('Error sharing composition:', error);
            this.showTransientNotification('Failed to create share link. Check if backend is running.');
        }
    }

    generateBackendShareURL(shareId) {
        // Build clean URL with share ID
        let pathname = window.location.pathname;
        if (pathname.endsWith('index.html')) {
            pathname = pathname.replace(/index\.html$/, '');
        }
        if (!pathname.endsWith('/')) {
            pathname += '/';
        }

        const baseURL = window.location.origin + pathname;
        return `${baseURL}?share=${shareId}#assistant/composer`;
    }

    getShareInfo() {
        // Get stored share info for this composition
        const key = `guitarHub_share_${this.composition.title}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }

    saveShareInfo(shareId, editToken) {
        // Store share info for this composition
        const key = `guitarHub_share_${this.composition.title}`;
        localStorage.setItem(key, JSON.stringify({ shareId, editToken }));
    }

    showShareURLDialog(url) {
        // Get translated message
        const message = window.i18n?.t('composer.shareError') || 'Failed to copy link. Please copy it manually:';

        // Show prompt with URL for manual copying
        prompt(message, url);
    }

    exportComposition() {
        const textTab = this.composition.exportAsText();
        const blob = new Blob([textTab], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        // Use composition title, sanitize for filename
        const filename = (this.composition.title || 'composition')
            .replace(/[^a-z0-9_\-]/gi, '_') // Replace invalid chars with underscore
            .replace(/_+/g, '_') // Replace multiple underscores with single
            .toLowerCase();

        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        a.click();

        URL.revokeObjectURL(url);
        this.addSystemMessage(`Exported "${this.composition.title}" as ${filename}.txt`);
    }

    toggleLoadCompositionsList() {
        const listContainer = document.getElementById('saved-compositions-list');
        if (!listContainer) return;

        if (listContainer.style.display === 'none') {
            // Show list and populate it
            this.populateSavedCompositionsList();
            listContainer.style.display = 'block';
        } else {
            // Hide list
            listContainer.style.display = 'none';
        }
    }

    populateSavedCompositionsList() {
        const listContainer = document.getElementById('saved-compositions-list');
        if (!listContainer) return;

        const savedList = this.getSavedCompositionsList();

        if (savedList.length === 0) {
            listContainer.innerHTML = '<div class="no-compositions">No saved compositions yet</div>';
            return;
        }

        listContainer.innerHTML = '';

        savedList.forEach(name => {
            const item = document.createElement('div');
            item.className = 'composition-list-item';
            item.textContent = name;

            item.addEventListener('click', () => {
                this.loadCompositionByName(name);
                listContainer.style.display = 'none';
                this.showTransientNotification(`Loaded "${name}"`);
            });

            listContainer.appendChild(item);
        });
    }

    clearComposition() {
        // Reset to new composition (don't delete saved compositions)
        this.composition = new TabComposition();
        this.composition.title = 'Untitled';
        this.updateCompositionTitle();
        this.renderComposition();
        this.clearComposerFretboard();
        this.showTransientNotification('Started new composition! Previous work is still saved.');
    }

    showTabAdditionsPreview(tabAdditions, isReplacement = false) {
        // Create a preview message with Accept/Reject buttons
        const chatMessages = document.getElementById('chat-messages');
        const previewDiv = document.createElement('div');
        previewDiv.className = 'chat-message system-message tab-preview';

        const content = document.createElement('div');
        content.className = 'message-content';

        const actionText = isReplacement
            ? `💡 GPT suggested ${tabAdditions.length} notes to replace your selection.`
            : `💡 GPT suggested ${tabAdditions.length} notes to add to your composition.`;

        content.innerHTML = `
            <p>${actionText}</p>
            <div class="preview-actions">
                <button class="preview-btn accept">✓ ${isReplacement ? 'Replace Selection' : 'Add to Composition'}</button>
                <button class="preview-btn reject">✗ Decline</button>
            </div>
        `;

        // Accept button
        content.querySelector('.accept').addEventListener('click', () => {
            if (isReplacement) {
                this.replaceSelectedNotes(tabAdditions);
            } else {
                this.applyTabAdditions(tabAdditions);
            }
            previewDiv.remove();
            this.showTransientNotification(isReplacement ? 'Selection replaced!' : 'Notes added to composition!');
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

    replaceSelectedNotes(newNotes) {
        if (this.selectedNotes.length === 0) return;

        // Group selected notes by measure
        const byMeasure = {};
        this.selectedNotes.forEach(note => {
            if (!byMeasure[note.measureIndex]) {
                byMeasure[note.measureIndex] = [];
            }
            byMeasure[note.measureIndex].push(note);
        });

        // Find the earliest selected note (where to insert replacements)
        const firstNote = this.selectedNotes.reduce((earliest, note) => {
            const noteAbsTime = this.getAbsoluteTime(note.measureIndex, note.time);
            const earliestAbsTime = this.getAbsoluteTime(earliest.measureIndex, earliest.time);
            return noteAbsTime < earliestAbsTime ? note : earliest;
        });

        // Remove all selected notes from their measures
        Object.entries(byMeasure).forEach(([measureIdx, notes]) => {
            const measure = this.composition.measures[measureIdx];
            if (measure) {
                notes.forEach(note => {
                    measure.events = measure.events.filter(e =>
                        !(Math.abs(e.time - note.time) < 0.001 && e.string === note.string)
                    );
                });
            }
        });

        // Clear selection visually
        document.querySelectorAll('.tab-note.selected').forEach(note => {
            note.classList.remove('selected');
        });
        this.selectedNotes = [];

        // Insert new notes at the position of the first selected note
        let currentTime = firstNote.time;
        let currentMeasure = firstNote.measureIndex;

        newNotes.forEach(note => {
            if (currentMeasure >= this.composition.measures.length) {
                this.composition.addMeasure();
            }

            this.composition.measures[currentMeasure].events.push({
                time: currentTime,
                string: note.string,
                fret: note.fret,
                duration: note.duration || 0.25,
                leftFinger: null
            });

            currentTime += (note.duration || 0.25);

            const beatsPerMeasure = this.composition.getBeatsPerMeasure();
            if (currentTime >= beatsPerMeasure) {
                currentTime = 0;
                currentMeasure++;
            }
        });

        // Re-render and save
        this.renderComposition();
        this.autoSaveComposition();
    }

    applyTabAdditions(tabAdditions) {
        // Sort by time to maintain sequence
        const sortedAdditions = [...tabAdditions].sort((a, b) => (a.time || 0) - (b.time || 0));

        // Group notes by time (to handle chords properly)
        const notesByTime = {};
        sortedAdditions.forEach(note => {
            const time = note.time || 0;
            if (!notesByTime[time]) {
                notesByTime[time] = [];
            }
            notesByTime[time].push(note);
        });

        // Get sorted time positions
        const times = Object.keys(notesByTime).map(Number).sort((a, b) => a - b);

        // Add each group of notes (chords or single notes) to the composition
        let currentTime = this.composition.currentTime;
        let currentMeasure = this.composition.currentMeasure;

        times.forEach(relativeTime => {
            const notesAtTime = notesByTime[relativeTime];

            // Ensure we have a measure
            if (this.composition.measures.length === 0) {
                this.composition.addMeasure();
            }

            // Add all notes at this time position (chord or single note)
            notesAtTime.forEach(note => {
                this.composition.measures[currentMeasure].events.push({
                    time: currentTime,
                    string: note.string,
                    fret: note.fret,
                    duration: note.duration || 0.25,
                    leftFinger: null
                });
            });

            // Advance time ONCE per chord (use the duration from the first note)
            const duration = notesAtTime[0].duration || 0.25;
            currentTime += duration;

            // Check if we need a new measure
            const beatsPerMeasure = this.composition.getBeatsPerMeasure();
            if (currentTime >= beatsPerMeasure) {
                currentTime -= beatsPerMeasure;
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

    copySelectedNotes() {
        if (this.selectedNotes.length === 0) return;

        // Find the earliest note to use as reference point
        const sortedNotes = [...this.selectedNotes].sort((a, b) => {
            const aAbs = this.getAbsoluteTime(a.measureIndex, a.time);
            const bAbs = this.getAbsoluteTime(b.measureIndex, b.time);
            return aAbs - bAbs;
        });

        const firstNote = sortedNotes[0];
        const referenceTime = this.getAbsoluteTime(firstNote.measureIndex, firstNote.time);

        // Store notes with relative positions from the first note
        this.clipboard = {
            notes: this.selectedNotes.map(note => ({
                string: note.string,
                fret: note.fret,
                duration: note.duration,
                relativeTime: this.getAbsoluteTime(note.measureIndex, note.time) - referenceTime
            }))
        };

        this.showTransientNotification(`Copied ${this.selectedNotes.length} notes`);
    }

    pasteNotes() {
        if (!this.clipboard || this.clipboard.notes.length === 0) return;

        // Paste at current cursor position
        let currentTime = this.composition.currentTime;
        let currentMeasure = this.composition.currentMeasure;

        // Ensure we have a measure
        if (currentMeasure >= this.composition.measures.length) {
            this.composition.addMeasure();
        }

        const beatsPerMeasure = this.composition.getBeatsPerMeasure();

        // Add each note from clipboard
        this.clipboard.notes.forEach(clipNote => {
            const noteTime = currentTime + clipNote.relativeTime;
            let targetMeasure = currentMeasure;
            let targetTime = noteTime;

            // Handle measure overflow
            while (targetTime >= beatsPerMeasure) {
                targetTime -= beatsPerMeasure;
                targetMeasure++;
                if (targetMeasure >= this.composition.measures.length) {
                    this.composition.addMeasure();
                }
            }

            // Add the note
            this.composition.measures[targetMeasure].events.push({
                time: targetTime,
                string: clipNote.string,
                fret: clipNote.fret,
                duration: clipNote.duration,
                leftFinger: null
            });
        });

        // Advance cursor to end of pasted section
        const lastNote = this.clipboard.notes[this.clipboard.notes.length - 1];
        const totalDuration = lastNote.relativeTime + lastNote.duration;
        this.composition.currentTime = currentTime + totalDuration;

        // Handle measure overflow for cursor
        while (this.composition.currentTime >= beatsPerMeasure) {
            this.composition.currentTime -= beatsPerMeasure;
            this.composition.currentMeasure++;
            if (this.composition.currentMeasure >= this.composition.measures.length) {
                this.composition.addMeasure();
            }
        }

        this.showTransientNotification(`Pasted ${this.clipboard.notes.length} notes`);
        this.renderComposition();
        this.autoSaveComposition();
    }

    deleteSelectedNotes() {
        console.log('deleteSelectedNotes called, selectedNotes:', this.selectedNotes);
        if (this.selectedNotes.length === 0) {
            console.log('No selected notes, exiting');
            return;
        }

        // Group selected notes by measure
        const byMeasure = {};
        this.selectedNotes.forEach(note => {
            if (!byMeasure[note.measureIndex]) {
                byMeasure[note.measureIndex] = [];
            }
            byMeasure[note.measureIndex].push(note);
        });

        // Remove selected notes from their measures
        Object.entries(byMeasure).forEach(([measureIdx, notes]) => {
            const measure = this.composition.measures[measureIdx];
            if (measure) {
                notes.forEach(note => {
                    measure.events = measure.events.filter(e =>
                        !(Math.abs(e.time - note.time) < 0.001 && e.string === note.string)
                    );
                });
            }
        });

        // Clear selection array (so render doesn't re-select)
        this.selectedNotes = [];

        this.showTransientNotification('Deleted selected notes');

        // Render composition (this is async for AlphaTab)
        this.renderComposition();
        this.autoSaveComposition();

        // Clear visual selection immediately (don't wait for render)
        // This gives instant feedback even though AlphaTab render is async
        document.querySelectorAll('.tab-note.selected, text.selected').forEach(note => {
            note.classList.remove('selected');
        });
    }

    getAbsoluteTime(measureIndex, time) {
        const beatsPerMeasure = this.composition.getBeatsPerMeasure();
        return measureIndex * beatsPerMeasure + time;
    }

    toggleCompositionPlayback() {
        if (this.isPlayingComposition) {
            this.stopCompositionPlayback();
        } else {
            this.startCompositionPlayback();
        }
    }

    startCompositionPlayback() {
        if (!this.composition || this.composition.measures.length === 0) {
            this.showTransientNotification('No composition to play!');
            return;
        }

        this.isPlayingComposition = true;
        this.currentPlaybackMeasure = 0;
        this.currentPlaybackTime = 0;

        // Update button to show pause icon
        const playBtn = document.getElementById('play-composition-btn');
        if (playBtn) {
            playBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
            playBtn.title = 'Pause';
        }

        this.scheduleNextNote();
    }

    scheduleNextNote() {
        if (!this.isPlayingComposition) return;

        // Get all events from all measures in chronological order
        const allEvents = [];
        this.composition.measures.forEach((measure, measureIdx) => {
            measure.events.forEach(event => {
                if (event && event.time !== null && event.time !== undefined) {
                    allEvents.push({
                        ...event,
                        measureIndex: measureIdx,
                        absoluteTime: this.getAbsoluteTime(measureIdx, event.time)
                    });
                }
            });
        });

        // Sort by absolute time
        allEvents.sort((a, b) => a.absoluteTime - b.absoluteTime);

        if (allEvents.length === 0) {
            this.stopCompositionPlayback();
            return;
        }

        // Play each event
        this.playEventsSequence(allEvents, 0);
    }

    getAbsoluteTime(measureIndex, timeInMeasure) {
        const beatsPerMeasure = this.composition.getBeatsPerMeasure();
        return (measureIndex * beatsPerMeasure) + timeInMeasure;
    }

    playEventsSequence(events, index) {
        if (!this.isPlayingComposition || index >= events.length) {
            this.stopCompositionPlayback();
            return;
        }

        const event = events[index];
        const nextEvent = events[index + 1];

        // Only play and highlight if not a rest
        if (!event.isRest) {
            // Highlight current note
            this.highlightPlayingNote(event.measureIndex, event.time);

            // Play the note
            const freq = this.guitar.getFrequency(event.string, event.fret);
            if (freq) {
                this.audio.playNote(freq, event.duration * 1000);
            }
        }

        // Calculate delay until next note (same for notes and rests)
        const delay = nextEvent
            ? (nextEvent.absoluteTime - event.absoluteTime) * (60000 / this.composition.tempo)
            : event.duration * (60000 / this.composition.tempo);

        // Schedule next note
        this.playbackTimeout = setTimeout(() => {
            this.playEventsSequence(events, index + 1);
        }, delay);
    }

    highlightPlayingNote(measureIndex, time) {
        // Remove previous highlights
        document.querySelectorAll('.tab-note.playing').forEach(note => {
            note.classList.remove('playing');
        });

        // Find and highlight current notes
        const notes = document.querySelectorAll(`.tab-note[data-time="${time}"]`);
        const measure = document.querySelector(`[data-measure-index="${measureIndex}"]`);

        if (measure) {
            measure.querySelectorAll(`.tab-note[data-time="${time}"]`).forEach(note => {
                note.classList.add('playing');
            });
        }
    }

    stopCompositionPlayback() {
        this.isPlayingComposition = false;

        if (this.playbackTimeout) {
            clearTimeout(this.playbackTimeout);
            this.playbackTimeout = null;
        }

        // Clear highlights
        document.querySelectorAll('.tab-note.playing').forEach(note => {
            note.classList.remove('playing');
        });

        // Update button to show play icon
        const playBtn = document.getElementById('play-composition-btn');
        if (playBtn) {
            playBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
            playBtn.title = 'Play composition';
        }
    }

    cleanup() {
        this.stopPlayback();
        this.stopCompositionPlayback();
    }
}
