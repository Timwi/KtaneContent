$(function () {
    const grid = $(".pigpen-holder");
    const tl_svg = MakeSvgTag(100,100,2,7).prependTo(grid);
    const rows = 3;
    const cols = 3;
    const w = 13.25;
    const th = 13.25;
    const dw = 9.4;
    const boxes = [0,1,2,1,0];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = MakeSvgElem("rect", {
                class: "highlightable", x:(2+c*w), y:(9.9+r*th),
                width:w, height:th, fill:"transparent"
            });
            tl_svg.append(cell);
        }
        for (let c = 0; c < cols; c++) {
            const cell = MakeSvgElem("rect", {
                class: "highlightable", x:(62.1+c*w), y:(9.9+r*th),
                width:w, height:th, fill:"transparent"
            });
            tl_svg.append(cell);
        }
    }

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
            const l = 21.65 + boxes[r] * -dw;
            const box = MakeSvgElem("path", {
                class: "highlightable",
                d: `M${c*2*dw + l} ${r*dw + 50.25}l${dw} ${dw}l-${dw} ${dw}l-${dw}-${dw}z`,
                fill: "transparent"
            });
            tl_svg.append(box);
            if (c >= boxes[r])
                break;
        }
        for (let c = 0; c < 3; c++) {
            const l = 81.8 + boxes[r] * -dw;
            const box = MakeSvgElem("path", {
                class: "highlightable",
                d: `M${c*2*dw + l} ${r*dw + 50.25}l${dw} ${dw}l-${dw} ${dw}l-${dw}-${dw}z`,
                fill: "transparent"
            });
            tl_svg.append(box);
            if (c >= boxes[r])
                break;
        }
    }
});