/**
 * Professional Sky System
 * Creates a realistic sky with proper light scattering
 */

const SkySystem = (function() {
    // Private sky variables
    let sky;
    let sunSphere;
    let sunPosition = new THREE.Vector3(100, 100, 100);
    let sunColor = new THREE.Color(0xFFFFEB);
    
    // Initialize sky system
    function init(scene) {
        // Create sky
        sky = createSky();
        scene.add(sky.mesh);
        
        // Create sun visual
        sunSphere = createSunSphere();
        scene.add(sunSphere);
        
        // Initial sky update
        updateSky(0);
    }
    
    // Create a physically accurate sky
    function createSky() {
        // Create Sky shader from Three.js examples
        const sky = new Sky();
        sky.scale.setScalar(450000);
        
        // Set up sky shader parameters
        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = 10;
        uniforms['rayleigh'].value = 2;
        uniforms['mieCoefficient'].value = 0.005;
        uniforms['mieDirectionalG'].value = 0.8;
        
        return sky;
    }
    
    // Create a visual representation of the sun
    function createSunSphere() {
        const geometry = new THREE.SphereGeometry(5000, 16, 8);
        const material = new THREE.MeshBasicMaterial({
            color: sunColor,
            transparent: true,
            fog: false
        });
        
        const sunSphere = new THREE.Mesh(geometry, material);
        sunSphere.position.copy(sunPosition);
        
        return sunSphere;
    }
    
    // Update sky based on time of day
    function updateSky(time) {
        // Calculate sun position
        const theta = Math.PI * (0.25 + 0.5 * Math.sin(time * 0.1));
        const phi = 2 * Math.PI * (0.25 + 0.5 * Math.sin(time * 0.05));
        
        sunPosition.x = 400000 * Math.cos(phi);
        sunPosition.y = 400000 * Math.sin(phi) * Math.sin(theta);
        sunPosition.z = 400000 * Math.sin(phi) * Math.cos(theta);
        
        // Update sky uniforms
        sky.material.uniforms['sunPosition'].value.copy(sunPosition);
        
        // Update sun sphere position
        sunSphere.position.copy(sunPosition);
        
        // Update sun color based on height
        const normalizedHeight = (sunPosition.y / 400000 + 1) * 0.5;
        
        if (normalizedHeight > 0.1) {
            // Day
            const colorFactor = Math.min(1, normalizedHeight);
            sunColor.setRGB(
                1.0,
                0.9 + colorFactor * 0.1, 
                0.7 + colorFactor * 0.3
            );
            sunSphere.material.opacity = 1.0;
        } else {
            // Night
            sunColor.setRGB(0.8, 0.8, 1.0);
            sunSphere.material.opacity = Math.max(0, normalizedHeight * 2);
        }
        
        sunSphere.material.color.copy(sunColor);
    }
    
    // Update sky system
    function update(deltaTime, elapsedTime) {
        updateSky(elapsedTime);
    }
    
    // Public API
    return {
        init,
        update,
        getSunPosition: () => sunPosition.clone(),
        getSunColor: () => sunColor.clone()
    };
})();

/**
 * Sky shader from Three.js examples
 */
