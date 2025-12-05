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
        branch1.position.set(-0.7, 3.5, 0);
        branch1.rotation.z = Math.PI / 6;
        this.add(branch1);
        let branch2 = new T.Mesh(branchGeometry, birchMaterial);
        //branch2.position.set(0.7, 2.5, 0);
        branch2.rotateZ(-Math.PI / 6);
        branch2.scale.set(0.8, 0.8, 0.8);
        branch2.position.set(0.6, 3, 0);
        this.add(branch2);
        let branch3 = new T.Mesh(branchGeometry, birchMaterial);
        branch3.position.set(0, 3.5, -0.4);
        branch3.rotateX(-Math.PI / 12);
        this.add(branch3);
        // extension branch on branch1
        let branch1a = new T.Mesh(branchGeometry, birchMaterial);
        branch1a.scale.set(0.7, 0.7, 0.7);
        branch1a.position.set(0, 3.8, 0);
        branch1a.rotateZ(Math.PI / 6);
        branch1a.rotateOnWorldAxis(new T.Vector3(0, 1, 0), Math.PI);
        this.add(branch1a);

        // Leaves
        let leavesTexture = new T.TextureLoader().load('./env/textures/leaves.jpg');
        let leafGeometry = new T.SphereGeometry(1.2, 8, 8);
        let leafMaterial = new T.MeshStandardMaterial({ map: leavesTexture, transparent: true, opacity: 0.7 });
        let leaves = new T.Mesh(leafGeometry, leafMaterial);
        leaves.scale.set(1.2, 1.5, 1);
        leaves.position.set(0, 4.5, 0);
        this.add(leaves);

        // Rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
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
        this.add(trunk);
        // Put branch base at origin
        let pivotBranch = new T.Group();
        let branchGeometry = new T.ConeGeometry(0.05, 1.5);
        let branch1 = new T.Mesh(branchGeometry, spruceMaterial);
        pivotBranch.add(branch1);
        branch1.position.set(0, 0.725, 0);
        pivotBranch.position.set(0, 1.5, 0);
        pivotBranch.rotateZ(4 * Math.PI / 6);
        this.add(pivotBranch);
        let medBranch = pivotBranch.clone();
        medBranch.scale.set(0.8, 0.8, 0.8);
        medBranch.position.set(0, 2, 0);
        this.add(medBranch);
        let smallBranch = pivotBranch.clone();
        smallBranch.scale.set(0.6, 0.6, 0.6);
        smallBranch.position.set(0, 2.5, 0);
        this.add(smallBranch);
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
        let needlesMaterial = new T.MeshStandardMaterial({ map: needlesTexture, transparent: true, opacity: 0.6 });
        let topNeedles = new T.Mesh(topNeedlesGeometry, needlesMaterial);
        topNeedles.position.set(0, 2.8, 0);
        this.add(topNeedles);
        let midNeedlesGeometry = new T.ConeGeometry(1.1, 1.7, 1000);
        let midNeedles = new T.Mesh(midNeedlesGeometry, needlesMaterial);
        midNeedles.position.set(0, 2.2, 0);
        this.add(midNeedles);
        let bottomNeedlesGeometry = new T.ConeGeometry(1.3, 2, 1000);
        let bottomNeedles = new T.Mesh(bottomNeedlesGeometry, needlesMaterial);
        bottomNeedles.position.set(0, 1.7, 0);
        this.add(bottomNeedles);
        this.scale.set(1, 1.3, 1);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
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
        this.add(branch1);
        let branch2 = new T.Mesh(branchGeometry, oakMaterial);
        branch2.position.set(1, 2.5, 0);
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
        let leaves = new T.Mesh(leafGeometry, leafMaterial);
        leaves.scale.set(1.5, 1.2, 1.5);
        leaves.position.set(0, 4, 0);
        let leaves2 = leaves.clone();
        leaves2.scale.set(1.2, 1, 1.2);
        leaves2.position.set(-1, 3.5, -0.5);
        let leaves3 = leaves.clone();
        leaves3.scale.set(1, 0.8, 1);
        leaves3.position.set(1, 3.8, 0.5);
        let leaves4 = leaves.clone();
        leaves4.scale.set(1.3, 1, 1.3);
        leaves4.position.set(0, 3.6, 1);
        let leaves5 = leaves.clone();
        leaves5.scale.set(1.4, 1.1, 1.4);
        leaves5.position.set(0.8, 3.8, -0.4);
        
        this.add(leaves);
        this.add(leaves2);
        this.add(leaves3);
        this.add(leaves4);
        this.add(leaves5);

        // Place and rescale based on passed params
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
    }
}

export class Bush extends T.Group {
    constructor(position = new T.Vector3(0, 0, 0), scale = 1) {
        super();
        this.position.copy(position);
        this.scale.set(this.scale.x * scale, this.scale.y * scale, this.scale.z * scale);
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
