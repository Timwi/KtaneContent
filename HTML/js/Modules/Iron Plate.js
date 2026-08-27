
var placementsX = [160, 213, 266, 319, 134, 186, 239, 292, 345, 107, 160, 213, 266, 319, 372, 81, 134, 186,
239, 292, 345, 398, 107, 160, 213, 266, 319, 372, 134, 186, 239, 292, 345, 160, 213, 266, 319];
var placementsY = [77, 77, 77, 77, 124, 124, 124, 124, 124, 170, 170, 170, 170, 170, 170, 216, 216, 216, 216,
216, 216, 216, 262, 262, 262, 262, 262, 262, 307, 307, 307, 307, 307, 353, 353, 353, 353];
var selectedConditions = ["e", "e", "e", "e", "e", "e", "e"];
var selectedPlacements = [0,1,2,3,4,5,6];

function setRules(rnd){
    var possibleConditions = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    var possiblePlacements = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36];
    rnd.shuffleFisherYates(possibleConditions);
    rnd.shuffleFisherYates(possiblePlacements);
    selectedConditions = possibleConditions.slice(0,7);
    selectedPlacements = possiblePlacements.slice(0,7);
    showConditions();
}

function setDefaultRules(){
    selectedConditions = [0, 4, 13, 16, 2, 11, 14];
    selectedPlacements = [3, 5, 9, 20, 24, 28, 35];
    showConditions();
}

function showConditions(){
    var voidHtmlLocation = document.getElementsByClassName("void-data")[0];
    while (voidHtmlLocation.firstChild){
        voidHtmlLocation.removeChild(voidHtmlLocation.firstChild);
    }
    for (var i = 0; i < 7; i ++){
        var splitText = IronPlate.Conditions[selectedConditions[i]].split(" ");
        if (splitText.length == 2){
            voidHtmlLocation.appendChild(createText(i, -1, splitText[0]));
            voidHtmlLocation.appendChild(createText(i, 9, splitText[1]));
        }
        else{
            voidHtmlLocation.appendChild(createText(i, -6, splitText[0]));
            voidHtmlLocation.appendChild(createText(i, 3, splitText[1]));
            voidHtmlLocation.appendChild(createText(i, 12, splitText[2]));
        }
    }
}

function createText(i, yOffset, text){
    var createdText = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    createdText.setAttribute("x", placementsX[selectedPlacements[i]]);
    createdText.setAttribute("y", placementsY[selectedPlacements[i]] + yOffset);
    createdText.textContent = text;
    return createdText;
}