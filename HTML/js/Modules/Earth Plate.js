function setRules(rnd){
    let ports = [EarthPlate.Serial, EarthPlate.Stereo, EarthPlate.PS2, EarthPlate.DVI, EarthPlate.RJ, EarthPlate.Parallel];
    var cells = document.querySelectorAll(".port-table tr:first-of-type td:nth-of-type(n + 1)");
    rnd.shuffleFisherYates(ports);
    for (var i = 0; i < 6; i ++)
    cells[i].innerText = ports[i];
}

function setDefaultRules(){
    let ports = [EarthPlate.Serial, EarthPlate.Stereo, EarthPlate.PS2, EarthPlate.DVI, EarthPlate.RJ, EarthPlate.Parallel];
    var cells = document.querySelectorAll(".port-table tr:first-of-type td:nth-of-type(n + 1)");
    for (var i = 0; i < 6; i ++)
    cells[i].innerText = ports[i];
}