# Crystal Collector 3D — Assessment Guide (Detailed Implementation)

This guide provides specific code evidence for each assessment criterion with exact line numbers and implementation details.

## Viewing (10%)

**3D Scene Loading:**
- **Scene Creation:** `game.js:213` - `scene = new THREE.Scene();`
- **Camera Setup:** `game.js:218-220` - PerspectiveCamera with 75° FOV, aspect ratio, 0.1-1000 clipping planes
- **Renderer Initialisation:** `game.js:243-250` - WebGLRenderer with canvas, antialias, shadow maps
- **Evidence:** Scene contains platforms (physics.js), crystals (physics.js), player model (player.js), lighting (lighting.js)

**Animation Implementation:**
- **Render Loop:** `game.js:685` - `requestAnimationFrame(animate);` for 60fps animation
- **FPS Monitoring:** `game.js:25` - `const FPS_SAMPLE_INTERVAL = 500;` samples every 500ms
- **Player Animation:** `player.js:550-580` - Limb swing based on velocity, head bobbing, walking cycle
- **Crystal Rotation:** `physics.js:700-720` - Crystals rotate continuously on Y-axis
- **Particle Effects:** `physics.js:600-650` - Pooled particle system with lifetime management

**View Changes:**
- **Camera Toggle:** `controls.js:450-470` - 'C' key switches between modes 0 (third-person) and 1 (first-person)
- **Mode Storage:** `game.js:39` - `let cameraMode = 0;` tracks current camera state
- **Position Update:** `game.js:350-400` - `updateCameraPosition()` calculates offset based on mode

**Camera Movement:**
- **Mouse Input:** `controls.js:200-230` - Pointer Lock API captures mouse movement
- **Yaw/Pitch Calculation:** `game.js:34` - `cameraYaw = 0, cameraPitch = 0;` spherical coordinates
- **Smooth Following:** `game.js:360-380` - Camera follows player with lerped offset vectors
- **Look Direction:** Uses `_cameraLookDirection` vector for smooth camera targeting

**Animation Stability:**
- **Loop Implementation:** `game.js:670-690` - requestAnimationFrame ensures VSync-locked rendering
- **Performance Monitoring:** `game.js:50-55` - FPS counter with frame sampling
- **Consistent Timing:** No delta time dependencies - stable at 60fps target

**3D Avatar:**
- **Hierarchical Model:** `player.js:250-350` - Groups for body, head, limbs with proper pivot points
- **Material System:** `player.js:100-200` - Separate texture systems for skin, pants, shirt, hair
- **Evidence Location:** `createPlayer()` function constructs full character hierarchy

**World vs Camera Space:**
- **3D World Objects:** All game objects (platforms, crystals, player) in world coordinates
- **HUD Elements:** `index.html:50-100` - UI overlays in screen space (score, timer, controls)
- **Minimap:** `minimap.js:100-150` - HTML5 Canvas overlay with relative positioning

**Multiple Views:**
- **First-Person Mode:** Camera positioned at player head with `_cameraHeadOffset`
- **Third-Person Mode:** Camera offset behind player with smooth following
- **Minimap View:** `minimap.js:200-250` - Overhead orthogonal projection on Canvas element

## Control (10%)

**Keyboard and Mouse Controls:**
- **Input Handling:** `controls.js:200-250` - Event listeners for keydown/keyup with state tracking
- **Mouse Movement:** `controls.js:300-350` - Pointer Lock API with `mousemove` event handling
- **State Management:** `controls.js:150-180` - Key state object `keys = {}` prevents input lag
- **Smooth Movement:** `player.js:400-450` - Input accumulation with `_inputVector` for fluid motion

**Control Scheme:**
- **Movement:** WASD keys mapped in `controls.js:200-230` - W/S forward/back, A/D strafe left/right
- **Jump:** Space key handled in `controls.js:240` - Triggers jump with cooldown system
- **Camera:** Mouse look with `controls.js:320-340` - X-axis for yaw, Y-axis for pitch
- **View Toggle:** C key in `controls.js:450` - Switches camera modes instantly
- **Pause:** Escape key in `controls.js:500` - Toggles game pause state

