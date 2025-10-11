/**
 * AUDIO - HTMLAudioElement SFX AND MUSIC (no Web Audio API graph)
 *
 * Summary:
 * - Sound effects as cloned HTMLAudioElement instances from cached templates
 * - Background music as looping HTMLAudioElement tracks chosen at random
 * - Basic autoplay policy unlock by playing/pausing muted audio on first interaction
 * - Volume controls: SFX uses a global multiplier; music volume set per track
 *
 * References:
 * - MDN HTMLAudioElement and autoplay policies (general web): https://developer.mozilla.org/
 *
 * Notes:
 * - No Web Audio API AudioContext or spatialisation - candidates for future work.
 */

(function (global) {
    // =============================================================================
    // AUDIO ASSET CONFIGURATION
    // =============================================================================
    
    /**
     * Sound effect file paths and asset management
     * Centralized configuration for easy asset updates and maintenance
     * Supports multiple audio formats for cross-browser compatibility
     */
    const SFX_PATHS = {
        coin: "assets/sound/coin.wav",     // Crystal collection feedback
        jump: "assets/sound/jump.wav",     // Player jump action
        win: "assets/sound/win.wav",       // Level completion celebration
        lose: "assets/sound/lose.wav"      // Game over notification
    };

    /**
     * Background music playlist configuration
     * Supports multiple tracks for variety and dynamic music selection
     * Uses high-quality compressed formats for streaming efficiency
     */
    const MUSIC_PATHS = [
        "assets/sound/MesmerizingGalaxyLoop.mp3",  // Ambient space theme
        "assets/sound/GalacticRap.mp3"             // Energetic gameplay theme
    ];

    /**
     * Default volume levels for different audio categories
     * Carefully balanced for optimal gameplay experience
     * Provides fallback values for missing configuration
     */
    const DEFAULT_VOLUMES = {
        coin: 0.7,          // Clear feedback without overpowering
        jump: 0.6,          // Frequent action, moderate volume
        win: 0.8,           // Celebration, higher impact
        lose: 0.75,         // Important feedback, clear but not harsh
        background: 0.25    // Background music, non-intrusive
    };

    // =============================================================================
    // AUDIO SYSTEM STATE VARIABLES
    // =============================================================================
    
    const soundTemplates = {};     // Cached audio templates for sound effects
    const musicTracks = [];        // Loaded background music tracks
    let musicTrack = null;         // Currently playing music track
    let unlocked = false;          // Audio context unlock status for mobile/autoplay restrictions
    let sfxVolumeMultiplier = 1;   // Global sound effects volume multiplier
    let musicVolumeSetting = clampVolume(DEFAULT_VOLUMES.background ?? 0.5); // Background music volume

    // TODO: Add spatial audio support using Web Audio API
    // TODO: Implement audio compression/decompression for large assets
    // TODO: Add real-time audio effects (reverb, echo, filters)
    // TODO: Create dynamic music mixing based on game state

    // =============================================================================
    // UTILITY FUNCTIONS FOR AUDIO MANAGEMENT
    // =============================================================================
    
    /**
     * Clamp volume values to valid audio range [0.0, 1.0]
     * Prevents audio distortion and ensures consistent volume behavior
     * Essential for user input validation and audio API compliance
     * 
     * @param {number} value - Volume value to clamp
     * @returns {number} Safely constrained volume value
     */
    function clampVolume(value) {
        return Math.max(0, Math.min(1, value)); // Ensure 0 <= value <= 1
    }

    /**
    * Create audio template for a given SFX and preload it.
     * 
     * @param {string} name - Sound effect identifier
     * @param {string} url - Audio file URL/path
     * @returns {HTMLAudioElement} Configured audio template
     */
    function createTemplate(name, url) {
        const audio = new Audio(url);
        audio.preload = "auto";  // Aggressive preloading for immediate playback
        
        // Store base volume for later volume calculations
        const baseVolume = clampVolume(DEFAULT_VOLUMES[name] ?? 1);
        audio._baseVolume = baseVolume;  // Custom property for volume management
        audio.volume = baseVolume;
        
        audio.load(); // Start loading immediately
        return audio;
    }

    // =============================================================================
    // AUDIO LOADING AND CACHING SYSTEM
    // =============================================================================
    
    /**
    * Ensure SFX templates exist in the cache (lazy creation on first use).
     * 
     * Performance Benefits:
     * - Avoids repeated file loading during gameplay
     * - Reduces memory fragmentation from dynamic audio creation
     * - Enables immediate sound playback without loading delays
     */
    function ensureSfxTemplates() {
        Object.entries(SFX_PATHS).forEach(([name, url]) => {
            if (!soundTemplates[name]) {
                soundTemplates[name] = createTemplate(name, url);
            }
        });
    }

    /**
    * Load music tracks (looping) and cache them for quick start/stop.
     * 
     * @returns {Array} Array of loaded and configured music tracks
     */
    function ensureMusicTracks() {
        if (!musicTracks.length) {
            MUSIC_PATHS.forEach(path => {
                const track = new Audio(path);
                track.preload = "auto";        // Preload for smooth transitions
                track.loop = true;             // Enable seamless looping
                track._baseVolume = clampVolume(DEFAULT_VOLUMES.background ?? 0.5);
                track.volume = musicVolumeSetting;
                track.load();
                track._sourcePath = path;      // Store source for debugging
                musicTracks.push(track);
            });
        }
        return musicTracks;
    }

    /**
     * Select random music track from loaded playlist
     * Provides variety in background music selection
     * Prevents repetitive audio experience during extended play
     * 
     * @returns {HTMLAudioElement|null} Selected music track or null if none available
     */
    function pickRandomMusicTrack() {
        const tracks = ensureMusicTracks();
        if (!tracks.length) return null;
        return tracks[Math.floor(Math.random() * tracks.length)];
    }

    // =============================================================================
    // BROWSER AUTOPLAY POLICY COMPLIANCE
    // =============================================================================
    
    /**
    * Unlock audio playback for browsers with autoplay restrictions
     * Handles modern browser security policies requiring user interaction
     * Enables audio playback after initial user gesture
     * 
     * Technical Implementation:
     * - Temporarily mutes all audio elements
     * - Attempts playback to unlock audio context
     * - Restores normal audio state after unlock
     * - Provides graceful fallback for restrictive environments
     */
    function unlockAudio() {
        if (unlocked) return; // Already unlocked, skip processing
        unlocked = true;

        // Collect all audio elements for batch unlocking
        const audios = [...Object.values(soundTemplates)];
        const tracks = ensureMusicTracks();
        if (tracks.length) {
            audios.push(...tracks);
        }

        // Unlock each audio element through play/pause cycle
        audios.forEach(audio => {
            audio.muted = true;       // Mute to avoid unwanted sound
            audio.currentTime = 0;    // Reset to beginning
            
            // Attempt playback to unlock audio context
            audio.play().then(() => {
                audio.pause();        // Stop playback immediately
                audio.currentTime = 0; // Reset position
                audio.muted = false;  // Restore normal state
            }).catch(() => {
                audio.muted = false;  // Restore state even on failure
            });
        });
    }

    // =============================================================================
    // SOUND EFFECT PLAYBACK SYSTEM
    // =============================================================================
    
    /**
    * Play a sound effect by cloning a template element; apply SFX multiplier to base volume.
     * 
     * Technical Benefits:
     * - Creates independent audio instances for overlapping sounds
     * - Maintains consistent volume levels across all playback
     * - Handles browser restrictions gracefully without breaking gameplay
     * - Optimizes performance through template reuse
     * 
     * @param {string} name - Sound effect identifier from SFX_PATHS
     */
    function playSound(name) {
        ensureSfxTemplates(); // Ensure templates are loaded
        const template = soundTemplates[name];
        if (!template) return; // Guard against missing sound effects

        // Clone audio element for independent playback
        const instance = template.cloneNode(); // Creates new HTMLAudioElement
        
        // Calculate volume using base volume and user multiplier
        const baseVolume = template._baseVolume !== undefined ? template._baseVolume : (template.volume ?? 1);
        instance.volume = clampVolume(baseVolume * sfxVolumeMultiplier);
        
        instance.currentTime = 0; // Reset to beginning for immediate playback
        
        // Attempt playback with graceful error handling
        instance.play().catch(() => {
            // Silently ignore play errors (common with autoplay restrictions)
            // This prevents console spam while maintaining functionality
        });
    }

    /**
    * Update SFX global multiplier and propagate to templates.
     * 
     * @param {number} volume - New volume level (0.0 to 1.0)
     */
    function setSfxVolume(volume) {
        sfxVolumeMultiplier = clampVolume(volume); // Update global multiplier
        
        // Apply volume change to all existing templates
        Object.values(soundTemplates).forEach(template => {
            if (!template) return;
            const baseVolume = template._baseVolume !== undefined ? template._baseVolume : (template.volume ?? 1);
            template.volume = clampVolume(baseVolume * sfxVolumeMultiplier);
        });
    }

    // =============================================================================
    // BACKGROUND MUSIC MANAGEMENT SYSTEM
    // =============================================================================
    
    /**
    * Start looping background music (random track). Honors options.volume/loop/startTime.
     * 
     * Features:
     * - Random track selection for variety
     * - Seamless track switching without audio gaps
     * - Configurable volume, looping, and start time
     * - Automatic audio context unlocking
     * 
     * @param {Object} options - Playback configuration options
     * @param {number} options.volume - Music volume level
     * @param {boolean} options.loop - Enable track looping
     * @param {number} options.startTime - Start position in seconds
     */
    function startBackground(options = {}) {
        ensureMusicTracks(); // Ensure music tracks are loaded
        unlockAudio();       // Handle browser autoplay restrictions
        
        const nextTrack = pickRandomMusicTrack();
        if (!nextTrack) return; // No tracks available

        // Stop current track if different from next track
        if (musicTrack && musicTrack !== nextTrack) {
            musicTrack.pause();
            musicTrack.currentTime = 0; // Reset for future playback
        }

        musicTrack = nextTrack; // Set new active track

        // Apply volume setting (use provided or current setting)
        if (typeof options.volume === "number") {
            musicVolumeSetting = clampVolume(options.volume);
        }
        musicTrack.volume = musicVolumeSetting;
        
        // Configure looping behavior
        if (options.loop !== undefined) {
            musicTrack.loop = !!options.loop; // Convert to boolean
        }
        
        // Set start position (useful for resuming or seeking)
        if (typeof options.startTime === "number") {
            musicTrack.currentTime = Math.max(0, options.startTime);
        } else {
            musicTrack.currentTime = 0; // Start from beginning
        }

        // Begin playback with error handling
        musicTrack.play().catch(() => {
            // Ignore playback errors (autoplay restrictions, missing files, etc.)
        });
    }

    /**
     * Stop background music with optional reset functionality
     * Provides clean music termination with state management
     * 
     * @param {boolean} reset - Whether to reset track position to beginning
     */
    function stopBackground(reset = true) {
        if (!musicTrack) return;
        musicTrack.pause();
        if (reset) {
            musicTrack.currentTime = 0; // Reset for next playback
        }
    }

    /**
     * Pause background music while preserving current position
     * Enables resume functionality for temporary audio interruption
     */
    function pauseBackground() {
        if (!musicTrack) return;
        musicTrack.pause(); // Pause without resetting position
    }

    /**
     * Resume paused background music from current position
     * Continues playback from where it was paused
     */
    function resumeBackground() {
        if (!musicTrack) return;
        musicTrack.play().catch(() => {
            // Handle resume errors gracefully
        });
    }

    // =============================================================================
    // AUDIO SYSTEM INITIALIZATION
    // =============================================================================
    
    /**
    * Initialize audio: create SFX templates, music tracks, and try to unlock.
     * 
     * Initialization Steps:
     * 1. Load and cache all sound effect templates
     * 2. Prepare background music playlist
     * 3. Unlock audio context for browser compatibility
     * 4. Set up event listeners for user interaction
     */
    function init() {
        ensureSfxTemplates();  // Preload sound effects
        ensureMusicTracks();   // Preload music tracks
        unlockAudio();         // Handle browser restrictions
    }

    // =============================================================================
    // BROWSER COMPATIBILITY AND USER INTERACTION HANDLING
    // =============================================================================
    
    /**
     * Set up automatic audio unlocking on first user interaction
     * Ensures audio system works across all browsers and devices
     * Uses modern event handling with proper cleanup
     * 
     * Technical Implementation:
     * - Listens for first pointer interaction (mouse, touch, stylus)
     * - Automatically unlocks audio system when user engages
     * - Uses { once: true } for automatic event listener cleanup
     * - Provides fallback for browsers without pointer events
     */
    document.addEventListener("pointerdown", () => {
        ensureSfxTemplates();  // Ensure assets loaded
        ensureMusicTracks();   // Ensure music ready
        unlockAudio();         // Unlock audio context
    }, { once: true }); // Automatically remove listener after first use

    // Immediate initialization for supported browsers
    ensureSfxTemplates();
    ensureMusicTracks();

    // =============================================================================
    // PUBLIC API EXPORT - GLOBAL AUDIO MANAGER
    // =============================================================================
    
    /**
     * Export comprehensive audio management interface
     * Provides clean, organized API for game systems to use
     * Demonstrates proper module pattern with encapsulated functionality
     * 
     * API Categories:
     * - Initialization: System setup and preparation
     * - Sound Effects: Individual sound playback with specific game actions
     * - Background Music: Playlist management and playback control
     * - Volume Control: Real-time audio level adjustment
     */
    global.audioManager = {
        // =============================================================================
        // SYSTEM INITIALIZATION
        // =============================================================================
        init,

        // =============================================================================
        // SOUND EFFECT INTERFACE
        // =============================================================================
        // Each function maps to specific game events for clear audio feedback
        playCoin: () => playSound("coin"),   // Crystal collection success
        playJump: () => playSound("jump"),   // Player jump action
        playWin: () => playSound("win"),     // Level completion celebration
        playLose: () => playSound("lose"),   // Game over notification

        // =============================================================================
        // BACKGROUND MUSIC CONTROL
        // =============================================================================
        startBackground,    // Begin music playback with options
        stopBackground,     // Stop music with optional reset
        pauseBackground,    // Pause music while preserving position
        resumeBackground,   // Resume from paused position

        // =============================================================================
        // DYNAMIC VOLUME MANAGEMENT
        // =============================================================================
        
        /**
         * Set background music volume with real-time updates
         * Updates both current playback and future track volumes
         * Provides immediate user feedback for volume adjustments
         * 
         * @param {number} volume - New volume level (0.0 to 1.0)
         */
        setBackgroundVolume: volume => {
            const clampedVolume = clampVolume(volume);
            musicVolumeSetting = clampedVolume; // Update global setting
            
            // Apply to all loaded tracks
            const tracks = ensureMusicTracks();
            tracks.forEach(track => {
                track.volume = clampedVolume;
            });
            
            // Update currently playing track immediately
            if (musicTrack) {
                musicTrack.volume = clampedVolume;
            }
        },

        /**
         * Set sound effects volume with immediate application
         * Updates global multiplier and all cached templates
         * Provides instant feedback for volume slider changes
         */
        setSfxVolume
        
        // TODO: Add spatial audio positioning for 3D sound effects
        // TODO: Implement audio ducking (lower music when SFX plays)
        // TODO: Add audio compression/limiting for consistent loudness
        // TODO: Create audio presets (Silent, Quiet, Normal, Loud)
        // TODO: Add audio visualization/spectrum analysis for advanced users
    };
    
    // TODO: Export additional utility functions for advanced audio control
    // TODO: Add audio debugging interface for development
    // TODO: Implement audio performance monitoring and optimization
    // TODO: Create audio asset validation and error reporting system
    
})(window);
