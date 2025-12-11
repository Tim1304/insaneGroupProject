// @ts-check
import * as T from "../CS559-Three/build/three.module.js";
import { GLTFLoader } from "../CS559-Three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Each of these environment objects takes a three.js scene, a 3D point, and a scale 
 * and adds itself to the world.
 */

export class Birch extends T.Group {
    /**
     * @param {T.Vector3} position 
     * @param {number} scale 
     */
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        // Trunk
        let tl = new T.TextureLoader().load('./env/textures/birch.jpg');
        tl.wrapS = T.RepeatWrapping;
        tl.wrapT = T.RepeatWrapping;
        tl.repeat.set(1, 4);
        let trunkGeometry = new T.CylinderGeometry(0.2, 0.25, 2.5);
        let birchMaterial = new T.MeshStandardMaterial({ map: tl });
        let trunk = new T.Mesh(trunkGeometry, birchMaterial);
        trunk.position.y += 1.25;
        this.add(trunk);
        // Branches
        let branchGeometry = new T.ConeGeometry(0.15, 2.5);
        let branch1 = new T.Mesh(branchGeometry, birchMaterial);
        branch1.position.set(-0.6, 3.2, 0);
        branch1.rotation.z = Math.PI / 6;
        branch1.name = "birch_branch1";
        this.add(branch1);
        let branch2 = new T.Mesh(branchGeometry, birchMaterial);
        branch2.rotateZ(-Math.PI / 6);
        branch2.scale.set(0.8, 0.8, 0.8);
        branch2.position.set(0.6, 3, 0);
        branch2.name = "birch_branch2";
        this.add(branch2);
        let branch3 = new T.Mesh(branchGeometry, birchMaterial);
        branch3.position.set(0, 3.5, -0.3);
        branch3.rotateX(-Math.PI / 12);
        branch3.name = "birch_branch3";
        this.add(branch3);
        // extension branch on branch1
        let branch1a = new T.Mesh(branchGeometry, birchMaterial);
        branch1a.scale.set(0.7, 0.7, 0.7);
        branch1a.position.set(0, 3.8, 0);
        branch1a.rotateZ(Math.PI / 6);
        branch1a.rotateOnWorldAxis(new T.Vector3(0, 1, 0), Math.PI);
        branch1a.name = "birch_branch1a";
        this.add(branch1a);

        // Leaves
        let leavesTexture = new T.TextureLoader().load('./env/textures/leaves.jpg');
        let leafGeometry = new T.SphereGeometry(1.2, 8, 8);
        let leafMaterial = new T.MeshStandardMaterial({ map: leavesTexture, transparent: true, opacity: 0.8 });
        let leaves0 = new T.Mesh(leafGeometry, leafMaterial);
        leaves0.scale.set(1.2, 1.5, 1);
        leaves0.position.set(0, 4.5, 0);
        leaves0.name = "birch_cluster0";
        this.add(leaves0);

        // ANIMATION
        let clip = function () {
            let track0 = new T.VectorKeyframeTrack("birch_cluster0.position",
                [0, 3, 6],
                [0, 4.5, 0, 0.12, 4.55, -0.1, 0, 4.5, 0]);

            let track1 = new T.NumberKeyframeTrack("birch_branch1.rotation[x]",
                [0, 3, 6],
                [Math.PI / 64, -Math.PI / 64, Math.PI / 64]);

            let track2 = new T.NumberKeyframeTrack("birch_branch2.rotation[z]",
                [0, 3, 6],
                [-Math.PI / 6, -Math.PI / 6 + 0.05, -Math.PI / 6]);

            let track3 = new T.NumberKeyframeTrack("birch_branch3.rotation[x]",
                [0, 3, 6],
                [-Math.PI / 12, -Math.PI / 12 + 0.06, -Math.PI / 12]);

            // let track4 = new T.NumberKeyframeTrack("birch_branch1a.rotation[z]",
            //     [0, 3, 6],
            //     [Math.PI/6, Math.PI/6 + 0.04, Math.PI/6]);

            return new T.AnimationClip("birch_sway", -1, [track0, track1, track2, track3]);
        }
        let mixer = new T.AnimationMixer(this);
        let action = mixer.clipAction(clip());
        action.play();

        this.mixer = mixer;

        // Rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }

    animateLeaves(dt) {
        this.mixer.update(dt);
    }
}

