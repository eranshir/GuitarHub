class Statistics {
    constructor() {
        this.storageKey = 'guitarHubStatistics';
        this.currentSession = null;
        this.data = this.loadData();
    }
    
    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            const data = JSON.parse(stored);
            
            // Ensure intervalStats exists (for backward compatibility)
            if (!data.intervalStats) {
                data.intervalStats = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    totalResponseTime: 0,
                    intervalTypeStats: {},
                    directionStats: { ascending: 0, descending: 0 }
                };
            }
            
            // Ensure intervalSessions exists
            if (!data.intervalSessions) {
                data.intervalSessions = [];
            }
            
            return data;
        }
        
        return {
            sessions: [],
            intervalSessions: [],
            allTimeStats: {
                totalQuestions: 0,
                correctAnswers: 0,
                totalResponseTime: 0,
                noteStats: {},
                stringStats: {},
                fretStats: {}
            },
            intervalStats: {
                totalQuestions: 0,
                correctAnswers: 0,
                totalResponseTime: 0,
                intervalTypeStats: {},
                directionStats: { ascending: 0, descending: 0 }
            }
        };
    }
    
    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }
    
    startNewSession() {
        this.currentSession = {
            id: Date.now(),
            startTime: Date.now(),
            endTime: null,
            questions: [],
            mode: null,
            stats: {
                total: 0,
                correct: 0,
                avgResponseTime: 0,
                bestStreak: 0,
                currentStreak: 0
            }
        };
    }
    
    recordAnswer(answerData) {
        if (!this.currentSession) {
            this.startNewSession();
        }
        
        this.currentSession.questions.push(answerData);
        this.currentSession.stats.total++;
        
        if (answerData.isCorrect) {
            this.currentSession.stats.correct++;
            this.currentSession.stats.currentStreak++;
            if (this.currentSession.stats.currentStreak > this.currentSession.stats.bestStreak) {
                this.currentSession.stats.bestStreak = this.currentSession.stats.currentStreak;
            }
        } else {
            this.currentSession.stats.currentStreak = 0;
        }
        
        const totalTime = this.currentSession.questions.reduce((sum, q) => sum + q.responseTime, 0);
        this.currentSession.stats.avgResponseTime = totalTime / this.currentSession.questions.length;
        
        this.updateAllTimeStats(answerData);
        this.saveData();
    }
    
    updateAllTimeStats(answerData) {
        this.data.allTimeStats.totalQuestions++;
        
        if (answerData.isCorrect) {
            this.data.allTimeStats.correctAnswers++;
            this.data.allTimeStats.totalResponseTime += answerData.responseTime;
        }
        
        if (answerData.mode === 'note-to-fret') {
            const noteKey = answerData.question.note;
            if (!this.data.allTimeStats.noteStats[noteKey]) {
                this.data.allTimeStats.noteStats[noteKey] = {
                    total: 0,
                    correct: 0,
                    avgResponseTime: 0,
                    responseTimes: []
                };
            }
            
            const noteStat = this.data.allTimeStats.noteStats[noteKey];
            noteStat.total++;
            if (answerData.isCorrect) {
                noteStat.correct++;
                noteStat.responseTimes.push(answerData.responseTime);
                noteStat.avgResponseTime = noteStat.responseTimes.reduce((a, b) => a + b, 0) / noteStat.responseTimes.length;
            }
            
            const stringKey = `string_${answerData.question.string}`;
            if (!this.data.allTimeStats.stringStats[stringKey]) {
                this.data.allTimeStats.stringStats[stringKey] = {
                    total: 0,
                    correct: 0
                };
            }
            this.data.allTimeStats.stringStats[stringKey].total++;
            if (answerData.isCorrect) {
                this.data.allTimeStats.stringStats[stringKey].correct++;
            }
        } else {
            const fretKey = `fret_${answerData.question.fret}`;
            if (!this.data.allTimeStats.fretStats[fretKey]) {
                this.data.allTimeStats.fretStats[fretKey] = {
                    total: 0,
                    correct: 0
                };
            }
            this.data.allTimeStats.fretStats[fretKey].total++;
            if (answerData.isCorrect) {
                this.data.allTimeStats.fretStats[fretKey].correct++;
            }
        }
    }
    
    endSession() {
        if (this.currentSession && this.currentSession.questions.length > 0) {
            this.currentSession.endTime = Date.now();
            this.data.sessions.push(this.currentSession);
            
            if (this.data.sessions.length > 100) {
                this.data.sessions = this.data.sessions.slice(-100);
            }
            
            this.saveData();
            this.currentSession = null;
        }
    }
    
    getSessionStats() {
        return this.data.sessions;
    }
    
    getAllTimeStats() {
        return this.data.allTimeStats;
    }
    
    getProgressData(days = 30) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recentSessions = this.data.sessions.filter(s => s.startTime > cutoff);
        
        const dailyStats = {};
        
        recentSessions.forEach(session => {
            const date = new Date(session.startTime).toLocaleDateString();
            if (!dailyStats[date]) {
                dailyStats[date] = {
                    total: 0,
                    correct: 0,
                    avgResponseTime: [],
                    sessions: 0
                };
            }
            
            dailyStats[date].total += session.stats.total;
            dailyStats[date].correct += session.stats.correct;
            dailyStats[date].avgResponseTime.push(session.stats.avgResponseTime);
            dailyStats[date].sessions++;
        });
        
        Object.keys(dailyStats).forEach(date => {
            const stats = dailyStats[date];
            const avgTimes = stats.avgResponseTime;
            stats.avgResponseTime = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
            stats.accuracy = (stats.correct / stats.total) * 100;
        });
        
        return dailyStats;
    }
    
    getNotePerformanceData() {
        const noteData = [];
        
        Object.keys(this.data.allTimeStats.noteStats).forEach(note => {
            const stats = this.data.allTimeStats.noteStats[note];
            if (stats.total > 0) {
                noteData.push({
                    note: note,
                    accuracy: (stats.correct / stats.total) * 100,
                    avgResponseTime: stats.avgResponseTime / 1000,
                    total: stats.total
                });
            }
        });
        
        return noteData.sort((a, b) => b.total - a.total);
    }
    
    startNewIntervalSession() {
        this.currentIntervalSession = {
            id: Date.now(),
            startTime: Date.now(),
            endTime: null,
            questions: [],
            stats: {
                total: 0,
                correct: 0,
                avgResponseTime: 0,
                bestStreak: 0,
                currentStreak: 0
            }
        };
    }
    
    recordIntervalAnswer(answerData) {
        if (!this.currentIntervalSession) {
            this.startNewIntervalSession();
        }
        
        this.currentIntervalSession.questions.push(answerData);
        this.currentIntervalSession.stats.total++;
        
        if (answerData.isCorrect) {
            this.currentIntervalSession.stats.correct++;
            this.currentIntervalSession.stats.currentStreak++;
            if (this.currentIntervalSession.stats.currentStreak > this.currentIntervalSession.stats.bestStreak) {
                this.currentIntervalSession.stats.bestStreak = this.currentIntervalSession.stats.currentStreak;
            }
        } else {
            this.currentIntervalSession.stats.currentStreak = 0;
        }
        
        const totalTime = this.currentIntervalSession.questions.reduce((sum, q) => sum + q.responseTime, 0);
        this.currentIntervalSession.stats.avgResponseTime = totalTime / this.currentIntervalSession.questions.length;
        
        this.updateIntervalStats(answerData);
        this.saveData();
    }
    
    updateIntervalStats(answerData) {
        this.data.intervalStats.totalQuestions++;
        
        if (answerData.isCorrect) {
            this.data.intervalStats.correctAnswers++;
            this.data.intervalStats.totalResponseTime += answerData.responseTime;
        }
        
        // Track interval type statistics
        const intervalKey = answerData.question.intervalKey;
        if (!this.data.intervalStats.intervalTypeStats[intervalKey]) {
            this.data.intervalStats.intervalTypeStats[intervalKey] = {
                total: 0,
                correct: 0,
                avgResponseTime: 0,
                responseTimes: []
            };
        }
        
        const intervalStat = this.data.intervalStats.intervalTypeStats[intervalKey];
        intervalStat.total++;
        if (answerData.isCorrect) {
            intervalStat.correct++;
            intervalStat.responseTimes.push(answerData.responseTime);
            intervalStat.avgResponseTime = intervalStat.responseTimes.reduce((a, b) => a + b, 0) / intervalStat.responseTimes.length;
        }
        
        // Track direction statistics
        if (answerData.question.direction) {
            this.data.intervalStats.directionStats[answerData.question.direction]++;
        }
    }
    
    endIntervalSession() {
        if (this.currentIntervalSession && this.currentIntervalSession.questions.length > 0) {
            this.currentIntervalSession.endTime = Date.now();
            this.data.intervalSessions.push(this.currentIntervalSession);
            
            if (this.data.intervalSessions.length > 100) {
                this.data.intervalSessions = this.data.intervalSessions.slice(-100);
            }
            
            this.saveData();
            this.currentIntervalSession = null;
        }
    }
    
    getIntervalStats() {
        return this.data.intervalStats;
    }
    
    clearAllData() {
        this.data = {
            sessions: [],
            intervalSessions: [],
            allTimeStats: {
                totalQuestions: 0,
                correctAnswers: 0,
                totalResponseTime: 0,
                noteStats: {},
                stringStats: {},
                fretStats: {}
            },
            intervalStats: {
                totalQuestions: 0,
                correctAnswers: 0,
                totalResponseTime: 0,
                intervalTypeStats: {},
                directionStats: { ascending: 0, descending: 0 }
            }
        };
        this.currentSession = null;
        this.currentIntervalSession = null;
        this.saveData();
    }
    
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }
    
    importData(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            this.data = imported;
            this.saveData();
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}