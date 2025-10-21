/**
 * PERFORMANCE MONITORING AND OPTIMIZATION
 * Real-time performance tracking and automatic quality adjustment
 * Provides FPS monitoring, memory tracking, and intelligent optimization
 */

(function(global) {
    
    let performanceData = {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0
    };
    
    let performanceHistory = [];
    let autoOptimizeEnabled = false;
    let lastOptimizationTime = 0;
    let optimizationCooldown = 10000; // 10 seconds
    let isMonitoring = false;
    
    // Performance thresholds
    const PERFORMANCE_THRESHOLDS = {
        EXCELLENT: 55,
        GOOD: 45,
        MODERATE: 30,
        POOR: 20
    };
    
    let frameCount = 0;
    let lastTime = performance.now();
    let fpsUpdateInterval = 1000; // Update FPS every second

    /**
     * Start performance monitoring system
     */
    function startPerformanceMonitoring() {
        if (isMonitoring) return;
        
        isMonitoring = true;
        console.log('Performance monitoring started');
        
        // Update performance metrics regularly
        setInterval(updatePerformanceMetrics, 1000);
        
        // Monitor frame rate continuously
        requestAnimationFrame(trackFrameRate);
        
        // Create performance display if enabled
        createPerformanceDisplay();
    }

    /**
     * Track frame rate in animation loop
     */
    function trackFrameRate() {
        if (!isMonitoring) return;
        
        const currentTime = performance.now();
        frameCount++;
        
        if (currentTime >= lastTime + fpsUpdateInterval) {
            const fps = (frameCount * 1000) / (currentTime - lastTime);
            performanceData.fps = fps;
            performanceData.frameTime = 1000 / fps;
            
            frameCount = 0;
            lastTime = currentTime;
            
            // Store current FPS in global for other systems
            global.currentFPS = fps;
        }
        
        requestAnimationFrame(trackFrameRate);
    }
    
    /**
     * Update comprehensive performance metrics
     */
    function updatePerformanceMetrics() {
        if (!isMonitoring) return;
        
        // Memory usage (if available)
        if (performance.memory) {
            performanceData.memoryUsage = performance.memory.usedJSHeapSize;
        }
        
        // Renderer information
        if (global.renderer && global.renderer.info) {
            const info = global.renderer.info;
            performanceData.drawCalls = info.render.calls;
            performanceData.triangles = info.render.triangles;
            performanceData.geometries = info.memory.geometries;
            performanceData.textures = info.memory.textures;
        }
        
        // Store performance history
        const entry = {
            timestamp: Date.now(),
            ...performanceData
        };
        
        performanceHistory.push(entry);
        
        // Keep only last 60 seconds of data
        const cutoff = Date.now() - 60000;
        performanceHistory = performanceHistory.filter(entry => entry.timestamp > cutoff);
        
        // Auto-optimization check
        if (autoOptimizeEnabled) {
            checkAndOptimize();
        }
        
        // Update performance display
        updatePerformanceDisplay();
        
        // Trigger performance events for other systems
        triggerPerformanceEvents();
    }
    
    /**
     * Intelligent performance optimization
     */
    function checkAndOptimize() {
        const now = Date.now();
        
        // Respect optimization cooldown
        if (now - lastOptimizationTime < optimizationCooldown) {
            return;
        }
        
        // Calculate average FPS over last 10 seconds
        const recentEntries = performanceHistory.filter(
            entry => entry.timestamp > now - 10000
        );
        
        if (recentEntries.length === 0) return;
        
        const avgFPS = recentEntries.reduce((sum, entry) => sum + entry.fps, 0) / recentEntries.length;
        const currentPreset = global.GraphicsSettings ? global.GraphicsSettings.getCurrentPreset() : 'MEDIUM';
        
        // Optimization decisions based on performance
        if (avgFPS < PERFORMANCE_THRESHOLDS.POOR && currentPreset !== 'LOW') {
            console.log('Performance critical, reducing to LOW quality');
            optimizeToLevel('LOW');
            global.StoryManager?.showNotification('Graphics quality reduced to maintain performance', 'warning');
            
        } else if (avgFPS < PERFORMANCE_THRESHOLDS.MODERATE && currentPreset === 'ULTRA') {
            console.log('Performance moderate, reducing from ULTRA to HIGH');
            optimizeToLevel('HIGH');
            global.StoryManager?.showNotification('Graphics quality adjusted for better performance', 'info');
            
        } else if (avgFPS < PERFORMANCE_THRESHOLDS.GOOD && (currentPreset === 'ULTRA' || currentPreset === 'HIGH')) {
            console.log('Performance below good, reducing to MEDIUM');
            optimizeToLevel('MEDIUM');
            global.StoryManager?.showNotification('Graphics quality optimized', 'info');
        }
        
        lastOptimizationTime = now;
    }
    
    /**
     * Apply specific optimization level
     */
    function optimizeToLevel(level) {
        if (global.GraphicsSettings) {
            global.GraphicsSettings.applyPreset(level);
        }
        
        // Additional optimizations based on level
        switch(level) {
            case 'LOW':
                // Disable expensive effects
                if (global.EnhancedParticles) {
                    // Reduce particle counts
                    console.log('Reducing particle effects for better performance');
                }
                break;
                
            case 'MEDIUM':
                // Balanced settings
                break;
                
            case 'HIGH':
            case 'ULTRA':
                // High quality settings
                break;
        }
    }
    
    /**
     * Trigger performance-based events for other systems
     */
    function triggerPerformanceEvents() {
        const fps = performanceData.fps;
        
        // Adjust music intensity based on performance
        if (global.EnhancedAudio) {
            let musicIntensity = 0.5; // Default
            
            if (fps > PERFORMANCE_THRESHOLDS.EXCELLENT) {
                musicIntensity = 0.8; // High intensity for smooth performance
            } else if (fps > PERFORMANCE_THRESHOLDS.GOOD) {
                musicIntensity = 0.6;
            } else if (fps > PERFORMANCE_THRESHOLDS.MODERATE) {
                musicIntensity = 0.4;
            } else {
                musicIntensity = 0.2; // Low intensity for poor performance
            }
            
            global.EnhancedAudio.updateMusicIntensity(musicIntensity);
        }
    }
    
    /**
     * Create performance display overlay
     */
    function createPerformanceDisplay() {
        // Remove existing display
        const existing = document.getElementById('performanceTracker');
        if (existing) existing.remove();
        
        const display = document.createElement('div');
        display.id = 'performanceTracker';
        display.className = 'performance-tracker';
        display.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(display);
    }
    
    /**
     * Update performance display with current metrics
     */
    function updatePerformanceDisplay() {
        const display = document.getElementById('performanceTracker');
        if (!display) return;
        
        // Check if FPS display is enabled in settings
        const showFPS = global.gameSettings && global.gameSettings.showFPS;
        display.style.display = showFPS ? 'block' : 'none';
        
        if (!showFPS) return;
        
        // Calculate performance grade
        const fps = performanceData.fps;
        let grade = 'POOR';
        let gradeColor = '#ff4444';
        
        if (fps > PERFORMANCE_THRESHOLDS.EXCELLENT) {
            grade = 'EXCELLENT';
            gradeColor = '#00ff00';
        } else if (fps > PERFORMANCE_THRESHOLDS.GOOD) {
            grade = 'GOOD';
            gradeColor = '#88ff00';
        } else if (fps > PERFORMANCE_THRESHOLDS.MODERATE) {
            grade = 'MODERATE';
            gradeColor = '#ffaa00';
        }
        
        // Format memory usage
        const memoryMB = performanceData.memoryUsage ? 
            (performanceData.memoryUsage / 1024 / 1024).toFixed(1) : 'N/A';
        
        display.innerHTML = `
            <div class="perf-header">PERFORMANCE MONITOR</div>
            <div class="perf-row">
                <span>FPS:</span> 
                <span style="color: ${gradeColor}">${Math.round(fps)} (${grade})</span>
            </div>
            <div class="perf-row">
                <span>Frame Time:</span> 
                <span>${performanceData.frameTime.toFixed(1)}ms</span>
            </div>
            <div class="perf-row">
                <span>Draw Calls:</span> 
                <span>${performanceData.drawCalls}</span>
            </div>
            <div class="perf-row">
                <span>Triangles:</span> 
                <span>${performanceData.triangles.toLocaleString()}</span>
            </div>
            <div class="perf-row">
                <span>Memory:</span> 
                <span>${memoryMB}MB</span>
            </div>
            <div class="perf-row">
                <span>Geometries:</span> 
                <span>${performanceData.geometries}</span>
            </div>
            <div class="perf-row">
                <span>Textures:</span> 
                <span>${performanceData.textures}</span>
            </div>
            ${autoOptimizeEnabled ? '<div class="perf-auto">AUTO-OPT ON</div>' : ''}
        `;
    }
    
    /**
     * Enable or disable automatic optimization
     */
    function enableAutoOptimization(enabled) {
        autoOptimizeEnabled = enabled;
        console.log(`Auto-optimization ${enabled ? 'enabled' : 'disabled'}`);
        
        if (enabled) {
            global.StoryManager?.showNotification('Auto-optimization enabled - graphics will adjust based on performance', 'info');
        }
    }
    
    /**
     * Get performance statistics
     */
    function getPerformanceStats() {
        const recentEntries = performanceHistory.filter(
            entry => entry.timestamp > Date.now() - 30000 // Last 30 seconds
        );
        
        if (recentEntries.length === 0) {
            return {
                avgFPS: performanceData.fps,
                minFPS: performanceData.fps,
                maxFPS: performanceData.fps,
                grade: 'UNKNOWN'
            };
        }
        
        const fpsList = recentEntries.map(entry => entry.fps);
        const avgFPS = fpsList.reduce((sum, fps) => sum + fps, 0) / fpsList.length;
        const minFPS = Math.min(...fpsList);
        const maxFPS = Math.max(...fpsList);
        
        let grade = 'POOR';
        if (avgFPS > PERFORMANCE_THRESHOLDS.EXCELLENT) grade = 'EXCELLENT';
        else if (avgFPS > PERFORMANCE_THRESHOLDS.GOOD) grade = 'GOOD';
        else if (avgFPS > PERFORMANCE_THRESHOLDS.MODERATE) grade = 'MODERATE';
        
        return { avgFPS, minFPS, maxFPS, grade };
    }
    
    /**
     * Manual performance optimization trigger
     */
    function optimizeNow() {
        const stats = getPerformanceStats();
        
        if (stats.avgFPS < PERFORMANCE_THRESHOLDS.MODERATE) {
            optimizeToLevel('LOW');
            global.StoryManager?.showNotification('Performance optimized to LOW quality', 'success');
        } else if (stats.avgFPS < PERFORMANCE_THRESHOLDS.GOOD) {
            optimizeToLevel('MEDIUM');
            global.StoryManager?.showNotification('Performance optimized to MEDIUM quality', 'success');
        } else {
            global.StoryManager?.showNotification('Performance is already good!', 'info');
        }
        
        lastOptimizationTime = Date.now();
    }
    
    /**
     * Reset performance monitoring
     */
    function resetMonitoring() {
        performanceHistory = [];
        frameCount = 0;
        lastTime = performance.now();
        console.log('Performance monitoring reset');
    }
    
    /**
     * Stop performance monitoring
     */
    function stopMonitoring() {
        isMonitoring = false;
        
        const display = document.getElementById('performanceTracker');
        if (display) display.remove();
        
        console.log('Performance monitoring stopped');
    }

    // Export functions to global scope
    global.PerformanceMonitor = {
        start: startPerformanceMonitoring,
        stop: stopMonitoring,
        reset: resetMonitoring,
        getData: () => performanceData,
        getHistory: () => performanceHistory,
        getStats: getPerformanceStats,
        enableAutoOptimize: enableAutoOptimization,
        optimizeNow: optimizeNow,
        isMonitoring: () => isMonitoring,
        thresholds: PERFORMANCE_THRESHOLDS
    };

})(window);