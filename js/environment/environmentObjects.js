/**
 * Professional Environment Objects
 * Creates rocks, cacti, and other desert objects with physics
 */

const EnvironmentSystem = (function() {
    // Private variables
    let scene;
    let collisionSystem;
    let terrain;
    
    // Initialize the environment
    function init(sceneRef, terrainData, collisionSystemRef) {
        scene = sceneRef;
        terrain = terrainData;
        collisionSystem = collisionSystemRef;
        
        // Create environment objects
        createRocks();
        createCacti();
        createSmallDebris();
        
        // Create distant mountains
        createDistantMountains();
    }
    
    // Create realistic desert rocks
    function createRocks() {
        const rockCount = 30;
        
        // Create rock geometries
        const rockGeometries = [
            createRockGeometry(1, 0),
            createRockGeometry(2, 1),
            createRockGeometry(3, 0),
            createRockGeometry(2, 2)
        ];
        
        // Create rock materials
        const rockMaterials = [
            new THREE.MeshStandardMaterial({
                color: 0x7a7a7a,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
            }),
            new THREE.MeshStandardMaterial({
                color: 0x8a7a6a,
                roughness: 0.8,
                metalness: 0.2,
                flatShading: true
            })
        ];
        
        // Place rocks around the terrain
        for (let i = 0; i < rockCount; i++) {
            // Random position
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 400;
            
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Get height at position
            const y = CollisionSystem.getHeightAt(x, z) || TerrainSystem.getHeightAt(x, z) || 0;
            
            // Create rock
            const rockGeom = rockGeometries[Math.floor(Math.random() * rockGeometries.length)].clone();
            const rockMat = rockMaterials[Math.floor(Math.random() * rockMaterials.length)].clone();
            
            const rock = new THREE.Mesh(rockGeom, rockMat);
            
            // Random scale
            const scale = Math.random() * 3 + 1;
            rock.scale.set(
                scale * (0.8 + Math.random() * 0.4),
                scale * (0.7 + Math.random() * 0.6),
                scale * (0.8 + Math.random() * 0.4)
            );
            
            // Position
            rock.position.set(x, y, z);
            
            // Random rotation
            rock.rotation.set(
                0,
                Math.random() * Math.PI * 2,
                0
            );
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            scene.add(rock);
            
            // Add to collision system
            if (collisionSystem && collisionSystem.addCollisionObject) {
                collisionSystem.addCollisionObject(rock, Math.max(rock.scale.x, rock.scale.z) * 0.8);
            }
        }
        
        // Create rock clusters
        createRockClusters(rockGeometries, rockMaterials);
    }
    
    // Create realistic rock geometry with natural variation
    function createRockGeometry(detail, seed) {
        let geometry;
        
        // Create base geometry
        switch(seed % 4) {
            case 0:
                geometry = new THREE.DodecahedronGeometry(1, detail);
                break;
            case 1:
                geometry = new THREE.IcosahedronGeometry(1, detail);
                break;
            case 2:
                geometry = new THREE.OctahedronGeometry(1, detail);
                break;
            case 3:
                geometry = new THREE.TetrahedronGeometry(1, detail);
                break;
        }
        
        // Randomize vertices for more natural look
        const positions = geometry.attributes.position;
        const vertices = geometry.attributes.position.array;
        
        // Use deterministic randomization based on seed
        const random = createSeededRandom(seed);
        
        for (let i = 0; i < positions.count; i++) {
            const i3 = i * 3;
            
            // Get vertex position
            const x = vertices[i3];
            const y = vertices[i3 + 1];
            const z = vertices[i3 + 2];
            
            // Get vertex length
            const length = Math.sqrt(x*x + y*y + z*z);
            
            // Add noise to vertex
            vertices[i3] += (random() - 0.5) * 0.2;
            vertices[i3 + 1] += (random() - 0.5) * 0.2;
            vertices[i3 + 2] += (random() - 0.5) * 0.2;
            
            // Ensure the vertex stays roughly the same distance from center
            const newLength = Math.sqrt(
                vertices[i3] * vertices[i3] + 
                vertices[i3 + 1] * vertices[i3 + 1] + 
                vertices[i3 + 2] * vertices[i3 + 2]
            );
            
            const scale = length / newLength;
            
            vertices[i3] *= scale;
            vertices[i3 + 1