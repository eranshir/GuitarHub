class SongsBrowser {
    constructor() {
        this.books = []; // Will store loaded index files
        this.allSongs = []; // Flattened list of all songs
        this.currentBook = null;
        this.currentSong = null;
        this.currentPage = 1;
        this.pdfDoc = null;
        this.zoomLevel = 1.0;
        this.isVisible = false;

        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }

        this.init();
    }

    async init() {
        await this.loadBookIndices();
        this.setupEventListeners();
    }

    async loadBookIndices() {
        /**
         * Load all index JSON files from the score/ directory
         * Expected file structure:
         * score/
         *   don_mclean_index.json
         *   don_mclean.pdf
         *   59_hits_index.json
         *   59_hits.pdf
         */

        // List of books to load
        const bookFiles = [
            '59_hits_index.json',
            '100_popular_fingerpicking_index.json',
            'classic_rock_14_index.json',
            'Classic_Rock_Fingerstyle_index.json',
            'DIRE_STRAITS_index.json',
            'Disney_songs_index.json',
            'don_mclean_index.json',
            'Enormous_Guitar_index.json',
            'Giant_Sheet_Music_index.json',
            'hebrew_songs_index.json',
            'Love_The_Beatles_index.json',
            'Piano_White_Pages_index.json',
            'sting_index.json'
        ];

        console.log('Loading book indices...');

        for (const indexFile of bookFiles) {
            try {
                const response = await fetch(`score/${indexFile}`);
                if (response.ok) {
                    const index = await response.json();

                    // Add PDF filename (remove _index.json and add .pdf)
                    const pdfFileName = indexFile.replace('_index.json', '.pdf');

                    this.books.push({
                        indexFile: indexFile,
                        pdfFile: pdfFileName,
                        name: index.filename.replace('.pdf', '').replace(/_/g, ' '),
                        data: index
                    });

                    // Add all songs to flat list
                    index.songs.forEach(song => {
                        this.allSongs.push({
                            ...song,
                            bookName: index.filename.replace('.pdf', ''),
                            pdfFile: pdfFileName
                        });
                    });

                    console.log(`Loaded: ${indexFile}`);
                } else {
                    console.warn(`Could not load ${indexFile}`);
                }
            } catch (error) {
                console.error(`Error loading ${indexFile}:`, error);
            }
        }

        console.log(`Loaded ${this.books.length} books with ${this.allSongs.length} total songs`);
        this.populateBookSelector();
    }

    setupEventListeners() {
        // Keyboard shortcut: Shift+S
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key === 'S') {
                this.toggleBrowser();
            }
            // ESC to close
            if (e.key === 'Escape' && this.isVisible) {
                this.closeBrowser();
            }
            // PDF viewer is open
            if (this.pdfDoc && document.getElementById('pdf-viewer').style.display !== 'none') {
                // Arrow keys for navigation
                if (e.key === 'ArrowLeft') {
                    this.prevPage();
                } else if (e.key === 'ArrowRight') {
                    this.nextPage();
                }
                // 'b' key to go back to list
                else if (e.key === 'b' || e.key === 'B') {
                    this.closePdfViewer();
                }
                // 'f' key to toggle fullscreen
                else if (e.key === 'f' || e.key === 'F') {
                    this.toggleFullscreen();
                }
            }
        });

        // Close button
        document.getElementById('close-songs-browser').addEventListener('click', () => {
            this.closeBrowser();
        });

        // Tab switching
        document.querySelectorAll('.browser-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Book selector
        document.getElementById('book-selector').addEventListener('change', (e) => {
            this.selectBook(e.target.value);
        });

        // Sort selector
        document.getElementById('sort-selector').addEventListener('change', (e) => {
            this.sortSongs(e.target.value);
        });

        // Search input with autocomplete
        const searchInput = document.getElementById('song-search-input');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // PDF viewer controls
        document.getElementById('back-to-list').addEventListener('click', () => {
            this.closePdfViewer();
        });

        document.getElementById('prev-page').addEventListener('click', () => {
            this.prevPage();
        });

        document.getElementById('next-page').addEventListener('click', () => {
            this.nextPage();
        });

        document.getElementById('page-slider').addEventListener('input', (e) => {
            this.goToPage(parseInt(e.target.value));
        });

        document.getElementById('zoom-in').addEventListener('click', () => {
            this.zoom(1.2);
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.zoom(0.8);
        });

        // Fullscreen buttons
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('exit-fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Handle fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
    }

    toggleFullscreen() {
        const pdfViewer = document.getElementById('pdf-viewer');

        if (!document.fullscreenElement) {
            // Enter fullscreen
            pdfViewer.requestFullscreen().catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen();
        }
    }

    handleFullscreenChange() {
        const pdfViewer = document.getElementById('pdf-viewer');
        const fullscreenBtn = document.getElementById('fullscreen-btn');

        if (document.fullscreenElement) {
            // Entered fullscreen
            pdfViewer.classList.add('fullscreen-mode');
            fullscreenBtn.textContent = '⛶ Exit Fullscreen';

            // Re-render to fit fullscreen
            if (this.pdfDoc) {
                this.renderPage(this.currentPage);
            }
        } else {
            // Exited fullscreen
            pdfViewer.classList.remove('fullscreen-mode');
            fullscreenBtn.textContent = '⛶ Fullscreen';

            // Re-render to fit normal view
            if (this.pdfDoc) {
                this.renderPage(this.currentPage);
            }
        }
    }

    toggleBrowser() {
        if (this.isVisible) {
            this.closeBrowser();
        } else {
            this.openBrowser();
        }
    }

    openBrowser() {
        document.getElementById('songs-browser-overlay').style.display = 'flex';
        this.isVisible = true;
    }

    closeBrowser() {
        document.getElementById('songs-browser-overlay').style.display = 'none';
        this.closePdfViewer();
        this.isVisible = false;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.browser-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.browser-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    populateBookSelector() {
        const selector = document.getElementById('book-selector');

        // Clear existing options except first one
        selector.innerHTML = '<option value="">Select a book...</option>';

        // Add book options
        this.books.forEach((book, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = book.name;
            selector.appendChild(option);
        });
    }

    selectBook(bookIndex) {
        if (bookIndex === '') {
            document.getElementById('songs-list').innerHTML = '';
            return;
        }

        this.currentBook = this.books[parseInt(bookIndex)];
        this.displaySongsList(this.currentBook.data.songs, this.currentBook);
    }

    sortSongs(sortType) {
        if (!this.currentBook) return;

        let songs = [...this.currentBook.data.songs];

        if (sortType === 'alphabetical') {
            songs.sort((a, b) => a.title.localeCompare(b.title));
        }
        // 'original' order is already the default

        this.displaySongsList(songs, this.currentBook);
    }

    displaySongsList(songs, book) {
        const listContainer = document.getElementById('songs-list');
        listContainer.innerHTML = '';

        if (songs.length === 0) {
            listContainer.innerHTML = '<p class="no-songs">No songs found</p>';
            return;
        }

        songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <span class="song-title">${song.title}</span>
                <span class="song-pages">Pages ${song.start_page}-${song.end_page}</span>
            `;
            songItem.addEventListener('click', () => {
                this.openSong(song, book);
            });
            listContainer.appendChild(songItem);
        });
    }

    handleSearch(query) {
        const autocompleteDiv = document.getElementById('search-autocomplete');
        const resultsDiv = document.getElementById('search-results');

        if (query.length < 2) {
            autocompleteDiv.style.display = 'none';
            resultsDiv.innerHTML = '';
            return;
        }

        // Filter songs
        const matches = this.allSongs.filter(song =>
            song.title.toLowerCase().includes(query.toLowerCase())
        );

        // Show autocomplete
        if (matches.length > 0) {
            autocompleteDiv.innerHTML = '';
            autocompleteDiv.style.display = 'block';

            matches.slice(0, 10).forEach(song => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `
                    <span class="autocomplete-title">${song.title}</span>
                    <span class="autocomplete-book">${song.bookName}</span>
                `;
                item.addEventListener('click', () => {
                    this.selectSearchResult(song);
                    autocompleteDiv.style.display = 'none';
                });
                autocompleteDiv.appendChild(item);
            });
        } else {
            autocompleteDiv.style.display = 'none';
        }

        // Show search results
        this.displaySearchResults(matches);
    }

    displaySearchResults(songs) {
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.innerHTML = '';

        if (songs.length === 0) {
            resultsDiv.innerHTML = '<p class="no-songs">No songs found</p>';
            return;
        }

        songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <span class="song-title">${song.title}</span>
                <span class="song-info">${song.bookName} • Pages ${song.start_page}-${song.end_page}</span>
            `;
            songItem.addEventListener('click', () => {
                this.selectSearchResult(song);
            });
            resultsDiv.appendChild(songItem);
        });
    }

    selectSearchResult(song) {
        // Find the book for this song
        const book = this.books.find(b => b.pdfFile === song.pdfFile);
        if (book) {
            this.openSong(song, book);
        }
    }

    async openSong(song, book) {
        this.currentSong = song;

        // Hide browser list, show PDF viewer
        document.querySelector('.songs-browser-container').style.display = 'none';
        document.getElementById('pdf-viewer').style.display = 'flex';

        // Update header
        document.getElementById('current-song-title').textContent = song.title;

        // Load the PDF
        await this.loadPDF(`score/${book.pdfFile}`, song.start_page, song.end_page);
    }

    async loadPDF(pdfPath, startPage, endPage) {
        try {
            console.log(`Loading PDF: ${pdfPath}, starting at page ${startPage}`);

            const loadingTask = pdfjsLib.getDocument(pdfPath);
            this.pdfDoc = await loadingTask.promise;

            this.currentPage = startPage;

            // Set up slider for entire PDF (not just song pages)
            const slider = document.getElementById('page-slider');
            slider.min = 1;
            slider.max = this.pdfDoc.numPages;
            slider.value = startPage;

            // Render first page
            await this.renderPage(startPage);

        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF. Make sure the PDF file exists in the score/ directory.');
        }
    }

    async renderPage(pageNum) {
        try {
            const page = await this.pdfDoc.getPage(pageNum);

            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');

            // Calculate viewport with zoom
            const viewport = page.getViewport({ scale: this.zoomLevel * 1.5 });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Update page info
            const totalPages = this.pdfDoc.numPages;
            document.getElementById('current-page-info').textContent =
                `Page ${pageNum} of ${totalPages}`;

            // Update slider
            document.getElementById('page-slider').value = pageNum;

            this.currentPage = pageNum;

        } catch (error) {
            console.error('Error rendering page:', error);
        }
    }

    prevPage() {
        const minPage = parseInt(document.getElementById('page-slider').min);
        if (this.currentPage > minPage) {
            this.renderPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const maxPage = parseInt(document.getElementById('page-slider').max);
        if (this.currentPage < maxPage) {
            this.renderPage(this.currentPage + 1);
        }
    }

    goToPage(pageNum) {
        this.renderPage(pageNum);
    }

    zoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.5, Math.min(3.0, this.zoomLevel)); // Limit 50%-300%

        document.getElementById('zoom-level').textContent = `${Math.round(this.zoomLevel * 100)}%`;

        // Re-render current page with new zoom
        if (this.pdfDoc) {
            this.renderPage(this.currentPage);
        }
    }

    closePdfViewer() {
        // Exit fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }

        document.getElementById('pdf-viewer').style.display = 'none';
        document.querySelector('.songs-browser-container').style.display = 'flex';

        // Remove fullscreen-mode class immediately to fix interaction
        document.getElementById('pdf-viewer').classList.remove('fullscreen-mode');

        // Clean up PDF
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
            this.pdfDoc = null;
        }

        this.currentSong = null;
        this.zoomLevel = 1.0;
        document.getElementById('zoom-level').textContent = '100%';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.songsBrowser = new SongsBrowser();
});
