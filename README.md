# Crystal Collector 3D

A complete 3D web game built with Three.js, demonstrating advanced computer graphics concepts including real-time rendering, physics simulation and interactive gameplay mechanics.

## 🎮 Game Overview

Crystal Collector 3D is a 3D platformer where players navigate authored level layouts, collecting crystals while mastering physics-based movement and platform challenges. The game showcases practical 3D graphics programming techniques and modern web game development practices.

### Key Features

- **Advanced 3D Graphics**: PBR materials, dynamic lighting and real-time shadows
- **Physics-Based Gameplay**: Collision detection and movement mechanics
- **Multiple Camera Modes**: First-person and third-person perspectives
- **Data-Driven Levels**: Authored platform layouts with procedural variation in visuals
- **Audio**: HTMLAudioElement-based playback with dynamic volume control
- **Responsive Design**: Optimised for both desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Local web server (for CORS compliance)

### Running the Game

1. **Clone or download** this repository to your local machine

2. **Start a local web server** in the project directory:

   **Option 1: Using VS Code Live Server Extension (Recommended)**
   - Open the project folder in Visual Studio Code
   - Install the "Live Server" extension if not already installed
   - Right-click on `index.html` and select "Open with Live Server"
   - The game will automatically open in your default browser

   **Option 2: Using Python (if installed)**
   ```bash
   # For Python 3
   python -m http.server 8000
   
   # For Python 2
   python -m SimpleHTTPServer 8000
   ```
   Then navigate to `http://localhost:8000` in your browser

   **Option 3: Using Node.js (if installed)**
   ```bash
   npx http-server
   ```

3. **Play the game** - Use WASD for movement, Space to jump and mouse to look around

### Game Controls

- **Movement**: WASD keys
- **Jump**: Spacebar (double-jump available)
- **Camera Look**: Mouse movement
- **Camera Mode**: C key (toggle between first-person and third-person)
- **Settings**: Accessible through the main menu
- **Pause**: ESC key

## 🎯 Gameplay Objectives

### Level Progression
- **Level 1 - Crystal Caverns**: Collect 8 crystals in underground caverns (60 seconds)
- **Level 2 - Sky Temples**: Collect 12 crystals in floating temples (60 seconds)  
- **Level 3 - Cosmic Realm**: Collect 15 crystals in space platforms (60 seconds)

### Scoring System
- **Crystal Collection**: Points awarded for each crystal collected
- **Time Bonus**: Faster completion yields higher scores
- **Lives System**: 3 lives per game session

## 🏗️ Technical Architecture

This game demonstrates computer graphics and game development concepts:

- **Rendering Engine**: Three.js WebGL implementation
- **Physics Simulation**: Custom AABB collision detection
- **Audio System**: HTMLAudioElement-based audio playback
- **Performance Optimisation**: Object pooling and efficient resource management

**For detailed technical information, see [ARCHITECTURE.md](ARCHITECTURE.md)**

## 🎨 Visual Features

- **PBR Materials**: Physically based rendering with multiple texture maps
- **Dynamic Lighting**: Real-time shadows with PCF soft shadow mapping
- **Particle Effects**: Collection effects and environmental particles
- **Procedural Generation**: Unique platform shapes and textures
- **Post-Processing Ready**: Architecture supports future visual enhancements

## 🖥️ System Requirements

### Minimum Requirements
- **Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Graphics**: WebGL 1.0 support
- **Memory**: 2GB RAM
- **Storage**: 50MB available space

### Recommended Requirements
- **Browser**: Latest version of Chrome, Firefox, or Edge
- **Graphics**: Dedicated GPU with WebGL 2.0 support
- **Memory**: 4GB RAM
- **Network**: Broadband connection for asset loading

## 🐛 Troubleshooting

### Common Issues

**Game doesn't load:**
- Ensure you're running a local web server (not opening file:// directly)
- Check browser console for error messages
- Verify WebGL support: visit https://get.webgl.org/

**Poor performance:**
- Close other browser tabs and applications
- Update graphics drivers
- Lower browser zoom level
- Check FPS counter in top-left corner

**Audio not working:**
- Click anywhere in the game window to enable audio
- Check browser audio permissions
- Ensure system volume is not muted

**Controls not responding:**
- Click on the game canvas to focus
- Check if Pointer Lock is supported and enabled
- Try refreshing the page

## 🗂️ Project Structure

```
cgv-project/
├── index.html              # Main game HTML
├── README.md               # Project documentation
├── ARCHITECTURE.md         # Technical architecture details
├── assets/                 # Game assets
│   ├── styles.css         # Game styling
│   ├── sound/             # Audio files
│   └── textures/          # 3D textures
│       ├── crystal/       # Crystal material textures
│       ├── hair/          # Character hair textures
│       ├── pants/         # Character clothing textures
│       ├── rock/          # Rock/stone textures
│       ├── shirt/         # Character shirt textures
│       └── skin/          # Character skin textures
└── scripts/               # Core game systems
    ├── game.js           # Main game engine
    ├── player.js         # Character system
    ├── physics.js        # Physics and collision
    ├── lighting.js       # Lighting system
    ├── levels.js         # Level management
    ├── controls.js       # Input handling
    ├── minimap.js        # 2D navigation
    └── sound.js          # Audio system
```

## 🎓 Educational Context

This project was developed as part of a Computer Graphics and Visualisation (CGV) course, demonstrating practical application of:

- **3D Mathematics**: Vector operations, matrix transformations, quaternions
- **Computer Graphics**: Rendering pipeline, lighting models, texture mapping
- **Game Development**: Physics simulation, collision detection, audio integration
- **Web Technologies**: WebGL, HTML5 Canvas, HTMLAudioElement
- **Software Architecture**: Modular design, performance optimisation, error handling

## 📚 Learning Resources

The implementation follows concepts from:
- [Three.js Manual](https://threejs.org/manual/)
- [MDN 3D Game Tutorial](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web/Building_up_a_basic_demo_with_Three.js)
- [Interactive 3D Character Tutorial](https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/)
- [CGV Coursebook](https://lamp.ms.wits.ac.za/~branden/CGV/_book/index.html)
- [Tuts+ Endless Runner with Three.js](https://code.tutsplus.com/creating-a-simple-3d-endless-runner-game-using-three-js--cms-29157t)
- [How to Make a Game on the Web - Jérôme Etienne](https://jeromeetienne.github.io/slides/howtomakeagame-nextgamefrontier-2014/)

## 🎵 Audio Credits
- Sound effects sourced from [Mixkit](https://mixkit.co/free-sound-effects/game), and [Incompetech](https://incompetech.com/music/royalty-free/music.html)

## Texture Credits
- Textures sourced from [TextureCan](https://www.texturecan.com)

## Photo Credits
- Photos sourced from [Solar System Scope](https://www.solarsystemscope.com/textures)

## 🤝 Contributing

This is an educational project developed for academic assessment. For technical questions or discussions about the implementation, please refer to the detailed architecture documentation.

## 📜 License
This project is developed for educational purposes as part of academic coursework. All assets and code are created for learning and demonstration purposes.

---

**Enjoy exploring the world of 3D web graphics with Crystal Collector 3D!** 🎮✨