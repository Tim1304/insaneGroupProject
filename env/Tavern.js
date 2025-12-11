// @ts-check
import * as T from "../CS559-Three/build/three.module.js";
import * as Gen from "./worldObjects.js";

/**
 * This class sets up the tavern interior scene.
 */
export class Tavern extends T.Scene {
    constructor() {
        super();

        this.add(new T.AxesHelper(10));

        // Lighting
        const ambientLight = new T.AmbientLight(0xffffff, 1);
        this.add(ambientLight);
        const dirLight = new T.DirectionalLight(0xffffff, 0.2);
        dirLight.position.set(10, 5, 10);
        dirLight.target.position.set(0, 0, 0);
        this.add(dirLight);

        let floorTexture = new T.TextureLoader().load("./env/textures/tavern-floor.jpg");
        floorTexture.wrapS = T.RepeatWrapping;
        floorTexture.wrapT = T.RepeatWrapping;
        floorTexture.repeat.set(1.5, 1.5);
        let wallTexture = new T.TextureLoader().load("./env/textures/tavern-wall.jpg");
        wallTexture.wrapS = T.RepeatWrapping;
        wallTexture.wrapT = T.RepeatWrapping;
        wallTexture.repeat.set(1.5, 1);
        let simpleTexture = new T.TextureLoader().load("./env/textures/tavern-ceiling.jpg");

        let floorMaterial = new T.MeshPhongMaterial({ map: floorTexture, shininess: 400, side: T.DoubleSide });
        let wallMaterial = new T.MeshPhongMaterial({ map: wallTexture, shininess: 0, side: T.DoubleSide });
        let basicWood = new T.MeshPhongMaterial({ map: simpleTexture, shininess: 0, side: T.DoubleSide });

        let floorGeometry = new T.PlaneGeometry(15, 15);
        let wallGeometry = new T.PlaneGeometry(15, 7);
        let ceilingGeometry = new T.PlaneGeometry(15, 15);

        let floor = new T.Mesh(floorGeometry, floorMaterial);
        floor.rotateX(-Math.PI / 2);
        floor.position.y = -3;
        let wall = new T.Mesh(wallGeometry, wallMaterial);
        wall.position.z = 7.5;
        wall.position.y += 0.5;
        this.add(wall);
        this.add(floor);
        let wall2 = wall.clone();
        wall2.material = basicWood;
        wall2.position.z = -7.5;
        this.add(wall2);
        let ceiling = new T.Mesh(ceilingGeometry, basicWood);
        ceiling.rotateX(Math.PI / 2);
        ceiling.position.y = 3.5;
        this.add(ceiling);
        let wall3 = wall2.clone();
        wall3.position.set(7.5, 0, 0);
        wall3.rotateY(-Math.PI / 2);
        this.add(wall3);
        let wall4 = wall2.clone();
        wall4.position.set(-7.5, 0, 0);
        wall4.rotateY(Math.PI / 2);
        this.add(wall4);
        
        let table = new Gen.Table(new T.Vector3(0, 0, 0), 11.5);
        this.add(table);
        table.scale.y = 15;
        table.position.y = -9;
        table.position.z -= 2;

        ceiling.position.y += 0.5;
        wall3.position.y += 0.5;
        wall4.position.y += 0.5;
        
    }
}
