(function(global) {
    function setupMinimap() {
        const minimapCanvas = document.getElementById('minimap');
        const ctx = minimapCanvas.getContext('2d');

        minimapCanvas.width = 200;
        minimapCanvas.height = 150;

        function drawMinimap() {
            if (!gameStarted || !player) return;

            ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

            ctx.fillStyle = 'rgba(0, 0, 50, 0.7)';
            ctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

            ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);

            const scale = 2;
            const centerX = minimapCanvas.width / 2;
            const centerY = minimapCanvas.height / 2;

            platforms.forEach(platform => {
                const collider = platform.userData && platform.userData.collider;
                if (!collider) return;

                const offsetX = (platform.position.x - player.position.x) * scale;
                const offsetZ = (platform.position.z - player.position.z) * scale;
                const minimapMeta = platform.userData && platform.userData.minimap;
                const radius = (minimapMeta ? minimapMeta.radius : Math.max(collider.halfSize.x, collider.halfSize.z)) * scale;
                const color = minimapMeta ? minimapMeta.color : 'rgba(120, 170, 220, 0.85)';

                ctx.save();
                ctx.translate(centerX + offsetX, centerY + offsetZ);

                const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'rgba(20, 40, 80, 0.2)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(180, 230, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            });

            crystals.forEach(crystal => {
                ctx.fillStyle = crystal.material.color.getStyle();
                const offsetX = (crystal.position.x - player.position.x) * scale;
                const offsetZ = (crystal.position.z - player.position.z) * scale;

                ctx.beginPath();
                ctx.arc(
                    centerX + offsetX,
                    centerY + offsetZ,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });

            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        setInterval(drawMinimap, 25);
    }

    global.setupMinimap = setupMinimap;
})(window);
