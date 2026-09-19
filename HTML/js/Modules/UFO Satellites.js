var selectedAlphabeticalOrder;
var selectedAppendWord;
var selectedAppendCondition;
var configurationLetters = [];

function setRules(rnd){
	selectedAlphabeticalOrder = rnd.next(0, 2) == 0;
	selectedAppendWord = UfoSatellites.appends[rnd.next(0, 3)];
	selectedAppendCondition = UfoSatellites.appendConditions[rnd.next(0, UfoSatellites.appendConditions.length)];
	
	let string = rnd.shuffleFisherYates("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('')).join('');
	configurationLetters[0] = string.substring(0,7).split('').sort().join('');
	configurationLetters[1] = string.substring(7,14).split('').sort().join('');
	configurationLetters[2] = string.substring(14,20).split('').sort().join('');
	configurationLetters[3] = string.substring(20,26).split('').sort().join('');
	
	setData();
}

function setDefaultRules(){
	selectedAlphabeticalOrder = true;
	selectedAppendWord = "UFO";
	selectedAppendCondition = "a Parallel port is present";
	
	configurationLetters[0] = "ACGLPWY";
	configurationLetters[1] = "HIMNORT";
	configurationLetters[2] = "BFJQUX";
	configurationLetters[3] = "DEKSVZ";
	
	setData();
}

function setData(){
	var cells = document.querySelectorAll(".ufo-data");
	for (var i = 0; i < 4; i ++){
		cells[i].innerText = configurationLetters[i];
	}
	
	var stringData = document.querySelectorAll(".ruleseed-data");
	stringData[0].textContent = selectedAlphabeticalOrder ? UfoSatellites.alphabeticalOrder : UfoSatellites.reverseAlphabeticalOrder;
	stringData[1].textContent = selectedAppendWord;
	stringData[2].textContent = selectedAppendCondition;
}