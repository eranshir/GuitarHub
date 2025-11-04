// Mobile Manager - Handles mobile-specific UI and gestures
class MobileManager {
    constructor(app) {
        this.app = app;
        this.isMobile = false;
        this.isPortrait = false;
        this.isSongsBrowserOpen = false;
        this.portraitWarningDismissed = false;

        // Triple-tap gesture state
        this.tapCount = 0;
        this.tapTimer = null;
        this.CORNER_SIZE = 80;
        this.TAP_TIMEOUT = 1000;

        // Panel state
        this.isNavDrawerOpen = false;
        this.isSettingsPanelOpen = false;
        this.isChatPanelOpen = false;

        this.init();
    }

    init() {
        this.detectMobile();
        this.setupOrientationDetection();
        this.setupMobileNavigation();
        this.setupTripleTapGesture();
        this.setupPanelToggles();
        this.updateLayout();
    }

    detectMobile() {
        // Check if device is mobile based on screen width and touch capability
        this.isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
        return this.isMobile;
    }

    setupOrientationDetection() {
        const checkOrientation = () => {
            this.isPortrait = window.innerHeight > window.innerWidth;
            this.isMobile = this.detectMobile();
            this.updateLayout();
        };

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        // Initial check
        checkOrientation();
    }

    updateLayout() {
        const portraitWarning = document.getElementById('portrait-warning');

        // Show portrait warning only if:
        // 1. Mobile device
        // 2. Portrait orientation
        // 3. Not dismissed
        // 4. Songs Browser NOT open
        if (this.isMobile && this.isPortrait && !this.portraitWarningDismissed && !this.isSongsBrowserOpen) {
            if (portraitWarning) portraitWarning.style.display = 'flex';
        } else {
            if (portraitWarning) portraitWarning.style.display = 'none';
        }

        // Update body class for CSS targeting
        document.body.classList.toggle('mobile', this.isMobile);
        document.body.classList.toggle('portrait', this.isPortrait);
    }

    setupMobileNavigation() {
        // Menu toggle button
        const menuToggle = document.getElementById('mobile-menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleNavDrawer());
        }

        // Close button
        const closeNav = document.getElementById('close-mobile-nav');
        if (closeNav) {
            closeNav.addEventListener('click', () => this.closeNavDrawer());
        }

        // Backdrop click to close
        const backdrop = document.querySelector('.mobile-nav-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeNavDrawer());
        }

        // Drawer navigation buttons
        document.querySelectorAll('.drawer-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const moduleId = e.target.dataset.module;

                if (moduleId) {
                    // Update active state
                    document.querySelectorAll('.drawer-nav-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    // Switch module using app's method
                    if (this.app && this.app.switchModule) {
                        this.app.switchModule(moduleId);
                    }

                    // Close drawer
                    this.closeNavDrawer();

                    // Show/hide chat toggle based on module
                    const chatToggle = document.getElementById('mobile-chat-toggle');
                    if (chatToggle) {
                        chatToggle.style.display = moduleId === 'assistant' ? 'block' : 'none';
                    }
                }
            });
        });

        // Songs Browser button (special case)
        const songsBtn = document.getElementById('mobile-songs-btn');
        if (songsBtn) {
            songsBtn.addEventListener('click', () => {
                if (window.songsBrowser) {
                    window.songsBrowser.openBrowser();
                    this.setSongsBrowserState(true);
                }
                this.closeNavDrawer();
            });
        }

        // Dismiss portrait warning
        const dismissBtn = document.getElementById('dismiss-portrait-warning');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.portraitWarningDismissed = true;
                this.updateLayout();
            });
        }
    }

    toggleNavDrawer() {
        this.isNavDrawerOpen ? this.closeNavDrawer() : this.openNavDrawer();
    }

    openNavDrawer() {
        this.isNavDrawerOpen = true;
        const overlay = document.getElementById('mobile-nav-overlay');
        if (overlay) {
            overlay.style.display = 'block';
            // Trigger animation
            setTimeout(() => overlay.classList.add('active'), 10);
        }
    }

    closeNavDrawer() {
        this.isNavDrawerOpen = false;
        const overlay = document.getElementById('mobile-nav-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.style.display = 'none', 300);
        }
    }

    setupPanelToggles() {
        // Settings toggle
        const settingsToggle = document.getElementById('mobile-settings-toggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', () => {
                // For now, just show a message - full panel implementation in next phase
                console.log('Settings toggle clicked - panel coming soon');
            });
        }

        // Chat toggle (Assistant mode)
        const chatToggle = document.getElementById('mobile-chat-toggle');
        if (chatToggle) {
            chatToggle.addEventListener('click', () => {
                console.log('Chat toggle clicked - panel coming soon');
            });
        }
    }

    setupTripleTapGesture() {
        document.addEventListener('touchstart', (e) => {
            if (!this.isMobile) return;

            const touch = e.touches[0];
            const isBottomRight =
                touch.clientX > window.innerWidth - this.CORNER_SIZE &&
                touch.clientY > window.innerHeight - this.CORNER_SIZE;

            if (isBottomRight) {
                this.tapCount++;

                if (this.tapCount === 2) {
                    // Show hint after 2 taps
                    this.showTapIndicator();
                }

                if (this.tapCount === 3) {
                    // Open Songs Browser
                    if (window.songsBrowser) {
                        window.songsBrowser.openBrowser();
                        this.setSongsBrowserState(true);
                    }
                    this.tapCount = 0;
                }

                // Reset after timeout
                clearTimeout(this.tapTimer);
                this.tapTimer = setTimeout(() => {
                    this.tapCount = 0;
                }, this.TAP_TIMEOUT);
            }
        });
    }

    showTapIndicator() {
        const indicator = document.getElementById('tap-indicator');
        if (indicator) {
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 500);
        }
    }

    setSongsBrowserState(isOpen) {
        this.isSongsBrowserOpen = isOpen;
        this.updateLayout();

        // Listen for Songs Browser close
        if (isOpen) {
            const closeBtn = document.getElementById('close-songs-browser');
            const backBtn = document.getElementById('back-to-list');

            const handleClose = () => {
                this.setSongsBrowserState(false);
            };

            if (closeBtn) closeBtn.addEventListener('click', handleClose, { once: true });
            if (backBtn) backBtn.addEventListener('click', handleClose, { once: true });
        }
    }

    // Public method for games to check if mobile
    isMobileDevice() {
        return this.isMobile;
    }

    // Public method for games to check if portrait
    isPortraitMode() {
        return this.isPortrait;
    }
}
