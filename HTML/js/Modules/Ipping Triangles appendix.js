$(() => {
    const appendix = $("div.triangles-appendix");
    $("<h2>").text(appendixHeader).appendTo(appendix);
    for (const entryData of appendixEntries) {
        const entry = $("<div>").addClass("family").appendTo(appendix);
        $("<div>").addClass("component").appendTo(entry).append($("<img>").attr("src", `img/ipping Triangles/${entryData.name}.svg`));
        $("<div>").addClass("explanation").text(entryData.explanation).appendTo(entry);
        if (entryData.translation)
            $("<div>").addClass("link").appendTo(entry).append($("<a>").attr("href", entryData.translation.link).text(`${entryData.translation.name} (${entryData.name} Triangles)`));
        else
            $("<div>").addClass("link").appendTo(entry).append($("<a>").attr("href", `${entryData.name} Triangles.html`).text(`${entryData.name} Triangles`));
    }
});