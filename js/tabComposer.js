// TAB Composer - Data structures and rendering for guitar tablature composition

// TAB Data Structure - Time-indexed events
class TabComposition {
    constructor() {
        this.title = "Untitled";
        this.tempo = 120;
        this.timeSignature = "4/4";
        this.measures = [];
        this.currentMeasure = 0;
        this.currentTime = 0; // Current position in beats within measure
    }

    addEvent(string, fret, duration, leftFinger = null) {
        // Ensure we have a measure
        if (this.measures.length === 0) {
            this.addMeasure();
        }

        const event = {
            time: this.currentTime,
            string: string,
            fret: fret,
            duration: duration,
            leftFinger: leftFinger
        };

        this.measures[this.currentMeasure].events.push(event);

        // Advance current time
        this.currentTime += duration;

        // Check if we need a new measure
        const beatsPerMeasure = this.getBeatsPerMeasure();
        if (this.currentTime >= beatsPerMeasure) {
            this.currentTime = 0;
            this.currentMeasure++;
            this.addMeasure();
        }

        return event;
    }

    addMeasure(timeSignature = null) {
        const measure = {
            timeSignature: timeSignature || this.timeSignature,
            events: [],
            chords: [] // {time: 0, name: "C"}
        };

        this.measures.push(measure);
        return measure;
    }

    addChordAnnotation(measureIndex, time, chordName) {
        if (measureIndex < this.measures.length) {
            this.measures[measureIndex].chords.push({
                time: time,
                name: chordName
            });
        }
    }

    getBeatsPerMeasure() {
        const [numerator, denominator] = this.timeSignature.split('/').map(Number);
        // For now, simple calculation (assumes denominator is beat unit)
        return numerator;
    }

    serialize() {
        return JSON.stringify({
            title: this.title,
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            measures: this.measures,
            version: "1.0"
        });
    }

    static deserialize(jsonString) {
        const data = JSON.parse(jsonString);
        const composition = new TabComposition();
        composition.title = data.title;
        composition.tempo = data.tempo;
        composition.timeSignature = data.timeSignature;
        composition.measures = data.measures;
        return composition;
    }

    exportAsText() {
        let output = `${this.title}\n`;
        output += `Tempo: ${this.tempo} BPM | Time: ${this.timeSignature}\n\n`;

        this.measures.forEach((measure, idx) => {
            output += `Measure ${idx + 1}:\n`;
            output += this.renderMeasureAsText(measure);
            output += '\n';
        });

        return output;
    }

    renderMeasureAsText(measure) {
        // Simple text rendering (improved version will come in TABRenderer)
        const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
        let lines = strings.map(s => `${s}|`);

        // Sort events by time
        const sorted = [...measure.events].sort((a, b) => a.time - b.time);

        // Render each event
        sorted.forEach(event => {
            const stringIdx = 6 - event.string; // Reverse for display
            lines[stringIdx] += `--${event.fret}--`;
        });

        // Close lines
        lines = lines.map(l => l + '|');

        return lines.join('\n');
    }
}


// TAB Renderer - Converts composition data to visual display
class TabRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.composition = null;
    }

    render(composition) {
        this.composition = composition;
        if (!this.container) return;

        this.container.innerHTML = '';

        if (!composition || composition.measures.length === 0) {
            this.container.innerHTML = '<div class="empty-tab">Start composing by clicking the fretboard above!</div>';
            return;
        }

        // Render each measure
        composition.measures.forEach((measure, idx) => {
            const measureEl = this.renderMeasure(measure, idx);
            this.container.appendChild(measureEl);
        });
    }

    renderMeasure(measure, measureIndex) {
        const measureDiv = document.createElement('div');
        measureDiv.className = 'tab-measure';
        measureDiv.dataset.measureIndex = measureIndex;

        // Measure number
        const measureNum = document.createElement('div');
        measureNum.className = 'measure-number';
        measureNum.textContent = `${measureIndex + 1}`;
        measureDiv.appendChild(measureNum);

        // Chord annotations
        if (measure.chords && measure.chords.length > 0) {
            const chordLine = document.createElement('div');
            chordLine.className = 'chord-line';
            measure.chords.forEach(chord => {
                const chordSpan = document.createElement('span');
                chordSpan.className = 'chord-annotation';
                chordSpan.style.left = `${chord.time * 60}px`; // Rough positioning
                chordSpan.textContent = chord.name;
                chordLine.appendChild(chordSpan);
            });
            measureDiv.appendChild(chordLine);
        }

        // TAB lines (6 strings)
        const tabLinesDiv = document.createElement('div');
        tabLinesDiv.className = 'tab-lines';

        const stringNames = ['e', 'B', 'G', 'D', 'A', 'E'];
        const stringDivs = [];

        stringNames.forEach((name, idx) => {
            const stringDiv = document.createElement('div');
            stringDiv.className = 'tab-string-line';
            stringDiv.dataset.string = 6 - idx;

            const label = document.createElement('span');
            label.className = 'string-label-tab';
            label.textContent = name;
            stringDiv.appendChild(label);

            const line = document.createElement('div');
            line.className = 'tab-line';
            stringDiv.appendChild(line);

            stringDivs.push(stringDiv);
            tabLinesDiv.appendChild(stringDiv);
        });

        // Add notes to the lines
        measure.events.forEach(event => {
            const stringIdx = 6 - event.string;
            const stringDiv = stringDivs[stringIdx];
            const line = stringDiv.querySelector('.tab-line');

            const note = document.createElement('span');
            note.className = 'tab-note';
            note.dataset.time = event.time;
            note.dataset.string = event.string;
            note.dataset.fret = event.fret;
            note.style.left = `${event.time * 80}px`; // 80px per beat
            note.textContent = event.fret;

            // Click to edit
            note.addEventListener('click', () => {
                this.onNoteClick && this.onNoteClick(measureIndex, event);
            });

            line.appendChild(note);
        });

        measureDiv.appendChild(tabLinesDiv);

        return measureDiv;
    }

    setNoteClickHandler(handler) {
        this.onNoteClick = handler;
    }
}


// Current Fretboard State - Tracks what user is building
class FretboardState {
    constructor() {
        this.selectedNotes = []; // [{string, fret}]
    }

    addNote(string, fret) {
        // Check if already selected
        const exists = this.selectedNotes.find(n => n.string === string);
        if (exists) {
            // Replace existing note on this string
            exists.fret = fret;
        } else {
            this.selectedNotes.push({ string, fret });
        }
    }

    removeNote(string) {
        this.selectedNotes = this.selectedNotes.filter(n => n.string !== string);
    }

    clear() {
        this.selectedNotes = [];
    }

    getNotes() {
        return [...this.selectedNotes];
    }

    isEmpty() {
        return this.selectedNotes.length === 0;
    }

    // Detect chord from current shape
    detectChord(chordTheory) {
        if (this.isEmpty()) return null;

        // Create positions array compatible with chordTheory
        const positions = this.selectedNotes.map(n => ({ string: n.string, fret: n.fret }));

        // Try to find matching chord
        const chord = chordTheory.getChordByPositions(positions);
        return chord ? chord.name : null;
    }
}