function Sky() {
    const shader = {
        uniforms: {
            turbidity: { value: 2 },
            rayleigh: { value: 1 },
            mieCoefficient: { value: 0.005 },
            mieDirectionalG: { value: 0.8 },
            sunPosition: { value: new THREE.Vector3() },
            up: { value: new THREE.Vector3(0, 1, 0) }
        },
        vertexShader: `
            uniform vec3 sunPosition;
            uniform float rayleigh;
            uniform float turbidity;
            uniform float mieCoefficient;
            uniform vec3 up;

            varying vec3 vWorldPosition;
            varying vec3 vSunDirection;
            varying float vSunfade;
            varying vec3 vBetaR;
            varying vec3 vBetaM;
            varying float vSunE;

            // Constants for atmospheric scattering
            const float e = 2.71828182845904523536028747135266249775724709369995957;
            const float pi = 3.141592653589793238462643383279502884197169;

            // wavelength of used primaries, according to preetham
            const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
            // this pre-calculates the sun's attenuation through spectral values
            const vec3 K = vec3( 0.686, 0.678, 0.666 );

            // mie stuff
            // K coefficient for the primaries
            const float v = 4.0;
            const vec3 kChromaticity = vec3( 0.7, 0.5, 1.0 );

            // optical length at zenith for molecules
            const float rayleighZenithLength = 8.4E3;
            const float mieZenithLength = 1.25E3;
            // 66 arc seconds -> degrees, and the cosine of that
            const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

            // 3.0 / ( 16.0 * pi )
            const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
            // 1.0 / ( 4.0 * pi )
            const float ONE_OVER_FOURPI = 0.07957747154594767;

            float rayleighPhase( float cosTheta ) {
                return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
            }

            float hgPhase( float cosTheta, float g ) {
                float g2 = pow( g, 2.0 );
                float inv = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
                return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inv );
            }

            void main() {
                vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                vWorldPosition = worldPosition.xyz;

                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                gl_Position.z = gl_Position.w; // set z to camera.far

                vSunDirection = normalize( sunPosition );

                vSunE = dot( vSunDirection, up );
                vSunfade = 1.0 - clamp( 1.0 - exp( ( vSunE - 0.1 ) / 0.25 ), 0.0, 1.0 );

                float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

                // extinction (absorbtion + out scattering)
                // rayleigh coefficients
                vBetaR = totalRayleigh * rayleighCoefficient;

                // mie coefficients
                vBetaM = totalMie( turbidity ) * mieCoefficient;
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            varying vec3 vSunDirection;
            varying float vSunfade;
            varying vec3 vBetaR;
            varying vec3 vBetaM;
            varying float vSunE;

            uniform float mieDirectionalG;
            uniform vec3 up;

            // constants for atmospheric scattering
            const float pi = 3.141592653589793238462643383279502884197169;

            const float n = 1.0003; // refractive index of air
            const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

            // wavelengths
            const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );

            // optical length at zenith for molecules
            const float rayleighZenithLength = 8.4E3;
            const float mieZenithLength = 1.25E3;
            const vec3 up = vec3( 0.0, 1.0, 0.0 );

            const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

            // 3.0 / ( 16.0 * pi )
            const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
            // 1.0 / ( 4.0 * pi )
            const float ONE_OVER_FOURPI = 0.07957747154594767;

            float rayleighPhase( float cosTheta ) {
                return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
            }

            float hgPhase( float cosTheta, float g ) {
                float g2 = pow( g, 2.0 );
                float inv = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
                return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inv );
            }

            // Filmic ToneMapping code from https://github.com/tizian/tonemapper
            const float A = 0.15;
            const float B = 0.50;
            const float C = 0.10;
            const float D = 0.20;
            const float E = 0.02;
            const float F = 0.30;

            const float whiteScale = 1.0748724675633854; // 1.0 / uncharted2Tonemap(1000.0)

            vec3 uncharted2Tonemap( vec3 x ) {
                return ( ( x * ( A * x + C * B ) + D * E ) / ( x * ( A * x + B ) + D * F ) ) - E / F;
            }

            void main() {
                // optical length
                float zenithAngle = acos( max( 0.0, dot( up, normalize( vWorldPosition - cameraPosition ) ) ) );
                float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
                float sR = rayleighZenithLength * inverse;
                float sM = mieZenithLength * inverse;

                // combined extinction factor
                vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

                // in scatter
                float cosTheta = dot( normalize( vWorldPosition - cameraPosition ), vSunDirection );

                float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
                vec3 betaRTheta = vBetaR * rPhase;

                float mPhase = hgPhase( cosTheta, mieDirectionalG );
                vec3 betaMTheta = vBetaM * mPhase;

                vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
                Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - vSunE, 5.0 ), 0.0, 1.0 ) );

                // nightsky
                float theta = acos( vSunDirection.y ); // elevation --> y-axis, [-pi/2, pi/2]
                float phi = atan( vSunDirection.z, vSunDirection.x ); // azimuth --> x-axis [-pi/2, pi/2]
                vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
                vec3 L0 = vec3( 0.1 ) * Fex;

                // composition + solar disk
                float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
                L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

                vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

                vec3 curr = uncharted2Tonemap( ( log2( 2.0 / pow( luminance, 4.0 ) ) ) * texColor );
                vec3 color = curr * whiteScale;

                vec3 retColor = pow( color, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

                gl_FragColor = vec4( retColor, 1.0 );

                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    };

    // Helper functions
    function totalMie(turbidity) {
        const c = (0.2 * turbidity) * 10E-18;
        return 0.434 * c * Math.PI * Math.pow((2 * Math.PI) / lambda, 2) * K;
    }

    function totalRayleigh(lambda) {
        const sr = Math.pow(lambda, 4) * (6.53 * 10E-25);
        return sr;
    }
    
    // Create sky mesh
    const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(shader.uniforms),
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: THREE.BackSide,
        depthWrite: false
    });
    
    // Add constants to the shader
    const K = new THREE.Vector3(0.686, 0.678, 0.666);
    const lambda = new THREE.Vector3(680e-9, 550e-9, 450e-9);
    
    material.uniforms.totalRayleigh = { value: totalRayleigh(lambda) };
    material.uniforms.totalMie = { value: totalMie(turbidity) };
    
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 15),
        material
    );
    
    // Return the sky object
    return { mesh, material };
}