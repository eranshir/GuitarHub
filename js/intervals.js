class IntervalTheory {
    constructor() {
        this.intervals = {
            'm2': { semitones: 1, name: 'Minor 2nd', abbreviation: 'm2' },
            'M2': { semitones: 2, name: 'Major 2nd', abbreviation: 'M2' },
            'm3': { semitones: 3, name: 'Minor 3rd', abbreviation: 'm3' },
            'M3': { semitones: 4, name: 'Major 3rd', abbreviation: 'M3' },
            'P4': { semitones: 5, name: 'Perfect 4th', abbreviation: 'P4' },
            'TT': { semitones: 6, name: 'Tritone', abbreviation: 'TT' },
            'P5': { semitones: 7, name: 'Perfect 5th', abbreviation: 'P5' },
            'm6': { semitones: 8, name: 'Minor 6th', abbreviation: 'm6' },
            'M6': { semitones: 9, name: 'Major 6th', abbreviation: 'M6' },
            'm7': { semitones: 10, name: 'Minor 7th', abbreviation: 'm7' },
            'M7': { semitones: 11, name: 'Major 7th', abbreviation: 'M7' },
            'P8': { semitones: 12, name: 'Octave', abbreviation: 'P8' }
        };
        
        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }
    
    getNoteFromInterval(rootNote, intervalKey, direction = 'ascending') {
        const interval = this.intervals[intervalKey];
        if (!interval) return null;
        
        const rootIndex = this.notes.indexOf(rootNote);
        if (rootIndex === -1) return null;
        
        let semitones = interval.semitones;
        if (direction === 'descending') {
            semitones = -semitones;
        }
        
        let targetIndex = (rootIndex + semitones) % 12;
        if (targetIndex < 0) targetIndex += 12;
        
        return this.notes[targetIndex];
    }
    
    getIntervalBetweenNotes(note1, note2) {
        const index1 = this.notes.indexOf(note1);
        const index2 = this.notes.indexOf(note2);
        
        if (index1 === -1 || index2 === -1) return null;
        
        let semitones = index2 - index1;
        if (semitones < 0) semitones += 12;
        
        for (const [key, interval] of Object.entries(this.intervals)) {
            if (interval.semitones === semitones) {
                return key;
            }
        }
        
        return null;
    }
    
    getIntervalBetweenPositions(string1, fret1, string2, fret2, guitar) {
        const note1 = guitar.getNoteAtFret(string1, fret1);
        const note2 = guitar.getNoteAtFret(string2, fret2);
        
        if (!note1 || !note2) return null;
        
        return this.getIntervalBetweenNotes(note1, note2);
    }
    
    findIntervalPositions(rootString, rootFret, intervalKey, guitar, maxFret = 12) {
        const rootNote = guitar.getNoteAtFret(rootString, rootFret);
        if (!rootNote) return [];
        
        const targetNote = this.getNoteFromInterval(rootNote, intervalKey, 'ascending');
        if (!targetNote) return [];
        
        const positions = [];
        
        for (let string = 1; string <= 6; string++) {
            for (let fret = 0; fret <= maxFret; fret++) {
                const note = guitar.getNoteAtFret(string, fret);
                if (note === targetNote) {
                    positions.push({ string, fret });
                }
            }
        }
        
        return positions;
    }
    
    getRandomInterval(enabledIntervals) {
        const keys = Object.keys(this.intervals).filter(key => enabledIntervals.includes(key));
        if (keys.length === 0) return null;
        
        return keys[Math.floor(Math.random() * keys.length)];
    }
    
    generateIntervalPair(guitar, intervalKey, settings) {
        const { minFret, maxFret, stringPairs, direction } = settings;
        
        // Get valid string combinations based on stringPairs setting
        const validPairs = this.getValidStringPairs(stringPairs);
        
        // Try multiple times to find a valid interval
        for (let attempt = 0; attempt < 50; attempt++) {
            const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
            
            // Random starting position
            const rootFret = Math.floor(Math.random() * (maxFret - minFret + 1)) + minFret;
            const rootNote = guitar.getNoteAtFret(pair.string1, rootFret);
            
            if (!rootNote) continue;
            
            // Calculate target note
            const dir = direction === 'both' ? (Math.random() < 0.5 ? 'ascending' : 'descending') : direction;
            const targetNote = this.getNoteFromInterval(rootNote, intervalKey, dir);
            
            if (!targetNote) continue;
            
            // Find positions for target note on second string
            for (let fret = minFret; fret <= maxFret; fret++) {
                const note = guitar.getNoteAtFret(pair.string2, fret);
                if (note === targetNote) {
                    return {
                        position1: { string: pair.string1, fret: rootFret },
                        position2: { string: pair.string2, fret: fret },
                        rootNote: rootNote,
                        targetNote: targetNote,
                        intervalKey: intervalKey,
                        intervalName: this.intervals[intervalKey].name,
                        direction: dir
                    };
                }
            }
        }
        
        return null;
    }
    
    getValidStringPairs(stringPairs) {
        const pairs = [];
        
        switch (stringPairs) {
            case 'adjacent':
                for (let i = 1; i <= 5; i++) {
                    pairs.push({ string1: i, string2: i + 1 });
                    pairs.push({ string1: i + 1, string2: i });
                }
                break;
            case 'skip':
                for (let i = 1; i <= 4; i++) {
                    pairs.push({ string1: i, string2: i + 2 });
                    pairs.push({ string1: i + 2, string2: i });
                }
                break;
            case 'all':
            default:
                for (let i = 1; i <= 6; i++) {
                    for (let j = 1; j <= 6; j++) {
                        if (i !== j) {
                            pairs.push({ string1: i, string2: j });
                        }
                    }
                }
                break;
        }
        
        return pairs;
    }
}