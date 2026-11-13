const outer = ["R", "G", "B", "Y"];
var inner = [];
var leftovers = [];
var usedPriorities = [];

function setDefaultRules(rnd){
	inner = [["G", "B", "Y"], ["B", "R", "Y"], ["R", "Y", "G"], ["B", "G", "R"]];
	leftovers = [["R", "G", "Y", "B"], ["B", "Y", "R", "G"], ["R", "Y", "G", "B"]];
	usedPriorities = [3, 0];
	
	applyData();
}

function setRules(rnd){
	inner = [["G", "B", "Y"], ["R", "B", "Y"], ["R", "G", "Y"], ["R", "G", "B"]];
	for (var i = 0; i < 4; i ++){
		rnd.shuffleFisherYates(inner[i]);
	}	
	
	leftovers = [["R", "G", "B", "Y"], ["R", "G", "B", "Y"], ["R", "G", "B", "Y"]];
	for (var i = 0; i < 3; i ++){
		rnd.shuffleFisherYates(leftovers[i]);
	}
	
	usedPriorities = [0,1,2,3];
	rnd.shuffleFisherYates(usedPriorities);
	
	applyData();
}

function applyData(){
	const spikes = document.querySelectorAll(".spikes-data path");
	const colours = {"R": "#f44", "G": "#4f4", "B": "#44f", "Y": "#ff4"};
	
	// Outer 4 Spikes
	for (var i = 0; i < 4; i ++){
		spikes[i].setAttribute("fill", colours[outer[i]])
	}
	
	// Each column of those 4 spikes in order
	for (var i = 0; i < 4; i ++){
		for (var j = 0; j < 3; j++){
			spikes[i*3 + j + 4].setAttribute("fill", colours[inner[i][j]]);
		}
	}
	
	// The remaining 12 spikes, line by line
	for (var i = 0; i < 3; i ++){
		for (var j = 0; j < 4; j++){
			spikes[i*4 + j + 16].setAttribute("fill", colours[leftovers[i][j]]);
		}
	}
	
	// "Most" and "Least" priority replacement
	const priorityData = document.querySelectorAll(".priority");
	priorityData[0].textContent = GlassCactus.priorityNames[usedPriorities[0]];
	priorityData[2].textContent = GlassCactus.priorityNames[usedPriorities[0]];
	priorityData[1].textContent = GlassCactus.priorityNames[usedPriorities[1]];
	priorityData[3].textContent = GlassCactus.priorityNames[usedPriorities[1]];
	priorityData[4].textContent = GlassCactus.priorityNames[usedPriorities[1]];
}