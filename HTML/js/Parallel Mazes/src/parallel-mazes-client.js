var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./type", "./ws-client"], function (require, exports, type_1, ws_client_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ParallelMazesClient = exports.ON_MODULE_MOVED_EVENT = exports.ON_MODULE_CONNECTED_EVENT = void 0;
    exports.ON_MODULE_CONNECTED_EVENT = "connected_to_game";
    exports.ON_MODULE_MOVED_EVENT = "module_moved";
    class ParallelMazesClient {
        constructor() {
            this.ws = new ws_client_1.WSClient("wss://warm-wildwood-46578.herokuapp.com/");
        }
        connect() {
            return __awaiter(this, void 0, void 0, function* () { yield this.ws.connect(); this.pingJob(); });
        }
        createGame() {
            return __awaiter(this, void 0, void 0, function* () {
                return this.call(type_1.Method.CREATE_GAME, {}).then((res) => ({ gameId: res.game_id, moduleKey: res.module_key }));
            });
        }
        loginExpert(gameId) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.call(type_1.Method.CONNECT_TO_GAME, { game_id: gameId });
            });
        }
        makeAMove(gameId, direction) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield this.call(type_1.Method.EXPERT_MOVE, { game_id: gameId, direction }).then((res) => ({ move: res.move, new_pos: res.new_pos, strike: false }));
                }
                catch (error) {
                    if (typeof error !== "object" || !error || error.message !== "moved into wall" || type_1.AllMoves.indexOf(error.move) < 0)
                        throw error;
                    return { move: error.move, strike: true };
                }
            });
        }
        call(method, args) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.ws.call(method, args);
            });
        }
        onModuleConnected(f) {
            return __awaiter(this, void 0, void 0, function* () {
                this.ws.onEvent(exports.ON_MODULE_CONNECTED_EVENT, (data) => f(data));
            });
        }
        onModuleMoved(f) {
            return __awaiter(this, void 0, void 0, function* () {
                this.ws.onEvent(exports.ON_MODULE_MOVED_EVENT, (data) => f(data));
            });
        }
        pingJob() {
            return __awaiter(this, void 0, void 0, function* () {
                while (true) {
                    yield new Promise((resolve) => setTimeout(() => resolve(), 1e3));
                    this.call(type_1.Method.PING, null);
                }
            });
        }
    }
    exports.ParallelMazesClient = ParallelMazesClient;
});
