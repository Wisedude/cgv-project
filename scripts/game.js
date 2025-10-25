/**
 * CRYSTAL COLLECTOR 3D - MAIN GAME ENGINE
 *
 * Summary:
 * - Sets up core Three.js objects (Scene, PerspectiveCamera, WebGLRenderer)
 * - Implements a requestAnimationFrame render loop with FPS sampling
 * - Maintains global game state (levels, score, timers, UI elements)
 * - Updates third-person and first-person cameras using yaw/pitch and lookAt
 * - Initialises lighting, controls, minimap and an environment skybox
 * - Spawns pooled debris meshes as lightweight particles
 *
 * References:
 * - Three.js manual (fundamentals, loop, cameras, colour management, shadows, environment): https://threejs.org/manual/
 * - MDN demo with Three.js (scene, camera, renderer, animate loop): https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js
 * - Codrops interactive 3D character (input and camera interaction patterns): https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/
 * - CGV coursebook (transformations, camera models, lighting): https://lamp.ms.wits.ac.za/~branden/CGV/_book/index.html
 * - Tuts+ endless runner (procedural and pooled objects ideas): https://code.tutsplus.com/creating-a-simple-3d-endless-runner-game-using-three-js--cms-29157t
 * - Jérôme Etienne slides (web game practices, pointer lock and camera): https://jeromeetienne.github.io/slides/howtomakeagame-nextgamefrontier-2014/
 *
 * Notes:
 * - MeshPhysicalMaterial PBR is configured in other modules; here we set renderer colour management and tone mapping.
 * - Camera modes implemented are 0 (third-person) and 1 (first-person). Cinematic mode is a TODO.
 */

// =============================================================================
// GLOBAL GAME STATE VARIABLES
// =============================================================================

// Performance monitoring constants
const FPS_SAMPLE_INTERVAL = 500; // Milliseconds between FPS calculations

// Core Three.js objects - fundamental rendering pipeline components
let scene, camera, renderer, gameStarted = false;

// Player system variables
let player, playerVelocity = new THREE.Vector3(); // 3D velocity vector for physics simulation

// Game world collections - using arrays for efficient iteration
let platforms = [], crystals = [], collectibles = []; // Scene object collections

// Input and camera control system
let keys = {}, cameraYaw = 0, cameraPitch = 0; // Spherical coordinate camera system

// Game progression and scoring
let currentLevel = 1, maxLevel = 3;
let collectedCrystals = 0, totalCrystals = 10;
let lives = 3, score = 0, gameTime = 60;
let gameTimer, levelStartTime;

// Camera system - multiple viewing modes for accessibility and gameplay variety
let cameraMode = 0; // 0: third-person, 1: first-person
// TODO: Add cinematic camera mode (mode 2) with predefined camera paths
// TODO: Implement smooth camera transitions using THREE.Vector3.lerp()

// Particle system for visual effects (environmental debris reused as lightweight animated meshes)
let particles = [];
// TODO: Implement different particle types (sparks, smoke, magic effects)
// TODO: Add GPU-based particle system using THREE.Points for better performance

// Physics and movement system
let isJumping = false, jumpCooldown = 0;
let maxJumps = 2, jumpsRemaining = maxJumps; // Double-jump mechanic

// Level management
let levelCompleteActive = false;

// Environmental rendering
let skybox = null;
let skyUniforms = null; // For future procedural skybox implementation

// Performance monitoring
let fpsElement = null;
let fpsFrameCount = 0;
let fpsLastUpdate = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

// UI system
let loadingOverlay = null;
let loadingMessageEl = null;
let loadingHideTimer = null;

// Debris particle system - demonstrates object pooling for performance
let debrisTexture = null;
let debrisMaterialTemplate = null; // Template for cloning materials efficiently
let sharedDebrisGeometry = null; // Shared geometry to reduce memory usage
let debrisTextures = null;
const debrisTextureLoader = new THREE.TextureLoader();

// Camera calculation vectors - reused to prevent garbage collection
const _cameraLookDirection = new THREE.Vector3();
const _cameraHeadOffset = new THREE.Vector3(0, 2, 0);
const _cameraOffset = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _cameraTemp = new THREE.Vector3();

// TODO: Add weather system variables
// TODO: Implement day/night cycle system
// TODO: Add post-processing effects (bloom, SSAO, depth of field)

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Mathematical clamping function - constrains value within bounds
 * Used throughout the game for safe value ranges (camera angles, velocities, etc.)
 * 
 * @param {number} value - Input value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value within [min, max] range
 */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Reset camera orientation to default state
 * Demonstrates proper camera state management and transform reset
 * Called when player respawns or level resets
 */
