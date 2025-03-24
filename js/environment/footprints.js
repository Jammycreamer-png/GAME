// Footprint system
function createFootprintSystem(renderer, scene) {
    // Create a render target for the dynamic sand displacement
    const SIZE = 2048;
    const footprintRT = new THREE.WebGLRenderTarget(SIZE, SIZE, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType
    });
    
    // Create a secondary scene for rendering footprints
    const footprintScene = new THREE.Scene();
    const footprintCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 10);
    footprintCamera.position.z = 5;
    footprintCamera.lookAt(0, 0, 0);
    
    // Create a plane to render the footprints onto
    const footprintCanvas = document.createElement('canvas');
    footprintCanvas.width = SIZE;
    footprintCanvas.height = SIZE;
    const ctx = footprintCanvas.getContext('2d');
    ctx.fillStyle = '#808080'; // Neutral gray for no displacement
    ctx.fillRect(0, 0, SIZE, SIZE);
    
    const footprintTexture = new THREE.CanvasTexture(footprintCanvas);
    const footprintPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshBasicMaterial({ map: footprintTexture })
    );
    footprintScene.add(footprintPlane);
    
    // Footprint maker function
    function addFootprint(position, rotation, footType = 'left') {
        // Map world position to texture coordinate
        const u = (position.x + 50) / 100;
        const v = (position.z + 50) / 100;
        
        if (u < 0 || u > 1 || v < 0 || v > 1) return; // Out of bounds
        
        // Draw footprint
        ctx.save();
        ctx.translate(u * SIZE, v * SIZE);
        ctx.rotate(rotation);
        
        // Different footprint shape based on left/right foot
        const footWidth = 5;
        const footLength = 15;
        
        // Darker value = deeper impression
        ctx.fillStyle = '#404040';
        
        if (footType === 'left') {
            ctx.beginPath();
            ctx.ellipse(-2, 0, footWidth/2, footLength/2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(2, 0, footWidth/2, footLength/2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Update the texture
        footprintTexture.needsUpdate = true;
    }
    
    // Get the render target for use in the main material
    function getRenderTarget() {
        renderer.setRenderTarget(footprintRT);
        renderer.render(footprintScene, footprintCamera);
        renderer.setRenderTarget(null);
        return footprintRT.texture;
    }
    
    // Function to slowly restore the sand (fade footprints)
    function restoreSand() {
        // Gradually restore the sand by drawing semitransparent neutral gray
        ctx.fillStyle = 'rgba(128, 128, 128, 0.01)';
        ctx.fillRect(0, 0, SIZE, SIZE);
        footprintTexture.needsUpdate = true;
    }
    
    return {
        addFootprint,
        getRenderTarget,
        restoreSand
    };
}