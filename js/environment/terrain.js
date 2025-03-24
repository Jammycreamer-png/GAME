// terrain.js - A realistic terrain system with physics

// Physics variables
let physicsWorld;
let tmpTrans;
let rigidBodies = [];

// Initialize Ammo.js physics
function initPhysics() {
    // Physics configuration
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher, broadphase, solver, collisionConfiguration
    );
    physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));
    
    tmpTrans = new Ammo.btTransform();
}

// Create a realistic terrain with proper physics
function createRealisticDesertEnvironment(scene) {
    // Create a heightfield terrain
    const terrainWidth = 200;
    const terrainLength = 200;
    const heightfieldResolution = 128;
    
    // Generate heightmap data
    const heightData = generateTerrainData(heightfieldResolution);
    
    // Create visual mesh
    const geometry = new THREE.PlaneGeometry(
        terrainWidth, terrainLength, 
        heightfieldResolution - 1, heightfieldResolution - 1
    );
    
    // Apply height data to geometry
    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
        // Skip X and Z coordinates (j+0, j+2)
        // Set Y coordinate from heightData
        const x = Math.floor(i % heightfieldResolution);
        const z = Math.floor(i / heightfieldResolution);
        
        if (heightData[z] && heightData[z][x] !== undefined) {
            vertices[j + 1] = heightData[z][x];
        }
    }
    
    geometry.computeVertexNormals();
    
    // Create realistic terrain material
    const terrainMaterial = createRealisticTerrainMaterial();
    
    // Create terrain mesh
    const terrain = new THREE.Mesh(geometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Create physics for the terrain
    createTerrainPhysics(heightData, terrainWidth, terrainLength);
    
    // Add rocks and other environment features
    addEnvironmentObjects(scene, heightData, terrainWidth, terrainLength);
    
    return terrain;
}

// Generate realistic terrain data
function generateTerrainData(resolution) {
    const data = [];
    
    // Initialize with zeros
    for (let i = 0; i < resolution; i++) {
        data[i] = [];
        for (let j = 0; j < resolution; j++) {
            data[i][j] = 0;
        }
    }
    
    // Apply multiple noise layers
    addNoiseLayer(data, resolution, 5.0, 0.03);  // Large features
    addNoiseLayer(data, resolution, 2.0, 0.1);   // Medium features
    addNoiseLayer(data, resolution, 0.5, 0.3);   // Small details
    
    // Add dune formations
    for (let i = 0; i < 20; i++) {
        const centerX = Math.floor(Math.random() * resolution);
        const centerZ = Math.floor(Math.random() * resolution);
        const radius = Math.floor(Math.random() * 30) + 10;
        const height = Math.random() * 4 + 1;
        
        addDune(data, centerX, centerZ, radius, height, resolution);
    }
    
    return data;
}

// Add a noise layer to the terrain
function addNoiseLayer(data, resolution, amplitude, frequency) {
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const nx = j * frequency;
            const ny = i * frequency;
            
            // Simple noise function (replace with better noise in production)
            const noise = Math.sin(nx) * Math.cos(ny * 0.7) + 
                          Math.sin(nx * 2.3) * Math.cos(ny * 1.5) * 0.5;
            
            data[i][j] += noise * amplitude;
        }
    }
}

// Add a realistic dune to the terrain
function addDune(data, centerX, centerZ, radius, height, resolution) {
    // Random dune orientation
    const orientation = Math.random() * Math.PI;
    const elongation = 1 + Math.random() * 2; // Make dunes elliptical
    
    for (let z = Math.max(0, centerZ - radius); z < Math.min(resolution, centerZ + radius); z++) {
        for (let x = Math.max(0, centerX - radius); x < Math.min(resolution, centerX + radius); x++) {
            // Calculate rotated position
            const dx = x - centerX;
            const dz = z - centerZ;
            const rotatedX = dx * Math.cos(orientation) - dz * Math.sin(orientation);
            const rotatedZ = dx * Math.sin(orientation) + dz * Math.cos(orientation);
            
            // Calculate distance from center (elliptical)
            const distance = Math.sqrt(
                Math.pow(rotatedX / elongation, 2) + 
                Math.pow(rotatedZ, 2)
            );
            
            if (distance < radius) {
                // Calculate height based on distance from center
                const falloff = 1 - (distance / radius);
                const duneHeight = height * Math.pow(falloff, 2);
                
                // Add height to terrain
                data[z][x] += duneHeight;
            }
        }
    }
}