function resetViewOrientation() {
    // Reset spherical camera coordinates to default forward view
    cameraYaw = 0;     // Horizontal rotation (left/right)
    cameraPitch = 0;   // Vertical rotation (up/down)

    // Reset player visual orientation if player exists
    if (player) {
        player.rotation.set(0, 0, 0); // Reset all Euler rotations
    }

    // Update camera position based on new orientation
    updateCameraPosition();
}

// =============================================================================
// UI AND LOADING SCREEN MANAGEMENT
// =============================================================================

/**
 * Display loading screen with fade-in animation
 * Demonstrates proper UI state management and user feedback
 * 
 * @param {string} message - Loading message to display to user
 */
function showLoadingScreen(message = 'Preparing level...') {
    if (!loadingOverlay) return; // Guard clause for missing DOM element

    // Clear any existing hide timer to prevent conflicts
    if (loadingHideTimer) {
        clearTimeout(loadingHideTimer);
        loadingHideTimer = null;
    }

    // Show loading overlay with immediate visibility
    loadingOverlay.classList.remove('hidden', 'fade-out');
    loadingOverlay.style.opacity = '1';
    
    // Update loading message if element exists and message provided
    if (loadingMessageEl && message) {
        loadingMessageEl.textContent = message;
    }
}

/**
 * Hide loading screen with fade-out animation
 * Implements smooth UI transitions for professional user experience
 * 
 * @param {number} delay - Delay in milliseconds before starting fade-out
 */
function hideLoadingScreen(delay = 250) {
    if (!loadingOverlay) return; // Guard clause for missing DOM element

    // Clear existing timer to prevent multiple hide attempts
    if (loadingHideTimer) {
        clearTimeout(loadingHideTimer);
    }

    const fadeDuration = 220; // Animation duration in milliseconds
    
    // Delayed hide sequence for smooth user experience
    loadingHideTimer = setTimeout(() => {
        // Start fade-out animation
        loadingOverlay.classList.add('fade-out');
        
        // Complete hiding after fade animation
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('fade-out');
            loadingHideTimer = null;
        }, fadeDuration);
    }, Math.max(0, delay));
}


// =============================================================================
// THREE.JS CORE INITIALIZATION
// =============================================================================

/**
 * Initialise Three.js scene, camera and renderer
 * - Scene: background colour plus fog, then optional skybox/environment mapping
 * - Camera: PerspectiveCamera with sensible near/far planes for our scale
 * - Renderer: sRGB output, PCF soft shadows, ACESFilmic tone mapping
 *
 * References:
 * - Three.js manual (Scene/Camera/Renderer setup, colour spaces, shadows): https://threejs.org/manual/
 * - MDN animate loop pattern and resize handling: https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js
 */
