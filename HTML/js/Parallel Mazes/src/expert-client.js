var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./maze-map", "./parallel-mazes-client"], function (require, exports, maze_map_1, parallel_mazes_client_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExpertClient = void 0;
    class ExpertClient {
        constructor() {
            this.parmClient = new parallel_mazes_client_1.ParallelMazesClient();
            this.map = new maze_map_1.MazeMap("map-table");
            this.gameId = "";
            this.expertId = "";
            this.consoleDiv = document.getElementById("console-div");
            this.loginDiv = document.getElementById("login-div");
            this.loginInput = document.getElementById("login-input");
            this.loginButton = document.getElementById("login-button");
            this.errorDiv = document.getElementById("error-div");
            this.errorLabel = document.getElementById("error-label");
            this.retryButton = document.getElementById("retry-button");
            this.mapTableContainer = document.getElementById("map-table-container");
            this.playerDiv = document.getElementById("player");
            this.finishDiv = document.getElementById("finish");
            this.lockerDiv = document.getElementById("locker");
            this.rightButton = document.getElementById("right-button");
            this.upButton = document.getElementById("up-button");
            this.leftButton = document.getElementById("left-button");
            this.downButton = document.getElementById("down-button");
            this.consoleDiv.innerText = "CONNECTION";
            this.run();
        }
        login() {
            this.consoleDiv.innerText = "LOGIN";
            this.loginDiv.style.display = "flex";
            this.loginButton.disabled = false;
            this.loginButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.loginButton.disabled = true;
                this.gameId = this.loginInput.value;
                try {
                    this.expertId = yield this.parmClient.loginExpert(this.gameId).then((res) => res.pass);
                }
                catch (error) {
                    this.loginInput.value = "";
                    this.loginDiv.style.display = "none";
                    this.errorDiv.style.display = "flex";
                    this.errorLabel.innerText = "GAME NOT FOUND";
                    this.retryButton.onclick = () => {
                        this.errorDiv.style.display = "none";
                        this.login();
                    };
                    return;
                }
                this.loginDiv.style.display = "none";
                this.consoleDiv.innerText = `GAME ID: ${this.gameId}\nEXPERT: ${this.expertId}`;
            });
        }
        onMove(direction) {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.lockerDiv.innerText !== "MOVE")
                    return;
                this.lockerDiv.innerText = "STOP";
                this.loginDiv.style.color = "red";
                const result = yield this.parmClient.makeAMove(this.gameId, direction);
                this.lockerDiv.innerText = result.move === "expert" ? "MOVE" : "STOP";
                this.lockerDiv.style.color = result.move === "expert" ? "#0f0" : "red";
                if (!result.strike) {
                    this.playerDiv.style.left = `${result.new_pos.x * 40 + 16}px`;
                    this.playerDiv.style.top = `${result.new_pos.y * 40 + 16}px`;
                }
            });
        }
        run() {
            return __awaiter(this, void 0, void 0, function* () {
                this.parmClient.onModuleConnected((data) => {
                    this.mapTableContainer.style.display = "flex";
                    this.map.data = data.module_maze;
                    this.lockerDiv.innerText = data.move === "expert" ? "MOVE" : "STOP";
                    this.lockerDiv.style.color = data.move === "expert" ? "#0f0" : "red";
                    this.map.render();
                    this.playerDiv.style.left = `${data.expert_pos.x * 40 + 16}px`;
                    this.playerDiv.style.top = `${data.expert_pos.y * 40 + 16}px`;
                    this.finishDiv.style.left = `${data.expert_finish.x * 40 + 12}px`;
                    this.finishDiv.style.top = `${data.expert_finish.y * 40 + 12}px`;
                    this.rightButton.onclick = () => this.onMove("right");
                    this.upButton.onclick = () => this.onMove("up");
                    this.leftButton.onclick = () => this.onMove("left");
                    this.downButton.onclick = () => this.onMove("down");
                });
                this.parmClient.onModuleMoved((data) => {
                    console.log(data);
                    this.lockerDiv.innerText = data.move === "expert" ? "MOVE" : "STOP";
                    this.lockerDiv.style.color = data.move === "expert" ? "#0f0" : "red";
                });
                yield this.parmClient.connect();
                this.login();
            });
        }
    }
    exports.ExpertClient = ExpertClient;
});
