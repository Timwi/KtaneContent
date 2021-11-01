define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Method = exports.AllMoves = void 0;
    exports.AllMoves = ["expert", "module", "none"];
    ;
    ;
    var Method;
    (function (Method) {
        Method["CREATE_GAME"] = "create_game";
        Method["CONNECT_TO_GAME"] = "connect_to_game";
        Method["EXPERT_MOVE"] = "expert_move";
        Method["PING"] = "ping";
    })(Method = exports.Method || (exports.Method = {}));
});