function init() {
    // =============================================================================
    // SCENE SETUP - Container for all 3D objects
    // =============================================================================
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a); // Deep space blue background
    
    // Atmospheric fog for depth perception and visual immersion
    scene.fog = new THREE.Fog(0x200040, 50, 500); // Fog(colour, near, far) for depth cues
    // TODO: Implement exponential fog (THREE.FogExp2) for more realistic atmosphere
    // TODO: Add dynamic fog density based on level or weather conditions

    // Create procedural or texture-based skybox
    createSkybox();

    //backdrop added
    createBackdrop(scene);

    // =============================================================================
    // CAMERA SETUP - Viewing frustum and projection
    // =============================================================================
    // Perspective camera for realistic 3D viewing with foreshortening
    camera = new THREE.PerspectiveCamera(
        75,                           // Field of view in degrees (human vision ~50-60°)
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1,                         // Near clipping plane
        1000                         // Far clipping plane
    );
    // TODO: Add orthographic camera option for architectural/technical views
    // TODO: Implement dynamic FOV based on game state (zoom effects)
    
    updateCameraPosition();

    // =============================================================================
    // RENDERER SETUP - WebGL rendering with advanced features
    // =============================================================================
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('renderCanvas'), // Target canvas element
        antialias: true,             // Smooth edges via MSAA
        alpha: true                  // Transparent background support
    });
    
    // High-DPI display support for crisp rendering on modern screens
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // =============================================================================
    // SHADOW MAPPING CONFIGURATION
    // =============================================================================
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // PCF soft shadows (per Three.js manual)
    // TODO: Implement Variance Shadow Maps for better quality
    // TODO: Add cascade shadow maps for large outdoor scenes
    
    // =============================================================================
    // COLOR MANAGEMENT AND POST-PROCESSING
    // =============================================================================
    renderer.setClearColor(0x0a0a2a, 1.0);           // Clear color (full opacity)
    renderer.outputEncoding = THREE.sRGBEncoding;     // Output in sRGB for correct colour
    renderer.physicallyCorrectLights = true;          // Realistic light falloff
    
    // Tone mapping for HDR-like effects (if supported)
    if (THREE && THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping; // Film-like tone curve
        renderer.toneMappingExposure = 1.0;                 // Exposure adjustment
    }
    // TODO: Add custom tone mapping curve for artistic effects
    // TODO: Implement adaptive exposure based on scene brightness

    // =============================================================================
    // SUBSYSTEM INITIALIZATION
    // =============================================================================
    setupLighting();              // Advanced lighting with multiple light types
    setupControls();              // Input handling and control schemes
    setupMinimap();               // 2D minimap for navigation aid
    setupRendererResizeHandling(); // Responsive design for window resizing

    // =============================================================================
    // ENHANCED SYSTEMS INITIALIZATION
    // =============================================================================
    // Initialize graphics settings system
    if (typeof GraphicsSettings !== 'undefined') {
        try {
            GraphicsSettings.init();
            console.log('Graphics Settings system initialized');
        } catch (error) {
            console.warn('Failed to initialize Graphics Settings:', error);
        }
    }

    // Initialize performance monitoring first (before heavy systems)
    if (typeof PerformanceMonitor !== 'undefined') {
        try {
            PerformanceMonitor.start();
            console.log('Performance Monitor initialized');
        } catch (error) {
            console.warn('Failed to initialize Performance Monitor:', error);
        }
    }

    // Initialize enhanced audio system
    if (typeof EnhancedAudio !== 'undefined') {
        try {
            const audioSuccess = EnhancedAudio.init();
            if (audioSuccess) {
                console.log('Enhanced Audio system initialized');
            }
        } catch (error) {
            console.warn('Failed to initialize Enhanced Audio:', error);
        }
    }

    // Initialize enhanced particle system (after scene is fully set up)
    if (typeof EnhancedParticles !== 'undefined' && scene) {
        try {
            // Wait a bit for the scene to be fully initialized
            setTimeout(() => {
                EnhancedParticles.init();
                console.log('Enhanced Particle system initialized');
            }, 100);
        } catch (error) {
            console.warn('Failed to initialize Enhanced Particles:', error);
        }
    }

    // Initialize story manager last
    if (typeof StoryManager !== 'undefined') {
        try {
            // Delay story manager to ensure game is ready
            setTimeout(() => {
                StoryManager.init();
                console.log('Story Manager initialized');
            }, 500);
        } catch (error) {
            console.warn('Failed to initialize Story Manager:', error);
        }
    }

    // =============================================================================
    // UI AND PERFORMANCE MONITORING
    // =============================================================================
    fpsElement = document.getElementById('fpsCounter');
    loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingMessageEl = loadingOverlay.querySelector('p');
    }
    fpsLastUpdate = getTimestamp();

    // =============================================================================
    // START RENDER LOOP
    // =============================================================================
    animate(); // Begin continuous rendering loop
    
    // Export core variables to global scope for enhanced systems
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.gameStarted = gameStarted;
    
    // Also export to global object for consistency
    global.scene = scene;
    global.camera = camera;
    global.renderer = renderer;
    
    console.log('Crystal Collector 3D initialized with enhanced systems');
    
    // TODO: Add performance profiling for optimization
    // TODO: Implement level-of-detail (LOD) system for complex scenes
    // TODO: Add VR/AR support using WebXR APIs
}

/**
 * Setup responsive rendering that adapts to window size changes
 * Demonstrates proper viewport management and aspect ratio handling
 * Critical for cross-device compatibility and professional user experience
 */
function setupRendererResizeHandling() {
    // Define global resize handler for external access
    window.handleRendererResize = () => {
        if (!camera || !renderer) return; // Safety check for initialization

        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update camera projection matrix for new aspect ratio
        camera.aspect = width / height;
    camera.updateProjectionMatrix(); // Must be called after changing aspect

        // Update renderer size and pixel ratio for high-DPI displays
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize(width, height);
        
        // TODO: Update minimap dimensions proportionally
        // TODO: Adjust UI element positions for different screen sizes
        // TODO: Implement responsive LOD based on screen resolution
    };

    // Trigger initial resize to ensure proper setup
    if (typeof window.handleRendererResize === 'function') {
        window.handleRendererResize();
    }
}

