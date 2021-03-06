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

export var loadmodel = function (name, onload, texture) {
    var objload = new OBJLoader();
    var bmload = new THREE.TextureLoader();
    //bmload.setOptions( { imageOrientation: 'flipY' } );

    var mat, geo;

    const texturePath = texture || 'mod/' + name + '.bmp';

    bmload.load(
        // resource URL
        texturePath,
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
    mesh.position.z = -270;
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

formatters['flower'] = mesh => {
    mesh.position.z = -600;
    mesh.position.y = -140;
    // mesh.position.x = -300;

    let g = new THREE.Group();
    g.add(mesh);

    g.rotateY(((Math.PI * 1) / 2) * 0.9);
    g.rotateX(((Math.PI * 1) / 4) * 0.8);
    g.rotateZ(-Math.PI * 0.005);

    g.scale.set(0.5, 0.5, 0.5);

    return g;
};

formatters['fruits'] = mesh => {
    mesh.position.z = -590;
    mesh.position.y = -120;
    mesh.position.x = 30;

    let g = new THREE.Group();
    g.add(mesh);

    g.rotateY(Math.PI / 8);
    g.rotateX(((Math.PI * 1) / 4) * 0.75);
    g.rotateZ(-Math.PI * 0.04);

    g.scale.set(0.5, 0.5, 0.5);

    return g;
};

export var makemodel = (name, onload) => {
    loadmodel(name, (geo, mat) => {
        var mesh = new THREE.Mesh(geo, mat);

        if (formatters[name]) {
            mesh = formatters[name](mesh);
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

export var Wrm = function (
    name,
    crv,
    nsegs,
    rotation = t => ({ x: -Math.PI / 2 }),
    texture,
    onload = () => {}
) {
    var direction = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var position = new THREE.Vector3();
    var lookAt = new THREE.Vector3();

    var segments = [];
    var groups = [];
    this.group = new THREE.Group();

    loadmodel(
        name,
        (geo, mat) => {
            for (let i = 0; i < nsegs; i++) {
                var mesh = new THREE.Mesh(geo, mat);
                if (formatters[name]) {
                    mesh = formatters[name](mesh);
                }

                var container = new THREE.Group();
                container.add(mesh);
                groups[i] = container;
                // container.rotation.x = ;

                // for (const ax in rotation) container.rotation[ax] = rotation[ax];

                segments[i] = new THREE.Group();
                segments[i].add(container);

                this.group.add(segments[i]);
            }
            onload(this);
        },
        texture
    );

    this.update = function (T) {
        for (let i in segments) {
            let seg = segments[i];
            let t = (T + i / nsegs) % 1;

            const rot = rotation(t);
            for (const ax in rot) groups[i].rotation[ax] = rot[ax];

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

export var Coaster = function (camera, crv, offset = 60, lookAhead = false) {
    var direction = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var position = new THREE.Vector3();
    var lookAt = new THREE.Vector3();

    this.offset = offset;
    this.scale = 1;
    this.lookAhead = lookAhead;

    this.update = function (t) {
        let tubeGeometry = crv;
        let splineCamera = camera;

        tubeGeometry.parameters.path.getPointAt(t, position);
        position.multiplyScalar(this.scale);

        // interpolation

        const segments = tubeGeometry.tangents.length;
        const pickt = t * segments;
        const pick = Math.floor(pickt);
        const pickNext = (pick - 1) % segments;

        binormal.subVectors(
            tubeGeometry.binormals[pickNext] || new THREE.Vector3(),
            tubeGeometry.binormals[pick] || new THREE.Vector3()
        );
        binormal
            .multiplyScalar(pickt - pick)
            .add(tubeGeometry.binormals[pick] || new THREE.Vector3());

        tubeGeometry.parameters.path.getTangentAt(t, direction);

        normal.copy(binormal).cross(direction);

        // we move on a offset on its binormal

        position.add(normal.clone().multiplyScalar(this.offset));

        splineCamera.position.copy(position);
        //cameraEye.position.copy(position);

        // using arclength for stablization in look ahead

        tubeGeometry.parameters.path.getPointAt(
            (t + 30 / tubeGeometry.parameters.path.getLength()) % 1,
            lookAt
        );
        lookAt.multiplyScalar(this.scale);

        // camera orientation 2 - up orientation via normal

        if (!this.lookAhead) lookAt.copy(position).add(direction);
        splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
        splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);
    };
};

export var SignPost = function (obj, crv) {
    var direction = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var position = new THREE.Vector3();
    var lookAt = new THREE.Vector3();

    var q = new THREE.Quaternion();
    var point = new THREE.Vector3();

    this.offset = 1;
    this.scale = 1;
    this.position = 0;
    this.rotation = 0;

    //TODO: modify
    this.update = function () {
        let tubeGeometry = crv;
        let splineCamera = obj;
        let t = this.position;

        tubeGeometry.parameters.path.getPointAt(t, position);
        position.multiplyScalar(this.scale);

        // interpolation

        const segments = tubeGeometry.tangents.length;
        const pickt = t * segments;
        const pick = Math.floor(pickt);
        const pickNext = (pick - 1) % segments;

        binormal.subVectors(
            tubeGeometry.binormals[pickNext] || new THREE.Vector3(),
            tubeGeometry.binormals[pick] || new THREE.Vector3()
        );
        binormal
            .multiplyScalar(pickt - pick)
            .add(tubeGeometry.binormals[pick] || new THREE.Vector3());

        tubeGeometry.parameters.path.getTangentAt(t, direction);

        normal.copy(binormal).cross(direction);

        // we move on a offset on its binormal

        position.add(
            normal.clone().multiplyScalar(this.offset)
            //.applyAxisAngle(direction, this.rotation)
        );

        splineCamera.position.copy(position);

        // using arclength for stablization in look ahead

        tubeGeometry.parameters.path.getPointAt(
            (t + 30 / tubeGeometry.parameters.path.getLength()) % 1,
            lookAt
        );
        lookAt.multiplyScalar(this.scale);

        // camera orientation 2 - up orientation via normal

        if (!this.lookAhead) lookAt.copy(position).add(direction);
        splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
        splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);

        //splineCamera.rotation.z = 2 * Math.PI - this.rotation + Math.PI / 2;

        //rotate object around spline based on this.rotation
        tubeGeometry.parameters.path.getPointAt(t, point);
        q.setFromAxisAngle(direction, this.rotation);

        splineCamera.applyQuaternion(q);

        splineCamera.position.sub(point);
        splineCamera.position.applyQuaternion(q);
        splineCamera.position.add(point);
    };
};

const wrap_minmax = (n, min = 0, max = 1) => {
    const r = max - min;
    while (n < min) n += r;
    while (n > max) n -= r;
    return n;
};

export var Billboard = function (obj, crv, lookAtDistance) {
    var direction = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var position = new THREE.Vector3();
    var lookAt = new THREE.Vector3();

    this.offset = 1;
    this.scale = 1;
    this.position = 0;
    this.rotation = 0;

    //TODO: modify
    this.update = function () {
        let tubeGeometry = crv;
        let splineCamera = obj;
        let t = this.position;

        tubeGeometry.parameters.path.getPointAt(t, position);
        position.multiplyScalar(this.scale);

        // interpolation

        const segments = tubeGeometry.tangents.length;
        const pickt = t * segments;
        const pick = Math.floor(pickt);
        const pickNext = (pick - 1) % segments;

        binormal.subVectors(
            tubeGeometry.binormals[pickNext] || new THREE.Vector3(),
            tubeGeometry.binormals[pick] || new THREE.Vector3()
        );
        binormal
            .multiplyScalar(pickt - pick)
            .add(tubeGeometry.binormals[pick] || new THREE.Vector3());

        tubeGeometry.parameters.path.getTangentAt(t, direction);

        normal.copy(binormal).cross(direction);

        // we move on a offset on its binormal

        position.add(
            normal
                .clone()
                .multiplyScalar(this.offset)
                .applyAxisAngle(direction, this.rotation)
        );

        splineCamera.position.copy(position);

        // splineCamera.lookAt(
        //     tubeGeometry.parameters.path.getPointAt(
        //         wrap_minmax(t + lookAtDistance)
        //     )
        // );

        // using arclength for stablization in look ahead

        tubeGeometry.parameters.path.getPointAt(
            wrap_minmax(t + lookAtDistance),
            lookAt
        );
        //lookAt.multiplyScalar(this.scale);

        // camera orientation 2 - up orientation via normal

        //if (!this.lookAhead) lookAt.copy(position).add(normal);
        splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
        splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);
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

export var getTVPaths = (path, onload) => {
    (async () => {
        try {
            const res = await fetch(path);
            const data = await res.json();
            onload(data);
        } catch (e) {
            console.error(e);
        }
    })();
};

export var getTVFrames = (listPath, onload) => {
    getTVPaths(listPath, paths => {
        const frames = {};

        for (const id in paths) {
            frames[id] = paths[id]
                .map(framePath => {
                    const img = new Image();
                    img.src = `vid_frames/${id}/${framePath}`;

                    return img;
                })
                .sort();
        }

        onload(frames);
    });
};

//TODO: lookAt option (face n segments away from position segment)
export var TV = function (size) {
    const fps = 24;

    this.group = new THREE.Group();
    this.frames = null;

    const texture = new THREE.Texture();

    const geometry = new THREE.PlaneGeometry(
        (640 / 480) * size,
        (480 / 480) * size
    );
    const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        map: texture,
    });
    const plane = new THREE.Mesh(geometry, material);
    this.group.add(plane);

    this.update = elapsed => {
        if (this.frames) {
            const i = Math.floor(elapsed / fps) % this.frames.length;
            texture.image = this.frames[i];
            texture.needsUpdate = true;
        }
    };
};

const getGeometryVerticies = geometry => {
    const positionAttribute = geometry.getAttribute('position');
    const vertices = {};
    for (let i = 0; i < positionAttribute.count; i++) {
        let point = new THREE.Vector3().fromBufferAttribute(
            positionAttribute,
            i
        );
        const key = [point.x, point.y, point.z].join(',');
        if (!vertices[key]) {
            vertices[key] = point;
        }
    }

    return Object.values(vertices);
};

const shuffle = array => {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * i);
        let k = array[i];
        array[i] = array[j];
        array[j] = k;
    }
};

export var JumboSphere = function (count, size) {
    this.group = new THREE.Group();
    var ico = new THREE.IcosahedronGeometry(2000, 1);
    var vertices = getGeometryVerticies(ico);
    shuffle(vertices);

    this.tvs = [];

    for (let i = 0; i < count; i++) {
        const tv = new TV(size);

        tv.group.position.copy(vertices[i % vertices.length]);
        tv.group.lookAt(0, 0, 0);
        this.group.add(tv.group);

        this.tvs[i] = tv;
    }
};
