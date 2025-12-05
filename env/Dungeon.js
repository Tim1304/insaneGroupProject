// @ts-check
import * as T from "../CS559-Three/build/three.module.js";

export class Dungeon extends T.Scene {
    constructor() {
        super();

        let wallTexture = new T.TextureLoader().load('./env/textures/dungeon/dungeon-wall.jpg');
        let floorTexture = new T.TextureLoader().load('./env/textures/dungeon/dungeon-floor.jpg');
        let wallMat = new T.MeshStandardMaterial({ map: wallTexture });
        let floorMat = new T.MeshStandardMaterial({ map: floorTexture });

        /**
         * Creates an oppen ended cube tunnel element
         */
        function createBox(x, z) {

        }

        /**
         * Adds a joint turning either left or right to the tunnel
         */
        function createJoint(x, z, handedness) {

        }
    }
}