export class Spruce extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();
        this.position.copy(position);
        // Trunk
        let tl = new T.TextureLoader().load('./env/textures/spruce.jpg');
        tl.wrapS = T.RepeatWrapping;
        tl.wrapT = T.RepeatWrapping;
        tl.repeat.set(1, 4);
        let trunkGeometry = new T.ConeGeometry(0.15, 3.5);
        let spruceMaterial = new T.MeshStandardMaterial({ map: tl });
        let trunk = new T.Mesh(trunkGeometry, spruceMaterial);
        trunk.position.y += 1.75;
        trunk.name = "trunk";
        this.add(trunk);
        // Put branch base at origin
        let pivotBranch = new T.Group();
        let branchGeometry = new T.ConeGeometry(0.05, 1.5);
        let branch1 = new T.Mesh(branchGeometry, spruceMaterial);
        pivotBranch.add(branch1);
        branch1.position.set(0, 0.725, 0);
        pivotBranch.position.set(0, 1.5, 0);
        pivotBranch.rotateZ(4 * Math.PI / 6);
        pivotBranch.name = "spruce_branch0";
        this.add(pivotBranch);

        let medBranch = pivotBranch.clone();
        medBranch.scale.set(0.8, 0.8, 0.8);
        medBranch.position.set(0, 2, 0);
        medBranch.name = "spruce_branch1";
        this.add(medBranch);

        let smallBranch = pivotBranch.clone();
        smallBranch.scale.set(0.6, 0.6, 0.6);
        smallBranch.position.set(0, 2.5, 0);
        smallBranch.name = "spruce_branch2";
        this.add(smallBranch);

        // Circular branches
        // Add full circles of branches
        for (let i = 1; i < 6; i++) {
            let bigBranchClone = pivotBranch.clone();
            let smallBranchClone = smallBranch.clone();
            let medBranchClone = medBranch.clone();
            bigBranchClone.rotateOnWorldAxis(new T.Vector3(0, 1, 0), 2 * i * Math.PI / 6);
            smallBranchClone.rotateOnWorldAxis(new T.Vector3(0, 1, 0), 2 * i * Math.PI / 6);
            medBranchClone.rotateOnWorldAxis(new T.Vector3(0, 1, 0), 2 * i * Math.PI / 6);
            this.add(smallBranchClone);
            this.add(bigBranchClone);
            this.add(medBranchClone);
        }

        // Needles
        let needlesTexture = new T.TextureLoader().load('./env/textures/needles.jpg');
        needlesTexture.wrapS = T.RepeatWrapping;
        needlesTexture.wrapT = T.RepeatWrapping;
        needlesTexture.repeat.set(4, 4);
        let topNeedlesGeometry = new T.ConeGeometry(0.9, 1.45, 1000);
        let needlesMaterial = new T.MeshStandardMaterial({ map: needlesTexture, transparent: true, opacity: 0.85 });
        let topNeedles = new T.Mesh(topNeedlesGeometry, needlesMaterial);
        topNeedles.position.set(0, 2.8, 0);
        topNeedles.name = "spruce_cluster0";
        this.add(topNeedles);
        let midNeedlesGeometry = new T.ConeGeometry(1.1, 1.7, 1000);
        let midNeedles = new T.Mesh(midNeedlesGeometry, needlesMaterial);
        midNeedles.position.set(0, 2.2, 0);
        midNeedles.name = "spruce_cluster1";
        this.add(midNeedles);
        let bottomNeedlesGeometry = new T.ConeGeometry(1.3, 2, 1000);
        let bottomNeedles = new T.Mesh(bottomNeedlesGeometry, needlesMaterial);
        bottomNeedles.position.set(0, 1.7, 0);
        bottomNeedles.name = "spruce_cluster2";
        this.add(bottomNeedles);

        this.scale.set(1, 1.3, 1);

        // ANIMATION
        let clip = function () {
            let t0 = new T.VectorKeyframeTrack("spruce_cluster0.position", // top needles
                [0, 3, 6],
                [0, 2.8, 0, 0, 2.85, -0.12, 0, 2.8, 0]);
            let t1 = new T.VectorKeyframeTrack("spruce_cluster1.position", // mid needles
                [0, 3, 6],
                [0, 2.2, 0, 0, 2.23, -0.08, 0, 2.2, 0]);
            let t2 = new T.VectorKeyframeTrack("spruce_cluster2.position", // bottom needles
                [0, 3, 6],
                [0, 1.7, 0, 0.03, 1.72, -0.02, 0, 1.7, 0]);
            let t3 = new T.NumberKeyframeTrack("trunk.rotation[x]", // trunk sway
                [0, 3, 6],
                [0, -0.1, 0]);
            return new T.AnimationClip("spruce_sway", -1, [t0, t1, t2, t3]);
        }
        let mixer = new T.AnimationMixer(this);
        let action = mixer.clipAction(clip());
        action.play();

        this.mixer = mixer;

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }

    animateLeaves(dt) {
        this.mixer.update(dt);
    }
}

