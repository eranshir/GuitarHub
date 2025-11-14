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
            // Safety check for malformed events
            if (!event || event.time === null || event.time === undefined) {
                console.warn('Skipping malformed event during export:', event);
                return;
            }

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
        const restsByTime = {}; // Track rests separately

        measure.events.forEach(event => {
            // Safety check for malformed events
            if (!event || event.time === null || event.time === undefined) {
                console.warn('Skipping malformed event:', event);
                return;
            }

            const timeKey = event.time.toFixed(4);

            if (event.isRest) {
                // Track rests separately
                restsByTime[timeKey] = event;
            } else {
                // Regular notes
                if (!eventsByTime[timeKey]) {
                    eventsByTime[timeKey] = [];
                }
                eventsByTime[timeKey].push(event);
            }
        });

        // Add notes to the lines - all notes at same time get same horizontal position
        // Position based on sequence order, not duration (uniform spacing)
        // Combine note times and rest times for correct sequential positioning
        const allTimes = [...new Set([...Object.keys(eventsByTime).map(parseFloat), ...Object.keys(restsByTime).map(parseFloat)])].sort((a, b) => a - b);
        const sortedTimes = Object.keys(eventsByTime).map(parseFloat).sort((a, b) => a - b);

        sortedTimes.forEach((time) => {
            const timeKey = time.toFixed(4);
            const events = eventsByTime[timeKey];
            const position = allTimes.indexOf(time); // Use position in combined sequence

            events.forEach(event => {
                // Skip rests (they don't have string/fret)
                if (!event.string || event.isRest) return;

                // Find the correct string div (string 1 = index 0, string 6 = index 5)
                const stringIdx = event.string - 1; // Direct mapping: string 1 -> idx 0
                const stringDiv = stringDivs[stringIdx];
                if (!stringDiv) return; // Safety check

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

        // Add rest markers on the TAB (clickable)
        Object.keys(restsByTime).forEach(timeKey => {
            const time = parseFloat(timeKey);
            const rest = restsByTime[timeKey];
            const position = allTimes.indexOf(time);

            // Create a rest marker that spans all strings
            const restMarker = document.createElement('div');
            restMarker.className = 'rest-marker';
            restMarker.style.left = `${position * 50 + 30}px`; // Offset for string labels
            restMarker.title = 'Click to edit rest';

            // Click to edit rest
            restMarker.addEventListener('click', () => {
                this.onNoteClick && this.onNoteClick(measureIndex, rest);
            });

            tabLinesDiv.appendChild(restMarker);
        });

        measureDiv.appendChild(tabLinesDiv);

        // Add duration symbols below the TAB (including rests)
        const durationLine = document.createElement('div');
        durationLine.className = 'duration-line';

        allTimes.forEach((time, position) => {
            const timeKey = time.toFixed(4);
            const events = eventsByTime[timeKey];
            const rest = restsByTime[timeKey];

            // Use duration from events or rest
            const duration = rest ? rest.duration : (events[0]?.duration || 0.25);
            const isRest = !!rest;

            const durationSymbol = document.createElement('span');
            durationSymbol.className = 'duration-symbol' + (isRest ? ' rest-symbol' : '');
            durationSymbol.style.left = `${position * 50}px`;
            durationSymbol.innerHTML = isRest ? this.getRestSymbolSVG(duration) : this.getDurationSymbolSVG(duration);

            durationLine.appendChild(durationSymbol);
        });

        measureDiv.appendChild(durationLine);

        // Calculate measure width based on number of notes + rests (uniform spacing)
        const totalEvents = allTimes.length;
        const measureWidth = (totalEvents * 50) + 60; // 50px per event + padding
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

    getRestSymbolSVG(duration) {
        const symbols = {
            0.125: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 L8 9 L12 9 L8 15 L12 15 L8 21"/></svg>', // 8th rest
            0.25: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3 Q12 5 10 7 Q8 9 10 11 L12 15 Q10 17 12 19 L10 21"/></svg>', // Quarter rest
            0.5: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="10" width="12" height="3"/></svg>', // Half rest
            1: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="11" width="12" height="3"/></svg>' // Whole rest
        };

        return symbols[duration] || symbols[0.25];
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


// Radial Menu for TAB Note Editing
class RadialNoteMenu {
    constructor(onSelect, onCancel) {
        this.onSelect = onSelect; // Callback: (fret, duration) => void
        this.onCancel = onCancel; // Callback: () => void
        this.container = null;
        this.targetElement = null;
    }

    show(x, y, targetElement, currentFret = null) {
        this.targetElement = targetElement;
        this.hide(); // Remove any existing menu

        this.container = document.createElement('div');
        this.container.className = 'radial-note-menu';
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;

        // Inner ring: Frets 0-12
        const innerRing = this.createFretRing(0, 12, 60, currentFret);
        this.container.appendChild(innerRing);

        // Outer ring: Frets 13-24 (top half) + Duration controls (bottom half)
        const outerRing = this.createOuterRing(currentFret);
        this.container.appendChild(outerRing);

        // Center indicator
        const center = document.createElement('div');
        center.className = 'radial-menu-center';
        center.textContent = currentFret !== null ? currentFret : '?';
        this.container.appendChild(center);

        document.body.appendChild(this.container);

        // Setup cancel handlers
        this.setupCancelHandlers();

        // Animate in
        setTimeout(() => {
            this.container.classList.add('show');
        }, 10);
    }

    createFretRing(startFret, endFret, radius, currentFret) {
        const ring = document.createElement('div');
        ring.className = 'radial-ring inner-ring';

        const fretCount = endFret - startFret + 1;
        const angleStep = (2 * Math.PI) / fretCount;

        for (let i = 0; i <= endFret - startFret; i++) {
            const fret = startFret + i;
            const angle = angleStep * i - Math.PI / 2; // Start at top

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const button = document.createElement('button');
            button.className = 'radial-menu-item fret-button';
            if (fret === currentFret) {
                button.classList.add('current');
            }
            button.textContent = fret;
            button.style.left = `${x}px`;
            button.style.top = `${y}px`;

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onSelect(fret, null); // Select fret only
                this.hide();
            });

            ring.appendChild(button);
        }

        return ring;
    }

    createOuterRing(currentFret) {
        const ring = document.createElement('div');
        ring.className = 'radial-ring outer-ring';
        const radius = 110;

        // Top half: Frets 13-24
        const highFrets = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
        const fretAngleStep = Math.PI / (highFrets.length + 1);

        highFrets.forEach((fret, i) => {
            const angle = Math.PI + fretAngleStep * (i + 1); // Bottom half of circle
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const button = document.createElement('button');
            button.className = 'radial-menu-item fret-button small';
            if (fret === currentFret) {
                button.classList.add('current');
            }
            button.textContent = fret;
            button.style.left = `${x}px`;
            button.style.top = `${y}px`;

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onSelect(fret, null);
                this.hide();
            });

            ring.appendChild(button);
        });

        // Top half: Duration buttons
        const durations = [
            { value: 0.125, label: '♪', title: 'Eighth note' },
            { value: 0.25, label: '♩', title: 'Quarter note' },
            { value: 0.5, label: '𝅗𝅥', title: 'Half note' },
            { value: 1, label: '𝅝', title: 'Whole note' }
        ];
        const durationAngleStep = Math.PI / (durations.length + 1);

        durations.forEach((dur, i) => {
            const angle = -fretAngleStep * (i + 1); // Top half of circle
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const button = document.createElement('button');
            button.className = 'radial-menu-item duration-button';
            button.textContent = dur.label;
            button.title = dur.title;
            button.style.left = `${x}px`;
            button.style.top = `${y}px`;

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onSelect(null, dur.value);
                this.hide();
            });

            ring.appendChild(button);
        });

        return ring;
    }

    setupCancelHandlers() {
        // Click outside to cancel
        const clickHandler = (e) => {
            if (!this.container?.contains(e.target)) {
                this.hide();
            }
        };
        setTimeout(() => {
            document.addEventListener('click', clickHandler, { once: true });
        }, 100);

        // ESC key to cancel
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        };
        document.addEventListener('keydown', escHandler, { once: true });

        // Store handlers for cleanup
        this._clickHandler = clickHandler;
        this._escHandler = escHandler;
    }

    hide() {
        if (this.container) {
            this.container.classList.remove('show');
            setTimeout(() => {
                this.container?.remove();
                this.container = null;
            }, 200);

            if (this.onCancel) {
                this.onCancel();
            }
        }
    }
}


