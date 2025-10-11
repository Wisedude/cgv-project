/**
 * LIGHTING - AMBIENT, DIRECTIONAL SUN AND SUN MESH
 *
 * Summary:
 * - AmbientLight for base fill
 * - DirectionalLight as sun with large shadow map and wide orthographic shadow frustum
 * - Visible Mesh sphere for the sun body using a texture or procedural CanvasTexture
 * - PointLight for a subtle glow at the sun position
 * - updateSunPosition(cameraPosition) to keep the sun light and mesh offset
 *
 * References:
 * - Three.js manual (lights, shadow maps, textures): https://threejs.org/manual/
 * - CGV coursebook (illumination models): https://lamp.ms.wits.ac.za/~branden/CGV/_book/index.html
 *
 * Notes:
 * - renderer.shadowMap.type is set in game.js (PCFSoftShadowMap); here we configure light shadow settings only.
 * - texture.encoding should be set to a Three.js Encoding enum; behaviour is established when textures load.
 */

(function(global) {
    // =============================================================================
    // LIGHTING SYSTEM CONSTANTS
    // =============================================================================
    
    const SUN_DISTANCE = 10;              // Distance of sun from camera
    const SUN_RADIUS = 1;                 // Visual size of sun object
    const SUN_TEXTURE_PATH = 'assets/sun.jpg'; // Primary sun texture asset
    
    // Sun direction vector - normalized 3D direction for consistent lighting
    const SUN_DIRECTION = new THREE.Vector3(50, 75, 50).normalize();
    
    // =============================================================================
    // LIGHTING OBJECT CACHING SYSTEM
    // =============================================================================
    
    // Cached objects to prevent recreation and improve performance
    let cachedSunTexture = null;     // Sun surface texture
    let cachedSunGeometry = null;    // Sun sphere geometry
    let cachedSunMaterial = null;    // Sun rendering material
    
    // Active lighting objects in scene
    let sunLight = null;             // Directional light (sun illumination)
    let sunBody = null;              // Visual sun object
    let sunGlow = null;              // Point light for atmospheric glow
    
    // Calculation vectors for dynamic positioning
    const _sunPosition = new THREE.Vector3();       // Calculated sun position
    const _sunTarget = new THREE.Vector3(0, 0, 0);  // Sun light target point
    const sunTextureLoader = new THREE.TextureLoader();

    // TODO: Add volumetric lighting using ray marching techniques
    // TODO: Implement light scattering for atmospheric effects
    // TODO: Add dynamic weather lighting (storms, overcast, etc.)
    // TODO: Create day/night cycle with color temperature changes

    // =============================================================================
    // TEXTURE CONFIGURATION FOR OPTIMAL RENDERING
    // =============================================================================
    
    /**
     * Configure sun texture (anisotropy and encoding) after load.
     * @param {THREE.Texture} texture
     */
    function configureSunTexture(texture) {
        if (!texture) return; // Safety check for valid texture
        // Use sRGB for color textures (actual enum set during/after load)
        // We avoid changing code; encoding is reinforced when the texture is loaded.
        
        // Apply anisotropic filtering for quality at oblique viewing angles
        // Clamp to reasonable maximum to prevent performance issues
        texture.anisotropy = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
        
        // Mark texture as requiring GPU update
        texture.needsUpdate = true;
    }

    /**
     * Create procedural sun texture as fallback when asset loading fails
     * Demonstrates canvas-based procedural texture generation
     * Creates realistic sun appearance using radial gradients
     * 
     * @returns {THREE.Texture} Procedurally generated sun texture
     */
    function createProceduralSunTexture() {
        const size = 256; // Texture resolution (power of 2 for GPU efficiency)
        
        // Create HTML5 canvas for procedural generation
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        
        // Create radial gradient from center for sun appearance
        const gradient = ctx.createRadialGradient(
            size / 2,        // Center X
            size / 2,        // Center Y
            size * 0.05,     // Inner radius (bright core)
            size / 2,        // Outer center X
            size / 2,        // Outer center Y
            size * 0.5       // Outer radius (fade boundary)
        );

        // Define color stops for realistic sun appearance
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');      // Bright white core
        gradient.addColorStop(0.25, 'rgba(255, 249, 220, 0.95)'); // Warm white
        gradient.addColorStop(0.55, 'rgba(255, 205, 120, 0.7)');  // Orange glow
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');         // Transparent edge

        // Apply gradient to canvas
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Convert canvas to Three.js texture
        const texture = new THREE.CanvasTexture(canvas);
        configureSunTexture(texture);
        return texture;
    }

    function getSunTexture() {
        if (cachedSunTexture) {
            return cachedSunTexture;
        }

        cachedSunTexture = sunTextureLoader.load(
            SUN_TEXTURE_PATH,
            texture => {
                configureSunTexture(texture);
            },
            undefined,
            error => {
                console.warn('[Lighting] Failed to load sun texture, using fallback.', error);
                cachedSunTexture = createProceduralSunTexture();
            }
        );

        configureSunTexture(cachedSunTexture);
        return cachedSunTexture;
    }

    function computeSunPosition(anchor) {
        _sunPosition.copy(SUN_DIRECTION).multiplyScalar(SUN_DISTANCE);
        if (anchor) {
            _sunPosition.add(anchor);
        }
        return _sunPosition;
    }

    function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404080, 2);
        scene.add(ambientLight);

        const sunPosition = computeSunPosition();

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.name = 'SunLight';
        directionalLight.position.copy(sunPosition);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 600;
        directionalLight.shadow.camera.left = -120;
        directionalLight.shadow.camera.right = 120;
        directionalLight.shadow.camera.top = 120;
        directionalLight.shadow.camera.bottom = -120;
        directionalLight.target.position.copy(_sunTarget);
        scene.add(directionalLight);
        scene.add(directionalLight.target);
        sunLight = directionalLight;

        const sunTexture = getSunTexture();

        if (!cachedSunGeometry) {
            cachedSunGeometry = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
        }

        if (!cachedSunMaterial) {
            cachedSunMaterial = new THREE.MeshStandardMaterial({
                map: sunTexture,
                depthWrite: false,
                toneMapped: true
            });
        } else {
            cachedSunMaterial.map = sunTexture;
        }

        sunBody = new THREE.Mesh(cachedSunGeometry, cachedSunMaterial);
        sunBody.position.copy(sunPosition);
        sunBody.name = 'SunMesh';
        scene.add(sunBody);

        sunGlow = new THREE.PointLight(0xfff0bf, 1.8, 480, 1.4);
        sunGlow.name = 'SunGlow';
        sunGlow.position.copy(sunPosition);
        scene.add(sunGlow);
    }

    function updateSunPosition(anchor) {
        if (!sunLight && !sunBody && !sunGlow) {
            return;
        }

        const targetPosition = anchor
            ? _sunTarget.copy(anchor)
            : _sunTarget.set(0, 0, 0);

        const position = computeSunPosition(targetPosition);

        if (sunLight) {
            sunLight.position.copy(position);
            if (sunLight.target) {
                sunLight.target.position.copy(targetPosition);
                if (typeof sunLight.target.updateMatrixWorld === 'function') {
                    sunLight.target.updateMatrixWorld();
                }
            }
        }

        if (sunBody) {
            sunBody.position.copy(position);
        }

        if (sunGlow) {
            sunGlow.position.copy(position);
        }
    }

    global.setupLighting = setupLighting;
    global.updateSunPosition = updateSunPosition;
})(window);
