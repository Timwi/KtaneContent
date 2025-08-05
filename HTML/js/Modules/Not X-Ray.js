function setDefaultRules(rnd) { setRules(rnd); }
function setRules(rnd)
{
	let sqs = Array(49).fill(null).map((_, c) => c).filter(c => c != 0 && c != 6 && c != 42 && c != 48 && c != 24);

	// First 55 symbols can be flipped, next 55 cannot
	const numFlippable = 55;
	const numUnflippable = 55;
	let unflippableSymbols = rnd.shuffleFisherYates(Array(numUnflippable).fill(null).map((_, c) => numFlippable + c));
	let flippableSymbols = rnd.shuffleFisherYates(Array(numFlippable).fill(null).map((_, c) => c));

	function x(c) { return c % 7; }
	function y(c) { return (c / 7) | 0; }

	let combinations = [];
	for (let ai = 0; ai < sqs.length; ai++)
		for (let bi = ai + 1; bi < sqs.length; bi++)
			if (y(sqs[bi]) > y(sqs[ai]) && x(sqs[bi]) < x(sqs[ai]))
				for (let ci = ai + 1; ci < sqs.length; ci++)
					if (ci !== bi && y(sqs[ci]) > y(sqs[ai]) && x(sqs[ci]) > x(sqs[ai]) && x(sqs[ci]) > x(sqs[bi]))
						for (let di = Math.max(bi, ci) + 1; di < sqs.length; di++)
							if (y(sqs[di]) > y(sqs[bi]) && y(sqs[di]) > y(sqs[ci]) && x(sqs[di]) > x(sqs[bi]) && x(sqs[di]) < x(sqs[ci]))
								combinations.push([sqs[ai], sqs[bi], sqs[ci], sqs[di]]);

	function generateTable(elem, symbols)
	{
		// generate maze

		let w = 7, h = 7;
		let notWalls = [];
		let todo = Array(49).fill(null).map((_, c) => c).filter(c => c != 0 && c != 6 && c != 42 && c != 48);
		let active = [];

		let start = rnd.next(0, todo.length);
		active.push(todo[start]);
		todo.splice(start, 1);

		while (todo.length > 0)
		{
			let activeIx = rnd.next(0, active.length);
			let sq = active[activeIx];
			let adjs = [];
			if ((sq % w) > 0 && todo.includes(sq - 1))
				adjs.push(sq - 1);
			if ((sq % w) < w - 1 && todo.includes(sq + 1))
				adjs.push(sq + 1);
			if (((sq / w) | 0) > 0 && todo.includes(sq - w))
				adjs.push(sq - w);
			if (((sq / w) | 0) < h - 1 && todo.includes(sq + w))
				adjs.push(sq + w);

			if (adjs.length == 0)
			{
				active.splice(activeIx, 1);
				continue;
			}
			else
			{
				let adj = adjs[rnd.next(0, adjs.length)];
				todo.splice(todo.indexOf(adj), 1);
				active.push(adj);

				if (adj === sq - 1)
					notWalls.push({ cell: adj, right: true });
				else if (adj === sq + 1)
					notWalls.push({ cell: sq, right: true });
				else if (adj === sq - w)
					notWalls.push({ cell: adj, right: false });
				else if (adj === sq + w)
					notWalls.push({ cell: sq, right: false });
			}
		}

		// generate symbol arrangements

		let backtracks = 0;
		function findArrangement(numSofar, combinationsLeft)
		{
			if (numSofar === 11)
				return [];
			if (combinationsLeft.length === 0)
				return null;

			let offset = rnd.next(0, combinationsLeft.length);
			for (let ir = 0; ir < combinationsLeft.length; ir++)
			{
				let i = (ir + offset) % combinationsLeft.length;
				let combination = combinationsLeft[i];
				let combLeft = combinationsLeft.filter(cmb => cmb.every(c => !combination.includes(c)));
				let result = findArrangement(numSofar + 1, combLeft);
				if (result !== null)
				{
					result.push(combination);
					return result;
				}
				if (backtracks > 500)
					return null;
			}
			backtracks++;
			return null;
		}

		let arrangement;
		do {
			backtracks = 0;
			arrangement = findArrangement(0, combinations);
		}
		while (arrangement === null);

		// generate HTML table

		function symbolClass(sym)
		{
			return `icon ${String.fromCharCode(97 + (sym.ix % 11))}${((sym.ix / 11) | 0) + 1}${sym.flip ? ' flipped' : ''}`;
		}

		function td(cell)
		{
			if (cell === 0 || cell === 6 || cell === 42 || cell === 48)
				return '<td class="corner"></td>';

			let wallR = !notWalls.some(nw => nw.cell === cell && nw.right);
			let wallD = !notWalls.some(nw => nw.cell === cell && !nw.right);
			if (cell === 24)
				return `<td class="center${wallR ? ' wall-r' : ''}${wallD ? ' wall-d' : ''}">?<${''}/td>`;

			let arrIx = arrangement.findIndex(comb => comb.includes(cell));
			return `<td class="cell${wallR ? ' wall-r' : ''}${wallD ? ' wall-d' : ''}"><div class='${symbolClass(symbols[arrIx])}'><${''}/div><${''}/td>`;
		}

		elem.innerHTML =
			Array(7).fill(null).map((_, row) => `<tr>${
				Array(7).fill(null).map((_, col) => td(col + 7*row)).join('')
			}<${''}/tr>`).join('');
	}

	let tables = Array.from(document.getElementsByClassName('not-xray-table'));
	for (let tableIx = 0; tableIx < tables.length; tableIx++)
		generateTable(tables[tableIx], [
			...flippableSymbols.slice(tableIx * 4, tableIx * 4 + 4).map(s => ({ ix: s, flip: false })),
			...flippableSymbols.slice(tableIx * 4, tableIx * 4 + 4).map(s => ({ ix: s, flip: true })),
			...unflippableSymbols.slice(tableIx * 3, tableIx * 3 + 3).map(s => ({ ix: s, flip: false }))]);
}