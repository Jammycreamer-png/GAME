// Enhanced particle system for realistic sand environment
function setupEnvironmentalEffects(scene) {
    // Create multiple particle systems for layered effect
    const totalParticles = 2000; // Increased particle count
    const particleGroups = [];
    const textureLoader = new THREE.TextureLoader();
    
    // Try to load dust texture, fall back to procedural if needed
    const particleTexture = textureLoader.load('textures/dust1.png', 
        function(texture) {
            console.log('Dust particle texture loaded successfully');
            createParticleSystems(texture);
        },
        undefined,
        function(err) {
            console.warn('Failed to load dust particle texture, using procedural texture', err);
            
            // Create fallback texture
            const particleCanvas = document.createElement('canvas');
            particleCanvas.width = 64;
            particleCanvas.height = 64;
            const pCtx = particleCanvas.getContext('2d');
            
            // Draw a soft, circular particle
            const gradient = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 250, 240, 0.7)');
            gradient.addColorStop(0.3, 'rgba(255, 250, 240, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 250, 240, 0)');
            
            pCtx.fillStyle = gradient;
            pCtx.fillRect(0, 0, 64, 64);
            
            const fallbackTexture = new THREE.CanvasTexture(particleCanvas);
            createParticleSystems(fallbackTexture);
        }
    );
    
    function createParticleSystems(texture) {
        // Create different particle size groups
        createParticleGroup(texture, totalParticles * 0.6, 0.2, 0.4, 15, scene); // Small particles
        createParticleGroup(texture, totalParticles * 0.3, 0.4, 0.7, 10, scene); // Medium particles
        createParticleGroup(texture, totalParticles * 0.1, 0.7, 1.2, 5, scene);  // Large particles
    }
    
    function createParticleGroup(texture, count, minSize, maxSize, maxHeight, scene) {
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);
        const speeds = new Float32Array(count);
        
        // Initialize particles with random positions and properties
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Spread particles in a larger area
            const distance = Math.random() * 80 + 20;
            const angle = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(angle) * distance;
            positions[i3 + 1] = Math.random() * maxHeight;
            positions[i3 + 2] = Math.sin(angle) * distance;
            
            // Random size for each particle
            sizes[i] = Math.random() * (maxSize - minSize) + minSize;
            
            // Random opacity for visual variety
            opacities[i] = Math.random() * 0.5 + 0.2;
            
            // Random movement speed
            speeds[i] = Math.random() * 0.5 + 0.5;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create material with alpha blending for smoother particles
        const particleMaterial = new THREE.PointsMaterial({
            size: 1.0,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: false,
            color: 0xE6D0B2,   // Warm sand color
            opacity: 0.6
        });
        
        // Create and add particles to scene
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        
        // Store particle group data for animation
        particleGroups.push({
            particles: particles,
            geometry: particleGeometry,
            material: particleMaterial,
            positions: positions,
            opacities: opacities,
            sizes: sizes,
            speeds: speeds,
            count: count,
            maxHeight: maxHeight
        });
        
        return particles;
    }
    
    // Create a distant mirage effect
    const mirageGeometry = new THREE.PlaneGeometry(200, 50, 64, 8);
    const mirageMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            uniform float time;
            
            void main() {
                vUv = uv;
                
                // Add subtle wave motion to vertices
                vec3 pos = position;
                float wave = sin(position.x * 0.05 + time * 0.5) * 0.2 +
                            cos(position.x * 0.1 - time * 0.3) * 0.1;
                pos.y += wave * position.y * 0.1;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            
            void main() {
                // Heat distortion effect
                float intensity = smoothstep(0.4, 0.0, vUv.y);
                float distortion = sin(vUv.x * 40.0 + time * 0.5) * 0.1 * intensity;
                
                // Create a gradient for the mirage
                vec3 baseColor = vec3(1.0, 1.0, 1.0);
                float alpha = distortion * 0.3 * intensity;
                
                // Add heat ripple effect
                alpha += sin(vUv.x * 100.0 + time) * cos(vUv.x * 78.0 - time * 0.3) * 0.01 * intensity;
                
                // Create the mirage effect (transparent with gradient)
                gl_FragColor = vec4(baseColor, alpha * (1.0 - vUv.y * 2.0));
            }
        `,
        transparent: true,
        depthWrite: false
    });
    
    const mirage = new THREE.Mesh(mirageGeometry, mirageMaterial);
    mirage.position.y = 0.1;
    mirage.rotation.x = -Math.PI / 2;
    scene.add(mirage);
    
    // Player position for reference (update this when character moves)
    const playerPosition = new THREE.Vector3(0, 0, 0);
    
    // Animate particles
    function updateParticles(time) {
        // Update player position - this should come from your character
        if (window.character) {
            playerPosition.copy(window.character.position);
        }
        
        // Update each particle group
        particleGroups.forEach((group, groupIndex) => {
            const positions = group.positions;
            const count = group.count;
            const speedFactor = 0.01 * (1 - groupIndex * 0.2); // Different speeds for different sizes
            
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const speedMultiplier = group.speeds[i % group.speeds.length];
                
                // Create swirling motion
                positions[i3] += Math.sin(time * 0.001 + i) * speedFactor * speedMultiplier;
                positions[i3 + 2] += Math.cos(time * 0.0015 + i) * speedFactor * speedMultiplier;
                
                // Gentle upward drift with varying speed
                positions[i3 + 1] += 0.01 * speedMultiplier;
                
                // Reset if too high or too far from player
                if (positions[i3 + 1] > group.maxHeight || 
                    new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2])
                        .distanceTo(playerPosition) > 120) {
                    
                    // Respawn - either randomly around the world or near player
                    if (Math.random() < 0.3) {
                        // Spawn near player
                        const distance = Math.random() * 15 + 10;
                        const angle = Math.random() * Math.PI * 2;
                        
                        positions[i3] = playerPosition.x + Math.cos(angle) * distance;
                        positions[i3 + 1] = Math.random() * 2; // Near ground
                        positions[i3 + 2] = playerPosition.z + Math.sin(angle) * distance;
                    } else {
                        // Spawn randomly in world
                        const distance = Math.random() * 80 + 20;
                        const angle = Math.random() * Math.PI * 2;
                        
                        positions[i3] = Math.cos(angle) * distance;
                        positions[i3 + 1] = Math.random() * 5;
                        positions[i3 + 2] = Math.sin(angle) * distance;
                    }
                }
            }
            
            group.geometry.attributes.position.needsUpdate = true;
            
            // Pulse opacity slightly for a more natural look
            group.material.opacity = 0.5 + Math.sin(time * 0.0005) * 0.1;
        });
        
        // Update mirage effect
        if (mirage && mirage.material.uniforms) {
            mirage.material.uniforms.time.value = time * 0.001;
            
            // Position mirage near player
            if (window.character) {
                mirage.position.x = playerPosition.x;
                mirage.position.z = playerPosition.z;
            }
        }
    }
    
    // Expose to global scope for lighting system to update
    window.environmentEffects = {
        mirage: mirage,
        updateParticles: updateParticles,
        playerPosition: playerPosition
    };
    
    return {
        updateParticles,
        mirage
    };
}