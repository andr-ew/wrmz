import * as THREE from 'https://unpkg.com/three@0.137.5?module';
import Stats from 'https://unpkg.com/three@0.137.5/examples/jsm/libs/stats.module.js?module';

let start, capturer, recording, width, height;

//some THREE.js "boilerplate"

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    3400
    //400
);

// var camera;
// {
//     width = window.innerWidth;
//     height = window.innerHeight;
//     camera = new THREE.OrthographicCamera(
//         width / -2,
//         width / 2,
//         height / 2,
//         height / -2,
//         1,
//         1000
//     );
// }

const renderer = new THREE.WebGLRenderer({
    preserveDrawingBuffer: true,
    alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

//setting the background to blue, nice for chromakeys
renderer.setClearColor(0x0000ff, 1);

const stats = new Stats();
document.body.appendChild(stats.dom);

function resize() {
    let w, h;
    if (recording) {
        w = width;
        h = height;
    } else {
        w = window.innerWidth;
        h = window.innerHeight;
    }

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

function loop(duration = 3, init = () => {}, options = {}) {
    width = options.width || 1920;
    height = options.height || 1080;

    let update = init(scene, camera, renderer) ?? (() => {});

    let animate = () => {
        requestAnimationFrame(animate);

        const now = (performance || Date).now();
        let firstFrame;

        if (start === undefined) {
            start = now;
            firstFrame = true;
        } else {
            firstFrame = false;
        }
        const elapsed = now - start;

        //t = loop position in the range 0 - 1
        const t = (elapsed % (duration * 1000)) / (duration * 1000);

        update(t, elapsed, firstFrame);

        renderer.render(scene, camera);
        if (capturer) capturer.capture(renderer.domElement);
    };
    animate();

    //set up ccapture.js with webm video format
    capturer = new CCapture({
        framerate: options.framerate || 60,
        format: 'webm',
        timeLimit: duration, //record exactly one loop
        display: true,
    });

    if (options.done) options.done();
}

//record using ccapture.js when the record button is pressed
window.record = function () {
    console.log('begin recording');

    recording = true;
    resize(); //resize scene to video dimentions

    start = undefined; //reset loop timing
    capturer.start();
};

export { loop };
