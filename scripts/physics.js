(function(global) {
    const PLAYER_HALF_SIZE = new THREE.Vector3(0.6, 2.3, 0.5);
    const _collisionDiff = new THREE.Vector3();
    const _combinedHalfExtents = new THREE.Vector3();
    const CRYSTAL_GEOMETRY = new THREE.OctahedronGeometry(1.2, 0);
    const CRYSTAL_GLOW_GEOMETRY = new THREE.OctahedronGeometry(1.8, 0);
    const PARTICLE_GEOMETRY = new THREE.SphereGeometry(0.1, 4, 4);
    const MAX_PARTICLE_POOL = 240;
    const EFFECT_PARTICLE_LIFETIME = 60;
    const particlePool = [];

    let crystalTextures = null;
    let crystalMaterialTemplate = null;
    const crystalTextureLoader = new THREE.TextureLoader();

    const ROCK_TEXTURE_DEFINITIONS = [
        {
            name: "slate2",
            files: {
                albedo: { file: "slate2-tiled-albedo2_128.png", isSRGB: true },
                normal: { file: "slate2-tiled-normal3-UE4_128.png" },
                roughness: { file: "slate2-tiled-rough_128.png" },
                metalness: { file: "slate2-tiled-metalness_128.png" },
                ao: { file: "slate2-tiled-ao_128.png" },
                height: { file: "slate2-tiled-height_128.png" }
            }
        },
        {
            name: "rock_0002",
            files: {
                albedo: { file: "rock_0002_color_128.jpg", isSRGB: true },
                normal: { file: "rock_0002_normal_opengl_128.png" },
                roughness: { file: "rock_0002_roughness_128.jpg" },
                ao: { file: "rock_0002_ao_128.jpg" },
                height: { file: "rock_0002_height_128.png" }
            }
        },
        {
            name: "rock_0005",
            files: {
                albedo: { file: "rock_0005_color_128.jpg", isSRGB: true },
                normal: { file: "rock_0005_normal_opengl_128.png" },
                roughness: { file: "rock_0005_roughness_128.jpg" },
                ao: { file: "rock_0005_ao_128.jpg" },
                height: { file: "rock_0005_height_128.png" }
            }
        }
    ];

    let rockTextures = null;
    const textureSubscribers = new WeakMap();

    function subscribeTextureClone(sourceTexture, cloneTexture) {
        let subscribers = textureSubscribers.get(sourceTexture);
        if (!subscribers) {
            subscribers = [];
            textureSubscribers.set(sourceTexture, subscribers);
        }
        subscribers.push(cloneTexture);
    }

    function fulfillTextureSubscribers(sourceTexture) {
        const subscribers = textureSubscribers.get(sourceTexture);
        if (!subscribers || subscribers.length === 0) {
            return;
        }

        for (let i = 0; i < subscribers.length; i++) {
            const clone = subscribers[i];
            if (!clone) continue;
            clone.image = sourceTexture.image;
            clone.needsUpdate = true;
        }

        subscribers.length = 0;
        textureSubscribers.delete(sourceTexture);
    }

    function ensureRockTextures() {
        if (rockTextures) {
            return rockTextures;
        }

        const textureLoader = new THREE.TextureLoader();
        const basePath = "assets/textures/rock/";
        const anisotropy = global.renderer ? global.renderer.capabilities.getMaxAnisotropy() : 1;

        function loadTexture(definition) {
            if (!definition || !definition.file) {
                return null;
            }

            const { file, isSRGB = false } = definition;
            const texture = textureLoader.load(
                basePath + file,
                () => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.anisotropy = anisotropy;
                    texture.encoding = isSRGB ? THREE.sRGBEncoding : THREE.LinearEncoding;
                    texture.needsUpdate = true;
                    fulfillTextureSubscribers(texture);
                }
            );
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.anisotropy = anisotropy;
            texture.encoding = isSRGB ? THREE.sRGBEncoding : THREE.LinearEncoding;
            texture.needsUpdate = true;
            return texture;
        }

        rockTextures = ROCK_TEXTURE_DEFINITIONS.map(def => {
            const entry = { name: def.name };
            const files = def.files || {};
            entry.albedo = loadTexture(files.albedo);
            entry.normal = loadTexture(files.normal);
            entry.roughness = loadTexture(files.roughness);
            entry.metalness = loadTexture(files.metalness);
            entry.ao = loadTexture(files.ao);
            entry.height = loadTexture(files.height);
            return entry;
        }).filter(entry => entry.albedo);

        return rockTextures;
    }

    function getRendererAnisotropy() {
        const renderer = global.renderer;
        return renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1;
    }

    function configureCrystalTexture(texture, encoding) {
        if (!texture) return;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = getRendererAnisotropy();
        if (encoding) {
            texture.encoding = encoding;
        }
        texture.repeat.set(1, 1);
        texture.needsUpdate = true;
    }

    function loadCrystalTexture(filename, encoding) {
        const texture = crystalTextureLoader.load(
            `assets/textures/crystal/${filename}`,
            () => configureCrystalTexture(texture, encoding)
        );
        configureCrystalTexture(texture, encoding);
        return texture;
    }

    function ensureCrystalTextures() {
        if (crystalTextures) return crystalTextures;

        crystalTextures = {
            color: loadCrystalTexture('ice_0002_color_128.jpg', THREE.sRGBEncoding),
            normal: loadCrystalTexture('ice_0002_normal_opengl_128.png'),
            roughness: loadCrystalTexture('ice_0002_roughness_128.jpg'),
            ao: loadCrystalTexture('ice_0002_ao_128.jpg'),
            height: loadCrystalTexture('ice_0002_height_128.png')
        };

        return crystalTextures;
    }

    function ensureCrystalMaterial() {
        if (crystalMaterialTemplate) return crystalMaterialTemplate;

        const textures = ensureCrystalTextures();
        crystalMaterialTemplate = new THREE.MeshPhysicalMaterial({
            map: textures.color,
            normalMap: textures.normal,
            roughnessMap: textures.roughness,
            aoMap: textures.ao,
            bumpMap: textures.height,
            transparent: true,
            opacity: 0.95,
            roughness: 0.15,
            metalness: 0.05,
            transmission: 0.68,
            thickness: 0.85,
            envMapIntensity: 1.2,
            clearcoat: 0.45,
            clearcoatRoughness: 0.1
        });
        crystalMaterialTemplate.aoMapIntensity = 0.9;
        if (crystalMaterialTemplate.normalMap) {
            crystalMaterialTemplate.normalScale.set(0.8, 0.8);
        }
        if (crystalMaterialTemplate.bumpMap) {
            crystalMaterialTemplate.bumpScale = 0.06;
        }
        crystalMaterialTemplate.name = 'IceCrystal';
        return crystalMaterialTemplate;
    }

    function createSeededRandom(seed) {
        let value = Math.floor(seed) % 2147483647;
        if (value <= 0) value += 2147483646;
        return function() {
            value = (value * 16807) % 2147483647;
            return (value - 1) / 2147483646;
        };
    }

    function createOvalRockGeometry(size) {
        const width = size[0];
        const height = size[1];
        const depth = size[2];
        const radialSegments = 28;
        const heightSegments = 6;

        const topScale = 1.0;
        const bottomScale = 0.72;
        const geometry = new THREE.CylinderGeometry(topScale, bottomScale, 1, radialSegments, heightSegments, false);

        const halfHeight = height / 2;
        geometry.scale(width / 2, height, depth / 2);

        const primaryUVs = geometry.attributes.uv;
        if (primaryUVs) {
            const uv2 = primaryUVs.array.slice();
            geometry.setAttribute('uv2', new THREE.BufferAttribute(uv2, 2));
        }

        const position = geometry.attributes.position;
        const rand = createSeededRandom(Math.random() * 2147483647);

        const radiusX = width / 2;
        const radiusZ = depth / 2;
        const verticalNoiseScale = 0;
        const lateralNoiseScale = 0.15;

        for (let i = 0; i < position.count; i++) {
            let x = position.getX(i);
            let y = position.getY(i);
            let z = position.getZ(i);

            const topFactor = Math.min(1, Math.max(0, (y + halfHeight) / height));
            const edgeFactor = 1 - Math.pow(Math.abs(y) / (halfHeight + 0.0001), 1.5);
            const lateralNoise = (rand() - 0.5) * lateralNoiseScale * edgeFactor;
            const verticalNoise = (rand() - 0.5) * verticalNoiseScale * (1 - topFactor);

            x += lateralNoise * width;
            z += (rand() - 0.5) * lateralNoiseScale * edgeFactor * depth;
            y += verticalNoise;

            const ellipseNorm = (x * x) / (radiusX * radiusX) + (z * z) / (radiusZ * radiusZ);
            if (ellipseNorm > 1) {
                const clamp = 1 / Math.sqrt(ellipseNorm);
                x *= clamp;
                z *= clamp;
            }

            position.setXYZ(i, x, y, z);
        }

        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.computeVertexNormals();
        return geometry;
    }

    function createRockUndersideGeometry(size) {
        const width = size[0];
        const height = size[1];
        const depth = size[2];

        const halfWidth = width * 0.4;
        const halfDepth = depth * 0.4;
        const topRadiusX = halfWidth * 0.95;
        const topRadiusZ = halfDepth * 0.95;

        const tailHeight = height * (0.85 + Math.random() * 0.35);
        const bottomScale = 0.2 + Math.random() * 0.12;
        const radialSegments = 28;
        const verticalSegments = 8;

        const vertexCount = (verticalSegments + 1) * (radialSegments + 1);
        const positions = new Float32Array(vertexCount * 3);
        const uvs = new Float32Array(vertexCount * 2);
        const indices = [];

        const rand = createSeededRandom(Math.random() * 2147483647);

        for (let yIndex = 0; yIndex <= verticalSegments; yIndex++) {
            const v = yIndex / verticalSegments;
            const scale = THREE.MathUtils.lerp(1, bottomScale, Math.pow(v, 0.85));
            const drop = v * tailHeight;
            const wobble = (1 - v) * 0.1;

            for (let xIndex = 0; xIndex <= radialSegments; xIndex++) {
                const u = xIndex / radialSegments;
                const angle = u * Math.PI * 2;

                const baseX = Math.cos(angle);
                const baseZ = Math.sin(angle);

                const noiseFactor = wobble * (rand() - 0.5);
                const radiusX = topRadiusX * scale;
                const radiusZ = topRadiusZ * scale;

                const x = baseX * radiusX * (1 + noiseFactor * 0.6);
                const z = baseZ * radiusZ * (1 + noiseFactor * 0.6);
                const y = -drop - (rand() - 0.5) * tailHeight * 0.05 * Math.pow(v, 1.4);

                const idx = yIndex * (radialSegments + 1) + xIndex;
                const posIndex = idx * 3;
                const uvIndex = idx * 2;

                positions[posIndex] = x;
                positions[posIndex + 1] = y;
                positions[posIndex + 2] = z;

                uvs[uvIndex] = u;
                uvs[uvIndex + 1] = v;
            }
        }

        for (let yIndex = 0; yIndex < verticalSegments; yIndex++) {
            for (let xIndex = 0; xIndex < radialSegments; xIndex++) {
                const a = yIndex * (radialSegments + 1) + xIndex;
                const b = a + 1;
                const c = a + (radialSegments + 1);
                const d = c + 1;

                indices.push(a, b, d);
                indices.push(a, d, c);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        const uv2 = new Float32Array(uvs.length);
        uv2.set(uvs);
        geometry.setAttribute('uv2', new THREE.BufferAttribute(uv2, 2));
        geometry.setIndex(indices);

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        return geometry;
    }

    function createRockMaterial(color) {
        const textureSets = ensureRockTextures();
        const textures = textureSets[Math.floor(Math.random() * textureSets.length)] || textureSets[0];

        const baseColor = new THREE.Color(color);
        const variedColor = baseColor.clone();

    const hsl = { h: 0, s: 0, l: 0 };
    variedColor.getHSL(hsl);
    const hueShift = (Math.random() - 0.5) * 0.04;
    const saturationShift = (Math.random() - 0.5) * 0.08;
    const lightnessShift = (Math.random() - 0.5) * 0.1;

    hsl.h = (hsl.h + hueShift + 1) % 1;
    hsl.s = THREE.MathUtils.clamp(hsl.s + saturationShift, 0.05, 0.45);
    hsl.l = THREE.MathUtils.clamp(hsl.l + lightnessShift, 0.2, 0.55);
        variedColor.setHSL(hsl.h, hsl.s, hsl.l);

    const repeatScale = 2.6 + Math.random() * 2.2;
        const uvOffset = new THREE.Vector2(Math.random(), Math.random());
        const uvRotation = Math.random() * Math.PI * 2;

        function instantiateTexture(source) {
            if (!source) return null;

            const clone = source.clone();
            clone.wrapS = THREE.RepeatWrapping;
            clone.wrapT = THREE.RepeatWrapping;
            clone.repeat.set(repeatScale, repeatScale);
            clone.offset.copy(uvOffset);
            clone.center.set(0.5, 0.5);
            clone.rotation = uvRotation;
            clone.anisotropy = source.anisotropy;
            clone.encoding = source.encoding;

            if (source.image && source.image.width > 0 && source.image.height > 0) {
                clone.image = source.image;
                clone.needsUpdate = true;
            } else {
                subscribeTextureClone(source, clone);
            }

            return clone;
        }

    const map = instantiateTexture(textures.albedo);
    const normalMap = instantiateTexture(textures.normal);
    const roughnessMap = instantiateTexture(textures.roughness);
    const metalnessMap = instantiateTexture(textures.metalness);
    const aoMap = instantiateTexture(textures.ao);
    const bumpMap = instantiateTexture(textures.height);

        const material = new THREE.MeshStandardMaterial({
            color: variedColor.clone().lerp(new THREE.Color(0xffffff), 0.6),
            map,
            normalMap,
            roughnessMap,
            metalnessMap,
            aoMap,
            bumpMap,
            roughness: 0.72,
            metalness: 0.05,
            envMapIntensity: 0.2
        });

        if (material.normalMap) {
            material.normalScale.set(1.1, 1.1);
        }
        material.aoMapIntensity = 1.0;
        if (material.bumpMap) {
            material.bumpScale = 0.18;
        }

        material.userData = material.userData || {};
        material.userData.textureSet = textures.name || 'default';
        material.needsUpdate = true;
        return material;
    }

    function callAudio(method) {
        const manager = global.audioManager;
        if (manager && typeof manager[method] === "function") {
            try {
                manager[method]();
            } catch (err) {
                console.warn(`[Audio] Failed to invoke ${method}`, err);
            }
        }
    }

    function acquireEffectParticle(color) {
        let particle = particlePool.pop();
        if (!particle) {
            const material = new THREE.MeshBasicMaterial({
                color: color.clone(),
                transparent: true,
                opacity: 0.8
            });
            particle = new THREE.Mesh(PARTICLE_GEOMETRY, material);
            particle.castShadow = false;
            particle.receiveShadow = false;
            particle.userData = particle.userData || {};
            particle.userData.velocity = new THREE.Vector3();
        }

        if (particle.material && particle.material.color) {
            particle.material.color.copy(color);
        }
        particle.material.opacity = 0.8;
        particle.visible = true;

        if (!particle.userData) {
            particle.userData = {};
        }
        if (!particle.userData.velocity) {
            particle.userData.velocity = new THREE.Vector3();
        }
        particle.userData.isEffectParticle = true;
        particle.userData.life = EFFECT_PARTICLE_LIFETIME;

        return particle;
    }

    function releaseEffectParticle(particle) {
        if (!particle) return;
        particle.visible = false;
        if (particle.parent) {
            particle.parent.remove(particle);
        }
        particle.userData.isEffectParticle = false;
        if (particlePool.length < MAX_PARTICLE_POOL) {
            particlePool.push(particle);
        }
    }

    function createPlatform(position, size, color) {
        const rockGeometry = createOvalRockGeometry(size);
        const rockMaterial = createRockMaterial(color);

        const platform = new THREE.Mesh(rockGeometry, rockMaterial);
        const basePosition = new THREE.Vector3(position[0], position[1], position[2]);
        platform.position.copy(basePosition);
        platform.rotation.y = Math.random() * Math.PI * 2;
        platform.receiveShadow = true;
        platform.castShadow = true;

        if (!rockGeometry.boundingBox) {
            rockGeometry.computeBoundingBox();
        }

        const geometrySize = new THREE.Vector3();
        rockGeometry.boundingBox.getSize(geometrySize);

        const colliderHalfSize = geometrySize.clone().multiplyScalar(0.5);
        colliderHalfSize.y += Math.max(0.1, geometrySize.y * 0.08);

    const tailGeometry = createRockUndersideGeometry(size);
    const tailMaterial = rockMaterial.clone();
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.y = rockGeometry.boundingBox.min.y;
    tail.castShadow = true;
    tail.receiveShadow = true;
    tail.name = 'RockTail';
    platform.add(tail);

        platform.userData.collider = {
            halfSize: colliderHalfSize
        };
        platform.userData.materialUniforms = null;
        platform.userData.basePosition = basePosition.clone();
        platform.userData.floatSettings = {
            amplitude: 0.35 + Math.random() * 0.25,
            swayAmplitude: 0.6 + Math.random() * 0.3,
            speed: 0.45 + Math.random() * 0.25,
            swaySpeed: 0.25 + Math.random() * 0.15,
            phase: Math.random() * Math.PI * 2,
            baseRotation: platform.rotation.y
        };
    const highlight = rockMaterial.color.clone().lerp(new THREE.Color(0xffffff), 0.25);
    const minimapColor = `rgba(${Math.round(highlight.r * 255)}, ${Math.round(highlight.g * 255)}, ${Math.round(highlight.b * 255)}, 0.9)`;
        platform.userData.minimap = {
            radius: Math.max(colliderHalfSize.x, colliderHalfSize.z),
            color: minimapColor
        };

        scene.add(platform);
        platforms.push(platform);
    }

    function resolvePlatformCollisions(newPosition) {
        let grounded = false;

        for (let i = 0; i < platforms.length; i++) {
            const platform = platforms[i];
            const collider = platform.userData.collider;
            if (!collider) continue;

            const center = platform.position;
            _collisionDiff.copy(newPosition).sub(center);
            _combinedHalfExtents.copy(collider.halfSize).add(PLAYER_HALF_SIZE);

            const overlapX = _combinedHalfExtents.x - Math.abs(_collisionDiff.x);
            const overlapY = _combinedHalfExtents.y - Math.abs(_collisionDiff.y);
            const overlapZ = _combinedHalfExtents.z - Math.abs(_collisionDiff.z);

            if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
                if (overlapY <= overlapX && overlapY <= overlapZ) {
                    if (_collisionDiff.y > 0) {
                        newPosition.y = center.y + collider.halfSize.y + PLAYER_HALF_SIZE.y;
                        playerVelocity.y = 0;
                        grounded = true;
                        isJumping = false;
                    } else {
                        newPosition.y = center.y - collider.halfSize.y - PLAYER_HALF_SIZE.y;
                        if (playerVelocity.y > 0) playerVelocity.y = 0;
                    }
                } else if (overlapX <= overlapZ) {
                    const dir = _collisionDiff.x >= 0 ? 1 : -1;
                    newPosition.x = center.x + (collider.halfSize.x + PLAYER_HALF_SIZE.x) * dir;
                    if (playerVelocity.x * dir < 0) playerVelocity.x = 0;
                } else {
                    const dir = _collisionDiff.z >= 0 ? 1 : -1;
                    newPosition.z = center.z + (collider.halfSize.z + PLAYER_HALF_SIZE.z) * dir;
                    if (playerVelocity.z * dir < 0) playerVelocity.z = 0;
                }
            }
        }

        return grounded;
    }

    function createCrystals(count) {
        const crystalsPerPlatform = Math.ceil(count / Math.max(1, platforms.length));
        const baseMaterial = ensureCrystalMaterial();

        for (let i = 0; i < count; i++) {
            const crystalMaterial = baseMaterial.clone();
            crystalMaterial.opacity = 0.85 + Math.random() * 0.1;
            crystalMaterial.transmission = 0.5 + Math.random() * 0.15;
            crystalMaterial.thickness = 0.7 + Math.random() * 0.3;
            crystalMaterial.clearcoat = 0.4 + Math.random() * 0.2;
            crystalMaterial.envMapIntensity = 0.9 + Math.random() * 0.5;
            const tintColor = new THREE.Color().setHSL(Math.random(), 1, 0.6 + Math.random() * 0.1);
            crystalMaterial.color.copy(tintColor);
            if (crystalMaterial.emissive) {
                crystalMaterial.emissive.copy(tintColor).multiplyScalar(0.12);
            }

            const crystal = new THREE.Mesh(CRYSTAL_GEOMETRY, crystalMaterial);
            if (!CRYSTAL_GEOMETRY.attributes.uv2 && CRYSTAL_GEOMETRY.attributes.uv) {
                const uv2Array = CRYSTAL_GEOMETRY.attributes.uv.array.slice(0);
                CRYSTAL_GEOMETRY.setAttribute('uv2', new THREE.BufferAttribute(uv2Array, 2));
            }

            const platformIndex = i % platforms.length;
            const platform = platforms[platformIndex];

            crystal.position.copy(platform.position);
            crystal.position.y += 4;

            const crystalOnPlatform = Math.floor(i / platforms.length);

            if (crystalsPerPlatform > 1) {
                const angle = (crystalOnPlatform / crystalsPerPlatform) * Math.PI * 2;
                const radius = 3 + (crystalOnPlatform * 2);
                crystal.position.x += Math.cos(angle) * radius;
                crystal.position.z += Math.sin(angle) * radius;
            } else {
                crystal.position.x += (Math.random() - 0.5) * 6;
                crystal.position.z += (Math.random() - 0.5) * 6;
            }

            crystal.userData = { rotationSpeed: Math.random() * 0.02 + 0.01 };
            crystal.castShadow = true;

            scene.add(crystal);
            crystals.push(crystal);

            const glowMaterial = new THREE.MeshBasicMaterial({
                color: tintColor.clone(),
                transparent: true,
                opacity: 0.2
            });
            const glow = new THREE.Mesh(CRYSTAL_GLOW_GEOMETRY, glowMaterial);
            crystal.add(glow);
        }
    }

    function collectCrystal(index) {
        const crystal = crystals[index];
        scene.remove(crystal);
        crystals.splice(index, 1);

        collectedCrystals++;
        score += 100 * currentLevel;

        createParticleEffect(crystal.position, crystal.material.color);
        callAudio('playCoin');

        if (collectedCrystals >= totalCrystals) {
            levelComplete();
        }

        updateUI();
    }

    function createParticleEffect(position, color) {
        const burstCount = 20;
        for (let i = 0; i < burstCount; i++) {
            const particle = acquireEffectParticle(color);
            particle.position.copy(position);
            particle.userData.velocity.set(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * 0.3
            );

            scene.add(particle);
            particles.push(particle);
        }
    }

    function updateAnimations() {
        const now = Date.now();
        const elapsedSeconds = now * 0.001;
        const pulseTime = now * 0.004;

        platforms.forEach(platform => {
            const floatSettings = platform.userData && platform.userData.floatSettings;
            const basePosition = platform.userData && platform.userData.basePosition;
            if (floatSettings && basePosition) {
                const swayTime = elapsedSeconds * floatSettings.swaySpeed + floatSettings.phase;
                const floatTime = elapsedSeconds * floatSettings.speed + floatSettings.phase;

                platform.position.set(
                    basePosition.x + Math.sin(swayTime) * floatSettings.swayAmplitude,
                    basePosition.y + Math.sin(floatTime) * floatSettings.amplitude,
                    basePosition.z + Math.cos(swayTime * 0.85) * floatSettings.swayAmplitude * 0.6
                );

                platform.rotation.y = floatSettings.baseRotation + Math.sin(floatTime * 0.4) * 0.25;
            }
        });

        crystals.forEach(crystal => {
            crystal.rotation.y += crystal.userData.rotationSpeed;
            crystal.rotation.x += crystal.userData.rotationSpeed * 0.5;

            crystal.position.y += Math.sin(now * 0.003 + crystal.position.x) * 0.01;

            if (crystal.userData && crystal.userData.light) {
                const light = crystal.userData.light;
                const lightPulse = 0.75 + Math.sin(pulseTime + light.userData.pulseOffset) * 0.25;
                light.intensity = light.userData.baseIntensity * lightPulse;
            }
        });

        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            if (!particle || !particle.userData) continue;

            if (particle.userData.isEffectParticle) {
                particle.userData.life--;
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.01;
                particle.material.opacity = particle.userData.life / EFFECT_PARTICLE_LIFETIME;

                if (particle.userData.life <= 0) {
                    particles.splice(i, 1);
                    releaseEffectParticle(particle);
                }
            } else if (particle.userData.velocity) {
                particle.position.add(particle.userData.velocity);

                if (particle.position.x > 150) particle.position.x = -150;
                if (particle.position.x < -150) particle.position.x = 150;
                if (particle.position.z > 150) particle.position.z = -150;
                if (particle.position.z < -150) particle.position.z = 150;
            }
        }
    }

    global.createPlatform = createPlatform;
    global.resolvePlatformCollisions = resolvePlatformCollisions;
    global.createCrystals = createCrystals;
    global.collectCrystal = collectCrystal;
    global.createParticleEffect = createParticleEffect;
    global.updateAnimations = updateAnimations;
})(window);
