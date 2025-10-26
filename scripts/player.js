/**
 * PLAYER - HIERARCHICAL MODEL AND CONTROLLER
 *
 * Summary:
 * - Character assembled from primitives with Group pivots for limbs
 * - MeshStandardMaterial with multiple texture maps per body part
 * - Simple walking animation driven by velocity plus head idle
 * - Movement with friction, gravity, double jump and AABB collisions
 *
 * References:
 * - CGV coursebook (hierarchical modelling and forward kinematics): https://lamp.ms.wits.ac.za/~branden/CGV/_book/index.html
 * - Three.js manual (materials, texture encodings, scene graph): https://threejs.org/manual/
 * - Codrops interactive character (camera and input feel): https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/
 *
 * Notes:
 * - No skinning/skeletons - limb motion uses Group pivots.
 * - No subsurface scattering or anisotropic hair - materials are MeshStandardMaterial with maps.
 */

(function (global) {
    // =============================================================================
    // MOVEMENT AND PHYSICS CALCULATION VECTORS
    // =============================================================================
    
    // Reusable vectors to prevent garbage collection during gameplay
    // This optimization technique improves performance by avoiding object creation
    const _inputVector = new THREE.Vector3();      // Raw input direction
    const _cameraDirection = new THREE.Vector3();  // Camera forward direction
    const _cameraRight = new THREE.Vector3();      // Camera right direction  
    const _movement = new THREE.Vector3();         // Final movement vector
    const _newPosition = new THREE.Vector3();      // Calculated next position
    const _lookDir = new THREE.Vector3();          // Player look direction
    const _upVector = new THREE.Vector3(0, 1, 0);  // World up vector (Y-axis)

    // =============================================================================
    
    // Active visual shards created when player dies (bust into pieces)
    const activeShards = [];
    const shardGravity = -0.03;
    // Helper to remove shard mesh from scene and array
    function _removeShard(index) {
        const s = activeShards[index];
        if (!s) return;
        try { scene.remove(s.mesh); } catch (e) {}
        activeShards.splice(index, 1);
    }
    // TEXTURE MANAGEMENT SYSTEM
    // =============================================================================
    // Prevent multiple death triggers while a death burst / respawn is in progress
    let isDying = false;
    
    // Separate texture systems for different body parts
    // This modular approach allows independent material customization
    let skinTextures = null;        // Facial and skin textures
    let cachedSkinMaterial = null;  // Compiled skin material
    const skinTextureLoader = new THREE.TextureLoader();
    
    let pantsTextures = null;       // Lower body clothing textures
    let cachedPantsMaterial = null; // Compiled pants material  
    const pantsTextureLoader = new THREE.TextureLoader();
    
    let shirtTextures = null;       // Upper body clothing textures
    let cachedShirtMaterial = null; // Compiled shirt material
    const shirtTextureLoader = new THREE.TextureLoader();
    
    let hairTextures = null;        // Hair/head covering textures
    let cachedHairMaterial = null;  // Compiled hair material
    const hairTextureLoader = new THREE.TextureLoader();
    
    // TODO: Add accessory texture system (glasses, hats, jewelry)
    // TODO: Implement texture atlas for better performance
    // TODO: Add procedural texture variation for character customization

    // =============================================================================
    // TEXTURE CONFIGURATION AND OPTIMIZATION
    // =============================================================================
    
    /**
     * Get maximum anisotropic filtering value supported by hardware
     * Anisotropic filtering improves texture quality at oblique viewing angles
     * Essential for character textures viewed from various camera positions
     * 
     * @returns {number} Maximum anisotropy value (1-16 typically)
     */
    function getRendererAnisotropy() {
        const renderer = global.renderer;
        return renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1;
    }

    /**
     * Configure skin texture with optimal settings for character rendering
     * Demonstrates proper texture setup for organic surfaces
     * 
     * @param {THREE.Texture} texture - Texture to configure
     * @param {number} encoding - Color space encoding (sRGB or Linear)
     */
    function configureSkinTexture(texture, encoding) {
        if (!texture) return; // Safety check for valid texture
        
        // Apply hardware-dependent anisotropic filtering for quality
        texture.anisotropy = getRendererAnisotropy();
        
        // Set appropriate color space encoding
        if (encoding) {
            texture.encoding = encoding;
        }
        
        // Mark texture as requiring GPU upload
        texture.needsUpdate = true;
    }

    /**
     * Load and configure skin texture with proper error handling
     * Implements asynchronous texture loading for smooth user experience
     * 
     * @param {string} filename - Texture filename in skin directory
     * @param {number} encoding - Color space encoding
     * @returns {THREE.Texture} Configured texture object
     */
    function loadSkinTexture(filename, encoding) {
        const texture = skinTextureLoader.load(
            `assets/textures/skin/${filename}`,
            () => configureSkinTexture(texture, encoding) // Configure on load completion
        );
        configureSkinTexture(texture, encoding); // Immediate configuration
        return texture;
    }

    function configurePantsTexture(texture, encoding) {
        if (!texture) return;
        texture.anisotropy = getRendererAnisotropy();
        if (encoding) {
            texture.encoding = encoding;
        }
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.needsUpdate = true;
    }

    function loadPantsTexture(filename, encoding) {
        const texture = pantsTextureLoader.load(
            `assets/textures/pants/${filename}`,
            () => configurePantsTexture(texture, encoding)
        );
        configurePantsTexture(texture, encoding);
        return texture;
    }

    function configureShirtTexture(texture, encoding) {
        if (!texture) return;
        texture.anisotropy = getRendererAnisotropy();
        if (encoding) {
            texture.encoding = encoding;
        }
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.needsUpdate = true;
    }

    function loadShirtTexture(filename, encoding) {
        const texture = shirtTextureLoader.load(
            `assets/textures/shirt/${filename}`,
            () => configureShirtTexture(texture, encoding)
        );
        configureShirtTexture(texture, encoding);
        return texture;
    }

    function configureHairTexture(texture, encoding) {
        if (!texture) return;
        texture.anisotropy = getRendererAnisotropy();
        if (encoding) {
            texture.encoding = encoding;
        }
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.needsUpdate = true;
    }

    function loadHairTexture(filename, encoding) {
        const texture = hairTextureLoader.load(
            `assets/textures/hair/${filename}`,
            () => configureHairTexture(texture, encoding)
        );
        configureHairTexture(texture, encoding);
        return texture;
    }

    // =============================================================================
    // PBR MATERIAL SYSTEM IMPLEMENTATION
    // =============================================================================
    
    /**
     * Load and cache complete skin texture set for PBR rendering
     * Demonstrates multi-texture PBR workflow following industry standards
     * 
     * PBR Texture Types:
     * - Albedo (Color): Base surface color information
     * - Normal: Surface detail without additional geometry
     * - Roughness: Surface microsurface roughness variation
     * - AO (Ambient Occlusion): Self-shadowing for depth enhancement
     * 
     * Connection to Course Materials:
     * - Implements PBR concepts from Three.js manual Chapter 5
     * - Follows material workflow described in CGV coursebook
     * 
     * @returns {Object} Complete texture set for skin material
     */
    function ensureSkinTextures() {
        if (skinTextures) return skinTextures; // Return cached textures if available

        skinTextures = {
            color: loadSkinTexture('skin_0001_color_64.jpg', true),      // Albedo (sRGB)
            normal: loadSkinTexture('skin_0001_normal_opengl_64.png'),   // Normal map (Linear)
            roughness: loadSkinTexture('skin_0001_roughness_64.jpg'),    // Roughness map (Linear)
            ao: loadSkinTexture('skin_0001_ao_64.jpg')                   // Ambient occlusion (Linear)
        };

        return skinTextures;
    }

    /**
     * Load fabric textures for pants with tiling support
     * Demonstrates textile material properties for realistic clothing
     * 
     * @returns {Object} Complete texture set for pants material
     */
    function ensurePantsTextures() {
        if (pantsTextures) return pantsTextures;

        pantsTextures = {
            color: loadPantsTexture('fabrics_0082_color_64.jpg', true),     // Fabric color
            normal: loadPantsTexture('fabrics_0082_normal_opengl_64.png'),  // Fabric weave detail
            roughness: loadPantsTexture('fabrics_0082_roughness_64.jpg'),   // Surface roughness
            ao: loadPantsTexture('fabrics_0082_ao_64.jpg'),                 // Shadow detail
            height: loadPantsTexture('fabrics_0082_height_64.png')          // Surface displacement
        };

        return pantsTextures;
    }

    // TODO: Add texture compression for mobile device optimization
    // TODO: Implement texture streaming for large character customization systems
    // TODO: Add procedural texture blending for wear and damage effects

    function ensureShirtTextures() {
        if (shirtTextures) return shirtTextures;

        shirtTextures = {
            color: loadShirtTexture('fabrics_0083_color_64.jpg', true),
            normal: loadShirtTexture('fabrics_0083_normal_opengl_64.png'),
            roughness: loadShirtTexture('fabrics_0083_roughness_64.jpg'),
            ao: loadShirtTexture('fabrics_0083_ao_64.jpg'),
            height: loadShirtTexture('fabrics_0083_height_64.png')
        };

        return shirtTextures;
    }

    function ensureHairTextures() {
        if (hairTextures) return hairTextures;

        hairTextures = {
            color: loadHairTexture('fabrics_0059_color_64.jpg', true),
            normal: loadHairTexture('fabrics_0059_normal_opengl_64.png'),
            roughness: loadHairTexture('fabrics_0059_roughness_64.jpg'),
            ao: loadHairTexture('fabrics_0059_ambient_occlusion_64.jpg'),
            height: loadHairTexture('fabrics_0059_height_64.png')
        };

        return hairTextures;
    }

    function ensureGeometryUV2(geometry) {
        if (!geometry || !geometry.attributes) return;
        if (geometry.attributes.uv2) return;

        const uvAttr = geometry.attributes.uv;
        if (!uvAttr) return;

        const uv2Array = uvAttr.array.slice(0);
        geometry.setAttribute('uv2', new THREE.BufferAttribute(uv2Array, 2));
    }

    function getSkinMaterial() {
        if (cachedSkinMaterial) return cachedSkinMaterial;

        const textures = ensureSkinTextures();
        cachedSkinMaterial = new THREE.MeshStandardMaterial({
            map: textures.color,
            normalMap: textures.normal,
            roughnessMap: textures.roughness,
            aoMap: textures.ao,
            roughness: 0.55,
            metalness: 0
        });
        cachedSkinMaterial.aoMapIntensity = 1;
        cachedSkinMaterial.name = 'PlayerSkin';

        return cachedSkinMaterial;
    }

    function getPantsMaterial() {
        if (cachedPantsMaterial) return cachedPantsMaterial;

        const textures = ensurePantsTextures();
        cachedPantsMaterial = new THREE.MeshStandardMaterial({
            map: textures.color,
            normalMap: textures.normal,
            roughnessMap: textures.roughness,
            aoMap: textures.ao,
            bumpMap: textures.height,
            transparent: false,
            opacity: 1,
            roughness: 0.7,
            metalness: 0.05
        });
        cachedPantsMaterial.aoMapIntensity = 0.9;
        if (cachedPantsMaterial.normalMap) {
            cachedPantsMaterial.normalScale.set(0.6, 0.6);
        }
        if (cachedPantsMaterial.bumpMap) {
            cachedPantsMaterial.bumpScale = 0.03;
        }
        cachedPantsMaterial.name = 'PlayerPants';

        return cachedPantsMaterial;
    }

    function getShirtMaterial() {
        if (cachedShirtMaterial) return cachedShirtMaterial;

        const textures = ensureShirtTextures();
        cachedShirtMaterial = new THREE.MeshStandardMaterial({
            map: textures.color,
            normalMap: textures.normal,
            roughnessMap: textures.roughness,
            aoMap: textures.ao,
            bumpMap: textures.height,
            roughness: 0.6,
            metalness: 0.1
        });
        cachedShirtMaterial.aoMapIntensity = 0.95;
        if (cachedShirtMaterial.normalMap) {
            cachedShirtMaterial.normalScale.set(0.5, 0.5);
        }
        if (cachedShirtMaterial.bumpMap) {
            cachedShirtMaterial.bumpScale = 0.04;
        }
        cachedShirtMaterial.name = 'PlayerShirt';

        return cachedShirtMaterial;
    }

    function getHairMaterial() {
        if (cachedHairMaterial) return cachedHairMaterial;

        const textures = ensureHairTextures();
        cachedHairMaterial = new THREE.MeshStandardMaterial({
            map: textures.color,
            normalMap: textures.normal,
            roughnessMap: textures.roughness,
            aoMap: textures.ao,
            bumpMap: textures.height,
            roughness: 0.85,
            metalness: 0.02
        });
        cachedHairMaterial.aoMapIntensity = 0.8;
        if (cachedHairMaterial.normalMap) {
            cachedHairMaterial.normalScale.set(0.4, 0.4);
        }
        if (cachedHairMaterial.bumpMap) {
            cachedHairMaterial.bumpScale = 0.02;
        }
        cachedHairMaterial.name = 'PlayerHair';

        return cachedHairMaterial;
    }

    function invokeAudio(method) {
        const manager = global.audioManager;
        if (manager && typeof manager[method] === "function") {
            try {
                manager[method]();
            } catch (err) {
                console.warn(`[Audio] Failed to invoke ${method}`, err);
            }
        }
    }

    // Create a burst of small shards (boxes) at `position` to simulate player busting
    function playDeathBurst(position, count = 24) {
        if (!position) position = player ? player.position.clone() : new THREE.Vector3();

        // Choose base material colors from player materials to make shards feel like pieces
        const baseMats = [];
        try {
            baseMats.push(getShirtMaterial());
            baseMats.push(getPantsMaterial());
            baseMats.push(getSkinMaterial());
            baseMats.push(getHairMaterial());
        } catch (e) {}

        for (let i = 0; i < count; i++) {
            const size = Math.random() * 0.18 + 0.06;
            const geom = new THREE.BoxGeometry(size, size, size);

            // pick a color from one of the base materials, fallback to white
            const src = baseMats[Math.floor(Math.random() * baseMats.length)];
            const color = (src && src.color) ? src.color.clone() : new THREE.Color(0xffffff);

            const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.05, transparent: true, opacity: 1 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.position.copy(position);
            // small random offset so shards don't all start at same point
            mesh.position.x += (Math.random() - 0.5) * 0.6;
            mesh.position.y += (Math.random() - 0.5) * 0.6;
            mesh.position.z += (Math.random() - 0.5) * 0.6;

            scene.add(mesh);

            const velocity = new THREE.Vector3((Math.random() - 0.5) * 0.9, Math.random() * 1.2 + 0.4, (Math.random() - 0.5) * 0.9);
            activeShards.push({ mesh, material: mat, velocity, life: 80 + Math.floor(Math.random() * 60) });
        }
    }

    // =============================================================================
    // HIERARCHICAL CHARACTER MODEL CONSTRUCTION
    // =============================================================================
    
    /**
     * Create complete 3D character model with hierarchical structure
     * Demonstrates advanced Three.js modeling techniques and parent-child relationships
     * Implements forward kinematics for realistic character animation
     * 
     * Connection to Course Materials:
     * - Follows hierarchical modeling from CGV coursebook Chapter 4
     * - Implements Three.js character creation tutorial patterns
     * - Demonstrates transform hierarchy for animation systems
     * 
     * Character Hierarchy:
     * PlayerGroup (root)
     * ├── Torso (main body)
     * │   ├── Head
     * │   │   ├── Eyes (left/right)
     * │   │   └── Hair
     * │   ├── Arms (left/right pivots)
     * │   │   └── Arm meshes
     * │   └── Legs (left/right pivots)
     * │       ├── Leg meshes
     * │       └── Feet (pivot points)
     * │           └── Foot meshes
     */
    function createPlayer() {
        // =============================================================================
        // ROOT TRANSFORM GROUP
        // =============================================================================
        const playerGroup = new THREE.Group(); // Root container for entire character
        playerGroup.position.set(0, 5, 0);     // Starting position above ground
        
        // =============================================================================
        // MATERIAL PREPARATION
        // =============================================================================
        // Load and cache all required materials for character parts
    const skinMaterial = getSkinMaterial();   // Skinned color/normal/roughness/AO
        const pantsMaterial = getPantsMaterial(); // Fabric material with appropriate roughness
        const shirtMaterial = getShirtMaterial(); // Clothing material with fabric properties
    const hairMaterial = getHairMaterial();   // Hair cap material using fabric-like maps

        // =============================================================================
        // TORSO CONSTRUCTION (Main Body)
        // =============================================================================
        const torsoGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6); // Body proportions
        ensureGeometryUV2(torsoGeometry); // Ensure UV2 coordinates for ambient occlusion
        const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
        
        // Enable shadow casting and receiving for realistic lighting
        torso.castShadow = true;
        torso.receiveShadow = true;
        playerGroup.add(torso); // Attach to root group

        // =============================================================================
        // HEAD CONSTRUCTION (Spherical Head with Features)
        // =============================================================================
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 12); // Smooth sphere approximating head
        ensureGeometryUV2(headGeometry);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.set(0, 1.4, 0); // Position above torso
        head.castShadow = true;
        head.receiveShadow = true;
        torso.add(head); // Attach to torso (inherits torso transformations)

        // =============================================================================
        // FACIAL FEATURES (Eyes)
        // =============================================================================
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Unlit eyes for readability

        // Left eye positioned relative to head center
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 0.1, 0.4); // Left side, slightly up, forward
        head.add(leftEye);

        // Right eye with symmetric positioning
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 0.1, 0.4); // Right side, slightly up, forward
        head.add(rightEye);

        // TODO: Add dynamic eye movement following camera/targets
        // TODO: Implement blinking animation using scale or texture swapping
        // TODO: Add pupils with reflection highlights

        // =============================================================================
        // HAIR CONSTRUCTION
        // =============================================================================
        const hairGeometry = new THREE.SphereGeometry(0.52, 12, 8);
        ensureGeometryUV2(hairGeometry);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 0.2, -0.1); // Slightly back and up from head center
        hair.scale.set(1, 0.6, 1);       // Flatten vertically for hair-like shape
        head.add(hair);

        // TODO: Implement hair physics simulation using constraints
        // TODO: Add multiple hair styles with different geometries
        // TODO: Create hair shader with anisotropic highlighting

        // =============================================================================
        // ARM CONSTRUCTION (Forward Kinematics Chain)
        // =============================================================================
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.18, 1.4, 12); // upper limbs
        ensureGeometryUV2(armGeometry);

        // LEFT ARM SYSTEM
        // Create pivot point at shoulder for natural rotation
        const leftArmPivot = new THREE.Group(); // Rotation pivot at shoulder joint
        leftArmPivot.position.set(-0.8, 0.75, 0); // Left shoulder position
        torso.add(leftArmPivot); // Attach to torso

        // Arm mesh positioned relative to pivot point
        const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
        leftArm.position.set(0, -0.7, 0); // Hang down from shoulder
        leftArm.rotation.z = 0.05;        // Slight natural angle
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        leftArmPivot.add(leftArm); // Attach to pivot for proper rotation

        // RIGHT ARM SYSTEM (Mirror of left arm)
        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.8, 0.75, 0); // Right shoulder position
        torso.add(rightArmPivot);

        const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
        rightArm.position.set(0, -0.7, 0);
        rightArm.rotation.z = -0.05; // Mirror angle for symmetry
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        rightArmPivot.add(rightArm);

        // TODO: Add forearm segments for more realistic arm bending
        // TODO: Implement elbow joints with proper constraints
        // TODO: Add hand models with finger articulation

        // =============================================================================
        // LEG CONSTRUCTION (Lower Body Kinematics)
        // =============================================================================
    const legGeometry = new THREE.CylinderGeometry(0.18, 0.22, 1.6, 12); // lower limbs
        ensureGeometryUV2(legGeometry);

        // LEFT LEG SYSTEM
        const leftLegPivot = new THREE.Group(); // Hip joint pivot
        leftLegPivot.position.set(-0.3, -0.9, 0); // Left hip position
        torso.add(leftLegPivot);

        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        leftLeg.position.set(0, -0.8, 0); // Extend down from hip
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        leftLegPivot.add(leftLeg);

        // LEFT FOOT PIVOT (Ankle joint)
        const leftFootPivot = new THREE.Group();
        leftFootPivot.position.set(0, -0.8, 0); // Ankle position at leg bottom
        leftLeg.add(leftFootPivot);

        // RIGHT LEG SYSTEM (Mirror of left leg)
        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.3, -0.9, 0); // Right hip position
        torso.add(rightLegPivot);

        const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        rightLeg.position.set(0, -0.8, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        rightLegPivot.add(rightLeg);

        // RIGHT FOOT PIVOT (Ankle joint)
        const rightFootPivot = new THREE.Group();
        rightFootPivot.position.set(0, -0.8, 0);
        rightLeg.add(rightFootPivot);

        // =============================================================================
        // FOOT CONSTRUCTION (Ground Contact Points)
        // =============================================================================
        const footGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.8);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,    // Brown leather color
            metalness: 0.2,     // Slight metallic reflection
            roughness: 0.8      // Rough leather surface
        });

        // LEFT FOOT
        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(0, -0.1, 0.1); // Slightly forward from ankle
        leftFoot.castShadow = true;
        leftFoot.receiveShadow = true;
        leftFootPivot.add(leftFoot);

        // RIGHT FOOT
        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(0, -0.1, 0.1);
        rightFoot.castShadow = true;
        rightFoot.receiveShadow = true;
        rightFootPivot.add(rightFoot);

        // TODO: Add shoe models with detailed geometry
        // TODO: Implement foot IK (Inverse Kinematics) for terrain adaptation
        // TODO: Add foot particle effects for walking on different surfaces

        playerGroup.traverse(node => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        playerGroup.userData = {
            head,
            torso,
            leftArm: leftArmPivot,
            rightArm: rightArmPivot,
            leftLeg: leftLegPivot,
            rightLeg: rightLegPivot,
            leftFoot: leftFootPivot,
            rightFoot: rightFootPivot
        };

        scene.add(playerGroup);
        player = playerGroup;

        playerVelocity.set(0, 0, 0);
        isJumping = false;
        jumpsRemaining = maxJumps;
        jumpCooldown = 0;
    }

    function updatePlayer() {
        if (!player || !gameStarted) return;

        // Update active death shards (simple physics + fade)
        for (let i = activeShards.length - 1; i >= 0; i--) {
            const s = activeShards[i];
            // integrate velocity
            s.velocity.y += shardGravity;
            s.mesh.position.x += s.velocity.x;
            s.mesh.position.y += s.velocity.y;
            s.mesh.position.z += s.velocity.z;
            s.life -= 1;
            // fade out
            if (s.material && s.material.transparent) {
                s.material.opacity = Math.max(0, s.material.opacity - 0.02);
            }
            if (s.life <= 0 || s.mesh.position.y < -100) {
                _removeShard(i);
            }
        }
        const moveSpeed = 0.1;
        const jumpStrength = 0.4;
        const gravity = -0.02;
        const friction = 0.85;

        _inputVector.set(0, 0, 0);
        if (keys['KeyW']) _inputVector.z -= 1;
        if (keys['KeyS']) _inputVector.z += 1;
        if (keys['KeyA']) _inputVector.x -= 1;
        if (keys['KeyD']) _inputVector.x += 1;

        if (_inputVector.lengthSq() > 0) {
            _inputVector.normalize().multiplyScalar(moveSpeed);

            camera.getWorldDirection(_cameraDirection);
            _cameraDirection.y = 0;
            if (_cameraDirection.lengthSq() > 0) {
                _cameraDirection.normalize();
            }

            _cameraRight.crossVectors(_cameraDirection, _upVector);

            _movement.set(0, 0, 0);
            _movement.addScaledVector(_cameraDirection, -_inputVector.z);
            _movement.addScaledVector(_cameraRight, _inputVector.x);

            playerVelocity.x += _movement.x;
            playerVelocity.z += _movement.z;
        }

        if (keys['Space'] && jumpCooldown <= 0 && jumpsRemaining > 0) {
            playerVelocity.y = jumpStrength;
            isJumping = true;
            jumpCooldown = 20;
            jumpsRemaining--;
            invokeAudio('playJump');
        }

        if (jumpCooldown > 0) jumpCooldown--;

        playerVelocity.y += gravity;
        playerVelocity.x *= friction;
        playerVelocity.z *= friction;

        _newPosition.copy(player.position).add(playerVelocity);

        const resolveFn = global.resolvePlatformCollisions;
        const grounded = typeof resolveFn === "function" ? resolveFn(_newPosition) : false;
        if (grounded) {
            jumpCooldown = 0;
            isJumping = false;
            jumpsRemaining = maxJumps;
        }

        if (_newPosition.y < -50) {
            // If a death is already being processed, ignore further triggers
            if (isDying) return;

            if (lives > 0) {
                isDying = true; // mark we're handling a death
                lives--;

                // Trigger low health warning when only 1 life remains
                if (lives === 1 && typeof StoryManager !== 'undefined' && typeof StoryManager.trackProgress === 'function') {
                    StoryManager.trackProgress('lowHealth');
                }

                // Play death burst visual effect, hide player and delay respawn/game over
                try {
                    playDeathBurst(player.position.clone());
                } catch (e) {}
                if (player) player.visible = false;

                if (lives <= 0) {
                    // final death -> call gameOver after short delay so burst can play
                    setTimeout(() => {
                        try { isDying = false; } catch (e) {}
                        if (typeof global.gameOver === "function") {
                            global.gameOver();
                        }
                    }, 900);
                } else {
                    // non-final death -> respawn after burst animation
                    setTimeout(() => {
                        respawnPlayer();
                        if (player) player.visible = true;
                        try { isDying = false; } catch (e) {}
                    }, 900);
                }
            }
            return;
        }

        player.position.copy(_newPosition);

        if (cameraMode !== 2) {
            camera.getWorldDirection(_lookDir);
            _lookDir.y = 0;
            if (_lookDir.lengthSq() > 0.0001) {
                _lookDir.normalize();
                const targetAngle = Math.atan2(_lookDir.x, _lookDir.z);
                player.rotation.y = targetAngle;
            }
        }

        if (Array.isArray(crystals)) {
            for (let i = crystals.length - 1; i >= 0; i--) {
                const crystal = crystals[i];
                if (player.position.distanceToSquared(crystal.position) < 9) {
                    if (typeof global.collectCrystal === "function") {
                        global.collectCrystal(i);
                    }
                }
            }
        }

        if (typeof global.updateCameraPosition === "function") {
            global.updateCameraPosition();
        }

        if (player && player.userData) {
            const elapsed = Date.now() * 0.001;
            const horizontalSpeed = Math.min(Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z) * 12, 1);
            const swing = Math.sin(elapsed * 6) * 0.5 * horizontalSpeed;
            const bodyVisible = cameraMode !== 1;

            player.visible = bodyVisible;

            if (player.userData.head) {
                player.userData.head.rotation.y = Math.sin(elapsed * 0.5) * 0.2;
            }
            if (player.userData.leftArm) {
                player.userData.leftArm.rotation.x = swing;
            }
            if (player.userData.rightArm) {
                player.userData.rightArm.rotation.x = -swing;
            }
            if (player.userData.leftLeg) {
                player.userData.leftLeg.rotation.x = -swing * 0.6;
            }
            if (player.userData.rightLeg) {
                player.userData.rightLeg.rotation.x = swing * 0.6;
            }
        }
    }

    function respawnPlayer() {
        if (player) {
            player.position.set(0, 5, 0);
            player.rotation.y = 0;
            playerVelocity.set(0, 0, 0);
            isJumping = false;
            jumpsRemaining = maxJumps;
            jumpCooldown = 0;
            // Ensure player is visible again after death burst
            try { player.visible = true; } catch (e) {}
            try { isDying = false; } catch (e) {}
            if (player.userData) {
                if (player.userData.leftArm) player.userData.leftArm.rotation.x = 0;
                if (player.userData.rightArm) player.userData.rightArm.rotation.x = 0;
                if (player.userData.leftLeg) player.userData.leftLeg.rotation.x = 0;
                if (player.userData.rightLeg) player.userData.rightLeg.rotation.x = 0;
                if (player.userData.leftFoot) player.userData.leftFoot.rotation.x = 0;
                if (player.userData.rightFoot) player.userData.rightFoot.rotation.x = 0;
            }
        }
        if (typeof global.updateUI === "function") {
            global.updateUI();
        }
    }

    global.createPlayer = createPlayer;
    global.updatePlayer = updatePlayer;
    global.respawnPlayer = respawnPlayer;
    global.playerController = {
        createPlayer,
        updatePlayer,
        respawnPlayer
    };
})(window);
