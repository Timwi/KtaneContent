const colorSequence = ["RKBKGBGRKG", "BBGKKRKRGB", "KRKGGGRRRB", "RGGBKKKGRG", "RRKBRBGBGK", "GKBRRKBBBG", "RBRBGRBKGK", "GRKBBBRRBG", "KBRRBRGKKB", "BBGBRBRBBR"];
const colorClasses = { K: "black", R: "red", G: "green", B: "blue" };

function setDefaultRules() {
    setTableColors();
}

function setTableColors() {
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const td = document.getElementById(`RGB-${row}${col}`);
            td.className = colorClasses[colorSequence[row][col]];
        }
    }
}

function setRules(rnd) {
    const ColorVenn = "KRGYBMCW";
    const PossibleColors = "KRGB";
    let Answers;
    let AnswerBuilder;
    let AnswerHelper = 0;

    do {
        Answers = [];
        AnswerHelper = 0;
        AnswerBuilder = "";
        for (let row = 0; row < 10; row++) {
            colorSequence[row] = "";
            for (let col = 0; col < 10; col++)
                colorSequence[row] += PossibleColors[rnd.next(0, 4)];
        }
        for (let i = 0; i < 8; i++) {              // Row 1
            for (let j = i + 1; j < 9; j++) {      // Row 2
                for (let k = j + 1; k < 10; k++) { // Row 3
                    for (let l = 0; l < 10; l++) { // Index
                        if (colorSequence[i][l] === 'R' || colorSequence[j][l] === 'R' || colorSequence[k][l] === 'R')
                            AnswerHelper++;
                        if (colorSequence[i][l] === 'G' || colorSequence[j][l] === 'G' || colorSequence[k][l] === 'G')
                            AnswerHelper += 2;
                        if (colorSequence[i][l] === 'B' || colorSequence[j][l] === 'B' || colorSequence[k][l] === 'B')
                            AnswerHelper += 4;
                        AnswerBuilder += ColorVenn[AnswerHelper];
                        AnswerHelper = 0;
                    }
                    Answers.push(AnswerBuilder);
                    AnswerBuilder = "";
                }
            }
        }
    } while (Answers.filter(onlyUnique).length != 120);
    setTableColors();
}

function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}