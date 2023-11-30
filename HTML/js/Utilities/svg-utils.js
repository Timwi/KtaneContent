/**
 * Creates a tag that goes in an <svg> block.
 * @param {string} tag - Type of element.
 * @example text, rect, circle
 * @param {Dictionary} attrs - Attributes to set in the new element.
 * @example {class:"highlightable", r:5, cx:4, cy:12}
 * @returns {HTMLElement} The generated tag with the provided attributes.
 */
 function MakeSvgElem(tag, attrs, inner = null) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let k in attrs)
        el.setAttribute(k, attrs[k]);
    if (inner != null)
        el.innerHTML = inner;
    return el;
}

/**
 * Makes an svg tag that behaves better in terms of scaling than one created with createElementNS. Requires jquery.
 * @param {float} w - Width of svg.
 * @param {float} h - Height of svg.
 * @param {float} xOff - X shift of viewbox.
 * @param {float} yOff - Y shift of viewbox.
 * @param {Dictionary} attrs - Global attributes to set in the svg tag.
 * @example {class:"ondark", "text-anchor":"middle", "stroke-width":"5"}
 * @returns {HTMLElement} An \<svg> tag.
 */
function MakeSvgTag(w, h, xOff = 0, yOff = 0, attrs = null) {
    if (w <= 0 || h <= 0)
        return null;
    let svg = $(`<svg viewbox="${xOff} ${yOff} ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`);
    if (attrs) {
        for (let k in attrs)
            svg.attr(k, attrs[k]);
    }
    return svg;
}

/**
 * Makes a perfect regular polygon with verticies all lying on a circle.
 * @param {float} radius - Radius of the invisible circle (and the polygon).
 * @param {float} cx - x coordinate of center of polygon.
 * @param {float} cy - y coordinate of center of polygon.
 * @param {float} numSides - Number of sides of the polygon.
 * @param {float} rot - Rotation angle in degrees of the whole polygon.
 * @param {Dictionary} attrs - Attributes to set in the new element. e.g. {class:"highlightable", fill:"#000"}.
 * @returns {HTMLElement} A \<polygon> tag.
 */
function RegularPolygon(radius, cx = 0, cy = 0, numSides = 3, rot = 0, attrs = null) {
    let n = Math.max(3, numSides);
    let r = Math.max(1e-6, radius);
    let angle = Math.PI / 180 * (rot - 90);
    let dTheta = 2 * Math.PI / n;
    let vert = [];
    for (let i = 0; i < n; i++) {
        let a = i*dTheta + angle;
        let x = cx + r * Math.cos(a);
        let y = cy + r * Math.sin(a);
        vert.push([x, y]);
    }

    let el = MakeSvgElem("polygon", attrs);
    el.setAttribute("points", vert.join(" "));
    return el;
}

/**
 * Makes a arrow with stem and head as a group with two paths.
 * All path constants were drawn in a 100x100 viewbox with whole arrow centered at 50,50.
 * @param {float} rotation - Rotation angle in degrees of the whole arrow, 0 points up.
 * @param {float} scale - Adjusts size of arrow by percentage.
 * @param {float} x - x coordinate of center of the arrow.
 * @param {float} y - y coordinate of center of the arrow.
 * @param {string} head - Style of arrow head.
 * @param {string} stem - Style of arrow body.
 * @param {Dictionary} attrs - Attributes to set in the arrow group. e.g. {class:"highlightable", fill:"#F00"}.
 * @param {string} otherTransform - Other things to apply to the transform attribute (not scale or rotate).
 * @returns {HTMLElement} A \<g> tag.
 */
