var shuffledKeyTable = [];
var selectedKeyRules = [];
var selectedKeys = [];
var selectedIntersections = [];
var selectedShiftAmount = [];

function setRules(rnd){
	shuffledKeyTable = rnd.shuffleFisherYates("6574224571512327553137462271126567445741375271436135237424613663646513".split(''));
	
	selectedKeyRules = rnd.shuffleFisherYates([0,1,2,3,4,5,6,7,8,9]);
	
	// Keys cannot have the same digit twice
	for (var i = 0; i < 5; i ++){
		var digit1 = rnd.next(0, 10);
		var digit2 = rnd.next(0, 10);
		var digit3 = rnd.next(0, 10);
		
		while (digit2 == digit1){
			digit2 = (digit2 + 1) % 10;
		}
		
		while (digit3 == digit2 || digit3 == digit1){
			digit3 = (digit3 + 1) % 10;
		}
		
		selectedKeys[i] = `${digit1}${digit2}${digit3}`;
	}
	
	selectedIntersections = [];
	for (var x = 0; x < 9; x ++){
		for (var y = 0; y < 9; y ++){
			for (var z = 0; z < 9; z ++){
				if (x != y && x != z && y != z){
					selectedIntersections.push(ToxicCrystals.Intersections[x] + " / " + ToxicCrystals.Intersections[y] + " / " + ToxicCrystals.Intersections[z]);
				}
			}
		}
	}
	rnd.shuffleFisherYates(selectedIntersections);
	
	selectedShiftAmount = rnd.shuffleFisherYates([0,1,2,3,4,5,6,7,8,9]);
	
	showRules();
}

function setDefaultRules(){
	shuffledKeyTable = "6574224571512327553137462271126567445741375271436135237424613663646513".split('');
	selectedKeyRules = [0, 1, 2, 3];
	selectedKeys = ["089", "520", "216", "347", "038"];
	selectedIntersections = ToxicCrystals.DefaultIntersections;
	selectedShiftAmount = [2, 0, 5];
	
	showRules();
}

function showRules(){
	var keyCells = document.querySelectorAll(".crystal-table td");
	for (var i = 0; i < 70; i ++)
		keyCells[i].innerText = shuffledKeyTable[i];
	
	var rulesData = document.querySelectorAll(".key-rules li");
	for (var i = 0; i < 5; i ++){
		var rule;
		if (i == 0){
			rule = ToxicCrystals.Rules[selectedKeyRules[i]];
			rule = rule[0].toUpperCase() + rule.slice(1);
		}
		else if (i == 4){
			rule = ToxicCrystals.Otherwise;
		}
		else {
			rule = ToxicCrystals.Otherwise + ToxicCrystals.Rules[selectedKeyRules[i]];
		}
		
		rule += ToxicCrystals.FormatKey(selectedKeys[i]);
		rulesData[i].innerHTML = rule;
	}
	
	var intersectionData = document.querySelectorAll(".letter-index td");
	for (var i = 0; i < 27; i ++){
		intersectionData[i].textContent = selectedIntersections[i];
	}
	
	var qExampleData = document.querySelectorAll(".q-example");
	for (var i = 0; i < 3; i ++){
		qExampleData[i].textContent = ToxicCrystals.IntersectionsFullName[selectedIntersections[16].slice(5*i, 5*i+2)];
	}
	
	var shiftData = document.querySelectorAll(".shift-data");
	for (var i = 0; i < 3; i ++){
		var innerText;
		if (selectedShiftAmount[i] == 0){
			innerText = ToxicCrystals.FormatZeroIntersectionShift(i);
		}
		else {
			innerText = ToxicCrystals.FormatNonZeroIntersectionShift(i, selectedShiftAmount[i]);
		}
		
		if (i == 0) {innerText = innerText[0].toUpperCase() + innerText.slice(1);}
		shiftData[i].textContent = innerText;
	}
}