// Chord Voicing Generator - generates chord shapes at different positions on the fretboard
class ChordVoicingGenerator {
    constructor(guitar) {
        this.guitar = guitar;
        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }

    // Generate all voicings for a given root and quality
    generateVoicings(rootNote, quality, stringSets = ['all']) {
        const voicings = [];
        const rootNoteNormalized = this.normalizeNote(rootNote);

        // Get chord tones based on quality
        const chordTones = this.getChordTones(rootNoteNormalized, quality);

        // Generate voicings across different fret ranges and string combinations
        // We'll scan the fretboard in sections
        for (let startFret = 0; startFret <= 12; startFret++) {
            // Try different string combinations
            const stringCombinations = this.getStringCombinations(stringSets);

            for (const stringCombo of stringCombinations) {
                // Generate voicings for this string combination at this position
                const voicing = this.findVoicingInRegion(
                    rootNoteNormalized,
                    chordTones,
                    quality,
                    stringCombo,
                    startFret,
                    startFret + 4 // Within a 4-fret span
                );

                if (voicing) {
                    voicings.push(voicing);
                }
            }
        }

        // Sort by position on fretboard (lowest fret first)
        voicings.sort((a, b) => {
            const minFretA = Math.min(...a.positions.map(p => p.fret));
            const minFretB = Math.min(...b.positions.map(p => p.fret));
            return minFretA - minFretB;
        });

        // Remove duplicates (same positions on fretboard)
        const uniqueVoicings = [];
        const seen = new Set();
        for (const voicing of voicings) {
            const key = voicing.positions.map(p => `${p.string}-${p.fret}`).sort().join(',');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueVoicings.push(voicing);
            }
        }

