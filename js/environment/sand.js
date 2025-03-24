// Functions for creating sand textures and materials
function createSandTexture() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load the textures - use fallback to generated textures if file doesn't load
    const sandTexture = textureLoader.load('textures/sand/ground/Ground079L_1K-PNG_Color.png', 
        // Success callback
        function(texture) {
            console.log('Sand texture loaded successfully');
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(8, 8);
        },
        // Progress callback
        undefined,
        // Error callback - create procedural texture if file doesn't load
        function(err) {
            console.warn('Failed to load sand texture, using procedural texture', err);
            return createProceduralSandTexture();
        }
    );
    
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(8, 8);
    
    return sandTexture;
}

// Fallback procedural texture in case file loading fails
function createProceduralSandTexture() {
    // Create a canvas for the sand texture
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size (power of 2 for best texture performance)
    canvas.width = 512;
    canvas.height = 512;
    
    // Base sand color
    const baseColor = '#D2B48C'; // Sandy tan color
    
    // Fill with base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add noise for sand grain effect
    const grainColors = ['#C2A47C', '#E5CCAA', '#BFA378', '#D6BC94']; // Various sand grain colors
    
    // Add random sand grains
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2 + 0.5;
        
        ctx.fillStyle = grainColors[Math.floor(Math.random() * grainColors.length)];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add some subtle wave patterns to simulate sand ripples
    for (let y = 0; y < canvas.height; y += 20) {
        const waviness = Math.random() * 5 + 10;
        const amplitude = Math.random() * 3 + 2;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = Math.random() * 2 + 1;
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x += 4) {
            const yOffset = Math.sin(x / waviness) * amplitude;
            
            if (x === 0) {
                ctx.moveTo(x, y + yOffset);
            } else {
                ctx.lineTo(x, y + yOffset);
            }
        }
        
        ctx.stroke();
    }
    
    // Create Three.js texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Set texture properties for tiling
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
}

function createNormalMap() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 256;
    canvas.height = 256;
    
    // Fill with neutral normal map color (flat surface pointing up)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add random bumps
    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 4 + 1;
        const strength = Math.random() * 40 + 10;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgb(${128 + strength}, ${128 + strength}, 255)`);
        gradient.addColorStop(1, 'rgb(128, 128, 255)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
}

function createAdvancedSandMaterial() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load all textures with the specific filenames you have
    const sandBaseTexture = textureLoader.load('textures/sand/ground/Ground079L_1K-PNG_Color.png');
    const normalMap = textureLoader.load('textures/sand/ground/Ground079L_1K-PNG_NormalGL.png');
    const roughnessMap = textureLoader.load('textures/sand/ground/Ground079L_1K-PNG_Roughness.png');
    const displacementMap = textureLoader.load('textures/sand/ground/Ground079L_1K-PNG_Displacement.png');
    const aoMap = textureLoader.load('textures/sand/ground/Ground079L_1K-PNG_AmbientOcclusion.png');
    
    // Set texture properties for tiling
    sandBaseTexture.wrapS = THREE.RepeatWrapping;
    sandBaseTexture.wrapT = THREE.RepeatWrapping;
    sandBaseTexture.repeat.set(8, 8);
    
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(8, 8);
    
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(8, 8);
    
    displacementMap.wrapS = THREE.RepeatWrapping;
    displacementMap.wrapT = THREE.RepeatWrapping;
    displacementMap.repeat.set(8, 8);
    
    aoMap.wrapS = THREE.RepeatWrapping;
    aoMap.wrapT = THREE.RepeatWrapping;
    aoMap.repeat.set(8, 8);
    
    // Create the material with physically-based rendering
    const sandMaterial = new THREE.MeshPhysicalMaterial({ 
        map: sandBaseTexture,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(1.0, 1.0),
        displacementMap: displacementMap,
        displacementScale: 0.15,
        roughnessMap: roughnessMap,
        roughness: 0.85,
        aoMap: aoMap,
        aoMapIntensity: 0.5,
        metalness: 0.0,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
        color: 0xffffff, // Use white to let the texture color show through
        envMapIntensity: 0.5
    });
    
    return sandMaterial;
}

function createSandDisplacementMap() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Fill with base gray (neutral displacement)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Use Perlin noise for natural sand dune patterns
    // (Simplified implementation here - would use proper Perlin noise in production)
    for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) {
            // Create varied displacement patterns
            const largeScale = Math.sin(x/150) * Math.cos(y/150) * 20;
            const mediumScale = Math.sin(x/50 + 0.5) * Math.cos(y/60 + 0.5) * 15;
            const smallScale = Math.random() * 10;
            
            const value = 128 + largeScale + mediumScale + smallScale;
            
            ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
            ctx.fillRect(x, y, 4, 4);
        }
    }
    
    // Create ripple patterns in some areas
    for (let i = 0; i < 10; i++) {
        const centerX = Math.random() * canvas.width;
        const centerY = Math.random() * canvas.height;
        const radius = 100 + Math.random() * 200;
        
        for (let r = 0; r < radius; r += 5) {
            ctx.strokeStyle = `rgba(180, 180, 180, ${(radius-r)/radius * 0.1})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createSandRoughnessMap() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Base roughness
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add noise for varied roughness
    for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
            const value = 180 + Math.random() * 50;
            ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    
    // Add some smoother paths (like packed sand)
    for (let i = 0; i < 5; i++) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;
        const endX = Math.random() * canvas.width;
        const endY = Math.random() * canvas.height;
        
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.lineWidth = 10 + Math.random() * 20;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Create curved path
        const ctrlX = (startX + endX) / 2 + (Math.random() - 0.5) * 100;
        const ctrlY = (startY + endY) / 2 + (Math.random() - 0.5) * 100;
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createRealisticSandGround(scene, footprintSystem) {
    // Create geometry with more subdivisions for displacement
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 128, 128);
    
    // Create advanced sand material with footprints
    const sandMaterial = createAdvancedSandMaterial();
    
    // Add footprint displacement map to the material
    groundGeometry.setAttribute('uv2', groundGeometry.attributes.uv.clone());
    sandMaterial.displacementMap = footprintSystem.getRenderTarget();
    
    const ground = new THREE.Mesh(groundGeometry, sandMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add sand dunes
    addDetailedSandDunes(scene);
    
    return ground;
}

