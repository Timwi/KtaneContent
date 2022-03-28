function makeSvgElem(tag, attrs) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let k in attrs)
        el.setAttribute(k, attrs[k]);
    return el;
}