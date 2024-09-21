import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Raycaster, Vector2 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Constants
const NUM_PLANETS = 90;
const LEVEL_SIZE = 300;
const PLANET_DISTANCE_THRESHOLD = 10;
const PLANET_MODELS = ['planet1.glb', 'planet2.glb', 'planet3.glb', 'planet4.glb'];

// Constants for planet scores
const PLANET_SCORES = {
    'planet1.glb': 1,
    'planet2.glb': 2,
    'planet3.glb': 3,
    'planet4.glb': 4,
};

// Scene, Camera, Renderer
const scene = new THREE.Scene();

// Add skybox
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

// Controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object); // Updated to use controls.object instead of getObject()

const onClick = () => {
    controls.lock();
};

document.addEventListener('click', onClick, false);

// Movement Variables
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

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
            if (score >= 10) { // Check if enough score
                score -= 10;
                velocity.z -= 2; // Apply forward boost, adjust value as needed
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
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const button = buttons.find(btn => btn.object === intersected || btn.object.getObjectById(intersected.id));
        
        if (button) {
            const distance = camera.position.distanceTo(button.object.position);
            if (distance < PLANET_DISTANCE_THRESHOLD) {
                score += button.score;
                console.log(`Score: ${score}`);
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
scoreElement.innerHTML = `Score: ${score}`;
document.body.appendChild(scoreElement);

// Update score display in animation loop
const updateScoreDisplay = () => {
    scoreElement.innerHTML = `Score: ${score}`;
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
boostIndicator.style.width = '20px';
boostIndicator.style.height = '20px';
boostIndicator.style.border = '2px solid yellow';
boostIndicator.style.borderRadius = '50%';
boostIndicator.style.backgroundColor = score >= 10 ? 'green' : 'red'; // Initial color
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

// Animation Loop
const animate = () => {
    requestAnimationFrame(animate);

    if (controls.isLocked === true) {
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 0.1;
        if (moveLeft || moveRight) velocity.x -= direction.x * 0.1;

        // Apply gravity
        velocity.y -= 9.8 * 0.016; // Assuming 60 FPS

        controls.moveRight(-velocity.x);
        controls.moveForward(-velocity.z);

        // Move the camera vertically
        controls.object.position.y += velocity.y;

        // Check if on ground and reset jump
        if (controls.object.position.y < 1.5) { // Adjust ground level as needed
            velocity.y = 0;
            controls.object.position.y = 1.5;
            canJump = true;
        }

        // Apply friction
        velocity.x *= 0.3;
        velocity.z *= 0.3;
    }

    updateScoreDisplay();
    updateBoostIndicator(); // Update boost indicator
    renderer.render(scene, camera);
};

animate();