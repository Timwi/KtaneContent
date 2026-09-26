var ruleseededMarks = [];

function setRules(rnd){ 
	// Mark Rules have meaning, they are linked to the move learnset of Arceus in its debut generation
	// So even if randomized, the marks need to move using those rules
	ruleseededMarks = [];
	
	// rule 1 - Gravity - Mark of Space must be above the other two
	ruleseededMarks.push(rnd.next(0, 6), rnd.next(9, 15), rnd.next(0, 6));
	
	// rule 2 - Earth Power
	// rule 3 - Hyper Voice
	// rule 4 - Extreme Speed
	// no need for specifics
	ruleseededMarks.push(rnd.next(0, 11), rnd.next(0, 11), rnd.next(0, 11));
	ruleseededMarks.push(rnd.next(0, 11), rnd.next(0, 11), rnd.next(0, 11));
	ruleseededMarks.push(rnd.next(0, 11), rnd.next(0, 11), rnd.next(0, 11));
	
	// rule 5 - Refresh - same non-zero value thrice
	var value = rnd.next(1,10);
	ruleseededMarks.push(value, value, value);
	
	// rule 6 - Future Sight - Time-based so Mark of Time must be above the other two
	ruleseededMarks.push(rnd.next(9, 15), rnd.next(0, 6), rnd.next(0, 6));
	
	// rule 7 - Recover - Must be inverse of Perish Song
	var recover = [rnd.next(1, 11), rnd.next(1, 11), rnd.next(1, 11)];
	ruleseededMarks.push(recover[0], recover[1], recover[2]);
	
	// rule 8 - Hyper Beam - no need for specifics
	ruleseededMarks.push(rnd.next(0, 11), rnd.next(0, 11), rnd.next(0, 11));
	
	// rule 9 - Perish Song - Must be inverse of Recover
	ruleseededMarks.push(recover[2], recover[1], recover[0]);
	
	// rule 10 - Judgement - Always 4 9 3 since that's Arceus' Pokédex Number (and signature move)
	ruleseededMarks.push(4, 9, 3);
	
	setupLinks(rnd.seed); 
}

function setDefaultRules(){ 
	ruleseededMarks = [3, 12, 5, 8, 8, 7, 3, 10, 2, 3, 1, 6, 5, 5, 5, 15, 2, 5, 5, 4, 3, 2, 6, 0, 3, 4, 5, 4, 9, 3];
	setupLinks(1); 
}

function setupLinks(seed) {
	let linkCells = document.querySelectorAll("#mythical-plates a");
	for (let i = 0; i < 18; i ++){
		if (AllmightySinnoh.DebugLog){
			console.log(`Link Data for cell ${i} is ${linkCells[i].dataset.name}`);
		}
		linkCells[i].href = linkCells[i].dataset.name + ".html" + (seed != 1 ? "#" + seed : '');
	}
	
	let markCells = document.querySelectorAll(".movements-table td:nth-child(n+3)");
	for (var i = 0; i < 30; i ++){
		markCells[i].textContent = ruleseededMarks[i];
	}
}