import * as THREE from 'three';
import { Raycaster } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

// === Constants ===
const CONFIG = {
    NUM_PLANETS: 75,
    LEVEL_SIZE: 1000,
    PLANET_DISTANCE_THRESHOLD: 12,
    PLANET_MODELS: [
        'planet1.glb',
        'planet2.glb',
        'planet3.glb',
        'planet4.glb',
        'planet5.glb',
        'planet6.glb',
        'planet7.glb'
    ],
    BOOST_STRENGTH: 50,
    SHIP_SPEED_BASE: 0.5,
    NUM_SUNS: 5,
    SUN_SPEED: 0.15,
    SHIP_SPEED_INCREMENT: 0.1,
    PLANET_SCORES: {
        'planet1.glb': 1,
        'planet2.glb': 2,
        'planet3.glb': 3,
        'planet4.glb': 4,
        'planet5.glb': 5,
        'planet6.glb': 4,
        'planet7.glb': 4,
    },
    MOUSE_SENSITIVITY: 0.0008,
};

// === Global Variables ===
let SHIP_SPEED = CONFIG.SHIP_SPEED_BASE;
let yaw = 0;
let pitch = 0;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;
let score = 0;

const direction = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(0, 3, -9);
const raycaster = new Raycaster();
const buttons = [];

// === Scene Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Loaders ===
const exrLoader = new EXRLoader();
const gltfLoader = new GLTFLoader();
let ship;

// === Lights ===
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
console.log('Ambient light added to scene');

// === Models Loading ===
const loadEnvironment = () => {
    exrLoader.load(
        '/exr.exr',
        (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture;
            scene.backgroundIntensity = 1;
            console.log('EXR skybox loaded successfully');
        },
        undefined,
        (error) => {
            console.error('Error loading EXR skybox:', error);
        }
    );
};

const loadShip = () => {
    gltfLoader.load(
        '/ship.glb',
        (gltf) => {
            ship = gltf.scene;
            ship.scale.set(0.7, 0.7, 0.7);
            ship.position.set(0, 0, 0);
            ship.rotation.y = Math.PI;
            scene.add(ship);
            console.log('Ship model loaded and added to scene');
        },
        undefined,
        (error) => {
            console.error('An error occurred while loading the ship model:', error);
        }
    );
};

const loadPlanet = (clustering = false, clusterCenter = new THREE.Object3D(), orbitRadius = 0, orbitSpeed = 0) => {
    const randomModel = CONFIG.PLANET_MODELS[Math.floor(Math.random() * CONFIG.PLANET_MODELS.length)];
    gltfLoader.load(
        `/${randomModel}`,
        (gltf) => {
            console.log(`GLB (${randomModel}) loaded successfully`);
            const planet = gltf.scene;
            if (clustering) {
                const angle = Math.random() * 2 * Math.PI;
                planet.position.set(
                    clusterCenter.position.x + orbitRadius * Math.cos(angle),
                    clusterCenter.position.y + (Math.random() - 0.5) * 50, // Slight vertical variation
                    clusterCenter.position.z + orbitRadius * Math.sin(angle)
                );
                // Store orbit data in userData, referencing the cluster center (sun)
                planet.userData = { 
                    orbitCenter: clusterCenter,
                    orbitRadius: orbitRadius,
                    orbitAngle: angle,
                    orbitSpeed: orbitSpeed 
                };
            } else {
                // Random position within LEVEL_SIZE
                planet.position.set(
                    (Math.random() - 0.5) * CONFIG.LEVEL_SIZE,
                    (Math.random() - 0.5) * CONFIG.LEVEL_SIZE, // Allow Y variation
                    (Math.random() - 0.5) * CONFIG.LEVEL_SIZE
                );
            }
            const randomScale = Math.random() * 3.5 + 0.5;
            planet.scale.set(randomScale, randomScale, randomScale);

            planet.traverse((child) => {
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

            buttons.push({ object: planet, score: CONFIG.PLANET_SCORES[randomModel], type: 'planet' });
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

const loadSun = () => {
    gltfLoader.load(
        '/sun.glb',
        (gltf) => {
            const sun = gltf.scene;
            let sunScale = Math.random() * 20 + 1;
            sun.scale.set(sunScale, sunScale, sunScale);
            sun.position.set(
                (Math.random() - 0.5) * CONFIG.LEVEL_SIZE,
                (Math.random() - 0.5) * CONFIG.LEVEL_SIZE,
                (Math.random() - 0.5) * CONFIG.LEVEL_SIZE
            );

            const sunColor = new THREE.Color();
            sunColor.setHSL(
                THREE.MathUtils.randFloat(10 / 360, 220 / 360),
                THREE.MathUtils.randFloat(0.3, 1),
                THREE.MathUtils.randFloat(0.5, 1)
            );

            sun.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (!(child.material instanceof THREE.MeshStandardMaterial)) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: child.material.map,
                            color: sunColor,
                            emissive: sunColor,
                            emissiveIntensity: 0.8,
                        });
                    } else {
                        child.material.emissive = sunColor;
                        child.material.emissiveIntensity = 0.8;
                    }
                }
            });

            // Add sun to buttons for interaction
            buttons.push({ object: sun, score: CONFIG.PLANET_SCORES['sun.glb'] || 10, type: 'sun', direction: 1 });
            scene.add(sun);

            // Add PointLight to sun with the same color
            const sunLight = new THREE.PointLight(sunColor, 3000, 50000);
            sun.add(sunLight);
            console.log('Sun added to scene with light');

            // Spawn planets orbiting this sun
            const planetsPerSun = Math.floor(CONFIG.NUM_PLANETS / CONFIG.NUM_SUNS);
            for (let i = 0; i < planetsPerSun; i++) {
                const orbitRadius = THREE.MathUtils.randFloat(20, CONFIG.LEVEL_SIZE / 4); // Varying orbit distances
                const orbitSpeed = THREE.MathUtils.randFloat(0.001, CONFIG.SUN_SPEED * 0.01); // Varying orbit speeds
                loadPlanet(true, sun, orbitRadius, orbitSpeed);
            }
        },
        (xhr) => {
            console.log(`Loading Sun: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`);
        },
        (error) => {
            console.error('An error occurred while loading the Sun model:', error);
        }
    );
};

