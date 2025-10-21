/**
 * STORY AND NARRATIVE MANAGER
 * Adds immersive storytelling elements to enhance player engagement
 * Manages mission objectives, story progression, and narrative displays
 */

(function(global) {
    
    // Story elements with different triggers and contexts
    const STORY_ELEMENTS = {
        intro: {
            title: "Lost in the Void",
            text: "Your mining ship has been damaged by a solar storm. The ship's power cores are scattered across the asteroid field. Collect them to restore power and return home.",
            duration: 20000  // Longer duration, no auto-skip
        },
        level1Complete: {
            title: "Power Core Online",
            text: "Navigation systems restored. Moving deeper into the asteroid field to find more power cores...",
            duration: 10000
        },
        level2Complete: {
            title: "Communications Restored",
            text: "You've made contact with the rescue fleet. They're tracking your signal, but you need more power...",
            duration: 10000
        },
        level3Complete: {
            title: "Life Support Online",
            text: "Environmental systems are back online. The rescue fleet is getting closer...",
            duration: 10000
        },
        gameComplete: {
            title: "Rescue Complete!",
            text: "All power cores recovered! The rescue fleet has found you. Welcome home, commander.",
            duration: 15000
        },
        gameOver: {
            title: "Mission Failed",
            text: "Your ship's systems have failed. The rescue fleet couldn't locate you in time...",
            duration: 10000
        },
        lowHealth: {
            title: "Warning",
            text: "Ship hull integrity is critical! Avoid collisions and find power cores quickly!",
            duration: 8000
        }
    };

    // Mission objectives for different game states
    const OBJECTIVES = {
        tutorial: "Learn the controls and collect your first crystal",
        level1: "Collect all power cores to restore navigation systems",
        level2: "Find the communication array power cores", 
        level3: "Restore life support by collecting remaining cores",
        final: "Collect the final power cores for rescue",
        survival: "Survive and collect as many cores as possible"
    };

    let currentObjective = '';
    let storyQueue = [];
    let isShowingStory = false;
    let currentStoryElement = null;

    /**
     * Show story dialog with enhanced visual effects
     */
    function showStoryDialog(storyKey, skipCallback) {
        const story = STORY_ELEMENTS[storyKey];
        if (!story) {
            console.warn(`Story element '${storyKey}' not found`);
            return;
        }

        // Don't show multiple stories at once
        if (isShowingStory) {
            storyQueue.push({key: storyKey, callback: skipCallback});
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
            
            // Add to UI container if it exists, otherwise to body
            const uiContainer = document.getElementById('ui') || document.body;
            uiContainer.appendChild(objectiveEl);
        }
        
        objectiveEl.innerHTML = `
            <div class="objective-header">MISSION OBJECTIVE</div>
            <div class="objective-text">${text}</div>
        `;
        
        if (highlight) {
            objectiveEl.classList.add('highlight');
            setTimeout(() => objectiveEl.classList.remove('highlight'), 2000);
        }
    }

    /**
     * Show temporary notification
     */
    function showNotification(text, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-text">${text}</div>
            </div>
        `;
        
        // Position notifications
        const existingNotifications = document.querySelectorAll('.notification');
        const topOffset = 100 + (existingNotifications.length * 70);
        notification.style.top = `${topOffset}px`;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('visible'), 100);
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, duration);
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
                        showStoryDialog('level1Complete');
                        updateObjective(OBJECTIVES.level2, true);
                    } else if (level === 2) {
                        showStoryDialog('level2Complete');
                        updateObjective(OBJECTIVES.level3, true);
                    } else if (level === 3) {
                        showStoryDialog('level3Complete');
                        updateObjective(OBJECTIVES.final, true);
                    }
                }
                break;
                
            case 'gameComplete':
                showStoryDialog('gameComplete');
                break;
                
            case 'gameOver':
                showStoryDialog('gameOver');
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

    /**
     * Initialize story system
     */
    function initStoryManager() {
        console.log('Story Manager initialized');
        
        // Show intro after a short delay
        setTimeout(() => {
            showStoryDialog('intro', () => {
                updateObjective(OBJECTIVES.tutorial, true);
                // Show controls notification with adequate reading time
                showNotification("🎮 Controls: WASD to move • SPACE to jump • MOUSE to look around", 'info', 12000);
            });
        }, 1000);
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
        objectives: OBJECTIVES
    };

})(window);