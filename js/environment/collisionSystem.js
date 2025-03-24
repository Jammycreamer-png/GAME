/**
 * Professional Collision System
 * Handles collision detection for character movement
 */

const CollisionSystem = (function() {
    // Private collision variables
    let terrain;
    let terrainSize;
    let heightData;
    
    // Static objects (rocks, cacti, etc.)
    const collisionObjects = [];
    
    // Spatial grid for efficient collision detection
    const gridSize = 10; // Grid cell size
    const collisionGrid = new Map();
    
    // Initialize collision system
    function init(scene, terrainData) {
        // Store terrain data for height calculations
        terrain = terrainData.terrain;
        terrainSize = terrainData.terrainSize;
        heightData = terrainData.heightData;
        
        return {
            terrain,
            addCollisionObject,
            checkCollision,
            getHeightAt
        };
    }
    
    // Add an object to the collision system
    function addCollisionObject(object, boundingRadius) {
        // Create collision data
        const collisionData = {
            object: object,
            position: object.position.clone(),
            radius: boundingRadius || Math.max(object.scale.x, object.scale.z) * 0.5
        };
        
        // Add to collection
        collisionObjects.push(collisionData);
        
        // Add to spatial grid
        addToGrid(collisionData);
        
        return collisionData;
    }
    
    // Add object to spatial grid
    function addToGrid(collisionData) {
        const pos = collisionData.position;
        const r = collisionData.radius;
        
        // Determine grid cells this object overlaps
        const minCellX = Math.floor((pos.x - r + terrainSize/2) / gridSize);
        const maxCellX = Math.floor((pos.x + r + terrainSize/2) / gridSize);
        const minCellZ = Math.floor((pos.z - r + terrainSize/2) / gridSize);
        const maxCellZ = Math.floor((pos.z + r + terrainSize/2) / gridSize);
        
        // Add to all overlapping cells
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let z = minCellZ; z <= maxCellZ; z++) {
                const key = `${x},${z}`;
                
                if (!collisionGrid.has(key)) {
                    collisionGrid.set(key, []);
                }
                
                collisionGrid.get(key).push(collisionData);
            }
        }
    }
    
    // Check collision between character and environment
    function checkCollision(position, radius) {
        // Get terrain height at position
        const terrainY = getHeightAt(position.x, position.z);
        
        // Check collision with static objects
        const cellX = Math.floor((position.x + terrainSize/2) / gridSize);
        const cellZ = Math.floor((position.z + terrainSize/2) / gridSize);
        
        // Get objects from nearby cells
        const nearbyObjects = getNearbyObjects(cellX, cellZ);
        
        // Check for collisions
        for (const obj of nearbyObjects) {
            const dx = position.x - obj.position.x;
            const dz = position.z - obj.position.z;
            const distance = Math.sqrt(dx*dx + dz*dz);
            
            if (distance < radius + obj.radius) {
                return {
                    collision: true,
                    object: obj.object,
                    normal: new THREE.Vector3(dx, 0, dz).normalize(),
                    penetration: radius + obj.radius - distance,
                    terrainY: terrainY
                };
            }
        }
        
        return {
            collision: false,
            terrainY: terrainY
        };
    }
    
    // Get objects from nearby grid cells
    function getNearbyObjects(cellX, cellZ) {
        const result = [];
        
        // Check 3x3 grid of cells around position
        for (let x = cellX-1; x <= cellX+1; x++) {
            for (let z = cellZ-1; z <= cellZ+1; z++) {
                const key = `${x},${z}`;
                
                if (collisionGrid.has(key)) {
                    result.push(...collisionGrid.get(key));
                }
            }
        }
        
        return result;
    }
    
    // Get height at world position
    function getHeightAt(x, z) {
        if (!heightData) return 0;
        
        // Convert world position to heightmap indices
        const terrainResolution = heightData.length;
        const halfSize = terrainSize / 2;
        
        // Normalize coordinates to 0-1 range
        const nx = (x + halfSize) / terrainSize; 
        const nz = (z + halfSize) / terrainSize;
        
        // Check bounds
        if (nx < 0 || nx > 1 || nz < 0 || nz > 1) {
            return 0;
        }
        
        // Convert to heightmap indices
        const ix = Math.min(Math.floor(nx * (terrainResolution - 1)), terrainResolution - 2);
        const iz = Math.min(Math.floor(nz * (terrainResolution - 1)), terrainResolution - 2);
        
        // Get fractional parts for interpolation
        const fx = nx * (terrainResolution - 1) - ix;
        const fz = nz * (terrainResolution - 1) - iz;
        
        // Get heights at 4 corners
        const h1 = heightData[iz][ix] * TerrainSystem.maxHeight;
        const h2 = heightData[iz][ix+1] * TerrainSystem.maxHeight;
        const h3 = heightData[iz+1][ix] * TerrainSystem.maxHeight;
        const h4 = heightData[iz+1][ix+1] * TerrainSystem.maxHeight;
        
        // Bilinear interpolation
        const h12 = h1 * (1 - fx) + h2 * fx;
        const h34 = h3 * (1 - fx) + h4 * fx;
        
        return h12 * (1 - fz) + h34 * fz;
    }
    
    // Public API
    return {
        init,
        addCollisionObject,
        checkCollision,
        getHeightAt
    };
})();