// === Input Handling ===
const handleKeyDown = (event) => {
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
        case 'KeyE':
            moveUp = true;
            break;
        case 'KeyQ':
            moveDown = true;
            break;
        case 'Space':
            if (score >= 10 && ship) {
                score -= 10;
                const forward = new THREE.Vector3();
                ship.getWorldDirection(forward);
                forward.y = 0;
                forward.normalize();
                ship.position.add(forward.multiplyScalar(CONFIG.BOOST_STRENGTH));
                console.log(`Boost applied! Score: ${score}`);
                updateScoreDisplay();
            }
            break;
    }
};

const handleKeyUp = (event) => {
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
        case 'KeyE':
            moveUp = false;
            break;
        case 'KeyQ':
            moveDown = false;
            break;
    }
};

const handleMouseClick = () => {
    if (!ship) return;

    const forward = new THREE.Vector3();
    ship.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const origin = new THREE.Vector3();
    ship.getWorldPosition(origin);

    raycaster.set(origin, forward);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;
        const button = buttons.find(btn => btn.object === intersected || btn.object.getObjectById(intersected.id));
        
        if (button) {
            const distance = ship.position.distanceTo(button.object.position);
            if (distance < CONFIG.PLANET_DISTANCE_THRESHOLD) {
                score += button.score;
                console.log(`Energy: ${score}`);

                if (button.type === 'sun') {
                    SHIP_SPEED += CONFIG.SHIP_SPEED_INCREMENT;
                    console.log(`Speed increased! New Speed: ${SHIP_SPEED}`);
                }

                resetButton(button.object);
            }
        }
    }
};

const handleMouseMove = (event) => {
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    yaw -= movementX * CONFIG.MOUSE_SENSITIVITY;
    pitch -= movementY * CONFIG.MOUSE_SENSITIVITY;

    pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitch));

    if (ship) {
        ship.rotation.y = yaw;
        ship.rotation.x = pitch;
    }
};

// === Event Listeners ===
document.addEventListener('keydown', handleKeyDown, false);
document.addEventListener('keyup', handleKeyUp, false);
document.addEventListener('mousedown', handleMouseClick, false);

const onClick = () => {
    renderer.domElement.requestPointerLock();
};

document.addEventListener('click', onClick, false);
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', handleMouseMove, false);
    } else {
        document.removeEventListener('mousemove', handleMouseMove, false);
    }
}, false);

// === UI Elements ===
const createUIElements = () => {
    // Score Display
    const scoreElement = document.createElement('div');
    Object.assign(scoreElement.style, {
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'yellow',
        fontSize: '48px',
        fontFamily: 'Arial',
        padding: '10px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '10px',
        textShadow: '2px 2px 4px #000',
    });
    scoreElement.innerHTML = `Energy: ${score}`;
    document.body.appendChild(scoreElement);

    // Aim Element
    const aimElement = document.createElement('div');
    Object.assign(aimElement.style, {
        position: 'absolute',
        left: '50%',
        top: '38%',
        transform: 'translate(-50%, -50%)',
        width: '20px',
        height: '20px',
        opacity: '0.5',
        border: '2px dashed yellow',
        borderRadius: '50%',
    });
    document.body.appendChild(aimElement);

    // Boost Indicator
    const boostIndicator = document.createElement('div');
    Object.assign(boostIndicator.style, {
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100px',
        height: '40px',
        border: '2px solid yellow',
        borderRadius: '15px',
        backgroundColor: score >= 10 ? 'green' : 'red',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '24px',
        fontFamily: 'Arial',
    });
    boostIndicator.textContent = 'BOOST';
    document.body.appendChild(boostIndicator);

    // Speed Display
    const speedElement = document.createElement('div');
    Object.assign(speedElement.style, {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'yellow',
        fontSize: '24px',
        fontFamily: 'Arial',
        padding: '10px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '10px',
        textShadow: '2px 2px 4px #000',
    });
    speedElement.innerHTML = `Speed: ${SHIP_SPEED}`;
    document.body.appendChild(speedElement);

    // Add Instructions Panel
    const instructionsPanel = document.createElement('div');
    Object.assign(instructionsPanel.style, {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '250px',
        padding: '15px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        borderRadius: '10px',
        textShadow: '1px 1px 2px #000',
        boxSizing: 'border-box',
    });
    instructionsPanel.innerHTML = `
        <h3 style="margin-top: 0;">How to Play</h3>
        <ul style="padding-left: 20px; margin: 0;">
            <li><strong>W/A/S/D:</strong> Move Forward/Left/Backward/Right</li>
            <li><strong>E/Q:</strong> Move Up/Down</li>
            <li><strong>Mouse:</strong> Look Around</li>
            <li><strong>Space:</strong> Boost (Requires 10 Energy)</li>
            <li><strong>Click:</strong> Shoot</li>
        </ul>
    `;
    document.body.appendChild(instructionsPanel);

    // Update return statement to include instructionsPanel
    return { scoreElement, boostIndicator, speedElement, instructionsPanel };
};

