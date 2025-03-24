/**
 * Professional 3D Game Engine
 * Core engine functionality
 */

const Engine = (function() {
    // Private engine variables
    let scene, camera, renderer;
    let renderWidth, renderHeight;
    let clock;
    let systems = [];
    let assetsLoaded = 0;
    let totalAssets = 0;
    
    // Initialize the engine
    function init() {
        // Create scene
        scene = new THREE.Scene();
        
        // Create perspective camera
        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 3000;
        
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 1.7, -5);
        
        // Create WebGL renderer with advanced options
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance",
            stencil: false
        });
        
        // Configure renderer
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add renderer to page
        document.body.appendChild(renderer.domElement);
        
        // Create clock for timing
        clock = new THREE.Clock();
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize);
        
        console.log("Engine initialized");
    }
    
    // Handle window resize
    function onWindowResize() {
        renderWidth = window.innerWidth;
        renderHeight = window.innerHeight;
        
        camera.aspect = renderWidth / renderHeight;
        camera.updateProjectionMatrix();
        
        renderer.setSize(renderWidth, renderHeight);
        
        // Notify systems of resize
        for (const system of systems) {
            if (system.onResize) {
                system.onResize(renderWidth, renderHeight);
            }
        }
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();
        
        // Update all registered systems
        for (const system of systems) {
            if (system.update) {
                system.update(deltaTime, elapsedTime);
            }
        }
        
        // Render the scene
        renderer.render(scene, camera);
    }
    
    // Start the engine
    function start() {
        animate();
        hideLoadingScreen();
    }
    
    // Register a system with the engine
    function registerSystem(system) {
        systems.push(system);
        
        // Initialize the system if it has an init method
        if (system.init) {
            system.init(scene, camera, renderer);
        }
        
        return system;
    }
    
    // Asset loading progress tracking
    function trackAssetLoading(numAssets) {
        totalAssets += numAssets;
        updateLoadingProgress(0);
    }
    
    function assetLoaded() {
        assetsLoaded++;
        const progress = assetsLoaded / totalAssets;
        updateLoadingProgress(progress);
        
        // Check if all assets are loaded
        if (assetsLoaded >= totalAssets) {
            console.log("All assets loaded");
        }
    }
    
    function updateLoadingProgress(progress) {
        const percent = Math.min(Math.round(progress * 100), 100);
        const loadingBar = document.getElementById('loading-bar');
        const loadingStatus = document.getElementById('loading-status');
        
        if (loadingBar) {
            loadingBar.style.width = `${percent}%`;
        }
        
        if (loadingStatus) {
            if (percent < 100) {
                loadingStatus.textContent = `Loading assets... ${percent}%`;
            } else {
                loadingStatus.textContent = 'Initializing environment...';
            }
        }
    }
    
    function hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading');
        if (loadingScreen) {
            loadingScreen.style.opacity = 0;
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    // Public API
    return {
        init,
        start,
        registerSystem,
        getScene: () => scene,
        getCamera: () => camera,
        getRenderer: () => renderer,
        getClock: () => clock,
        trackAssetLoading,
        assetLoaded
    };
})();