// Create physics for the terrain
function createTerrainPhysics(heightData, width, length) {
    const resolution = heightData.length;
    
    // Create heightfield terrain shape
    const heightScale = 1;
    const upAxis = 1; // Y is up
    const heightStickWidth = width / (resolution - 1);
    const heightStickLength = length / (resolution - 1);
    
    // Flatten height data for Ammo.js
    const ammoHeightData = [];
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            ammoHeightData.push(heightData[i][j]);
        }
    }
    
    const heightFieldShape = new Ammo.btHeightfieldTerrainShape(
        resolution, resolution,
        ammoHeightData,
        heightScale,
        -10, 10, // min and max heights
        upAxis,
        false // flip quad edges
    );
    
    // Set local scaling
    const scaleX = width / (resolution - 1);
    const scaleZ = length / (resolution - 1);
    heightFieldShape.setLocalScaling(new Ammo.btVector3(scaleX, 1, scaleZ));
    
    // Create transform for terrain
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    
    // Position the terrain correctly
    // For heightfield shape, the origin is at the bottom, not the center
    transform.setOrigin(new Ammo.btVector3(0, -5, 0));
    
    const mass = 0; // Static object
    const localInertia = new Ammo.btVector3(0, 0, 0);
    
    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
        mass, motionState, heightFieldShape, localInertia
    );
    const terrainBody = new Ammo.btRigidBody(rbInfo);
    
    physicsWorld.addRigidBody(terrainBody);
}

// Create a realistic terrain material
function createRealisticTerrainMaterial() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load textures with proper error handling
    const loadTexture = function(path, fallbackColor) {
        return textureLoader.load(
            path,
            undefined,
            undefined,
            function() {
                console.warn('Failed to load texture: ' + path);
                return createSolidTexture(fallbackColor);
            }
        );
    };
    
    // Create fallback texture
    function createSolidTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }
    
    // Load all terrain textures
    const sandDiffuse = loadTexture('textures/Ground079L_1K-PNG/Ground079L_1K-PNG_Color.png', '#d2b48c');
    const sandNormal = loadTexture('textures/Ground079L_1K-PNG/Ground079L_1K-PNG_NormalGL.png', '#8080ff');
    const sandRoughness = loadTexture('textures/Ground079L_1K-PNG/Ground079L_1K-PNG_Roughness.png', '#808080');
    const sandAO = loadTexture('textures/Ground079L_1K-PNG/Ground079L_1K-PNG_AmbientOcclusion.png', '#ffffff');
    
    // Configure texture settings
    [sandDiffuse, sandNormal, sandRoughness, sandAO].forEach(tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(20, 20);
    });
    
    // Create PBR material
    return new THREE.MeshStandardMaterial({
        map: sandDiffuse,
        normalMap: sandNormal,
        roughnessMap: sandRoughness,
        aoMap: sandAO,
        roughness: 0.8,
        metalness: 0.1,
        envMapIntensity: 0.5
    });
}

// Add environment objects (rocks, debris, etc)
function addEnvironmentObjects(scene, heightData, width, length) {
    const resolution = heightData.length;
    
    // Add rocks
    addRocksWithPhysics(scene, heightData, width, length, resolution);
    
    // Add cacti or other desert plants
    addDesertPlants(scene, heightData, width, length, resolution);
    
    // Add distant mountains (visual only)
    addDistantMountains(scene);
}

