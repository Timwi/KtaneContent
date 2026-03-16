
async function createSouvenirManual(fncFormatModule, fncSort)
{
	let section = document.querySelector('div.section');
	let curPage = document.querySelector('div.souvenir');
	let curPageIx = 0;
	let curFooter = curPage.parentNode.parentNode.querySelector('.page-footer');
	let curFooterTop = curFooter.offsetTop;

	for (let i = 0; i < SouvenirModuleData.length; i++)
	{
		let mod = SouvenirModuleData[i];
		let moduleDiv = document.createElement('div');
		moduleDiv.className = 'module';
		moduleDiv.innerHTML = fncFormatModule(mod.original, mod.name, mod.questions);

		// Tentatively add this question to the current page and check if this makes the current page overflow
		curPage.appendChild(moduleDiv);
		await document.fonts.ready;
		if (curFooter.offsetTop > curFooterTop)
		{
			// Remove it again and start a new page
			curPage.removeChild(moduleDiv);
			let newPage = document.createElement('div');
			newPage.className = `page page-bg-0${curPageIx % 7 + 1}`;
			newPage.innerHTML = `
				<div class='page-header'>
					<span class='page-header-doc-title'>Keep Talking and Nobody Explodes Mod</span>
					<span class='page-header-section-title'>Souvenir</span>
				</div>
				<div class='page-content'>
					<div class='souvenir'></div>
				</div>
				<div class='page-footer relative-footer'></div>
			`;
			section.appendChild(newPage);

			curPage = newPage.querySelector('div.souvenir');
			curPage.appendChild(moduleDiv);
			curFooter = newPage.querySelector('div.page-footer');
			curFooterTop = curFooter.offsetTop;
			curPageIx++;
		}
	}

	let pageFooters = Array.from(document.querySelectorAll('.page-footer'));
	for (let i = 0; i < pageFooters.length; i++)
		pageFooters[i].innerText = `Page ${i+1} of ${pageFooters.length}`;
}
