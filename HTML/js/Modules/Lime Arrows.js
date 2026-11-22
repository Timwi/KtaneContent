function setRules(rnd)
{
	let letterGrid = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
	letterGrid = recurseThroughGrid(letterGrid, rnd);

	const letters = ["U", "D", "L", "R"];
	letterGrid = letterGrid.map(x => letters[x]);

	let allowedWords = [
		["ABSORB", "ACTIVE", "ALWAYS", "AMIDST", "APPEAR", "ARTIST", "AXIOMS"],
		["BEHAVE", "BETTER", "BIONIC", "BOUNCE", "BRONZE", "BUBBLE", "BUTTER"],
		["CANYON", "CLOVER", "CREATE", "CYBORG", "CLOVER", "COBWEB"],
		["DAZZLE", "DECODE", "DITHER", "DIVIDE", "DOCTOR", "DRAGON", "DYNAMO"],
		["ECHOES", "ENERGY", "ENIGMA", "ERASER", "ESTATE", "EXPERT"],
		["FACTOR", "FATHOM", "FAULTY", "FENCER", "FILLER", "FJORDS", "FOLDER"],
		["GADGET", "GALAXY", "GENOME", "GLOBAL", "GLOOMY", "GRAVEL", "GROUND"],
		["HADRON", "HEALTH", "HELIUM", "HICCUP", "HOLLOW", "HORNET"],
		["ICEBOX", "ICONIC", "IGNITE", "IONIZE", "INFECT", "INSANE", "ISLAND"],
		["JACKET", "JETLAG", "JESTER", "JETWAY", "JUNIOR"],
		["KABOOM", "KARATE", "KELVIN", "KIDNEY", "KINDLE", "KLAXON", "KNIGHT"],
		["LAPTOP", "LEGATO", "LETHAL", "LESSON", "LICHEN", "LOUNGE", "LUXURY"],
		["MAGNET", "MARTYR", "MATRIX", "MELODY", "MIXING", "MURDER", "MYTHIC"],
		["NARROW", "NATURE", "NAVAJO", "NETHER", "NOISES", "NOUGHT"],
		["OBLONG", "OCCUPY", "OFFSET", "OUTPUT", "OXYGEN"],
		["PIGEON", "PISTOL", "PORTRY", "PORTAL", "PRAXIS", "PRINCE", "PURPLE"],
		["QUAINT", "QUARKS", "QUARTZ", "QUEBEC", "QUENCH", "QUICHE", "QUOTES"],
		["RAPTOR", "RECOIL", "REPLAY", "REMEDY", "ROTTEN"],
		["SCIONS", "SILVER", "SOCIAL", "SOURCE", "STREAK", "STRING"],
		["TECHNO", "THESIS", "TICKET", "TIMBER", "TOGGLE", "TUMBLE"],
		["UNIQUE", "UPDATE", "UPLOAD", "URCHIN", "USEFUL", "UTOPIA"],
		["VALLEY", "VELVET", "VIABLE", "VICTOR", "VIRTUE", "VISUAL"],
		["WAITER", "WEALTH", "WEIGHT", "WRITER", "WORLDS"],
		["YELLED", "YELLOW", "YIELDS", "YOGURT", "YONDER"],
		["ZAGGED", "ZENITH", "ZIPPER", "ZODIAC", "ZOOMED", "ZOMBIE"]
	];
	let wordsPerLetter = rnd.shuffleFisherYates([2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1]);

	let wordGrid = [];
	for (let i = 0; i < 25; i++)
	{
		let shuffledLetters = rnd.shuffleFisherYates(allowedWords[i]);
		for (let j = 0; j < wordsPerLetter[i]; j++)
		{
			wordGrid.push(shuffledLetters[j]);
		}
	}

	wordGrid.sort();

	let selectedDirections = [0, 1, 2, 3];
	rnd.shuffleFisherYates(selectedDirections);

	showData(wordGrid, letterGrid, selectedDirections);
}

