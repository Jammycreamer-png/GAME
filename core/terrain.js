/**
 * Professional Desert Terrain System
 * Creates a realistic desert landscape with dunes and terrain features
 */

const TerrainSystem = (function() {
    // Private terrain variables
    let terrain;
    let heightData;
    let terrainSize = 1000;
    let terrainResolution = 256;
    let maxHeight = 20;
    
    // Noise generation functions
    function generateSimplexNoise(width, height, scale) {
        const simplex = new SimplexNoise();
        const data = new Array(height);
        
        for (let y = 0; y < height; y++) {
            data[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                // Multiple octaves of noise for more natural terrain
                const nx = x / width - 0.5;
                const ny = y / height - 0.5;
                
                // Large features
                let value = simplex.noise2D(nx * scale, ny * scale) * 0.7;
                
                // Medium features
                value += simplex.noise2D(nx * scale * 2, ny * scale * 2) * 0.2;
                
                // Small details
                value += simplex.noise2D(nx * scale * 4, ny * scale * 4) * 0.1;
                
                // Normalize to 0-1 range
                value = (value + 1) * 0.5;
                
                data[y][x] = value;
            }
        }
        
        return data;
    }
    
    // Generate realistic desert terrain heightmap
    function generateDesertHeightmap() {
        // Create initial noise
        const baseNoise = generateSimplexNoise(terrainResolution, terrainResolution, 5);
        
        // Create heightmap
        heightData = new Array(terrainResolution);
        for (let y = 0; y < terrainResolution; y++) {
            heightData[y] = new Array(terrainResolution);
            for (let x = 0; x < terrainResolution; x++) {
                // Base terrain with dunes
                let height = baseNoise[y][x];
                
                // Make desert mostly flat with some higher dunes
                height = Math.pow(height, 1.5) * 0.8;
                
                // Store height
                heightData[y][x] = height;
            }
        }
        
        // Add some dune formations
        addDesertDunes(heightData);
        
        return heightData;
    }
    
    // Add realistic dune formations
    function addDesertDunes(heightmap) {
        const duneCount = 30;
        
        for (let i = 0; i < duneCount; i++) {
            // Random dune position
            const centerX = Math.floor(Math.random() * terrainResolution);
            const centerY = Math.floor(Math.random() * terrainResolution);
            
            // Random dune properties
            const radius = Math.floor(Math.random() * 20) + 10;
            const height = Math.random() * 0.5 + 0.1;
            const elongation = Math.random() * 3 + 1; // Make some dunes elongated
            const rotation = Math.random() * Math.PI;
            
            // Create dune
            for (let y = Math.max(0, centerY - radius); y < Math.min(terrainResolution, centerY + radius); y++) {
                for (let x = Math.max(0, centerX - radius); x < Math.min(terrainResolution, centerX + radius); x++) {
                    // Calculate rotated position
                    const dx = x - centerX;
                    const dy = y - centerY;
                    
                    const rotatedX = dx * Math.cos(rotation) - dy * Math.sin(rotation);
                    const rotatedY = dx * Math.sin(rotation) + dy * Math.cos(rotation);
                    
                    // Calculate distance with elongation
                    const normalizedX = rotatedX / elongation;
                    const normalizedY = rotatedY;
                    const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
                    
                    if (distance < radius) {
                        // Smooth falloff for natural look
                        const falloff = 1 - (distance / radius);
                        const contribution = Math.pow(falloff, 2) * height;
                        
                        // Add to heightmap
                        heightmap[y][x] += contribution;
                    }
                }
            }
        }
    }
    
    // Create terrain geometry from heightmap
    function createTerrainGeometry() {
        // Create a plane geometry
        const geometry = new THREE.PlaneGeometry(
            terrainSize, 
            terrainSize, 
            terrainResolution - 1, 
            terrainResolution - 1
        );
        
        // Apply height data
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < terrainResolution; i++) {
            for (let j = 0; j < terrainResolution; j++) {
                const index = (i * terrainResolution + j) * 3 + 1;
                positions[index] = heightData[i][j] * maxHeight;
            }
        }
        
        // Update geometry
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    // Create professional desert material
    function createDesertMaterial() {
        // Use the asset manager to load PBR material
        return AssetManager.loadPBRMaterial('Ground079L_1K-PNG', {
            baseFolder: 'textures/Ground079L_1K-PNG/',
            baseColorFile: 'Ground079L_1K-PNG_Color.png',
            normalFile: 'Ground079L_1K-PNG_NormalGL.png',
            roughnessFile: 'Ground079L_1K-PNG_Roughness.png',
            aoFile: 'Ground079L_1K-PNG_AmbientOcclusion.png',
            displacementFile: 'Ground079L_1K-PNG_Displacement.png',
            metallic: 0.0,
            roughness: 0.9,
            color: 0xE6D0B2,
            repeat: [20, 20]
        });
    }
    
    // Get height at world position
    function getHeightAt(x, z) {
        if (!heightData) return 0;
        
        // Convert world position to heightmap indices
        const halfSize = terrainSize / 2;
        const normalizedX = (x + halfSize) / terrainSize;
        const normalizedZ = (z + halfSize) / terrainSize;
        
        if (normalizedX < 0 || normalizedX > 1 || normalizedZ < 0 || normalizedZ > 1) {
            return 0; // Outside terrain bounds
        }
        
        // Get height indices
        const xIndex = Math.min(terrainResolution - 1, Math.floor(normalizedX * terrainResolution));
        const zIndex = Math.min(terrainResolution - 1, Math.floor(normalizedZ * terrainResolution));
        
        // Get height from data
        return heightData[zIndex][xIndex] * maxHeight;
    }
    
    // Initialize the terrain system
    function init(scene) {
        // Generate terrain data
        heightData = generateDesertHeightmap();
        
        // Create terrain geometry
        const geometry = createTerrainGeometry();
        
        // Create desert material
        const material = createDesertMaterial();
        
        // Create terrain mesh
        terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        
        // Add to scene
        scene.add(terrain);
        
        // Return terrain data for other systems
        return {
            terrain,
            heightData,
            terrainSize,
            maxHeight
        };
    }
    
    // Public API
    return {
        init,
        getHeightAt
    };
})();

// Simple Simplex Noise implementation for terrain generation
class SimplexNoise {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        
        const rand = this._seededRandom(seed);
        
        // Fill p with values from 0 to 255
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        
        // Shuffle the array
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        
        // Copy to perm and permMod12
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }
    
    // Seeded random number generator
    _seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    noise2D(x, y) {
        // Constants for 2D simplex noise
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;
        
        // Determine which simplex we're in
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }
        
        // Offsets for corners
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        
        // Hashed gradient indices
        const ii = i & 255;
        const jj = j & 255;
        
        // Calculate contributions from corners
        const n0 = this._gradient2D(this.permMod12[ii + this.perm[jj]], x0, y0);
        const n1 = this._gradient2D(this.permMod12[ii + i1 + this.perm[jj + j1]], x1, y1);
        const n2 = this._gradient2D(this.permMod12[ii + 1 + this.perm[jj + 1]], x2, y2);
        
        // Add contributions
        return 70 * (n0 + n1 + n2);
    }
    
    _gradient2D(hash, x, y) {
        // Convert low 3 bits of hash code into 8 simple gradient directions
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        
        // Compute dot product
        return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
    }
}