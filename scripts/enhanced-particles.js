/**
 * ENHANCED PARTICLE SYSTEM
 * Advanced particle effects for immersive space atmosphere
 * Includes asteroid fields, cosmic dust, and dynamic environmental effects
 */

(function(global) {
    
    let asteroidField = [];
    let spaceDebris = [];
    let cosmicDust = null;
    let nebulaClouds = [];
    let sparkleParticles = null;
    let isInitialized = false;

    /**
     * Create realistic asteroid field around the play area
     */
    function createAsteroidField() {
        if (!global.scene) {
            console.warn('Scene not available for asteroid field creation');
            return;
        }
        
        const asteroidCount = 15;
        const asteroidGeometries = [
            new THREE.DodecahedronGeometry(2, 0),
            new THREE.IcosahedronGeometry(2.5, 0),
            new THREE.OctahedronGeometry(1.8, 0)
        ];
        
        for (let i = 0; i < asteroidCount; i++) {
            // Random geometry selection
            const geometry = asteroidGeometries[Math.floor(Math.random() * asteroidGeometries.length)];
            
            // Create realistic asteroid material
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.1, 0.3, 0.15 + Math.random() * 0.25),
                roughness: 0.9,
                metalness: 0.1,
                bumpScale: 0.3
            });
            
            const asteroid = new THREE.Mesh(geometry, material);
            
            // Position asteroids around the play area (not in the path)
            const angle = (i / asteroidCount) * Math.PI * 2;
            const distance = 80 + Math.random() * 100;
            const height = (Math.random() - 0.5) * 60;
            
            asteroid.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );
            
            // Add some randomness to position
            asteroid.position.x += (Math.random() - 0.5) * 40;
            asteroid.position.z += (Math.random() - 0.5) * 40;
            
            // Random rotation and scale
            asteroid.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            const scale = 0.5 + Math.random() * 1.5;
            asteroid.scale.setScalar(scale);
            
            // Animation properties
            asteroid.userData = {
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.005,
                    (Math.random() - 0.5) * 0.005,
                    (Math.random() - 0.5) * 0.005
                ),
                originalPosition: asteroid.position.clone(),
                bobOffset: Math.random() * Math.PI * 2,
                bobSpeed: 0.0005 + Math.random() * 0.001
            };
            
            asteroid.castShadow = true;
            asteroid.receiveShadow = true;
            
            global.scene.add(asteroid);
            asteroidField.push(asteroid);
        }
    }

    /**
     * Create animated cosmic dust particles
     */
    function createCosmicDust() {
        if (!global.scene) {
            console.warn('Scene not available for cosmic dust creation');
            return;
        }
        
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Distribute particles in a large sphere
            const radius = 150 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.cos(phi);
            positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            // Cosmic colors (blues, purples, whites)
            const colorChoice = Math.random();
            const color = new THREE.Color();
            
            if (colorChoice < 0.4) {
                color.setHSL(0.6 + Math.random() * 0.1, 0.8, 0.7); // Blues
            } else if (colorChoice < 0.7) {
                color.setHSL(0.75 + Math.random() * 0.1, 0.6, 0.8); // Purples
            } else {
                color.setHSL(0, 0, 0.9 + Math.random() * 0.1); // Whites
            }
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            // Varying sizes
            sizes[i] = 0.5 + Math.random() * 1.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        cosmicDust = new THREE.Points(geometry, material);
        cosmicDust.userData = {
            rotationSpeed: 0.0002
        };
        
        global.scene.add(cosmicDust);
    }

    /**
     * Create smaller space debris particles
     */
    function createSpaceDebris() {
        if (!global.scene) {
            console.warn('Scene not available for space debris creation');
            return;
        }
        
        const debrisCount = 8;
        const debrisGeometry = new THREE.TetrahedronGeometry(0.5, 0);
        
        for (let i = 0; i < debrisCount; i++) {
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0, 0, 0.4 + Math.random() * 0.3),
                roughness: 0.8,
                metalness: 0.6
            });
            
            const debris = new THREE.Mesh(debrisGeometry, material);
            
            // Position debris randomly
            debris.position.set(
                (Math.random() - 0.5) * 150,
                Math.random() * 50 + 10,
                (Math.random() - 0.5) * 150
            );
            
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            const scale = 0.3 + Math.random() * 0.7;
            debris.scale.setScalar(scale);
            
            debris.userData = {
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.02
                ),
                driftSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.005,
                    (Math.random() - 0.5) * 0.01
                )
            };
            
            debris.castShadow = true;
            
            global.scene.add(debris);
            spaceDebris.push(debris);
        }
    }

    /**
     * Create sparkle effect particles for collected items
     */
    function createSparkleParticles() {
        if (!global.scene) {
            console.warn('Scene not available for sparkle particles creation');
            return;
        }
        
        const sparkleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(sparkleCount * 3);
        const colors = new Float32Array(sparkleCount * 3);
        const sizes = new Float32Array(sparkleCount);
        const alphas = new Float32Array(sparkleCount);
        
        for (let i = 0; i < sparkleCount; i++) {
            const i3 = i * 3;
            
            // Start all particles at origin (will be moved when triggered)
            positions[i3] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;
            
            // Golden sparkle colors
            const color = new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.8, 0.8);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            sizes[i] = 2 + Math.random() * 3;
            alphas[i] = 0; // Start invisible
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        // Custom shader material for sparkles
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                varying float vAlpha;
                varying vec3 vColor;
                
                void main() {
                    vAlpha = alpha;
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                varying float vAlpha;
                varying vec3 vColor;
                
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5, 0.5));
                    float sparkle = sin(time * 10.0) * 0.5 + 0.5;
                    float alpha = vAlpha * (1.0 - r * 2.0) * sparkle;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        sparkleParticles = new THREE.Points(geometry, material);
        sparkleParticles.userData = {
            activeParticles: [],
            material: material
        };
        
        global.scene.add(sparkleParticles);
    }

    /**
     * Trigger sparkle effect at a specific position
     */
    function triggerSparkleEffect(position) {
        if (!sparkleParticles) return;
        
        const positions = sparkleParticles.geometry.attributes.position.array;
        const alphas = sparkleParticles.geometry.attributes.alpha.array;
        
        // Find inactive particles and activate them
        let activatedCount = 0;
        for (let i = 0; i < positions.length / 3 && activatedCount < 20; i++) {
            if (alphas[i] === 0) {
                const i3 = i * 3;
                
                // Set position with some spread
                positions[i3] = position.x + (Math.random() - 0.5) * 4;
                positions[i3 + 1] = position.y + (Math.random() - 0.5) * 4;
                positions[i3 + 2] = position.z + (Math.random() - 0.5) * 4;
                
                alphas[i] = 1.0;
                
                // Store particle data for animation
                sparkleParticles.userData.activeParticles.push({
                    index: i,
                    life: 1.0,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.2,
                        Math.random() * 0.15,
                        (Math.random() - 0.5) * 0.2
                    )
                });
                
                activatedCount++;
            }
        }
        
        sparkleParticles.geometry.attributes.position.needsUpdate = true;
        sparkleParticles.geometry.attributes.alpha.needsUpdate = true;
    }

    /**
     * Update all particle systems
     */
    function updateParticles() {
        if (!isInitialized) return;
        
        const time = Date.now() * 0.001;
        
        // Update asteroids
        asteroidField.forEach(asteroid => {
            if (asteroid.userData) {
                // Rotation
                asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
                asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
                asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
                
                // Subtle bobbing motion
                asteroid.position.y = asteroid.userData.originalPosition.y + 
                    Math.sin(time * asteroid.userData.bobSpeed + asteroid.userData.bobOffset) * 2;
            }
        });
        
        // Update cosmic dust rotation
        if (cosmicDust) {
            cosmicDust.rotation.y += cosmicDust.userData.rotationSpeed;
            cosmicDust.rotation.x += cosmicDust.userData.rotationSpeed * 0.5;
        }
        
        // Update space debris
        spaceDebris.forEach(debris => {
            if (debris.userData) {
                // Rotation
                debris.rotation.x += debris.userData.rotationSpeed.x;
                debris.rotation.y += debris.userData.rotationSpeed.y;
                debris.rotation.z += debris.userData.rotationSpeed.z;
                
                // Slow drift
                debris.position.add(debris.userData.driftSpeed);
                
                // Wrap around if too far
                if (debris.position.length() > 200) {
                    debris.position.normalize().multiplyScalar(50);
                }
            }
        });
        
        // Update sparkle particles
        if (sparkleParticles && sparkleParticles.userData.activeParticles.length > 0) {
            const positions = sparkleParticles.geometry.attributes.position.array;
            const alphas = sparkleParticles.geometry.attributes.alpha.array;
            
            // Update sparkle material time uniform
            sparkleParticles.userData.material.uniforms.time.value = time;
            
            // Update active particles
            for (let i = sparkleParticles.userData.activeParticles.length - 1; i >= 0; i--) {
                const particle = sparkleParticles.userData.activeParticles[i];
                const index = particle.index;
                const i3 = index * 3;
                
                // Update position
                positions[i3] += particle.velocity.x;
                positions[i3 + 1] += particle.velocity.y;
                positions[i3 + 2] += particle.velocity.z;
                
                // Apply gravity
                particle.velocity.y -= 0.003;
                
                // Fade out
                particle.life -= 0.02;
                alphas[index] = Math.max(0, particle.life);
                
                // Remove when dead
                if (particle.life <= 0) {
                    sparkleParticles.userData.activeParticles.splice(i, 1);
                }
            }
            
            sparkleParticles.geometry.attributes.position.needsUpdate = true;
            sparkleParticles.geometry.attributes.alpha.needsUpdate = true;
        }
    }

    /**
     * Initialize all enhanced particle systems
     */
    function initEnhancedParticles() {
        if (isInitialized) return;
        
        if (!global.scene) {
            console.warn('Scene not available, delaying particle initialization');
            setTimeout(initEnhancedParticles, 100);
            return;
        }
        
        console.log('Initializing Enhanced Particle System...');
        
        createAsteroidField();
        createCosmicDust();
        createSpaceDebris();
        createSparkleParticles();
        
        isInitialized = true;
        console.log('Enhanced Particle System initialized');
    }

    /**
     * Cleanup particle systems
     */
    function cleanup() {
        if (!global.scene) return;
        
        asteroidField.forEach(asteroid => global.scene.remove(asteroid));
        spaceDebris.forEach(debris => global.scene.remove(debris));
        
        if (cosmicDust) global.scene.remove(cosmicDust);
        if (sparkleParticles) global.scene.remove(sparkleParticles);
        
        asteroidField = [];
        spaceDebris = [];
        cosmicDust = null;
        sparkleParticles = null;
        isInitialized = false;
    }

    // Export functions to global scope
    global.EnhancedParticles = {
        init: initEnhancedParticles,
        update: updateParticles,
        triggerSparkle: triggerSparkleEffect,
        cleanup: cleanup,
        isInitialized: () => isInitialized
    };

})(window);