function MakeArrow(rotation = 0, scale = 100, x = 50, y = 50, head = "triangle", stem = "long", attrs = null, otherTransform = null) {
    const ctr = 50;
    const heads = {
        "triangle": [50, 2.8, "l18.9 32.7h-37.8z"],
        "v": [25.8, 31, "c6.5-6.1 10.94-10.12 14.65-14.35c2.8-3.18 9.55-13.85 9.55-13.85s6.27 9.79 9.21 13.3c2.94 3.5 8.99 9 15.59 14.9v5.2c-8.92-2.5-23.41-15.26-24.8-15.27c-1.34 0-8.68 6.48-13 9.07c-2.1 1.4-5.9 3.4-11.2 6.1z"],
        "rounded-v": [15, 40.4, "c-0.6-3.4 1.1-6.6 4.2-9.4l30.8-27.4l29.9 27c3.4 3.1 5.1 6 5.1 9a9 9 0 0 1-2.5 6.3c-1.9 2-4 3.4-6.4 3.5a10 10 0 0 1-6.9-2.6l-19.4-17l-18.6 16.6c-2.6 2-5 3.1-7.3 3a9.2 9.2 0 0 1-6.4-3.5a11.4 11.4 0 0 1-2.5-5.5z"],
        "thin-v": [50, 2.4, "l-15 26a2 2 0 0 0 0.7 2.7a2 2 0 0 0 2.8-0.7l11.5-20l11.4 19.6a2 2 0 0 0 2.7 0.7a2 2 0 0 0 0.7-2.7z"],
        "arrowhead": [35, 44, "l15-40.4l15 40.4l-15-13.8z"],
        "big-tri": [15.5, 49.8, "l34.5-46.2l34.5 46.2z"],
        "chevron": [50, 40, "l-33 33v-21l32.9-33.6l32.9 33.7v21z"],
        "compass": [23, 92, "l27-84l27 84l-27-28.7z"],
        "concave-tri": [50, 6.5, "a102 102 0 0 1-22.8 34.4a79.7 79.7 0 0 1 17.3-6c5.5-1 5.5-1 11 0a82 82 0 0 1 17.5 6.1a97.8 97.8 0 0 1-23-34.5z"],
        "heart": [51.08, 29.9, "c0.45 0.56 1.11 1.28 1.67 1.74a8.71 8.71 0 0 0 14.14-5.19a7.8 7.8 0 0 0-0.08-3.62c-0.63-2.3-2.74-4.63-5-6.76c-1.08-1.02-2.12-1.97-3.14-2.91c-3.04-2.85-8.65-9.77-8.65-9.77s-5.6 6.92-8.65 9.76l-3.13 2.91c-2.26 2.14-4.38 4.47-5 6.77a7.8 7.8 0 0 0-0.08 3.62a8.71 8.71 0 0 0 14.14 5.19c0.62-0.51 1.19-1.1 1.68-1.73l1.05-1.33z"],
        "leaf": [50, 3.65, "c-3.99 9.97-10.82 16.66-20.5 20.08c2.56 2.56 6.96 3.88 11.53 3.42c4.57-0.47 8.55-4.61 9.18-4.61c0.6 0 4.42 4.12 8.76 4.6c4.34 0.49 8.69-0.56 11.54-3.41c-9.69-3.43-16.52-10.11-20.51-20.08z"],
        "center-triangle": [50, 20, "l30 60h-60z"]
    }

    const stems = {
        "long": [45.3, 12.6, "l4.7-5l4.7 5v84.6h-9.4z"],
        "medium": [45.3, 25, "l4.7-5l4.7 5v72.2h-9.4z"],
        "short": [45.3, 50, "l4.7-5l4.7 5v47.6h-9.4z"],
        "long-wide": [43.5, 15, "l6.5-6l6.5 6v82.2h-13z"],
        "wide": [43.5, 26, "l6.5-6l6.5 6v71.2h-13z"],
        "short-wide": [43, 51, "l7-6l7 6v46.2h-14z"],
        "wider": [42, 28, "l8-6l8 6v69.2h-16z"],
        "rounded": [50, 14.92, "l6.05 8.31v67.21c0 4.46-3.13 7-6.22 7-2.86 0-6.15-2.74-6.17-7v-67.2z"],
        "rounded-wide": [50, 13.47, "l8.97 9.76v65.87a8.7 8.7 0 0 1-2.56 6.4c-2 2-4.42 2.85-7.26 2.57a9.2 9.2 0 0 1-5.56-2.56 10.4 10.4 0 0 1-2.99-6.41v-65.87z"],
        "bishop": [50.03, 13.27, "l-5.53 7.77c3.58 28.66-3.06 56.3-8.82 73.47a48.73 48.73 0 0 1 28.7 0c-5.78-17.17-12.54-44.81-8.84-73.47z"],
        "fins": [64.7, 96.6, "l-14.7-14.7l-14.6 14.7v-29.3l7.3-7.4v-36.6l7.3-9.2l7.4 9.2v36.7l7.3 7.4z"],
        "stout": [35.5, 95.4, "v-50.6l14.5-14.5l14.5 14.5v50z"],
        "thin": [50, 4.4, "a2 2 0 0 0-2 2v88.5a2 2 0 0 0 2 2a2 2 0 0 0 2-2v-88.5a2 2 0 0 0-2-2z"],
        "feathered": [47.4, 16.77, "v36.36c0 4.95-1.61 9-4.82 12.16c-2.57 2.7-6.1 4.9-10.59 5.58v23.43c8.34-1.35 14.97-5.51 17.96-12.5c3.43 6.99 9.57 11.15 17.7 12.5v-23.43c-5.2-1.12-8.4-3.25-10.92-6.26a17.04 17.04 0 0 1-4.11-11.48v-36.34l-2.62-2.49zm5.22 46.06c2.68 5.18 6.46 9.74 12.43 10.88v6.38c-6.02-1.46-9.58-5-12.43-10.98zm-5.23 0v6.28c-2.85 5.98-6.61 9.52-12.63 10.98v-6.38c5.97-1.14 9.95-5.7 12.63-10.88zm5.23 10.99c2.68 5.18 7.26 8.84 12.43 9.88v6.9c-6.07-1.77-9.58-4.53-12.43-10.5zm-5.23 0v6.27c-2.85 5.98-6.56 8.74-12.63 10.52v-6.9c5.17-1.05 9.95-4.71 12.63-9.9z"]
    }
    let group = MakeSvgElem("g", attrs);
    let otherTr = (otherTransform ? ` ${otherTransform}` : "");
    group.setAttribute("transform", `rotate(${rotation}) scale(${scale/100})${otherTr}`);
    if (!(attrs && "transform-origin" in attrs))
        group.setAttribute("transform-origin", `${x} ${y}`);
    group.classList.add("arrow-hs");

    let headexists = head in heads;
    let stemexists = stem in stems;
    let xy = headexists ? heads[head] : [ctr,ctr,""];

    let arrowhead = MakeSvgElem("path", {
        d:(headexists ? `M${xy[0] - ctr + x} ${xy[1] - ctr + y}${xy[2]}` : ""),
        class:"arrow-head"
    });
    xy = stemexists ? stems[stem] : [ctr,ctr,""];
    let arrowstem = MakeSvgElem("path", {
        d:(stemexists ? `M${xy[0] - ctr + x} ${xy[1] - ctr + y}${xy[2]}` : ""),
        class:"arrow-stem"
    });

    if (stemexists) group.appendChild(arrowstem);
    if (headexists) group.appendChild(arrowhead);
    return group;
}

