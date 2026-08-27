var alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
// List of Questions:
// 00: Is the last digit of the Serial Number even(0) / odd(1) ?
// 01: Are there (5-50) or more non-needy modules?
// 02: Are there (1-3) or more batteries?
// 03: Is there any AA-type(0) / D-type(1) battery?
// 04: Are there (1-3) or more indicators?
// 05: Is a XXX indicator present?  SND(0)  CLR(1)  CAR(2)  IND(3)  FRQ(4)  SIG(5)  NSA(6)  MSA(7)  TRN(8)  BOB(9)  FRK(10)
// 06: Are there (1-3) or more ports?
// 07: Is a XXX port present?  Parallel(0)  Serial(1)  DVI(2)  PS2(3)  RJ45(4)  StereoRCA(5)
// 08: Is the letter E present in the Serial Number? (0-25 for letter. 14 and 24 are replaced by 4)
// 09: Is the digit (0-9) present in the Serial Number?
// 10: Are there any duplicate port types?
// 11: Are there any duplicate characters in the Serial Number?
// 12: Does the Serial Number have exactly (2-4) Letters?
// 13: Does the Serial Number contain a vowel? (W and Y do not count)
// 14: Is there an empty port plate?
// 15: Does this bomb have 1 or more Strikes?
// 16: Are there 0 solved Modules?
// 17: Is the module Simon's Spider present?
// 18: Is the module Flyswatting present?
// 19: Is the module Langton's Ant present?
// 20: Is the module Butterflies present?
// 21: Is this Plate summoned by the module Allmighty Sinnoh?
// 22: Is another Mythical Plate present (other Insect Plates count, Allmighty Sinnoh doesn't)?
// 23: Does the Serial Number contain a letter from “INSECT”?
// 24: Are there no batteries?
// 25: Are there no ports?
// 26: Are there no indicators?
// 27: Is there the same number of Lits and Unlits indicators?

var selectedQuestions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var questionPayloads = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function setRules(rnd) {
    var allowedQuestions = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27];
    rnd.shuffleFisherYates(allowedQuestions);
    for (var i = 0; i < 14; i ++) {
        selectedQuestions[i] = allowedQuestions[i];
        switch (selectedQuestions[i]){
            case 0: questionPayloads[i] = rnd.next(0, 2); break;
            case 1: questionPayloads[i] = (5 * rnd.next(1, 11)); break;
            case 2: questionPayloads[i] = rnd.next(1, 4); break;
            case 3: questionPayloads[i] = rnd.next(0, 2); break;
            case 4: questionPayloads[i] = rnd.next(1, 4); break;
            case 5: questionPayloads[i] = rnd.next(0, 11); break;
            case 6: questionPayloads[i] = rnd.next(1, 4); break;
            case 7: questionPayloads[i] = rnd.next(0, 6); break;
            case 8: var _value = rnd.next(0, 26); questionPayloads[i] = (_value == 14 || _value == 24) ? 4 : _value; break;
            case 9: questionPayloads[i] = rnd.next(0, 10); break;
            case 12: questionPayloads[i] = rnd.next(2, 5); break;
        }
    }
    setQuestions();
}

function setDefaultRules() {
    selectedQuestions = [13, 27, 7, 14, 15, 11, 23, 0, 1, 18, 17, 21, 3, 19];
    questionPayloads = [0, 0, 1, 0, 0, 1, 0, 0, 10, 0, 0, 0, 0, 0];
    setQuestions();
}

function setQuestions() {
    var cells = document.querySelectorAll("ol.questions li");
    for (var i = 0; i < 14; i ++) {
        cells[i].innerHTML = InsectPlate.FormatRule(selectedQuestions[i], questionPayloads[i]);
    }
}