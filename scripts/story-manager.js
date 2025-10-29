/**
 * STORY AND NARRATIVE MANAGER
 * Adds immersive storytelling elements to enhance player engagement
 * Manages mission objectives, story progression, and narrative displays
 */

(function(global) {
    // Global standard for popup/notification visibility duration (ms)
    let NOTIFICATION_DURATION_MS = 10000; // default to 10s as requested
    
    // Story elements with different triggers and contexts
    const STORY_ELEMENTS = {
        intro: {
            title: "Lost in the Void",
            text: "A solar storm scattered your ship's power cores across the asteroid field. Reboot the systems, avoid the spikes, and use time beacons and extra-life capsules to survive.",
            duration: 20000
        },
        level1Complete: {
            title: "Navigation Online",
            text: "Great work! Navigation is back. Scanners show increased hazard density ahead—but also more beacons and a rare life capsule.",
            duration: 10000
        },
        level2Complete: {
            title: "Comms Restored",
            text: "You've re-established long-range communications. Rescue has your signal. One final sector to stabilize life support—mind the spike clusters.",
            duration: 10000
        },
        level3Complete: {
            title: "Life Support Stable",
            text: "All core systems are green. Hold tight—rescue is vectoring to your position.",
            duration: 10000
        },
        gameComplete: {
            title: "Rescue Complete!",
            text: "All power cores recovered and systems restored. The rescue shuttle locks on and pulls you out of the storm. Mission accomplished.",
            duration: 15000
        },
        gameOver: {
            title: "Mission Failed",
            text: "Systems critical. Signal lost in the debris field. We'll try again when the storm clears...",
            duration: 10000
        },
        lowHealth: {
            title: "Warning",
            text: "Hull integrity low. Avoid spikes and grab a life capsule or time beacon if you can.",
            duration: 8000
        }
    };

    // Mission objectives for different game states
    const OBJECTIVES = {
    tutorial: "Learn the controls, collect your first core, avoid spikes",
        level1: "Restore navigation: collect all cores; watch for hazards; time beacons can help",
        level2: "Bring comms online: more hazards ahead; look for time beacons and a life capsule",
        level3: "Stabilize life support: dense hazards—use every beacon; a final life capsule may appear",
        final: "Final push: secure remaining cores and prep for rescue",
        survival: "Survive and collect as many cores as possible"
    };

    let currentObjective = '';
    let storyQueue = [];
    let isShowingStory = false;
    let currentStoryElement = null;
    
    // Visibility helper
    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // Helper: position the objective panel so it never covers the Mission Status UI
    function positionObjective() {
        const objectiveEl = document.getElementById('currentObjective');
        if (!objectiveEl) return;

        const ui = document.getElementById('ui');
        const uiVisible = isVisible(ui);
        if (uiVisible) {
            const rect = ui.getBoundingClientRect();
            // Place just below the Mission Status panel, aligned to its left edge
            const top = Math.min(window.innerHeight - 120, Math.round(rect.bottom + 12));
            objectiveEl.style.top = top + 'px';
            objectiveEl.style.left = Math.round(rect.left) + 'px';
            objectiveEl.style.right = 'auto';
        } else {
            // Default safe position on menu screens
            objectiveEl.style.top = '200px';
            objectiveEl.style.left = '20px';
            objectiveEl.style.right = 'auto';
        }
    }

    /**
     * Show story dialog with enhanced visual effects
     */
    function showStoryDialog(storyKey, skipCallback) {
        const story = STORY_ELEMENTS[storyKey];
        if (!story) {
            console.warn(`Story element '${storyKey}' not found`);
            return;
        }

        // Avoid stacking with menus and end screens
        const hasBlockingOverlay = () => {
            const ids = ['menu', 'loadingOverlay', 'levelComplete', 'gameOver'];
            for (const id of ids) {
                const el = document.getElementById(id);
                if (isVisible(el)) return true;
            }
            return false;
        };

        // Don't show multiple stories at once or when overlays are visible; queue instead
        if (isShowingStory || hasBlockingOverlay()) {
            storyQueue.push({key: storyKey, callback: skipCallback});
            if (!showStoryDialog._overlayWatch) {
                showStoryDialog._overlayWatch = setInterval(() => {
                    if (!hasBlockingOverlay() && !isShowingStory && storyQueue.length) {
                        const next = storyQueue.shift();
                        showStoryDialog(next.key, next.callback);
                    }
                    if (!storyQueue.length) {
                        clearInterval(showStoryDialog._overlayWatch);
                        showStoryDialog._overlayWatch = null;
                    }
                }, 300);
            }
            return;
        }

        isShowingStory = true;
        currentStoryElement = storyKey;

        // Create story overlay with enhanced styling
        const overlay = document.createElement('div');
        overlay.id = 'storyOverlay';
        overlay.className = 'story-overlay';
        
        // Add skip instructions
        const skipText = `Press SPACE, ESC or click to continue`;
        
        overlay.innerHTML = `
            <div class="story-content">
                <div class="story-background"></div>
                <h2 class="story-title">${story.title}</h2>
                <p class="story-text">${story.text}</p>
                <div class="story-progress">
                    <div class="progress-bar"></div>
                </div>
                <div class="story-skip">${skipText}</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Pause game during story
        if (typeof global.gameStarted !== 'undefined') {
            global.wasGameRunning = global.gameStarted;
            global.gameStarted = false;
        }

        // Animate in
        setTimeout(() => overlay.classList.add('visible'), 100);

        // Skip functionality
        let skipped = false;
        const skipHandler = () => {
            if (!skipped) {
                skipped = true;
                hideStoryDialog();
                if (skipCallback) skipCallback();
            }
        };

        // Auto-skip after specified time - REMOVED for better UX
        // Players can now take their time to read

        // Manual skip with space, escape or click
        const keyHandler = (e) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'Escape' || e.key === 'Escape') {
                e.preventDefault();
                skipHandler();
            }
        };

        overlay.addEventListener('click', skipHandler);
        document.addEventListener('keydown', keyHandler);

        // Auto-remove after full duration
        const removeTimeout = setTimeout(() => {
            if (!skipped) {
                hideStoryDialog();
                if (skipCallback) skipCallback();
            }
        }, story.duration);

        function hideStoryDialog() {
            document.removeEventListener('keydown', keyHandler);
            if (removeTimeout) clearTimeout(removeTimeout);
            
            overlay.classList.remove('visible');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 500);
            
            isShowingStory = false;
            currentStoryElement = null;
            
            // Resume game
            if (typeof global.wasGameRunning !== 'undefined' && global.wasGameRunning) {
                global.gameStarted = true;
            }
            
            // Process queued stories
            if (storyQueue.length > 0) {
                const next = storyQueue.shift();
                setTimeout(() => showStoryDialog(next.key, next.callback), 500);
            }
        }
    }

    /**
     * Update mission objective display
     */
    function updateObjective(text, highlight = false) {
        currentObjective = text;
        
        let objectiveEl = document.getElementById('currentObjective');
        if (!objectiveEl) {
            objectiveEl = document.createElement('div');
            objectiveEl.id = 'currentObjective';
            objectiveEl.className = 'objective-display';

            // Always attach to body so it doesn't overlap the Mission Status panel
            document.body.appendChild(objectiveEl);
        }
        
        objectiveEl.innerHTML = `
            <div class="objective-header">MISSION OBJECTIVE</div>
            <div class="objective-text">${text}</div>
        `;
        
        // Position it intelligently relative to the Mission Status panel
        positionObjective();

        if (highlight) {
            objectiveEl.classList.add('highlight');
            setTimeout(() => objectiveEl.classList.remove('highlight'), 2000);
        }
    }

    /**
     * Show temporary notification
     */
    function showNotification(text, type = 'info', duration /* ignored for standardization */) {
        const notification = document.createElement('div');
        notification.className = `notification left notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-text">${text}</div>
            </div>
        `;
        
        // Position notifications directly BELOW the objective if present
        const existingNotifications = document.querySelectorAll('.notification.left');
        let baseTop = 100;

        // Make sure objective is positioned first
        positionObjective();
        const objectiveEl = document.getElementById('currentObjective');
        if (objectiveEl) {
            const rect = objectiveEl.getBoundingClientRect();
            baseTop = Math.round(rect.bottom + 12);
        }

        notification.style.top = `${baseTop + (existingNotifications.length * 70)}px`;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('visible'), 100);
        
        // Remove after standardized duration
        const effectiveDuration = NOTIFICATION_DURATION_MS;
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, effectiveDuration);
    }

    /**
     * Progress tracking for story triggers
     */
    function trackProgress(eventType, data = {}) {
        switch(eventType) {
            case 'crystalCollected':
                if (data.isLevelComplete) {
                    const level = data.level || 1;
                    if (level === 1) {
                        storyQueue.push({key: 'level1Complete'});
                        updateObjective(OBJECTIVES.level2, true);
                    } else if (level === 2) {
                        storyQueue.push({key: 'level2Complete'});
                        updateObjective(OBJECTIVES.level3, true);
                    } else if (level === 3) {
                        storyQueue.push({key: 'level3Complete'});
                        updateObjective(OBJECTIVES.final, true);
                    }
                }
                break;
                
            case 'gameComplete':
                storyQueue.push({key: 'gameComplete'});
                break;
                
            case 'gameOver':
                storyQueue.push({key: 'gameOver'});
                break;
                
            case 'lowHealth':
                if (!isShowingStory && currentStoryElement !== 'lowHealth') {
                    showStoryDialog('lowHealth');
                }
                break;
                
            case 'levelStart':
                const level = data.level || 1;
                if (level === 1) {
                    updateObjective(OBJECTIVES.level1);
                } else if (level === 2) {
                    updateObjective(OBJECTIVES.level2);
                } else if (level === 3) {
                    updateObjective(OBJECTIVES.level3);
                }
                break;
        }
    }

    // Wait utility: run callback when gameplay is active (menu hidden and UI shown)
    function waitForGameplay(cb, timeoutMs = 20000) {
        const start = Date.now();
        (function check() {
            const ui = document.getElementById('ui');
            const menu = document.getElementById('menu');
            if (isVisible(ui) && !isVisible(menu)) {
                cb();
            } else if (Date.now() - start < timeoutMs) {
                setTimeout(check, 300);
            } else {
                // Fallback: run anyway after timeout to avoid deadlocks
                cb();
            }
        })();
    }

    /**
     * Initialize story system
     */
    function initStoryManager() {
        console.log('Story Manager initialized');
        
        // Defer intro until gameplay actually starts (menu hidden and UI shown)
        waitForGameplay(() => {
            showStoryDialog('intro', () => {
                updateObjective(OBJECTIVES.tutorial, true);
                // Controls popup removed to avoid clutter (controls are shown bottom-left)
            });
        });

        // Keep objective positioned when the window resizes
        window.addEventListener('resize', positionObjective);

        // Periodic sync to hide objective during menus and keep position fresh
        if (!initStoryManager._tick) {
            initStoryManager._tick = setInterval(() => {
                const ui = document.getElementById('ui');
                const menu = document.getElementById('menu');
                const obj = document.getElementById('currentObjective');
                const gameplayVisible = isVisible(ui) && !isVisible(menu);
                if (obj) {
                    obj.style.display = gameplayVisible ? 'block' : 'none';
                }
                if (gameplayVisible) positionObjective();
            }, 400);
        }
    }

    /**
     * Get current story state for saving
     */
    function getStoryState() {
        return {
            currentObjective: currentObjective,
            isShowingStory: isShowingStory,
            currentStoryElement: currentStoryElement
        };
    }

    /**
     * Restore story state from saved data
     */
    function restoreStoryState(state) {
        if (state.currentObjective) {
            updateObjective(state.currentObjective);
        }
    }

    // Export functions to global scope
    global.StoryManager = {
        init: initStoryManager,
        showDialog: showStoryDialog,
        updateObjective: updateObjective,
        showNotification: showNotification,
        trackProgress: trackProgress,
        getState: getStoryState,
        restoreState: restoreStoryState,
        objectives: OBJECTIVES,
        // Allow runtime updates to standardized notification duration
        setNotificationDuration(ms) {
            const n = Number(ms);
            if (!isNaN(n) && n >= 500) {
                NOTIFICATION_DURATION_MS = Math.min(Math.max(500, n), 60000);
            }
        },
        getNotificationDuration() { return NOTIFICATION_DURATION_MS; }
    };

})(window);