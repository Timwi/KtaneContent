define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MazeMap = void 0;
    const WIDTH = 7;
    const HEIGHT = 7;
    class MazeMap {
        constructor(tableId) {
            this.tableId = tableId;
            this.data = [];
            this.cells = [];
            this.table = document.getElementById(tableId);
            if (this.table === null)
                throw new Error("table not found");
        }
        render() {
            this.table.innerHTML = "";
            this.cells = new Array(WIDTH).fill(0).map(() => new Array(HEIGHT).fill(0));
            for (let y = 0; y < HEIGHT; y++) {
                const tr = this.table.appendChild(document.createElement("tr"));
                for (let x = 0; x < WIDTH; x++) {
                    const td = tr.appendChild(document.createElement("td"));
                    for (let d = 0; d < 4; d++) {
                        if ((this.data[x][y] & (1 << d)) === 0)
                            td.classList.add(`wall-${d}`);
                    }
                    this.cells[x][y] = td;
                }
            }
        }
    }
    exports.MazeMap = MazeMap;
});