export class Oak extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        // Trunk
        let tree = new T.Group();
        let trunkGeometry = new T.CylinderGeometry(0.5, 0.7, 2.6);
        let barkTexture = new T.TextureLoader().load('./env/textures/oak.jpg');
        let oakMaterial = new T.MeshStandardMaterial({ map: barkTexture });
        let trunk = new T.Mesh(trunkGeometry, oakMaterial);
        trunk.position.y += 1.3;
        tree.add(trunk);
        this.add(tree);
        // Branches
        let branchGeometry = new T.CylinderGeometry(0.1, 0.3, 2);
        let branch1 = new T.Mesh(branchGeometry, oakMaterial);
        branch1.position.set(-1, 3, 0);
        branch1.rotation.z = Math.PI / 4;
        branch1.name = "branch1";
        this.add(branch1);
        let branch2 = new T.Mesh(branchGeometry, oakMaterial);
        branch2.name = "branch2";
        branch2.position.set(1, 2.5, 0.5);
        branch2.rotation.z = -Math.PI / 4;
        this.add(branch2);
        let branch3 = new T.Mesh(branchGeometry, oakMaterial);
        branch3.scale.set(0.7, 0.7, 0.7);
        branch3.position.set(-0.7, 3.2, -0.3);
        branch3.rotation.x = -Math.PI / 6;
        this.add(branch3);
        let branch4 = new T.Mesh(branchGeometry, oakMaterial);
        branch4.scale.set(0.7, 0.7, 0.7);
        branch4.position.set(0, 2.7, 0.5);
        branch4.rotation.x = Math.PI / 6;
        this.add(branch4);
        // Leaves
        let leavesTexture = new T.TextureLoader().load('./env/textures/oak-leaves.jpg');
        leavesTexture.wrapS = T.RepeatWrapping;
        leavesTexture.wrapT = T.RepeatWrapping;
        leavesTexture.repeat.set(2, 2);
        let leafGeometry = new T.SphereGeometry(1, 8, 8);
        let leafMaterial = new T.MeshStandardMaterial({ map: leavesTexture, transparent: true, opacity: 0.8 });
        let leaves0 = new T.Mesh(leafGeometry, leafMaterial);
        leaves0.scale.set(1.5, 1.2, 1.5);
        leaves0.position.set(0, 4, 0);
        let leaves1 = leaves0.clone();
        leaves1.scale.set(1.2, 1, 1.2);
        leaves1.position.set(-1, 3.5, -0.5);
        let leaves2 = leaves0.clone();
        leaves2.scale.set(1, 0.8, 1);
        leaves2.position.set(1, 3.8, 0.5);
        let leaves3 = leaves0.clone();
        leaves3.scale.set(1.3, 1, 1.3);
        leaves3.position.set(0, 3.6, 1);
        let leaves4 = leaves0.clone();
        leaves4.scale.set(1.4, 1.1, 1.4);
        leaves4.position.set(0.8, 3.8, -0.4);

        this.add(leaves0);
        this.add(leaves1);
        this.add(leaves2);
        this.add(leaves3);
        this.add(leaves4);
        // Store leaf clusters for animations
        const leafClusters = [leaves0, leaves1, leaves2, leaves3, leaves4];

        leafClusters.forEach((cluster, i) => {
            // Name each cluster for animation identification
            cluster.name = `cluster${i}`;
        });

        // ANIMATION
        let clip = function () {
            let track0 = new T.VectorKeyframeTrack("cluster0.position",
                [0, 1.5, 3],
                [0, 4, 0, 0.17, 3.9, -0.07, 0, 4, 0]);
            let track1 = new T.VectorKeyframeTrack("cluster1.position",
                [0, 1.5, 3],
                [-1, 3.5, -0.5, -1, 3.6, -0.7, -1, 3.5, -0.5]);
            let track2 = new T.VectorKeyframeTrack("cluster2.position",
                [0, 1.5, 3],
                [1, 3.2, 0.5, 1, 3.1, 0.27, 1, 3.2, 0.5]);
            let track3 = new T.VectorKeyframeTrack("cluster3.position",
                [0, 1.5, 3],
                [0, 3.6, 1, 0, 3.7, 0.8, 0, 3.6, 1]);
            let track4 = new T.VectorKeyframeTrack("cluster4.position",
                [0, 1.5, 3],
                [0.8, 3.8, -0.4, 0.8, 3.8, -0.6, 0.8, 3.8, -0.4]);
            let track5 = new T.VectorKeyframeTrack("branch2.rotation[x]",
                [0, 1.5, 3],
                [Math.PI / 4, Math.PI / 5.5, Math.PI / 4]);
            return new T.AnimationClip("sway", -1, [track0, track1, track2, track3, track4, track5]);
        }
        let mixer = new T.AnimationMixer(this);
        let action = mixer.clipAction(clip());
        action.play();

        this.mixer = mixer;

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }

    animateLeaves(dt) {
        this.mixer.update(dt);
    }
}

