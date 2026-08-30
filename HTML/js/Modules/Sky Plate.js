function formatReadableTime(time){
    console.log(time);
    if (SkyPlate.Optimized) return "-" + time;
    var hours = (Math.floor(time/3600)).toLocaleString(undefined, {minimumIntegerDigits: 2});
    var minutes = (Math.floor(time/60)%60).toLocaleString(undefined, {minimumIntegerDigits: 2});
    var seconds = (time%60).toLocaleString(undefined, {minimumIntegerDigits: 2});
    return "-" + hours + ':' + minutes + ':' + seconds;
}

function setRules(rnd){
    let edgeworkDependencies = [0, 0, 1, 1, 1, 2];
    let edgeworkTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var cells = document.getElementsByClassName("duration-data");
    rnd.shuffleFisherYates(edgeworkDependencies);
    rnd.shuffleFisherYates(edgeworkTypes);
    for (var i = 0; i < 4; i ++) {
        switch (edgeworkDependencies[i]) {
            case 0:
            var time = rnd.next(24, 60)*300 + rnd.next(0, 12)*5;
            cells[i].innerText = SkyPlate.NoConditionTime(formatReadableTime(time));
            break;
            case 1:
            var time = rnd.next(4, 16)*300 + rnd.next(0, 12)*5;
            cells[i].innerText = SkyPlate.OneConditionTime(formatReadableTime(time), edgeworkTypes[i*2]);
            break;
            case 2:
            var time = rnd.next(3, 9)*300 + rnd.next(0, 12)*5;
            cells[i].innerText = SkyPlate.TwoConditionsTime(formatReadableTime(time), edgeworkTypes[i*2], edgeworkTypes[i*2+1]);
            break;
        }
    }
}

function setDefaultRules(){
    var cells = document.getElementsByClassName("duration-data");
    cells[0].innerText = SkyPlate.DefaultCircle;
    cells[1].innerText = SkyPlate.DefaultSquare;
    cells[2].innerText = SkyPlate.DefaultTriangle;
    cells[3].innerText = SkyPlate.DefaultStar;
}