/**
 * Creates a tag that goes in an <svg> block.
 * @param {string} tag - Type of element.
 * @example text, rect, circle
 * @param {Dictionary} attrs - Attributes to set in the new element.
 * @example {class:"highlightable", r:5, cx:4, cy:12}
 * @returns {HTMLElement} The generated tag with the provided attributes.
 */
 function MakeSvgElem(tag, attrs) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let k in attrs)
        el.setAttribute(k, attrs[k]);
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