class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.masterVolume = 0.3;
    }
    
    init() {
        if (this.isInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }
    
    playNote(frequency, duration = 1000) {
        if (!this.isInitialized) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const currentTime = this.audioContext.currentTime;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, currentTime);
        filter.Q.setValueAtTime(1, currentTime);
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume, currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration / 1000);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration / 1000);
        
        this.addHarmonics(frequency, currentTime, duration);
    }
    
    addHarmonics(fundamental, startTime, duration) {
        const harmonics = [
            { ratio: 2, amplitude: 0.3 },
            { ratio: 3, amplitude: 0.15 },
            { ratio: 4, amplitude: 0.08 }
        ];
        
        harmonics.forEach(harmonic => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(fundamental * harmonic.ratio, startTime);
            
            const harmonicVolume = this.masterVolume * harmonic.amplitude;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(harmonicVolume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration / 1000);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration / 1000);
        });
    }
    
    playChord(frequencies, duration = 1500) {
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playNote(freq, duration - index * 50);
            }, index * 50);
        });
    }
    
    playSuccessSound() {
        if (!this.isInitialized) {
            this.init();
        }
        
        const notes = [261.63, 329.63, 392.00];
        this.playChord(notes, 300);
    }
    
    playErrorSound() {
        if (!this.isInitialized) {
            this.init();
        }
        
        this.playNote(138.59, 300);
        setTimeout(() => {
            this.playNote(130.81, 300);
        }, 150);
    }
    
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}