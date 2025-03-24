/**
 * Professional Asset Management System
 * Handles texture loading, caching, and resource management
 */

const AssetManager = (function() {
    // Private variables
    const textureCache = new Map();
    const materialCache = new Map();
    const modelCache = new Map();
    
    // Texture loader with caching
    function loadTexture(path, onLoad, onError) {
        // Check cache first
        if (textureCache.has(path)) {
            const texture = textureCache.get(path);
            if (onLoad) onLoad(texture);
            return texture;
        }
        
        // Track loading in engine
        Engine.trackAssetLoading(1);
        
        // Create texture loader
        const textureLoader = new THREE.TextureLoader();
        
        // Load the texture
        const texture = textureLoader.load(
            path,
            function(loadedTexture) {
                // Set texture properties
                loadedTexture.flipY = false;
                loadedTexture.anisotropy = Engine.getRenderer().capabilities.getMaxAnisotropy();
                
                // Cache the texture
                textureCache.set(path, loadedTexture);
                
                // Notify asset loaded
                Engine.assetLoaded();
                
                if (onLoad) onLoad(loadedTexture);
            },
            undefined,
            function(error) {
                console.error(`Error loading texture: ${path}`, error);
                Engine.assetLoaded();
                if (onError) onError(error);
            }
        );
        
        return texture;
    }
    
    // Create a solid color texture as fallback
    function createSolidTexture(color = '#ffffff', size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    // Load a complete set of PBR textures
    function loadPBRMaterial(name, options = {}) {
        const {
            baseFolder = 'textures/',
            baseColorFile = `${name}_basecolor.jpg`,
            normalFile = `${name}_normal.jpg`,
            roughnessFile = `${name}_roughness.jpg`,
            aoFile = `${name}_ao.jpg`,
            displacementFile = `${name}_height.jpg`,
            metallic = 0.0,
            roughness = 1.0,
            color = 0xffffff,
            repeat = [1, 1]
        } = options;
        
        // Check if material is already cached
        const cacheKey = `${name}_${repeat[0]}_${repeat[1]}_${color.toString(16)}`;
        if (materialCache.has(cacheKey)) {
            return materialCache.get(cacheKey);
        }
        
        // Track loading in engine
        Engine.trackAssetLoading(5); // Loading 5 textures
        
        // Load textures
        const baseColorTexture = loadTexture(`${baseFolder}${baseColorFile}`);
        const normalTexture = loadTexture(`${baseFolder}${normalFile}`);
        const roughnessTexture = loadTexture(`${baseFolder}${roughnessFile}`);
        const aoTexture = loadTexture(`${baseFolder}${aoFile}`);
        const displacementTexture = loadTexture(`${baseFolder}${displacementFile}`);
        
        // Configure textures
        [baseColorTexture, normalTexture, roughnessTexture, aoTexture, displacementTexture].forEach(texture => {
            if (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(repeat[0], repeat[1]);
            }
        });
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            map: baseColorTexture,
            normalMap: normalTexture,
            roughnessMap: roughnessTexture,
            aoMap: aoTexture,
            displacementMap: displacementTexture,
            displacementScale: 0.1,
            roughness: roughness,
            metalness: metallic,
            color: new THREE.Color(color)
        });
        
        // Cache the material
        materialCache.set(cacheKey, material);
        
        return material;
    }
    
    // Load a GLTF model
    function loadModel(path, onLoad, onProgress, onError) {
        // Check cache
        if (modelCache.has(path)) {
            const cachedModel = modelCache.get(path);
            if (onLoad) onLoad(cachedModel.clone());
            return;
        }
        
        // Track loading
        Engine.trackAssetLoading(1);
        
        // Create model loader
        const loader = new THREE.GLTFLoader();
        
        // Load model
        loader.load(
            path,
            function(gltf) {
                // Cache model
                modelCache.set(path, gltf.scene.clone());
                
                // Notify asset loaded
                Engine.assetLoaded();
                
                if (onLoad) onLoad(gltf);
            },
            onProgress,
            function(error) {
                console.error(`Error loading model: ${path}`, error);
                Engine.assetLoaded();
                if (onError) onError(error);
            }
        );
    }
    
    // Clear caches
    function clearCaches() {
        textureCache.clear();
        materialCache.clear();
        modelCache.clear();
    }
    
    // Public API
    return {
        loadTexture,
        createSolidTexture,
        loadPBRMaterial,
        loadModel,
        clearCaches
    };
})();