(function(global) {
    const SETTINGS_STORAGE_KEY = 'cc3d-settings-v1';
    const DEFAULT_SETTINGS = {
        musicVolume: 0.25,
        sfxVolume: 0.7,
        mouseSensitivity: 0.002,
        invertY: false,
        showFPS: true
    };

    let gameSettings = null;
    let settingsListenersAttached = false;

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalizeSettings(rawSettings) {
        const normalized = { ...DEFAULT_SETTINGS };
        if (!rawSettings || typeof rawSettings !== 'object') {
            return normalized;
        }

        if (rawSettings.musicVolume !== undefined) {
            normalized.musicVolume = clamp(Number(rawSettings.musicVolume) || 0, 0, 1);
        }
        if (rawSettings.sfxVolume !== undefined) {
            normalized.sfxVolume = clamp(Number(rawSettings.sfxVolume) || 0, 0, 1);
        }
        if (rawSettings.mouseSensitivity !== undefined) {
            normalized.mouseSensitivity = clamp(Number(rawSettings.mouseSensitivity) || 0, 0.001, 0.02);
        }
        if (rawSettings.invertY !== undefined) {
            normalized.invertY = !!rawSettings.invertY;
        }
        if (rawSettings.showFPS !== undefined) {
            normalized.showFPS = !!rawSettings.showFPS;
        }

        return normalized;
    }

    function loadSettings() {
        try {
            const stored = global.localStorage ? global.localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
            if (!stored) {
                return { ...DEFAULT_SETTINGS };
            }
            const parsed = JSON.parse(stored);
            return normalizeSettings(parsed);
        } catch (err) {
            console.warn('[Settings] Failed to load settings, using defaults.', err);
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings(settings) {
        try {
            if (!global.localStorage) return;
            global.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (err) {
            console.warn('[Settings] Failed to save settings.', err);
        }
    }

    function getSettingsFormElements() {
        return {
            panel: document.getElementById('settingsMenu'),
            home: document.getElementById('menuHome'),
            musicSlider: document.getElementById('musicVolume'),
            musicValue: document.getElementById('musicVolumeValue'),
            sfxSlider: document.getElementById('sfxVolume'),
            sfxValue: document.getElementById('sfxVolumeValue'),
            sensitivitySlider: document.getElementById('mouseSensitivity'),
            sensitivityValue: document.getElementById('mouseSensitivityValue'),
            invertCheckbox: document.getElementById('invertYAxis'),
            fpsCheckbox: document.getElementById('showFps')
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
            elements.sensitivitySlider.value = Math.round(settings.mouseSensitivity * 1000);
        }
        if (elements.sensitivityValue) {
            elements.sensitivityValue.textContent = settings.mouseSensitivity.toFixed(3);
        }

        if (elements.invertCheckbox) {
            elements.invertCheckbox.checked = !!settings.invertY;
        }
        if (elements.fpsCheckbox) {
            elements.fpsCheckbox.checked = !!settings.showFPS;
        }
    }

    function getSettingsFromForm() {
        const elements = getSettingsFormElements();
        const rawSensitivity = elements.sensitivitySlider ? Number(elements.sensitivitySlider.value) : DEFAULT_SETTINGS.mouseSensitivity * 1000;

        return normalizeSettings({
            musicVolume: elements.musicSlider ? Number(elements.musicSlider.value) / 100 : DEFAULT_SETTINGS.musicVolume,
            sfxVolume: elements.sfxSlider ? Number(elements.sfxSlider.value) / 100 : DEFAULT_SETTINGS.sfxVolume,
            mouseSensitivity: clamp(rawSensitivity, 1, 20) / 1000,
            invertY: elements.invertCheckbox ? elements.invertCheckbox.checked : DEFAULT_SETTINGS.invertY,
            showFPS: elements.fpsCheckbox ? elements.fpsCheckbox.checked : DEFAULT_SETTINGS.showFPS
        });
    }

    function attachSettingsInputListeners() {
        if (settingsListenersAttached) return;
        const elements = getSettingsFormElements();
        if (!elements.panel) return;

        const updateLabels = () => {
            if (elements.musicSlider && elements.musicValue) {
                elements.musicValue.textContent = `${Math.round(Number(elements.musicSlider.value))}%`;
            }
            if (elements.sfxSlider && elements.sfxValue) {
                elements.sfxValue.textContent = `${Math.round(Number(elements.sfxSlider.value))}%`;
            }
            if (elements.sensitivitySlider && elements.sensitivityValue) {
                elements.sensitivityValue.textContent = (Number(elements.sensitivitySlider.value) / 1000).toFixed(3);
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

        if (global.audioManager) {
            if (typeof global.audioManager.setBackgroundVolume === 'function') {
                global.audioManager.setBackgroundVolume(normalized.musicVolume);
            }
            if (typeof global.audioManager.setSfxVolume === 'function') {
                global.audioManager.setSfxVolume(normalized.sfxVolume);
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

                const maxPitch = Math.PI / 2 - 0.1;
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
        const menu = document.getElementById('menu');
        if (!menu) return;

        if (gameStarted) {
            closeSettings(true);
            menu.style.display = 'block';
            gameStarted = false;
            if (window.audioManager && typeof window.audioManager.pauseBackground === 'function') {
                try {
                    window.audioManager.pauseBackground();
                } catch (err) {
                    console.warn('[Audio] Failed to pause background music', err);
                }
            }
        } else if (menu.style.display === 'block') {
            closeSettings(true);
            menu.style.display = 'none';
            gameStarted = true;
            if (window.audioManager && typeof window.audioManager.resumeBackground === 'function') {
                try {
                    window.audioManager.resumeBackground();
                } catch (err) {
                    console.warn('[Audio] Failed to resume background music', err);
                }
            }
        }
    }

    function showInstructions() {
        closeSettings(true);
        alert(`🎮 Crystal Collector 3D - How to Play:

🎯 OBJECTIVE:
Collect all crystals in each level before time runs out!

🎮 CONTROLS:
• WASD - Move your character
• SPACE - Jump & Double Jump (limited by cooldown)
• Mouse - Look around (click to lock cursor)
• C - Switch camera views (3rd person, 1st person, top-down)
• ESC - Pause/Resume game
• R - Restart current level

💎 GAMEPLAY:
• Navigate floating platforms in 3D space
• Collect glowing crystals to progress
• Each level has more crystals and longer time limits
• You have 3 lives - don't fall off platforms!
• Bonus points awarded for remaining time

🏆 SCORING:
• 100 × Level points per crystal
• 10 points per remaining second
• Complete all 3 levels to win!

Good luck, crystal collector!`);
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
    global.showCredits = showCredits;
    global.backToMenu = backToMenu;
    global.openSettings = openSettings;
    global.closeSettings = closeSettings;
    global.applySettingsAndClose = applySettingsAndClose;
})(window);
