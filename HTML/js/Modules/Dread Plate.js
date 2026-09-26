var letterPerCharacters = [];
var selectedRules = [];
var selectedRulesSymbols = [];

function setRules(rnd){
    var alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
    rnd.shuffleFisherYates(alphabet);
    var joined = alphabet.join('');
    letterPerCharacters[0] = joined.substring(0,8).split('').sort().join('');
    letterPerCharacters[1] = joined.substring(8,14).split('').sort().join('');
    letterPerCharacters[2] = joined.substring(14,19).split('').sort().join('');
    letterPerCharacters[3] = joined.substring(19,23).split('').sort().join('');
    letterPerCharacters[4] = joined.substring(23,26).split('').sort().join('');
	
	selectedRules = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	rnd.shuffleFisherYates(selectedRules);
	
	var possibleSymbols = ["#","&","%","@","!"];
	
	// The most important rule is for the symbols to not repeat in the same rule
	// It'd be better if the symbols could also have an even distribution (All appear in position 1/2/3 only once)
	// but that's a double-exclusivity shuffle that I don't know how to do
	for (var i = 0; i < 5; i ++){
		var selection = rnd.shuffleFisherYates([0,1,2,3,4]);
		selectedRulesSymbols[3*i+0] = possibleSymbols[selection[0]];
		selectedRulesSymbols[3*i+1] = possibleSymbols[selection[1]];
		selectedRulesSymbols[3*i+2] = possibleSymbols[selection[2]];
	}
	
	var thing = "";
	for (var x = 0; x < 5; x ++){
		for (var y = 0; y < 5; y ++){
			for (var z = 0; z < 5; z ++){
				if (x != y && x != z && y != z){
					thing += possibleSymbols[x] + possibleSymbols[y] + possibleSymbols[z];
				}
			}
		}
	}
	console.log(thing);
	
	console.log(selectedRulesSymbols);
	
	setValues();
}

function setDefaultRules(){
    letterPerCharacters[0] = "FHLNTVWX";
    letterPerCharacters[1] = "BDEGSU";
    letterPerCharacters[2] = "KMPRZ";
    letterPerCharacters[3] = "ACOQ";
    letterPerCharacters[4] = "IJY";
	
	selectedRules = [0, 1, 2, 3, 4];
	selectedRulesSymbols = ['!', '&', '%', '&', '@', '%', '!', '#', '@', '@', '!', '%', '#', '!', '%']
	
	setValues();
}

function setValues(){
	var cells = document.querySelectorAll(".letter-data th");
	
	for (var i = 0; i < 5; i ++){
		cells[0].innerText = letterPerCharacters[0];
		cells[1].innerText = letterPerCharacters[1];
		cells[2].innerText = letterPerCharacters[2];
		cells[3].innerText = letterPerCharacters[3];
		cells[4].innerText = letterPerCharacters[4];
	}
	
	var rulesData = document.querySelectorAll(".rules-data li");
	for (var i = 0; i < 5; i ++){
		rulesData[0].innerHTML = DreadPlate.possibleRules(selectedRules[0], selectedRulesSymbols[0], selectedRulesSymbols[1], selectedRulesSymbols[2] );
		rulesData[1].innerHTML = DreadPlate.possibleRules(selectedRules[1], selectedRulesSymbols[3], selectedRulesSymbols[4], selectedRulesSymbols[5] );
		rulesData[2].innerHTML = DreadPlate.possibleRules(selectedRules[2], selectedRulesSymbols[6], selectedRulesSymbols[7], selectedRulesSymbols[8] );
		rulesData[3].innerHTML = DreadPlate.possibleRules(selectedRules[3], selectedRulesSymbols[9], selectedRulesSymbols[10], selectedRulesSymbols[11] );
		rulesData[4].innerHTML = DreadPlate.possibleRules(selectedRules[4], selectedRulesSymbols[12], selectedRulesSymbols[13], selectedRulesSymbols[14] );
	}
}