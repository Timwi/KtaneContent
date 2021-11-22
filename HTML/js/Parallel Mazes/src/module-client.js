var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./parallel-mazes-client"], function (require, exports, parallel_mazes_client_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ModuleClient = void 0;
    var State;
    (function (State) {
        State[State["NOT_INITED"] = 0] = "NOT_INITED";
        State[State["CONNECTING"] = 1] = "CONNECTING";
        State[State["CREATING_GAME"] = 2] = "CREATING_GAME";
        State[State["WAITING_FOR_EXPERT"] = 3] = "WAITING_FOR_EXPERT";
    })(State || (State = {}));
    class ModuleClient {
        constructor() {
            this.parmClient = new parallel_mazes_client_1.ParallelMazesClient();
            this.state = State.NOT_INITED;
            this.gameId = "";
            this.state = State.CONNECTING;
            this.displayText = document.getElementById("display-text");
            this.render();
            this.run();
        }
        run() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.parmClient.connect();
                this.state = State.CREATING_GAME;
                this.render();
                const { gameId } = yield this.parmClient.createGame();
                this.state = State.WAITING_FOR_EXPERT;
                this.gameId = gameId;
                this.render();
            });
        }
        render() {
            switch (this.state) {
                case State.CONNECTING:
                    this.displayText.innerText = "Connecting...";
                    break;
                case State.CREATING_GAME:
                    this.displayText.innerText = "Creating game...";
                    break;
                case State.WAITING_FOR_EXPERT:
                    this.displayText.innerText = `Game Id: ${this.gameId}`;
                    break;
            }
        }
    }
    exports.ModuleClient = ModuleClient;
});
