var voidPatterns = [[1, 6, 8, 15, 18, 21, 27, 28, 35, 36, 42, 45, 48, 55, 57, 62], // corners and X
[9, 17, 18, 21, 22, 25, 26, 29, 30, 31, 37, 38, 39, 42, 43, 46, 47, 48, 49, 50, 51, 56, 57], // big blobs
[4, 6, 12, 13, 14, 20, 22, 25, 26, 27, 30, 33, 36, 37, 38, 41, 43, 49, 50, 51, 57, 59], // Underground tunnels
[0, 1, 3, 8, 9, 11, 12, 15, 20, 22, 23, 30, 33, 34, 35, 36, 47, 49, 50, 51, 55, 57, 62, 63], // Tetris Pieces
[1, 4, 5, 10, 11, 16, 17, 19, 28, 31, 32, 37, 39, 41, 46, 49, 54, 55, 58, 61], // cracks in reality
[1, 2, 8, 11, 16, 19, 21, 22, 23, 25, 26, 29, 31, 37, 38, 39, 43, 50, 52, 59], // Bubbles!!
[5, 12, 13, 20, 27, 28, 33, 34, 35, 36, 40, 41, 44, 45, 54, 55, 63], // windmill
[3, 4, 10, 13, 14, 18, 23, 27, 28, 30, 37, 44, 45, 50, 51, 52, 54, 57, 60, 63], // Torterra Tree
[2, 5, 7, 9, 10, 11, 12, 14, 17, 19, 30, 36, 37, 39, 41, 46, 48, 50, 51, 57], // Infernape Flame
[1, 8, 9, 10, 12, 17, 18, 21, 27, 30, 33, 36, 38, 42, 45, 46, 51, 52, 53], // Empoleon Trident
[2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62]]; // Dots all Around

var treasurePatterns = [[1, 2, 3, 8, 9, 10, 11, 12, 16, 20, 27, 28, 34, 35 ], // a croissant
[0, 2, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 25, 27 ], // a horizontal zig-zag line
[0, 8, 9, 10, 12, 16, 18, 19, 20, 27, 28 ], // a distorted dumbbell
[2, 9, 10, 11, 17, 19, 20, 24, 25, 27, 28, 32, 33, 34, 35, 41, 42, 43 ], // an elongated donut
[4, 10, 12, 16, 18, 19, 20, 24, 25, 26, 27, 28, 32, 33, 34, 35 ],  // a distorted W
[2, 4, 10, 11, 12, 16, 19, 24, 25, 26, 27, 33, 34, 35 ], // a whale with a big tail
[0, 8, 9, 16, 17, 19, 24, 25, 26, 27, 32, 35, 42, 43 ], // a castle with two towers
[1, 8, 9, 16, 17, 18, 25, 26, 34, 35, 42, 43 ], // a backslash
[1, 9, 10, 16, 17, 18, 19, 24, 32, 33, 34, 41 ], // a cent symbol
[0, 8, 9, 17, 18, 24, 25, 26, 27, 34, 35, 41, 42 ], // a crooked 3
[0, 1, 5, 6, 9, 10, 11, 12, 13, 16, 17, 21, 22 ], // an open spanner/wrench
[0, 2, 4, 9, 10, 11, 12, 16, 17, 18, 19, 26, 27, 33, 36 ], // a spiky ball
[0, 3, 8, 9, 10, 11, 17, 19, 20, 24, 25, 26, 27, 35 ], // a turtle pointing right
[2, 4, 11, 12, 16, 17, 18, 19, 24, 25, 26, 32, 34 ], // a raindeer looking to the right
[2, 3, 10, 11, 12, 17, 18, 20, 24, 25, 26, 33, 34 ], // a music note
[1, 8, 10, 13, 16, 17, 20, 22, 29, 30 ], // a pair of rings
[1, 2, 3, 8, 12, 16, 20, 25, 27, 34, 35, 36, 43, 44]]; // a necklace

var treasureSizes = [5, 5, 5, 4, 5, 4, 5, 6, 5, 5, 5, 5, 4, 6, 4, 6, 4, 6, 4, 6, 7, 3, 5, 5, 5, 5, 5, 5, 5, 5, 7, 4, 5, 6];
var selectedVoids = [0,1,2,3];
var selectedTreasures = [0,1,2,3,4,5,6,7,8,9];

function setRules(rnd){
    var possibleVoids = [0,1,2,3,4,5,6,7,8,9,10];
    var possibleTreasures = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    rnd.shuffleFisherYates(possibleVoids);
    rnd.shuffleFisherYates(possibleTreasures);
    selectedVoids = possibleVoids.slice(0,4);
    selectedTreasures = possibleTreasures.slice(0,10);
    showVoidsAndTreasures();
}

function setDefaultRules(){
    selectedVoids = [0,1,2,3];
    selectedTreasures = [0,1,2,3,4,5,6,7,8,9];
    showVoidsAndTreasures();
}

function showVoidsAndTreasures(){
    var voidTables = document.getElementsByClassName("underground-voids");
    var treatureTable = document.getElementsByClassName("underground-items");

    for (var i = 0; i < 4; i ++) {
        var selectedVoid = voidPatterns[selectedVoids[i]];
        voidTables[i].innerHTML = "<tr><td colspan=\"8\">" + StonePlate.IndicatorNumber(i) + "</td></tr>";
        var nextCellIndex = 0;
        for (var j = 0; j < 8; j++) {
            var newRow = voidTables[i].insertRow();
            for (var k = 0; k < 8; k++) {
                var cell = newRow.insertCell(k);
            }
        }
        for (var j = 0; j < selectedVoid.length; j ++) {
            var cellToEdit = selectedVoid[j];
            var row = Math.floor(cellToEdit/8)+1;
            var column = cellToEdit%8;
            voidTables[i].rows[row].cells[column].classList.add("void");
        }
    }

    for (var i = 0; i < 10; i ++) {
        var selectedTreasureIndex = selectedTreasures[i];
        var selectedTreasure = treasurePatterns[selectedTreasureIndex];
        var width = treasureSizes[selectedTreasureIndex*2];
        var height = treasureSizes[selectedTreasureIndex*2 + 1];
        treatureTable[i].innerHTML = "";
        for (var j = 0; j < height; j++) {
            var newRow = treatureTable[i].insertRow();
            for (var k = 0; k < width; k++)
            {
                newRow.insertCell(0);
            }
        }
        for (var j = 0; j < selectedTreasure.length; j ++) {
            var cellToEdit = selectedTreasure[j];
            var row = Math.floor(cellToEdit/8);
            var column = cellToEdit%8;
            treatureTable[i].rows[row].cells[column].classList.add("treasure");
        }
    }
}