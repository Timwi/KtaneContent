$(() => {
    drawChart();
});

const comets = "011010100010";
const images = ["PlanetX", "Empty", "GasCloud", "Dwarf", "Asteroid", "Comet"];
const patternIds = ["solid", "stripes", "dots"];

function drawChart() {
    const chartSvg = MakeSvgTag(210, 210, -105, -105, { class: "invertible chart" });
    const outerGrid = new CircularGrid(12, 7, 100, 25, { style: "transform: rotate(-90deg)" }, false, false);
    const innerGrid = new CircularGrid(12, 1, 25, 2, { style: "transform: rotate(-90deg)" }, false, false);

    chartSvg.append(getPatternDefs());

    outerGrid.drawRing(7, 0, { fill: "#fff" });
    outerGrid.drawRing(7, 6, { fill: "#222" });
    for (let col = 0; col < 12; col++) {
        for (const ix in images) {
            if (ix === "5" && comets[col] === "0")
                continue;
            outerGrid.drawCell(col, Number(ix) + 1, 1, 1, { class: "invertible highlightable", fill: "transparent" });
            outerGrid.insertElementAt(MakeSvgElem("image", { class: "symbol", href: `img/Planet X/${images[ix]}.svg`, width: 14, height: 14, x: -7, y: -7, style: "pointer-events: none" }), col + .5, Number(ix) + 1.5);
        }
        outerGrid.drawCell(col, .5, 1, 6.5, { class: "cell" });
        outerGrid.insertElementAt(MakeSvgElem("text", {}, String(col + 1) + (col === 5 || col === 8 ? "." : "")), col + .5, .5);

        innerGrid.drawCell(col, 0, 1, 1, { class: "invertible pattern", fill: `url(#${patternIds[col % 3]})` });
        innerGrid.drawCell(col, 0, 1, 1, { class: "cell" });
    }

    chartSvg.append(outerGrid.svgElement);
    chartSvg.append(innerGrid.svgElement);
    $(".planet-x-chart").append(chartSvg);
}

function getPatternDefs() {
    const defs = MakeSvgElem("defs");

    const addPatternTag = (id, baseColour) => {
        const pattern = MakeSvgElem("pattern", { id, patternUnits: "userSpaceOnUse", height: 3, width: 3 });
        pattern.append(MakeSvgElem("rect", { width: 3, height: 3, fill: baseColour }));
        defs.append(pattern);
        return pattern;
    }

    addPatternTag("solid", "#a8a9ad");

    const stripesPattern = addPatternTag("stripes", "#b2b3b7");
    stripesPattern.append(MakeSvgElem("path", { d: "M1.5 0v3", stroke: "#dcdcde", "stroke-width": .5 }));

    const dotsPattern = addPatternTag("dots", "#c7c8ca");
    dotsPattern.setAttribute("patternTransform", "rotate(-15) translate(2, 1)");
    for (let ix = 0; ix < 4; ix++)
        dotsPattern.append(MakeSvgElem("circle", { r: .35, cx: .75 + 1.5 * (ix % 2), cy: .75 + 1.5 * Math.floor(ix / 2), fill: "#efefef" }));

    return defs;
}