// A list of internal port names used to convert to their display name.
const PortNames = {
    0: "Empty Port Plate",
    RJ45: "RJ-45",
    PS2: "PS/2",
    StereoRCA: "Stereo RCA",
    DVI: "DVI-D",
    Parallel: "Parallel",
    Serial: "Serial",
    ComponentVideo: "Component Video",
    CompositeVideo: "Composite Video"
};

// A list of blacklisted strings for the filtered logs.
const blacklist = [
    "[BombGenerator] BombTypeEnum: Default",
    "[BombGenerator] Instantiated TimerComponent",
    "[BombGenerator] Instantiated EmptyComponent",
    "[BombGenerator] Filling remaining spaces with empty components.",
    "[BombGenerator] Instantiating RequiresTimerVisibility components on",
    "[BombGenerator] Instantiating remaining components on any valid face.",
    "[Mod-",
    "[Factory]",
    "[MenuPage]",
    "[PaceMaker]",
    "[AlarmClock]",
    "[StatsManager]",
    "[MultipleBombs]",
    "[LogfileHotkey]",
    "[ServicesSteam]",
    "[MissionManager]",
    "[PrefabOverride]",
    "[Profile Revealer]",
    "[FileUtilityHelper]",
    "[AlarmClockExtender]",
    "[Alarm Clock Extender]",
    "[PlayerSettingsManager]",
    "[MultipleBombs-PaceMaker]",
    "[Localization] Adding mod term: ",
    "[LeaderboardBulkSubmissionWorker]",
    "Tick delay:",
    "Calculated FPS: ",
    "The referenced script on this Behaviour ",
    "Font size and style overrides are only supported for dynamic fonts.",
];

// All of the data used for parsing
const parseData = [
    {
        loggingTag: "State",
        matches: [
            {
                regex: /Enter GameplayState/,
                handler: function () {
                    bombgroup = undefined;
                    bomb = undefined;
                }
            },
            {
                regex: /OnRoundEnd\(\)/,
                handler: function () {
                    bombgroup.FilterLines();
                    bombgroup = undefined;
                    bomb = undefined;
                }
            }
        ]
    },
    {
        loggingTag: "Bomb",
        matches: [
            {
                regex: /Strike from (?:.+)! (\d+) \/ \d+ strikes/,
                handler: function (matches) {
                    if (bombgroup.isSingleBomb) {
                        bomb.Strikes = parseInt(matches[1]);

                        if (bomb.Strikes == bomb.TotalStrikes) {
                            bomb.State = "Exploded (Strikes)";
                        }
                    }
                }
            },
            {
                regex: /Boom/,
                handler: function () {
                    if (GetBomb().State == "Unsolved") {
                        GetBomb().State = "Exploded";

                        if (bombgroup.isSingleBomb && bomb.Strikes != bomb.TotalStrikes) {
                            bomb.State = "Exploded (Time Ran Out)";
                            bomb.TimeLeft = 0;
                        }
                    }
                }
            },
            {
                regex: /A winner is you!!/,
                handler: function () {
                    if (bombgroup.isSingleBomb) {
                        bomb.State = "Solved";
                        bomb.Solved = bomb.TotalModules;
                    }
                }
            }
        ]
    },
    {
        loggingTag: "BombGenerator",
        matches: [
            {
                regex: /Generating bomb with seed (-?\d+)/,
                handler: function (matches) {
                    bomb = new Bomb(parseInt(matches[1]));

                    if (!bombgroup) {
                        bombgroup = new BombGroup();
                        lastBombGroup = bombgroup;
                        bombSerialIndex = 0;
                        bombgroup.StartLine = linen;
                        if (ruleseed)
                            bombgroup.RuleSeed = ruleseed;

                        parsed.push(bombgroup);
                    }

                    bombgroup.Bombs.push(bomb);
                }
            },
            {
                regex: /Generator settings: Time: (\d+), NumStrikes: (\d+)/,
                handler: function (matches) {
                    bomb.Time = parseInt(matches[1]);
                    bomb.TimeLeft = bomb.Time;
                    bomb.TotalStrikes = parseInt(matches[2]);
                }
            },
            {
                regex: /Selected (.+?) \(.+ \((.+)\)\)/,
                handler: function (matches) {
                    var tree = [];
                    tree.groups = new Groups();
                    bomb.Modules[matches[1]] = {
                        IDs: [],
                        Tree: tree,
                        Events: []
                    };

                    let moduleData = getModuleData(matches[1], "moduleID");
                    if (!moduleData) {
                        moduleData = {
                            moduleID: matches[1],
                        };
                    }

                    if (moduleData.displayName == undefined) moduleData.displayName = convertID(moduleData.moduleID);
                    if (moduleData.icon == undefined) moduleData.icon = moduleData.displayName;

                    bomb.Modules[matches[1]].moduleData = moduleData;

                    bomb.TotalModules++;
                    if (matches[2].includes("Needy")) {
                        bomb.Needies++;
                    }

                    moduleData.needy = matches[2].includes("Needy");
                }
            },
            {
                regex: /Instantiated CryptModule on face/,
                handler: function () {
                    var mod = bomb.GetModule("CryptModule");
                    mod.push("Phrase: " + lines[linen - 2]);
                    mod.push("Answer: " + lines[linen - 1]);
                }
            }
        ]
    },
    {
        loggingTag: "WidgetGenerator",
        matches: [
            {
                regex: /Added widget: (.+) at/,
                handler: function (matches) {
                    bomb.Widgets++;

                    if (matches[1] == "ModWidget") {
                        bomb.ModdedWidgets++;
                    } else if (matches[1] == "BatteryWidget") {
                        bomb.BatteryWidgets++;
                    }
                }
            }
        ]
    },
    {
        loggingTag: "BatteryWidget",
        matches: [
            {
                regex: /Randomizing Battery Widget: (\d)/,
                handler: function (matches) {
                    bomb.Batteries.push(parseInt(matches[1]));
                }
            }
        ]
    },
    {
        loggingTag: "PortWidget",
        matches: [
            {
                regex: /Randomizing Port Widget: (.+)/,
                handler: function (matches) {
                    if (matches[1] != "0") {
                        bomb.PortPlates.push(matches[1].split(", "));
                    } else {
                        bomb.PortPlates.push([]);
                    }
                }
            }
        ]
    },
    {
        loggingTag: "IndicatorWidget",
        matches: [
            {
                regex: /Randomizing Indicator Widget: (unlit|lit) ([A-Z]{3})/,
                handler: function (matches) {
                    bomb.Indicators.push([matches[1], matches[2]]);
                }
            }
        ]
    },
    {
        loggingTag: "SerialNumber",
        matches: [
            {
                regex: /Randomizing Serial Number: ([A-Z0-9]{6})/,
                handler: function (matches) {
                    // Workaround because the serial numbers for multiple bombs are all listed after the edgework for all of the bombs.
                    if (bombgroup)
                        bombgroup.Bombs[bombSerialIndex++].Serial = matches[1];
                    else
                        bomb.Serial = matches[1];
                }
            }
        ]
    },
    {
        loggingTag: "DayTime",
        matches: [
            {
                regex: /Day of the week: (\(colors(?: not)? enabled\)) (.+) (.+-.+-.+) (\(\w{2}\/\w{2}\)) \/ Manufacture Date: (.+-.+)/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`Day of the Week: ${matches[3]} ${matches[4]} Color: ${matches[2]} ${matches[1]}`);
                    bomb.DayTimeWidgets.push(["DayoftheWeek", matches[3], matches[2], matches[1] == "(colors enabled)", matches[4]]);
                    bomb.ModdedWidgetInfo.push(`Manufacture Date: ${matches[5]}`);
                    bomb.DayTimeWidgets.push(["ManufactureDate", matches[5]]);
                }
            },
            {
                regex: /Day of the week: (\(colors(?: not)? enabled\)) (.+) (.+-.+-.+) (\(\w{2}\/\w{2}\))/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`Day of the Week: ${matches[3]} ${matches[4]} Color: ${matches[2]} ${matches[1]}`);
                    bomb.DayTimeWidgets.push(["DayoftheWeek", matches[3], matches[2], matches[1] == "(colors enabled)", matches[4]]);
                }
            },
            {
                regex: /Manufacture Date: (.+-.+)/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`Manufacture Date: ${matches[1]}`);
                    bomb.DayTimeWidgets.push(["ManufactureDate", matches[1]]);
                }
            },
            {
                regex: /Chosen time: (\d{2}:\d{2})(MIL|PM|AM)/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`Randomized Time: ${matches[1]} ${matches[2]}`);
                    bomb.DayTimeWidgets.push(["RandomizedTime", matches[1], matches[2]]);
                }
            }
        ]
    },
    {
        loggingTag: "EncryptedIndicatorWidget",
        matches: [
            {
                regex: /Randomizing: ((?:un)?lit) ([ԒใɮʖฬนÞฏѨԈดลЖ]{3}) acting as (?:un)?lit ([A-Z]{3})/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`Encrypted Indicator: ${matches[1]} ${matches[2]} (${matches[3]})`);
                    bomb.ModdedIndicators.push(["EncryptedIndicatorWidget", matches[1], matches[2]]);
                }
            },
            {
                regex: /Randomizing: ((?:un)?lit) ([A-Z]{3})/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`Encrypted Indicator: ${matches[1]} ${matches[2]}`);
                    bomb.ModdedIndicators.push(["EncryptedIndicatorWidget", matches[1], matches[2]]);
                }
            }
        ]
    },
    {
        loggingTag: "MultipleWidgets",
        matches: [
            {
                regex: /Widget #[12] = TwoFactor/,
                handler: function () {
                    bomb.ModdedWidgetInfo.push(`MultipleWidgets: Two Factor`);
                    bomb.ModdedTwoFactor.push(`MultipleWidgets:TwoFactor`);
                }
            },
            {
                regex: /Encrypted Indicator ((?:un)?lit|Black|White|Gray|Red|Orange|Yellow|Green|Blue|Purple|Magenta) ([ԒใɮʖฬนÞฏѨԈดลЖ]{3}) acting as (?:(?:un)?lit|Black|White|Gray|Red|Ornage|Yellow|Green|Blue|Purple|Magenta) ([A-Z]{3})/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`MultipleWidgets: Encrypted Indicator: ${matches[1]} ${matches[2]} (${matches[3]})`);
                    bomb.ModdedIndicators.push(["MultipleWidgets:EncryptedIndicator", matches[1], matches[2]]);
                }
            },
            {
                regex: /Indicator ((?:un)?lit|Black|White|Gray|Red|Orange|Yellow|Green|Blue|Purple|Magenta) ([A-Z]{3})/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`MultipleWidgets: Indicator: ${matches[1]} ${matches[2]}`);
                    bomb.ModdedIndicators.push(["MultipleWidgets:Indicator", matches[1], matches[2]]);
                }
            },
            {
                regex: /Putting ([0-4]) batter(?:ies|y) into a holder that fits ([1-4]) batter(?:ies|y)./,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`MultipleWidgets: Batteries: ${matches[1]} in ${matches[2]}`);
                    bomb.ModdedBatteries.push(["MultipleWidgets:Batteries", parseInt(matches[1]), parseInt(matches[2])]);
                }
            },
            {
                regex: /Ports \((Vanilla 1|Vanilla 2|New Ports|TV\/Monitor Ports|Computer Ports|Everything)\): (.*)/,
                handler: function (matches) {
                    bomb.ModdedWidgetInfo.push(`MultipleWidgets: Ports (${matches[1]}): ${matches[2]}`);
                    if (matches[2] != "None") {
                        bomb.ModdedPortPlates.push(["MultipleWidgets:Ports", matches[2].split(", ")]);
                    } else {
                        bomb.ModdedPortPlates.push(["MultipleWidgets:Ports", []]);
                    }
                }
            }
        ]
    },
    {
        loggingTag: "TwoFactorWidget",
        matches: [
            {
                regex: /Two Factor present/,
                handler: function () {
                    bomb.ModdedWidgetInfo.push(`Two Factor`);
                    bomb.ModdedTwoFactor.push(`TwoFactorWidget`);
                }
            }
        ]
    },
    {
        loggingTag: "Voltage Meter",
        matches: [
            {
                regex: /Voltage: (\d+\.\d+|\d+)V/,
                handler: function (matches) {
                    var voltage = parseFloat(matches[1]);
                    bomb.ModdedWidgetInfo.push(`Voltage Meter: ${voltage} volts`);
                    bomb.VoltageMeterWidgets.push(voltage);
                }
            }
        ]
    },
    {
        loggingTag: "MultipleBombs",
        matches: [
            {
                regex: /All bombs solved, what a winner!/,
                handler: function () {
                    var currentBomb = GetBomb();
                    currentBomb.State = "Solved";
                    currentBomb.Solved = currentBomb.TotalModules;
                }
            }
        ]
    },
    {
        loggingTag: "NumberedIndicator",
        matches: [
            {
                regex: /Added ((?:UN)?LIT) ([A-Z]{3}), display is (\w{3}), color is ([A-Z]+)/,
                handler: function (matches) {
                    matches[1] = matches[1].toLowerCase();
                    matches[4] = matches[4].toLowerCase();
                    bomb.ModdedWidgetInfo.push(`Numbered Indicator: ${matches[1]} ${matches[4]} ${matches[2]}. Display: ${matches[3]}`);
                    bomb.ModdedIndicators.push(["NumberedIndicator", matches[1], matches[2], matches[3], matches[4]]);
                }
            }
        ]
    },
    {
        loggingTag: "PaceMaker",
        matches: [
            {
                regex: /PlayerSuccessRating: .+ \(Factors: solved: (.+), strikes: (.+), time: (.+)\)/,
                handler: function (matches) {
                    if (bombgroup !== undefined && bombgroup.isSingleBomb) {
                        const num2 = parseFloat(matches[1]);
                        if (num2 != 1) bomb.Solved = Math.round(num2 * 2 * (bomb.TotalModules - 1));
                        else bomb.Solved = bomb.TotalModules;
                        bomb.TimeLeft = parseFloat(matches[3]) / 0.2 * bomb.Time;

                        if (bomb.TimeLeft === 0) {
                            bomb.State = "Exploded (Time Ran Out)";
                        }
                    }
                }
            },
            {
                regex: /Round start! Mission: (.+) Pacing Enabled: /,
                handler: function (matches) {
                    GetBomb().MissionName = matches[1];
                }
            }
        ]
    },
    {
        loggingTag: "MenuPage",
        matches: [
            {
                regex: /ReturnToSetupRoom/,
                handler: function () {
                    bombgroup.FilterLines();
                }
            }
        ]
    },
    {
        loggingTag: "Vanilla Rule Modifier",
        matches: [
            {
                regex: /Generating Rules based on Seed (\d+)/,
                handler: function (m) {
                    ruleseed = m[1];
                }
            }
        ]
    },
    {
        loggingTag: "Rule Seed Modifier",
        matches: [
            {
                regex: /The Seed is (\d+)/,
                handler: function (m) {
                    bombgroup.RuleSeed = m[1];
                }
            }
        ]
    },
    {
        loggingTag: "Tweaks",
        matches: [
            {
                regex: /LFABombInfo (\d+)/,
                handler: function (matches) {
                    // Parse the JSON based on the number of lines specified in the log message.
                    const bombInfo = JSON.parse(readMultiple(parseInt(matches[1])).replace(/\n/g, ""));

                    bombgroup.LoggedSerials.push(bombInfo.serial);

                    // Find the bomb being referenced based on it's serial number
                    let targetBomb;
                    for (const bomb of bombgroup.Bombs) {
                        if (bomb.Serial == bombInfo.serial) {
                            targetBomb = bomb;
                            break;
                        }
                    }

                    // Set the display names for all the modules we got.
                    for (const moduleType in targetBomb.Modules) {
                        if (bombInfo.displayNames[moduleType] == undefined) continue;
                        var data = targetBomb.Modules[moduleType].moduleData;
                        var name = bombInfo.displayNames[moduleType];

                        if (data.loggingTag == data.displayName) {
                            parseKeys.loggingTag[name] = parseKeys.loggingTag[data.loggingTag];
                            data.loggingTag = name;
                        }

                        if (parseKeys.hasOwnProperty("displayName"))
                            parseKeys.displayName[name] = parseKeys.displayName[data.displayName];

                        data.displayName = name;
                    }

                    // Pass along the case information
                    targetBomb.Anchors = bombInfo.anchors;
                    targetBomb.ModuleOrder = bombInfo.modules;
                    targetBomb.LoggingIDs = bombInfo.ids;

                    // Make sure each module ID is on the correct bomb.
                    for (const moduleType in bombInfo.ids) {
                        if (moduleType == "Timer") continue; // The timer shouldn't have an ID, so just ignore it.

                        for (const id of bombInfo.ids[moduleType]) {
                            // Create the ID'd module on the correct bomb.
                            var newModInfo = targetBomb.GetModuleID(moduleType, id);

                            // If we are already on the first bomb, we don't need do anything else.
                            if (targetBomb == bombgroup.Bombs[0]) continue;

                            // See if the module type got put on the first bomb by default.
                            let modInfo;
                            for (const bomb of bombgroup.Bombs) {
                                if (bomb == targetBomb) continue;

                                modInfo = bomb.GetMod(moduleType);
                                if (modInfo != undefined)
                                    break;
                            }

                            if (!modInfo) continue;

                            // See if it has the ID we're looking at
                            for (const mod of modInfo.IDs) {
                                if (mod[0] == "#" + id) {
                                    // Transfer over any properties.
                                    for (const prop in mod[1]) {
                                        if (mod[1].hasOwnProperty(prop))
                                            newModInfo[prop] = mod[1][prop];
                                    }

                                    // Remove it from the first bomb.
                                    modInfo.IDs.splice(modInfo.IDs.indexOf(mod), 1);
                                }
                            }
                        }
                    }

                    // Reparse any lines that might now match because we have proper module names.
                    for (const lineData of bombgroup.ParseAgain) {
                        for (var modID in targetBomb.Modules) {
                            if (bombInfo.displayNames[modID] == undefined) continue;

                            if (targetBomb.Modules[modID].moduleData.displayName == lineData.modName) {
                                readDirectly(lineData.line, modID, lineData.id);
                            }
                        }
                    }
                }
            },
            {
                regex: /LFAEvent (\d+)/,
                handler: function (matches) {
                    // Parse the JSON based on the number of lines specified in the log message.
                    const eventInfo = JSON.parse(readMultiple(parseInt(matches[1])).replace(/\n/g, ""));
                    switch (eventInfo.type) {
                        case "STRIKE":
                        case "PASS": {
                            const mod = lastBombGroup.GetMod(eventInfo.moduleID, eventInfo.loggingID);
                            mod.Events.push(eventInfo);

                            if (bombgroup != null) bombgroup.Events.push(eventInfo);
                            else lastBombGroup.Events.splice(lastBombGroup.Events.length - 1, 0, eventInfo);

                            if (eventInfo.type == "PASS" && bombgroup != null && bombgroup.isSingleBomb && !mod.moduleData.needy)
                                bombgroup.loggedBombs[0].Solved++;

                            break;
                        }
                        case "ROUND_START":
                            GetBomb().MissionName = eventInfo.mission;
                            break;
                        case "BOMB_DETONATE":
                            for (const bomb of bombgroup.loggedBombs) {
                                if (bomb.Serial == eventInfo.serial) {
                                    bomb.Solved = eventInfo.solves;
                                    bomb.Strikes = eventInfo.strikes;
                                    bomb.TimeLeft = eventInfo.bombTime;
                                    bomb.State = `Exploded (${bomb.Strikes == bomb.TotalStrikes ? "Strikes" : "Time Ran Out"})`;

                                    bombgroup.Events.push(eventInfo);
                                }
                            }

                            break;
                        case "BOMB_SOLVE":
                            for (const bomb of bombgroup.loggedBombs) {
                                if (bomb.Serial == eventInfo.serial) {
                                    bomb.Solved = eventInfo.solves;
                                    bomb.Strikes = eventInfo.strikes;
                                    bomb.TimeLeft = eventInfo.bombTime;
                                    bomb.State = "Solved";

                                    bombgroup.Events.push(eventInfo);
                                }
                            }

                            break;
                    }
                }
            }
        ]
    },
    {
        loggingTag: "LFABombPreviewService",
        matches: [
            {
                regex: /Camera render for bomb:/,
                handler: function () {
                    lastBombGroup.PreviewImage = readLine();
                }
            }
        ]
    },

    // ** MODULES START HERE ** //

    {
        displayName: "101 Dalmatians",
        loggingTag: "101 Dalmatians",
        moduleID: "OneHundredAndOneDalmatiansModule",
        matches: [
            {
                regex: /Showing fur pattern (\d+) rotated (\d+)° clockwise/,
                handler: function (m, module) {
                    module.push({
                        label: 'Fur pattern shown on module:', obj: $(`<div style="
                            border-radius: 100%;
                            background-image: url('img/101 Dalmatians/Fur${m[1]}.png');
                            background-size: contain;
                            width: 10cm;
                            height: 10cm;
                            transform: rotate(${m[2]}deg);
                        "></div>`)
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "14",
        moduleID: "14",
        loggingTag: "14",
        matches: [
            {
                regex: /At stage (\d+), The digit shown on the ([RGB]) channel was ((?:standard|inverted) [0-9A-Z]) \((-?\d+)\)\. The (.) function outputs (.* = (-?\d+) \((?:standard|inverted) [0-9A-Z]\))/,
                handler: function (matches, module) {
                    console.log(matches[0]);
                    if (!module.TableData) {
                        module.TableData = [];
                        module.CorrectValues = {};
                        module.CorrectValuesFull = {};
                        module.ListObject = {
                            label: 'Module information:', obj: $(`<table style='border-collapse: collapse; text-align: center'>
                            <tr>
                                <th colspan='2'>Stages</th>
                                <td class='sep' rowspan='2'></td>
                                <th colspan='3'>Display</th>
                                <td class='sep' rowspan='2'></td>
                                <th colspan='3'>Calculation</th>
                            </tr>
                            <tr>
                                <th>#</th>
                                <th>LED</th>
                                <th style='background: #f99'>R</th>
                                <th style='background: #8f8'>G</th>
                                <th style='background: #aaf'>B</th>
                                <th style='background: #f99'>R</th>
                                <th style='background: #8f8'>G</th>
                                <th style='background: #aaf'>B</th>
                            </tr>
                        </table>`)
                        };
                        module.push(module.ListObject);
                        module.SetCss = function () {
                            module.ListObject.obj.find('td,th').get().forEach(x => { x.style.border = '1px solid black'; x.style.padding = '.3em .6em'; });
                            module.ListObject.obj.find('.sep').get().forEach(x => { x.setAttribute('rowspan', 2 + module.TableData.length); x.style.border = 'none'; });
                        };
                    }
                    while (module.TableData.length <= matches[1])
                        module.TableData.push({});
                    module.TableData[matches[1]][matches[2]] = { fulldisplay: matches[3], display: matches[4], led: matches[5], full: matches[6], result: matches[7] };
                    if (matches[2] === 'B') {
                        let ledColors = {
                            K: '#888',
                            B: '#88f',
                            G: '#8f8',
                            C: '#8ff',
                            R: '#f88',
                            M: '#f8f',
                            Y: '#ff8',
                            W: '#fff',
                        };
                        let ix = +matches[1];
                        module.ListObject.obj.append($(`<tr>
                            <td>${ix}</td><td style='background: ${ledColors[module.TableData[ix].R.led]}'>${module.TableData[ix].R.led}</td>
                            <td style='background: #fbb' title='${module.TableData[ix].R.fulldisplay}'>${module.TableData[ix].R.display}</td>
                            <td style='background: #afa' title='${module.TableData[ix].G.fulldisplay}'>${module.TableData[ix].G.display}</td>
                            <td style='background: #ccf' title='${module.TableData[ix].B.fulldisplay}'>${module.TableData[ix].B.display}</td>
                            <td style='background: #fbb' title='${module.TableData[ix].R.full}'>${module.TableData[ix].R.result}</td>
                            <td style='background: #afa' title='${module.TableData[ix].G.full}'>${module.TableData[ix].G.result}</td>
                            <td style='background: #ccf' title='${module.TableData[ix].B.full}'>${module.TableData[ix].B.result}</td>
                        </tr>`));
                        module.SetCss();
                    }
                    return true;
                }
            },
            {
                regex: /The correct digit for the ([RGB]) channel is (-?\d+ \((standard|inverted) ([0-9A-Z])\))/,
                handler: function (matches, module) {
                    console.log(matches[0]);
                    module.CorrectValuesFull[matches[1]] = matches[2];
                    module.CorrectValues[matches[1]] = `${matches[3] === 'inverted' ? 'i' : ''}${matches[4]}`;
                    if (matches[1] === 'B') {
                        module.ListObject.obj.append($(`<tr>
                            <th colspan='7' style='text-align: right'>Final answer</th>
                            <td style='border: 1px solid black; background: #f99' title='${module.CorrectValuesFull.R}'>${module.CorrectValues.R}</td>
                            <td style='border: 1px solid black; background: #8f8' title='${module.CorrectValuesFull.G}'>${module.CorrectValues.G}</td>
                            <td style='border: 1px solid black; background: #aaf' title='${module.CorrectValuesFull.B}'>${module.CorrectValues.B}</td>
                        </tr>`));
                        module.SetCss();
                    }
                    return true;
                }
            },
            {
                regex: /The correct submission is:|Incorrect Submission:/,
                handler: function (matches, module) {
                    console.log(matches[0]);
                    var colorList = {
                        R: '#FF0000',
                        G: '#00FF00',
                        B: '#0000FF',
                        C: '#00FFFF',
                        M: '#FF00FF',
                        Y: '#FFFF00',
                        W: '#FFFFFF',
                        K: '#000000'
                    };
                    var pathList = [
                        "M 11,1 7,5 11,9 H 47 L 51,5 47,1 Z",
                        "m 5,7 -4,4 v 16 l 4,4 4,-4 V 11 Z",
                        "m 11,11 h 4 l 8,10 v 6 H 19 L 11,17 Z",
                        "m 25,11 h 8 v 16 l -4,4 -4,-4 z",
                        "m 35,27 v -6 l 8,-10 h 4 v 6 l -8,10 z",
                        "m 53,7 -4,4 v 16 l 4,4 4,-4 V 11 Z",
                        "m 7,33 4,-4 h 12 l 4,4 -4,4 H 11 Z",
                        "m 31,33 4,-4 h 12 l 4,4 -4,4 H 35 Z",
                        "m 5,35 -4,4 v 16 l 4,4 4,-4 V 39 Z",
                        "m 11,55 h 4 l 8,-10 v -6 h -4 l -8,10 z",
                        "m 25,55 h 8 V 39 l -4,-4 -4,4 z",
                        "m 35,39 v 6 l 8,10 h 4 V 49 L 39,39 Z",
                        "m 53,35 -4,4 v 16 l 4,4 4,-4 V 39 Z",
                        "m 11,57 -4,4 4,4 h 36 l 4,-4 -4,-4 z",
                    ];
                    var display = readMultiple(5).replace(/\[14 #\d+\] |\r|\n|-/g, '');
                    var div = $('<div>');
                    var svg = $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58 66" width="30%">').appendTo(div);
                    for (let i = 0; i < 14; i++) {
                        $SVG(`<path d="${pathList[i]}" stroke = "#000000" stroke-width = ".314" fill = "${colorList[display[i]]}"/>`).appendTo(svg);
                    }
                    module.push({ label: matches.input, obj: div });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "15 Mystic Lights",
        moduleID: "15MysticLights",
        loggingTag: "15 Mystic Lights",
        matches: [
            {
                regex: /Light states generated are:/,
                handler: function (matches, module) {
                    var board = readMultiple(4);
                    module.push({ label: matches.input, obj: pre(board) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "1D Chess",
        moduleID: "1DChess",
        loggingTag: "1D Chess",
        matches: [
            {
                regex: /The position is.*/,
                handler: function (matches, module) {
                    let html = matches[0].replace(/\[([A-Z] [a-z]→[a-z])\]/g, (_, m) => `<span style='background: black; color: white; padding: 0 .1cm'>${m}</span>`);
                    let obj = document.createElement('span');
                    obj.innerHTML = html;
                    module.push({ obj: obj });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "2048",
        loggingTag: "2048",
        matches: [
            {
                regex: /Setup \[(.+)\]/,
                handler: function (matches, module) {
                    let gridSize = parseInt(matches[1]);
                    module.Grids = [];


                    let getTileStyle = function (value) {
                        switch (value) {
                            case 2:
                                return { color: "eee4da", blackText: true };
                            case 4:
                                return { color: "eee1c9", blackText: true };
                            case 8:
                                return { color: "f3b27a" };
                            case 16:
                                return { color: "f69664" };
                            case 32:
                                return { color: "f77c5f" };
                            case 64:
                                return { color: "f75f3b" };
                            case 128:
                                return { color: "edd073" };
                            case 256:
                                return { color: "edcc62" };
                            case 512:
                                return { color: "edc950" };
                            case 1024:
                                return { color: "edc53f" };
                            case 2048:
                                return { color: "edc22e" };
                        }
                        return { color: "3c3a33" };
                    };

                    let getFontSize = function (value) {
                        switch (value.toString().length) {
                            case 1:
                            case 2:
                                return 40;
                            case 3:
                                return 30;
                            case 4:
                                return 23;
                        }
                        return 19;
                    };


                    let obj = $("<div>").css({
                        webkitTouchCallout: "none",
                        webkitUserSelect: "none",
                        khtmlUserSelect: "none",
                        mozUserSelect: "none",
                        msUserSelect: "none",
                        userSelect: "none"
                    });

                    let gridLabel = $("<div>").css({
                        display: "inline-block",
                        padding: "5px 0",
                        margin: "10px 0",
                        minWidth: 150,
                        textAlign: "center"
                    });
                    let gameContainer = $("<div>").css({
                        position: "relative",
                        width: 300,
                        height: 300,
                        backgroundColor: "#bbada0",
                        borderRadius: 6
                    });
                    let gridAndTileCSS = {
                        position: "absolute",
                        width: "70%",
                        height: "70%",
                        top: "15%",
                        left: "15%",
                        zIndex: 10
                    };
                    let gridContainer = $("<div>").appendTo(gameContainer).css(gridAndTileCSS);
                    gridAndTileCSS.zIndex = 20;
                    let tileContainer = $("<div>").appendTo(gameContainer).css(gridAndTileCSS);

                    let posPerc = function (val) {
                        return `${val / 3 * 100}%`;
                    };

                    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) $("<div>").css({
                        position: "absolute",
                        width: 60,
                        height: 60,
                        backgroundColor: "#cdc1b4",
                        borderRadius: 6,
                        left: posPerc(x),
                        top: posPerc(y),
                        transform: "translate(-50%, -50%)"
                    }).appendTo(gridContainer);

                    let currentGrid = -1;
                    module.actuateGrid = function (newGrid) {
                        gridLabel.text(`Move ${newGrid + 1} of ${module.Grids.length}`);
                        leftArrow.css({ visibility: newGrid > 0 ? "visible" : "hidden" });
                        rightArrow.css({ visibility: newGrid < module.Grids.length - 1 ? "visible" : "hidden" });
                        if (newGrid == currentGrid) return;

                        currentGrid = newGrid;

                        let grid = module.Grids[currentGrid];

                        let actuateTile = function (tile) {
                            let wrapper = $("<div>").appendTo(tileContainer);
                            let inner = $("<div>").text(tile.value).appendTo(wrapper);
                            let position = tile.previousPosition || { x: tile.x, y: tile.y };

                            let style = getTileStyle(tile.value);
                            wrapper.css({
                                width: 60,
                                height: 60,
                                position: "absolute",
                                left: posPerc(position.x),
                                top: posPerc(position.y),
                                transform: "translate(-50%, -50%)",
                                zIndex: tile.mergedFrom ? 20 : 10
                            });
                            inner.css({
                                textAlign: "center",
                                lineHeight: "60px",
                                fontSize: getFontSize(tile.value),
                                fontWeight: 900,
                                backgroundColor: "#" + style.color,
                                color: style.blackText ? "#776e65" : "#f9f6f2",
                                borderRadius: 6
                            });

                            if (tile.previousPosition) {
                                wrapper[0].animate([
                                    { left: posPerc(tile.x), top: posPerc(tile.y) }
                                ], {
                                    duration: 100,
                                    easing: "ease-in-out",
                                    fill: "forwards"
                                });
                            } else if (tile.mergedFrom) {
                                inner[0].animate([
                                    { transform: "scale(0)" },
                                    { transform: "scale(1.3)" },
                                    { transform: "scale(1)" }
                                ], {
                                    duration: 200,
                                    delay: 50,
                                    fill: "backwards",
                                    easing: "ease"
                                });

                                tile.mergedFrom.forEach(actuateTile);
                            } else {
                                inner[0].animate([
                                    { transform: "scale(0)", opacity: 0 },
                                    { transform: "scale(1)", opacity: 1 }
                                ], {
                                    duration: 200,
                                    easing: "ease"
                                });
                            }
                        };

                        tileContainer.empty();

                        grid.tiles.forEach(actuateTile);
                    };

                    let buttonStyle = {
                        padding: "5px 10px",
                        margin: 10,
                        cursor: "pointer",
                        backgroundColor: "#eee4da",
                        fontWeight: 900,
                        borderRadius: 6
                    };

                    let leftArrow = $("<span>").text("< Prev").click(function () {
                        if (currentGrid > 0) module.actuateGrid(currentGrid - 1);
                    }).appendTo(obj).css(buttonStyle).css({ marginLeft: -4 });

                    obj.append(gridLabel);

                    let rightArrow = $("<span>").text("Next >").click(function () {
                        if (currentGrid < module.Grids.length - 1) module.actuateGrid(currentGrid + 1);
                    }).appendTo(obj).css(buttonStyle);

                    obj.append(gameContainer);

                    module.push({ obj, nobullet: true });
                    return true;
                }
            },
            {
                regex: /Current grid: (.+)/,
                handler: function (matches, module) {
                    module.Grids.push(JSON.parse(matches[1]));
                    module.actuateGrid(0);
                    return true;
                }
            }
        ]
    },
    {
        displayName: "3D Maze",
        moduleID: "spwiz3DMaze",
        loggingTag: "3D Maze",
        matches: [
            {
                regex: /You walked into a wrong wall:/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(18)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "3D Tunnels",
        loggingTag: "3d Tunnels",
        moduleID: "3dTunnels",
    },
    {
        moduleID: ["AdjacentLettersModule", "AdjacentLettersModule_Rus"],
        loggingTag: ["AdjacentLetters", "AdjacentLetters (Russian)"],
        displayName: ["Adjacent Letters", "Adjacent Letters (Russian)"],
        matches: [
            {
                regex: /Solution:/,
                handler: function (_, module) {
                    module.push({ label: "Solution:", obj: pre(readMultiple(3)) });
                }
            },
            {
                regex: /You submitted:/,
                handler: function (_, module) {
                    module.push({ label: "You submitted:", obj: pre(readMultiple(3)) });
                }
            }
        ]
    },
    {
        displayName: "7",
        loggingTag: "7",
        moduleID: "7",
        matches: [
            {
                regex: /Stage (\d+): LED: (.+), Values: \( (-?)(\d), (-?)(\d), (-?)(\d) \)$|Initial Values: \( -?\d, -?\d, -?\d \)$/,
                handler: function (matches, module) {
                    function seg (segment, digit) {
                        switch (segment) {
                            case "a":
                                return digit == "0" || digit == "2" || digit == "3" || digit == "5" || digit == "6" || digit == "7" || digit == "8" || digit == "9";       
                                break;
                            case "b":
                                return digit == "0" || digit == "4" || digit == "5" || digit == "6" || digit == "8" || digit == "9";       
                                break;
                            case "c":
                                return digit == "0" || digit == "1" || digit == "2" || digit == "3" || digit == "4" || digit == "7" || digit == "8" || digit == "9";       
                                break;
                            case "d":
                                return digit == "2" || digit == "3" || digit == "4" || digit == "5" || digit == "6" || digit == "8" || digit == "9";       
                                break;
                            case "e":
                                return digit == "0" || digit == "2" || digit == "6" || digit == "8"       
                                break;
                            case "f":
                                return digit == "0" || digit == "1" || digit == "3" || digit == "4" || digit == "5" || digit == "6" || digit == "7" || digit == "8" || digit == "9";       
                                break;
                            case "g":
                                return digit == "0" || digit == "2" || digit == "3" || digit == "5" || digit == "6" || digit == "8" || digit == "9";       
                                break;
                        
                            default:
                                return false;
                                break;
                        }
                    }
                    function seg2 (segment, digit, dash) {
                        return dash === "-" ? !seg(segment, digit) : seg(segment, digit);
                    }
                    function mix (r, g, b) {
                        if (r) {
                            if (g) {
                                if (b) {
                                    return "#fff";
                                }
                                else {
                                    return "#ff0";
                                }
                            }
                            else {
                                if (b) {
                                    return "#f0f";
                                }
                                else {
                                    return "#f00";
                                }
                            }
                        }
                        else {
                            if (g) {
                                if (b) {
                                    return "#0ff";
                                }
                                else {
                                    return "#0f0";
                                }
                            }
                            else {
                                if (b) {
                                    return "#00f";
                                }
                                else {
                                    return "#000";
                                }
                            }
                        }
                    }

                    if (/Initial( Values: \( -?\d, -?\d, -?\d \))$/.test(matches[0])){
                        let m = /Initial( Values: \( -?\d, -?\d, -?\d \))$/.exec(matches[0]);
                        let t = matches[0];
                        matches = /Stage (\d+): LED: (.+), Values: \( (-?)(\d), (-?)(\d), (-?)(\d) \)$/.exec(`Stage 0: LED: Black,${m[1]}`);
                        matches[0] = t;
                    }

                    let Colors = {"Red":"#f00", "Green":"#0f0", "Blue":"#00f", "White":"#fff", "Black":"#000"};
                    let svg = [
                        `<circle cx='0' cy='0' r='0.5' fill='${Colors[matches[2]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m0.8 -.2h2l-.5 .5h-1z' fill='${seg2('a', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m0.7 -.1v2l.5 -.25v-1.25z' fill='${seg2('b', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m2.9 -.1v2l-.5 -.25v-1.25z' fill='${seg2('c', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m0.8 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${seg2('d', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m0.7 2.1v2l.5 -.5v-1.25z' fill='${seg2('e', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m2.9 2.1v2l-.5 -.5v-1.25z' fill='${seg2('f', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m0.8 4.2h2l-.5 -.5h-1z' fill='${seg2('g', matches[4], matches[3]) ? '#f00' : '#000'}' stroke='#000' stroke-width='0.1'/>`,

                        `<path d='m3.2 -.2h2l-.5 .5h-1z' fill='${seg2('a', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m3.1 -.1v2l.5 -.25v-1.25z' fill='${seg2('b', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m5.3 -.1v2l-.5 -.25v-1.25z' fill='${seg2('c', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m3.2 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${seg2('d', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m3.1 2.1v2l.5 -.5v-1.25z' fill='${seg2('e', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m5.3 2.1v2l-.5 -.5v-1.25z' fill='${seg2('f', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m3.2 4.2h2l-.5 -.5h-1z' fill='${seg2('g', matches[6], matches[5]) ? '#0f0' : '#000'}' stroke='#000' stroke-width='0.1'/>`,

                        `<path d='m5.6 -.2h2l-.5 .5h-1z' fill='${seg2('a', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m5.5 -.1v2l.5 -.25v-1.25z' fill='${seg2('b', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m7.7 -.1v2l-.5 -.25v-1.25z' fill='${seg2('c', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m5.6 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${seg2('d', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m5.5 2.1v2l.5 -.5v-1.25z' fill='${seg2('e', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m7.7 2.1v2l-.5 -.5v-1.25z' fill='${seg2('f', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m5.6 4.2h2l-.5 -.5h-1z' fill='${seg2('g', matches[8], matches[7]) ? '#00f' : '#000'}' stroke='#000' stroke-width='0.1'/>`,

                        `<path d='m8.2 -.2h2l-.5 .5h-1z' fill='${mix(seg2('a', matches[4], matches[3]), seg2('a', matches[6], matches[5]), seg2('a', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.1 -.1v2l.5 -.25v-1.25z' fill='${mix(seg2('b', matches[4], matches[3]), seg2('b', matches[6], matches[5]), seg2('b', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m10.3 -.1v2l-.5 -.25v-1.25z' fill='${mix(seg2('c', matches[4], matches[3]), seg2('c', matches[6], matches[5]), seg2('c', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.2 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${mix(seg2('d', matches[4], matches[3]), seg2('d', matches[6], matches[5]), seg2('d', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.1 2.1v2l.5 -.5v-1.25z' fill='${mix(seg2('e', matches[4], matches[3]), seg2('e', matches[6], matches[5]), seg2('e', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m10.3 2.1v2l-.5 -.5v-1.25z' fill='${mix(seg2('f', matches[4], matches[3]), seg2('f', matches[6], matches[5]), seg2('f', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.2 4.2h2l-.5 -.5h-1z' fill='${mix(seg2('g', matches[4], matches[3]), seg2('g', matches[6], matches[5]), seg2('g', matches[8], matches[7]))}' stroke='#000' stroke-width='0.1'/>`
                    ];

                    module.push({ label: matches[0], obj: $('<svg>').html(`<svg style='height: 3cm; display: block' xmlns='http://www.w3.org/2000/svg' viewBox='-.6 -.6 11.1 5'>${svg.join('')}</svg>`) });
                    return true;
                }
            },
            {
                regex: /This gives the final segment combinations in reading order: (.), (.), (.), (.), (.), (.), (.)/,
                handler: function (matches, module) {
                    let Colors = {"R":"#f00", "G":"#0f0", "B":"#00f", "W":"#fff", "K":"#000", "C":"#0ff", "M":"#f0f", "Y":"#ff0"};
                    let svg = [
                        `<path d='m8.2 -.2h2l-.5 .5h-1z' fill='${Colors[matches[1]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.1 -.1v2l.5 -.25v-1.25z' fill='${Colors[matches[2]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m10.3 -.1v2l-.5 -.25v-1.25z' fill='${Colors[matches[3]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.2 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${Colors[matches[4]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.1 2.1v2l.5 -.5v-1.25z' fill='${Colors[matches[5]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m10.3 2.1v2l-.5 -.5v-1.25z' fill='${Colors[matches[6]]}' stroke='#000' stroke-width='0.1'/>`,
                        `<path d='m8.2 4.2h2l-.5 -.5h-1z' fill='${Colors[matches[7]]}' stroke='#000' stroke-width='0.1'/>`,
                    ];

                    module.push({ label: matches[0], obj: $('<svg>').html(`<svg style='height: 3cm; display: block' xmlns='http://www.w3.org/2000/svg' viewBox='-.6 -.6 11.1 5'>${svg.join('')}</svg>`) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "algebra",
        loggingTag: "Algebra",
        matches: [
            {
                regex: /^(Equation \d+) is (.*)\.$/,
                handler: function (matches, module) {
                    module.push({
                        label: matches[1] + ':',
                        obj: $('<div>').append(
                            $('<img>')
                                .attr('src', 'img/Algebra/' + matches[2].replace(/\+/g, '%2B') + '.png')
                                .css({ height: '3em' })
                        )
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            },
            {
                regex: /The (?:true )?value of [CZ] is/,
                handler: function (_, module) {
                    module.push({ linebreak: true });
                }
            }
        ]
    },
    {
        moduleID: "Keypad",
        loggingTag: "Assets.Scripts.Rules.KeypadRuleSet",
        matches: [
            {
                regex: /Keypad button (\d) symbol (.+)/,
                handler: function (matches, module) {
                    module.push("Keypad button " + (parseInt(matches[1]) + 1) + " symbol " + matches[2]);
                }
            }
        ]
    },
    {
        moduleID: "asciiArt",
        loggingTag: "Ascii Art",
        displayName: "ASCII Art"
    },
    {
        displayName: "ASCII Maze",
        moduleID: "asciiMaze",
        loggingTag: "ASCII Maze",
        matches: [
            {
                regex: /The decoded bits form the maze:/,
                handler: function (matches, module) {
                    let lines = " A  B  C  D  E  F  G \n" + readTaggedLine().replace(/■■■■■■■■■■■■■■■/g, "•——•——•——•——•——•——•——•");
                    for (let i = 1; i < 8; i++) {
                        lines += `\n${readTaggedLine().replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")} ${i} \n${readTaggedLine().replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")} `;
                    }
                    lines = lines.replace(/E/g, "Ex").replace(/S/g, "St").replace(/Ex/, "E");
                    module.push({ label: "The decoded bits form the maze:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /The corresponding string of bits is:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 2; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The corresponding string of bits is:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Badugi",
        moduleID: "ksmBadugi",
        loggingTag: "Badugi",
        matches: [
            {
                regex: /^(The hand on the (left|right) is )(.+)—(a(n|)(.+))$/,
                handler: function (matches, module) {
                    module.push(matches[1]);
                    module.push($("<span style=\"font-family: 'Dejavu Sans'; font-size: 50pt;\">").text(matches[3]));
                    module.push(matches[6]);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "BattleshipModule",
        loggingTag: "Battleship",
        matches: [
            {
                regex: /.+/
            },
            {
                regex: /Ships: .+/,
                handler: function (matches, module) {

                    var fieldStr = readMultiple(6);
                    var field = fieldStr.replace('\r', '').split('\n');

                    var r, tr, c, td;

                    var stuff = [];
                    for (r = 0; r < 6; r++) {
                        stuff[r] = [];
                        for (c = 0; c < 6; c++) {
                            var ch = field[r][2 * c + 2];
                            if (c > 0 && r > 0)
                                stuff[r][c] = { IsShip: ch === '#' || ch === '%', IsSafeLocation: ch === '•' || ch === '%' };
                            else
                                stuff[r][c] = ch;
                        }
                    }

                    var table = $('<table>').css('border-spacing', '0').css('border-collapse', 'separate');
                    for (r = 0; r < 6; r++) {
                        tr = $('<tr>').appendTo(table);
                        for (c = 0; c < 6; c++) {
                            td = $('<td>').css('border', '3px solid transparent').css('text-align', 'center').css('padding', 0).appendTo(tr);
                            if (c === 0 || r === 0)
                                td.text(stuff[r][c]);
                            else {
                                var waterAbove = r == 1 || !stuff[r - 1][c].IsShip;
                                var waterBelow = r == 5 || !stuff[r + 1][c].IsShip;
                                var waterLeft = c == 1 || !stuff[r][c - 1].IsShip;
                                var waterRight = c == 5 || !stuff[r][c + 1].IsShip;

                                var shipAbove = r == 1 || stuff[r - 1][c].IsShip;
                                var shipBelow = r == 5 || stuff[r + 1][c].IsShip;
                                var shipLeft = c == 1 || stuff[r][c - 1].IsShip;
                                var shipRight = c == 5 || stuff[r][c + 1].IsShip;

                                var imgId =
                                    !stuff[r][c].IsShip ? "SqWater" :
                                        waterAbove && waterBelow && waterLeft && waterRight ? "SqShipA" :
                                            waterAbove && waterLeft && waterBelow && shipRight ? "SqShipL" :
                                                waterAbove && waterRight && waterBelow && shipLeft ? "SqShipR" :
                                                    waterLeft && waterAbove && waterRight && shipBelow ? "SqShipT" :
                                                        waterLeft && waterBelow && waterRight && shipAbove ? "SqShipB" :
                                                            waterBelow && waterAbove && shipLeft && shipRight ? "SqShipF" :
                                                                waterLeft && waterRight && shipAbove && shipBelow ? "SqShipF" : "SqShip";

                                $('<img>').attr('src', '../HTML/img/Battleship/' + imgId + '.png').attr('width', '50').css('display', 'block').appendTo(td);
                                if (stuff[r][c].IsSafeLocation)
                                    td.css('border', '3px solid red');
                            }
                        }
                    }

                    module.push({ label: "Solution:", obj: table });
                }
            }
        ]
    },
    {
        displayName: "Binary Puzzle",
        moduleID: "BinaryPuzzleModule",
        loggingTag: "Binary Puzzle",
        matches: [
            {
                regex: /(Puzzle:|Solution:) ([01?]{36})$/,
                handler: function (matches, module) {
                    var arr = [];
                    for (var i = 0; i < 6; i++)
                        arr.push(i);
                    module.push({
                        label: matches[1],
                        obj: $(`<table style='border-collapse: collapse'>${arr.map(y => `<tr>${arr.map(x => {
                            var val = matches[2][x + 6 * y];
                            return `<td${val === '1' ? ` style='background: #cfc'` : val === '0' ? ` style='background: #fcc'` : ''}>${val}</td>`;
                        }).join('')}</tr>`).join('')}</table>`)
                            .find('td').css({ border: '1px solid black', padding: '.4em 0', width: '1.1cm', textAlign: 'center' }).end()
                    });
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "binaryTree",
        loggingTag: "Binary Tree",
        matches: [
            {
                regex: /Tree Structure:/,
                handler: function (matches, module) {
                    readLine();

                    const tree = $('<svg viewBox="-2.5 -0.5 5 3">').css({ "width": "50%", "display": "block" });
                    const colors = {
                        "R": "red",
                        "G": "green",
                        "B": "blue",
                        "M": "magenta",
                        "C": "cyan",
                        "Y": "yellow",
                        "O": "orange",
                        "A": "gray",
                        "S": "silver",
                        "K": "black"
                    };
                    const positions = [
                        [0, 0],
                        [-1.25, 1], [1.25, 1],
                        [-2, 2], [-0.5, 2], [0.5, 2], [2, 2],
                    ];
                    const lines = [
                        [0, 1], [0, 2],
                        [1, 3], [1, 4],
                        [2, 5], [2, 6]
                    ];

                    // Make lines
                    for (const linePair of lines) {
                        const start = positions[linePair[0]];
                        const end = positions[linePair[1]];
                        $SVG(`<line x1=${start[0]} y1=${start[1]} x2=${end[0]} y2=${end[1]} stroke=black stroke-width=0.1>`).appendTo(tree);
                    }

                    // Make nodes
                    const characters = readMultiple(10).replace(/[^\w]/g, "");
                    for (let i = 0; i < 21; i += 3) {
                        const buttonColor = colors[characters[i]];
                        const text = characters[i + 1];
                        const textColor = colors[characters[i + 2]];
                        const position = positions[i / 3];

                        $SVG(`<circle cx=${position[0]} cy=${position[1]} fill=${buttonColor} r=0.45>`).appendTo(tree);
                        $SVG(`<text x=${position[0]} y=${position[1]} fill=${textColor} font-size=0.9 text-anchor=middle dominant-baseline=central>`)
                            .text(text)
                            .appendTo(tree);
                    }


                    module.push({ label: "Tree:", obj: tree });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Bioscanner",
        moduleID: "TheBioscanner",
        loggingTag: "The Bioscanner",
        matches: [
            {
                regex: /^(The (first|second|third) glyph is) ([ABCDE]\d+).$/,
                handler: function (matches, module) {
                    module.push(matches[1] + ':');
                    const glyph = matches[3];
                    let div = $('<div>');

                    let itempair = [glyph.charAt(0), glyph.substring(1)];
                    let index = (("ABCDE".indexOf(itempair[0]) + 1) + (5 * (itempair[1] - 1)) - 1);
                    div.append(`<img src='img/The Bioscanner/${"ABCDEFGH".charAt(Math.floor(index / 7)) + ((index + 1) % 7 == 0 ? 7 : (index + 1) % 7).toString()}.png' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);

                    module.push(div);
                    return true;
                }
            },
            {
                regex: /^(The current offset is \d+\. This means the current glyphs are) ((([ABCDE]\d+)(, |, and )*){3})\.$/,
                handler: function (matches, module) {
                    module.push(matches[1] + ':');
                    const glyphs = matches[2].split(', ').slice(0, 2).concat(matches[2].split(', ')[2].substring(4));
                    let actualGlyphs = [];
                    let div = $('<div>');

                    glyphs.forEach(element => {
                        let itempair = [element.charAt(0), element.substring(1)];
                        let index = (("ABCDE".indexOf(itempair[0]) + 1) + (5 * (itempair[1] - 1)) - 1);
                        actualGlyphs.push("ABCDEFGH".charAt(Math.floor(index / 7)) + ((index + 1) % 7 == 0 ? 7 : (index + 1) % 7).toString());
                    });
                    for (var i = 0; i < actualGlyphs.length; i++) {
                        div.append(`<img src='img/The Bioscanner/${actualGlyphs[i]}.png' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);
                    }
                    module.push(div);
                    return true;
                }
            },
            {
                regex: /^(Fake glyphs are:) (([ABCDE]\d+ )+)$/,
                handler: function (matches, module) {
                    module.push(matches[1]);
                    const glyphs = matches[2].slice(0, -1).split(' ');
                    let actualGlyphs = [];
                    let div = $('<div>');

                    glyphs.forEach(element => {
                        let itempair = [element.charAt(0), element.substring(1)];
                        let index = (("ABCDE".indexOf(itempair[0]) + 1) + (5 * (itempair[1] - 1)) - 1);
                        actualGlyphs.push("ABCDEFGH".charAt(Math.floor(index / 7)) + ((index + 1) % 7 == 0 ? 7 : (index + 1) % 7).toString());
                    });
                    for (var i = 0; i < actualGlyphs.length; i++) {
                        div.append(`<img src='img/The Bioscanner/${actualGlyphs[i]}.png' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);
                    }
                    module.push(div);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "BitmapsModule",
        loggingTag: "Bitmaps",
        matches: [
            {
                regex: /Bitmap \((red|green|blue|yellow|cyan|pink)\):/,
                handler: function (matches, module) {
                    module.push({
                        label: matches.input,
                        obj: pre(readMultiple(9, function (str) { return str.replace(/^\[Bitmaps #\d+\] /, ''); }))
                            .css('color', matches[1] === 'red' ? '#800' :
                                matches[1] === 'green' ? '#080' :
                                    matches[1] === 'blue' ? '#008' :
                                        matches[1] === 'yellow' ? '#880' :
                                            matches[1] === 'cyan' ? '#088' : '#808')
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Bitwise Operations",
        moduleID: "BitOps",
        loggingTag: "Bitwise Operators"
    },
    {
        moduleID: "BigCircle",
        loggingTag: "Big Circle",
        matches: [
            {
                regex: /(?:Getting|Updating) solution/,
                handler: function (matches, module) {
                    module.Group = [matches.input.replace(/(?:Getting|Updating) solution for /, ""), []];
                    module.push(module.Group);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if (module.Group) {
                        module.Group[1].push(matches.input);
                    } else {
                        module.push(matches.input);
                    }
                }
            }
        ]
    },
    {
        moduleID: "bloxx",
        loggingTag: "Bloxx",
        matches: [
            {
                regex: /Grid:/,
                handler: function (matches, module) {
                    module.push({ label: "Grid", obj: pre(readMultiple(11).replace(/-/g, " ")) });
                    return true;
                }
            }
        ]
    },
    {
        displayName: "Bob Barks",
        moduleID: "ksmBobBarks",
        loggingTag: "Bob Barks",
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if (!matches[0].startsWith("Receive") && !matches[0].startsWith("Yielding")) module.push(matches.input);
                }
            }
        ]
    },
    {
        displayName: "Boolean Maze",
        moduleID: "boolMaze",
        loggingTag: "BooleanMaze"
    },
    {
        displayName: "Boolean Venn Diagram",
        moduleID: "booleanVennModule",
        loggingTag: "Boolean Venn Diagram",
        matches: [
            {
                regex: /Expression|button pressed|Module Solved!/,
                handler: function (matches, module) {
                    module.push(matches.input);
                }
            },
            {
                regex: /Expression/,
                handler: function (matches, module) {
                    readLine();

                    var svg = $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 348 348"><g transform="matrix(1.260512,0,0,1.260512,-59.613368,-83.043883)" fill="#fff" stroke="#000" stroke-width="3"><path d="m254 179.9c-11.8-6.8-25.5-10.6-40-10.6-14.7 0-28.4 3.9-40.2 10.8-11.8-6.9-25.6-10.8-40.2-10.8-14.8 0-28.6 4-40.5 10.9 0-44.4 36.1-80.5 80.5-80.5 44.3 0 80.3 35.9 80.4 80.2z" fill="rgb(127, 255, 127)"></path><circle cx="280" cy="110" r="24" fill="rgb(127, 255, 127)"></circle><path d="m173.7 180.1c-0.1 0.1-0.2 0.1-0.3 0.2-23.9 14-40 39.9-40 69.6v0.3l-0.1-0.1c-24.1-13.9-40.3-40-40.3-69.8v-0.1c11.9-6.9 25.7-10.9 40.5-10.9 14.6 0 28.4 3.9 40.2 10.8z" fill="rgb(127, 255, 127)"></path><path d="m254 180.2c0 29.7-16.1 55.7-40 69.6v-0.1-0.3c-0.1-29.6-16.1-55.4-40-69.3-0.1-0.1-0.2-0.1-0.3-0.2 11.8-6.9 25.6-10.8 40.2-10.8s28.2 3.9 40 10.6c0.1 0.3 0.1 0.4 0.1 0.5z" fill="rgb(255, 127, 127)"></path><path d="m214 249.5c-0.1 0.2-0.2 0.3-0.3 0.5-11.8 6.8-25.5 10.7-40.2 10.7-14.6 0-28.2-3.9-40-10.6v-0.3c0-29.7 16.1-55.6 40-69.6h0.1 0.5c23.7 14 39.8 39.7 39.9 69.3z" fill="rgb(255, 127, 127)"></path><path d="m173.7 319.5c-11.8 6.9-25.6 10.8-40.2 10.8-44.5 0-80.5-36-80.5-80.5 0-29.7 16.1-55.7 40-69.6v0.1c0 29.8 16.2 55.9 40.3 69.8 0 0.1 0.1 0.1 0.1 0.2 0.2 29.6 16.4 55.4 40.3 69.2z" fill="rgb(127, 255, 127)"></path><path d="m294.5 249.8c0 44.5-36.1 80.5-80.5 80.5-14.7 0-28.4-3.9-40.2-10.8 24-13.9 40.2-39.9 40.2-69.7 24-14 40-39.9 40-69.6v-0.3c24.2 13.9 40.5 40 40.5 69.9z" fill="rgb(127, 255, 127)"></path><path d="m214 249.9c0 29.8-16.2 55.8-40.2 69.7-23.9-13.8-40.1-39.7-40.2-69.3v-0.1c11.8 6.8 25.5 10.6 40 10.6 14.6 0 28.4-3.9 40.2-10.7 0-0.1 0.1-0.2 0.2-0.2z" fill="rgb(255, 127, 127)"></path></g></svg>')
                        .appendTo("body");

                    var sections = ["A", "NONE", "AB", "AC", "ABC", "B", "C", "BC"];
                    var positions = {
                        "AB": "translate(125px, 200px)",
                        "AC": "translate(225px, 200px)",
                        "B": "translate(93px, 275px)",
                        "C": "translate(254px, 275px)"
                    };

                    readMultiple(16).match(/[UL]/g).forEach(function (letter, index) {
                        var elem = svg.find("path, circle").eq(index);
                        elem.attr("fill", letter == "L" ? "rgb(255, 127, 127)" : "rgb(127, 255, 127)");

                        var bbox = elem[0].getBBox();
                        var text = sections[index];
                        $SVG("<text>")
                            .text(text)
                            .css({
                                transform: positions[text] || "translate(" + (bbox.x + bbox.width / 2) + "px, " + (bbox.y + bbox.height / 2) + "px)",
                                "text-anchor": "middle",
                                "dominant-baseline": "central",
                                stroke: "none",
                                fill: "black",
                                "font-size": (35 - text.length * 5) + "px"
                            })
                            .appendTo(svg.children("g"));
                    });

                    module.push({ label: "Diagram:", obj: $("<div style='width: 40%'>").append(svg), expanded: true });
                }
            }
        ]
    },
    {
        moduleID: "boomdas",
        loggingTag: "Boomdas",
        matches: [
            {
                regex: /(Expecting:|You submitted:)/,
                handler: function (matches, module) {
                    module.push({ label: matches[0], obj: pre(readMultiple(8).replace(/\[Boomdas #\d+\] /g, "").replace(/_/g, " ").split("\n").filter(l => l.trim()).join("\n")) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "BrokenButtonsModule",
        loggingTag: "Broken Buttons",
        matches: [
            {
                regex: /Buttons:/,
                handler: function (_, module) {
                    var step = module.Step || module;

                    step.push({ label: "Buttons:", obj: pre(readMultiple(4)) });
                }
            },
            {
                regex: /Step: (.+)/,
                handler: function (matches, module) {
                    module.Steps = (module.Steps || 0) + 1;
                    module.Step = [matches[1]];
                    module.push(["Step #" + module.Steps, module.Step]);
                }
            },
            {
                regex: /Press: (.+)/,
                handler: function (matches, module) {
                    var step = module.Step;
                    step.push("Press: " + matches[1]);

                    var line = readLine();
                    while ((/".+" at \d, \d/).exec(line)) {
                        step.push(line);
                        line = readLine();
                    }

                    linen--;
                }
            },
            {
                regex: /Solution:/
            }
        ]
    },
    {
        moduleID: "BrailleModule",
        loggingTag: "Braille",
        matches: [
            {
                regex: /(Braille patterns (on module|after flips):) (.+)/,
                handler: function (matches, module) {
                    var div = $("<div>");

                    if (matches[2] == "on module") {
                        module.braille = [];
                    }

                    matches[3].split("; ").forEach(function (spots, i) {
                        var braille = $('<svg viewBox="-0.5 -0.5 2 3"></svg>').css({ width: "10%", border: "1px black solid" }).appendTo(div);

                        spots.split("-").forEach(function (posStr) {
                            var pos = parseInt(posStr) - 1;
                            $SVG('<circle r="0.4"></circle>').attr("cx", Math.floor(pos / 3)).attr("cy", pos % 3).appendTo(braille);
                        });

                        if (matches[2] == "on module") {
                            if (module.flipped) {
                                module.flipped.forEach(function (pos) {
                                    var char = Math.floor(pos / 6);
                                    if (char != i) return;

                                    var absPos = pos % 24;
                                    var svg = module.flippedSVG[absPos];
                                    svg[0].clone().prependTo(braille);
                                    svg[1].clone().appendTo(braille);
                                });
                            } else {
                                module.braille[i] = braille;
                            }
                        }
                    });

                    module.groups.add({ label: matches[1], obj: div, expanded: true });

                    return true;
                }
            },
            {
                regex: /Flipped positions in order: (.+)/,
                handler: function (matches, module) {
                    module.flipped = [];
                    module.flippedSVG = [];
                    matches[1].split(", ").forEach(function (posStr, flipNumber) {
                        var pos = parseInt(posStr) - 1;
                        module.flipped.push(pos);

                        var char = Math.floor(pos / 6);
                        var dotPos = pos - char * 6;

                        var absPos = pos % 24;
                        var text;
                        if (!module.flippedSVG[absPos]) {
                            var highlight = $SVG('<rect width="1" height="1" fill="rgba(255, 255, 0, 0.5)"></rect>').attr("x", Math.floor(dotPos / 3) - 0.5).attr("y", dotPos % 3 - 0.5).prependTo(module.braille[char]);
                            text = $SVG('<text fill="white" text-anchor="middle" dominant-baseline="middle" font-size="0.6"></text>').text(flipNumber + 1).attr("x", Math.floor(dotPos / 3)).attr("y", dotPos % 3).appendTo(module.braille[char]);

                            module.flippedSVG[absPos] = [highlight, text];
                        } else {
                            var svg = module.flippedSVG[absPos];
                            svg[0].attr("fill", "rgba(255, 0, 0, 0.5)");
                            svg[1].text(`${svg[1].text()} ${flipNumber + 1}`).attr("font-size", parseFloat(svg[1].attr("font-size")) - 0.15);
                            text = svg[1];
                        }

                        var noDot = module.braille[char].children("circle").filter(function (_, circle) { return $(circle).attr("cx") == text.attr("x") && $(circle).attr("cy") == text.attr("y"); }).length == 0;
                        if (noDot) {
                            text.attr("fill", "black");
                        }
                    });
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add(matches.input);
                }
            },
            {
                regex: /Wrong letter pressed:/,
                handler: function (matches, module) {
                    module.groups.addGroup();
                }
            }
        ]
    },
    {
        displayName: "Brainf---",
        moduleID: "brainf",
        loggingTag: "Brainf---",
        matches: [
            {
                regex: /The program is (\W+)/,
                handler: function (matches, module) {
                    module.push({ label: "The program is:", obj: pre(matches[1]) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Button Grid",
        moduleID: "buttonGrid",
        loggingTag: "Button Grids"
    },
    {
        displayName: "Button Sequence",
        moduleID: "buttonSequencesModule",
        loggingTag: "Button Sequences",
        matches: [
            {
                regex: /Solution:/,
                handler: function (_, module) {
                    module.push(["Solution", module.Solution = [], true]);
                    module.push(["Actions", module.Actions = []]);
                }
            },
            {
                regex: /Panel [2-4] Button 1 \(/,
                handler: function (matches, module) {
                    module.Solution.push({ linebreak: true });
                }
            },
            {
                regex: /Panel \d Button \d \(/,
                handler: function (matches, module) {
                    module.Solution.push(matches.input);
                }
            },
            {
                regex: /Panel \d (?:Button \d (?:is being|released at|held successfully)|completed successfully)|Module Solved\.|Strike: /,
                handler: function (matches, module) {
                    module.Actions.push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "CaesarCipherModule",
        loggingTag: "CaesarCipher"
    },
    {
        moduleID: "caesarsMaths",
        loggingTag: "caesarsMaths",
        displayName: "Caesar’s Maths"
    },
    {
        displayName: "Calculus",
        moduleID: "calcModule",
        loggingTag: "Calc"
    },
    {
        displayName: "Character Codes",
        moduleID: "characterCodes",
        loggingTag: "CharacterCodes"
    },
    {
        moduleID: "CheapCheckoutModule",
        loggingTag: "Cheap Checkout",
        matches: [
            {
                regex: /(Receipt|Recibo)/,
                handler: function (matches, module) {
                    module.push({ label: matches[1] + ':', obj: pre(readMultiple(10)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "ChessModule",
        loggingTag: "Chess",
        matches: [
            {
                regex: /Selected Solution: (.+)/,
                handler: function (matches, module) {
                    var locations = matches[1].split(", ");
                    var solution = locations[locations.length - 1];
                    locations.splice(locations.length - 1, 1);
                    module.push("Display: " + locations.join(", "));
                    module.push("Solution: " + solution);
                    readLine();
                    var board = readMultiple(13);
                    var table = $('<table>').css({ borderCollapse: 'collapse' });
                    $('<tr><td></td><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f</td></tr>').appendTo(table).find('td').css({ textAlign: 'center' });
                    for (var y = 0; y < 6; y++) {
                        var tr = $('<tr>').appendTo(table).append($('<td>' + (6 - y) + '</td>').css({ verticalAlign: 'middle', paddingRight: '1em' }));
                        for (var x = 0; x < 6; x++) {
                            var td = $('<td>').appendTo(tr).css({ width: '50px', height: '50px', border: '1px solid black' });
                            if (x == 0)
                                td.css({ borderLeft: '3px solid black' });
                            else if (x == 5)
                                td.css({ borderRight: '3px solid black' });
                            if (y == 0)
                                td.css({ borderTop: '3px solid black' });
                            else if (y == 5)
                                td.css({ borderBottom: '3px solid black' });
                            var svg = null;
                            var ch = board[26 * (2 * y + 1) + (4 * x + 2)];
                            switch (ch) {
                                case 'B': svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M85.4 25.2c0-2 .4-4 1-5.8 1-1.8 2-3.3 3.2-4.6 1.3-1.3 3-2.4 4.6-3 2-1 4-1.2 6-1.2s4 .3 6 1c1.6.8 3.2 2 4.5 3.2 1.3 1.3 2.3 2.8 3 4.6.8 1.8 1.2 3.7 1.2 5.8 0 2.7-.8 5-2 7.2 4 3 7.5 6 11 9 3.4 3.3 6.4 6.7 9 10.4 2.6 3.7 4.6 7.7 6 12 1.4 4.4 2 9 2 14.3 0 4-.3 8-1 11.5-1 3.4-2 6.6-3.3 9.5-1.4 2.8-2.8 5.5-4.5 7.8-1.5 2.3-3.2 4.5-4.8 6.3l7 25c-3 2-6.7 3.7-11 5-4 1-8.5 2-13.3 2.4 2.7 1 5.5 2 8.5 2.4 3 .5 6.2 1 9.4 1 3.2.4 6.5.6 10 .8l9.6.8 11.6 11c0 3.2-.8 6.3-2 9.2-1 3-2.5 5.6-4.4 8-2 2.5-4 4.6-6.6 6.5-2.5 2-5.3 3.4-8.3 4.5L125 176l4-1.7c1.3-.7 2.7-1.5 4-2.5 1.3-1 2.5-2 3.5-3.3 1-1.2 1.7-2.7 2-4.3-4.4-.2-8.4-.7-12-1.3-3.5-.8-6.8-1.8-10-3-3-1.5-5.8-3.3-8.4-5.5-2.5-2.3-5-5.2-7.7-8.8h-.4c-2.7 3.6-5.3 6.5-8 8.8-2.6 2.2-5.4 4-8.5 5.4-3 1.2-6.4 2.2-10 3-3.5.4-7.5 1-12 1 .3 1.7 1 3 2 4.4 1 1.3 2.3 2.4 3.6 3.3 1.4 1 2.8 1.8 4 2.5l4 1.7-12.6 13.3c-3-1-5.8-2.6-8.3-4.4-2.4-2-4.6-4-6.5-6.5-2-2.5-3.4-5-4.5-8-1.2-3-2-6-2-9.4l11.5-11 9.8-.6 10-.7c3-.2 6.2-.6 9.3-1 3-.6 5.8-1.4 8.5-2.5-4.6-.5-9-1.4-13.2-2.6-4.2-1-7.8-2.7-10.8-4.6l6.8-25c-1.6-1.7-3.3-4-5-6.2-1.6-2.3-3-5-4.4-8-1.3-2.8-2.4-6-3.2-9.4C59.4 86 59 82 59 78c0-5 .7-9.8 2-14 1.6-4.5 3.6-8.5 6.2-12.2 2.5-3.7 5.6-7 9-10.3 3.5-3.2 7.2-6.2 11.2-9-1.4-2.2-2-4.6-2-7.3z"/><path d="M109 149.7c2.3 2.2 5 4 7.8 5.2l9 3c3.3.5 6.5 1 9.8 1.2l9.4.3h5.5l-5-4.7c-2-.4-4.7-.6-8-.8-3.2 0-6.5-.4-10-.7-3.5-.3-7-.7-10.2-1.4-3.2-.6-5.8-1.5-7.8-2.8zM90.5 149.3c-2 1.3-4.6 2.2-7.8 2.8-3.3 1-6.7 1.3-10.2 1.6-3.5.3-6.8.6-10 .7-3.3.2-6 .4-8 .7l-5 4.5H55c3 0 6 0 9.4-.2 3.3-.2 6.5-.7 9.7-1.4l9.3-3c3-1.5 5.5-3 7.7-5.4zM144 164.5c-.8 2.3-2 4.3-3 5.8-1.3 1.6-2.5 3-3.8 4l-4.4 3 5.7 5.8c4.6-2 8-4.5 10.3-7.7 2.4-3.2 4-7 4.6-11-2.3.2-5.5.3-9.4.3zM56 164.5c-4 0-7 0-9.4-.3.7 4 2.2 7.8 4.6 11 2.3 3.2 5.7 5.8 10.3 8l5.7-6c-2-1-4-2.5-6.2-4.5-2-2-3.8-4.8-5-8.2zM126.3 135.3c-2-.5-5.2-1-9.7-1.6-4.4-.6-10-1-16.6-1-6.6 0-12.2.4-16.6 1-4.5.5-7.7 1-9.7 1.6 0 .5.7 1 2 1.5 1.5.6 3.5 1 6 1.6 2.4.5 5.2 1 8.3 1.2 3.2.4 6.5.5 10 .5 3.4 0 6.7 0 10-.3 3-.3 6-.7 8.4-1.2 2.4-.5 4.3-1 5.8-1.6 1.4-.6 2-1 2-1.6zM100 127.3h6c2.2 0 4.4.2 6.6.4l6.5.6 6 1-3.5-15h-43l-3.5 15c1.7-.4 3.7-.7 5.8-1l6.6-.6 6.6-.4h6zM122 108c2-2.2 3.7-4.3 5.2-6.5 1.4-2.3 2.6-4.6 3.6-7 1-2.5 1.7-5 2.2-7.8.4-2.7.7-5.6.7-8.7 0-4-.6-8-1.6-11.7-1-3.7-2.5-7.4-5-11-2.3-3.6-5.4-7.2-9.2-10.8-4-3.6-8.6-7-14.3-10.7 1.2-1 2.3-2 3.3-3.3 1-1.2 1.4-3 1.4-5.3s-.7-4.3-2.2-6c-1.5-1.6-3.4-2.4-5.8-2.4s-4.3.8-5.8 2.4C92.7 21 92 23 92 25.2s.4 4 1.3 5.3c1 1.2 2 2.3 3.3 3.3-5.7 3.6-10.4 7-14.3 10.7-3.8 3.6-7 7.2-9.3 10.8-2.4 3.6-4 7.3-5 11S66.2 74 66.2 78c0 3 .3 6 .7 8.7.4 2.8 1 5.3 2 7.8 1 2.4 2.3 4.7 3.7 7 1.4 2.2 3 4.3 5 6.5z" fill="#fff"/><path d="M118.7 59.2v6h-15.4v36H97v-36H81.3v-6h15.4V42.7h6.4V59z"/></svg>'; break;
                                case 'K': svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M97 21.5h6V27h5.3v5H103v10c3 4.7 5.6 9.8 7.5 15.5 2 5.6 3 11.8 3 18.5 1.2-2.2 2.8-4.4 4.6-6.4 2-2 4-3.7 6-5.3 2.4-1.4 5-2.6 7.6-3.5 2.7-.8 5.5-1.3 8.6-1.3 3.8 0 7.2.7 10.4 2 3 1.2 6 3 8.2 5.3 2.2 2.3 4 5 5.3 8.2 1.3 3.2 2 6.7 2 10.5 0 4.2-.6 8.2-2 12.2-1 4-3 7.6-5 11-2.2 3.2-5 6.2-8 8.8-3 2.7-6.3 4.8-10 6.3l3.6.3 4 .3 4 .3c1.3 0 2.5.2 3.5.3v50c-9 1.4-18.5 2.4-28 3-9.6.7-19 1-28.4 1-9.4 0-18.6-.3-27.6-1-9-.6-18.6-1.6-28.5-3v-50l3.5-.4 4-.3c1.3 0 2.7 0 4-.2 1.2 0 2.4 0 3.5-.2-3.6-1.5-7-3.6-10-6.3-3-2.6-5.7-5.6-8-9-2-3.2-3.8-7-5-10.8-1.3-4-2-8-2-12.2 0-3.8.8-7.3 2-10.5 1.3-3 3-6 5.4-8.2 2.3-2.3 5-4 8.2-5.4 3.2-1 6.6-1.8 10.4-1.8 3 0 6 .5 8.6 1.3 2.7 1 5.2 2 7.4 3.5 2.3 1.7 4.3 3.4 6 5.4 2 2 3.5 4 4.8 6.3 0-6.7 1-13 3-18.5C91.2 52 93.8 47 97 42.3V32h-5.3v-5H97z"/><path d="M93.2 77.8c0 3.8.2 7.3.8 10.5.5 3.2 1 6.6 1.8 10 .7 3.4 1.4 7 2 11 1 4 1.5 8.5 2 13.7h.4c.4-5.2 1-9.8 1.8-13.7l2.2-11 1.8-10c.6-3.2.8-6.7.8-10.5 0-2 0-4-.2-6.3 0-2.3-.5-4.7-1-7-.5-2.6-1.2-5-2-7.6-1-2.7-2-5-3.6-7.7-1.5 2.5-2.7 5-3.6 7.5-1 2.5-1.6 5-2 7.4-.5 2.4-1 4.8-1 7-.2 2.3-.2 4.4-.2 6.4zM100.4 154.8H125c8 0 16.3 0 24.6-.4v-8.2c-8.3-.3-16.4-.5-24.6-.5H75c-8.2 0-16.3.2-24.6.5v8.2c8.3.3 16.5.5 24.6.5h24.6zM149.6 159.4c-8.3.4-16.4.7-24.6.8l-24.6.2h-.8c-8.3 0-16.5 0-24.6-.2-8.2 0-16.3-.4-24.6-.8v9.3c7.6 1 15.7 2 24.2 2.4 8.6.7 17 1 25.3 1l12.4-.2c4.3 0 8.6-.3 12.8-.6 4.3-.2 8.4-.5 12.5-1 4-.3 8-.8 11.8-1.3zM50.4 141l24.6-.6c8-.2 16.2-.3 24.6-.3h.8c8.4 0 16.6.3 24.6.5 8 0 16.2.4 24.6.7v-11l-24.6-1-25.4-.2c-8.2 0-16.5 0-25 .3l-24.2 1zM159 85c0-2.6-.3-5-1-7.5-1-2.4-2-4.4-3.6-6.2-1.6-1.6-3.5-3-5.8-4-2.4-1-5-1.6-8-1.6-3.7 0-7 1-10 2.5-3 1.6-5.8 4-8.2 6.7-2.4 3-4.4 6-6.2 10-1.8 3.6-3.3 7.5-4.5 11.7-1.2 4-2.2 8.4-3 12.7-.7 4.4-1 8.5-1.3 12.5l5 1 6.5.2c5 0 9.7-1 14.6-2.7 4.8-1.8 9-4.3 12.8-7.6 3.7-3.5 6.8-7.5 9-12 2.4-4.8 3.6-10 3.6-16zM41 85c0 6 1 11.2 3.4 16 2.3 4.5 5.3 8.5 9 12 3.8 3.2 8 5.7 13 7.5C71 122 76 123 81 123c2.4 0 4.6 0 6.5-.4 2-.2 3.6-.5 5-1-.2-4-.6-8-1.3-12.4-.7-4.3-1.7-8.6-3-12.7-1-4.2-2.6-8-4.4-12-1.8-3.6-3.8-7-6.2-9.8-2.4-2.8-5-5-8-6.8-3-1.8-6.5-2.7-10.2-2.7-3 0-5.7.5-8 1.6-2.3 1-4.2 2.3-5.8 4C44 73 43 75 42 77c-.6 2.4-1 5-1 7.5z" fill="#fff"/></svg>'; break;
                                case 'N': svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M69 171c-.8-1.6-1.4-3.7-2-6.2-.5-2.4-.8-5.6-.8-9.4 0-4.8 1-9 2.6-13 1.8-3.7 4-7.2 6.6-10.3 2.6-3 5.5-6 8.6-8.7 3-2.7 6-5.3 8.5-8 2.7-2.5 5-5 6.6-7.7 2-2.7 2.8-5.5 2.8-8.6-2 2-4.4 3.5-7.5 5-3 1.3-7.2 2.2-12.2 2.4-2 1.4-3.7 2.6-5.7 3.5L70 112c-2 2.2-4 4-6 5.3-2 1.4-4 2-6.3 2-1.8 0-3.5-.3-5-1-1.6-.7-3-1.6-4.3-2.8-1.3-1.2-2.4-2.6-3.3-4-1-1.7-1.5-3.3-2-5-.7-1.2-1.2-2.5-1.5-3.8-.3-1.4-.4-2.7-.4-4 0-1 .4-2 1-3s1.4-2.3 2.3-3.3C45 91.7 46 91 47 90l2.3-1.6L55 81c1.7-2 3.3-4 5-5.7 1.5-1.7 3-3.5 4.8-5.3l6.2-5.8-.2-1.4c0-2 .4-3.6 1.2-5 .8-1.6 1.8-3 3-4 1.3-1 2.6-2 4-2.7l4.3-1.4V46l-.5-3.5c0-1-.3-2.3-.5-3.6l-.8-4.4 2.8-1.2c1 .4 2 1 3.2 1.8 1.2 1 2.4 1.8 3.6 3 1.4 1 2.6 2.2 3.7 3.5l3 4.5 1-.2c.4-2.4.8-5 1-7.5.4-2.7.6-5.5.8-8.7l4-.7c1.2 1 2.6 2.7 4 4.3 1.4 1.6 2.8 3.3 4 5.3 1.3 2 2.6 4 3.7 6.4 1.2 2.2 2 4.7 3 7.4l3 4 4 4 4.4 5 5.2 6c2.5 2.8 5 6.6 8 11.2 2.7 4.6 5.2 9.6 7.5 15.2 2.4 5.5 4.3 11.3 5.8 17.3 1.6 6.3 2.3 12 2.3 18 0 4 0 7-.2 10 0 3-.2 6-.5 8.7l-1 8.7-1.7 10.8z"/><path d="M92.4 47.3l-2.2-3.7c-.8-1.3-2-2.4-3.4-3.5l-.3.3c.4 1.3.7 2.6.8 4l.3 4.3zM106.7 83.3c.7 2 1.2 4 1.6 6.2.4 2.2.7 4.4.7 6.6 0 4.5-1 8.3-2.7 11.6-1.7 3.4-4 6.5-6.5 9.3-2.7 3-5.5 5.6-8.6 8.2-3 2.8-6 5.6-8.5 8.5-2.6 3-4.8 6-6.6 9.4-1.5 3.4-2.4 7-2.4 11.6 0 2.2 0 4 .4 5.7 0 1.7.4 3 .7 4.3h75l1-7 .8-7c.3-2.5.5-5 .6-7.8.3-2.8.4-6 .4-9.5 0-4.5-.5-9.3-1.4-14.4-1-5-2.4-10.3-4.2-15.4-1.8-5-4-10-6.7-15-2.5-5-5.6-9.6-9-14l-4.3-4.8c-1.3-1.4-2.5-3-3.8-4.3l-4-4.4c-1.6-1.5-3-3.3-5-5.3-.7-3.6-2-7-3.7-10.4-1.8-3.3-3.6-6-5.6-8h-.5c0 2-.3 4-.5 6.4l-1 6.2-4.7 1-5.5 1c-2 .3-4 1-5.8 1.4-2 .5-3.7 1.2-5.2 2-1.6 1-2.8 2-3.8 3.4-1 1.2-1.5 2.8-1.5 4.6v1.4l.4 1.3c-5 4.4-9.2 9-13 13.5C59.3 84 56 88.2 53 92l-2 1.7c-.8.6-1.5 1.2-2 1.8-.8.7-1.3 1.3-1.7 2-.4.6-.6 1.3-.6 2 0 .8.2 1.6.5 2.5.3 1 .7 1.7 1 2.4 1 3.5 2.4 6 4 7.3 1.8 1.3 3.8 2 6 2 1.4 0 3-.5 4.5-1.5 1.6-1 3-2.7 4.5-4.8L71 106l3-1.4c1.2-.5 2.2-1 3.2-1.7 1-.8 2.2-1.6 3.3-2.6 2.7 0 5.3-.4 8-1.3 2.6-1 5-2 7-3.6C98 94 99.5 92 101 90c1.4-2 2-4.4 2-6.8z" fill="#fff"/><path d="M123.6 71.4c4.5 5 8.5 10.7 12 17.2 1.6 2.8 3 6 4.5 9.3 1.7 3.2 3 7 4 11 1.3 3.7 2 8 3 12.4.6 4.5 1 9.3 1 14.3 0 3.5 0 7-.6 10.8-.4 3.7-1 7.5-2 11.5h-10.7c1-3 1.6-6 2.2-8.7l1.4-8.3c.4-2.7.6-5.5.8-8 .2-2.8.3-5.6.3-8.5 0-9.4-1.3-18.4-4-27-2.5-8.6-6.5-17.3-11.7-26zM60.8 96.7v.5c-1.5 1-3 2-4.4 3.2-1.5 1.2-3 2-4.5 2.6-.7-.4-1-1-1.6-1.7-.5-.8-.8-1.6-1-2.5zM81.3 68.6c-.3-1-.5-1.5-.5-2 0-1 0-1.6.6-2 .4-.6 1-1 1.6-1.2.6-.3 1.3-.4 2-.5h2c1.4 0 3 0 4.5.2 1.5.3 2.8.4 4 .4-1 1-2 1.6-3 2.2-1.2.7-2.4 1.2-3.7 1.6-1.3.5-2.6.8-4 1l-3.6.3z"/></svg>'; break;
                                case 'Q': svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M88.2 40.4c0-2 .3-3.7 1-5 .7-1.6 1.6-2.8 2.7-3.8 1-1 2-1.8 3.5-2.3 1.4-.5 2.8-.7 4.2-.7 1.4 0 3 .2 4.3.7 1.6.5 2.8 1.2 4 2.2 1 1 2 2.2 2.7 3.7.8 1.5 1 3.2 1 5.2 0 3-.7 5.6-2.2 7.4-1.6 1.8-3.5 3-5.7 3.7l10.7 47.3 14.8-41.3c-2.3-.7-4.2-2-5.7-4-1.4-2-2-4.3-2-7 0-2 .2-3.6 1-5 .7-1.6 1.6-2.8 2.8-3.8 1-1 2.4-1.8 3.8-2.3 1.4-.5 2.8-.7 4.3-.7 1.4 0 2.8.2 4.3.7 1.4.5 2.7 1.3 3.8 2.3 1 1 2 2.2 2.7 3.7.7 1.5 1 3.2 1 5.2 0 1.3-.2 2.7-.6 4-.5 1.3-1.2 2.5-2 3.5-1 1-2 2-3.2 2.8-1.3.8-2.7 1.2-4.3 1.4l4 42.6L159 70.3c-1.8-1-3.3-2.4-4.3-4.3-1-1.8-1.6-4-1.6-6s.5-3.8 1-5.2c1-1.5 2-2.7 3-3.7s2.4-1.6 4-2c1.3-.6 2.7-.8 4.2-.8s3 .3 4.3.8c1.4.5 2.7 1.3 3.8 2.3 1.2 1 2 2.3 2.8 3.8.7 1.5 1 3 1 5 0 1.7-.2 3-.7 4.5-.5 1.4-1.3 2.7-2.3 3.8-1 1-2.2 2-3.7 2.6-1.4.5-3 1-4.8 1H164l-8 51v45c-9 1.2-18.3 2.2-28 2.7-9.7.6-19 1-28 1s-18.4-.4-28-1c-9.4-.5-18.7-1.5-27.7-2.7v-45l-7.6-51.3H35c-1.7 0-3.3-.3-4.7-1-1.5-.6-2.7-1.4-3.7-2.5-1-1-1.8-2.4-2.3-3.8-.5-1.4-.8-2.8-.8-4.3 0-2 .4-3.7 1-5 .5-1.7 1.5-3 2.5-4s2.3-1.7 3.7-2.2c1.4-.5 2.8-.7 4.2-.7 1.3 0 2.7.4 4.2 1 1.4.4 2.7 1.2 3.8 2.2 1.2 1 2 2.3 3 3.8.6 1.4 1 3 1 5 0 2.3-.6 4.4-1.7 6.2-1 2-2.5 3.3-4.3 4.3l19.8 30.3 4-42.5c-1.6 0-3-.5-4.3-1.3-1.2-.7-2.3-1.6-3.2-2.6-.8-1-1.5-2-2-3.4-.4-1.3-.7-2.7-.7-4 0-2 .4-3.7 1-5.2.7-1.5 1.6-2.7 2.8-3.7 1-1 2.4-1.7 3.8-2.2 1.5-.5 3-.7 4.3-.7 1.4 0 2.8.3 4.3.8 1.4.5 2.7 1.3 3.8 2.3 1.2 1 2 2.3 3 3.8.6 1.5 1 3.2 1 5.2 0 2.6-.8 5-2.2 7-1.5 1.8-3.4 3.2-5.7 4l14.8 41.2L96.2 52c-2.2-.8-4-2-5.7-3.8-1.5-1.8-2.3-4.3-2.3-7.4z"/><path d="M170.6 60c0-2-.6-3.4-1.7-4.3-1.4-1-2.7-1.4-4-1.4-1.6 0-3 .5-4 1.5-1.3 1-2 2.3-2 4 0 2 .7 3.3 2 4.2 1 1 2.4 1.5 4 1.5 1.3 0 2.6-.5 4-1.4 1-.7 1.5-2 1.5-4zM29.4 60c0 1.8.6 3.2 1.7 4 1.4 1 2.7 1.5 4 1.5 1.6 0 3-.5 4-1.5 1.3-1 1.8-2.3 2-4 0-2-.7-3.3-2-4.3-1-1-2.4-1.4-4-1.4-1.3 0-2.6.5-4 1.4-1 1-1.5 2.3-1.5 4.2zM139 46.5c0-2-.5-3.4-1.6-4.4-1.2-1-2.5-1.3-4-1.3s-2.7.5-4 1.5c-1 1-1.6 2.4-1.6 4.3 0 1.7.6 3 1.7 4 1.2 1 2.4 1.5 4 1.5 1.4 0 2.7-.4 4-1.3 1-1 1.6-2.3 1.6-4zM61 46.5c0 1.8.5 3.2 1.6 4 1.2 1 2.5 1.5 4 1.5s2.7-.4 4-1.4c1-1 1.6-2.3 1.6-4 0-2-.6-3.3-1.7-4.3-1.2-1-2.4-1.5-4-1.5-1.4 0-2.7.5-4 1.5-1 1-1.6 2.3-1.6 4.3zM94.4 40.3c0 1.8.5 3.2 1.6 4.2 1 1 2.3 1.5 3.8 1.5 1.6 0 3-.4 4-1.4 1.3-1 1.8-2.3 1.8-4.2 0-1.8-.5-3.2-1.7-4.2-1.3-1-2.7-1.5-4.3-1.5-1.6 0-2.8.5-4 1.5-1 1-1.4 2.4-1.4 4.2zM155.6 86.7l-18 29.8h3c1.2 0 2.4 0 3.6.2h3.3l2.6.3zM50 117h2.5l3.3-.2c1.2 0 2.4 0 3.6-.2h3l-18-29.8zM130.3 73.3L116 115.7c3.2 0 6.3.2 9.5.3l9 .3zM65.5 116.3l9-.3c3.2 0 6.3-.2 9.4-.3L69.2 73.4zM99.8 115.5h6c2.2 0 4.2 0 6.3.2l-12-54-12 54 6-.2h6zM99.8 164.5H112l13.3-.8 13-1c4-.4 7.8-.8 11.2-1.3v-7l-11.7.4-12.8.4c-4.4 0-8.7 0-13 .2H87.8c-4.3 0-8.6 0-13-.2-4.2 0-8.5-.2-12.7-.4-4 0-8-.2-11.4-.4v7c3.4.5 7 1 11.3 1.3l12.7 1 13 .7 12.2.2zM99.8 148.5H112c4.3 0 8.6 0 13-.2 4.3 0 8.6 0 12.8-.2h11.7v-8l-11.7-.3c-4.2-.2-8.5-.3-12.8-.3-4.4 0-8.7 0-13-.2H87.8c-4.3 0-8.6 0-13 .2-4.3 0-8.6 0-12.7.3-4 0-8 .2-11.4.3v7.8l11.6.3c4.2.3 8.5.4 12.8.4h13c4.2.2 8.3.2 12 .2zM50.5 133.7c3.6 0 7.4-.3 11.6-.4l13-.3h13c4.2-.2 8.2-.2 12-.2h12c4.4 0 8.8 0 13 .2 4.5 0 8.8.2 13 .3 4.2 0 8 .3 11.7.4v-11c-3.8 0-7.8-.3-12-.5l-13-.4-12.7-.2H88c-4 0-8.3 0-12.7.2-4.3 0-8.5.2-12.8.4l-12 .6z" fill="#fff"/></svg>'; break;
                                case 'R': svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M125.2 43.2V32.8H146v35h-7.2l-9.6 13.5V119l9.6 14h7v13.8h13v20.4H41.2v-20.4H54v-14h7L71 119V81.5L61 67.8h-6.7v-35h20.4v10.5H86V32.8h28v10.4z"/><path d="M73.8 74.8h52.4l5-7H68.5zM68.4 132.8H131l-4.8-7H73.8zM139.2 146.8v-7.4H60.5v7.4zM152.2 160.8v-7.4H48v7.3zM139.2 61.4V39h-7.7v10.7H108V39H92v10.7H68V39h-7.7v22.4zM122.7 119V81.4H77.4V119z" fill="#fff"/></svg>'; break;
                            }
                            if (ch === '×')
                                td.css({ backgroundColor: '#fcc' });
                            else if ((x + y) % 2 !== 0)
                                td.css({ backgroundColor: '#eee' });
                            if (svg !== null)
                                td.css({ 'background-image': 'url(\'data:image/svg+xml,' + svg.replace('#', '%23') + '\')', 'background-size': 'contain' });
                        }
                        tr.append($('<td>' + (6 - y) + '</td>').css({ verticalAlign: 'middle', paddingLeft: '1em' }));
                    }
                    $('<tr><td></td><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f</td></tr>').appendTo(table).find('td').css({ textAlign: 'center' });

                    module.push({ label: "Board:", obj: table });
                }
            },
            {
                regex: /Entered answer/
            }
        ]
    },
    {
        moduleID: "ChordQualities",
        loggingTag: "ChordQualities"
    },
    {
        displayName: "Color Morse",
        moduleID: "ColorMorseModule",
        loggingTag: "ColorMorse"
    },
    {
        moduleID: "ColoredSwitchesModule",
        loggingTag: "Colored Switches",
        matches: [
            {
                regex: /(Initial state of the switches:|Valid transition made. Switches now:|Three valid transitions made. LEDs show:) ([▲▼]{5})/,
                handler: function (matches, module) {
                    if (!('SwitchInfo' in module)) {
                        module.SwitchInfo = {
                            y: 0, svg: "", prevState: null,
                            dom: { label: 'Progression', obj: null },
                            lightColors: ['{L0}', '{L1}', '{L2}', '{L3}', '{L4}'],
                            darkColors: ['{D0}', '{D1}', '{D2}', '{D3}', '{D4}'],
                            set: function () {
                                module.SwitchInfo.dom.obj = $("<svg stroke-width='0.25' stroke='black' viewBox='-5 -5 135 " + (50 * module.SwitchInfo.y + 5) + "'>" + module.SwitchInfo.svg + "</svg>")
                                    .css({ width: '300px', display: 'block' });
                            }
                        };
                        module.push(module.SwitchInfo.dom);
                    }

                    var state = matches[2];
                    var svg = "";
                    var i;
                    for (i = 0; i < 5; i++)
                        svg +=
                            "<g transform='translate(" + (11 * i) + ",0)'>" +
                            "<ellipse fill='#bdc4d3' cx='5.5' cy='17.5' rx='4.2' ry='2' />" +
                            "<path fill='" + (module.SwitchInfo.lightColors[i]) + "' d='" + (state[i] === '▼' ? 'M3.8 17 2.2 32 8.8 32 7.2 17z' : 'M3.8 18 2.2 3 8.8 3 7.2 18z') + "' />" +
                            "<rect fill='" + (module.SwitchInfo.darkColors[i]) + "' x='2.2' y='" + (state[i] === '▼' ? '32' : '2') + "' width='6.6' height='1' />" +
                            "</g>";

                    var x = 0;
                    switch (matches[1][0]) {
                        case 'V':
                            // Valid transition: Find out which switch was toggled
                            var ix = 2;
                            for (i = 4; i >= 0; i--)
                                if (state[i] !== module.SwitchInfo.prevState[i])
                                    ix = i;
                            module.SwitchInfo.svg =
                                "<line x1='{x}' y1='{y1}' x2='{x}' y2='{y2}' stroke-width='4' />"
                                    .replace(/\{x\}/g, 11 * ix + 5.5)
                                    .replace(/\{y1\}/g, 50 * (module.SwitchInfo.y - 1) + 35)
                                    .replace(/\{y2\}/g, 50 * module.SwitchInfo.y)
                                + module.SwitchInfo.svg;
                            module.SwitchInfo.prevState = state;
                            break;

                        case 'I':
                            // Initial state
                            module.SwitchInfo.prevState = state;
                            break;

                        case 'T':
                            // Desired state
                            module.SwitchInfo.y--;
                            x = 70;
                            module.SwitchInfo.svg = "<text font-size='7' x='70' y='" + (50 * module.SwitchInfo.y - 3) + "'>Desired state:</text>" + module.SwitchInfo.svg;
                            break;
                    }

                    svg = "<g transform='translate(" + x + "," + (50 * module.SwitchInfo.y) + ")'><rect fill='#d7dbe5' x='0' y='0' width='55' height='35' />" + svg + "</g>";

                    module.SwitchInfo.y++;
                    module.SwitchInfo.svg += svg;
                    module.SwitchInfo.set();
                    return true;
                }
            },
            {
                regex: /Toggling switch #(\d) is invalid here/,
                handler: function (matches, module) {
                    if (!('SwitchInfo' in module))
                        return;

                    module.SwitchInfo.svg =
                        "<line x1='{x}' y1='{y1}' x2='{x}' y2='{y2}' stroke-width='4' /><g transform='translate({x}, {y2})' stroke-width='3' stroke='red'><line x1='-4' y1='-4' x2='4' y2='4' /><line x1='4' y1='-4' x2='-4' y2='4' /></g>"
                            .replace(/\{x\}/g, 11 * (parseInt(matches[1]) - 1) + 5.5)
                            .replace(/\{y1\}/g, 50 * (module.SwitchInfo.y - 1) + 35)
                            .replace(/\{y2\}/g, 50 * module.SwitchInfo.y - 7.5)
                        + module.SwitchInfo.svg;
                    module.SwitchInfo.set();
                    return true;
                }
            },
            {
                regex: /Colors of the switches: (.+)/,
                handler: function (matches, module) {
                    if (!('SwitchInfo' in module))
                        return;

                    var cols = matches[1].split(',');
                    if (cols.length != 5)
                        return;

                    var lightColors = {
                        'Red': '#f65353',
                        'Green': '#0fe325',
                        'Blue': '#5155f4',
                        'Purple': '#da6cf2',
                        'Orange': '#ffad0b',
                        'Turquoise': '#53d3ff'
                    };
                    var darkColors = {
                        'Red': 'hsl(0, 62%, 54%)',
                        'Green': 'hsl(126, 60%, 37%)',
                        'Blue': 'hsl(240, 60%, 53%)',
                        'Purple': 'hsl(289, 57%, 55%)',
                        'Orange': 'hsl(39, 70%, 42%)',
                        'Turquoise': 'hsl(195, 70%, 56%)'
                    };

                    for (var i = 0; i < 5; i++) {
                        module.SwitchInfo.lightColors[i] = lightColors[cols[i].trim()];
                        module.SwitchInfo.darkColors[i] = darkColors[cols[i].trim()];
                    }
                    module.SwitchInfo.svg = module.SwitchInfo.svg.replace(/\{[LD]\d\}/g, function (m) { return module.SwitchInfo[m[1] === 'L' ? 'lightColors' : 'darkColors'][parseInt(m[2])]; });
                    module.SwitchInfo.set();
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: ["Colour Flash", "Colour Flash PL", "Colour Flash ES", "Colour Flash Translated"],
        moduleID: ["ColourFlash", "ColourFlashPL", "ColourFlashES", "TranslatedColourFlash"],
        icon: ["Colour Flash", "Colour Flash PL", "Colour Flash ES", "Colour Flash"],
        loggingTag: ["Colour Flash", "Colour Flash PL", "Colour Flash ES", "Colour Flash Translated"],
        matches: [
            {
                regex: /Module generated/,
                handler: function (matches, module) {
                    let table = $('<table>').css({ 'border-collapse': 'collapse', 'border-style': 'solid', 'border-width': '2px', 'margin-left': 'auto', 'margin-right': 'auto' });
                    let rowHeader = $('<tr>').appendTo(table);
                    $('<th>').text("#").css({ 'border-style': 'solid', 'border-width': '2px', 'text-align': 'center', 'paddingLeft': '7px', 'paddingRight': '7px' }).appendTo(rowHeader);
                    $('<th>').text("Word").css({ 'border-style': 'solid', 'border-width': '2px', 'text-align': 'center', 'paddingLeft': '7px', 'paddingRight': '7px' }).appendTo(rowHeader);
                    $('<th>').text("Color").css({ 'border-style': 'solid', 'border-width': '2px', 'text-align': 'center', 'paddingLeft': '7px', 'paddingRight': '7px' }).appendTo(rowHeader);
                    $('<th>').text("Valid Response").css({ 'border-style': 'solid', 'border-width': '2px', 'text-align': 'center', 'paddingLeft': '7px', 'paddingRight': '7px' }).appendTo(rowHeader);
                    let count = 0;
                    let exp = /(?:\[Colour Flash Translated #\d+\] )?(\d)\s?(?:\||:)(?: Word)? (.+)\b\s+(?:\||,)(?: Color)? (.+)\b\s+(?:\||:)(?: Valid Response)?\s+(.+)/;
                    for (let i = 0; i < 15; i++) {
                        let line = readLine();
                        if (exp.test(line)) {
                            count++;
                            let tr = $('<tr>').appendTo(table);
                            let match = exp.exec(line);
                            for (let j = 1; j <= 4; j++) {
                                let td = $('<td>').text(match[j]).css({ 'border-style': 'solid', 'border-width': '2px', 'paddingLeft': '7px', 'paddingRight': '7px' }).appendTo(tr);
                                if (j == 4)
                                    td.css('text-align', 'center');
                            }
                        }
                        if (count == 8)
                            break;
                    }
                    module.push({
                        label: "Color Sequence:",
                        obj: table
                    });
                    readLine();
                    for (let i = 0; i < 3; i++) {
                        module.push(readLine().replace(/\[Colour Flash Translated #\d+\] /, ""));
                    }
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "complexKeypad",
        loggingTag: "Complex Keypad",
        matches: [
            {
                regex: /(.+: .+)/,
                handler: function (matches, module) {
                    module.push($("<span style='direction: ltr;'>").text(matches[1]));
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Complicated Wires",
        moduleID: "Venn",
        loggingTag: "VennWireComponent",
        matches: [
            {
                regex: /Wire (\d) (should(?: not)?) be snipped\./,
                handler: function (matches, module) {
                    const rules = {
                        Cut: "Cut",
                        DoNotCut: "Don't\nCut",
                        CutIfSerialEven: "SN\nEven",
                        CutIfParallelPortPresent: "Para.\nPort",
                        CutIfTwoOrMoreBatteriesPresent: "Batt.\n&ge; 2",
                    };

                    const wireData = /\[VennWireRuleSet\] Checking cut wire: index=(\d), color=([\w, ]+)\. Red=(True|False), Blue=(True|False), Symbol=(True|False), LED=(True|False), Rule=(\w+), Cut=(True|False)/.exec(lines[linen - 2]);
                    if (wireData) {
                        if (!('diagram' in module)) {
                            module.diagram = $SVG(`<svg width="300px">`);
                            module.splice(0, 0, { obj: module.diagram, nobullet: true, });
                        }

                        const wireIndex = parseInt(wireData[1]);
                        if (module.parsedWires == undefined) module.parsedWires = [];
                        if (module.parsedWires[wireIndex] == true) return;
                        module.parsedWires[wireIndex] = true;

                        const x = wireIndex * 0.6;
                        module.diagram.attr("viewBox", `-0.05 -0.05 ${x + 1.1} 2.75`);

                        // LED
                        $SVG(`<circle cx=${x + 0.25} cy=.25 r=.25 fill=${wireData[6] == "True" ? "white" : "black"} stroke="black" stroke-width="0.025">`).appendTo(module.diagram);

                        // Wire
                        const wireColors = wireData[2].split(", ");
                        $SVG(`<rect x=${x} y=.55 width=.5 height=1 fill=${wireColors[0]} stroke="black" stroke-width="0.025">`).appendTo(module.diagram);
                        if (wireColors.length == 2) $SVG(`<rect x=${x + 0.0125} y=${0.55 + (1 / 3)} width=0.475 height=${1 / 3} fill=${wireColors[1]}>`).appendTo(module.diagram);

                        // Star
                        if (wireData[5] == "True") $SVG(`<path d="m55,237 74-228 74,228L9,96h240" fill="black" transform="translate(${x}, 1.6) scale(0.00208333333)">`).appendTo(module.diagram);

                        // Rule/Should cut
                        $SVG(`<text x=${x + 0.25} y=2.45 fill="${wireData[8] == "True" ? "green" : "red"}" font-size="0.2">${rules[wireData[7]].split("\n").map((a, i) => `<tspan text-anchor="middle" x=${x + 0.25} dy=${i * .2}>${a}</tspan>`).join("")}</text>`).appendTo(module.diagram);
                    }
                }
            },
            {
                regex: /Wire snipped ((?:in)?correctly): (\d)!/i,
                handler: function (matches, module) {
                    module.push(`Wire ${parseInt(matches[2]) + 1} snipped ${matches[1].toLowerCase()}`);
                }
            }
        ]
    },
    {
        moduleID: "ConnectedMonitorsModule",
        loggingTag: "Connected Monitors",
        matches: [
            {
                regex: /(?:Monitor: (\d+) \| Number: (\d+) \| Color: (\w+) \| Indicators: (.+) \| Display color: (\w+))/,
                handler: function (matches, module) {
                    if (!('infoTable' in module)) {
                        var table = $('<table>')
                            .css('font-size', '12px')
                            .css('border-collapse', 'collapse')
                            .css('border-style', 'solid')
                            .css('border-width', '1px');
                        module.infoTable = table;
                        var trHead = $('<tr>').css('border-style', 'solid').css('border-width', '1px').appendTo(table);
                        $('<th>')
                            .text("Monitor")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '60px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("Number")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '60px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("Color")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '60px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("Indicator Color(s)")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '300px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("Display Color")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '60px')
                            .appendTo(trHead);
                        module.push({ label: "Monitors Information:", obj: table });
                    }
                    var moniPos = matches[1];
                    var moniNum = matches[2];
                    var moniCol = matches[3];
                    var moniInd = matches[4].replace(/Index: (\d): Color: /g, "").replace(/, It is /g, " ").replace(/;/g, ", ");
                    var moniDispCol = matches[5];
                    var tr = $('<tr>').css('border-style', 'solid').css('border-width', '1px').appendTo(module.infoTable);

                    $('<td>')
                        .text(moniPos)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '60px')
                        .appendTo(tr);
                    $('<td>')
                        .text(moniNum)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '60px')
                        .appendTo(tr);
                    $('<td>')
                        .text(moniCol)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '60px')
                        .appendTo(tr);
                    $('<td>')
                        .text(moniInd)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '300px')
                        .appendTo(tr);
                    $('<td>')
                        .text(moniDispCol)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '60px')
                        .appendTo(tr);
                    return true;
                }
            },
            {
                regex: /Monitor: (\d+):/,
                handler: function (matches, module) {
                    if (!('calculationTable' in module)) {
                        var table = $('<table>')
                            .css('font-size', '12px')
                            .css('border-collapse', 'collapse')
                            .css('border-style', 'solid')
                            .css('border-width', '1px');
                        module.calculationTable = table;
                        var trHead = $('<tr>').css('border-style', 'solid').css('border-width', '1px').appendTo(table);
                        $('<th>')
                            .text("Monitor")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '60px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("S1")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '40px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("S2")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '40px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("S3")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '40px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("S4")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '40px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("S5")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '40px')
                            .appendTo(trHead);
                        $('<th>')
                            .text("Final")
                            .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                            .css('width', '80px')
                            .appendTo(trHead);
                        module.push({ label: "Calculation:", obj: table });
                    }
                    var Monitor = matches[1];
                    var Sec1 = readTaggedLine().replace(/Monitor: (\d+), Section: 1, Score: /, "");
                    var Sec2 = readTaggedLine().replace(/Monitor: (\d+), Section: 2, Score: /, "");
                    var Sec3 = readTaggedLine().replace(/Monitor: (\d+), Section: 3, Score: /, "");
                    var Sec4 = readTaggedLine().replace(/Monitor: (\d+), Section: 4, Score: /, "");
                    var Sec5 = readTaggedLine().replace(/Monitor: (\d+), Section: 5, Score: /, "");
                    var TScr = readTaggedLine().replace(/Monitor: (\d+), Total score: /, "");
                    var tr = $('<tr>').css('border-style', 'solid').css('border-width', '1px').appendTo(module.calculationTable);

                    $('<td>')
                        .text(Monitor)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '60px')
                        .appendTo(tr);
                    $('<td>')
                        .text(Sec1)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '40px')
                        .appendTo(tr);
                    $('<td>')
                        .text(Sec2)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '40px')
                        .appendTo(tr);
                    $('<td>')
                        .text(Sec3)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '40px')
                        .appendTo(tr);
                    $('<td>')
                        .text(Sec4)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '40px')
                        .appendTo(tr);
                    $('<td>')
                        .text(Sec5)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '40px')
                        .appendTo(tr);
                    $('<th>')
                        .text(TScr)
                        .css('text-align', 'center').css('border-style', 'solid').css('border-width', '1px')
                        .css('width', '80px')
                        .appendTo(tr);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "cooking",
        loggingTag: "Cooking",
        matches: [
            {
                regex: /(Solution|Submitted):/,
                handler: function (matches, module) {
                    module.push([matches[1], module.items = []]);

                    return true;
                }
            },
            {
                regex: /- (.+)/,
                handler: function (matches, module) {
                    module.items.push(matches[1]);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "CoordinatesModule",
        loggingTag: "Coordinates",
        matches: [
            {
                regex: /(\d)×(\d)/,
                handler: function (matches, module) {
                    module.Width = parseInt(matches[1]);
                    module.Height = parseInt(matches[2]);
                    module.Coordinates = {};
                }
            },
            {
                regex: /(illegal|correct) coordinate .=([A-Z]\d+) as (.+?)( \(.+\))?$/,
                handler: function (matches, module) {
                    var key = matches[2];
                    if (key in module.Coordinates)
                        module.Coordinates[key].Text += '\n' + matches[3];
                    else
                        module.Coordinates[key] = { Text: matches[3], Legal: matches[1] === 'correct' };
                    return true;
                }
            },
            {
                regex: /Grid:/,
                handler: function (_, module) {
                    var x;

                    var table = $('<table>').css({ borderCollapse: 'collapse', width: '99%', tableLayout: 'fixed' });
                    for (x = 0; x < module.Width; x++)
                        $('<col>').attr('width', (99 / module.Width) + '%').appendTo(table);
                    for (var y = 0; y < module.Height; y++) {
                        var tr = $('<tr>').css('height', '4em').appendTo(table);
                        for (x = 0; x < module.Width; x++) {
                            var key = String.fromCharCode(65 + x) + (y + 1);
                            var td = $('<td>').appendTo(tr).css({ border: '1px solid black', textAlign: 'center' });
                            if (key in module.Coordinates)
                                td.text(module.Coordinates[key].Text).css({ border: '3px solid ' + (module.Coordinates[key].Legal ? '#0c0' : '#f00'), fontSize: module.Coordinates[key].Text.length > 6 ? "80%" : "125%", whiteSpace: 'pre-line' });
                        }
                    }

                    module.push({ label: "Grid:", obj: table });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "CrackboxModule",
        loggingTag: "Crackbox",
        matches: [
            {
                regex: /One possible solution:/,
                handler: function (matches, module) {
                    var table = $('<table>')
                        .css('font-size', '20px')
                    let gridfinal = "";
                    let gridinitial = "";
                    for (var r = 0; r < 4; r++) {
                        gridfinal += readTaggedLine().replace(/10/g, "0").replace(/,/g, "").replace(/ /g, "");
                    }
                    gridfinal += readTaggedLine().replace(/Initial grid:/, "");
                    for (var r = 0; r < 4; r++) {
                        gridinitial += readTaggedLine().replace(/10/g, "0").replace(/,/g, "").replace(/ /g, "");
                    }

                    for (var r = 0; r < 4; r++) {
                        var tr = $('<tr>').appendTo(table)
                        for (var c = 0; c < 4; c++) {
                            if (gridinitial[c + 4 * r] === "B") {
                                $('<td>')
                                    .text(' ')
                                    .css('background-color', '#000000')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px').appendTo(tr);
                            }
                            else if (gridinitial[c + 4 * r] === gridfinal[c + 4 * r]) {
                                if (gridfinal[c + 4 * r] === "0")
                                    $('<td>')
                                        .text('10')
                                        .css('background-color', 'rgb(60,155,58)').css('text-align', 'center').css('width', '30px').css('height', '30px').appendTo(tr);
                                else $('<td>')
                                    .text(gridfinal[c + 4 * r])
                                    .css('background-color', 'rgb(60,155,58)').css('text-align', 'center').css('width', '30px').css('height', '30px').appendTo(tr);
                            }
                            else {
                                if (gridfinal[c + 4 * r] === "0") $('<td>').text('10')
                                    .css('background-color', 'rgb(194,185,178)').css('text-align', 'center').css('width', '30px').css('height', '30px').appendTo(tr);
                                else $('<td>').text(gridfinal[c + 4 * r])
                                    .css('background-color', 'rgb(194,185,178)').css('text-align', 'center').css('width', '30px').css('height', '30px').appendTo(tr);
                            }
                        }
                    };
                    module.push({ label: "Possible solution:", obj: table });
                    return true;
                }
            },
            {
                regex: /One possible solution:/,
                handler: function (matches, module) {
                    var table = $('<table>')
                        .css('font-size', '20px')
                    for (var r = 0; r < 4; r++) {
                        var tr = $('<tr>').appendTo(table);
                        var grid = readTaggedLine().replace(/10/g, "0").replace(/,/g, "").replace(/ /g, "");
                        for (var c = 0; c < 4; c++) {
                            if (grid[c] === "B") {
                                $('<td>')
                                    .text(' ')
                                    .css('background-color', '#000000')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px').appendTo(tr);
                            }
                            else if (grid[c] === "*") {
                                $('<td>')
                                    .text(' ')
                                    .css('width', '30px')
                                    .css('height', '30px').appendTo(tr);
                            }
                            else if (grid[c] === "0") {
                                $('<td>')
                                    .text('10')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px').appendTo(tr);
                            }
                            else {
                                $('<td>')
                                    .text(grid[c])
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px').appendTo(tr);
                            }
                        }
                    };
                    module.push({ label: "Possible Solution:", obj: table });
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "CreationModule",
        loggingTag: "Creation",
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if (module.length === 0) {
                        module.push(["Initial attempt", [], true]);
                    }

                    module[module.length - 1][1].push(matches.input);
                }
            },
            {
                regex: /Restarting module.../,
                handler: function (matches, module) {
                    module.push(["Restart #" + module.length, []]);
                }
            }
        ]
    },
    {
        displayName: "The cRule",
        moduleID: "the_cRule",
        loggingTag: "The cRule",
        matches: [
            {
                regex: /One possible solution is:|Submitted the following states:/,
                handler: function (matches, module) {
                    var grid = readMultiple(4);
                    module.push({ label: matches.input, obj: pre(grid) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Cube",
        moduleID: "cube",
        loggingTag: "The Cube",
        matches: [
            {
                regex: /Cube movements: #1 is (.+)\. #2 is (.+)\. #3 is (.+)\. #4 is (.+)\. #5 is (.+)\. #6 is (.+)\./,
                handler: function (matches, module) {
                    module.Rotations = matches.slice(1, 7);
                    return true;
                }
            },
            {
                regex: /Cube faces: #1 is (.+)\. #2 is (.+)\. #3 is (.+)\. #4 is (.+)\. #5 is (.+)\. #6 is (.+)\./,
                handler: function (matches, module) {
                    module.Faces = matches.slice(1, 7);
                    return true;
                }
            },
            {
                regex: /Buttons: (.+)/,
                handler: function (matches, module) {
                    var result = new RegExp(`The execute button is (\\w+?) and says (.)\\.`).exec(matches[1]);
                    module.SubmitButton = { color: result[1], label: result[2] };
                    module.Buttons = new Array(8);
                    for (var i = 0; i < 8; i++) {
                        var result = new RegExp(`#${i + 1} is (\\w+?) and says (.)\\.`).exec(matches[1]);
                        module.Buttons[i] = { color: result[1], label: result[2] };
                    }
                    return true;
                }
            },
            {
                regex: /Wires: #1 is (.+)\. #2 is (.+)\. #3 is (.+)\. #4 is (.+)\./,
                handler: function (matches, module) {
                    module.Wires = matches.slice(1, 5);
                    return true;
                }
            },
            {
                regex: /Screens: #1 says (.{8})\. #2 says (.{8})\./,
                handler: function (matches, module) {
                    module.Screens = matches.slice(1, 3);
                    return true;
                }
            },
            {
                regex: /The rotation codes are (\d+), (\d+), (\d+), (\d+), (\d+), (\d+)\./,
                handler: function (matches, module) {
                    module.RotationCodes = matches.slice(1, 7);
                    return true;
                }
            },
            {
                regex: /The wire codes are (\d+), (\d+), (\d+), (\d+)\./,
                handler: function (matches, module) {
                    module.WireCodes = matches.slice(1, 5);
                    return true;
                }
            },
            {
                regex: /(The (final) cipher|Cipher ([123])) is (\d+)\./,
                handler: function (matches, module) {
                    function many(num, fnc) {
                        var str = '';
                        for (var i = 0; i < num; i++)
                            str += fnc(i);
                        return str;
                    }

                    module['Cipher' + (matches[2] || matches[3])] = matches[4];
                    if (matches[2]) {
                        var wireMap = [2, 3, 0, 1];
                        var wireOrd = ['rd', 'th', 'st', 'nd'];
                        var colors = {
                            'blue': '#29f',
                            'green': '#4c4',
                            'orange': '#e82',
                            'purple': '#c4b',
                            'red': '#c22',
                            'white': '#eee'
                        };
                        var calcTable = $(`
                            <table style='border-collapse: collapse; border: 2px solid black; margin: 8pt 0 24pt;'>
                                <tr><th>Rotation</th>    ${many(6, x => `<td><div class='icon rotation-${module.Rotations[x].replace(/ /g, '')}'></div><div>${module.RotationCodes[x]}</div></td>`)}</tr>
                                <tr><th>Face digit</th>  ${many(6, x => `<td><div class='icon' style='background-position: -${x * 50}px -50px'></div><div>${module.Faces[5 - x]}</div></td>`)}</tr>
                                <tr><th>Wires</th>       ${many(4, x => `<td><div class='wire' style='background-color: ${colors[module.Wires[wireMap[x]]]}'><div>${wireMap[x] + 1}${wireOrd[x]}</div></div><div>${module.WireCodes[wireMap[x]]}</div></td>`)}</tr>
                                <tr><th>After modulo</th>${many(6, x => `<td>${module.Cipher1.substr(x, 1)}</td>`)}</tr>
                                <tr><th>Display 1</th>   ${many(8, x => `<td><div class='symbol'>${module.Screens[0].substr(x, 1)}</div><div>${module.Cipher2.substr(x, 1)}</div></td>`)}</tr>
                                <tr><th>Display 2</th>   ${many(8, x => `<td><div class='symbol'>${module.Screens[1].substr(x, 1)}</div><div>${module.Cipher3.substr(x, 1)}</div></td>`)}</tr>
                                <tr class='final'><th>FINAL CIPHER</th>${many(8, x => `<td>${module.Cipherfinal.substr(x, 1)}</td>`)}</tr>
                            </table>
                        `);
                        calcTable.find('td').css({ textAlign: 'center', border: '1px solid #888', padding: '.2em .3em' });
                        calcTable.find('th').css({ textAlign: 'left', border: '1px solid #888', padding: '.2em .4em' });
                        calcTable.find('.icon').css({ backgroundImage: "url('img/The Cube/Rotations.png')", backgroundSize: '300px 100px', backgroundRepeat: 'no-repeat', width: '50px', height: '50px' });
                        calcTable.find('.rotation-tipbackwards').css({ backgroundPosition: '0 0' });
                        calcTable.find('.rotation-tipforwards').css({ backgroundPosition: '-50px 0' });
                        calcTable.find('.rotation-tipright').css({ backgroundPosition: '-100px 0' });
                        calcTable.find('.rotation-tipleft').css({ backgroundPosition: '-150px 0' });
                        calcTable.find('.rotation-rotateright').css({ backgroundPosition: '-200px 0' });
                        calcTable.find('.rotation-rotateleft').css({ backgroundPosition: '-250px 0' });
                        calcTable.find('.wire').css({ width: '50px', height: '20px', border: '1px solid black', boxSizing: 'border-box', position: 'relative', display: 'inline-block' });
                        calcTable.find('.wire>div').css({ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '10pt' });
                        calcTable.find('.symbol').css({ fontFamily: 'KRA', fontSize: '28pt' });
                        calcTable.find('tr.final td,tr.final th').css({ backgroundColor: '#ddffee' });
                        module.push({ label: 'Calculations:', obj: calcTable });
                        module.push({
                            label: 'Submit button:', obj:
                                $(`<div><div class='inner'>${module.SubmitButton.color} <span>${module.SubmitButton.label}</span></div></div>`)
                                    .find('.inner').css({ backgroundColor: colors[module.SubmitButton.color], border: '1px solid black', padding: '.1em .4em', margin: '.5em 0 2em', display: 'inline-block' })
                                    .find('span').css({ fontFamily: 'KRA', fontSize: '28pt' })
                                    .end().end()
                        });

                        const key = ix => `<td style='background: ${colors[module.Buttons[ix].color]}; padding: 8pt; border: 6px solid rgba(233, 244, 255, .4); border-right-color: rgba(0, 0, 0, .3); border-bottom-color: rgba(0, 0, 0, .3);'>${module.Buttons[ix].label}</td>`;
                        var keypad = $(`
                            <table style="background: #cdf; border-spacing: 5px; border: 2px solid black; font-family: 'KRA'; font-size: 28pt; margin: 8pt 0 24pt;">
                                ${many(4, x => `<tr>${key(2 * x)}${key(2 * x + 1)}</tr>`)}
                            </table>
                        `);
                        module.push({ label: 'Keys:', obj: keypad });
                    }
                    return true;
                }
            },
            {
                regex: /((Stage \d+) button presses:|Strike! At stage \d+, your buttons were:) #1 is (True|False)\. #2 is (True|False)\. #3 is (True|False)\. #4 is (True|False)\. #5 is (True|False)\. #6 is (True|False)\. #7 is (True|False)\. #8 is (True|False)\.(.*)$/,
                handler: function (matches, module) {
                    function many(num, fnc) {
                        var str = '';
                        for (var i = 0; i < num; i++)
                            str += fnc(i);
                        return str;
                    }
                    function key(ix) {
                        return `<td style='color: ${matches[ix + 3] === 'True' ? '#0c0' : '#c00'}; border: 1px solid #888; width: 12pt; text-align: center;'>${matches[ix + 3] === 'True' ? '✓' : '✗'}</td>`;
                    }
                    module.push({
                        label: matches[2] ? matches[2] + ' solution:' : matches[1],
                        obj: $(`<table style='border-collapse: collapse; margin: 4pt 0 12pt;'>${many(4, x => `<tr>${key(2 * x)}${key(2 * x + 1)}</tr>`)}</table>`)
                    });
                    if (matches[11].length > 0)
                        module.push(matches[11].trim());
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Cursor Maze",
        moduleID: "cursorMazeModule",
        loggingTag: "Cursor Maze",
        matches: [
            {
                regex: /^Generated Maze:$/,
                handler: function(matches, module) {
                    let maze = readMultiple(9).replace(/\[Cursor Maze #\d+\]/g, '').split('\n').slice(0, 8);
                    let table = $('<table>');
                    for(let i = 0; i < 8; i++) {
                        let tr = $('<tr>').appendTo(table);
                        maze[i].split('').forEach(element => {
                            switch(element) {
                                case 'X':
                                    $('<td>')
                                        .text(' ')
                                        .css('background-color', '#000000')
                                        .css('text-align', 'center')
                                        .css('width', '20px')
                                        .css('height', '20px')
                                        .appendTo(tr);
                                    break;
                                case 'O':
                                    $('<td>')
                                        .text(' ')
                                        .css('background-color', '#00FFFF')
                                        .css('text-align', 'center')
                                        .css('width', '20px')
                                        .css('height', '20px')
                                        .appendTo(tr);
                                    break;
                                case 'G':
                                    $('<td>')
                                        .text(' ')
                                        .css('background-color', '#00FF00')
                                        .css('text-align', 'center')
                                        .css('width', '20px')
                                        .css('height', '20px')
                                        .appendTo(tr);
                                    break;
                                case 'R':
                                    $('<td>')
                                        .text(' ')
                                        .css('background-color', '#FF0000')
                                        .css('text-align', 'center')
                                        .css('width', '20px')
                                        .css('height', '20px')
                                        .appendTo(tr);
                                    break;
                            }
                        });
                    }
                    module.push({ label: "Generated Maze:", obj: table });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Dealmaker",
        moduleID: "thedealmaker",
        loggingTag: "TheDealmaker"
    },
    {
        displayName: "Determinants",
        moduleID: "determinant",
        loggingTag: "Needy Determinants"
    },
    {
        displayName: "Dreamcipher",
        moduleID: "ksmDreamcipher",
        loggingTag: "Dreamcipher",
        matches: [
            {
                regex: /Glyph alphabet translation table:/,
                handler: function (matches, module) {
                    var glyphTable = readMultiple(8).replace(/\[Dreamcipher #\d+\] \* /g, '');
                    module.push({ label: matches.input, obj: pre(glyphTable) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Echolocation",
        moduleID: "echolocation",
        loggingTag: "Echolocation",
        matches: [
            {
                regex: /Maze:/,
                handler: function (matches, module) {
                    var maze = readMultiple(4).replace(/\[Echolocation #\d+\] /g, '');
                    module.push({ label: matches.input, obj: pre(maze) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Emoticon Math",
        moduleID: "emoticonMathModule",
        loggingTag: "Emoticon Math",
        matches: [
            {
                regex: /^Puzzle on module: “([^“”]+)”$/,
                handler: function (matches, module) {
                    let span = $("span").css("font-family", "Emoticons").css("font-size", "9px").text(matches[1]);
                    module.push({ label: "Puzzle on module: ", obj: span });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "EncryptedEquationsModule",
        loggingTag: "Encrypted Equations",
        matches: [
            {
                regex: /Equation:/,
                handler: function (matches, module) {
                    module.push({ label: "Equation:", obj: pre(readMultiple(19)) });
                }
            }
        ]
    },
    {
        moduleID: "EncryptedValuesModule",
        loggingTag: "Encrypted Values",
        matches: [
            {
                regex: /Operand:/,
                handler: function (matches, module) {
                    module.push({ label: "Operand:", obj: pre(readMultiple(2)) });
                }
            }
        ]
    },
    {
        moduleID: "factoringMaze",
        loggingTag: "Factoring Maze",
        matches: [
            {
                regex: /The generated with its walls is as follows:/,
                handler: function (matches, module) {
                    module.push({ label: "The maze generated with its walls as follows:", obj: pre(readMultiple(9).replace(/\[Factoring Maze #\d+\] /g, "")) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "fastMath",
        loggingTag: "Fast Math",
        matches: [
            {
                regex: /(<Stage (\d+)> (.+)|Pressed GO! Let the madness begin!)/,
                handler: function (matches, module) {
                    if (module.length == 0 || !(module[module.length - 1] instanceof Array) || (matches[2] && module[module.length - 1][0] !== "Stage " + matches[2]))
                        module.push(["Stage " + matches[2], []]);
                    module[module.length - 1][1].push(matches[3] || matches.input);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Faulty RGB Maze",
        moduleID: "faultyrgbMaze",
        loggingTag: "Faulty RGB Maze",
        matches: [
            {
                regex: /The grid:/,
                handler: function (matches, module) {
                    let line = readTaggedLine().replace(/WWWWWWWWWWWWWWW/g, "•——•——•——•——•——•——•——•");
                    let finalLine = " A  B  C  D  E  F  G      A  B  C  D  E  F  G      A  B  C  D  E  F  G \n" + line + "   " + line + "   " + line;
                    for (let i = 1; i < 8; i++) {
                        line = `${readTaggedLine()}`;
                        let line2 = `${readTaggedLine()}`;
                        let redMazevert = `${line.replace(/(R|Y|M|W)/g, "■").replace(/(G|B|C|K)/g, "□").replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")}`;
                        let redMazehoriz = `${line2.replace(/(R|Y|M|W)/g, "■").replace(/(G|B|C|K)/g, "□").replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")}`;
                        let greenMazevert = `${line.replace(/(G|Y|C|W)/g, "■").replace(/(R|B|M|K)/g, "□").replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")}`;
                        let greenMazehoriz = `${line2.replace(/(G|Y|C|W)/g, "■").replace(/(R|B|M|K)/g, "□").replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")}`;
                        let blueMazevert = `${line.replace(/(B|C|M|W)/g, "■").replace(/(R|G|Y|K)/g, "□").replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")}`;
                        let blueMazehoriz = `${line2.replace(/(B|C|M|W)/g, "■").replace(/(R|G|Y|K)/g, "□").replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")}`;
                        finalLine += "\n" + redMazevert + " " + i + " " + greenMazevert + " " + i + " " + blueMazevert + "\n" + redMazehoriz + "   " + greenMazehoriz + "   " + blueMazehoriz;
                    }
                    finalLine += "\n         Red                      Green                    Blue";
                    module.push({ label: "The grid:", obj: pre(finalLine) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Fifteen",
        moduleID: "fifteen",
        loggingTag: "Fifteen",
        matches: [
            {
                regex: /Indexes for placing the tiles:/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(15)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Find The Date",
        moduleID: "DateFinder",
        loggingTag: "Date Finder"
    },
    {
        displayName: "FizzBuzz",
        moduleID: "fizzBuzzModule",
        loggingTag: "FizzBuzz",
        matches: [
            {
                regex: /^Button 1 \(\w+\), < 2 strikes:/,
                handler: function (_, module) {
                    module.push({ linebreak: true });
                }
            },
            {
                regex: /^Button \d/,
                handler: function (matches, module) {
                    module.push([matches.input, []]);
                    return true;
                }
            },
            {
                regex: /^— (.+)/,
                handler: function (matches, module) {
                    module[module.length - 1][1].push(matches[1]);
                    if (matches[1].startsWith("original number is"))
                        module[module.length - 1][0] += matches[1].substr("original number is".length);
                    return true;
                }
            },
            {
                regex: /.+/
            },
            {
                regex: /Solution for /,
                handler: function (_, module) {
                    module.push({ linebreak: true });
                }
            }
        ]
    },
    {
        displayName: "Follow the Leader",
        moduleID: "FollowTheLeaderModule",
        loggingTag: "Follow the Leader",
        matches: [
            {
                regex: /Starting at wire:|Strike because you cut/
            },
            {
                regex: /Wire state:/,
                handler: function (_, module) {
                    var states = [];

                    var line = readLine();
                    while ((/^Wire \d+-to-\d+/).exec(line)) {
                        states.push(line);
                        line = readLine();
                    }
                    linen--;

                    module.push(["Wire states:", states]);
                }
            },
            {
                regex: /Expectation/,
                handler: function (matches, module) {
                    if (matches.input.match(/Expectation now is that you’re done./)) {
                        module.push(matches.input);
                    } else {
                        var states = [];

                        var line = readLine();
                        while ((/^Wire \d+-to-\d+/).exec(line)) {
                            states.push(line);
                            line = readLine();
                        }
                        linen--;
                        module.push([matches.input, states]);
                    }
                }
            }
        ]
    },
    {
        displayName: "Following Orders",
        moduleID: "FollowingOrders",
        loggingTag: "Following Orders",
        matches: [
            {
                regex: /The maze generated as such, where '\.' represents a safe tile and '\*' represents a trapped tile:\s*/,
                handler: function (matches, module) {
                    var board = readMultiple(5);
                    module.push({ label: matches.input.replace(/'/g, ''), obj: pre(board) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Forget Enigma",
        moduleID: "forgetEnigma",
        loggingTag: "Forget Enigma",
        matches: [
            {
                regex: /Generated Answer: (.+)/,
                handler: function (matches, module) {
                    module.push({
                        label: "Generated Answer: ",
                        obj: pre(matches[1])
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Forget Everything",
        moduleID: "HexiEvilFMN",
        loggingTag: "Forget Everything",
        matches: [
            {
                regex: /(Stage order:) (\d+(,\d+)*)/,
                handler: function (matches, module) {
                    var div = $('<div>');
                    div.text(matches[2]).css({ "white-space": "nowrap", "overflow-x": "scroll " });
                    module.push({ label: matches[1], obj: div });
                    return true;
                }
            },
            {
                regex: /Initial answer \(stage 1 display\): (\d+)$/,
                handler: function (matches, module) {
                    module.ForgetEverything = [{
                        Display: matches[1],
                        Tubes: null,
                        Colors: null,
                        Op: null,
                        Calc: null,
                        Answer: matches[1],
                        Valid: null
                    }];
                    module.ForgetEverythingNumber = matches[1];
                    return true;
                }
            },
            {
                regex: /Stage (\d+) - Display: (\d+), Tubes: (\d\d), (?:Colours: ([RGBY]{3}) (Red|Green|Blue|Yellow) *\((.*?)\) +\(.*?\), New answer: (\d+)|(Not important\.))\s*$/,
                handler: function (matches, module) {
                    var digits = matches[2].split('');
                    var ix = (parseInt(matches[1]) - 1) % 10;
                    var c = digits[ix];
                    var p = module.ForgetEverythingNumber.substr(ix, 1);
                    digits[ix] = `[ ${digits[ix]} ]`;
                    var op = (matches[6] || '').replace(/a/g, 'p').replace(/b/g, 'c').replace(/-/g, '−').replace(/\+/g, '+');
                    module.ForgetEverything.push({
                        Display: digits.join(' '),
                        Tubes: matches[3],
                        Colors: matches[4],
                        Color: matches[5],
                        Op: op,
                        Calc: op.replace(/c/g, c).replace(/p/g, p),
                        Answer: matches[7],
                        Valid: !matches[8]
                    });
                    if (!matches[8])
                        module.ForgetEverythingNumber = matches[7];
                    return true;
                }
            },
            {
                regex: /Total important stages: \d+/,
                handler: function (matches, module) {
                    var arr = [];
                    for (var i = 0; i < 10; i++)
                        arr.push(i);
                    var colours = {
                        'Red': '#f77',
                        'Green': '#7f7',
                        'Blue': '#7af',
                        'Yellow': '#ff4'
                    };
                    module.push({
                        label: 'Calculations:',
                        obj: $(`<table style='border-collapse: collapse'>
                            <tr><th>#</th><th>Valid?</th><th>LEDs → Color</th><th colspan='2'>Calculation</th><th>Answer</th></tr>
                            ${module.ForgetEverything.map((inf, stage) => `<tr${stage === 0 ? '' : ` title='Stage: ${stage + 1}&#xa;Display: ${inf.Display}&#xa;Nixie tubes: ${inf.Tubes}'`}>
                                <th style='text-align: right'>${stage + 1}</th>
                                ${inf.Valid === null ? `<td colspan='4'>INITIAL VALUE</td><td>${arr.map(i => `<span class='digit'>${inf.Answer.substr(i, 1)}</span>`).join('')}</td>` :
                                inf.Valid === true ? `<td>VALID</td><td style='background: ${colours[inf.Color]}'>${inf.Colors} → ${inf.Color}</td><td style='background: ${colours[inf.Color]}'>${inf.Op}</td><td style='background: ${colours[inf.Color]}'>${inf.Calc}</td><td>${arr.map(i => `<span class='digit${i == (stage % 10) ? " t" : ''}'>${inf.Answer.substr(i, 1)}</span>`).join('')}</td>` :
                                    `<td colspan='6' style='color: #888'>(not valid)</td>`
                            }
                            </tr>`).join('')}
                            <tr><th colspan='5'>FINAL ANSWER</th><td>${arr.map(i => `<span class='digit'>${module.ForgetEverythingNumber.substr(i, 1)}</span>`).join('')}</td></tr>
                        </table>`)
                            .find('td, th').css({ border: '1px solid black', padding: '.3em .5em' }).end()
                            .find('.digit').css({ border: '1px solid #888', padding: '0 .3em', background: '#ddd' }).end()
                            .find('.digit.t').css({ background: '#ecc', color: '#f00' }).end()
                    });
                    return false;
                }
            },
            {
                regex: /Final answer: \d+$/,
                handler: function () { return true; }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Forget Maze Not",
        moduleID: "forgetMazeNot",
        loggingTag: "Forget Maze Not",
        matches: [
            {
                regex: /^The maze has a size of (\d+) \* (\d+)$/,
                handler: function(matches, module) {
                    const COL_COUNT = parseInt(matches[1]);
                    const ROW_COUNT = parseInt(matches[2]);

                    let maze = readMultiple(ROW_COUNT + 1).split('\n').slice(1, ROW_COUNT + 1);
                    let table = $('<table>').css('border-collapse', 'collapse');

                    for(let row = 0; row < ROW_COUNT; row++) {
                        let tr = $('<tr>').appendTo(table);
                        for(let col = 0; col < COL_COUNT; col++) {
                            let td = $('<td>')
                                .text(' ')
                                .css('text-align', 'center')
                                .css('border', 'solid')
                                .css('width', '25px')
                                .css('height', '25px')
                                .appendTo(tr);

                            let current = maze[row].split(' ')[col].split('');
                            current.forEach(element => {
                                switch(element){
                                    case 'N':
                                        td.css('border-top', 'none');
                                        break;
                                    case 'E':
                                        td.css('border-right', 'none');
                                        break;
                                    case 'S':
                                        td.css('border-bottom', 'none');
                                        break;
                                    case 'W':
                                        td.css('border-left', 'none');
                                        break;
                                }
                            });
                        }
                    }

                    module.push('The maze has a size of ' + COL_COUNT + ' * ' + ROW_COUNT)
                    module.push({ label: "Maze:", obj: table });
                    return true;
                }
            },
            {
                regex: /^((You generated an inverted maze:)|(You generated a maze:))$/,
                handler: function(matches, module) {
                    const COL_COUNT = 5;
                    const ROW_COUNT = 5;

                    let maze = readMultiple(ROW_COUNT).split('\n');
                    let table = $('<table>').css('border-collapse', 'collapse');

                    for(let row = 0; row < ROW_COUNT; row++) {
                        let tr = $('<tr>').appendTo(table);
                        for(let col = 0; col < COL_COUNT; col++) {
                            let td = $('<td>')
                                .text(' ')
                                .css('text-align', 'center')
                                .css('border', 'solid')
                                .css('width', '25px')
                                .css('height', '25px')
                                .appendTo(tr);

                            let current = maze[row].split(' ')[col].split('');
                            current.forEach(element => {
                                switch(element){
                                    case 'N':
                                        td.css('border-top', 'none');
                                        break;
                                    case 'E':
                                        td.css('border-right', 'none');
                                        break;
                                    case 'S':
                                        td.css('border-bottom', 'none');
                                        break;
                                    case 'W':
                                        td.css('border-left', 'none');
                                        break;
                                }
                            });
                        }
                    }

                    module.push({ label: matches[1], obj: table });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Forget Perspective",
        moduleID: "qkForgetPerspective",
        loggingTag: "Forget Perspective",
        matches: [
            {
                regex: /------Stage (\d+) ------/,
                handler: function (matches, module) {
                    if (matches[1] == 1) {
                        module.push({ label: "Stages Displayed: " });
                        module.push({ obj: pre("  St |  Face  | Time(min) | Rules | Orders | Shifts | Ans  ").css('display', 'inline').css('margin', '0').css('padding', '0'), nobullet: true });
                        module.push({ obj: pre(" ————+————————+———————————+———————+————————+————————+————— ").css('display', 'inline').css('margin', '0').css('padding', '0'), nobullet: true });
                    }
                    var line0 = matches[1];
                    if (line0 < 10) line0 = "  " + matches[1];
                    else if (line0 < 100) line0 = " " + matches[1];
                    var line1 = readTaggedLine()
                        .replace(/The faces for Stage (\d+) are:(.+)/, "$2")
                        .replace(/,/g, "") //faces
                        .replace(/ /g, "") //faces
                        .replace(/\./g, "") //faces
                        .replace(/[a-z]/g, "") //faces
                    var line2 = readTaggedLine().replace(/Time you got the stage on: /, ""); //time
                    if (line2 < 10) line2 = "00" + line2;
                    else if (line2 < 100) line2 = "0" + line2;
                    var line3 = readTaggedLine().replace(/Applied starting rule /, "F").replace(/ and net rule /, ",N").replace(/\./, ""); //rule
                    var line4 = readTaggedLine().replace(/Order made: /, "").replace(/ /g, "") + readTaggedLine().replace(/Character Shift rule = (\d+), X = (\d+), Y = (\d+)/, ""); //order
                    var line5 = readTaggedLine().replace(/Shifted order: /, "").replace(/ /g, ""); //order after caesar
                    var line6 = readTaggedLine().replace(/Added value: /, ""); //value
                    module.push({ obj: pre(" " + line0 + " | " + line1 + " |    " + line2 + "    | " + line3 + " | " + line4 + " | " + line5 + " |  " + line6 + "   \n").css('display', 'inline').css('margin', '0').css('padding', '0'), nobullet: true });
                    return true;
                }
            },
            {
                regex: /------Final------/,
                handler: function (matches, module) {
                    var answer = readTaggedLine().replace(/Answer:/, "").replace(/ /g, "").replace(/(\w)(\w)(\w)(\w)(\w)/g, "$1$2$3$4$5 ")
                    module.push({ label: "Final Answer:", obj: pre(answer) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Forget This",
        moduleID: "forgetThis",
        loggingTag: "Forget This",
        matches: [
            {
                regex: /Stages \d+ to \d+/,
                handler: function (matches, module) {
                    module.push({
                        label: matches.input,
                        obj: pre(readMultiple(2, str => str.replace(/^[ \t]*\[.+?\] /, '')))
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Forget Us Not",
        moduleID: "forgetUsNot",
        loggingTag: "Forget Us Not",
        matches: [
            {
                regex: /Stage order:(.+)/,
                handler: function (matches, module) {
                    module.push({
                        label: "Stage order:",
                        obj: pre(matches[1])
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "FriendshipModule",
        loggingTag: "Friendship",
        matches: [
            {
                regex: /^Friendship symbol/,
                handler: function (matches, module) {
                    if (!module.SymbolsText) {
                        module.SymbolsText = [];
                        module.push(["Symbols", module.SymbolsText]);
                    }

                    module.SymbolsText.push(matches.input.replace(/^Friendship symbol /, ""));

                    var m2 = /^Friendship symbol #\d: \(X=(\d+), Y=(\d+), Pony=(.*) \((row|column)\)\)$/.exec(matches.input);
                    if (m2 === null)
                        module.SkipSvg = true;
                    else {
                        if (!module.Symbols)
                            module.Symbols = [];
                        var x = m2[1] | 0;
                        var y = 8 - m2[2] | 0;
                        var isRow = m2[4] === 'row';
                        var isColTie = false;
                        var isRowTie = false;
                        for (var i = 0; i < module.Symbols.length; i++) {
                            if (module.Symbols[i].X === x && (!isRow || !module.Symbols[i].IsRow)) {
                                if (module.Symbols[i].Y < y)
                                    module.Symbols[i].IsColTie = true;
                                else
                                    isColTie = true;
                            }
                            if (module.Symbols[i].Y === y && (isRow || module.Symbols[i].IsRow)) {
                                if (module.Symbols[i].X < x)
                                    module.Symbols[i].IsRowTie = true;
                                else
                                    isRowTie = true;
                            }
                        }

                        module.Symbols.push({ X: x, Y: y, Pony: m2[3], IsRow: isRow, IsColTie: isColTie, IsRowTie: isRowTie, Disregard: false });
                    }

                    return true;
                }
            },
            {
                regex: /^Disregard (column|row) symbol (.*), leaving/,
                handler: function (matches, module) {
                    if (!module.Symbols || module.SkipSvg)
                        return false;

                    var i;

                    var ix = -1;
                    for (i = 0; i < module.Symbols.length; i++)
                        if (module.Symbols[i].Pony === matches[2] && module.Symbols[i].IsRow === (matches[1] === 'row')) {
                            ix = i;
                            break;
                        }
                    if (ix === -1)
                        module.SkipSvg = true;
                    else {
                        module.Symbols[ix].Disregard = matches[1];
                        for (i = 0; i < module.Symbols.length; i++) {
                            if (module.Symbols[ix].IsRow && module.Symbols[i].Y > module.Symbols[ix].Y)
                                module.Symbols[i].IsRowTie = false;
                            if (!module.Symbols[ix].IsRow && module.Symbols[i].X > module.Symbols[ix].X)
                                module.Symbols[i].IsColTie = false;
                        }
                    }
                }
            },
            {
                regex: /^The potential Elements of Harmony are/,
                handler: function (matches, module) {
                    if (module.SkipSvg)
                        return false;

                    var cutieMarks = '';
                    var colDisregards = '';
                    var rowDisregards = '';
                    for (var i = 0; i < module.Symbols.length; i++) {
                        cutieMarks += `<img src='../HTML/img/Friendship/${module.Symbols[i].Pony}.png' style='position: absolute; left: ${30 * module.Symbols[i].X + 23}px; top: ${30 * module.Symbols[i].Y + 23}px; width: 84px; height: 84px;' />`;

                        var color;

                        var x = 30 * module.Symbols[i].X + 23 + 42;
                        var y = 30 * module.Symbols[i].Y + 23 + 42;
                        if (module.Symbols[i].IsRowTie || module.Symbols[i].Disregard === 'row') {
                            color = module.Symbols[i].IsRowTie ? '#27c' : '#c27';
                            rowDisregards += "<div style='position: absolute; left: " + x + "px; top: " + (y - 2) + "px; width: " + (510 - x) + "px; height: 4px; background: " + color + "'></div><div style='position: absolute; left: 515px; top: " + y + "px; color: " + color + "; transform: translateY(-50%)'>" + (module.Symbols[i].IsRowTie ? 'tie' : 'disregard') + "</div>";
                        }
                        if (module.Symbols[i].IsColTie || module.Symbols[i].Disregard === 'column') {
                            color = module.Symbols[i].IsColTie ? '#27c' : '#c27';
                            colDisregards += "<div style='position: absolute; left: " + (x - 2) + "px; top: " + y + "px; width: 4px; height: " + (390 - y) + "px; background: " + color + "'></div><div style='position: absolute; left: " + x + "px; top: 395px; color: " + color + "; transform: translateX(-50%)'>" + (module.Symbols[i].IsColTie ? 'tie' : 'disregard') + "</div>";
                        }
                    }

                    var bkgSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 490 370'>" +
                        "<path fill='#C595EC' d='M 0,0 0,240 C 70,240 130,300 130,370 L 490,370 490,130 C 420,130 360,70 360,0 z'/>" +
                        "<path fill='#080814' d='M 20,20 340,20 C 350,90 400,140 470,150 L 470,350 150,350 C 140,280 90,230 20,220 z'/>" +
                        "</svg>";
                    module.push($("<div style='background: url(\"data:image/svg+xml," + escape(bkgSvg) + "\"); position: relative; width: 490px; height: 370px; margin-bottom: 50px;'>").append(colDisregards + rowDisregards + cutieMarks));
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: ["GameOfLifeCruel", "GameOfLifeSimple", "LifeIteration"],
        loggingTag: ["Game of Life Cruel", "Game of Life Simple", "Life Iteration"],
        matches: [
            {
                regex: /Cell color reference:/,
                handler: function (_, module) {
                    module.reference = {};

                    while (linen < lines.length) {
                        var matches = (/(.) = (.+)/).exec(readLine());
                        if (matches == null) break;
                        module.reference[matches[1]] = matches[2];
                    }

                    linen--;
                }
            },
            {
                regex: /((?:Answer for|Submitted at) .+):/,
                handler: function (matches, module) {
                    module.push([matches[1], module.answer = []]);
                }
            },
            {
                regex: /(Initial state|Solution|Colored square states|Submitted):/,
                handler: function (matches, module) {
                    const grid = $SVG('<svg viewBox="0 0 6 8" width="20%">').css({ border: "2px gray solid", display: "block" });
                    readMultiple(8).split("\n").map(row => row.split("")).forEach((row, y) => {
                        row.forEach((cell, x) => {
                            const color = module.reference[cell];
                            const rect = $SVG(`<rect x=${x} y=${y} width=1 height=1 stroke=black stroke-width=0.05>`).appendTo(grid);
                            if (color == "White") rect.css("fill", "white");
                            else if (color == "Black") rect.css("fill", "#444");
                            else {
                                var matches = /(Flashing|Steady) ([^/]+)(?:\/(.+))?/.exec(color);
                                if (matches[1] == "Steady") rect.css("fill", matches[2]);
                                else {
                                    $SVG(`<animate
                                    attributeType="XML"
                                    attributeName="fill"
                                    values=${matches[2]};${matches[3] || "#444"}
                                    dur="1s"
                                    calcMode="discrete"
                                    repeatCount="indefinite"/>`).appendTo(rect);
                                }
                            }
                        });
                    });

                    let target = module.answer || module;
                    if (matches[1] == "Submitted") target = module;

                    target.push({ label: matches[1], obj: grid });
                }
            },
            {
                regex: /Found errors? at squares? ([A-Z0-9, ]+). Strike/,
                handler: function (matches, module) {
                    const errors = matches[1].split(", ").map(pair => { return { x: pair.charCodeAt(0) - 65, y: parseInt(pair[1]) - 1 }; });
                    const grid = $SVG('<svg viewBox="0 0 6 8" width="20%">').css({ border: "2px gray solid", display: "block" });
                    for (var x = 0; x < 6; x++) {
                        for (var y = 0; y < 8; y++) {
                            const rect = $SVG(`<rect x=${x} y=${y} width=1 height=1 fill=#444 stroke=black stroke-width=0.05>`).appendTo(grid);
                            if (errors.some(error => error.x == x && error.y == y)) rect.css("fill", "red");
                        }
                    }

                    module.push({ label: "Strike, incorrect squares:", obj: grid });
                }
            },
            {
                regex: /No errors found!|Amount of iterations: \d+/
            }
        ]
    },
    {
        moduleID: "giantsDrink",
        loggingTag: "The Giant's Drink",
        displayName: "The Giant’s Drink"
    },
    {
        displayName: "Grid Matching",
        moduleID: "GridMatching",
        loggingTag: "Grid Matching",
        matches: [
            {
                regex: /^(.*:) (\d+) +(.*:) ([A-Z])$/,
                handler: function (matches, module) {
                    var label = matches[1];
                    var extra = matches[3];
                    var letter = matches[4];
                    if (label === 'Seed Grid:')
                        return true;
                    if (label === 'Current Grid:') {
                        if (!('currentGridSeen' in module)) {
                            module.currentGridSeen = true;
                            label = 'Initial Grid:';
                            extra = null;
                        } else {
                            label = 'Submitted Grid:';
                            extra = 'Submitted Label:';
                        }
                    }
                    if (label === 'Solution Grid:') {
                        if (!('solutionGridSeen' in module))
                            module.solutionGridSeen = true;
                        else
                            return true;
                    }
                    var n = parseInt(matches[2]);
                    function each(n, fnc) {
                        var str = '';
                        for (var i = 0; i < n; i++)
                            str += fnc(i);
                        return str;
                    }
                    module.push({
                        label: `${label}${(extra === null ? '' : ` (${extra} ${letter})`)}`,
                        obj: $(`<table style='border-collapse: collapse'>
                            ${each(6, row => `<tr>${each(6, col => `<td class='${Math.floor(n / Math.pow(2, 6 * row + col)) % 2 ? 'empty' : 'filled'}'>`)}</tr>`)}
                        </table>`)
                            .find('td').css({ width: '25px', height: '25px', border: '1px solid black', padding: '0' }).end()
                            .find('td.filled').css('background', 'black').end()
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Guess Who?",
        moduleID: "GuessWho",
        loggingTag: "Guess Who?",
        icon: "Guess Who",
    },
    {
        displayName: "Hereditary Base Notation",
        moduleID: "hereditaryBaseNotationModule",
        loggingTag: "Hereditary Base Notation",
        matches: [
            {
                regex: /(The initial number|The number after incrementing its base and subtracting 1,) in hereditary base-\d,? is:/,
                handler: function (matches, module) {
                    readLine();
                    var equation = readLine();
                    var style = $("<style> .heredExponent { vertical-align: super; font-size: smaller; } .heredExponent .heredExponent { font-size: 100%; } </style>");
                    if (module.styleIsPush == null) {
                        module.styleIsPush = true;
                        module.push(style);
                    }
                    equation = equation.replace(/{/g, '<span class = "heredExponent">').replace(/}/g, '</span>');
                    var div = $('<div style="white-space: nowrap; overflow-x:scroll;">').append(equation).append('</div>');
                    module.push({ label: matches.input, obj: div });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "HexamazeModule",
        loggingTag: "Hexamaze",
        matches: [
            {
                regex: /Using rule seed: (\d+)/,
                handler: function (matches, module) {
                    module.Ruleseed = parseInt(matches[1]);
                }
            },
            {
                regex: /Moving from|Walking out|There’s an|However, we wanted/,
                handler: function (matches, module) {
                    if (!module.Moves) {
                        module.Moves = [];
                        module.push(["Moves", module.Moves]);
                    }

                    module.Moves.push(matches.input);
                    return true;
                }
            },
            {
                regex: /Submaze center: \((\d+), (\d+)\), submaze rotation: (\d+)° clockwise, pawn: \(\d+, \d+\) \(maze\)\/\((\d+), (\d+)\) \(screen\), pawn color: (\w+)\./,
                handler: function (matches, module) {
                    module.Link = { label: "" };
                    module.JSON = {
                        stencil: [parseInt(matches[1]), parseInt(matches[2])],
                        rotation: parseInt(matches[3]),
                        pawn: [parseInt(matches[4]), parseInt(matches[5])],
                        color: matches[6],
                        markings: []
                    };
                    if (module.Ruleseed)
                        module.JSON.ruleseed = module.Ruleseed;

                    module.push(module.Link);
                }
            },
            {
                regex: /Marking at \((\d), (\d)\) \(screen\)\/\(\d+, \d+\) \(maze\): \w+, after rotation: (\w+)/,
                handler: function (matches, module) {
                    module.JSON.markings.push({
                        pos: [parseInt(matches[1]), parseInt(matches[2])],
                        type: matches[3]
                    });
                    module.Link.label = "<a href='../HTML/Hexamaze interactive (samfundev).html#" + JSON.stringify(module.JSON) + "'>View the solution interactively</a>";
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Hexiom",
        moduleID: "hexiomModule",
        loggingTag: "Hexiom",
        matches: [
            {
                regex: /One possible solution:|Initial state:|Module disarmed with the following board:|Non initial board before reset:|Unsolved board upon detonation:/,
                handler: function (matches, module) {
                    if (module.firstTime == null || module.firstTime === true) {
                        module.firstTime = false;
                        module.push("Notation: [White Hexagon: Interactable, Red Hexagon: Constraint Number, Black Hexagon: Non-interactable]");
                    }
                    const div = $('<div>').css({ "text-align": "center" });
                    const svg = $('<svg width="30%" viewBox="-25 -25 50 50" fill="none">').appendTo(div);
                    const sideLength = 5;
                    const pointsXY = [sideLength * Math.cos(Math.PI / 3), sideLength * Math.sin(Math.PI / 3)];
                    const hexagon = `${sideLength},0 ${pointsXY[0]},${pointsXY[1]} -${pointsXY[0]},${pointsXY[1]} -${sideLength},0 -${pointsXY[0]},-${pointsXY[1]} ${pointsXY[0]},-${pointsXY[1]}`;
                    readLine();
                    let rawData = readMultiple(9).split('\n');
                    let re = /\[Hexiom #\d+\] ([ 0-6])(\*|\s)([ 0-6])(\*|\s)([ 0-6])(\*|\s)([ 0-6])(\*|\s)([ 0-6])(\*|\s)/;
                    hexData = {};
                    for (let i = -2; i < 3; i++) {
                        hexData[i] = {};
                        for (let j = -2; j < 3; j++) {
                            hexData[i][j] = {};
                            for (let k = -2; k < 3; k++) {
                                hexData[i][j][k] = {};
                            }
                        }
                    }
                    let baseIndices = [[2, 0], [2, -1], [1, -1], [1, -2], [0, -2]];
                    rawData.forEach(function (item, index) {
                        let lineMatches = re.exec(item);
                        if (index === 0 || index === 8)
                            hexData[0][2 - index / 2][-2 + index / 2] = { number: lineMatches[5] === " " ? -1 : parseInt(lineMatches[5]), isBlocked: lineMatches[6] === "*" };
                        else if (index % 2 === 1)
                            for (let i = -1; i < 2; i = i + 2)
                                hexData[i][baseIndices[2 + i][0] - (index - 1) / 2][baseIndices[2 + i][1] + (index - 1) / 2] = { number: lineMatches[5 + 2 * i] === " " ? -1 : parseInt(lineMatches[5 + 2 * i]), isBlocked: lineMatches[6 + 2 * i] === "*" };
                        else
                            for (let i = -2; i < 3; i = i + 2)
                                hexData[i][baseIndices[2 + i][0] - (index - 2) / 2][baseIndices[2 + i][1] + (index - 2) / 2] = { number: lineMatches[5 + 2 * i] === " " ? -1 : parseInt(lineMatches[5 + 2 * i]), isBlocked: lineMatches[6 + 2 * i] === "*" };
                    });
                    readLine();
                    for (let i = -2; i < 3; i++)
                        for (let j = -2; j < 3; j++)
                            for (let k = -2; k < 3; k++) {
                                if (i + j + k !== 0)
                                    continue;

                                let color = hexData[i][j][k].isBlocked ? hexData[i][j][k].number === -1 ? "black" : "red" : "none";
                                let group = $SVG(`<g transform="translate(${(i - j - k) * sideLength * 3 / 4} ${(k - j) * sideLength * Math.cos(Math.PI / 6)})">`).appendTo(svg);
                                $SVG(`<polygon points="${hexagon}" style="fill:${color};stroke:black;stroke-width:1;fill-rule:nonzero;""/>`).appendTo(group);
                                if (hexData[i][j][k].number !== -1)
                                    $SVG('<text x="0" y="0" font-size="8" text-anchor="middle" dominant-baseline="central" fill="black">').text(hexData[i][j][k].number).appendTo(group);
                            }

                    module.push({ label: matches.input, obj: div });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "HTTP Response",
        moduleID: "http",
        loggingTag: "NeedyHTTP",
        matches: [
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "hunting",
        loggingTag: "Hunting",
        matches: [
            {
                regex: /^Stage (\d+), Clues: ([A-Za-z]) & ([A-Za-z]), Buttons:((?: [A-Za-z])+), Decoys:((?: [A-Za-z])+)/,
                handler: function (matches, module) {
                    function addImg(span, str) {
                        span.append($('<img>')
                            .attr({ src: '../HTML/img/Hunting/' + str + (str.charCodeAt(0) >= 96 ? '_' : '') + '.png', width: 50 })
                            .css({ verticalAlign: 'middle', margin: '0 5px' }));
                    }

                    var cluesLi = $('<li>').text('Clues: ').addClass('no-bullet');
                    addImg(cluesLi, matches[2]);
                    addImg(cluesLi, matches[3]);

                    var buttonsLi = $('<li>').text('Buttons: ').addClass('no-bullet');
                    var arr = matches[4].trim().split(' ');
                    for (var j = 0; j < arr.length; j++) {
                        addImg(buttonsLi, arr[j]);
                    }

                    var decoysLi = $('<li>').text('Decoys: ').addClass('no-bullet');
                    var arr = matches[5].trim().split(' ');
                    for (j = 0; j < arr.length; j++) {
                        addImg(decoysLi, arr[j]);
                    }

                    module.push({ label: 'Stage ' + matches[1], obj: $('<ul>').append(cluesLi).append(buttonsLi).append(decoysLi), expandable: true });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "hypercolor",
        loggingTag: "The Hypercolor",
        matches: [
            {
                regex: /^Cube (\d+) is/,
                handler: function (matches, module) {
                    let lines = readMultiple(9).split(/\r?\n/g).map(line => line.replace(/^\[The Hypercolor #\d+\]/, ''));
                    let vertices = [
                        { line: 0, col: 3, x: 1, y: 0 },
                        { line: 0, col: 13, x: 3, y: 0 },
                        { line: 3, col: 0, x: 0, y: 1 },
                        { line: 3, col: 10, x: 2, y: 1 },
                        { line: 5, col: 3, x: 1, y: 2 },
                        { line: 5, col: 13, x: 3, y: 2 },
                        { line: 8, col: 0, x: 0, y: 3 },
                        { line: 8, col: 10, x: 2, y: 3 }
                    ];
                    let svg = [
                        `<path d='M1 0 3 0 3 2 1 2z' stroke='black' stroke-width='.2' fill='none' />`,
                        `<path d='M1 0 3 0 3 2 1 2z' stroke='#ccc' stroke-width='.125' fill='none' />`,
                        `<path d='M1 0 0 1M3 0 2 1M1 2 0 3M3 2 2 3' stroke='black' stroke-width='.2' fill='none' />`,
                        `<path d='M1 0 0 1M3 0 2 1M1 2 0 3M3 2 2 3' stroke='#ccc' stroke-width='.125' fill='none' />`,
                        `<path d='M0 1 2 1 2 3 0 3z' stroke='black' stroke-width='.2' fill='none' />`,
                        `<path d='M0 1 2 1 2 3 0 3z' stroke='#ccc' stroke-width='.125' fill='none' />`
                    ];
                    let colors = { 'K': '#000', 'B': '#00f', 'G': '#0f0', 'C': '#0ff', 'R': '#f00', 'M': '#f0f', 'Y': '#ff0', 'W': '#fff' };
                    const radius = .4;
                    for (let v of vertices) {
                        //rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
                        svg.push(`<path stroke='black' stroke-width='.02' fill='${colors[lines[v.line][v.col]]}' d='M ${v.x + radius * Math.cos(-Math.PI / 4)} ${v.y + radius * Math.sin(-Math.PI / 4)} A .4 .4 0 0 0 ${v.x + radius * Math.cos(Math.PI * 3 / 4)} ${v.y + radius * Math.sin(Math.PI * 3 / 4)} z' />`);
                        svg.push(`<path stroke='black' stroke-width='.02' fill='${colors[lines[v.line][v.col + 2]]}' d='M ${v.x + radius * Math.cos(Math.PI * 3 / 4)} ${v.y + radius * Math.sin(Math.PI * 3 / 4)} A .4 .4 0 0 0 ${v.x + radius * Math.cos(Math.PI * 7 / 4)} ${v.y + radius * Math.sin(Math.PI * 7 / 4)} z' />`);
                    }
                    module.push({ label: 'Cube ' + matches[1], obj: $('<svg>').html(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='-.6 -.6 10 4.2'>${svg.join('')}</svg>`) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "CaptchaModule",
        loggingTag: "I'm Not a Robot",
        matches: [
            {
                regex: /Selected module: (.+)/,
                handler: function (matches, module) {
                    module.selectedCaptcha = matches[1];
                }
            },
            {
                regex: /Current images: (\d+) \((.*)\), (\d+) \((.*)\), (\d+) \((.*)\), (\d+) \((.*)\), (\d+) \((.*)\), (\d+) \((.*)\)/,
                handler: function (matches, module) {
                    var table = $('<table>');
                    var currentRow = null;
                    for (var index = 0; index < 6; index++) {
                        var i = index * 2 + 1;
                        var correct = matches[i + 1].split(", ").includes(module.selectedCaptcha);
                        if (!index || index == 3) currentRow = $('<tr>').appendTo(table);
                        var cell = $('<td>').css({ padding: 0, fontSize: 0, position: "relative" }).append(`<img src="img/I'm Not a Robot/${matches[i]}.png" style="width: 130px;" />`).appendTo(currentRow);
                        if (correct) cell.append(`<img src="img/I'm Not a Robot/CorrectCheck.png" style="width: 40px; position: absolute; top: 45px; left: 45px;" />`);
                    }
                    module.push({ label: "Current images:", obj: table });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "iceCreamModule",
        loggingTag: "Ice Cream",
        matches: [
            {
                regex: /Stage \d/,
                handler: function (matches, module) {
                    module.push([matches.input, readMultiple(3).split("\n")]);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "theIconKitModule",
        loggingTag: "The Icon Kit",
        matches: [
            {
                regex: /^(The correct (cube|ship|gravity ball|ufo|wave|robot|spider) is |You selected ){1}((icon|spider|robot|ball|ship|ufo|wave)(\d+|def) *){1}(, which is correct\.|, which is incorrect\. Strike!|\.){1}$/,
                handler: function (matches, module) {
                    module.push(`${matches[1]}`);
                    var div = $('<div>');
                    var photos = matches[3].split(' ');
                    for (var i = 0; i < photos.length; i++) {
                        div.append(`<img src='img/The Icon Kit/${photos[i]}.png' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);
                    }
                    module.push(div);
                    if (matches[6] != '.') {
                        module.push(`${matches[6].substring(2)}`);
                    }
                    return true;
                }
            },
            {
                regex: /^((icon|spider|robot|ball|ship|ufo|wave)(\d+|def) *)+$/,
                handler: function (matches, module) {
                    var div = $('<div>');
                    var photos = matches[0].split(' ');
                    for (var i = 0; i < photos.length; i++) {
                        div.append(`<img src='img/The Icon Kit/${photos[i]}.png' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);
                    }
                    module.push(div);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "Maze",
        loggingTag: "InvisibleWallsComponent"
    },
    {
        displayName: "The iPhone",
        moduleID: "iPhone",
        loggingTag: "iPhone",
        matches: [
            {
                regex: /^(Angry Birds: The chosen Angry Birds images are|Angry Birds: The correct image is|Photos: The chosen photos are|Photos: The correct image is) (.*?)(| \((Top|Bottom) (Left|Right)\))\.$/,
                handler: function (matches, module) {
                    module.push(`${matches[1]}${matches[3]}:`);
                    var div = $('<div>');
                    var photos = matches[2].split(', ');
                    for (var i = 0; i < photos.length; i++)
                        div.append(`<img src='img/The iPhone/${photos[i]}.*' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);
                    module.push(div);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Jack-O’-Lantern",
        moduleID: "jackOLantern",
        loggingTag: "The Jack-O'-Lantern"
    },
    {
        displayName: "The Jewel Vault",
        moduleID: "jewelVault",
        loggingTag: "Jewel Wheels",
        matches: [
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "JukeboxWAV",
        loggingTag: "Jukebox.WAV",
        displayName: "Jukebox.WAV."
    },
    {
        moduleID: "keepClicking",
        loggingTag: "Keep Clicking",
        matches: [
            {
                regex: /^Symbols \(left-to-right, top-to-bottom\):$/,
                handler: function (matches, module) {
                    module.push({ label: "Symbols (left-to-right, top-to-bottom):", obj: pre(readMultiple(3)) })
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "Keypad",
        loggingTag: "KeypadComponent"
    },
    {
        moduleID: "KudosudokuModule",
        displayName: "Kudosudoku",
        loggingTag: "Kudosudoku",
        matches: [
            {
                regex: /^(Solution|Codings|New codings):$/,
                handler: function (matches, module) {
                    var lines = readMultiple(4).split('\n').map(l => l.split(' '));
                    module.push({ label: matches.input, obj: $(`<table style='border-collapse: collapse'>${lines.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`).find('td').css({ border: '1px solid black', padding: '.1em .5em' }).end() });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "kyudoku",
        displayName: "Kyudoku",
        loggingTag: "Kyudoku",
        matches: [
            {
                regex: /^(Puzzle|Solution):$/,
                handler: function (matches, module) {
                    var lines = readMultiple(6).split('\n').map(line => line.replace(/^\[Kyudoku #\d+\] /, ''));
                    module.push({
                        label: matches.input, obj: $(`
                        <table style='border-collapse: collapse'>
                            ${lines.map(row => `<tr>${[...Array(6).keys()].map(ix => `
                                <td style='${row[3 * ix] === '[' ? `background:url(&#39;data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2"><circle cx="0" cy="0" r=".7" stroke-width=".2" stroke="%23080" fill="none"/></svg>&#39;)` :
                                row[3 * ix + 1] === '#' ? `background:#aaa` : ''}'>${row[3 * ix + 1] === '#' ? '' : row[3 * ix + 1]}</td>
                            `).join('')}</tr>`).join('')}
                        </table>`).find('td').css({ border: '1px solid black', width: '1.5cm', height: '1.5cm', textAlign: 'center', verticalAlign: 'middle', fontSize: '18pt' }).end()
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Knob",
        moduleID: "NeedyKnob",
        loggingTag: "NeedyKnobComponent"
    },
    {
        displayName: "Langton’s Ant",
        moduleID: "langtonAnt",
        loggingTag: "Langton's Ant",
        matches: [
            {
                regex: /Expected solution: \[([0-9/]+)\]./,
                handler: function (matches, module) {
                    var tiles = matches[1].split("/");

                    const span = $('<span style="display: flex; flex-direction: column">')
                        .append($('<span>').text("Expected solution:"));

                    for (var i = 0; i < 5; i++) {
                        var row = $('<span style="height: 20px;">');
                        for (var j = 0; j < 5; j++) {
                            row.append($("<img src='../HTML/img/Langton Ant/" + tiles[i * 5 + j] + ".png' width='20' />"));
                        }
                        span.append(row);
                    }

                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add($('<li>').text(matches[0]));
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "Laundry",
        loggingTag: "Laundry",
        matches: [
            {
                regex: /Solution values for (\d) solved modules/,
                handler: function (matches, module) {
                    var lines = [];
                    for (var i = 0; i < 4; i++) {
                        var line = readLine();
                        if (line == "") break;

                        lines.push(line);
                    }

                    var verb = "Solution";
                    if (lines.length == 4) verb = lines.includes("Passed") ? "Solved" : "Striked";

                    module.push([`${verb} for ${matches[1]} module${parseInt(matches[1]) == 1 ? "" : "s"}`, lines]);

                    if (verb == "Solution" && matches[1] == "5") {
                        module.push({ linebreak: true });
                    }
                }
            },
            {
                regex: /Coin pressed at \d+ modules solved/,
                handler: function (matches, module) {
                    module.push({ label: matches.input + ":", obj: pre(readMultiple(2)) });
                }
            }
        ]
    },
    {
        displayName: "LED Grid",
        moduleID: "ledGrid",
        loggingTag: "LED Grid",
        matches: [
            {
                regex: /The chosen LED colours are (.*)\./,
                handler: function (matches, module) {
                    var colorCodes = {
                        black: ["#000000", 'white'],
                        blue: ["#0000FF", 'white'],
                        green: ["#00A651", 'black'],
                        orange: ["#F26522", 'black'],
                        pink: ["#F06EAA", 'black'],
                        purple: ["#662D91", 'white'],
                        red: ["#FF0000", 'black'],
                        white: ["#FFFFFF", 'black'],
                        yellow: ["#FFF200", 'black'],
                    };
                    var colors = matches[1].split(', ');
                    var table = `<table style='border-spacing: 1cm; border: 3px solid black;'>${[0, 1, 2].map(row =>
                        `<tr>${[0, 1, 2].map(col =>
                            `<td><div style='background-color: ${colorCodes[colors[3 * row + col]][0]}; color: ${colorCodes[colors[3 * row + col]][1]}; border: 2px solid black; border-radius: 50%; width: 2cm; height: 2cm; position: relative'><span style='position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)'>${colors[3 * row + col]}</span></div></td>`
                        ).join('')}</tr>`
                    ).join('')}</table>`;
                    module.push({ label: 'LED colors:', obj: $(table) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Legendre Symbol",
        moduleID: "legendreSymbol",
        loggingTag: "Legendre Symbol"
    },
    {
        displayName: "LEGOs",
        moduleID: "LEGOModule",
        loggingTag: "LEGO",
        matches: [
            {
                regex: /Piece #\d: (.+)/,
                handler: function (matches, module) {
                    if (!module.Pieces) module.push(["Pieces", module.Pieces = []]);
                    module.Pieces.push(matches[1]);
                    return true;
                }
            },
            {
                regex: /(Manual Page (\d+)) w\/(o)?|(Solution:|Submitting:)/,
                handler: function (matches, module) {
                    const svg = $(`<svg viewBox="0 0 8 8" width="30%" style="border: 1px solid black">`);
                    const board = readMultiple(8).split("\n");
                    const colors = {
                        R: "red",
                        G: "green",
                        B: "blue",
                        C: "cyan",
                        M: "magenta",
                        Y: "yellow",
                        O: "orange",
                        P: "purple",
                        A: "gray",
                        K: "black"
                    };


                    for (let y = 1; y < 8; y++) {
                        $SVG(`<line x1=0 y1=${y} x2=8 y2=${y} stroke-width="0.05" stroke="black">`).appendTo(svg);
                    }

                    for (let x = 1; x < 8; x++) {
                        $SVG(`<line x1=${x} y1=0 x2=${x} y2=8 stroke-width="0.05" stroke="black">`).appendTo(svg);
                    }

                    for (let y = 0; y < 8; y++) {
                        for (let x = 0; x < 8; x++) {
                            const char = board[y][x];
                            if (char == ".") continue;
                            $SVG(`<rect x=${x} y=${y} width=1 height=1 fill=${colors[char]}>`).appendTo(svg);
                        }
                    }

                    if (matches[3] && ('LegoManualPages' in module) && (matches[2] in module.LegoManualPages)) {
                        var oldSvg = module.LegoManualPages[matches[2]].obj;
                        module.LegoManualPages[matches[2]].obj = $('<div>').append(oldSvg).append(svg);
                        var which = false;
                        window.setInterval(function () {
                            which = !which;
                            if (which) {
                                oldSvg.hide();
                                svg.show();
                            } else {
                                svg.hide();
                                oldSvg.show();
                            }
                        }, 700);
                    } else {
                        var entry = { label: matches[1] || matches[4], obj: svg, expandable: true };
                        if (matches[2]) {
                            if (!('LegoManualPages' in module))
                                module.LegoManualPages = {};
                            module.LegoManualPages[matches[2]] = entry;
                        }
                        module.push(entry);
                    }
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "LightCycleModule",
        loggingTag: "Light Cycle",
        matches: [
            {
                regex: /Start sequence: ([A-Z]{6})/,
                handler: function (matches, module) {
                    module.Presses = [];
                    module.push("Starting Seq: " + matches[1]);
                    module.push(["Buttons:", module.Presses]);
                }
            },
            {
                regex: /SN ([A-Z0-9]{2}), swap ([A-Z0-9]\/[A-Z0-9]), sequence now: ([A-Z]{6})/,
                handler: function (matches, module) {
                    module.push($("<span>").css({ "font-family": "monospace", "font-size": "16px" }).text("Swap " + matches[2] + " (" + matches[1] + "). New Seq: " + matches[3]));
                }
            },
            {
                regex: /Pressed button/,
                handler: function (matches, module) {
                    module.Presses.push(matches.input);
                }
            }
        ]
    },
    {
        displayName: "Matrices",
        moduleID: "MatrixQuiz",
        loggingTag: "Linear Algebra Matrix Quiz",
        matches: [
            {
                regex: /Generated question (\d+): Matrix:\[(-?\d+) (-?\d+) (-?\d+) \]\[(-?\d+) (-?\d+) (-?\d+) \]\[(-?\d+) (-?\d+) (-?\d+) \] Answer:(.*)Question:(.*)/,
                handler: function (matches, module) {
                    //CSS style from https://stackoverflow.com/a/11561235
                    var style = $("<style>.matrix {position: relative;} body {padding: 20px;} .matrix:before, .matrix:after {content: \"\"; position: absolute; top: 0; border: 2px solid #000; width: 6px; height: 100%;} .matrix:before { left: 0px; border-right: 0px;} .matrix:after { right: -8px; border-left: 0px;} .matrix td {padding: 5px; text-align: center;</style>");
                    if (module.styleIsPush == null) {
                        module.styleIsPush = true;
                        module.push(style);
                    }
                    var table = $('<table>').addClass("matrix");
                    $(`<tr><td></td><td>${matches[2]}</td><td>${matches[3]}</td><td>${matches[4]}</td></tr><tr><td></td><td>${matches[5]}</td><td>${matches[6]}</td><td>${matches[7]}</td></tr><tr><td></td><td>${matches[8]}</td><td>${matches[9]}</td><td>${matches[10]}</td></tr></table>`).appendTo(table);
                    var div = $("<div>").css({ "paddingBottom": "5px" }).append(table).append("</div>");
                    module.push({ label: `Generated Question ${matches[1]}: Matrix A is`, obj: div, expanded: true });
                    module.push(`Question: ${matches[12]}`);
                    module.push(`Answer: ${matches[11]}`);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: 'LionsShareModule',
        loggingTag: 'Lion’s Share',
        displayName: 'Lion’s Share',
        matches: [
            {
                regex: /Lions present: (.*)$/,
                handler: function (matches, module) {
                    var list = matches[1].split(',');
                    module.LionInfo = {};
                    for (var i = 0; i < list.length; i++) {
                        /\s*(\w+) \((.*)\)\s*/.test(list[i]);
                        module.LionInfo[RegExp.$1] = RegExp.$2;
                    }
                    return true;
                }
            },
            {
                regex: /Apportion prey to (\d+) lions:/,
                handler: function (matches, module) {
                    readMultiple(3);
                    var rows = [];
                    for (var i = 0; i < +matches[1]; i++) {
                        var raw = readLine();
                        var tds = [];
                        for (var j = 0; j < 8; j++)
                            tds.push(`<td>${raw.substr(9 + 8 * j, 7)}</td>`);
                        var lionName = raw.substr(0, 8).trim();
                        rows.push(`<tr><th><div>${lionName}</div><div class='extra'>${module.LionInfo[lionName].replace(/; /g, '<br>')}</div></th>${tds.join('')}</tr>`);
                        delete module.LionInfo[lionName];
                    }
                    var additionalLions = Object.keys(module.LionInfo);
                    for (var i = 0; i < additionalLions.length; i++) {
                        var tds = [];
                        for (var j = 0; j < 8; j++)
                            tds.push(`<td>${j === 7 ? '0%' : ''}</td>`);
                        rows.push(`<tr><th><div>${additionalLions[i]}</div><div class='extra'>${module.LionInfo[additionalLions[i]].replace(/; /g, '<br>')}</div></th>${tds.join('')}</tr>`);
                    }
                    module.push({
                        label: matches[0],
                        obj: $(`<table style='border: 2px solid black; border-collapse: collapse'><tr class='top-row'><th><span>Lion</span></th><th><span>Base<br>entitlement</span></th><th><span>Indicator<br>bonus</span></th><th><span>Serial#<br>bonus</span></th><th><span>Unborn<br>cubs</span></th><th><span>Entitlement</span></th><th><span>Portion</span></th><th><span>Lead<br>huntress</span></th><th><span>Final<br>portion</span></th></tr>${rows.join('')}</table>`)
                            .find('.top-row th:not(:first-child)').css({ width: '3em', height: '7em' }).end()
                            .find('td,th').css({ border: '1px solid #ccc', position: 'relative', padding: '.3em .5em' }).end()
                            .find('td:last-child,th:last-child').css({ background: '#fed' }).end()
                            .find('span').css({ position: 'absolute', left: '50%', top: '100%', transform: 'translate(0, -.5em) translate(0, -50%) rotate(-90deg)', transformOrigin: '0 50%' }).end()
                            .find('td').css({ textAlign: 'right' }).end()
                            .find('div.extra').css({ fontSize: '8pt' }).end()
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Logical Buttons",
        moduleID: "logicalButtonsModule",
        loggingTag: "Logical Buttons",
        matches: [
            {
                regex: /STAGE: (.+)/,
                handler: function (matches, module) {
                    module.Stage = ["Stage #" + matches[1], []];
                    module.push(module.Stage);
                    return true;
                }
            },
            {
                regex: /Completed stage/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /All 3 stages/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    // Stage[0] is the label, Stage[1] is the list of subitems
                    module.Stage[1].push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "logicGates",
        loggingTag: "Logic Gates",
        matches: [
            {
                regex: /Inputs = /,
                handler: function (matches, module) {
                    if (module.Inputs == null) {
                        module.Inputs = [];
                        module.push(["Inputs", module.Inputs]);
                    }

                    module.Inputs.push(matches.input);

                    return true;
                }
            },
            {
                regex: /Solution:/,
                handler: function (matches, module) {
                    module.push({ label: "Solution:", obj: pre(readMultiple(15).replace(/\[Logic Gates #\d\] {5}/g, "")) });
                    return true;
                }
            },
            {
                handler: function (matches, module) {
                    module.push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "lousyChess",
        loggingTag: "Lousy Chess",
        matches: [
            {
                regex: /Full game: (.+)/,
                handler: function (matches, module) {
                    var moves = matches[1].replace(/(\d) (\d)/g, "$1\n$2");
                    module.push({ label: "Full game:", obj: pre(moves) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "MafiaModule",
        loggingTag: "Mafia",
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add(matches.input);
                }
            },
            {
                regex: /Clicked \w+: wrong./,
                handler: function (matches, module) {
                    module.groups.addGroup();
                }
            }
        ]
    },
    {
        moduleID: "MarbleTumbleModule",
        loggingTag: "Marble Tumble",
        matches: [
            {
                regex: /^Colors: (.*)$/,
                handler: function (matches, module) {
                    module.data = { colors: matches[1].split(', ') };
                    module.obj = $('<div>').append($(`<button class='autopress'>Show</button>`).click(function () {
                        var data = $(this).data('data'), div = $(this).parent(), i, sel;

                        var imgDiv = $(`<div style='position: relative; width: 420px; height: 420px'>`).appendTo(div);
                        var imgs = [];
                        for (i = 0; i < 5; i++)
                            imgs.push($(`<img src='img/Marble Tumble/Cylinder-${i}-${data.traps[i]}-${data.colors[i]}.svg' style='position: absolute; left: 0; top: 0; right: 0; bottom: 0' />`).appendTo(imgDiv));
                        function setRotations(rot) {
                            for (var i = 0; i < 5; i++)
                                imgs[i].css('transform', `rotate(${rot[i] * 36 - 90}deg)`);
                        }

                        var marbleOuter = $(`<div style='position: absolute; left: 0; top: 0; right: 0; bottom: 0'>`)
                            .appendTo(imgDiv);
                        var marbleInner = $(`<div style='position: absolute; width: 20px; height: 20px; border: 2px solid black; border-radius: 100%; background: #def; left: 210px; transform: translate(-50%, -50%)'>`)
                            .appendTo(marbleOuter);
                        function setMarble(rot, marble) {
                            marbleInner.css('top', marble === 0 ? '217px' : `${210 - ((marble + .5) * 420 / 12) - 10}px`);
                            marbleOuter.css('transform', marble === 0 || marble === 5 ? 'rotate(0deg)' : `rotate(${rot[marble] * 36}deg)`);
                        }

                        var controlsDiv = $(`<div style='margin-top: 30px'>`).appendTo(div);
                        var bgNoHover = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23fff" stroke-width="2" stroke="%23000" d="M 0,30 50,30 50,5 100,50 50,90 50,70 0,70 z"/></svg>')`;
                        var bgOnHover = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23bef" stroke-width="2" stroke="%23000" d="M 0,30 50,30 50,5 100,50 50,90 50,70 0,70 z"/></svg>')`;

                        var nextDivs = [];
                        function setBackgrounds() {
                            for (var i = 0; i < nextDivs.length; i++)
                                nextDivs[i].css('background', sel === i ? '#feb' : '#fff');
                        }

                        var curMarble = 5;
                        for (i = 0; i < data.states.length; i++) {
                            var prevMarble = curMarble;
                            if ('gap' in data.states[i])
                                curMarble = +data.states[i].gap;
                            else if ('trap' in data.states[i])
                                curMarble = 5;

                            if ('clicked' in data.states[i]) {
                                $(`
                                    <div style='display: inline-block; vertical-align: bottom; width: 50px; height: 50px; position: relative; margin: .5em 0'>
                                        <div style='position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)'>${data.states[i].clicked}</div>
                                    </div>
                                `)
                                    .appendTo(controlsDiv)
                                    .css('background', bgNoHover)
                                    .mouseover(function () { $(this).css('background', bgOnHover); })
                                    .mouseout(function () { $(this).css('background', bgNoHover); })
                                    .click(function (ix, rotBefore, rotAfter, marbleBefore, marbleAfter) {
                                        return function () {
                                            for (var i = 0; i < 5; i++)
                                                imgs[i].css('transition', '');
                                            setRotations(rotBefore);
                                            setMarble(rotBefore, marbleBefore);
                                            window.setTimeout(function () {
                                                for (var i = 0; i < 5; i++)
                                                    imgs[i].css('transition', 'transform linear 1s');
                                                marbleOuter.css('transition', 'transform linear 1s');
                                                window.setTimeout(function () {
                                                    setRotations(rotAfter);
                                                    setMarble(rotAfter, marbleBefore);
                                                    window.setTimeout(function () {
                                                        for (var i = 0; i < 5; i++)
                                                            imgs[i].css('transition', '');
                                                        marbleOuter.css('transition', '');
                                                        setMarble(rotAfter, marbleAfter);
                                                    }, 1100);
                                                }, 100);
                                            }, 100);
                                            sel = ix;
                                            setBackgrounds();
                                        };
                                    }(i, data.states[i - 1].rotations, data.states[i].rotations, prevMarble, curMarble));
                            }

                            data.states[i].marble = curMarble;

                            var nextDiv = $(`<div class='nx' style='display: inline-block; vertical-align: bottom; width: 50px; height: 50px; position: relative; border: 1px solid black; margin: .5em .25em'></div>`)
                                .appendTo(controlsDiv)
                                .mouseover(function (ix) { return function () { $(this).css('background', sel === ix ? '#fef' : '#bef'); }; }(i))
                                .mouseout(function (ix) { return function () { $(this).css('background', sel === ix ? '#feb' : '#fff'); }; }(i))
                                .click(function (ix, rot, marble) {
                                    return function () {
                                        setRotations(rot);
                                        setMarble(rot, marble);
                                        sel = ix;
                                        setBackgrounds();
                                        $(this).css('background', '#fef');
                                        return false;
                                    };
                                }(i, data.states[i].rotations, curMarble));
                            nextDivs.push(nextDiv);
                            if (data.states[i].solved || 'trap' in data.states[i])
                                nextDiv.append($(`<div style='position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: #${data.states[i].solved ? '080' : '800'}; font-size: 24pt; font-weight: bold'>${data.states[i].solved ? '✓' : '✗'}</div>`));
                            else if ('gap' in data.states[i])
                                nextDiv.append($(`<div style='position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); color: #48f; font-size: 24pt'>⮋</div>`));
                            if (data.states[i].solved)
                                break;
                        }

                        $(this).remove();
                        nextDivs[0].click();
                        $(`<p>Click on the boxes and arrows to see the states and transitions.</p>`).appendTo(div);
                        $(`<ul>
                            <li>A numbered arrow indicates the last digit on the timer when the module was clicked.</li>
                            <li><span style='color: #48f; font-size: 24pt'>⮋</span> means the marble rolled into a lower level.</li>
                            <li><span style='color: #800; font-size: 24pt; font-weight: bold'>✗</span> in a box means the marble fell into a trap and there was a strike.</li>
                            <li><span style='color: #000; font-size: 14pt'>✗</span> in an arrow means that the outer cylinder’s rotation was adjusted after a strike.</li>
                            <li><span style='color: #080; font-size: 24pt; font-weight: bold'>✓</span> in a box means the module was solved at this point.</li>
                        </ul>`).appendTo(div);
                        return false;
                    }));
                    module.push({ obj: module.obj, nobullet: true });
                    return true;
                }
            },
            {
                regex: /^Traps: (.*)$/,
                handler: function (matches, module) {
                    module.data.traps = matches[1].split(', ');
                    return true;
                }
            },
            {
                regex: /^Rotations: (.*)$/,
                handler: function (matches, module) {
                    if (!('states' in module.data))
                        module.data.states = [{ rotations: matches[1].split(', ') }];
                    else
                        module.data.states[module.data.states.length - 1].rotations = matches[1].split(', ');
                    module.obj.find('button').data('data', module.data);
                    return true;
                }
            },
            {
                regex: /^Rotations after strike: (.*)$/,
                handler: function (matches, module) {
                    module.data.states.push({ rotations: matches[1].split(', '), clicked: '✗' });
                    module.obj.find('button').data('data', module.data);
                    return true;
                }
            },
            {
                regex: /^Clicked when last seconds digit was: (\d)$/,
                handler: function (matches, module) {
                    module.data.states.push({ clicked: matches[1] });
                    return true;
                }
            },
            {
                regex: /^Marble falls into (gap|trap) at level (\d)\.( Module solved\.| Strike!)?$/,
                handler: function (matches, module) {
                    module.data.states[module.data.states.length - 1][matches[1]] = matches[2];
                    if (matches[3] && matches[3] !== ' Strike!')
                        module.data.states[module.data.states.length - 1].solved = true;
                    module.obj.find('button').data('data', module.data);
                    return true;
                }
            }
        ]
    },
    {
        displayName: "Mastermind Simple",
        moduleID: "Mastermind Simple",
        loggingTag: "Mastermind Simple",
        matches: [
            {
                regex: /Query:/,
                handler: function (matches, module) {
                    module.push([matches.input, module.GroupLines = []]);
                    return true;
                }
            },
            {
                regex: /Submit:/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    (module.GroupLines || module).push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "Mastermind Cruel",
        loggingTag: "Mastermind Cruel",
        matches: [
            {
                regex: /Query:/,
                handler: function (matches, module) {
                    if (module.LastInput == matches.input) return true;
                    module.LastInput = matches.input;

                    module.push({ label: matches.input, obj: module.Table = $("<table>").css("border-collapse", "collapse"), expandable: true });
                    const row = $("<tr><th>#<th>Color<th>#<th>Color<th>A<th>B<th>C</tr>");
                    row.children().css({ border: "1px solid black", "text-align": "center", padding: "3px 6px" });
                    row.appendTo(module.Table);
                    return true;
                }
            },
            {
                regex: /Submit:/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /Query result: A=(\d+), B=(\d+), C=(\d+)/,
                handler: function (matches, module) {
                    module.LastResult = matches;
                    return true;
                }
            },
            {
                regex: /Display shows: (\d+) (\w+), (\d+) (\w+)/,
                handler: function (matches, module) {
                    const row = $("<tr>").appendTo(module.Table);
                    for (let i = 1; i <= 4; i++) {
                        $("<td>").text(matches[i]).appendTo(row);
                    }

                    for (let i = 1; i <= 3; i++) {
                        $("<td>").text(module.LastResult[i]).appendTo(row);
                    }

                    row.children().css({ border: "1px solid black", "text-align": "center", padding: "3px 6px" });
                    row.children().eq(0).css("text-align", "right");
                    row.children().eq(2).css("text-align", "right");
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Masyu",
        moduleID: "masyuModule",
        loggingTag: "Masyu",
        matches: [
            {
                regex: /The dots\/circles are in the following pattern, where 0=blank,1=white,2=black.../,
                handler: function (matches, module) {
                    var board = readMultiple(8).replace(/\[Masyu #\d+\] /g, "");
                    var row = board.replace(/\r/g, '').split('\n');
                    var svg = $('<svg viewBox="0 0 713 949" width="30%"></svg>');
                    for (let i = 0; i < 7; i++) {
                        const xPosition = i * 118;
                        $SVG(`<path style="fill:#000000" d="M ${xPosition}, 0 h 5 v 949 h -5" z/>`).appendTo(svg);
                    }
                    for (let i = 0; i < 9; i++) {
                        const yPosition = i * 118;
                        $SVG(`<path style="fill:#000000" d="M 0, ${yPosition} v 5 h 713 v -5" z/>`).appendTo(svg);
                    }
                    for (let i = 0; i < row.length; i++) {
                        for (let j = 0; j < row[i].length; j++) {
                            const xPosition = j * 118 + 61.5;
                            const yPosition = i * 118 + 103.5;
                            switch (row[i][j]) {
                                case '1':
                                    $SVG(`<path style="fill:none;stroke:#000000;stroke-width:6.9000001" d="M ${xPosition},${yPosition} c -23.5,0 -42.5,-19 -42.5,-42.5 0,-23.5 19,-42.5 42.5,-42.5 23.5,0 42.5,19 42.5,42.5 0,23.5 -19,42.5 -42.5,42.5 z"/>`).appendTo(svg);
                                    break;
                                case '2':
                                    $SVG(`<path style="fill:#000000" d="M ${xPosition},${yPosition} c -23.5,0 -42.5,-19 -42.5,-42.5 0,-23.5 19,-42.5 42.5,-42.5 23.5,0 42.5,19 42.5,42.5 0,23.5 -19,42.5 -42.5,42.5 z"/>`).appendTo(svg);
                                    break;
                            }
                        }
                    }
                    var div = $('<div>').append(svg);
                    if (!('MasyuSvg' in module))
                        module.MasyuSvg = {};
                    module.MasyuSvg[0] = { label: "Generated Puzzle:", obj: div, expanded: true };
                    module.MasyuSvg[1] = { label: "Solution:", obj: svg.clone(), expanded: true };
                    module.push(module.MasyuSvg[0]);
                    return true;
                }
            },
            {
                regex: /^(\d{40}|\d{42})$/,
                handler: function (matches, module) {
                    var svg = module.MasyuSvg[1].obj;
                    switch (matches[1].length) {
                        case 40: //Drawing horizontal lines
                            for (let i = 0; i < matches[1].length; i++) {
                                const xPosition = (i % 5) * 118 + 61.5;
                                const yPosition = Math.floor(i / 5) * 118 + 64;
                                if (matches[1][i] == '1')
                                    $SVG(`<path style="fill:#000000;stroke:#000000;stroke-width:12;stroke-linecap:round;stroke-linejoin:round" d="M ${xPosition},${yPosition} v -5 h 118 v 5 z"/>`).appendTo(svg);
                            }
                            module.MasyuSvg[1].obj = svg;
                            break;
                        case 42: //Drawing vertical lines
                            for (let i = 0; i < matches[1].length; i++) {
                                const xPosition = Math.floor(i / 7) * 118 + 59;
                                const yPosition = (i % 7) * 118 + 61.5;
                                if (matches[1][i] == '1')
                                    $SVG(`<path style="fill:#000000;stroke:#000000;stroke-width:12;stroke-linecap:round;stroke-linejoin:round" d="M ${xPosition},${yPosition} h 5 v 118 h -5 z"/>`).appendTo(svg);
                            }
                            var div = $('<div>').append(svg);
                            module.MasyuSvg[1] = { label: "Solution:", obj: div, expanded: true };
                            module.push(module.MasyuSvg[1]);
                            break;
                    }
                    return true;
                }
            }
        ]
    },
    {
        displayName: "Maze³",
        moduleID: "maze3",
        loggingTag: "Maze³",
        matches: [
            {
                regex: /Node mapping for logging purposes:/,
                handler: function (matches, module) {
                    module.push({
                        label: "Node mapping:",
                        obj: $("<img src='img/Maze³/mazeLog.png' width='200' style='margin: 1em; display: block;'/>")
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Mazery",
        moduleID: "Mazery",
        loggingTag: "Mazery",
        matches: [
            {
                regex: /The maze is/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(11)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "MazeScrambler",
        loggingTag: "Maze Scrambler",
        matches: [
            {
                regex: /Current sequence is:/,
                handler: function (matches, module) {
                    var table = $("<table>").addClass("standard");
                    var row = $("<tr>");
                    for (const header of ["Selected", "New Pos", "Red", "Blue", "Yellow", "Green"]) {
                        $("<th>").text(header).appendTo(row);
                    }
                    row.appendTo(table);

                    module.push({ label: matches.input, obj: table });
                    module.Table = table;

                    readLine(); // Skip the line with the headers on it.
                    return true;
                }
            },
            {
                regex: /(.+) \| (.+) \| (.+) \| (.+) \| (.+) \| (.+)/,
                handler: function (matches, module) {
                    var row = $("<tr>");
                    for (let i = 0; i < 6; i++) {
                        $("<td>").text(matches[i + 1]).appendTo(row);
                    }
                    row.appendTo(module.Table);
                    return true;
                }
            },
            {
                regex: /--------------------------------------------------/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Memory",
        moduleID: "Memory",
        loggingTag: "MemoryComponent",
        matches: [
            {
                regex: /(Display set to )MemoryComponent\/label_([1-4])/,
                handler: function (matches, module) {
                    module.push(matches[1] + matches[2]);
                    return true;
                }
            },
            {
                regex: /Button labels are .+/,
                handler: function (matches, module) {
                    module.push(matches[0].replace(/,/g, ", "));
                    return true;
                }
            },
            {
                regex: /Memory button (\d) pushed \(label: (\d)\)./,
                handler: function (matches, module) {
                    module.push(`Memory button ${parseInt(matches[1]) + 1} pushed (label: ${matches[2]}).`);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "memorableButtons",
        loggingTag: "Memorable Buttons",
        matches: [
            {
                regex: /(?:([ABCDEFGJKLPQ]), ([ABCDEFGJKLPQ]), ([ABCDEFGJKLPQ]) & ([ABCDEFGJKLPQ]))|(?:s | d)([ABCDEFGJKLPQ]+)|([ABCDEFGJKLPQ])(?:\.)/,
                handler: function (matches, module) {
                    var span = $('<span>');
                    var text = matches.input.substring(1);
                    var str1 = "<span style=\"font-family: 'kra'; font-size: 28pt\">";
                    var letter = matches.input[0];
                    var letters = "ABCDEFGJKLPQ".split("");
                    for (let i = 1; i <= matches.length; i++) {
                        if (matches[i] != null)
                            text = text.replace(matches[i], str1 + matches[i] + "</span>");
                    }
                    text = letter + text;
                    if (letters.includes(text.charAt(text.length - 2))) {
                        letter = text.charAt(text.length - 2);
                        text = text.substring(0, text.length - 2) + str1 + letter + "</span>.";
                    }
                    span.append(text);
                    module.push(span);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Mega Man 2",
        moduleID: "megaMan2",
        loggingTag: "Megaman 2"
    },
    {
        displayName: "Minecraft Survival",
        moduleID: "kataMinecraftSurvival",
        loggingTag: "Minecraft Survival",
        matches: [
            {
                regex: /Gathered (\d+|a|an) (.+)\.$/,
                handler: function (matches, module) {
                    function cparseInt (string) {
                        if (string === "a" || string === "an"){
                            return 1
                        }
                        return parseInt(string)
                    }

                    if (module.prev == null) {
                        module.prev = {type: "gather", material: matches[2], count: cparseInt(matches[1])};
                    }
                    else if (module.prev.type === "gather" && module.prev.material === matches[2]) {
                        module.prev = {type: "gather", material: matches[2], count: module.prev.count + cparseInt(matches[1])};
                    }
                    else if (module.prev.type === "gather") {
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = {type: "gather", material: matches[2], count: cparseInt(matches[1])};
                    } 
                    else if (module.prev.type === "craft"){
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = {type: "gather", material: matches[2], count: cparseInt(matches[1])};
                    }
                    
                    return true;
                }
            },
            {
                regex: /Crafted (\d+|a|an) (.+)\.$|Crafted (Iron|Diamond) Armor\.$/,
                handler: function (matches, module) {
                    function cparseInt (string) {
                        if (string === "a" || string === "an"){
                            return 1
                        }
                        return parseInt(string)
                    }

                    if (module.prev == null) {
                        module.prev = {type: "craft", material: matches[2], count: cparseInt(matches[1])};
                    }
                    else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
                        module.prev = {type: "craft", material: matches[2], count: module.prev.count + cparseInt(matches[1])};
                    }
                    else if (module.prev.type === "craft") {
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = {type: "craft", material: matches[2], count: cparseInt(matches[1])};
                    }
                    else if (module.prev.type === "gather"){
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = {type: "craft", material: matches[2], count: cparseInt(matches[1])};
                    }
                    return true;
                }
            },
            {
                regex: /The monster you are fighting is (.+) and it has (\d+) health and (\d+) damage\.$/,
                handler: function (matches, module) {
                    function cparseInt (string) {
                        if (string === "a" || string === "an"){
                            return 1
                        }
                        return parseInt(string)
                    }

                    if (module.prev == null) {
                        module.prev = {type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3])};
                    }
                    else if (module.prev.type === "fight") {
                        console.error("Minecraft Survival: fight started before it ended!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.prev = {type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3])};
                    }
                    else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = {type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3])};
                    }
                    else if (module.prev.type === "gather"){
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = {type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3])};
                    }
                    
                    return true;
                }
            },
            {
                regex: /You (attacked|have been attacked by) the (.+) for -?(\d+) damage and now ha(s|ve) (\d+) health remaining\.$/,
                handler: function (matches, module) {
                    function cparseInt (string) {
                        if (string === "a" || string === "an"){
                            return 1
                        }
                        return parseInt(string)
                    }

                    if (module.prev == null) {
                        console.error("Minecraft Survival: fight continued before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                    }
                    else if (module.prev.type === "fight") {
                        //Continue
                    }
                    else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
                        console.error("Minecraft Survival: fight continued before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = null;
                    }
                    else if (module.prev.type === "gather"){
                        console.error("Minecraft Survival: fight continued before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = null;
                    }
                    
                    return true;
                }
            },
            {
                regex: /The monster has been defeated. It dropped (\d+|an) items?. Resume gathering! Number of resources gathered till next fight: (\d+)\.$/,
                handler: function (matches, module) {
                    function cparseInt (string) {
                        if (string === "a" || string === "an"){
                            return 1
                        }
                        return parseInt(string)
                    }

                    if (module.prev == null) {
                        console.error("Minecraft Survival: fight ended before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                    }
                    else if (module.prev.type === "fight") {
                        module.push($(`<span style="background-color: #ffcccc">Combat: ${module.prev.enemy}: ${cparseInt(matches[1])}</span>`));
                        module.prev = null;
                    }
                    else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
                        console.error("Minecraft Survival: fight ended before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = null;
                    }
                    else if (module.prev.type === "gather"){
                        console.error("Minecraft Survival: fight ended before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = null;
                    }
                    
                    return true;
                }
            },
            {
                regex: /Dragon defeated. Go click on the egg!$/,
                handler: function (matches, module) {
                    module.push($(`<span style="background-color: #ffcccc">Combat: Dragon: 1</span>`));
                    module.prev = null;
                    
                    return true;
                }
            },
            {
                regex: /[Dd]ied/,
                handler: function (matches, module) {
                    if (module.prev == null) {
                        console.error("Minecraft Survival: fight ended before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                    }
                    else if (module.prev.type === "fight") {
                        module.push($(`<span style="background-color: #ffcccc">Combat: ${module.prev.enemy}: Death</span>`));
                        module.prev = null;
                    }
                    else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
                        console.error("Minecraft Survival: fight ended before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = null;
                    }
                    else if (module.prev.type === "gather"){
                        console.error("Minecraft Survival: fight ended before it started!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                        module.prev = null;
                    }
                }
            },
            {
                regex: /.+$/,
                handler: function (matches, module) {
                    let blacklist = ["Fight did not start because you have no sword!"];
                    
                    if (blacklist.includes(matches[0])) {
                        return true;
                    }
                    
                    if (module.prev == null) {
                        // Do nothing
                    }
                    else if (module.prev.type === "gather") {
                        module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
                    }
                    else if (module.prev.type === "craft") {
                        module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
                    } else if (module.prev.type === "fight") {
                        console.error("Minecraft Survival: fight never ended!");
                        module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
                    }
                    module.prev = null;
                    
                    let color = "#ffffff";

                    if (/[Ss]trike/.test(matches[0])) {
                        color = "#993333";
                    }
                    else if (/[Uu]nlocked/.test(matches[0])) {
                        color = "#eedd66";
                    }
                    else if (/Module solved/.test(matches[0])) {
                        color = "#ffdd11";
                    }
                    else if (/Error in LFA!/.test(matches[0])) {
                        color = "#ff0000";
                    }

                    module.push($(`<span style="background-color: ${color}">${matches[0]}</span>`));
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "mineseeker",
        loggingTag: "Mineseeker",
        matches: [
            {
                regex: /Desired Bomb is (\d+|\d\D)$/,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Desired Bomb is "))
                        .append($("<img src='../HTML/img/Mineseeker/" + matches[1] + ".png' width='40' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text("."));
                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /Bomb shown is (\d+|\d\D)$/,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Bomb shown is "))
                        .append($("<img src='../HTML/img/Mineseeker/" + matches[1] + ".png' width='40' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text("."));
                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "MinesweeperModule",
        loggingTag: "Minesweeper",
        matches: [
            {
                regex: /Board:|Legend:/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(matches.input.includes("Board") ? 10 : 5)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "mislocation",
        displayName: "Mislocation",
        loggingTag: "Mislocation",
        matches: [
            {
                regex: /\(use slashes as new line separators\) ([\/\-ABCDEFGHIJKLMNOPQRSTUVWXYZ*]+)$/,
                handler: function (matches, module) {
                    module.push({ label: "The maze:", obj: pre(matches[1].replace(/\//g, '\n').replace(/-/g, ' ')) });
                    return true;
                }
            },
            {
                regex: /\d, \d$/,
                handler: function (matches, module) {
                    module.push({ label: "Current position(col, row): ", obj: matches[0] })
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "SquaresOfMisery",
        displayName: "Misery Squares",
        loggingTag: "SquaresOfMisery"
    },
    {
        moduleID: "MistakeModule",
        displayName: "A Mistake",
        loggingTag: "Mistake"
    },
    {
        moduleID: "modernCipher",
        loggingTag: "Modern Cipher",
        matches: [
            {
                regex: /<(Stage \d)> START/,
                handler: function (matches, module) {
                    if (!module.Stages) module.Stages = [];
                    module.push([matches[1], module.Stage = []]);

                    return true;
                }
            },
            {
                regex: /<Stage ?\d> /,
                handler: function (matches, module) {
                    module.Stage.push(matches.input);

                    return true;
                }
            },
            {
                regex: /^(Pressed OK|totalWords = 0)$/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "ModuleMaze",
        loggingTag: "Module Maze",
        matches: [
            {
                regex: /Shown icon is (.+)$/,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Shown icon is "))
                        .append($("<img src='../Icons/" + matches[1] + ".png' alt='" + matches[1] + "' title='" + matches[1] + "' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text("."));
                    if (!module.FirstPass) {
                        module.FirstPass = true;
                        module.groups.add(span);
                        module.Info = [];
                        module.groups.add(["Moves", module.Info]);
                    } else {
                        module.Info.push(span);
                    }
                    if (module.iStrike) {
                        module.iStrike = false;
                        module.Moves = false;
                    }
                    return true;
                }
            },
            {
                regex: /Strike obtained, showing solution icon.$/,
                handler: function (matches, module) {
                    const span = $('<span>').append($('<span>').text(matches[0]));
                    module.Info.push(span);
                    module.iStrike = true;
                    return true;
                }
            },
            {
                regex: /Expected icon is (.+)$/,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Expected icon is "))
                        .append($("<img src='../Icons/" + matches[1] + ".png' alt='" + matches[1] + "' title='" + matches[1] + "' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text("."));
                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /Wall detected to the (\w+) from (.+)$/,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Wall detected to the " + matches[1] + " from "))
                        .append($("<img src='../Icons/" + matches[2] + ".png' alt='" + matches[2] + "' title='" + matches[2] + "' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text("."));
                    module.Info.push(span);
                    module.Moves = false;
                    return true;
                }
            },
            {
                regex: /Moved (\w+) from icon \[(.+)\] to \[(.+)\]$/,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Moved " + matches[1] + " from icon "))
                        .append($("<img src='../Icons/" + matches[2] + ".png' alt='" + matches[2] + "' title='" + matches[2] + "' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text(" to "))
                        .append($("<img src='../Icons/" + matches[3] + ".png' alt='" + matches[3] + "' title='" + matches[3] + "' />").css({ "vertical-align": "baseline;" }))
                        .append($('<span>').text("."));

                    if (!module.Moves) {
                        module.Moves = [];
                        module.Info.push(["path", module.Moves]);
                    }
                    module.Moves.push(span);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Modules Against Humanity",
        moduleID: "ModuleAgainstHumanity",
        loggingTag: "Modules Against Humanity",
        matches: [
            {
                regex: /Modules:/,
                handler: function (matches, module) {
                    var lines = readMultiple(11);
                    while (/ {2}\|/.test(lines) && !/[^ ] \|/.test(lines))
                        lines = lines.replace(/ \|/g, '|');
                    while (/\| {2}/.test(lines) && !/\| [^ ]/.test(lines))
                        lines = lines.replace(/\| /g, '|');
                    module.push({ label: "Cards:", obj: pre(lines) });

                    var line;
                    do {
                        line = readLine();
                        module.push(line.replace(/Black:/g, "Black: ").trim());
                    }
                    while (!/^Final cards/.test(line));
                }
            },
            {
                regex: /Submitted:/
            }
        ]
    },
    {
        displayName: "Monsplode Trading Cards",
        moduleID: "monsplodeCards",
        loggingTag: "MonsplodeCards",
        matches: [
            {
                regex: /Generating the/,
                handler: function (matches, module) {
                    module.push(module.Bullet = [matches.input, module.CardGen = []]);
                }
            },
            {
                regex: /Wrong! Deck card|Keeping your cards|You did the right trade!|Wrong! All of your cards|Value of (?:deck|offered) card/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    var monsplode = matches.input.match(/^Monsplode: ([^]+) \|/);
                    if (monsplode) {
                        module.Bullet[0] += ` (${monsplode[1]})`;
                    }

                    module.CardGen.push(matches.input);
                }
            }
        ]
    },
    {
        displayName: "Monsplode, Fight!",
        moduleID: "monsplodeFight",
        loggingTag: "MonsplodeFight",
        matches: [
            {
                regex: /Opponent/,
                handler: function (matches, module) {
                    module.MoveInfo = null;
                }
            },
            {
                regex: /Move name/,
                handler: function (matches, module) {
                    module.push([matches.input.replace(/\(\d\)/, ""), module.MoveInfo]);
                    module.MoveInfo = [];
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if (module.MoveInfo) {
                        module.MoveInfo.push(matches.input);
                    } else {
                        module.MoveInfo = [];
                        module.push(matches.input.replace(/ \d/, ""));
                    }
                }
            }
        ]
    },
    {
        displayName: "Morse Code",
        moduleID: "Morse",
        loggingTag: "MorseCodeComponent",
        matches: [
            {
                regex: /Chosen word is:|Transmit button pressed when selected frequency is/
            }
        ]
    },
    {
        displayName: "Morse War",
        moduleID: "MorseWar",
        loggingTag: "Morse War",
        matches: [
            {
                regex: /Generated random values:/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(3)) });
                }
            },
            {
                regex: /Answer submitted:/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(2)) });
                }
            }
        ]
    },
    {
        displayName: "Morse-A-Maze",
        moduleID: "MorseAMaze",
        loggingTag: "Morse-A-Maze",
        matches: [
            {
                regex: /Solved - Turning off the Status light Kappa/,
                handler: function (_, module) {
                    module.push("Module Solved");
                    return true;
                }
            },
            {
                regex: /Moving from|Tried to move from/,
                handler: function (matches, module) {
                    if (!module.Group.Moves) {
                        module.GroupLines.push(["Moves", module.Group.Moves = []]);
                    }
                    module.Group.Moves.push(matches.input);

                    return true;
                }
            },
            {
                regex: /Playing Morse code word:/
            },
            {
                regex: /(Updating the maze for rule \w+|Playing Morse code word: .+)/,
                handler: function (matches, module) {
                    if (!module.Group) {
                        matches[1] = "Initial solution";
                    }

                    module.push(module.Group = [matches[1], module.GroupLines = []]);
                    return true;
                }
            },
            {
                regex: /(?:Maze updated for (\d+ [\w ]+|Two Factor 2nd least significant digit sum of \d+))/,
                handler: function (matches, module) {
                    module.Group[0] = matches[1].replace(/Unsolved|Solved/, function (str) { return str.toLowerCase(); });
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    (module.GroupLines || module).push(matches.input);
                }
            },
            {
                regex: /Maze Solution from ([A-F])([1-6]) to ([A-F])([1-6]) in maze "(\d{1,2})/,
                handler: function (matches, module) {
                    if (!module.GroupLines) {
                        module.push(module.Group = [matches[1], module.GroupLines = []]);
                    }

                    var container = $("<div>").css("position", "relative");
                    $("<img>").css({ width: "210px", height: "210px" }).attr("src", "../HTML/img/Morse-A-Maze/maze" + matches[5] + ".svg").appendTo(container);
                    var marker = $("<div>").css({
                        width: "10px",
                        height: "10px",
                        position: "absolute",
                        "border-radius": "50%"
                    });

                    marker
                        .clone()
                        .css({
                            top: 12.5 + 35.5 * (parseInt(matches[2]) - 1) + "px",
                            left: 12.5 + 35 * (matches[1].charCodeAt() - 65) + "px",
                            background: "green"
                        }).appendTo(container);

                    marker
                        .clone()
                        .css({
                            top: 12.5 + 35.5 * (parseInt(matches[4]) - 1) + "px",
                            left: 12.5 + 35 * (matches[3].charCodeAt() - 65) + "px",
                            background: "red"
                        }).appendTo(container);

                    (module.GroupLines || module).push({ label: container });
                }
            }
        ]
    },
    {
        moduleID: "mortalKombat",
        loggingTag: "Mortal Kombat",
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add(matches.input);
                }
            },
            {
                regex: /^Strike!/,
                handler: function (matches, module) {
                    module.groups.addGroup(true);
                }
            }
        ]
    },
    {
        moduleID: "MouseInTheMaze",
        loggingTag: "Mouse in the Maze"
    },
    {
        moduleID: "murder",
        loggingTag: "Murder",
        matches: [
            {
                regex: /Number of batteries/,
                handler: function () {
                    var id = GetBomb().GetMod("murder").IDs.length + 1;
                    var mod = GetBomb().GetModuleID("murder", id);
                    mod.BombInfo = [];
                    mod.Rows = [];
                    mod.push(["Bomb Info", mod.BombInfo]);
                }
            },
            {
                regex: /Number of|Has/,
                handler: function (matches) {
                    GetBomb().GetModuleID("murder").BombInfo.push(matches.input);
                    return true;
                }
            },
            {
                regex: /row/,
                handler: function (matches) {
                    GetBomb().GetModuleID("murder").Rows.push(matches.input);
                }
            },
            {
                regex: /Body found in/,
                handler: function (matches) {
                    GetBomb().GetModuleID("murder").Body = matches.input;
                }
            },
            {
                regex: /Actual solution:/,
                handler: function (matches) {
                    var mod = GetBomb().GetModuleID("murder");
                    mod.Suspects = ["Professor Plum", "Reverend Green", "Colonel Mustard", "Miss Scarlett", "Mrs Peacock", "Mrs White"];
                    mod.push(["Suspects", mod.Suspects]);
                    mod.Weapons = ["Rope", "Candlestick", "Dagger", "Spanner", "Lead Pipe", "Revolver"];
                    mod.push(["Weapons", mod.Weapons]);
                    mod.push(mod.Body);
                    mod.Rows.forEach(function (row) {
                        mod.push(row);
                    });
                    mod.push(matches.input);
                }
            },
            {
                regex: /Eliminating (.+) to re/,
                handler: function (matches) {
                    var mod = GetBomb().GetModuleID("murder");
                    var index = mod.Suspects.indexOf(matches[1]);
                    if (index > -1) {
                        mod.Suspects.splice(index, 1);
                    } else {
                        mod.Weapons.splice(mod.Weapons.indexOf(matches[1]), 1);
                    }
                }
            }
        ]
    },
    {
        displayName: "Mystic Maze",
        moduleID: "mysticmaze",
        loggingTag: "Mystic Maze",
        matches: [
            {
                regex: /Generated Maze is/,
                handler: function (matches, module) {
                    var table = $('<table>').css({ 'border-collapse': "collapse", "width": "50%", "margin-left": "auto", "margin-right": "auto" });
                    var maze = readMultiple(17).split('\n');
                    for (var i = 0; i < 8; i++) {
                        var row = $('<tr>').appendTo(table);
                        for (var j = 0; j < 8; j++) {
                            var width = "";
                            width += maze[2 * i][2 * j + 1] !== "■" ? "0px" : "5px";
                            width += maze[2 * i + 1][2 * j + 2] !== "■" ? " 0px" : " 5px";
                            width += maze[2 * i + 2][2 * j + 1] !== "■" ? " 0px" : " 5px";
                            width += maze[2 * i + 1][2 * j] !== "■" ? " 0px" : " 5px";
                            var cell = $('<td>').css({ "border": "solid black", "border-width": width, "width": "12.5%", "padding-bottom": "12.5%" }).appendTo(row);
                            var cellValue = /[IKYE]/.exec(maze[2 * i + 1][2 * j + 1]);
                            if (cellValue !== null) {
                                cell.css("padding-bottom", "0%");
                                $('<div>').text(cellValue.input).css({ "margin": "auto", "overflow": "hidden", "text-align": "center", "font-size": "15pt", "height": "12.5%" }).appendTo(cell);
                            }
                        }
                    }
                    module.push({ label: matches.input, obj: table });
                    module.push(readLine());
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "MysticSquareModule",
        loggingTag: "Mystic Square",
        matches: [
            {
                regex: /Field:/,
                handler: function (matches, module) {
                    module.push({ label: "Field:", obj: pre(readMultiple(3, function (str) { return str.replace('0', ' '); })) });
                }
            },
            {
                regex: /Last serial digit|Skull path/
            }
        ]
    },
    {
        moduleID: "neutralization",
        loggingTag: "Neutralization",
        matches: [
            {
                regex: /Begin detailed calculation report:/,
                handler: function (_, module) {
                    module.push(["Detailed Calculation Report", module.Report = []]);
                    return true;
                }
            },
            {
                regex: /End detailed calculation report\./,
                handler: function (_, module) {
                    module.Report = undefined;
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    (module.Report || module).push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "NonogramModule",
        loggingTag: "Nonogram",
        matches: [
            {
                regex: /^(Submitted (?:in)?correct answer:|Generated solution (?:is|was):)/,
                handler: function (matches, module) {
                    module.push({
                        label: matches[1],
                        obj: pre(readMultiple(11))
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "NotWhosOnFirst",
        loggingTag: "Not Who's on First",
        displayName: "Not Who’s on First"
    },
    {
        moduleID: "NumberPad",
        loggingTag: "Number Pad",
        matches: [
            {
                regex: /Button colors are: (.+)/,
                handler: function (matches, module) {
                    var colors = matches[1].split(', ');
                    if (colors.length === 10) {
                        var buttonToIndex = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10];
                        var buttonToLabel = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
                        var colorMapping = {
                            white: "rgb(255, 255, 255)",
                            green: "rgb(76, 255, 76)",
                            yellow: "rgb(255, 255, 76)",
                            blue: "rgb(76, 76, 255)",
                            red: "rgb(255, 76, 76)"
                        };

                        var svg = $('<svg viewBox="-0.1 -0.1 3 4" height="30%" style="display: block;"><rect width="0.8" height="0.8" stroke="black" stroke-width="0.1" y="3" fill="rgb(0, 255, 0)"></rect><text font-size="0.4" text-anchor="middle" dominant-baseline="middle" x="0.4" y="3.4">ENT</text><rect width="0.8" height="0.8" stroke="black" stroke-width="0.1" x="2" y="3" fill="red"></rect><text font-size="0.4" text-anchor="middle" dominant-baseline="middle" x="2.4" y="3.4">CLR</text></svg>');
                        for (var i = 0; i < 10; i++) {
                            var color = colors[i];
                            var index = buttonToIndex[i];
                            var x = index % 3;
                            var y = Math.floor(index / 3);
                            $SVG('<rect width="0.8" height="0.8" stroke="black" stroke-width="0.1"></rect>').attr("x", x).attr("y", y).attr("fill", colorMapping[color]).appendTo(svg);
                            $SVG('<text font-size="0.4" text-anchor="middle" dominant-baseline="middle"></text>').attr("x", x + 0.4).attr("y", y + 0.4).text(buttonToLabel[i]).appendTo(svg);
                        }

                        module.push({ label: "Button Colors:", obj: svg.css('width', '50%') });

                        return true;
                    }
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "OnlyConnectModule",
        loggingTag: "Only Connect",
        matches: [
            {
                regex: /Hieroglyph +Position +Serial# +Ports +num/,
                handler: function (matches, module) {
                    module.push({
                        label: 'Egyptian Hieroglyphs:',
                        obj: pre([matches[0]].concat(readMultiple(6, function (str) { return str.replace(/^\[Only Connect #\d+\] /, ''); })).join("\n"))
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "Password",
        loggingTag: "PasswordComponent"
    },
    {
        moduleID: "GSPathfinder",
        loggingTag: "Pathfinder",
        matches: [
            {
                regex: /The grid:/,
                handler: function (matches, module) {
                    module.push({ label: "The grid:", obj: pre(readMultiple(4)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "Painting",
        loggingTag: "Painting",
        matches: [
            {
                regex: /Generating painting/,
                handler: function (_, module) {
                    module.push(["Initial State", module.Cells = []],
                        ["Determining color-blind set", module.Rule = [], true],
                        ["Answer", module.Swaps = []],
                        ["Input", module.Input = []]);
                    return true;
                }
            },
            {
                regex: /Cell #(\d) => (\w+)/,
                handler: function (matches, module) {
                    module.Cells.push(`Cell ${matches[1]} is ${matches[2]}`);
                    return true;
                }
            },
            {
                regex: /Cell #\d must (swap|remain)/,
                handler: function (matches, module) {
                    module.Swaps.push(matches.input);
                    return true;
                }
            },
            {
                regex: /rule \w/i,
                handler: function (matches, module) {
                    module.Rule.push(matches.input);
                    return true;
                }
            },
            {
                regex: /paint(ing)? cell #\d with/i,
                handler: function (matches, module) {
                    module.Input.push(matches.input);
                    return true;
                }
            },
            {
                regex: /Determining active color-blind set/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "spwizPerspectivePegs",
        loggingTag: "Perspective Pegs",
        matches: [
            {
                regex: /Pegs:/,
                handler: function (matches, module) {
                    var colors = {
                        R: '#E51537',
                        G: '#257A1C',
                        B: '#0077E0',
                        Y: '#E8E800',
                        P: '#A423A4'
                    };

                    // OK, now this is weird. Sometimes the lines are fine,
                    // sometimes they are double-spaced with blank lines.
                    // Read one line to find out whether it’s blank.
                    var tmpLine = readLine();
                    var ascii;
                    if (tmpLine.length > 0) {
                        ascii = readMultiple(10).split('\n');
                        ascii.splice(0, 0, tmpLine);
                    } else {
                        ascii = readMultiple(21).replace(/\n{2}/g, "\n").split('\n');
                    }
                    var pegCoords = [[9, 0], [17, 3], [13, 7], [4, 7], [1, 3]];
                    var sideCoords = [[3, 0], [5, 1], [4, 3], [1, 3], [0, 1]];
                    var svg1 = '', svg2 = '';
                    var startPeg = 0;
                    for (var peg = 0; peg < 5; peg++) {
                        for (var side = 0; side < 5; side++) {
                            const fmt = str => str
                                .replace(/‹[01][io][xy]›/g, function (m) {
                                    var angle1 = (72 * (side + (+m[1])) - 126) / 180 * Math.PI;
                                    var coord1 = (m[2] === 'i' ? .5 : 1) * (m[3] === 'x' ? Math.cos(angle1) : Math.sin(angle1));
                                    var angle2 = (72 * peg - 90) / 180 * Math.PI;
                                    var coord2 = 3 * (m[3] === 'x' ? Math.cos(angle2) : Math.sin(angle2));
                                    return coord1 + coord2;
                                })
                                .replace(/‹f›/g, function () {
                                    return colors[ascii[pegCoords[peg][1] + sideCoords[side][1]][pegCoords[peg][0] + sideCoords[side][0]]];
                                });
                            svg1 += fmt("<path d='M‹0ix› ‹0iy› ‹1ix› ‹1iy› ‹1ox› ‹1oy› ‹0ox› ‹0oy›z' fill='‹f›' stroke='none' />");
                            svg2 += fmt("<path d='M‹0ix› ‹0iy› ‹0ox› ‹0oy›' fill='none' stroke='black' stroke-width='.05' />");
                            if (ascii[pegCoords[peg][1] + 1][pegCoords[peg][0] + 3] === '#')
                                startPeg = peg;
                        }
                    }
                    var tAngle = (72 * startPeg - 90) / 180 * Math.PI;
                    svg2 += "<text x='‹x›' y='‹y›' font-size='.3' text-anchor='middle'>START</text>"
                        .replace('‹x›', 3 * Math.cos(tAngle))
                        .replace('‹y›', 3 * Math.sin(tAngle) + .1);
                    module.PegsSvg = svg1 + svg2;
                    return true;
                }
            },
            {
                regex: /^Sequence:.*/,
                handler: function (matches, module) {
                    module.SequenceLine = matches.input;
                    return true;
                }
            },
            {
                regex: /^Look from ((?:top|bottom)-(?:left|right)|top). Correct solution: ((?:top|bottom)-(?:left|right)|top), ((?:top|bottom)-(?:left|right)|top), ((?:top|bottom)-(?:left|right)|top)/,
                handler: function (matches, module) {
                    var indexes = {
                        'top': 0,
                        'top-right': 1,
                        'bottom-right': 2,
                        'bottom-left': 3,
                        'top-left': 4
                    };
                    var svg = '';
                    for (var i = 2; i <= 4; i++) {
                        var pegAngle = (72 * indexes[matches[i]] - 90) / 180 * Math.PI;
                        svg += "<g transform='translate(‹x› ‹y›) rotate(‹rot›)'><path d='M 0 -1.5 0 -100' fill='none' stroke-width='.1' stroke='#92a09a' /><path d='M -.3 -2 0 -1.1 .3 -2 z' fill='#92a09a' stroke='none' /></g>"
                            .replace(/‹x›/g, 3 * Math.cos(pegAngle))
                            .replace(/‹y›/g, 3 * Math.sin(pegAngle))
                            .replace(/‹rot›/g, 72 * indexes[matches[1]]);
                    }
                    module.push({
                        label: 'Pegs:',
                        obj: $("<svg viewBox='-5.5 -5.5 11 11'>" + module.PegsSvg + svg + '</svg>').css({
                            width: '25em',
                            display: 'block'
                        })
                    });
                    module.push(module.SequenceLine);
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: ["PianoKeys", "CruelPianoKeys", "FestivePianoKeys"],
        loggingTag: ["Piano Keys", "Cruel Piano Keys", "Festive Piano Keys"],
        matches: [
            {
                regex: /Module generated with the following symbols/
            },
            {
                regex: /The correct rule is the following/,
                handler: function (matches, module) {
                    var input = [];
                    module.Input = input;
                    module.push(matches.input);
                    module.push(readLine().trim());
                    module.push(readLine().trim());
                    readLine();
                    module.push(readLine().replace(/[|]/g, ""));
                    module.push(["Key Presses", input]);

                    return true;
                }
            },
            {
                regex: /Input .+ was received|The current valid sequence/,
                handler: function (matches, module) {
                    module.Input.push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: ["PixelArt"],
        loggingTag: ["Pixel Art"],
        matches: [
            {
                regex: /In reading order the order is:/,
                handler: function (matches, module) {
                    let color = readTaggedLine()
                        .replace(/White./g, "0")
                        .replace(/Red./g, "1")
                        .replace(/ /g, "");
                    for (var i = 0; i < 23; i++) {
                        color += readTaggedLine()
                            .replace(/White./g, "0")
                            .replace(/Red./g, "1")
                            .replace(/ /g, "");
                    };
                    var table = $('<table>')
                        .css('background-color', '#48453e')
                        .css('font-size', '30px')
                        .css('color', 'white');

                    //1st row
                    var tr = $('<tr>').appendTo(table);
                    for (var c = 0; c < 4; c++) {
                        if (color[c] == "0") {
                            $('<td>')
                                .css('background-color', '#ffffff')
                                .css('text-align', 'center')
                                .css('width', '30px')
                                .css('height', '30px')
                                .appendTo(tr);
                        }
                        else {
                            $('<td>')
                                .css('background-color', '#ff0000')
                                .css('text-align', 'center')
                                .css('width', '30px')
                                .css('height', '30px')
                                .appendTo(tr);
                        }
                    }
                    for (var r = 0; r < 4; r++) {
                        var tr = $('<tr>').appendTo(table);
                        for (var c = 0; c < 5; c++) {
                            if (color[c + 4 + 5 * r] == "0") {
                                $('<td>')
                                    .css('background-color', '#ffffff')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr);
                            }
                            else {
                                $('<td>')
                                    .css('background-color', '#ff0000')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr);
                            }
                        }
                    }
                    module.push({ label: "Solution: ", obj: table });
                }
            }
        ]
    },
    {
        displayName: "Playfair Cipher",
        moduleID: "Playfair",
        loggingTag: "Playfair Cipher",
        matches: [
            {
                regex: /^Beginning of Matrix/,
                handler: function (matches, module) {
                    const matrix = readMultiple(6).split("\n").map(line => line.replace(/^\[Playfair Cipher #\d+\] /, ""));
                    matrix.splice(5, 1);

                    module.push({ label: "Matrix:", obj: pre(matrix.join("\n")) });
                    return true;
                }
            },
            {
                regex: /^\s*(.+)/,
                handler: function (matches, module) {
                    module.push(matches[1]);
                    return true;
                }
            }
        ]
    },
    {
        moduleID: ["playfairCycle", "jumbleCycle"],
        loggingTag: ["Playfair Cycle", "Jumble Cycle"],
        matches: [
            {
                regex: /(?:The keysquare was:|The keysquare used for Playfair encryption was:)/,
                handler: function (matches, module) {
                    let table = readTaggedLine();
                    for (var i = 0; i < 4; i++) {
                        table += "\n" + readTaggedLine().replace(/ /, "");
                    }
                    module.push({ label: "The Keysquare was:", obj: pre(table).css('display', 'table') });
                    return true;
                }
            },
            {
                regex: /(.+)/
            }
        ]
    },
    {
        displayName: "Plumbing",
        moduleID: "MazeV2",
        loggingTag: "Plumbing",
        matches: [
            {
                regex: /Module solved/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /\[[A-Z]{3}[-+]\].*/,
                handler: function (matches, module) {
                    if (!module.Conditions) {
                        module.Conditions = [];
                    }

                    module.Conditions.push(matches[0]);

                    return true;
                }
            },
            {
                regex: /^[A-Z]+ (?:IN|OUT)/,
                handler: function (matches, module) {
                    if (module.Conditions) {
                        module.push([matches.input, module.Conditions]);
                    } else {
                        module.push(matches.input);
                    }
                    module.Conditions = null;

                    return true;
                }
            },
            {
                regex: /:/,
                handler: function (matches, module) {
                    module.Pipes = [];
                    module.Title = matches.input;

                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.Pipes.push(matches.input.replace(/┼/g, " "));

                    if (module.Pipes.length == 6) {
                        var pipeSVG = {
                            end: 'M 0.25,0 0.75,0 0.75,0.5 C0.75,0.9 0.25,0.9 0.25,0.5',
                            straight: 'M 0.25,0 0.75,0 0.75,1 0.25,1',
                            corner: 'M 0.25,0 0.75,0 0.75,0.25 1,0.25 1,0.75 0.5,0.75 C 0.35,0.75 0.25,0.65 0.25,0.5 L0.25,0',
                            threeway: 'M 0,0.25 0.25,0.25 0.25,0 0.75,0 0.75,0.25 1,0.25 1,0.75 0,0.75',
                            fourway: 'M 0.25,0 0.75,0 0.75,0.25 1,0.25 1,0.75 0.75,0.75 0.75,1 0.25,1 0.25,0.75 0,0.75 0,0.25 0.25,0.25'
                        };

                        var charMap = {
                            // [pipename, rotation * 90]
                            "╨": ["end", 0],
                            "╞": ["end", 1],
                            "╥": ["end", 2],
                            "╡": ["end", 3],
                            "║": ["straight", 0],
                            "═": ["straight", 1],
                            "╚": ["corner", 0],
                            "╔": ["corner", 1],
                            "╗": ["corner", 2],
                            "╝": ["corner", 3],
                            "╩": ["threeway", 0],
                            "╠": ["threeway", 1],
                            "╦": ["threeway", 2],
                            "╣": ["threeway", 3],
                            "╬": ["fourway", 0]
                        };

                        var svgGrid = $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6" width="200" height="200" style="display: block; border: #a00 solid 4px; background: rgb(30, 30, 30)">');
                        for (var y in module.Pipes) {
                            for (var x in module.Pipes[y]) {
                                var char = module.Pipes[y][x];
                                if (char != " ") {
                                    var data = charMap[char];
                                    if (!data) {
                                        console.warn("Unknown char: " + char);
                                    } else {
                                        $("<svg><path d='" + pipeSVG[data[0]] + "' /></svg>")
                                            .children()
                                            .eq(0)
                                            .unwrap()
                                            .attr("transform", "translate(" + x + "," + y + ") rotate(" + data[1] * 90 + " 0.5 0.5)")
                                            .attr("fill", (parseInt(x) + parseInt(y)) % 2 == 0 ? "white" : "gray")
                                            .appendTo(svgGrid);
                                    }
                                }
                            }
                        }

                        module.push({ label: module.Title, obj: svgGrid });
                    }
                }
            }
        ]
    },
    {
        moduleID: "pocketPlanesModule",
        loggingTag: "Pocket Planes",
        matches: [
            {
                regex: /(The displayed BitBook posts are as follows:)|The values of the planes are as follows:|The displayed items are as follows:|(The item that should be loaded with top priority is:)/,
                handler: function (matches, module) {
                    var numberOfLines = matches[1] ? 3 : matches[2] ? 1 : 4;
                    module.push({ label: matches.input, obj: pre(readMultiple(numberOfLines)) })
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "poetry",
        loggingTag: "Poetry",
        matches: [
            {
                regex: /Picked girl/,
                handler: function (matches, module) {
                    module.stageNumber = 1;
                    module.correctSolves = 1;
                    module.push(["Stage 1", module.stage = []]);
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.stage.push(matches.input);
                }
            },
            {
                regex: /(Correct|Wrong) Word!/,
                handler: function (matches, module) {
                    if (module.correctSolves == 3) return;
                    if (matches[1] == "Correct") module.correctSolves++;

                    module.stageNumber++;
                    module.push([`Stage ${module.stageNumber}`, module.stage = []]);
                }
            }
        ]
    },
    {
        moduleID: "PointOfOrderModule",
        loggingTag: "Point of Order",
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    var span = $("<span>").text(matches.input);
                    span.html(span.html().replace(/([♥♦])/g, "<span style='color: red'>$1</span>"));
                    module.push({ label: "", obj: span });
                }
            }
        ]
    },
    {
        moduleID: "Probing",
        loggingTag: "Probing",
        matches: [
            {
                regex: /Wire values:/i,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(2)) });
                    return true;
                }
            },
            {
                regex: /.+/,
            }
        ]
    },
    {
        displayName: "...?",
        moduleID: "punctuationMarks",
        loggingTag: "...?",
        icon: "Punctuation Marks",
    },
    {
        displayName: "QR Code",
        moduleID: "QRCode",
        loggingTag: "NeedyQRCode",
        matches: [
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Quintuples",
        moduleID: "quintuples",
        loggingTag: "Quintuples",
        matches: [
            {
                regex: /Position (\d+) numbers: (\d+)\. Position (\d+) colours: (.*)\.$/,
                handler: function (matches, module) {
                    var colours = matches[4].split(', ');
                    if (matches[1] !== matches[3] || matches[2].length !== 5 || colours.length !== 5) {
                        console.error("Quintuples logfile has unexpected format.");
                        return;
                    }
                    if (!('Quintuples' in module))
                        module.Quintuples = { numbers: new Array(25), colours: new Array(25), op: new Array(25), rowInf: new Array(5), solution: new Array(5) };
                    var c = parseInt(matches[1]) - 1;
                    for (var r = 0; r < 5; r++) {
                        module.Quintuples.numbers[c + 5 * r] = parseInt(matches[2].substr(r, 1));
                        if (module.Quintuples.numbers[c + 5 * r] === 0)
                            module.Quintuples.numbers[c + 5 * r] = 10;
                        module.Quintuples.colours[c + 5 * r] = colours[r];
                    }
                    return true;
                }
            },
            {
                regex: /Iteration (\d+), position (\d+) \(\d+\) is affected\. (.*)\.$/,
                handler: function (matches, module) {
                    var r = parseInt(matches[1]) - 1;
                    var c = parseInt(matches[2]) - 1;
                    module.Quintuples.op[c + 5 * r] = matches[3].replace(/x/g, '×').replace('Half and round down', '/2');
                    return true;
                }
            },
            {
                regex: /The sum of the modified (.*) iteration numbers \((\d+)\), modulo (\(.*\))(?:, modulo 10)?,? is (\d+)\.$/,
                handler: function (matches, module) {
                    var r = "first,second,third,fourth".split(',').indexOf(matches[1]);
                    var inf = `(${matches[2]} % ${matches[3]}) % 10 =`;
                    module.Quintuples.rowInf[r] = inf;
                    module.Quintuples.solution[r] = matches[4];
                    return true;
                }
            },
            {
                regex: /The tens column of the sum of the modified fifth iteration numbers \((\d+)\), (\+ \(.*\)), modulo 10 is (\d+)\.$/,
                handler: function (matches, module) {
                    module.Quintuples.rowInf[4] = `${matches[1]} ${matches[2]} % 10 =`;
                    module.Quintuples.solution[4] = matches[3];
                    return true;
                }
            },
            {
                regex: /The correct number to input is \d+\.$/,
                handler: function (matches, module) {
                    var arr = [0, 1, 2, 3, 4];
                    var bgColours = {
                        'red': '#f88',
                        'blue': '#88f',
                        'orange': '#f80',
                        'green': '#8f8',
                        'pink': '#fae'
                    };
                    var txColours = {
                        'red': '#a00',
                        'blue': '#00a',
                        'orange': '#f80',
                        'green': '#0a0',
                        'pink': '#f6d'
                    };
                    module.push({
                        label: 'Solution:',
                        obj: $(`<table style='border-collapse: collapse;'>${arr.map(r => `<tr>${arr.map(c => {
                            var tdStyle = '';
                            if (module.Quintuples.op[c + 5 * r])
                                tdStyle = ` style='background:${bgColours[module.Quintuples.colours[c + 5 * r]]}'`;
                            else
                                tdStyle = ` style='color:${txColours[module.Quintuples.colours[c + 5 * r]]}'`;
                            return `<td class='n'${tdStyle}>
                                <div style='font-size: 15pt'>${module.Quintuples.numbers[c + 5 * r]}${module.Quintuples.op[c + 5 * r] || ''}</div>
                                <div style='font-size: 10pt'>${module.Quintuples.colours[c + 5 * r]}</div>
                            </td>`;
                        }).join('')}<td>${module.Quintuples.rowInf[r]}</td><td>${module.Quintuples.solution[r]}</td></tr>`).join('')}</table>`)
                            .find('td').css({ border: '1px solid black', padding: '.3em .7em' }).end()
                            .find('td.n').css({ width: '1.75cm', textAlign: 'center' }).end()
                    });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Qwirkle",
        moduleID: "qwirkle",
        loggingTag: "Qwirkle",
        matches: [
            {
                regex: /Successfully placed ([a-z0-9_]+) at ([A-Z][0-9])./,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Successfully placed "))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[1] + ".png' width='20' />"))
                        .append($('<span>').text(" at " + matches[2] + "."));
                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /Strike! Tried to place ([a-z0-9_]+) at ([A-Z][0-9]), which violates placement rules./,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Strike! Tried to place "))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[1] + ".png' width='20' />"))
                        .append($('<span>').text(" at " + matches[2] + ", which violates placement rules."));
                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /Available pieces for stage ([0-9]) are ([a-z0-9_]+) ([a-z0-9_]+) ([a-z0-9_]+) ([a-z0-9_]+) . ([a-z0-9_]+) is guaranteed valid for ([A-Z][0-9])./,
                handler: function (matches, module) {
                    const span = $('<span>')
                        .append($('<span>').text("Available pieces for stage " + matches[1] + " are "))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[2] + ".png' width='20' />"))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[3] + ".png' width='20' />"))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[4] + ".png' width='20' />"))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[5] + ".png' width='20' />"))
                        .append($('<span>').text(". "))
                        .append($("<img src='../HTML/img/Qwirkle/" + matches[6] + ".png' width='20' />"))
                        .append($('<span>').text(" is guaranteed valid for " + matches[7] + "."));
                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /Stage ([0-9]) board: ([a-z0-9_ ]+)/,
                handler: function (matches, module) {
                    var tiles = matches[2].split(" ");

                    const span = $('<span style="display: flex; flex-direction: column">')
                        .append($('<span>').text("Stage " + matches[1] + " board:"));

                    for (var i = 0; i < 7; i++) {
                        var row = $('<span style="height: 20px;">');
                        for (var j = 0; j < 7; j++) {
                            row.append($("<img src='../HTML/img/Qwirkle/" + tiles[i * 7 + j] + ".png' width='20' />"));
                        }
                        span.append(row);
                    }

                    module.groups.add(span);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add($('<li>').text(matches[0]));
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "radiator",
        loggingTag: "Radiator",
        matches: [
            {
                regex: /Serial occurrences:/,
                handler: function (matches, module) {
                    module.Group = [];
                    module.push(["Calculation", module.Group]);
                }
            },
            {
                regex: /Temperature:/,
                handler: function (matches, module) {
                    module.Group = [];
                    module.push(["Submitted Answer", module.Group]);
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if (module.Group == undefined) {
                        module.push(matches.input);
                        return;
                    }

                    module.Group.push(matches.input);
                }
            }
        ]
    },
    {
        displayName: "Rainbow Arrows",
        moduleID: "ksmRainbowArrows",
        loggingTag: "Rainbow Arrows",
        matches: [
            {
                regex: /^\((.+?)\) (.+)/,
                handler: function (matches, module) {
                    if (module.length === 0 || module[module.length - 1][0] !== matches[1]) {
                        module.push([matches[1], [], false]);
                    }
                    module[module.length - 1][1].push(matches[2]);
                    return true;
                }
            },
            {
                regex: /The above rule returned (.+), which wasn't unique. The closest unique arrow was (.+)./,
                handler: function (matches, module) {
                    module[module.length - 1][1].push("…but " + matches[1] + " was already pressed; the closest unpressed button is " + matches[2] + ".");
                    return true;
                }
            },
            {
                regex: /^-+$/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Remote Math",
        moduleID: "remotemath",
        loggingTag: "Remote Math",
        matches: [
            {
                regex: /Server message: ([0-9]{4}\/[0-9]{1,2}\/[0-9]{1,2}\/[A-Z]{6}\/[A-Z0-9]{8})/,
                handler: function (matches, module) {
                    module.groups.add($('<a target="_blank" href="https://remote-math.onpointcoding.net/logs/?q=' + matches[1] + '">Open server\'s logfile</a>'))
                }
            },
            {
                regex: /Puzzle Code: ([A-Z]{6})/,
                handler: function (matches, module) {
                    module.groups.add($('<a target="_blank" href="https://remote-math.onpointcoding.net/logs/?q=*/*/*/' + matches[1] + '">Search for server logfile matching puzzle code</a>'))
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "resistors",
        loggingTag: "Resistors",
        matches: [
            {
                regex: /batteries/,
                handler: function (matches, module) {
                    module.push("Bomb Info: " + matches.input);
                }
            },
            {
                regex: /Already placed/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "RGB Arithmetic",
        moduleID: "rgbArithmetic",
        loggingTag: "RGB Arithmetic",
        matches: [
            {
                regex: /The left grid displays:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 3; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The left grid displays:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /The right grid displays:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 3; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The right grid displays:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /The center grid should display:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 3; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The center grid should display:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /The transformed left grid is:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 3; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The transformed left grid is:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /The transformed right grid is:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 3; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The transformed right grid is:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /The submitted grid was:/,
                handler: function (matches, module) {
                    let lines = readTaggedLine();
                    for (let i = 0; i < 3; i++) {
                        lines += `\n${readTaggedLine()}`;
                    }

                    module.push({ label: "The submitted grid was:", obj: pre(lines) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "RGB Hypermaze",
        moduleID: "rgbhypermaze",
        loggingTag: "RGB Hypermaze",
        matches: [
            {
                regex: /ASCII1:/,
                handler: function (matches, module) {
                    module.push({ label: "The colors are as follows:", obj: pre(readMultiple(20).replace(/\[RGB Hypermaze #\d+\] /g, "")) });
                    return true;
                }
            },
            {
                regex: /ASCII2:/,
                handler: function (matches, module) {
                    module.push({ label: "The colored cube's maze is as follows, where P = passage and W = wall:", obj: pre(readMultiple(20).replace(/\[RGB Hypermaze #\d+\] /g, "")) });
                    return true;
                }
            },
            {
                regex: /ASCII3:/,
                handler: function (matches, module) {
                    module.push({ label: "The input cube's maze is as follows, where P = passage and W = wall:", obj: pre(readMultiple(20).replace(/\[RGB Hypermaze #\d+\] /g, "")) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "RGB Maze",
        moduleID: "rgbMaze",
        loggingTag: "RGB Maze",
        matches: [
            {
                regex: /The grid:/,
                handler: function (matches, module) {
                    let line = readTaggedLine().replace(/WWWWWWWWWWWWWWWWW/g, "•——•——•——•——•——•——•——•——•");
                    let finalLine = " A  B  C  D  E  F  G  H      A  B  C  D  E  F  G  H      A  B  C  D  E  F  G  H \n" + line + "   " + line + "   " + line;
                    for (let i = 1; i < 9; i++) {
                        line = `${readTaggedLine()}`;
                        let line2 = `${readTaggedLine()}`;
                        let redMazevert = `${line.replace(/(R|Y|M|W)/g, "■").replace(/(G|B|C|K)/g, "□").replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")}`;
                        let redMazehoriz = `${line2.replace(/(R|Y|M|W)/g, "■").replace(/(G|B|C|K)/g, "□").replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")}`;
                        let greenMazevert = `${line.replace(/(G|Y|C|W)/g, "■").replace(/(R|B|M|K)/g, "□").replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")}`;
                        let greenMazehoriz = `${line2.replace(/(G|Y|C|W)/g, "■").replace(/(R|B|M|K)/g, "□").replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")}`;
                        let blueMazevert = `${line.replace(/(B|C|M|W)/g, "■").replace(/(R|G|Y|K)/g, "□").replace(/■/, "|").replace(/□□/g, "   ").replace(/□■/g, "  |").replace(/■/g, "|")}`;
                        let blueMazehoriz = `${line2.replace(/(B|C|M|W)/g, "■").replace(/(R|G|Y|K)/g, "□").replace(/■/, "•").replace(/□■/g, "  •").replace(/■■/g, "——•").replace(/■/g, "•")}`;
                        finalLine += "\n" + redMazevert + " " + i + " " + greenMazevert + " " + i + " " + blueMazevert + "\n" + redMazehoriz + "   " + greenMazehoriz + "   " + blueMazehoriz;
                    }
                    finalLine += "\n           Red                        Green                        Blue";
                    module.push({ label: "The grid:", obj: pre(finalLine) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Round Keypad",
        moduleID: "KeypadV2",
        loggingTag: "Round Keypad",
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.push(matches[0].replace(/,/g, " "));
                }
            }
        ]
    },
    {
        displayName: "Rubik’s Clock",
        moduleID: "rubiksClock",
        loggingTag: "Rubik’s Clock",
        matches: [
            {
                regex: /Moves to solve, move \d+:/,
                handler: function (matches, module) {
                    module.push([matches.input, readMultiple(4).replace(/^\[.*?\] - /mg, '').split('\n')]);
                    return true;
                }
            },
            {
                regex: /Actions performed (to solve|before bomb exploded|before reset):/,
                handler: function (matches, module) {
                    module.push([matches.input.replace(/None\./, ''), module.RCActions = []]);
                    return true;
                }
            },
            {
                regex: /^- (.*)$/,
                handler: function (matches, module) {
                    module.RCActions.push(matches[1]);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Rule",
        moduleID: "theRule",
        loggingTag: "The Rule",
        matches: [
            {
                regex: /Solution is:|Submitted the following:/,
                handler: function (matches, module) {
                    readLine();
                    var grid = readMultiple(4);
                    module.push({ label: matches.input, obj: pre(grid) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        loggingTag: "Rules",
        matches: [
            {
                regex: /Getting solution index for component (.+)Component\(Clone\)/,
                handler: function (matches) {
                    var line = readLine();
                    var allLines = line;

                    while (!line.includes("All queries passed.")) {
                        line = readLine();
                        allLines += "\n" + line;
                    }

                    var vanilla = {
                        Button: "BigButton",
                        WireSet: "Wires"
                    };

                    readDirectly(line.substring(20), vanilla[matches[1]] || matches[1]);
                    readDirectly({ label: "Rule Info", obj: pre(allLines), expandable: true, expanded: false }, vanilla[matches[1]] || matches[1]);
                }
            }
        ]
    },
    {
        displayName: "Who’s on First",
        moduleID: "WhosOnFirst",
        loggingTag: "Rules.WhosOnFirst",
        matches: [
            {
                regex: /Precedence List is:/
            },
            {
                regex: /Top precedence label is (.+) \(button index \d\)\. Button pushed was \d\. Result: (\w+)/,
                handler: function (matches, module) {
                    module.push("Top precedence label is " + matches[1] + ". Result: " + matches[2]);
                }
            }
        ]
    },
    {
        displayName: "Wire Sequence",
        moduleID: "WireSequence",
        loggingTag: "WireSequenceComponent",
    },
    {
        displayName: "Safety Safe",
        moduleID: "PasswordV2",
        loggingTag: "Safety Safe",
        matches: [
            {
                regex: /offset|Answer|Input|solved/,
                handler: function (matches, module) {
                    module.push(matches.input.replace(/,/g, ", "));
                }
            }
        ]
    },
    {
        displayName: "The Samsung",
        moduleID: "theSamsung",
        loggingTag: "The Samsung",
        matches: [
            {
                regex: /(DUOLINGO|GOOGLE MAPS|KINDLE|GOOGLE AUTHENTICATOR|PHOTOMATH|SPOTIFY|GOOGLE ARTS & CULTURE|DISCORD):/,
                handler: function (matches, module) {
                    if (!module.Things)
                        module.Things = [];
                    module.Things.push([matches[1], []]);
                    return true;
                }
            },
            {
                regex: /SETTINGS:/,
                handler: function (matches, module) {
                    for (let thing of module.Things)
                        module.push(thing);
                    module.push(["SETTINGS", readMultiple(3).split('\n').map(entry => entry.replace(/^\[The Samsung #\d+\] /, ''))]);
                    module.Things = false;
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if (module.Things) {
                        module.Things[module.Things.length - 1][1].push(matches.input);
                    } else {
                        module.push(matches.input);
                    }
                }
            }
        ]
    },
    {
        displayName: "The Screw",
        moduleID: "screw",
        loggingTag: "Screw",
        matches: [
            {
                regex: /Stage \d of \d/,
                handler: function (matches, module) {
                    module.Stage = [matches.input, []];
                    module.push(module.Stage);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    (module.Stage ? module.Stage[1] : module).push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "Semaphore",
        loggingTag: "Semaphore",
        matches: [
            {
                regex: /Module generated/,
                handler: function (matches, module) {
                    module.push({ label: "Flags", obj: pre(readMultiple(8)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "S.E.T.",
        moduleID: "SetModule",
        loggingTag: "S.E.T.",
        matches: [
            {
                regex: /^Icon at \(module\) ([ABC][123]) is \(manual\) ([ABC][123]), (filled|wavy|empty), (\d) dots\./,
                handler: function (matches, module) {
                    if (!('SetInfo' in module)) {
                        module.SetInfo = {
                            Symbols: [null, null, null, null, null, null, null, null, null],
                            WavyId: Math.floor(Math.random() * 2147483647),
                            Node: { label: 'Module:', obj: null },
                            XY: function (str) { return { X: str.charCodeAt(0) - "A".charCodeAt(0), Y: str.charCodeAt(1) - "1".charCodeAt(0) }; }
                        };
                        module.push(module.SetInfo.Node);
                    }

                    var moduleXY = module.SetInfo.XY(matches[1]);
                    var manualXY = module.SetInfo.XY(matches[2]);

                    var pathData =
                        // pacman
                        matches[2] === 'A1' ? "M76 670c-8.3 14.3-26.7 19.3-41 11s-19.3-26.7-11-41 26.7-19.3 41-11c4.6 2.7 8.3 6.4 11 11l-26 15z" :
                            // cross
                            matches[2] === 'B1' ? "M120 625a10 10 0 0 0-5.6 18.3L132 655l-17.6 11.7a10 10 0 1 0 11.2 16.6L150 667l24.4 16.3a10 10 0 1 0 11.2-16.6L168 655l17.6-11.7a10 10 0 0 0-5.8-18.4 10 10 0 0 0-5.4 1.7L150 643l-24.4-16.3a10 10 0 0 0-5-1.8z" :
                                // triangle
                                matches[2] === 'C1' ? "M210 685l40-60 40 60z" :
                                    // tepee
                                    matches[2] === 'A2' ? "M50 725l-40 60h28l12-18 12 18h28l-40-60z" :
                                        // tshirt
                                        matches[2] === 'B2' ? "M110 725v30h20v30h40v-30h20v-30h-30c0 5.5-4.5 10-10 10s-10-4.5-10-10z" :
                                            // arrow
                                            matches[2] === 'C2' ? "M250 725l40 35h-20v25h-40v-25h-20z" :
                                                // diamond
                                                matches[2] === 'A3' ? "M50 825l40 30-40 30-40-30z" :
                                                    // hotel
                                                    matches[2] === 'B3' ? "M110 825h30v20h20v-20h30v60h-30v-20h-20v20h-30z" :
                                                        // star
                                                        matches[2] === 'C3' ? "M550 830l6.7 20.8h21.8l-17.7 12.7 6.8 20.8-17.6-13-17.6 13 6.8-20.8-17.7-12.8h21.8z" : null;

                    var symbolSvg = "<path d='!data!' fill='!fill!' stroke='black' stroke-width='5' transform='translate(!x!, !y!)!transform!'/>"
                        .replace(/!data!/g, pathData)
                        .replace(/!x!/g, 100 * moduleXY.X - 100 * manualXY.X)
                        .replace(/!y!/g, 100 * moduleXY.Y - 100 * manualXY.Y - 600)
                        .replace(/!fill!/g, matches[3] === 'filled' ? 'black' : matches[3] === 'wavy' ? 'url(#Wavy' + module.SetInfo.WavyId + ')' : 'none')
                        .replace(/!transform!/, matches[2] === 'C3' ? "matrix(1.25 0 0 1 -437.5 -2.77)" : '');

                    if (matches[4] !== '0')
                        symbolSvg += "<path d='!data!' fill='black' stroke='none' transform='translate(!x!, !y!)'/>"
                            .replace(/!x!/g, 100 * moduleXY.X)
                            .replace(/!y!/g, 100 * moduleXY.Y)
                            .replace(/!data!/g, matches[4] === '1'
                                ? "M56.3 10a6.3 6.3 0 1 1-12.6 0 6.3 6.3 0 1 1 12.6 0z"
                                : "M68.8 10c0 3.5-2.8 6.3-6.3 6.3s-6.3-2.8-6.3-6.3 2.8-6.3 6.3-6.3 6.3 2.8 6.3 6.3zm-25 0c0 3.5-2.8 6.3-6.3 6.3s-6.3-2.8-6.3-6.3 2.8-6.3 6.3-6.3 6.3 2.8 6.3 6.3z");

                    module.SetInfo.Symbols[moduleXY.X + 3 * moduleXY.Y] = symbolSvg;
                    return true;
                }
            },
            {
                regex: /^Solution: ([ABC][123]), ([ABC][123]), ([ABC][123])/,
                handler: function (matches, module) {

                    var framesSvg = '';
                    for (var i = 1; i <= 3; i++) {
                        var xy = module.SetInfo.XY(matches[i]);
                        framesSvg += "<rect x='!x!' y='!y!' width='100' height='100' stroke-width='3' stroke='#3c2' fill='none' />"
                            .replace(/!x!/g, 100 * xy.X)
                            .replace(/!y!/g, 100 * xy.Y);
                    }

                    module.SetInfo.Node.obj = $("<svg viewBox='-5 -5 310 310'><defs><pattern id='Wavy" + module.SetInfo.WavyId + "' height='5.2' width='30.1' patternUnits='userSpaceOnUse'><path d='M 7.597,0.061 C 5.079,-0.187 2.656,0.302 -0.01,1.788 L -0.01,3.061 C 2.773,1.431 5.173,1.052 7.472,1.280 C 9.770,1.508 11.969,2.361 14.253,3.218 C 18.820,4.931 23.804,6.676 30.066,3.061 L 30.062,1.788 C 23.622,5.497 19.246,3.770 14.691,2.061 C 12.413,1.207 10.115,0.311 7.597,0.061 z' /></pattern></defs>" + framesSvg + module.SetInfo.Symbols.join('') + "</svg>")
                        .css({ display: 'block', width: '12cm' });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Settlers of KTaNE",
        moduleID: "SettlersOfKTaNE",
        loggingTag: "Settlers Of KTaNE"
    },
    {
        displayName: "Shapes And Bombs",
        moduleID: "ShapesBombs",
        loggingTag: "Shapes Bombs",
        matches: [
            {
                regex: /Color for the squares is: (\w+)/,
                handler: function (matches, module) {
                    var color = matches[1]
                        .replace(/Green/g, "0")
                        .replace(/Blue/g, "1")
                        .replace(/Yellow/g, "2")
                        .replace(/Cyan/g, "3")
                        .replace(/Purple/g, "4")
                        .replace(/White/g, "5");
                    var colors = [
                        '#00ff00', // Green
                        '#0000ff', // Blue
                        '#ffff00', // Yellow
                        '#00FFFF', // Cyan
                        '#ff00ff', // Purple(Magenta)
                        '#ffffff', // White
                        '#48453e', // Grey
                    ];
                    var directions = readTaggedLine().replace(/[0-9]/g, "").replace(/Arrow sequence is: /g, "00. ");
                    for (var i = 1; i < 10; i++) {
                        directions = directions.replace(/\(/, '\n0\#').replace(/\#/, i).replace(/\)/, ".");
                    };
                    for (var i = 10; i < 16; i++) {
                        directions = directions.replace(/\(/, '\n\#').replace(/\#/, i).replace(/\)/, ".").replace(/\n15./, "");
                    };

                    if (color != "5") {
                        var unused1 = readTaggedLine();
                        var unused2 = readTaggedLine();

                        var letterTable = readTaggedLine().replace(/Letter table is:/, "");
                        var ltable = $('<table>').css('border', '1px solid black').css('border-collapse', 'collapse')
                        for (var r = 0; r < 5; r++) {
                            var tr = $('<tr>').css('border', '1px solid black').appendTo(ltable);
                            ltablerow = readTaggedLine().replace(/ /g, "");
                            for (var c = 0; c < 3; c++) {
                                $('<td>')
                                    .text(ltablerow[c])
                                    .css('border', '1px solid black')
                                    .css('text-align', 'center')
                                    .css('width', '25px')
                                    .css('height', '25px')
                                    .appendTo(tr);
                            }
                        }
                        var unused3 = readTaggedLine();
                        var unused4 = readTaggedLine();
                        var unused5 = readTaggedLine();
                    }

                    var unused6 = readTaggedLine() + readTaggedLine();
                    unused6 = unused6.replace(/Counting lit squares/, "");

                    var table1 = $('<table>')
                        .css('background-color', '#48453e')
                        .css('font-size', '30px')
                        .css('color', 'white');

                    var currentRow = readTaggedLine().replace(/Even solved modules final shape is:/, "").replace(/ /, "");
                    for (var r = 0; r < 8; r++) {
                        var tr = $('<tr>').appendTo(table1);
                        currentRow = readTaggedLine().replace(/ /g, "");
                        for (var c = 0; c < 5; c++) {
                            if (currentRow[c] == "0") {
                                $('<td>')
                                    .css('background-color', colors[color])
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr);
                            }
                            else {
                                $('<td>')
                                    .css('background-color', '#48453e')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr);
                            }
                        }
                    }

                    var table2 = $('<table>')
                        .css('background-color', '#48453e')
                        .css('font-size', '30px')
                        .css('color', 'white');

                    currentRow = readTaggedLine().replace(/Odd solved modules final shape is:/, "").replace(/ /, "");
                    for (var r = 0; r < 8; r++) {
                        var tr2 = $('<tr>').appendTo(table2);
                        currentRow = readTaggedLine().replace(/ /g, "");
                        for (var c = 0; c < 5; c++) {
                            if (currentRow[c] == "0") {
                                $('<td>')
                                    .css('background-color', colors[color])
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr2);
                            }
                            else {
                                $('<td>')
                                    .css('background-color', '#48453e')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr2);
                            }
                        }
                    }
                    module.push({ label: "Color of the square is: ", obj: matches[1] });
                    module.push({ label: "Arrow Sequence are: ", obj: pre(directions) });
                    if (color != "5") {
                        module.push({ obj: unused1 });
                        module.push({ obj: unused2 });
                        module.push({ label: "The Letter Table is: ", obj: ltable });
                        module.push({ obj: unused3 });
                        module.push({ obj: unused4 });
                        module.push({ obj: unused5 });
                    }
                    module.push({ obj: unused6 });
                    module.push({ label: "Even solved modules final shape is: ", obj: table1 });
                    module.push({ label: "Odd solved modules final shape is: ", obj: table2 });

                    module.Color = colors[color];
                    return true;
                }
            },
            {
                regex: /Current shape:/,
                handler: function (matches, module) {
                    var table = $('<table>')
                        .css('background-color', '#48453e')
                        .css('font-size', '30px')
                        .css('color', 'white');

                    for (var r = 0; r < 8; r++) {
                        var tr = $('<tr>').appendTo(table);
                        var currentRow = readTaggedLine().replace(/ /g, "");
                        for (var c = 0; c < 5; c++) {
                            if (currentRow[c] == "0") {
                                $('<td>')
                                    .css('background-color', module.Color)
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr);
                            }
                            else {
                                $('<td>')
                                    .css('background-color', '#48453e')
                                    .css('text-align', 'center')
                                    .css('width', '30px')
                                    .css('height', '30px')
                                    .appendTo(tr);
                            }
                        }
                    }

                    module.push({ label: matches.input, obj: table });
                    return true;
                }
            },
            {
                regex: /.+/,
            }
        ]
    },
    {
        moduleID: "shikaku",
        loggingTag: "Shikaku",
        matches: [
            {
                regex: /Possible solution:/,
                handler: function (matches, module) {
                    var grid = readMultiple(7).replace(/\[Shikaku #\d+\] /g, "");
                    var lines = grid.replace(/\r/g, '').split('\n');
                    var shapes = lines[6].replace('Shape data for Logfile Analyzer: ', '');
                    var colors = [
                        '#0082C8', // Blue
                        '#644117', // Brown
                        '#0B6623', // Forest
                        '#43C853', // Green
                        '#808080', // Grey
                        '#0000AB', // Navy
                        '#F59331', // Orange
                        '#911EB4', // Purple
                        '#E61919', // Red
                    ];
                    var table = $('<table>')
                        .css('background-color', 'black')
                        .css('font-family', 'Shikaku')
                        .css('font-size', '30px')
                        .css('color', 'white');
                    for (var r = 0; r < 6; r++) {
                        var tr = $('<tr>').appendTo(table);
                        for (var c = 0; c < 6; c++) {
                            $('<td>')
                                .text(shapes[r * 6 + c])
                                .css('background-color', colors[lines[r][c] - 1])
                                .css('text-align', 'center')
                                .css('width', '40px')
                                .css('height', '40px')
                                .appendTo(tr);
                        }
                    }

                    module.push({ label: "Possible solution:", obj: table });
                }
            },
            {
                regex: /.+/,
                handler: function () { }
            }
        ]
    },
    {
        displayName: "Shoddy Chess",
        moduleID: "ShoddyChessModule",
        loggingTag: "Shoddy Chess",
        matches: [
            {
                regex: /movequeue/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /Module is now in the solve phase, good luck!/,
                handler: function (matches, module) {
                    module.push({ obj: matches.input, nobullet: true });
                    return true;
                }
            },
            {
                regex: /----------Stage (.+):----------/,
                handler: function (matches, module) {
                    module.Stage = ["Stage " + matches[1], []];
                    module.push(module.Stage);

                    return true;
                }
            },
            {
                regex: /The submitted answer was:/,
                handler: function (matches, module) {
                    module.Stage = ["Submitted answer", []];
                    module.push(module.Stage);

                    return true;
                }
            },
            {
                regex: /Board:/,
                handler: function (matches, module) {
                    module.Stage[1].push({ obj: pre(readMultiple(8)), nobullet: true });
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if ('Stage' in module)
                        module.Stage[1].push(matches.input);
                    else
                        // Any messages logged before the start
                        module.push(matches.input);
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "SillySlots",
        loggingTag: "Silly Slots",
        matches: [
            {
                regex: /Stage/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(2)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Simon’s On First",
        moduleID: "simonsOnFirst",
        loggingTag: "Simon's On First"
    },
    {
        displayName: "Simon’s Ultimate Showdown",
        moduleID: "simonsUltimateShowdownModule",
        loggingTag: "Simon's Ultimate Showdown"
    },
    {
        moduleID: "SimonScreamsModule",
        loggingTag: "Simon Screams",
        matches: [
            {
                regex: /Colors in|Small table/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /Stage (.) sequence/,
                handler: function (matches, module) {
                    module.Stage = ["Stage #" + matches[1], []];
                    module.push(module.Stage);
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.Stage[1].push(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "simonStores",
        loggingTag: "Simon Stores",
        matches: [
            {
                regex: /^(D)(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: matches[1] + matches[2] });
                    return true;
                }
            },
            {
                regex: /^(R|G|B|C|M|Y)\((.+)/,
                handler: function (matches, module) {
                    module.push({ obj: pre(" " + matches[1] + "(" + matches[2]).css('display', 'block').css('margin', '0').css('padding', '0'), nobullet: true });
                    return true;
                }
            },
            {
                regex: /a0(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: "Stage 1:" });
                    module.push({ obj: "a0" + matches[1], nobullet: true });
                    return true;
                }
            },
            {
                regex: /b0(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: "Stage 2:" });
                    module.push({ obj: "b0" + matches[1], nobullet: true });
                    return true;
                }
            },
            {
                regex: /c0(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: "Stage 3:" });
                    module.push({ obj: "c0" + matches[1], nobullet: true });
                    return true;
                }
            },
            {
                regex: /(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: matches[1], nobullet: true });
                    return true;
                }
            }
        ]
    },
    {
        displayName: "Simon Squawks",
        moduleID: "simonSquawks",
        loggingTag: "Simons Squawks"
    },
    {
        displayName: "Simon’s Stages",
        moduleID: "simonsStages",
        loggingTag: "Simon's Stages",
        matches: [
            {
                regex: /There are no more|Inputs correct|Strike!/,
                handler: function (matches, module) {
                    module.push(matches.input);
                    return true;
                }
            },
            {
                regex: /STAGE #(.+):/,
                handler: function (matches, module) {
                    module.Stage = ["Stage #" + matches[1], []];
                    module.push(module.Stage);

                    return true;
                }
            },
            {
                regex: /STAGE (.+) RESPONSE/,
                handler: function (matches, module) {
                    module.Stage = ["Stage #" + matches[1] + " Response", []];
                    module.push(module.Stage);

                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    if ('Stage' in module)
                        module.Stage[1].push(matches.input);
                    else
                        // Any messages logged before the start
                        module.push(matches.input);
                }
            }
        ]
    },
    {
        displayName: "Simon’s Star",
        moduleID: "simonsStar",
        loggingTag: "Simon's Star"
    },
    {
        moduleID: "SkewedSlotsModule",
        loggingTag: "Skewed Slots",
        matches: [
            {
                regex: /Rule Log/,
                handler: function (_, module) {
                    module.push(readLine()); // Initial

                    for (var i = 0; i < 3; i++) {
                        readLine();
                        var start = new RegExp(/#(\d). Starting at: (\d)/).exec(readLine());
                        var slot = ["Slot #" + start[1] + " (" + start[2] + ")", []];

                        var line = readLine();
                        while (!(/Final digit/).exec(line)) {
                            slot[1].push(line);
                            line = readLine();
                        }
                        slot[1].push(line);

                        module.push(slot);
                    }

                    readLine();
                    module.push(readLine()); // Final
                }
            },
            {
                regex: /Submitted:/
            }
        ]
    },
    {
        moduleID: "skyrim",
        loggingTag: "Skyrim",
        matches: [
            {
                regex: /^The chosen shouts are (.*?)( \(.*\)), (.*?)( \(.*\)), (.*?)( \(.*\))\.$/,
                handler: function (matches, module) {
                    var div = $('<div>');
                    div.append($('<span>').text('The chosen shouts are:'));
                    div.append($('<ul>')
                        .append($('<li>')
                            .append($('<span style="font-family:DragonAlphabet">').text(matches[1].replace(/-/g, '\u2003')))
                            .append($('<span>').text(matches[2])))
                        .append($('<li>')
                            .append($('<span style="font-family:DragonAlphabet">').text(matches[3].replace(/-/g, '\u2003')))
                            .append($('<span>').text(matches[4])))
                        .append($('<li>')
                            .append($('<span style="font-family:DragonAlphabet">').text(matches[5].replace(/-/g, '\u2003')))
                            .append($('<span>').text(matches[6])))
                    );
                    module.push(div);
                    return true;
                }
            },
            {
                regex: /^(The correct shout is |Strike! You selected .*? & )(.*?)( \(.*?\)\.|\.)$/,
                handler: function (matches, module) {
                    var span = $('<span>');
                    span.text(matches[1]);
                    span.append($('<span style="font-family:DragonAlphabet">').text(matches[2].replace(/-/g, '\u2003')));
                    span.append($('<span>').text(matches[3]));
                    module.push(span);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Snakes and Ladders",
        moduleID: "snakesAndLadders",
        loggingTag: "Snakes and Ladders",
        matches: [
            {
                regex: /^board: ([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/$/,
                handler: function (matches, module) {
                    var span = $('<span>');
                    var svg = $('<svg viewBox="-4 -4 54 54" width="270" height="270"></svg>').appendTo(span);
                    var rows = matches.slice(1, 11).reverse();
                    for (var i = 0; i < rows.length; i++) {
                        if (i % 2 == 0) rows[i] = rows[i].split("").reverse().join("");
                    }
                    var numOrder = [
                        100, 99, 98, 97, 96, 95, 94, 93, 92, 91,
                        81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
                        80, 79, 78, 77, 76, 75, 74, 73, 72, 71,
                        61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
                        60, 59, 58, 57, 56, 55, 54, 53, 52, 51,
                        41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
                        40, 39, 38, 37, 36, 35, 34, 33, 32, 31,
                        21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
                        20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
                        1, 2, 3, 4, 5, 6, 7, 8, 9, 10
                    ];
                    for (var r = 0; r < 10; r++) {
                        for (var c = 0; c < 10; c++) {
                            var col = rows[r][c] == 0 ? "red" : rows[r][c] == 1 ? "blue" : rows[r][c] == 2 ? "green" : "yellow";
                            if (c == 0 && r == 0) {
                                $SVG(`<circle cx='0' cy='0' r='4' fill='#222'>`).appendTo(svg);
                                continue;
                            }
                            $SVG(`<rect x='${c * 5}' y='${r * 5}' width='5' height='5' fill='${col}' />`).appendTo(svg);
                            $SVG(`<text x="${c * 5 + 2.5}" y="${r * 5 + 3}" fill="${col == "yellow" ? "black" : "white"}" font-size="3px" dominant-baseline="middle" text-anchor="middle">${numOrder[r * 10 + c]}</text>`).appendTo(svg);
                        }
                    }
                    module.push(span);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Sonic the Hedgehog",
        moduleID: "sonic",
        loggingTag: "Sonic the Hedgehog",
        matches: [
            {
                regex: /The boots monitor plays:/,
                handler: function (_, module) {
                    module.groups.addGroup(true);
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "SouvenirModule",
        loggingTag: "Souvenir",
        matches: [
            {
                regex: /Asking question: (.+) — (.+)/,
                handler: function (matches, module) {
                    var answers = $("<div>").css({ margin: '.5em 0' });
                    matches[2].split(" | ").forEach(function (answer) {
                        var answerSpan = $("<span>");
                        if (answer.substr(0, 2) == "[_") {
                            answer = answer.substr(2, answer.length - 4);
                            answerSpan.css({ background: '#dfd' });
                        }
                        answerSpan.text(answer).css({ border: '1px solid #888', padding: '0 .5em', margin: '0 .3em' }).appendTo(answers);
                    });

                    module.push({ label: matches[1], obj: answers, expanded: true });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "spinningButtons",
        loggingTag: "Spinning Buttons",
        matches: [
            {
                regex: /((?:Button #\d is \w+ and|(?:Strike! )?You pressed the \w+ button that) says )(\w)(\. (?:Its value is \d+\.|That is (?:in)?correct\.))/,
                handler: function (matches, module) {
                    const span = $("<span>").append(
                        document.createTextNode(matches[1]),
                        $(`<span style="font-family: 'cyrillic'">`).text(matches[2]),
                        document.createTextNode(matches[3])
                    );
                    module.push({ obj: span });
                }
            },
            {
                regex: /Strike!/,
                handler: function (_, module) {
                    module.push({ linebreak: true });
                }
            },
            {
                regex: /Module disarmed./
            }
        ]
    },
    {
        moduleID: "SplittingTheLootModule",
        loggingTag: "Splitting The Loot",
        matches: [
            {
                regex: /^\t{2}\w{2}\(\d{1,2}\)$/,
                handler: function (matches, module) {
                    const bagData = [];
                    linen--;
                    for (let i = 0; i < 3; i++) {
                        const bagInfo = readTaggedLine().trimStart("    ").split(",   ");
                        readLine();
                        const colors = readTaggedLine().trimStart(" ").split(",   ");
                        readLine();
                        for (let n = 0; n < bagInfo.length; n++) {
                            const values = /(\w{2})\((\d{1,2})\)/.exec(bagInfo[n]);
                            bagData.push({ label: values[1], value: values[2], color: colors[n] });
                        }
                    }

                    const diagram = $(`<svg width=30% display=block viewBox="-0.15 -0.15 0.9 0.9">`);
                    const bags = $SVG("<g fill=white stroke=black stroke-width=0.01>").appendTo(diagram);
                    const text = $SVG("<g dominant-baseline=middle text-anchor=middle>").appendTo(diagram);
                    for (let y = 0; y < 3; y++) {
                        for (let x = 0; x < 3; x++) {
                            if (y == 0 && (x == 0 || x == 2))
                                continue;
                            const data = bagData.shift();
                            const bag = $SVG(`<circle r=0.125 cx=${x * .3} cy=${y * .3}></circle>`).appendTo(bags);
                            $SVG(`<text x=${x * .3} y=${y * .3} font-size=.1>${data.label}</text>`).appendTo(text);
                            if (data.label != data.value)
                                $SVG(`<text x=${x * .3} y=${y * .3 + 0.075} font-size=.05>(${data.value})</text>`).appendTo(text);
                            if (data.color != "Normal")
                                bag.attr("fill", `hsl(${data.color == "Red" ? 0 : 240}, 100%, 81.25%)`);
                        }
                    }

                    if (!('SolutionNumber' in module))
                        module.SolutionNumber = 1;

                    module.push({ label: module.LastLabel || `Solution #${module.SolutionNumber++}:`, obj: diagram });
                    module.LastLabel = null;
                    return true;
                }
            },
            {
                regex: /^Solutions:$/,
                handler: function () {
                    return true;
                }
            },
            {
                regex: /^(Found solutions to:|Submitted:)$/,
                handler: function (matches, module) {
                    module.LastLabel = matches[1];
                    return true;
                }
            },
            {
                regex: /^(?!-+$)(.+)$/
            }
        ]
    },
    {
        displayName: "Stack’em",
        moduleID: "stackem",
        loggingTag: "Stack'em"
    },
    {
        moduleID: "SymbolCycleModule",
        loggingTag: "Symbol Cycle",
        matches: [
            {
                regex: /^((Left|Right) cycle|Solution:|Wrong solution entered:.*,|Displayed symbols:).*/,
                handler: function (matches, module) {
                    var span = $('<span>');
                    var txt = matches[0];
                    var data;
                    while ((data = /^(.*?)(\d+)(.*)$/.exec(txt)) !== null) {
                        span.append($('<span>').text(data[1]));
                        span.append($('<img>')
                            .attr({ src: 'img/Symbol Cycle/Icon' + data[2] + '.png', width: 20 })
                            .css({ verticalAlign: 'middle', margin: '0 5px', filter: 'invert(100%)' }));
                        txt = data[3];
                    }
                    span.append($('<span>').text(txt));
                    module.groups.add(span);
                    return !matches.input.includes("Wrong solution entered:");
                }
            },
            {
                regex: /Wrong solution entered:/,
                handler: function (matches, module) {
                    if (!matches.input.includes(",")) {
                        module.groups.add(matches.input);
                    }

                    module.groups.addGroup();

                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "symbolicCoordinates",
        loggingTag: "Symbolic Coordinates",
        matches: [
            {
                regex: /(The .+ display is) ([PLACE ]+)\. The LEDs are (.+), (.+) & (.+)\./,
                handler: function (matches, module) {
                    var conversion = {
                        P: 'Stain',
                        L: 'Vortex',
                        A: 'Tunnel',
                        C: 'Pluto',
                        E: 'Flag'
                    };
                    var colors = {
                        purple: '#808',
                        aqua: '#0ff',
                        yellow: '#ff0',
                        green: '#080'
                    };
                    function color(name) {
                        return `<span style='display: inline-block; width: 1em; height: 1em; border-radius: 50%; background: ${colors[name]}'></span> ${name}`;
                    }
                    module.groups.prefix = "Stage #";
                    module.groups.addGroup(true);
                    module.groups.add({ label: `${matches[1]}:`, obj: `<div>${matches[2].split(' ').map(x => `<img src='../HTML/img/Symbolic Coordinates/${conversion[x]}.png' />`).join(' ')}</div>` });
                    module.groups.add($(`<span>The LEDs are ${color(matches[3])}, ${color(matches[4])} and ${color(matches[5])}.</span>`));
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module) {
                    module.groups.add(matches.input);
                }
            }
        ]
    },
    {
        moduleID: "sync125_3",
        displayName: "SYNC-125 [3]",
        loggingTag: "SYNC-125-3"
    },
    {
        moduleID: "SynchronizationModule",
        loggingTag: "Synchronization",
        matches: [
            {
                regex: /Light speeds:/,
                handler: function (matches, module) {
                    module.push({ label: "Light speeds", obj: pre(readMultiple(3)) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Tax Returns",
        moduleID: "taxReturns",
        loggingTag: "Tax Returns",
        matches: [
            {
                regex: /Your (have|must)(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: "You " + matches[1] + " " + matches[2] });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Ten-Button Color Code",
        moduleID: "TenButtonColorCode",
        loggingTag: "Ten-Button Color Code",
        matches: [
            {
                regex: /^(.*:) ([RGB]{10})$/,
                handler: function (matches, module) {
                    let colors = {
                        R: '#fd4238',
                        G: '#00e317',
                        B: '#2583ff'
                    };
                    let cells = Array(10).fill(null).map((_, ix) => `<td style='background: ${colors[matches[2][ix]]}; width: 25px; border: 5px solid black;'></td>`);
                    let rows = Array(2).fill(null).map((_, row) => `<tr style='height: 40px'>${cells.slice(5 * row, 5 * (row + 1)).join('')}</tr>`);
                    module.push({ label: matches[1], obj: `<table>${rows.join('')}</table>` });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "TetraVex",
        moduleID: "ksmTetraVex",
        loggingTag: "TetraVex",
        matches: [
            {
                regex: /Intended solution:/,
                handler: function (matches, module) {
                    module.push({ label: "Solution:", obj: pre(readMultiple(11).replace(/\[TetraVex #\d+\] /g, "")) });
                    return true;
                }
            },
            {
                regex: /Submitted solution:/,
                handler: function (matches, module) {
                    module.push({ label: "Submitted:", obj: pre(readMultiple(11).replace(/\[TetraVex #\d+\] /g, "")) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Thread the Needle",
        moduleID: "threadTheNeedle",
        loggingTag: "Thread the Needle",
        matches: [
            {
                regex: /(Wheel #(\d)( \(Bonus\))?:) (.+)/,
                handler: function (matches, module) {
                    module.push({ label: matches[1], obj: pre(matches[4]) })
                    return true;
                }
            },
            {
                regex: /.+/,
            }
        ]
    },
    {
        displayName: "Tic Tac Toe",
        moduleID: "TicTacToeModule",
        loggingTag: "TicTacToe",
        matches: [
            {
                regex: /Keypad is now/,
                handler: function (matches, module) {
                    var step = [];
                    module.Step = step;
                    module.StepCount = (module.StepCount || 0) + 1;

                    module.push(["Step " + module.StepCount + ":", step]);

                    step.push({ label: matches.input, obj: pre(readMultiple(3)) });

                    step.push(readLine()); // up next
                    step.push(readLine()); // current row
                    return true;
                }
            },
            {
                regex: /Next expectation is|Clicked/,
                handler: function (matches, module) {
                    module.Step.push(matches.input);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Burnt",
        moduleID: "burnt",
        loggingTag: "Burnt",
    },
    {
        displayName: "The Button",
        moduleID: "BigButton",
        loggingTag: "ButtonComponent"
    },
    {
        displayName: "The Time Keeper",
        moduleID: "timeKeeper",
        loggingTag: "TimeKeeper"
    },
    {
        displayName: "Tennis",
        moduleID: "TennisModule",
        loggingTag: "Tennis",
        matches: [
            {
                regex: /^Initial score: (.*)$/,
                handler: function (matches, module) {
                    module.push({ label: 'Initial score:', obj: $('<pre>').text(`        ${matches[1]}`) });
                    return true;
                }
            },
            {
                regex: /^. = [01]{5}$/,
                handler: function (matches, module) {
                    module.TennisLastHeading = matches.input;
                    return true;
                }
            },
            {
                regex: /→/,
                handler: function (matches, module) {
                    if (!('TennisLines' in module))
                        module.TennisLines = [];
                    module.TennisLines.push(matches.input);
                    if (module.TennisLines.length % 5 === 0 || matches.input.includes('wins.')) {
                        module.push({ label: module.TennisLastHeading || 'SN character:', obj: $('<pre>').text(module.TennisLines.join("\n")) });
                        module.TennisLines = [];
                    }
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "The Twin",
        moduleID: "TheTwinModule",
        loggingTag: "The Twin",
        matches: [
            {
                regex: /(The final sequence is (?:now )?)(\d+)/,
                handler: function (matches, module) {
                    var div = $('<div>');
                    div.text(matches[2]).css({ "white-space": "nowrap", "overflow-x": "scroll " });
                    module.push({ label: matches[1], obj: div });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Updog",
        moduleID: "Updog",
        loggingTag: "Updog",
        matches: [
            {
                regex: /The maze is as follows: \(S = start, x = bone\)/,
                handler: function (matches, module) {
                    module.push({ label: matches.input, obj: pre(readMultiple(11).replace(/\[Updog #\d+\]: /g, '')) });
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "UltraStores",
        loggingTag: "UltraStores",
        displayName: "UltraStores",
        matches: [
            {
                regex: /^(D)(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: matches[1] + matches[2] });
                    return true;
                }
            },
            {
                regex: /^(X|Y|Z|W|V|U)(X|Y|Z|W|V|U)\((.+)/,
                handler: function (matches, module) {
                    module.push({ obj: pre(" " + matches[1] + matches[2] + "(" + matches[3]).css('display', 'block').css('margin', '0').css('padding', '0'), nobullet: true });
                    return true;
                }
            },
            {
                regex: /The rotations for stage (\d) are:(.+)/,
                handler: function (matches, module) {
                    if (matches[1] == 0) {
                        module.push({ obj: "Stage 1:" + matches[2] });
                        return true;
                    }
                    else if (matches[1] == 1) {
                        module.push({ obj: "Stage 2:" + matches[2] });
                        return true;
                    }
                    else {
                        module.push({ obj: "Stage 3:" + matches[2] });
                        return true;
                    }
                }
            },
            {
                regex: /(.+)/,
                handler: function (matches, module) {
                    module.push({ obj: matches[1], nobullet: true });
                    return true;
                }
            }
        ]
    },
    {
        moduleID: "USA",
        loggingTag: "USA Maze",
        displayName: "USA Maze",
        matches: [
            {
                regex: /Using rule seed: (\d+).$/,
                handler: function (matches, module) {
                    const svg = $SVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 996 602" id="main-map">
                    <path id="usa" fill="#aaa" d="m 86.710938,1.6191406 c -2.191705,1.3966135 0.282642,5.7285311 -0.04101,6.7500004 4.344299,-1.0061584 -1.773002,2.977085 -0.539067,5.230468 -3.570873,-1.51941 0.354738,2.651673 1.779297,5.060575 -1.905999,5.029026 2.52316,8.224157 -3.509733,11.339816 -0.955932,4.428328 -1.054313,7.361913 -3.541011,11.330112 -1.755589,-2.288194 -7.620256,6.209185 -7.699256,0.419855 0.225252,2.409969 -4.509397,-0.367874 -1.900429,-0.949257 4.743975,-5.199351 3.890512,0.653176 6.050773,-2.111328 0.775834,4.665366 5.328206,-6.891151 1.369141,-4.900421 0.98437,-1.95204 1.13777,-2.783072 4.121094,-4.458991 1.643028,-7.139242 -5.471387,3.700782 -9.431595,3.619252 1.391945,3.759606 -2.545272,5.690816 -0.888672,0.181647 5.351165,-6.335304 6.165869,-5.964427 5.949221,-4.16988 4.426936,-1.037987 2.116765,-13.87446 0.701169,-5.58013 -1.45142,-3.632186 -3.996774,-4.005716 -10.710938,-6.5 C 63.320568,17.581911 54.123681,2.960017 54.390625,8.4296879 48.201096,14.635053 56.233581,22.786972 52.749964,30.679791 c -1.922488,9.615003 2.445359,7.811743 3.800785,11.089815 -4.596177,0.455779 -6.321222,1.886821 -2.111292,3.919926 4.295228,3.529566 -3.391188,1.827052 -1.308599,7.169843 -2.698633,3.311646 -2.075507,-10.027001 -3.210938,1.740234 6.586214,2.863567 8.853903,6.275118 0.76949,2.5098 -4.450856,17.995043 -14.128219,40.50729 -23.151285,59.123541 -6.814154,5.87981 -8.384064,14.33411 -9.848848,22.41747 -1.516365,16.88213 8.597133,5.87313 -0.208949,17.16016 1.202313,11.94418 -9.1247047,19.58469 -13.2421856,29.04865 2.1545467,7.77737 9.0667016,17.10815 2.7109351,25.00007 -5.7903327,12.60508 10.5723675,21.35968 6.4414115,33.61132 7.097911,14.35043 6.566626,-0.52371 11.27016,1.92216 -4.111973,1.70329 -4.062895,16.80582 -1.260294,13.68774 -3.854208,-2.48133 -1.66297,-13.50155 -5.140226,-4.02106 -2.439132,6.2494 -0.600139,17.1181 6.66953,17.81056 2.833603,6.69215 -9.269351,11.86812 -1.810515,17.64042 3.362708,10.33014 8.23972,20.07811 12.820292,29.83982 -3.984569,7.53267 -3.618064,17.39327 7.040979,16.9199 6.122429,3.07074 13.033856,4.45019 15.15039,12.55052 3.514822,3.73389 15.021066,2.57487 10.539092,10.25971 5.160686,2.57847 10.779469,6.21096 13.800781,12.6801 7.868331,6.50679 -2.997208,23.99013 11.425932,21.79344 12.95601,1.53186 25.92749,3.07356 38.87306,4.61691 -7.86409,8.70175 15.38064,12.49871 20.37545,18.65988 20.972,10.78887 39.72499,28.4146 64.52809,28.47679 11.59822,1.7106 23.19097,3.43861 34.82717,4.87321 -2.95729,-18.20982 17.67717,-5.81231 27.93984,-7.06074 10.58699,-2.69857 7.834,9.68909 16.25982,11.28141 5.33457,8.24525 11.84577,13.44759 18.66039,19.5293 4.72409,8.92449 1.14696,21.94853 11.98046,26.88086 5.10479,6.52596 13.26017,9.52411 19.63109,13.49023 6.74501,-4.22212 7.48772,-18.94066 17.2695,-18.77148 5.55054,2.50807 15.48346,1.60219 19.04883,3.16988 5.55341,7.38383 15.57109,14.30236 17.17188,25.78148 3.59044,4.54288 2.6638,10.97492 9.0586,14.41019 0.25157,7.07699 10.00363,8.58947 10.06079,15.28905 -1.43923,3.2987 2.53318,5.07733 0.50986,8.85004 5.85538,3.10188 3.14943,16.16368 12.77928,15.40042 6.43758,3.71112 12.93818,8.59941 21.08009,7.68785 5.49746,5.36993 15.58616,4.62039 8.73047,-4.26958 -1.04043,-6.61197 -6.04302,-16.00968 -1.19943,-19.96851 3.15589,-5.84723 -10.05066,-1.18084 0.67941,-4.65034 5.79266,-5.02258 -2.19018,-10.18587 2.99044,-12.72069 4.7707,-0.20177 13.79572,-10.1851 11.75977,-10.54929 10.2336,-0.097 2.4969,-4.40135 1.32028,-8.26178 3.28171,4.04429 15.3785,-3.22698 5.26977,7.29096 11.58531,-5.7378 23.07619,-13.03143 33.25022,-21.62105 -12.11124,-0.044 0.69171,-16.63308 0.35945,-6.73827 6.85506,-1.86462 2.63501,3.28991 -0.3401,5.7794 9.81213,-7.04021 23.45684,-11.765 35.71096,-8.39048 5.61553,3.64393 12.76252,3.45306 18.41057,2.41992 12.15575,2.96425 0.42919,-1.61208 -2.50995,-3.32995 4.49714,-3.27148 10.4852,-1.61572 12.46903,3.70088 12.56238,-0.40672 -0.79687,7.1901 9.7717,7.26428 10.28935,7.87052 4.6417,-2.0889 10.59944,-1.5941 2.29235,-0.80378 8.24908,0.18122 4.38862,3.45875 -0.15296,2.51415 11.61097,-8.01696 4.92008,-3.37888 -3.32412,-4.30537 6.9756,-9.55361 4.22842,-2.5507 7.05884,-2.17132 13.44002,10.76667 17.31045,1.74992 -1.95089,-4.88724 -17.18636,-2.43312 -13.59007,-9.81054 8.55366,1.7964 -6.90508,-3.84446 4.09959,-2.42964 4.67943,-3.61831 -3.37778,-11.58356 -3.58982,-2.98047 -7.91284,0.65795 -4.08378,-4.61531 0.99023,-6.95899 0.87611,-4.10616 12.59526,-7.31699 19.93097,-4.6771 5.0141,-1.46759 7.54194,-4.41259 9.65939,-8.87386 8.03113,6.82385 -3.36517,13.90088 10.35546,8.05273 13.25987,-4.68217 29.0879,-6.4274 40.48438,3.38886 4.94576,3.76035 6.31246,7.75714 13.70925,3.1389 2.56654,-5.83691 11.38503,-1.831 8.7204,-8.10936 8.50216,-4.44702 17.6685,4.11171 20.74022,10.32053 5.62252,4.27609 9.1747,7.10188 13.73047,8.51956 8.79301,7.98871 -2.43119,22.4945 4.69893,30.43972 0.034,4.86189 6.00599,-6.6343 -0.48052,-5.49024 5.18756,0.3293 9.32857,3.68478 6.96095,2.15016 -3.55384,5.63889 -6.99582,9.39581 -0.25977,13.98047 3.19488,3.1214 6.50737,13.61122 8.77957,7.39063 -0.75424,-8.59373 4.79809,4.99671 -0.25024,3.50978 1.33565,5.4907 9.22163,3.10576 9.50018,11.2793 1.21351,9.90036 5.80842,1.65537 10.65043,5.79099 3.1594,5.0137 6.32202,8.24778 6.61954,13.76954 5.92365,-0.0153 11.29655,-1.56902 14.48047,-4.75974 4.01603,-2.39258 -1.77049,-10.23035 3.23035,-11.30077 1.82955,1.26214 -0.6202,-13.30231 -0.24345,-18.41025 -0.35161,-15.5548 -17.44191,-26.22113 -17.64706,-41.09954 -2.51642,-8.42149 -14.10194,-16.01475 -17.38837,-25.83058 -5.38234,-12.92963 -12.53732,-25.42434 -6.67136,-38.95437 1.24221,-2.91217 0.1699,-8.42585 0.43069,-7.99533 5.76102,-2.31596 3.0321,-8.72537 6.34891,-10.57034 5.72986,-3.75536 3.90336,-9.96677 5.45901,-8.93937 6.94651,-2.92517 12.51157,-10.92868 14.92037,-15.46097 7.96987,-0.44216 3.01206,-14.27367 10.58057,-19.00018 3.46004,-5.283 12.73197,-4.30294 14.99049,-6.61934 0.0919,-12.0827 13.873,-23.16128 23.41038,-21.94187 10.45251,-19.15902 -0.0681,0.0894 2.06054,-8.71874 -3.59656,0.49504 -7.43482,3.67465 -4.92969,-6.09958 -6.83035,-3.16746 9.83639,1.8034 8.09985,-5.52157 3.65436,-3.06459 6.35781,-9.52632 -0.33008,-11.8483 -2.8444,1.81705 -8.45159,0.82685 -12.9707,3.73025 -4.56292,-0.32962 8.08222,-8.1126 11.92942,-7.87128 5.64026,4.27055 -4.11899,-5.95146 -3.33977,-6.00978 -1.97822,-2.19181 -0.44953,-6.56776 -0.19924,-5.16016 4.08158,4.74685 -4.49445,-9.02622 -2.51953,-5.97855 -1.46736,2.24899 -0.38407,1.5656 -2.5411,1.00945 -0.45845,-0.49456 -4.73753,-0.88826 -2.24996,0.73994 1.43122,3.03554 -2.95348,-1.77287 -4.45866,2.71837 2.71566,-4.30873 -3.56549,-3.41187 -4.05071,-7.51957 -1.65035,0.97227 -6.38093,0.0272 -6.41016,-1.27933 -1.72367,0.87956 -8.34075,0.3803 -1.37904,-0.31037 1.1184,1.12984 4.69228,0.34585 4.37896,-0.17968 1.55608,2.30725 4.93795,0.0847 6.47049,3.42028 -0.28558,-1.3736 3.34966,4.34363 4.68949,0.34968 0.50546,0.71876 -0.16574,-3.39601 -1.2187,-0.38082 -0.86777,-1.87207 1.93912,-2.17558 -1.22072,-2.32994 -1.30772,0.47166 1.68172,-2.24031 -2.8505,-1.5585 -4.53944,-2.42303 -6.79564,-7.61505 -9.15041,-4.87136 -2.13621,-1.38017 1.01382,-0.52117 2.18933,-0.76978 1.11244,-1.08428 8.56563,8.5573 8.96088,3.75971 -2.95267,-2.03154 -2.78059,-6.34479 -1.38086,-3.12898 2.1217,1.2903 2.245,0.87243 3.77947,2.26979 0.0768,-3.51582 -1.33147,-4.06636 -1.398,-3.38114 -1.18314,-1.07528 -6.61868,0.12093 -0.95133,-1.13838 1.47813,-1.68298 -6.75748,-0.007 -5.94917,-3.60152 -5.0945,-2.609 -8.90526,-7.74268 -11.66013,-7.58035 4.38413,-0.98233 7.65933,6.23016 11.53932,6.09159 1.1852,2.09814 3.90065,4.12332 2.38956,0.8706 2.16559,0.61613 0.14717,2.75296 4.10925,2.17949 -1.52855,-0.2849 0.12724,-4.86065 -2.82997,-5.4591 7.00003,1.08026 -3.62682,-2.81301 -3.70944,-3.54099 -1.09435,-2.35754 -2.49113,-0.29935 -5.40037,-1.31045 -3.69625,0.35918 -4.14984,-2.61384 -5.199,-4.4084 -5.58542,4.21844 -5.68025,1.56042 -4.36648,-3.74272 1.2643,-1.34936 3.29783,-5.08979 1.40527,-0.30766 -3.04353,8.38953 5.00588,1.87453 7.63088,6.16985 4.18706,0.0862 13.99304,6.92527 7.46879,-3.60962 -6.80052,-4.67583 -3.11285,-12.27578 -4.36942,-16.89086 -5.491,-1.75967 2.85642,-3.29266 0.84983,-5.92994 3.68666,1.40665 4.77144,-10.77009 5.40046,-1.53103 -8.89822,7.00075 3.51387,8.02734 -4.22656,10.90618 -0.38282,3.0883 5.67022,-2.20674 1.35755,3.9242 -2.2222,3.27669 6.46369,-0.32189 2.23806,2.99993 -2.81839,1.02568 0.71877,5.5654 3.03128,7.24018 2.75651,-0.64046 4.49026,-2.73495 4.28906,1.46122 3.31363,1.47282 1.44497,6.30483 4.94165,5.40041 2.37787,2.09035 -2.61031,4.24511 -1.81084,9.76953 -1.11773,10.50748 3.51895,10.26613 2.84907,0.74998 0.68373,-0.46852 1.30619,-2.91112 2.40053,-0.72069 1.33676,-6.85668 2.11485,-16.04928 5.52921,-19.06046 0.36609,1.51751 -5.10937,16.06075 -0.19941,4.06062 2.01216,-7.81444 0.5657,-16.71004 -6.4396,-19.81051 -2.26408,-5.99176 -11.59064,-13.82868 -6.47066,-18.1289 -4.14904,6.65783 4.82116,10.38971 8.6796,11.4394 7.37984,-4.30599 1.24793,11.67632 6.63066,2.98071 1.73679,-7.9437 8.2706,-12.89961 6.71855,-20.49046 1.55137,-3.82193 0.12692,-14.89524 -0.86881,-14.9905 -0.88254,1.96964 -6.73987,1.11453 -4.23989,-2.61904 0.68895,-4.82664 1.94158,0.91703 2.6403,-5.0901 -0.87746,5.24966 1.95347,5.80197 3.71904,4.19898 6.9026,-2.5837 -0.71999,0.1684 5.83008,-2.75004 2.69499,-3.14036 9.1223,-4.72246 12.80101,-7.09939 -2.15129,2.52341 2.33107,-2.71501 4.00979,-2.51002 6.00352,-5.96611 9.84066,-7.09069 3.40036,-5.19143 -2.94111,-0.11562 -8.95292,3.32409 -6.81046,4.37109 1.95547,-1.67076 2.31633,-4.35597 2.94918,-5.58994 -3.21765,6.33633 -13.51682,7.08093 -16.89844,9.3594 0.48271,0.87998 -2.54905,-0.25337 -3.53149,3.25006 -1.63725,-1.43124 -2.57621,2.6431 -3.94921,1.66981 2.42789,-1.2851 3.53848,-9.74885 11.20896,-11.58977 4.37424,-5.98064 13.90902,-4.81459 19.4414,-8.94956 0.64671,2.21448 6.75676,-4.94639 6.54924,-2.66052 1.14113,-4.55498 -2.00224,-6.66006 0.0996,-8.24973 -2.05452,-2.48688 -1.65073,-2.94923 0.4104,-0.26953 0.35796,-1.9312 0.0626,0.99913 1.49975,1.40789 0.41706,-6.2218 1.13383,7.44946 3.72027,2.13246 3.23905,-1.40226 5.51079,-11.0838 6.80099,-3.24044 -5.58649,7.7439 -2.48039,2.61161 2.8086,-0.34937 2.33792,-6.36291 10.42718,-1.96794 8.33989,-5.41014 1.64378,-4.12 -8.11581,-9.85907 -6.53903,-6.66028 2.71637,-0.94937 5.07348,6.73184 4.26949,4.57038 -4.3527,6.20747 -12.25158,0.65615 -11.90039,-3.55095 -3.84284,-4.93546 -9.55702,-2.19854 -6.88873,-6.01955 -0.29254,-2.33919 2.71558,-3.78937 4.12894,-6.94951 -6.0975,2.05041 -5.1448,-9.10008 -2.0899,-12.25006 1.4922,-6.53962 1.59364,-10.2746 4.5098,-16.99044 -0.32699,5.03802 7.92667,-0.22497 8.05102,-4.93945 5.28731,0.049 6.04985,-4.18085 4.61918,-7.7109 0.17473,-2.58866 0.13974,-7.758875 2.46089,-5.64056 -2.59485,3.72512 8.6702,3.93272 4.48035,1.50008 -0.47969,-2.316687 2.21111,-1.35725 1.63871,-2.388666 1.95932,-4.204396 5.03083,-3.16025 6.41055,-0.67988 1.87607,-3.640707 1.60431,-5.279181 5.99067,-7.0599 0.59873,-6.133207 6.31682,-0.312365 6.74029,-10.169922 -3.32818,-9.143383 -6.88222,-0.361386 -10.41049,-6.041012 4.20313,-9.631977 -7.42856,-4.755668 -8.36913,-9.74996 -4.63021,-10.505224 -2.83936,-31.642137 -18.41021,-31.910155 -3.3834,4.17097 -10.62695,9.770516 -11.32983,1.630804 -5.82205,3.275641 -8.72463,15.502046 -9.29075,23.089851 -0.52193,5.080397 -3.19169,12.001889 0.54083,16.160149 -3.54312,5.012596 -5.06137,12.050714 -5.71106,17.140622 -4.38724,-1.548682 -9.67811,1.027951 -8.40033,7.53913 -15.74428,4.699269 -37.47255,9.031979 -55.01949,14.260059 -6.85253,7.63771 -12.5189,16.4529 -17.73022,24.54101 7.81301,2.8702 1.4175,5.19921 5.09004,10.71873 -1.09116,3.43183 -6.77097,4.1253 -8.35941,8.58953 -6.50792,2.71426 -12.95723,4.79968 -19.89062,2.65025 -7.70313,-0.67188 -23.38375,6.4399 -13.20921,12.63083 3.49426,6.82916 -7.12789,11.81055 -10.83006,17.13867 -9.01218,8.57704 -23.00568,12.92816 -31.10955,23.71082 -5.63283,-1.19818 -13.58791,6.65692 -15.42974,3.16019 -4.35148,0.91137 -10.39506,1.69614 -1.39801,-1.14491 -1.39538,-0.86859 -15.79233,-5.90528 -12.92246,-3.556 2.59941,-4.63695 2.42857,-11.8887 6.43926,-15.06863 0.91119,-2.12101 4.02773,-11.42501 3.90039,-7.49038 5.42326,5.88148 0.40804,-14.97732 1.07033,-12.4004 -2.73146,-6.22988 -2.04273,-18.50466 -10.58005,-19.58008 -5.46414,2.77119 -12.63288,21.13271 -14.9609,5.43945 3.2038,-2.64286 5.04823,-5.11991 5.92955,-9.20873 4.92908,-4.52742 1.19261,-12.54845 -1.85914,-17.28131 5.46147,1.19613 -5.96899,-6.78011 -2.83983,-6.86945 -8.5495,-2.25212 -16.54212,-8.90787 -23.79101,-6.64063 -1.48333,2.42665 -2.38912,7.7867 2.08985,8.32038 -7.82959,0.38242 -7.17385,6.82122 -7.00977,12.92941 -3.82125,2.29616 0.01,-1.68749 -3.8399,0.84965 1.92433,-12.86247 -0.85625,-4.97738 -5.54907,-0.50973 -0.0454,1.29845 -4.54167,4.58924 -3.33991,7.39062 1.0622,7.15858 -4.42615,12.72727 -1.10123,19.18992 -3.6236,8.97043 9.91143,17.03845 6.14136,27.16185 -0.54424,9.83044 -6.92783,26.92405 -19.66119,21.99835 -4.33503,-7.77157 -8.1434,-15.54267 -6.21938,-24.51932 -6.60341,-7.87976 -0.0449,-18.58707 -1.21095,-28.3811 4.07783,-5.69407 0.76523,-14.8132 6.00966,-20.53906 -0.31697,-2.91537 5.26508,-8.99795 1.45108,-9.43944 -3.00902,2.1596 -3.42258,9.65455 -5.68153,10.32035 -3.92734,0.13871 -5.24495,10.19077 -8.50826,7.44936 0.45816,-5.03475 3.15904,-9.07468 5.69105,-11.80075 -0.43516,-2.15432 4.78625,-11.94681 7.71898,-16.42966 0.15571,-6.58765 2.07995,4.13927 6.71096,-3.79883 1.49565,1.6835 -3.08433,9.50569 2.70858,2.49983 1.29219,-5.14759 6.69517,-5.87386 12.17016,-6.08011 2.5934,-10.90993 17.31672,7.52149 15.24024,-3.75004 4.2674,1.64965 18.23172,1.91843 10.0098,-2.58016 -3.91989,1.34616 -2.58382,-12.06957 -7.9805,-6.57025 -3.04579,-1.02082 -11.9881,2.90636 -8.84954,-5.63086 -2.39271,-1.060753 -12.38507,3.54128 -18.43945,3.71077 -5.74587,3.49556 -7.81073,8.73253 -12.85933,4.04892 -8.07696,6.34089 -8.59195,-10.24098 -17.03124,-7.17972 -6.73214,0.85636 -6.12591,5.79548 -8.3984,-3.869271 -5.05473,-4.959727 -8.93894,10.042851 -17.06054,7.599611 -2.84652,2.32826 -6.74966,9.9885 -9.57252,7.90845 -4.0975,-2.63634 -7.69955,-3.14346 -10.12918,-1.33759 0.98354,-2.9252 4.65811,-10.57515 -1.70914,-7.09009 -3.03162,1.48698 -9.82194,6.36553 -15.67994,5.32021 -1.80042,-5.01891 9.04469,-8.06696 11.04883,-13.210708 5.63229,-10.62116 18.55495,-11.959345 27.08978,-18.730472 -7.47463,3.010161 -11.50935,-4.82019 -19.70822,-0.529285 -1.80303,-9.216255 -10.60206,7.237798 -14.76031,-0.460936 -4.37224,-4.38767 -11.18203,-4.106689 -17.19032,-8.525977 C 534.84402,63.09599 530.02157,70.785528 525.01953,69 c -0.65559,-3.800955 -7.03629,-1.972925 -9.60974,-3.560541 -8.36486,0.737738 -1.04662,-16.158289 -11.26001,-14.490196 3.49543,14.650611 -17.00458,5.67558 -25.85539,7.970967 C 345.93629,57.789331 213.76342,38.519026 86.710938,1.6191406 Z M 606.22656,95.392578 c 0.4695,-0.125581 -0.20831,-0.272275 0,0 z m 65.92383,26.273442 c 0.10898,0.01 -0.13033,-0.11126 0,0 z m 194.53516,85.82421 c -0.0448,-0.004 -0.0241,0.12831 0,0 z M 77.570312,6.4296875 c 1.517602,3.0869001 2.803983,1.006111 0,0 z M 81.279297,6.5 c -2.365584,-0.21748 0.04962,2.4847879 0,0 z m 1.230469,0.7304688 C 77.541786,10.414274 81.368589,8.7315007 82.699221,8.8007855 83.126473,11.896098 86.788,7.8507222 82.509766,7.2304688 Z m 3.330078,0.080078 c -0.806626,2.7031452 2.083881,3.5035022 0,0 z m -7.759766,0.7890625 c -2.415652,5.1363447 5.965256,6.0130837 0,0 z M 80.5,9.3808594 c -0.895172,1.9400236 3.008383,1.1853756 0,0 z m 4.210938,0.9492186 c -1.900829,2.34254 1.65561,1.564699 0,0 z m -2.560547,0.0293 c -4.432316,5.222491 3.383781,1.552107 -0.01953,2.640622 -0.725453,-1.438616 0.722361,-1.293079 0.01953,-2.640622 z m 0.660156,0.101563 c -0.800576,2.576118 2.288946,0.317544 0,0 z m 2.888672,0.658203 c -1.948128,2.207677 2.407447,1.991564 0,0 z m -1.089844,4.03125 c -4.286854,3.223074 -1.268671,7.11478 -0.699215,9.968751 C 86.844173,30.527182 86.312191,19.4348 84,24.269531 83.828465,19.24091 82.104606,18.157089 86,17.539062 83.588996,17.060837 86.686324,14.958355 84.609375,15.150394 Z m 2.021484,3.669921 c -3.925576,1.246457 1.584451,8.48939 -0.230464,1.79881 0.05554,-1.570783 1.99116,0.290113 0.230464,-1.79881 z m -4.65039,2.798829 c -1.854899,0.718893 0.3744,3.319919 0,0 z m -0.429688,9.121093 c -2.701137,3.220494 1.942786,4.777044 0,0 z m -0.08984,4.958985 c -4.175542,5.2177 1.879261,4.317064 0,0 z m -7.111329,2.669922 c -3.33393,0.72276 0.142983,6.076292 0,0 z m 2.78125,1.761718 c -0.948167,2.41183 2.646622,0.511269 0,0 z M 76.5,40.839844 c -2.401803,-0.0092 1.511908,1.788804 0,0 z M 75.650391,41.75 c -1.478812,1.685718 1.552205,1.032037 0,0 z M 51.5,51.480469 c -0.461923,1.966306 1.229623,1.61689 0,0 z m 557.18945,21.230469 c -0.0474,0.02767 0.0389,0.01396 0,0 z m -0.0117,0.01562 c -3.92294,0.777934 -17.87913,10.819142 -8.31927,7.883809 -0.69023,-2.033948 6.82933,-3.883052 8.31927,-7.883809 z m 11.03321,15.503907 c -6.67536,-1.046399 -18.1889,7.861565 -8.82057,11.798865 -0.92502,-5.635389 13.27167,-10.124672 8.82057,-11.798865 z m 320.82812,9.859375 c -8.03145,6.72849 6.31232,2.91198 0,0 z m -3.9082,1.490234 c -1.02093,1.556946 2.56152,1.976316 0,0 z M 579.75979,100.2793 c -2.48045,0.35858 -0.21068,3.59673 0,0 z m 362.29101,0.50976 c -1.87589,0.53724 -0.13828,1.32419 0,0 z m -11.41992,0.63086 c -1.25842,6.44395 2.07409,3.16557 0,0 z m 10.19922,1.23047 c -1.88188,0.2423 0.16632,2.00717 0,0 z m -2.66016,0.11914 c -0.32374,1.05216 1.22719,0.64002 0,0 z m -3.38086,0.13086 c -2.17095,4.95577 4.65123,2.35149 0,0 z m -357.04883,0.0195 c -4.90952,1.08958 0.78884,2.2036 0,0 z m 361.5,0.38086 c -3.13402,1.78354 2.94861,2.01914 0,0 z m -260.59961,0.21875 c -0.0646,0.02 0.0126,0.0332 0,0 z m -0.01,0.0195 c -2.4518,6.79321 5.16983,3.92888 0,0 z m 262.30859,0.89063 c -1.56586,0.58301 1.38059,0.75794 0,0 z m -364.30859,0.7207 c -5.4147,3.65172 0.21669,2.416 0,0 z m 361.98828,0.16016 c -1.07794,-0.0645 0.54706,1.12254 0,0 z m -5.56836,0.33984 c -4.90143,2.8357 5.20029,6.54968 0,0 z m 3.92969,0.59961 c -2.35597,2.4039 3.0032,3.21607 0,0 z m -297.94141,1.14062 c -1.76146,2.93316 3.07344,3.46171 0,0 z m 40.70117,0.86915 c -1.49124,2.47135 3.51185,3.29468 0,0 z m -126.46093,0.79101 c 7.78499,5.04487 -2.60819,-1.03137 0,0 z m 135.48047,3.22852 c -1.47733,1.43417 -5.56786,5.30314 2.49045,3.72076 1.42713,-1.67578 -1.05363,-3.43168 -2.49045,-3.72076 z m 245.33007,0.31054 c -0.33327,2.10581 1.24035,0.88761 0,0 z m -260.66015,6.55078 c -1.68419,0.71488 1.64232,1.50341 0,0 z m 1.74023,1.33008 c -2.18656,2.31981 7.33858,1.59067 0,0.01 z m -15.86914,3.25 c -2.70694,8.04985 4.556,2.57387 0,0 z m -19.83008,9.81836 c -4.50328,0.39996 0.11979,5.66873 0,0 z m 13.01953,4.89063 c -2.901,2.32012 4.29911,3.08699 0,0 z m -0.77929,2.88086 c -2.48248,0.24535 0.64351,2.98774 0,0 z m 256.53906,2.60937 c 1.92633,0.70966 -0.48114,0.0643 0,0 z m 1.88086,28.80078 c -2.0088,3.69502 -0.37896,6.29439 0.6105,3.34006 -0.0251,-1.19977 -0.73445,-2.21017 -0.6105,-3.34006 z m 21.08984,0.16992 c 0.0132,0.0164 0.0137,-0.0134 0,0 z m 0.01,0.002 c 2.84124,3.48729 -8.23946,2.86042 0.15026,3.57808 3.40916,0.0349 2.01819,-2.64593 -0.15026,-3.57808 z m -23.08985,0.0469 c -0.60996,1.32026 2.70606,3.1862 0,0 z m 1.09961,0.13086 c -0.47045,0.49838 0.59423,0.27709 0,0 z m 12.10938,0.51953 c -9.19769,8.30039 9.53308,1.1641 0.16989,0.19922 l -0.0898,-0.19922 z m -13.20899,1.56055 c 0.38141,3.67957 0.30663,2.96943 0,0 z m -1.40039,8.56055 c -0.0389,0.0379 0.0602,0.0457 0,0 z m 0.0117,0.0312 c -0.55601,2.44861 1.97215,2.36896 0,0 z m -6.1914,0.17773 c -2.25865,0.89051 -1.59114,2.42561 0,0 z m -3.29102,3.38086 c -1.29793,-0.0459 -0.75033,1.28795 0,0 z m 0.87109,1.28906 c 0.15296,1.8156 2.58657,0.86221 0,0 z m -3.17968,1.22071 c -2.06854,2.58689 3.5908,1.09134 0,0 z m -5.38086,9.33007 c -3.13706,2.25789 -12.96505,8.23984 -4.44923,3.5196 1.27899,-1.29055 3.37906,-2.44126 4.44923,-3.5196 z m -7.65039,4.34961 c -6.93864,3.08499 -3.82586,3.68897 0.21078,0.0604 z m -12.44141,0.97266 c -0.14527,1.20615 -0.14157,1.09925 0,0 z m -0.4082,1.09375 c -0.0508,1.13695 -0.38784,0.0378 0,0 z m -1,1.68359 c -5.35941,1.89258 0.44948,6.46069 0.14055,0.12916 z m -21.56055,63 c -2.70918,1.67745 4.46718,5.74568 0,0 z m 1.40039,3.58008 c -2.60949,2.90366 3.2834,1.63431 0,0 z m 0.7207,1.74024 c -2.39538,-0.26438 0.63865,2.83554 0,0 z m 7.21876,9.57031 0.0312,0.01 z m 1.04101,0.44922 c -2.56645,2.39728 0.003,7.53167 0,0 z m -2.50977,3.10937 c -2.07663,4.35505 0.40624,7.82646 0,0 z m 1.01954,1.66016 c -0.48685,1.20104 0.78208,0.97617 0,0 z m -0.041,1.21094 c -3.07262,4.91719 1.1333,1.52553 0,0 z m 1.43164,15.03906 c -3.33063,1.5918 1.97483,3.58127 0,0 z m 0.92969,0.42969 c 2.3e-4,0.0274 0.0727,-0.0234 0,0 z m 0.002,0.006 c 1.97405,5.39746 5.10588,11.1348 9.61715,15.71479 -3.12541,-5.36994 -7.3541,-9.82061 -9.61715,-15.71479 z m 5.91797,13.17578 c -0.26562,4.35285 5.41932,2.35919 0,0 z m 3.96875,2.98828 c 0.0153,0.0341 0.0662,-0.031 0,0 z m 0.0254,0.006 c 4.4036,6.34025 2.59249,13.72725 -4.73439,16.62498 -1.6938,3.50941 5.09067,-5.07156 7.45895,-4.38115 -0.14225,-4.06873 0.34005,-9.10287 -2.72456,-12.24383 z M 606.90046,485.1311 c 12.91348,3.22601 6.31883,8.8939 -3.65039,7.11915 -2.60883,-2.40536 2.18969,-5.753 3.65039,-7.11915 z m -5.5,0.75976 c 6.11868,3.22934 -7.32609,7.04903 0,0 z m -119.31055,49.33985 c -15.50709,7.1603 -25.21041,29.01682 -16.09964,45.09984 2.0173,13.5917 0.5634,-1.75471 -1.68972,-6.4395 -5.68261,-14.85185 6.06722,-31.80693 17.78936,-38.66034 z m 293.17969,16.41992 c -2.88545,6.01448 10.24567,6.7001 2.36128,4.8398 -0.86254,-1.44911 -2.16295,-3.09293 -2.36128,-4.8398 z m 46.90039,20.13862 c -3.17127,8.18842 -3.70609,9.64577 -7.78926,15.55081 4.50677,-4.07499 7.06973,-9.72049 7.78926,-15.55081 z m -8.58008,15.852 c -4.96162,2.83568 -1.82256,3.20941 0.1698,0.11915 z m -4.02929,3.11915 c -6.81681,3.05799 -3.73862,3.98154 0,0 z m -8.73047,1.95117 c -2.84542,1.09503 3.36133,1.06853 0,0 z m -1.81055,0.72851 c -0.68696,0.95474 -12.27719,7.56467 -4.20898,4.54092 1.08049,-2.96839 11.38967,-1.73461 4.20898,-4.54092 z m 3.29102,1.04101 c -1.19439,1.49986 1.80297,-0.20116 0,0 z m -17.27149,4.55859 c -2.64879,-0.10637 0.79575,2.39471 0,0 z" />
                    <g id="borders" stroke-width="1" stroke="#26d" fill="none">
                      <path id="id-nv" d="m 186.14,190.73 -4,-0.79 -3.62,-0.72 -4.4,-1 -2.52,-0.51 -2.08,-0.33 -24.5,-5.2 -1.93,-0.44 -6.49,-1.49" stroke="black" />
                      <path id="nv-or" d="m 136.6,180.25 -19.56,-4.47 -9.62,-2.21 -9.02,-2.28 -0.59,-0.15 -10.53,-2.68" stroke="white" />
                      <path id="co-ks" d="m 385.44,262.48 -0.6,9.93 -0.01,0.13 -0.6,10.07 -0.11,2 -0.49,8.08 -0.13,1.9 -0.5,8.01 -0.01,0.14 -0.72,12.13 -0.13,2.18 -0.39,5.9 -0.59,9.16" stroke="white" />
                      <path id="co-ok" d="m 381.16,332.11 -5.7,-0.4 -9.45,-0.78 -2.31,-0.18" stroke="white" />
                      <path id="co-nm" d="m 363.7,330.75 -1.53,-0.11 -16.75,-1.25 -13.16,-1.1 -4.87,-0.45 -2.8,-0.32 -1.19,-0.11 -9.03,-0.92 -5.22,-0.54 -8.52,-0.88 -2.55,-0.27 -4.58,-0.51 -2.34,-0.45 -7.61,-0.9 -1.1,-0.14 -16.24,-2.03 -12.03,-1.61" stroke="black" />
                      <path id="az-ut" d="m 254.18,319.16 -17.25,-2.45 -5.95,-0.9 -2.94,-0.58 -4.61,-0.7 -11.93,-1.87 -20.26,-3.41 -6.45,-1.14 -20.64,-3.84" stroke="black" />
                      <path id="nm-tx" d="m 286.37,444.65 -1.51,-1.62 -0.19,-0.25 -0.35,-0.43 -0.01,-0.27 -0.09,-0.34 0.4,-0.35 0.15,-1.21 -0.36,-0.12 0.03,-0.4 0.39,-0.19 0.79,0.06 4.23,0.45 7.33,0.77 20.89,2.13 1.37,0.13 15.95,1.43 0.86,0.07 4.98,0.41 7.69,0.6 1.14,0.09 1,0.07 1.37,0.11 1.09,0.09 0.48,0.03 0.15,-1.99 0.74,-10.01 0.75,-10.05 0.88,-9.87 0.39,-4.2 0.53,-5.84 0.88,-11.01 0.02,-0.24 0.77,-10.02 0.35,-4.77 0.4,-5.29 0.76,-10.14 0.21,-2.69 0.55,-7.3 0.44,-6.07 0.28,-3.71 0.76,-0.45" stroke="white" />
                      <path id="nm-ok" d="m 362.86,342.26 0.85,-11.55" stroke="white" />
                      <path id="ia-ne" d="m 483.76,208.24 0.58,0.04 0.22,0.09 0.18,0.25 0.07,0.27 0.01,0.36 -0.12,0.32 0.2,2.65 0.52,0.97 -0.21,1.42 1.41,3.89 2.26,4.2 0.3,4.24 2.4,4.07 0.75,2.64 0.26,4.68 1.21,0.72 -0.23,2.62 0.76,3.36 -0.54,2.73 1.55,4.6" stroke="black" />
                      <path id="mo-ne" d="m 495.34,252.36 0.97,1.41 0.23,-0.49 0.65,0.58 -0.38,0.68 -0.2,0.19 0.1,0.41 1.13,2.85 1.21,1.18 0.05,0.12 -0.01,0.04 v 0.03 l -0.02,0.42 v 0.06 l 4.3,6.04" stroke="white" />
                      <path id="ks-mo" d="m 503.37,265.88 0.01,0.22 0.11,0.16 2.12,1.92 0.86,0.55 0.43,0.16 0.34,0.13 0.06,0.02 h 0.08 l 0.67,-0.06 0.13,-0.05 0.1,-0.1 0.01,-0.02 0.6,-0.68 1.47,1.85 0.14,0.68 0.14,0.63 -0.37,0.82 -0.37,0.06 -1.27,1.12 -0.07,0.08 -0.6,0.88 -0.21,0.3 -0.7,2.1 2.39,2.62 3.17,5.02 3.4,0.91 -0.08,1.08 0.03,1.61 0.06,4.57 0.01,2.52 0.03,6.04 0.02,2.06 0.1,7.61 0.01,0.54 0.06,8.43 0.01,0.45 0.11,6.71 0.01,0.6 0.09,6.53 0.02,1.36" stroke="black" />
                      <path id="mo-ok" d="m 516.49,335.31 0.07,5.36 0.04,2.29 0.06,3.9" stroke="white" />
                      <path id="ar-ok" d="m 516.66,346.86 1.13,7.8 0.22,1.38 1.21,7.92 0.43,2.79 0.84,5.55 -0.01,0.4 -0.11,10.34 -0.05,4.75 -0.04,5.12 -0.06,7.34 -0.04,5.76 -0.05,7" stroke="black" />
                      <path id="mn-wi" d="m 554.51,109.85 -0.08,0.06 -0.22,-0.1 -0.91,-0.89 -0.43,0.03 -1.12,0.77 -0.09,0.18 -0.02,0.17 0.06,0.14 0.08,0.11 0.02,0.02 0.02,0.26 -0.22,0.56 -0.07,0.07 -0.08,0.05 -0.48,0.03 -0.44,-0.04 -0.36,-0.25 0.21,5.63 0.22,5.96 0.04,1 0.03,0.9 -2.34,1.46 -3.35,2.2 -0.8,0.7 -0.2,0.27 -0.2,0.36 -1.61,3.23 -0.65,2 -0.02,0.36 0.01,0.15 0.04,0.61 0.06,0.45 0.22,0.17 0.77,0.13 0.32,-0.05 1.27,0.69 0.79,1.5 0.32,1.62 -0.61,1.56 -0.43,0.53 -0.02,0.02 -0.19,0.18 -0.25,2 -0.34,3.03 0.05,0.76 0.4,0.85 0.35,1.62 -0.12,1.74 -0.57,2.72 1.17,0.67 1.69,1.44 0.18,0.22 0.04,0.23 1.19,1.18 0.26,0.12 0.7,0.08 2.21,0.09 0.28,0.06 0.19,0.09 0.16,0.14 0.06,0.09 0.09,1.1 1.21,0.85 2.64,1 1.81,0.87 0.88,0.85 -0.02,0.51 -0.11,0.36 0.38,0.34 0.34,1.26 0.25,0.53 5.24,3.76 2.59,0.75 2.4,3.05 0.4,2.78 1.1,5.15" stroke="white" />
                      <path id="ia-wi" d="m 570.9,182.94 0.29,1.78 -0.02,1.18 1.78,1.26 0.39,0.49 0.5,0.81 -0.06,0.29 -1.28,2.16 -0.44,1.7 0.36,2.19 0.38,1.76 1.54,3.41 0.21,0.43 1.36,0.9 0.47,0.22 0.88,0.21 2.18,0.42 0.84,0.2 0.19,0.1 0.12,0.12 1.07,1.95 0.18,0.58 0.01,0.13 -0.06,0.11" stroke="black" />
                      <path id="il-wi" d="m 581.79,205.34 3.61,-0.18 8.43,-0.49 1.5,-0.09 7.35,-0.38 0.6,-0.04 7.18,-0.39 2.76,-0.18 1.17,-0.08 6.78,-0.56 1.75,-0.18 6.74,-0.47" stroke="white" />
                      <path id="ia-il" d="m 581.78,205.34 -0.24,0.4 -0.01,0.05 0.02,0.13 0.04,0.12 0.14,0.14 0.39,0.28 1.14,0.59 1.44,1.01 h 0.01 l 0.04,0.04 1.01,1.17 0.05,0.07 0.01,0.09 -0.1,0.65 -0.1,0.22 v 0.15 l 0.24,0.53 0.01,0.03 0.48,0.6 0.02,0.01 0.29,0.23 0.31,0.2 0.71,0.23 2.97,3.54 0.19,2.41 -1.33,3.44 -1.21,1.35 -0.27,2.51 -0.89,1.2 -1.02,1.19 -3.25,1.61 -1.38,0.35 -0.59,0.02 -0.25,-0.03 h -1.05 l -2.41,0.66 -0.65,0.23 -0.18,0.12 h -0.02 l -0.12,0.17 -0.02,0.05 -0.24,0.98 -0.2,0.79 -0.49,1.97 0.03,0.21 1.16,1.4 0.55,0.27 0.23,-0.03 0.14,0.06 0.15,0.15 0.81,1.33 -0.02,0.56 0.02,0.06 0.06,0.2 0.09,0.62 -0.07,1.87 -0.15,0.68 -0.1,0.14 -0.5,0.28 -0.19,0.18 -1.34,1.92 -0.06,0.3 -0.12,2.6 -1.21,1.42 -0.56,0.01 -0.46,0.03 h -0.14 l -0.93,0.34 -0.1,0.06 -0.44,0.25 -0.15,0.1 -0.05,0.06 -0.06,0.06 -0.06,0.07 -0.73,1.12 -0.03,0.17 0.06,0.19 0.35,0.17 0.29,0.42 0.1,0.28 0.01,0.23 -0.05,2.08 -0.04,0.2 -0.21,0.17 -0.53,0.19" stroke="white" />
                      <path id="il-mo" d="m 571.02,255.26 -1.28,3.06 -0.11,1.13 1.23,5.86 1.75,4.25 1.04,1.66 2.48,1.89 4.23,4.4 4.31,3.83 0.83,2.82 -0.01,0.29 -0.48,0.75 -0.02,0.07 0.04,0.16 0.96,2.56 3.77,-1 3.16,0.77 0.46,0.14 0.45,0.22 0.34,0.2 1.74,1.05 0.07,0.13 0.02,0.14 -0.06,0.53 -0.04,0.22 -1.29,1.58 0.37,1.85 -1.18,3.05 -0.08,0.28 -1.24,3.22 -0.05,0.06 -0.08,0.16 -0.26,0.89 -0.03,0.1 -0.02,0.23 0.03,0.96 0.24,1.03 0.21,0.52 0.33,0.45 0.06,0.08 0.05,0.05 1.51,1.47 0.91,0.68 5.09,4.65 4.85,1.35 3.12,5.16 0.08,0.185 0.1,0.255 0.11,0.46 h 0.01 l 0.51,0.96 0.34,0.5 0.48,0.47 0.22,0.28 0.29,0.65 0.01,0.02 0.01,0.04 0.1,0.39 0.01,0.02 -0.01,0.03 -0.07,0.71 -0.07,0.22 -0.01,0.02 -0.02,0.02 -0.02,0.02 -0.21,0.11 -0.66,0.18 0.03,2.02 0.46,0.66 1.12,2.09 0.64,1.57 1.21,0.99 3.5,0.38" stroke="white" />
                      <path id="ar-tn" d="m 607.67,354.83 0.04,0.68 0.89,0.33 0.48,0.55 -0.27,0.98 -0.98,-0.35 -0.74,0.06 -0.16,0.83 1.21,0.58 -0.22,0.82 -1.19,0.21 -0.29,0.58 -0.43,0.41 -1.04,0.36 -0.57,-0.1 -0.84,0.76 0.63,1.22 0.95,-0.5 0.7,0.73 -0.36,0.75 -1.57,0.91 0.55,0.77 0.32,1.04 -1.35,-0.31 -0.28,-0.64 -0.72,0.08 -0.06,1.11 0.52,0.7 -0.28,1.83 -0.33,0.02 -0.59,-0.63 -0.54,-1.08 -0.5,0.65 -0.88,0.3 0.14,1.13 0.35,-0.2 0.15,-0.42 0.47,-0.26 0.85,0.75 -0.29,0.37 0.13,0.59 -0.18,0.68 -1.06,0.65 0.26,0.47 h 0.94 l 0.55,0.44 0.16,0.66 -0.61,0.89 0.83,0.29 -0.09,0.82 -0.54,0.64 -1.23,-0.61 -0.42,0.45 -0.58,1.79 -1.6,0.11 -0.22,0.72 0.03,0.32" stroke="white" />
                      <path id="ar-ms" d="m 597.81,378.76 0.47,3.1 -2.1,0.77 -2.89,4.61 0.26,2.68 0.2,2.06 -0.14,0.44 -0.02,0.04 -0.04,0.03 -0.65,0.57 -0.82,0.39 -0.99,0.2 -0.99,0.19 -1.8,3.23 -0.85,1.76 -0.27,0.57 0.07,0.24 0.86,0.7 0.2,0.5 -0.11,0.77 -3.71,1.87 -1.53,6.57 -0.11,0.52 0.03,0.05 0.11,0.2 0.57,0.43 0.54,0.44 v 0.02 l -0.05,0.25 -0.34,0.29 -1.4,0.57 0.26,0.73 0.03,0.01 0.97,0.66 0.8,0.54 0.15,0.54 -0.23,0.46 -0.99,0.29 0.96,2.76 0.65,1.18 0.5,0.53 0.06,1.77 -0.62,2.52 -0.56,0.63" stroke="white" />
                      <path id="la-ms" d="m 584.29,425.44 -0.16,0.18 -0.63,1.02 -0.2,0.73 0.03,0.19 1.54,6.99 0.11,0.27 0.02,0.04 0.06,0.07 0.02,0.04 0.04,0.03 0.18,0.16 0.05,0.04 0.61,0.19 0.14,0.31 -0.44,1.47 0.03,0.37 v 0.03 l 0.06,0.08 0.08,0.13 0.02,0.04 2.14,2.28 0.14,3.32 -2.24,0.28 1.96,2.29 -3.99,5.83 -2.23,2.94 -0.19,0.35 -0.31,0.53 -0.01,0.02 -2.1,4.21 -0.05,0.09 -0.07,0.16 -0.01,0.02 -0.73,5.99 -0.47,2.48 -0.48,3.59 9.06,-0.43 2.28,-0.11 4.61,-0.26 5.1,-0.3 0.38,-0.01 3.94,-0.25 1.73,-0.11 8.32,-0.55 2.11,-0.14 0.04,0.71 -0.24,1.21 -0.2,0.44 -0.12,0.02 -0.16,0.02 -0.05,0.05 -0.26,1.08 -0.3,1.47 -0.24,1.21 -0.22,1.64 3.3,4.55 0.03,0.03 0.13,0.13 1.23,2.5 0.03,0.43 -0.18,0.47 -0.05,0.19 0.02,0.12 0.63,1.19 0.19,0.37 0.43,0.51 0.15,0.17 0.05,0.03 0.07,0.05 0.05,0.03 h 0.04 l 0.92,-0.06" stroke="black" />
                      <path id="il-ky" d="m 616.46,331.44 -0.86,-1.93 4.06,-3.95 0.1,-0.03 6.9,2.94 1.32,0.14 0.14,-0.02 0.42,-0.19 0.22,-0.6 0.27,-1.28 -0.51,-1.14 -0.22,-0.22 -0.24,-0.14 -0.76,-0.92 -0.16,-0.5 0.01,-0.15 0.52,-2.27 0.09,-0.23 0.23,-0.3 0.16,-0.11 0.13,-0.1 0.31,-0.14 0.11,-0.05 1.05,0.34 0.46,-0.61 0.31,-0.28 h 0.02 l 0.09,-0.06 0.44,-0.26 h 0.04 l 0.11,-0.03 0.31,-0.09 2.89,-0.61 0.18,-0.04 0.34,-0.39 v -0.37 l -1.44,-1.49 -0.15,-0.26 -0.39,-1.05 -0.01,-0.02 -0.09,-0.52 -0.01,-0.03 0.03,-0.16 0.1,-0.26 0.02,-0.05 0.15,-0.25 0.29,-0.55 h 0.01 l 0.84,-0.61 0.22,-0.24 0.14,-0.25 0.09,-0.23 0.23,-0.88" stroke="black" />
                      <path id="in-ky" d="m 634.97,311 0.85,-0.01 0.63,0.41 0.37,-0.6 0.36,-0.3 -0.76,-1.38 0.16,-0.65 4.08,-0.32 0.71,-0.22 -0.13,1.59 0.98,0.26 0.74,-0.94 -0.97,-1.05 0.53,-1.61 1.09,1.08 1.44,-0.43 2.76,0.74 0.64,0.45 2.63,1.75 1.34,-2.42 1.12,-1.05 2.8,-1.85 3.2,3.32 h 0.14 l 0.24,-0.08 0.5,-0.39 1.17,-2.67 -0.14,-1.37 0.03,-0.25 0.07,-0.1 0.1,-0.06 0.37,-0.07 0.11,-0.01 3.62,-2.33 -0.06,0.65 v 0.04 l 0.01,0.16 0.01,0.11 0.02,0.04 0.13,0.45 0.11,0.16 0.04,0.06 0.09,0.06 0.81,0.54 0.78,0.31 0.13,0.02 2.6,0.13 0.54,-0.18 0.87,-0.3 0.44,-4.04 1.67,-2.76 2.5,-2.41 3.28,-3.71 -0.06,-1.45 1.24,-3.74 2.48,0.86 2.92,-2 3.89,-2.63 -0.24,-1 -1.77,-2.83 0.82,-1.85" stroke="black" />
                      <path id="ky-oh" d="m 689,275.13 3.55,0.31 2.01,-0.73 3.49,1.29 1.95,3.2 0.17,1.05 3.3,0.94 2.64,-0.28 0.61,0.08 0.22,0.08 0.11,0.09 1.57,1.62 1.39,0.69 1.03,-0.12 0.1,-0.81 0.14,-0.23 0.19,-0.13 1.4,-0.61 0.22,-0.05 0.15,0.02 h 0.03 l 0.72,0.18 1.91,0.46 0.05,0.02 0.6,0.28 1.06,0.78 0.65,-0.59 1.72,-0.23 0.45,-1.31 1.24,-1.29 0.32,-0.15 1.49,-0.67 0.48,-0.21 h 0.11 l 0.18,0.08 0.08,0.09 0.02,0.04 0.05,0.07 0.03,0.06 0.01,0.03 0.01,0.03 0.03,0.14 0.01,0.16 v 0.02 l 0.01,0.01 -0.02,0.28 0.17,0.72 0.5,1.5 0.04,0.09 0.12,0.26 0.14,0.17 0.02,0.03 0.39,0.26 0.08,0.04 2.87,1.12 1.38,2.12" stroke="white" />
                      <path id="ky-wv" d="m 730.19,286.13 0.12,1.41 0.56,0.73 0.05,0.88 -0.18,0.64 -0.45,1.97 -0.02,0.51 0.8,0.44 v 0.02 l 0.33,0.63 0.54,0.23 0.91,1.44 1.22,0.44 0.03,0.03 0.01,0.02 v 0.13 l -0.47,0.8 1.64,1.68 2.09,2.57 0.03,0.12 0.67,1.04 1.33,0.78 0.62,-0.37 0.55,1.05 1.17,1 1.18,0.26 1.07,-0.38 0.48,0.22" stroke="black" />
                      <path id="va-wv" d="m 744.47,304.42 0.62,0.23 -0.06,0.36 -0.81,0.73 -0.05,0.15 0.13,0.34 1.41,0.81 0.15,1.4 1.51,1.32 0.22,0.11 2.04,0.74 1.2,0.72 2.11,-0.42 0.06,-0.03 0.79,-0.72 0.01,-0.02 1.32,-1.4 0.73,-1.48 3.01,2.07 2.09,-1.27 2.11,-0.75 1.27,-0.54 0.75,-0.89 -0.74,-0.72 0.28,-0.49 0.11,-0.83 1.8,1.04 2.23,-1.68 0.19,-0.15 1.81,-1.43 0.86,1.24 0.79,-0.71 0.78,-0.5 0.12,-0.31 0.72,-0.41 0.36,-0.33 0.22,-0.59 -0.21,-0.1 -0.27,0.41 -0.57,-0.14 0.3,-0.28 -0.21,-0.61 0.71,-0.63 1.04,-1.25 -1.59,-1.24 1.19,-3.37 2.11,-3.29 1.24,-2.84 0.34,-0.82 -0.28,-1.71 1.42,-1.68 0.66,-0.89 -0.43,-0.88 v -0.03 l 0.01,-0.08 1.1,-1.71 0.47,-1.69 0.09,-1.63 0.03,-1.9 1.78,0.43 0.36,0.16 0.34,0.34 1.09,1.62 3.08,0.52 1.25,-1.8 1.81,-6.98 0.81,-1.82 2.46,1.27 0.96,-2.81 0.39,-0.39 0.17,-0.59 0.51,-0.23 0.08,0.55 0.63,-0.68 0.22,-0.75 0.49,-0.69 0.39,0.22 0.59,-1.32 -0.31,-0.17 0.35,-0.77 0.52,-0.96 0.56,-0.34 0.31,-0.33 0.07,-0.48 0.48,-0.64 -0.39,-0.25 -0.06,-0.25 -0.19,-0.1 0.4,-1.16 -0.4,-0.12 0.15,-0.13 0.16,-0.61 0.46,-0.8 0.22,-0.88 -0.45,-0.03 0.2,-0.77 -0.4,-0.37 2.43,-0.35 3.95,2.08 4.14,2.19 1.06,-4.57" stroke="black" />
                      <path id="ky-mo" d="m 616.6,331.46 0.65,0.84 -0.69,2.3 -0.53,0.31 v 0.53 l 1.06,0.56 -0.71,3.19 -0.6,0.7 -0.2,0.99 -0.83,0.03 -1.13,-1.1 -1.29,3.19" stroke="black" />
                      <path id="ky-tn" d="m 612.33,343 1.16,-0.18 9.36,-0.68 h 0.14 l 0.2,-0.02 5.49,-0.4 0.5,-0.03 7.98,-0.55 0.29,-0.71 -0.95,-3.44 1.07,-0.06 2.99,0.06 -0.01,0.71 2.9,-0.34 0.96,-0.11 5.56,-0.58 4.02,-0.39 0.99,-0.11 5.41,-0.65 h 3.67 l 2.75,-0.68 3.79,-0.14 4.19,-0.18 3.44,-0.21 6.42,-0.62 2.54,-0.46 0.35,-0.06 5.64,-0.35 3.36,-0.15 h 0.14 l 9.44,-0.88 0.63,-0.07 4.36,-0.5 1.04,-0.1 4.61,-0.88" stroke="black" />
                      <path id="tn-va" d="m 716.76,330.24 3.7,-0.41 8.86,-1.12 2.8,-0.3 3.97,-0.42 5.71,-0.83 0.91,-0.14 1.77,-0.24 3.85,-0.58 0.17,-0.78 1.75,-0.21 3.27,-0.44 -0.58,0.91" stroke="white" />
                      <path id="nc-va" d="m 752.94,325.68 6.03,-0.58 8.23,-1 1.17,-0.12 4.09,-0.64 3.14,-0.34 7.02,-0.99 0.47,-0.08 5.65,-0.95 3.7,-0.62 0.73,-0.14 2.3,-0.41 2.24,-0.41 1.45,-0.26 6.17,-1.12 1.12,-0.22 5,-0.93 2.39,-0.48 5,-0.96 2.64,-0.52 2.39,-0.46 8.48,-1.67 2.36,-0.52 4.47,-0.92 -0.13,-0.2 7.75,-1.44 3.19,-0.68 3.42,-0.72 4.58,-0.98" stroke="white" />
                      <path id="fl-ga" d="m 777.99,458.89 -0.3,0.03 -1.67,0.2 -1.22,0.06 -2.31,-0.26 -3.06,-0.66 -0.84,-0.56 -2.15,1.25 -0.17,2.48 0.09,0.47 0.31,0.47 0.6,0.79 0.26,0.71 0.01,1.54 -0.11,1.57 -0.1,1.59 -2.25,0.44 -0.13,-0.03 -0.41,-0.32 -0.37,-0.53 -0.19,-0.51 -0.58,-3.22 -4.03,0.25 -0.8,0.06 -2.46,0.18 -2.09,0.15 -8.84,0.61 -3.42,0.24 -0.95,0.06 -5.03,0.35 -2.61,0.17 -5.21,0.36 -1.51,0.1 -3.9,0.27 -1.97,0.14 -9.54,0.64 -3.48,-6.28" stroke="white" />
                      <path id="al-fl" d="m 707.56,461.7 -9.6,1.17 -10.6,1.23 -2.98,0.3 -3.95,0.4 -5.9,0.57 -1.89,0.14 -7.39,0.66 -8.55,0.81 -0.44,3.08 0.26,0.44 2,2.18 0.63,0.43 0.11,0.04 0.33,0.06 0.67,0.34 0.88,0.55 0.24,0.39 0.07,0.27 0.03,0.38 -0.2,5.02 -0.27,2.51 -1.27,0.57" stroke="white" />
                      <path id="nc-sc" d="m 821.31,378.1 -2.43,-1.74 -9.3,-6.65 -8.33,-6.07 -0.25,-0.18 -4.88,-3.25 -4.44,0.72 -7.3,1.06 -4.47,0.66 -4.01,0.59 -0.38,-0.07 -0.01,-0.22 -0.13,-2.35 -1.32,-1.33 -1.49,-1.53 -0.68,-0.26 -1.44,1.55 -0.62,-0.43 0.45,-1.35 -0.49,-0.75 -5.3,0.48 -0.72,0.07 -7.46,0.79 -1.98,0.2 -1.76,0.19 -4.6,0.48 -2.6,0.12 -3.83,2.01 -3.29,2.25 -2.42,0.62 -1.96,0.95 -1.78,0.86" stroke="black" />
                      <path id="ga-sc" d="m 732.09,365.52 -0.4,1.83 -1.7,1.32 -1.24,2.24 -0.31,1.74 0.37,0.62 4.77,2.93 1.15,0.8 1.17,0.16 0.21,-0.11 h 0.02 l 0.75,-0.19 0.67,-0.09 0.39,0.11 0.19,0.15 -0.01,0.06 0.63,0.97 1.99,2.8 0.71,1.84 3.34,4.12 0.79,1.2 2.84,1.69 0.12,0.03 0.27,-0.1 h 0.09 l 1.64,0.83 0.5,0.36 1.18,0.97 0.76,1.44 2.2,1.92 1.86,0.79 0.31,0.29 0.16,0.15 0.9,0.85 1.27,1.49 0.45,1.74 1.25,1.77 1.79,1.35 3.21,1.5 1.58,0.87 3.65,6.45 0.83,3.36 2.01,0.8 0.37,0.14 1.71,1.41 2.04,4.14 0.25,1.22 0.1,0.45 0.18,0.92 0.25,1 0.09,0.09 1.09,0.42 3.57,0.67" stroke="white" />
                      <path id="de-md" d="m 863.04,260.78 -5.1,1.12 -0.26,0.06 -0.68,0.15 -0.28,0.05 -0.24,0.05 -0.07,0.01 -0.9,0.17 -0.37,0.07 -1.04,0.2 -0.52,0.1 h -0.06 l -1.23,0.21 -0.54,0.09 -0.21,-0.73 -0.19,-0.66 -0.24,-0.87 -0.47,-1.67 -1.22,-4.36 -1.97,-7.01 -0.64,-2.29 -0.32,-1.13 -0.51,-1.8 -1.61,-6.01 c -0.12,-0.31 -0.19,-0.6 -0.23,-0.88 l -0.22,-0.84" stroke="white" />
                      <path id="de-pa" d="m 843.92,234.81 0.16,-0.04 0.02,-0.09 0.06,-0.22 0.09,-0.3 0.1,-0.28 0.11,-0.26 0.12,-0.25 0.13,-0.23 0.14,-0.22 0.15,-0.2 0.16,-0.19 0.17,-0.17 0.17,-0.16 0.18,-0.14 0.19,-0.13 0.19,-0.12 0.2,-0.1 0.2,-0.09 0.21,-0.08 0.21,-0.06 0.21,-0.05 0.22,-0.04 0.22,-0.03 0.22,-0.02 0.22,-0.01 0.22,0.01 0.22,0.02 0.22,0.03 0.22,0.04 0.22,0.05 0.21,0.05 0.21,0.06 0.21,0.07 0.2,0.08" stroke="black" />
                      <path id="nj-pa" d="m 854.25,193.7 -1.01,0.73 -0.48,0.52 -0.41,0.84 -0.09,0.26 -0.21,0.89 -0.03,0.31 0.07,0.07 0.03,0.38 -0.1,0.69 -0.47,1.12 -0.68,0.96 0.1,0.12 -1.87,3.5 1.63,1.92 0.06,0.14 -0.01,0.14 -0.58,1.77 -0.35,0.49 -0.26,0.03 -0.26,-0.03 -0.14,0.04 -0.29,0.69 0.18,1.39 0.42,1.64 0.11,0.21 0.19,0.36 2.47,1.01 1.3,2.62 1.67,1.01 0.11,0.06 4.64,3.56 -1,0.84 -0.73,0.08 -0.21,0.71 -1.83,1.55 -1.11,1.62 -1.31,2.43 -0.69,0.98 -2.1,0.9 -1.1,1.48" stroke="white" />
                      <path id="de-nj" d="m 849.91,231.73 -0.82,1.6 -0.23,0.79 -0.05,0.94 -0.34,0.66 0.18,1.16" stroke="black" />
                      <path id="nj-ny" d="m 868.77,205.86 0.1,-2.13 0.46,-2.35 0.12,-0.79 v -1.96 l -5.95,-1.77 -0.4,-0.12 -2.52,-0.85 -6.31,-2.21 m 11.73,17.58 0.04,-0.45 -0.14,-0.52 0.22,-0.38 0.2,-0.02 0.15,-0.29 -0.02,-0.75 -0.06,-0.21 -0.11,-0.56 0.24,-0.31 0.4,-0.11 0.65,-0.16 0.59,-0.25" stroke="black" />
                      <path id="ny-pa" d="m 854.27,193.68 -1.37,-1.34 -0.75,0.08 -1.35,0.07 -0.3,-0.14 -1.83,-0.95 -0.52,-0.5 -0.74,-0.72 -0.46,-1.05 -2.73,-4.9 -1.99,0.11 -0.66,-1.61 -0.3,-0.29 -1.01,-0.71 -0.32,-0.07 -2.06,0.46 -10.35,2.24 -0.68,0.15 -6.85,1.41 -6.16,1.23 -0.64,0.14 -10.74,2.18 -2.34,0.47 -7.63,1.44 -1.69,0.34 -4.83,0.89 -4.64,0.9 -0.74,0.13 -2.39,0.4 -9.19,1.63 -0.26,0.05 -2.28,0.39 -0.53,-3.01 -0.44,-2.55 -0.1,-0.61" stroke="white" />
                      <path id="ma-nh" d="m 909.7,143.74 -0.64,0.37 -0.55,-0.3 -0.49,0.03 -0.11,0.06 -0.13,0.06 -1.56,1.15 -0.23,1.37 -1.35,-0.02 -0.22,0.23 -0.44,0.59 0.3,1.23 h -0.77 l -0.11,0.24 -0.42,0.99 -5.55,1.28 -0.07,0.02 -0.25,0.06 -4.06,0.91 -0.49,0.11 -5.83,1.26 -2.89,0.62" stroke="black" />
                      <path id="ma-vt" d="m 883.84,154 -7.77,1.66 -1.53,0.32 -3.98,0.86" stroke="white" />
                      <path id="ma-ny" d="m 870.56,156.84 -0.15,5.65 -0.25,10.14 0.39,0.78 0.16,-0.04" stroke="white" />
                      <path id="ct-ma" d="m 870.71,173.37 7.22,-1.53 0.74,-0.17 3.13,-0.74 0.25,0.99 0.88,-0.3 0.03,-0.97 3.96,-0.94 6.18,-1.46 0.56,-0.11 0.71,-0.15 4.29,-1.02 0.11,0.34" stroke="white" />
                      <path id="ma-ri" d="m 910.79,172.04 0.97,0.15 0.38,0.72 -0.01,0.43 0.23,0.17 0.78,2.47 m -14.37,-8.67 4.9,-1.5 1.98,-0.55 0.19,0.78 0.54,2.11 0.65,-0.3 0.03,0.29 0.34,0.6 v 0.39 l 0.14,0.19 -0.08,0.29 0.12,0.19 0.09,0.3 0.17,0.14 0.11,0.18 0.11,0.01 1.24,0.15 0.86,0.78" stroke="white" />
                      <path id="al-ga" d="m 707.6,461.56 -0.58,-1.67 -0.21,-0.46 -0.15,-0.26 -0.93,-1.02 -0.15,-0.04 h -0.17 l -0.17,-0.1 -0.2,-0.47 -0.27,-1.63 0.14,-0.6 0.21,-0.61 0.24,-4.9 -2.14,-5.33 -0.34,-0.45 0.91,-4.94 -0.05,-1.72 2.09,-4.13 0.05,-0.07 0.16,-0.72 -0.19,-0.38 -0.47,-0.4 -1.28,-0.34 -0.12,-0.14 -0.04,-0.19 0.22,-0.82 -0.53,-3.17 -1.84,-2.05 -1.39,-3.06 -1.23,-2.74 -1.54,-5.34 -0.14,-0.48 -1.86,-6.73 -0.35,-1.24 -1.08,-3.83 -1.56,-5.61 -0.39,-1.41 -0.73,-2.63 -1.29,-4.64 -1.58,-5.35 -0.41,-1.46 -0.22,-0.79 -1.51,-5.34 -0.72,-2.81" stroke="black" />
                      <path id="ms-tn" d="m 598.03,378.68 10.93,-0.67 1.49,-0.11 5.45,-0.35 2.88,-0.2 3.37,-0.25 3.63,-0.28 0.68,-0.06 7.58,-0.6 0.31,-0.02 3.05,-0.25" stroke="white" />
                      <path id="al-tn" d="m 637.4,375.89 4,-0.58 14.22,-1.1 0.23,-0.02 6.99,-0.49 0.98,-0.09 8.67,-0.85 h 0.14 l 8.33,-0.81 4.83,-0.44" stroke="black" />
                      <path id="ga-tn" d="m 685.79,371.51 2.47,-0.26 2.02,-0.22 1.83,-0.25 5.33,-0.67 3.12,-0.37 0.64,-0.08 2.87,-0.35 5.57,-0.69" stroke="black" />
                      <path id="nc-tn" d="m 709.64,368.62 -0.07,-5.08 1.52,-1.33 1.98,-0.05 0.7,-0.58 0.44,-0.59 0.75,-4.12 0.15,0.05 5.02,-3.18 h 0.43 l 2.63,-0.27 0.23,-0.15 3.19,-2.53 0.67,-0.98 -0.08,-0.44 5.11,-2.54 0.71,-3.63 0.83,-0.21 1.62,-1.52 1.16,-1.14 0.32,-0.23 0.47,-0.34 0.09,-0.01 0.28,0.18 0.35,0.34 -0.25,1.38 1.01,0.72 0.71,-0.8 0.52,-0.15 1.31,-2.4 3.28,-2.44 2.74,0.79 2.16,-4.04 0.19,-0.55 0.14,-0.37 0.85,-0.95 0.92,-0.63 0.02,-0.02 0.1,-0.06 0.11,0.26 0.48,0.15 0.29,-0.01 h 0.03 l 0.38,-0.13 -0.07,-1.1 -0.02,-4.44" stroke="black" />
                      <path id="ny-vt" d="m 870.59,156.77 -0.47,0.13 -0.7,-1.29 0.42,-1.02 -0.48,-2.23 -1.72,-8.4 -0.97,-4.53 -0.51,-1.06 -0.71,-0.15 -0.46,-0.79 -1.04,0.11 -0.04,1.28 -0.55,-0.23 -0.06,-0.09 -0.16,-1.34 0.09,-0.93 0.31,-1.7 -0.6,-1.16 -0.28,-0.51 -1.92,-4.53 -0.04,-0.08 -0.04,-0.77 v -0.75 l 0.01,-1.9 0.67,-1.92 -0.68,-2.22 0.23,-1.54 -0.03,-0.25 -0.01,-0.01 -0.3,-0.8 -0.23,-0.5 -0.76,-0.92 -0.47,-0.27 -0.27,-0.22 -0.24,-0.86 -0.21,-0.7 -0.03,-1.67 0.12,-1.86 -0.93,-0.6 -0.17,-1.03 0.32,-1.02 -0.12,-0.9 -0.61,-0.71 0.03,-0.5" stroke="black" />
                      <path id="md-wv" d="m 780.41,247.18 1.89,11.79 0.54,-0.2 1.42,-1.54 0.92,-1.71 3.27,-3.95 1.9,0.43 2.88,-3.97 2.12,0.84 3.35,-0.18 2.11359,-2.08984 0.93,0.19 0.21,-0.03 0.66836,-0.4629 0.46,-0.72 0.12,-0.14 0.11,-0.04 0.6,0.02 0.65,0.07 0.64,0.24 0.8,0.58 0.74164,0.1929 0.84,-0.31 0.67,-0.03 0.86,-0.31 0.63,-0.09 0.08,0.61 0.74641,0.78984 0.22,1.26 1.15,0.16 -0.07,1.81 0.68,0.38" stroke="black" />
                      <path id="md-va" d="m 812.55,250.77 0.69,-0.08 1.09,0.41 0.95,-0.22 0.7,0.87 1.52,0.44 -0.19,0.92 -0.51,0.19 -0.07,0.19 -0.01,0.11 -0.04,0.29 -0.02,0.21 0.01,0.02 0.12,0.39 0.11,0.14 0.11,0.08 1.14,0.77 0.03,0.01 0.63,0.04 0.86,-0.04 0.84,-0.09 0.99,0.45 0.66,0.21 0.03,0.73 0.39,0.28 0.37,-0.01 0.26,0.07 0.86,-0.1 0.55,0.47 0.75,0.55 0.77,0.41 0.52,0.97 0.09,0.95 0.04,0.28 -0.43,1.82 -0.56,0.41 -0.25,0.62 -0.72,0.05 0.96,1.01 m 28.87,9.98 0.59,-1.21 6.55,-2.23 m -13.9,4.75 1.03,-0.2" stroke="black" />
                      <path id="oh-wv" d="m 730.41,286 0.63,0.2 1.03,-0.44 1.49,-0.81 0.61,0.03 0.82,-0.32 0.31,-0.48 0.03,-0.15 0.03,-0.17 0.08,-1.65 0.01,-0.05 0.01,-1.01 0.24,-0.18 0.93,0.02 0.44,-0.3 0.11,-0.45 -0.5,-1.37 0.1,-0.62 -0.32,-0.38 -0.17,-0.68 -0.45,-0.39 0.04,-0.63 0.55,-0.38 0.46,-0.57 0.09,-0.55 -0.13,-0.75 0.32,-0.5 0.36,-1.37 0.06,-0.32 0.5,-0.5 0.32,-0.89 0.34,0.06 0.54,0.75 0.66,-0.12 0.8,1.17 -0.44,0.82 0.06,0.18 0.59,0.39 0.77,-0.36 0.24,-0.79 0.13,-0.62 0.79,0.62 0.75,-0.25 -0.01,-0.48 -0.5,-0.47 0.32,-0.93 -0.25,-0.45 -0.19,-0.23 -0.4,-0.27 -0.2,-0.15 -0.19,-0.25 -0.17,-0.29 0.72,-0.1 0.47,-0.4 -0.08,-1.17 -0.26,-0.95 0.31,-0.69 0.36,-0.08 0.01,-0.41 0.1,-0.62 0.36,-0.2 1.67,-0.16 -0.11,-1.78 0.33,-0.33 0.66,-0.64 0.46,-0.84 0.34,-0.09 0.2,0.02 0.32,0.32 0.5,0.93 0.52,0.14 1.7,-1.48 0.75,0.04 0.16,-0.72 0.4,-0.6 0.68,-0.3 0.21,-0.39 1.18,-2.3 1.32,-1.65 0.94,-0.14 0.32,-0.76 -0.05,-1.3 0.52,-0.26 -0.07,-0.6 -0.74,-0.69 0.59,-1.05 -0.15,-0.73 0.1,-0.38 0.45,-0.45 -0.53,-0.95 0.7,0.14 0.27,-0.25 -0.33,-0.82 0.29,-0.6 -0.22,-0.89 0.09,-0.75 0.01,-0.44 -0.17,-0.31 0.46,-0.71 -0.25,-1.46 0.27,-0.59 0.3,-1.38 0.6,-0.61 -0.08,-0.37 0.19,-0.8 -0.39,-0.67 0.02,-0.57 -0.52,-0.32 0.2,-0.35 -0.11,-0.65 0.21,-0.65 -0.08,-0.54 -0.43,-0.44 -0.24,-0.65 -0.43,-0.43 -0.41,-0.32 -0.06,-0.49 0.35,-0.57 0.66,-0.42 0.4,0.07 0.25,-0.27 0.69,-0.52" stroke="white" />
                      <path id="in-oh" d="m 682.46,215.37 0.47,3.81 0.29,2.39 0.43,3.56 0.05,0.43 0.72,6.06 0.19,1.54 0.54,4.47 0.42,3.58 0.57,5.06 0.12,0.98 0.71,7.03 0.21,2.03 0.49,4.39 0.42,3.67 0.12,1.04 0.51,5 0.53,4.6" stroke="black" />
                      <path id="il-in" d="m 635.24,310.9 -0.91,-2.03 0.86,-0.03 h 0.03 l 0.04,-0.03 0.01,-0.02 0.05,-0.1 0.26,-5.33 0.1,-2.41 0.03,-0.11 3.46,-4.6 1.28,-3.68 0.35,-0.94 1.41,-1.8 0.14,-0.12 0.18,-0.32 0.25,-1.46 0.01,-0.56 -0.68,-1.47 -0.04,-0.06 H 642 l -0.14,-1.15 0.11,-0.15 0.13,-0.36 0.05,-0.73 -1.28,-2.28 -0.84,-0.98 -0.36,-1.24 0.23,-2.4 0.82,-5.14 -0.27,-3.01 -0.59,-6.36 -0.51,-6.12 -0.59,-7.6 -0.03,-0.33 -0.5,-5.67 -0.56,-6.31 -0.33,-3.59 -0.27,-3.05 -0.34,-3.96 -0.46,-5.5" stroke="white" />
                      <path id="ia-mo" d="m 571.37,255.23 -1.14,-0.08 -0.73,-0.59 -1.75,-2.15 -0.06,-0.16 0.06,-0.47 -0.04,-0.15 -1.37,-1.04 -0.36,-0.23 -3.94,0.01 -4.1,0.29 -2.96,0.19 -4.97,0.34 -1.33,0.07 -6.64,0.35 -4.8,0.22 -3.17,0.09 -3.77,0.16 -4.19,0.18 -3.76,0.12 -4.15,0.1 -2.79,0.03 -4.91,-0.02 -5,-0.03 -2.97,-0.02 -6.8,-0.07" stroke="black" />
                      <path id="mi-wi" d="m 580.39,111.81 1.82,0.99 3.23,3.97 1.48,0.31 1.62,0.34 11.52,2.36 0.87,0.18 0.68,0.14 1.09,0.37 1.13,0.56 0.97,0.47 4.08,1.05 0.33,0.59 2.81,-0.3 4.68,0.59 h 0.04 l 0.4,0.06 0.61,0.3 0.38,0.25 0.25,0.16 0.47,0.68 0.05,0.07 0.02,0.08 -0.22,0.39 -0.26,0.36 -0.11,0.09 -0.28,0.36 -0.01,0.02 -0.02,0.08 0.1,0.2 h 0.02 l 0.61,0.5 0.14,0.03 0.22,0.06 h 0.02 l 0.22,-0.03 3.8,1.02 0.3,0.25 0.03,0.02 0.04,0.04 0.48,0.59 0.16,4.15 -1.57,3.44 2.21,0.04 0.84,-0.85 1.04,0.86 -1.1,3.35 0.01,0.02 0.14,0.47 0.07,0.12 1.27,1.34 h 0.02 l 0.42,0.07 0.73,0.12" stroke="white" />
                      <path id="az-ca" d="m 133.21,399.05 2.02,0.15 2.67,-1.65 0.83,-1.17 0.17,-0.6 0.19,-1.51 -0.57,-1.33 -0.06,-0.06 -0.06,-0.07 -1.67,-0.28 -0.31,-0.14 -0.89,-0.62 -0.4,-1.07 -0.01,-0.04 1.13,-6.98 1.93,-0.48 2.31,-2.73 0.75,-2.6 0.55,-2.73 0.11,-0.75 0.49,-1.76 0.54,-0.93 1.73,-2.44 2.37,-0.91 1.62,-0.67 2.41,-1.39 0.11,-1.03 -0.88,-1.55 -1.02,-1.14 -1.17,-1.41 -1.19,-5 -0.06,-0.93 -1.28,-2.01 -1.01,-2.64 -0.02,-0.12 0.03,-0.32 0.58,-2.56" stroke="black" />
                      <path id="ca-nv" d="m 145.15,347.58 -2.51,-3.74 -6.82,-10.2 -0.47,-0.7 -1.27,-1.9 -3.69,-5.54 -3.62,-5.38 -0.21,-0.31 -2.64,-3.95 -0.63,-0.95 -4.92,-7.38 -6.07,-9.08 -1.15,-1.74 -1.97,-2.93 -0.34,-0.51 -9.24,-13.88 -8.19,-12.22 -9.82,-14.77 -2.31,-3.44 -3.43,-5.14 -4.23,-6.35 -0.91,-3.45 0.24,-1.01 0.29,-1.2 0.86,-3.38 0.78,-2.88 1.64,-6.21 0.35,-1.31 1.73,-6.51 1.13,-4.3 0.33,-1.29 1.04,-4.01 2.06,-8.22 1.83,-7.14 4.7,-18.16" stroke="black" />
                      <path id="ca-or" d="m 87.69,168.4 -4.74,-1.2 -0.65,-0.17 -6.05,-1.61 -3.05,-0.82 -9.3,-2.6 -13.73,-4.09 -0.92,-0.28 -0.52,-0.17 -2.02,-0.55 -2.21,-0.55 -5.57,-1.58 -0.43,-0.12 -0.72,-0.22 -1.75,-0.64 -1.23,-0.26 -4.75,-1.33 -4.97,-1.38 -6.33,-1.99" stroke="white" />
                      <path id="id-mt" d="m 186.79,26.48 -2.37,11.1 -1.37,6.39 -1.12,5.31 0.47,0.84 3.09,6.3 0.02,0.08 0.03,0.06 0.01,0.03 v 0.09 l -0.01,1.29 -0.52,1.33 -0.44,1.01 -0.3,1.87 0.02,0.57 2.46,3.4 0.34,0.29 0.27,0.23 0.84,0.41 1.22,0.49 0.27,0.19 1.4,3.15 1.31,3.05 0.74,1.38 0.4,0.74 0.31,2.32 v 0.01 l 0.07,0.2 2.32,3.09 0.22,0.06 0.1,0.03 h 0.69 l 0.88,2.19 1.73,0.37 0.36,-0.1 0.25,-0.1 0.41,-0.08 0.83,0.11 0.28,0.23 0.07,0.07 0.09,0.09 0.06,0.27 -0.1,0.51 -0.56,1.57 -0.94,2.16 -1.41,3.13 -4.48,11.19 -0.56,3.08 -0.28,1.56 -0.02,0.08 0.05,0.06 0.71,0.1 0.63,0.16 0.2,0.09 1.18,1.86 0.14,0.57 0.66,0.1 3.15,-1.45 1.98,-1.74 1.41,-0.81 0.33,0.35 1.56,2.2 0.09,0.29 0.18,1.82 -0.01,0.68 -0.21,0.38 -0.04,1.37 0.02,1.8 2.52,9.35 2.67,3.71 0.55,-0.14 0.57,0.45 0.68,0.76 0.31,0.47 0.35,1.1 0.47,2 v 0.18 l -0.1,0.18 -0.06,0.05 -0.02,2.87 0.19,1.09 0.44,0.64 1.31,1.46 0.42,0.15 0.33,-0.18 0.16,-0.25 0.01,-0.06 0.19,-0.86 0.23,-0.36 0.63,-0.67 1.08,-0.26 5.75,1.43 2.44,-0.92 4.48,0.46 3.24,0.92 2.09,0.06 2.78,-3.19 1.83,-0.69 0.77,0.76 1.32,2.59 0.71,2.06 0.19,0.55 1.31,1.21" stroke="black" />
                      <path id="mt-sd" d="m 362.67,123.08 -0.11,1.45 -1.24,15.33 -0.7,4.92" stroke="white" />
                      <path id="sd-wy" d="m 360.62,144.78 -0.8,9.79 -0.74,8.97 -0.08,0.9 -0.57,6.61 -0.68,8.06 -0.05,0.58 -0.91,10.98" stroke="black" />
                      <path id="ne-sd" d="m 356.79,190.67 9.16,0.75 8.43,0.65 3.49,0.27 11.88,0.82 3.46,0.23 4.18,0.32 6.66,0.35 5.38,0.28 6.07,0.28 3.26,0.15 1.2,0.06 1.33,0.07 11.13,0.47 4.69,0.17 12.67,0.37 3.1,2.78 2.36,1.07 1.83,1.58 0.36,0.16 0.3,0.05 0.28,-0.01 0.85,-0.13 0.22,-0.14 0.47,-0.43 0.35,-0.51 0.43,-0.44 0.08,-0.7 1.01,-0.13 0.42,0.56 0.55,0.12 0.47,-0.69 0.6,0.15 0.41,0.59 0.58,-0.56 0.76,0.01 0.14,0.46 0.35,-0.03 0.97,-0.37 1.08,0.23 0.91,-0.39 0.75,-0.18 1,0.5 1.14,0.08 -0.06,0.99 0.99,0.78 2.08,0.6 3.52,1.32 1.37,0.87 0.19,0.42 0.1,0.39 -0.06,0.27 -0.01,0.21 0.05,0.21 1.21,1.79 3.25,0.83" stroke="white" />
                      <path id="ia-sd" d="m 484.18,208.22 -0.6,-1.67 -0.61,-1.61 -0.44,-0.7 -0.55,-0.52 -0.44,-0.34 0.67,-3.08 0.68,-1.8 1.16,-4.02 0.27,-0.71 0.05,-0.16 -0.64,-2.31 -0.16,-0.08 h -1.2 l -0.37,-0.84 -0.09,-1.07 1.09,-0.04 -0.03,-1.62 -1.22,-1.25 -0.03,-1.58 2.42,0.02" stroke="white" />
                      <path id="mn-nd" d="m 472.85,58.65 -0.07,0.07 -0.07,0.34 -0.02,0.34 0.09,0.48 1.11,3.62 0.3,0.88 0.68,1.54 -1.03,3.18 0.46,0.5 0.1,5.48 -0.51,1.95 -0.01,0.47 0.36,1.45 1.5,5.39 2.02,4.62 0.54,3.96 0.28,5.98 0.08,1.99 0.02,2.91 0.67,2.19 0.19,0.53 -0.31,5 0.01,1.29 0.68,1.99 2.21,5.32 0.61,4.82 0.05,0.4 -0.03,0.47 -0.04,0.15 -0.3,0.84 0.22,1.99" stroke="black" />
                      <path id="mn-sd" d="m 482.64,128.79 -0.09,1 v 0.05 l -0.01,0.03 -0.07,0.61 -0.06,0.5 -0.04,0.21 -0.02,0.11 -0.02,0.05 -0.02,0.03 -0.03,0.06 -1.13,1.67 -0.33,0.33 -0.62,0.34 -0.56,0.36 -1.47,1.18 -0.03,0.03 -0.03,0.04 -0.03,0.02 -0.06,0.13 -0.22,0.77 0.06,0.09 0.29,0.37 1.13,1.5 1.12,2.45 1.24,0.16 1.55,0.76 0.53,0.43 0.31,0.71 0.27,1.33 -0.02,6.7 -0.03,7.98 -0.01,2.02 -0.05,7.99 -0.05,8 -0.03,8.06" stroke="black" />
                      <path id="ia-mn" d="m 484.11,184.86 6.66,0.02 h 3.19 l 6.77,-0.04 h 1.11 l 7.87,-0.07 1.01,-0.02 6.85,-0.1 3.26,-0.05 4.6,-0.07 5.36,-0.12 2.52,-0.06 7.46,-0.22 0.41,-0.02 7.84,-0.28 1.74,-0.06 6.13,-0.25 5.82,-0.25 1.98,-0.09 6.54,-0.31" stroke="white" />
                      <path id="id-or" d="m 136.86,180.13 8.51,-37.89 1.78,-4.31 0.48,-0.8 0.78,-1.48 0.63,-2.56 0.81,-1 0.02,-0.04 0.02,-0.05 0.03,-0.06 h 0.01 v -0.02 l 0.02,-0.23 -0.06,-0.18 -0.02,-0.03 -0.85,-1.69 -0.17,-0.11 -0.64,-0.23 h -0.09 l -0.15,0.07 -2,-0.81 -0.24,-0.41 -0.03,-0.33 0.02,-0.19 0.04,-0.12 0.55,-3.78 0.2,-0.4 3.56,-4.89 0.38,-0.34 0.11,-0.05 0.39,-0.09 1.54,-0.52 0.88,-0.94 0.48,-0.51 0.38,-0.4 0.54,-0.93 0.02,-0.02 -0.02,-0.19 -0.1,-0.23 -0.06,-0.23 -0.02,-0.47 0.4,-0.84 0.51,-0.47 0.78,-0.71 2.4,-3.91 0.55,-1.15 2.78,-3.57 1.54,-1.58 0.39,-0.44 0.06,-0.29 -0.55,-2.91 -0.11,-0.44 -0.31,-0.4 -0.27,-0.35 h -0.01 l -0.59,-0.26 -1.4,-1.29 -0.73,-0.67 -0.05,-0.09 -0.07,-0.14 -1.13,-3.53" stroke="white" />
                      <path id="or-wa" d="m 158.78,90.63 -8.82,-2.06 -1.92,-0.47 -5.84,-1.41 -0.3,-0.07 -15.45,-3.7 -0.45,0.38 -0.34,0.15 -1.17,0.34 -0.57,0.09 -0.7,-0.05 -0.41,-0.1 -0.44,-0.23 -2.41,-0.33 -0.91,-0.05 -0.91,-0.06 -1.08,-0.44 -0.59,-0.32 -0.85,0.59 -0.6,0.56 -1.67,-0.16 -1.54,-0.16 h -2.2 l -2.42,0.3 -0.51,0.13 -0.84,0.64 -3.17,-0.19 -1.25,-0.22 -0.33,-0.22 -0.19,-0.28 -0.42,-0.79 -0.45,-0.32 -0.68,-0.17 -0.34,0.11 -0.69,0.33 -1.72,0.24 -1.41,0.22 -0.84,0.26 -0.35,-0.46 -1.42,-0.65 -2.04,0.83 -0.25,-1.67 -2.12,-1.25 -0.55,-0.11 -1.1,-0.16 -1.09,-0.95 -1.73,-0.03 -1.33,-0.1 -0.44,-0.11 -1.11,-0.61 -0.95,0.06 -0.68,0.35 -0.45,0.4 -5.71,0.8 h -0.3 l -0.46,-0.12 -0.52,-0.26 -4.46,-2.75 -0.43,-0.32 -0.82,-0.86 -0.31,-0.4 -0.02,-0.56 0.15,-0.42 0.34,-0.58 0.42,-2.8 0.12,-0.38 0.14,-2.19 -0.45,-2.51 -0.15,-0.61 -2.59,-3.18 -0.76,-0.31 -0.82,0.15 -2.48,-0.1 -0.12,-0.04 -0.67,-1.05 0.35,-1.03 -0.17,-0.54 -0.23,-0.42 -0.06,-0.11 -0.05,-0.03 -0.09,-0.06 -1.04,-0.06" stroke="black" />
                      <path id="ks-ok" d="m 516.8,335.19 -7.1,0.06 h -1.2 l -6.1,0.06 h -2.09 l -4.82,0.03 h -3.9 l -9.57,-0.03 -4.09,-0.02 -7.25,-0.07 -5.74,-0.07 -6.2,-0.11 -5.65,-0.11 -4.28,-0.09 -3.61,-0.11 -8.31,-0.26 -8.29,-0.28 -1.55,-0.06 -8.41,-0.39 -1.58,-0.07 -9.91,-0.41 -5.68,-0.24 -2.21,-0.11 -8.9,-0.44 -8.61,-0.47 -0.26,-0.02" stroke="white" />
                      <path id="al-ms" d="m 642.32,482.4 -1.02,-8.36 -0.74,-6 -0.34,-2.66 -0.93,-7.34 -0.76,-5.99 -0.47,-4.51 0.13,-7.71 0.05,-1.88 0.14,-6.25 0.14,-8.13 0.03,-1.44 0.14,-6.9 0.11,-5.7 0.1,-4.89 0.19,-7.28 0.02,-0.66 0.12,-5.45 0.07,-3.3 0.06,-2.76 0.19,-7.23 -2.11,-2.23" stroke="white" />
                      <path id="ar-la" d="m 584.38,425.38 -1.9,0.07 -3.28,0.13 -0.47,0.03 -11.68,0.47 -12.59,0.34 -5.06,0.1 -4.8,0.13 -4.84,0.13 h -0.59 l -5.45,0.12 h -0.19 l -4.39,0.1" stroke="white" />
                      <path id="mt-wy" d="m 360.51,144.73 -15.9,-1.5 -1.15,-0.11 -11.97,-1.2 -3.09,-0.16 -3.66,-0.4 -10.11,-1.18 -3.1,-0.38 -0.86,-0.18 -7.66,-0.94 -4.6,-0.56 -5.76,-0.71 -6,-0.81 -4.99,-0.66 -2.13,-0.29 -0.33,-0.05 -2.99,-0.55 -8.54,-1.16 -3.66,-0.57 -1.35,-0.21 -1.82,-0.09 -5.34,-0.72 h -0.04 l -2.42,-0.38 -0.71,-0.24 -2,-0.41 -2.71,-0.42 -1.4,7.6 -0.6,4.39" stroke="white" />
                      <path id="id-wy" d="m 245.62,142.84 -1.77,11.17 -1.71,11 -0.6,3.96 -1.13,7.01 -1.89,11.56 -1.87,11.68" stroke="white" />
                      <path id="ut-wy" d="m 236.65,199.22 -1.54,9.64 -1.2,7.5 -0.93,5.8 9.3,1.54 7.73,1.11 0.81,0.12 h 0.02 l 2.47,0.35 2.39,0.34 0.67,0.1 8.02,1.07 2.69,0.39" stroke="white" />
                      <path id="co-wy" d="m 267.08,227.18 13.67,1.84 5.69,0.69 10.29,1.24 7.89,0.93 9.18,1.11 2.23,0.27 15.69,1.61 5.73,0.55 15.31,1.3" stroke="black" />
                      <path id="co-ne" d="m 352.76,236.72 8.23,0.67 3.3,0.26 12.55,0.92 0.56,0.03 9.8,0.66 -0.36,5.84 -0.08,1.21 -0.39,5.96 -0.14,2.1 -0.51,8" stroke="black" />
                      <path id="ks-ne" d="m 385.72,262.37 11.19,0.69 1.52,0.08 9.88,0.53 0.35,0.03 9.53,0.46 0.27,0.02 9.63,0.39 7.84,0.28 1.96,0.06 5.95,0.19 3.88,0.11 4.03,0.09 5.99,0.14 1.93,0.04 7.91,0.13 7.93,0.11 1.94,0.02 5.98,0.05 3.93,0.02 h 7.89 l 7.84,-0.03 h 0.55" stroke="black" />
                      <path id="id-wa" d="m 158.68,90.62 -0.1,-1.59 0.76,-2.11 -0.1,-1.98 -0.15,-1.27 -0.02,-0.08 -0.5,-2.03 0.34,-1 0.59,-2.6 2.94,-13.08 0.67,-2.94 0.54,-2.39 3.03,-13.62 0.35,-1.52 4.13,-17.76 0.78,-3.38" stroke="white" />
                      <path id="ky-va" d="m 716.81,329.97 3.7,-1.99 1.06,-0.2 3.63,-2.2 0.93,-0.16 0.75,-2.49 1.68,-0.11 1.25,-0.99 0.38,-0.66 0.07,-1.74 0.79,-0.74 1.53,-0.8 -0.09,-1.92 2.53,-2.41 0.2,-0.14 0.71,-0.51 2.72,-1.53 0.68,-0.87 5.28,-6.35" stroke="white" />
                      <path id="me-nh" d="m 910.4,138.93 -2.25,-0.9 -0.62,-2.51 -0.05,-0.06 -1.94,-1.16 -0.81,-0.4 -0.3,-0.15 -0.47,-0.65 -0.15,-0.32 -0.12,-0.51 -0.28,-3.14 -2.03,-5.28 -3.28,-10.87 -3.01,-9.59 -0.24,-0.77 -3.4,-10.25 -0.62,-1.77" stroke="white" />
                      <path id="nh-vt" d="m 885.99,98.84 -0.39,0.8 1.13,1.67 -1.16,3.97 0.14,0.38 0.6,0.6 0.74,0.91 0.4,0.5 0.07,0.11 0.42,0.67 -0.54,1.08 0.32,0.92 -0.19,0.52 -0.08,0.14 -0.8,1.4 -0.07,0.1 -0.09,0.14 -0.22,0.29 -0.04,0.06 -0.52,0.38 -0.34,-0.03 -1.08,1.4 -1.13,0.71 -1.11,0.69 -0.08,0.08 -0.05,0.04 -0.54,0.97 -0.06,0.23 v 0.14 l 0.53,1.84 0.3,0.4 0.27,0.22 -0.06,1.29 0.4,0.28 -0.3,0.91 -0.44,1.73 0.53,0.44 -0.1,1.25 -0.71,1.16 0.22,1.22 0.03,0.99 -0.51,1.16 -0.31,0.21 -0.39,0.84 0.2,0.57 -0.25,1.29 0.24,0.27 -0.8,1.04 0.18,1.02 0.48,3.68 0.32,-0.02 -0.02,0.67 0.37,0.23 -0.07,2.01 0.06,1.7 0.49,1.23 -0.16,1.45 0.39,1.34 -0.98,1.04 0.21,0.92 -0.35,0.99 0.39,0.62 0.52,0.68 1.84,1.48" stroke="white" />
                      <path id="ct-ny" d="m 870.7,173.24 1.57,8.74 0.55,3.18 0.63,3.68 0.28,1.62 1.61,1.48 -2.26,2.33 -1.25,1.28 1.8,2.31" stroke="black" />
                      <path id="ar-mo" d="m 516.92,346.75 9.93,-0.16 3.87,-0.08 5.18,-0.13 4.94,-0.12 h 0.35 l 8.1,-0.24 1.5,-0.05 4.46,-0.15 6.95,-0.29 0.55,-0.03 8.22,-0.37 4.08,-0.15 0.79,-0.02 5.14,-0.27 6.27,-0.36 3.82,-0.21 6.52,-0.37 0.49,-0.03 0.72,-0.02 1.64,2.31 0.18,0.24 0.12,1.83 -0.19,0.53 -0.13,0.2 -2.01,1.77 -2.84,4.94 1.47,-0.1 6.07,-0.43 4.81,-0.31" stroke="black" />
                      <path id="in-mi" d="m 647.96,217.5 5.11,-0.49 5.06,-0.52 2.77,-0.3 4.6,-0.47 2.23,-0.24 6.24,-0.72 1.62,-0.18 6.3,-0.74 0.5,1.43" stroke="white" />
                      <path id="mi-oh" d="m 682.39,215.27 6.87,-1.05 0.65,-0.1 8.1,-1.33 1.98,-0.35 5.21,-0.88" stroke="white" />
                      <path id="ga-nc" d="m 709.64,368.5 3.58,-0.42 2.3,-0.29 1.28,-0.17 7.17,-1.05 1.22,-0.19 6.93,-1.09" stroke="black" />
                      <path id="mo-tn" d="m 612.41,342.76 -0.37,0.82 -0.46,0.41 -0.38,-0.26 -0.16,-0.85 -0.24,0.14 -0.99,0.06 0.17,1.44 0.73,1.04 0.04,1.07 -0.79,0.19 -0.96,0.25 1.19,0.82 0.43,0.82 -1.16,0.67 -1.58,-0.18 0.77,1.23 1.17,0.74 -0.15,0.86 -1.25,0.7 -0.13,1.21 -0.62,0.89" stroke="white" />
                      <path id="az-nm" d="m 236.46,448.75 3.5,-24.96 1.12,-8.02 1.37,-9.86 1.81,-13.03 2.55,-18.34 1.21,-8.72 3.3,-23.91 3.17,-22.87" stroke="black" />
                      <path id="co-ut" d="m 254.49,319.04 1.57,-11.15 1.28,-9.09 0.86,-6.24 0.79,-8.01 0.7,-5.05 0.69,-4.23 0.13,-0.88 0.61,-4.17 0.77,-5.55 0.42,-3 0.51,-3.74 3.2,-22.79 1.08,-7.96" stroke="black" />
                      <path id="md-pa" d="m 843.97,234.63 -5.96,1.28 -1.68,0.36 -0.11,0.02 -5.67,1.19 -3.74,0.78 -3.66,0.76 -3.74,0.76 -4.18,0.83 -0.17,0.03 -10.87,2.06 -4.21,0.8 -0.65,0.12 -7.39,1.36 -2.12,0.39 -7.97,1.46 -1.46,0.26" stroke="white" />
                      <path id="pa-wv" d="m 780.39,247.09 -4.98,0.88 -2.63,0.45 -8.75,1.46 -1.7,0.27 -0.9,-5.51 -0.2,-1.23 -0.53,-3.28 -0.89,-5.47 -0.3,-1.79 -0.61,-3.69" stroke="white" />
                      <path id="oh-pa" d="m 758.9,229.18 -0.8,-4.86 -0.2,-1.11 -0.83,-5.15 -0.03,-0.19 -1.34,-8.12 -0.04,-0.25 -1.31,-7.99 -0.48,-2.92" stroke="black" />
                      <path id="ct-ri" d="m 898.81,167.15 1.81,6.31 0.5,1.9 1.27,5.17 -0.42,-0.02 -0.28,0.34 0.02,0.37 0.24,0.22 0.06,0.45 0.17,0.31 0.04,0.19 -0.18,0.29 -0.07,0.38 -0.19,0.07" stroke="black" />
                      <path id="id-ut" d="m 236.69,199.22 -7.74,-1.21 -10.12,-1.64 -0.92,-0.15 -1.23,-0.32 h -0.01 l -3.55,-0.61 -4.33,-0.75 -11.63,-1.97 -0.49,-0.08 -5.58,-0.95 -0.53,-0.09 -1.43,-0.25 -0.2,-0.04 -1.34,-0.32 -1.12,-0.28" stroke="white" />
                      <path id="nv-ut" d="m 186.47,190.56 -4.35,22.59 -3.93,20.07 -0.93,4.8 -1.6,8.26 -3.82,19.69 -0.47,2.38 -1.85,9.66 -2.43,12.37 -2.61,13.76" stroke="black" />
                      <path id="az-nv" d="m 164.48,304.14 -0.69,3.58 -0.72,3.79 -0.09,0.46 -0.73,4.17 -0.44,2.32 -0.78,4.04 -2.33,3.15 -0.25,0.28 -0.1,0.06 h -0.02 l -1.12,-0.02 -0.36,-0.04 -0.1,-0.02 -0.23,-0.18 -0.16,-0.17 -0.43,-0.68 -0.13,-0.39 -0.02,-0.19 -0.01,-0.05 -0.03,-0.18 -0.22,-0.56 -0.55,-0.77 -0.25,-0.23 -2.34,-0.69 -1.06,-0.22 h -1.13 l -2.06,0.48 -0.18,0.1 -0.25,0.23 -0.02,0.15 -0.23,2.25 -0.5,6.59 -0.22,4.03 0.24,2.84 0.17,1.35 0.03,0.68 -0.13,2.81 -0.02,0.51 -0.1,0.46 -0.17,0.55 -1.72,2.88" stroke="white" />
                      <path id="ne-wy" d="m 356.7,190.64 -0.76,8.96 -1.19,14.05 -0.6,7 -0.26,3.08 -0.33,3.95 -0.78,9.03" stroke="black" />
                      <path id="la-tx" d="m 534.83,503.51 -1.34,-0.77 -0.73,-1.79 1.75,-1.43 0.14,-1.14 2.29,-3.19 0.01,-4.44 -0.6,-3.62 0.77,-0.65 0.08,-0.2 0.01,-0.12 -0.28,-1.43 -0.55,-0.67 -0.06,-0.06 0.22,-0.8 2.82,-5.31 0.35,-1.54 -0.07,-7.29 -0.91,0.24 -0.2,-1.19 -0.14,-0.75 -0.59,-2.56 -1.8,-2.61 -2.11,-2.22 -0.98,-5.92 -2.74,-3.06 -0.63,-4.97 -0.1,-4.52 -0.15,-6.94 -0.08,-4.34 -0.07,-3.19" stroke="black" />
                      <path id="ar-tx" d="m 529.14,427.03 -0.12,-5.81 -0.14,-6.49 -0.46,-0.38 -0.35,-0.14 -1.85,-0.37 -1.07,0.16 -0.28,0.03 -0.1,0.09 -1.85,0.94 -1.03,-0.56 -0.28,-0.18 -0.78,-0.5 -0.13,-0.17 -0.15,-0.34 -0.15,-0.39" stroke="white" />
                      <path id="ok-tx" d="m 520.4,412.92 -4.97,-1.43 -2.36,-0.97 -3.26,-2.61 -2.23,-1.9 -1.21,-0.4 h -0.14 l -0.06,0.03 h -0.03 l -0.41,0.62 -0.01,0.03 v 0.04 l -0.01,0.02 0.01,0.02 0.07,0.15 v 0.03 l 0.03,0.2 -0.03,0.23 -0.1,0.23 -0.11,0.1 -0.51,0.33 -0.15,0.02 -0.28,0.03 -0.55,0.07 h -0.01 l -1.29,0.06 -0.71,-0.06 -1.88,-0.25 -0.07,-0.06 -0.07,-0.13 v -0.02 l -0.01,-0.12 0.06,-0.16 0.01,-0.15 -0.2,-0.51 -0.14,-0.06 -0.62,-0.03 -1.39,0.72 -1.6,0.83 -1.63,0.62 -0.92,-0.17 -1.1,-0.22 -0.26,0.03 -0.41,0.03 -2.14,0.18 -0.96,0.22 -0.16,0.56 -0.12,0.56 -0.01,0.06 -0.02,0.06 -0.06,0.18 -0.05,0.15 -0.01,0.02 -0.02,0.03 -0.18,0.19 -0.02,0.03 -0.35,0.15 -0.39,0.11 -2.84,0.7 -0.18,-0.25 -0.83,-1.13 -0.25,-0.08 -0.22,-0.02 -0.97,0.19 h -0.03 l -0.18,-0.12 -1.95,-1.31 -0.02,-0.06 -0.02,-0.11 -0.02,-0.28 0.06,-0.37 -1.9,0.86 h -0.02 l -0.92,0.16 -1.79,-0.55 -0.19,-0.13 -0.31,-0.35 -0.96,-1.98 -0.19,0.1 -2.86,4.96 -0.09,0.12 -0.19,0.15 -0.27,0.09 -0.3,-0.04 -0.27,-0.09 -1.03,-1.69 0.68,-2.07 -1.37,-0.74 -2.71,2.38 -1.12,-0.3 -0.17,-0.11 -0.11,-0.14 -0.02,-0.04 -0.05,-0.12 -0.38,-1.72 -1.46,0.39 -0.68,-0.48 -1.94,-1.29 -0.65,0.82 -1,1.04 -0.95,0.75 -0.59,0.18 -0.23,-0.02 -1.68,-0.77 -0.21,-0.19 0.49,-1.06 0.16,-1.24 -0.71,-0.28 -0.66,0.16 h -0.43 l -0.8,-0.24 H 452 l -0.05,-0.05 -0.33,-0.66 -1.15,-1.89 -2.94,-0.92 -0.72,-0.16 -0.37,0.21 -0.76,0.96 -1.01,0.91 -0.02,0.02 h -0.01 l -0.54,-0.19 -0.9,-1.45 -0.43,-0.37 -0.42,-0.28 -0.19,-0.01 -1.72,0.53 -1.24,-0.05 -1.74,-0.43 -1.75,-1.05 -0.29,-0.13 -1.74,-0.14 -0.76,0.01 -0.35,0.02 -0.71,-0.16 -0.39,-0.12 -0.24,-0.07 -0.01,-0.01 -0.33,-1.78 0.02,-0.5 0.02,-0.53 v -0.02 l -0.89,-1.55 -0.94,-0.51 -0.83,-0.45 -0.81,1.45 -0.01,0.02 -0.03,0.04 h -0.02 l -0.14,0.06 -0.63,-0.06 -0.62,-0.59 -0.47,-0.27 -0.29,-0.12 -0.9,-0.11 -0.21,-0.03 -0.1,0.04 -0.73,0.93 h -0.89 l -0.58,-0.14 -1.32,-1.25 -0.47,-0.56 -0.98,-1.27 -2.75,-1.37 0.13,-4.28 0.27,-6.57 0.15,-3.52 0.23,-5.55 0.19,-4.55 0.25,-6.06 0.17,-4.04 0.38,-10.28 -9.95,-0.44 -7.48,-0.38 -2.4,-0.12 -9.87,-0.56 -7.48,-0.47 -2.39,-0.16 -15.37,-1.07" stroke="black" />
                      <path id="nd-sd" d="m 482.5,128.75 -10.68,-0.11 -12.05,-0.22 -0.47,-0.02 -11.5,-0.34 -4.51,-0.16 -11.43,-0.44 -2.6,-0.12 -9.93,-0.48 h -0.2 l -3.65,-0.19 -0.36,-0.02 h -0.13 l -1.93,-0.1 -1.45,-0.08 -4.66,-0.26 -1.64,-0.09 -0.93,-0.06 -2.01,-0.11 -2.43,-0.15 -2.31,-0.14 -1.94,-0.12 -0.26,-0.02 -0.16,-0.02 -15.09,-1.05 -0.86,-0.06 -16.8,-1.33" stroke="white" />
                      <path id="mt-nd" d="m 362.52,123.06 0.64,-7.66 0.52,-5.96 0.19,-2.3 1.33,-15.7 0.14,-1.54 1.16,-13.61 0.71,-8.94 0.46,-5.54 0.69,-8.29" stroke="black" />
                    </g>
                    <g id="tag-boxes" fill="#aaa" stroke="none">
                      <rect id="tag-box-vt" x="750" y="42" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-nh" x="815" y="42" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-ma" x="940" y="132" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-ri" x="940" y="172" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-ct" x="940" y="212" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-nj" x="940" y="252" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-de" x="940" y="292" width="55" height="30" rx="3" ry="3" />
                      <rect id="tag-box-md" x="940" y="332" width="55" height="30" rx="3" ry="3" />
                    </g>
                    <g id="tag-box-connectors" fill="none" stroke="#000" stroke-width="1" stroke-opacity=".33">
                      <path id="tag-connector-vt" d="M 875,103.36795 V 87 H 780 V 72" />
                      <path id="tag-connector-nh" d="m 870,57 h 18.63205 v 36.09436" />
                      <path id="tag-connector-ma" d="m 940,147 h -20 v 20" />
                      <path id="tag-connector-ri" d="m 940,187 h -35 v -6.99051" />
                      <path id="tag-connector-ct" d="M 940,227 H 885 V 187" />
                      <path id="tag-connector-nj" d="M 869.92462,231.80179 H 910 V 267 h 30" />
                      <path id="tag-connector-de" d="m 855,252 h 45 v 55 h 40" />
                      <path id="tag-connector-md" d="m 860,267 h 30 v 80 h 50" />
                    </g>
                    <path id="state-names" stroke="none" fill="#fff" d="m 101.51367,42.158203 4.65625,15.839844 h 3.04883 l 2.49609,-9.503906 0.79102,-3.648438 h 0.0234 l 0.79297,3.648438 2.51953,9.503906 h 3.02343 l 4.63282,-15.839844 h -2.64063 l -3.48047,13.824219 -3.5039,-13.824219 h -2.63867 l -3.48047,13.800781 -3.45508,-13.800781 z m 28.05078,0 -5.97656,15.839844 h 2.63867 l 1.51367,-4.152344 h 6.67188 l 1.48828,4.152344 h 2.71094 l -5.97656,-15.839844 z m 1.46289,2.232422 h 0.0723 l 0.7207,2.279297 1.82227,5.08789 h -5.1582 l 1.87109,-5.134765 z m 635.79297,4.689453 5.88086,15.839844 h 3 l 5.88086,-15.839844 h -2.71289 l -3.69531,10.560547 -0.96094,3.119141 -0.95898,-3.144532 -3.69727,-10.535156 z m 15.99024,0 v 2.207031 h 5.42383 v 13.632813 h 2.56835 V 51.287109 h 5.42383 v -2.207031 z m 48.49023,0 v 15.839844 h 2.35352 v -10.22461 l -0.0977,-2.6875 h 0.0254 l 1.53516,2.927735 6.12109,9.984375 h 3.04688 V 49.080078 h -2.375 v 10.22461 l 0.0957,2.6875 h -0.0234 l -1.56054,-2.953126 -6.09571,-9.958984 z m 17.67188,0 v 15.839844 h 2.56836 v -6.91211 h 7.82421 v 6.91211 h 2.5918 V 49.080078 h -2.5918 v 6.720703 h -7.82421 v -6.720703 z m 55.32617,19.164063 v 15.839843 h 2.37695 v -9.167968 l -0.19336,-4.367188 h 0.0254 l 4.82422,13.535156 h 2.13477 l 4.82422,-13.535156 h 0.0234 l -0.16797,4.367188 v 9.167968 H 920.5 V 68.244141 h -3.74414 l -3.16797,9.167968 -1.12891,3.767579 h -0.0469 l -1.10547,-3.767579 -3.19141,-9.167968 z m 20.90625,0 v 15.839843 h 11.80859 v -2.207031 h -9.24023 v -4.705078 h 6.96094 v -2.160156 h -6.96094 v -4.558594 h 8.90429 V 68.244141 Z M 259.8125,81.554688 v 15.839843 h 2.375 v -9.167969 l -0.19141,-4.367187 h 0.0234 l 4.82422,13.535156 h 2.13672 l 4.82226,-13.535156 h 0.0254 l -0.16796,4.367187 v 9.167969 h 2.35156 V 81.554688 h -3.74414 l -3.16797,9.167968 -1.12891,3.769532 h -0.0469 l -1.10352,-3.769532 -3.19336,-9.167968 z m 19.27344,0 v 2.208984 h 5.42383 v 13.630859 h 2.56835 V 83.763672 h 5.42383 v -2.208984 z m 128.23828,3.90625 v 15.839842 h 2.35156 V 91.076172 l -0.0957,-2.6875 h 0.0234 l 1.53515,2.927734 6.1211,9.984374 h 3.04687 V 85.460938 h -2.375 v 10.224609 l 0.0957,2.6875 h -0.0234 l -1.56055,-2.951172 -6.0957,-9.960937 z m 17.67187,0 v 15.839842 h 5.5918 c 4.968,0 7.87109,-2.831921 7.87109,-7.919921 0,-5.088 -2.90309,-7.919921 -7.87109,-7.919921 z m 2.56641,2.183593 h 3.02539 c 3.336,0 5.18359,2.088328 5.18359,5.736328 0,3.648 -1.84759,5.736329 -5.18359,5.736329 H 427.5625 Z M 77.955078,115.78711 c -4.584,0 -7.464844,3.12016 -7.464844,8.16016 0,5.04 2.880844,8.16015 7.464844,8.16015 4.608,0 7.486328,-3.12015 7.486328,-8.16015 0,-5.04 -2.878328,-8.16016 -7.486328,-8.16016 z m 11.283203,0.24023 v 15.83985 h 2.542969 v -6.33594 h 3.408203 l 4.03125,6.33594 h 2.953127 l -4.296877,-6.62305 c 2.112,-0.624 3.361327,-2.18484 3.361327,-4.46484 0,-2.976 -2.136921,-4.75196 -5.544921,-4.75196 z m -11.283203,1.99219 c 3,0 4.798828,2.15974 4.798828,5.92774 0,3.768 -1.798828,5.92773 -4.798828,5.92773 -2.976,0 -4.777344,-2.15973 -4.777344,-5.92773 0,-3.768 1.801344,-5.92774 4.777344,-5.92774 z m 13.826172,0.19141 h 3.695312 c 2.088,0 3.097657,0.83979 3.097657,2.59179 0,1.752 -1.009656,2.59375 -3.097657,2.59375 H 91.78125 Z m 405.37891,0.45703 v 15.83984 h 2.37695 v -9.16797 l -0.19336,-4.36718 h 0.0254 l 4.82227,13.53515 h 2.13671 l 4.82422,-13.53515 h 0.0234 l -0.16797,4.36718 v 9.16797 h 2.35157 v -15.83984 h -3.74219 l -3.16797,9.16797 -1.12891,3.76953 h -0.0488 l -1.10351,-3.76953 -3.19141,-9.16797 z m 20.90625,0 v 15.83984 h 2.35156 v -10.22265 l -0.0957,-2.68946 h 0.0234 l 1.53711,2.92969 6.11914,9.98242 h 3.04883 v -15.83984 h -2.37695 v 10.22461 l 0.0977,2.6875 h -0.0254 l -1.55859,-2.95117 -6.09766,-9.96094 z m 304.48828,12.53906 v 15.83985 h 2.35156 v -10.22461 l -0.0957,-2.6875 h 0.0234 l 1.53711,2.92773 6.11914,9.98438 h 3.04883 v -15.83985 h -2.37695 v 10.22266 l 0.0977,2.68945 h -0.0254 l -1.5586,-2.95312 -6.09766,-9.95899 z m 15.56054,0 5.63868,9.76758 v 6.07227 h 2.56836 v -6.07227 l 5.66406,-9.76758 h -2.87891 l -2.80859,5.08789 -1.24805,2.375 -1.24805,-2.375 -2.83203,-5.08789 z m 117.43555,7.87305 v 15.83984 h 2.37695 v -9.16797 l -0.1914,-4.36718 h 0.0234 l 4.82421,13.53515 h 2.13477 l 4.82422,-13.53515 h 0.0254 l -0.16797,4.36718 v 9.16797 h 2.35156 v -15.83984 h -3.74414 l -3.16797,9.16797 -1.1289,3.76757 h -0.0469 l -1.10547,-3.76757 -3.1914,-9.16797 z m 25.01172,0 -5.97656,15.83984 h 2.64062 l 1.51172,-4.15234 h 6.67188 l 1.48828,4.15234 h 2.71094 l -5.97657,-15.83984 z m 1.46289,2.23242 h 0.0723 l 0.7207,2.2793 1.82422,5.08789 h -5.16016 l 1.8711,-5.13477 z m -804.16016,6.45117 v 15.83985 h 2.56641 v -15.83985 z m 7.26563,0 v 15.83985 h 5.5918 c 4.968,0 7.87109,-2.83193 7.87109,-7.91993 0,-5.088 -2.90309,-7.91992 -7.87109,-7.91992 z m 2.56641,2.1836 h 3.02539 c 3.336,0 5.18359,2.08832 5.18359,5.73632 0,3.648 -1.84759,5.73633 -5.18359,5.73633 h -3.02539 z m 393.4082,0.91015 4.65625,15.83985 h 3.04883 l 2.49609,-9.50391 0.79102,-3.64844 h 0.0254 l 0.79101,3.64844 2.51953,9.50391 h 3.02539 l 4.63086,-15.83985 h -2.63867 l -3.48047,13.82422 -3.5039,-13.82422 h -2.64063 l -3.48047,13.80078 -3.45508,-13.80078 z m 25.02539,0 v 15.83985 h 2.56641 v -15.83985 z m -193.37695,2.17578 c -3.864,0 -6.16797,2.15966 -6.16797,4.84766 0,2.52 1.60717,3.84025 5.95117,4.65625 2.976,0.552 3.9375,1.19817 3.9375,2.32617 0,1.464 -1.39244,2.25781 -3.64844,2.25781 -2.376,0 -3.96019,-0.86515 -4.99219,-2.78515 l -1.80078,1.80078 c 1.224,1.968 3.36041,3.21484 6.81641,3.21484 3.744,0 6.3125,-1.79886 6.3125,-4.63086 0,-2.544 -1.56059,-3.86537 -5.80859,-4.60937 -3.072,-0.552 -4.05469,-1.22214 -4.05469,-2.49414 0,-1.344 1.22251,-2.35352 3.47851,-2.35352 2.256,0 3.48114,0.84033 4.36914,2.73633 l 1.94336,-1.75195 c -1.392,-2.16 -3.40793,-3.21485 -6.33593,-3.21485 z m 10.02148,0.23828 v 15.83985 h 5.5918 c 4.968,0 7.87304,-2.83192 7.87304,-7.91992 0,-5.088 -2.90504,-7.91993 -7.87304,-7.91993 z m 2.56836,2.18555 h 3.02344 c 3.336,0 5.18554,2.08638 5.18554,5.73438 0,3.648 -1.84954,5.73632 -5.18554,5.73632 h -3.02344 z m -145.14453,20.21289 4.65625,15.83985 h 3.04687 l 2.4961,-9.50391 0.79297,-3.64844 h 0.0234 l 0.79297,3.64844 2.51953,9.50391 h 3.02344 l 4.63281,-15.83985 h -2.64062 l -3.48047,13.82422 -3.50391,-13.82422 h -2.63867 l -3.48047,13.80078 -3.45703,-13.80078 z m 22.81836,0 5.63867,9.76758 v 6.07227 h 2.56836 v -6.07227 l 5.66406,-9.76758 h -2.8789 l -2.8086,5.08789 -1.24805,2.37696 -1.24804,-2.37696 -2.83203,-5.08789 z m 659.25976,3.41016 v 15.83984 h 2.54493 v -6.33594 h 3.4082 l 4.03125,6.33594 h 2.95312 l -4.29687,-6.62304 c 2.112,-0.624 3.35937,-2.18485 3.35937,-4.46485 0,-2.976 -2.13496,-4.75195 -5.54296,-4.75195 z m 16.125,0 v 15.83984 h 2.56836 v -15.83984 z m -13.58007,2.18359 h 3.69531 c 2.088,0 3.0957,0.8398 3.0957,2.5918 0,1.752 -1.0077,2.5918 -3.0957,2.5918 h -3.69531 z m -294.25196,2.33008 v 15.83984 h 2.37696 v -9.16797 l -0.19141,-4.36914 h 0.0234 l 4.82422,13.53711 h 2.13476 l 4.82422,-13.53711 h 0.0254 l -0.16797,4.36914 v 9.16797 h 2.35156 v -15.83984 h -3.74414 l -3.16796,9.16797 -1.12891,3.76758 h -0.0469 l -1.10351,-3.76758 -3.19336,-9.16797 z m 20.90625,0 v 15.83984 h 2.56836 v -15.83984 z m 94.63672,21.01758 v 15.84179 h 2.56836 v -5.97656 h 3.52734 c 3.408,0 5.56836,-1.84792 5.56836,-4.91992 0,-3.096 -2.16036,-4.94531 -5.56836,-4.94531 z m 17.83789,0 -5.97461,15.84179 h 2.63867 l 1.51368,-4.15234 h 6.67187 l 1.48633,4.15234 H 813 l -5.97656,-15.84179 z m -15.26953,2.18555 h 3.11914 c 2.28,0 3.3125,0.95976 3.3125,2.75976 0,1.8 -1.0325,2.73633 -3.3125,2.73633 h -3.11914 z m 16.73438,0.0469 h 0.0723 l 0.7207,2.28125 1.82227,5.08789 h -5.16016 l 1.87305,-5.13672 z m -282.28516,2.37305 v 15.83984 h 2.56836 V 209.2168 Z m 11.36914,0 -5.97461,15.83984 h 2.63867 l 1.51172,-4.15234 h 6.67188 l 1.48828,4.15234 h 2.71289 l -5.97656,-15.83984 z m 1.46484,2.23047 h 0.0723 l 0.71875,2.28125 1.82422,5.08789 h -5.16016 l 1.87305,-5.13672 z m 428.92774,7.39257 c -4.536,0 -7.43945,3.12016 -7.43946,8.16016 0,5.04 2.8789,8.16016 7.4629,8.16016 3.096,0 5.56873,-1.53546 6.55273,-4.43946 l -2.44727,-0.8164 c -0.6,2.016 -2.06407,3.02343 -4.08007,3.02343 -3,0 -4.80079,-2.18373 -4.80079,-5.92773 0,-3.768 1.94449,-5.92773 4.89649,-5.92773 1.968,0 3.14358,0.86432 3.76758,2.73632 l 2.42383,-1.08007 c -0.96,-2.568 -3.19194,-3.88868 -6.33594,-3.88868 z m 8.22265,0.24024 v 2.20703 h 5.42383 v 13.63281 h 2.56836 v -13.63281 h 5.42383 v -2.20703 z m -557.51953,3.02148 v 15.8418 h 2.35157 v -10.22461 l -0.0957,-2.6875 h 0.0234 l 1.53711,2.92773 6.11914,9.98438 h 3.04883 v -15.8418 h -2.37696 v 10.22461 l 0.0957,2.6875 h -0.0234 l -1.56055,-2.95117 -6.0957,-9.96094 z m 17.67188,0 v 15.8418 h 11.80859 v -2.20898 h -9.24023 v -4.70313 h 6.95898 v -2.16016 h -6.95898 v -4.56054 h 8.90234 v -2.20899 z M 113.2207,223.8223 v 15.83984 h 2.35352 V 229.4375 l -0.0957,-2.6875 h 0.0234 l 1.53516,2.92773 6.12109,9.98438 h 3.04688 v -15.83984 h -2.375 v 10.22461 l 0.0957,2.6875 h -0.0234 l -1.56054,-2.95313 -6.09571,-9.95898 z m 15.84961,0 5.87891,15.83984 h 3 l 5.88086,-15.83984 h -2.71289 l -3.69531,10.56054 -0.96094,3.11914 -0.95899,-3.14453 -3.69726,-10.53515 z m 583.30274,12.26757 c -4.584,0 -7.46485,3.12016 -7.46485,8.16016 0,5.04 2.88085,8.16016 7.46485,8.16016 4.608,0 7.48828,-3.12016 7.48828,-8.16016 0,-5.04 -2.88028,-8.16016 -7.48828,-8.16016 z m 11.2832,0.24024 v 15.83984 h 2.56836 v -6.91211 h 7.82422 v 6.91211 h 2.59179 v -15.83984 h -2.59179 v 6.71875 h -7.82422 v -6.71875 z m -11.2832,1.99023 c 3,0 4.80078,2.16169 4.80078,5.92969 0,3.768 -1.80078,5.92773 -4.80078,5.92773 -2.976,0 -4.77539,-2.15973 -4.77539,-5.92773 0,-3.768 1.79939,-5.92969 4.77539,-5.92969 z m -59.01563,8.08399 v 15.83984 h 2.56836 V 246.4043 Z m 7.26563,0 v 15.83984 h 2.35351 v -10.22266 l -0.0976,-2.68945 h 0.0254 l 1.53515,2.92774 6.1211,9.98437 h 3.04687 V 246.4043 h -2.375 v 10.22461 l 0.0957,2.6875 h -0.0254 l -1.55859,-2.95118 -6.0957,-9.96093 z m -60.625,5 v 15.83984 h 2.56836 V 251.4043 Z m 7.26562,0 v 15.83984 h 11.30469 v -2.20703 h -8.73633 V 251.4043 Z M 203.9707,252.8223 v 9.76757 c 0,4.2 2.27852,6.3125 6.47852,6.3125 4.2,0 6.48047,-2.1125 6.48047,-6.3125 v -9.76757 h -2.5918 v 9.45703 c 0,3 -1.22467,4.39062 -3.88867,4.39062 -2.664,0 -3.88672,-1.39062 -3.88672,-4.39062 v -9.45703 z m 15.83399,0 v 2.20898 h 5.42383 v 13.63086 h 2.56836 v -13.63086 h 5.42382 v -2.20898 z m 738.34765,6.25781 v 15.83984 h 2.35352 v -10.22461 l -0.0977,-2.6875 h 0.0254 l 1.53516,2.92774 6.12109,9.98437 h 3.04688 v -15.83984 h -2.375 v 10.22461 l 0.0957,2.6875 h -0.0234 l -1.56054,-2.95313 -6.09571,-9.95898 z m 24.58399,0 v 9.74414 c 0,2.712 -0.76741,4.10351 -3.19141,4.10351 -2.208,0 -2.92836,-1.24781 -2.56836,-4.00781 l -2.44726,0.45703 c -0.648,3.48 1.10362,5.78321 5.01562,5.78321 3.624,0 5.75977,-2.18347 5.75977,-5.85547 v -10.22461 z m -668.94531,14.0332 c -4.536,0 -7.43946,3.12016 -7.43946,8.16016 0,5.04 2.88085,8.16015 7.46485,8.16015 3.096,0 5.56678,-1.5374 6.55078,-4.4414 l -2.44727,-0.81446 c -0.6,2.016 -2.06408,3.02344 -4.08008,3.02344 -3,0 -4.80078,-2.18373 -4.80078,-5.92773 0,-3.768 1.94449,-5.92774 4.89649,-5.92774 1.968,0 3.14357,0.86238 3.76757,2.73438 L 320.12695,277 c -0.96,-2.568 -3.19193,-3.88672 -6.33593,-3.88672 z m 16.43164,0 c -4.584,0 -7.46485,3.12016 -7.46485,8.16016 0,5.04 2.88085,8.16015 7.46485,8.16015 4.608,0 7.48632,-3.12015 7.48632,-8.16015 0,-5.04 -2.87832,-8.16016 -7.48632,-8.16016 z m 0,2.23242 c 3,0 4.79882,2.15974 4.79882,5.92774 0,3.768 -1.79882,5.92773 -4.79882,5.92773 -2.976,0 -4.77735,-2.15973 -4.77735,-5.92773 0,-3.768 1.80135,-5.92774 4.77735,-5.92774 z m 409.35351,0.90821 4.65625,15.83984 h 3.04883 l 2.49609,-9.50391 0.79102,-3.64843 h 0.0234 l 0.79297,3.64843 2.51953,9.50391 h 3.02343 l 4.63282,-15.83984 h -2.64063 l -3.47851,13.82421 -3.50586,-13.82421 h -2.63867 l -3.48047,13.80078 -3.45508,-13.80078 z m 23.19922,0 5.88086,15.83984 h 3 l 5.88086,-15.83984 h -2.71289 l -3.69531,10.56054 -0.96094,3.11914 -0.95899,-3.14453 -3.69726,-10.53515 z m -705.912109,3.14062 c -4.536,0 -7.439453,3.12016 -7.439453,8.16016 0,5.04 2.878891,8.16015 7.462891,8.16015 3.096,0 5.568734,-1.5374 6.552734,-4.4414 l -2.447265,-0.81446 c -0.600001,2.016 -2.064079,3.02344 -4.080079,3.02344 -3,0 -4.800781,-2.18373 -4.800781,-5.92773 0,-3.768 1.944485,-5.92774 4.896484,-5.92774 1.968,0 3.143579,0.86238 3.767579,2.73438 l 2.423828,-1.07813 c -0.96,-2.568 -3.191938,-3.88867 -6.335938,-3.88867 z m 13.958985,0.24024 -5.976563,15.83984 h 2.640625 l 1.511719,-4.15234 h 6.671875 l 1.488281,4.15234 h 2.710938 L 73.892578,279.6348 Z m 1.46289,2.23242 h 0.07227 l 0.720703,2.27929 1.824219,5.0879 h -5.160156 l 1.871093,-5.13672 z m 721.076174,5.48047 5.88086,15.83984 h 3 l 5.8789,-15.83984 h -2.71093 l -3.69727,10.56054 -0.95898,3.11914 -0.96094,-3.14257 -3.69531,-10.53711 z m 20.17773,0 -5.97461,15.83984 h 2.63867 l 1.51368,-4.15039 h 6.67187 l 1.48633,4.15039 h 2.71289 l -5.97656,-15.83984 z m 1.46485,2.23242 h 0.0723 l 0.71875,2.2793 1.82422,5.08789 h -5.16016 l 1.87305,-5.13477 z m -358.61914,2.98633 c -3.864,0 -6.16797,2.15965 -6.16797,4.84765 0,2.52 1.60912,3.84025 5.95312,4.65625 2.976,0.552 3.93555,1.20013 3.93555,2.32813 0,1.464 -1.39244,2.25586 -3.64844,2.25586 -2.376,0 -3.96019,-0.86516 -4.99219,-2.78516 l -1.79882,1.80078 c 1.224,1.968 3.3604,3.21485 6.8164,3.21485 3.744,0 6.31055,-1.79886 6.31055,-4.63086 0,-2.544 -1.55864,-3.86343 -5.80664,-4.60743 -3.072,-0.552 -4.05664,-1.22409 -4.05664,-2.49609 0,-1.344 1.22447,-2.35351 3.48047,-2.35351 2.256,0 3.47918,0.84032 4.36718,2.73632 l 1.94336,-1.75195 c -1.392,-2.16 -3.40793,-3.21484 -6.33593,-3.21484 z m -20.91407,0.23828 v 15.84179 h 2.56641 v -4.87304 l 2.56836,-2.75977 4.96875,7.63281 h 3.02344 l -6.14454,-9.36132 6,-6.48047 h -3.14257 l -7.27344,7.87304 v -7.87304 z m 128.45508,0.62304 c -4.584,0 -7.46289,3.12016 -7.46289,8.16016 0,5.04 2.87889,8.16016 7.46289,8.16016 4.608,0 7.48828,-3.12016 7.48828,-8.16016 0,-5.04 -2.88028,-8.16016 -7.48828,-8.16016 z m -27.48242,0.24024 v 15.83984 h 2.37695 v -9.16797 l -0.1914,-4.36718 h 0.0234 l 4.82422,13.53515 h 2.13477 l 4.82422,-13.53515 h 0.0254 l -0.16992,4.36718 v 9.16797 h 2.35351 V 293.668 h -3.74414 l -3.16797,9.16797 -1.1289,3.76953 h -0.0469 l -1.10547,-3.76953 -3.1914,-9.16797 z m 27.48242,1.99219 c 3,0 4.80078,2.15973 4.80078,5.92773 0,3.768 -1.80078,5.92969 -4.80078,5.92969 -2.976,0 -4.77539,-2.16169 -4.77539,-5.92969 0,-3.768 1.79939,-5.92773 4.77539,-5.92773 z m 393.75781,3.41992 v 15.83984 h 5.5918 c 4.968,0 7.87305,-2.83192 7.87305,-7.91992 0,-5.088 -2.90505,-7.91992 -7.87305,-7.91992 z m 17.29688,0 v 15.83984 h 11.80859 v -2.20703 h -9.24023 v -4.70508 h 6.96094 v -2.16015 h -6.96094 v -4.56055 h 8.90429 v -2.20703 z m -14.72852,2.18359 h 3.02344 c 3.336,0 5.18555,2.08833 5.18555,5.73633 0,3.648 -1.84955,5.73633 -5.18555,5.73633 h -3.02344 z m -276.80664,0.61328 v 15.83985 h 2.56836 v -4.87305 l 2.56836,-2.75977 4.9668,7.63282 h 3.02539 l -6.14453,-9.36133 6,-6.47852 h -3.14453 l -7.27149,7.8711 v -7.8711 z m 13.7793,0 5.63867,9.76758 v 6.07227 h 2.56836 v -6.07227 l 5.66406,-9.76758 h -2.8789 l -2.8086,5.08789 -1.24804,2.375 -1.24805,-2.375 -2.83203,-5.08789 z m 117.42773,31.40039 c -4.536,0 -7.43945,3.12016 -7.43945,8.16016 0,5.04 2.88084,8.16016 7.46484,8.16016 3.096,0 5.56679,-1.53546 6.55079,-4.43946 l -2.44727,-0.8164 c -0.6,2.016 -2.06408,3.02343 -4.08008,3.02343 -3,0 -4.80078,-2.18373 -4.80078,-5.92773 0,-3.768 1.94448,-5.92773 4.89649,-5.92773 1.96799,0 3.14357,0.86432 3.76757,2.73632 l 2.42383,-1.08007 c -0.96,-2.568 -3.19194,-3.88868 -6.33594,-3.88868 z m -24.22265,0.24024 v 15.83984 h 2.35156 V 339.1348 l -0.0957,-2.68946 h 0.0234 l 1.53711,2.92774 6.11914,9.98437 h 3.04883 v -15.83984 h -2.37695 v 10.22461 l 0.0957,2.6875 h -0.0234 l -1.56055,-2.95117 -6.09571,-9.96094 z m 164.4414,5.5625 v 15.83984 h 2.37696 v -9.16797 l -0.19141,-4.36718 h 0.0234 l 4.82422,13.53515 h 2.13476 l 4.82422,-13.53515 h 0.0254 l -0.16797,4.36718 v 9.16797 h 2.35157 v -15.83984 h -3.74415 l -3.16796,9.16797 -1.12891,3.76757 h -0.0469 l -1.10547,-3.76757 -3.19141,-9.16797 z m 20.90625,0 v 15.83984 h 5.5918 c 4.968,0 7.87305,-2.83192 7.87305,-7.91992 0,-5.088 -2.90505,-7.91992 -7.87305,-7.91992 z m 2.56836,2.18359 h 3.02344 c 3.336,0 5.18555,2.08833 5.18555,5.73633 0,3.648 -1.84955,5.73633 -5.18555,5.73633 h -3.02344 z m -326.58593,5.06641 v 2.20703 h 5.42382 v 13.63281 h 2.56836 v -13.63281 h 5.42383 v -2.20703 z m 16.49023,0 v 15.83984 h 2.35352 v -10.22461 l -0.0977,-2.6875 h 0.0254 l 1.53516,2.92774 6.12109,9.98437 h 3.04688 v -15.83984 h -2.375 v 10.22265 l 0.0957,2.6875 h -0.0234 l -1.56055,-2.95117 -6.0957,-9.95898 z m -223.22852,13.5 c -4.584,0 -7.46289,3.12015 -7.46289,8.16015 0,5.04 2.87889,8.16016 7.46289,8.16016 4.608,0 7.48829,-3.12016 7.48829,-8.16016 0,-5.04 -2.88029,-8.16015 -7.48829,-8.16015 z m 11.28321,0.24023 v 15.83985 h 2.56836 v -4.87305 l 2.56836,-2.75977 4.96875,7.63282 h 3.02343 l -6.14453,-9.36133 6,-6.47852 h -3.14453 l -7.27148,7.8711 v -7.8711 z m -11.28321,1.99219 c 3,0 4.80079,2.15973 4.80079,5.92773 0,3.768 -1.80079,5.92774 -4.80079,5.92774 -2.976,0 -4.77539,-2.15974 -4.77539,-5.92774 0,-3.768 1.79939,-5.92773 4.77539,-5.92773 z m -257.55664,5.12109 -5.97461,15.83985 h 2.63868 l 1.51171,-4.15235 h 6.67383 l 1.48633,4.15235 h 2.71289 l -5.97656,-15.83985 z m 10.89844,0 v 2.1836 h 9.35938 l -9.57618,11.56836 v 2.08789 h 12.79297 v -2.1836 h -9.86523 l 9.57617,-11.56836 v -2.08789 z m -9.43359,2.23243 h 0.0723 l 0.71875,2.27929 1.82422,5.08789 h -5.16015 l 1.87304,-5.13672 z m 585.83593,7.2207 c -3.864,0 -6.16796,2.15966 -6.16796,4.84766 0,2.51999 1.60717,3.84024 5.95117,4.65624 2.976,0.55201 3.9375,1.20013 3.9375,2.32813 0,1.464 -1.39244,2.25586 -3.64844,2.25586 -2.376,0 -3.96019,-0.86516 -4.99219,-2.78516 l -1.80078,1.80078 c 1.224,1.968 3.36041,3.2168 6.81641,3.2168 3.744,0 6.3125,-1.80081 6.3125,-4.63281 0,-2.544 -1.5606,-3.86342 -5.8086,-4.60742 -3.072,-0.552 -4.05664,-1.2241 -4.05664,-2.4961 0,-1.344 1.22447,-2.35156 3.48047,-2.35156 2.256,0 3.48114,0.83838 4.36914,2.73438 l 1.94336,-1.75196 c -1.392,-2.16 -3.40793,-3.21484 -6.33594,-3.21484 z m 16.57422,0 c -4.536,0 -7.43945,3.12015 -7.43945,8.16016 0,5.04 2.87889,8.16015 7.46289,8.16015 3.096,0 5.56874,-1.5374 6.55274,-4.44141 l -2.44922,-0.81445 c -0.6,2.016 -2.06408,3.02344 -4.08008,3.02344 -3,0 -4.79883,-2.18373 -4.79883,-5.92773 0,-3.768 1.94449,-5.92774 4.89649,-5.92774 1.96799,0 3.14357,0.86238 3.76757,2.73438 l 2.42383,-1.08008 c -0.96,-2.568 -3.19194,-3.88672 -6.33594,-3.88672 z m -246.27148,0.9375 -5.97461,15.83984 h 2.63867 l 1.51367,-4.15234 h 6.67188 l 1.48828,4.15234 h 2.71094 l -5.97657,-15.83984 z m 11.83398,0 v 15.83984 h 2.54493 v -6.33594 h 3.4082 l 4.03125,6.33594 h 2.95117 l -4.29492,-6.62304 c 2.112,-0.624 3.35937,-2.18485 3.35937,-4.46485 0,-2.976 -2.13496,-4.75195 -5.54296,-4.75195 z m -270.64843,0.7793 v 15.83984 h 2.35156 v -10.22461 l -0.0957,-2.6875 h 0.0234 l 1.53516,2.92773 6.12109,9.98438 h 3.04688 v -15.83984 h -2.375 v 10.22265 l 0.0957,2.68945 h -0.0234 l -1.56054,-2.95312 -6.09571,-9.95898 z m 17.67187,0 v 15.83984 h 2.375 v -9.16797 l -0.1914,-4.36914 h 0.0234 l 4.82422,13.53711 h 2.13672 l 4.82227,-13.53711 h 0.0254 l -0.16797,4.36914 v 9.16797 h 2.35156 v -15.83984 h -3.74414 l -3.16797,9.16796 -1.12695,3.76758 h -0.0488 l -1.10352,-3.76758 -3.19336,-9.16796 z m 255.52149,1.40429 h 3.69531 c 2.088,0 3.0957,0.8398 3.0957,2.5918 0,1.752 -1.0077,2.5918 -3.0957,2.5918 h -3.69531 z m -12.91407,0.0488 h 0.0723 l 0.7207,2.2793 1.82227,5.08789 h -5.15821 l 1.8711,-5.13477 z m 180.99414,30.1875 c -4.56,0 -7.53515,3.12016 -7.53515,8.16016 0,5.088 2.90375,8.16015 7.34375,8.16015 2.328,0 3.93565,-0.83986 4.84765,-2.25586 l 0.0723,2.01563 h 1.89648 v -8.1836 h -7.1289 v 2.11133 h 4.84765 v 0.45703 c 0,2.448 -1.84804,3.64844 -4.24804,3.64844 -3.24,0 -4.94336,-2.16112 -4.94336,-5.95312 0,-3.768 1.92048,-5.92774 4.89648,-5.92774 1.992,0 3.50295,0.88863 4.12695,2.64063 l 2.35157,-1.12891 c -1.224,-2.568 -3.23935,-3.74414 -6.52735,-3.74414 z m 14.84766,0.24024 -5.97656,15.83984 h 2.64062 l 1.51172,-4.15234 h 6.67188 l 1.48828,4.15234 h 2.71094 l -5.97657,-15.83984 z m 1.46289,2.23242 h 0.0723 l 0.7207,2.27929 1.82422,5.08789 h -5.16016 l 1.8711,-5.13476 z m -84.54297,4.48437 -5.97656,15.83985 h 2.64062 l 1.51172,-4.1504 h 6.67188 l 1.48828,4.1504 h 2.71289 l -5.97656,-15.83985 z m 11.83399,0 v 15.83985 h 11.30273 v -2.20704 h -8.73437 v -13.63281 z m -10.36914,2.23242 h 0.0703 l 0.7207,2.2793 1.82422,5.08789 h -5.16016 l 1.87305,-5.13476 z m -41.0918,3.62305 c -3.864,0 -6.16797,2.15966 -6.16797,4.84766 0,2.52 1.60717,3.84025 5.95117,4.65625 2.976,0.552 3.93555,1.20012 3.93555,2.32812 0,1.464 -1.39049,2.25586 -3.64649,2.25586 -2.376,0 -3.96018,-0.86515 -4.99218,-2.78515 l -1.80078,1.80078 c 1.224,1.968 3.3604,3.21679 6.8164,3.21679 3.744,0 6.3125,-1.80081 6.3125,-4.63281 0,-2.544 -1.56059,-3.86342 -5.80859,-4.60742 -3.072,-0.552 -4.05664,-1.2241 -4.05664,-2.4961 0,-1.34399 1.22447,-2.35156 3.48047,-2.35156 2.256,0 3.47918,0.83838 4.36718,2.73438 l 1.94532,-1.75196 c -1.392,-2.16 -3.40794,-3.21484 -6.33594,-3.21484 z m -26.30664,0.24024 v 15.83984 h 2.375 v -9.16797 l -0.19141,-4.36914 h 0.0234 l 4.82422,13.53711 h 2.13672 l 4.82422,-13.53711 h 0.0234 l -0.16797,4.36914 v 9.16797 h 2.35157 v -15.83984 h -3.74414 l -3.16797,9.16796 -1.12696,3.76758 h -0.0488 l -1.10352,-3.76758 -3.19141,-9.16796 z m -160.31055,36.47656 v 2.20703 h 5.42383 v 13.63281 h 2.56836 v -13.63281 h 5.42383 v -2.20703 z m 15.07617,0 5.06446,7.79883 -5.4961,8.04101 h 2.95117 l 3.88868,-6.16797 3.88672,6.16797 h 3.04882 l -5.32812,-8.13672 5.11133,-7.70312 h -2.78321 l -3.64843,5.8789 -3.64844,-5.8789 z m 97.61133,1.33398 v 15.83985 h 11.30469 v -2.20704 h -8.73633 v -13.63281 z m 18.49414,0 -5.97656,15.83985 h 2.64062 l 1.51172,-4.15235 h 6.67188 l 1.48828,4.15235 h 2.71289 l -5.97656,-15.83985 z m 1.46485,2.23242 h 0.0723 l 0.71875,2.2793 1.82422,5.08789 h -5.16016 l 1.87305,-5.13476 z m 205.67382,42.14454 v 15.83984 h 2.56836 v -6.81445 h 6.95899 v -2.23243 h -6.95899 v -4.58398 h 8.87891 v -2.20898 z m 14.67188,0 v 15.83984 h 11.30469 v -2.20703 h -8.73633 v -13.63281 z" />
                    <g id="border-shapes" fill="#000" fill-opacity=".33" stroke="none">
                      <path id="fl-ga-sh" transform="translate(742,465)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="id-nv-sh" transform="translate(162,185)" fill-opacity="0" />
                      <path id="nv-or-sh" transform="translate(112,174)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="co-ks-sh" transform="translate(383,296)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="co-ok-sh" transform="translate(354,306)" d="M -9,9 -3.6,-9 H 9 L 3.6,9 Z" fill-opacity=".33" />
                      <path id="co-nm-sh" transform="translate(303,325)" fill-opacity="0" />
                      <path id="az-ut-sh" transform="translate(211,312)" fill-opacity="0" />
                      <path id="nm-tx-sh" transform="translate(355,414)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="nm-ok-sh" transform="translate(337,351)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="ia-ne-sh" transform="translate(488,228)" fill-opacity="0" />
                      <path id="mo-ne-sh" transform="translate(463,251)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="ks-mo-sh" transform="translate(515,299)" fill-opacity="0" />
                      <path id="mo-ok-sh" transform="translate(489,358)" d="M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z" fill-opacity=".33" />
                      <path id="ar-ok-sh" transform="translate(519,378)" fill-opacity="0" />
                      <path id="mn-wi-sh" transform="translate(543,141)" d="M -9.5,9.5 0,-9.5 9.5,9.5 Z" fill-opacity=".33" />
                      <path id="ia-wi-sh" transform="translate(574,193)" fill-opacity="0" />
                      <path id="il-wi-sh" transform="translate(607,203)" d="M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z" fill-opacity=".33" />
                      <path id="ia-il-sh" transform="translate(581,230)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="il-mo-sh" transform="translate(580,278)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="ar-tn-sh" transform="translate(573,360)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="ar-ms-sh" transform="translate(587,399)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="la-ms-sh" transform="translate(597,470)" fill-opacity="0" />
                      <path id="il-ky-sh" transform="translate(627,321)" fill-opacity="0" />
                      <path id="in-ky-sh" transform="translate(670,297)" fill-opacity="0" />
                      <path id="ky-oh-sh" transform="translate(710,280)" d="M -9.5,9.5 0,-9.5 9.5,9.5 Z" fill-opacity=".33" />
                      <path id="ky-wv-sh" transform="translate(735,295)" fill-opacity="0" />
                      <path id="va-wv-sh" transform="translate(768,303)" fill-opacity="0" />
                      <path id="ky-mo-sh" transform="translate(587,322)" fill-opacity="0" />
                      <path id="ky-tn-sh" transform="translate(671,334)" fill-opacity="0" />
                      <path id="tn-va-sh" transform="translate(702,343)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="nc-va-sh" transform="translate(806,317)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="al-fl-sh" transform="translate(682,464)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="nc-sc-sh" transform="translate(788,361)" fill-opacity="0" />
                      <path id="ga-sc-sh" transform="translate(753,394)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="de-md-sh" transform="translate(846,254)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="de-pa-sh" transform="translate(828,209)" fill-opacity="0" />
                      <path id="nj-pa-sh" transform="translate(851,208)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="de-nj-sh" transform="translate(924,245)" fill-opacity="0" />
                      <path id="nj-ny-sh" transform="translate(820,173)" fill-opacity="0" />
                      <path id="ny-pa-sh" transform="translate(790,190)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="ma-nh-sh" transform="translate(896,149)" fill-opacity="0" />
                      <path id="ma-vt-sh" transform="translate(871,115)" d="M -9.5,9.5 0,-9.5 9.5,9.5 Z" fill-opacity=".33" />
                      <path id="ma-ny-sh" transform="translate(843,162)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="ct-ma-sh" transform="translate(886,170)" d="M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z" fill-opacity=".33" />
                      <path id="ma-ri-sh" transform="translate(925,212)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="al-ga-sh" transform="translate(696,411)" fill-opacity="0" />
                      <path id="ms-tn-sh" transform="translate(620,377)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="al-tn-sh" transform="translate(662,373)" fill-opacity="0" />
                      <path id="ga-tn-sh" transform="translate(697,370)" fill-opacity="0" />
                      <path id="nc-tn-sh" transform="translate(738,341)" fill-opacity="0" />
                      <path id="ny-vt-sh" transform="translate(863,141)" fill-opacity="0" />
                      <path id="md-wv-sh" transform="translate(771,263)" fill-opacity="0" />
                      <path id="md-va-sh" transform="translate(824,258)" fill-opacity="0" />
                      <path id="oh-wv-sh" transform="translate(747,260)" d="M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z" fill-opacity=".33" />
                      <path id="in-oh-sh" transform="translate(686,249)" fill-opacity="0" />
                      <path id="il-in-sh" transform="translate(639,264)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="ia-mo-sh" transform="translate(534,252)" fill-opacity="0" />
                      <path id="mi-wi-sh" transform="translate(604,121)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="az-ca-sh" transform="translate(141,378)" fill-opacity="0" />
                      <path id="ca-nv-sh" transform="translate(92,268)" fill-opacity="0" />
                      <path id="ca-or-sh" transform="translate(53,159)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="id-mt-sh" transform="translate(208,120)" fill-opacity="0" />
                      <path id="mt-sd-sh" transform="translate(361,133)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="sd-wy-sh" transform="translate(358,168)" fill-opacity="0" />
                      <path id="ne-sd-sh" transform="translate(419,195)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="ia-sd-sh" transform="translate(458,183)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="mn-nd-sh" transform="translate(477,94)" fill-opacity="0" />
                      <path id="mn-sd-sh" transform="translate(484,158)" fill-opacity="0" />
                      <path id="ia-mn-sh" transform="translate(525,184)" d="M -9,9 -3.6,-9 H 9 L 3.6,9 Z" fill-opacity=".33" />
                      <path id="id-or-sh" transform="translate(142,153)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="or-wa-sh" transform="translate(107,83)" fill-opacity="0" />
                      <path id="ks-ok-sh" transform="translate(450,334)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="al-ms-sh" transform="translate(638,424)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="ar-la-sh" transform="translate(557,426)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="mt-wy-sh" transform="translate(304,138)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="id-wy-sh" transform="translate(241,170)" d="M -9.5,9.5 0,-9.5 9.5,9.5 Z" fill-opacity=".33" />
                      <path id="ut-wy-sh" transform="translate(250,224)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="co-wy-sh" transform="translate(308,232)" fill-opacity="0" />
                      <path id="co-ne-sh" transform="translate(385,241)" fill-opacity="0" />
                      <path id="ks-ne-sh" transform="translate(424,264)" fill-opacity="0" />
                      <path id="id-wa-sh" transform="translate(163,57)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="ky-va-sh" transform="translate(731,316)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="me-nh-sh" transform="translate(914,97)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="nh-vt-sh" transform="translate(884,131)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="ct-ny-sh" transform="translate(871,184)" fill-opacity="0" />
                      <path id="ar-mo-sh" transform="translate(544,346)" fill-opacity="0" />
                      <path id="in-mi-sh" transform="translate(666,215)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="mi-oh-sh" transform="translate(694,213)" d="M -9,9 -3.6,-9 H 9 L 3.6,9 Z" fill-opacity=".33" />
                      <path id="ga-nc-sh" transform="translate(720,367)" fill-opacity="0" />
                      <path id="mo-tn-sh" transform="translate(632,354)" d="M -9,9 -3.6,-9 H 9 L 3.6,9 Z" fill-opacity=".33" />
                      <path id="az-nm-sh" transform="translate(245,380)" fill-opacity="0" />
                      <path id="co-ut-sh" transform="translate(260,274)" fill-opacity="0" />
                      <path id="md-pa-sh" transform="translate(826,237)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="pa-wv-sh" transform="translate(781,232)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="oh-pa-sh" transform="translate(756,217)" fill-opacity="0" />
                      <path id="ct-ri-sh" transform="translate(898,212)" fill-opacity="0" />
                      <path id="id-ut-sh" transform="translate(210,194)" d="M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z" fill-opacity=".33" />
                      <path id="nv-ut-sh" transform="translate(174,252)" fill-opacity="0" />
                      <path id="az-nv-sh" transform="translate(154,324)" d="M -9,9 -3.6,-9 H 9 L 3.6,9 Z" fill-opacity=".33" />
                      <path id="ne-wy-sh" transform="translate(354,212)" fill-opacity="0" />
                      <path id="la-tx-sh" transform="translate(532,454)" fill-opacity="0" />
                      <path id="ar-tx-sh" transform="translate(500,435)" d="M -9.5,9.5 0,-9.5 9.5,9.5 Z" fill-opacity=".33" />
                      <path id="ok-tx-sh" transform="translate(450,403)" fill-opacity="0" />
                      <path id="nd-sd-sh" transform="translate(417,126)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="mt-nd-sh" transform="translate(365,89)" fill-opacity="0" />
            
                      <path id="wa-out" transform="translate(128,12)" d="M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z" fill-opacity=".33" />
                      <path id="id-out" transform="translate(178,24)" fill-opacity="0" />
                      <path id="mt-out" transform="translate(272,41)" fill-opacity="0" />
                      <path id="nd-out" transform="translate(419,57)" d="M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z" fill-opacity=".33" />
                      <path id="mn-out" transform="translate(539,66)" fill-opacity="0" />
                      <path id="wi-out" transform="translate(573,108)" fill-opacity="0" />
                      <path id="mi-out" transform="translate(693,133)" fill-opacity="0" />
                      <path id="oh-out" transform="translate(729,215)" fill-opacity="0" />
                      <path id="pa-out" transform="translate(759,193)" fill-opacity="0" />
                      <path id="ny-out" transform="translate(792,160)" fill-opacity="0" />
                      <path id="me-out" transform="translate(933,50)" d="M -9.5,9.5 0,-9.5 9.5,9.5 Z" fill-opacity=".33" />
                      <path id="va-out" transform="translate(854,288)" fill-opacity="0" />
                      <path id="nc-out" transform="translate(835,362)" fill-opacity="0" />
                      <path id="sc-out" transform="translate(800,405)" d="M -8,8 -3.2,-8 H 3.2 L 8,8 Z" fill-opacity=".33" />
                      <path id="ga-out" transform="translate(778,441)" fill-opacity="0" />
                      <path id="fl-out" transform="translate(786,561)" fill-opacity="0" />
                      <path id="al-out" transform="translate(651,480)" fill-opacity="0" />
                      <path id="ms-out" transform="translate(628,482)" fill-opacity="0" />
                      <path id="la-out" transform="translate(556,503)" fill-opacity="0" />
                      <path id="tx-out" transform="translate(402,528)" d="M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z" fill-opacity=".33" />
                      <path id="nm-out" transform="translate(268,441)" fill-opacity="0" />
                      <path id="az-out" transform="translate(178,431)" fill-opacity="0" />
                      <path id="ca-out" transform="translate(29,304)" d="M -8,-8 H 8 V 8 H -8 Z" fill-opacity=".33" />
                      <path id="or-out" transform="translate(39,91)" fill-opacity="0" />
                      <path id="vt-out" transform="translate(752,57)" fill-opacity="0" />
                      <path id="nh-out" transform="translate(817,57)" fill-opacity="0" />
                      <path id="ma-out" transform="translate(942,147)" fill-opacity="0" />
                      <path id="ri-out" transform="translate(942,187)" d="M -9.9,0 0,-9.9 9.9,0 0,9.9 Z" fill-opacity=".33" />
                      <path id="ct-out" transform="translate(942,227)" fill-opacity="0" />
                      <path id="nj-out" transform="translate(942,267)" fill-opacity="0" />
                      <path id="de-out" transform="translate(942,307)" d="M -9,9 -3.6,-9 H 9 L 3.6,9 Z" fill-opacity=".33" />
                      <path id="md-out" transform="translate(942,347)" fill-opacity="0" />
                    </g>
                    <g id="border-shape-indicator-lines" fill="none" stroke="#000" stroke-width="1.5" stroke-opacity=".33">
                      <path id="co-ok-li" d="m 362,318 12,11" stroke-opacity=".33" />
                      <path id="nm-ok-li" d="m 361,337 -13,9" stroke-opacity=".33" />
                      <path id="mo-ne-li" d="m 474,254 22,5" stroke-opacity=".33" />
                      <path id="mo-ok-li" d="m 501,352 13,-12" stroke-opacity=".33" />
                      <path id="ar-tn-li" d="m 583,363 17,1" stroke-opacity=".33" />
                      <path id="ky-mo-li" d="m 598,327 16,9" stroke-opacity="0" />
                      <path id="tn-va-li" d="m 712,338 15,-8" stroke-opacity=".33" />
                      <path id="de-pa-li" d="m 835,220 8,11" stroke-opacity="0" />
                      <path id="de-nj-li" d="m 913,244 -63,-9" stroke-opacity="0" />
                      <path id="nj-ny-li" d="m 830,174 16,3 12,15" stroke-opacity="0" />
                      <path id="ma-vt-li" d="m 871,125 5,28" stroke-opacity=".33" />
                      <path id="ma-ny-li" d="m 853,165 15,0" stroke-opacity=".33" />
                      <path id="ma-ri-li" d="m 919,201 -16,-34" stroke-opacity=".33" />
                      <path id="ct-ri-li" d="m 899,201 0,-24" stroke-opacity="0" />
                      <path id="md-wv-li" d="m 782,263 12,-13" stroke-opacity="0" />
                      <path id="pa-wv-li" d="m 770,237 -7,10" stroke-opacity=".33" />
                      <path id="me-nh-li" d="m 906,105 -6,6" stroke-opacity=".33" />
                      <path id="mo-tn-li" d="m 621,353 -9,-3" stroke-opacity=".33" />
                      <path id="ar-tx-li" d="m 511,429 15,-10" stroke-opacity=".33" />
                      <path id="ia-sd-li" d="m 468,188 12,8" stroke-opacity=".33" />
                    </g>
                  </svg>`);

                  let shapesSvg = {
                    Trapezoid:      'M -8,8 -3.2,-8 H 3.2 L 8,8 Z',
                    Triangle:       'M -9.5,9.5 0,-9.5 9.5,9.5 Z',
                    Parallelogram:  'M -9,9 -3.6,-9 H 9 L 3.6,9 Z',
                    Heart:          'M -4.4126265,-8.981771 q 2.444102,0 3.84073,2.82938 0.505676,1.119711 0.529756,1.709666 h 0.03612 q 0.421397,-1.950465 1.529067,-3.238736 1.30031,-1.30031 2.925698,-1.30031 2.516341,0 4.033369,2.69694 0.385278,0.999313 0.385278,1.878225 0,3.009979 -2.504302,5.743036 l -6.36911,7.645341 h -0.07224 l -6.766427,-8.295496 q -2.022704,-2.46818 -2.022704,-5.092881 0,-2.540419 2.39594,-4.033369 1.011352,-0.541796 2.058824,-0.541796 z',
                    Star:           'M 0,-9.0450851 2.2570952,-2.1517103 9.5105652,-2.1352548 3.6520569,2.1415401 5.8778522,9.045085 0,4.7949148 -5.8778528,9.0450847 -3.652057,2.1415402 l -5.8585082,-4.2767955 7.2534698,-0.016455 z',
                    Square:         'M -8,-8 H 8 V 8 H -8 Z',
                    Diamond:        'M -9.9,0 0,-9.9 9.9,0 0,9.9 Z',
                    Circle:         'M 9.5,0 A 9.5,9.5 0 0 1 0,9.5 9.5,9.5 0 0 1 -9.5,0 9.5,9.5 0 0 1 0,-9.5 9.5,9.5 0 0 1 9.5,0 Z'
                };
                let shapes = [ "Circle", "Square", "Diamond", "Trapezoid", "Parallelogram", "Triangle", "Heart", "Star" ];
                let states = 'al,ar,az,ca,co,ct,de,fl,ga,ia,id,il,in,ks,ky,la,ma,md,me,mi,mn,mo,ms,mt,nc,nd,ne,nh,nj,nm,nv,ny,oh,ok,or,pa,ri,sc,sd,tn,tx,ut,va,vt,wa,wi,wv,wy'.split(',');
                let stateBorders = 'id-nv,nv-or,co-ks,co-ok,co-nm,az-ut,nm-tx,nm-ok,ia-ne,mo-ne,ks-mo,mo-ok,ar-ok,mn-wi,ia-wi,il-wi,ia-il,il-mo,ar-tn,ar-ms,la-ms,il-ky,in-ky,ky-oh,ky-wv,va-wv,ky-mo,ky-tn,tn-va,nc-va,fl-ga,al-fl,nc-sc,ga-sc,de-md,de-pa,nj-pa,de-nj,nj-ny,ny-pa,ma-nh,ma-vt,ma-ny,ct-ma,ma-ri,al-ga,ms-tn,al-tn,ga-tn,nc-tn,ny-vt,md-wv,md-va,oh-wv,in-oh,il-in,ia-mo,mi-wi,az-ca,ca-nv,ca-or,id-mt,mt-sd,sd-wy,ne-sd,ia-sd,mn-nd,mn-sd,ia-mn,id-or,or-wa,ks-ok,al-ms,ar-la,mt-wy,id-wy,ut-wy,co-wy,co-ne,ks-ne,id-wa,ky-va,me-nh,nh-vt,ct-ny,ar-mo,in-mi,mi-oh,ga-nc,mo-tn,az-nm,co-ut,md-pa,pa-wv,oh-pa,ct-ri,id-ut,nv-ut,az-nv,ne-wy,la-tx,ar-tx,ok-tx,nd-sd,mt-nd'.split(',');
                let outStates = 'al,az,ca,ct,de,fl,ga,id,la,ma,md,me,mi,mn,ms,mt,nc,nd,nh,nj,nm,ny,oh,or,pa,ri,sc,tx,va,vt,wa,wi'.split(',');
                let outlying = 'ak,hi'.split(',');
        
                function setOutShape(state, shape)    // shape === null for “no shape”
                {
                    let sh = svg.find(`#${state}-out`);
                    sh.attr('fill-opacity', shape ? '.33' : '0');
                    if (shape)
                        sh.attr('d', shapesSvg[shape]);
                }
        
                function setBorderShape(borderId, shape)    // shape === null for “no border”
                {
                    svg.find('#' + borderId).attr('stroke', shape ? 'white' : 'black');
                    let sh = svg.find(`#${borderId}-sh`);
                    sh.attr('fill-opacity', shape ? '.33' : '0');
                    if (shape)
                        sh.attr('d', shapesSvg[shape]);
                    if (line = svg.find(`#${borderId}-li`))
                        line.attr('stroke-opacity', shape ? '.33' : '0');
                }
        
                function setRules(rnd)
                {
                    // Retry loop
                    let result;
                    do
                        result = (function()
                        {
                            let usedShapesPerState = {};
        
                            // STEP 1: Decide which states have an “out” (connection to Alaska/Hawaii) and assign them shapes
        
                            for (let i = 0; i < outStates.length; i++)
                                setOutShape(outStates[i], null);
        
                            let availableOutStates = rnd.shuffleFisherYates(outStates.slice(0));
                            for (let i = 0; i < 8; i++)
                            {
                                setOutShape(availableOutStates[i], shapes[i]);
                                usedShapesPerState[availableOutStates[i]] = [shapes[i]];
                            }
        
                            // STEP 2: Generate the main maze and assign a shape to each opened border
        
                            for (let i = 0; i < stateBorders.length; i++)
                                setBorderShape(stateBorders[i], null);
        
                            let openBorders = {};
        
                            function openBorder(borderId)
                            {
                                if (!/^(..)-(..)$/.test(borderId))
                                {
                                    console.log(`Very strange: ${borderId} is not a valid border?`);
                                    return false;
                                }
                                let state = RegExp.$1, otherState = RegExp.$2;
                                let availableShapes = shapes.slice(0), ix;
                                for (let st of [ state, otherState ])
                                    if (st in usedShapesPerState)
                                        for (shape of usedShapesPerState[st])
                                            if ((ix = availableShapes.indexOf(shape)) !== -1)
                                                availableShapes.splice(ix, 1);
                                if (availableShapes.length === 0)
                                    return false;
                                let chosenShape = availableShapes[rnd.next(0, availableShapes.length)];
                                setBorderShape(borderId, chosenShape);
                                openBorders[borderId] = chosenShape;
                                for (let st of [ state, otherState ])
                                    (usedShapesPerState[st] || (usedShapesPerState[st] = [])).push(chosenShape);
                                return true;
                            }
        
                            let startState = states [ rnd.next(0, states.length) ];
                            let visited = [ startState ];
                            let queue = [ startState ];
                            while (queue.length > 0)
                            {
                                let state = queue.shift();
                                for (let otherState of rnd.shuffleFisherYates(states.slice(0)))
                                    if (!visited.some(v => v === otherState))
                                        for (let borderId of [ `${otherState}-${state}`, `${state}-${otherState}` ])
                                            if (stateBorders.some(sb => sb === borderId))
                                            {
                                                queue.push(otherState);
                                                visited.push(otherState);
        
                                                if (!openBorder(borderId))
                                                {
                                                    console.log('Trying again.');
                                                    return false;
                                                }
                                            }
                            }
        
                            // STEP 3: Open three more random borders
                            let allBorders = rnd.shuffleFisherYates(stateBorders.slice(0));
                            let ix = 0;
                            let extraBorders = 0;
                            while (extraBorders < 3)
                            {
                                if (ix >= allBorders.length)
                                {
                                    console.log('No workie.');
                                    return false;
                                }
                                if (!(allBorders[ix] in openBorders) && openBorder(allBorders[ix]))
                                {
                                    console.log(`Extra border: ${allBorders[ix]}`);
                                    extraBorders++;
                                }
                                ix++;
                            }
        
                            return true;
                        })();
                    while (!result);
        
                    // Day-of-week table
                    // To ensure that every row and every column has unique symbols,
                    // let’s use the same trick that I used in Elder Futhark and just use the top-left corner
                    let rowShuffle = [];
                    let columnShuffle = [];
                    for (let i = 0; i < 8; i++)
                    {
                        rowShuffle.push(i);
                        columnShuffle.push(i);
                    }
                    rnd.shuffleFisherYates(rowShuffle);
                    rnd.shuffleFisherYates(columnShuffle);
                    
                    /*
                    let flights = document.getElementsByClassName('flight');
                    for (let outIx = 0; outIx < outlying.length; outIx++)
                        for (let dow = 0; dow < 7; dow++)
                            flights[outIx*7 + dow].innerHTML = `<svg viewBox='-10 -10 20 20'><path fill='#3d3d3d' d='${shapesSvg[shapes[(columnShuffle[dow] + rowShuffle[outIx]) % 8]]}' /><`+'/svg>';
                    */
                }
        
                function setDefaultRules()
                {
                    for (let i = 0; i < outStates.length; i++)
                        setOutShape(outStates[i], null);
                    for (let i = 0; i < stateBorders.length; i++)
                        setBorderShape(stateBorders[i], null);
        
                    setOutShape('wa', 'Circle');
                    setOutShape('ca', 'Square');
                    setOutShape('sc', 'Trapezoid');
                    setOutShape('de', 'Parallelogram');
                    setOutShape('ri', 'Diamond');
                    setOutShape('me', 'Triangle');
                    setOutShape('nd', 'Heart');
                    setOutShape('tx', 'Star');
        
                    setBorderShape('al-fl', 'Circle');
                    setBorderShape('al-ms', 'Trapezoid');
                    setBorderShape('ar-la', 'Circle');
                    setBorderShape('ar-ms', 'Square');
                    setBorderShape('ar-tn', 'Trapezoid');
                    setBorderShape('ar-tx', 'Triangle');
                    setBorderShape('az-nv', 'Parallelogram');
                    setBorderShape('ca-or', 'Circle');
                    setBorderShape('co-ks', 'Diamond');
                    setBorderShape('co-ok', 'Parallelogram');
                    setBorderShape('ct-ma', 'Heart');
                    setBorderShape('de-md', 'Diamond');
                    setBorderShape('fl-ga', 'Square');
                    setBorderShape('ga-sc', 'Diamond');
                    setBorderShape('ia-il', 'Star');
                    setBorderShape('ia-mn', 'Parallelogram');
                    setBorderShape('ia-sd', 'Circle');
                    setBorderShape('id-or', 'Diamond');
                    setBorderShape('id-ut', 'Heart');
                    setBorderShape('id-wa', 'Square');
                    setBorderShape('id-wy', 'Triangle');
                    setBorderShape('il-in', 'Diamond');
                    setBorderShape('il-mo', 'Square');
                    setBorderShape('il-wi', 'Heart');
                    setBorderShape('in-mi', 'Trapezoid');
                    setBorderShape('ks-ok', 'Trapezoid');
                    setBorderShape('ky-oh', 'Triangle');
                    setBorderShape('ky-va', 'Trapezoid');
                    setBorderShape('ma-ny', 'Trapezoid');
                    setBorderShape('ma-ri', 'Star');
                    setBorderShape('ma-vt', 'Triangle');
                    setBorderShape('md-pa', 'Square');
                    setBorderShape('me-nh', 'Diamond');
                    setBorderShape('mi-oh', 'Parallelogram');
                    setBorderShape('mi-wi', 'Star');
                    setBorderShape('mn-wi', 'Triangle');
                    setBorderShape('mo-ne', 'Star');
                    setBorderShape('mo-ok', 'Heart');
                    setBorderShape('mo-tn', 'Parallelogram');
                    setBorderShape('ms-tn', 'Diamond');
                    setBorderShape('mt-sd', 'Square');
                    setBorderShape('mt-wy', 'Circle');
                    setBorderShape('nc-va', 'Circle');
                    setBorderShape('nd-sd', 'Diamond');
                    setBorderShape('ne-sd', 'Trapezoid');
                    setBorderShape('nh-vt', 'Square');
                    setBorderShape('nj-pa', 'Trapezoid');
                    setBorderShape('nm-ok', 'Square');
                    setBorderShape('nm-tx', 'Circle');
                    setBorderShape('nv-or', 'Trapezoid');
                    setBorderShape('ny-pa', 'Circle');
                    setBorderShape('oh-wv', 'Heart');
                    setBorderShape('pa-wv', 'Star');
                    setBorderShape('tn-va', 'Star');
                    setBorderShape('ut-wy', 'Star');
                    /*
                    let flights = svg.find('.flight');
                    for (let outIx = 0; outIx < outlying.length; outIx++)
                    {
                        let dowShapes = [
                            ['Circle', 'Square', 'Trapezoid', 'Parallelogram', 'Diamond', 'Triangle', 'Heart'],
                            ['Square', 'Circle', 'Triangle', 'Diamond', 'Parallelogram', 'Trapezoid', 'Star']
                        ][outIx];
                        for (let dow = 0; dow < 7; dow++)
                            flights[outIx*7 + dow].attr("innerHTML", `<svg viewBox='-10 -10 20 20'><path fill='#3d3d3d' d='${shapesSvg[dowShapes[dow]]}' /><`+'/svg>');
                    }
                    */
                }

                class MonoRandom
                {
                    // Initializes a new instance of the class using the specified seed value.
                    constructor(seed)
                    {
                        this.seed = seed;
                        this.count = 0;
                        this._seedArray = new Array(56);
                        for (var i = 0; i < 56; i++)
                            this._seedArray[i] = 0;
                        var num = ((161803398 - (Math.abs(seed))) | 0);
                        this._seedArray[55] = num;
                        var num2 = 1;

                        for (var i = 1; i < 55; i = ((i + 1) | 0))
                        {
                            var num3 = ((Math.imul(21, i) % 55) | 0);
                            this._seedArray[num3] = num2;
                            num2 = ((num - num2) | 0);
                            if (num2 < 0)
                                num2 = ((num2 + 2147483647) | 0);
                            num = (this._seedArray[num3] | 0);
                        }

                        for (var j = 1; j < 5; j = ((j + 1) | 0))
                        {
                            for (var k = 1; k < 56; k = ((k + 1) | 0))
                            {
                                this._seedArray[k] = (((this._seedArray[k] | 0) - (this._seedArray[((1 + ((((k + 30) | 0) % 55) | 0)) | 0)] | 0)) | 0);
                                if ((this._seedArray[k] | 0) < 0)
                                    this._seedArray[k] = (((this._seedArray[k] | 0) + 2147483647) | 0);
                            }
                        }
                        this._inext = 0;
                        this._inextp = 31;
                    }

                    // Returns a random number between 0.0 and 1.0.
                    nextDouble(logging)
                    {
                        this.count++;
                        if (((++this._inext) | 0) >= (56 | 0))
                            this._inext = 1 | 0;
                        if (((++this._inextp) | 0) >= (56 | 0))
                            this._inextp = 1 | 0;
                        var num = ((this._seedArray[this._inext | 0] | 0) - (this._seedArray[this._inextp | 0] | 0)) | 0;
                        if ((num | 0) < 0)
                            num = ((num | 0) + 2147483647) | 0;
                        this._seedArray[this._inext | 0] = num | 0;
                        var result = +(num * 4.6566128752457969E-10);
                        if (logging)
                            console.log(`rnd.nextDouble() = ${result}`);
                        return result;
                    }

                    // Returns a non-negative random integer.
                    nextInt()
                    {
                        return ((+this.nextDouble() * 2147483647) | 0);
                    }

                    // Returns a non-negative random integer less than the specified maximum.
                    nextMax(maxValue)
                    {
                        return ((+this.nextDouble() * +maxValue) | 0);
                    }

                    // Returns a random integer within the specified range (minValue is inclusive, maxValue is exclusive).
                    next(minValue, maxValue, logging)
                    {
                        var result;
                        if (maxValue - minValue <= 1)
                            result = minValue;
                        else
                            result = this.nextMax(maxValue - minValue) + minValue;
                        if (logging)
                            console.log(`rnd.next(${minValue}, ${maxValue}) = ${result}`);
                        return result;
                    }

                    // Brings an array into random order.
                    // This method is equivalent to doing .OrderBy(x => rnd.NextDouble()) in C#.
                    // Returns a new array and leaves the original array unmodified.
                    shuffleArray(arr)
                    {
                        var sortArr = new Array(arr.length);
                        for (var i = 0; i < arr.length; i++)
                            sortArr[i] = { r: this.nextDouble(), v: arr[i] };
                        sortArr.sort((a, b) => a.r - b.r);
                        return sortArr.map(x => x.v);
                    }

                    // Brings an array into random order using the Fisher-Yates shuffle.
                    // This is an inplace algorithm, i.e. the input array is modified.
                    shuffleFisherYates(list)
                    {
                        var i = list.length;
                        while (i > 1)
                        {
                            var index = this.next(0, i);
                            i--;
                            var value = list[index];
                            list[index] = list[i];
                            list[i] = value;
                        }
                        return list;
                    }
                }

                if (parseInt(matches[1]) == 1){
                    setDefaultRules();
                } else {
                    setRules(new MonoRandom(parseInt(matches[1])));
                }
                
                let sl = {
                    "WA":{X:125,Y:50},
                    "OR":{X:85,Y:125},
                    "CA":{X:65,Y:285},
                    "NV":{X:125,Y:230},
                    "ID":{X:185,Y:155},
                    "MT":{X:275,Y:90},
                    "NM":{X:300,Y:385},
                    "WY":{X:300,Y:185},
                    "UT":{X:220,Y:260},
                    "AZ":{X:200,Y:375},
                    "CO":{X:320,Y:280},
                    "ND":{X:420,Y:90},
                    "SD":{X:420,Y:160},
                    "NE":{X:430,Y:230},
                    "KS":{X:450,Y:300},
                    "OK":{X:455,Y:365},
                    "TX":{X:455,Y:465},
                    "MN":{X:515,Y:130},
                    "IA":{X:530,Y:215},
                    "MO":{X:555,Y:300},
                    "AR":{X:555,Y:385},
                    "LA":{X:560,Y:470},
                    "WI":{X:600,Y:160},
                    "IL":{X:605,Y:260},
                    "MS":{X:615,Y:425},
                    "FL":{X:780,Y:510},
                    "AL":{X:670,Y:430},
                    "GA":{X:735,Y:420},
                    "SC":{X:780,Y:380},
                    "TN":{X:670,Y:355},
                    "NC":{X:805,Y:340},
                    "KY":{X:700,Y:310},
                    "WV":{X:760,Y:280},
                    "VA":{X:810,Y:300},
                    "MD":{X:970,Y:345},
                    "DE":{X:970,Y:310},
                    "IN":{X:660,Y:255},
                    "OH":{X:720,Y:245},
                    "PA":{X:800,Y:210},
                    "NJ":{X:970,Y:270},
                    "MI":{X:685,Y:190},
                    "NY":{X:835,Y:140},
                    "CT":{X:970,Y:225},
                    "RI":{X:970,Y:185},
                    "MA":{X:970,Y:145},
                    "VT":{X:780,Y:60},
                    "NH":{X:850,Y:60},
                    "ME":{X:920,Y:75},
                    "AK":{X:100,Y:500},
                    "HI":{X:200,Y:500}
                };

                module.push({obj: svg, nobullet: true, stateLoc: sl});
                return true;
            }
            
            },
            {
                regex: /Departing .+ \((..)\) to .+ \((..)\)\.$/,
                handler: function (matches, module) {
                    let svg = module.pop();
                    if(matches[1] == "HI" || matches[2] == "HI"){
                        svg.obj.append($SVG(`<text x='200' y='550'>HI</text>`));
                    }
                    else if (matches[1] == "AK" || matches[2] == "AK") {
                        svg.obj.append($SVG(`<text x='100' y='550'>AK</text>`));
                    }
                    
                    svg.obj.append($SVG(`<g><circle cx='${svg.stateLoc[matches[1]].X}' cy='${svg.stateLoc[matches[1]].Y}' r='15' fill='none' stroke='#00ff00' stroke-width='5'/><circle cx='${svg.stateLoc[matches[1]].X}' cy='${svg.stateLoc[matches[1]].Y}' r='10' stroke='none' fill='#000000'/><circle id='loc' cx='${svg.stateLoc[matches[1]].X}' cy='${svg.stateLoc[matches[1]].Y}' r='10' stroke='none' fill='#ff00ff'/></g>`));
                    svg.obj.append($SVG(`<circle cx='${svg.stateLoc[matches[2]].X}' cy='${svg.stateLoc[matches[2]].Y}' r='15' fill='none' stroke='#ff0000' stroke-width='5'/>`));

                    module.push($(`<span>${matches[0]}</span>`))
                    module.push(svg);
                    return true;
                }
            },
            {
                regex: /.+ - traveled from .+ \((..)\) to .+ \((..)\)\.$/,
                handler: function (matches, module) {
                    let svg = module.pop();
                    svg.obj.find("#loc").remove();
                    if(matches[1] == "HI" || matches[2] == "HI"){
                        svg.obj.append($SVG(`<text x='200' y='550'>HI</text>`));
                    }
                    else if (matches[2] == "AK" || matches[1] == "AK") {
                        svg.obj.append($SVG(`<text x='100' y='550'>AK</text>`));
                    }

                    svg.obj.append($SVG(`<g><path d='M${svg.stateLoc[matches[1]].X} ${svg.stateLoc[matches[1]].Y} ${svg.stateLoc[matches[2]].X} ${svg.stateLoc[matches[2]].Y}' fill='none' stroke='#0000ff' stroke-width='5'/><circle cx='${svg.stateLoc[matches[2]].X}' cy='${svg.stateLoc[matches[2]].Y}' r='10' stroke='none' fill='#000000'/><circle id='loc' cx='${svg.stateLoc[matches[2]].X}' cy='${svg.stateLoc[matches[2]].Y}' r='10' stroke='none' fill='#ff00ff'/></g>`));
                    module.push($(`<span>${matches[0]}</span>`));
                    module.push(svg);
                    return true;
                }
            },
            {
                regex: /.+/,
                handler: function (matches, module){
                    let svg = module.pop();
                    module.push($(`<span>${matches[0]}</span>`));
                    module.push(svg);
                    return true;
                }
            }
        ]
    },
    {
        displayName: "Valves",
        moduleID: "valves",
        loggingTag: "Valves",
        matches: [
            {
                regex: /^(.*)([01]{3})(.*)$/,
                handler: function (matches, module) {
                    module.push(matches[1] + matches[2].replace(/0/g, '○').replace(/1/g, '●') + matches[3]);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Venting Gas",
        moduleID: "NeedyVentGas",
        loggingTag: "NeedyVentComponent",
    },
    {
        moduleID: 'VoronoiMazeModule',
        loggingTag: 'Voronoi Maze',
        matches: [
            {
                regex: /^\{.*\}$/,
                handler: function (matches, module) {
                    let json = JSON.parse(matches);
                    if (!module.Infos)
                    {
                        module.Infos = [];

                        let svg = module[0].obj[0];
                        let controlsDiv = document.createElement('div');
                        controlsDiv.innerHTML = `
                            <button type='button' class='left' style='position: absolute; left: .1cm; top: 50%; transform: translateY(-50%); background: #ccf; border: 1px solid #88d; width: 1cm; height: 1cm; text-align: center;'>◀</button>
                            <button type='button' class='right' style='position: absolute; right: .1cm; top: 50%; transform: translateY(-50%); background: #ccf; border: 1px solid #88d; width: 1cm; height: 1cm; text-align: center;'>▶</button>
                            <div class='info1' style='text-align: center'></div>
                            <div class='info2' style='text-align: center'></div>
                            <div class='info3' style='text-align: center'></div>
                        `;
                        controlsDiv.setAttribute('style', 'position: relative; background: #eef; padding: .1cm .25cm; margin: 0 auto .5cm; width: 12cm;');
                        let info1 = controlsDiv.querySelector('.info1');
                        let info2 = controlsDiv.querySelector('.info2');
                        let info3 = controlsDiv.querySelector('.info3');
                        module[0].obj[0] = document.createElement('div');
                        module[0].obj[0].appendChild(controlsDiv);
                        module[0].obj[0].appendChild(svg);

                        let curPage = 0;
                        function setMaze(j)
                        {
                            Array.from(svg.querySelectorAll('.edgecircle')).forEach(ec => { ec.setAttribute('opacity', 0); });
                            Array.from(svg.querySelectorAll('.edgelabel')).forEach(el => { el.textContent = ''; });
                            Array.from(svg.querySelectorAll('.edgepath')).forEach(ep => { ep.setAttribute('stroke', 'black'); ep.setAttribute('stroke-width', '.0075'); });
                            Array.from(svg.querySelectorAll('.room')).forEach(rl => { rl.setAttribute('fill', 'white'); });
                            Array.from(svg.querySelectorAll('.roomlabel')).forEach(rl => { rl.textContent = ''; });
                            Array.from(svg.querySelectorAll('.key')).forEach(key => { key.setAttribute('opacity', 0); });
                            svg.querySelector('.arrow').setAttribute('opacity', 0);
                            if (j.isRoom)
                            {
                                for (let rIx = 0; rIx < j.arr.length; rIx++)
                                {
                                    svg.querySelector(`.roomlabel-${j.arr[rIx]}`).textContent = rIx;
                                    svg.querySelector(`.room-${j.arr[rIx]}`).setAttribute('fill', j.ix === rIx ? '#fdd' : '#dfd');
                                }

                                info1.innerText = `${j.old} % ${j.arr.length} = ${j.ix}`;
                                info2.innerText = `Selecting room #${j.ix} out of ${j.arr.length} rooms`;
                                info3.innerText = `${j.old} ÷ ${j.arr.length} = ${j.new}`;
                            }
                            else
                            {
                                for (let eIx = 0; eIx < j.passable.length; eIx++)
                                    svg.querySelector(`.edgepath-${j.passable[eIx]}`).setAttribute('stroke', 'rgba(0, 0, 0, .1)');

                                if (j.isStep)
                                {
                                    for (let eIx = 0; eIx < j.arr.length; eIx++)
                                    {
                                        svg.querySelector(`.edgepath-${j.arr[eIx]}`).setAttribute('stroke', j.ix === eIx ? '#a00' : '#0a0');
                                        svg.querySelector(`.edgecircle-${j.arr[eIx]}`).setAttribute('opacity', '.7');
                                        svg.querySelector(`.edgecircle-${j.arr[eIx]}`).setAttribute('fill', j.ix === eIx ? '#fdd' : '#dfd');
                                        svg.querySelector(`.edgelabel-${j.arr[eIx]}`).textContent = eIx;
                                    }
                                    Array.from(svg.querySelectorAll('.room')).forEach(rl => { rl.setAttribute('fill', '#ddf'); });
                                    for (let rIx = 0; rIx < j.visited.length; rIx++)
                                        svg.querySelector(`.room-${j.visited[rIx]}`).setAttribute('fill', 'white');

                                    info1.innerText = `${j.old} % ${j.arr.length} = ${j.ix}`;
                                    info2.innerText = `Selecting edge #${j.ix} out of ${j.arr.length} edges`;
                                    info3.innerText = `${j.old} ÷ ${j.arr.length} = ${j.new}`;
                                }
                                else if (j.isFinal)
                                {
                                    info1.innerText = ' ';
                                    info2.innerText = 'Final maze';
                                    info3.innerText = ' ';
                                    Array.from(svg.querySelectorAll('.key')).forEach(key => { key.setAttribute('opacity', 1); });
                                    svg.querySelector(`.room-${j.keys[0]}`).setAttribute('fill', '#ce2121');
                                    svg.querySelector(`.room-${j.keys[1]}`).setAttribute('fill', '#dddd41');
                                    svg.querySelector(`.room-${j.keys[2]}`).setAttribute('fill', '#3f7cf4');
                                }
                                else if (j.isStrike)
                                {
                                    info1.innerText = ' ';
                                    info2.innerText = 'You hit a wall. Strike!';
                                    info3.innerText = ' ';
                                    svg.querySelector(`.room-${j.from}`).setAttribute('fill', '#a5d6f7');
                                    svg.querySelector(`.room-${j.to}`).setAttribute('fill', '#a5d6f7');
                                    svg.querySelector('.arrow').setAttribute('opacity', 1);
                                    svg.querySelector('.arrow').setAttribute('d', j.d);
                                    svg.querySelector(`.edgepath-${j.edge}`).setAttribute('stroke', '#f00');
                                    svg.querySelector(`.edgepath-${j.edge}`).setAttribute('stroke-width', '.02');
                                }
                                else if (j.isSolve)
                                {
                                    info1.innerText = ' ';
                                    info2.innerText = 'Module solved!';
                                    info3.innerText = ' ';
                                }
                            }
                        }
                        setMaze(json);

                        controlsDiv.querySelector('.left').onclick = function() {
                            curPage = Math.max(curPage - 1, 0);
                            setMaze(module.Infos[curPage]);
                        };
                        controlsDiv.querySelector('.right').onclick = function() {
                            curPage = Math.min(curPage + 1, module.Infos.length - 1);
                            setMaze(module.Infos[curPage]);
                        };
                    }
                    module.Infos.push(json);
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        moduleID: "webDesign",
        loggingTag: "Web design",
        matches: [
            {
                regex: /For reference purpose/,
                handler: function (matches, module) {
                    var lines = "";
                    var line = readLine();
                    while (!line.match("}") && line) {
                        lines += line + "\n";
                        line = readLine();
                    }
                    lines += "}";

                    module.push({ label: matches.input, obj: pre(lines) });

                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Visual Impairment",
        moduleID: "visual_impairment",
        loggingTag: "Visual Impairment",
        matches: [
            {
                regex: /^Picture (\d+) was chosen at rotation (\d+)( and flipped)?\./,
                handler: function (matches, module) {
                    module.push({
                        obj: $(`<table>
                            <tr><th>Original</th><th>On the module</th></tr>
                            <tr><td><img src='../HTML/img/Visual Impairment/Colorblind${matches[1]}B.png' /></td>
                                <td><img src='../HTML/img/Visual Impairment/Colorblind${matches[1]}B.png' style='transform: rotate(${matches[2]}deg) scale(${matches[3] ? -1 : 1}, 1)' /></td>
                        </table>`)
                    });
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Wavetapping",
        moduleID: "Wavetapping",
        loggingTag: "Wavetapping",
        matches: [
            {
                regex: /:?Stage colors are: (.+), (.+), (.+)/,
                handler: function (matches, module) {
                    var stageColorIndex = [];
                    for (var i = 0; i < 3; i++) {
                        stageColorIndex[i] = matches[i + 1]
                            .replace(/Red/g, "0")
                            .replace(/Orange-Yellow/g, "2")
                            .replace(/Orange/g, "1")
                            .replace(/Chartreuse/g, "3")
                            .replace(/Lime/g, "4")
                            .replace(/Seafoam Green/g, "6")
                            .replace(/Cyan-Green/g, "7")
                            .replace(/Green/g, "5")
                            .replace(/Dark Blue/g, "8")
                            .replace(/Purple-Magenta/g, "9")
                            .replace(/Turquoise/g, "10")
                            .replace(/Indigo/g, "11")
                            .replace(/Purple/g, "12")
                            .replace(/Magenta/g, "13")
                            .replace(/Pink/g, "14")
                            .replace(/Grey/g, "15")
                    };
                    var litColors = [
                        '#fc4d40', //'Red':
                        '#ff9533', //'Orange':
                        '#ffd131', //'Orange-Yellow':
                        '#d8ec2f', //'Chartreuse':
                        '#85e836', //'Lime':
                        '#2ddf34', //'Green':
                        '#2ee38e', //'Seafoam Green':
                        '#29e9ce', //'Cyan-Green':
                        '#3888ff', //'Dark Blue':
                        '#d852f1', //'Purple-Magenta':
                        '#2dcdfe', //'Turquoise':
                        '#3848ff', //'Indigo':
                        '#8e4fff', //'Purple':
                        '#fc54e1', //'Magenta':
                        '#fd5287', //'Pink':
                        '#a9a9a9'  //'Grey':
                    ];
                    var unlitColors = [
                        '#6c190e', //'Red':
                        '#6c3610', //'Orange':
                        '#68530f', //'Orange-Yellow':
                        '#91a01c', //'Chartreuse':
                        '#335c0e', //'Lime':
                        '#0c5a0d', //'Green':
                        '#0a5c30', //'Seafoam Green':
                        '#0a5d55', //'Cyan-Green':
                        '#0c3368', //'Dark Blue':
                        '#591c67', //'Purple-Magenta':
                        '#0a5169', //'Turquoise':
                        '#a0a669', //'Indigo':
                        '#351a69', //'Purple':
                        '#6d1d56', //'Magenta':
                        '#6c1b33', //'Pink':
                        '#424242'  //'Grey':
                    ];
                    module.push({ label: "Stage colors are: " + matches[1] + ", " + matches[2] + ", " + matches[3] });
                    for (var st = 1; st < 4; st++) {
                        var table = $('<table>')
                            .css('background-color', 'black')
                            .css('font-size', '30px')
                            .css('color', 'white');
                        var correctPat = readTaggedLine().replace(/Correct pattern for stage (1|2|3) is: /, "");
                        for (var r = 0; r < 11; r++) {
                            var tr = $('<tr>').css('border', '0').appendTo(table);
                            var curLine = readTaggedLine();
                            for (var c = 0; c < 12; c++) {
                                if (curLine[c] == "0") $('<td>')
                                    .text(" ")
                                    .css('background-color', litColors[stageColorIndex[st - 1]])
                                    .css('text-align', 'center')
                                    .css('width', '20px')
                                    .css('height', '20px')
                                    .appendTo(tr);
                                else if (curLine[c] == "X") $('<td>')
                                    .text(" ")
                                    .css('background-color', unlitColors[stageColorIndex[st - 1]])
                                    .css('text-align', 'center')
                                    .css('width', '20px')
                                    .css('height', '20px').appendTo(tr);
                            }
                        }
                        module.push({ label: "Solution for Stage " + st + " (" + matches[st] + ") is: " + correctPat, obj: table });
                    }
                    return true;
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        displayName: "Who’s on First",
        moduleID: "WhosOnFirst",
        loggingTag: "WhosOnFirstComponent",
        matches: [
            {
                regex: /State randomized: Phase: (\d), Keypads: (.+)/,
                handler: function (matches, module) {
                    module.push("Current state: Phase: " + (parseInt(matches[1]) + 1) + " Keypads: " + matches[2].split(",").splice(0, 6).toString().replace(/,/g, ", "));
                }
            },
            {
                regex: /State randomized: Display word: (.+), DisplayWordIndex: \d+, Phase: \d/,
                handler: function (matches, module) {
                    module.push("Displayed word: " + matches[1]);
                }
            }
        ]
    },
    {
        moduleID: "WireSequence",
        loggingTag: "WireSequencePage",
        matches: [
            {
                regex: /Snipped wire of color (\w+) of number (\d+) to index (\d+)/,
                handler: function (matches, module) {
                    module.push("Snipped " + matches[1] + " wire #" + (parseInt(matches[2]) + 1) + " connected to " + "ABC"[parseInt(matches[3])]);
                }
            }
        ]
    },
    {
        moduleID: "Wires",
        loggingTag: "WireSetComponent",
        matches: [
            {
                regex: /Wires.Count is now (\d)/,
                handler: function (matches, module) {
                    module.push("There are " + matches[1] + " wires");
                }
            },
            {
                regex: /Wrong wire snipped: (\d) but solution is (\d)!/,
                handler: function (matches, module) {
                    module.push(`Incorrectly cut wire #${parseInt(matches[1]) + 1}, should have cut wire #${parseInt(matches[2]) + 1}`);
                }
            },
            {
                regex: /Correct wire snipped: (\d)!/,
                handler: function (matches, module) {
                    module.push(`Correctly cut wire #${parseInt(matches[1]) + 1}`);
                }
            },
            {
                regex: /Wire colors:/
            }
        ]
    },
    {
        displayName: "Who's That Monsplode?",
        moduleID: "monsplodeWho",
        loggingTag: "Who's that Monsplode?",
        icon: "Who’s that Monsplode",
        matches: [
            {
                regex: /(?:Correct answer is \w+, which is the \w+ button\.|Answer is incorrect! Strike!)/
            }
        ]
    },
    {
        moduleID: "WordSearchModule",
        loggingTag: "Word Search",
        matches: [
            {
                regex: /Correct word is (.+)/,
                handler: function (matches, module) {
                    module.push("Solution: " + matches[1]);
                }
            },
            {
                regex: /Wrong words are (.+)/,
                handler: function (matches, module) {
                    module.push("Wrong Words: " + matches[1]);
                }
            },
            {
                regex: /Field:/,
                handler: function (matches, module) {
                    module.push({ label: 'Field:', obj: pre(readMultiple(6)) });
                }
            },
            {
                regex: /Coordinates clicked/
            }
        ]
    },
    {
        displayName: "Word Search (PL)",
        moduleID: "WordSearchModulePL",
        icon: "Word Search",
        loggingTag: "Word Search PL"
    },
    {
        displayName: "The World's Largest Button",
        moduleID: "WorldsLargestButton",
        icon: "The World’s Largest Button",
        loggingTag: "The World's Largest Button"
    },
    {
        displayName: ["X-Ray", "Not X-Ray"],
        moduleID: ["XRayModule", "NotXRayModule"],
        loggingTag: ["X-Ray", "Not X-Ray"],
        matches: [
            {
                regex: /.+/,
                handler: function (matches, module) {
                    var m, span = null, txt = matches[0];
                    while (m = /^(.*?)\[(\d+)( flipped)?\]/.exec(txt)) {
                        if (span === null)
                            span = $('<span>');
                        span
                            .append($('<span>').text(m[1]))
                            .append($(`<div style='display: inline-block; width: 20px; height: 20px; background-image: url(img/X-Ray/Icons.svg); background-size: 220px 200px; background-repeat: no-repeat; background-position: ${-20 * (m[2] % 11)}px ${-20 * Math.floor(m[2] / 11)}px; ${m[3] ? 'transform: scaleY(-1);' : ''}'></div>`));
                        txt = txt.substr(m[0].length);
                    }
                    module.groups.add(span === null ? matches.input : span.append($('<span>').text(txt)));
                    if (matches.input.indexOf('Resetting module') !== -1)
                        module.groups.addGroup();
                }
            }
        ]
    },
    {
        moduleID: "YahtzeeModule",
        loggingTag: "Yahtzee",
        matches: [
            {
                regex: /rerolling \d./,
                handler: function (matches, module) {
                    module.push({ linebreak: true });
                }
            },
            {
                regex: /.+/
            }
        ]
    },
    {
        matches: [
            {
                regex: /Query(Responses|Lookups): (\[[\d\w]{1,2}\]: [\d\w]{1,2})/,
                handler: function (matches) {
                    var id = GetBomb().GetMod("TwoBits").IDs.length;
                    if (matches[1] == "Lookups") {
                        id = GetBomb().GetMod("TwoBits").IDs.length + 1;
                    }

                    var mod = GetBomb().GetModuleID("TwoBits", id);
                    mod.push({ label: "Query " + matches[1], obj: pre(matches[2] + "\n" + readMultiple(99)), expandable: true });
                    if (matches[1] == "Responses") {
                        mod.push(readLine());
                    }
                }
            },
            {
                regex: /^rule([1-6])$/,
                handler: function (matches) {
                    const orientationCubeRules = [
                        "If the serial number on the bomb contains the letter R",
                        "Otherwise, if the bomb has a lit indicator with the label TRN OR it has a lit/unlit indicator with the label CAR",
                        "Otherwise, if the bomb has a PS2 port OR there have been one or more strikes",
                        "Otherwise, if the serial number on the bomb contains either the number 7 or 8",
                        "Otherwise, if there are more than two batteries on the bomb OR the virtual observer's initial position is facing the initial left face",
                        "Otherwise"
                    ];

                    GetBomb().GetModule("OrientationCube").push(`Using rule #${matches[1]}: ${orientationCubeRules[parseInt(matches[1]) - 1]}`);
                }
            },
            {
                regex: /^[689HINOSXZ]{4}$/,
                handler: function (matches) {
                    var mod = GetBomb().GetModule("ThirdBase");
                    mod.groups.addGroup(true);
                    mod.groups.add("Display: " + matches[0]);
                    mod.groups.add("Button Label: " + readLine());
                    mod.groups.add("Solution: " + readLine());
                }
            },
        ]
    },
    {
        displayName: "Simon Says",
        moduleID: "Simon",
        loggingTag: "SimonComponent",
        matches: [
            {
                regex: /Button Pressed: (\d)/,
                handler: function (matches, module) {
                    const colors = ["red", "blue", "green", "yellow"];
                    module.push(`Pushed ${colors[parseInt(matches[1])]}.`)
                    return true;
                }
            },
            {
                regex: /Solve Progress: (\d)/,
                handler: function (matches, module) {
                    module.push(`Pushed correct color #${parseInt(matches[1]) + 1}.`);
                    return true;
                }
            }
        ]
    },
    {
        displayName: "Switches",
        moduleID: "switchModule",
        hasLogging: false
    },
    {
        displayName: "Shape Shift",
        moduleID: "shapeshift",
        hasLogging: false
    },
    {
        displayName: "Letter Keys",
        moduleID: "LetterKeys",
        hasLogging: false
    },
    {
        displayName: "Turn The Keys",
        moduleID: "TurnTheKeyAdvanced",
        hasLogging: false
    },
    {
        displayName: "Timezone",
        moduleID: "timezone",
        loggingTag: "Timezones"
    },
    {
        displayName: "Prime Checker",
        moduleID: "primechecker",
        hasLogging: false
    },
    {
        displayName: "The Button (Translated)",
        moduleID: "BigButtonTranslated",
        icon: "The Button",
        loggingTag: "The Button Translated"
    },
    {
        displayName: "Who’s On First (Translated)",
        moduleID: "WhosOnFirstTranslated",
        icon: "Who’s On First",
        loggingTag: "Who's on First Translated"
    },
    {
        displayName: "Morse Code (Translated)",
        moduleID: "MorseCodeTranslated",
        icon: "Morse Code",
        loggingTag: "Morse Code Translated"
    },
    {
        displayName: "Password (Translated)",
        moduleID: "PasswordsTranslated",
        icon: "Password",
        loggingTag: "Passwords Translated"
    },
    {
        displayName: "Venting Gas (Translated)",
        moduleID: "VentGasTranslated",
        icon: "Venting Gas",
        loggingTag: "Vent Gas Translated"
    },
    {
        moduleID: "AnagramsModule",
        hasLogging: false
    },
    {
        moduleID: "CrazyTalk",
        hasLogging: false
    },
    {
        moduleID: "EnglishTest",
        hasLogging: false
    },
    {
        moduleID: "Listening",
        hasLogging: false
    },
    {
        moduleID: "Microcontroller",
        hasLogging: false
    },
    {
        moduleID: "lgndTerrariaQuiz",
        hasLogging: false
    },
    {
        moduleID: "TurnTheKey",
        hasLogging: false
    },
    {
        moduleID: "WordScrambleModule",
        hasLogging: false
    },
    {
        moduleID: "ForeignExchangeRates",
        hasLogging: false
    },
];
