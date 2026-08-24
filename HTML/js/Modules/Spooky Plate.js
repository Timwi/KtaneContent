function setRules(rnd){
    let ports = [SpookyPlate.Stereo, SpookyPlate.PS2, SpookyPlate.Serial, SpookyPlate.RJ, SpookyPlate.DVI, SpookyPlate.Parallel];
    var cells = document.querySelectorAll(".ports tr:first-of-type th");
    rnd.shuffleFisherYates(ports);
    for (var i = 0; i < 6; i ++)
    cells[i].innerText = ports[i];
}

function setDefaultRules(){
    let ports = [SpookyPlate.Stereo, SpookyPlate.PS2, SpookyPlate.Serial, SpookyPlate.RJ, SpookyPlate.DVI, SpookyPlate.Parallel];
    var cells = document.querySelectorAll(".ports tr:first-of-type th");
    for (var i = 0; i < 6; i ++)
    cells[i].innerText = ports[i];
}