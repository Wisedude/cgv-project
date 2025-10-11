(function(global) {
    const SUN_DISTANCE = 10;
    const SUN_RADIUS = 1;
    const SUN_TEXTURE_PATH = 'assets/sun.jpg';
    const SUN_DIRECTION = new THREE.Vector3(50, 75, 50).normalize();

    let cachedSunTexture = null;
    let cachedSunGeometry = null;
    let cachedSunMaterial = null;
    let sunLight = null;
    let sunBody = null;
    let sunGlow = null;
    const _sunPosition = new THREE.Vector3();
    const _sunTarget = new THREE.Vector3(0, 0, 0);
    const sunTextureLoader = new THREE.TextureLoader();

    function configureSunTexture(texture) {
        if (!texture) return;
        texture.encoding = true;
        texture.anisotropy = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
        texture.needsUpdate = true;
    }

    function createProceduralSunTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(
            size / 2,
            size / 2,
            size * 0.05,
            size / 2,
            size / 2,
            size * 0.5
        );

        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.25, 'rgba(255, 249, 220, 0.95)');
        gradient.addColorStop(0.55, 'rgba(255, 205, 120, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

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
