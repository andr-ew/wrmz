import * as THREE from 'https://unpkg.com/three@0.137.5?module';
import { OBJLoader } from 'https://unpkg.com/three@0.137.5/examples/jsm/loaders/OBJLoader.js?module';

// function Crv() {
//     THREE.Curve.call( this );
// }
// Crv.prototype = Object.create( THREE.Curve.prototype );
// Crv.prototype.constructor = Crv;

var w = window;

w.frames = [];
w.addf = () => {
    w.frames.push(new THREE.Spherical().setFromVector3(w.camera.position));
};

var sphericalDistance = (a, b) => {
    return Math.sqrt(
        Math.pow(a.radius, 2) +
            Math.pow(b.radius, 2) -
            2 *
                a.radius *
                b.radius *
                (Math.sin(a.theta) *
                    Math.sin(b.theta) *
                    Math.cos(a.phi - b.phi) +
                    Math.cos(a.theta) * Math.cos(b.theta))
    );
};

export var makecrv = function (getPoint) {
    // let crv = new Crv();
    let crv = new THREE.Curve();
    crv.getPoint = getPoint;

    // let cmat = new THREE.MeshBasicMaterial();
    // let cmsh = new THREE.Mesh( crv, cmat );

    return new THREE.TubeBufferGeometry(crv, 100, 1, 3, true);
};

export var loadmodel = function (name, onload) {
    var objload = new OBJLoader();
    var bmload = new THREE.TextureLoader();
    //bmload.setOptions( { imageOrientation: 'flipY' } );

    var mat, geo;

    bmload.load(
        // resource URL
        'mod/' + name + '.bmp',
        tex => {
            mat = new THREE.MeshBasicMaterial({ map: tex });

            objload.load(
                './mod/' + name + '.obj',
                object => {
                    object.traverse(child => {
                        if (child.geometry !== undefined) {
                            geo = child.geometry;
                        }
                    });

                    if (onload) onload(geo, mat);
                },
                undefined,
                function (error) {
                    console.log(error);
                }
            );
        },
        undefined,
        function (err) {
            console.log(err);
        }
    );
};

export var formatters = {};

formatters['teapot3'] = mesh => {
    mesh.position.y = -50 * 0.25;
    mesh.scale.set(0.25, 0.25, 0.25);
    mesh.rotateX(-Math.PI / 2);

    return mesh;
};

formatters['boquet'] = mesh => {
    mesh.position.z = -275;
    mesh.position.y = 50;
    mesh.scale.set(0.5, 0.5, 0.5);
    mesh.rotateX(Math.PI / 8);

    return mesh;
};

formatters['tea'] = mesh => {
    mesh.position.z = -270;
    mesh.position.y = 75;
    mesh.position.x = 10;
    mesh.scale.set(0.5, 0.5, 0.5);
    mesh.rotateX((Math.PI / 8) * 1.4);
    mesh.rotateZ(-Math.PI * 0.037);

    return mesh;
};

export var makemodel = (name, onload) => {
    loadmodel(name, (geo, mat) => {
        var mesh = new THREE.Mesh(geo, mat);

        if (formatters[name]) {
            formatters[name](mesh);
        }

        if (onload) onload(mesh);
    });
};

export var sky = function (renderer, tex) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    var hdrCubeRenderTarget = pmremGenerator.fromEquirectangular(tex);
    tex.dispose();
    pmremGenerator.dispose();

    return hdrCubeRenderTarget.texture;
};

