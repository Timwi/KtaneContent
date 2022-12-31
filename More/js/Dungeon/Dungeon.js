class DungeonMap {
    id = -1;
    static idcounter = 0;
    HTML;

    lastStage = -1;
    lastStrikes = 0;

    constructor(html) {
        this.id = this.idcounter++;
        this.HTML = $(`<div>`).addClass('walls') .appendTo( html.addClass('dungeon-map') );
        for (let i = 1; i <= 15; ++i) {
            this.HTML.append(
                $(`<div>`).addClass('stage')
                    .css("left", this.getLeft(i))
                    .css("top", this.getTop(i))
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
                $(`<div>`).addClass('stage-info')
                    .append(
                        $(`<div>`).addClass('die')
                            .append($(`<p>${roll}</p>`).addClass('value')))
                    .append( 
						$(`<div>`).addClass('stairs')
							.append( $(`<p>${level}</p>`).addClass('value')))
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

        $(`<div>`).addClass('enemy-encounter')
            .css("left", this.getEnemyLeft(this.lastStage))
            .css("top", this.getEnemyTop(this.lastStage))
            .append(
                $(`<img src="./img/Dungeon/WarnK.png">`)
                    .hover(show, hide)
            )
            .appendTo(this.HTML.children(":nth-child(16)"));

        this.HTML.children(":nth-child(17)")
            .append(
                $(`<div>`).addClass('enemy-encounter')
                    .css("left", this.getEnemyLeft(this.lastStage))
                    .css("top", this.getEnemyTop(this.lastStage))
                    .append(
                        info =
                        $(`<div> <p class='label'>${enemy}</p> </div>`).addClass('enemy-popup')
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
                `<ps>(${num})</p>`
            ).addClass('label'));
    }

    addStrike(reason) {
        this.HTML
            .children(":nth-child(17)")
            .children(":last-child")
            .children(":first-child")
            .append($(
                `<p>${reason}</p>`
            ).addClass('label').addClass('strike'));
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
				.addClass('struck-stage')
                .append(
                    $(`<div>`).addClass('strike-indicator')
                        .append(
                            $(`<p>${++this.lastStageStrikes}</p>`).addClass('strike-count')
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