/**
 * Create and configure skybox for environmental rendering
 * - Loads a single equirectangular texture and uses EquirectangularReflectionMapping
 * - Sets both scene.background and scene.environment (so PBR materials can reflect it)
 *
 * Reference: Three.js manual (textures, environment maps and encodings): https://threejs.org/manual/
 */
function createSkybox() {
    const loader = new THREE.TextureLoader();
    
    // Load equirectangular HDR-style space texture
    loader.load(
        'assets/space.jpg',
        texture => {
            // Configure texture for proper color representation
            texture.encoding = THREE.sRGBEncoding;        // Use sRGB for colour textures
            texture.mapping = THREE.EquirectangularReflectionMapping; // 360° env mapping
            
            // Apply to scene for both background and environmental lighting
            scene.background = texture;    // Visible background
            scene.environment = texture;   // Environmental reflections for PBR materials
            
            // Cache references for potential future manipulation
            skybox = texture;
            skyUniforms = null; // For procedural skybox uniforms
            
            // TODO: Implement time-of-day skybox transitions (cross-fade)
            // TODO: Add procedural cloud generation using noise functions
            // TODO: Create star field with parallax scrolling
        },
        undefined, // Progress callback (optional)
        error => {
            console.warn('[Skybox] Failed to load space.jpg', error);
            // TODO: Implement fallback procedural skybox using gradient
            // TODO: Add error recovery with simplified background color
        }
    );
}

function getRendererAnisotropy() {
    return (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
        ? renderer.capabilities.getMaxAnisotropy()
        : 1;
}

function configureDebrisTexture(texture, encoding = THREE.sRGBEncoding) {
    if (!texture) return;
    texture.encoding = encoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = getRendererAnisotropy();
    texture.needsUpdate = true;
}

function ensureDebrisResources() {
    if (!sharedDebrisGeometry) {
    sharedDebrisGeometry = new THREE.SphereGeometry(0.22, 14, 14); // low-cost sphere for debris
    }

    if (!debrisTextures) {
        function loadDebrisTexture(filename, encoding, label) {
            const texture = debrisTextureLoader.load(
                `assets/textures/crystal/${filename}`,
                tex => configureDebrisTexture(tex, encoding),
                undefined,
                error => {
                    console.warn(`[Debris] Failed to load ${label || filename}`, error);
                }
            );
            configureDebrisTexture(texture, encoding);
            return texture;
        }

        debrisTextures = {
            color: loadDebrisTexture('ice_0002_color_128.jpg', THREE.sRGBEncoding, 'crystal albedo'),
            normal: loadDebrisTexture('ice_0002_normal_opengl_128.png', THREE.LinearEncoding, 'crystal normal'),
            roughness: loadDebrisTexture('ice_0002_roughness_128.jpg', THREE.LinearEncoding, 'crystal roughness'),
            ao: loadDebrisTexture('ice_0002_ao_128.jpg', THREE.LinearEncoding, 'crystal AO'),
            height: loadDebrisTexture('ice_0002_height_128.png', THREE.LinearEncoding, 'crystal height')
        };

        debrisTexture = debrisTextures.color;
    }

    if (!debrisMaterialTemplate) {
    // Physical material to match scene.environment reflections
    debrisMaterialTemplate = new THREE.MeshPhysicalMaterial({
            map: debrisTextures.color,
            normalMap: debrisTextures.normal,
            roughnessMap: debrisTextures.roughness,
            aoMap: debrisTextures.ao,
            bumpMap: debrisTextures.height,
            transparent: true,
            opacity: 0.55,
            roughness: 0.25,
            metalness: 0.08,
            envMapIntensity: 0.9,
            clearcoat: 0.3,
            clearcoatRoughness: 0.5,
            emissive: new THREE.Color(0x6688ff).multiplyScalar(0.05)
        });
        if (debrisMaterialTemplate.normalMap) {
            debrisMaterialTemplate.normalScale = new THREE.Vector2(0.6, 0.6);
        }
        if (debrisMaterialTemplate.bumpMap) {
            debrisMaterialTemplate.bumpScale = 0.04;
        }
        debrisMaterialTemplate.aoMapIntensity = 0.85;
        debrisMaterialTemplate.needsUpdate = true;
        debrisMaterialTemplate.depthWrite = false;
        debrisMaterialTemplate.name = 'CrystalDebris';
    }

    return {
        geometry: sharedDebrisGeometry,
        material: debrisMaterialTemplate
    };
}

function createEnvironment() {
    const debrisResources = ensureDebrisResources();
    for (let i = 0; i < 100; i++) {
        const debrisMaterial = debrisResources.material.clone();
        const tint = 0.55 + Math.random() * 0.1;
        debrisMaterial.color.setHSL(0.6, 0.45, tint);
        const debris = new THREE.Mesh(debrisResources.geometry, debrisMaterial);
        debris.position.set(
            (Math.random() - 0.5) * 100,
            Math.random() * 100,
            (Math.random() - 0.5) * 100
        );
        debris.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.02
            )
        };
        scene.add(debris);
        particles.push(debris);
    }
}

