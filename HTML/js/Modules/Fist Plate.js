function setRules(rnd){
    let order = [FistPlate.Up, FistPlate.Down, FistPlate.Left, FistPlate.Right];
    var cells = document.getElementsByClassName("directions-data");
    rnd.shuffleFisherYates(order);
    for (var i = 0; i < 4; i ++){
        cells[i].innerText = order[i];
        cells[4+i].innerText = order[i];
    }
}

function setDefaultRules(){
    let order = [FistPlate.Up, FistPlate.Down, FistPlate.Left, FistPlate.Right];
    var cells = document.getElementsByClassName("directions-data");
    for (var i = 0; i < 4; i ++){
        cells[i].innerText = order[i];
        cells[4+i].innerText = order[i];
    }
}