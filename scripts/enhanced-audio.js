/**
 * ENHANCED AUDIO SYSTEM
 * 3D spatial audio and dynamic music system for immersive gameplay
 * Provides positional audio, dynamic music intensity, and environmental sounds
 */

(function(global) {
    
    let audioContext = null;
    let spatialSounds = new Map();
    let environmentalSounds = [];
    let masterGainNode = null;
    let musicGainNode = null;
    let sfxGainNode = null;
    let isInitialized = false;
    
    // Dynamic music system
    let currentMusicIntensity = 0;
    let targetMusicIntensity = 0;
    let musicLayers = {};
    let ambientSounds = {};

    /**
     * Initialize spatial audio system
     */
    function initSpatialAudio() {
        try {
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain nodes for volume control
            masterGainNode = audioContext.createGain();
            musicGainNode = audioContext.createGain();
            sfxGainNode = audioContext.createGain();
            
            // Connect gain nodes
            musicGainNode.connect(masterGainNode);
            sfxGainNode.connect(masterGainNode);
            masterGainNode.connect(audioContext.destination);
            
            // Set initial volumes
            masterGainNode.gain.value = 0.7;
            musicGainNode.gain.value = 0.5;
            sfxGainNode.gain.value = 0.8;
            
            console.log('Spatial audio system initialized');
            isInitialized = true;
            return true;
        } catch (e) {
            console.warn('Spatial audio not supported:', e);
            return false;
        }
    }

    /**
     * Create a 3D positioned audio source
     */
    function createSpatialSound(audioElement, position, options = {}) {
        if (!audioContext || !isInitialized) return null;
        
        try {
            const source = audioContext.createMediaElementSource(audioElement);
            const panner = audioContext.createPanner();
            const gainNode = audioContext.createGain();
            
            // Configure 3D panner with realistic settings
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = options.refDistance || 5;
            panner.maxDistance = options.maxDistance || 100;
            panner.rolloffFactor = options.rolloffFactor || 1;
            panner.coneInnerAngle = options.coneInnerAngle || 360;
            panner.coneOuterAngle = options.coneOuterAngle || 360;
            panner.coneOuterGain = options.coneOuterGain || 0;
            
            // Set initial position
            if (position) {
                panner.positionX.setValueAtTime(position.x, audioContext.currentTime);
                panner.positionY.setValueAtTime(position.y, audioContext.currentTime);
                panner.positionZ.setValueAtTime(position.z, audioContext.currentTime);
            }
            
            // Set volume
            gainNode.gain.value = options.volume || 1.0;
            
            // Connect audio graph
            source.connect(gainNode);
            gainNode.connect(panner);
            
            // Connect to appropriate output
            if (options.type === 'music') {
                panner.connect(musicGainNode);
            } else {
                panner.connect(sfxGainNode);
            }
            
            const spatialSound = {
                source: source,
                panner: panner,
                gainNode: gainNode,
                element: audioElement,
                position: position ? position.clone() : new THREE.Vector3(),
                options: options
            };
            
            return spatialSound;
        } catch (e) {
            console.warn('Failed to create spatial sound:', e);
            return null;
        }
    }

    /**
     * Update listener position and orientation based on camera
     */
    function updateListenerPosition(camera) {
        if (!audioContext || !audioContext.listener || !isInitialized) return;
        
        const listener = audioContext.listener;
        const position = camera.position;
        
        // Calculate forward and up vectors
        const forward = new THREE.Vector3(0, 0, -1);
        const up = new THREE.Vector3(0, 1, 0);
        
        forward.applyQuaternion(camera.quaternion);
        up.applyQuaternion(camera.quaternion);
        
        // Update listener position and orientation
        if (listener.positionX) {
            // Use the newer AudioListener API if available
            listener.positionX.setValueAtTime(position.x, audioContext.currentTime);
            listener.positionY.setValueAtTime(position.y, audioContext.currentTime);
            listener.positionZ.setValueAtTime(position.z, audioContext.currentTime);
            
            listener.forwardX.setValueAtTime(forward.x, audioContext.currentTime);
            listener.forwardY.setValueAtTime(forward.y, audioContext.currentTime);
            listener.forwardZ.setValueAtTime(forward.z, audioContext.currentTime);
            
            listener.upX.setValueAtTime(up.x, audioContext.currentTime);
            listener.upY.setValueAtTime(up.y, audioContext.currentTime);
            listener.upZ.setValueAtTime(up.z, audioContext.currentTime);
        } else {
            // Fallback for older API
            listener.setPosition(position.x, position.y, position.z);
            listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
        }
    }

    /**
     * Update spatial sound position
     */
    function updateSpatialSoundPosition(spatialSound, newPosition) {
        if (!spatialSound || !spatialSound.panner || !audioContext) return;
        
        spatialSound.position.copy(newPosition);
        
        spatialSound.panner.positionX.setValueAtTime(newPosition.x, audioContext.currentTime);
        spatialSound.panner.positionY.setValueAtTime(newPosition.y, audioContext.currentTime);
        spatialSound.panner.positionZ.setValueAtTime(newPosition.z, audioContext.currentTime);
    }

    /**
     * Dynamic music intensity system
     */
    function updateMusicIntensity(intensity) {
        targetMusicIntensity = Math.max(0, Math.min(1, intensity));
    }

    /**
     * Smoothly interpolate music intensity changes
     */
    function updateMusicSystem() {
        if (!isInitialized) return;
        
        // Smooth interpolation of music intensity
        const delta = targetMusicIntensity - currentMusicIntensity;
        currentMusicIntensity += delta * 0.02; // Adjust speed as needed
        
        // Apply music intensity to volume and effects
        if (musicGainNode && global.gameSettings) {
            const baseVolume = global.gameSettings.musicVolume || 0.5;
            const intensityMultiplier = 0.3 + currentMusicIntensity * 0.7;
            musicGainNode.gain.setValueAtTime(
                baseVolume * intensityMultiplier, 
                audioContext.currentTime
            );
        }
        
        // Add subtle filter effects based on intensity
        // This can be expanded with actual filter nodes
    }

    /**
     * Create ambient environmental sounds
     */
    function createAmbientSounds() {
        // Create subtle space ambience
        const ambientTypes = [
            {
                name: 'spaceWind',
                volume: 0.2,
                loop: true,
                position: null // Global sound
            },
            {
                name: 'distantHum',
                volume: 0.15,
                loop: true,
                position: null
            }
        ];
        
        ambientTypes.forEach(ambientType => {
            // In a real implementation, you would load actual audio files
            // For now, this sets up the structure
            ambientSounds[ambientType.name] = {
                volume: ambientType.volume,
                loop: ambientType.loop,
                position: ambientType.position,
                isPlaying: false
            };
        });
    }

    /**
     * Play environmental sound at specific position
     */
    function playEnvironmentalSound(soundName, position, options = {}) {
        // In a real implementation, this would trigger actual audio playback
        console.log(`Playing environmental sound: ${soundName} at`, position);
        
        // Example: Crystal collection sound
        if (soundName === 'crystalCollect') {
            // Trigger sparkle sound effect with spatial positioning
            triggerPositionalEffect('sparkle', position, {
                volume: 0.7,
                pitch: 1.0 + Math.random() * 0.4,
                duration: 0.5
            });
        }
        
        // Example: Collision sound
        if (soundName === 'collision') {
            triggerPositionalEffect('impact', position, {
                volume: 0.5,
                pitch: 0.8 + Math.random() * 0.4,
                duration: 0.3
            });
        }
    }

    /**
     * Trigger positional sound effect
     */
    function triggerPositionalEffect(effectName, position, options = {}) {
        if (!isInitialized || !position) return;
        
        // Create short-lived positional audio effect
        // In a real implementation, this would use Web Audio API oscillators
        // or pre-loaded audio buffers for immediate playback
        
        try {
            // Create oscillator for procedural sound effects
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const panner = audioContext.createPanner();
            
            // Configure panner
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 5;
            panner.maxDistance = 50;
            panner.rolloffFactor = 2;
            
            panner.positionX.setValueAtTime(position.x, audioContext.currentTime);
            panner.positionY.setValueAtTime(position.y, audioContext.currentTime);
            panner.positionZ.setValueAtTime(position.z, audioContext.currentTime);
            
            // Configure sound based on effect type
            let frequency = 440;
            let waveType = 'sine';
            
            switch(effectName) {
                case 'sparkle':
                    frequency = 800 + Math.random() * 400;
                    waveType = 'square';
                    break;
                case 'impact':
                    frequency = 100 + Math.random() * 200;
                    waveType = 'sawtooth';
                    break;
                default:
                    frequency = 440;
            }
            
            oscillator.type = waveType;
            oscillator.frequency.setValueAtTime(
                frequency * (options.pitch || 1.0), 
                audioContext.currentTime
            );
            
            // Configure envelope
            const duration = options.duration || 0.3;
            const volume = options.volume || 0.5;
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            
            // Connect and play
            oscillator.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(sfxGainNode);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
            
        } catch (e) {
            console.warn('Failed to create positional effect:', e);
        }
    }

    /**
     * Set master volume
     */
    function setMasterVolume(volume) {
        if (masterGainNode) {
            masterGainNode.gain.setValueAtTime(
                Math.max(0, Math.min(1, volume)), 
                audioContext.currentTime
            );
        }
    }

    /**
     * Set music volume
     */
    function setMusicVolume(volume) {
        if (musicGainNode) {
            musicGainNode.gain.setValueAtTime(
                Math.max(0, Math.min(1, volume)), 
                audioContext.currentTime
            );
        }
    }

    /**
     * Set sound effects volume
     */
    function setSFXVolume(volume) {
        if (sfxGainNode) {
            sfxGainNode.gain.setValueAtTime(
                Math.max(0, Math.min(1, volume)), 
                audioContext.currentTime
            );
        }
    }

    /**
     * Resume audio context if suspended (required for some browsers)
     */
    function resumeAudioContext() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('Audio context resumed');
            });
        }
    }

    /**
     * Initialize enhanced audio system
     */
    function initEnhancedAudio() {
        console.log('Initializing Enhanced Audio System...');
        
        const success = initSpatialAudio();
        if (success) {
            createAmbientSounds();
            
            // Add click handler to resume audio context
            document.addEventListener('click', resumeAudioContext, { once: true });
            document.addEventListener('keydown', resumeAudioContext, { once: true });
            
            console.log('Enhanced Audio System initialized');
        }
        
        return success;
    }

    /**
     * Update audio system (call this in animation loop)
     */
    function updateAudioSystem() {
        updateMusicSystem();
        
        // Update any dynamic audio parameters
        if (global.player && global.camera) {
            updateListenerPosition(global.camera);
        }
    }

    /**
     * Cleanup audio system
     */
    function cleanup() {
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        
        spatialSounds.clear();
        environmentalSounds = [];
        isInitialized = false;
    }

    // Export functions to global scope
    global.EnhancedAudio = {
        init: initEnhancedAudio,
        update: updateAudioSystem,
        createSpatialSound: createSpatialSound,
        updateListener: updateListenerPosition,
        updateSoundPosition: updateSpatialSoundPosition,
        updateMusicIntensity: updateMusicIntensity,
        playEnvironmentalSound: playEnvironmentalSound,
        triggerEffect: triggerPositionalEffect,
        setMasterVolume: setMasterVolume,
        setMusicVolume: setMusicVolume,
        setSFXVolume: setSFXVolume,
        resumeContext: resumeAudioContext,
        cleanup: cleanup,
        isInitialized: () => isInitialized
    };

})(window);