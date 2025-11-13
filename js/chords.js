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

            // Alternate voicings for common chords
            'C_shape2': {
                name: 'C Major (Barre Shape)',
                type: 'major',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 5}, {string: 3, fret: 5}, {string: 2, fret: 5}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: {fret: 3, strings: [1, 5]}
            },
            'C_shape3': {
                name: 'C Major (High Position)',
                type: 'major',
                root: 'C',
                positions: [{string: 5, fret: 8}, {string: 4, fret: 10}, {string: 3, fret: 10}, {string: 2, fret: 9}, {string: 1, fret: 8}],
                muted: [6],
                barrePosition: {fret: 8, strings: [1, 5]}
            },
            'G_shape2': {
                name: 'G Major (Barre Shape)',
                type: 'major',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 5}, {string: 4, fret: 5}, {string: 3, fret: 4}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 3, strings: [1, 6]}
            },
            'D_shape2': {
                name: 'D Major (Barre Shape)',
                type: 'major',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 7}, {string: 3, fret: 7}, {string: 2, fret: 7}, {string: 1, fret: 5}],
                muted: [6],
                barrePosition: {fret: 5, strings: [1, 5]}
            },
            'A_shape2': {
                name: 'A Major (Barre Shape)',
                type: 'major',
                root: 'A',
                positions: [{string: 6, fret: 5}, {string: 5, fret: 7}, {string: 4, fret: 7}, {string: 3, fret: 6}, {string: 2, fret: 5}, {string: 1, fret: 5}],
                muted: [],
                barrePosition: {fret: 5, strings: [1, 6]}
            },
            'E_shape2': {
                name: 'E Major (Barre Shape)',
                type: 'major',
                root: 'E',
                positions: [{string: 5, fret: 7}, {string: 4, fret: 9}, {string: 3, fret: 9}, {string: 2, fret: 9}, {string: 1, fret: 7}],
                muted: [6],
                barrePosition: {fret: 7, strings: [1, 5]}
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
            'Cm': {
                name: 'C Minor',
                type: 'minor',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 5}, {string: 3, fret: 5}, {string: 2, fret: 4}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: {fret: 3, strings: [1, 5]}
            },
            'Fm': {
                name: 'F Minor',
                type: 'minor',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Gm': {
                name: 'G Minor',
                type: 'minor',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 5}, {string: 4, fret: 5}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 3, strings: [1, 6]}
            },

            // Alternate minor voicings
            'Am_shape2': {
                name: 'A Minor (Barre Shape)',
                type: 'minor',
                root: 'A',
                positions: [{string: 6, fret: 5}, {string: 5, fret: 7}, {string: 4, fret: 7}, {string: 3, fret: 5}, {string: 2, fret: 5}, {string: 1, fret: 5}],
                muted: [],
                barrePosition: {fret: 5, strings: [1, 6]}
            },
            'Em_shape2': {
                name: 'E Minor (Barre Shape)',
                type: 'minor',
                root: 'E',
                positions: [{string: 5, fret: 7}, {string: 4, fret: 9}, {string: 3, fret: 9}, {string: 2, fret: 8}, {string: 1, fret: 7}],
                muted: [6],
                barrePosition: {fret: 7, strings: [1, 5]}
            },
            'Dm_shape2': {
                name: 'D Minor (Barre Shape)',
                type: 'minor',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 7}, {string: 3, fret: 7}, {string: 2, fret: 6}, {string: 1, fret: 5}],
                muted: [6],
                barrePosition: {fret: 5, strings: [1, 5]}
            },
            'F#m': {
                name: 'F# Minor',
                type: 'minor',
                root: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 4}, {string: 4, fret: 4}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                barrePosition: {fret: 2, strings: [1, 6]}
            },
            'Bbm': {
                name: 'B♭ Minor',
                type: 'minor',
                root: 'Bb',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            
            // 7th chords (Dominant 7)
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
            'B7': {
                name: 'B7',
                type: 'dominant7',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 0}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: null
            },
            'F7': {
                name: 'F7',
                type: 'dominant7',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Bb7': {
                name: 'B♭7',
                type: 'dominant7',
                root: 'Bb',
                positions: [{string: 5, fret: 1}, {string: 4, fret: 3}, {string: 3, fret: 1}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [6],
                barrePosition: {fret: 1, strings: [1, 3, 5]}
            },
            'F#7': {
                name: 'F#7',
                type: 'dominant7',
                root: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 4}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                barrePosition: {fret: 2, strings: [1, 6]}
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
            'Fmaj7': {
                name: 'F Major 7',
                type: 'major7',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Bmaj7': {
                name: 'B Major 7',
                type: 'major7',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 4}, {string: 3, fret: 3}, {string: 2, fret: 4}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: {fret: 2, strings: [1, 5]}
            },
            'Bbmaj7': {
                name: 'B♭ Major 7',
                type: 'major7',
                root: 'Bb',
                positions: [{string: 5, fret: 1}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [6],
                barrePosition: {fret: 1, strings: [1, 5]}
            },
            'F#maj7': {
                name: 'F# Major 7',
                type: 'major7',
                root: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 4}, {string: 4, fret: 3}, {string: 3, fret: 3}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                barrePosition: {fret: 2, strings: [1, 6]}
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
            'Bm7': {
                name: 'B Minor 7',
                type: 'minor7',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: {fret: 2, strings: [1, 5]}
            },
            'Cm7': {
                name: 'C Minor 7',
                type: 'minor7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 3}, {string: 2, fret: 4}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: {fret: 3, strings: [1, 5]}
            },
            'Fm7': {
                name: 'F Minor 7',
                type: 'minor7',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 1}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Gm7': {
                name: 'G Minor 7',
                type: 'minor7',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 5}, {string: 4, fret: 3}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 3, strings: [1, 6]}
            },
            'F#m7': {
                name: 'F# Minor 7',
                type: 'minor7',
                root: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 4}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                barrePosition: {fret: 2, strings: [1, 6]}
            },
            'Bbm7': {
                name: 'B♭ Minor 7',
                type: 'minor7',
                root: 'Bb',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 1}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            
            // Four-string moveable shapes (triads) - strings 4-3-2-1
            // Major shapes
            'C_triad_3': {
                name: 'C Major (triad, 3rd pos)',
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
            'D_triad_5': {
                name: 'D Major (triad, 5th pos)',
                type: 'triad_major',
                root: 'D',
                positions: [{string: 4, fret: 7}, {string: 3, fret: 7}, {string: 2, fret: 7}, {string: 1, fret: 5}],
                muted: [5, 6],
                barrePosition: null,
                shape: 'D-shape',
                rootString: 4
            },
            'F_triad_8': {
                name: 'F Major (triad, 8th pos)',
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
            'Em_triad_7': {
                name: 'E Minor (triad, 7th pos)',
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
            },
            
            // Suspended chords
            'Csus2': {
                name: 'Csus2',
                type: 'sus2',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                open: [3, 1]
            },
            'Dsus2': {
                name: 'Dsus2',
                type: 'sus2',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [5, 6],
                open: [4, 1]
            },
            'Asus2': {
                name: 'Asus2',
                type: 'sus2',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 2, 1]
            },
            'Esus2': {
                name: 'Esus2',
                type: 'sus2',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 4}, {string: 3, fret: 4}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 2, 1]
            },
            'Gsus2': {
                name: 'Gsus2',
                type: 'sus2',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                open: [5, 4, 3]
            },
            'Fsus2': {
                name: 'Fsus2',
                type: 'sus2',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 5}, {string: 3, fret: 5}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Bsus2': {
                name: 'Bsus2',
                type: 'sus2',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 4}, {string: 3, fret: 6}, {string: 2, fret: 4}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: {fret: 2, strings: [1, 5]}
            },
            'Csus4': {
                name: 'Csus4',
                type: 'sus4',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [6],
                open: [3]
            },
            'Dsus4': {
                name: 'Dsus4',
                type: 'sus4',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [5, 6],
                open: [4]
            },
            'Asus4': {
                name: 'Asus4',
                type: 'sus4',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 1]
            },
            'Esus4': {
                name: 'Esus4',
                type: 'sus4',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 2, 1]
            },
            'Gsus4': {
                name: 'Gsus4',
                type: 'sus4',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 3}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                open: [4, 3]
            },
            'Fsus4': {
                name: 'Fsus4',
                type: 'sus4',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 3}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Bsus4': {
                name: 'Bsus4',
                type: 'sus4',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 4}, {string: 3, fret: 4}, {string: 2, fret: 4}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: {fret: 2, strings: [1, 5]}
            },
            
            // 6th chords
            'C6': {
                name: 'C6',
                type: '6th',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },
            'G6': {
                name: 'G6',
                type: '6th',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [4, 3, 2, 1]
            },
            'D6': {
                name: 'D6',
                type: '6th',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 0}, {string: 1, fret: 2}],
                muted: [5, 6],
                open: [4, 2]
            },
            'A6': {
                name: 'A6',
                type: '6th',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [6],
                open: [5]
            },
            'E6': {
                name: 'E6',
                type: '6th',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 1]
            },
            'F6': {
                name: 'F6',
                type: '6th',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'Am6': {
                name: 'Am6',
                type: 'm6',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [6],
                open: [5]
            },
            'Em6': {
                name: 'Em6',
                type: 'm6',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 3, 1]
            },
            'Dm6': {
                name: 'Dm6',
                type: 'm6',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 0}, {string: 1, fret: 1}],
                muted: [5, 6],
                open: [4, 2]
            },
            'Bm6': {
                name: 'Bm6',
                type: 'm6',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 4}, {string: 3, fret: 4}, {string: 2, fret: 4}, {string: 1, fret: 4}],
                muted: [6],
                barrePosition: {fret: 2, strings: [5]},
            },
            
            // Add9 chords
            'Cadd9': {
                name: 'Cadd9',
                type: 'add9',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [6],
                open: [3, 1]
            },
            'Gadd9': {
                name: 'Gadd9',
                type: 'add9',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 3}],
                muted: [],
                open: [5, 4, 3, 2]
            },
            'Dadd9': {
                name: 'Dadd9',
                type: 'add9',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [5, 6],
                open: [4, 1]
            },
            'Aadd9': {
                name: 'Aadd9',
                type: 'add9',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 1]
            },
            'Eadd9': {
                name: 'Eadd9',
                type: 'add9',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                open: [6]
            },
            'Fadd9': {
                name: 'Fadd9',
                type: 'add9',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },

            // Dominant 9th chords
            'C9': {
                name: 'C9',
                type: '9th',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: null
            },
            'D9': {
                name: 'D9',
                type: '9th',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [5, 6],
                open: [4, 1]
            },
            'E9': {
                name: 'E9',
                type: '9th',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 2}],
                muted: [],
                open: [6, 4, 2]
            },
            'G9': {
                name: 'G9',
                type: '9th',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: null
            },
            'A9': {
                name: 'A9',
                type: '9th',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 3, 1]
            },
            'F9': {
                name: 'F9',
                type: '9th',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },
            'B9': {
                name: 'B9',
                type: '9th',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: null
            },

            // Major 9th chords
            'Cmaj9': {
                name: 'Cmaj9',
                type: 'maj9',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 3}],
                muted: [6],
                open: [3, 2]
            },
            'Dmaj9': {
                name: 'Dmaj9',
                type: 'maj9',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [5, 6],
                open: [4, 1]
            },
            'Emaj9': {
                name: 'Emaj9',
                type: 'maj9',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 1}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 2}],
                muted: [],
                open: [6, 2]
            },
            'Gmaj9': {
                name: 'Gmaj9',
                type: 'maj9',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [4, 3, 2, 1]
            },
            'Amaj9': {
                name: 'Amaj9',
                type: 'maj9',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [6],
                open: [5]
            },

            // Minor 9th chords
            'Am9': {
                name: 'Am9',
                type: 'min9',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [6],
                open: [5, 3]
            },
            'Em9': {
                name: 'Em9',
                type: 'min9',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 2}],
                muted: [],
                open: [6, 4, 3, 2]
            },
            'Dm9': {
                name: 'Dm9',
                type: 'min9',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [5, 6],
                open: [4, 1]
            },
            'Bm9': {
                name: 'Bm9',
                type: 'min9',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },

            // 11th chords (Dominant 11)
            'C11': {
                name: 'C11',
                type: '11th',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [6],
                barrePosition: {fret: 3, strings: [2, 3, 4, 5]}
            },
            'D11': {
                name: 'D11',
                type: '11th',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 5}, {string: 3, fret: 5}, {string: 2, fret: 5}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: {fret: 5, strings: [2, 3, 4, 5]}
            },
            'E11': {
                name: 'E11',
                type: '11th',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 4, 2, 1]
            },
            'G11': {
                name: 'G11',
                type: '11th',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [],
                barrePosition: {fret: 3, strings: [2, 3, 4, 5, 6]}
            },
            'A11': {
                name: 'A11',
                type: '11th',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 4, 3, 2, 1]
            },

            // 13th chords (Dominant 13)
            'C13': {
                name: 'C13',
                type: '13th',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },
            'D13': {
                name: 'D13',
                type: '13th',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [5, 6],
                open: [4]
            },
            'E13': {
                name: 'E13',
                type: '13th',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                open: [6, 4]
            },
            'G13': {
                name: 'G13',
                type: '13th',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 3}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [3, 2, 1]
            },
            'A13': {
                name: 'A13',
                type: '13th',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [6],
                open: [5, 3]
            },
            'F13': {
                name: 'F13',
                type: '13th',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 3}],
                muted: [],
                barrePosition: {fret: 1, strings: [1, 6]}
            },

            // Altered Dominant chords (7#9, 7b9, 7#5, 7b5)
            'E7sharp9': {
                name: 'E7#9',
                type: '7sharp9',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [],
                open: [6, 4]
            },
            'A7sharp9': {
                name: 'A7#9',
                type: '7sharp9',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 3}],
                muted: [6],
                open: [5, 3]
            },
            'E7flat9': {
                name: 'E7♭9',
                type: '7flat9',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [],
                open: [6, 4]
            },
            'A7flat9': {
                name: 'A7♭9',
                type: '7flat9',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 2}, {string: 1, fret: 1}],
                muted: [6],
                open: [5]
            },
            'G7sharp5': {
                name: 'G7#5',
                type: '7sharp5',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 3}, {string: 3, fret: 4}, {string: 2, fret: 4}, {string: 1, fret: 4}],
                muted: [],
                barrePosition: null
            },
            'C7sharp5': {
                name: 'C7#5',
                type: '7sharp5',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 4}, {string: 2, fret: 3}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },
            'D7flat5': {
                name: 'D7♭5',
                type: '7flat5',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [5, 6],
                open: [4]
            },
            'A7flat5': {
                name: 'A7♭5',
                type: '7flat5',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 1}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 3, 1]
            },

            // Diminished 7th chords
            'Cdim7': {
                name: 'C°7',
                type: 'dim7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 2}],
                muted: [6, 1],
                barrePosition: null
            },
            'Ddim7': {
                name: 'D°7',
                type: 'dim7',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 1}],
                muted: [5, 6],
                open: [4, 2]
            },
            'Edim7': {
                name: 'E°7',
                type: 'dim7',
                root: 'E',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 1}],
                muted: [6, 1],
                barrePosition: null
            },
            'Fdim7': {
                name: 'F°7',
                type: 'dim7',
                root: 'F',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}],
                muted: [6, 1],
                open: [3]
            },
            'Gdim7': {
                name: 'G°7',
                type: 'dim7',
                root: 'G',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 4}, {string: 3, fret: 5}, {string: 2, fret: 4}],
                muted: [6, 1],
                barrePosition: null
            },
            'Adim7': {
                name: 'A°7',
                type: 'dim7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 1}],
                muted: [6, 1],
                open: [5]
            },
            'Bdim7': {
                name: 'B°7',
                type: 'dim7',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 3}, {string: 3, fret: 4}, {string: 2, fret: 3}],
                muted: [6, 1],
                barrePosition: null
            },

            // Minor 11th chords
            'Am11': {
                name: 'Am11',
                type: 'min11',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                open: [5, 4, 3, 1]
            },
            'Em11': {
                name: 'Em11',
                type: 'min11',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 4, 3, 2, 1]
            },
            'Dm11': {
                name: 'Dm11',
                type: 'min11',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [5, 6],
                open: [4, 3]
            },

            // Slash chords (Chords with alternate bass notes)
            // Major with bass
            'C/G': {
                name: 'C/G',
                type: 'slash',
                root: 'C',
                bassNote: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [3, 1]
            },
            'C/E': {
                name: 'C/E',
                type: 'slash',
                root: 'C',
                bassNote: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 3, 1]
            },
            'C/B': {
                name: 'C/B',
                type: 'slash',
                root: 'C',
                bassNote: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                open: [3, 1]
            },
            'D/F#': {
                name: 'D/F#',
                type: 'slash',
                root: 'D',
                bassNote: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [],
                open: [5, 4]
            },
            'D/A': {
                name: 'D/A',
                type: 'slash',
                root: 'D',
                bassNote: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [6],
                open: [5, 4]
            },
            'E/G#': {
                name: 'E/G#',
                type: 'slash',
                root: 'E',
                bassNote: 'G#',
                positions: [{string: 6, fret: 4}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [2, 1]
            },
            'E/B': {
                name: 'E/B',
                type: 'slash',
                root: 'E',
                bassNote: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6],
                open: [2, 1]
            },
            'F/C': {
                name: 'F/C',
                type: 'slash',
                root: 'F',
                bassNote: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [6],
                barrePosition: null
            },
            'F/A': {
                name: 'F/A',
                type: 'slash',
                root: 'F',
                bassNote: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [6],
                open: [5]
            },
            'G/B': {
                name: 'G/B',
                type: 'slash',
                root: 'G',
                bassNote: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 3}],
                muted: [6],
                open: [4, 3, 2]
            },
            'G/D': {
                name: 'G/D',
                type: 'slash',
                root: 'G',
                bassNote: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 3}],
                muted: [6, 5],
                open: [4, 3, 2]
            },
            'A/C#': {
                name: 'A/C#',
                type: 'slash',
                root: 'A',
                bassNote: 'C#',
                positions: [{string: 5, fret: 4}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },
            'A/E': {
                name: 'A/E',
                type: 'slash',
                root: 'A',
                bassNote: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 5, 1]
            },

            // Minor with bass
            'Am/E': {
                name: 'Am/E',
                type: 'slash',
                root: 'Am',
                bassNote: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 5, 1]
            },
            'Am/G': {
                name: 'Am/G',
                type: 'slash',
                root: 'Am',
                bassNote: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [5, 1]
            },
            'Am/F#': {
                name: 'Am/F#',
                type: 'slash',
                root: 'Am',
                bassNote: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [5, 1]
            },
            'Am/C': {
                name: 'Am/C',
                type: 'slash',
                root: 'Am',
                bassNote: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },
            'Dm/F': {
                name: 'Dm/F',
                type: 'slash',
                root: 'Dm',
                bassNote: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [],
                open: [5, 4]
            },
            'Dm/A': {
                name: 'Dm/A',
                type: 'slash',
                root: 'Dm',
                bassNote: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 1}],
                muted: [6],
                open: [5, 4]
            },
            'Em/B': {
                name: 'Em/B',
                type: 'slash',
                root: 'Em',
                bassNote: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6],
                open: [3, 2, 1]
            },
            'Em/D': {
                name: 'Em/D',
                type: 'slash',
                root: 'Em',
                bassNote: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6, 5],
                open: [4, 3, 2, 1]
            },
            'Em/G': {
                name: 'Em/G',
                type: 'slash',
                root: 'Em',
                bassNote: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [3, 2, 1]
            },

            // 7th chords with bass
            'G7/B': {
                name: 'G7/B',
                type: 'slash',
                root: 'G7',
                bassNote: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 1}],
                muted: [6],
                open: [4, 3, 2]
            },
            'G7/D': {
                name: 'G7/D',
                type: 'slash',
                root: 'G7',
                bassNote: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 1}],
                muted: [6, 5],
                open: [4, 3, 2]
            },
            'C7/E': {
                name: 'C7/E',
                type: 'slash',
                root: 'C7',
                bassNote: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 1]
            },
            'C7/Bb': {
                name: 'C7/B♭',
                type: 'slash',
                root: 'C7',
                bassNote: 'Bb',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 1}],
                muted: [1],
                barrePosition: null
            },
            'D7/F#': {
                name: 'D7/F#',
                type: 'slash',
                root: 'D7',
                bassNote: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [],
                open: [5, 4]
            },
            'D7/A': {
                name: 'D7/A',
                type: 'slash',
                root: 'D7',
                bassNote: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 0}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [6],
                open: [5, 4]
            },
            'A7/C#': {
                name: 'A7/C#',
                type: 'slash',
                root: 'A7',
                bassNote: 'C#',
                positions: [{string: 5, fret: 4}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [6],
                open: [3, 1]
            },
            'A7/E': {
                name: 'A7/E',
                type: 'slash',
                root: 'A7',
                bassNote: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 2}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 5, 3, 1]
            },
            'E7/G#': {
                name: 'E7/G#',
                type: 'slash',
                root: 'E7',
                bassNote: 'G#',
                positions: [{string: 6, fret: 4}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [4, 2, 1]
            },
            'E7/B': {
                name: 'E7/B',
                type: 'slash',
                root: 'E7',
                bassNote: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [6],
                open: [4, 2, 1]
            },
            'F/C': {
                name: 'F/C',
                type: 'slash',
                root: 'F',
                bassNote: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [6],
                barrePosition: null
            },
            'G/F#': {
                name: 'G/F#',
                type: 'slash',
                root: 'G',
                bassNote: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 2}, {string: 4, fret: 0}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 3}],
                muted: [],
                open: [4, 3, 2]
            },
            
            // Power chords (5th chords)
            'C5': {
                name: 'C5 (Power)',
                type: 'power',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 5}],
                muted: [6, 3, 2, 1],
                open: []
            },
            'D5': {
                name: 'D5 (Power)',
                type: 'power',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 7}],
                muted: [6, 3, 2, 1],
                open: []
            },
            'E5': {
                name: 'E5 (Power)',
                type: 'power',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}],
                muted: [4, 3, 2, 1],
                open: [6]
            },
            'F5': {
                name: 'F5 (Power)',
                type: 'power',
                root: 'F',
                positions: [{string: 6, fret: 1}, {string: 5, fret: 3}],
                muted: [4, 3, 2, 1],
                open: []
            },
            'G5': {
                name: 'G5 (Power)',
                type: 'power',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 5}],
                muted: [4, 3, 2, 1],
                open: []
            },
            'A5': {
                name: 'A5 (Power)',
                type: 'power',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}],
                muted: [6, 3, 2, 1],
                open: [5]
            },
            
            // Diminished and Half-Diminished chords
            'Cdim': {
                name: 'C°',
                type: 'dim',
                root: 'C',
                positions: [{string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 2}, {string: 1, fret: 1}],
                muted: [6, 5],
                open: []
            },
            'Ddim': {
                name: 'D°',
                type: 'dim',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 0}, {string: 1, fret: 1}],
                muted: [6, 5],
                open: [4, 2]
            },
            'Edim': {
                name: 'E°',
                type: 'dim',
                root: 'E',
                positions: [{string: 4, fret: 2}, {string: 3, fret: 3}, {string: 2, fret: 2}, {string: 1, fret: 3}],
                muted: [6, 5],
                open: []
            },
            'Fdim': {
                name: 'F°',
                type: 'dim',
                root: 'F',
                positions: [{string: 4, fret: 3}, {string: 3, fret: 4}, {string: 2, fret: 3}, {string: 1, fret: 4}],
                muted: [6, 5],
                open: []
            },
            'Gdim': {
                name: 'G°',
                type: 'dim',
                root: 'G',
                positions: [{string: 4, fret: 5}, {string: 3, fret: 6}, {string: 2, fret: 5}, {string: 1, fret: 6}],
                muted: [6, 5],
                open: []
            },
            'Adim': {
                name: 'A°',
                type: 'dim',
                root: 'A',
                positions: [{string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 2}],
                muted: [6, 5],
                open: []
            },
            'Bdim': {
                name: 'B°',
                type: 'dim',
                root: 'B',
                positions: [{string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6, 5],
                open: [3, 1]
            },

            // Half-diminished (m7b5) chords
            'Dm7b5': {
                name: 'Dm7♭5',
                type: 'min7b5',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 1}],
                muted: [5, 6],
                barrePosition: null
            },
            'Am7b5': {
                name: 'Am7♭5',
                type: 'min7b5',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 1}, {string: 3, fret: 2}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                barrePosition: null
            },
            'Em7b5': {
                name: 'Em7♭5',
                type: 'min7b5',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 1}, {string: 4, fret: 2}, {string: 3, fret: 0}, {string: 2, fret: 0}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 3, 2, 1]
            },
            'Bm7b5': {
                name: 'Bm7♭5',
                type: 'min7b5',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [6],
                barrePosition: null
            },
            'Cm7b5': {
                name: 'Cm7♭5',
                type: 'min7b5',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 4}, {string: 3, fret: 3}, {string: 2, fret: 4}, {string: 1, fret: 3}],
                muted: [6],
                barrePosition: null
            },
            'F#m7b5': {
                name: 'F#m7♭5',
                type: 'min7b5',
                root: 'F#',
                positions: [{string: 6, fret: 2}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 2}],
                muted: [],
                barrePosition: {fret: 2, strings: [1, 6]}
            },
            
            // Augmented chords
            'Caug': {
                name: 'C+',
                type: 'aug',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [6],
                open: [1]
            },
            'Daug': {
                name: 'D+',
                type: 'aug',
                root: 'D',
                positions: [{string: 4, fret: 0}, {string: 3, fret: 3}, {string: 2, fret: 3}, {string: 1, fret: 2}],
                muted: [6, 5],
                open: [4]
            },
            'Eaug': {
                name: 'E+',
                type: 'aug',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 1}, {string: 2, fret: 1}, {string: 1, fret: 0}],
                muted: [],
                open: [6, 1]
            },
            'Faug': {
                name: 'F+',
                type: 'aug',
                root: 'F',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 1}],
                muted: [6],
                open: []
            },
            'Gaug': {
                name: 'G+',
                type: 'aug',
                root: 'G',
                positions: [{string: 4, fret: 5}, {string: 3, fret: 4}, {string: 2, fret: 4}, {string: 1, fret: 3}],
                muted: [6, 5],
                open: []
            },
            'Aaug': {
                name: 'A+',
                type: 'aug',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 3}, {string: 3, fret: 2}, {string: 2, fret: 2}, {string: 1, fret: 1}],
                muted: [6],
                open: [5]
            },

            // Shell chords (Root, 3rd, 7th - no 5th)
            // Dominant 7 shells
            'C7_shell': {
                name: 'C7 (shell)',
                type: 'shell_dom7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 3}],
                muted: [6, 2, 1],
                open: []
            },
            'G7_shell': {
                name: 'G7 (shell)',
                type: 'shell_dom7',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 3}],
                muted: [3, 2, 1],
                open: []
            },
            'D7_shell': {
                name: 'D7 (shell)',
                type: 'shell_dom7',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 4}, {string: 3, fret: 5}],
                muted: [6, 2, 1],
                open: []
            },
            'A7_shell': {
                name: 'A7 (shell)',
                type: 'shell_dom7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}],
                muted: [6, 2, 1],
                open: [5, 3]
            },
            'E7_shell': {
                name: 'E7 (shell)',
                type: 'shell_dom7',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}],
                muted: [3, 2, 1],
                open: [6, 4]
            },

            // Major 7 shells
            'Cmaj7_shell': {
                name: 'Cmaj7 (shell)',
                type: 'shell_maj7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 2}, {string: 3, fret: 4}],
                muted: [6, 2, 1],
                open: []
            },
            'Gmaj7_shell': {
                name: 'Gmaj7 (shell)',
                type: 'shell_maj7',
                root: 'G',
                positions: [{string: 6, fret: 3}, {string: 5, fret: 2}, {string: 4, fret: 4}],
                muted: [3, 2, 1],
                open: []
            },
            'Dmaj7_shell': {
                name: 'Dmaj7 (shell)',
                type: 'shell_maj7',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 4}, {string: 3, fret: 6}],
                muted: [6, 2, 1],
                open: []
            },
            'Amaj7_shell': {
                name: 'Amaj7 (shell)',
                type: 'shell_maj7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 1}],
                muted: [6, 2, 1],
                open: [5]
            },
            'Emaj7_shell': {
                name: 'Emaj7 (shell)',
                type: 'shell_maj7',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 1}],
                muted: [3, 2, 1],
                open: [6]
            },

            // Minor 7 shells
            'Am7_shell': {
                name: 'Am7 (shell)',
                type: 'shell_min7',
                root: 'A',
                positions: [{string: 5, fret: 0}, {string: 4, fret: 2}, {string: 3, fret: 0}],
                muted: [6, 2, 1],
                open: [5, 3]
            },
            'Em7_shell': {
                name: 'Em7 (shell)',
                type: 'shell_min7',
                root: 'E',
                positions: [{string: 6, fret: 0}, {string: 5, fret: 2}, {string: 4, fret: 0}],
                muted: [3, 2, 1],
                open: [6, 4]
            },
            'Dm7_shell': {
                name: 'Dm7 (shell)',
                type: 'shell_min7',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 5}, {string: 3, fret: 5}],
                muted: [6, 2, 1],
                open: []
            },
            'Cm7_shell': {
                name: 'Cm7 (shell)',
                type: 'shell_min7',
                root: 'C',
                positions: [{string: 5, fret: 3}, {string: 4, fret: 3}, {string: 3, fret: 3}],
                muted: [6, 2, 1],
                open: []
            },

            // Minor 7b5 shells (half-diminished)
            'Bm7b5_shell': {
                name: 'Bm7♭5 (shell)',
                type: 'shell_min7b5',
                root: 'B',
                positions: [{string: 5, fret: 2}, {string: 4, fret: 2}, {string: 3, fret: 2}],
                muted: [6, 2, 1],
                open: []
            },
            'Dm7b5_shell': {
                name: 'Dm7♭5 (shell)',
                type: 'shell_min7b5',
                root: 'D',
                positions: [{string: 5, fret: 5}, {string: 4, fret: 5}, {string: 3, fret: 4}],
                muted: [6, 2, 1],
                open: []
            }
        };
        
        // Group chords by type for easier filtering
        this.chordTypes = {
            'major': ['C', 'G', 'D', 'A', 'E', 'F'],
            'minor': ['Am', 'Em', 'Dm', 'Bm', 'Cm', 'Fm', 'Gm', 'F#m', 'Bbm'],
            'dominant7': ['G7', 'C7', 'D7', 'A7', 'E7', 'B7', 'F7', 'Bb7', 'F#7'],
            'major7': ['Cmaj7', 'Gmaj7', 'Dmaj7', 'Amaj7', 'Emaj7', 'Fmaj7', 'Bmaj7', 'Bbmaj7', 'F#maj7'],
            'minor7': ['Am7', 'Em7', 'Dm7', 'Bm7', 'Cm7', 'Fm7', 'Gm7', 'F#m7', 'Bbm7'],
            'sus2': ['Csus2', 'Dsus2', 'Asus2', 'Esus2', 'Gsus2', 'Fsus2', 'Bsus2'],
            'sus4': ['Csus4', 'Dsus4', 'Asus4', 'Esus4', 'Gsus4', 'Fsus4', 'Bsus4'],
            '6th': ['C6', 'G6', 'D6', 'A6', 'E6', 'F6'],
            'm6': ['Am6', 'Em6', 'Dm6', 'Bm6'],
            'add9': ['Cadd9', 'Gadd9', 'Dadd9', 'Aadd9', 'Eadd9', 'Fadd9'],
            '9th': ['C9', 'D9', 'E9', 'G9', 'A9', 'F9', 'B9'],
            'maj9': ['Cmaj9', 'Dmaj9', 'Emaj9', 'Gmaj9', 'Amaj9'],
            'min9': ['Am9', 'Em9', 'Dm9', 'Bm9'],
            '11th': ['C11', 'D11', 'E11', 'G11', 'A11'],
            'min11': ['Am11', 'Em11', 'Dm11'],
            '13th': ['C13', 'D13', 'E13', 'G13', 'A13', 'F13'],
            '7sharp9': ['E7sharp9', 'A7sharp9'],
            '7flat9': ['E7flat9', 'A7flat9'],
            '7sharp5': ['G7sharp5', 'C7sharp5'],
            '7flat5': ['D7flat5', 'A7flat5'],
            'dim7': ['Cdim7', 'Ddim7', 'Edim7', 'Fdim7', 'Gdim7', 'Adim7', 'Bdim7'],
            'slash': ['C/G', 'C/E', 'C/B', 'D/F#', 'D/A', 'E/G#', 'E/B', 'F/C', 'F/A', 'G/B', 'G/D', 'G/F#', 'A/C#', 'A/E',
                      'Am/E', 'Am/G', 'Am/F#', 'Am/C', 'Dm/F', 'Dm/A', 'Em/B', 'Em/D', 'Em/G',
                      'G7/B', 'G7/D', 'C7/E', 'C7/Bb', 'D7/F#', 'D7/A', 'A7/C#', 'A7/E', 'E7/G#', 'E7/B'],
            'power': ['C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
            'dim': ['Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim'],
            'aug': ['Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug'],
            'min7b5': ['Dm7b5', 'Am7b5', 'Em7b5', 'Bm7b5', 'Cm7b5', 'F#m7b5'],
            'triad_major': ['C_triad_3', 'G_triad_3', 'D_triad_5', 'F_triad_8'],
            'triad_minor': ['Am_triad_5', 'Em_triad_7'],
            'inversion_major': ['C_1st_inv', 'G_1st_inv', 'C_2nd_inv'],
            'caged_major': ['C_CAGED_C', 'D_CAGED_C', 'G_CAGED_E', 'A_CAGED_G'],
            'major_high': ['C_8th_pos'],
            'minor_high': ['Am_5th_pos'],
            'shell_dom7': ['C7_shell', 'G7_shell', 'D7_shell', 'A7_shell', 'E7_shell'],
            'shell_maj7': ['Cmaj7_shell', 'Gmaj7_shell', 'Dmaj7_shell', 'Amaj7_shell', 'Emaj7_shell'],
            'shell_min7': ['Am7_shell', 'Em7_shell', 'Dm7_shell', 'Cm7_shell'],
            'shell_min7b5': ['Bm7b5_shell', 'Dm7b5_shell']
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
        if (positions1.length !== positions2.length) {
            return false;
        }

        // Sort both arrays for comparison
        const sorted1 = [...positions1].sort((a, b) => a.string - b.string || a.fret - b.fret);
        const sorted2 = [...positions2].sort((a, b) => a.string - b.string || a.fret - b.fret);

        return sorted1.every((pos, index) =>
            pos.string === sorted2[index].string &&
            pos.fret === sorted2[index].fret
        );
    }
    
    getChordByPositions(positions, mutedStrings = []) {
        // First try exact match (positions and muted strings)
        for (const [key, chord] of Object.entries(this.chords)) {
            if (this.compareChordPositions(chord.positions, positions) &&
                this.compareMutedStrings(chord.muted || [], mutedStrings)) {
                return { key, ...chord };
            }
        }

        // If no exact match, try partial match with smart scoring
        let bestMatch = null;
        let bestScore = -Infinity;

        for (const [key, chord] of Object.entries(this.chords)) {
            const score = this.calculateSmartMatchScore(chord.positions, positions, chord.muted || [], mutedStrings);

            // Only consider if all user positions are found in the chord
            if (score.matchedCount === positions.length && score.totalScore > bestScore) {
                bestScore = score.totalScore;
                bestMatch = { key, ...chord };
            }
        }

        // If still no match, analyze the notes using music theory
        if (!bestMatch) {
            return this.analyzeChordByNotes(positions, mutedStrings);
        }

        return bestMatch;
    }

    // Analyze chord by actual notes using music theory
    analyzeChordByNotes(positions, mutedStrings = []) {
        if (positions.length === 0) return null;

        // Standard tuning note names for each string (open position)
        const stringNotes = ['E', 'A', 'D', 'G', 'B', 'E']; // Strings 6-1
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Convert positions to actual note names
        const notes = [];
        for (const pos of positions) {
            const openNote = stringNotes[6 - pos.string]; // String 6 = index 0
            const openNoteIndex = noteNames.indexOf(openNote);
            const actualNoteIndex = (openNoteIndex + pos.fret) % 12;
            const noteName = noteNames[actualNoteIndex];
            notes.push(noteName);
        }

        // Find the lowest note (bass note - determines root for most chords)
        const bassPosition = positions.reduce((lowest, pos) =>
            pos.string > lowest.string ? pos : lowest
        );
        const bassOpenNote = stringNotes[6 - bassPosition.string];
        const bassNoteIndex = noteNames.indexOf(bassOpenNote);
        const bassNote = noteNames[(bassNoteIndex + bassPosition.fret) % 12];

        // Count unique notes and remove duplicates
        const uniqueNotes = [...new Set(notes)];

        // Calculate intervals from bass note
        const intervals = uniqueNotes.map(note => {
            const noteIndex = noteNames.indexOf(note);
            const bassIndex = noteNames.indexOf(bassNote);
            return (noteIndex - bassIndex + 12) % 12;
        }).sort((a, b) => a - b);

        // Identify chord quality based on intervals
        const chordName = this.identifyChordFromIntervals(bassNote, intervals, uniqueNotes.length);

        if (chordName) {
            return {
                key: 'analyzed_' + chordName.replace(/[^a-zA-Z0-9]/g, '_'),
                name: chordName,
                type: 'analyzed',
                root: bassNote,
                positions: positions,
                muted: mutedStrings,
                isAnalyzed: true
            };
        }

        return null;
    }

    // Identify chord type from intervals
    identifyChordFromIntervals(root, intervals, noteCount) {
        // Common interval patterns (semitones from root)
        const patterns = {
            // Triads
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            '5': [0, 7], // Power chord

            // 7th chords
            '7': [0, 4, 7, 10], // Dominant 7
            'maj7': [0, 4, 7, 11],
            'm7': [0, 3, 7, 10],
            'm7b5': [0, 3, 6, 10], // Half-diminished
            'dim7': [0, 3, 6, 9],

            // 6th chords
            '6': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],

            // 9th chords (9th = 2 semitones from root, octave up)
            '9': [0, 2, 4, 7, 10], // Dominant 9
            'maj9': [0, 2, 4, 7, 11],
            'm9': [0, 2, 3, 7, 10],
            'add9': [0, 2, 4, 7],

            // 11th chords
            '11': [0, 2, 4, 5, 7, 10],
            'm11': [0, 2, 3, 5, 7, 10],

            // 13th chords
            '13': [0, 2, 4, 7, 9, 10],

            // Altered dominants
            '7#5': [0, 4, 8, 10],
            '7b5': [0, 4, 6, 10],
            '7#9': [0, 3, 4, 7, 10],
            '7b9': [0, 1, 4, 7, 10]
        };

        // Try to match intervals to known patterns
        for (const [suffix, pattern] of Object.entries(patterns)) {
            if (this.intervalsMatch(intervals, pattern)) {
                if (suffix === 'major') {
                    return root;
                } else if (suffix === 'minor') {
                    return root + 'm';
                } else if (suffix === '5') {
                    return root + '5';
                } else if (suffix === 'dim') {
                    return root + '°';
                } else if (suffix === 'aug') {
                    return root + '+';
                } else {
                    return root + suffix;
                }
            }
        }

        // If no exact match, return generic description
        return root + ' (' + noteCount + ' notes)';
    }

    intervalsMatch(actual, pattern) {
        if (actual.length !== pattern.length) return false;

        // Check if all pattern intervals are present in actual
        return pattern.every(interval => actual.includes(interval));
    }

    compareMutedStrings(chordMuted, userMuted) {
        if (chordMuted.length !== userMuted.length) return false;

        const sorted1 = [...chordMuted].sort();
        const sorted2 = [...userMuted].sort();

        return sorted1.every((val, idx) => val === sorted2[idx]);
    }

    // Calculate match score with penalty for extra notes in chord
    calculateSmartMatchScore(chordPositions, userPositions, chordMuted = [], userMuted = []) {
        let matchedCount = 0;

        // Check how many user positions match the chord
        for (const userPos of userPositions) {
            const hasMatch = chordPositions.some(chordPos =>
                chordPos.string === userPos.string && chordPos.fret === userPos.fret
            );

            if (hasMatch) {
                matchedCount++;
            }
        }

        // Calculate muted string matching bonus/penalty
        let mutedScore = 0;
        const mutedMatch = userMuted.filter(s => chordMuted.includes(s)).length;
        const mutedExtra = Math.abs(chordMuted.length - userMuted.length);

        mutedScore = (mutedMatch * 20) - (mutedExtra * 5);

        // Calculate score:
        // - Reward for matching positions: +100 per match
        // - Penalty for extra positions in chord: -10 per extra
        // - Bonus/penalty for muted strings matching: +20 per match, -5 per mismatch
        const extraPositions = chordPositions.length - userPositions.length;
        const totalScore = (matchedCount * 100) - (extraPositions * 10) + mutedScore;

        return { matchedCount, totalScore };
    }

    // Helper to normalize chord name case (e.g., "c#m" -> "C#m", "CM7" -> "Cmaj7")
    normalizeChordCase(chordName) {
        if (!chordName) return chordName;

        // Capitalize first letter (root note)
        let normalized = chordName.charAt(0).toUpperCase() + chordName.slice(1);

        // Handle common case variations in chord qualities
        // "M" followed by number should be "maj" (e.g., "CM7" -> "Cmaj7")
        normalized = normalized.replace(/^([A-G][#♭]?)M(\d)/, '$1maj$2');

        // Lowercase "m" for minor (but not "M" for major which we handle above)
        // Only if it's after the root note and not part of "maj"
        normalized = normalized.replace(/^([A-G][#♭]?)M([^a-z0-9]|$)/, '$1$2'); // Remove standalone M

        return normalized;
    }

    // Case-insensitive chord lookup with 'b' as alternative to '♭'
    getChord(chordName) {
        if (!chordName) return null;

        // Try exact match first
        if (this.chords[chordName]) {
            return this.chords[chordName];
        }

        // Normalize: replace 'b' with '♭' for flat symbols
        // But be careful not to replace 'b' in note names like 'Bb' or 'B'
        let normalizedName = chordName
            .replace(/([A-G])(b)([^a-z]|$)/gi, '$1♭$3')  // Ab, Bb, etc.
            .replace(/b5/gi, '♭5')                         // m7b5 → m7♭5
            .replace(/b9/gi, '♭9');                        // 7b9 → 7♭9

        // Try normalized exact match
        if (this.chords[normalizedName]) {
            return this.chords[normalizedName];
        }

        // Try case-insensitive match (normalize to proper case)
        // Convert first letter to uppercase, keep # and ♭, lowercase quality indicators
        const properCaseName = this.normalizeChordCase(chordName);
        if (properCaseName !== chordName && this.chords[properCaseName]) {
            return this.chords[properCaseName];
        }

        // Try normalized + proper case
        const properNormalizedName = this.normalizeChordCase(normalizedName);
        if (properNormalizedName !== normalizedName && this.chords[properNormalizedName]) {
            return this.chords[properNormalizedName];
        }

        // Try case-insensitive match by key
        const lowerName = normalizedName.toLowerCase();
        for (const [key, chord] of Object.entries(this.chords)) {
            if (key.toLowerCase() === lowerName) {
                return chord;
            }
        }

        // Try matching by display name (e.g., "C Major 7" → Cmaj7)
        const lowerInput = chordName.toLowerCase().trim();
        for (const [key, chord] of Object.entries(this.chords)) {
            if (chord.name.toLowerCase() === lowerInput) {
                return chord;
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

    // Get all voicings/shapes for a given chord by matching root and quality
    // HYBRID APPROACH: Use manual voicings first, augment with algorithmic generation if needed
    getAllShapes(chordName, guitar = null) {
        console.log('=== getAllShapes called ===');
        console.log('Chord name:', chordName);
        console.log('Guitar:', guitar);

        const chord = this.getChord(chordName);
        console.log('Found in library:', !!chord);

        const shapes = [];
        let root, type;

        // Try to get manual voicings first
        if (chord) {
            root = chord.root;
            type = chord.type;

            // Find all manually defined chords with the same root and type
            for (const [key, chordData] of Object.entries(this.chords)) {
                if (chordData.root === root && chordData.type === type) {
                    shapes.push({
                        key: key,
                        ...chordData
                    });
                }
            }

            console.log('Manual voicings found:', shapes.length);

            // If we have MORE than 1 manual voicing, just use those
            if (shapes.length > 1) {
                console.log('Using manual voicings only (multiple found)');
                // Sort by lowest fret position for consistency
                shapes.sort((a, b) => {
                    const minFretA = Math.min(...a.positions.map(p => p.fret));
                    const minFretB = Math.min(...b.positions.map(p => p.fret));
                    return minFretA - minFretB;
                });
                return shapes;
            }
        } else {
            // Chord not in library, try to parse it
            const parsed = this.parseChordName(chordName);
            if (parsed) {
                root = parsed.root;
                type = parsed.type;
                console.log('Parsed chord (not in library):', parsed);
            } else {
                console.log('Could not parse chord name');
                return [];
            }
        }

        // If we get here, we have 0 or 1 manual voicings - augment with algorithmic generation
        console.log('Augmenting with algorithmic generation...');
        if (guitar && root && type) {
            const chordObj = {
                name: chordName,
                root: root,
                type: type
            };
            console.log('Generating voicings for:', chordObj);
            const generatedVoicings = this.generateChordVoicings(chordObj, guitar);
            console.log('Generated voicings:', generatedVoicings.length);

            // Combine manual (if any) with generated
            const allShapes = [...shapes, ...generatedVoicings];

            // Sort by lowest fret position
            allShapes.sort((a, b) => {
                const minFretA = Math.min(...a.positions.map(p => p.fret));
                const minFretB = Math.min(...b.positions.map(p => p.fret));
                return minFretA - minFretB;
            });

            console.log('Total shapes (manual + generated):', allShapes.length);
            return allShapes;
        }

        // No shapes available
        console.log('No shapes found');
        return shapes.length > 0 ? shapes : [];
    }

    // Parse a chord name into root and type
    parseChordName(chordName) {
        if (!chordName) return null;

        const noteNames = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

        // Try to match root note (1-2 characters)
        let root = null;
        let remainder = '';

        // Try 2-character root first (e.g., C#, Bb)
        if (chordName.length >= 2) {
            const twoChar = chordName.substring(0, 2);
            if (noteNames.includes(twoChar)) {
                root = twoChar;
                remainder = chordName.substring(2);
            }
        }

        // If not found, try 1-character root
        if (!root && chordName.length >= 1) {
            const oneChar = chordName.substring(0, 1);
            if (noteNames.includes(oneChar)) {
                root = oneChar;
                remainder = chordName.substring(1);
            }
        }

        if (!root) return null;

        // Normalize flat/sharp notation
        if (root.includes('b')) root = root.replace('b', '♭');
        if (root === 'Db') root = 'C#';
        if (root === 'Eb') root = 'D#';
        if (root === 'Gb') root = 'F#';
        if (root === 'Ab') root = 'G#';
        if (root === 'Bb') root = 'A#';

        // Parse quality from remainder
        let type = 'major'; // default

        remainder = remainder.toLowerCase().trim();

        if (remainder === '' || remainder === 'maj') {
            type = 'major';
        } else if (remainder === 'm' || remainder === 'min' || remainder === 'minor') {
            type = 'minor';
        } else if (remainder === '7' || remainder === 'dom7') {
            type = 'dominant7';
        } else if (remainder === 'maj7' || remainder === 'major7') {
            type = 'major7';
        } else if (remainder === 'm7' || remainder === 'min7' || remainder === 'minor7') {
            type = 'minor7';
        } else if (remainder === 'sus2') {
            type = 'sus2';
        } else if (remainder === 'sus4') {
            type = 'sus4';
        } else if (remainder === '6' || remainder === '6th') {
            type = '6th';
        } else if (remainder === 'm6' || remainder === 'min6') {
            type = 'm6';
        } else if (remainder === 'add9') {
            type = 'add9';
        } else if (remainder === 'dim' || remainder === '°') {
            type = 'dim';
        } else if (remainder === 'aug' || remainder === '+') {
            type = 'aug';
        } else if (remainder === '5') {
            type = 'power';
        }

        return { root, type };
    }

    // Generate chord voicings algorithmically
    generateChordVoicings(chord, guitar, options = {}) {
        const maxFret = options.maxFret || 12;
        const maxSpan = options.maxSpan || 5;  // Max fret span
        const minNotes = options.minNotes || 3; // Min notes in voicing
        const maxVoicings = options.maxVoicings || 10;

        // Get the intervals for this chord type
        const intervals = this.getIntervalsForChordType(chord.type);
        if (!intervals) return [];

        // Get all notes in the chord
        const chordNotes = this.getNotesFromIntervals(chord.root, intervals);

        // Find all possible positions for each chord note
        const notePositions = {};
        for (const note of chordNotes) {
            notePositions[note] = guitar.getAllFretsForNote(note, maxFret);
        }

        // Generate candidate voicings
        const candidates = this.generateVoicingCandidates(notePositions, chordNotes, chord.root);

        // Filter by playability
        const playable = candidates.filter(voicing =>
            this.isVoicingPlayable(voicing, maxSpan, minNotes)
        );

        // Score and sort voicings
        const scored = playable.map(voicing => ({
            voicing,
            score: this.scoreVoicing(voicing, chord.root, chordNotes)
        }));

        scored.sort((a, b) => b.score - a.score);

        // Convert to chord shape format
        return scored.slice(0, maxVoicings).map((item, index) => ({
            key: `${chord.root}_${chord.type}_gen${index}`,
            name: `${chord.name} (Position ${index + 1})`,
            type: chord.type,
            root: chord.root,
            positions: item.voicing.positions,
            muted: item.voicing.muted,
            barrePosition: null,
            isGenerated: true
        }));
    }

    // Get intervals for a chord type
    getIntervalsForChordType(type) {
        const patterns = {
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'dominant7': [0, 4, 7, 10],
            'major7': [0, 4, 7, 11],
            'minor7': [0, 3, 7, 10],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            '6th': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],
            'add9': [0, 2, 4, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'power': [0, 7]
        };
        return patterns[type] || null;
    }

    // Convert intervals to actual notes
    getNotesFromIntervals(root, intervals) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootIndex = noteNames.indexOf(root);

        return intervals.map(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            return noteNames[noteIndex];
        });
    }

    // Generate voicing candidates (simplified - generates voicings with 3-4 notes)
    generateVoicingCandidates(notePositions, chordNotes, root) {
        const candidates = [];
        const strings = [6, 5, 4, 3, 2, 1];

        // Strategy: Generate voicings by selecting positions on different strings
        // Focus on common shapes: bass note on string 6, 5, or 4
        const bassStrings = [6, 5, 4];

        for (const bassString of bassStrings) {
            // Find root note positions on this bass string
            const rootPositions = notePositions[root].filter(pos => pos.string === bassString);

            for (const bassPos of rootPositions) {
                // Build voicing around this bass position
                const voicing = this.buildVoicingFromBass(bassPos, notePositions, chordNotes, strings);
                if (voicing) {
                    candidates.push(voicing);
                }
            }
        }

        return candidates;
    }

    // Build a voicing starting from a bass note
    buildVoicingFromBass(bassPos, notePositions, chordNotes, strings) {
        const positions = [bassPos];
        const usedStrings = new Set([bassPos.string]);
        const bassFret = bassPos.fret;

        // Try to add notes on higher strings (lower numbers)
        for (const string of strings) {
            if (string >= bassPos.string) continue; // Skip bass and lower strings
            if (usedStrings.has(string)) continue;

            // Find the best note for this string within reasonable fret range
            let bestPos = null;
            let bestScore = -1;

            for (const note of chordNotes) {
                const candidatePositions = notePositions[note].filter(pos =>
                    pos.string === string &&
                    pos.fret >= bassFret &&
                    pos.fret <= bassFret + 5
                );

                for (const pos of candidatePositions) {
                    const score = this.scorePosition(pos, bassFret, positions);
                    if (score > bestScore) {
                        bestScore = score;
                        bestPos = pos;
                    }
                }
            }

            if (bestPos) {
                positions.push(bestPos);
                usedStrings.add(string);
            }
        }

        // Calculate muted strings
        const muted = strings.filter(s => !usedStrings.has(s));

        return positions.length >= 3 ? { positions, muted } : null;
    }

    // Score a position (prefer closer to bass, penalize large jumps)
    scorePosition(pos, bassFret, existingPositions) {
        let score = 100;

        // Prefer positions close to bass
        const distanceFromBass = Math.abs(pos.fret - bassFret);
        score -= distanceFromBass * 5;

        // Penalize large jumps from existing positions
        for (const existing of existingPositions) {
            const jump = Math.abs(pos.fret - existing.fret);
            if (jump > 4) score -= jump * 10;
        }

        return score;
    }

    // Check if a voicing is physically playable
    isVoicingPlayable(voicing, maxSpan, minNotes) {
        if (voicing.positions.length < minNotes) return false;

        const frets = voicing.positions.map(p => p.fret).filter(f => f > 0);
        if (frets.length === 0) return false;

        const minFret = Math.min(...frets);
        const maxFret = Math.max(...frets);
        const span = maxFret - minFret;

        return span <= maxSpan;
    }

    // Score a voicing (higher is better)
    scoreVoicing(voicing, root, chordNotes) {
        let score = 0;

        // Prefer more notes
        score += voicing.positions.length * 20;

        // Prefer root in bass
        const bassPos = voicing.positions.reduce((lowest, pos) =>
            pos.string > lowest.string ? pos : lowest
        );
        const bassNote = this.getNoteAtPosition(bassPos);
        if (bassNote === root) score += 50;

        // Prefer complete chord (all notes present)
        const notesInVoicing = new Set(voicing.positions.map(p => this.getNoteAtPosition(p)));
        const completeness = notesInVoicing.size / chordNotes.length;
        score += completeness * 30;

        // Prefer lower positions (easier to play)
        const avgFret = voicing.positions.reduce((sum, p) => sum + p.fret, 0) / voicing.positions.length;
        score -= avgFret * 2;

        return score;
    }

    // Helper to get note at a fretboard position
    getNoteAtPosition(pos) {
        const stringNotes = ['E', 'A', 'D', 'G', 'B', 'E']; // Strings 6-1
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const openNote = stringNotes[6 - pos.string];
        const openNoteIndex = noteNames.indexOf(openNote);
        const actualNoteIndex = (openNoteIndex + pos.fret) % 12;
        return noteNames[actualNoteIndex];
    }

    // Get a specific shape by index for a chord
    getShapeByIndex(chordName, index, guitar = null) {
        const shapes = this.getAllShapes(chordName, guitar);
        if (shapes.length === 0) return null;

        // Wrap around if index is out of bounds
        const wrappedIndex = ((index % shapes.length) + shapes.length) % shapes.length;
        return shapes[wrappedIndex];
    }
}