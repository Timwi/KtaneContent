// TheDarkSid3r's Bomb Renderer

import { GLTFLoader } from "./GLTFLoader.js";
import { OrbitControls } from "./OrbitControls.js";


const NonStandardIconStatusLightPositions = {
    topsyTurvy: "bl",
    MorseAMaze: "none",
    scavengerHunt: "none",
    exoplanets: "none",
    roger: "none",
    kataWireOrdering: "bl",
    ReverseAlphabetize: "tl",
    WorldsLargestButton: "none",
    "15MysticLights": "none",
    logicalOperators: "none",
    hinges: "none",
    CornersModule: "mc",
    ksmHighScore: "br",
    NandNs: "tl",
    MandNs: "br",
    MandMs: "bl",
    snakesAndLadders: "tl",
    cruelDigitalRootModule: "br",
    lgndHyperactiveNumbers: "br",
    FaultySink: "br",
    freeParking: "tl",
    BrokenGuitarChordsModule: "tl",
    SimonSpinsModule: "none",
    DividedSquaresModule: "none",
    TennisModule: "tl",
    doubleColor: "br",
    MorseWar: "br",
    ThirdBase: "br",
    Listening: "tl",
    AnagramsModule: "tl",
    RegularSudoku: "none",
    regrettablerelay: "tl",
    SnackAttack: "none",
    vennDiagram: "br",
    KeypadDirectionality: "none",
    omegaDestroyer: "none",
    omegaForget: "none",
    mastermindRestricted: "br",
    cellLab: "none",
    console: "none",
    ultimateTicTacToe: "none",
    kugelblitz: "none",
    "7": "bl",
    multitask: "none",
    shellGame: "none",
    eeBgnilleps: "tl",
    qkRepoSelector: "br",
    toolmods: "bl",
    NotTimerModule: "none"
};