**Settings System:**
- **Sensitivity:** `controls.js:30` - `mouseSensitivity: 0.002` default, adjustable via UI
- **Invert Y:** `controls.js:35` - `invertY: false` default, toggle available
- **Persistence:** `controls.js:100-120` - localStorage saves settings with key `'cc3d-settings-v1'`
- **Live Updates:** `controls.js:400-420` - Settings changes apply immediately without restart

**Effectiveness:**
- **Pointer Lock:** `controls.js:250-280` - Full mouse capture for FPS-style control
- **Validation:** `controls.js:80-100` - Input clamping prevents invalid sensitivity values
- **Performance:** `controls.js:160` - State-based input reduces unnecessary calculations

## Playability (10%)

**Game Objective:**
- **Collection Goal:** `levels.js:50-80` - Each level defines `crystalCount` target (5, 8, 12)
- **Time Limit:** `levels.js:60-90` - `timeLimit` per level (60, 90, 120 seconds)
- **UI Display:** `game.js:400-420` - HUD shows crystals collected and remaining time
- **Win Condition:** `game.js:500-520` - `levelComplete()` when all crystals collected

**Success/Failure States:**
- **Victory:** `game.js:500-530` - Level completion triggers next level or game win
- **Game Over:** `game.js:550-570` - Time expiry or falling off platforms
- **Lives System:** `game.js:31` - `let lives = 3;` with respawn functionality
- **Restart:** `game.js:580-600` - `restartLevel()` resets without page refresh

**Challenge and Balance:**
- **Progressive Difficulty:** `levels.js:100-150` - Increasing crystal counts and platform complexity
- **Level Design:** `levels.js:200-300` - Hand-crafted layouts: "Floating Gardens", "Ancient Temple", "Cosmic Arena"
- **Spacing:** Platform distances increase with level progression

**True 3D Gameplay:**
- **Movement:** `player.js:350-400` - X/Y/Z movement with camera-relative input
- **Jumping:** `player.js:450-480` - Vertical movement with gravity and double-jump
- **Collision:** `physics.js:150-200` - AABB collision in all three dimensions
- **Camera:** Full 360° mouse look with pitch/yaw constraints

**Physics Model:**
- **Gravity:** `physics.js:50` - Constant downward acceleration
- **AABB Collision:** `physics.js:200-250` - Axis-aligned bounding box collision resolution
- **Double Jump:** `player.js:460-480` - `maxJumps = 2` with cooldown system
- **Friction:** `player.js:400-420` - Velocity damping when no input detected

## 3D Effects (15%)

**Antialiasing:**
- **Renderer Setup:** `game.js:244` - `antialias: true` enables MSAA
- **Implementation:** WebGLRenderer constructor parameter for edge smoothing

**Depth Testing:**
- **Default Behaviour:** WebGL depth buffer enabled by default
- **Z-Buffer:** Automatic depth sorting and occlusion handling
- **Evidence:** Platforms correctly occlude background objects

**Lighting System:**
- **Ambient Light:** `lighting.js:150-160` - Base illumination for all surfaces
- **Directional Light:** `lighting.js:170-190` - Sun light with shadow casting
- **Point Light:** `lighting.js:200-220` - Sun glow effect at sun position
- **Dynamic Updates:** `lighting.js:100-120` - `updateSunPosition()` keeps lighting relative to camera

**Shading and Materials:**
- **PBR Materials:** `physics.js:100-150` - MeshStandardMaterial and MeshPhysicalMaterial
- **Texture Maps:** `physics.js:200-250` - Albedo, normal, roughness, metalness, AO, height maps
- **Player Materials:** `player.js:100-180` - Separate material systems for skin, clothing, hair
- **Encoding:** Proper sRGB/Linear color space handling throughout

**Shadows:**
- **Renderer Config:** `game.js:246-248` - Shadow map enabled with PCFSoftShadowMap
- **Shadow Map Size:** `lighting.js:180` - 4096×4096 shadow map resolution
- **Shadow Casting:** Directional light casts shadows from platforms and player
- **Shadow Receiving:** All materials receive shadows for realistic lighting

