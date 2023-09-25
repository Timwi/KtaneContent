var firstFruit = 0;
var secondFruit = 0;
var thirdFruit = 0;
var fourthFruit = 0;
var pressesOnFirstButton = 0;
var pressesOnSecondButton = 0;
var ledColour = 0;
var screenContent = "";
var step = 0;
var ws = new WebSocket("wss://api.mrmelon54.com/v1/remote-math");
ws.isConnected = false;
var preventRefresh = false;

function resetModule() {
  screenContent = "";
  pressesOnFirstButton = 0;
  pressesOnSecondButton = 0;
  step = 0;
  ledColour = 0;
  $("module fruits fruit").attr("q", "0");
  $("module led").attr("c", "0");
  $("module screen").text(screenContent);
}

function sendSolution() {
  var a = [pressesOnFirstButton, pressesOnSecondButton, screenContent, ledColour];
  a = a.map((x) => x.toString());
  ws.send("PuzzleSolution::" + a.join("::"));
}

$(document).ready(function () {
  $("disconnected").hide(0);
  $("puzzleinvalid").hide(0);
  $("puzzlecomplete").hide(0);
  $("puzzledisconnected").hide(0);
  $("twitchplays").hide(0);
  $("module fruits fruit").attr("q", "0");
  $("module fruits fruit").click(function () {
    var p = $(this).attr("p");
    if (p == "1") {
      if (step != 0) {
        ws.send("PuzzleStrike");
        return resetModule();
      }
      pressesOnFirstButton++;
      $(this).attr("q", pressesOnFirstButton.toString());
    } else if (p == "2") {
      if (step == 0) step++;
      if (step != 1) {
        ws.send("PuzzleStrike");
        return resetModule();
      }
      pressesOnSecondButton++;
      $(this).attr("q", pressesOnSecondButton.toString());
    }
  });
  $("module buttons button").click(function () {
    var b = $(this).attr("b");
    if (step == 3) {
      if (b == "=") return sendSolution();
    }
    if (step == 0) step++;
    if (step == 1) step++;
    if (step != 2) {
      ws.send("PuzzleStrike");
      return resetModule();
    }
    if (b == "<") screenContent = screenContent.slice(0, screenContent.length - 1);
    else screenContent += b;
    $("module screen").text(screenContent);
  });
  $("module led").click(function () {
    if (step == 2) step++;
    if (step != 3) {
      ws.send("PuzzleStrike");
      return resetModule();
    }
    ledColour = (ledColour + 1) % 6;
    $("module led").attr("c", ledColour);
  });
  $("#inputcode").on("keydown", function (e) {
    if (e.which == 13) {
      a = $(this).val();
      if (a == null || a == "" || a.length != 6) {
        $(this).parents("connecting").slideUp(500);
        $("puzzleinvalid").slideDown(500);
        preventRefresh = false;
      } else {
        $(this).parents("connecting").slideUp(500);
        ws.send("PuzzleConnect::" + a.toUpperCase());
        preventRefresh = true;
      }
    }
  });
});

ws.onopen = function (e) {
  preventRefresh = true;
  ws.isConnected = true;
  ws.send('rin');
};

ws.onmessage = function (event) {
  if (event.data == "ping") {
    ws.send("pong");
    ws.lastPong = new Date().getTime();
    setTimeout(() => {
      if (new Date().getTime() - ws.lastPong > 6000) {
        ws.close();
      }
    }, 7000);
    return;
  }
  if (event.data == "PuzzleStrike") {
    resetModule();
    return;
  }
  if (event.data == "PuzzleInvalid") {
    preventRefresh = false;
    $("puzzleinvalid").slideDown(500);
  } else if (event.data == "PuzzleDisconnected") {
    preventRefresh = true;
    $("puzzledisconnected").slideDown(500);
    return;
  } else if (event.data == "PuzzleConnected") {
    $("disconnected").hide(500);
    return;
  } else if (event.data == "PuzzleComplete") {
    preventRefresh = false;
    $("puzzlecomplete").slideDown(500);
    return;
  } else if (event.data == "PuzzleActivateTwitchPlays") {
    $("twitchplays").slideUp(500);
  }
  reg = /^PuzzleFruits::([0-5])::([0-5])::([0-5])::([0-5])$/.exec(event.data);
  if (reg !== null) {
    $("fruit[p=1]").attr("f", reg[1]);
    $("fruit[p=2]").attr("f", reg[2]);
    $("fruit[p=1]").attr("t", reg[3]);
    $("fruit[p=2]").attr("t", reg[4]);
  }
  reg = /^PuzzleFruitText::([0-5])::([0-5])$/.exec(event.data);
  if (reg !== null) {
    $("fruit[p=1]").attr("c", reg[1]);
    $("fruit[p=2]").attr("c", reg[2]);
  }
  reg = /^PuzzleTwitchCode::([0-9]+)::([0-9]{3})$/.exec(event.data);
  if (reg !== null) {
    $("twitchplays").slideDown(500);
    $("#twitchid").text(reg[1]);
    $("#twitchcode").text(reg[2]);
  }
};

ws.onclose = function (event) {
  preventRefresh = false;
  $("disconnected").slideDown(500);
  if (event.wasClean) {
    ws.isConnected = false;
  } else {
    ws.isConnected = false;
  }
};

ws.onerror = function (error) {
  preventRefresh = false;
  ws.isConnected = false;
  alert("There was an error. We disconnected you just in time :D");
};