window.BombRenderer = class {
    constructor(append) {
        var l = (f) => $("<span/>").css({ position: "fixed", left: -100000, fontFamily: f }).html("a");
        $(document.body).append(l("serial"), l("os"), l("timer"));

        this.append = $(append);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, this.append.width() / this.append.height(), 0.1, 1000);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        scene.add(camera);

        const light1 = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(light1);

        const light = new THREE.DirectionalLight(0xffffff, 0.7);
        light.position.set(0, 2, 5);
        light.target.position.set(0, 0, 0);
        camera.add(light);
        camera.add(light.target);

        this.texloader = new THREE.TextureLoader();
        this.gltfloader = new GLTFLoader();

        this.MeshMaterial = THREE.MeshStandardMaterial;

        var ls = window.location.pathname.split("/");
        this.useMainPath = ls[ls.length - 2] == "TDSBombRenderer";
        this.mainPath = this.useMainPath ? "" : "TDSBombRenderer/";

        this.texloader.load(this.mainPath + "models/textures/MenuSkybox.png", (texture) => {
            const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
            rt.fromEquirectangularTexture(renderer, texture);
            scene.background = rt;
        });

        const renderer = new THREE.WebGLRenderer();
        this.append.append(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.autoRotate = true;
        // rotate counter-clockwise, looks better
        controls.autoRotateSpeed = -1;
        controls.update();

        this.bombgroup = new THREE.Group();
        scene.add(this.bombgroup);

        this.onresize = () => {
            var width = this.append.width();
            var height = this.append.height();
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            var g = (i) => this.maxAnchorRanges && !isNaN(this.maxAnchorRanges[i]) ? this.maxAnchorRanges[i] ? Math.abs(this.maxAnchorRanges[i]) : 0.08 : 0.2; //use 0.2 as a default
            var totalBombWidth = g(0) + g(1);
            var totalBombHeight = g(2) + g(3);
            //console.log(totalBombWidth, width, totalBombHeight, height);
            var scale = Math.max(Math.min(width / (totalBombWidth * 200), height / (totalBombHeight * 200)) * (camera.fov * Math.PI / 180) * 0.8, 1);
            this.bombgroup.scale.set(scale, scale, scale);
        };
        this.onresize();
        setInterval(() => this.onresize(), 1000);
        $(window).on("resize", () => this.onresize());


        /* this.loadMainAssetsAsync().then(() => {
            this.createModuleBox({ type: "timer", time: 300, strikes: 0 }, [-0.507, -0.110]);
            this.createModuleBox({ type: "module", id: "BigButton", data: { displayName: "The Button" } }, [-0.107, 0.110]);
            this.createModuleBox({ type: "module", id: "Kahoot", data: { displayName: "Kahoot!" } }, [0.113, -0.110]);
            this.createModuleBox({ type: "module", id: "Wires", data: { displayName: "Wires" } }, [0.113, 0.110]);

            this.createModuleBox({ type: "empty" }, [-0.107, -0.110], true);
            this.createModuleBox({ type: "empty" }, [-0.107, 0.110], true);
            this.createModuleBox({ type: "empty" }, [0.113, -0.110], true);
            this.createModuleBox({ type: "empty" }, [0.113, 0.110], true);

            this.addEdgework([
                { type: "serial", number: "ABCDEF" },
                { type: "battery", battery: 1 },
                { type: "indicator", label: "CAR", lit: true }
            ]);
        }); */

        //setTimeout(() => this.createSerialWidget("AB1CD2", this.bombgroup), 200);

        camera.position.z = 5;

        //this.currentRot = [0, 0];
        this.animate = () => {
            // Lesson I learned: only render if the damn thing is visible
            if (this.append.closest(".module-info").css("display") == "block") {
                controls.update();
                renderer.render(scene, camera);
            }
            requestAnimationFrame(this.animate);
        }
        this.animate();

        /*var d = () => {
            this.mouseDown = true;
            this.append.css({ cursor: "grabbing" });
        };
        this.append
            .on("mousedown", (e) => d(e))
            .on("touchstart", (e) => d(e));
        var r = () => {
            this.mouseDown = false;
            this.prevMousePosition = [];
            this.append.css({ cursor: "grab" });
        };
        window.addEventListener("touchmove", (e) => this.eventMove(e), { passive: false });
        $(window)
            .on("mousemove", (e) => this.eventMove(e))
            .on("mouseup", () => r())
            .on("touchend", () => r());
        r();*/


        this.iconSprite = new Image();
        this.iconSprite.src = "../iconsprite";
    }

    createModuleBox(module, anchor, rear) {
        var groupRotateWrapper = new THREE.Group();
        groupRotateWrapper.rotation.y = rear ? Math.PI : 0;
        this.bombgroup.add(groupRotateWrapper);
        var group = new THREE.Group();
        group.position.z = 0.045;
        groupRotateWrapper.add(group);

        if (rear) anchor[0] *= -1; //assuming rear face is rotated 180 on the y axis
        group.position.x = anchor[0];
        group.position.y = anchor[1];

        if (!this.moduleAnchors) this.moduleAnchors = [];
        this.moduleAnchors.push({ a: anchor, p: group, r: rear });

        /*this.bombgroup.position.x = anchor[0] * 4;
        this.bombgroup.position.y = anchor[1] * -4;
        console.log(module, anchor, rear);*/

        if (!this.maxAnchorRanges) this.maxAnchorRanges = [0, 0, 0, 0];
        if (anchor[0] < this.maxAnchorRanges[0]) this.maxAnchorRanges[0] = anchor[0];
        if (anchor[0] > this.maxAnchorRanges[1]) this.maxAnchorRanges[1] = anchor[0];
        if (anchor[1] < this.maxAnchorRanges[2]) this.maxAnchorRanges[2] = anchor[1];
        if (anchor[1] < this.maxAnchorRanges[3]) this.maxAnchorRanges[3] = anchor[1];
        this.onresize();

        var createWall = (index) => {
            var wallgroup = new THREE.Group();
            group.add(wallgroup);
            wallgroup.rotation.z = index * Math.PI / 2;
            var wall = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.23, 0.09), new this.MeshMaterial({ color: 0x222222 }));
            wallgroup.add(wall);
            wall.position.x = 0.11;
        };
        for (var i = 0; i < 4; i++) createWall(i);

        var foamGeom = new THREE.PlaneGeometry(0.23, 0.23);

        var foam = new THREE.Mesh(foamGeom, this.loadTextureToMaterial("foam"));
        group.add(foam);
        foam.position.z = 0.03;

        var foamback = new THREE.Mesh(foamGeom, new this.MeshMaterial({ color: 0x222222 }));
        foamback.rotation.y = Math.PI;
        foamback.position.z = -0.045;
        group.add(foamback);

        switch (module.type) {
            case "timer":
                this.createTimerComponent(false, group).then((timer) => {
                    timer.position.z = 0.03;
                    this.renderTimer(module.time, module.strikes);
                });
                break;
            case "empty":
                var empty = this.createEmptyComponent(group);
                empty.position.z = 0.04;
                break;
            case "module":
                var data = module.data;
                var isBlank = data.iconPosition.X == 0 & data.iconPosition.Y == 0;

                const onLoad = () => {
                    var canvas = document.createElement("canvas");
                    canvas.width = 300;
                    canvas.height = 300;
                    var ctx = canvas.getContext("2d");
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(this.iconSprite, data.iconPosition.X * 32, data.iconPosition.Y * 32, 32, 32, 0, 0, 300, 300); //have to draw to a canvas at a larger scale to make pixelated


                    const drawStatusLight = (r, g, b) => {
                        // use isBlank in case there is a module with a nonstandard light position
                        // but is displaying the "blank" icon which has a standard position
                        var NonStandardIconStatusLightPosition = isBlank ? null : NonStandardIconStatusLightPositions[module.id];
                        if (NonStandardIconStatusLightPosition) {
                            switch (NonStandardIconStatusLightPosition) {
                                case "none":
                                    return;
                                case "tl":
                                    ctx.translate(canvas.width, 0);
                                    ctx.scale(-1, 1);
                                    break;
                                case "bl":
                                    ctx.translate(canvas.width, canvas.height);
                                    ctx.scale(-1, -1);
                                    break;
                                case "br":
                                    ctx.translate(0, canvas.height);
                                    ctx.scale(1, -1);
                                    break;
                            }
                        }
                        var u = (n) => n * 300 / 32;
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
                        ctx.fillRect(u(28), u(1), u(2), u(1));
                        ctx.fillRect(u(30), u(2), u(1), u(2));
                        ctx.fillRect(u(28), u(4), u(2), u(1));
                        ctx.fillRect(u(27), u(2), u(1), u(2));
                        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                        ctx.fillRect(u(28), u(2), u(2), u(2));
                    };
                    //drawStatusLight(0, 255, 0); // draw "solved" status light (255 in green)


                    var texture = new THREE.CanvasTexture(canvas);
                    var icon = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.19), new this.MeshMaterial({ map: texture, transparent: true }));
                    group.add(icon);
                    icon.position.z = 0.035;
                }

                if (this.iconSprite.complete) onLoad();
                else this.iconSprite.addEventListener("load", onLoad);

                break;
        }
    }

    loadMainAssetsAsync() {
        return new Promise(async (resolve, reject) => {
            this.emptyComponent = await this.loadModelWithTexture("Component_empty(Clone) 0", "Gameplay-KT-Mobile-Diffuse 0");
            this.batteryDHolder = await this.loadModelWithTexture("Widgets_Battery_D_Holder(Clone) 0", "Gameplay-KT-Mobile-Diffuse 1");
            this.batteryAAHolder = await this.loadModelWithTexture("Battery_2AA_Holder(Clone) 0", "Gameplay-KT-Mobile-Diffuse 1");
            this.batteryD = await this.loadModelWithTexture("Battery_D(Clone) 0", "Gameplay-KT-Mobile-Diffuse 1");
            this.batteryAA = await this.loadModelWithTexture("Battery_AA(Clone) 0", "Gameplay-KT-Mobile-Diffuse 1");
            this.indicatorBacking = await this.loadModelWithTexture("polySurface2(Clone) 1", "Gameplay-KT-Mobile-Diffuse 1");
            this.indicatorLightOff = await this.loadModelWithTexture("light(Clone) 0", "Gameplay-KT-Mobile-Diffuse 1");
            this.indicatorLightOn = await this.loadModelWithTexture("light(Clone) 1", "Gameplay-Unlit-Texture 0");
            this.portPlate = await this.loadModelWithTexture("Widget_PortPlate(Clone) 0", "Gameplay-KT-Mobile-Diffuse 0");
            this.portModels = (await this.loadModel("ports")).scene.children[0].children[0].children.map((p) => {
                p.material = this.loadTextureToMaterial("Gameplay-KT-Mobile-Diffuse 0");
                return { n: p.name.replace("Widget_Port_", ""), p };
            });
            //console.log(this.portModels);
            resolve();
        });
    }

    createEmptyComponent(parent) {
        var clone = this.emptyComponent.clone();
        parent.add(clone);
        return clone;
    }

    createTimerComponent(nostrikes, parent) {
        return new Promise((resolve, reject) => {
            this.loadModelWithTexture(nostrikes ? "Component_TimerNoStrikes(Clone) 0" : "Component_Timer(Clone) 0", "Gameplay-KT-Mobile-Diffuse 0", parent).then((timer) => {
                timer.position.set(-0.1, -0.1, 0);
                var canvas = document.createElement("canvas");
                canvas.width = 300;
                canvas.height = 300;
                var ctx = canvas.getContext("2d");
                ctx.scale(1, 1.53);

                var canvas2 = document.createElement("canvas");
                canvas2.width = 300;
                canvas2.height = 300;
                var ctx2 = canvas2.getContext("2d");
                ctx2.scale(1, 1.3);

                var texture = new THREE.CanvasTexture(canvas);
                var plane = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
                plane.position.set(0.1, 0.1, 0.036);
                timer.add(plane);
                var texture2 = new THREE.CanvasTexture(canvas2);
                var plane2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: texture2, transparent: true }));
                plane2.position.set(0.1, 0.1, 0.05);
                timer.add(plane2);

                this.renderTimer = (time, strikes) => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    ctx.font = "83px timer";
                    ctx.textAlign = "center";
                    var x = canvas.width / 2 + 6;
                    var y = 168;
                    ctx.fillStyle = "#1e1e1e";
                    ctx.fillText("88:88", x, y);
                    ctx.fillStyle = "#ff0000";
                    ctx.fillText(this.formatTime(time), x, y);
                    texture.needsUpdate = true;

                    if (!nostrikes) {
                        ctx2.font = "30px timer";
                        ctx2.textAlign = "right";
                        var x2 = canvas2.width / 2 + 37;
                        var y2 = 60;
                        ctx2.fillStyle = "#1e1e1e";
                        ctx2.fillText("8888", x2, y2);
                        ctx2.fillStyle = "#ff0000";
                        ctx2.fillText(strikes, x2, y2);
                        texture2.needsUpdate = true;
                    }
                };

                resolve(timer);
            });
        });
    }

    createSerialWidget(number, parent) {
        return new Promise((resolve, reject) => {
            var serialBacking = new Image(300, 151);
            serialBacking.src = this.mainPath + "images/serial.png";
            serialBacking.onload = () => {
                var canvas = document.createElement("canvas");
                canvas.width = 300;
                canvas.height = 151;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(serialBacking, 0, 0);
                ctx.font = "75px serial";
                ctx.fillStyle = "#000000";
                ctx.fillText(number, 30, 133);
                var texture = new THREE.CanvasTexture(canvas);
                var material = new this.MeshMaterial({ map: texture, transparent: true });
                var plane = new THREE.Mesh(new THREE.PlaneGeometry(0.3 * 0.5, 0.151 * 0.5), material);
                plane.rotation.x = -Math.PI / 2;
                if (parent) parent.add(plane);
                resolve(plane);
            };
            serialBacking.onerror = reject;
        });
    }

    createBatteryWidget(type, parent) {
        switch (type) {
            case 1:
                var holder = this.batteryDHolder.clone();
                if (parent) parent.add(holder);
                holder.position.y = -0.001;
                var battery = this.batteryD.clone();
                holder.add(battery);
                battery.rotation.z = Math.PI / 2;
            case 2:
                var holder = this.batteryAAHolder.clone();
                if (parent) parent.add(holder);
                holder.position.y = -0.001;
                var battery = this.batteryAA.clone();
                holder.add(battery);
                battery.position.z = -0.0125;
                battery.position.x = 0.002;
                var battery2 = battery.clone();
                holder.add(battery2);
                battery2.position.z = 0.0125;
        }
    }

    createIndicatorWidget(label, on, parent) {
        var backing = this.indicatorBacking.clone();
        if (parent) parent.add(backing);
        backing.rotation.y = Math.PI;
        var canvas = document.createElement("canvas");
        canvas.width = 250;
        canvas.height = 100;
        var ctx = canvas.getContext("2d");
        ctx.font = "75px os";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, canvas.width / 2, 73);
        var texture = new THREE.CanvasTexture(canvas);
        var material = new this.MeshMaterial({ map: texture, transparent: true });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), material);
        plane.rotation.z = Math.PI;
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0.003;
        backing.add(plane);
        var light = (on ? this.indicatorLightOn : this.indicatorLightOff).clone();
        backing.add(light);
        return backing;
    }

    createPortWidget(ports, parent) {
        var group = new THREE.Group();
        if (parent) parent.add(group);
        var plate = this.portPlate.clone();
        group.add(plate);
        plate.scale.set(0.06, 0.06, 0.06); //for some reason the port plate model in ktane is gigantic
        plate.position.y = -0.017;
        ports.forEach((p) => {
            this.portModels.filter((m) => m.n.startsWith(p)).forEach((model) => {
                var port = model.p.clone();
                group.add(port);
                port.position.y += 0.002;
            });
        });
        return group;
    }

    loadModel(name) {
        return new Promise((resolve, reject) => {
            this.gltfloader.load(this.mainPath + "models/" + name + "_out/" + name + ".gltf", (model) => {
                resolve(model);
            }, null, reject);
        });
    }

    loadModelWithTexture(name, texture, parent) {
        return new Promise((resolve, reject) => {
            this.loadModel(name).then((model) => {
                var mat = this.loadTextureToMaterial(texture);
                var mesh = model.scene.children[0].children[0];
                mesh.material = mat;
                if (parent) parent.add(mesh);
                resolve(mesh);
            }).catch(reject);
        });
    }

    loadTextureToMaterial(name) {
        if (!this.textureMats) this.textureMats = [];
        if (this.textureMats[name]) return this.textureMats[name];
        var material = new this.MeshMaterial({ map: this.texloader.load(this.mainPath + "models/textures/" + name + ".png") });
        material.map.flipY = false;
        this.textureMats[name] = material;
        return material;
    }

    formatTime(seconds) {
        var pad = (n) => n.toString().padStart(2, "0");
        if (seconds < 60) {
            var s = Math.floor(seconds);
            var ns = Math.floor(seconds * 100 % 100);
            return pad(s) + "." + pad(ns);
        } else {
            var m = Math.floor(seconds / 60).toString();
            var rs = Math.floor(seconds % 60);
            return pad(m) + ":" + pad(rs);
        }
    }

    createEdgeworkElement(data) {
        switch (data.type) {
            case "serial":
                return $("<div/>").addClass("widget widget-serial").html(data.number);
            case "indicator":
                return $("<div/>").addClass("widget widget-indicator widget-indicator-" + (data.lit ? "lit" : "unlit")).html(data.name);
            case "battery":
                var battery = $("<div/>").addClass("widget-full widget-battery-" + data.battery + "-" + data.count);
                return $("<div/>").addClass("widget widget-battery widget-battery-" + data.battery).append(battery);
            case "port":
                var plate = $("<div/>").addClass("widget widget-port");
                data.ports.forEach((p) => $("<div/>").addClass("widget-full widget-port-" + p).appendTo(plate));
                return plate;
        }
    }

    addWidget(data) {
        if (!this.widgetAnchors.length) {
            console.warn("BombRenderer: Could not add %s widget: no unused widget anchors\nComponent: %o", data.type, data);
            return;
        }
        var anchorIndex = Math.floor(Math.random() * this.widgetAnchors.length);
        var anchor = this.widgetAnchors[anchorIndex];
        switch (data.type) {
            case "serial":
                this.createSerialWidget(data.number, anchor);
                break;
            case "battery":
                this.createBatteryWidget(data.battery, anchor);
                break;
            case "indicator":
                this.createIndicatorWidget(data.label, data.lit, anchor);
                break;
            case "port":
                this.createPortWidget(data.ports, anchor);
                break;
        }
        this.widgetAnchors.splice(anchorIndex, 1);
    }

    anchorInDirections(a1, a2) {
        var min = 0.1;
        var max = 0.3;
        var diffX = a2[0] - a1[0];
        var diffY = a2[1] - a1[1];
        if (Math.abs(diffX) < min || Math.abs(diffY) < min || Math.abs(diffX) > max || Math.abs(diffY) > max) return false;
        return [diffX > 0 ? "e" : "w", diffY > 0 ? "n" : "s"];
    }

    addEdgework(widgets) {
        this.widgetAnchors = [];
        this.moduleAnchors.forEach((anchor) => {
            var closeAnchors = this.moduleAnchors.map((a) => this.anchorInDirections(anchor.a, a.a)).filter((a) => a);
            var validSides = ["n", "e", "s", "w"];
            closeAnchors.forEach((a) => a.forEach((s) => {
                var i = validSides.indexOf(s);
                if (i > -1) validSides.splice(i, 1);
            }));
            if (!validSides.length) return;
            var sides = validSides.map((s) => ["n", "e", "s", "w"].indexOf(s));
            sides.forEach((side) => {
                var moduleAnchor = new THREE.Group();
                anchor.p.add(moduleAnchor);
                moduleAnchor.rotation.z = -side * Math.PI / 2;
                if (anchor.r) moduleAnchor.position.z *= -1;
                var widgetAnchor = new THREE.Group();
                moduleAnchor.add(widgetAnchor);
                widgetAnchor.position.y = 0.1226;
                if (anchor.r) widgetAnchor.rotation.y = Math.PI;
                this.widgetAnchors.push(widgetAnchor);
                //this.createPortWidget(["Parallel", "Serial"], widgetAnchor);
                //console.log(anchor.a, !!anchor.r, side);
            });
        });
        widgets.forEach((w) => this.addWidget(w));
    }
};
