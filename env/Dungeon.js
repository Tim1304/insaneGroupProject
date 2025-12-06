// @ts-check
import * as T from "../CS559-Three/build/three.module.js";

export class Dungeon extends T.Scene {
    constructor() {
        super();

        const self = this;

        // Lighting
        const ambientLight = new T.AmbientLight(0xffffff, 10);
        this.add(ambientLight);
        const dirLight = new T.DirectionalLight(0xffffff, 10);
        dirLight.position.set(10, 20, 10);
        dirLight.target.position.set(0, 0, 0);
        this.add(dirLight);
        this.add(new T.AxesHelper(5));

        let wallTexture = new T.TextureLoader().load('./env/textures/dungeon-wall.jpg');
        let floorTexture = new T.TextureLoader().load('./env/textures/dungeon-wall.jpg');
        let wallMat = new T.MeshBasicMaterial({ side: T.DoubleSide, color: "#ffffff" });
        let floorMat = new T.MeshStandardMaterial({ color: "#444444", map: floorTexture, side: T.DoubleSide });

        /**
         * Creates an oppen ended cube tunnel element
         */
        function createBox(x, z) {
            // Floor
            const boxGeo = new T.BoxGeometry(8, 0.5, 8);
            const box = new T.Mesh(boxGeo, floorMat);
            box.position.y -= 0.25;
            box.position.set(x, 0, z);
            self.add(box);
            self.add(new T.AxesHelper(2));
            // Walls
            const wallGeom = new T.BoxGeometry(0.5, 4, 8);
            const wall1 = new T.Mesh(wallGeom, wallMat);
            wall1.position.set(x - 4, 2, z);
            self.add(wall1);
            const wall2 = new T.Mesh(wallGeom, wallMat);
            wall2.position.set(x + 4, 2, z);
            self.add(wall2);
            // Ceiling
            const ceiling = new T.Mesh(boxGeo, wallMat);
            ceiling.position.set(x, 4.25, z);
            self.add(ceiling);
        }
        createBox(0, 0);

        /**
         * Adds a joint turning either left or right to the tunnel
         */
        function createJoint(x, z, handedness) {

        }
    }
}
