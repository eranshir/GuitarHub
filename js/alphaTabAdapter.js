// AlphaTab Adapter - Bidirectional sync between TabComposition and alphaTab Score
class AlphaTabAdapter {
    constructor(containerId) {
        this.containerId = containerId;
        this.alphaTabApi = null;
        this.currentScore = null;
        this.showNotation = false; // Toggle for standard notation
    }

    /**
     * Initialize alphaTab API
     */
    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('alphaTab container not found:', this.containerId);
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create alphaTab settings
        const settings = {
            core: {
                engine: 'svg', // SVG for better quality and DOM access
                logLevel: 1 // Warnings only
            },
            display: {
                scale: 1.0,
                stretchForce: 0.8,
                layoutMode: alphaTab.LayoutMode.Horizontal
            },
            notation: {
                notationMode: this.showNotation
                    ? alphaTab.NotationMode.GuitarPro
                    : alphaTab.NotationMode.SongBook, // SongBook = TAB only
                rhythmMode: alphaTab.TabRhythmMode.ShowWithBars,
                elements: {
                    scoreTitle: false,
                    scoreWordsAndMusic: false,
                    effectTempo: false
                }
            }
        };

        // Initialize alphaTab
        this.alphaTabApi = new alphaTab.AlphaTabApi(container, settings);

        // Listen for render completion to inspect DOM
        // Note: renderFinished fires before lazy partials are rendered
        this.alphaTabApi.renderFinished.on(() => {
            console.log('alphaTab render finished event');
            // Wait for lazy rendering to complete
            setTimeout(() => {
                this.inspectAlphaTabDOM();
            }, 500); // Give time for SVG to be inserted
        });

        console.log('alphaTab initialized successfully');