        return uniqueVoicings;
    }

    // Get all chord tones for a given quality
    getChordTones(root, quality) {
        const rootIndex = this.getNoteIndex(root);
        const tones = { root, third: null, fifth: null, seventh: null, ninth: null, eleventh: null, thirteenth: null };

        // Calculate intervals based on quality
        if (quality === 'major') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
        } else if (quality === 'minor') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
        } else if (quality === 'diminished') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 6) % 12]; // Diminished 5th
        } else if (quality === 'augmented') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 8) % 12]; // Augmented 5th
        } else if (quality === 'sus2') {
            tones.third = this.notes[(rootIndex + 2) % 12]; // Major 2nd (instead of 3rd)
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
        } else if (quality === 'sus4') {
            tones.third = this.notes[(rootIndex + 5) % 12]; // Perfect 4th (instead of 3rd)
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
        } else if (quality === 'dominant7') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
        } else if (quality === 'major7') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 11) % 12]; // Major 7th
        } else if (quality === 'minor7') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
        } else if (quality === 'diminished7') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 6) % 12]; // Diminished 5th
            tones.seventh = this.notes[(rootIndex + 9) % 12]; // Diminished 7th
        } else if (quality === 'minorMajor7') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 11) % 12]; // Major 7th
        } else if (quality === '7sus4') {
            tones.third = this.notes[(rootIndex + 5) % 12]; // Perfect 4th
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
        } else if (quality === '7b5') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 6) % 12]; // Diminished 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
        } else if (quality === '7b9') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.ninth = this.notes[(rootIndex + 13) % 12]; // Flat 9th
        } else if (quality === '7sharp9') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.ninth = this.notes[(rootIndex + 15) % 12]; // Sharp 9th
        } else if (quality === '7sharp11') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.eleventh = this.notes[(rootIndex + 18) % 12]; // Sharp 11th
        } else if (quality === 'add9') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
        } else if (quality === '6') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 9) % 12]; // Major 6th (instead of 7th)
        } else if (quality === 'm6') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 9) % 12]; // Major 6th
        } else if (quality === '6add9') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 9) % 12]; // Major 6th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
        } else if (quality === '9') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
        } else if (quality === 'm9') {
            tones.third = this.notes[(rootIndex + 3) % 12]; // Minor 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
        } else if (quality === 'maj9') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 11) % 12]; // Major 7th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
        } else if (quality === '11') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
            tones.eleventh = this.notes[(rootIndex + 17) % 12]; // Perfect 11th
        } else if (quality === '13') {
            tones.third = this.notes[(rootIndex + 4) % 12]; // Major 3rd
            tones.fifth = this.notes[(rootIndex + 7) % 12]; // Perfect 5th
            tones.seventh = this.notes[(rootIndex + 10) % 12]; // Minor 7th
            tones.ninth = this.notes[(rootIndex + 14) % 12]; // Major 9th
            tones.thirteenth = this.notes[(rootIndex + 21) % 12]; // Major 13th
        }

        return tones;
    }

    // Get string combinations to try
    getStringCombinations(stringSets) {
        const combinations = [];

        if (stringSets.includes('all') || stringSets.includes('6-string')) {
            combinations.push([1, 2, 3, 4, 5, 6]); // All strings
            combinations.push([2, 3, 4, 5, 6]);    // Skip high E
            combinations.push([1, 2, 3, 4, 5]);    // Skip low E
        }

        if (stringSets.includes('all') || stringSets.includes('4-string')) {
            combinations.push([1, 2, 3, 4]);       // Top 4 strings
            combinations.push([2, 3, 4, 5]);       // Middle-high 4 strings
            combinations.push([3, 4, 5, 6]);       // Bottom 4 strings
        }

        if (stringSets.includes('all') || stringSets.includes('3-string')) {
            combinations.push([1, 2, 3]);          // Top 3 strings
            combinations.push([2, 3, 4]);          // Middle-high 3 strings
            combinations.push([3, 4, 5]);          // Middle 3 strings
            combinations.push([4, 5, 6]);          // Bottom 3 strings
        }

        // Additional combinations for variety
        if (stringSets.includes('all')) {
            combinations.push([1, 2, 3, 4, 5, 6]); // All 6
            combinations.push([1, 3, 4, 5]);       // Skip string 2
            combinations.push([2, 4, 5, 6]);       // Skip strings 1 and 3
        }

        return combinations;
    }

    // Find a valid voicing in a specific region
    findVoicingInRegion(root, chordTones, quality, strings, minFret, maxFret) {
        const positions = [];
        const muted = [];
        const requiredNotes = [chordTones.root, chordTones.third, chordTones.fifth];

        // Add extended tones to the pool
        if (chordTones.seventh) requiredNotes.push(chordTones.seventh);
        if (chordTones.ninth) requiredNotes.push(chordTones.ninth);
        if (chordTones.eleventh) requiredNotes.push(chordTones.eleventh);
        if (chordTones.thirteenth) requiredNotes.push(chordTones.thirteenth);

        const foundNotes = new Set();

        // Try to find chord tones on each string
        for (const string of strings) {
            let bestMatch = null;
            let bestFret = null;

            // Search for chord tones on this string within the fret range
            for (let fret = minFret; fret <= Math.min(maxFret, 15); fret++) {
                const note = this.guitar.getNoteAtFret(string, fret);
                const normalizedNote = this.normalizeNote(note);

                if (requiredNotes.includes(normalizedNote)) {
                    // Prefer root notes, then thirds, then others
                    if (normalizedNote === root && !foundNotes.has('root')) {
                        bestMatch = normalizedNote;
                        bestFret = fret;
                        foundNotes.add('root');
                        break;
                    } else if (normalizedNote === chordTones.third && !foundNotes.has('third')) {
                        bestMatch = normalizedNote;
                        bestFret = fret;
                        foundNotes.add('third');
                    } else if (!bestMatch) {
                        bestMatch = normalizedNote;
                        bestFret = fret;
                    }
                }
            }

            if (bestFret !== null) {
                positions.push({ string, fret: bestFret });
            }
        }

        // Mark unused strings as muted
        for (let str = 1; str <= 6; str++) {
            if (!strings.includes(str)) {
                muted.push(str);
            }
        }

        // Validate: must have at least root and third (or 2nd/4th for sus chords)
        if (positions.length < 2 || !foundNotes.has('root') || !foundNotes.has('third')) {
            return null;
        }

        // Calculate span to ensure it's playable
        const frets = positions.map(p => p.fret).filter(f => f > 0);
        if (frets.length > 0) {
            const span = Math.max(...frets) - Math.min(...frets);
            if (span > 4) return null; // Not playable with one hand position
        }

        // Count required fingers (must be 4 or fewer)
        const requiredFingers = this.countRequiredFingers(positions);
        if (requiredFingers > 4) {
            return null; // Too many fingers required
        }

        const minFretInShape = Math.min(...positions.map(p => p.fret));
        const numStrings = positions.length;

        return {
            name: `${root}${this.getQualitySuffix(quality)} (${numStrings} strings, fret ${minFretInShape})`,
            positions,
            muted,
            quality,
            rootFret: minFretInShape,
            stringSet: `${numStrings}-string`
        };
    }

    // Count how many fingers are required to play a voicing
    countRequiredFingers(positions) {
        // Open strings (fret 0) don't require fingers
        const frettedPositions = positions.filter(p => p.fret > 0);

        if (frettedPositions.length === 0) return 0;

        // Group positions by fret number
        const fretGroups = {};
        for (const pos of frettedPositions) {
            if (!fretGroups[pos.fret]) {
                fretGroups[pos.fret] = [];
            }
            fretGroups[pos.fret].push(pos.string);
        }

        // Count unique frets (each fret position = 1 finger, even if barred)
        // A barre is when multiple strings are played on the same fret
        return Object.keys(fretGroups).length;
    }


    getNoteIndex(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const normalized = this.normalizeNote(note);
        return notes.indexOf(normalized);
    }

    normalizeNote(note) {
        // Convert enharmonic equivalents to sharp notation
        const map = {
            'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
        };
        return map[note] || note;
    }

    getQualitySuffix(quality) {
        const suffixes = {
            'major': '',
            'minor': 'm',
            'diminished': 'dim',
            'augmented': '+',
            'sus2': 'sus2',
            'sus4': 'sus4',
            'dominant7': '7',
            'major7': 'maj7',
            'minor7': 'm7',
            'diminished7': 'dim7',
            'minorMajor7': 'm(maj7)',
            '7sus4': '7sus4',
            '7b5': '7♭5',
            '7b9': '7♭9',
            '7sharp9': '7♯9',
            '7sharp11': '7♯11',
            'add9': 'add9',
            '6': '6',
            'm6': 'm6',
            '6add9': '6/9',
            '9': '9',
            'm9': 'm9',
            'maj9': 'maj9',
            '11': '11',
            '13': '13'
        };
        return suffixes[quality] || '';
    }
}