// See implementation in LimeArrowsScript.cs for algorithm notes
function recurseThroughGrid(grid, rnd)
{
	if (grid.every(x => x >= 0)) { return grid; }

	let row;
	let col;
	let bestCell = -1;
	let fewestPossibilities = 99;
	let evaluationPossibilities;

	for (let i = 0; i < 36; i++)
	{
		if (grid[i] >= 0)
			continue;

		row = i / 6;
		col = i % 6;

		// Filter(predicate) is the JavaScript equivalent of C# Linq's Where(predicate),
		// so we can filter(predicate).length to do the equivalent of Linq's Count(predicate).
		evaluationPossibilities = [0, 1, 2, 3].filter(x =>
			(row == 0 || grid[i - 6] != x) && // Up
			(row == 5 || grid[i + 6] != x) && // Down
			(col == 0 || grid[i - 1] != x) && // Left
			(col == 5 || grid[i + 1] != x)    // Right
		).length;

		if (evaluationPossibilities < fewestPossibilities)
		{
			bestCell = i;
			if (evaluationPossibilities == 1) { break; }
			fewestPossibilities = evaluationPossibilities;
		}
	}

	row = Math.floor(bestCell / 6);
	col = bestCell % 6;

	const fullRow = [6 * row, 6 * row + 1, 6 * row + 2, 6 * row + 3, 6 * row + 4, 6 * row + 5];
	const fullCol = [col, col + 6, col + 12, col + 18, col + 24, col + 30];

	let colourOffset = rnd.next(0, 4);

	for (let i = 0; i < 4; i++)
	{
		let dir = (i + colourOffset) % 4;

		// Neighbors constraint
		if (((row == 0 || grid[bestCell - 6] != dir) &&
			(row == 5 || grid[bestCell + 6] != dir) &&
			(col == 0 || grid[bestCell - 1] != dir) &&
			(col == 5 || grid[bestCell + 1] != dir)) == false)
			continue;

		// No more than 2 of the same direction per col/row
		if (fullRow.filter(x => grid[x] == dir).length == 2)
			continue;
		if (fullCol.filter(x => grid[x] == dir).length == 2)
			continue;

		// No more than 9 of the same direction in the grid
		if (grid.filter(x => x == dir).length == 9)
			continue;

		// Ensure adding the value leaves enough empty room for the remaining directions so they all appear
		// Distinct is done through  filter((x, i, a) => a.indexOf(x) == i)
		// https://stackoverflow.com/a/39272981
		grid[bestCell] = dir;

		let numberOfDirectionsRemaining = fullRow.filter(x => grid[x] >= 0).map(x => grid[x]).filter((x, i, a) => a.indexOf(x) == i).length;
		let numberOfEmptyCells = fullRow.filter(x => grid[x] == -1).length;

		if (numberOfEmptyCells < (4 - numberOfDirectionsRemaining))
		{
			grid[bestCell] = -1;
			continue;
		}

		numberOfDirectionsRemaining = fullCol.filter(x => grid[x] >= 0).map(x => grid[x]).filter((x, i, a) => a.indexOf(x) == i).length;
		numberOfEmptyCells = fullCol.filter(x => grid[x] == -1).length;
		if (numberOfEmptyCells < (4 - numberOfDirectionsRemaining))
		{
			grid[bestCell] = -1;
			continue;
		}

		if (recurseThroughGrid(grid, rnd) != null)
			return grid;

		grid[bestCell] = -1;
		continue;
	}

	return null;
}

function setDefaultRules()
{
	let wordGrid = ["ACTIVE", "ALWAYS", "BIONIC", "CANYON", "CLOVER", "DECODE", "ENERGY", "EXPERT", "FAULTY", "GLOBAL", "GRAVEL", "HORNET", "INSANE", "ISLAND", "JETWAY", "KARATE", "LETHAL", "LOUNGE", "MELODY", "NARROW", "NOISES", "OFFSET", "OUTPUT", "PIGEON", "PORTAL", "QUARKS", "RECOIL", "REPLAY", "STREAK", "STRING", "TECHNO", "TOGGLE", "UPLOAD", "WORLDS", "YOGURT", "ZENITH"];
	let letterGrid = ["R", "U", "D", "R", "L", "U", "D", "R", "U", "L", "U", "R", "L", "D", "R", "D", "L", "U", "D", "U", "L", "R", "D", "L", "U", "L", "D", "U", "R", "D", "L", "R", "U", "L", "D", "R"];
	showData(wordGrid, letterGrid, [1, 3]);
}

function showData(wordGrid, letterGrid, selectedDirections)
{
	let cells = document.querySelectorAll(".word-grid td");

	// Word Grid is shown vertically
	// Letter Grid is shown horizontally
	for (let i = 0; i < 6; i++)
		for (let j = 0; j < 6; j++)
			cells[6 * j + i].innerHTML = `${wordGrid[i * 6 + j]} <b class=\"direction\">[<span class=\"${letterGrid[6 * j + i]}\">${LimeArrows.directionAbbrs[letterGrid[6 * j + i]]}</span>]</b>`;

	let ruleseedData = document.querySelectorAll(".ruleseed-data");
	ruleseedData[0].textContent = LimeArrows.directions[selectedDirections[0]];
	ruleseedData[1].textContent = LimeArrows.directions[selectedDirections[1]];
}