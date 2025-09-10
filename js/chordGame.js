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
        
        this.settings = {
            enabledTypes: ['major', 'minor'],
            maxFret: 5,
            includeBarre: false
        };
        
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
            this.fretboardDisplayFretToName = new FretboardDisplay('fretboard-chord-fret-to-name', false);
        }
        
        // Initialize fretboard for name-to-fret mode (interactive)
        if (!this.fretboardDisplayNameToFret) {
            this.fretboardDisplayNameToFret = new FretboardDisplay('fretboard-chord-name-to-fret', true);
            if (this.fretboardDisplayNameToFret) {
                this.fretboardDisplayNameToFret.setClickHandler((string, fret) => {
                    this.handleFretboardClick(string, fret);
                });
            }
        }
    }
    
    setupEventListeners() {
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
        
        if (this.currentMode === 'chord-fret-to-name') {
            this.generateFretToNameQuestion();
        } else {
            this.generateNameToFretQuestion();
        }
    }
    
    generateFretToNameQuestion() {
        // Filter out barre chords if not enabled
        let enabledTypes = [...this.settings.enabledTypes];
        if (!this.settings.includeBarre) {
            // We'll filter the actual chords, not the types
        }
        
        let chord;
        do {
            chord = this.chordTheory.getRandomChord(enabledTypes);
            // Skip barre chords if not enabled
        } while (chord && !this.settings.includeBarre && chord.barrePosition);
        
        if (!chord) {
            this.showFeedback('No chords available with current settings', false);
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
        do {
            chord = this.chordTheory.getRandomChord(enabledTypes);
        } while (chord && !this.settings.includeBarre && chord.barrePosition);
        
        if (!chord) {
            this.showFeedback('No chords available with current settings', false);
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
        const isCorrect = selectedChord === this.currentQuestion.chordKey;
        
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
        } else {
            // Combine selected positions with open strings to identify the full chord
            const fullPositions = [...this.selectedPositions];
            this.currentQuestion.openStrings.forEach(string => {
                fullPositions.push({ string, fret: 0 });
            });
            
            const playedChord = this.chordTheory.getChordByPositions(fullPositions);
            const playedName = playedChord ? playedChord.name : 'not a recognized chord';
            this.showFeedback(`Incorrect. You played ${playedName}. Looking for ${this.currentQuestion.chordName}`, false);
        }
        
        setTimeout(() => {
            this.clearFeedback();
            this.generateQuestion();
        }, 3000);
    }
    
    processAnswer(isCorrect, responseTime) {
        if (isCorrect) {
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
            isCorrect: isCorrect,
            responseTime: responseTime,
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
            this.settings = JSON.parse(saved);
            
            // Update UI
            document.querySelectorAll('.chord-type-toggle').forEach(toggle => {
                toggle.checked = this.settings.enabledTypes.includes(toggle.dataset.type);
            });
            
            const includeBarreToggle = document.getElementById('include-barre');
            if (includeBarreToggle) {
                includeBarreToggle.checked = this.settings.includeBarre;
            }
        }
    }
}