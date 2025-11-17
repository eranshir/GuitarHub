// AlphaTab Adapter - Bidirectional sync between TabComposition and alphaTab Score
class AlphaTabAdapter {
    constructor() {
        this.alphaTabApi = null;
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
        score.tempo = composition.tempo;

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

            // Set tempo (only on first measure typically)
            if (measureIndex === 0) {
                masterBar.tempoAutomation = new alphaTab.model.Automation();
                masterBar.tempoAutomation.value = composition.tempo;
                masterBar.tempoAutomation.type = alphaTab.model.AutomationType.Tempo;
            }

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