/**
 * Represents a circular grid to be used in SVGs.
 * All lengths and coordinates are based on the number of rows/columns.
 */
class CircularGrid {
    #columns;
    #rows;
    #innerRadius;
    #stripRadius;
    #insideOut;
    #goAntiClockwise;
    #svgElement;

    /**
     * Returns an object with methods for drawing circular grids.
     * The first column (0-indexed) meets the last column at the positive x half-axis from the centre of the circle.
     * Access the grid SVG element itself through the svgElement property.
     * Requires jquery.
     * @param {Number} columns - number of columns going out from the centre of the circle.
     * @param {Number} rows - number of rows going around the centre of the circle.
     * @param {float} outerRadius - radius of the full grid.
     * @param {float} innerRadius - radius of the circle of negative space inside the grid.
     * @param {Dictionary} attrs - Attributes to set in the group element representing the grid. e.g. {class:"highlightable", fill:"#F00"}.
     * @param {Boolean} insideOut - if true, take the first row (0-indexed) to be the one closest to the origin instead of farthest from it.
     * @param {Boolean} goAntiClockwise - if true, columns go anti-clockwise. Otherwise, they go clockwise.
     */
    constructor(columns, rows, outerRadius = 100, innerRadius = 0, attrs = null, insideOut = false, goAntiClockwise = false) {
        this.#columns = columns;
        this.#rows = rows;
        this.#innerRadius = innerRadius;
        this.#stripRadius = outerRadius - innerRadius;
        this.#insideOut = insideOut;
        this.#goAntiClockwise = goAntiClockwise;
        this.#svgElement = MakeSvgElem("g", attrs);
    }

    get svgElement() {
        return this.#svgElement;
    }

