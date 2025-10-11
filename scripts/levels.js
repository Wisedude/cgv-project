/**
 * LEVELS - DATA-DRIVEN CONFIGURATION AND FLOW
 *
 * Summary:
 * - Defines levelConfigs (name, crystalCount, timeLimit and platform descriptors)
 * - Clears scene state and loads the requested level
 * - Next/restart/complete handlers that coordinate with UI and audio
 *
 * References:
 * - MDN demo with Three.js (scene state and reinitialisation): https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js
 * - Three.js manual (scene graph, add/remove): https://threejs.org/manual/
 * - Tuts+ endless runner (placing repeated content): https://code.tutsplus.com/creating-a-simple-3d-endless-runner-game-using-three-js--cms-29157t
 * - CGV coursebook (data structures for scene content, transformations): https://lamp.ms.wits.ac.za/~branden/CGV/_book/index.html
 *
 * Notes:
 * - Platforms are created via createPlatform from physics.js; positions and sizes here are authored, not random.
 * - Full procedural generation is left as a TODO.
 */

(function(global) {
    // =============================================================================
    // LEVEL CONFIGURATION DATA STRUCTURE
    // =============================================================================
    
    /**
     * Complete level definitions using data-driven design approach
     * Each level configuration contains all necessary information for generation:
     * - Descriptive name for UI display
     * - Target crystal count for completion objectives
     * - Time limit creating pressure and replayability
     * - Platform layout with precise positioning and sizing
     * - Color scheme progression for visual variety
     * 
     * Design Philosophy:
     * - Level 1: Tutorial-friendly with close platforms and forgiving timing
     * - Level 2: Intermediate challenge with longer jumps and more crystals
     * - Level 3: Advanced difficulty with complex navigation and tight timing
     */
    const levelConfigs = [
        {
            name: "Crystal Caverns",    // Beginner-friendly underground theme
            crystalCount: 8,            // Manageable collection target
            timeLimit: 60,              // Generous time allowance
            platforms: [
                // Starting platform - large and centrally positioned
                { pos: [0, 0, 0], size: [24, 2, 24], color: "#5a4e3c" },
                
                // Progressive platforms with increasing height and distance
                { pos: [12, 3, -12], size: [12, 2, 10], color: "#6c5c49" },
                { pos: [0, 6, -24], size: [8, 1.5, 14], color: "#7a6754" },
                { pos: [-10, 9, -38], size: [10, 2, 10], color: "#60574d" },
                { pos: [-2, 12, -52], size: [8, 1.5, 10], color: "#74604d" },
                { pos: [8, 14, -68], size: [14, 2, 14], color: "#4c443a" },
                
                // Side branch for exploration and crystal hunting
                { pos: [22, 8, -40], size: [10, 2, 10], color: "#8a7a66" }
            ]
        },
        {
            name: "Sky Temples",        // Intermediate aerial temple theme
            crystalCount: 12,           // Increased collection challenge
            timeLimit: 60,              // Same time with more objectives
            platforms: [
                // Smaller starting area increases immediate challenge
                { pos: [0, 0, 0], size: [18, 2, 18], color: "#5c5246" },
                
                // More complex routing with branching paths
                { pos: [10, 4, -12], size: [10, 2, 10], color: "#73624e" },
                { pos: [-12, 6, -18], size: [12, 2, 10], color: "#8a725e" },
                { pos: [4, 9, -30], size: [8, 1.5, 14], color: "#555c51" },
                { pos: [16, 12, -40], size: [9, 2, 9], color: "#6b5646" },
                { pos: [-6, 15, -52], size: [8, 1.5, 10], color: "#84715d" },
                { pos: [2, 18, -66], size: [14, 2, 12], color: "#657060" },
                { pos: [-10, 22, -82], size: [10, 2, 10], color: "#9b7f66" },
                
                // Final challenge platform at significant height
                { pos: [8, 26, -98], size: [10, 1.5, 14], color: "#6a594a" }
            ]
        },
        {
            name: "Cosmic Realm",       // Advanced space theme with maximum challenge
            crystalCount: 15,           // High collection requirement
            timeLimit: 60,              // Tight timing pressure
            platforms: [
                // Compact starting area forces immediate movement
                { pos: [0, 0, 0], size: [16, 2, 16], color: "#3f3a35" },
                
                // Complex multi-branch routing requires strategic planning
                { pos: [-6, 3, 10], size: [8, 2, 8], color: "#57514b" },
                { pos: [9, 4, -12], size: [10, 2, 8], color: "#6c5a4f" },
                { pos: [-12, 7, -26], size: [10, 1.5, 16], color: "#47413d" },
                { pos: [5, 11, -42], size: [7, 1.5, 7], color: "#7b685c" },
                { pos: [-4, 14, -58], size: [12, 2, 12], color: "#534e4b" },
                { pos: [-16, 17, -74], size: [9, 2, 9], color: "#6b5b51" },
                { pos: [4, 20, -90], size: [10, 1.5, 16], color: "#434446" },
                { pos: [14, 24, -108], size: [10, 2, 10], color: "#7a6355" },
                { pos: [0, 28, -126], size: [12, 2, 12], color: "#5a524d" },
                { pos: [-10, 32, -144], size: [8, 1.5, 8], color: "#8a7463" },
                
                // Ultimate challenge requiring precise platforming
                { pos: [6, 36, -166], size: [14, 2, 14], color: "#444041" }
            ]
        }
    ];

    // TODO: Add procedural level generation using noise functions
    // TODO: Implement dynamic difficulty adjustment based on player performance
    // TODO: Create level editor for user-generated content
    // TODO: Add environmental hazards (moving platforms, disappearing floors)
    // TODO: Implement multiple paths with different risk/reward ratios

    // =============================================================================
    // SCENE CLEANUP AND MEMORY MANAGEMENT
    // =============================================================================
    
    /**
     * Clear level by removing objects added by loadLevel.
     * - Removes Mesh instances for platforms/crystals/particles from the scene and arrays.
     * - Removes the player Group and nulls the reference; respawn will recreate.
     * - Disposal of geometries/materials is left as a TODO because we re-use caches across levels.
     */
    function clearLevel() {
        // Platform cleanup - remove from scene and clear references
        if (scene && platforms) {
            platforms.forEach(platform => {
                scene.remove(platform);
                // TODO: Dispose of platform geometries and materials for memory efficiency
                // TODO: Add reference counting for shared resources
            });
            platforms.length = 0; // Clear array efficiently
        }
        
        // Crystal cleanup - important for collectible systems
        if (scene && crystals) {
            crystals.forEach(crystal => {
                scene.remove(crystal);
                // TODO: Return crystal materials to object pool
                // TODO: Dispose of crystal glow effects and animations
            });
            crystals.length = 0;
        }
        
        // Particle system cleanup - prevent performance degradation
        if (scene && particles) {
            particles.forEach(particle => {
                scene.remove(particle);
                // TODO: Return particles to object pool for reuse
                // TODO: Clear particle animation timers and callbacks
            });
            particles.length = 0;
        }
        
        // Player cleanup - reset character state
        if (scene && player) {
            scene.remove(player);
            player = null;
            // TODO: Reset player animations and state variables
            // TODO: Clear player-specific UI elements and HUD
        }
        
        // TODO: Add audio cleanup (stop level-specific music and sounds)
        // TODO: Clear level-specific lighting and environmental effects
        // TODO: Reset camera position and settings to defaults
    }

    function loadLevel(levelNum) {
        const config = levelConfigs[levelNum - 1];

        // if (typeof showLoadingScreen === 'function') {
        //     const label = config && config.name ? `Preparing ${config.name}` : 'Preparing level...';
        //     showLoadingScreen(label);
        // }

        clearLevel();

        // if (!config) {
        //     if (typeof hideLoadingScreen === 'function') {
        //         hideLoadingScreen(0);
        //     }
        //     return;
        // }

        totalCrystals = config.crystalCount;
        gameTime = config.timeLimit;

        if (typeof createPlayer === 'function') {
            createPlayer();
        }

        if (typeof global.resetViewOrientation === 'function') {
            global.resetViewOrientation();
        }

        if (Array.isArray(config.platforms) && typeof createPlatform === 'function') {
            config.platforms.forEach(platData => createPlatform(platData.pos, platData.size, platData.color));
        }

        if (typeof createCrystals === 'function') {
            createCrystals(config.crystalCount);
        }

        if (typeof createEnvironment === 'function') {
            createEnvironment();
        }

        collectedCrystals = 0;
        levelStartTime = Date.now();

        if (typeof startTimer === 'function') {
            startTimer();
        }
        if (typeof updateUI === 'function') {
            updateUI();
        }

        if (typeof hideLoadingScreen === 'function') {
            requestAnimationFrame(() => hideLoadingScreen(500));
        }
    }

    function nextLevel() {
        document.getElementById('levelComplete').style.display = 'none';
        levelCompleteActive = false;

        if (currentLevel < maxLevel) {
            currentLevel++;
            loadLevel(currentLevel);
            gameStarted = true;
        } else {
            alert(`🎉 Congratulations! You've completed all levels!\nFinal Score: ${score}`);
            backToMenu();
        }
    }

    function restartLevel() {
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('levelComplete').style.display = 'none';
        levelCompleteActive = false;
        loadLevel(currentLevel);
        gameStarted = true;

        if (window.audioManager && typeof window.audioManager.startBackground === 'function') {
            try {
                window.audioManager.startBackground();
            } catch (err) {
                console.warn('[Audio] Failed to restart background music', err);
            }
        }
    }

    function levelComplete() {
        gameStarted = false;
        if (gameTimer) clearInterval(gameTimer);
        levelCompleteActive = true;

        if (window.audioManager && typeof window.audioManager.playWin === 'function') {
            try {
                window.audioManager.playWin();
            } catch (err) {
                console.warn('[Audio] Failed to play win sound', err);
            }
        }

        score += gameTime * 10;

        document.getElementById('levelStats').textContent =
            `Crystals: ${collectedCrystals}/${totalCrystals} | Time Bonus: ${gameTime * 10} | Total Score: ${score}`;
        document.getElementById('levelComplete').style.display = 'block';
    }

    global.levelConfigs = levelConfigs;
    global.loadLevel = loadLevel;
    global.clearLevel = clearLevel;
    global.nextLevel = nextLevel;
    global.restartLevel = restartLevel;
    global.levelComplete = levelComplete;
})(window);