// URL Encoding/Decoding Utilities for sharing compositions
class CompositionShareUtils {
    // Simplified LZ-string compression (basic run-length encoding)
    static compressString(str) {
        // Use native compression if available (not widely supported yet)
        // Fallback to JSON minification to reduce size
        const data = JSON.parse(str);

        // Minify by removing nulls and using shorter keys
        const minified = {
            t: data.title,
            p: data.tempo,
            s: data.timeSignature,
            m: data.measures.map(measure => ({
                s: measure.timeSignature,
                e: measure.events.map(event => {
                    // Compress event data - omit null values
                    const compressed = [event.time, event.string, event.fret, event.duration];
                    if (event.isRest) compressed.push(1); // Flag for rest
                    return compressed;
                }),
                c: measure.chords
            })),
            v: data.version
        };

        return JSON.stringify(minified);
    }

    static decompressString(str) {
        const minified = JSON.parse(str);

        // Expand back to full format
        return JSON.stringify({
            title: minified.t,
            tempo: minified.p,
            timeSignature: minified.s,
            measures: minified.m.map(measure => ({
                timeSignature: measure.s,
                events: measure.e.map(eventData => {
                    const [time, string, fret, duration, isRest] = eventData;
                    return {
                        time,
                        string,
                        fret,
                        duration,
                        leftFinger: null,
                        ...(isRest && { isRest: true })
                    };
                }),
                chords: measure.c
            })),
            version: minified.v
        });
    }

