/**
 * GRAPHICS SETTINGS MANAGER
 * Advanced rendering quality controls for performance optimization
 * Provides multiple quality presets and dynamic graphics adjustments
 */

(function(global) {
    // Graphics quality presets with comprehensive settings
    const GRAPHICS_PRESETS = {
        LOW: {
            shadowMapSize: 1024,
            antialias: false,
            shadowType: THREE.BasicShadowMap,
            particleCount: 50,
            anisotropy: 1,
            pixelRatio: 1,
            postProcessing: false,
            dynamicShadows: false
        },
        MEDIUM: {
            shadowMapSize: 2048,
            antialias: true,
            shadowType: THREE.PCFShadowMap,
            particleCount: 100,
            anisotropy: 4,
            pixelRatio: Math.min(window.devicePixelRatio, 2),
            postProcessing: true,
            dynamicShadows: true
        },
        HIGH: {
            shadowMapSize: 4096,
            antialias: true,
            shadowType: THREE.PCFShadowMap,
            particleCount: 150,
            anisotropy: 8,
            pixelRatio: window.devicePixelRatio,
            postProcessing: true,
            dynamicShadows: true
        },
        ULTRA: {
            shadowMapSize: 8192,
            antialias: true,
            shadowType: THREE.PCFSoftShadowMap,
            particleCount: 200,
            anisotropy: 16,
            pixelRatio: window.devicePixelRatio,
            postProcessing: true,
            dynamicShadows: true
        }
    };

    let currentGraphicsSettings = GRAPHICS_PRESETS.MEDIUM;
    let currentPresetName = 'MEDIUM';
    let customSettings = null; // Store custom settings separately

    /**
     * Apply graphics preset or custom settings to the renderer and scene
     * @param {string|Object} preset - Preset name or settings object with graphicsPreset, dynamicShadows, postProcessing
     */
    function applyGraphicsSettings(preset) {
        let settingsToApply;
        
        // Handle both preset strings and settings objects
        if (typeof preset === 'object') {
            const presetName = preset.graphicsPreset || 'MEDIUM';
            
            if (presetName === 'CUSTOM') {
                // Use custom settings - merge preset base with custom overrides
                customSettings = {
                    ...GRAPHICS_PRESETS.MEDIUM, // Base on MEDIUM
                    dynamicShadows: preset.dynamicShadows !== undefined ? preset.dynamicShadows : true,
                    postProcessing: preset.postProcessing !== undefined ? preset.postProcessing : true
                };
                settingsToApply = customSettings;
                currentPresetName = 'CUSTOM';
            } else if (GRAPHICS_PRESETS[presetName]) {
                settingsToApply = GRAPHICS_PRESETS[presetName];
                currentPresetName = presetName;
                customSettings = null;
            } else {
                console.warn(`Graphics preset '${presetName}' not found, using MEDIUM`);
                settingsToApply = GRAPHICS_PRESETS.MEDIUM;
                currentPresetName = 'MEDIUM';
                customSettings = null;
            }
        } else if (typeof preset === 'string') {
            if (!GRAPHICS_PRESETS[preset]) {
                console.warn(`Graphics preset '${preset}' not found, using MEDIUM`);
                preset = 'MEDIUM';
            }
            settingsToApply = GRAPHICS_PRESETS[preset];
            currentPresetName = preset;
            customSettings = null;
        } else {
            settingsToApply = GRAPHICS_PRESETS.MEDIUM;
            currentPresetName = 'MEDIUM';
            customSettings = null;
        }

        currentGraphicsSettings = settingsToApply;
        
        if (global.renderer) {
            // Apply renderer settings
            global.renderer.setPixelRatio(currentGraphicsSettings.pixelRatio);
            
            if (global.renderer.shadowMap) {
                global.renderer.shadowMap.type = currentGraphicsSettings.shadowType;
                global.renderer.shadowMap.enabled = currentGraphicsSettings.dynamicShadows;
            }
            
            // Update shadow map size for all lights
            updateShadowMaps();
            
            // Update particle systems
            updateParticleCount(currentGraphicsSettings.particleCount);
            
            // Update texture anisotropy
            updateTextureAnisotropy(currentGraphicsSettings.anisotropy);
            
            console.log(`Graphics preset applied: ${preset}`);
            
            // Store setting in localStorage
            localStorage.setItem('graphicsPreset', preset);
        }
    }

    /**
     * Update shadow map settings for all lights in the scene
     */
    function updateShadowMaps() {
        if (!global.scene) return;

        global.scene.traverse((child) => {
            if (child.isLight && child.shadow) {
                child.shadow.mapSize.setScalar(currentGraphicsSettings.shadowMapSize);
                child.shadow.needsUpdate = true;
                child.castShadow = currentGraphicsSettings.dynamicShadows;
            }
        });

        // Update specific lights if they exist
        if (global.directionalLight && global.directionalLight.shadow) {
            global.directionalLight.shadow.mapSize.setScalar(currentGraphicsSettings.shadowMapSize);
            global.directionalLight.shadow.needsUpdate = true;
            global.directionalLight.castShadow = currentGraphicsSettings.dynamicShadows;
        }
    }

    /**
     * Adjust particle count dynamically
     */
    function updateParticleCount(count) {
        if (global.particles && global.particles.length > 0) {
            const currentCount = global.particles.length;
            if (count < currentCount) {
                // Remove excess particles
                for (let i = currentCount - 1; i >= count; i--) {
                    if (global.scene && global.particles[i]) {
                        global.scene.remove(global.particles[i]);
                    }
                }
                global.particles.splice(count);
            } else if (count > currentCount && global.createParticle) {
                // Add more particles if function exists
                for (let i = currentCount; i < count; i++) {
                    const particle = global.createParticle();
                    if (particle) {
                        global.particles.push(particle);
                        global.scene.add(particle);
                    }
                }
            }
        }
    }

    /**
     * Update texture anisotropy for better quality at distance
     */
    function updateTextureAnisotropy(anisotropy) {
        if (!global.scene) return;

        global.scene.traverse((child) => {
            if (child.material) {
                if (child.material.map) {
                    child.material.map.anisotropy = Math.min(anisotropy, global.renderer.capabilities.getMaxAnisotropy());
                    child.material.map.needsUpdate = true;
                }
                if (child.material.normalMap) {
                    child.material.normalMap.anisotropy = Math.min(anisotropy, global.renderer.capabilities.getMaxAnisotropy());
                    child.material.normalMap.needsUpdate = true;
                }
            }
        });
    }

    /**
     * Toggle post-processing effects
     */
    function togglePostProcessing(enabled) {
        currentGraphicsSettings.postProcessing = enabled;
        console.log(`Post-processing ${enabled ? 'enabled' : 'disabled'}`);
        
        // Store setting
        localStorage.setItem('postProcessing', enabled.toString());
        
        // This can be expanded with actual post-processing pipeline
        if (global.composer) {
            global.composer.enabled = enabled;
        }
    }

    /**
     * Toggle dynamic shadows
     */
    function toggleDynamicShadows(enabled) {
        currentGraphicsSettings.dynamicShadows = enabled;
        
        if (global.renderer && global.renderer.shadowMap) {
            global.renderer.shadowMap.enabled = enabled;
        }
        
        // Update all shadow casting objects
        updateShadowMaps();
        
        console.log(`Dynamic shadows ${enabled ? 'enabled' : 'disabled'}`);
        
        // Store setting
        localStorage.setItem('dynamicShadows', enabled.toString());
    }

    /**
     * Load saved graphics settings
     */
    function loadSavedSettings() {
        const savedPreset = localStorage.getItem('graphicsPreset') || 'MEDIUM';
        const savedPostProcessing = localStorage.getItem('postProcessing') === 'true';
        const savedDynamicShadows = localStorage.getItem('dynamicShadows') !== 'false'; // Default true
        
        applyGraphicsSettings(savedPreset);
        
        if (currentGraphicsSettings.postProcessing !== savedPostProcessing) {
            togglePostProcessing(savedPostProcessing);
        }
        
        if (currentGraphicsSettings.dynamicShadows !== savedDynamicShadows) {
            toggleDynamicShadows(savedDynamicShadows);
        }
        
        // Update UI elements
        updateGraphicsUI();
    }

    /**
     * Update UI elements to reflect current settings
     */
    function updateGraphicsUI() {
        const graphicsSelect = document.getElementById('graphicsPreset');
        const postProcessingCheck = document.getElementById('postProcessing');
        const dynamicShadowsCheck = document.getElementById('dynamicShadows');
        
        if (graphicsSelect) {
            graphicsSelect.value = currentPresetName;
        }
        
        if (postProcessingCheck) {
            postProcessingCheck.checked = currentGraphicsSettings.postProcessing;
        }
        
        if (dynamicShadowsCheck) {
            dynamicShadowsCheck.checked = currentGraphicsSettings.dynamicShadows;
        }
    }

    /**
     * Initialize graphics settings system
     */
    function initGraphicsSettings() {
        // Load saved settings
        loadSavedSettings();
        
        // Bind UI events
        const graphicsSelect = document.getElementById('graphicsPreset');
        if (graphicsSelect) {
            graphicsSelect.addEventListener('change', (e) => {
                applyGraphicsSettings(e.target.value);
            });
        }
        
        const postProcessingCheck = document.getElementById('postProcessing');
        if (postProcessingCheck) {
            postProcessingCheck.addEventListener('change', (e) => {
                togglePostProcessing(e.target.checked);
            });
        }
        
        const dynamicShadowsCheck = document.getElementById('dynamicShadows');
        if (dynamicShadowsCheck) {
            dynamicShadowsCheck.addEventListener('change', (e) => {
                toggleDynamicShadows(e.target.checked);
            });
        }
        
        console.log('Graphics settings system initialized');
    }

    // Export functions to global scope
    global.GraphicsSettings = {
        init: initGraphicsSettings,
        applyPreset: applyGraphicsSettings,
        togglePostProcessing: togglePostProcessing,
        toggleDynamicShadows: toggleDynamicShadows,
        getCurrentSettings: () => currentGraphicsSettings,
        getCurrentPreset: () => currentPresetName,
        presets: GRAPHICS_PRESETS,
        loadSaved: loadSavedSettings
    };

})(window);