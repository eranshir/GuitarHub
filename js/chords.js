class ChordTheory {
    constructor() {
        // Define common chord shapes in standard tuning
        // Format: { root: 'note', frets: [{string: n, fret: n}, ...], muted: [string numbers] }
        this.chords = {
            // Major chords
            'C': {
                name: 'C Major',
                type: 'major',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'G': {
                name: 'G Major',
                type: 'major',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: null
            },
            'D': {
                name: 'D Major',
                type: 'major',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [5, 6],
                barrePosition: null
            },
            'A': {
                name: 'A Major',
                type: 'major',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'E': {
                name: 'E Major',
                type: 'major',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                barrePosition: null
            },
            'F': {
                name: 'F Major',
                type: 'major',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            
            // Minor chords
            'Am': {
                name: 'A Minor',
                type: 'minor',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'Em': {
                name: 'E Minor',
                type: 'minor',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                barrePosition: null
            },
            'Dm': {
                name: 'D Minor',
                type: 'minor',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [5, 6],
                barrePosition: null
            },
            'Bm': {
                name: 'B Minor',
                type: 'minor',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 4}, {string: 3, fret: 4}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: {fret: 2, strings: [1, 5]}
            },
            
            // 7th chords
            'G7': {
                name: 'G7',
                type: 'dominant7',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: null
            },
            'C7': {
                name: 'C7',
                type: 'dominant7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'D7': {
                name: 'D7',
                type: 'dominant7',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [5, 6],
                barrePosition: null
            },
            'A7': {
                name: 'A7',
                type: 'dominant7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'E7': {
                name: 'E7',
                type: 'dominant7',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                barrePosition: null
            },
            
            // Major 7th chords
            'Cmaj7': {
                name: 'C Major 7',
                type: 'major7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'Gmaj7': {
                name: 'G Major 7',
                type: 'major7',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 2}],
                muted: [],
                barrePosition: null
            },
            'Dmaj7': {
                name: 'D Major 7',
                type: 'major7',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [5, 6],
                barrePosition: null
            },
            'Amaj7': {
                name: 'A Major 7',
                type: 'major7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'Emaj7': {
                name: 'E Major 7',
                type: 'major7',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 1}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                barrePosition: null
            },
            
            // Minor 7th chords
            'Am7': {
                name: 'A Minor 7',
                type: 'minor7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'Em7': {
                name: 'E Minor 7',
                type: 'minor7',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                barrePosition: null
            },
            'Dm7': {
                name: 'D Minor 7',
                type: 'minor7',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [5, 6],
                barrePosition: null
            },
            
            // Four-string moveable shapes (triads) - strings 4-3-2-1
            // Major shapes
            'C_triad_5': {
                name: 'C Major (triad, 5th pos)',
                type: 'triad_major',
                root: 'C',
                positions: [{string: 4, fret: 5}, {string: 3, fret: 5}, {string: 2, fret: 5}, {string: 1, fret: 3}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'D-shape',
                rootString: 4
            },
            'G_triad_3': {
                name: 'G Major (triad, 3rd pos)',
                type: 'triad_major',
                root: 'G',
                positions: [{string: 4, fret: 5}, {string: 3, fret: 4}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'E-shape',
                rootString: 1
            },
            'D_triad_7': {
                name: 'D Major (triad, 7th pos)',
                type: 'triad_major',
                root: 'D',
                positions: [{string: 4, fret: 7}, {string: 3, fret: 7}, {string: 2, fret: 7}, {string: 1, fret: 5}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'D-shape',
                rootString: 4
            },
            'F_triad_5': {
                name: 'F Major (triad, 5th pos)',
                type: 'triad_major',
                root: 'F',
                positions: [{string: 4, fret: 10}, {string: 3, fret: 10}, {string: 2, fret: 10}, {string: 1, fret: 8}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'D-shape',
                rootString: 4
            },
            
            // Minor triad shapes
            'Am_triad_5': {
                name: 'A Minor (triad, 5th pos)',
                type: 'triad_minor',
                root: 'A',
                positions: [{string: 4, fret: 7}, {string: 3, fret: 5}, {string: 2, fret: 5}, {string: 1, fret: 5}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'Dm-shape',
                rootString: 4
            },
            'Em_triad_8': {
                name: 'E Minor (triad, 8th pos)',
                type: 'triad_minor',
                root: 'E',
                positions: [{string: 4, fret: 9}, {string: 3, fret: 9}, {string: 2, fret: 8}, {string: 1, fret: 7}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'Em-shape',
                rootString: 1
            },
            
            // First inversions (3rd in bass)
            'C_1st_inv': {
                name: 'C Major (1st inversion)',
                type: 'inversion_major',
                root: 'C',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}],
                muted: [1],
                barrePosition: null,
                inversion: 1,
                bassNote: 'E'
            },
            'G_1st_inv': {
                name: 'G Major (1st inversion)',
                type: 'inversion_major',
                root: 'G',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: null,
                inversion: 1,
                bassNote: 'B'
            },
            
            // Second inversions (5th in bass)
            'C_2nd_inv': {
                name: 'C Major (2nd inversion)',
                type: 'inversion_major',
                root: 'C',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 3}, {string: 4, fret: 5}, {string: 3, fret: 5}, {string: 2, fret: 5}],
                muted: [1],
                barrePosition: null,
                inversion: 2,
                bassNote: 'G'
            },
            
            // CAGED system shapes (moveable)
            'C_CAGED_C': {
                name: 'C Major (CAGED C-shape)',
                type: 'caged_major',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null,
                cagedShape: 'C'
            },
            'D_CAGED_C': {
                name: 'D Major (CAGED C-shape)',
                type: 'caged_major',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 4}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: null,
                cagedShape: 'C'
            },
            'G_CAGED_E': {
                name: 'G Major (CAGED E-shape)',
                type: 'caged_major',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 5}, {string: 4, fret: 5}, {string: 3, fret: 4}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 3, strings: [1, 6]},
                cagedShape: 'E'
            },
            'A_CAGED_G': {
                name: 'A Major (CAGED G-shape)',
                type: 'caged_major',
                root: 'A',
                positions: [{string: 6, fret: 5}, {string: 5, fret: 4}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 5}, {string: 1, fret: 5}],
                muted: [],
                barrePosition: null,
                cagedShape: 'G'
            },
            
            // Higher position chords
            'C_8th_pos': {
                name: 'C Major (8th position)',
                type: 'major_high',
                root: 'C',
                positions: [{string: 5, fret: 10}, {string: 4, fret: 10}, {string: 3, fret: 9}, {string: 2, fret: 8}, {string: 1, fret: 8}],
                muted: [6],
                barrePosition: {fret: 8, strings: [1, 2]},
                position: 8
            },
            'Am_5th_pos': {
                name: 'A Minor (5th position)',
                type: 'minor_high',
                root: 'A',
                positions: [{string: 6, fret: 5}, {string: 5, fret: 7}, {string: 4, fret: 7}, {string: 3, fret: 5}, {string: 2, fret: 5}, {string: 1, fret: 5}],
                muted: [],
                barrePosition: {fret: 5, strings: [1, 6]},
                position: 5
            }
        };
        
        // Group chords by type for easier filtering
        this.chordTypes = {
            'major': ['C', 'G', 'D', 'A', 'E', 'F'],
            'minor': ['Am', 'Em', 'Dm', 'Bm'],
            'dominant7': ['G7', 'C7', 'D7', 'A7', 'E7'],
            'major7': ['Cmaj7', 'Gmaj7', 'Dmaj7', 'Amaj7', 'Emaj7'],
            'minor7': ['Am7', 'Em7', 'Dm7'],
            'triad_major': ['C_triad_5', 'G_triad_3', 'D_triad_7', 'F_triad_5'],
            'triad_minor': ['Am_triad_5', 'Em_triad_8'],
            'inversion_major': ['C_1st_inv', 'G_1st_inv', 'C_2nd_inv'],
            'caged_major': ['C_CAGED_C', 'D_CAGED_C', 'G_CAGED_E', 'A_CAGED_G'],
            'major_high': ['C_8th_pos'],
            'minor_high': ['Am_5th_pos']
        };
    }
    
    getRandomChord(enabledTypes = ['major', 'minor']) {
        const availableChords = [];
        for (const type of enabledTypes) {
            if (this.chordTypes[type]) {
                availableChords.push(...this.chordTypes[type]);
            }
        }
        
        console.log('getRandomChord - Available chords:', availableChords, 'from types:', enabledTypes);
        
        if (availableChords.length === 0) return null;
        
        const randomKey = availableChords[Math.floor(Math.random() * availableChords.length)];
        const chord = this.chords[randomKey];
        
        if (!chord) {
            console.error('Chord not found for key:', randomKey);
            return null;
        }
        
        return { key: randomKey, ...chord };
    }
    
    compareChordPositions(positions1, positions2) {
        if (positions1.length !== positions2.length) return false;
        
        // Sort both arrays for comparison
        const sorted1 = [...positions1].sort((a, b) => a.string - b.string || a.fret - b.fret);
        const sorted2 = [...positions2].sort((a, b) => a.string - b.string || a.fret - b.fret);
        
        return sorted1.every((pos, index) => 
            pos.string === sorted2[index].string && 
            pos.fret === sorted2[index].fret
        );
    }
    
    getChordByPositions(positions) {
        for (const [key, chord] of Object.entries(this.chords)) {
            if (this.compareChordPositions(chord.positions, positions)) {
                return { key, ...chord };
            }
        }
        return null;
    }
    
    playChord(chord, guitar, audio) {
        const frequencies = [];
        
        // Add open strings if not muted
        for (let string = 1; string <= 6; string++) {
            if (!chord.muted.includes(string)) {
                const hasPosition = chord.positions.some(pos => pos.string === string);
                if (!hasPosition) {
                    // Open string
                    const freq = guitar.getFrequency(string, 0);
                    if (freq) frequencies.push(freq);
                }
            }
        }
        
        // Add fretted notes
        for (const pos of chord.positions) {
            const freq = guitar.getFrequency(pos.string, pos.fret);
            if (freq) frequencies.push(freq);
        }
        
        if (frequencies.length > 0) {
            audio.playChord(frequencies, 2000);
        }
    }
}