// =============================================================================
// ADVANCED CAMERA SYSTEM IMPLEMENTATION
// =============================================================================

/**
 * Update camera position based on current mode and player state
 * Demonstrates advanced 3D camera mathematics and smooth interpolation
 * Implements multiple viewing perspectives for enhanced gameplay experience
 * 
 * Connection to Course Materials:
 * - Implements camera transformation matrices from CGV coursebook
 * - Uses spherical coordinates for intuitive camera control
 * - Demonstrates view matrix calculations and lookAt functionality
 * 
 * Mathematical Concepts:
 * - Spherical to Cartesian coordinate conversion
 * - Vector mathematics for camera positioning
 * - Transform hierarchy and local/world space conversions
 */
function updateCameraPosition() {
    if (!player) return; // Safety check for player existence

    // =============================================================================
    // CALCULATE CAMERA LOOK DIRECTION (Spherical Coordinates)
    // =============================================================================
    // Convert spherical coordinates (yaw, pitch) to Cartesian direction vector
    // This follows standard mathematical convention for 3D camera systems
    _cameraLookDirection.set(
        Math.sin(cameraYaw) * Math.cos(cameraPitch),    // X component (left/right)
        Math.sin(cameraPitch),                          // Y component (up/down)
        -Math.cos(cameraYaw) * Math.cos(cameraPitch)    // Z component (forward/back)
    ).normalize(); // Ensure unit vector for consistent calculations

    // =============================================================================
    // CAMERA MODE SWITCHING SYSTEM
    // =============================================================================
    switch (cameraMode) {
        case 0: { // THIRD-PERSON CAMERA MODE
            // =============================================================================
            // Third-person camera provides external view of player character
            // Popular in action games for spatial awareness and character visibility
            // =============================================================================
            
            camera.up.set(0, 1, 0); // Ensure Y-up orientation (standard 3D convention)
            
            const followDistance = 15;  // Distance behind player
            const verticalOffset = 8;   // Height above player for better view angle
            
            // Calculate camera offset position behind player
            _cameraOffset.copy(_cameraLookDirection).multiplyScalar(-followDistance);
            _cameraOffset.y += verticalOffset;
            
            // Prevent camera from going below ground level
            if (_cameraOffset.y < 1) _cameraOffset.y = 1;

            // Position camera relative to player with calculated offset
            camera.position.copy(player.position).add(_cameraOffset);

            // =============================================================================
            // CAMERA TARGET CALCULATION
            // =============================================================================
            // Calculate look-at target slightly ahead of player for better framing
            _cameraTarget.copy(player.position).add(_cameraHeadOffset);
            _cameraTemp.copy(_cameraLookDirection).multiplyScalar(2); // Look ahead distance
            _cameraTarget.add(_cameraTemp);
            
            camera.lookAt(_cameraTarget); // Apply calculated target
            // TODO: Add smooth camera interpolation using THREE.Vector3.lerp()
            // TODO: Implement camera collision detection to prevent wall clipping
            break;
        }
        
        case 1: { // FIRST-PERSON CAMERA MODE
            // =============================================================================
            // First-person camera provides immersive player perspective
            // Common in FPS games and VR applications for maximum immersion
            // =============================================================================
            
            camera.up.set(0, 1, 0); // Maintain proper orientation
            
            // Position camera at player's head level
            _cameraTarget.copy(player.position).add(_cameraHeadOffset);
            camera.position.copy(_cameraTarget);
            
            // Look in calculated direction from head position
            _cameraTemp.copy(_cameraTarget).add(_cameraLookDirection);
            camera.lookAt(_cameraTemp);
            // TODO: Add head bobbing animation for walking immersion
            // TODO: Implement weapon/hand models for complete FPS experience
            break;
        }
        
        // TODO: case 2: CINEMATIC CAMERA MODE
        // TODO: Implement pre-defined camera paths using THREE.CatmullRomCurve3
        // TODO: Add camera shake effects during impacts or explosions
        // TODO: Create smooth transitions between camera modes
    }
}

