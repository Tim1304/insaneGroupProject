// @ts-check
import * as T from "../CS559-Three/build/three.module.js";

export class Dungeon extends T.Scene {
    constructor(lenPieces = 3) {
        super();

        const self = this;

        // Lighting
        const ambientLight = new T.AmbientLight(0xffffff, 0.01);
        this.add(ambientLight);
        const dirLight = new T.DirectionalLight(0xffffff, 0.2);
        dirLight.position.set(10, 5, 10);
        dirLight.target.position.set(0, 0, 0);
        this.add(dirLight);

        let wallTexture = new T.TextureLoader().load('./env/textures/dungeon-wall.jpg');
        let floorTexture = new T.TextureLoader().load('./env/textures/dirt.jpg');
        let doorTexture = new T.TextureLoader().load('./env/textures/dungeon-door.jpg');
        let wallMat = new T.MeshBasicMaterial({ color: "gray", map: wallTexture });
        let floorMat = new T.MeshStandardMaterial({ color: "gray", map: floorTexture });
        let doorMat = new T.MeshBasicMaterial({ color: "gray", map: doorTexture });

        const wallGeom = new T.BoxGeometry(0.5, 4, 8);
        const floorGeom = new T.BoxGeometry(8, 0.5, 8);
        const conWallGeom = new T.BoxGeometry(0.5, 4, 11.31);

        // Create first wall with door behind the player
        let firstWall = new T.Mesh(wallGeom, doorMat);
        firstWall.position.set(0, 2, -4);
        firstWall.rotateY(Math.PI / 2);
        this.add(firstWall);

        // Direction in which the tunnel is growing
        let lastJointRight;
        let lastJointForward = true;

        // Coordinates where the next dungeon segment will be created
        let currentX = 0;
        let currentZ = 0;

        /**
         * Creates an open-ended cube tunnel element
         */
        function createBox(x, z) {
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
            self.add(walls);
            walls.position.set(x, 0, z);
            // Ceiling
            const ceiling = new T.Mesh(floorGeom, wallMat);
            ceiling.position.set(x, 4, z);
            self.add(ceiling);
            // Update position trackers
            if (!lastJointForward) {
                walls.rotateY(Math.PI / 2);
                if (lastJointRight) {
                    currentX -= 8;
                } else {
                    currentX += 8;
                }
            } else {
                currentZ += 8;
            }
        }
        //createBox(0, 0);

        /**
         * Adds a joint turning either left or right to the tunnel
         * @param {number} x 
         * @param {number} z 
         * @param {boolean} rightHanded direction of the turn when facing into the joint at its start
         * @param {boolean} forward a joint the exit from which leads player in the +z direction
         */
        function createJoint(x, z, rightHanded = true) {
            let conWall = new T.Mesh(conWallGeom, wallMat);
            let conFloor = new T.Mesh(floorGeom, floorMat);
            let conCeiling = new T.Mesh(floorGeom, wallMat);

            if (lastJointForward) {
                createBox(x, z);
                lastJointForward = false;
                if (rightHanded) { // TURNING RIGHT
                    createBox(x - 8, z + 8, false);
                    // Connecting piece
                    conWall.position.set(x, 2, z + 8);
                    conWall.rotateY(-Math.PI / 4);
                    conCeiling.position.set(x, 4, z + 8);
                    conFloor.position.set(x, -0.25, z + 8);

                    // Update position trackers
                    currentX = x - 16;
                    currentZ = z + 8;
                    lastJointForward = false;
                    lastJointRight = true;
                }
                else { // TURNING LEFT
                    createBox(x + 8, z + 8, false);
                    // Connecting piece
                    conWall.position.set(x, 2, z + 8);
                    conWall.rotateY(Math.PI / 4);
                    conCeiling.position.set(x, 4, z + 8);
                    conFloor.position.set(x, -0.25, z + 8);

                    // Update position trackers
                    currentX = x + 16;
                    currentZ = z + 8;
                    lastJointForward = false;
                    lastJointRight = false;
                }
            } else { // IF THE PREVIOUS JOINT TURNED THE TUNNEL SIDEWAYS, CREATE A FORWARD JOINT
                if (!lastJointRight) { // TURNING LEFT THEN FORWARD
                    createBox(x, z, false);
                    lastJointForward = true;
                    createBox(x + 8, z + 8);
                    // Connecting piece
                    conWall.position.set(x + 8, 2, z);
                    conWall.rotateY(Math.PI / 4);
                    conCeiling.position.set(x + 8, 4, z);
                    conFloor.position.set(x + 8, -0.25, z);

                    // Update position trackers
                    currentX = x + 8;
                    currentZ = z + 16;
                } else { // TURNING RIGHT THEN FORWARD
                    createBox(x, z, false);
                    lastJointForward = true;
                    createBox(x - 8, z + 8);
                    // Connecting piece
                    conWall.position.set(x - 8, 2, z);
                    conWall.rotateY(-Math.PI / 4);
                    conCeiling.position.set(x - 8, 4, z);
                    conFloor.position.set(x - 8, -0.25, z);

                    // Update position trackers
                    currentX = x - 8;
                    currentZ = z + 16;
                }
            }

            self.add(conWall);
            self.add(conFloor);
            self.add(conCeiling);
        }

        //createJoint(-16, 8, false);

        // GENERATE DUNGEON
        let pieceCount = 0;
        while (pieceCount < lenPieces) {
            // 1 in 4 chance to create a straight piece, else create a joint
            if (Math.random() < 0.25) {
                createBox(currentX, currentZ);
            } else {
                createJoint(currentX, currentZ, Math.random() < 0.5 ? true : false);
            }
            pieceCount++;
        }

        // Create final wall
        let finalTexture = new T.TextureLoader().load('./env/textures/dungeon-end.jpg');
        let finalWallMat = new T.MeshBasicMaterial({ color: "gray", map: finalTexture });
        let finalWall = new T.Mesh(wallGeom, finalWallMat);
        if (lastJointForward) {
            finalWall.position.set(currentX, 2, currentZ - 4);
            finalWall.rotateY(Math.PI / 2);
        } else {
            finalWall.position.set(currentX + (lastJointRight ? 4 : -4), 2, currentZ);
        }
        this.add(finalWall);
    }
}
