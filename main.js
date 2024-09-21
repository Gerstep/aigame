import * as THREE from 'three';
import { Raycaster, Vector2 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Constants
const NUM_PLANETS = 50;
const LEVEL_SIZE = 100;
const PLANET_DISTANCE_THRESHOLD = 10;
const PLANET_MODELS = ['planet1.glb', 'planet2.glb', 'planet3.glb', 'planet4.glb', 'planet5.glb', 'planet6.glb', 'planet7.glb'];
const STAR_MODELS = ['sun.glb']
const BOOST_STRENGTH = 50;
const SHIP_SPEED_BASE = 0.5; // Base speed
let SHIP_SPEED = SHIP_SPEED_BASE; // Current speed
const NUM_SUNS = 10; // Number of suns to load
const SUN_SPEED = 0.2; // Movement speed
const sunDirections = [];

// Constants for planet scores
const PLANET_SCORES = {
    'planet1.glb': 1,
    'planet2.glb': 2,
    'planet3.glb': 3,
    'planet4.glb': 4,
    'planet5.glb': 5,
    'planet6.glb': 4,
    'planet7.glb': 4,
};

// Mouse Movement Variables
let yaw = 0; // Rotation around Y-axis
let pitch = 0; // Rotation around X-axis (optional)
const mouseSensitivity = 0.0008;


// Scene, Camera, Renderer
const scene = new THREE.Scene();

// Add skyboxx
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/bg2.jpg', (texture) => {
    const geometry = new THREE.SphereGeometry(700, 200, 4);
    // Flip the geometry inside out
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
    });
    const skybox = new THREE.Mesh(geometry, material);
    skybox.position.y = 0; // Adjust if necessary
    scene.add(skybox);
});

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 2, 10); // Adjust as needed

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(-5, 5, -5);
scene.add(pointLight);

// Add Ship Model
let ship;
const shipLoader = new GLTFLoader();
shipLoader.load(
    '/ship.glb',
    (gltf) => {
        ship = gltf.scene;
        ship.scale.set(1, 1, 1); // Adjust scale as needed
        ship.position.set(0, 0, 0); // Initial position
        ship.rotation.y = Math.PI; // Adjust initial rotation if necessary
        scene.add(ship);
        console.log('Ship model loaded and added to scene');
    },
    undefined,
    (error) => {
        console.error('An error occurred while loading the ship model:', error);
    }
);

// Camera Offset for Third-Person View
const cameraOffset = new THREE.Vector3(0, 5, -10); // Adjust as needed

// Declare movement flags
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// Declare direction vector
const direction = new THREE.Vector3();

// Event Listeners for movement
const onKeyDown = (event) => {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (score >= 10 && ship) { // Check if enough score and ship is loaded
                score -= 10;
                // Apply forward boost relative to ship's direction without changing y
                const forward = new THREE.Vector3();
                ship.getWorldDirection(forward);
                forward.y = 0; // Ensure no change in y-axis
                forward.normalize();
                ship.position.add(forward.multiplyScalar(BOOST_STRENGTH));
                console.log(`Boost applied! Score: ${score}`);
                updateScoreDisplay();
            }
            break;
    }
};

const onKeyUp = (event) => {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
    }
};

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

// Initialize Raycaster and Mouse Vector
const raycaster = new Raycaster();
const mouse = new Vector2();

// Initialize Score Counter
let score = 0;

// Create Buttons
const buttons = [];
const gltfLoader = new GLTFLoader();

// Function to load a single planet
const loadPlanet = () => {
    const randomModel = PLANET_MODELS[Math.floor(Math.random() * PLANET_MODELS.length)];
    gltfLoader.load(
        `/${randomModel}`,
        (gltf) => {
            console.log(`GLB (${randomModel}) loaded successfully`);
            const planet = gltf.scene;
            const x = (Math.random() - 0.5) * LEVEL_SIZE;
            const z = (Math.random() - 0.5) * LEVEL_SIZE;
            const y = 0; // Place on ground level
            planet.position.set(x, y, z);
            planet.scale.set(1, 1, 1); // Adjust scale as needed

            // Ensure the model reacts to lighting
            planet.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // If materials are not reacting to light, replace with a standard material
                    if (!(child.material instanceof THREE.MeshStandardMaterial)) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: child.material.map,
                            color: child.material.color,
                        });
                    }
                }
            });

            buttons.push({ object: planet, score: PLANET_SCORES[randomModel] });
            scene.add(planet);
            console.log('Planet added to scene');
        },
        (xhr) => {
            console.log(`Loading GLB: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`);
        },
        (error) => {
            console.error('An error happened while loading the GLB:', error);
        }
    );
};

// Load all buttons
for (let i = 0; i < NUM_PLANETS; i++) {
    loadPlanet();
}