function updateUI() {
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('crystals').textContent = collectedCrystals;
    document.getElementById('totalCrystals').textContent = totalCrystals;
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('timer').textContent = Math.max(0, gameTime);

    const progress = (collectedCrystals / totalCrystals) * 100;
    document.getElementById('crystalProgress').style.width = progress + '%';
}

function startTimer() {
    if (gameTimer) clearInterval(gameTimer);

    gameTimer = setInterval(() => {
        if (gameStarted && gameTime > 0) {
            gameTime--;
            updateUI();

            if (gameTime <= 0) {
                if (lives > 0) {
                    lives--;
                    if (lives <= 0) {
                        gameOver();
                    } else {
                        restartLevel();
                    }
                }
            }
        }
    }, 1000);
}

function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('controls').style.display = 'block';
    
    // Show minimap during gameplay
    const minimap = document.getElementById('minimap');
    if (minimap) {
        minimap.style.display = 'block';
    }

    if (window.audioManager && typeof window.audioManager.init === 'function') {
        try {
            window.audioManager.init();
        } catch (err) {
            console.warn('[Audio] Failed to initialize audio manager', err);
        }
        if (typeof window.audioManager.startBackground === 'function') {
            try {
                window.audioManager.startBackground();
            } catch (err) {
                console.warn('[Audio] Failed to start background music', err);
            }
        }
    }

    cameraYaw = 0;
    cameraPitch = 0;
    jumpCooldown = 0;
    isJumping = false;
    jumpsRemaining = maxJumps;
    loadLevel(currentLevel);
    gameStarted = true;
    console.log('Crystal Collector 3D - Game Started!');
}

function gameOver() {
    gameStarted = false;
    if (gameTimer) clearInterval(gameTimer);
    document.getElementById('gameOver').style.display = 'block';
    
    // Hide minimap when game ends
    const minimap = document.getElementById('minimap');
    if (minimap) {
        minimap.style.display = 'none';
    }
    
    // Trigger story manager for game over
    if (typeof StoryManager !== 'undefined' && typeof StoryManager.trackProgress === 'function') {
        StoryManager.trackProgress('gameOver');
    }

    if (window.audioManager) {
        if (typeof window.audioManager.playLose === 'function') {
            try {
                window.audioManager.playLose();
            } catch (err) {
                console.warn('[Audio] Failed to play lose sound', err);
            }
        }
        if (typeof window.audioManager.stopBackground === 'function') {
            try {
                window.audioManager.stopBackground();
            } catch (err) {
                console.warn('[Audio] Failed to stop background music', err);
            }
        }
    }
}

/**
 * Restart the entire game from the beginning
 * Resets all game state variables and UI elements to initial values
 * Demonstrates proper game state management and cleanup procedures
 */
function restartGame() {
    // Reset game state to beginning
    currentLevel = 1;
    lives = 3;
    score = 0;
    gameTime = 60;
    collectedCrystals = 0;
    totalCrystals = 0;
    gameStarted = false;
    levelCompleteActive = false;
    
    // Clear any existing timer
    if (gameTimer) clearInterval(gameTimer);
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Show minimap when restarting game
    const minimap = document.getElementById('minimap');
    if (minimap) {
        minimap.style.display = 'block';
    }
    
    // Load first level and start game
    loadLevel(currentLevel);
    gameStarted = true;
    
    // Update UI
    updateUI();
    
    // Restart background music
    if (window.audioManager && typeof window.audioManager.startBackground === 'function') {
        try {
            window.audioManager.startBackground();
        } catch (err) {
            console.warn('[Audio] Failed to restart background music', err);
        }
    }
}

// =============================================================================
// MAIN GAME LOOP AND RENDERING SYSTEM
// =============================================================================

