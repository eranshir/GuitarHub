class SpotNoteGame {
    constructor(guitar, statistics) {
        this.guitar = guitar;
        this.statistics = statistics;
        this.fretboardDisplay = null;
        this.currentNote = null;
        this.level = 3; // Default level
        this.correctPositions = {}; // {string: fret}
        this.userSelections = {}; // {string: fret}
        this.prefilledStrings = []; // Strings shown to user
        this.score = { correct: 0, incorrect: 0, streak: 0 };
        this.isSessionActive = false;
        this.settings = {
            includeSharps: true,
            minFret: 0,
            maxFret: 12
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.fretboardDisplay = new FretboardDisplay('fretboard-spot-note', true);
        this.fretboardDisplay.setClickHandler((string, fret) => {
            this.handleClick(string, fret);
        });
    }

    setupEventListeners() {
        document.getElementById('spot-start-btn').addEventListener('click', () => {
            this.startSession();
        });

        document.getElementById('spot-stop-btn').addEventListener('click', () => {
            this.endSession();
        });

        document.getElementById('spot-level').addEventListener('change', (e) => {
            this.level = parseInt(e.target.value);
            // If session is active, regenerate question with new level
            if (this.isSessionActive) {
                this.generateQuestion();
            }
        });

        document.getElementById('spot-include-sharps').addEventListener('change', (e) => {
            this.settings.includeSharps = e.target.checked;
        });

        document.getElementById('spot-min-fret').addEventListener('change', (e) => {
            this.settings.minFret = parseInt(e.target.value);
        });

        document.getElementById('spot-max-fret').addEventListener('change', (e) => {
            this.settings.maxFret = parseInt(e.target.value);
        });
    }

    startSession() {
        this.isSessionActive = true;
        this.score = { correct: 0, incorrect: 0, streak: 0 };

        document.getElementById('spot-correct-count').textContent = '0';
        document.getElementById('spot-incorrect-count').textContent = '0';
        document.getElementById('spot-streak-count').textContent = '0';

        document.getElementById('spot-start-screen').classList.remove('active');
        document.getElementById('spot-session-controls').style.display = 'flex';
        document.getElementById('spot-game').classList.add('active');

        this.generateQuestion();
    }

    endSession() {
        this.isSessionActive = false;

        document.querySelectorAll('#spot-note-module .game-content').forEach(c => c.classList.remove('active'));
        document.getElementById('spot-start-screen').classList.add('active');
        document.getElementById('spot-session-controls').style.display = 'none';
    }

    generateQuestion() {
        if (!this.isSessionActive) return;

        // Pick random note
        this.currentNote = this.guitar.getRandomNote(this.settings.includeSharps);

        // Find all positions for this note
        this.correctPositions = {};
        for (let string = 1; string <= 6; string++) {
            const fret = this.guitar.getFretForNote(string, this.currentNote);
            if (fret >= this.settings.minFret && fret <= this.settings.maxFret) {
                this.correctPositions[string] = fret;
            }
        }

        // Select which strings to pre-fill based on level
        // Level 1 = show 5 (easiest), Level 5 = show 1 (hardest)
        const stringsToShow = 6 - this.level;
        const allStrings = [1, 2, 3, 4, 5, 6].filter(s => this.correctPositions[s] !== undefined);
        this.prefilledStrings = this.selectRandomStrings(allStrings, stringsToShow);

        console.log(`Level ${this.level}: Showing ${stringsToShow} strings, user finds ${this.level}`);

        // Reset user selections
        this.userSelections = {};

        // Update UI
        document.getElementById('spot-target-note').textContent = this.guitar.getNoteDisplayName(this.currentNote);

        // Clear fretboard and show prefilled
        this.fretboardDisplay.clearHighlights();
        this.fretboardDisplay.setFretRange(this.settings.minFret, this.settings.maxFret);

        this.prefilledStrings.forEach(string => {
            const fret = this.correctPositions[string];
            this.fretboardDisplay.highlightPosition(string, fret);
            this.userSelections[string] = fret; // Mark as filled
        });
    }

    selectRandomStrings(arr, count) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    handleClick(string, fret) {
        if (!this.isSessionActive) return;
        if (this.prefilledStrings.includes(string)) return; // Can't click prefilled

        const correctFret = this.correctPositions[string];
        const isCorrect = fret === correctFret;

        // Show immediate feedback
        if (isCorrect) {
            this.fretboardDisplay.highlightPosition(string, fret);
            this.userSelections[string] = fret;
            this.showFeedback(`✓ Correct! ${this.currentNote} on string ${string}`, true);
        } else {
            const actualNote = this.guitar.getNoteAtFret(string, fret);
            this.showFeedback(`✗ Wrong! That's ${actualNote}. ${this.currentNote} is at fret ${correctFret}`, false);
            this.score.incorrect++;
            this.score.streak = 0;
            document.getElementById('spot-incorrect-count').textContent = this.score.incorrect;
            document.getElementById('spot-streak-count').textContent = this.score.streak;
        }

        // Check if all strings are filled correctly
        setTimeout(() => {
            if (this.checkCompletion()) {
                this.handleCompletion();
            }
        }, 100);
    }

    checkCompletion() {
        const requiredStrings = Object.keys(this.correctPositions).map(s => parseInt(s));
        return requiredStrings.every(string => this.userSelections[string] === this.correctPositions[string]);
    }

    handleCompletion() {
        this.score.correct++;
        this.score.streak++;
        document.getElementById('spot-correct-count').textContent = this.score.correct;
        document.getElementById('spot-streak-count').textContent = this.score.streak;

        this.showFeedback(`🎉 Perfect! You found all instances of ${this.currentNote}!`, true);

        // Move to next question after delay
        setTimeout(() => {
            this.clearFeedback();
            this.generateQuestion();
        }, 2000);
    }

    showFeedback(message, isCorrect) {
        const feedback = document.getElementById('spot-feedback');
        feedback.textContent = message;
        feedback.className = 'feedback show ' + (isCorrect ? 'correct' : 'incorrect');

        // Only clear feedback for incorrect answers
        if (!isCorrect) {
            setTimeout(() => {
                feedback.className = 'feedback';
            }, 1500);
        }
    }

    clearFeedback() {
        const feedback = document.getElementById('spot-feedback');
        feedback.className = 'feedback';
    }
}
