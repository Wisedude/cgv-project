(function(global) {
    const levelConfigs = [
        {
            name: "Crystal Caverns",
            crystalCount: 8,
            timeLimit: 60,
            platforms: [
                { pos: [0, 0, 0], size: [24, 2, 24], color: "#5a4e3c" },
                { pos: [12, 3, -12], size: [12, 2, 10], color: "#6c5c49" },
                { pos: [0, 6, -24], size: [8, 1.5, 14], color: "#7a6754" },
                { pos: [-10, 9, -38], size: [10, 2, 10], color: "#60574d" },
                { pos: [-2, 12, -52], size: [8, 1.5, 10], color: "#74604d" },
                { pos: [8, 14, -68], size: [14, 2, 14], color: "#4c443a" },
                { pos: [22, 8, -40], size: [10, 2, 10], color: "#8a7a66" }
            ]
        },
        {
            name: "Sky Temples",
            crystalCount: 12,
            timeLimit: 60,
            platforms: [
                { pos: [0, 0, 0], size: [18, 2, 18], color: "#5c5246" },
                { pos: [10, 4, -12], size: [10, 2, 10], color: "#73624e" },
                { pos: [-12, 6, -18], size: [12, 2, 10], color: "#8a725e" },
                { pos: [4, 9, -30], size: [8, 1.5, 14], color: "#555c51" },
                { pos: [16, 12, -40], size: [9, 2, 9], color: "#6b5646" },
                { pos: [-6, 15, -52], size: [8, 1.5, 10], color: "#84715d" },
                { pos: [2, 18, -66], size: [14, 2, 12], color: "#657060" },
                { pos: [-10, 22, -82], size: [10, 2, 10], color: "#9b7f66" },
                { pos: [8, 26, -98], size: [10, 1.5, 14], color: "#6a594a" }
            ]
        },
        {
            name: "Cosmic Realm",
            crystalCount: 15,
            timeLimit: 60,
            platforms: [
                { pos: [0, 0, 0], size: [16, 2, 16], color: "#3f3a35" },
                { pos: [-6, 3, 10], size: [8, 2, 8], color: "#57514b" },
                { pos: [9, 4, -12], size: [10, 2, 8], color: "#6c5a4f" },
                { pos: [-12, 7, -26], size: [10, 1.5, 16], color: "#47413d" },
                { pos: [5, 11, -42], size: [7, 1.5, 7], color: "#7b685c" },
                { pos: [-4, 14, -58], size: [12, 2, 12], color: "#534e4b" },
                { pos: [-16, 17, -74], size: [9, 2, 9], color: "#6b5b51" },
                { pos: [4, 20, -90], size: [10, 1.5, 16], color: "#434446" },
                { pos: [14, 24, -108], size: [10, 2, 10], color: "#7a6355" },
                { pos: [0, 28, -126], size: [12, 2, 12], color: "#5a524d" },
                { pos: [-10, 32, -144], size: [8, 1.5, 8], color: "#8a7463" },
                { pos: [6, 36, -166], size: [14, 2, 14], color: "#444041" }
            ]
        }
    ];

    function clearLevel() {
        if (scene && platforms) {
            platforms.forEach(platform => scene.remove(platform));
            platforms.length = 0;
        }
        if (scene && crystals) {
            crystals.forEach(crystal => scene.remove(crystal));
            crystals.length = 0;
        }
        if (scene && particles) {
            particles.forEach(particle => scene.remove(particle));
            particles.length = 0;
        }
        if (scene && player) {
            scene.remove(player);
            player = null;
        }
    }

    function loadLevel(levelNum) {
        const config = levelConfigs[levelNum - 1];

        // if (typeof showLoadingScreen === 'function') {
        //     const label = config && config.name ? `Preparing ${config.name}` : 'Preparing level...';
        //     showLoadingScreen(label);
        // }

        clearLevel();

        // if (!config) {
        //     if (typeof hideLoadingScreen === 'function') {
        //         hideLoadingScreen(0);
        //     }
        //     return;
        // }

        totalCrystals = config.crystalCount;
        gameTime = config.timeLimit;

        if (typeof createPlayer === 'function') {
            createPlayer();
        }

        if (typeof global.resetViewOrientation === 'function') {
            global.resetViewOrientation();
        }

        if (Array.isArray(config.platforms) && typeof createPlatform === 'function') {
            config.platforms.forEach(platData => createPlatform(platData.pos, platData.size, platData.color));
        }

        if (typeof createCrystals === 'function') {
            createCrystals(config.crystalCount);
        }

        if (typeof createEnvironment === 'function') {
            createEnvironment();
        }

        collectedCrystals = 0;
        levelStartTime = Date.now();

        if (typeof startTimer === 'function') {
            startTimer();
        }
        if (typeof updateUI === 'function') {
            updateUI();
        }

        if (typeof hideLoadingScreen === 'function') {
            requestAnimationFrame(() => hideLoadingScreen(500));
        }
    }

    function nextLevel() {
        document.getElementById('levelComplete').style.display = 'none';
        levelCompleteActive = false;

        if (currentLevel < maxLevel) {
            currentLevel++;
            loadLevel(currentLevel);
            gameStarted = true;
        } else {
            alert(`🎉 Congratulations! You've completed all levels!\nFinal Score: ${score}`);
            backToMenu();
        }
    }

    function restartLevel() {
        document.getElementById('gameOver').style.display = 'none';
        document.getElementById('levelComplete').style.display = 'none';
        levelCompleteActive = false;
        loadLevel(currentLevel);
        gameStarted = true;

        if (window.audioManager && typeof window.audioManager.startBackground === 'function') {
            try {
                window.audioManager.startBackground();
            } catch (err) {
                console.warn('[Audio] Failed to restart background music', err);
            }
        }
    }

    function levelComplete() {
        gameStarted = false;
        if (gameTimer) clearInterval(gameTimer);
        levelCompleteActive = true;

        if (window.audioManager && typeof window.audioManager.playWin === 'function') {
            try {
                window.audioManager.playWin();
            } catch (err) {
                console.warn('[Audio] Failed to play win sound', err);
            }
        }

        score += gameTime * 10;

        document.getElementById('levelStats').textContent =
            `Crystals: ${collectedCrystals}/${totalCrystals} | Time Bonus: ${gameTime * 10} | Total Score: ${score}`;
        document.getElementById('levelComplete').style.display = 'block';
    }

    global.levelConfigs = levelConfigs;
    global.loadLevel = loadLevel;
    global.clearLevel = clearLevel;
    global.nextLevel = nextLevel;
    global.restartLevel = restartLevel;
    global.levelComplete = levelComplete;
})(window);
