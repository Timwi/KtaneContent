let possibleXorGrids = ["..X...XXX.X.X.X", ".XXX.X...X.XXX.", "X.X.X.X.X.X.X.X", "XX.XX..X...X.X.", "..X..XX.XXX...X", "X.X.XX...XX.X.X", "X..X.X.XXXX..X.", "XX.XX.....XX.XX", "XX....XXX....XX"];

var selectedOrderRules = [];
var selectedPriorityOrder = [];
var RCipherUseRegularOrder = true;
var selectedRCipherLocations = [];
var selectedISpotOrder = [];
var selectedEGridIndex;
var selectedDCipherRules = [];
var selectedDGridIndex;
var selectedDCipherArguments = [];


function setRules(rnd){
	var rules = rnd.shuffleFisherYates([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	for (var i = 0; i < 5; i ++){
		selectedOrderRules[i] = GiantsCipher.OrderRules[rules[i]];
	}
	
	selectedPriorityOrder = rnd.shuffleFisherYates(["R", "I", "S", "E", "D"]);
	
	RCipherUseRegularOrder = rnd.next(0, 2) == 0;
	var rLocations = rnd.shuffleFisherYates([0, 1, 2, 3]);
	selectedRCipherLocations = [GiantsCipher.RCipherReplacementLocation[rLocations[0]], GiantsCipher.RCipherReplacementLocation[rLocations[1]]];
	
	selectedISpotOrder = rnd.shuffleFisherYates([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
	selectedISpotOrder = selectedISpotOrder.slice(0, 8);
		
	var XorGrids = rnd.shuffleFisherYates([0, 1, 2, 3, 4, 5, 6, 7, 8]);
	selectedEGridIndex = XorGrids[0];
	selectedDGridIndex = XorGrids[1];
	
	selectedDCipherRules = rnd.shuffleFisherYates([0, 1, 2, 3, 5, 6]);
	// since "inverse of step 1" step can't happen if step 1 hasn't happened yet, we can only insert it afterwards it appears
	selectedDCipherRules.splice(rnd.next(selectedDCipherRules.indexOf(0) + 1, selectedDCipherRules.length), 0, 4);
	selectedDCipherArguments = [];
	
	var stepTypeOneAmount;
	var stepTypeOneDirection;
	
	for (var i = 0; i < 5; i ++){
		switch (selectedDCipherRules[i]){
			case 0:
				stepTypeOneDirection = rnd.next(0, 2) == 0;
				stepTypeOneAmount = rnd.next(0, 5);
				selectedDCipherArguments.push(GiantsCipher.PossibleClockDirections[stepTypeOneDirection ? 0 : 1]);
				selectedDCipherArguments.push(GiantsCipher.PossibleNumberAmount[stepTypeOneAmount]);
				selectedDCipherArguments.push(CoordFromClockRot(stepTypeOneDirection ? 0 : 1, stepTypeOneAmount + 1, 0));
				selectedDCipherArguments.push(CoordFromClockRot(stepTypeOneDirection ? 0 : 1, stepTypeOneAmount + 1, 10));
				selectedDCipherArguments.push(CoordFromClockRot(stepTypeOneDirection ? 0 : 1, stepTypeOneAmount + 1, 5));
				break;
			case 1:
				selectedDCipherArguments.push(GiantsCipher.PossibleOrdinal[rnd.next(0, 3)]);
				selectedDCipherArguments.push(GiantsCipher.PossibleHorizontalDirection[rnd.next(0, 2)]);
				break;
			case 2:
				break;
			case 3:
				var squares = [["A", "B", "C"], ["B", "C", "D"], ["C", "D", "E"]];
				var selection = rnd.next(0, 3);
				selectedDCipherArguments.push(squares[selection][0]);
				selectedDCipherArguments.push(squares[selection][1]);
				selectedDCipherArguments.push(squares[selection][2]);
				selectedDCipherArguments.push(rnd.next(1,4) * 90);
				break;
			case 4:
				selectedDCipherArguments.push(selectedDCipherRules.indexOf(0) + 1);
				selectedDCipherArguments.push(GiantsCipher.PossibleClockDirections[stepTypeOneDirection ? 1 : 0]);
				selectedDCipherArguments.push(GiantsCipher.PossibleNumberAmount[stepTypeOneAmount]); // move same amount as "step 1"
				break;
			case 5:
				selectedDCipherArguments.push(GiantsCipher.PossibleVerticalDirection[rnd.next(0, 2)]);
				selectedDCipherArguments.push(GiantsCipher.PossibleNumberAmount[rnd.next(0, 2)]);
				break;
			case 6:
				selectedDCipherArguments.push(GiantsCipher.PossibleFlipDirection[rnd.next(0, 2)]);
				break;
		}
	}

	showData();
}


function CoordFromClockRot(useClockwise, amount, startCell){
	let clockOrder = ["A1", "B1", "C1", "D1", "E1", "E2", "E3", "D3", "C3", "B3", "A3", "A2"];
	if (useClockwise == false) {amount = 12 - amount;}
	
	amount = (startCell + amount) % 12;
	return clockOrder[amount];
}



function setDefaultRules(){
	selectedOrderRules = [GiantsCipher.OrderRules[0], GiantsCipher.OrderRules[1], GiantsCipher.OrderRules[2], GiantsCipher.OrderRules[3], GiantsCipher.OrderRules[4]];
	selectedPriorityOrder = ["R", "I", "S", "E", "D"];
	
	RCipherUseRegularOrder = true;
	selectedRCipherLocations = [GiantsCipher.RCipherReplacementLocation[0], GiantsCipher.RCipherReplacementLocation[3]];
	
	selectedISpotOrder = [0, 11, 13, 4, 2, 5, 9, 12];
	
	selectedEGridIndex = 0;
	
	selectedDGridIndex = 1;
	selectedDCipherRules = [0, 1, 2, 3, 4];
	selectedDCipherArguments = [
		GiantsCipher.PossibleClockDirections[0],
		GiantsCipher.PossibleNumberAmount[2],
		CoordFromClockRot(true, 3, 0), CoordFromClockRot(true, 3, 10), CoordFromClockRot(true, 3, 5),
		GiantsCipher.PossibleOrdinal[1],
		GiantsCipher.PossibleHorizontalDirection[0],
		"B", "C", "D", 180,
		1, GiantsCipher.PossibleClockDirections[1],
		GiantsCipher.PossibleNumberAmount[2]
	];
	
	showData();
}

function showData(){
	var orderData = document.querySelectorAll(".order-data");
	for (var i = 0; i < 5; i ++){
		orderData[i].textContent = selectedOrderRules[i];
	}
	
	document.querySelector(".order-tie-data").textContent = selectedPriorityOrder.join(", ");
	
	var RCipherRangeData = document.querySelectorAll(".r-cipher-range");
	RCipherRangeData[0].textContent = RCipherUseRegularOrder ? GiantsCipher.AmRange : GiantsCipher.NzRange;
	RCipherRangeData[1].textContent = RCipherUseRegularOrder ? GiantsCipher.NzRange : GiantsCipher.AmRange;
	
	var RCipherColumnsData = document.querySelectorAll(".r-cipher-columns");
	RCipherColumnsData[0].textContent = selectedRCipherLocations[0];
	RCipherColumnsData[1].textContent = selectedRCipherLocations[1];
	
	var ICipherCells = document.querySelectorAll(".i-cipher-table td");
	for (var i = 0; i < 15; i ++){
		if (selectedISpotOrder.includes(i)){
			ICipherCells[i].textContent = selectedISpotOrder.indexOf(i) + 1;
		}
		else{
			ICipherCells[i].textContent = '.';
		}
	}
	
	var ECipherCells = document.querySelectorAll(".e-cipher-table td");
	for (var i = 0; i < 15; i ++){
		ECipherCells[i].textContent = possibleXorGrids[selectedEGridIndex][i];
	}
	
	var DCipherStepListElements = document.querySelectorAll(".d-cipher-steps li");
	var DCipherPayloadsIndex = 0;
	
	for (var i = 0; i < 5; i ++){
		var createdStep = `<b>${GiantsCipher.DCipherStep(i+1)}</b>`;
		
		switch (selectedDCipherRules[i]){
			case 0:
				createdStep += GiantsCipher.DCipherRule1(selectedDCipherArguments[DCipherPayloadsIndex], selectedDCipherArguments[DCipherPayloadsIndex+1], selectedDCipherArguments[DCipherPayloadsIndex+2], selectedDCipherArguments[DCipherPayloadsIndex+3], selectedDCipherArguments[DCipherPayloadsIndex+4]);
				DCipherPayloadsIndex += 5;
				DCipherStepListElements[i].innerHTML = createdStep;
				break;
			case 1:
				createdStep += GiantsCipher.DCipherRule2(selectedDCipherArguments[DCipherPayloadsIndex], selectedDCipherArguments[DCipherPayloadsIndex+1]);
				DCipherPayloadsIndex += 2;
				DCipherStepListElements[i].innerHTML = createdStep;
				break;
			case 2:
				var grid = document.createElement("table");
				grid.setAttribute("class", "canvas");
				for (var r = 0; r < 3; r ++){
					var row = grid.insertRow();
					for (var c = 0; c < 5; c++){
						var cell = row.insertCell();
						cell.textContent = possibleXorGrids[selectedDGridIndex][5*r + c];
					}
				}
				createdStep += GiantsCipher.DCipherRule3();
				DCipherStepListElements[i].innerHTML = createdStep + "<br>";
				DCipherStepListElements[i].append(grid);
				break;
			case 3:
				createdStep += GiantsCipher.DCipherRule4(selectedDCipherArguments[DCipherPayloadsIndex], selectedDCipherArguments[DCipherPayloadsIndex+1], selectedDCipherArguments[DCipherPayloadsIndex+2], selectedDCipherArguments[DCipherPayloadsIndex+3]);
				DCipherPayloadsIndex += 4;
				DCipherStepListElements[i].innerHTML = createdStep;
				break;
			case 4:
				createdStep += GiantsCipher.DCipherRule5(selectedDCipherArguments[DCipherPayloadsIndex], selectedDCipherArguments[DCipherPayloadsIndex+1], selectedDCipherArguments[DCipherPayloadsIndex+2]);
				DCipherPayloadsIndex += 3;
				DCipherStepListElements[i].innerHTML = createdStep;
				break;
			case 5:
				createdStep += GiantsCipher.DCipherRule6(selectedDCipherArguments[DCipherPayloadsIndex], selectedDCipherArguments[DCipherPayloadsIndex+1]);
				DCipherPayloadsIndex += 2;
				DCipherStepListElements[i].innerHTML = createdStep;
				break;
			case 6:
				createdStep += GiantsCipher.DCipherRule7(selectedDCipherArguments[DCipherPayloadsIndex]);
				DCipherPayloadsIndex += 1;
				DCipherStepListElements[i].innerHTML = createdStep;
				break;
		}
	}
}