// Add rocks with physics
function addRocksWithPhysics(scene, heightData, width, length, resolution) {
    const rockCount = 50;
    
    // Create rock geometries
    const rockGeometries = [
        new THREE.DodecahedronGeometry(1, 1),
        new THREE.DodecahedronGeometry(1, 0),
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.TetrahedronGeometry(1, 1)
    ];
    
    // Distort geometries for more natural look
    rockGeometries.forEach(geometry => {
        const pos = geometry.attributes.position;
        const normal = geometry.attributes.normal;
        
        for (let i = 0; i < pos.count; i++) {
            const i3 = i * 3;
            
            // Get vertex position
            const x = pos.array[i3];
            const y = pos.array[i3 + 1];
            const z = pos.array[i3 + 2];
            
            // Distort the vertex
            pos.array[i3] = x + (Math.random() - 0.5) * 0.3;
            pos.array[i3 + 1] = y + (Math.random() - 0.5) * 0.3;
            pos.array[i3 + 2] = z + (Math.random() - 0.5) * 0.3;
        }
        
        geometry.computeVertexNormals();
    });
    
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
    
    // Add rocks
    for (let i = 0; i < rockCount; i++) {
        // Choose a random position
        const posX = Math.random() * width - width / 2;
        const posZ = Math.random() * length - length / 2;
        
        // Get height at position
        const gridX = Math.floor((posX + width / 2) * (resolution - 1) / width);
        const gridZ = Math.floor((posZ + length / 2) * (resolution - 1) / length);
        
        // Make sure we're within bounds
        if (gridX >= 0 && gridX < resolution && gridZ >= 0 && gridZ < resolution) {
            const height = heightData[gridZ][gridX];
            
            // Create rock
            const rockGeom = rockGeometries[Math.floor(Math.random() * rockGeometries.length)].clone();
            const rockMat = rockMaterials[Math.floor(Math.random() * rockMaterials.length)].clone();
            
            const rock = new THREE.Mesh(rockGeom, rockMat);
            
            // Random scale
            const scale = Math.random() * 1.5 + 0.8;
            rock.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale);
            
            // Position
            rock.position.set(posX, height + scale / 2, posZ);
            
            // Random rotation
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI
            );
            
            rock.castShadow = true;
            rock.receiveShadow = true;
            
            scene.add(rock);
            
            // Add physics
            const shape = new Ammo.btBoxShape(new Ammo.btVector3(scale / 2, scale / 2, scale / 2));
            const mass = 0; // Static object
            
            createRigidBody(rock, shape, mass);
        }
    }
    
    // Add rock clusters
    const clusterCount = 8;
    for (let i = 0; i < clusterCount; i++) {
        // Choose a random position
        const centerX = Math.random() * width - width / 2;
        const centerZ = Math.random() * length - length / 2;
        
        // Get height at position
        const gridX = Math.floor((centerX + width / 2) * (resolution - 1) / width);
        const gridZ = Math.floor((centerZ + length / 2) * (resolution - 1) / length);
        
        if (gridX >= 0 && gridX < resolution && gridZ >= 0 && gridZ < resolution) {
            const height = heightData[gridZ][gridX];
            
            // Add rocks in a cluster
            const rocksInCluster = Math.floor(Math.random() * 5) + 3;
            for (let j = 0; j < rocksInCluster; j++) {
                // Random position offset
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 3 + 1;
                const offsetX = Math.cos(angle) * distance;
                const offsetZ = Math.sin(angle) * distance;
                
                // Create rock
                const rockGeom = rockGeometries[Math.floor(Math.random() * rockGeometries.length)].clone();
                const rockMat = rockMaterials[Math.floor(Math.random() * rockMaterials.length)].clone();
                
                const rock = new THREE.Mesh(rockGeom, rockMat);
                
                // Random scale
                const scale = Math.random() * 2 + 1;
                rock.scale.set(scale, scale, scale);
                
                // Position
                rock.position.set(centerX + offsetX, height + scale / 2, centerZ + offsetZ);
                
                // Random rotation
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI
                );
                
                rock.castShadow = true;
                rock.receiveShadow = true;
                
                scene.add(rock);
                
                // Add physics
                const shape = new Ammo.btBoxShape(new Ammo.btVector3(scale / 2, scale / 2, scale / 2));
                const mass = 0; // Static object
                
                createRigidBody(rock, shape, mass);
            }
        }
    }
}