function addDetailedSandDunes(scene) {
    const duneCount = 30;
    
    // Use more complex geometry for dunes
    for (let i = 0; i < duneCount; i++) {
        // Decide dune type (large, medium, small)
        const duneType = Math.floor(Math.random() * 3);
        
        let duneGeometry;
        if (duneType === 0) {
            // Large dune with more detail
            duneGeometry = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        } else if (duneType === 1) {
            // Medium ridge-like dune
            duneGeometry = new THREE.CylinderGeometry(1, 1.4, 1, 32, 1, true, 0, Math.PI);
        } else {
            // Small bump
            duneGeometry = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.3);
        }
        
        // Create a more detailed sand material for dunes
        const duneMaterial = createAdvancedSandMaterial();
        
        const dune = new THREE.Mesh(duneGeometry, duneMaterial);
        
        // Position dunes around the scene
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 40;
        dune.position.x = Math.cos(angle) * distance;
        dune.position.z = Math.sin(angle) * distance;
        
        // Scale based on dune type
        let scaleX, scaleY, scaleZ;
        if (duneType === 0) {
            // Large dune
            scaleX = 5 + Math.random() * 10;
            scaleY = 1 + Math.random() * 3;
            scaleZ = 5 + Math.random() * 10;
        } else if (duneType === 1) {
            // Ridge dune
            scaleX = 2 + Math.random() * 5;
            scaleY = 0.5 + Math.random() * 1.5;
            scaleZ = 10 + Math.random() * 20;
        } else {
            // Small bump
            scaleX = 1 + Math.random() * 3;
            scaleY = 0.5 + Math.random() * 1;
            scaleZ = 1 + Math.random() * 3;
        }
        
        dune.scale.set(scaleX, scaleY, scaleZ);
        
        // Random rotation
        dune.rotation.y = Math.random() * Math.PI * 2;
        
        dune.castShadow = true;
        dune.receiveShadow = true;
        
        scene.add(dune);
    }
}