
let FULLDATE = new Date()
var DateOffset = sessionStorage.getItem('reloaded') ? sessionStorage.getItem('DateOffset') : 0;
FULLDATE.setDate(FULLDATE.getDate()-DateOffset)
const DATE = FULLDATE.getDate();
const MONTH = 1+FULLDATE.getMonth();
const YEAR = FULLDATE.getFullYear();
const DAY = 1+FULLDATE.getDay();




function AddDateOffset() {
    DateOffset++;
    sessionStorage.setItem('DateOffset', DateOffset);
    sessionStorage.setItem('reloaded', true);
    location.reload();
}
function SubtractDateOffset(){
    DateOffset--;
    sessionStorage.setItem('DateOffset', DateOffset);
    sessionStorage.setItem('reloaded', true);
    location.reload();
}


let PaddedDay = DATE;
if(PaddedDay<10){PaddedDay='0'+PaddedDay;}
let PaddedMonth = MONTH;
if(PaddedMonth<10){PaddedMonth='0'+PaddedMonth;}


document.getElementById("DateOfRelease").innerHTML="<button onclick ='AddDateOffset()'>&lt</button> Date of release: "+YEAR+"-"+PaddedMonth+"-"+PaddedDay;
if(DateOffset>-1){document.getElementById("DateOfRelease").innerHTML+=" <button onclick = 'SubtractDateOffset()'>&gt</button>"}




const RULENUMBER = 15+(DAY%3)-(DATE%3);
/*
0 means tap one button
1 means tap all buttons in an order
2 means tap a button at a specific timer time.
*/
const INPUTMETHOD = (YEAR+DATE+DAY+MONTH)%3;
const RULES = [];
const RuleText=[];

var seed = YEAR*10000+MONTH*100+DAY;
var a = 1664525, c = 1013904223, m = Math.pow(2, 32);

function LCG(a, c, m, x) {
    return (a * x + c) % m;
  }

for (var i = 0; i < 18; i++) {
    seed = LCG(a, c, m, seed);
    RULES.push((seed % 16)); //Change if rules increase
}

if (RULES[0] == 5||RULES[0]==6) { RULES[0] = 8;}
let WasLastValue5 = false;
for(var i = 0;i<RULES.length;i++){
    if(WasLastValue5&&RULES[i]==5){RULES[i]=6;WasLastValue5=false; continue;}
    if(RULES[i]==5){WasLastValue5=true;}
    else{WasLastValue5=false;}
}

let FirstSencenceText = "";
switch(INPUTMETHOD){
    case 0:
        FirstSencenceText="In order to solve this module, the defuser must tap the button with the highest final value. To find the final values, take each button's value shown on the module and apply the following rules. If after a rule duplicates appear, add 1 to the value with the highest initial value. Repeat this until there are no duplicates.";
        break;
    case 1:
        FirstSencenceText="This module is solved by tapping all buttons in an ascending order according to their final values. To determine the final values, take each button's value shown on the module and apply the following rules. If after a rule duplicates appear, add 1 to the value with the highest initial value. Repeat this until there are no duplicates.";
        break;
    case 2:
        FirstSencenceText="To solve this module, one must tap the button which has the highest final value when the last digit of the timer is the same for the highest final value. To find the final values, take each button's value shown on the module and apply the following rules. If after a rule duplicates appear, add 1 to the value with the highest initial value. Repeat this until there are no duplicates.";
        break;
}



switch(DAY){
    case 1:
        document.getElementById("flavour_text").innerHTML += "";
        break;
    case 2:
        document.getElementById("flavour_text").innerHTML += "?";
        break;
    case 3:
        document.getElementById("flavour_text").innerHTML += ".";
        break;
    case 4:
        document.getElementById("flavour_text").innerHTML += "!";
        break;
    case 5:
        document.getElementById("flavour_text").innerHTML += "?!";
        break;
    case 6:
        document.getElementById("flavour_text").innerHTML += "???";
        break;
    case 7:
        document.getElementById("flavour_text").innerHTML += "?!";
        break;        
}

document.getElementById("FirstSentence").innerHTML = FirstSencenceText;


for(let x=0;x<RULENUMBER;x++){
    switch(RULES[x]){
        case 0:
            RuleText.push("Take each value%6+1. Then, add the position of the serial number corresponding to that value. If the position is a letter, add the alphanumeric position.");
            break;
        case 1:
            RuleText.push("Take each value's prime factors. Sum them up. Then replace each value with the sum.");
            break;
        case 2:
            RuleText.push("Replace the highest value with the avarage of all other values. Round down if necessary.");
            break;
        case 3:
            RuleText.push("Swap the values between the lowest number and the highest.");
            break;
        case 4: 
            RuleText.push("Add the intial value for each value.");
            break;
        case 5:
            RuleText.push("Undo the last operation done to the highest value.");
            break;
        case 6:
            RuleText.push("Replace the highest value with it's initial value.");
            break;
        case 7:
            RuleText.push("Take the square root of each value. Round down.");
            break;
        case 8:
            RuleText.push("Take each value. If the value is even, divide it by 2. If it is odd, multiply it by 3 and add 1.");
            break;
        case 9:
            RuleText.push("Square each value.");
            break;
        case 10:
            RuleText.push("Add the number of solved modules to each value.");
            break;
        case 11:
            RuleText.push("If any value is less than or equal to the number of modules solved, add 20 to that value.");
            break;
        case 12:
            RuleText.push("If any value is less than 10, add 20 to that value.");
            break;
        case 13:
            RuleText.push("If any value (that is not the lowest) is a multiple of the lowest value, multiply that value by 2. (ignore if the lowest value is 0)");
            break;
        case 14:
            RuleText.push("Add the number of minutes left to the lowest and highest values.");  
            break;
        case 15:
            RuleText.push("If the number of minutes left is less than the sum of all values, add 10 to the lowest value. If not, add 30 to the lowest value.");
            break;
    }
}


let orderedList = document.getElementById("MainList");
let FirstTimeSaw5 = false;

for(let x = 0; x < RuleText.length; x++){
    let listItem = document.createElement("li");
    listItem.textContent = RuleText[x];
    orderedList.appendChild(listItem);

    if(FirstTimeSaw5 === false && RULES[x] === 5){
        FirstTimeSaw5 = true; 
        listItem.innerHTML+=" (Note: Adding 1's because of duplicates do not count as operations. Change the value back to what it was before the last operation mentioned on this page. If the value doesn't get changed, don't alter it)";
    }
    else if(RULES[x]==5){listItem.innerHTML+=" (See note above)";}
}


