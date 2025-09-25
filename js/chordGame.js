class ChordGame {
    constructor(guitar, statistics, chordTheory) {
        this.guitar = guitar;
        this.statistics = statistics;
        this.chordTheory = chordTheory;
        this.currentQuestion = null;
        this.currentMode = 'chord-fret-to-name';
        this.isSessionActive = false;
        this.isPaused = false;
        this.selectedPositions = [];
        
        this.score = {
            correct: 0,
            incorrect: 0,
            streak: 0
        };
        
        this.timerInterval = null;
        this.startTime = null;
        this.pausedTime = 0;
        this.pauseStartTime = null;
        
        // Default settings - will be updated based on HTML checkboxes
        this.settings = {
            enabledTypes: [],  // Will be populated from HTML
            minFret: 0,
            maxFret: 12,
            includeBarre: true  // Changed to true by default since many advanced chords use barre
        };
        this.showMeUsed = false;
        
        this.fretboardDisplayFretToName = null;
        this.fretboardDisplayNameToFret = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.initializeFretboards();
    }
    
    initializeFretboards() {
        // Initialize fretboard for fret-to-name mode (showing chord shape)
        if (!this.fretboardDisplayFretToName) {
            this.fretboardDisplayFretToName = new FretboardDisplay('fretboard-chord-fret-to-name', false, 15);
        }
        
        // Initialize fretboard for name-to-fret mode (interactive)
        if (!this.fretboardDisplayNameToFret) {
            this.fretboardDisplayNameToFret = new FretboardDisplay('fretboard-chord-name-to-fret', true, 15);
            if (this.fretboardDisplayNameToFret) {
                this.fretboardDisplayNameToFret.setClickHandler((string, fret) => {
                    this.handleFretboardClick(string, fret);
                });
            }
        }
    }
    
    setupEventListeners() {
        // Accordion toggles
        document.querySelectorAll('.accordion-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const target = toggle.dataset.target;
                const content = document.getElementById(target);
                const icon = toggle.querySelector('.accordion-icon');
                
                if (content) {
                    const isOpen = content.classList.contains('show');
                    
                    if (isOpen) {
                        content.classList.remove('show');
                        toggle.classList.remove('active');
                        icon.textContent = '▶';
                    } else {
                        content.classList.add('show');
                        toggle.classList.add('active');
                        icon.textContent = '▼';
                    }
                }
            });
        });
        
        // Mode selection
        document.querySelectorAll('.chord-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isSessionActive) return;
                
                document.querySelectorAll('.chord-mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
                
                // Keep the start screen visible until session starts
                document.querySelectorAll('#chords-module .game-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById('chord-start-screen').classList.add('active');
            });
        });
        
        // Start button
        const startBtn = document.getElementById('chord-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startSession());
        }
        
        // Session controls
        const pauseBtn = document.getElementById('chord-pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseSession());
        }
        
        const resumeBtn = document.getElementById('chord-resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeSession());
        }
        
        const resumeOverlayBtn = document.getElementById('chord-resume-overlay-btn');
        if (resumeOverlayBtn) {
            resumeOverlayBtn.addEventListener('click', () => this.resumeSession());
        }
        
        const stopBtn = document.getElementById('chord-stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.endSession());
        }
        
        // Chord selection buttons for fret-to-name mode
        document.querySelectorAll('.chord-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isSessionActive || this.isPaused) return;
                if (this.currentMode !== 'chord-fret-to-name') return;
                
                const selectedChord = e.target.dataset.chord;
                this.checkChordAnswer(selectedChord);
            });
        });
        
        // Clear button for name-to-fret mode
        const clearBtn = document.getElementById('clear-chord-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelection());
        }
        
        // Submit button for name-to-fret mode
        const submitBtn = document.getElementById('submit-chord-selection');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (this.selectedPositions.length > 0) {
                    this.checkNameToFretAnswer();
                }
            });
        }
        
        // Settings
        document.querySelectorAll('.chord-type-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => this.updateEnabledTypes());
        });
        
        const includeBarreToggle = document.getElementById('include-barre');
        if (includeBarreToggle) {
            includeBarreToggle.addEventListener('change', (e) => {
                this.settings.includeBarre = e.target.checked;
                this.saveSettings();
            });
        }
        
        // Fret range settings
        const minFretInput = document.getElementById('chord-min-fret');
        const maxFretInput = document.getElementById('chord-max-fret');
        
        if (minFretInput) {
            minFretInput.addEventListener('change', (e) => {
                this.settings.minFret = parseInt(e.target.value);
                this.saveSettings();
            });
        }
        
        if (maxFretInput) {
            maxFretInput.addEventListener('change', (e) => {
                this.settings.maxFret = parseInt(e.target.value);
                this.saveSettings();
            });
        }
    }
    
    startSession() {
        this.isSessionActive = true;
        this.score = { correct: 0, incorrect: 0, streak: 0 };
        this.startTime = Date.now();
        this.pausedTime = 0;
        
        // Update UI
        document.getElementById('chord-correct-count').textContent = '0';
        document.getElementById('chord-incorrect-count').textContent = '0';
        document.getElementById('chord-streak-count').textContent = '0';
        
        document.getElementById('chord-start-screen').classList.remove('active');
        document.getElementById('chord-session-controls').style.display = 'flex';
        
        if (this.currentMode === 'chord-fret-to-name') {
            document.getElementById('chord-fret-to-name-game').classList.add('active');
        } else {
            document.getElementById('chord-name-to-fret-game').classList.add('active');
            
            // Setup Show me button event listeners
            const showMeBtn = document.getElementById('show-me-chord');
            const nextBtn = document.getElementById('next-chord');
            if (showMeBtn && !showMeBtn.hasAttribute('data-listener-attached')) {
                showMeBtn.setAttribute('data-listener-attached', 'true');
                showMeBtn.addEventListener('click', () => {
                    console.log('Show me chord clicked!');
                    this.showAnswer();
                });
            }
            if (nextBtn && !nextBtn.hasAttribute('data-listener-attached')) {
                nextBtn.setAttribute('data-listener-attached', 'true');
                nextBtn.addEventListener('click', () => this.generateQuestion());
            }
        }
        
        this.statistics.startNewChordSession();
        this.generateQuestion();
        this.startTimer();
    }
    
    endSession() {
        if (!this.isSessionActive) return;
        
        this.isSessionActive = false;
        this.resetTimer();
        this.clearSelection();
        this.clearFeedback();
        
        // Reset UI
        document.getElementById('chord-session-controls').style.display = 'none';
        document.getElementById('chord-pause-overlay').style.display = 'none';
        
        document.querySelectorAll('#chords-module .game-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById('chord-start-screen').classList.add('active');
        
        this.statistics.endChordSession();
    }
    
    pauseSession() {
        if (!this.isSessionActive || this.isPaused) return;
        
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        document.getElementById('chord-pause-btn').style.display = 'none';
        document.getElementById('chord-resume-btn').style.display = 'block';
        document.getElementById('chord-pause-overlay').style.display = 'flex';
    }
    
    resumeSession() {
        if (!this.isSessionActive || !this.isPaused) return;
        
        this.isPaused = false;
        
        if (this.pauseStartTime) {
            this.pausedTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        
        document.getElementById('chord-pause-btn').style.display = 'block';
        document.getElementById('chord-resume-btn').style.display = 'none';
        document.getElementById('chord-pause-overlay').style.display = 'none';
        
        if (this.startTime) {
            this.startTimer();
        }
    }
    
    generateQuestion() {
        if (!this.isSessionActive) return;
        
        this.clearSelection();
        this.showMeUsed = false;
        
        // Reset show me/next buttons
        const showMeBtn = document.getElementById('show-me-chord');
        const nextBtn = document.getElementById('next-chord');
        if (showMeBtn && this.currentMode === 'chord-name-to-fret') {
            showMeBtn.style.display = 'inline-block';
            nextBtn.style.display = 'none';
        }
        
        if (this.currentMode === 'chord-fret-to-name') {
            this.generateFretToNameQuestion();
        } else {
            this.generateNameToFretQuestion();
        }
    }
    
    generateFretToNameQuestion() {
        let enabledTypes = [...this.settings.enabledTypes];
        
        let chord;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            chord = this.chordTheory.getRandomChord(enabledTypes);
            attempts++;
            
            if (!chord) {
                console.log('No chord returned from getRandomChord');
                break;
            }
            
            // Check if chord has barre and it's not enabled
            if (!this.settings.includeBarre && chord.barrePosition) {
                console.log('Skipping barre chord:', chord.name);
                continue;
            }
            
            // Check if chord is within fret range
            const frettedPositions = chord.positions.filter(p => p.fret > 0);
            if (frettedPositions.length === 0) {
                console.log('Skipping chord with no fretted positions:', chord.name);
                continue; // Skip if no fretted positions
            }
            
            const maxFret = Math.max(...frettedPositions.map(p => p.fret));
            const minFret = Math.min(...frettedPositions.map(p => p.fret));
            
            console.log(`Chord ${chord.name}: frets ${minFret}-${maxFret}, settings: ${this.settings.minFret}-${this.settings.maxFret}`);
            
            if (minFret >= this.settings.minFret && maxFret <= this.settings.maxFret) {
                console.log('Found valid chord:', chord.name);
                break; // Found a valid chord
            } else {
                console.log('Chord out of range:', chord.name);
            }
        } while (attempts < maxAttempts);
        
        if (!chord || attempts >= maxAttempts) {
            console.log('Failed to find chord:', {
                enabledTypes,
                minFret: this.settings.minFret,
                maxFret: this.settings.maxFret,
                includeBarre: this.settings.includeBarre,
                attempts
            });
            this.showFeedback('No chords available with current settings. Try adjusting fret range or enabling more chord types.', false);
            return;
        }
        
        this.currentQuestion = {
            type: 'chord-fret-to-name',
            chordKey: chord.key,
            chordName: chord.name,
            positions: chord.positions,
            muted: chord.muted,
            startTime: Date.now()
        };
        
        // Display the chord on the fretboard
        this.fretboardDisplayFretToName.clearHighlights();
        this.fretboardDisplayFretToName.highlightMultiplePositions(chord.positions);
        
        // Show muted strings with X marker
        this.showMutedStrings(chord.muted, 'fretboard-chord-fret-to-name');
    }
    
    generateNameToFretQuestion() {
        let enabledTypes = [...this.settings.enabledTypes];
        
        let chord;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            chord = this.chordTheory.getRandomChord(enabledTypes);
            attempts++;
            
            if (!chord) break;
            
            // Check if chord has barre and it's not enabled
            if (!this.settings.includeBarre && chord.barrePosition) continue;
            
            // Check if chord is within fret range
            const frettedPositions = chord.positions.filter(p => p.fret > 0);
            if (frettedPositions.length === 0) continue; // Skip if no fretted positions
            
            const maxFret = Math.max(...frettedPositions.map(p => p.fret));
            const minFret = Math.min(...frettedPositions.map(p => p.fret));
            
            if (minFret >= this.settings.minFret && maxFret <= this.settings.maxFret) {
                break; // Found a valid chord
            }
        } while (attempts < maxAttempts);
        
        if (!chord || attempts >= maxAttempts) {
            console.log('Failed to find chord:', {
                enabledTypes,
                minFret: this.settings.minFret,
                maxFret: this.settings.maxFret,
                includeBarre: this.settings.includeBarre,
                attempts
            });
            this.showFeedback('No chords available with current settings. Try adjusting fret range or enabling more chord types.', false);
            return;
        }
        
        // Separate fretted positions from open strings
        const frettedPositions = chord.positions.filter(pos => pos.fret > 0);
        const openStrings = chord.positions.filter(pos => pos.fret === 0).map(pos => pos.string);
        
        this.currentQuestion = {
            type: 'chord-name-to-fret',
            chordKey: chord.key,
            chordName: chord.name,
            positions: chord.positions,
            frettedPositions: frettedPositions,  // Only positions that need to be clicked
            openStrings: openStrings,  // Strings that should remain open
            muted: chord.muted,
            startTime: Date.now()
        };
        
        // Display the chord name
        document.getElementById('target-chord').textContent = chord.name;
        
        // Clear the fretboard
        this.fretboardDisplayNameToFret.clearHighlights();
        this.fretboardDisplayNameToFret.setFretRange(0, this.settings.maxFret);
        
        // Show which strings should be open (visual hint)
        this.showOpenStrings(openStrings, 'fretboard-chord-name-to-fret');
        
        // Show which strings should be muted
        this.showMutedStrings(chord.muted, 'fretboard-chord-name-to-fret');
    }
    
    handleFretboardClick(string, fret) {
        if (!this.isSessionActive || this.isPaused) return;
        if (this.currentQuestion && this.currentQuestion.type !== 'chord-name-to-fret') return;
        
        // Check if this position was already selected
        const existingIndex = this.selectedPositions.findIndex(
            pos => pos.string === string && pos.fret === fret
        );
        
        if (existingIndex !== -1) {
            // Deselect if clicking the same position
            this.selectedPositions.splice(existingIndex, 1);
        } else {
            // Add position to selection
            this.selectedPositions.push({ string, fret });
        }
        
        // Highlight all selected positions
        this.fretboardDisplayNameToFret.highlightMultiplePositions(this.selectedPositions);
        
        // Update display
        const notes = this.selectedPositions.map(pos => {
            const note = this.guitar.getNoteAtFret(pos.string, pos.fret);
            return `${note} (S${pos.string}F${pos.fret})`;
        }).join(', ');
        document.getElementById('selected-chord-notes').textContent = notes || 'None';
    }
    
    clearSelection() {
        this.selectedPositions = [];
        if (this.fretboardDisplayNameToFret) {
            this.fretboardDisplayNameToFret.clearHighlights();
        }
        if (this.fretboardDisplayFretToName) {
            this.fretboardDisplayFretToName.clearHighlights();
        }
        const selectedNotesElement = document.getElementById('selected-chord-notes');
        if (selectedNotesElement) {
            selectedNotesElement.textContent = 'None';
        }
        
        // Clear muted string indicators
        this.clearMutedStrings('fretboard-chord-fret-to-name');
        this.clearMutedStrings('fretboard-chord-name-to-fret');
    }
    
    checkChordAnswer(selectedChord) {
        if (this.currentQuestion.type !== 'chord-fret-to-name') return;
        
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        
        // Get the chord object to determine the base chord
        const chordObj = this.chordTheory.chords[this.currentQuestion.chordKey];
        let correctAnswer = this.currentQuestion.chordKey;
        
        // Determine the base chord name from the chord type
        if (chordObj) {
            const root = chordObj.root || this.currentQuestion.chordKey.split('_')[0];
            
            if (chordObj.type === 'major' || chordObj.type === 'triad_major' || 
                chordObj.type === 'caged_major' || chordObj.type === 'major_high') {
                correctAnswer = root;  // e.g., "C"
            } else if (chordObj.type === 'minor' || chordObj.type === 'triad_minor' || 
                       chordObj.type === 'minor_high') {
                correctAnswer = root + 'm';  // e.g., "Am"
            } else if (chordObj.type === 'dominant7') {
                correctAnswer = root + '7';  // e.g., "G7"
            } else if (chordObj.type === 'major7') {
                correctAnswer = root + 'maj7';  // e.g., "Cmaj7"
            } else if (chordObj.type === 'minor7') {
                correctAnswer = root + 'm7';  // e.g., "Am7"
            } else if (chordObj.type === 'sus2') {
                correctAnswer = root + 'sus2';  // e.g., "Csus2"
            } else if (chordObj.type === 'sus4') {
                correctAnswer = root + 'sus4';  // e.g., "Csus4"
            } else if (chordObj.type === '6th') {
                correctAnswer = root + '6';  // e.g., "C6"
            } else if (chordObj.type === 'm6') {
                correctAnswer = root + 'm6';  // e.g., "Am6"
            } else if (chordObj.type === 'add9') {
                correctAnswer = root + 'add9';  // e.g., "Cadd9"
            } else if (chordObj.type === 'power') {
                correctAnswer = root + '5';  // e.g., "C5"
            } else if (chordObj.type === 'dim') {
                correctAnswer = root + 'dim';  // e.g., "Cdim"
            } else if (chordObj.type === 'aug') {
                correctAnswer = root + 'aug';  // e.g., "Caug"
            } else if (chordObj.type === 'inversion_major') {
                // For inversions, we keep them separate as they have different bass notes
                correctAnswer = this.currentQuestion.chordKey;
            }
        }
        
        const isCorrect = selectedChord === correctAnswer;
        
        this.processAnswer(isCorrect, responseTime);
        
        if (isCorrect) {
            this.showFeedback(`Correct! That's ${this.currentQuestion.chordName}`, true);
        } else {
            const selectedChordData = this.chordTheory.chords[selectedChord];
            const selectedName = selectedChordData ? selectedChordData.name : selectedChord;
            this.showFeedback(`Incorrect. That's ${this.currentQuestion.chordName}, not ${selectedName}`, false);
        }
        
        setTimeout(() => {
            this.clearFeedback();
            this.generateQuestion();
        }, 2000);
    }
    
    checkNameToFretAnswer() {
        if (this.selectedPositions.length === 0) return;
        if (!this.currentQuestion) return;
        
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        
        // Only compare the fretted positions (not open strings)
        // User should only click on fretted notes, open strings are already open
        const isCorrect = this.chordTheory.compareChordPositions(
            this.selectedPositions,
            this.currentQuestion.frettedPositions
        );
        
        this.processAnswer(isCorrect, responseTime);
        
        if (isCorrect) {
            this.showFeedback(`Correct! That's ${this.currentQuestion.chordName}`, true);
            // Auto-progress after correct answer
            setTimeout(() => {
                this.clearFeedback();
                this.generateQuestion();
            }, 2000);
        } else {
            // First identify what was played before clearing
            const fullPositions = [...this.selectedPositions];
            this.currentQuestion.openStrings.forEach(string => {
                fullPositions.push({ string, fret: 0 });
            });
            
            const playedChord = this.chordTheory.getChordByPositions(fullPositions);
            const playedName = playedChord ? playedChord.name : 'not a recognized chord';
            
            // Now clear the selection
            this.selectedPositions = [];
            const selectedNotesElement = document.getElementById('selected-chord-notes');
            if (selectedNotesElement) {
                selectedNotesElement.textContent = 'Correct answer shown';
            }
            
            // Highlight all positions of the correct chord
            const correctPositions = [];
            
            // Add fretted positions
            this.currentQuestion.frettedPositions.forEach(pos => {
                correctPositions.push({ string: pos.string, fret: pos.fret });
            });
            
            // Add open strings
            this.currentQuestion.openStrings.forEach(string => {
                correctPositions.push({ string: string, fret: 0 });
            });
            
            // Highlight the correct chord on the fretboard
            if (this.fretboardDisplayNameToFret) {
                this.fretboardDisplayNameToFret.clearHighlights();
                this.fretboardDisplayNameToFret.highlightMultiplePositions(correctPositions);
                
                // Also show muted strings
                if (this.currentQuestion.muted && this.currentQuestion.muted.length > 0) {
                    this.showMutedStrings(this.currentQuestion.muted, 'fretboard-chord-name-to-fret');
                }
            }
            
            this.showFeedback(`Incorrect. You played ${playedName}. The correct answer (${this.currentQuestion.chordName}) is shown on the fretboard.`, false);
            
            // Show the "Next" button instead of auto-progressing
            const submitBtn = document.getElementById('submit-chord-selection');
            const clearBtn = document.getElementById('clear-chord-selection');
            if (submitBtn && clearBtn) {
                submitBtn.style.display = 'none';
                clearBtn.textContent = 'Next';
                clearBtn.onclick = () => {
                    this.clearFeedback();
                    this.clearSelection();  // This will clear highlights and muted strings
                    this.generateQuestion();
                    clearBtn.textContent = 'Clear';
                    clearBtn.onclick = () => this.clearSelection();
                    submitBtn.style.display = 'inline-block';
                };
            }
        }
    }
    
    processAnswer(isCorrect, responseTime, gaveUp = false) {
        if (isCorrect && !gaveUp) {
            this.score.correct++;
            this.score.streak++;
            document.getElementById('chord-correct-count').textContent = this.score.correct;
        } else {
            this.score.incorrect++;
            this.score.streak = 0;
            document.getElementById('chord-incorrect-count').textContent = this.score.incorrect;
        }
        
        document.getElementById('chord-streak-count').textContent = this.score.streak;
        
        this.statistics.recordChordAnswer({
            mode: this.currentMode,
            question: this.currentQuestion,
            isCorrect: isCorrect && !gaveUp,
            responseTime: responseTime,
            gaveUp: gaveUp,
            timestamp: Date.now()
        });
        
        this.resetTimer();
    }
    
    showFeedback(message, isCorrect) {
        const feedback = document.getElementById('chord-feedback');
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = 'feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    }
    
    clearFeedback() {
        const feedback = document.getElementById('chord-feedback');
        if (feedback) {
            feedback.className = 'feedback';
            feedback.textContent = '';
        }
    }
    
    showMutedStrings(mutedStrings, fretboardId) {
        const fretboard = document.getElementById(fretboardId);
        if (!fretboard) return;
        
        mutedStrings.forEach(stringNum => {
            const openPosition = fretboard.querySelector(`#pos-${stringNum}-0`);
            if (openPosition) {
                const marker = openPosition.querySelector('.position-marker');
                if (marker) {
                    marker.classList.add('muted-string');
                    marker.innerHTML = 'X';
                }
            }
        });
    }
    
    showOpenStrings(openStrings, fretboardId) {
        const fretboard = document.getElementById(fretboardId);
        if (!fretboard) return;
        
        openStrings.forEach(stringNum => {
            const openPosition = fretboard.querySelector(`#pos-${stringNum}-0`);
            if (openPosition) {
                const marker = openPosition.querySelector('.position-marker');
                if (marker) {
                    marker.classList.add('open-string-indicator');
                    marker.innerHTML = 'O';
                }
            }
        });
    }
    
    clearMutedStrings(fretboardId) {
        const fretboard = document.getElementById(fretboardId);
        if (!fretboard) return;
        
        fretboard.querySelectorAll('.muted-string').forEach(marker => {
            marker.classList.remove('muted-string');
            if (marker.textContent === 'X') {
                marker.innerHTML = '';
            }
        });
        
        fretboard.querySelectorAll('.open-string-indicator').forEach(marker => {
            marker.classList.remove('open-string-indicator');
            if (marker.textContent === 'O') {
                marker.innerHTML = '';
            }
        });
    }
    
    startTimer() {
        if (!this.startTime) {
            this.startTime = Date.now();
        }
        this.timerInterval = setInterval(() => {
            const totalElapsed = Date.now() - this.startTime - this.pausedTime;
            const elapsed = Math.floor(totalElapsed / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('chord-timer').textContent = `${minutes}:${seconds}`;
        }, 100);
    }
    
    resetTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.startTime = null;
        this.pausedTime = 0;
        this.pauseStartTime = null;
        document.getElementById('chord-timer').textContent = '00:00';
    }
    
    updateEnabledTypes() {
        this.settings.enabledTypes = [];
        document.querySelectorAll('.chord-type-toggle:checked').forEach(toggle => {
            this.settings.enabledTypes.push(toggle.dataset.type);
        });
        
        if (this.settings.enabledTypes.length === 0) {
            this.settings.enabledTypes = ['major'];
            document.querySelector('.chord-type-toggle[data-type="major"]').checked = true;
        }
        
        this.saveSettings();
    }
    
    saveSettings() {
        localStorage.setItem('chordGameSettings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('chordGameSettings');
        if (saved) {
            const loadedSettings = JSON.parse(saved);
            // Merge with defaults to ensure all properties exist
            this.settings = {
                ...this.settings,  // Start with defaults
                ...loadedSettings  // Override with saved values
            };
            
            // Ensure minFret and maxFret are defined
            if (this.settings.minFret === undefined) this.settings.minFret = 0;
            if (this.settings.maxFret === undefined) this.settings.maxFret = 12;
            
            // Ensure enabledTypes includes all available chord types if not specified
            // This handles the case where new chord types are added after settings were saved
            if (!this.settings.enabledTypes || this.settings.enabledTypes.length === 0) {
                // Default to major and minor if no types are enabled
                this.settings.enabledTypes = ['major', 'minor'];
            }
            
            // Update UI to match loaded settings
            document.querySelectorAll('.chord-type-toggle').forEach(toggle => {
                toggle.checked = this.settings.enabledTypes.includes(toggle.dataset.type);
            });
        } else {
            // No saved settings - read initial state from HTML checkboxes
            this.settings.enabledTypes = [];
            document.querySelectorAll('.chord-type-toggle:checked').forEach(toggle => {
                this.settings.enabledTypes.push(toggle.dataset.type);
            });
            
            // If no checkboxes are checked, default to major and minor
            if (this.settings.enabledTypes.length === 0) {
                this.settings.enabledTypes = ['major', 'minor'];
                // Check the major and minor checkboxes
                const majorToggle = document.querySelector('.chord-type-toggle[data-type="major"]');
                const minorToggle = document.querySelector('.chord-type-toggle[data-type="minor"]');
                if (majorToggle) majorToggle.checked = true;
                if (minorToggle) minorToggle.checked = true;
            }
        }
        
        // Always sync UI elements with current settings
        const includeBarreToggle = document.getElementById('include-barre');
        if (includeBarreToggle) {
            includeBarreToggle.checked = this.settings.includeBarre;
        }
        
        const minFretInput = document.getElementById('chord-min-fret');
        if (minFretInput) {
            minFretInput.value = this.settings.minFret;
        }
        
        const maxFretInput = document.getElementById('chord-max-fret');
        if (maxFretInput) {
            maxFretInput.value = this.settings.maxFret;
        }
    }
    
    showAnswer() {
        if (!this.currentQuestion || this.showMeUsed || this.currentMode !== 'chord-name-to-fret') {
            return;
        }
        
        this.showMeUsed = true;
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        
        // Record as incorrect with gave up flag
        this.processAnswer(false, responseTime, true);
        
        // Show the correct answer on the fretboard
        if (this.fretboardDisplayNameToFret && this.currentQuestion) {
            const positions = [];
            
            // Add fretted positions (from the currentQuestion directly)
            if (this.currentQuestion.frettedPositions) {
                this.currentQuestion.frettedPositions.forEach(pos => {
                    positions.push({ string: pos.string, fret: pos.fret });
                });
            }
            
            // Add open strings
            if (this.currentQuestion.openStrings) {
                this.currentQuestion.openStrings.forEach(string => {
                    positions.push({ string: string, fret: 0 });
                });
            }
            
            this.fretboardDisplayNameToFret.highlightMultiplePositions(positions);
        }
        
        // Show feedback
        this.showFeedback(`The answer is: ${this.currentQuestion.chordName}`, false);
        
        // Display chord diagram details
        const positionsStr = this.currentQuestion.frettedPositions
            .map(p => `String ${p.string} Fret ${p.fret}`)
            .join(', ');
        const openStr = this.currentQuestion.openStrings && this.currentQuestion.openStrings.length > 0
            ? ` | Open strings: ${this.currentQuestion.openStrings.join(', ')}`
            : '';
        const mutedStr = this.currentQuestion.muted && this.currentQuestion.muted.length > 0
            ? ` | Muted strings: ${this.currentQuestion.muted.join(', ')}`
            : '';
            
        setTimeout(() => {
            this.showFeedback(`${this.currentQuestion.chordName}: ${positionsStr}${openStr}${mutedStr}`, false);
        }, 100);
        
        // Switch buttons
        const showMeBtn = document.getElementById('show-me-chord');
        const nextBtn = document.getElementById('next-chord');
        if (showMeBtn && nextBtn) {
            showMeBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }
    }
}