export class Bush extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        // Bush base
        let stemGeometry = new T.ConeGeometry(0.05, 1);
        let tl = new T.TextureLoader().load('./env/textures/spruce.jpg');
        let stemMaterial = new T.MeshStandardMaterial({ map: tl });
        let stem = new T.Mesh(stemGeometry, stemMaterial);
        stem.position.y += 0.5;
        this.add(stem);
        // Branches
        let pivotBranch = new T.Group();
        pivotBranch.position.set(0, 0.3, 0);
        let branch1 = stem.clone();
        branch1.scale.set(0.6, 0.6, 0.6);
        branch1.position.set(0, 0.3, 0);
        pivotBranch.add(branch1);
        pivotBranch.rotateX(Math.PI / 3);
        // Add full circle of branches
        for (let i = 1; i <= 6; i += 2) {
            let branchClone = pivotBranch.clone();
            branchClone.rotateOnWorldAxis(new T.Vector3(0, 1, 0), 2 * i * Math.PI / 6);
            this.add(branchClone);
        }

        // Leaves
        let leavesTexture = new T.TextureLoader().load('./env/textures/bush.jpg');
        leavesTexture.wrapS = T.RepeatWrapping;
        leavesTexture.wrapT = T.RepeatWrapping;
        leavesTexture.repeat.set(2, 2);
        let leafGeometry = new T.SphereGeometry(0.5, 8, 8);
        let leafMaterial = new T.MeshStandardMaterial({ map: leavesTexture, transparent: true, opacity: 0.8 });
        let leaves0 = new T.Mesh(leafGeometry, leafMaterial);
        leaves0.position.set(0, 0.8, 0);
        leaves0.name = "bush_cluster0";
        let leaves1 = leaves0.clone();
        leaves1.position.set(0.2, 0.5, 0.3);
        leaves1.name = "bush_cluster1";
        let leaves2 = leaves0.clone();
        leaves2.position.set(-0.15, 0.65, -0.15);
        leaves2.name = "bush_cluster2";
        let leaves3 = leaves0.clone();
        leaves3.position.set(0.08, 0.6, -0.18);
        leaves3.name = "bush_cluster3";
        this.add(leaves0);
        this.add(leaves1);
        this.add(leaves2);
        //this.add(leaves3);

        // ANIMATION
        let clip = function () {
            let t0 = new T.VectorKeyframeTrack("bush_cluster0.position",
                [0, 1.5, 3],
                [0, 0.8, 0, 0.03, 0.82, 0.04, 0, 0.8, 0]);

            let t1 = new T.VectorKeyframeTrack("bush_cluster1.position",
                [0, 1.5, 3],
                [0.1, 0.5, 0.2, 0.11, 0.52, 0.25, 0.1, 0.5, 0.2]);

            let t2 = new T.VectorKeyframeTrack("bush_cluster2.position",
                [0, 1.5, 3],
                [-0.15, 0.65, -0.15, -0.12, 0.67, -0.13, -0.15, 0.65, -0.15]);

            let t3 = new T.VectorKeyframeTrack("bush_cluster3.position",
                [0, 1.5, 3],
                [0.08, 0.6, -0.18, 0.10, 0.62, -0.20, 0.08, 0.6, -0.18]);
            return new T.AnimationClip("bush_sway", -1, [t0, t1, t2, t3]);
        }
        let mixer = new T.AnimationMixer(this);
        let action = mixer.clipAction(clip());
        action.play();

        this.mixer = mixer;

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }

    animateLeaves(dt) {
        this.mixer.update(dt);
    }
}