export var Wrm = function (name, crv, nsegs, onload) {
    var direction = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var position = new THREE.Vector3();
    var lookAt = new THREE.Vector3();

    var segments = [];
    this.group = new THREE.Group();

    loadmodel(name, (geo, mat) => {
        for (let i = 0; i < nsegs; i++) {
            var mesh = new THREE.Mesh(geo, mat);
            if (formatters[name]) {
                formatters[name](mesh);
            }

            var container = new THREE.Group();
            container.add(mesh);
            container.rotation.x = -Math.PI / 2;
            segments[i] = new THREE.Group();
            segments[i].add(container);

            this.group.add(segments[i]);
        }

        if (onload) onload();
    });

    this.update = function (T) {
        for (let i in segments) {
            let seg = segments[i];
            let t = (T + i / nsegs) % 1;

            crv.parameters.path.getPointAt(t, position);
            position.multiplyScalar(1);

            // interpolation

            var tangents = crv.tangents.length;
            var pickt = t * tangents;
            var pick = Math.floor(pickt);
            var pickNext = (pick + 1) % tangents;

            binormal.subVectors(crv.binormals[pickNext], crv.binormals[pick]);
            binormal.multiplyScalar(pickt - pick).add(crv.binormals[pick]);

            crv.parameters.path.getTangentAt(t, direction);
            var offset = 15;

            normal.copy(binormal).cross(direction);

            // we move on a offset on its binormal

            position.add(normal.clone().multiplyScalar(offset));

            seg.position.copy(position);

            // using arclength for stablization in look ahead

            crv.parameters.path.getPointAt(
                (t + 30 / crv.parameters.path.getLength()) % 1,
                lookAt
            );
            lookAt.multiplyScalar(1);

            // camera orientation 2 - up orientation via normal

            if (!true) lookAt.copy(position).add(direction);
            seg.matrix.lookAt(seg.position, lookAt, normal);
            seg.quaternion.setFromRotationMatrix(seg.matrix);
        }
    };
};

export var Seq = function (args) {
    var tweens = [];
    var grp = new TWEEN.Group();

    var state = new THREE.Spherical().copy(args[0][1]);

    var time = t => {
        return t * 1000;
    };

    var on = () => {
        w.camera.position.setFromSpherical(state);
        camera.lookAt(0, 0, 0);
    };

    for (let i = 0; i < args.length; i++) {
        tweens[i] = new TWEEN.Tween(state, grp)
            .to(args[i][1], time(args[i][0]))
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(on);

        let last = i == 0 ? args.length - 1 : i - 1;

        console.log(
            'distance ' +
                i +
                ', ' +
                last +
                ': ' +
                sphericalDistance(args[i][1], args[last][1])
        );

        if (args[last][2]) {
            tweens[i].delay(time(args[last][2]));
        }
    }

    for (let i = 0; i < tweens.length - 1; i++) tweens[i].chain(tweens[i + 1]);
    tweens[tweens.length - 1].chain(tweens[0]);

    this.update = function (ms) {
        grp.update();
    };

    on(state);
    tweens[1].start();
};

export var Seq2 = function (frames, state, update, time, wait, ease, looptime) {
    var tweens = [],
        times = [],
        waits = [],
        duration = 0;
    var grp = new TWEEN.Group();
    var init = state.clone();

    for (let i = 0; i < frames.length; i++) {
        let last = i == 0 ? frames.length - 1 : i - 1;

        times[i] = time(i) * sphericalDistance(frames[last], frames[i]);
        waits[i] = wait(i);
        duration += times[i] + waits[i];
    }
    for (let i = 0; i < frames.length; i++) {
        let t = (times[i] / duration) * looptime;
        let w = (waits[i] / duration) * looptime;

        tweens[i] = new TWEEN.Tween(state, grp)
            .to(frames[i], t * 1000)
            .delay(w * 1000)
            .easing(ease)
            .onUpdate(update);
    }
    for (let i = 0; i < tweens.length - 1; i++) tweens[i].chain(tweens[i + 1]);
    tweens[tweens.length - 1].chain(tweens[0]);

    this.update = ms => {
        grp.update(ms, false);
    };

    // this.start = () => {
    //     // for(let i = 0; i < frames.length; i++) tweens[i].stop();
    //     update(state);
    //     tweens[1].start()
    // }

    this.start = () => {
        update(state);
        tweens[1].start(0);
    };
};
