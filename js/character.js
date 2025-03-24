// Load main character model and initialize
function loadCharacter(scene, callback) {
    const loader = new THREE.GLTFLoader();
    
    // First load the idle animation (which will be our base model)
    loader.load(
        '../models/Animation_Idle_02_withSkin.glb',
        function(gltf) {
            console.log('Idle animation loaded');
            
            // Set up character
            const character = gltf.scene;
            
            // Enable shadows
            character.traverse(function(node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            scene.add(character);
            
            // Create animation mixer
            const mixer = new THREE.AnimationMixer(character);
            
            // Set up idle animation
            let idleAction = null;
            if (gltf.animations && gltf.animations.length > 0) {
                idleAction = mixer.clipAction(gltf.animations[0]);
                idleAction.play();
            }
            
            // Now load the walking animation
            document.getElementById('info').textContent = 'Loading walk animation...';
            loader.load(
                '../models/Animation_Walking_withSkin.glb',
                function(gltf) {
                    console.log('Walk animation loaded');
                    
                    let walkAction = null;
                    if (gltf.animations && gltf.animations.length > 0) {
                        walkAction = mixer.clipAction(gltf.animations[0]);
                    }
                    
                    // Finally load the running animation
                    document.getElementById('info').textContent = 'Loading run animation...';
                    loader.load(
                        '../models/Animation_Running_withSkin.glb',
                        function(gltf) {
                            console.log('Run animation loaded');
                            
                            let runAction = null;
                            if (gltf.animations && gltf.animations.length > 0) {
                                runAction = mixer.clipAction(gltf.animations[0]);
                            }
                            
                            // All loaded - hide info
                            document.getElementById('info').textContent = 'Ready! Use WASD to move.';
                            setTimeout(() => {
                                document.getElementById('info').style.opacity = '0';
                            }, 3000);
                            
                            // Return character and animations
                            callback(character, {
                                mixer: mixer,
                                idle: idleAction,
                                walk: walkAction,
                                run: runAction
                            });
                        },
                        undefined,
                        function(error) {
                            console.error('Error loading run animation:', error);
                        }
                    );
                },
                undefined,
                function(error) {
                    console.error('Error loading walk animation:', error);
                }
            );
        },
        function(xhr) {
            const progress = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('info').textContent = `Loading model: ${progress}%`;
        },
        function(error) {
            console.error('Error loading model:', error);
            document.getElementById('info').textContent = 'Error loading model!';
        }
    );
}