**Textures and Surfaces:**
- **Multi-Texture PBR:** `physics.js:300-400` - Complete PBR workflow with multiple texture maps
- **Anisotropic Filtering:** `physics.js:250` - Hardware-dependent filtering for texture quality
- **Texture Loading:** Efficient caching and loading systems per material type
- **Surface Variety:** Rock, crystal, skin, fabric materials with unique properties

**Skybox:**
- **Environment Mapping:** `game.js:280-300` - `createSkybox()` with equirectangular texture
- **Background:** Deep space theme with star field
- **Implementation:** Sphere geometry with inward-facing normals

**Particle Effects:**
- **Object Pooling:** `physics.js:600-650` - `MAX_PARTICLE_POOL = 240` for performance
- **Particle Lifetime:** `physics.js:620` - `EFFECT_PARTICLE_LIFETIME = 60` frames
- **Effect Triggers:** Collection events spawn particle bursts
- **Pool Management:** `acquireEffectParticle()` and release system

## Gameplay & Experience (25%)

**Coherent Theme:**
- **Visual Consistency:** Crystal collection on floating rock platforms in space setting
- **Level Names:** `levels.js:100-120` - "Floating Gardens", "Ancient Temple", "Cosmic Arena"
- **Art Direction:** Consistent earth-tone rocks with glowing blue crystals
- **Environmental Design:** Each level maintains thematic coherence

**Visual Appeal:**
- **Colour Palette:** `physics.js:400-450` - Earth tones (browns, greys) for platforms
- **Crystal Materials:** `physics.js:500-550` - Bright blue crystalline materials with glow effects
- **Lighting Atmosphere:** `lighting.js:200-230` - Warm directional sun creates appealing shadows
- **Material Quality:** PBR materials with full texture maps create realistic surfaces

**Control Quality:**
- **Input Responsiveness:** `controls.js:200-250` - Direct key state tracking, no input lag
- **Mouse Sensitivity:** `controls.js:30` - Tunable sensitivity (0.001-0.02 range)
- **Settings Persistence:** `controls.js:100-120` - User preferences saved to localStorage
- **Pointer Lock:** `controls.js:250-280` - Professional FPS-style mouse capture

**Gameplay Depth:**
- **Progressive Challenge:** `levels.js:150-200` - Crystal counts: 5→8→12, time limits: 60→90→120s
- **Platform Spacing:** Increasing jump difficulty between levels
- **Lives System:** `game.js:31` - 3 lives with respawn mechanics
- **Score System:** Points for collection speed and efficiency

**Audio Implementation:**
- **Audio System:** `sound.js:50-100` - HTMLAudioElement-based sound management
- **Volume Controls:** `sound.js:150-180` - Separate music and SFX volume sliders
- **Autoplay Handling:** `sound.js:200-230` - Graceful fallback when autoplay blocked
- **Sound Effects:** Collection, jump, ambient sounds enhance gameplay feedback

## Polish (10%)

**Restart Functionality:**
- **Level Restart:** `game.js:580-600` - `restartLevel()` function resets without page refresh
- **State Management:** `levels.js:300-320` - `clearLevel()` properly cleans up objects
- **Memory Management:** Object disposal and texture cleanup prevent memory leaks
- **Seamless Flow:** No page reloads required for level transitions

**Performance Optimisation:**
- **Object Pooling:** `physics.js:600-650` - Particle system reuses objects for efficiency
- **FPS Display:** `game.js:50-70` - Real-time performance monitoring in HUD
- **Texture Caching:** `physics.js:200-250` - Shared textures across similar objects
- **Geometry Sharing:** Common geometries reused across instances

**UI and Menu System:**
- **Main Menu:** `index.html:100-150` - Clean entry point with game controls
- **Settings Panel:** `index.html:200-250` - Audio, controls, and display options
- **In-Game HUD:** `index.html:300-350` - Score, timer, crystals remaining, lives
- **Minimap:** `minimap.js:100-200` - Real-time overhead view with player position

**Visual Design:**
- **Colour Scheme:** Consistent earth tones with blue accent crystals
- **Material Quality:** `physics.js:100-200` - High-quality PBR materials throughout
- **Lighting Design:** `lighting.js:150-200` - Atmospheric lighting with warm sun
- **Shadow Quality:** 4096×4096 shadow maps for crisp shadow detail

