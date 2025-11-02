class FretboardDisplay {
    constructor(containerId = 'fretboard', isInteractive = false, maxFrets = 12) {
        this.container = document.getElementById(containerId);
        this.fretCount = maxFrets;
        this.stringCount = 6;
        this.stringNames = ['E', 'B', 'G', 'D', 'A', 'E'];
        this.isInteractive = isInteractive;
        this.clickHandler = null;
        this.targetString = null;
        if (this.container) {
            this.init();
        } else {
            console.error(`Fretboard container with ID "${containerId}" not found`);
        }
    }
    
    init() {
        this.createFretboard();
    }
    
    createFretboard() {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        const board = document.createElement('div');
        board.className = 'fretboard-grid';
        
        const nut = document.createElement('div');
        nut.className = 'nut';
        board.appendChild(nut);
        
        for (let string = 1; string <= this.stringCount; string++) {
            const stringLabel = document.createElement('div');
            stringLabel.className = 'string-label';
            stringLabel.textContent = this.stringNames[string - 1];
            stringLabel.style.gridColumn = '1';
            stringLabel.style.gridRow = string + 1;
            board.appendChild(stringLabel);
        }
        
        for (let fret = 0; fret <= this.fretCount; fret++) {
            const fretNumber = document.createElement('div');
            fretNumber.className = 'fret-number';
            fretNumber.textContent = fret === 0 ? 'Open' : fret;
            fretNumber.style.gridColumn = fret + 2;
            fretNumber.style.gridRow = this.stringCount + 2;
            if (fret === 0) {
                fretNumber.style.fontStyle = 'italic';
                fretNumber.style.color = '#95a5a6';
            }
            board.appendChild(fretNumber);
            
            for (let string = 1; string <= this.stringCount; string++) {
                const position = document.createElement('div');
                position.className = fret === 0 ? 'fret-position open-string' : 'fret-position';
                position.dataset.string = string;
                position.dataset.fret = fret;
                position.id = `pos-${string}-${fret}`;
                
                position.style.gridColumn = fret + 2;
                position.style.gridRow = string + 1;
                
                const stringLine = document.createElement('div');
                stringLine.className = 'string-line';
                position.appendChild(stringLine);
                
                if (fret > 0) {
                    const fretWire = document.createElement('div');
                    fretWire.className = 'fret-wire';
                    position.appendChild(fretWire);
                }
                
                const marker = document.createElement('div');
                marker.className = fret === 0 ? 'position-marker open-marker' : 'position-marker';
                position.appendChild(marker);
                
                if (fret === 0) {
                    const openLabel = document.createElement('div');
                    openLabel.className = 'open-string-label';
                    openLabel.textContent = '○';
                    marker.appendChild(openLabel);
                }
                
                if (this.isInteractive) {
                    position.style.cursor = 'pointer';
                    position.addEventListener('click', (e) => {
                        if (this.clickHandler) {
                            const clickedString = parseInt(position.dataset.string);
                            const clickedFret = parseInt(position.dataset.fret);
                            
                            // Only allow clicks on the target string if specified
                            if (!this.targetString || clickedString === this.targetString) {
                                this.clickHandler(clickedString, clickedFret);
                            }
                        }
                    });
                }
                
                board.appendChild(position);
            }
            
            if ([3, 5, 7, 9].includes(fret)) {
                const inlay = document.createElement('div');
                inlay.className = 'fret-inlay single';
                inlay.style.gridColumn = fret + 2;
                inlay.style.gridRow = this.stringCount + 3;
                board.appendChild(inlay);
            } else if (fret === 12) {
                const inlay1 = document.createElement('div');
                inlay1.className = 'fret-inlay double';
                inlay1.style.gridColumn = fret + 2;
                inlay1.style.gridRow = this.stringCount + 3;
                inlay1.style.top = '-10px';
                board.appendChild(inlay1);
                
                const inlay2 = document.createElement('div');
                inlay2.className = 'fret-inlay double';
                inlay2.style.gridColumn = fret + 2;
                inlay2.style.gridRow = this.stringCount + 3;
                inlay2.style.top = '10px';
                board.appendChild(inlay2);
            }
        }
        
        this.container.appendChild(board);
    }
    
    highlightPosition(stringNumber, fretNumber, clearFirst = true) {
        if (!this.container) return;
        
        if (clearFirst) {
            this.container.querySelectorAll('.position-marker').forEach(marker => {
                marker.classList.remove('active');
            });
        }
        
        const position = this.container.querySelector(`#pos-${stringNumber}-${fretNumber}`);
        if (position) {
            const marker = position.querySelector('.position-marker');
            if (marker) {
                marker.classList.add('active');
            }
        }
    }
    
    highlightMultiplePositions(positions) {
        this.clearHighlights();
        positions.forEach(pos => {
            this.highlightPosition(pos.string, pos.fret, false);
        });
    }
    
    clearHighlights() {
        if (!this.container) return;
        this.container.querySelectorAll('.position-marker').forEach(marker => {
            marker.classList.remove('active', 'previous-chord');
            marker.style.opacity = '';
        });
    }
    
    setFretRange(minFret, maxFret) {
        if (!this.container) return;
        const positions = this.container.querySelectorAll('.fret-position');
        positions.forEach(pos => {
            const fret = parseInt(pos.dataset.fret);
            if (fret < minFret || fret > maxFret) {
                pos.style.opacity = '0.3';
                pos.style.pointerEvents = 'none';
            } else {
                pos.style.opacity = '1';
                pos.style.pointerEvents = this.isInteractive ? 'auto' : 'none';
            }
        });
    }
    
    setClickHandler(handler) {
        this.clickHandler = handler;
    }
    
    setTargetString(stringNumber) {
        this.targetString = stringNumber;
        this.highlightString(stringNumber);
    }
    
    highlightString(stringNumber) {
        if (!this.container) return;
        const positions = this.container.querySelectorAll('.fret-position');
        positions.forEach(pos => {
            const string = parseInt(pos.dataset.string);
            if (stringNumber && string !== stringNumber) {
                pos.style.opacity = '0.3';
                if (this.isInteractive) {
                    pos.style.pointerEvents = 'none';
                }
            } else {
                pos.style.opacity = '1';
                if (this.isInteractive) {
                    pos.style.pointerEvents = 'auto';
                }
            }
        });
    }
    
    showClickFeedback(stringNumber, fretNumber, isCorrect) {
        if (!this.container) return;
        const position = this.container.querySelector(`#pos-${stringNumber}-${fretNumber}`);
        if (position) {
            const marker = position.querySelector('.position-marker');
            if (marker) {
                marker.classList.add(isCorrect ? 'correct-click' : 'incorrect-click');
                setTimeout(() => {
                    marker.classList.remove('correct-click', 'incorrect-click');
                }, 500);
            }
        }
    }
}