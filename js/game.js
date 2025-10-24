class FretboardGame {
    constructor(guitar, statistics) {
        this.guitar = guitar;
        this.statistics = statistics;
        this.fretboardDisplay = null;
        this.currentMode = 'note-to-fret';
        this.currentQuestion = null;
        this.startTime = null;
        this.timerInterval = null;
        this.score = { correct: 0, incorrect: 0, streak: 0 };
        this.isSessionActive = false;
        this.isPaused = false;
        this.pausedTime = 0;
        this.pauseStartTime = null;
        this.settings = {
            includeSharps: true,
            minFret: 0,
            maxFret: 12,
            enabledStrings: [1, 2, 3, 4, 5, 6]
        };
        this.showMeUsed = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSettings();
        // Create two fretboard displays - one interactive for note-to-fret, one for display only
        this.fretboardDisplayNoteToFret = new FretboardDisplay('fretboard-note-to-fret', true);
        this.fretboardDisplay = new FretboardDisplay('fretboard', false);
        
        // Set up click handler for interactive fretboard
        this.fretboardDisplayNoteToFret.setClickHandler((string, fret) => {
            this.checkNoteToFretClick(string, fret);
        });
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startSession();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.endSession();
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pauseSession();
        });
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeSession();
        });
        
        document.getElementById('resume-overlay-btn').addEventListener('click', () => {
            this.resumeSession();
        });
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });
        
        // Remove old input-based listeners since we're using the fretboard now
        
        document.querySelectorAll('.note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isSessionActive && !this.isPaused) {
                    const note = e.target.dataset.note;
                    this.checkFretToNoteAnswer(note);
                }
            });
        });
        
        document.getElementById('include-sharps').addEventListener('change', (e) => {
            this.settings.includeSharps = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('min-fret').addEventListener('change', (e) => {
            this.settings.minFret = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('max-fret').addEventListener('change', (e) => {
            this.settings.maxFret = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.querySelectorAll('.string-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.updateEnabledStrings();
            });
        });

        // Apply settings button
        document.getElementById('apply-fretboard-settings').addEventListener('click', () => {
            this.applySettings();
        });
    }

    applySettings() {
        // Update settings from UI
        this.settings.includeSharps = document.getElementById('include-sharps').checked;
        this.settings.minFret = parseInt(document.getElementById('min-fret').value);
        this.settings.maxFret = parseInt(document.getElementById('max-fret').value);
        this.updateEnabledStrings();
        this.saveSettings();

        // If session is active, regenerate the current question
        if (this.isSessionActive && !this.isPaused) {
            this.clearFeedback();
            this.generateQuestion();
        }
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        if (this.isSessionActive) {
            document.querySelectorAll('.game-content').forEach(content => {
                content.classList.remove('active');
            });
            
            if (mode === 'note-to-fret') {
                document.getElementById('note-to-fret-game').classList.add('active');
            } else {
                document.getElementById('fret-to-note-game').classList.add('active');
            }
            
            this.resetTimer();
            this.generateQuestion();
        }
    }
    
    generateQuestion() {
        if (!this.isSessionActive) return;
        
        this.startTimer();
        this.clearFeedback();
        this.showMeUsed = false;
        
        // Reset show me/next buttons
        const showMeBtn = document.getElementById('show-me-note');
        const nextBtn = document.getElementById('next-note');
        if (showMeBtn && this.currentMode === 'note-to-fret') {
            showMeBtn.style.display = 'inline-block';
            nextBtn.style.display = 'none';
        }
        
        if (this.currentMode === 'note-to-fret') {
            this.generateNoteToFretQuestion();
        } else {
            this.generateFretToNoteQuestion();
        }
    }
    
    generateNoteToFretQuestion() {
        const note = this.guitar.getRandomNote(this.settings.includeSharps);
        const string = this.guitar.getRandomString(this.settings.enabledStrings);
        const correctFret = this.guitar.getFretForNote(string.number, note);
        
        let adjustedFret = correctFret;
        while (adjustedFret > this.settings.maxFret) {
            adjustedFret += 12;
        }
        
        if (adjustedFret < this.settings.minFret || adjustedFret > this.settings.maxFret) {
            this.generateNoteToFretQuestion();
            return;
        }
        
        this.currentQuestion = {
            type: 'note-to-fret',
            note: note,
            string: string.number,
            correctAnswer: adjustedFret,
            startTime: Date.now()
        };
        
        document.getElementById('target-note').textContent = this.guitar.getNoteDisplayName(note);
        document.getElementById('target-string').textContent = string.number;
        
        // Update interactive fretboard for this question
        this.fretboardDisplayNoteToFret.clearHighlights();
        this.fretboardDisplayNoteToFret.setTargetString(string.number);
        this.fretboardDisplayNoteToFret.setFretRange(this.settings.minFret, this.settings.maxFret);
    }
    
    generateFretToNoteQuestion() {
        const string = this.guitar.getRandomString(this.settings.enabledStrings);
        const fret = this.guitar.getRandomFret(this.settings.minFret, this.settings.maxFret);
        const correctNote = this.guitar.getNoteAtFret(string.number, fret);
        
        if (!this.settings.includeSharps && correctNote.includes('#')) {
            this.generateFretToNoteQuestion();
            return;
        }
        
        this.currentQuestion = {
            type: 'fret-to-note',
            string: string.number,
            fret: fret,
            correctAnswer: correctNote,
            startTime: Date.now()
        };
        
        // Update fretboard display
        this.fretboardDisplay.clearHighlights();
        this.fretboardDisplay.highlightPosition(string.number, fret);
        this.fretboardDisplay.setFretRange(this.settings.minFret, this.settings.maxFret);
    }
    
    checkNoteToFretClick(clickedString, clickedFret) {
        if (!this.isSessionActive || this.isPaused || this.showMeUsed) return;
        if (this.currentQuestion.type !== 'note-to-fret') return;
        
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        const isCorrect = clickedFret === this.currentQuestion.correctAnswer && 
                         clickedString === this.currentQuestion.string;
        
        // Show visual feedback on the fretboard
        this.fretboardDisplayNoteToFret.showClickFeedback(clickedString, clickedFret, isCorrect);
        
        this.processAnswer(isCorrect, responseTime);
        
        if (isCorrect) {
            this.showFeedback(window.i18n.t('fretboard.feedback.correct', {
                note: this.currentQuestion.note,
                string: this.currentQuestion.string,
                fret: clickedFret
            }), true);
        } else {
            this.showFeedback(window.i18n.t('fretboard.feedback.incorrect', {
                note: this.currentQuestion.note,
                string: this.currentQuestion.string,
                fret: this.currentQuestion.correctAnswer
            }), false);
            // Highlight the correct answer
            this.fretboardDisplayNoteToFret.highlightPosition(this.currentQuestion.string, this.currentQuestion.correctAnswer);
        }
        
        setTimeout(() => this.generateQuestion(), 2000);
    }
    
    checkFretToNoteAnswer(answer) {
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        const isCorrect = answer === this.currentQuestion.correctAnswer;
        
        this.processAnswer(isCorrect, responseTime);
        
        if (isCorrect) {
            this.showFeedback(window.i18n.t('fretboard.feedback.correctFretToNote', {
                string: this.currentQuestion.string,
                fret: this.currentQuestion.fret,
                note: this.guitar.getNoteDisplayName(answer)
            }), true);
        } else {
            this.showFeedback(window.i18n.t('fretboard.feedback.incorrectFretToNote', {
                string: this.currentQuestion.string,
                fret: this.currentQuestion.fret,
                note: this.guitar.getNoteDisplayName(this.currentQuestion.correctAnswer)
            }), false);
        }
        
        setTimeout(() => this.generateQuestion(), 2000);
    }
    
    processAnswer(isCorrect, responseTime, gaveUp = false) {
        if (isCorrect && !gaveUp) {
            this.score.correct++;
            this.score.streak++;
            document.getElementById('correct-count').textContent = this.score.correct;
        } else {
            this.score.incorrect++;
            this.score.streak = 0;
            document.getElementById('incorrect-count').textContent = this.score.incorrect;
        }
        
        document.getElementById('streak-count').textContent = this.score.streak;
        
        this.statistics.recordAnswer({
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
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = 'feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    }
    
    clearFeedback() {
        const feedback = document.getElementById('feedback');
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
            document.querySelector('.timer-display').textContent = `${minutes}:${seconds}`;
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
        document.querySelector('.timer-display').textContent = '00:00';
    }
    
    updateEnabledStrings() {
        this.settings.enabledStrings = [];
        document.querySelectorAll('.string-toggle:checked').forEach(toggle => {
            this.settings.enabledStrings.push(parseInt(toggle.dataset.string));
        });
        
        if (this.settings.enabledStrings.length === 0) {
            this.settings.enabledStrings = [1];
            document.querySelector('.string-toggle[data-string="1"]').checked = true;
        }
        
        this.saveSettings();
    }
    
    saveSettings() {
        localStorage.setItem('fretboardGameSettings', JSON.stringify(this.settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('fretboardGameSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
            
            document.getElementById('include-sharps').checked = this.settings.includeSharps;
            document.getElementById('min-fret').value = this.settings.minFret;
            document.getElementById('max-fret').value = this.settings.maxFret;
            
            document.querySelectorAll('.string-toggle').forEach(toggle => {
                const stringNum = parseInt(toggle.dataset.string);
                toggle.checked = this.settings.enabledStrings.includes(stringNum);
            });
        }
    }
    
    startSession() {
        this.isSessionActive = true;
        this.isPaused = false;
        this.pausedTime = 0;
        this.score = { correct: 0, incorrect: 0, streak: 0 };
        document.getElementById('correct-count').textContent = '0';
        document.getElementById('incorrect-count').textContent = '0';
        document.getElementById('streak-count').textContent = '0';
        
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-btn').style.display = 'none';
        document.querySelector('.session-controls').style.display = 'flex';
        
        if (this.currentMode === 'note-to-fret') {
            document.getElementById('note-to-fret-game').classList.add('active');
            
            // Setup Show me button event listeners for note-to-fret mode
            const showMeBtn = document.getElementById('show-me-note');
            const nextBtn = document.getElementById('next-note');
            if (showMeBtn && !showMeBtn.hasAttribute('data-listener-attached')) {
                showMeBtn.setAttribute('data-listener-attached', 'true');
                showMeBtn.addEventListener('click', () => {
                    console.log('Show me clicked!');
                    this.showAnswer();
                });
            }
            if (nextBtn && !nextBtn.hasAttribute('data-listener-attached')) {
                nextBtn.setAttribute('data-listener-attached', 'true');
                nextBtn.addEventListener('click', () => this.generateQuestion());
            }
        } else {
            document.getElementById('fret-to-note-game').classList.add('active');
        }
        
        this.statistics.startNewSession();
        this.generateQuestion();
    }
    
    endSession() {
        this.isSessionActive = false;
        this.isPaused = false;
        this.statistics.endSession();
        this.resetTimer();
        this.clearFeedback();
        
        document.querySelectorAll('.game-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('start-btn').style.display = 'block';
        document.querySelector('.session-controls').style.display = 'none';
        document.getElementById('pause-overlay').style.display = 'none';
        
        const totalQuestions = this.score.correct + this.score.incorrect;
        if (totalQuestions > 0) {
            const accuracy = ((this.score.correct / totalQuestions) * 100).toFixed(1);
            const feedback = document.getElementById('feedback');
            feedback.textContent = window.i18n.t('fretboard.feedback.sessionComplete', {
                correct: this.score.correct,
                total: totalQuestions,
                accuracy: accuracy
            });
            feedback.className = 'feedback show correct';
            setTimeout(() => {
                this.clearFeedback();
            }, 5000);
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
        
        document.getElementById('pause-btn').style.display = 'none';
        document.getElementById('resume-btn').style.display = 'block';
        document.getElementById('pause-overlay').style.display = 'flex';
    }
    
    resumeSession() {
        if (!this.isSessionActive || !this.isPaused) return;
        
        this.isPaused = false;
        
        if (this.pauseStartTime) {
            this.pausedTime += Date.now() - this.pauseStartTime;
            this.pauseStartTime = null;
        }
        
        document.getElementById('pause-btn').style.display = 'block';
        document.getElementById('resume-btn').style.display = 'none';
        document.getElementById('pause-overlay').style.display = 'none';
        
        if (this.startTime) {
            this.startTimer();
        }
    }
    
    showAnswer() {
        // Check if we can show answer
        if (!this.isSessionActive) {
            console.log('Session not active');
            return;
        }
        if (!this.currentQuestion) {
            console.log('No current question');
            return;
        }
        if (this.showMeUsed) {
            console.log('Show me already used');
            return;
        }
        if (this.currentMode !== 'note-to-fret') {
            console.log('Wrong mode:', this.currentMode);
            return;
        }
        
        this.showMeUsed = true;
        const responseTime = Date.now() - this.currentQuestion.startTime - this.pausedTime;
        
        // Record as incorrect with gave up flag
        this.processAnswer(false, responseTime, true);
        
        // Show the correct answer on the fretboard
        this.fretboardDisplayNoteToFret.highlightPosition(this.currentQuestion.string, this.currentQuestion.correctAnswer);
        
        // Show feedback
        this.showFeedback(window.i18n.t('fretboard.feedback.showAnswer', {
            note: this.currentQuestion.note,
            string: this.currentQuestion.string,
            fret: this.currentQuestion.correctAnswer
        }), false);
        
        // Switch buttons
        const showMeBtn = document.getElementById('show-me-note');
        const nextBtn = document.getElementById('next-note');
        if (showMeBtn && nextBtn) {
            showMeBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
        }
    }
}