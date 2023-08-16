$(function() {
    const interactive = $("table.interactive");
    let saveStates = [];
    let currentState = 0;

    function removeFutureSaves() {
        if (currentState < saveStates.length - 1) {
            for (let i = currentState + 1; i < saveStates.length; i++) {
                saveStates[i].remove();
            }

            saveStates.splice(currentState + 1, saveStates.length - currentState);
        }
    }

    for (let y = 0; y < 9; y++) {
        const row = $("<tr>").appendTo(interactive);
        for (let x = 0; x < 7; x++) {
            if (x == 0 && y == 0) {
                $("<th>").appendTo(row);
            } else if (y == 0 && x > 0) {
                $("<th>").text(String.fromCharCode(64 + x)).appendTo(row);
            } else if (y > 0 && x == 0) {
                $("<th>").text(y).appendTo(row);
            } else {
                $("<td>").click(function() {
                    $(this).toggleClass("white");
                    removeFutureSaves();
                }).contextmenu(function() {
                    $(this).toggleClass("dot");
                    removeFutureSaves();
                    return false;
                }).append('<div class="box"></div>').appendTo(row);
            }
        }
    }

    $("button.reset").click(function() {
        $("table.interactive td").removeClass("white dot");
        saveStates.forEach(x => x.remove());
        saveStates = [];
        currentState = 0;
    });

    $("button.reset-grid").click(function() {
        $("table.interactive td").removeClass("white dot");
    });

    $("button.save").click(function() {
        removeFutureSaves();

        let saveState = Array.from($("table.interactive td")).map(x => $(x)).map(x => x.attr("class") || "");
        console.log(saveStates);
        let stateNumber = saveStates.length;
        currentState = stateNumber;

        let button = $("<button>").text(stateNumber + 1).click(function() {
            $("table.interactive td").each((i, x) => $(x).attr("class", saveState[i]));
            currentState = stateNumber;
        }).appendTo(".saves");

        saveStates.push(button);
    });
});