// Create a rigid body from a THREE.js object
function createRigidBody(object, shape, mass) {
    // Create transform
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(
        object.position.x,
        object.position.y,
        object.position.z
    ));
    transform.setRotation(new Ammo.btQuaternion(
        object.quaternion.x,
        object.quaternion.y,
        object.quaternion.z,
        object.quaternion.w
    ));
    
    const motionState = new Ammo.btDefaultMotionState(transform);
    const localInertia = new Ammo.btVector3(0, 0, 0);
    
    if (mass > 0) {
        shape.calculateLocalInertia(mass, localInertia);
    }
    
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
        mass, motionState, shape, localInertia
    );
    const body = new Ammo.btRigidBody(rbInfo);
    
    // Store reference to the THREE.js object
    body.threeObject = object;
    
    // Add to physics world
    physicsWorld.addRigidBody(body);
    
    // Add to our list of rigid bodies
    if (mass > 0) {
        rigidBodies.push(object);
        body.setActivationState(4); // DISABLE_DEACTIVATION
    }
    
    // Store reference to the Ammo.js body
    object.userData.physicsBody = body;
    
    return body;
}

// Add desert plants
function addDesertPlants(scene, heightData, width, length, resolution) {
    const plantCount = 30;
    
    // Create a simple cactus
    function createCactus() {
        const group = new THREE.Group();
        
        // Main stem
        const stemGeom = new THREE.CylinderGeometry(0.5, 0.6, 4, 8);
        const cactusColor = 0x3D7146; // Cactus green
        const cactusMat = new THREE.MeshStandardMaterial({
            color: cactusColor,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const stem = new THREE.Mesh(stemGeom, cactusMat);
        stem.position.y = 2;
        group.add(stem);
        
        // Random arms
        const armCount = Math.floor(Math.random() * 3);
        for (let i = 0; i < armCount; i++) {
            const arm = new THREE.Group();
            
            const armGeom = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
            const armMesh = new THREE.Mesh(armGeom, cactusMat);
            armMesh.position.y = 1;
            arm.add(armMesh);
            
            arm.rotation.z = Math.PI / 4 + Math.random() * 0.4;
            arm.rotation.y = i * (Math.PI * 2 / armCount);
            arm.position.y = Math.random() * 1.5 + 1;
            
            group.add(arm);
        }
        
        return group;
    }
    
    // Add plants to the scene
    for (let i = 0; i < plantCount; i++) {
        // Choose a random position
        const posX = Math.random() * width - width / 2;
        const posZ = Math.random() * length - length / 2;
        
        // Get height at position
        const gridX = Math.floor((posX + width / 2) * (resolution - 1) / width);
        const gridZ = Math.floor((posZ + length / 2) * (resolution - 1) / length);
        
        if (gridX >= 0 && gridX < resolution && gridZ >= 0 && gridZ < resolution) {
            const height = heightData[gridZ][gridX];
            
            // Create plant
            const plant = createCactus();
            
            // Scale
            const scale = 0.5 + Math.random() * 0.5;
            plant.scale.set(scale, scale, scale);
            
            // Position
            plant.position.set(posX, height, posZ);
            
            // Random rotation (only Y)
            plant.rotation.y = Math.random() * Math.PI * 2;
            
            plant.traverse(function(object) {
                if (object instanceof THREE.Mesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
            
            scene.add(plant);
            
            // Add simple collision (cylinder shape)
            const shape = new Ammo.btCylinderShape(new Ammo.btVector3(0.5 * scale, 2 * scale, 0.5 * scale));
            const mass = 0; // Static object
            
            createRigidBody(plant, shape, mass);
        }
    }
}

// Add distant mountains
function addDistantMountains(scene) {
    const mountainGeometry = new THREE.BufferGeometry();
    
    // Create mountain points
    const mountainCount = 20;
    const mountainPoints = [];
    
    for (let i = 0; i < mountainCount; i++) {
        const angle = (i / mountainCount) * Math.PI * 2;
        const radius = 400;
        const baseX = Math.cos(angle) * radius;
        const baseZ = Math.sin(angle) * radius;
        
        // Base points (at ground level)
        mountainPoints.push(
            new THREE.Vector3(baseX - 20, 0, baseZ),
            new THREE.Vector3(baseX + 20, 0, baseZ)
        );
        
        // Peak point
        const height = 30 + Math.random() * 50;
        mountainPoints.push(
            new THREE.Vector3(baseX, height, baseZ)
        );
    }
    
    // Create faces from points
    const vertices = [];
    const indices = [];
    
    for (let i = 0; i < mountainCount; i++) {
        const baseIndex = i * 3;
        
        // Connect the base points to the peak
        indices.push(
            baseIndex, baseIndex + 1, baseIndex + 2,  // Front face
            baseIndex + 1, (baseIndex + 3) % (mountainCount * 3), baseIndex + 2  // Back face
        );
        
        // Add vertices
        const p0 = mountainPoints[baseIndex];
        const p1 = mountainPoints[baseIndex + 1];
        const p2 = mountainPoints[baseIndex + 2];
        
        vertices.push(
            p0.x, p0.y, p0.z,
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z
        );
    }
    
    // Create the geometry
    mountainGeometry.setIndex(indices);
    mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    mountainGeometry.computeVertexNormals();
    
    // Create mountain material with gradient
    const mountainMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x888888) },
            bottomColor: { value: new THREE.Color(0x444444) }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vWorldPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
            }
        `,
        side: THREE.DoubleSide
    });
    
    const mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
    scene.add(mountains);
}

// Update physics
function updatePhysics(deltaTime) {
    physicsWorld.stepSimulation(deltaTime, 10);
    
    // Update objects with Ammo.js
    for (let i = 0, il = rigidBodies.length; i < il; i++) {
        const objThree = rigidBodies[i];
        const objPhys = objThree.userData.physicsBody;
        const ms = objPhys.getMotionState();
        
        if (ms) {
            ms.getWorldTransform(tmpTrans);
            const p = tmpTrans.getOrigin();
            const q = tmpTrans.getRotation();
            
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
    }
}

// Get terrain height at specified position
function getTerrainHeightAt(x, z) {
    // Use raycasting to get the exact height
    const raycaster = new THREE.Raycaster();
    raycaster.set(
        new THREE.Vector3(x, 100, z), // Cast from above
        new THREE.Vector3(0, -1, 0)   // Cast downward
    );
    
    // We need to find the ground object - it should be the first object added to the scene
    const groundObjects = [];
    scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && 
            obj.geometry instanceof THREE.PlaneGeometry && 
            obj.rotation.x === -Math.PI / 2) {
            groundObjects.push(obj);
        }
    });
    
    if (groundObjects.length > 0) {
        const intersects = raycaster.intersectObjects(groundObjects);
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
    }
    
    return 0; // Default height
}

// Check collision between character and environment
function checkCollision(position, radius = 0.5) {
    // Create a temporary transform
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    
    // Create a sphere shape for the character
    const shape = new Ammo.btSphereShape(radius);
    
    // Test for collisions
    const ghostObject = new Ammo.btPairCachingGhostObject();
    ghostObject.setWorldTransform(transform);
    ghostObject.setCollisionShape(shape);
    ghostObject.setCollisionFlags(4); // CF_NO_CONTACT_RESPONSE
    
    physicsWorld.addCollisionObject(ghostObject, 1, -1);
    
    // Check if there are any overlapping objects
    const numOverlapping = ghostObject.getNumOverlappingObjects();
    let isColliding = false;
    
    for (let i = 0; i < numOverlapping; i++) {
        const objPhys = ghostObject.getOverlappingObject(i);
        
        // Ignore terrain collisions (we handle that with height)
        if (objPhys && objPhys.threeObject !== ground) {
            isColliding = true;
            break;
        }
    }
    
    // Clean up
    physicsWorld.removeCollisionObject(ghostObject);
    Ammo.destroy(ghostObject);
    Ammo.destroy(shape);
    
    return isColliding;
}