// Add Event Listener for Click
const onMouseClick = (event) => {
    if (!ship) return;

    // Get ship's forward direction
    const forward = new THREE.Vector3();
    ship.getWorldDirection(forward);
    forward.y = 0; // Ensure horizontal direction
    forward.normalize();

    // Set ray origin to ship's position
    const origin = new THREE.Vector3();
    ship.getWorldPosition(origin);

    // Set raycaster to originate from ship and go forward
    raycaster.set(origin, forward);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const button = buttons.find(btn => btn.object === intersected || btn.object.getObjectById(intersected.id));
        
        if (button) {
            const distance = ship.position.distanceTo(button.object.position);
            if (distance < PLANET_DISTANCE_THRESHOLD) {
                score += button.score;
                console.log(`Energy: ${score}`);
                
                // Check if the collected object is the sun
                if (button.type === 'sun') {
                    SHIP_SPEED += 0.1; // Increase speed permanently
                    console.log(`Speed increased! New Speed: ${SHIP_SPEED}`);
                }

                resetButton(button.object);
            }
        }
    }
};

document.addEventListener('mousedown', onMouseClick, false);

// Function to Reset Button
const resetButton = (button) => {
    const x = (Math.random() - 0.5) * LEVEL_SIZE;
    const z = (Math.random() - 0.5) * LEVEL_SIZE;
    button.position.set(x, 0, z);
    // Optionally, change color or add other effects
    button.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.color.setHex(0x00ff00); // Change to green
            setTimeout(() => {
                child.material.color.setHex(0xff0000); // Revert to red
            }, 500);
        }
    });
};

// Display Score using HTML
const scoreElement = document.createElement('div');
scoreElement.style.position = 'absolute';
scoreElement.style.top = '20px'; // Increased top position
scoreElement.style.left = '50%';
scoreElement.style.transform = 'translateX(-50%)';
scoreElement.style.color = 'yellow';
scoreElement.style.fontSize = '48px'; // Increased font size
scoreElement.style.fontFamily = 'Arial';
scoreElement.style.padding = '10px 20px';
scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
scoreElement.style.borderRadius = '10px';
scoreElement.style.textShadow = '2px 2px 4px #000';
scoreElement.innerHTML = `Energy: ${score}`;
document.body.appendChild(scoreElement);

// Update score display in animation loop
const updateScoreDisplay = () => {
    scoreElement.innerHTML = `Energy: ${score}`;
};

// Add Aim Element
const aimElement = document.createElement('div');
aimElement.style.position = 'absolute';
aimElement.style.left = '50%';
aimElement.style.top = '50%';
aimElement.style.transform = 'translate(-50%, -50%)';
aimElement.style.width = '20px';
aimElement.style.height = '20px';
aimElement.style.border = '2px dashed yellow';
aimElement.style.borderRadius = '50%';
document.body.appendChild(aimElement);


// Add Boost Indicator
const boostIndicator = document.createElement('div');
boostIndicator.style.position = 'absolute';
boostIndicator.style.bottom = '20px';
boostIndicator.style.left = '50%';
boostIndicator.style.transform = 'translateX(-50%)';
boostIndicator.style.width = '100px';
boostIndicator.style.height = '40px';
boostIndicator.style.border = '2px solid yellow';
boostIndicator.style.borderRadius = '15px';
boostIndicator.style.backgroundColor = score >= 10 ? 'green' : 'red';
boostIndicator.style.display = 'flex';
boostIndicator.style.justifyContent = 'center';
boostIndicator.style.alignItems = 'center';
boostIndicator.style.color = 'white';
boostIndicator.style.fontWeight = 'bold';
boostIndicator.style.fontSize = '24px';
boostIndicator.textContent = 'BOOST';
boostIndicator.style.fontFamily = 'Arial';
document.body.appendChild(boostIndicator);

// Update Boost Indicator in animation loop
const updateBoostIndicator = () => {
    boostIndicator.style.backgroundColor = score >= 10 ? 'green' : 'red';
};

// Handle window resize
window.addEventListener(
    'resize',
    () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
);

// Add Pointer Lock on click
const onClick = () => {
    renderer.domElement.requestPointerLock();
};

document.addEventListener('click', onClick, false);

// Pointer Lock Change Events
document.addEventListener('pointerlockchange', onPointerLockChange, false);

function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', onMouseMove, false);
    } else {
        document.removeEventListener('mousemove', onMouseMove, false);
    }
}


// Mouse Move Handler
const onMouseMove = (event) => {
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    yaw -= movementX * mouseSensitivity;
    pitch -= movementY * mouseSensitivity;

    // Optional: Limit pitch to prevent flipping
    pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitch));

    if (ship) {
        ship.rotation.y = yaw;
        // If pitch is desired for the ship, uncomment the next line
       // ship.rotation.x = pitch / 2;
    }
};

