function setup_BombIt(lang)
{
	document.addEventListener('DOMContentLoaded', function()
	{
		const lines = ['PressIt', 'FlipIt', 'SnipIt', 'SlideIt', 'TiltIt', 'SolveIt'];

		let lis = Array.from(document.querySelectorAll('#bomb-it-actions li'));

		for (let i = 0; i < lines.length; i++)
		{
			let button = document.createElement('a');
			button.setAttribute('href', '#');
			button.setAttribute('class', 'play-button');
			button.innerText = '▶';
			button.onclick = function ()
			{
				if (button.classList.contains('playing'))
				{
					button.classList.remove('playing');
					audio.pause();
					audio.currentTime = 0;
				}
				else
				{
					button.classList.add('playing');
					audio.play();
				}
				return false;
			};

			let audio = document.createElement('audio');
			audio.addEventListener('error', function() { button.classList.add('failed'); });
			audio.addEventListener('ended', function() { button.classList.remove('playing'); });
			audio.setAttribute('src', `../HTML/audio/Bomb It!/${lines[i]}${lang}.mp3`);

			lis[i].insertBefore(button, lis[i].firstChild);
			lis[i].insertBefore(audio, lis[i].firstChild);
		}
	});
}
