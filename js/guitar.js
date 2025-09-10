class Guitar {
    constructor() {
        this.strings = [
            { number: 1, openNote: 'E', octave: 4 },
            { number: 2, openNote: 'B', octave: 3 },
            { number: 3, openNote: 'G', octave: 3 },
            { number: 4, openNote: 'D', octave: 3 },
            { number: 5, openNote: 'A', octave: 2 },
            { number: 6, openNote: 'E', octave: 2 }
        ];
        
        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.noteAliases = {
            'C#': 'Db',
            'D#': 'Eb',
            'F#': 'Gb',
            'G#': 'Ab',
            'A#': 'Bb'
        };
    }
    
    getNoteAtFret(stringNumber, fret) {
        const string = this.strings.find(s => s.number === stringNumber);
        if (!string) return null;
        
        const openNoteIndex = this.notes.indexOf(string.openNote);
        const noteIndex = (openNoteIndex + fret) % 12;
        return this.notes[noteIndex];
    }
    
    getFretForNote(stringNumber, targetNote) {
        const string = this.strings.find(s => s.number === stringNumber);
        if (!string) return null;
        
        const openNoteIndex = this.notes.indexOf(string.openNote);
        const targetNoteIndex = this.notes.indexOf(targetNote);
        
        if (targetNoteIndex === -1) return null;
        
        let fret = targetNoteIndex - openNoteIndex;
        if (fret < 0) fret += 12;
        
        return fret;
    }
    
    getAllFretsForNote(targetNote, maxFret = 24) {
        const frets = [];
        
        for (const string of this.strings) {
            const openNoteIndex = this.notes.indexOf(string.openNote);
            const targetNoteIndex = this.notes.indexOf(targetNote);
            
            if (targetNoteIndex === -1) continue;
            
            for (let fret = 0; fret <= maxFret; fret++) {
                const noteAtFret = this.getNoteAtFret(string.number, fret);
                if (noteAtFret === targetNote) {
                    frets.push({ string: string.number, fret });
                }
            }
        }
        
        return frets;
    }
    
    getFrequency(stringNumber, fret) {
        const string = this.strings.find(s => s.number === stringNumber);
        if (!string) return null;
        
        const note = this.getNoteAtFret(stringNumber, fret);
        const noteIndex = this.notes.indexOf(note);
        
        const baseFrequency = 440;
        const a4Position = 57;
        
        const stringBasePosition = this.getStringBasePosition(string);
        const position = stringBasePosition + fret;
        const semitonesFromA4 = position - a4Position;
        
        return baseFrequency * Math.pow(2, semitonesFromA4 / 12);
    }
    
    getStringBasePosition(string) {
        const positions = {
            'E4': 52,
            'B3': 47,
            'G3': 43,
            'D3': 38,
            'A2': 33,
            'E2': 28
        };
        
        return positions[`${string.openNote}${string.octave}`];
    }
    
    getRandomNote(includeSharps = true) {
        const availableNotes = includeSharps 
            ? this.notes 
            : this.notes.filter(n => !n.includes('#'));
        
        return availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }
    
    getRandomString(enabledStrings = [1, 2, 3, 4, 5, 6]) {
        const validStrings = this.strings.filter(s => enabledStrings.includes(s.number));
        return validStrings[Math.floor(Math.random() * validStrings.length)];
    }
    
    getRandomFret(minFret = 0, maxFret = 12) {
        return Math.floor(Math.random() * (maxFret - minFret + 1)) + minFret;
    }
    
    getNoteDisplayName(note) {
        if (this.noteAliases[note]) {
            return `${note}/${this.noteAliases[note]}`;
        }
        return note;
    }
}