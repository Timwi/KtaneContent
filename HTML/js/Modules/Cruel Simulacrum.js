var selectedSymbols = [];
var nodeColours = [];
const colors = {"Red" : "#DD2222", "Green" : "#22DD22", "Blue" : "#3333FF"};

function setRules(rnd){
	selectedSymbols = ["Turkey", "Moyai", "Whale", "Finesse", "Whale", "Finesse", "Moyai", "Turkey", "Finesse", "Turkey", "Moyai", "Whale"];
	rnd.shuffleFisherYates(selectedSymbols);
	
	nodeColours = ["Red", "Green", "Blue"];
	rnd.shuffleFisherYates(nodeColours);
	
	applyRules();
}

function setDefaultRules(){
	selectedSymbols = ["Turkey", "Moyai", "Whale", "Finesse", "Whale", "Finesse", "Moyai", "Turkey", "Finesse", "Turkey", "Moyai", "Whale"];
	nodeColours = ["Red", "Green", "Blue"];
	applyRules();
}

function applyRules(){
	const imageElements = document.querySelectorAll(".symbol image");
	for (var i = 0; i < 12; i ++){
		imageElements[i].setAttribute("href", `https://ktane.timwi.de/HTML/img/Invisymbol/${selectedSymbols[i]}.png`);
	}


	const nodeElements = document.querySelectorAll(".node");
	const colorNamesText = document.querySelectorAll(".colourName");
	for (var i = 0; i < 3; i ++){
		nodeElements[i].setAttribute("fill", colors[nodeColours[i]]);
		nodeElements[i+3].setAttribute("stroke", colors[nodeColours[i]]);
		
		colorNamesText[i].textContent = CruelSimulacrum.colourNames[nodeColours[i]];
	}
	
	
}