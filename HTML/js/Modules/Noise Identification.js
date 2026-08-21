var possibleNoises = ["Anisotropic", "Crystal", "Dirt", "Fluid", "Gaussian", "Liquid", "Moisture", "Perlin", "Voronoi", "White"];
var selectedNoises;

function setRules(rnd){
	selectedNoises = rnd.shuffleFisherYates([0,1,2,3,4,5,6,7,8,9]).slice(0, 6).sort();
	showSelectedNoises();
}

function setDefaultRules(){
	selectedNoises = [1,5,6,7,8,9];
	showSelectedNoises();
}

function showSelectedNoises(){
	var images = document.querySelectorAll("#noise-data img");
	var descriptions = document.querySelectorAll("#noise-data td:nth-of-type(2n)");
	var names = document.querySelectorAll("#noise-data th");
	var buttonInidials = document.querySelectorAll("#button");
	var imageTargetName;
	var noiseName;

	for (var n = 0; n < 6; n ++){
		for (var i = 0; i < 4; i ++){
			imageTargetName = possibleNoises[selectedNoises[n]] + "_0" + (i+1) + ".png"
			images[4*n + i].setAttribute("src","./img/Noise Identification/"+ imageTargetName);
		}

		descriptions[n].textContent = NoiseIdentification.noiseDescriptions[selectedNoises[n]];

		noiseName = possibleNoises[selectedNoises[n]]
		names[n].childNodes[0].textContent = noiseName[0];
		names[n].childNodes[1].textContent = noiseName.substr(1);
		buttonInidials[n].textContent = noiseName[0];
	}
}