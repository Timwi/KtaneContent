$(function() {
    let offs = 42.5;
    let wid = 85;
    $(".shapes").each((g, el) => {
        let grid = shapeData[g];
        let svg = MakeSvgTag(325, 325, -20, -20, {class:"grid"}).appendTo(el);
        for (let i = 0; i < 9; i++) {
            let x = i % 3, y = Math.floor(i / 3);
            let desc = grid[i];
            if (!grid.ex.includes(i)) {
                let descs = (desc ? desc[0].split(" ") : []);
                let sqColor = (desc && descs[1] == "squ" ? descs[0] : "white");
                let square = MakeSvgElem("rect", { class:sqColor, x:(x*100), y:(y*100), width:wid, height:wid })
                svg.append(square);
            }
            for (let sh = 0; desc && sh < desc.length; sh++) {
                let descs = desc[sh].split(" ");
                if (descs[1] == "tri" || descs[1] == "dia") {
                    let yoff = (descs[1] == "tri" ? offs + 8 : offs);
                    let shape = RegularPolygon(33, x*100 + offs, y*100  + yoff, descs[1] == "tri" ? 3 : 4, 0, { class:`shape ${descs[0]}` });
                    svg.append(shape);
                }
                else if (descs[1] == "cir") {
                    let shape = MakeSvgElem("circle", { class:`shape ${descs[0]}`, cx:(x*100 + offs), cy:(y*100 + offs), r:33 });
                    svg.append(shape);
                }
                else if (descs[1] == "x") {
                    let shape = MakeSvgElem("path", { class:`shape ${descs[0]}`, d:`M${x*100} ${y*100}l${wid} ${wid}M${x*100+wid} ${y*100}l-${wid} ${wid}`});
                    svg.append(shape);
                }
            }
        }
    });
});