    #transform(x, y) {
        const r = this.#distanceFromOrigin(y);
        const theta = this.#argument(x);
        return `${r * Math.cos(theta)} ${-r * Math.sin(theta)}` // Negate y-coordinate to account for y going down in SVG units.
    }

    #distanceFromOrigin(y) {
        return (this.#insideOut ? y / this.#rows : 1 - y / this.#rows) * this.#stripRadius + this.#innerRadius;
    }

    #argument(x) {
        return Math.PI * 2 * (this.#goAntiClockwise ? x / this.#columns : 1 - x / this.#columns);
    }

    /**
     * Draws a transformed rectangle onto the grid.
     * @param {float} x - x-coordinate of the top-left corner of the rectangle.
     * @param {float} y - y-coordinate of the top-left corner of the rectangle.
     * @param {float} width - width of the rectangle.
     * @param {float} height - height of the rectangle.
     * @param {Dictionary} attrs - Attributes to set in the path element representing the cell. e.g. {class:"highlightable", fill:"#F00"}.
     */
    drawCell(x = 0, y = 0, width = 0, height = 0, attrs = null) {
        const topLeft = this.#transform(x, y);
        const topRight = this.#transform(x + width, y);
        const bottomRight = this.#transform(x + width, y + height);
        const bottomLeft = this.#transform(x, y + height);
        const largeArcFlag = width > this.#columns / 2 ? 1 : 0;
        const sweepFlag = this.#goAntiClockwise ? 0 : 1;
        const outerRadius = this.#distanceFromOrigin(y);
        const innerRadius = this.#distanceFromOrigin(y + height);
        const outerArc = `A${outerRadius} ${outerRadius} 0 ${largeArcFlag} ${sweepFlag} ${topRight}`;
        const innerArc = `A${innerRadius} ${innerRadius} 0 ${largeArcFlag} ${1 - sweepFlag} ${bottomLeft}`;
        const d = `M${topLeft}${outerArc}L${bottomRight}${innerArc}z`;
        const cell = MakeSvgElem("path", {...attrs, d });
        this.#svgElement.append(cell);
    }

    /**
     * Draws the inner circle boundary.
     * @param {Dictionary} attrs - Attributes to set in the circle element. e.g. {class:"highlightable", fill:"#F00"}.
     */
    drawInnerCircle(attrs = { fill: "none", stroke: "#000", "stroke-width": "1" }) {
        this.#svgElement.append(MakeSvgElem("circle", { ...attrs, r: this.#innerRadius }));
    }

    /**
     * Draws the outer circle boundary.
     * @param {Dictionary} attrs - Attributes to set in the circle element. e.g. {class:"highlightable", fill:"#F00"}.
     */
    drawOuterCircle(attrs = { fill: "none", stroke: "#000", "stroke-width": "1" }) {
        this.#svgElement.append(MakeSvgElem("circle", { ...attrs, r: this.#innerRadius + this.#stripRadius }));
    }

    /**
     * Draws a ring. Equivalent to a rectangular cell covering the full width of the grid.
     * @param {float} outerRadius - outer radius of the ring.
     * @param {float} innerRadius - inner radius of the ring. Set to undefined to draw a circle instead of a ring.
     * @param {Dictionary} attrs - Attributes to set in the path element. e.g. {class:"highlightable", fill:"#F00"}.
     */
    drawRing(outerRadius, innerRadius = 0, attrs = { fill: "none", stroke: "#000", "stroke-width": "1" }) {
        const circularArc = (radius) => {
            const scaledRadius = this.#innerRadius + (radius / this.#rows) * this.#stripRadius;
            return `M${scaledRadius} 0A${scaledRadius} ${scaledRadius} 0 1 1 ${-scaledRadius} 0A${scaledRadius} ${scaledRadius} 0 1 1 ${scaledRadius} 0`;
        }
        let d = circularArc(outerRadius);
        if (innerRadius !== undefined)
            d += circularArc(innerRadius);
        this.#svgElement.append(MakeSvgElem("path", { ...attrs, d, "fill-rule": "evenodd" }));
    }

    /**
     * @param {HTMLElement} elem - the element to be inserted.
     * @param {float} x - x-coordinate of the element.
     * @param {float} y - y-coordinate of the element.
     */
    insertElementAt(elem, x, y) {
        const innerG = MakeSvgElem("g", { style: "transform: rotate(90deg)" });
        const outerG = MakeSvgElem("g", { style: `transform: rotate(${-this.#argument(x)}rad) translate(${this.#distanceFromOrigin(y)}px, 0)` });
        innerG.append(elem);
        outerG.append(innerG);
        this.#svgElement.append(outerG);
    }
}