(function (global) {
    const _inputVector = new THREE.Vector3();
    const _cameraDirection = new THREE.Vector3();
    const _cameraRight = new THREE.Vector3();
    const _movement = new THREE.Vector3();
    const _newPosition = new THREE.Vector3();
    const _lookDir = new THREE.Vector3();
    const _upVector = new THREE.Vector3(0, 1, 0);

    let skinTextures = null;
    let cachedSkinMaterial = null;
    const skinTextureLoader = new THREE.TextureLoader();
    let pantsTextures = null;
    let cachedPantsMaterial = null;
    const pantsTextureLoader = new THREE.TextureLoader();
    let shirtTextures = null;
    let cachedShirtMaterial = null;
    const shirtTextureLoader = new THREE.TextureLoader();
    let hairTextures = null;
    let cachedHairMaterial = null;
    const hairTextureLoader = new THREE.TextureLoader();

    function getRendererAnisotropy() {
        const renderer = global.renderer;
        return renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1;
    }

    function configureSkinTexture(texture, encoding) {
        if (!texture) return;
        texture.anisotropy = getRendererAnisotropy();
        if (encoding) {
            texture.encoding = encoding;
        }
        texture.needsUpdate = true;
    }

    function loadSkinTexture(filename, encoding) {
        const texture = skinTextureLoader.load(
            `assets/textures/skin/${filename}`,
            () => configureSkinTexture(texture, encoding)
        );
        configureSkinTexture(texture, encoding);
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

    function ensureSkinTextures() {
        if (skinTextures) return skinTextures;

        skinTextures = {
            color: loadSkinTexture('skin_0001_color_64.jpg', true),
            normal: loadSkinTexture('skin_0001_normal_opengl_64.png'),
            roughness: loadSkinTexture('skin_0001_roughness_64.jpg'),
            ao: loadSkinTexture('skin_0001_ao_64.jpg')
        };

        return skinTextures;
    }

    function ensurePantsTextures() {
        if (pantsTextures) return pantsTextures;

        pantsTextures = {
            color: loadPantsTexture('fabrics_0082_color_64.jpg', true),
            normal: loadPantsTexture('fabrics_0082_normal_opengl_64.png'),
            roughness: loadPantsTexture('fabrics_0082_roughness_64.jpg'),
            ao: loadPantsTexture('fabrics_0082_ao_64.jpg'),
            height: loadPantsTexture('fabrics_0082_height_64.png')
        };

        return pantsTextures;
    }

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

    function createPlayer() {
        const playerGroup = new THREE.Group();
        playerGroup.position.set(0, 5, 0);
        const skinMaterial = getSkinMaterial();
        const pantsMaterial = getPantsMaterial();
        const shirtMaterial = getShirtMaterial();
    const hairMaterial = getHairMaterial();

        const torsoGeometry = new THREE.BoxGeometry(1.2, 1.8, 0.6);
        ensureGeometryUV2(torsoGeometry);
        const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
        torso.castShadow = true;
        torso.receiveShadow = true;
        playerGroup.add(torso);

        const headGeometry = new THREE.SphereGeometry(0.5, 16, 12);
        ensureGeometryUV2(headGeometry);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.set(0, 1.4, 0);
        head.castShadow = true;
        head.receiveShadow = true;
        torso.add(head);

        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 0.1, 0.4);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 0.1, 0.4);
        head.add(rightEye);

        const hairGeometry = new THREE.SphereGeometry(0.52, 12, 8);
        ensureGeometryUV2(hairGeometry);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 0.2, -0.1);
        hair.scale.set(1, 0.6, 1);
        head.add(hair);

        const armGeometry = new THREE.CylinderGeometry(0.15, 0.18, 1.4, 12);
        ensureGeometryUV2(armGeometry);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.8, 0.75, 0);
    torso.add(leftArmPivot);

    const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
    leftArm.position.set(0, -0.7, 0);
    leftArm.rotation.z = 0.05;
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    leftArmPivot.add(leftArm);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.8, 0.75, 0);
    torso.add(rightArmPivot);

    const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
    rightArm.position.set(0, -0.7, 0);
    rightArm.rotation.z = -0.05;
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    rightArmPivot.add(rightArm);

        const legGeometry = new THREE.CylinderGeometry(0.18, 0.22, 1.6, 12);
        ensureGeometryUV2(legGeometry);

        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.3, -0.9, 0);
        torso.add(leftLegPivot);

        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        leftLeg.position.set(0, -0.8, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        leftLegPivot.add(leftLeg);

        const leftFootPivot = new THREE.Group();
        leftFootPivot.position.set(0, -0.8, 0);
        leftLeg.add(leftFootPivot);

        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.3, -0.9, 0);
        torso.add(rightLegPivot);

    const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        rightLeg.position.set(0, -0.8, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        rightLegPivot.add(rightLeg);

        const rightFootPivot = new THREE.Group();
        rightFootPivot.position.set(0, -0.8, 0);
        rightLeg.add(rightFootPivot);

        const footGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.8);
        const footMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            metalness: 0.2,
            roughness: 0.8
        });

        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(0, -0.1, 0.1);
        leftFoot.castShadow = true;
        leftFoot.receiveShadow = true;
        leftFootPivot.add(leftFoot);

        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(0, -0.1, 0.1);
        rightFoot.castShadow = true;
        rightFoot.receiveShadow = true;
        rightFootPivot.add(rightFoot);

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
            if (lives > 0) {
                lives--;
                if (lives <= 0) {
                    if (typeof global.gameOver === "function") {
                        global.gameOver();
                    }
                } else {
                    respawnPlayer();
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
