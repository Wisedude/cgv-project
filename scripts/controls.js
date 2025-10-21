/**
 * INPUT CONTROL AND SETTINGS
 *
 * Summary:
 * - Keyboard (WASD, Space, C, R, Escape) and mouse movement handling
 * - Pointer Lock API on the renderer canvas when the game is running
 * - Settings persisted in localStorage (volume, sensitivity, invert Y, show FPS)
 * - UI bindings for sliders/checkboxes with live label updates
 * - Pause/menu toggling that also pauses/resumes background audio if present
 *
 * References:
 * - MDN demo with Three.js (Pointer Lock and input patterns): https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js
 * - Codrops interactive 3D character (camera look and input feel): https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/
 * - Three.js manual (resizing and renderer canvas): https://threejs.org/manual/
 *
 * Notes:
 * - Gamepad support and key remapping are TODOs and not implemented here.
 */

(function(global) {
    // =============================================================================
    // SETTINGS SYSTEM CONFIGURATION
    // =============================================================================
    
    // Local storage key for settings persistence (versioned for compatibility)
    const SETTINGS_STORAGE_KEY = 'cc3d-settings-v1';
    
    /**
     * Default settings configuration providing sensible starting values
     * These values are carefully chosen for optimal gameplay experience:
     * - Music volume: Low enough to not overpower sound effects
     * - SFX volume: High enough for clear audio feedback
     * - Mouse sensitivity: Balanced for precise control without overshooting
     * - Invert Y: False by default (standard FPS convention)
     * - Show FPS: Enabled for performance monitoring
     */
    const DEFAULT_SETTINGS = {
        musicVolume: 0.25,          // Background music level (0.0 - 1.0)
        sfxVolume: 0.7,             // Sound effects volume (0.0 - 1.0)
        mouseSensitivity: 0.002,    // Mouse movement multiplier
        invertY: false,             // Invert vertical mouse movement
        showFPS: true,              // Display performance counter
        graphicsPreset: 'MEDIUM',   // Graphics quality preset
        postProcessing: true,       // Post-processing effects
        dynamicShadows: true,       // Dynamic shadow rendering
        autoOptimize: false         // Automatic performance optimization
    };

    // Runtime settings state
    let gameSettings = null;           // Current active settings
    let settingsListenersAttached = false; // Track event listener state

    // TODO: Add gamepad/controller support (Gamepad API)
    // TODO: Implement key binding customization system
    // TODO: Add graphics quality presets (low/medium/high)
    // TODO: Create accessibility options (colorblind support, text scaling)

    // =============================================================================
    // UTILITY FUNCTIONS FOR DATA VALIDATION
    // =============================================================================
    
    /**
     * Utility function to constrain values within safe bounds
     * Prevents settings from causing gameplay issues or crashes
     * 
     * @param {number} value - Value to constrain
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {number} Safely constrained value
     */
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * Validate and normalize settings object to prevent corruption
     * Ensures all settings have valid values within acceptable ranges
     * Provides safety against malformed localStorage data
     * 
     * @param {Object} rawSettings - Unvalidated settings object
     * @returns {Object} Validated and normalized settings
     */
    function normalizeSettings(rawSettings) {
        const normalized = { ...DEFAULT_SETTINGS }; // Start with safe defaults
        
        // Validate input object
        if (!rawSettings || typeof rawSettings !== 'object') {
            return normalized; // Return defaults for invalid input
        }

        // Validate and constrain music volume
        if (rawSettings.musicVolume !== undefined) {
            normalized.musicVolume = clamp(Number(rawSettings.musicVolume) || 0, 0, 1);
        }
        
        // Validate and constrain sound effects volume
        if (rawSettings.sfxVolume !== undefined) {
            normalized.sfxVolume = clamp(Number(rawSettings.sfxVolume) || 0, 0, 1);
        }
        
        // Validate and constrain mouse sensitivity (prevent unusably high/low values)
        if (rawSettings.mouseSensitivity !== undefined) {
            normalized.mouseSensitivity = clamp(Number(rawSettings.mouseSensitivity) || 0, 0.001, 0.02);
        }
        
        // Validate boolean settings with safe conversion
        if (rawSettings.invertY !== undefined) {
            normalized.invertY = !!rawSettings.invertY; // Convert to boolean safely
        }
        if (rawSettings.showFPS !== undefined) {
            normalized.showFPS = !!rawSettings.showFPS;
        }
        
        // Validate graphics settings
        if (rawSettings.graphicsPreset !== undefined) {
            const validPresets = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'CUSTOM'];
            normalized.graphicsPreset = validPresets.includes(rawSettings.graphicsPreset) 
                ? rawSettings.graphicsPreset 
                : DEFAULT_SETTINGS.graphicsPreset;
        }
        if (rawSettings.dynamicShadows !== undefined) {
            normalized.dynamicShadows = !!rawSettings.dynamicShadows;
        }
        if (rawSettings.postProcessing !== undefined) {
            normalized.postProcessing = !!rawSettings.postProcessing;
        }
        if (rawSettings.autoOptimize !== undefined) {
            normalized.autoOptimize = !!rawSettings.autoOptimize;
        }

        return normalized;
    }

    // =============================================================================
    // SETTINGS PERSISTENCE SYSTEM
    // =============================================================================
    
    /**
     * Load settings from browser localStorage with error handling
     * Implements robust data recovery and validation for user preferences
     * Falls back to defaults if loading fails or data is corrupted
     * 
     * @returns {Object} Validated settings object
     */
    function loadSettings() {
        try {
            // Check for localStorage availability (some browsers may disable it)
            const stored = global.localStorage ? global.localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
            
            if (!stored) {
                return { ...DEFAULT_SETTINGS }; // No stored data, use defaults
            }
            
            // Parse JSON data with error handling
            const parsed = JSON.parse(stored);
            return normalizeSettings(parsed); // Validate and normalize loaded data
            
        } catch (err) {
            console.warn('[Settings] Failed to load settings, using defaults.', err);
            return { ...DEFAULT_SETTINGS }; // Return safe defaults on any error
        }
    }

    /**
     * Save settings to browser localStorage with error handling
     * Ensures user preferences persist across browser sessions
     * Gracefully handles storage quota exceeded and privacy mode issues
     * 
     * @param {Object} settings - Settings object to persist
     */
    function saveSettings(settings) {
        try {
            // Check for localStorage availability before attempting save
            if (!global.localStorage) return;
            
            // Serialize and store settings data
            global.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            
        } catch (err) {
            console.warn('[Settings] Failed to save settings.', err);
            // TODO: Implement fallback storage method (cookies, session storage)
            // TODO: Show user notification about settings save failure
        }
    }

    // =============================================================================
    // UI ELEMENT ACCESS AND MANAGEMENT
    // =============================================================================
    
    /**
     * Get references to all settings-related DOM elements
     * Centralizes element access for easier maintenance and debugging
     * Returns object with all form elements for batch operations
     * 
     * @returns {Object} Collection of DOM element references
     */
    function getSettingsFormElements() {
        return {
            panel: document.getElementById('settingsMenu'),
            home: document.getElementById('menuHome'),
            
            // Audio controls
            musicSlider: document.getElementById('musicVolume'),
            musicValue: document.getElementById('musicVolumeValue'),
            sfxSlider: document.getElementById('sfxVolume'),
            sfxValue: document.getElementById('sfxVolumeValue'),
            
            // Input controls
            sensitivitySlider: document.getElementById('mouseSensitivity'),
            sensitivityValue: document.getElementById('mouseSensitivityValue'),
            invertCheckbox: document.getElementById('invertYAxis'),
            
            // Display controls
            fpsCheckbox: document.getElementById('showFps'),
            
            // Graphics controls
            graphicsPreset: document.getElementById('graphicsPreset'),
            dynamicShadows: document.getElementById('dynamicShadows'),
            postProcessing: document.getElementById('postProcessing'),
            autoOptimize: document.getElementById('autoOptimize')
        };
    }

    function updateSettingsForm(settings) {
        const elements = getSettingsFormElements();
        if (!elements.panel) {
            return;
        }

        if (elements.musicSlider) {
            elements.musicSlider.value = Math.round(settings.musicVolume * 100);
        }
        if (elements.musicValue) {
            elements.musicValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
        }

        if (elements.sfxSlider) {
            elements.sfxSlider.value = Math.round(settings.sfxVolume * 100);
        }
        if (elements.sfxValue) {
            elements.sfxValue.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
        }

        if (elements.sensitivitySlider) {
            // Convert 0.002 default to scale 1-10 where 5 = 0.002
            const sliderValue = Math.round(settings.mouseSensitivity * 2500); // 0.002 * 2500 = 5
            elements.sensitivitySlider.value = Math.max(1, Math.min(10, sliderValue));
        }
        if (elements.sensitivityValue) {
            const sliderVal = elements.sensitivitySlider ? Number(elements.sensitivitySlider.value) : 5;
            elements.sensitivityValue.textContent = sliderVal.toString();
        }

        if (elements.invertCheckbox) {
            elements.invertCheckbox.checked = !!settings.invertY;
        }
        if (elements.fpsCheckbox) {
            elements.fpsCheckbox.checked = !!settings.showFPS;
        }
        
        // Graphics settings
        if (elements.graphicsPreset) {
            elements.graphicsPreset.value = settings.graphicsPreset || 'MEDIUM';
            // Update custom controls visibility
            const customControls = document.getElementById('customGraphicsControls');
            if (customControls) {
                customControls.style.display = settings.graphicsPreset === 'CUSTOM' ? 'block' : 'none';
            }
        }
        if (elements.dynamicShadows) {
            elements.dynamicShadows.checked = !!settings.dynamicShadows;
        }
        if (elements.postProcessing) {
            elements.postProcessing.checked = !!settings.postProcessing;
        }
        if (elements.autoOptimize) {
            elements.autoOptimize.checked = !!settings.autoOptimize;
        }
    }

    function getSettingsFromForm() {
        const elements = getSettingsFormElements();
        const rawSensitivity = elements.sensitivitySlider ? Number(elements.sensitivitySlider.value) : 5; // 1-10 scale

        return normalizeSettings({
            musicVolume: elements.musicSlider ? Number(elements.musicSlider.value) / 100 : DEFAULT_SETTINGS.musicVolume,
            sfxVolume: elements.sfxSlider ? Number(elements.sfxSlider.value) / 100 : DEFAULT_SETTINGS.sfxVolume,
            mouseSensitivity: rawSensitivity / 2500, // Convert 1-10 scale to 0.0004-0.004 range
            invertY: elements.invertCheckbox ? elements.invertCheckbox.checked : DEFAULT_SETTINGS.invertY,
            showFPS: elements.fpsCheckbox ? elements.fpsCheckbox.checked : DEFAULT_SETTINGS.showFPS,
            
            // Graphics settings
            graphicsPreset: elements.graphicsPreset ? elements.graphicsPreset.value : DEFAULT_SETTINGS.graphicsPreset,
            dynamicShadows: elements.dynamicShadows ? elements.dynamicShadows.checked : DEFAULT_SETTINGS.dynamicShadows,
            postProcessing: elements.postProcessing ? elements.postProcessing.checked : DEFAULT_SETTINGS.postProcessing,
            autoOptimize: elements.autoOptimize ? elements.autoOptimize.checked : DEFAULT_SETTINGS.autoOptimize
        });
    }

    function attachSettingsInputListeners() {
        if (settingsListenersAttached) return;
        const elements = getSettingsFormElements();
        if (!elements.panel) return;

        // Setup tab switching
        setupSettingsTabs();
        
        // Setup graphics preset handler
        setupGraphicsPresetHandler();

        const updateLabels = () => {
            if (elements.musicSlider && elements.musicValue) {
                elements.musicValue.textContent = `${Math.round(Number(elements.musicSlider.value))}%`;
            }
            if (elements.sfxSlider && elements.sfxValue) {
                elements.sfxValue.textContent = `${Math.round(Number(elements.sfxSlider.value))}%`;
            }
            if (elements.sensitivitySlider && elements.sensitivityValue) {
                elements.sensitivityValue.textContent = Number(elements.sensitivitySlider.value).toString();
            }
        };

        if (elements.musicSlider) {
            elements.musicSlider.addEventListener('input', updateLabels);
        }
        if (elements.sfxSlider) {
            elements.sfxSlider.addEventListener('input', updateLabels);
        }
        if (elements.sensitivitySlider) {
            elements.sensitivitySlider.addEventListener('input', () => {
                updateLabels();
            });
        }

        settingsListenersAttached = true;
    }

    function setupSettingsTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const tabContents = document.querySelectorAll('.settings-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const targetContent = document.getElementById(targetTab + 'Tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }
    
    function setupGraphicsPresetHandler() {
        const presetSelect = document.getElementById('graphicsPreset');
        const customControls = document.getElementById('customGraphicsControls');
        
        if (presetSelect && customControls) {
            const toggleCustomControls = () => {
                const isCustom = presetSelect.value === 'CUSTOM';
                customControls.style.display = isCustom ? 'block' : 'none';
            };
            
            presetSelect.addEventListener('change', toggleCustomControls);
            toggleCustomControls(); // Initial state
        }
    }

    function applySettings(settings, options = {}) {
        const normalized = normalizeSettings(settings);
        gameSettings = normalized;
        global.gameSettings = normalized;

        if (options.persist !== false) {
            saveSettings(normalized);
        }

        if (options.updateForm !== false) {
            updateSettingsForm(normalized);
        }

        const tracker = document.getElementById('performanceTracker');
        if (tracker) {
            tracker.style.display = normalized.showFPS ? 'block' : 'none';
        }

        // Apply audio settings
        if (global.audioManager) {
            if (typeof global.audioManager.setBackgroundVolume === 'function') {
                global.audioManager.setBackgroundVolume(normalized.musicVolume);
            }
            if (typeof global.audioManager.setSfxVolume === 'function') {
                global.audioManager.setSfxVolume(normalized.sfxVolume);
            }
        }
        
        // Apply graphics settings
        if (global.GraphicsSettings) {
            if (typeof global.GraphicsSettings.applyPreset === 'function') {
                global.GraphicsSettings.applyPreset(normalized);
            }
        }
        
        // Apply performance monitoring settings
        if (global.PerformanceMonitor) {
            if (typeof global.PerformanceMonitor.enableAutoOptimize === 'function') {
                global.PerformanceMonitor.enableAutoOptimize(normalized.autoOptimize);
            }
        }
    }

    function showSettingsPanel() {
        const elements = getSettingsFormElements();
        if (!elements.panel || !elements.home) return;
        elements.home.classList.add('hidden');
        elements.panel.classList.remove('hidden');
        updateSettingsForm(gameSettings || DEFAULT_SETTINGS);
    }

    function hideSettingsPanel() {
        const elements = getSettingsFormElements();
        if (!elements.panel || !elements.home) return;
        elements.panel.classList.add('hidden');
        elements.home.classList.remove('hidden');
    }

    function openSettings() {
        showSettingsPanel();
    }

    function closeSettings(revertToSaved = false) {
        if (revertToSaved) {
            updateSettingsForm(gameSettings || DEFAULT_SETTINGS);
        }
        hideSettingsPanel();
        
        // If game is paused, return to pause menu instead of main menu
        const menu = document.getElementById('menu');
        if (menu && menu.style.display === 'block' && !gameStarted) {
            const menuHome = document.getElementById('menuHome');
            const pauseMenu = document.getElementById('pauseMenu');
            
            // If we're in a paused game state, show pause menu
            if (menuHome && menuHome.classList.contains('hidden')) {
                if (pauseMenu) pauseMenu.classList.remove('hidden');
            }
        }
    }

    function applySettingsAndClose() {
        const newSettings = getSettingsFromForm();
        applySettings(newSettings);
        hideSettingsPanel();
    }
    function setupControls() {
        attachSettingsInputListeners();
        updateSettingsForm(gameSettings || DEFAULT_SETTINGS);

        window.addEventListener('keydown', event => {
            if (levelCompleteActive) {
                if (event.code === 'Space') {
                    event.preventDefault();
                    nextLevel();
                } else if (event.code === 'Escape') {
                    event.preventDefault();
                    backToMenu();
                }
                return;
            }

            keys[event.code] = true;

            switch (event.code) {
                case 'Escape':
                    togglePause();
                    break;
                case 'KeyC':
                    switchCamera();
                    break;
                case 'KeyR':
                    if (gameStarted) restartLevel();
                    break;
            }
        });

        window.addEventListener('keyup', event => {
            keys[event.code] = false;
        });

        let isPointerLocked = false;

        renderer.domElement.addEventListener('click', () => {
            if (gameStarted && !isPointerLocked) {
                renderer.domElement.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            isPointerLocked = document.pointerLockElement === renderer.domElement;
        });

        document.addEventListener('mousemove', event => {
            if (isPointerLocked && gameStarted) {
                const settings = gameSettings || DEFAULT_SETTINGS;
                const sensitivity = settings.mouseSensitivity || DEFAULT_SETTINGS.mouseSensitivity;
                const invertY = !!settings.invertY;

                cameraYaw += event.movementX * sensitivity;
                const verticalDelta = event.movementY * sensitivity * (invertY ? 1 : -1);
                cameraPitch += verticalDelta;

                if (cameraYaw > Math.PI) cameraYaw -= Math.PI * 2;
                if (cameraYaw < -Math.PI) cameraYaw += Math.PI * 2;

                const maxPitch = Math.PI / 2 - 0.1; // clamp to avoid flipping
                cameraPitch = Math.max(-maxPitch, Math.min(maxPitch, cameraPitch));
            }
        });

        window.addEventListener('resize', () => {
            if (typeof window.handleRendererResize === 'function') {
                window.handleRendererResize();
                return;
            }

            if (camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }

    function switchCamera() {
        cameraMode = (cameraMode + 1) % 2;
        const modes = ['Third-Person', 'First-Person'];
        console.log('Camera switched to:', modes[cameraMode]);
    }

    function togglePause() {
        if (gameStarted) {
            showPauseMenu();
        } else {
            resumeGame();
        }
    }

    function showPauseMenu() {
        const menu = document.getElementById('menu');
        const menuHome = document.getElementById('menuHome');
        const pauseMenu = document.getElementById('pauseMenu');
        const settingsMenu = document.getElementById('settingsMenu');
        
        if (!menu || !pauseMenu) return;

        // Hide other menu panels
        closeSettings(true);
        if (menuHome) menuHome.classList.add('hidden');
        if (settingsMenu) settingsMenu.classList.add('hidden');
        
        // Show pause menu
        pauseMenu.classList.remove('hidden');
        menu.style.display = 'block';
        
        // Pause game
        gameStarted = false;
        
        // Pause audio
        if (window.audioManager && typeof window.audioManager.pauseBackground === 'function') {
            try {
                window.audioManager.pauseBackground();
            } catch (err) {
                console.warn('[Audio] Failed to pause background music', err);
            }
        }
        
        console.log('Game paused');
    }

    function resumeGame() {
        const menu = document.getElementById('menu');
        const pauseMenu = document.getElementById('pauseMenu');
        
        if (!menu) return;

        // Hide pause menu
        if (pauseMenu) pauseMenu.classList.add('hidden');
        menu.style.display = 'none';
        
        // Resume game
        gameStarted = true;
        
        // Resume audio
        if (window.audioManager && typeof window.audioManager.resumeBackground === 'function') {
            try {
                window.audioManager.resumeBackground();
            } catch (err) {
                console.warn('[Audio] Failed to resume background music', err);
            }
        }
        
        console.log('Game resumed');
    }

    function showPauseSettings() {
        const pauseMenu = document.getElementById('pauseMenu');
        const settingsMenu = document.getElementById('settingsMenu');
        
        if (pauseMenu) pauseMenu.classList.add('hidden');
        if (settingsMenu) settingsMenu.classList.remove('hidden');
    }

    function backToMainMenu() {
        const menu = document.getElementById('menu');
        const menuHome = document.getElementById('menuHome');
        const pauseMenu = document.getElementById('pauseMenu');
        const settingsMenu = document.getElementById('settingsMenu');
        
        // Reset game state
        gameStarted = false;
        
        // Reset menu visibility
        if (pauseMenu) pauseMenu.classList.add('hidden');
        if (settingsMenu) settingsMenu.classList.add('hidden');
        if (menuHome) menuHome.classList.remove('hidden');
        
        // Show main menu
        if (menu) menu.style.display = 'block';
        
        // Hide game UI
        const ui = document.getElementById('ui');
        const controls = document.getElementById('controls');
        if (ui) ui.style.display = 'none';
        if (controls) controls.style.display = 'none';
        
        // Stop audio
        if (window.audioManager && typeof window.audioManager.pauseBackground === 'function') {
            try {
                window.audioManager.pauseBackground();
            } catch (err) {
                console.warn('[Audio] Failed to pause background music', err);
            }
        }
        
        // Reset camera controls
        exitPointerLock();
        
        console.log('Returned to main menu');
    }

    function restartLevel() {
        resumeGame();
        if (typeof window.restartGame === 'function') {
            window.restartGame();
        }
    }

    function showGameInfo() {
        closeSettings(true);
        alert(`💡 Crystal Collector 3D - Enhanced Features:

🎮 GAME FEATURES:
• Immersive 3D space environment with asteroids
• Dynamic story progression with mission objectives
• Multiple camera perspectives (3rd person, 1st person)
• Advanced particle effects and cosmic atmosphere
• 3D spatial audio (use headphones for best experience)

⚙️ SETTINGS EXPLAINED:

🔊 AUDIO SETTINGS:
• Music Volume: Background ambient music
• Sound Effects: Game action sounds (jumps, collisions, collections)

🎮 CONTROL SETTINGS:
• Mouse Sensitivity: How fast camera moves with mouse
• Invert Y-Axis: Flight-style controls (up = down, down = up)
• Performance Info: Shows FPS and technical details

📺 GRAPHICS SETTINGS:
• Quality Preset: Overall visual quality vs performance
  - Low: Best performance, simpler visuals
  - Medium: Balanced quality and performance
  - High: Better visuals, needs good graphics card
  - Ultra: Maximum quality, requires powerful hardware
• Dynamic Shadows: Realistic moving shadows (impacts performance)
• Visual Effects: Enhanced lighting and atmospheric effects
• Auto-Optimize: Automatically reduces quality if game runs slowly

🎯 TIP: Start with Medium quality and adjust based on performance!`);
    }

    function showInstructions() {
        closeSettings(true);
        alert(`🎮 Crystal Collector 3D - How to Play:

🎯 OBJECTIVE:
Navigate through space and collect all power cores to restore your ship!

🎮 CONTROLS:
• WASD - Move your character
• SPACE - Jump & Double Jump (limited by cooldown)
• Mouse - Look around (click to lock cursor)
• C - Switch camera views (3rd person, 1st person)
• ESC - Pause/Resume game
• R - Restart current level

💎 GAMEPLAY:
• Collect glowing crystals scattered across floating platforms
• Follow mission objectives shown in the top-left corner
• Watch the story unfold as you progress through levels
• Experience immersive 3D audio with headphones
• You have 3 lives - don't fall off platforms!

🚀 STORY:
Your mining ship was damaged by a solar storm. The power cores are scattered across an asteroid field. Collect them to restore ship systems and return home safely!

Good luck, commander!`);
    }

    function showCredits() {
        closeSettings(true);
        alert(`🎮 Crystal Collector 3D
        
Created for COMS3006A/3025A Computer Graphics & Visualisation Project
University of the Witwatersrand, Johannesburg

🛠️ TECHNICAL FEATURES:
• Three.js WebGL 3D Graphics
• Advanced Lighting & Shadows
• Particle Effects System
• Multi-Camera System
• 3D Physics Simulation
• Procedural Skybox Shader
• Real-time UI & HUD

🎨 VISUAL EFFECTS:
• Dynamic particle systems
• Glow effects and transparency
• Animated floating debris
• Crystal rotation animations
• Gradient skybox
• Platform edge lighting

🎵 INNOVATION:
• Multiple camera perspectives
• Advanced collision detection
• Smooth player movement
• Time-based gameplay
• Progressive difficulty
• Score multiplier system

Made with ❤️ using Three.js`);
    }

    function backToMenu() {
        gameStarted = false;
        if (gameTimer) clearInterval(gameTimer);

        closeSettings(true);

        if (typeof hideLoadingScreen === 'function') {
            hideLoadingScreen(0);
        }

        if (window.audioManager && typeof window.audioManager.pauseBackground === 'function') {
            try {
                window.audioManager.pauseBackground();
            } catch (err) {
                console.warn('[Audio] Failed to pause background music', err);
            }
        }

        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('levelComplete').style.display = 'none';
        document.getElementById('ui').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        levelCompleteActive = false;
        if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock();
        }

        currentLevel = 1;
        lives = 3;
        score = 0;
        collectedCrystals = 0;
        cameraYaw = 0;
        cameraPitch = 0;
        jumpCooldown = 0;
        isJumping = false;
        jumpsRemaining = maxJumps;

        clearLevel();
    }

    gameSettings = loadSettings();
    applySettings(gameSettings, { persist: false, updateForm: true });
    attachSettingsInputListeners();
    updateSettingsForm(gameSettings);

    global.setupControls = setupControls;
    global.switchCamera = switchCamera;
    global.togglePause = togglePause;
    global.showInstructions = showInstructions;
    global.showGameInfo = showGameInfo;
    global.showCredits = showCredits;
    global.backToMenu = backToMenu;
    global.openSettings = openSettings;
    global.closeSettings = closeSettings;
    global.applySettingsAndClose = applySettingsAndClose;
    
    // New pause menu functions
    global.resumeGame = resumeGame;
    global.showPauseSettings = showPauseSettings;
    global.backToMainMenu = backToMainMenu;
    global.restartLevel = restartLevel;
})(window);