        return this.alphaTabApi;
    }

    /**
     * Inspect alphaTab's rendered DOM to understand structure
     */
    inspectAlphaTabDOM() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        console.log('=== alphaTab DOM Structure ===');
        console.log('Container:', container);
        console.log('Container children:', container.children.length);
        console.log('Container HTML preview:', container.innerHTML.substring(0, 500));

        // Find alphaTab's specific SVG (has class at-surface-svg)
        const alphaTabSvg = container.querySelector('.at-surface-svg');
        console.log('alphaTab SVG:', alphaTabSvg);

        if (alphaTabSvg) {
            const firstSvg = alphaTabSvg;
            console.log('Found alphaTab SVG, inspecting...');

            // alphaTab renders notes as <text> SVG elements
            const textElements = firstSvg.querySelectorAll('text');
            console.log('Text elements:', textElements.length);

            if (textElements.length > 0) {
                console.log('Sample text element:', textElements[0]);
                console.log('Text content:', textElements[0].textContent);
                console.log('Position:', {
                    x: textElements[0].getAttribute('x'),
                    y: textElements[0].getAttribute('y')
                });
            }

            // Look for clickable areas or groups
            const groups = firstSvg.querySelectorAll('g');
            console.log('Group elements:', groups.length);

            // Check for any elements with classes
            const elementsWithClass = firstSvg.querySelectorAll('[class]');
            console.log('Elements with classes:', elementsWithClass.length);
            if (elementsWithClass.length > 0) {
                console.log('Sample classes:', elementsWithClass[0].getAttribute('class'));
            }
        }

        console.log('=== End DOM Inspection ===');
    }

    /**
     * Render a composition using alphaTab
     */
    render(composition) {
        if (!this.alphaTabApi) {
            this.initialize();
        }

        // Convert to AlphaTex and render
        const alphaTex = this.tabCompositionToAlphaTex(composition);
        console.log('Generated AlphaTex:', alphaTex);

        this.alphaTabApi.tex(alphaTex);
        console.log('Composition rendered with alphaTab');
    }

    /**
     * Convert TabComposition to AlphaTex format (text-based)
     * This is simpler and more reliable than manually building Score objects
     */
    tabCompositionToAlphaTex(composition) {
        // Get time signature from composition
        const [num, denom] = composition.timeSignature.split('/');

        // Simplified format without metadata delimiters - just start with notes
        let tex = '';

        // Convert each measure
        composition.measures.forEach((measure, idx) => {

            // Group events by time
            const eventsByTime = this.groupEventsByTime(measure.events);
            const times = Array.from(eventsByTime.keys()).sort((a, b) => a - b);

            if (times.length === 0) {
                // Empty measure - add a rest
                tex += `r.1 `;
            } else {
                times.forEach(time => {
                    const events = eventsByTime.get(time);
                    const duration = events[0].duration;

                    if (events[0].isRest) {
                        // Rest
                        tex += `r.${this.durationToTexNotation(duration)} `;
                    } else if (events.length === 1) {
                        // Single note
                        const e = events[0];
                        tex += `${e.fret}.${e.string}.${this.durationToTexNotation(duration)} `;
                    } else {
                        // Chord (multiple notes at same time)
                        tex += `(`;
                        events.forEach((e, i) => {
                            tex += `${e.fret}.${e.string}`;
                            if (i < events.length - 1) tex += ` `;
                        });
                        tex += `).${this.durationToTexNotation(duration)} `;
                    }
                });
            }

            // Bar separator
            tex += `| `;
        });

        return tex;
    }

    /**
     * Convert duration to AlphaTex notation
     */
    durationToTexNotation(duration) {
        if (duration >= 1) return '1'; // Whole
        if (duration >= 0.5) return '2'; // Half
        if (duration >= 0.25) return '4'; // Quarter
        if (duration >= 0.125) return '8'; // Eighth
        if (duration >= 0.0625) return '16'; // Sixteenth
        return '4'; // Default quarter
    }

    /**
     * Toggle standard notation display
     */
    toggleNotation() {
        this.showNotation = !this.showNotation;

        if (this.alphaTabApi) {
            this.alphaTabApi.settings.notation.notationMode = this.showNotation
                ? alphaTab.NotationMode.GuitarPro
                : alphaTab.NotationMode.SongBook;

            // Re-render with new settings
            this.alphaTabApi.render();
        }

        return this.showNotation;
    }

    /**
     * Convert TabComposition to alphaTab Score format
     * @param {TabComposition} composition - Our internal composition format
     * @returns {alphaTab.model.Score} alphaTab Score object
     */
    tabCompositionToScore(composition) {
        const score = new alphaTab.model.Score();

        // Set score metadata
        score.title = composition.title;
        // Tempo will be set via first master bar

        // Create a single track for guitar
        const track = new alphaTab.model.Track();
        track.name = composition.title;
        track.index = 0;

        // Standard guitar tuning (E A D G B E, from low to high)
        track.tuning = [64, 59, 55, 50, 45, 40]; // MIDI note numbers

        // Create staff for the track
        const staff = new alphaTab.model.Staff();
        staff.track = track;
        track.staves.push(staff);

        score.addTrack(track);

        // Convert measures
        composition.measures.forEach((measure, measureIndex) => {
            const masterBar = new alphaTab.model.MasterBar();

            // Set time signature
            const [numerator, denominator] = (measure.timeSignature || composition.timeSignature).split('/').map(Number);
            masterBar.timeSignatureNumerator = numerator;
            masterBar.timeSignatureDenominator = denominator;

            score.addMasterBar(masterBar);

            // Create bar for this staff
            const bar = new alphaTab.model.Bar();
            bar.staff = staff;
            bar.index = measureIndex;
            staff.addBar(bar);

            // Create voice for the bar
            const voice = new alphaTab.model.Voice();
            voice.bar = bar;
            bar.addVoice(voice);

            // Group events by time to create beats (chords)
            const eventsByTime = this.groupEventsByTime(measure.events);

            // Convert events to beats
            const sortedTimes = Array.from(eventsByTime.keys()).sort((a, b) => a - b);

            sortedTimes.forEach(time => {
                const eventsAtTime = eventsByTime.get(time);
                const beat = new alphaTab.model.Beat();
                beat.voice = voice;
                voice.addBeat(beat);

                // Set duration
                const duration = eventsAtTime[0].duration;
                beat.duration = this.durationToAlphaTab(duration);

                // Add notes to beat
                eventsAtTime.forEach(event => {
                    if (event.isRest) {
                        beat.isEmpty = true;
                    } else {
                        const note = new alphaTab.model.Note();
                        note.beat = beat;

                        // alphaTab uses 1-based string numbering (1 = highest string)
                        // Our system: 1 = high e, 6 = low E
                        // alphaTab: 1 = high e, 6 = low E (same!)
                        note.string = event.string;
                        note.fret = event.fret;

                        beat.addNote(note);
                    }
                });
            });
        });

        return score;
    }

    /**
     * Convert alphaTab Score to TabComposition
     * @param {alphaTab.model.Score} score - alphaTab Score object
     * @param {number} trackIndex - Which track to convert (default: 0)
     * @returns {TabComposition} Our internal composition format
     */
    scoreToTabComposition(score, trackIndex = 0) {
        const composition = new TabComposition();

        composition.title = score.title || "Imported from GP";
        composition.tempo = score.tempo || 120;

        const track = score.tracks[trackIndex];
        if (!track) {
            console.error('Track not found:', trackIndex);
            return composition;
        }

        const staff = track.staves[0]; // Use first staff
        if (!staff) {
            console.error('No staff found in track');
            return composition;
        }

        // Clear the default empty measure
        composition.measures = [];

        // Convert each bar to a measure
        staff.bars.forEach((bar, barIndex) => {
            const masterBar = bar.masterBar;

            // Create measure
            const measure = {
                timeSignature: `${masterBar.timeSignatureNumerator}/${masterBar.timeSignatureDenominator}`,
                events: [],
                chords: []
            };

            // Get the main voice (first voice)
            const voice = bar.voices[0];
            if (!voice) return;

            let currentTime = 0;

            // Convert beats to events
            voice.beats.forEach(beat => {
                const duration = this.alphaTabToDuration(beat.duration);

                if (beat.isEmpty || beat.isRest) {
                    // Rest
                    measure.events.push({
                        time: currentTime,
                        string: null,
                        fret: null,
                        duration: duration,
                        isRest: true,
                        leftFinger: null
                    });
                } else {
                    // Notes
                    beat.notes.forEach(note => {
                        measure.events.push({
                            time: currentTime,
                            string: note.string,
                            fret: note.fret,
                            duration: duration,
                            isRest: false,
                            leftFinger: note.leftHandFinger > 0 ? note.leftHandFinger : null
                        });
                    });
                }

                currentTime += duration;
            });

            composition.measures.push(measure);
        });

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
        }

        return composition;
    }

    /**
     * Group events by time position (for creating chords/simultaneous notes)
     */
    groupEventsByTime(events) {
        const grouped = new Map();

        events.forEach(event => {
            const timeKey = event.time.toFixed(4);
            if (!grouped.has(timeKey)) {
                grouped.set(timeKey, []);
            }
            grouped.get(timeKey).push(event);
        });

        return grouped;
    }

    /**
     * Convert our duration format to alphaTab duration
     * Our format: 1 = whole, 0.5 = half, 0.25 = quarter, etc.
     * alphaTab: Duration enum
     */
    durationToAlphaTab(duration) {
        // Map our decimal durations to alphaTab Duration enum
        if (duration >= 1) return alphaTab.model.Duration.Whole;
        if (duration >= 0.75) return alphaTab.model.Duration.Half; // Dotted half approximated
        if (duration >= 0.5) return alphaTab.model.Duration.Half;
        if (duration >= 0.375) return alphaTab.model.Duration.Quarter; // Dotted eighth approximated
        if (duration >= 0.25) return alphaTab.model.Duration.Quarter;
        if (duration >= 0.125) return alphaTab.model.Duration.Eighth;
        if (duration >= 0.0625) return alphaTab.model.Duration.Sixteenth;
        return alphaTab.model.Duration.Quarter; // Default
    }

    /**
     * Convert alphaTab duration to our format
     */
    alphaTabToDuration(duration) {
        switch (duration) {
            case alphaTab.model.Duration.Whole: return 1.0;
            case alphaTab.model.Duration.Half: return 0.5;
            case alphaTab.model.Duration.Quarter: return 0.25;
            case alphaTab.model.Duration.Eighth: return 0.125;
            case alphaTab.model.Duration.Sixteenth: return 0.0625;
            case alphaTab.model.Duration.ThirtySecond: return 0.03125;
            default: return 0.25; // Default to quarter note
        }
    }

    /**
     * Update a single note in the score
     * Used for editing via radial menu
     */
    updateNoteInScore(score, measureIndex, time, stringNum, newFret) {
        const track = score.tracks[0];
        const staff = track.staves[0];
        const bar = staff.bars[measureIndex];

        if (!bar) return false;

        const voice = bar.voices[0];
        let currentTime = 0;

        // Find the beat at the specified time
        for (let beat of voice.beats) {
            const beatDuration = this.alphaTabToDuration(beat.duration);

            if (Math.abs(currentTime - time) < 0.001) {
                // Found the beat, update the note on this string
                for (let note of beat.notes) {
                    if (note.string === stringNum) {
                        note.fret = newFret;
                        return true;
                    }
                }

                // Note doesn't exist on this string, add it
                const newNote = new alphaTab.model.Note();
                newNote.beat = beat;
                newNote.string = stringNum;
                newNote.fret = newFret;
                beat.addNote(newNote);
                return true;
            }

            currentTime += beatDuration;
        }

        return false;
    }
}