export class Rock extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        const loader = new GLTFLoader();
        let boulder;
        const gltf = loader.load('./env/readyMades/rock.glb', (gltf) => {
            boulder = gltf.scene;
            boulder.scale.set(0.7, 0.7, 0.7);
            boulder.position.y += 0.7;
            this.add(boulder);
        });
        this.add(gltf);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class House extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        let roof = new T.Group();

        let wallWindowTexture = new T.TextureLoader().load('./env/textures/house-window.jpg');
        let wallDoorTexture = new T.TextureLoader().load('./env/textures/house-door.jpg');
        let roofTexture = new T.TextureLoader().load('./env/textures/house-roof.jpg');
        let gableTexture = new T.TextureLoader().load('./env/textures/house-gable.jpg');
        gableTexture.wrapT = T.RepeatWrapping;
        gableTexture.wrapS = T.RepeatWrapping;
        roofTexture.wrapS = T.RepeatWrapping;
        roofTexture.wrapT = T.RepeatWrapping;
        roofTexture.repeat.set(1, 1);

        // Base
        let baseGeometry = new T.BoxGeometry(7, 4, 7);

        let baseMaterials = [
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallDoorTexture })
        ];

        let base = new T.Mesh(baseGeometry, baseMaterials);
        base.position.y += 2;
        this.add(base);

        // Roof
        let roofGeometry = new T.BufferGeometry();
        let roofVertices = new Float32Array([
            -3.5, 4, -3.5,
            3.5, 4, -3.5,
            -3.5, 4, 3.5,
            3.5, 4, 3.5,
            0, 6, -3.5,
            0, 6, 3.5,
            0, 6, -4.5,
            0, 6, 4.5
        ]);
        roofGeometry.setAttribute("position", new T.BufferAttribute(roofVertices, 3));
        roofGeometry.setIndex([
            //4, 1, 0,
            //2, 3, 5,
            4, 0, 2,
            4, 5, 1,
            3, 1, 5,
            2, 5, 4,
            4, 1, 6,
            0, 4, 6,
            2, 7, 5,
            3, 5, 7
        ]);
        roofGeometry.computeVertexNormals();
        let uvs = new Float32Array([
            0, 0,
            0, 2,
            2, 0,
            2, 2,
            0, 1,
            2, 1,
            -0.22, 1,
            2.22, 1
        ]);
        roofGeometry.setAttribute("uv", new T.BufferAttribute(uvs, 2));
        let roofMaterial = new T.MeshStandardMaterial({ map: roofTexture, wireframe: false, side: T.DoubleSide });
        let roofMesh = new T.Mesh(roofGeometry, roofMaterial);
        roof.add(roofMesh);

        let gableGeometry = new T.BufferGeometry();
        let gableVertices = new Float32Array([
            0, 6, -3.5,
            3.5, 4, -3.5,
            -3.5, 4, -3.5,
            0, 6, 3.5,
            -3.5, 4, 3.5,
            3.5, 4, 3.5
        ]);

        gableGeometry.setAttribute("position", new T.BufferAttribute(gableVertices, 3));
        gableGeometry.setIndex([
            0, 1, 2,
            3, 5, 4
        ]);
        gableGeometry.computeVertexNormals();
        let uvs2 = new Float32Array([
            0.5, 0.92,
            0, 0.3,
            1, 0.3,
            0.5, 1.92,
            0, 1.3,
            1, 1.3
        ]);

        gableGeometry.setAttribute("uv", new T.BufferAttribute(uvs2, 2));
        let gableMaterial = new T.MeshStandardMaterial({ map: gableTexture, wireframe: false, side: T.DoubleSide });
        let gableMesh = new T.Mesh(gableGeometry, gableMaterial);
        roof.add(gableMesh);
        this.add(roof);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class LargeHouse extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        let roof = new T.Group();

        let wallWindowTexture = new T.TextureLoader().load('./env/textures/red-window.jpg');
        let wallDoorTexture = new T.TextureLoader().load('./env/textures/red-door.jpg');
        let roofTexture = new T.TextureLoader().load('./env/textures/house-roof.jpg');
        roofTexture.wrapS = T.RepeatWrapping;
        roofTexture.wrapT = T.RepeatWrapping;
        roofTexture.repeat.set(1, 1);

        // Base
        let baseGeometry = new T.BoxGeometry(9, 4, 9);

        let baseMaterials = [
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallWindowTexture }),
            new T.MeshStandardMaterial({ map: wallDoorTexture })
        ];

        let base = new T.Mesh(baseGeometry, baseMaterials);
        base.position.y += 2;
        this.add(base);

        // Roof
        let roofGeometry = new T.BufferGeometry();
        let roofVertices = new Float32Array([
            -4.5, 4, -4.5,
            4.5, 4, -4.5,
            -4.5, 4, 4.5,
            4.5, 4, 4.5,
            0, 8, 0
        ]);
        roofGeometry.setAttribute("position", new T.BufferAttribute(roofVertices, 3));
        roofGeometry.setIndex([
            0, 2, 4,
            0, 4, 1,
            2, 3, 4,
            1, 4, 3
        ]);
        roofGeometry.computeVertexNormals();
        let uvs = new Float32Array([
            0, 0,
            0, 2,
            2, 0,
            2, 2,
            1, 1
        ]);
        roofGeometry.setAttribute("uv", new T.BufferAttribute(uvs, 2));
        let roofMaterial = new T.MeshStandardMaterial({ map: roofTexture, wireframe: false, side: T.DoubleSide });
        let roofMesh = new T.Mesh(roofGeometry, roofMaterial);
        roof.add(roofMesh);
        this.add(roof);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class Tavern extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        const loader = new GLTFLoader();
        let tavern;
        const gltf = loader.load('./env/readyMades/tavern.glb', (gltf) => {
            tavern = gltf.scene;
            tavern.scale.set(1.7, 1.7, 1.7);
            tavern.position.y += 1.7;
            this.add(tavern);
        });
        this.add(gltf);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class Well extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        const loader = new GLTFLoader();
        let well;
        const gltf = loader.load('./env/readyMades/well.glb', (gltf) => {
            well = gltf.scene;
            well.scale.set(1.7, 1.7, 1.7);
            well.position.y += 1.7;
            this.add(well);
        });
        this.add(gltf);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class Barrel extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        const loader = new GLTFLoader();
        let barrel;
        const gltf = loader.load('./env/readyMades/barrel.glb', (gltf) => {
            barrel = gltf.scene;
            barrel.position.y += 0.7;
            barrel.scale.set(0.5, 0.7, 0.5);
            this.add(barrel);
        });
        this.add(gltf);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class DungeonEntrance extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        const loader = new GLTFLoader();
        let cave;
        const gltf = loader.load('./env/readyMades/cave.glb', (gltf) => {
            cave = gltf.scene;
            cave.position.y += 0.7;
            cave.scale.set(0.5, 0.7, 0.5);
            this.add(cave);
        });
        this.add(gltf);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class Hand extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        this.swingDuration = 0.5;
        let dur = this.swingDuration;
        this.totalTime = 0;

        // Load the model
        const loader = new GLTFLoader();
        loader.load("./env/readyMades/hand.glb", (gltf) => {
            const hand = gltf.scene;
            hand.position.y += 0.7;
            hand.scale.set(0.5, 0.7, 0.5);
            this.add(hand);
        });

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(
            this.scale.x * scale,
            this.scale.y * scale,
            this.scale.z * scale
        );

        let clip = function () {
            let track0 = new T.VectorKeyframeTrack(".position[z]",
                [0, dur / 2, dur],
                [1, 2, 1]);
            return new T.AnimationClip("strike", -1, [track0]);
        }
        let mixer = new T.AnimationMixer(this);
        let action = mixer.clipAction(clip());
        action.play();

        this.action = action;
        this.mixer = mixer;
    }

    animateSwing(dt) {
        const cappedDt = Math.min(dt, 0.05);
        this.totalTime += cappedDt;
        console.log("Total time: ", this.totalTime);

        if (this.totalTime >= this.swingDuration) {
            this.totalTime = 0;
            this.action?.play();
            return false;
        }
        this.mixer.update(cappedDt);
        return true;
    }
}

