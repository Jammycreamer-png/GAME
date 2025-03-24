// Ensure THREE is available
if (typeof THREE === 'undefined') {
    console.error('THREE.js is not loaded. Please include the Three.js library before this script.');
}

// Global variables
let scene, camera, renderer;
let clock;
let footprintSystem;
let environmentEffects;
let lightingSystem;
let character;
let mixer;
let idleAction, walkAction, runAction, currentAction;
let ground;

// Camera settings
const cameraOffset = new THREE.Vector3(0, 2, -5);

// Control variables
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false
};

// Movement settings
const moveSpeed = 0.1;
const runSpeed = 0.2;
const turnSpeed = 0.05;

// Initialize everything
function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, -5);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Initialize clock
    clock = new THREE.Clock();
    
    // Setup systems in correct order
    // First, the environment and lighting
    try {
        lightingSystem = createDynamicLighting ? createDynamicLighting(scene) : null;
        environmentEffects = setupEnvironmentalEffects ? setupEnvironmentalEffects(scene) : null;
        
        // Then the footprint system (requires renderer)
        footprintSystem = createFootprintSystem ? createFootprintSystem(renderer, scene) : null;
        
        // Create sand ground with footprints system
        ground = createRealisticSandGround ? createRealisticSandGround(scene, footprintSystem) : null;
    } catch (error) {
        console.warn('Error setting up environment systems:', error);
    }
    
    // Load character
    loadCharacterSafely();
    
    // Setup keyboard controls
    setupControls();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Safely load character with error handling
function loadCharacterSafely() {
    if (typeof loadCharacter === 'function') {
        loadCharacter(scene, function(loadedCharacter, animations) {
            if (loadedCharacter && animations) {
                character = loadedCharacter;
                mixer = animations.mixer;
                idleAction = animations.idle;
                walkAction = animations.walk;
                runAction = animations.run;
                currentAction = idleAction;
            } else {
                console.warn('Character or animations not loaded correctly');
            }
        });
    } else {
        console.warn('loadCharacter function is not defined');
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock ? clock.getDelta() : 0;
    const elapsedTime = clock ? clock.getElapsedTime() : 0;
    
    updateCharacter(deltaTime);
    updateCamera();
    
    // Update footprints if character is moving
    if (character && (keys.forward || keys.backward)) {
        safeUpdateFootprints(deltaTime, elapsedTime);
    }
    
    // Slowly restore sand (footprints fade)
    if (footprintSystem && typeof footprintSystem.restoreSand === 'function') {
        footprintSystem.restoreSand();
    }
    
    // Update environment systems
    if (environmentEffects && typeof environmentEffects.updateParticles === 'function') {
        environmentEffects.updateParticles(elapsedTime * 1000);
    }
    
    if (lightingSystem && typeof lightingSystem.updateLighting === 'function') {
        lightingSystem.updateLighting(deltaTime);
    }
    
    renderer.render(scene, camera);
}

// Safely update footprints
function safeUpdateFootprints(deltaTime, elapsedTime) {
    if (typeof updateFootprints === 'function') {
        updateFootprints(character, elapsedTime, keys, footprintSystem);
    } else if (footprintSystem) {
        console.warn('updateFootprints function is not defined');
    }
}

// Update character position and animation
function updateCharacter(deltaTime) {
    if (!character || !mixer) return;
    
    // Update animations
    mixer.update(deltaTime);
    
    // Check if moving
    let isMoving = keys.forward || keys.backward || keys.left || keys.right;
    let isRunning = isMoving && keys.shift;
    
    // Handle rotation (left/right)
    if (keys.left) {
        character.rotation.y += turnSpeed;
    }
    if (keys.right) {
        character.rotation.y -= turnSpeed;
    }
    
    // Handle movement (forward/backward)
    if (keys.forward || keys.backward) {
        const speed = isRunning ? runSpeed : moveSpeed;
        const direction = keys.forward ? 1 : -1;
        
        // Calculate movement vector and apply it
        const moveZ = Math.cos(character.rotation.y) * speed * direction;
        const moveX = Math.sin(character.rotation.y) * speed * direction;
        
        character.position.z += moveZ;
        character.position.x += moveX;
    }
    
    // Update animation state
    if (isMoving) {
        if (isRunning && runAction) {
            setAction(runAction);
        } else if (walkAction) {
            setAction(walkAction);
        }
    } else if (idleAction) {
        setAction(idleAction);
    }
}

// Function to handle animation transitions
function setAction(newAction) {
    if (currentAction === newAction) return;
    
    if (currentAction) {
        currentAction.fadeOut(0.2);
    }
    
    newAction.reset();
    newAction.fadeIn(0.2);
    newAction.play();
    
    currentAction = newAction;
}

// Update camera to follow character
function updateCamera() {
    if (!character) return;
    
    // Calculate offset based on character rotation
    const offsetX = Math.sin(character.rotation.y) * cameraOffset.z;
    const offsetZ = Math.cos(character.rotation.y) * cameraOffset.z;
    
    // Set target camera position
    const targetX = character.position.x + offsetX;
    const targetY = character.position.y + cameraOffset.y;
    const targetZ = character.position.z + offsetZ;
    
    // Smoothly move camera to target position
    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1);
    
    // Look at character
    camera.lookAt(
        character.position.x,
        character.position.y + 1.5,
        character.position.z
    );
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Setup keyboard controls
function setupControls() {
    document.addEventListener('keydown', function(event) {
        switch(event.key.toLowerCase()) {
            case 'w': keys.forward = true; break;
            case 's': keys.backward = true; break;
            case 'a': keys.left = true; break;
            case 'd': keys.right = true; break;
            case 'shift': keys.shift = true; break;
        }
    });
    
    document.addEventListener('keyup', function(event) {
        switch(event.key.toLowerCase()) {
            case 'w': keys.forward = false; break;
            case 's': keys.backward = false; break;
            case 'a': keys.left = false; break;
            case 'd': keys.right = false; break;
            case 'shift': keys.shift = false; break;
        }
    });
}

// Start everything
function startApplication() {
    // Check for required libraries
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is required. Please include the library.');
        return;
    }
    
    // Initialize the application
    init();
}

// Call start function when script loads
startApplication();