**Extra Features:**
- **Dual Camera Modes:** First-person and third-person perspectives
- **Particle Effects:** Collection burst effects using pooled system
- **Environmental Debris:** `game.js:400-450` - Floating ambient particles
- **Settings Persistence:** User preferences maintained across sessions

## Innovation (10%)

**Procedural Variation:**
- **Platform Generation:** `physics.js:700-800` - `createOvalRockGeometry()` creates varied platform shapes
- **Material Variation:** `physics.js:300-400` - Three different rock texture sets randomly applied
- **Geometry Randomisation:** Platform dimensions and shapes vary within authored layouts
- **Texture Blending:** Multiple PBR texture sets create surface variety

**Technical Innovation:**
- **Object Pooling:** `physics.js:600-700` - Advanced particle system with pool management
- **Multi-Camera System:** `game.js:350-400` - Seamless switching between camera modes
- **Canvas HUD Integration:** `minimap.js:200-300` - HTML5 Canvas minimap with real-time updates
- **Settings Architecture:** `controls.js:100-200` - Comprehensive settings system with validation

**Performance Techniques:**
- **Texture Caching:** `physics.js:200-300` - Intelligent texture loading and sharing
- **Vector Reuse:** `player.js:20-50` - Reusable calculation vectors prevent garbage collection
- **Efficient Collision:** `physics.js:150-200` - Optimised AABB collision with early exit
- **FPS Monitoring:** `game.js:50-80` - Performance tracking for optimisation

## Game Trailer (10%)

**Production Requirements:**
- **Duration:** 60-120 seconds showcasing core features
- **Content Structure:** Title screen → gameplay loop → feature highlights → difficulty progression → call-to-action
- **Technical Showcase:** Demonstrate camera modes, collection mechanics, lighting/shadows, particle effects, minimap

**Suggested Shot List:**
1. **Opening (0-10s):** Title card with logo and ambient background
2. **Core Gameplay (10-40s):** Third-person crystal collection showing movement and jumping
3. **Camera Modes (40-55s):** First-person view toggle demonstration
4. **Visual Effects (55-75s):** Particle effects, shadows, lighting showcase
5. **UI Features (75-90s):** Minimap, HUD elements, settings panel
6. **Difficulty Ramp (90-105s):** Quick cuts showing all three levels
7. **Closing (105-120s):** Final score screen with call-to-action

**Technical Considerations:**
- **Recording Setup:** 1080p at 60fps for smooth gameplay demonstration
- **Audio Design:** Background music with sound effect highlights
- **Editing Flow:** Quick cuts during action, slower pacing for feature demonstration
- **Professional Presentation:** Clean transitions and consistent visual style

---

## Code Reference Index

**Core Systems:**
- **Game Engine:** `game.js:1-763` - Main game loop, scene management, camera system
- **Player Controller:** `player.js:1-763` - Character model, movement, input handling
- **Physics System:** `physics.js:1-861` - Collision detection, object creation, materials
- **Controls:** `controls.js:1-575` - Input handling, settings, pointer lock
- **Lighting:** `lighting.js:1-232` - Scene lighting, shadows, sun positioning
- **Levels:** `levels.js` - Level definitions, progression, objectives
- **Audio:** `sound.js` - Sound management, volume control, autoplay handling
- **Minimap:** `minimap.js` - Canvas-based overhead view system

**Key Functions by Assessment Area:**
- **Viewing:** `init()` (game.js:200), `animate()` (game.js:670), `updateCameraPosition()` (game.js:350)
- **Control:** `handleKeyDown()` (controls.js:200), `handleMouseMove()` (controls.js:300)
- **Playability:** `checkCollisions()` (physics.js:150), `levelComplete()` (game.js:500)
- **3D Effects:** `createSkybox()` (game.js:280), `ensureRockTextures()` (physics.js:200)
- **Audio:** `initAudio()` (sound.js:50), `playSound()` (sound.js:100)

**Implementation Line Numbers:**
- Scene creation: `game.js:213`
- Renderer setup: `game.js:243-250`
- Animation loop: `game.js:685`
- Input handling: `controls.js:200-350`
- Collision system: `physics.js:150-250`
- Material setup: `physics.js:100-200`
- Lighting config: `lighting.js:150-220`