export class Bow extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        this.swingDuration = 0.5;
        let dur = this.swingDuration;
        this.totalTime = 0;

        // Load the model
        const loader = new GLTFLoader();
        loader.load("./env/readyMades/bow.glb", (gltf) => {
            const bow = gltf.scene;
            bow.position.y += 0.7;
            bow.scale.set(1, 1, 2);
            this.add(bow);
        });

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(
            this.scale.x * scale,
            this.scale.y * scale,
            this.scale.z * scale
        );

        let clip = function () {
            let track0 = new T.VectorKeyframeTrack(".position[z]",
                [0, dur / 2, dur],
                [1, 2, 1]);
            return new T.AnimationClip("shoot", -1, [track0]);
        }
        let mixer = new T.AnimationMixer(this);
        let action = mixer.clipAction(clip());
        action.play();

        this.action = action;
        this.mixer = mixer;
    }

    animateSwing(dt) {
        const cappedDt = Math.min(dt, 0.05);
        this.totalTime += cappedDt;
        console.log("Total time: ", this.totalTime);

        if (this.totalTime >= this.swingDuration) {
            this.totalTime = 0;
            this.action?.play();
            return false;
        }
        this.mixer.update(cappedDt);
        return true;
    }
}

export class Dagger extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        // Load the model
        const loader = new GLTFLoader();
        loader.load("./env/readyMades/dagger.glb", (gltf) => {
            const dagger = gltf.scene;
            dagger.position.y += 0.7;          // your original offset
            dagger.scale.set(0.5, 0.7, 0.5);   // your original scale
            this.add(dagger);
        });

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(
            this.scale.x * scale,
            this.scale.y * scale,
            this.scale.z * scale
        );

        // ---- Base (idle) pose ----
        this._baseCaptured = false;
        this.basePosition = new T.Vector3();
        this.baseRotation = new T.Euler();

        // ---- Swing state ----
        this.swingActive = false;
        this.swingProgress = 0;     // 0 → 1
        this.swingDuration = 1.2;  // slower & smoother

        // Combo side: +1 = start from right, -1 = start from left
        this.nextSide = 1;
        this.currentSide = 1;
    }

    _ensureBaseCaptured() {
        if (!this._baseCaptured) {
            this.basePosition.copy(this.position);
            this.baseRotation.copy(this.rotation);
            this._baseCaptured = true;
        }
    }

    // Call this when an attack starts
    startSwing() {
        this._ensureBaseCaptured();

        // Ignore spam while mid-swing:
        if (this.swingActive) return;

        this.currentSide = this.nextSide;
        this.nextSide = this.nextSide === 1 ? -1 : 1; // alternate sides

        this.swingActive = true;
        this.swingProgress = 0;
    }

    // --------- Helpers ---------
    static _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static _smooth(t) {
        // smoothstep-ish easing: ease in & ease out
        return t * t * (3 - 2 * t);
    }

    static _lerpVec3(out, a, b, t) {
        const tt = Dagger._smooth(t);
        out.set(
            Dagger._lerp(a.x, b.x, tt),
            Dagger._lerp(a.y, b.y, tt),
            Dagger._lerp(a.z, b.z, tt)
        );
    }

    static _lerpEuler(out, a, b, t) {
        const tt = Dagger._smooth(t);
        out.set(
            Dagger._lerp(a.x, b.x, tt),
            Dagger._lerp(a.y, b.y, tt),
            Dagger._lerp(a.z, b.z, tt),
            a.order
        );
    }

    /**
     * diagonal slashes:
     *
     *  - Side = +1: idle → TOP RIGHT → BOTTOM LEFT → idle
     *  - Side = -1: idle → TOP LEFT  → BOTTOM RIGHT → idle
     *
     * Blade angle:
     *   left-start  (s = -1): idle.z + 45° (CCW)
     *   right-start (s = +1): idle.z - 45° (CW)
     *
     * Idle rotation itself is never changed outside the swing.
     */
    animateSwing(dt) {
        this._ensureBaseCaptured();

        if (!this.swingActive) {
            // force exact idle when not swinging
            this.position.copy(this.basePosition);
            this.rotation.copy(this.baseRotation);
            return false;
        }

        // clamp dt a bit so low FPS doesn't explode the animation
        const cappedDt = Math.min(dt, 0.05);
        const swingDuration = this.swingDuration || 0.55;

        // Progress 0 → 1 over swingDuration
        this.swingProgress += cappedDt / swingDuration;
        let t = this.swingProgress;

        if (t >= 1.0) {
            this.swingActive = false;
            // snap fully back to idle
            this.position.copy(this.basePosition);
            this.rotation.copy(this.baseRotation);
            return false;
        }

        const s = this.currentSide; // +1 = right→left, -1 = left→right

        const idlePos = this.basePosition;
        const idleRot = this.baseRotation;

        // How much to twist the blade relative to idle for attack
        const BLADE_ANGLE = Math.PI / 4; // 45 degrees

        // ***** BIG OFFSETS so it goes near screen corners *****
        const TOP_OFFSET_X = 3.0;   // horizontal from center
        const TOP_OFFSET_Y = 2.0;   // vertical up
        const TOP_OFFSET_Z = -0.4;  // closer to camera

        const BOT_OFFSET_X = 3.2;   // to opposite side
        const BOT_OFFSET_Y = -2.0;  // vertical down
        const BOT_OFFSET_Z = 0.8;   // slightly away

        const ROT_TILT_BACK = 1.2;
        const ROT_TILT_DOWN = 1.6;
        const ROT_YAW = 1.4;

        // For the swing, we want:
        //  - left-start  (s = -1): idle.z + 45° (CCW)
        //  - right-start (s = +1): idle.z - 45° (CW)
        const bladeAngleTop = idleRot.z - s * BLADE_ANGLE;
        const bladeAngleBottom = idleRot.z - s * (BLADE_ANGLE * 0.7); // slightly relaxed on follow-through

        // Top corner 
        const topPos = new T.Vector3(
            idlePos.x + TOP_OFFSET_X * s,
            idlePos.y + TOP_OFFSET_Y,
            idlePos.z + TOP_OFFSET_Z
        );
        const topRot = new T.Euler(
            idleRot.x - ROT_TILT_BACK,   // tilt back
            idleRot.y + ROT_YAW * s,     // yaw toward that side
            bladeAngleTop,               // edge at ±45° from idle
            idleRot.order
        );

        // Bottom opposite corner
        const bottomPos = new T.Vector3(
            idlePos.x - BOT_OFFSET_X * s,
            idlePos.y + BOT_OFFSET_Y,
            idlePos.z + BOT_OFFSET_Z
        );
        const bottomRot = new T.Euler(
            idleRot.x + ROT_TILT_DOWN,   // swing down
            idleRot.y - ROT_YAW * 0.9 * s,
            bladeAngleBottom,            // still edge-leading
            idleRot.order
        );

        // Timing (slower & smoother):
        // 0.0–0.25 : idle → top (wind-up)
        // 0.25–0.75: top → bottom (main slash)
        // 0.75–1.0 : bottom → idle (recovery)
        let fromPos, toPos, fromRot, toRot, u;

        if (t < 0.25) {
            u = t / 0.25;
            fromPos = idlePos;
            toPos = topPos;
            fromRot = idleRot;
            toRot = topRot;
        } else if (t < 0.75) {
            u = (t - 0.25) / 0.5;
            fromPos = topPos;
            toPos = bottomPos;
            fromRot = topRot;
            toRot = bottomRot;
        } else {
            u = (t - 0.75) / 0.25;
            fromPos = bottomPos;
            toPos = idlePos;
            fromRot = bottomRot;
            toRot = idleRot;
        }

        const newPos = new T.Vector3();
        const newRot = new T.Euler();
        Dagger._lerpVec3(newPos, fromPos, toPos, u);
        Dagger._lerpEuler(newRot, fromRot, toRot, u);

        this.position.copy(newPos);
        this.rotation.copy(newRot);

        return true;
    }
}

