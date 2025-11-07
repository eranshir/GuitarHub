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

    addEvent(string, fret, duration, leftFinger = null, timeOverride = null) {
        // Ensure we have a measure
        if (this.measures.length === 0) {
            this.addMeasure();
        }

        const event = {
            time: timeOverride !== null ? timeOverride : this.currentTime,
            string: string,
            fret: fret,
            duration: duration,
            leftFinger: leftFinger
        };

        this.measures[this.currentMeasure].events.push(event);

        // Don't auto-advance time here - let the caller handle it
        // This allows multiple notes to be added at the same time

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
        // Calculate total beats in measure
        // Duration values are in whole notes (1 = whole, 0.5 = half, 0.25 = quarter)
        // We need to convert to measure capacity in same units
        // Example: 4/4 means 4 quarter notes = 4 * 0.25 = 1.0 whole notes
        // Example: 3/4 means 3 quarter notes = 3 * 0.25 = 0.75 whole notes
        // Example: 6/8 means 6 eighth notes = 6 * 0.125 = 0.75 whole notes

        const beatValue = 1 / denominator; // e.g., 1/4 = 0.25 for quarter note
        return numerator * beatValue; // e.g., 4 * 0.25 = 1.0 whole notes
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

        // Set cursor to end of composition
        if (composition.measures.length > 0) {
            composition.currentMeasure = composition.measures.length - 1;

            // Find the latest time in the last measure
            const lastMeasure = composition.measures[composition.currentMeasure];
            let maxTime = 0;

            lastMeasure.events.forEach(event => {
                const endTime = event.time + event.duration;
                if (endTime > maxTime) {
                    maxTime = endTime;
                }
            });

            composition.currentTime = maxTime;

            // If at end of measure, move to next measure
            const beatsPerMeasure = composition.getBeatsPerMeasure();
            if (composition.currentTime >= beatsPerMeasure) {
                composition.currentTime = 0;
                composition.currentMeasure++;
                composition.addMeasure();
            }
        }

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
        // Text rendering for export - standard TAB order (high e to low E)
        const stringNames = ['e', 'B', 'G', 'D', 'A', 'E'];
        const stringNumbers = [1, 2, 3, 4, 5, 6];
        let lines = stringNames.map(s => `${s}|`);

        // Group events by time for vertical alignment
        const eventsByTime = {};
        measure.events.forEach(event => {
            const timeKey = event.time.toFixed(4);
            if (!eventsByTime[timeKey]) {
                eventsByTime[timeKey] = {};
            }
            eventsByTime[timeKey][event.string] = event.fret;
        });

        // Sort times
        const times = Object.keys(eventsByTime).map(parseFloat).sort((a, b) => a - b);

        // Build each column
        times.forEach(time => {
            const eventsAtTime = eventsByTime[time.toFixed(4)];

            stringNumbers.forEach((stringNum, idx) => {
                if (eventsAtTime[stringNum] !== undefined) {
                    lines[idx] += `--${eventsAtTime[stringNum]}--`;
                } else {
                    lines[idx] += '-----';
                }
            });
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

        // Render measures in rows (4 measures per row)
        const measuresPerRow = 4;
        let currentRow = null;

        composition.measures.forEach((measure, idx) => {
            // Create new row every 4 measures
            if (idx % measuresPerRow === 0) {
                currentRow = document.createElement('div');
                currentRow.className = 'tab-row';
                this.container.appendChild(currentRow);
            }

            const measureEl = this.renderMeasure(measure, idx);
            currentRow.appendChild(measureEl);
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

        // TAB lines (6 strings) - Standard TAB order: high e to low E
        const tabLinesDiv = document.createElement('div');
        tabLinesDiv.className = 'tab-lines';

        const stringNames = ['e', 'B', 'G', 'D', 'A', 'E']; // High to low
        const stringNumbers = [1, 2, 3, 4, 5, 6]; // Corresponding string numbers
        const stringDivs = [];

        stringNames.forEach((name, idx) => {
            const stringDiv = document.createElement('div');
            stringDiv.className = 'tab-string-line';
            stringDiv.dataset.string = stringNumbers[idx];

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

        // Group events by time (notes at same time = vertical alignment)
        const eventsByTime = {};
        measure.events.forEach(event => {
            // Safety check for malformed events
            if (!event || event.time === null || event.time === undefined) {
                console.warn('Skipping malformed event:', event);
                return;
            }

            const timeKey = event.time.toFixed(4); // Use fixed precision to group same-time events
            if (!eventsByTime[timeKey]) {
                eventsByTime[timeKey] = [];
            }
            eventsByTime[timeKey].push(event);
        });

        // Add notes to the lines - all notes at same time get same horizontal position
        // Position based on sequence order, not duration (uniform spacing)
        const sortedTimes = Object.keys(eventsByTime).map(parseFloat).sort((a, b) => a - b);

        sortedTimes.forEach((time, position) => {
            const timeKey = time.toFixed(4);
            const events = eventsByTime[timeKey];

            events.forEach(event => {
                // Find the correct string div (string 1 = index 0, string 6 = index 5)
                const stringIdx = event.string - 1; // Direct mapping: string 1 -> idx 0
                const stringDiv = stringDivs[stringIdx];
                const line = stringDiv.querySelector('.tab-line');

                const note = document.createElement('span');
                note.className = 'tab-note';
                note.dataset.time = event.time;
                note.dataset.string = event.string;
                note.dataset.fret = event.fret;
                note.dataset.duration = event.duration;
                note.style.left = `${position * 50}px`; // Uniform 50px spacing per note
                note.textContent = event.fret;

                // Click to edit
                note.addEventListener('click', () => {
                    this.onNoteClick && this.onNoteClick(measureIndex, event);
                });

                line.appendChild(note);
            });
        });

        measureDiv.appendChild(tabLinesDiv);

        // Add duration symbols below the TAB
        const durationLine = document.createElement('div');
        durationLine.className = 'duration-line';

        sortedTimes.forEach((time, position) => {
            const timeKey = time.toFixed(4);
            const events = eventsByTime[timeKey];
            // Use duration from first event (all events at same time should have same duration)
            const duration = events[0]?.duration || 0.25; // Default to quarter note if missing

            const durationSymbol = document.createElement('span');
            durationSymbol.className = 'duration-symbol';
            durationSymbol.style.left = `${position * 50}px`; // Match note spacing
            durationSymbol.innerHTML = this.getDurationSymbolSVG(duration);

            durationLine.appendChild(durationSymbol);
        });

        measureDiv.appendChild(durationLine);

        // Calculate measure width based on number of notes (uniform spacing)
        const noteCount = sortedTimes.length;
        const measureWidth = (noteCount * 50) + 60; // 50px per note + padding
        measureDiv.style.minWidth = `${measureWidth}px`;

        return measureDiv;
    }

    getDurationSymbolSVG(duration) {
        const symbols = {
            0.0625: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10" y="2" width="1.5" height="14"/><ellipse cx="7" cy="16" rx="3.5" ry="2.8" transform="rotate(-20 7 16)"/><path d="M11.5 2 Q15 4 15 7 L11.5 6 Z M11.5 5 Q15 7 15 10 L11.5 9 Z"/></svg>', // 16th
            0.125: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10" y="2" width="1.5" height="14"/><ellipse cx="7" cy="16" rx="3.5" ry="2.8" transform="rotate(-20 7 16)"/><path d="M11.5 2 Q15 4 15 7 L11.5 6 Z"/></svg>', // 8th
            0.25: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10" y="2" width="1.5" height="14"/><ellipse cx="7" cy="16" rx="3.5" ry="2.8" transform="rotate(-20 7 16)"/></svg>', // Quarter
            0.375: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10" y="2" width="1.5" height="14"/><ellipse cx="7" cy="16" rx="3.5" ry="2.8" transform="rotate(-20 7 16)"/><path d="M11.5 2 Q15 4 15 7 L11.5 6 Z"/><circle cx="13" cy="16" r="1.2"/></svg>', // Dotted 8th
            0.5: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10" y="2" width="1.5" height="14"/><ellipse cx="7" cy="16" rx="3.5" ry="2.8" transform="rotate(-20 7 16)" fill="white" stroke="currentColor" stroke-width="1.5"/></svg>', // Half
            0.75: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="10" y="2" width="1.5" height="14"/><ellipse cx="7" cy="16" rx="3.5" ry="2.8" transform="rotate(-20 7 16)" fill="white" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="16" r="1.2"/></svg>', // Dotted half
            1: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="14" rx="5" ry="3.5" fill="white" stroke="currentColor" stroke-width="1.5"/></svg>' // Whole
        };

        return symbols[duration] || symbols[0.25]; // Default to quarter note
    }

    setNoteClickHandler(handler) {
        this.onNoteClick = handler;
    }
}


// Current Fretboard State - Tracks what user is building
class FretboardState {
    constructor() {
        this.selectedNotes = []; // [{string, fret, muted: boolean}]
        this.mutedStrings = new Set(); // Track explicitly muted strings
    }

    addNote(string, fret) {
        // Check if already selected
        const exists = this.selectedNotes.find(n => n.string === string);

        if (fret === -1) {
            // Fret -1 means "mute this string"
            if (exists) {
                this.selectedNotes = this.selectedNotes.filter(n => n.string !== string);
            }
            this.mutedStrings.add(string);
        } else {
            // Remove from muted if adding a note
            this.mutedStrings.delete(string);

            if (exists) {
                // Replace existing note on this string
                exists.fret = fret;
            } else {
                this.selectedNotes.push({ string, fret });
            }
        }
    }

    removeNote(string) {
        this.selectedNotes = this.selectedNotes.filter(n => n.string !== string);
        this.mutedStrings.delete(string);
    }

    clear() {
        this.selectedNotes = [];
        this.mutedStrings.clear();
    }

    getNotes() {
        return [...this.selectedNotes];
    }

    getMutedStrings() {
        return Array.from(this.mutedStrings);
    }

    isEmpty() {
        return this.selectedNotes.length === 0 && this.mutedStrings.size === 0;
    }

    isStringMuted(string) {
        return this.mutedStrings.has(string);
    }

    // Detect chord from current shape
    detectChord(chordTheory) {
        if (this.selectedNotes.length === 0) return null;

        // Create positions array compatible with chordTheory
        const positions = this.selectedNotes.map(n => ({ string: n.string, fret: n.fret }));
        const muted = Array.from(this.mutedStrings);

        // Try to find matching chord
        const chord = chordTheory.getChordByPositions(positions, muted);

        return chord ? chord.name : null;
    }
}
