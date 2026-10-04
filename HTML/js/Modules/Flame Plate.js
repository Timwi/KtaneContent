var shuffledTable = [];
var movementsOrder = [];
var startingCellIndex;

function setRules(rnd){
    shuffledTable = "1631792938217526429343865177429513846154782563986962541737431769258516894732862754389913716792".split('');
    rnd.shuffleFisherYates(shuffledTable);
    shuffledTable.push("4", "8", "5");
    shuffledTable.unshift("4", "8", "5");
	
	// 0,1,2,3 must follow each other in order to keep the Vortex / Storm feel
	// But it can start at any index, and go up OR down the original order!
	var m = rnd.next(0,4);
	var o = rnd.next(0,2) == 0;
	movementsOrder = [m];
	for (var i = 0; i < 3; i ++){
		m = (m + (o ? 1 : 3) )%4;
		movementsOrder.push(m);
	}
	
	// Start somewhere in the middle, in the middle 8x8 square at least
	possibleStartingLocations = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 51, 52, 53, 54, 55, 56, 57, 58, 61, 62, 63, 64, 65, 66, 67, 68, 71, 72, 73, 74, 75, 76, 77, 78, 81, 82, 83, 84, 85, 86, 87, 88];
	startingCellIndex = possibleStartingLocations[rnd.next(0, 64)];	
	
    showData();
}

function setDefaultRules(){
    shuffledTable = "4851631792938217526429343865177429513846154782563986962541737431769258516894732862754389913716792485".split('');
    movementsOrder = [0, 1, 2, 3];
	startingCellIndex = 23;
	showData();
}

function showData(){
	var cells = document.querySelectorAll(".table-magma td");
    for (var i = 0; i < 100; i ++){
		cells[i].innerText = shuffledTable[i];
		if (i == startingCellIndex){
			cells[i].setAttribute("class", "starting-cell");
		}
		else {
			cells[i].removeAttribute("class");
		}
	}
	
	var passcode = document.querySelector(".passcode");
    var key = shuffledTable[startingCellIndex];
    passcode.innerText = key.repeat(8);
	
	var movementsData = document.querySelectorAll(".movements-data li");
	for (var i = 0; i < 4; i++){
		movementsData[i].innerHTML = FlamePlate.Movements[movementsOrder[i]];
		movementsData[i + 4].innerHTML = FlamePlate.Movements[movementsOrder[i]]; // order reminder on Page 2
	}		
}