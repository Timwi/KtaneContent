let possiblePrices = [ 359, 633, 199, 250, 901, 690, 527, 912, 410, 893, 728, 123, 377, 99, 314, 141, 904, 800, 420, 260, 1, 967, 369, 551, 201, 753 ];
let possibleIndicators = ["SND", "CLR", "CAR", "IND", "FRQ", "SIG", "NSA", "MSA", "TRN", "BOB", "FRK"];

function toDollar(intCents)
{
	let stringCents = intCents.toString();

	if (intCents > 99)
		return '$' + stringCents[0] + '.' + stringCents.substring(1);
	else if (intCents > 9)
		return '$0.' + stringCents;
	else
		return '$0.0' + stringCents;
}

function setRules(rnd)
{
	// Slice to make a copy
	let selectedCalls = rnd.shuffleFisherYates(CheepCheckout.possibleCalls.slice());
	let selectedPrices = rnd.shuffleFisherYates(possiblePrices.slice());
	let selectedBirds = [];

	for (let i = 0; i < 26; i++)
	{
		selectedBirds[i] = rnd.shuffleFisherYates(CheepCheckout.possibleBirds[i].slice())[0];

		let intPrice = selectedPrices[i];
		intPrice += rnd.next(-10, 11);
		if (intPrice < 1)
			intPrice = 1;
		selectedPrices[i] = intPrice;
	}

	// Unicorn condition being duplicate port is 10%
	let selectedUnicornConditions;
	if (rnd.next(0, 10) === 0)
		selectedUnicornConditions = [CheepCheckout.unicornModule, CheepCheckout.unicornModuleNegative];
	else
	{
		let litOrUnlit = rnd.next(0, 2) === 0
			? [CheepCheckout.unicornLitIndicator, CheepCheckout.unicornLitIndicatorNegative]
			: [CheepCheckout.unicornUnlitIndicator, CheepCheckout.unicornUnlitIndicatorNegative];
		let indicator = possibleIndicators[rnd.next(0, 11)];
		selectedUnicornConditions = litOrUnlit.map(fn => fn(indicator));
	}

	setValues(selectedCalls, selectedBirds, selectedPrices, selectedUnicornConditions);
}

function setDefaultRules()
{
	let selectedCalls = CheepCheckout.possibleCalls;
	let selectedPrices = possiblePrices;
	let selectedBirds = [];
	for (let i = 0; i < 26; i ++)
		selectedBirds[i] = CheepCheckout.possibleBirds[i][0];
	let selectedUnicornConditions = [CheepCheckout.unicornLitIndicator('BOB'), CheepCheckout.unicornLitIndicatorNegative('BOB')];
	setValues(selectedCalls, selectedBirds, selectedPrices, selectedUnicornConditions);
}

function setValues(selectedCalls, selectedBirds, selectedPrices, selectedUnicornConditions)
{
	let birdCallCells = document.querySelectorAll(".bird-table td:nth-of-type(3n)");
	let birdPriceCells = document.querySelectorAll(".bird-table td:nth-of-type(3n-1)");
	let birdNameCells = document.querySelectorAll(".bird-table td:nth-of-type(3n-2)");

	for (let i = 0; i < 26; i ++)
	{
		birdCallCells[i].textContent = selectedCalls[i];
		birdPriceCells[i].textContent = toDollar(selectedPrices[i]);
		birdNameCells[i].textContent = selectedBirds[i];
	}
	document.querySelectorAll(".unicorn-call")[0].textContent = selectedCalls[26];
	let conditions = document.querySelectorAll(".unicorn-condition");
	conditions[0].textContent = selectedUnicornConditions[0];
	conditions[1].textContent = selectedUnicornConditions[1];
}
