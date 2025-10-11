// Game state variables
const FPS_SAMPLE_INTERVAL = 500;

let scene, camera, renderer, gameStarted = false;
let player, playerVelocity = new THREE.Vector3();
let platforms = [], crystals = [], collectibles = [];
let keys = {}, cameraYaw = 0, cameraPitch = 0;
let currentLevel = 1, maxLevel = 3;
let collectedCrystals = 0, totalCrystals = 10;
let lives = 3, score = 0, gameTime = 60;
let gameTimer, levelStartTime;
let cameraMode = 0; // 0: third-person, 1: first-person
let particles = [];
let isJumping = false, jumpCooldown = 0;
let maxJumps = 2, jumpsRemaining = maxJumps;
let levelCompleteActive = false;
let skybox = null;
let skyUniforms = null;
let fpsElement = null;
let fpsFrameCount = 0;
let fpsLastUpdate = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
let loadingOverlay = null;
let loadingMessageEl = null;
let loadingHideTimer = null;
let debrisTexture = null;
let debrisMaterialTemplate = null;
let sharedDebrisGeometry = null;
let debrisTextures = null;
const debrisTextureLoader = new THREE.TextureLoader();
const _cameraLookDirection = new THREE.Vector3();
const _cameraHeadOffset = new THREE.Vector3(0, 2, 0);
const _cameraOffset = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _cameraTemp = new THREE.Vector3();

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function resetViewOrientation() {
    cameraYaw = 0;
    cameraPitch = 0;

    if (player) {
        player.rotation.set(0, 0, 0);
    }

    updateCameraPosition();
}

function showLoadingScreen(message = 'Preparing level...') {
    if (!loadingOverlay) return;

    if (loadingHideTimer) {
        clearTimeout(loadingHideTimer);
        loadingHideTimer = null;
    }

    loadingOverlay.classList.remove('hidden', 'fade-out');
    loadingOverlay.style.opacity = '1';
    if (loadingMessageEl && message) {
        loadingMessageEl.textContent = message;
    }
}

function hideLoadingScreen(delay = 250) {
    if (!loadingOverlay) return;

    if (loadingHideTimer) {
        clearTimeout(loadingHideTimer);
    }

    const fadeDuration = 220;
    loadingHideTimer = setTimeout(() => {
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.classList.remove('fade-out');
            loadingHideTimer = null;
        }, fadeDuration);
    }, Math.max(0, delay));
}


// Initialize Three.js scene
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    scene.fog = new THREE.Fog(0x200040, 50, 500);

    createSkybox();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();

    // Renderer setup with advanced features
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('renderCanvas'),
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0a2a, 1.0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    if (THREE && THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
    }

    // Setup lighting, environment, and controls
    setupLighting();
    setupControls();
    setupMinimap();
    setupRendererResizeHandling();

    fpsElement = document.getElementById('fpsCounter');
    loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingMessageEl = loadingOverlay.querySelector('p');
    }
    fpsLastUpdate = getTimestamp();

    // Start render loop
    animate();
    console.log('Crystal Collector 3D initialized');
}

function setupRendererResizeHandling() {
    window.handleRendererResize = () => {
        if (!camera || !renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize(width, height);
    };

    if (typeof window.handleRendererResize === 'function') {
        window.handleRendererResize();
    }
}

function createSkybox() {
    const loader = new THREE.TextureLoader();
    loader.load(
        'assets/space.jpg',
        texture => {
            texture.encoding = THREE.sRGBEncoding;
            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;
            skybox = texture;
            skyUniforms = null;
        },
        undefined,
        error => {
            console.warn('[Skybox] Failed to load space.jpg', error);
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
        sharedDebrisGeometry = new THREE.SphereGeometry(0.22, 14, 14);
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

function updateCameraPosition() {
    if (!player) return;

    _cameraLookDirection.set(
        Math.sin(cameraYaw) * Math.cos(cameraPitch),
        Math.sin(cameraPitch),
        -Math.cos(cameraYaw) * Math.cos(cameraPitch)
    ).normalize();

    switch (cameraMode) {
        case 0: {
            camera.up.set(0, 1, 0);
            const followDistance = 15;
            const verticalOffset = 8;
            _cameraOffset.copy(_cameraLookDirection).multiplyScalar(-followDistance);
            _cameraOffset.y += verticalOffset;
            if (_cameraOffset.y < 1) _cameraOffset.y = 1;

            camera.position.copy(player.position).add(_cameraOffset);

            _cameraTarget.copy(player.position).add(_cameraHeadOffset);
            _cameraTemp.copy(_cameraLookDirection).multiplyScalar(2);
            _cameraTarget.add(_cameraTemp);
            camera.lookAt(_cameraTarget);
            break;
        }
        case 1: {
            camera.up.set(0, 1, 0);
            _cameraTarget.copy(player.position).add(_cameraHeadOffset);
            camera.position.copy(_cameraTarget);
            _cameraTemp.copy(_cameraTarget).add(_cameraLookDirection);
            camera.lookAt(_cameraTemp);
            break;
        }
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

function animate() {
    requestAnimationFrame(animate);

    const now = getTimestamp();
    fpsFrameCount++;
    const elapsed = now - fpsLastUpdate;
    if (elapsed >= FPS_SAMPLE_INTERVAL) {
        const fps = (fpsFrameCount * 1000) / elapsed;
        if (fpsElement) {
            fpsElement.textContent = `${Math.round(fps)} FPS`;
        }
        fpsFrameCount = 0;
        fpsLastUpdate = now;
    }

    if (skyUniforms) {
        skyUniforms.time.value += 0.01;
    }

    if (gameStarted) {
        updatePlayer();
        updateAnimations();
    }

    if (typeof updateSunPosition === 'function') {
        updateSunPosition(camera ? camera.position : undefined);
    }

    if (renderer) {
        renderer.render(scene, camera);
    }
}

function getTimestamp() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
}

// Make restartGame available globally
window.restartGame = restartGame;

window.addEventListener('load', init);