/**
 * Primary animation loop - heart of the game engine
 * Demonstrates requestAnimationFrame for smooth 60fps rendering
 * Implements performance monitoring and multi-system coordination
 * 
 * Connection to Course Materials:
 * - Follows MDN game loop tutorial patterns for consistent timing
 * - Implements Three.js manual rendering best practices
 * - Demonstrates real-time graphics concepts from CGV coursebook
 * 
 * Performance Considerations:
 * - Uses requestAnimationFrame for VSync-locked rendering
 * - Implements FPS monitoring for performance optimization
 * - Coordinates multiple subsystems efficiently
 */
function animate() {
    // Schedule next frame rendering (typically 60fps on modern displays)
    requestAnimationFrame(animate);

    // =============================================================================
    // PERFORMANCE MONITORING SYSTEM
    // =============================================================================
    const now = getTimestamp();
    fpsFrameCount++;
    const elapsed = now - fpsLastUpdate;
    
    // Calculate and display FPS every sample interval
    if (elapsed >= FPS_SAMPLE_INTERVAL) {
        const fps = (fpsFrameCount * 1000) / elapsed;
        if (fpsElement) {
            fpsElement.textContent = `${Math.round(fps)} FPS`;
        }
        // Reset counters for next sample period
        fpsFrameCount = 0;
        fpsLastUpdate = now;
        
        // TODO: Add performance warnings for low FPS
        // TODO: Implement adaptive quality based on frame rate
        // TODO: Log performance metrics for optimization analysis
    }

    // =============================================================================
    // PROCEDURAL SKYBOX ANIMATION (if applicable)
    // =============================================================================
    // Animate skybox uniforms for dynamic environmental effects
    if (skyUniforms) {
        skyUniforms.time.value += 0.01; // Increment time for shader animations
        // TODO: Synchronize skybox animation with game time
        // TODO: Add weather-based skybox transitions
    }

    // =============================================================================
    // GAMEPLAY SYSTEMS UPDATE
    // =============================================================================
    if (gameStarted) {
        // Update player physics, input, and animation
        updatePlayer();    // Handle movement, collision, input processing
        
        // Update visual animations (particles, environment, UI)
        updateAnimations(); // Particle systems, object animations, effects
        
        // Update enhanced particle systems (safely)
        if (typeof EnhancedParticles !== 'undefined' && EnhancedParticles.isInitialized && EnhancedParticles.isInitialized()) {
            try {
                EnhancedParticles.update();
            } catch (error) {
                console.warn('Error updating Enhanced Particles:', error);
            }
        }
        
        // Update enhanced audio system (safely)
        if (typeof EnhancedAudio !== 'undefined' && EnhancedAudio.isInitialized && EnhancedAudio.isInitialized()) {
            try {
                EnhancedAudio.update();
                // Update 3D audio listener position
                if (camera) {
                    EnhancedAudio.updateListener(camera);
                }
            } catch (error) {
                console.warn('Error updating Enhanced Audio:', error);
            }
        }
        
        // TODO: Update AI systems for moving platforms or enemies
        // TODO: Update weather and environmental effects
    }

    // =============================================================================
    // LIGHTING SYSTEM UPDATE
    // =============================================================================
    // Update dynamic lighting based on camera position
    if (typeof updateSunPosition === 'function') {
        updateSunPosition(camera ? camera.position : undefined);
        // TODO: Add dynamic shadow cascade updates
        // TODO: Implement light culling for performance optimization
    }

    //update backdrop
    updateBackdrop();
    // =============================================================================
    // FINAL RENDERING PASS
    // =============================================================================
    if (renderer) {
        renderer.render(scene, camera); // Execute complete rendering pipeline
        
        // TODO: Add post-processing effects rendering
        // TODO: Implement multi-pass rendering for advanced effects
        // TODO: Add render target switching for effects like mirrors
    }
}

function getTimestamp() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
}

