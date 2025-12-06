// @ts-check
import * as T from "../CS559-Three/build/three.module.js";

export class Dungeon extends T.Scene {
    constructor() {
        super();

        const self = this;  

        // Lighting
        const ambientLight = new T.AmbientLight(0xffffff, 0.3);
        this.add(ambientLight);
        this.add(new T.AxesHelper(5));

        // let wallTexture = new T.TextureLoader().load('./env/textures/dungeon-wall.jpg');
        // let floorTexture = new T.TextureLoader().load('./env/textures/dungeon-floor.jpg');
        let wallMat = new T.MeshStandardMaterial({ color: "#888888" });
        let floorMat = new T.MeshStandardMaterial({ color: "#444444" });

        /**
         * Creates an oppen ended cube tunnel element
         */
        function createBox(x, z) {
            const boxGeo = new T.BoxGeometry(4, 4, 4);
            const box = new T.Mesh(boxGeo, wallMat);
            box.position.set(x, 0, z);
            self.add(box);
            self.add(new T.AxesHelper(2));
        }
        createBox(0, 0);

        /**
         * Adds a joint turning either left or right to the tunnel
         */
        function createJoint(x, z, handedness) {

        }
    }
}
