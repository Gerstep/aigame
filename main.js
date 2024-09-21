import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TextureLoader } from 'three';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Add skybox
const loader = new TextureLoader();
loader.load('public/bg1.png', (texture) => {
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

// Simple 3D Structures
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

for (let i = 0; i < 20; i++) {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
        Math.random() * 50 - 25,
        Math.random() * 5,
        Math.random() * 50 - 25
    );
    scene.add(cube);
}

// Floor
// const floorGeometry = new THREE.PlaneGeometry(50, 50);
// const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
// const floor = new THREE.Mesh(floorGeometry, floorMaterial);
// floor.rotation.x = Math.PI / 2;
// scene.add(floor);

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

    renderer.render(scene, camera);
};

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);
