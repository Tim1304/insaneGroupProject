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

        branch1.add(new T.AxesHelper(1));

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
        let leafMaterial = new T.MeshStandardMaterial({ map: leavesTexture, transparent: true, opacity: 0.6 });
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

export class Tavern extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class SmallHouse extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class LargeHouse extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();
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