// =================== SPACE BACKDROP (rocket, satellite, procedural asteroids) ===================
(function () {
  const BACKDROP = {
    asteroidIMesh: null,
    radiusMin: 230,
    radiusMax: 520,
    ringThickness: 140,
    clock: new THREE.Clock(),
  };

  function rand(min, max) { return min + Math.random() * (max - min); }

  const loader = new THREE.GLTFLoader();

  // -------- procedural asteroid belt (no model needed) --------
  function addProceduralAsteroidBelt(scene) {
    // Start with a small icosahedron and dent its vertices to get a rocky look
    const base = new THREE.IcosahedronGeometry(1.6, 1); // low-poly
    const pos = base.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const nx = (Math.random() - 0.5) * 0.45;
      const ny = (Math.random() - 0.5) * 0.45;
      const nz = (Math.random() - 0.5) * 0.45;
      pos.setXYZ(i,
        pos.getX(i) + nx,
        pos.getY(i) + ny,
        pos.getZ(i) + nz
      );
    }
    pos.needsUpdate = true;
    base.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x9fa3a8,
      roughness: 0.95,
      metalness: 0.05
    });

    const count = BACKDROP.asteroidCount;
    const imesh = new THREE.InstancedMesh(base, mat, count);
    imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    imesh.castShadow = false; imesh.receiveShadow = false;
    imesh.layers.set(BACKDROP.layer);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const ringR = rand(BACKDROP.radiusMin, BACKDROP.radiusMax);
      const jitter = rand(-BACKDROP.ringThickness/2, BACKDROP.ringThickness/2);
      const ang = rand(0, Math.PI*2);
      const x = Math.cos(ang) * (ringR + jitter);
      const z = Math.sin(ang) * (ringR + jitter);
      const y = rand(-60, 60);

      // squash/scale non-uniformly for variety
      const sx = rand(0.6, 2.3), sy = rand(0.6, 2.0), sz = rand(0.6, 2.3);
      dummy.position.set(x, y, z);
      dummy.rotation.set(rand(0,Math.PI), rand(0,Math.PI), rand(0,Math.PI));
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      imesh.setMatrixAt(i, dummy.matrix);
    }
    imesh.instanceMatrix.needsUpdate = true;
    scene.add(imesh);
    BACKDROP.asteroidIMesh = imesh;
  }

  // -------- static satellites --------
  function addSatellites(scene, gltf) {
    for (let i = 0; i < 5; i++) {
      const root = gltf.scene.clone(true);
      const R = rand(300, 520);
      const a = rand(0, Math.PI*2);
      root.position.set(Math.cos(a)*R, rand(-60,60), Math.sin(a)*R);
      root.rotation.y = rand(0, Math.PI*2);
      const s = rand(3, 6);
      root.scale.setScalar(s);
      root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      root.updateMatrixWorld(true);
      root.matrixAutoUpdate = false;
      root.layers.set(BACKDROP.layer);
      scene.add(root);
      BACKDROP.objects.push(root);
    }
  }

  // -------- distant rocket “capital ship” --------
  function addDistantRocket(scene, gltf) {
    const ship = gltf.scene.clone(true);
    ship.position.set(-360, 70, -520);
    ship.scale.setScalar(7);
    ship.traverse(o => { if (o.isMesh) { o.material.roughness = 0.9; o.material.metalness = 0.1; } });
    ship.updateMatrixWorld(true);
    ship.matrixAutoUpdate = false;
    ship.layers.set(BACKDROP.layer);
    scene.add(ship);
    BACKDROP.objects.push(ship);
  }

  // -------- tiny comet (particles; no model) --------
  function addComet(scene) {
    const comet = new THREE.Object3D();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2, 0),
      new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, emissive: 0x334455 })
    );
    comet.add(core);

    const pCount = 450;
    const tailGeo = new THREE.BufferGeometry();
    const p = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) { p[i*3+0]=0; p[i*3+1]=0; p[i*3+2]=0; }
    tailGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const tailMat = new THREE.PointsMaterial({ size: 3, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    const tail = new THREE.Points(tailGeo, tailMat);
    comet.add(tail);

    comet.position.set(420, 120, 380);
    comet.userData = { tail, vel: new THREE.Vector3(-0.6, -0.1, -0.5) };
    comet.layers.set(BACKDROP.layer);
    scene.add(comet);
    BACKDROP.comet = comet;
  }

  function gentleRotateAsteroids(dt) {
    if (!BACKDROP.asteroidIMesh) return;
    BACKDROP.asteroidIMesh.rotation.y += dt * 0.02;
  }

  // -------- public API --------
  window.createBackdrop = function createBackdrop(scene, onReady) {
  addProceduralAsteroidBelt(scene);

  loader.load('assets/models/satellite.glb', (gltf) => addSatellites(scene, gltf));
  loader.load('assets/models/rocket.glb', (gltf) => addDistantRocket(scene, gltf));

  if (onReady) onReady();
};

window.updateBackdrop = function updateBackdrop() {
  // If you keep a clock, pass dt. If not, just call gentleRotateAsteroids() with no args after editing it (see step 5).
  gentleRotateAsteroids(1 / 60);
};

})();

// Make restartGame available globally
window.restartGame = restartGame;

window.addEventListener('load', init);
