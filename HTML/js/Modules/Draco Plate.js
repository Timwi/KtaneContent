// Original code credit to LuminoscityTim (Critters) and samfundev (Game of Life)!!
$(function() {
const table = $("table.draco-grid");
let classToAdd = "white";
let saveStates = [];
let currentState = 0;

$("input[name='colour']").change(function() {
	classToAdd = $(this).val();
});

for (let y = 0; y <= 8; y++) {
	const row = $("<tr>").appendTo(table);
	for (let x = 0; x <= 8; x++) {
		if (x == 0 && y == 0) {
			$("<th>").appendTo(row);
		}
		else if (y == 0 && x > 0) {
			$("<th>").text(String.fromCharCode(64 + x)).appendTo(row);
		}
		else if (y > 0 && x == 0) {
			$("<th>").text(y).appendTo(row);
		}
		else {
			$("<td>").click(function() {
				if ($(this).hasClass(classToAdd))
				{ $(this).removeClass("white cyan magenta yellow void"); }
				else
				{ $(this).removeClass("white cyan magenta yellow void").addClass(classToAdd); }
				removeFutureSaves();
			}).contextmenu(function() {
				$(this).toggleClass("dot");
				removeFutureSaves();
				return false;
			}).append('<div class="box"></div>').appendTo(row);
		}
	}
}

$("button.reset-grid").click(function() {
	$("table.draco-grid td").removeClass("white cyan magenta yellow void dot"); });
	
$("button.reset-all").click(function() {
	$("table.draco-grid td").removeClass("white cyan magenta yellow void dot"); 
	saveStates.forEach(x => x.remove());
	saveStates = [];
	currentState = 0;});
	
$("button.reset-marked").click(function() {
	$("table.draco-grid td").removeClass("dot"); });
	
$("button.toggle-marked").click(function() {
	$("table.interactive td.dot").each(function(i, x){
	
		if (!($(x).hasClass("cyan") || $(x).hasClass("magenta") || $(x).hasClass("yellow") || $(x).hasClass("void")))
		{$(x).toggleClass("white");}
	
	});
		if ($("table.interactive td.dot").length > 0) removeFutureSaves();
});

function removeFutureSaves() {
	if (currentState < saveStates.length - 1) {
		for (let i = currentState + 1; i < saveStates.length; i++) {
			saveStates[i].remove();
		}
		saveStates.splice(currentState + 1, saveStates.length - currentState);
	}
}

$("button.save").click(function() {
	removeFutureSaves();

	let saveClass = Array.from($("table.interactive, table.interactive td")).map(x => $(x)).map(x => x.attr("class") || "");

	console.log(saveStates);
	let stateNumber = saveStates.length;
	currentState = stateNumber;

	let button = $("<button>").text(stateNumber + 1).click(function() {
		$("table.interactive, table.interactive td").each((i, x) => $(x).attr("class", saveClass[i]));
		currentState = stateNumber;
	}).appendTo(".saves");

	saveStates.push(button);
});

// Ask confirmation before closing page
window.onbeforeunload = function() {
	return true;
};  
});

var MagentaRotation;
var manhattanOrder = [];
var rulesOrder = [];

function setRules(rnd){
    rulesOrder = [DracoPlate.Cyan, DracoPlate.Magenta, DracoPlate.Yellow];
    rnd.shuffleFisherYates(rulesOrder);
	
    manhattanOrder = rnd.shuffleFisherYates([2, 4, 8, 1, 3, 5, 6, 7, 9 ]);
	manhattanOrder = manhattanOrder.slice(0,3).sort();
	
	MagentaRotation = rnd.next(1,4)*90;
	
    showRules();
}

function setDefaultRules(){
    rulesOrder = [DracoPlate.Cyan, DracoPlate.Magenta, DracoPlate.Yellow];
    manhattanOrder = [2, 4, 8];
	
	MagentaRotation = 180;
	
	showRules();
}

function showRules(){
	var rules = document.getElementsByClassName("rules-data");
    rules[0].innerHTML = DracoPlate.FirstRule(rulesOrder[0]);
    rules[1].innerHTML = DracoPlate.SecondRule(rulesOrder[1]);
    rules[2].innerHTML = DracoPlate.ThirdRule(rulesOrder[2]);
	
	document.querySelector(".magenta-rotation").textContent = MagentaRotation;
	
	var manhattans = document.getElementsByClassName("manhattan-data");
    manhattans[0].innerText = manhattanOrder[0];
    manhattans[1].innerText = manhattanOrder[1];
    manhattans[2].innerText = manhattanOrder[2];
}