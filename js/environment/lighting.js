/**
 * Professional Lighting System
 * Creates physically-based lighting for realistic desert environment
 */

const LightingSystem = (function() {
    // Private lighting variables
    let sunLight;
    let ambientLight;
    let hemisphereLight;
    let lightHelper;
    
    // Initialize lighting system
    function init(scene, camera, renderer) {
        // Create main directional light (sun)
        sunLight = new THREE.DirectionalLight(0xFFFBF5, 2.5);
        sunLight.position.set(100, 100, 100);
        sunLight.castShadow = true;
        
        // Configure high-quality shadows
        const shadowSize = 200;
        sunLight.shadow.camera.left = -shadowSize;
        sunLight.shadow.camera.right = shadowSize;
        sunLight.shadow.camera.top = shadowSize;
        sunLight.shadow.camera.bottom = -shadowSize;
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 500;
        
        // High-quality shadow mapping
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.bias = -0.0001;
        sunLight.shadow.normalBias = 0.01;
        
        scene.add(sunLight);
        
        // Add ambient light with soft blue sky contribution
        ambientLight = new THREE.AmbientLight(0x90A3BF, 0.4);
        scene.add(ambientLight);
        
        // Hemisphere light for better environmental lighting
        hemisphereLight = new THREE.HemisphereLight(0xB1E1FF, 0xC38A42, 0.6);
        scene.add(hemisphereLight);
        
        return {
            sunLight,
            ambientLight,
            hemisphereLight
        };
    }
    
    // Update lighting based on time of day and sky
    function update(deltaTime, elapsedTime) {
        // Only update if both systems are available
        if (!sunLight || !SkySystem) return;
        
        // Get sun position from sky system
        const sunPosition = SkySystem.getSunPosition();
        const sunColor = SkySystem.getSunColor();
        
        // Update directional light position to match sky sun
        sunLight.position.copy(sunPosition.normalize().multiplyScalar(100));
        
        // Calculate light intensity based on sun height
        const height = sunPosition.y / 400000;
        
        // Day/night cycle
        if (height > 0.1) {
            // Day
            const intensity = Math.max(0.5, height) * 2.5;
            sunLight.intensity = intensity;
            sunLight.color.copy(sunColor);
            
            // Update ambient and hemisphere as well
            ambientLight.intensity = 0.2 + height * 0.5;
            hemisphereLight.intensity = 0.3 + height * 0.7;
        } else {
            // Night
            sunLight.intensity = 0.1;
            sunLight.color.set(0x8080FF); // Moonlight blue
            ambientLight.intensity = 0.1;
            hemisphereLight.intensity = 0.2;
        }
    }
    
    // Handle window resize
    function onResize(width, height) {
        if (sunLight && sunLight.shadow && sunLight.shadow.camera) {
            sunLight.shadow.camera.updateProjectionMatrix();
        }
    }
    
    // Public API
    return {
        init,
        update,
        onResize,
        getSunLight: () => sunLight
    };
})();