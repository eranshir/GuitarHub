class App {
    constructor() {
        this.guitar = new Guitar();
        this.audio = new AudioEngine();
        this.statistics = new Statistics();
        this.intervalTheory = new IntervalTheory();
        this.chordTheory = new ChordTheory();
        this.game = null;
        this.intervalGame = null;
        this.chordGame = null;
        this.chordPositionsGame = null;
        this.assistantGame = null;
        this.charts = {};

        this.init();
    }

    init() {
        this.game = new FretboardGame(this.guitar, this.statistics);
        this.intervalGame = new IntervalGame(this.guitar, this.statistics, this.intervalTheory);
        this.chordGame = new ChordGame(this.guitar, this.statistics, this.chordTheory);
        this.chordPositionsGame = new ChordPositionsGame(this.guitar, this.audio, this.chordTheory);
        this.assistantGame = new AssistantGame(this.guitar, this.audio, this.chordTheory);
        this.spotNoteGame = new SpotNoteGame(this.guitar, this.statistics);
        this.setupModuleNavigation();
        this.setupAudioControls();
        this.setupStatisticsControls();
        this.updateStatisticsDisplay();

        // Update charts when language changes
        window.addEventListener('languageChanged', () => {
            if (this.charts.progress || this.charts.notes) {
                this.updateCharts();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.statistics.endSession();
            this.statistics.endIntervalSession();
            this.statistics.endChordSession();
        });
    }
    
    setupModuleNavigation() {
        document.querySelectorAll('.module-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const moduleId = e.target.dataset.module;
                this.switchModule(moduleId);
            });
        });
    }
    
    switchModule(moduleId) {
        document.querySelectorAll('.module-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.module === moduleId);
        });
        
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        
        if (moduleId === 'fretboard') {
            document.getElementById('fretboard-module').classList.add('active');
        } else if (moduleId === 'intervals') {
            document.getElementById('intervals-module').classList.add('active');
        } else if (moduleId === 'chords') {
            document.getElementById('chords-module').classList.add('active');
        } else if (moduleId === 'spot-note') {
            document.getElementById('spot-note-module').classList.add('active');
        } else if (moduleId === 'assistant') {
            document.getElementById('assistant-module').classList.add('active');
        } else if (moduleId === 'stats') {
            document.getElementById('stats-module').classList.add('active');
            this.updateStatisticsDisplay();
            this.updateCharts();
        }
    }
    
    setupAudioControls() {
        document.getElementById('play-note').addEventListener('click', () => {
            if (this.game.currentQuestion && this.game.currentQuestion.type === 'note-to-fret') {
                const freq = this.guitar.getFrequency(
                    this.game.currentQuestion.string,
                    this.game.currentQuestion.correctAnswer
                );
                this.audio.playNote(freq, 1000);
            }
        });
        
        document.getElementById('play-fret-note').addEventListener('click', () => {
            if (this.game.currentQuestion && this.game.currentQuestion.type === 'fret-to-note') {
                const freq = this.guitar.getFrequency(
                    this.game.currentQuestion.string,
                    this.game.currentQuestion.fret
                );
                this.audio.playNote(freq, 1000);
            }
        });
        
        // Interval audio controls
        document.getElementById('play-interval').addEventListener('click', () => {
            if (this.intervalGame.currentQuestion && this.intervalGame.currentQuestion.type === 'interval-note-to-fret') {
                // Play the root note and target note as a chord
                const rootPositions = this.guitar.getAllFretsForNote(this.intervalGame.currentQuestion.rootNote, 12);
                const targetPositions = this.guitar.getAllFretsForNote(this.intervalGame.currentQuestion.targetNote, 12);
                
                if (rootPositions.length > 0 && targetPositions.length > 0) {
                    const freq1 = this.guitar.getFrequency(rootPositions[0].string, rootPositions[0].fret);
                    const freq2 = this.guitar.getFrequency(targetPositions[0].string, targetPositions[0].fret);
                    this.audio.playChord([freq1, freq2], 1500);
                }
            }
        });
        
        document.getElementById('play-interval-fret').addEventListener('click', () => {
            if (this.intervalGame.currentQuestion && this.intervalGame.currentQuestion.type === 'interval-fret-to-note') {
                const freq1 = this.guitar.getFrequency(
                    this.intervalGame.currentQuestion.position1.string,
                    this.intervalGame.currentQuestion.position1.fret
                );
                const freq2 = this.guitar.getFrequency(
                    this.intervalGame.currentQuestion.position2.string,
                    this.intervalGame.currentQuestion.position2.fret
                );
                this.audio.playChord([freq1, freq2], 1500);
            }
        });
        
        // Chord audio controls
        document.getElementById('play-chord-fret').addEventListener('click', () => {
            if (this.chordGame.currentQuestion && this.chordGame.currentQuestion.type === 'chord-fret-to-name') {
                const chord = this.chordTheory.chords[this.chordGame.currentQuestion.chordKey];
                if (chord) {
                    this.chordTheory.playChord(chord, this.guitar, this.audio);
                }
            }
        });
        
        document.getElementById('play-chord-name').addEventListener('click', () => {
            if (this.chordGame.currentQuestion && this.chordGame.currentQuestion.type === 'chord-name-to-fret') {
                const chord = this.chordTheory.chords[this.chordGame.currentQuestion.chordKey];
                if (chord) {
                    this.chordTheory.playChord(chord, this.guitar, this.audio);
                }
            }
        });
    }
    
    setupStatisticsControls() {
        document.getElementById('clear-stats').addEventListener('click', () => {
            if (confirm(window.i18n.t('statistics.confirmClear'))) {
                this.statistics.clearAllData();
                this.updateStatisticsDisplay();
                this.updateCharts();
            }
        });
    }
    
    updateStatisticsDisplay() {
        const stats = this.statistics.getAllTimeStats();
        const sessions = this.statistics.getSessionStats();
        
        document.getElementById('total-sessions').textContent = sessions.length;
        document.getElementById('total-questions').textContent = stats.totalQuestions;
        
        const accuracy = stats.totalQuestions > 0 
            ? ((stats.correctAnswers / stats.totalQuestions) * 100).toFixed(1)
            : 0;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
        
        const avgTime = stats.correctAnswers > 0
            ? (stats.totalResponseTime / stats.correctAnswers / 1000).toFixed(1)
            : 0;
        document.getElementById('avg-time').textContent = `${avgTime}s`;
    }
    
    updateCharts() {
        this.updateProgressChart();
        this.updateNoteChart();
    }
    
    updateProgressChart() {
        const ctx = document.getElementById('progress-chart').getContext('2d');
        const progressData = this.statistics.getProgressData(30);
        
        const dates = Object.keys(progressData).sort();
        const accuracyData = dates.map(date => progressData[date].accuracy || 0);
        const responseTimeData = dates.map(date => progressData[date].avgResponseTime / 1000 || 0);
        
        if (this.charts.progress) {
            this.charts.progress.destroy();
        }
        
        this.charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: window.i18n.t('statistics.chart.accuracy'),
                        data: accuracyData,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        yAxisID: 'y-accuracy',
                        tension: 0.4
                    },
                    {
                        label: window.i18n.t('statistics.chart.avgResponseTime'),
                        data: responseTimeData,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        yAxisID: 'y-time',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.yAxisID === 'y-accuracy') {
                                        label += context.parsed.y.toFixed(1) + '%';
                                    } else {
                                        label += context.parsed.y.toFixed(1) + 's';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: window.i18n.t('statistics.chart.date')
                        }
                    },
                    'y-accuracy': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: window.i18n.t('statistics.chart.accuracy')
                        },
                        min: 0,
                        max: 100
                    },
                    'y-time': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: window.i18n.t('statistics.chart.responseTime')
                        },
                        min: 0,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }
    
    updateNoteChart() {
        const ctx = document.getElementById('note-chart').getContext('2d');
        const noteData = this.statistics.getNotePerformanceData();
        
        const notes = noteData.map(d => d.note);
        const responseTimes = noteData.map(d => d.avgResponseTime);
        const accuracies = noteData.map(d => d.accuracy);
        
        if (this.charts.notes) {
            this.charts.notes.destroy();
        }
        
        this.charts.notes = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: notes,
                datasets: [
                    {
                        label: window.i18n.t('statistics.chart.avgResponseTime'),
                        data: responseTimes,
                        backgroundColor: 'rgba(52, 152, 219, 0.6)',
                        borderColor: '#3498db',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                return `${window.i18n.t('statistics.accuracy')}: ${accuracies[index].toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: window.i18n.t('statistics.chart.note')
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: window.i18n.t('statistics.chart.responseTime')
                        },
                        min: 0
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
});