export class Table extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        let loader = new GLTFLoader();
        let table;
        loader.load('./env/readyMades/table.glb', (gltf) => {
            table = gltf.scene;
            table.scale.set(0.5, 0.5, 0.5);
            table.position.y += 0.5;
            this.add(table);
        });

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class Innkeeper extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        this.mixer = null;

        const loader = new GLTFLoader();
        loader.load("./env/readyMades/innkeeper.glb", (gltf) => {
            const innkeeper = gltf.scene;
            innkeeper.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    let mat = child.material;

                    // Force opaque rendering
                    mat.transparent = false;
                    mat.alphaTest = 0.0;
                    mat.depthWrite = true;
                    mat.depthTest = true;
                    mat.blending = T.NormalBlending;

                    // If alpha channel exists in texture, ignore it
                    if (mat.alphaMap) {
                        mat.alphaMap = null;
                    }
                }
            });

            // Keep the model compact relative to the player scale
            innkeeper.scale.set(0.8, 0.8, 0.8);
            this.add(innkeeper);

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new T.AnimationMixer(innkeeper);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip);
                    action.setLoop(T.LoopRepeat, Infinity);
                    action.play();
                });
            }
        });

        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }

    animate(dt) {
        if (this.mixer) {
            this.mixer.update(dt);
        }
    }
}

export class Bandit extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();

        this.mixer = null;

        const loader = new GLTFLoader();
        loader.load("./env/readyMades/bandit.glb", (gltf) => {
            const bandit = gltf.scene;
            bandit.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    let mat = child.material;

                    // Force opaque rendering
                    mat.transparent = false;
                    mat.alphaTest = 0.0;
                    mat.depthWrite = true;
                    mat.depthTest = true;
                    mat.blending = T.NormalBlending;

                    // If alpha channel exists in texture, ignore it
                    if (mat.alphaMap) {
                        mat.alphaMap = null;
                    }
                }
            });

            // Keep the model compact relative to the player scale
            bandit.scale.set(0.8, 0.8, 0.8);
            this.add(bandit);

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new T.AnimationMixer(bandit);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer.clipAction(clip);
                    action.setLoop(T.LoopRepeat, Infinity);
                    action.play();
                });
            }
        });

        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }

    animate(dt) {
        if (this.mixer) {
            this.mixer.update(dt);
        }
    }
}