// === UI Update Functions ===
const updateScoreDisplay = () => {
    scoreElement.innerHTML = `Energy: ${score}`;
};

const updateBoostIndicator = () => {
    boostIndicator.style.backgroundColor = score >= 10 ? 'green' : 'red';
};

const updateSpeedDisplay = () => {
    speedElement.innerHTML = `Speed: ${SHIP_SPEED.toFixed(1)}`;
};

// === Initialize UI ===
const { scoreElement, boostIndicator, speedElement, instructionsPanel } = createUIElements();

// === Window Resize Handler ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// === Utility Functions ===
const resetButton = (button) => {
    button.position.set(
        (Math.random() - 0.5) * CONFIG.LEVEL_SIZE,
        0,
        (Math.random() - 0.5) * CONFIG.LEVEL_SIZE
    );
};

// === Animation Loop ===
const animate = () => {
    requestAnimationFrame(animate);

    if (ship) {
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.y = Number(moveUp) - Number(moveDown);
        direction.normalize();

        // Enable forward/backward movement based on ship's pitch
        if (moveForward || moveBackward) {
            const forward = new THREE.Vector3();
            ship.getWorldDirection(forward);
            forward.normalize();
            ship.position.add(forward.multiplyScalar(direction.z * SHIP_SPEED));
        }

        // Enable left/right movement based on ship's pitch
        if (moveLeft || moveRight) {
            const right = new THREE.Vector3();
            ship.getWorldDirection(right);
            right.normalize();
            right.cross(new THREE.Vector3(0, 1, 0)); // Get right vector
            ship.position.add(right.multiplyScalar(direction.x * SHIP_SPEED));
        }

        // Handle upward and downward movement
        if (moveUp || moveDown) {
            const up = new THREE.Vector3(0, 1, 0);
            ship.position.add(up.multiplyScalar(direction.y * SHIP_SPEED));
        }

        // Update camera position to follow the ship
        const rotatedOffset = cameraOffset.clone().applyQuaternion(ship.quaternion);
        const desiredPosition = ship.position.clone().add(rotatedOffset);
        camera.position.lerp(desiredPosition, 0.1); // Smooth camera movement
        camera.lookAt(ship.position);
    }

    buttons.forEach((button) => {
        if (button.type === 'sun') {
            const sun = button.object;
            sun.position.x += CONFIG.SUN_SPEED * 0.1 * Math.sin(Date.now() * 0.000005) * button.direction;
            sun.position.z += CONFIG.SUN_SPEED * 0.1 * Math.sin(Date.now() * 0.000005) * button.direction;

            if (
                sun.position.x > CONFIG.LEVEL_SIZE / 2 || sun.position.x < -CONFIG.LEVEL_SIZE / 2 ||
                sun.position.z > CONFIG.LEVEL_SIZE / 2 || sun.position.z < -CONFIG.LEVEL_SIZE / 2
            ) {
                button.direction *= -1;
            }
        }

        if (button.type === 'planet' && button.object.userData.orbitCenter) {
            const planet = button.object;
            planet.userData.orbitAngle += planet.userData.orbitSpeed;
            
            // Calculate new position based on the current position of the orbit center (sun)
            const orbitCenter = button.object.userData.orbitCenter;
            planet.position.x = orbitCenter.position.x + button.object.userData.orbitRadius * Math.cos(planet.userData.orbitAngle);
            planet.position.z = orbitCenter.position.z + button.object.userData.orbitRadius * Math.sin(planet.userData.orbitAngle);
            // If you want the planet to maintain Y position, you can omit or adjust the Y-axis accordingly
        }
    });

    updateScoreDisplay();
    updateBoostIndicator();
    updateSpeedDisplay();
    renderer.render(scene, camera);
};

// === Initialization ===
const init = () => {
    loadEnvironment();
    loadShip();

    // Spawn suns which will act as cluster centers
    for (let i = 0; i < CONFIG.NUM_SUNS; i++) {
        loadSun();
    }

    animate();
};

init();