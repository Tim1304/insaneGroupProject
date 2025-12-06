// @ts-check
import * as T from "../CS559-Three/build/three.module.js";

export class Dungeon extends T.Scene {
    constructor(lenPieces = 1) {
        super();

        const self = this;

        // Lighting
        const ambientLight = new T.AmbientLight(0xffffff, 0.01);
        this.add(ambientLight);
        const dirLight = new T.DirectionalLight(0xffffff, 0.2);
        dirLight.position.set(10, 5, 10);
        dirLight.target.position.set(0, 0, 0);
        this.add(dirLight);
        this.add(new T.AxesHelper(5));

        let wallTexture = new T.TextureLoader().load('./env/textures/dungeon-wall.jpg');
        let floorTexture = new T.TextureLoader().load('./env/textures/dirt.jpg');
        let doorTexture = new T.TextureLoader().load('./env/textures/dungeon-door.jpg');
        let wallMat = new T.MeshBasicMaterial({ color: "gray", map: wallTexture });
        let floorMat = new T.MeshStandardMaterial({ color: "gray", map: floorTexture });
        let doorMat = new T.MeshBasicMaterial({ color: "gray", map: doorTexture });

        const wallGeom = new T.BoxGeometry(0.5, 4, 8);
        const floorGeom = new T.BoxGeometry(8, 0.5, 8);
        const conWallGeom = new T.BoxGeometry(0.5, 4, 11.31);

        // Coordinates where the next dungeon segment will be created
        let currentX = 0;
        let currentZ = 0;
        // Direction in which the tunnel is growing
        let forward = true; // sideways if false
        let right = false; // left if false

        // Create first wall with door behind the player
        let firstWall = new T.Mesh(wallGeom, doorMat);
        firstWall.position.set(0, 2, -4);
        firstWall.rotateY(Math.PI / 2);
        this.add(firstWall);

        /**
         * Creates an oppen ended cube tunnel element
         */
        function createBox(x, z, forward = true) {
            // Floor
            const floor = new T.Mesh(floorGeom, floorMat);
            floor.position.set(x, -0.25, z);
            self.add(floor);
            // Walls
            let walls = new T.Group();
            const wall1 = new T.Mesh(wallGeom, wallMat);
            wall1.position.set(4, 2, 0);
            walls.add(wall1);
            const wall2 = new T.Mesh(wallGeom, wallMat);
            wall2.position.set(-4, 2, 0);
            walls.add(wall2);
            if (!forward) {
                walls.rotateY(Math.PI / 2);
            }
            self.add(walls);
            walls.position.set(x, 0, z);
            // Ceiling
            const ceiling = new T.Mesh(floorGeom, wallMat);
            ceiling.position.set(x, 4, z);
            self.add(ceiling);
        }
        //createBox(0, 0);

        /**
         * Adds a joint turning either left or right to the tunnel
         */
        function createJoint(x, z, rightHanded = true) {
            createBox(x, z);
            let conWall = new T.Mesh(conWallGeom, wallMat);
            let conFloor = new T.Mesh(floorGeom, floorMat);
            let conCeiling = new T.Mesh(floorGeom, wallMat);
            if (rightHanded) {
                // Right turn
                x -= 8;
                z += 8;
                currentX = x;
                currentZ = z;
                createBox(x, z, false);
                // Connecting piece
                conWall.position.set(x + 8, 2, z);
                conWall.rotateY(-Math.PI / 4);
                conCeiling.position.set(x + 8, 4, z);
                conFloor.position.set(x + 8, -0.25, z);

                self.add(conWall);
                self.add(conFloor);
                self.add(conCeiling);

                forward = false;
                right = true;
            } else {
                // Left turn
                x += 8;
                z += 8;
                currentX = x;
                currentZ = z;
                createBox(x, z, false);
                // Connecting piece
                conWall.position.set(x - 8, 2, z);
                conWall.rotateY(Math.PI / 4);
                conCeiling.position.set(x - 8, 4, z);
                conFloor.position.set(x - 8, -0.25, z);

                self.add(conWall);
                self.add(conFloor);
                self.add(conCeiling);

                forward = false;
                right = false;
            }
        }

        // GENERATE DUNGEON
        let pieceCount = 0;
        while (pieceCount < lenPieces) {
            //console.log(`Creating piece ${pieceCount}`);
            if (pieceCount !== 0) {
                if (forward) {
                    currentZ += 8;
                } else if (right) {
                    currentX += 8;
                } else {
                    currentX -= 8;
                }
            }
            // 1 in 4 chance to create a joint
            if (Math.random() < 0.25) {
                createJoint(currentX, currentZ, Math.random() < 0.5 ? true : false);
            } else {
                console.log(`Creating box at ${currentX}, ${currentZ}`);
                if (forward) {
                    createBox(currentX, currentZ);
                } else {
                    createBox(currentX, currentZ, false);
                }
            }
            pieceCount++;
        }
    }
}
