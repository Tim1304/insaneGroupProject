// @ts-check

import * as T from "./CS559-Three/build/three.module.js";

// @@Snippet:createRenderer
let renderer = new T.WebGLRenderer( { antialias: true } );
renderer.setSize(800, 600); // was (window.innerWidth, window.innerHeight );
document.getElementById("div1").appendChild(renderer.domElement);
// @@Snippet:end

// the aspect ratio is set to 1 - since we're making the window 200x200
let camera = new T.PerspectiveCamera(50, 800 / 600, 0.1, 1000);

let scene = new T.Scene();

let geometry = new T.BoxGeometry(1, 1, 1);
// this was "MeshBasicMaterial"
let material = new T.MeshStandardMaterial({ color: 0x00ff00 });
let cube = new T.Mesh(geometry, material);
scene.add(cube);

// we don't see anything if there is no light
let ambientLight = new T.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
let pointLight = new T.PointLight(0xffffff, 1, 0, 0); // no decay
pointLight.position.set(25, 50, 25);
scene.add(pointLight);

camera.position.z = 5;

let lastTimestamp; // undefined to start

function animate(timestamp) {
    // Convert time change from milliseconds to seconds
    let timeDelta = 0.002 * (lastTimestamp ? timestamp - lastTimestamp : 0);
    lastTimestamp = timestamp;

    cube.rotation.x += 0.5 * timeDelta;
    cube.rotation.y += 0.5 * timeDelta;

    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

window.requestAnimationFrame(animate);

// CS559 2025 Workbook

