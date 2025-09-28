const size = 9;
const wrapper = document.getElementById("thermo-wrapper");
const table = document.getElementById("thermo-sudoku");
const svg = document.getElementById("thermoLayer");

// Add data-row and data-col attributes to existing cells
const rows = table.querySelectorAll("tr");
rows.forEach((row, r) => {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell, c) => {
        cell.dataset.row = (r + 1).toString();
        cell.dataset.col = (c + 1).toString();
    });
});

const thermometers = [
    {color: "#ff6060", path: ["B2", "B3", "C2"]},
    {color: "#ff6060", path: ["D2", "E1", "E2"]},
    {color: "#ff6060", path: ["F1", "G2", "H3", "I2", "I1"]},
    {color: "#8080ff", path: ["B4", "C4", "B5"]},
    {color: "#ff6060", path: ["F4", "F5", "E6"]},
    {color: "#8080ff", path: ["I5", "I6", "H6", "H5"]},
    {color: "#8080ff", path: ["I5", "I6", "H6", "H5"]},
    {color: "#ff6060", path: ["C7", "D6", "C6", "B6"]},
    {color: "#8080ff", path: ["F7", "G7", "F6"]},
    {color: "#ff6060", path: ["I7", "I8", "H7"]},
    {color: "#ff6060", path: ["C8", "B9", "A8"]},
    {color: "#ff6060", path: ["C9", "D8", "D9"]},
    {color: "#ff6060", path: ["E8", "E9", "F9", "F8"]}
];

function getCellCenter(coord) {
    const col = coord.charCodeAt(0) - 65 + 2; // A=1
    const row = parseInt(coord.slice(1), 10);
    const cell = table.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return null;

    const rect = cell.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    return {
        x: rect.left - wrapperRect.left + rect.width / 2,
        y: rect.top - wrapperRect.top + rect.height / 2
    };
}

function resizeSVG() {
    const rect = wrapper.getBoundingClientRect();
    svg.setAttribute("width", rect.width.toString());
    svg.setAttribute("height", rect.height.toString());
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
}

function drawThermos() {
    svg.innerHTML = "";
    resizeSVG();

    thermometers.forEach(t => {
        const coords = t.path.map(getCellCenter).filter(Boolean);
        if (coords.length < 1) return;

        // Lines
        for (let i = 0; i < coords.length - 1; i++) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", coords[i].x.toString());
            line.setAttribute("y1", coords[i].y.toString());
            line.setAttribute("x2", coords[i + 1].x.toString());
            line.setAttribute("y2", coords[i + 1].y.toString());
            line.setAttribute("stroke", t.color);
            line.setAttribute("stroke-width", "3");
            line.setAttribute("stroke-linecap", "round");
            svg.appendChild(line);
        }

        // Bulb
        const bulb = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bulb.setAttribute("cx", coords[0].x.toString());
        bulb.setAttribute("cy", coords[0].y.toString());
        bulb.setAttribute("r", "6");
        bulb.setAttribute("fill", t.color);
        svg.appendChild(bulb);
    });
}

drawThermos();
window.addEventListener("resize", drawThermos);
