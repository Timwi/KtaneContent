let directionOrder = [];
let forceStartingCell;
let objectStartingCell;
let cellsWithStations = [];

function setRules(rnd){
    directionOrder = [FistPlate.Up, FistPlate.Down, FistPlate.Left, FistPlate.Right];
    rnd.shuffleFisherYates(directionOrder);
	
	
	redirectStationSpaces = [1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3];
	rnd.shuffleFisherYates(redirectStationSpaces);
	redirectStationSpaces.unshift(rnd.next(0,3));
	
	cellsWithStations = [];
	var current = 0;
	for (var gap of redirectStationSpaces){
		current += gap;
		cellsWithStations.push(current);
	}
	
	// No object close to the sides
	let allowedObjectSpaces = [18,19,20,21,26,27,28,29,34,35,36,37,42,43,44,45].filter((x) => cellsWithStations.includes(x) == false);
	objectStartingCell = allowedObjectSpaces[rnd.next(0, allowedObjectSpaces.length)];
	
	// Force only on the non-corner edges 
	let allowedForceSpaces = [1,2,3,4,5,6,8,16,24,32,40,48,15,23,31,39,47,55,57,58,59,60,61,62].filter((x) => cellsWithStations.includes(x) == false);
	forceStartingCell = allowedForceSpaces[rnd.next(0, allowedForceSpaces.length)];
	
	showRules();
}

function setDefaultRules(){
    directionOrder = [FistPlate.Up, FistPlate.Down, FistPlate.Left, FistPlate.Right];
	redirectStationSpaces = [0,3,2,2,2,2,3,2,3,2,2,2,3,2,2,1,2,2,2,3,2,5,2,3,2,1,3,2,1];
	cellsWithStations = [0, 3, 5, 7, 9, 11, 14, 16, 19, 21, 23, 25, 28, 30, 32, 33, 35, 37, 39, 42, 44, 49, 51, 54, 56, 57, 60, 62, 63];
	objectStartingCell = 27;
	forceStartingCell = 59;
    showRules();
}
	
function showRules(){
	var directionCellsData = document.getElementsByClassName("directions-data");
	for (var i = 0; i < 4; i ++){
        directionCellsData[i].innerText = directionOrder[i];
        directionCellsData[4+i].innerText = directionOrder[i];
    }
	
	let forceSpawnDirection = {
		1: "v",	2: "v",	3: "v",	4: "v",	5: "v",	6: "v",
		8: ">", 16: ">",24: ">",32: ">",40: ">",48: ">",
		15: "<",23: "<",31: "<",39: "<",47: "<",55: "<",
		57: "^", 58: "^", 59: "^", 60: "^", 61: "^", 62: "^"
	};
	
	var cityMapCells = document.querySelectorAll(".city-map td");
	for (var i = 0; i < 64; i++){
		if (cellsWithStations.includes(i)){
			cityMapCells[i].setAttribute("class", "station");
			cityMapCells[i].textContent = "";
		}
		else{
			cityMapCells[i].removeAttribute("class");
			
			if (i == objectStartingCell){
				cityMapCells[i].textContent = "X";
			}
			else if (i == forceStartingCell){
				cityMapCells[i].textContent = forceSpawnDirection[i];
				document.querySelector(".force").textContent = forceSpawnDirection[i];
			}
			else {
				cityMapCells[i].textContent = "";
			}
		}		
	}
	
	
}