// {{ edit_1: Define NUM_SUNS constant }}
// {{ end_edit_2 }}

// {{ edit_3: Load suns based on NUM_SUNS during initialization }}
const loadSun = () => {
    gltfLoader.load(
        '/sun.glb',
        (gltf) => {
            const sun = gltf.scene;
            sun.scale.set(3, 3, 3); // Scale the sun by x3
            // Initialize sun position within LEVEL_SIZE
            const x = (Math.random() - 0.5) * LEVEL_SIZE;
            const z = (Math.random() - 0.5) * LEVEL_SIZE;
            sun.position.set(x, 0, z);

            // Ensure the sun reacts to lighting
            sun.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (!(child.material instanceof THREE.MeshStandardMaterial)) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: child.material.map,
                            color: child.material.color,
                        });
                    }
                }
            });

            // Add sun to buttons with type 'sun'
            buttons.push({ object: sun, score: PLANET_SCORES['sun.glb'] || 10, type: 'sun' });
            scene.add(sun);
            console.log('Sun added to scene');

            // Initialize sun direction
            sunDirections.push(1); // Start moving forward
        },
        (xhr) => {
            console.log(`Loading Sun: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`);
        },
        (error) => {
            console.error('An error occurred while loading the Sun model:', error);
        }
    );
};

// Load all suns based on NUM_SUNS
for (let i = 0; i < NUM_SUNS; i++) {
    loadSun();
}
// {{ end_edit_3 }}

// {{ edit_4: Remove loadSun from animate function }}
// Ensure that loadSun is not called within the animate loop
// If there is a call like loadSun() inside animate, remove it.
// Example:
// const animate = () => {
//     requestAnimationFrame(animate);
//     loadSun(); // Remove or comment out this line
//     ...
// };
// {{ end_edit_4 }}

// {{ edit_5: Update Sun Movement in Animation Loop }}
const animate = () => {
    requestAnimationFrame(animate);

    if (ship) {
        // Calculate movement direction relative to ship's orientation
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        // {{ edit_2: Update SHIP_SPEED usage }}
        // Replace SHIP_SPEED with the current variable
        // In movement logic
        if (moveForward || moveBackward) {
            const forward = new THREE.Vector3();
            ship.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();
            ship.position.add(forward.multiplyScalar(direction.z * SHIP_SPEED));
        }
        if (moveLeft || moveRight) {
            const right = new THREE.Vector3();
            ship.getWorldDirection(right);
            right.y = 0;
            right.normalize();
            right.cross(new THREE.Vector3(0, 1, 0)); // Get right vector
            ship.position.add(right.multiplyScalar(direction.x * SHIP_SPEED));
        }
        // {{ end_edit_2 }}

        // Update camera position to follow the ship
        const rotatedOffset = cameraOffset.clone().applyQuaternion(ship.quaternion);
        const desiredPosition = ship.position.clone().add(rotatedOffset);
        camera.position.lerp(desiredPosition, 0.1); // Smooth camera movement
        camera.lookAt(ship.position);
    }

    // {{ edit_5a: Move each sun across the plane }}
    buttons.forEach((button, index) => {
        if (button.type === 'sun') {
            const sun = button.object;
            sun.position.x += SUN_SPEED * sunDirections[index];
            sun.position.z += SUN_SPEED * sunDirections[index]; // Move diagonally for full plane traversal

            // Reverse direction if sun reaches boundaries
            if (sun.position.x > LEVEL_SIZE / 2 || sun.position.x < -LEVEL_SIZE / 2 ||
                sun.position.z > LEVEL_SIZE / 2 || sun.position.z < -LEVEL_SIZE / 2) {
                sunDirections[index] *= -1;
            }
        }
    });
    // {{ end_edit_5a }}

    updateScoreDisplay();
    updateBoostIndicator(); // Update boost indicator
    updateSpeedDisplay(); // Update speed display
    renderer.render(scene, camera);
};
// {{ end_edit_5 }}

// {{ edit_3: Add Speed Display Element }}
// Create Speed Display
const speedElement = document.createElement('div');
speedElement.style.position = 'absolute';
speedElement.style.bottom = '20px';
speedElement.style.left = '20px';
speedElement.style.color = 'yellow';
speedElement.style.fontSize = '24px';
speedElement.style.fontFamily = 'Arial';
speedElement.style.padding = '10px 20px';
speedElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
speedElement.style.borderRadius = '10px';
speedElement.style.textShadow = '2px 2px 4px #000';
speedElement.innerHTML = `Speed: ${SHIP_SPEED}`;
document.body.appendChild(speedElement);
// {{ end_edit_3 }}

// {{ edit_4: Update Speed Display in Animation Loop }}
const updateSpeedDisplay = () => {
    speedElement.innerHTML = `Speed: ${SHIP_SPEED}`;
};
// {{ end_edit_4 }}

animate();