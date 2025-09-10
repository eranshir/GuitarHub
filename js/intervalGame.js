class IntervalGame {
    constructor(guitar, statistics, intervalTheory) {
        this.guitar = guitar;
        this.statistics = statistics;
        this.intervalTheory = intervalTheory;
        this.fretboardDisplayNoteToFret = null;
        this.fretboardDisplayFretToNote = null;
        this.currentMode = 'interval-note-to-fret';
        this.currentQuestion = null;
        this.selectedPositions = [];
        this.startTime = null;
        this.timerInterval = null;
        this.score = { correct: 0, incorrect: 0, streak: 0 };
        this.isSessionActive = false;
        this.isPaused = false;
        this.pausedTime = 0;
        this.pauseStartTime = null;
        this.settings = {
            enabledIntervals: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'],
            direction: 'both',
            stringPairs: 'all',
            minFret: 0,
            maxFret: 12
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.initializeFretboards();
    }
    
    initializeFretboards() {
        // Create interactive fretboards for interval practice
        if (!this.fretboardDisplayNoteToFret) {
            this.fretboardDisplayNoteToFret = new FretboardDisplay('fretboard-interval-note-to-fret', true);
            
            // Set up click handler for interactive fretboard
            if (this.fretboardDisplayNoteToFret) {
                this.fretboardDisplayNoteToFret.setClickHandler((string, fret) => {
                    this.handleFretboardClick(string, fret);
                });
            }
        }
        
        if (!this.fretboardDisplayFretToNote) {
            this.fretboardDisplayFretToNote = new FretboardDisplay('fretboard-interval-fret-to-note', false);
        }
    }
    
    setupEventListeners() {
        document.getElementById('interval-start-btn').addEventListener('click', () => {
            this.startSession();
        });
        
        document.getElementById('interval-stop-btn').addEventListener('click', () => {
            this.endSession();
        });
        
        document.getElementById('interval-pause-btn').addEventListener('click', () => {
            this.pauseSession();
        });
        
        document.getElementById('interval-resume-btn').addEventListener('click', () => {
            this.resumeSession();
        });
        
        document.getElementById('interval-resume-overlay-btn').addEventListener('click', () => {
            this.resumeSession();
        });
        
        document.querySelectorAll('.interval-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });
        
        document.querySelectorAll('.interval-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isSessionActive && !this.isPaused) {
                    const interval = e.target.dataset.interval;
                    this.checkIntervalAnswer(interval);
                }
            });
        });
        
        document.getElementById('clear-interval-selection').addEventListener('click', () => {
            this.clearSelection();
        });
        
        // Settings listeners
        document.querySelectorAll('.interval-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.updateEnabledIntervals();
            });
        });
        
        document.getElementById('interval-direction').addEventListener('change', (e) => {
            this.settings.direction = e.target.value;
            this.saveSettings();
        });
        
        document.getElementById('string-pairs').addEventListener('change', (e) => {
            this.settings.stringPairs = e.target.value;
            this.saveSettings();
        });
        
        document.getElementById('interval-min-fret').addEventListener('change', (e) => {
            this.settings.minFret = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('interval-max-fret').addEventListener('change', (e) => {
            this.settings.maxFret = parseInt(e.target.value);
            this.saveSettings();
        });
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.interval-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        if (this.isSessionActive) {
            document.querySelectorAll('#intervals-module .game-content').forEach(content => {
                content.classList.remove('active');
            });
            
            if (mode === 'interval-note-to-fret') {
                document.getElementById('interval-note-to-fret-game').classList.add('active');
            } else {
                document.getElementById('interval-fret-to-note-game').classList.add('active');
            }
            
            this.resetTimer();
            this.generateQuestion();
        }
    }
    
    startSession() {
        this.isSessionActive = true;
        this.isPaused = false;
        this.pausedTime = 0;
        this.score = { correct: 0, incorrect: 0, streak: 0 };
        this.selectedPositions = [];
        
        document.getElementById('interval-correct-count').textContent = '0';
        document.getElementById('interval-incorrect-count').textContent = '0';
        document.getElementById('interval-streak-count').textContent = '0';
        
        // Hide start screen and show game
        document.getElementById('interval-start-screen').classList.remove('active');
        document.getElementById('interval-session-controls').style.display = 'flex';
        
        if (this.currentMode === 'interval-note-to-fret') {
            document.getElementById('interval-note-to-fret-game').classList.add('active');
        } else {
            document.getElementById('interval-fret-to-note-game').classList.add('active');
        }
        
        // Ensure fretboards are initialized
        this.initializeFretboards();
        
        this.statistics.startNewIntervalSession();
        this.generateQuestion();
    }
    
    endSession() {
        this.isSessionActive = false;
        this.isPaused = false;
        this.statistics.endIntervalSession();
        this.resetTimer();
        
        // Clear any selected positions
        this.clearSelection();
        
        // Hide all game content
        document.querySelectorAll('#intervals-module .game-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show start screen
        document.getElementById('interval-start-screen').classList.add('active');
        document.getElementById('interval-session-controls').style.display = 'none';
        document.getElementById('interval-pause-overlay').style.display = 'none';
        
        // Show session summary
        const totalQuestions = this.score.correct + this.score.incorrect;
        if (totalQuestions > 0) {
            const accuracy = ((this.score.correct / totalQuestions) * 100).toFixed(1);
            const feedback = document.getElementById('interval-feedback');
            feedback.textContent = `Session Complete! You got ${this.score.correct} out of ${totalQuestions} correct (${accuracy}% accuracy)`;
            feedback.className = 'feedback show correct';
            setTimeout(() => {
                this.clearFeedback();
            }, 5000);
        } else {
            this.clearFeedback();
        }
    }
    
    pauseSession() {
        if (!this.isSessionActive || this.isPaused) return;
        
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        document.getElementById('interval-pause-btn').style.display = 'none';
        document.getElementById('interval-resume-btn').style.display = 'block';
        document.getElementById('interval-pause-overlay').style.display = 'flex';
    }
    
    resumeSession() {
        if (!this.isSessionActive || !this.isPaused) return;
        
        this.isPaused = false;
        
        if (this.pauseStartTime) {
            this.pausedTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        
        document.getElementById('interval-pause-btn').style.display = 'block';
        document.getElementById('interval-resume-btn').style.display = 'none';
        document.getElementById('interval-pause-overlay').style.display = 'none';
        
        if (this.startTime) {
            this.startTimer();
        }
    }
    
    generateQuestion() {
        if (!this.isSessionActive) return;
        
        this.startTimer();
        this.clearSelection();
        
        if (this.currentMode === 'interval-note-to-fret') {
            this.generateNoteToFretQuestion();
        } else {
            this.generateFretToNoteQuestion();
        }
    }
    
    generateNoteToFretQuestion() {
        const intervalKey = this.intervalTheory.getRandomInterval(this.settings.enabledIntervals);
        if (!intervalKey) {
            this.showFeedback('No intervals selected. Please select at least one interval.', false);
            return;
        }
        
        const rootNote = this.guitar.getRandomNote(true);
        const interval = this.intervalTheory.intervals[intervalKey];
        const direction = this.settings.direction === 'both' 
            ? (Math.random() < 0.5 ? 'ascending' : 'descending') 
            : this.settings.direction;
        
        const targetNote = this.intervalTheory.getNoteFromInterval(rootNote, intervalKey, direction);
        
        this.currentQuestion = {
            type: 'interval-note-to-fret',
            rootNote: rootNote,
            targetNote: targetNote,
            intervalKey: intervalKey,
            intervalName: interval.name,
            direction: direction,
            startTime: Date.now()
        };
        
        // Update UI
        document.getElementById('target-interval').textContent = interval.name;
        document.getElementById('root-note').textContent = rootNote;
        
        // Reset fretboard
        this.fretboardDisplayNoteToFret.clearHighlights();
        this.fretboardDisplayNoteToFret.setFretRange(this.settings.minFret, this.settings.maxFret);
    }
    
    generateFretToNoteQuestion() {
        const intervalKey = this.intervalTheory.getRandomInterval(this.settings.enabledIntervals);
        if (!intervalKey) {
            this.showFeedback('No intervals selected. Please select at least one interval.', false);
            return;
        }
        
        const intervalPair = this.intervalTheory.generateIntervalPair(
            this.guitar, 
            intervalKey, 
            this.settings
        );
        
        if (!intervalPair) {
            this.generateFretToNoteQuestion(); // Try again
            return;
        }
        
        this.currentQuestion = {
            type: 'interval-fret-to-note',
            position1: intervalPair.position1,
            position2: intervalPair.position2,
            intervalKey: intervalPair.intervalKey,
            intervalName: intervalPair.intervalName,
            direction: intervalPair.direction,
            startTime: Date.now()
        };
        
        // Update fretboard display - show both positions
        this.fretboardDisplayFretToNote.highlightMultiplePositions([
            intervalPair.position1,
            intervalPair.position2
        ]);
        this.fretboardDisplayFretToNote.setFretRange(this.settings.minFret, this.settings.maxFret);
    }
    
    handleFretboardClick(string, fret) {
        if (!this.isSessionActive || this.isPaused) return;
        if (this.currentQuestion && this.currentQuestion.type !== 'interval-note-to-fret') return;
        
        // Check if this position was already selected
        const existingIndex = this.selectedPositions.findIndex(
            pos => pos.string === string && pos.fret === fret
        );
        
        if (existingIndex !== -1) {
            // Deselect if clicking the same position
            this.selectedPositions.splice(existingIndex, 1);
        } else {
            // Add position to selection (max 2)
            if (this.selectedPositions.length >= 2) {
                this.selectedPositions.shift(); // Remove oldest selection
            }
            this.selectedPositions.push({ string, fret });
        }
        
        // Highlight all selected positions
        this.fretboardDisplayNoteToFret.highlightMultiplePositions(this.selectedPositions);
        
        // Update display
        const notes = this.selectedPositions.map(pos => {
            const note = this.guitar.getNoteAtFret(pos.string, pos.fret);
            return `${note} (S${pos.string}F${pos.fret})`;
        }).join(', ');
        document.getElementById('selected-interval-notes').textContent = notes || 'None';
        
        // Auto-submit when 2 positions are selected
        if (this.selectedPositions.length === 2) {
            setTimeout(() => {
                if (this.selectedPositions.length === 2) { // Double-check after timeout
                    this.checkNoteToFretAnswer();
                }
            }, 500); // Small delay for visual feedback
        }
    }
    
    clearSelection() {
        this.selectedPositions = [];
        if (this.fretboardDisplayNoteToFret) {
            this.fretboardDisplayNoteToFret.clearHighlights();
        }
        if (this.fretboardDisplayFretToNote) {
            this.fretboardDisplayFretToNote.clearHighlights();
        }
        const selectedNotesElement = document.getElementById('selected-interval-notes');
        if (selectedNotesElement) {
            selectedNotesElement.textContent = 'None';
        }
    }
    
    checkNoteToFretAnswer() {
        if (this.selectedPositions.length !== 2) return;
        if (!this.currentQuestion) return;
        
        try {
            const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
            
            // Get notes from selected positions
            const note1 = this.guitar.getNoteAtFret(
                this.selectedPositions[0].string, 
                this.selectedPositions[0].fret
            );
            const note2 = this.guitar.getNoteAtFret(
                this.selectedPositions[1].string, 
                this.selectedPositions[1].fret
            );
            
            // Check if the interval is correct
            const foundInterval = this.intervalTheory.getIntervalBetweenNotes(note1, note2);
            const foundIntervalReverse = this.intervalTheory.getIntervalBetweenNotes(note2, note1);
            
            const isCorrect = (foundInterval === this.currentQuestion.intervalKey) || 
                             (foundIntervalReverse === this.currentQuestion.intervalKey);
            
            this.processAnswer(isCorrect, responseTime);
            
            if (isCorrect) {
                this.showFeedback(`Correct! That's a ${this.currentQuestion.intervalName}`, true);
            } else {
                const actualInterval = this.intervalTheory.intervals[foundInterval] || 
                                     this.intervalTheory.intervals[foundIntervalReverse];
                const intervalName = actualInterval ? actualInterval.name : 'unknown interval';
                this.showFeedback(`Incorrect. You played a ${intervalName}. Looking for ${this.currentQuestion.intervalName}`, false);
            }
            
            setTimeout(() => {
                this.clearFeedback();
                this.generateQuestion();
            }, 3000);
        } catch (error) {
            console.error('Error in checkNoteToFretAnswer:', error);
            console.error('Stack trace:', error.stack);
        }
    }
    
    checkIntervalAnswer(selectedInterval) {
        if (this.currentQuestion.type !== 'interval-fret-to-note') return;
        
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        const isCorrect = selectedInterval === this.currentQuestion.intervalKey;
        
        this.processAnswer(isCorrect, responseTime);
        
        if (isCorrect) {
            this.showFeedback(`Correct! That's a ${this.currentQuestion.intervalName}`, true);
        } else {
            const selectedName = this.intervalTheory.intervals[selectedInterval].name;
            this.showFeedback(`Incorrect. That's a ${this.currentQuestion.intervalName}, not a ${selectedName}`, false);
        }
        
        setTimeout(() => {
            this.clearFeedback();
            this.generateQuestion();
        }, 2000);
    }
    
    processAnswer(isCorrect, responseTime) {
        if (isCorrect) {
            this.score.correct++;
            this.score.streak++;
            document.getElementById('interval-correct-count').textContent = this.score.correct;
        } else {
            this.score.incorrect++;
            this.score.streak = 0;
            document.getElementById('interval-incorrect-count').textContent = this.score.incorrect;
        }
        
        document.getElementById('interval-streak-count').textContent = this.score.streak;
        
        this.statistics.recordIntervalAnswer({
            mode: this.currentMode,
            question: this.currentQuestion,
            isCorrect: isCorrect,
            responseTime: responseTime,
            timestamp: Date.now()
        });
        
        this.resetTimer();
    }
    
    showFeedback(message, isCorrect) {
        const feedback = document.getElementById('interval-feedback');
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = 'feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    }
    
    clearFeedback() {
        const feedback = document.getElementById('interval-feedback');
        feedback.className = 'feedback';
        feedback.textContent = '';
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
            document.getElementById('interval-timer').textContent = `${minutes}:${seconds}`;
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
        document.getElementById('interval-timer').textContent = '00:00';
    }
    
    updateEnabledIntervals() {
        this.settings.enabledIntervals = [];
        document.querySelectorAll('.interval-toggle:checked').forEach(toggle => {
            this.settings.enabledIntervals.push(toggle.dataset.interval);
        });
        
        if (this.settings.enabledIntervals.length === 0) {
            this.settings.enabledIntervals = ['M3'];
            document.querySelector('.interval-toggle[data-interval="M3"]').checked = true;
        }
        
        this.saveSettings();
    }
    
    saveSettings() {
        localStorage.setItem('intervalGameSettings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('intervalGameSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
            
            // Update UI
            document.querySelectorAll('.interval-toggle').forEach(toggle => {
                toggle.checked = this.settings.enabledIntervals.includes(toggle.dataset.interval);
            });
            
            document.getElementById('interval-direction').value = this.settings.direction;
            document.getElementById('string-pairs').value = this.settings.stringPairs;
            document.getElementById('interval-min-fret').value = this.settings.minFret;
            document.getElementById('interval-max-fret').value = this.settings.maxFret;
        }
    }
}