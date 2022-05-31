class DungeonMap {
    id = -1;
    static idcounter = 0;
    HTML;

    lastStage = -1;
    lastStrikes = 0;

    constructor(html) {
        this.id = this.idcounter++;
        this.HTML = $(`<div>`)
            .css("background-image", 'url("./img/Dungeon/MapWalls.png")')
            .css("background-repeat", 'no-repeat')
            .css("min-height", '612px')
            .css("color", "#363636")
            .css("font-weight", "bold")
            .css("font-size", "larger")
            .appendTo(
                html.css("background-image", 'url("./img/Dungeon/Map.png")')
                    .css("background-repeat", 'no-repeat')
                    .css("min-height", '612px')
            );
        for (let i = 1; i <= 15; ++i) {
            this.HTML.append(
                $(`<div>`)
                    .css("position", "absolute")
                    .css("left", this.getLeft(i))
                    .css("top", this.getTop(i))
                    .css("min-width", "80px")
                    .css("min-height", "55px")
            );
        }

        this.HTML.append($(`<div>`)).append($(`<div>`));
    }

    getLeft(i) {
        switch (i) {
            case 1:
                return "85px";
            case 2:
                return "185px";
            case 3:
                return "280px";
            case 4:
                return "280px";
            case 5:
                return "180px";
            case 6:
                return "85px";
            case 7:
                return "90px";
            case 8:
                return "180px";
            case 9:
                return "275px";
            case 10:
                return "270px";
            case 11:
                return "275px";
            case 12:
                return "185px";
            case 13:
                return "165px";
            case 14:
                return "70px";
            case 15:
                return "100px";
        }
    }

    getTop(i) {
        switch (i) {
            case 1:
                return "100px";
            case 2:
                return "135px";
            case 3:
                return "100px";
            case 4:
                return "215px";
            case 5:
                return "205px";
            case 6:
                return "190px";
            case 7:
                return "300px";
            case 8:
                return "280px";
            case 9:
                return "295px";
            case 10:
                return "380px";
            case 11:
                return "460px";
            case 12:
                return "435px";
            case 13:
                return "360px";
            case 14:
                return "390px";
            case 15:
                return "465px";
        }
    }

    getEnemyLeft(i) {
        switch (i) {
            case 1:
                return "155px";
            case 2:
                return "220px";
            case 3:
                return "300px";
            case 4:
                return "255px";
            case 5:
                return "155px";
            case 6:
                return "100px";
            case 7:
                return "160px";
            case 8:
                return "255px";
            case 9:
                return "300px";
            case 10:
                return "300px";
            case 11:
                return "255px";
            case 12:
                return "215px";
            case 13:
                return "145px";
            case 14:
                return "130px";
        }
    }

    getEnemyTop(i) {
        switch (i) {
            case 1:
                return "130px";
            case 2:
                return "95px";
            case 3:
                return "170px";
            case 4:
                return "220px";
            case 5:
                return "215px";
            case 6:
                return "260px";
            case 7:
                return "305px";
            case 8:
                return "300px";
            case 9:
                return "355px";
            case 10:
                return "430px";
            case 11:
                return "460px";
            case 12:
                return "410px";
            case 13:
                return "395px";
            case 14:
                return "440px";
        }
    }

    addStageData(stage, roll, level) {
        this.lastStage = stage;
        this.lastStageStrikes = 0;

        this.HTML.children(`:nth-child(${stage})`)
            .append(
                $(`<div>`)
                    .css("margin", "auto")
                    .css("width", "min-content")
                    .css("padding-top", "3px")
                    .css("padding-right", "10px")
                    .append(
                        $(`<div>`)
                            .css("background-image", 'url("./img/Dungeon/Die.png")')
                            .css("background-repeat", 'no-repeat')
                            .css("width", "min-content")
                            .append(
                                $(`<p>${roll}</p>`)
                                    .css("margin", "0 0 0 25px")
                                    .css("width", "min-content")
                            )
                    )
                    .append(
                        $(`<div>`)
                            .css("background-image", 'url("./img/Dungeon/Stairs.png")')
                            .css("background-repeat", 'no-repeat')
                            .css("background-size", "auto 100%")
                            .css("width", "min-content")
                            .append(
                                $(`<p>${level}</p>`)
                                    .css("margin", "0 0 0 25px")
                                    .css("width", "min-content")
                            )
                    )
            );
    }

    addFight(enemy) {
        let info;

        let show = () => {
            info.fadeIn();
        };
        let hide = () => {
        };

        let show2 = () => {
        };
        let hide2 = () => {
            info.fadeOut();
        };

        $(`<div>`)
            .css("position", "absolute")
            .css("left", this.getEnemyLeft(this.lastStage))
            .css("top", this.getEnemyTop(this.lastStage))
            .append(
                $(`<img src="./img/Dungeon/WarnK.png">`)
                    .hover(show, hide)
            )
            .appendTo(this.HTML.children(":nth-child(16)"));

        this.HTML.children(":nth-child(17)")
            .append(
                $(`<div>`)
                    .css("position", "absolute")
                    .css("left", this.getEnemyLeft(this.lastStage))
                    .css("top", this.getEnemyTop(this.lastStage))
                    .append(
                        info =
                        $(
                            `<div style="background-color: #ddd; border-radius: 5px; text-align: center; padding: 15px;">
                                <p style="margin: auto;">${enemy}</p>
                            </div>`
                        )
                            .hover(show2, hide2)
                    )
            );

        info.fadeOut(0);
    }

    addNum(num) {
        this.HTML
            .children(":nth-child(17)")
            .children(":last-child")
            .children(":first-child")
            .append($(
                `<p style="margin: auto;">(${num})</p>`
            ));
    }

    addStrike(reason) {
        this.HTML
            .children(":nth-child(17)")
            .children(":last-child")
            .children(":first-child")
            .append($(
                `<p style="margin: auto; color: red;">${reason}</p>`
            ));
        this.HTML
            .children(":nth-child(16)")
            .children(":last-child")
            .children(":first-child")
            .prop("src", "./img/Dungeon/Warn.png");
    }

    addMoveStrike() {
        if (this.lastStageStrikes == 0) {
            this.HTML
                .children(`:nth-child(${this.lastStage})`)
                .children(`:first-child`)
                .css("transform", "scale(.8) translate(0, -10px)")
                .append(
                    $(`<div>`)
                        .css("background-image", 'url("./img/Dungeon/X.png")')
                        .css("background-repeat", 'no-repeat')
                        .css("background-size", "auto 100%")
                        .css("width", "min-content")
                        .append(
                            $(`<p>${++this.lastStageStrikes}</p>`)
                                .css("margin", "0 0 0 25px")
                                .css("width", "min-content")
                                .css("color", "red")
                        )
                );
        }
        else {
            this.HTML
                .children(`:nth-child(${this.lastStage})`)
                .children(`:first-child`)
                .children(`:last-child`)
                .children(`:first-child`)
                .text(`${++this.lastStageStrikes}`);
        }
    }
}