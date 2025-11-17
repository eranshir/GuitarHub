// AlphaTab Adapter - Bidirectional sync between TabComposition and alphaTab Score
class AlphaTabAdapter {
    constructor(containerId) {
        this.containerId = containerId;
        this.alphaTabApi = null;
        this.currentScore = null;
        this.showNotation = false; // Toggle for standard notation
        this.currentComposition = null; // Store composition for click mapping
        this.onNoteClick = null; // Callback for note clicks
        this.onDurationClick = null; // Callback for duration/stem clicks
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

        // Listen for render completion to attach click handlers
        // Note: renderFinished fires before lazy partials are rendered
        this.alphaTabApi.renderFinished.on(() => {
            console.log('alphaTab render finished event');
            // Wait for lazy rendering to complete
            setTimeout(() => {
                this.inspectAlphaTabDOM();
                this.attachClickHandlers();
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

            // Find note numbers (text elements with numeric content and parent beat group)
            const noteElements = Array.from(textElements).filter(el => {
                const content = el.textContent.trim();
                const hasNumber = /^\d+$/.test(content);
                const parentGroup = el.closest('g');
                const isBeatGroup = parentGroup?.className.baseVal.match(/^b\d+$/);
                return hasNumber && isBeatGroup;
            });

            console.log('Note number elements:', noteElements.length);

            if (noteElements.length > 0) {
                const sample = noteElements[0];
                console.log('Sample note element:', sample);
                console.log('Note value:', sample.textContent);
                console.log('Parent group class:', sample.closest('g')?.className.baseVal);
                console.log('Position:', {
                    x: sample.getAttribute('x'),
                    y: sample.getAttribute('y')
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

        // Store composition for click mapping
        this.currentComposition = composition;

        // Convert to AlphaTex and render
        const alphaTex = this.tabCompositionToAlphaTex(composition);
        console.log('Generated AlphaTex:', alphaTex);

        this.alphaTabApi.tex(alphaTex);
        console.log('Composition rendered with alphaTab');
    }

    /**
     * Set callback for note clicks
     */
    setNoteClickHandler(callback) {
        this.onNoteClick = callback;
    }

    /**
     * Set callback for duration clicks (stems)
     */
    setDurationClickHandler(callback) {
        this.onDurationClick = callback;
    }

    /**
     * Attach click handlers to alphaTab-rendered note elements
     */
    attachClickHandlers() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const alphaTabSvg = container.querySelector('.at-surface-svg');
        if (!alphaTabSvg) {
            console.log('No alphaTab SVG found for click handlers');
            return;
        }

        // Find all note text elements (numeric content in beat groups)
        const textElements = alphaTabSvg.querySelectorAll('text');
        const noteElements = Array.from(textElements).filter(el => {
            const content = el.textContent.trim();
            const hasNumber = /^\d+$/.test(content);
            const parentGroup = el.closest('g');
            const isBeatGroup = parentGroup?.className.baseVal.match(/^b\d+$/);
            return hasNumber && isBeatGroup;
        });

        console.log(`Attaching click handlers to ${noteElements.length} notes`);

        // Find ALL path elements near notes (includes stems and flags)
        const pathElements = alphaTabSvg.querySelectorAll('path');
        const stemElements = Array.from(pathElements);

        console.log(`Found ${stemElements.length} note stems`);

        // Find horizontal TAB lines (rect elements) for adding new notes
        const rectElements = alphaTabSvg.querySelectorAll('rect');
        const tabLines = Array.from(rectElements).filter(rect => {
            const width = parseFloat(rect.getAttribute('width'));
            const height = parseFloat(rect.getAttribute('height'));
            // TAB lines are wide and thin
            return width > 50 && height < 2;
        });

        console.log(`Found ${tabLines.length} TAB lines for new note clicks`);

        // Make TAB lines clickable for adding notes
        tabLines.forEach(line => {
            if (line.dataset.clickHandlerAttached) return;

            line.style.cursor = 'crosshair';
            line.style.pointerEvents = 'all'; // Ensure clickable
            line.dataset.clickHandlerAttached = 'true';

            line.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const lineX = parseFloat(line.getAttribute('x'));
                const lineY = parseFloat(line.getAttribute('y'));
                const lineWidth = parseFloat(line.getAttribute('width'));

                // Calculate click position relative to line
                const svgRect = alphaTabSvg.getBoundingClientRect();
                const clickX = e.clientX - svgRect.left;
                const clickY = e.clientY - svgRect.top;

                console.log('TAB line clicked:', { lineX, lineY, clickX, clickY });

                // Check if clicking on a note (near a note element)
                let clickedOnNote = false;
                noteElements.forEach(noteEl => {
                    const noteX = parseFloat(noteEl.getAttribute('x'));
                    const noteY = parseFloat(noteEl.getAttribute('y'));

                    if (Math.abs(clickX - noteX) < 15 && Math.abs(clickY - noteY) < 15) {
                        clickedOnNote = true;
                    }
                });

                if (clickedOnNote) {
                    console.log('Clicked on existing note, ignoring');
                    return; // Let note handler deal with it
                }

                // Calculate which measure and time based on x position
                // Estimate: x position / average beat width
                const relativeX = clickX - lineX;
                const beatWidth = lineWidth / 4; // Rough estimate (4 beats per measure in 4/4)
                const estimatedBeat = Math.floor(relativeX / beatWidth);
                const estimatedTime = estimatedBeat * 0.25; // Quarter note increments

                console.log('Estimated time:', estimatedTime, 'for new note');

                // For now, just log - we'll implement addNewNote callback next
                if (this.onAddNote) {
                    this.onAddNote(0, estimatedTime, lineY, clickX, clickY);
                } else {
                    console.log('onAddNote callback not set');
                }
            });
        });

        // Make path elements (stems/flags) clickable for duration
        stemElements.forEach((stem, index) => {
            if (stem.dataset.clickHandlerAttached) return;

            stem.style.cursor = 'pointer';
            stem.style.pointerEvents = 'all'; // Ensure SVG path is clickable
            stem.dataset.clickHandlerAttached = 'true';

            stem.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                console.log('Path/stem clicked');

                // Find closest note by bbox proximity
                const stemRect = stem.getBoundingClientRect();
                const stemCenterX = stemRect.left + stemRect.width / 2;
                const stemCenterY = stemRect.top + stemRect.height / 2;

                let closestNote = null;
                let minDistance = Infinity;

                noteElements.forEach(noteEl => {
                    const noteRect = noteEl.getBoundingClientRect();
                    const noteCenterX = noteRect.left + noteRect.width / 2;
                    const noteCenterY = noteRect.top + noteRect.height / 2;

                    const distance = Math.sqrt(
                        Math.pow(stemCenterX - noteCenterX, 2) +
                        Math.pow(stemCenterY - noteCenterY, 2)
                    );

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestNote = noteEl;
                    }
                });

                if (closestNote && minDistance < 100) {
                    const beatGroup = closestNote.closest('g');
                    const beatClass = beatGroup.className.baseVal;
                    const beatIndex = parseInt(beatClass.replace('b', ''));

                    const noteData = this.mapBeatIndexToNote(beatIndex);

                    if (noteData && this.onDurationClick) {
                        this.onDurationClick(noteData.measureIndex, noteData.event.time, false, e, stemCenterX, stemCenterY);
                    }
                }
            });
        });

        // Attach click handler to each note (only if not already attached)
        noteElements.forEach(noteEl => {
            // Skip if already has handler
            if (noteEl.dataset.clickHandlerAttached) return;

            noteEl.style.cursor = 'pointer';
            noteEl.dataset.clickHandlerAttached = 'true';

            noteEl.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent any default behavior

                const fret = parseInt(noteEl.textContent);
                const beatGroup = noteEl.closest('g');
                const beatClass = beatGroup.className.baseVal;
                const beatIndex = parseInt(beatClass.replace('b', ''));

                console.log('Note clicked:', { fret, beatIndex, element: noteEl });

                // Map beat index to composition data
                const noteData = this.mapBeatIndexToNote(beatIndex);

                if (noteData && this.onNoteClick) {
                    // Get position for radial menu
                    const rect = noteEl.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;

                    this.onNoteClick(noteData.measureIndex, noteData.event, e, x, y);
                }
            }, { once: false }); // Allow multiple clicks on same note
        });
    }

    /**
     * Map alphaTab beat index to our composition note data
     */
    mapBeatIndexToNote(beatIndex) {
        if (!this.currentComposition) return null;

        // Flatten all events from all measures with their indices
        let currentBeatIndex = 0;

        for (let measureIndex = 0; measureIndex < this.currentComposition.measures.length; measureIndex++) {
            const measure = this.currentComposition.measures[measureIndex];
            const eventsByTime = this.groupEventsByTime(measure.events);
            const times = Array.from(eventsByTime.keys()).sort((a, b) => a - b);

            for (let time of times) {
                const events = eventsByTime.get(time);

                if (currentBeatIndex === beatIndex) {
                    // Found the beat - return first event (could be chord)
                    return {
                        measureIndex,
                        event: events[0]
                    };
                }

                currentBeatIndex++;
            }
        }

        return null;
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