    // Encode composition data to a URL-safe string
    static encodeComposition(composition) {
        const data = {
            title: composition.title,
            tempo: composition.tempo,
            timeSignature: composition.timeSignature,
            measures: composition.measures,
            version: "1.0"
        };

        // Convert to JSON and compress
        const jsonString = JSON.stringify(data);
        const compressed = this.compressString(jsonString);

        console.log('Original JSON length:', jsonString.length);
        console.log('Compressed JSON length:', compressed.length);

        // Convert to UTF-8 bytes first to handle Unicode characters
        const utf8Bytes = new TextEncoder().encode(compressed);

        // Convert bytes to binary string
        let binaryString = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binaryString += String.fromCharCode(utf8Bytes[i]);
        }

        // Now base64 encode
        const base64 = btoa(binaryString);

        // Make URL-safe by replacing characters
        const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        console.log('Base64 length:', urlSafe.length);

        return urlSafe;
    }

    // Decode URL-safe string back to composition
    static decodeComposition(urlSafeString) {
        try {
            // Reverse URL-safe encoding
            let base64 = urlSafeString.replace(/-/g, '+').replace(/_/g, '/');

            // Add padding if needed
            while (base64.length % 4) {
                base64 += '=';
            }

            // Decode base64 to binary string
            const binaryString = atob(base64);

            // Convert binary string to UTF-8 bytes
            const utf8Bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                utf8Bytes[i] = binaryString.charCodeAt(i);
            }

            // Decode UTF-8 bytes to string (compressed)
            const compressedString = new TextDecoder().decode(utf8Bytes);

            // Decompress
            const jsonString = this.decompressString(compressedString);
            const data = JSON.parse(jsonString);

            // Create new composition with decoded data
            const composition = new TabComposition();
            composition.title = data.title;
            composition.tempo = data.tempo;
            composition.timeSignature = data.timeSignature;
            composition.measures = data.measures;

            // Set cursor to end of composition
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

            return composition;
        } catch (error) {
            console.error('Failed to decode composition:', error);
            return null;
        }
    }

    // Generate shareable URL for current composition
    static generateShareURL(composition) {
        const encoded = this.encodeComposition(composition);

        // Build base URL without index.html (for cleaner, more compatible URLs)
        let pathname = window.location.pathname;

        console.log('Original pathname:', pathname);

        if (pathname.endsWith('index.html')) {
            pathname = pathname.replace(/index\.html$/, '');
        }

        // Ensure pathname ends with / to avoid nginx redirect issues
        if (!pathname.endsWith('/')) {
            pathname += '/';
        }

        console.log('Final pathname:', pathname);

        const baseURL = window.location.origin + pathname;
        const finalURL = `${baseURL}?tab=${encoded}#assistant/composer`;

        console.log('Generated share URL:', finalURL);

        return finalURL;
    }

    // Load composition from URL parameters
    static loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabData = urlParams.get('tab');

        if (tabData) {
            return this.decodeComposition(tabData);
        }

        return null;
    }
}