// Main Chord Positions Game class
class ChordPositionsGame {
    constructor(guitar, audio, chordTheory) {
        this.guitar = guitar;
        this.audio = audio;
        this.chordTheory = chordTheory;
        this.voicingGenerator = new ChordVoicingGenerator(guitar);

        this.currentVoicings = [];
        this.currentIndex = 0;
        this.previousIndex = null;

        this.bpm = 80;
        this.beatsPerMeasure = 4;
        this.metronomeInterval = null;
        this.isMetronomeRunning = false;
        this.currentBeat = 0;

        this.selectedRootNote = 'C';
        this.selectedQualities = ['major'];
        this.selectedStringSets = ['all'];

        this.fretboardDisplay = null;

        this.init();
    }

    init() {
        this.initializeFretboard();
        this.setupEventListeners();
        this.loadSettings();
        this.updateDisplay();
    }

    initializeFretboard() {
        if (!this.fretboardDisplay) {
            this.fretboardDisplay = new FretboardDisplay('fretboard-chord-positions', false, 15);
        }
    }

    setupEventListeners() {
        // BPM slider
        const bpmSlider = document.getElementById('bpm-slider');
        const bpmDisplay = document.getElementById('bpm-display');
        if (bpmSlider && bpmDisplay) {
            bpmSlider.addEventListener('input', (e) => {
                this.bpm = parseInt(e.target.value);
                bpmDisplay.textContent = this.bpm;
                this.saveSettings();

                // Restart metronome if it's running
                if (this.isMetronomeRunning) {
                    this.stopMetronome();
                    this.startMetronome();
                }
            });
        }

        // Toggle metronome
        const toggleBtn = document.getElementById('toggle-metronome');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleMetronome());
        }

        // Play current shape
        const playBtn = document.getElementById('play-current-shape');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.playCurrentShape());
        }

        // Root note selection
        document.querySelectorAll('.root-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.root-note-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                this.selectedRootNote = e.target.dataset.note;
                this.regenerateVoicings();
            });
        });

        // Set default root note (C)
        const defaultRootBtn = document.querySelector('.root-note-btn[data-note="C"]');
        if (defaultRootBtn) {
            defaultRootBtn.classList.add('active');
        }

        // Chord quality selection
        document.querySelectorAll('.quality-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.selectedQualities = Array.from(
                    document.querySelectorAll('.quality-toggle:checked')
                ).map(t => t.dataset.quality);

                if (this.selectedQualities.length === 0) {
                    this.selectedQualities = ['major'];
                    toggle.checked = true;
                }

                this.regenerateVoicings();
            });
        });

        // String set selection
        document.querySelectorAll('.string-set-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const allToggle = document.querySelector('.string-set-toggle[data-set="all"]');

                // If "All Shapes" is toggled on, uncheck other options
                if (e.target.dataset.set === 'all' && e.target.checked) {
                    document.querySelectorAll('.string-set-toggle:not([data-set="all"])').forEach(t => {
                        t.checked = false;
                    });
                }

                // If any specific option is toggled on, uncheck "All Shapes"
                if (e.target.dataset.set !== 'all' && e.target.checked) {
                    if (allToggle) allToggle.checked = false;
                }

                this.selectedStringSets = Array.from(
                    document.querySelectorAll('.string-set-toggle:checked')
                ).map(t => t.dataset.set);

                if (this.selectedStringSets.length === 0) {
                    this.selectedStringSets = ['all'];
                    if (allToggle) allToggle.checked = true;
                }

                this.regenerateVoicings();
            });
        });

        // Accordion toggles (reuse existing chord game logic)
        document.querySelectorAll('.accordion-toggle').forEach(toggle => {
            if (toggle.dataset.target && ['root-note-selector', 'chord-quality-selector', 'string-set-selector'].includes(toggle.dataset.target)) {
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
            }
        });
    }

    regenerateVoicings() {
        // Stop metronome if running
        const wasRunning = this.isMetronomeRunning;
        if (wasRunning) {
            this.stopMetronome();
        }

        // Pick a random quality from selected qualities
        const quality = this.selectedQualities[Math.floor(Math.random() * this.selectedQualities.length)];

        // Generate voicings
        this.currentVoicings = this.voicingGenerator.generateVoicings(
            this.selectedRootNote,
            quality,
            this.selectedStringSets
        );

        this.currentIndex = 0;
        this.previousIndex = null;

        this.updateDisplay();

        // Restart metronome if it was running
        if (wasRunning) {
            this.startMetronome();
        }
    }

    toggleMetronome() {
        if (this.isMetronomeRunning) {
            this.stopMetronome();
        } else {
            this.startMetronome();
        }
    }

    startMetronome() {
        if (this.currentVoicings.length === 0) {
            this.regenerateVoicings();
        }

        this.isMetronomeRunning = true;
        this.currentBeat = 0;

        const toggleBtn = document.getElementById('toggle-metronome');
        if (toggleBtn) {
            toggleBtn.textContent = 'Stop';
            toggleBtn.classList.add('active');
        }

        // Calculate interval: 4 beats in 4/4 time
        const beatDuration = (60 / this.bpm) * 1000; // milliseconds per beat
        const measureDuration = beatDuration * this.beatsPerMeasure;

        // Advance to first shape immediately
        this.advanceToNextShape();

        // Set up metronome to advance every 4 beats
        this.metronomeInterval = setInterval(() => {
            this.advanceToNextShape();
        }, measureDuration);
    }

    stopMetronome() {
        this.isMetronomeRunning = false;

        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        const toggleBtn = document.getElementById('toggle-metronome');
        if (toggleBtn) {
            toggleBtn.textContent = 'Start';
            toggleBtn.classList.remove('active');
        }
    }

    advanceToNextShape() {
        if (this.currentVoicings.length === 0) return;

        this.previousIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.currentVoicings.length;

        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.fretboardDisplay) return;

        // Clear fretboard
        this.fretboardDisplay.clearHighlights();

        // Get current and previous voicings
        const currentVoicing = this.currentVoicings[this.currentIndex];
        const previousVoicing = this.previousIndex !== null ? this.currentVoicings[this.previousIndex] : null;

        // Display previous shape in gray at 50% opacity
        if (previousVoicing && previousVoicing !== currentVoicing) {
            this.displayVoicing(previousVoicing, true);
        }

        // Display current shape in red at full opacity
        if (currentVoicing) {
            this.displayVoicing(currentVoicing, false);

            // Update text display
            document.getElementById('positions-chord-name').textContent = currentVoicing.name;
            document.getElementById('positions-info').textContent =
                `Position ${this.currentIndex + 1} of ${this.currentVoicings.length}`;
        } else {
            document.getElementById('positions-chord-name').textContent = 'No voicings available';
            document.getElementById('positions-info').textContent = 'Select different options';
        }
    }

    displayVoicing(voicing, isPrevious) {
        if (!voicing || !this.fretboardDisplay.container) return;

        voicing.positions.forEach(pos => {
            const position = this.fretboardDisplay.container.querySelector(`#pos-${pos.string}-${pos.fret}`);
            if (position) {
                const marker = position.querySelector('.position-marker');
                if (marker) {
                    marker.classList.add('active');

                    if (isPrevious) {
                        marker.classList.add('previous-chord');
                        marker.style.opacity = '0.5';
                    } else {
                        // Current chord - remove previous chord styling if it exists
                        marker.classList.remove('previous-chord');
                        marker.style.opacity = '1';
                    }
                }
            }
        });

        // Show muted strings
        voicing.muted.forEach(stringNum => {
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
                        // Current chord - remove previous chord styling if it exists
                        marker.classList.remove('previous-chord');
                        marker.style.opacity = '1';
                    }
                }
            }
        });
    }

    playCurrentShape() {
        const currentVoicing = this.currentVoicings[this.currentIndex];
        if (!currentVoicing) return;

        // Build chord object compatible with chordTheory.playChord
        const chordData = {
            positions: currentVoicing.positions,
            muted: currentVoicing.muted
        };

        this.chordTheory.playChord(chordData, this.guitar, this.audio);
    }

    saveSettings() {
        localStorage.setItem('chordPositionsSettings', JSON.stringify({
            bpm: this.bpm,
            selectedRootNote: this.selectedRootNote,
            selectedQualities: this.selectedQualities,
            selectedStringSets: this.selectedStringSets
        }));
    }

    loadSettings() {
        const saved = localStorage.getItem('chordPositionsSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.bpm = settings.bpm || 80;
            this.selectedRootNote = settings.selectedRootNote || 'C';
            this.selectedQualities = settings.selectedQualities || ['major'];
            this.selectedStringSets = settings.selectedStringSets || ['all'];

            // Update UI
            const bpmSlider = document.getElementById('bpm-slider');
            const bpmDisplay = document.getElementById('bpm-display');
            if (bpmSlider && bpmDisplay) {
                bpmSlider.value = this.bpm;
                bpmDisplay.textContent = this.bpm;
            }

            // Update quality checkboxes
            document.querySelectorAll('.quality-toggle').forEach(toggle => {
                toggle.checked = this.selectedQualities.includes(toggle.dataset.quality);
            });

            // Update string set checkboxes
            document.querySelectorAll('.string-set-toggle').forEach(toggle => {
                toggle.checked = this.selectedStringSets.includes(toggle.dataset.set);
            });

            // Update root note button
            document.querySelectorAll('.root-note-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.note === this.selectedRootNote);
            });
        }

        // Generate initial voicings
        this.regenerateVoicings();
    }

    cleanup() {
        this.stopMetronome();
    }
}
