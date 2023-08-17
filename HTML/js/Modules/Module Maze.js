$(() => {
    $(".mod-maze").each((_, maze) => {
        maze.append(MakeSvgElem("image", { href: "img/Module Maze/Modules.png", width: 20, height: 20, opacity: .5 }));
        for (let row = 0; row < 20; row++)
            for (let col = 0; col < 20; col++)
                maze.append(MakeSvgElem("rect", { class: "highlightable", x: col, y: row, width: 1, height: 1 }));
        maze.append(MakeSvgElem("image", { href: "img/Module Maze/Maze Walls.svg", x: -.1, y: -.1, width: 20.2, height: 20.2, class: "invertible" }));
    });
});