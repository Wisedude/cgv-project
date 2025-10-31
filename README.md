# Crystal Collector 3D

A 3D platformer game built with Three.js for a Computer Graphics and Visualisation course. Players navigate floating platforms in space, collecting power cores while avoiding hazards and managing time limits.

## What We Built

This is a web-based 3D game where you jump between platforms collecting crystals (power cores). It has three levels that get progressively harder, a story about being stranded in space, and various features to make the gameplay feel polished.

---

## Core Game Systems

### **Rendering & Graphics**
- **Three.js Scene Management**: Main render loop with scene, camera, and WebGL renderer
- **PBR Materials**: Physically-based materials with albedo, normal, roughness, metalness, and AO maps
- **Dynamic Lighting**: Ambient light, directional sun with shadows, point light glow effects
- **Shadow Mapping**: PCF soft shadows with configurable quality levels (1024-8192 resolution)
- **Space Environment**: Procedural skybox with gradient background
- **Graphics Quality Presets**: LOW, MEDIUM, HIGH, ULTRA settings that adjust shadows, anisotropy, and pixel ratio

### **Player Character**
- **Hierarchical Model**: Built from primitive shapes (boxes, cylinders) using THREE.Group for limb hierarchy
- **Textured Body Parts**: Separate PBR materials for skin, hair, shirt, and pants with full texture maps
- **Simple Animations**: Procedural walk cycle driven by velocity, idle head bob
- **Physics**: Velocity-based movement with gravity, friction, and double-jump mechanic
- **Death Effects**: Player shatters into debris shards with physics when falling or hitting hazards

### **Physics & Collision**
- **AABB Collision Detection**: Axis-aligned bounding box checks between player and platforms
- **Per-Axis Separation**: Resolves collisions by finding minimum overlap axis (X, Y, or Z)
- **Object Pooling**: Reusable particle pool (240 particles max) for collection effects and debris
- **Platform Geometry**: Procedural rock platforms with oval tops, tapered undersides, and randomized vertex noise

### **Level Design**
- **Data-Driven Levels**: Three authored levels with defined platform positions, sizes, and colors
  - **Level 1 (Crystal Caverns)**: 8 crystals, 60 seconds, beginner-friendly close platforms
  - **Level 2 (Sky Temples)**: 12 crystals, 60 seconds, longer jumps and branching paths
  - **Level 3 (Cosmic Realm)**: 15 crystals, 60 seconds, complex navigation and tight timing
- **Hazards**: Spike obstacles that damage the player on contact
- **Powerups**: Time beacons (add 15 seconds) and life capsules (add 1 life)
- **Level Progression**: Automatic loading between levels, cleanup of previous level objects

### **Audio**
- **HTMLAudioElement System**: Basic sound playback with volume control
- **Spatial Audio (Enhanced)**: Web Audio API implementation with 3D positioned sounds, HRTF panning, distance attenuation
- **Music Intensity**: Dynamic volume adjustment based on gameplay and performance
- **Environmental Sounds**: Procedural sound effects using oscillators for impacts and collection

### **Advanced Features**

#### **Enhanced Particles** (`enhanced-particles.js`)
- **Asteroid Field**: 15 rotating asteroids with random geometries, positioned around play area, subtle bobbing motion
- **Cosmic Dust**: 2,000 particles with varying colors (blues, purples, whites) using THREE.Points with additive blending
- **Space Debris**: 8 smaller objects drifting and rotating with wrap-around positioning
- **Sparkle Effects**: 100-particle system with custom shaders for collection feedback

#### **Story Manager** (`story-manager.js`)
- **Narrative Overlays**: Full-screen story dialogs with titles, text, and skip functionality
- **Mission Objectives**: Dynamic objective display that updates based on game progress
- **Notifications**: Timed popups for events (10-second duration, positioned left side)
- **Story Progression**: Tracks events like crystal collection, level completion, low health
- **Positioning System**: Intelligently places UI elements to avoid overlap with Mission Status panel

#### **Performance Monitor** (`performance-monitor.js`)
- **FPS Tracking**: Real-time frame rate calculation with performance grading (EXCELLENT/GOOD/MODERATE/POOR)
- **Render Statistics**: Displays draw calls, triangle count, memory usage, geometries, textures
- **Auto-Optimization**: Automatically reduces graphics quality when FPS drops below thresholds
- **Performance History**: Stores 60 seconds of performance data for analysis
- **Manual Optimization**: Provides immediate optimization trigger

#### **Graphics Settings** (`graphics-settings.js`)
- **Quality Presets**: Four preset levels plus custom configuration
- **Dynamic Shadow Adjustment**: Real-time shadow map size changes (1024-8192)
- **Anisotropic Filtering**: Configurable texture filtering (1x-16x)
- **Particle Count Control**: Adjusts particle system density based on performance
- **Settings Persistence**: LocalStorage for user preferences

### **User Interface**
- **Main Menu**: Start game, instructions, credits, settings
- **Pause Menu**: Resume, restart, settings, main menu
- **Settings Panel**: Tabbed interface for Audio, Controls, Graphics, Performance
- **HUD**: Crystal count with progress bar, lives, score, timer, level indicator
- **Minimap**: HTML5 Canvas 2D overlay showing player position and crystal locations
- **Performance Tracker**: Optional FPS/stats overlay

