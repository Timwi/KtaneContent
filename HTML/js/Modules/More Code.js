const labels = [
    { text: "Dit", path: "M-7-7h14v14h-14z", offset: 0 },
    { text: "Dot", path: "M0-7a7 7 0 0 0 0 14a7 7 0 0 0 0-14", offset: 0 },
    { text: "Dah", path: "M-7-7h36v14h-36z", offset: -11 },
    { text: "Dash", path: "M22-7a7 7 0 0 1 0 14h-22a7 7 0 0 1 0-14z", offset: -11 },
];

const moreCodes = {
    A: "dot dash dot dit dot",
    B: "dah",
    C: "dah dit dit",
    D: "dah dit dash",
    E: "dot dit dot dash dah",
    F: "dash dot dash",
    G: "dot",
    H: "dit dot dot",
    I: "dah dash dash dah dit",
    J: "dah dot dit",
    K: "dit",
    L: "dah dash dit dah",
    M: "dit dit dot",
    N: "dash dash dot dah",
    O: "dash dash dash dash dash",
    P: "dash",
    Q: "dah dah dot",
    R: "dit dash dash dah",
    S: "dash dit dah dah",
    T: "dah dot dit dit",
    U: "dah dah dah dah dah",
    V: "dah dit",
    W: "dit dah",
    X: "dah dot",
    Y: "dash dit",
    Z: "dit dah dash",
};

$(() => {
    const diagram = MakeSvgTag(600, 370, 0, 0, { "font-size": "20px", "text-anchor": "middle", "dominant-baseline": "mathematical", "font-family": "Special Elite", "style": "user-select:none;pointer-events:none" }).appendTo($(".more-diagram"));
    const defs = MakeSvgElem("defs");
    diagram.append(defs);

    for (const ix in labels) {
        const x = 30 + 180 * ix;
        const id = labels[ix].text.toLowerCase();
        defs.append(MakeSvgElem("path", { d: labels[ix].path, id: id }, labels[ix].text));
        diagram.append(MakeSvgElem("text", { x: x, y: 15 }, labels[ix].text));
        diagram.append(MakeSvgElem("use", { transform: `translate(${x + labels[ix].offset}, 35)`, href: `#${id}` }));
    }

    const alphabet = Object.keys(moreCodes).join("");
    for (const pos in alphabet) {
        const x = 40 + 280 * Math.floor(pos / 13);
        const y = 70 + (pos % 13 * 24);
        diagram.append(MakeSvgElem("text", { x: x, y: y }, alphabet.charAt(pos)));

        const symbols = moreCodes[alphabet.charAt(pos)].split(" ");
        let xOffset = 0;
        for (const symbol in symbols) {
            const id = symbols[symbol];
            diagram.append(MakeSvgElem("use", { transform: `translate(${x + (xOffset + 1) * 22 + symbol * 5}, ${y})`, href: `#${id}` }))
            xOffset += id === "dash" || id === "dah" ? 2 : 1;
        }
    }
});