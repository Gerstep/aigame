import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader.js';
import { TextureLoader } from 'three';
import { Raycaster, Vector2 } from 'three'; // {{ edit_1: Import Raycaster and Vector2 }}

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Load and render VRML model
// const vrmlLoader = new VRMLLoader();
// vrmlLoader.load('LEVhouse.wrl', (object) => {
//     // Scale and position the model as needed
//     object.scale.set(10, 10, 10); // Adjust scale as needed
//     object.position.set(50, -10, 50); // Adjust position as needed
//     scene.add(object);
// });

const ambientLight = new THREE.AmbientLight( 0xffffff, 1.2 );
scene.add( ambientLight );

const dirLight = new THREE.DirectionalLight( 0xffffff, 2.0 );
dirLight.position.set( 200, 200, 200 );
scene.add( dirLight );

// Add skybox
const loader = new TextureLoader();
loader.load('bg1.png', (texture) => {
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    // Flip the geometry inside out
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        map: texture
    });
    const skybox = new THREE.Mesh(geometry, material);
    skybox.position.y = 400; // Move the skybox up
    scene.add(skybox);
});

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

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

// Event Listeners
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
            if (canJump === true) velocity.y += 3;
            canJump = false;
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

// // Simple 3D Structures
// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

// for (let i = 0; i < 20; i++) {
//     const cube = new THREE.Mesh(geometry, material);
//     cube.position.set(
//         Math.random() * 50 - 25,
//         Math.random() * 5,
//         Math.random() * 50 - 25
//     );
//     scene.add(cube);
// }

// Floor
// const floorGeometry = new THREE.PlaneGeometry(50, 50);
// const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
// const floor = new THREE.Mesh(floorGeometry, floorMaterial);
// floor.rotation.x = Math.PI / 2;
// scene.add(floor);

// Consolidate all animate logic into the first animate function
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
        controls.getObject().position.y += velocity.y;

        // Check if on ground and reset jump
        if (controls.getObject().position.y < 0.5) {
            velocity.y = 0;
            controls.getObject().position.y = 0.5;
            canJump = true;
        }

        velocity.x *= 0.5;
        velocity.z *= 0.5;
    }

    // Update score display
    scoreElement.innerHTML = `Score: ${score}`;
    scoreElement.style.scale = 3;
    scoreElement.style.position = 'absolute';
    scoreElement.style.top = '20px';
    scoreElement.style.left = '70px';
    scoreElement.style.color = 'black';

    renderer.render(scene, camera);
};

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// Initialize Raycaster and Mouse Vector
const raycaster = new Raycaster(); // {{ edit_2: Initialize Raycaster }}
const mouse = new Vector2();

// Initialize Score Counter
let score = 0; // {{ edit_3: Initialize score counter }}

// Create Button
const buttonGeometry = new THREE.BoxGeometry(1, 1, 1);
const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
button.position.set(5, 0.5, -5); // Position the button in the scene
scene.add(button);

// Add Event Listener for Click
const onMouseClick = (event) => { // {{ edit_4: Add mouse click handler }}
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update Raycaster
    raycaster.setFromCamera(mouse, camera);

    // Calculate intersect objects
    const intersects = raycaster.intersectObjects([button]);

    if (intersects.length > 0) {
        // Check distance between player and button
        const distance = camera.position.distanceTo(button.position);
        if (distance < 5) { // Adjust the distance threshold as needed
            score += 1;
            console.log(`Score: ${score}`); // {{ edit_5: Update score display }}
            resetButton();
        }
    }
};

document.addEventListener('click', onMouseClick, false); // {{ edit_6: Attach click event }}

// Function to Reset Button
const resetButton = () => { // {{ edit_7: Define reset function }}
    button.position.set(Math.random() * 20 - 10, 0.5, Math.random() * 20 - 10); // Move button to a new random location
    button.material.color.set(0x00ff00); // Change color to indicate reset
    setTimeout(() => {
        button.material.color.set(0xff0000); // Revert color after a short delay
    }, 500);
};

// Optionally, display score in the scene using HTML or THREE.js text
// Example using HTML:
const scoreElement = document.createElement('div');
scoreElement.style.position = 'absolute';
scoreElement.style.top = '10px';
scoreElement.style.left = '10px';
scoreElement.style.color = 'white';
scoreElement.innerHTML = `Score: ${score}`;
document.body.appendChild(scoreElement);

// {{ edit_8: Add aim element }}
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

animate();