### **Controls & Input**
- **Keyboard**: WASD movement, Space jump, C camera toggle, ESC pause, R restart
- **Mouse**: Pointer Lock API for camera rotation, yaw/pitch control
- **Settings**: Adjustable mouse sensitivity, Y-axis inversion, volume controls
- **LocalStorage**: Saves all settings between sessions

---

## Technical Implementation Details

### **Texture System**
- **Multiple Texture Sets**: Separate loaders and caches for player (skin/hair/shirt/pants), platforms (rocks), crystals
- **PBR Workflow**: Each material uses 5+ texture maps (albedo, normal, roughness, metalness, AO)
- **Texture Encoding**: Proper sRGB encoding for color maps, linear for data maps
- **Anisotropic Filtering**: Hardware-based filtering for improved texture quality at angles
- **Material Instancing**: Shared geometries, cloned materials for performance

### **Camera System**
- **Third-Person Mode**: Camera follows behind player with configurable offset
- **First-Person Mode**: Camera at player head height with direct look direction
- **Spherical Coordinates**: Yaw and pitch angles for smooth camera rotation
- **Reusable Vectors**: Prevents garbage collection by reusing THREE.Vector3 instances

### **Game Loop**
- **requestAnimationFrame**: Browser-synced render loop (60 FPS target)
- **Update Sequence**: Player physics → animations → sun position → particles → audio → render
- **FPS Monitoring**: Samples every 500ms for performance tracking
- **State Management**: Global game state (started, paused, level complete, game over)

### **Memory Management**
- **Object Pooling**: Particles, debris shards reused instead of created/destroyed
- **Geometry Sharing**: Single geometries used by multiple meshes
- **Material Caching**: Materials loaded once and reused
- **Proper Cleanup**: Disposal of geometries/materials when changing levels

---

## File Structure

```
cgv-project/
├── index.html                    # Main HTML with UI structure and script loading
├── README.md                     # This file
├── assets/
│   ├── styles.css               # All game styling (menus, HUD, overlays)
│   ├── sound/                   # Audio files (jump, collect, ambient, etc.)
│   └── textures/
│       ├── crystal/             # Crystal PBR textures
│       ├── hair/                # Player hair textures
│       ├── pants/               # Player pants textures
│       ├── rock/                # Platform rock textures (multiple sets)
│       ├── shirt/               # Player shirt textures
│       └── skin/                # Player skin textures
└── scripts/
    ├── game.js                  # Core engine, scene setup, main loop
    ├── player.js                # Character model, movement, physics
    ├── physics.js               # AABB collision, platforms, crystals, materials
    ├── levels.js                # Level configs, loading, progression
    ├── lighting.js              # Light setup, sun positioning
    ├── controls.js              # Input handling, settings persistence
    ├── minimap.js               # 2D canvas overlay map
    ├── sound.js                 # Basic HTMLAudio playback
    ├── graphics-settings.js     # Quality presets, dynamic graphics adjustment
    ├── story-manager.js         # Narrative overlays, objectives, notifications
    ├── enhanced-particles.js    # Asteroids, cosmic dust, debris, sparkles
    ├── enhanced-audio.js        # Spatial 3D audio, music intensity
    └── performance-monitor.js   # FPS tracking, auto-optimization
```

---

## What Makes This Project Work

### **Modular Architecture**
Each script file handles one domain (player, physics, levels, etc.) with clear separation of concerns. Global variables connect systems, but functionality is encapsulated.

### **Performance Optimizations**
- Object pooling prevents garbage collection spikes
- Shared geometries reduce memory
- Quality presets allow scaling from low-end to high-end hardware
- Auto-optimization adjusts settings based on measured FPS

### **Progressive Enhancement**
- Core game works with basic features
- Enhanced systems (particles, spatial audio, story) layer on top
- Graceful degradation when features aren't supported

### **Data-Driven Design**
- Level layouts defined in configuration objects
- Texture paths and material properties in structured data
- Settings stored in LocalStorage as JSON

---

## Computer Graphics Concepts Demonstrated

- **Scene Graph**: Hierarchical object organization with parent/child relationships
- **Perspective Projection**: 3D to 2D transformation via camera matrix
- **Lighting Models**: Ambient + directional + point lights with shadow mapping
- **Texture Mapping**: UV coordinates, multiple texture types, proper color space handling
- **Collision Detection**: Bounding volume intersection testing and resolution
- **Animation**: Procedural motion via transforms, not keyframes
- **Materials**: PBR workflow with multiple texture maps for realistic surfaces
- **Performance**: FPS monitoring, optimization techniques, quality scaling

---

## Credits

**Learning Resources:**
- [Three.js Manual](https://threejs.org/manual/)
- [MDN 3D Game Tutorial](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js)
- [Codrops Interactive 3D Character](https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/)
- [CGV Coursebook](https://lamp.ms.wits.ac.za/~branden/CGV/_book/index.html)
- [Tuts+ Endless Runner](https://code.tutsplus.com/creating-a-simple-3d-endless-runner-game-using-three-js--cms-29157t)
- [Jérôme Etienne - How to Make a Game on the Web](https://jeromeetienne.github.io/slides/howtomakeagame-nextgamefrontier-2014/)

**Assets:**
- Sound effects: [Mixkit](https://mixkit.co/free-sound-effects/game), [Incompetech](https://incompetech.com/music/royalty-free/music.html)
- Textures: [TextureCan](https://www.texturecan.com)
- Skybox images: [Solar System Scope](https://www.solarsystemscope.com/textures)
