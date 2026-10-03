const defaultGrid = "850326791438420715694189506723209631547817032498565860792431741593628063572810498329170645921064538739684571022607814593457816392007548296317235094816".split('');
var newGrid = [];
var selectedStartingConditions = [];
var selectedLoopBehaviour;

function setRules(rnd){
	newGrid = defaultGrid.slice();
	rnd.shuffleFisherYates(newGrid);
	selectedStartingConditions = rnd.shuffleFisherYates([0, 1, 2, 3, 4, 5, 6, 7]);
	selectedLoopBehaviour = rnd.next(0, 7);
	showRules();
}

function setDefaultRules(){
	newGrid = defaultGrid.slice();
	selectedStartingConditions = [0, 1];
	selectedLoopBehaviour = 0;
	showRules();
}

function showRules(){
	var cells = document.querySelectorAll(".table-dynamo td");
	for (let i = 0; i < 15 * 10; i ++) {
		cells[i].innerText = newGrid[i];
	}
	
	var startingData = document.querySelectorAll(".starting-cell");
	startingData[0].textContent = ZapPlate.conditions[selectedStartingConditions[0]];
	startingData[1].textContent = ZapPlate.conditions[selectedStartingConditions[1]];
	
	document.querySelector(".loop-behaviour").textContent = ZapPlate.loopBehaviour[selectedLoopBehaviour];
}