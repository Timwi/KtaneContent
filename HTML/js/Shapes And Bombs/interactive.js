var getTable = document.getElementById("interactiveModule").getElementsByTagName("tbody")[0];

for (var i = 0; i < 8; i++) {
	var newRow = getTable.insertRow(i);
	
	for (var j = 0; j < 5; j++) {
		var newCell = newRow.insertCell(j);
		var getCell = (5 * i) + j;
		newCell.outerHTML = `<td width = "50" height = "60" onclick = "onLedClick(${getCell})" bgcolor = "#FFFFFF" id = "led${getCell}"></td>`
		
		if (i == 0 && j == 4) {
			newCell = newRow.insertCell(j + 1);
			newCell.outerHTML = `<td rowspan = "8" class = "cell-empty"></td>`
		}
	}
}

function onLedClick(ledId) {
	var nowCell = document.getElementById(`led${ledId}`);
	
	if (nowCell.style.backgroundColor == "rgb(0, 0, 0)") {
		nowCell.style.backgroundColor = "#FFFFFF";
	} else {
		nowCell.style.backgroundColor = "#000000";
	}				
}

var getArrow = new Array(15).fill(0);
var nowArrow = 0;

function onArrowClick() {
	getArrow[nowArrow]++;
	getArrow[nowArrow] %= 9;
	setScreen();
}

function onNumberClick() {
	nowArrow++;
	nowArrow %= 15;
	setScreen();
	document.getElementById("numberArrow").innerText = nowArrow;
}

function setScreen() {
	document.getElementById("screenArrow").src = `img/Shapes And Bombs/arrow${getArrow[nowArrow]}.png`;
}

function startCoroutine(f) {
    var o = f();
    o.next();
	
    return function(x) {
        o.next(x);
    }
}

var playArrows = false;

var arrowCoroutine = startCoroutine(function*() {
	while (true) {
		yield;
		
		if (playArrows) {
			onNumberClick();
		}
	}
});

setInterval(arrowCoroutine, 3000);
arrowCoroutine();

function startArrows() {
	if (!playArrows) {
		arrowCoroutine();
	}
	
	playArrows = !playArrows;
	document.getElementById("startArrows").innerText = (playArrows) ? "Stop" : "Start";
}

function resetArrows() {
	for (var i = 0; i < getArrow.length; i++) {
		getArrow[i] = 0;
	}
	
	setScreen();
}

function emptyLeds() {
	for (var i = 0; i < 40; i++) {
		document.getElementById(`led${i}`).style.backgroundColor = "#FFFFFF";
	}
}

for (var i = 0; i < 15; i++) {
	var nowButton = document.createElement("button");
	nowButton.appendChild(document.createTextNode(""));
	document.getElementById("letterButtons").appendChild(nowButton);
	nowButton.outerHTML = `<button onclick = "setLetter(${i})" class = "button-style">${moduleLetters[i]}</button>${(i % 5 == 4) ? "</br>" : ""}`;
}

var intLetter = [
	"XOOOXOXXXOOXXXOOOOOOOXXXOOXXXOOXXXOOXXXO",
	"OOOOXOXXXOOXXXOOOOOXOXXXOOXXXOOXXXOOOOOX",
	"OOOOXOXXXOOXXXOOXXXOOXXXOOXXXOOXXXOOOOOX",
	"OOOOOOXXXXOXXXXOOOOXOXXXXOXXXXOXXXXOOOOO",
	"XOOOXOXXXOOXXXXOXXXXOXOOOOXXXOOXXXOXOOOX",
	"OOOOOXXOXXXXOXXXXOXXXXOXXXXOXXXXOXXOOOOO",
	"OXXXOOXXOXOXOXXOOXXXOXOXXOXXOXOXXOXOXXXO",
	"OXXXXOXXXXOXXXXOXXXXOXXXXOXXXXOXXXXOOOOO",
	"OXXXOOOXXOOXOXOOXOXOOXXOOOXXXOOXXXOOXXXO",
	"XOOOXOXXXOOXXXOOXXXOOXXXOOXXXOOXXXOXOOOX",
	"OOOOXOXXXOOXXXOOOOOXOXXXXOXXXXOXXXXOXXXX",
	"XOOOXOXXXOOXXXXXOOOXXXXXOXXXXOOXXXOXOOOX",
	"OOOOOXXOXXXXOXXXXOXXXXOXXXXOXXXXOXXXXOXX",
	"OXXXOXOXOXXOXOXXXOXXXXOXXXOXOXXOXOXOXXXO",
	"OXXXOXOXOXXOXOXXXOXXXXOXXXXOXXXXOXXXXOXX"
];

function setLetter(toSet) {
	emptyLeds();
	
	for (var i = 0; i < 40; i++) {
		if (intLetter[toSet][i] == "O") {
			document.getElementById(`led${i}`).style.backgroundColor = "#000000";
		}
	}
}