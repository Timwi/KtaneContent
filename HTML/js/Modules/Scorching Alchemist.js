var selectedSwordShackleOrder = [];
var selectedGearNumbers = [];
var selectedMultiplier;

function setRules(rnd){
	selectedSwordShackleOrder = rnd.shuffleFisherYates(["1 3 4 2", "3 1 4 2", "4 1 2 3", "2 3 4 1", "1 3 2 4", "2 1 3 4", "1 2 4 3", "1 4 3 2", "3 4 2 1", "3 2 4 1", "1 4 2 3", "4 1 3 2", "3 1 2 4", "2 4 1 3", "1 2 3 4", "4 2 1 3", "3 2 1 4", "2 1 4 3", "4 3 1 2", "2 3 1 4", "2 4 3 1", "4 2 3 1", "3 4 1 2", "4 3 2 1"]);
	
	selectedGearNumbers = rnd.shuffleFisherYates([0,1,2,3,4,5,6,7,8,9]);
	
	selectedMultiplier = rnd.next(0, ScorchingAlchemist.multipliers.length);
	
	showValues();
}

function setDefaultRules(){
	selectedSwordShackleOrder = ["1 3 4 2", "3 1 4 2", "4 1 2 3", "2 3 4 1", "1 3 2 4", "2 1 3 4", "1 2 4 3", "1 4 3 2", "3 4 2 1", "3 2 4 1", "1 4 2 3", "4 1 3 2", "3 1 2 4", "2 4 1 3", "1 2 3 4", "4 2 1 3", "3 2 1 4", "2 1 4 3", "4 3 1 2", "2 3 1 4", "2 4 3 1", "4 2 3 1", "3 4 1 2", "4 3 2 1"];
	
	selectedGearNumbers = [8, 4, 1];
	
	selectedMultiplier = 0;
	
	showValues();
}

function showValues(){
	var weaponsData = document.querySelectorAll(".weapon-table td:nth-child(3n)");

	for (var i = 0; i < 24; i ++)
		weaponsData[i].innerText = selectedSwordShackleOrder[i];

	var gearsData = document.querySelectorAll(".gear-number");
	for (var i = 0; i < 3; i ++)
		gearsData[i].innerText = selectedGearNumbers[i];
	
	document.querySelector(".multiplier").textContent = ScorchingAlchemist.multipliers[selectedMultiplier];
}