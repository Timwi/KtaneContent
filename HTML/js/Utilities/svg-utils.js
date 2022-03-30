function makeSvgElem(tag, attrs) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let k in attrs)
        el.setAttribute(k, attrs[k]);
    return el;
}

function hexagonPathV(x, y, side) {
    let dx = Math.round(1000 * side * 0.8660254) / 1000.0;
    let dy = Math.round(1000 * side * 0.5) / 1000.0;
    let tx = Math.round(1000 * x) / 1000.0;
    let ty = Math.round(1000 * y) / 1000.0;
    return `M${tx} ${ty}l${dx}-${dy}l${dx} ${dy}v${side}l-${dx} ${dy}l-${dx}-${dy}z`;
}
function hexagonPathH(x, y, side) {
    let dx = Math.round(1000 * side * 0.5) / 1000.0;
    let dy = Math.round(1000 * side * 0.8660254) / 1000.0;
    let tx = Math.round(1000 * x) / 1000.0;
    let ty = Math.round(1000 * y) / 1000.0;
    return `M${tx} ${ty}h${side}l${dx} ${dy}l-${dx} ${dy}h-${side}l-${dx}-${dy}z`;
}