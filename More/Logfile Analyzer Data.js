// Used to load external js files only once.
class HookableCallbackSet {
	callbacks = {};

	Add(path, fn) {
		if (this.callbacks[path] === undefined) {
			this.callbacks[path] = { fns: [], called: false, hooked: false };
		}
		if (this.callbacks[path].called) {
			fn();
		}
		else {
			this.callbacks[path].fns.push(fn);
			if (!this.callbacks[path].hooked) {
				this.callbacks[path].hooked = true;
				$.getScript(path, () => { this.Call(path); });
			}
		}
	}

	Call(path) {
		this.callbacks[path].called = true;
		for (let fn of this.callbacks[path].fns) {
			fn();
		}
	}
}

let FileLoadCallbacks = new HookableCallbackSet();

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
let parseData = [
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
					const bombInfo = JSON.parse(readLines(parseInt(matches[1])).join(""));

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
					const eventInfo = JSON.parse(readLines(parseInt(matches[1])).join(''));
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
			},
			{
				regex: /Unable to get the real module for (.+?) \((.+?)\). IDs found: (.*?). This/,
				handler: matches => {
					const modId = matches[1];
					const steamId = matches[2];
					const ids = matches[3].split(", ").map(e => e.replace(/^\"|\"$/g, "").trim()).filter(e => e);
					console.warn(`Unable to get the real module for ${modId} (${steamId}); found: ${ids.length ? ids.join(", ") : "[none]"}`);

					const data = parseData.find(e => e.moduleID == modId);
					if (data) data.error = `<strong>Demand-Based Mod Loading:</strong> Unable to get the real module for <code>${modId}</code> (<code>${steamId}</code>). ${ids.length ? `IDs found:<ul>${ids.map(e => `<li><code>${e}</code></li>`).join("")}</ul>` : "No IDs found."}`;
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
	{
		loggingTag: "CompetitiveLogger",
		matches: [
			{
				regex: /Cache dump complete\./,
				handler: function () {
					bombgroup.CompetitiveLogger = true;
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
						label: 'Fur pattern shown on module:', obj: $(`<div class='dalmatians-pattern' style="
							background-image: url('img/101 Dalmatians/Fur${m[1]}.png');
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
					if (!module.TableData) {
						module.TableData = [];
						module.JSONs = [];
						module.Stage = [];
						module.CorrectValues = {};
						module.CorrectValuesFull = {};
						module.ListObject = {
							label: 'Module information:', obj: $(`<table class='fourteen-table'>
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
								<th class='colored' style='background: #f99'>R</th>
								<th class='colored' style='background: #8f8'>G</th>
								<th class='colored' style='background: #aaf'>B</th>
								<th class='colored' style='background: #f99'>R</th>
								<th class='colored' style='background: #8f8'>G</th>
								<th class='colored' style='background: #aaf'>B</th>
							</tr>
						</table>`)
						};
						module.push({ label: `<a href="../HTML/14%20interactive%20(MásQuéÉlite).html">View stages interactively</a>` });
						module.push(module.ListObject);
						module.SetCss = function () {
							module.ListObject.obj.find('.sep').get().forEach(x => x.setAttribute('rowspan', 2 + module.TableData.length));
						};
					}
					while (module.TableData.length <= matches[1])
						module.TableData.push({});
					module.TableData[matches[1]][matches[2]] = { fulldisplay: matches[3], display: matches[4], led: matches[5], full: matches[6], result: matches[7] };
					module.Stage.push((matches[3].slice(0, 8) === "inverted" ? "-" : "") + matches[3][matches[3].length - 1]);
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
							<td>${ix}</td>
							<td class='colored' style='background: ${ledColors[module.TableData[ix].R.led]}'>${module.TableData[ix].R.led}</td>
							<td class='colored' style='background: #fbb' title='${module.TableData[ix].R.fulldisplay}'>${module.TableData[ix].R.display}</td>
							<td class='colored' style='background: #afa' title='${module.TableData[ix].G.fulldisplay}'>${module.TableData[ix].G.display}</td>
							<td class='colored' style='background: #ccf' title='${module.TableData[ix].B.fulldisplay}'>${module.TableData[ix].B.display}</td>
							<td class='colored' style='background: #fbb' title='${module.TableData[ix].R.full}'>${module.TableData[ix].R.result}</td>
							<td class='colored' style='background: #afa' title='${module.TableData[ix].G.full}'>${module.TableData[ix].G.result}</td>
							<td class='colored' style='background: #ccf' title='${module.TableData[ix].B.full}'>${module.TableData[ix].B.result}</td>
						</tr>`));
						module.SetCss();
						module.JSONs.push(module.Stage);
						module.Stage = [];
						console.log(JSON.stringify(module.JSONs));
						module[1] = { label: `<a href='../HTML/14%20interactive%20(MásQuéÉlite).html#${JSON.stringify(module.JSONs)}'>View stages interactively</a>` };
					}
					return true;
				}
			},
			{
				regex: /The correct digit for the ([RGB]) channel is (-?\d+ \((standard|inverted) ([0-9A-Z])\))/,
				handler: function (matches, module) {
					module.CorrectValuesFull[matches[1]] = matches[2];
					module.CorrectValues[matches[1]] = `${matches[3] === 'inverted' ? 'i' : ''}${matches[4]}`;
					if (matches[1] === 'B') {
						module.ListObject.obj.append($(`<tr class='stage-answer'>
							<th colspan='7'>Final answer</th>
							<td class='colored' style='background: #f99' title='${module.CorrectValuesFull.R}'>${module.CorrectValues.R}</td>
							<td class='colored' style='background: #8f8' title='${module.CorrectValuesFull.G}'>${module.CorrectValues.G}</td>
							<td class='colored' style='background: #aaf' title='${module.CorrectValuesFull.B}'>${module.CorrectValues.B}</td>
						</tr>`));
						module.SetCss();
					}
					return true;
				}
			},
			{
				regex: /The correct submission is:|Incorrect Submission:/,
				handler: function (matches, module) {
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
				regex: /.+/,
				handler: function (matches, module) {
					let html = matches[0].replace(/[^\[]([A-Z] [a-z]→[a-z])[^\]]/g, (_, m) => ` <span class='one-d-chess-white-move'>${m}</span>,`)
										  .replace(/\[([A-Z] [a-z]→[a-z])\]/g, (_, m) => `<span class='one-d-chess-black-move'>${m}</span>`);
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


					let obj = $("<div class='twok48'>");

					let gridLabel = $("<div class='grid-label'>");
					let gameContainer = $("<div class='game-container'>");
					let gridContainer = $("<div class='grid-container'>").appendTo(gameContainer);
					let tileContainer = $("<div class='tile-container'>").appendTo(gameContainer);

					let posPerc = function (val) {
						return `${val / 3 * 100}%`;
					};

					for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) $("<div class='backing-tile'>").css({
						left: posPerc(x),
						top: posPerc(y),
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
							let wrapper = $("<div class='wrapper'>").appendTo(tileContainer);
							let inner = $("<div class='inner'>").text(tile.value).appendTo(wrapper);
							let position = tile.previousPosition || { x: tile.x, y: tile.y };

							let style = getTileStyle(tile.value);
							wrapper.css({
								left: posPerc(position.x),
								top: posPerc(position.y),
								zIndex: tile.mergedFrom ? 20 : 10
							});
							inner.css({
								fontSize: getFontSize(tile.value),
								backgroundColor: "#" + style.color,
								color: style.blackText ? "#776e65" : "#f9f6f2",
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


					let leftArrow = $("<span class='arrow-button left'>").text("< Prev").click(function () {
						if (currentGrid > 0) module.actuateGrid(currentGrid - 1);
					}).appendTo(obj);

					obj.append(gridLabel);

					let rightArrow = $("<span class='arrow-button'>").text("Next >").click(function () {
						if (currentGrid < module.Grids.length - 1) module.actuateGrid(currentGrid + 1);
					}).appendTo(obj);

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
					function seg(segment, digit) {
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
					function seg2(segment, digit, dash) {
						return dash === "-" ? !seg(segment, digit) : seg(segment, digit);
					}
					function mix(r, g, b) {
						return `#${r ? 'f' : '0'}${g ? 'f' : '0'}${b ? 'f' : '0'}`;
					}
					if (/Initial( Values: \( -?\d, -?\d, -?\d \))$/.test(matches[0])) {
						let m = /Initial( Values: \( -?\d, -?\d, -?\d \))$/.exec(matches[0]);
						let t = matches[0];
						matches = /Stage (\d+): LED: (.+), Values: \( (-?)(\d), (-?)(\d), (-?)(\d) \)$/.exec(`Stage 0: LED: Black,${m[1]}`);
						matches[0] = t;
					}

					let Colors = { "Red": "#f00", "Green": "#0f0", "Blue": "#00f", "White": "#fff", "Black": "#000" };
					let svg = [
						`<circle class='led' cx='0' cy='0' r='0.5' fill='${Colors[matches[2]]}'/>`,
						`<path class='segment' d='m0.8 -.2h2l-.5 .5h-1z' fill='${seg2('a', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,
						`<path class='segment' d='m0.7 -.1v2l.5 -.25v-1.25z' fill='${seg2('b', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,
						`<path class='segment' d='m2.9 -.1v2l-.5 -.25v-1.25z' fill='${seg2('c', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,
						`<path class='segment' d='m0.8 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${seg2('d', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,
						`<path class='segment' d='m0.7 2.1v2l.5 -.5v-1.25z' fill='${seg2('e', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,
						`<path class='segment' d='m2.9 2.1v2l-.5 -.5v-1.25z' fill='${seg2('f', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,
						`<path class='segment' d='m0.8 4.2h2l-.5 -.5h-1z' fill='${seg2('g', matches[4], matches[3]) ? '#f00' : '#000'}'/>`,

						`<path class='segment' d='m3.2 -.2h2l-.5 .5h-1z' fill='${seg2('a', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,
						`<path class='segment' d='m3.1 -.1v2l.5 -.25v-1.25z' fill='${seg2('b', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,
						`<path class='segment' d='m5.3 -.1v2l-.5 -.25v-1.25z' fill='${seg2('c', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,
						`<path class='segment' d='m3.2 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${seg2('d', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,
						`<path class='segment' d='m3.1 2.1v2l.5 -.5v-1.25z' fill='${seg2('e', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,
						`<path class='segment' d='m5.3 2.1v2l-.5 -.5v-1.25z' fill='${seg2('f', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,
						`<path class='segment' d='m3.2 4.2h2l-.5 -.5h-1z' fill='${seg2('g', matches[6], matches[5]) ? '#0f0' : '#000'}'/>`,

						`<path class='segment' d='m5.6 -.2h2l-.5 .5h-1z' fill='${seg2('a', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,
						`<path class='segment' d='m5.5 -.1v2l.5 -.25v-1.25z' fill='${seg2('b', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,
						`<path class='segment' d='m7.7 -.1v2l-.5 -.25v-1.25z' fill='${seg2('c', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,
						`<path class='segment' d='m5.6 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${seg2('d', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,
						`<path class='segment' d='m5.5 2.1v2l.5 -.5v-1.25z' fill='${seg2('e', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,
						`<path class='segment' d='m7.7 2.1v2l-.5 -.5v-1.25z' fill='${seg2('f', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,
						`<path class='segment' d='m5.6 4.2h2l-.5 -.5h-1z' fill='${seg2('g', matches[8], matches[7]) ? '#00f' : '#000'}'/>`,

						`<path class='segment' d='m8.2 -.2h2l-.5 .5h-1z' fill='${mix(seg2('a', matches[4], matches[3]), seg2('a', matches[6], matches[5]), seg2('a', matches[8], matches[7]))}'/>`,
						`<path class='segment' d='m8.1 -.1v2l.5 -.25v-1.25z' fill='${mix(seg2('b', matches[4], matches[3]), seg2('b', matches[6], matches[5]), seg2('b', matches[8], matches[7]))}'/>`,
						`<path class='segment' d='m10.3 -.1v2l-.5 -.25v-1.25z' fill='${mix(seg2('c', matches[4], matches[3]), seg2('c', matches[6], matches[5]), seg2('c', matches[8], matches[7]))}'/>`,
						`<path class='segment' d='m8.2 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${mix(seg2('d', matches[4], matches[3]), seg2('d', matches[6], matches[5]), seg2('d', matches[8], matches[7]))}'/>`,
						`<path class='segment' d='m8.1 2.1v2l.5 -.5v-1.25z' fill='${mix(seg2('e', matches[4], matches[3]), seg2('e', matches[6], matches[5]), seg2('e', matches[8], matches[7]))}'/>`,
						`<path class='segment' d='m10.3 2.1v2l-.5 -.5v-1.25z' fill='${mix(seg2('f', matches[4], matches[3]), seg2('f', matches[6], matches[5]), seg2('f', matches[8], matches[7]))}'/>`,
						`<path class='segment' d='m8.2 4.2h2l-.5 -.5h-1z' fill='${mix(seg2('g', matches[4], matches[3]), seg2('g', matches[6], matches[5]), seg2('g', matches[8], matches[7]))}'/>`
					];

					module.push({ label: matches[0], obj: $('<svg>').html(`<svg class='seven-graphic' viewBox='-.6 -.6 11.1 5'>${svg.join('')}</svg>`) });
					return true;
				}
			},
			{
				regex: /This gives the final segment combinations in reading order: (.), (.), (.), (.), (.), (.), (.)/,
				handler: function (matches, module) {
					let Colors = { "R": "#f00", "G": "#0f0", "B": "#00f", "W": "#fff", "K": "#000", "C": "#0ff", "M": "#f0f", "Y": "#ff0" };
					let svg = [
						`<path class='segment' d='m8.2 -.2h2l-.5 .5h-1z' fill='${Colors[matches[1]]}'/>`,
						`<path class='segment' d='m8.1 -.1v2l.5 -.25v-1.25z' fill='${Colors[matches[2]]}'/>`,
						`<path class='segment' d='m10.3 -.1v2l-.5 -.25v-1.25z' fill='${Colors[matches[3]]}'/>`,
						`<path class='segment' d='m8.2 2l.5 -.25h1l.5 .25 -.5 .25h-1z' fill='${Colors[matches[4]]}'/>`,
						`<path class='segment' d='m8.1 2.1v2l.5 -.5v-1.25z' fill='${Colors[matches[5]]}'/>`,
						`<path class='segment' d='m10.3 2.1v2l-.5 -.5v-1.25z' fill='${Colors[matches[6]]}'/>`,
						`<path class='segment' d='m8.2 4.2h2l-.5 -.5h-1z' fill='${Colors[matches[7]]}'/>`,
					];

					module.push({ label: matches[0], obj: $('<svg>').html(`<svg class='seven-graphic' viewBox='-.6 -.6 11.1 5'>${svg.join('')}</svg>`) });
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
							$("<img class='algebra-image'>")
								.attr('src', 'img/Algebra/' + matches[2].replace(/\+/g, '%2B') + '.png')
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
		moduleID: "algorithmia",
		loggingTag: "Algorithmia",
		matches: [
			{
				regex: /^The walls of the generated maze are as follows:$/,
				handler: function (matches, module) {
					module.push({ label: matches[0], obj: pre(readTaggedLines(9).join('\n')) });
					return true;
				}
			},
			{
				regex: /^==MAZE GENERATION==$/,
				handler: function (_, module) {
					module.generatingMaze = true;
					module.algorithmiaMaze = [];
					return true;
				}
			},
			{
				regex: /^The maze is being generated using (.+)$/,
				handler: function (matches, module) {
					readLine();
					module.push(matches[0]);
					return true;
				}
			},
			{
				regex: /^(.+\.) Aborting algorithm\.$/,
				handler: function (matches, module) {
					module.generatingMaze = false;
					module.algorithmiaMaze.push(matches[0])
					module.push(["Maze Generation", module.algorithmiaMaze]);
					readLine();
					return true;
				}
			},
			{
				regex: /^The goal position is at (.+)\./,
				handler: function (matches, module) {
					module.algorithmiaMoving = true;
					module.push(matches[0]);
					module.algorithmiaMoves = [];
					module.push(["Moves", module.algorithmiaMoves]);
					return true;
				}
			},
			{
				regex: /^Goal position reached. Module solved.$/,
				handler: function (matches, module) {
					module.push(matches[0]);
					return true;
				}
			},
			{
				regex: /.+/,
				handler: function (matches, module) {
					if (module.generatingMaze) {
						module.algorithmiaMaze.push(matches[0]);
						return true;
					}
					if (module.algorithmiaMoving) {
						module.algorithmiaMoves.push(matches[0]);
						return true;
					}
					module.push(matches[0]);
					return true;
				}
			}
		]
	},
	{
		moduleID: "ANDmodule",
		loggingTag: "A>N<D",
		matches: [
			{
				regex: /Stage \d+:/,
				handler: function(match, module) {
					let lines = readTaggedLines(3).map(l => ({ obj: l.replace(/([∧∨⊻→|↓↔←])/g, "<span class='and-logic-symbol'>$1</span>")}) );
					module.push([ match.input, lines]);
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: 'ApplePenModule',
		loggingTag: 'Apple Pen',
		matches: [
			{
				regex: /(?:[PAN] ?){36}/,
				handler: function (match, module) {
					module.grid = match[0].split(' ');
				}
			},
			{
				regex: /Starting position: (..)/,
				handler: function (match, module) {
					const icons = { 'A':'apple', 'P':'pen', 'N':'pineapple' };
					
					const startCol = 'ABCDEF'.indexOf(match[1][0]);
					const startRow = match[1][1] - '1';
				
					let table = "<table class='ppap-table' style='width: 3in;'>";
					for (let row = 0; row < 6; row++) {
						table += '<tr>'; 
						for (let col = 0; col < 6; col++) {
							const icon = icons[module.grid[6 * row + col]];
							const fill = row == startRow && col == startCol ? '#8F8' : 'none';
							table += `<td style='background: ${fill}'> 
										<img src='img/PPAP/${icon}.png'/> 
									</td>`;
						}
						table += '</tr>';
					}
					module.push({ label:'Grid: (starting on green)', obj:table });
				}
			},
			{
				regex: /Possible solution|submitted/
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
		moduleID: "ArithmeticCipherModule",
		displayName: "Arithmetic Cipher",
		loggingTag: "Arithmetic Cipher",
		matches: [
			{
				regex: /^Frequency table:$/,
				handler: function (matches, module) {
					let lines = readLines(2);
					function p(n) {
						return `<tr>${Array(14).fill(null).map((_, ix) => `<th>${(ix + n) < 26 ? String.fromCharCode(65 + ix + n) : ['EOF', 'total'][ix + n - 26]}</th>`).join('')}</tr>` + lines.map(line => `<tr>${line.replace(/^\[Arithmetic Cipher #\d+\] /, '').split(',').slice(n, n + 14).map(v => `<td>${v}</td>`).join('')}</tr>`).join('');
					}
					let table = $(`<div><table class='arith-c-freq-table'>${p(0)}</table>
										<table class='arith-c-freq-table'>${p(14)}</table></div>`);
					module.push({ label: 'Frequency table:', obj: table });
					return true;
				}
			},
			{
				regex: /^(?:Start values|After (formulas|column removals)):$/,
				handler: function (matches, module) {
					let lines = readLines(3).map(line => line.replace(/^\[Arithmetic Cipher #\d+\] (High|Low|Code): /, ''));
					let shifts = matches[1] === 'formulas' ? /Shifts: (\d+),(\d+)/.exec(readLine()).slice(1).map(v => v | 0) : [0, 0];
					function mark(str) {
						if (shifts[1] !== 0)
							str = str.substr(0, shifts[0] + 1) + `<span class='blue'>${str.substr(shifts[0] + 1, shifts[1])}</span>` + str.substr(shifts[0] + 1 + shifts[1]);
						if (shifts[0] !== 0)
							str = `<span class='red'>${str.substr(0, shifts[0])}</span>` + str.substr(shifts[0]);
						return str;
					}
					let table = $(`<table class='bit-value-table'>
										<tr><th>High:</th><td class='bits'>${mark(lines[0])}</td></tr>
										<tr><th>Low:</th><td class='bits'>${mark(lines[1])}</td></tr>
										<tr><th>Code:</th><td class='bits'>${mark(lines[2])}</td></tr>
									</table>`);
					
					module.push({ label: matches[0], obj: table });
					return true;
				}
			},
			{ regex: /.+/ }
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
				regex: /^(The hand on the (left|right) is) (.+)—(a(n|)(.+))$/,
				handler: function (matches, module) {
					module.push(matches[1] + ':');
					module.push({ obj: $("<span class='badugi-cards'>").text(matches[3]), nobullet:true });
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

					var table = $("<table class='battleship-table'>");
					for (r = 0; r < 6; r++) {
						tr = $('<tr>').appendTo(table);
						for (c = 0; c < 6; c++) {
							td = $('<td>').appendTo(tr);
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

								$('<img>').attr('src', '../HTML/img/Battleship/' + imgId + '.png').attr('width', '50').appendTo(td);
								if (stuff[r][c].IsSafeLocation)
									td.addClass('safe');
							}
						}
					}

					module.push({ label: "Solution:", obj: table });
				}
			}
		]
	},
	{
		displayName: "Binary Cipher",
		moduleID: "binarycipher",
		loggingTag: "Binary Cipher",
		matches: [
			{
				regex: /Grid \d:|Table \w|The 4 by 4 matrix/,
				handler: function(match, module) {
					const grid = readTaggedLines(4);
					let table = $("<table class='binary-c-table'>");
					for (let row = 0; row < 4; row++) {
						let tr = $("<tr>").appendTo(table);
						for (let col = 0; col < 4; col++)
							$("<td>").text(grid[row][col]).appendTo(tr);
					}
					module.push({ label:match.input, obj:table });
					return true;
				}
			},
			{
				regex: /.+/
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
						obj: $(`<table class='binary-puzzle-table'>${arr.map(y => `<tr>${arr.map(x => {
							var val = matches[2][x + 6 * y];
							return `<td${val === '1' ? ` class='green'` : val === '0' ? ` class='red'` : ''}>${val}</td>`;
						}).join('')}</tr>`).join('')}</table>`)
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

					const tree = $("<svg class='binary-tree' viewBox='-2.5 -0.5 5 3'>");
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
						$SVG(`<line x1=${start[0]} y1=${start[1]} x2=${end[0]} y2=${end[1]}>`).appendTo(tree);
					}

					// Make nodes
					const characters = readMultiple(10).replace(/[^\w]/g, "");
					for (let i = 0; i < 21; i += 3) {
						const buttonColor = colors[characters[i]];
						const text = characters[i + 1];
						const textColor = colors[characters[i + 2]];
						const position = positions[i / 3];

						$SVG(`<circle cx=${position[0]} cy=${position[1]} fill=${buttonColor} r=0.45>`).appendTo(tree);
						$SVG(`<text x=${position[0]} y=${position[1]} fill=${textColor}>`)
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
					const glyph = matches[3];
					const itempair = [glyph[0], glyph.substring(1)];
					const index = (("ABCDE".indexOf(itempair[0]) + 1) + (5 * (itempair[1] - 1)) - 1);
					const name = "ABCDEFGH".charAt(Math.floor(index / 7)) + ((index + 1) % 7 == 0 ? 7 : (index + 1) % 7);
					const img = `<img class='bioscanner-image' 	src='img/The Bioscanner/${name}.png' height='100' />`;

					module.push({ label:matches[1] + ':', obj:img});
					return true;
				}
			},
			{
				regex: /^(The current offset is \d+\. This means the current glyphs are) ((([ABCDE]\d+)(, |, and )*){3})\.$/,
				handler: function (matches, module) {
					const glyphs = matches[2].split(', ').slice(0, 2).concat(matches[2].split(', ')[2].substring(4));
					let actualGlyphs = [];
					let div = $('<div>');

					glyphs.forEach(element => {
						let itempair = [element.charAt(0), element.substring(1)];
						let index = (("ABCDE".indexOf(itempair[0]) + 1) + (5 * (itempair[1] - 1)) - 1);
						actualGlyphs.push("ABCDEFGH".charAt(Math.floor(index / 7)) + ((index + 1) % 7 == 0 ? 7 : (index + 1) % 7).toString());
					});
					for (var i = 0; i < actualGlyphs.length; i++) {
						div.append(`<img class='bioscanner-image' src='img/The Bioscanner/${actualGlyphs[i]}.png' height='100'/>`);
					}
					module.push({ label:matches[1] + ':', obj:div});
					return true;
				}
			},
			{
				regex: /^(Fake glyphs are:) (([ABCDE]\d+ )+)$/,
				handler: function (matches, module) {
					const glyphs = matches[2].slice(0, -1).split(' ');
					let actualGlyphs = [];
					let div = $('<div>');

					glyphs.forEach(element => {
						let itempair = [element.charAt(0), element.substring(1)];
						let index = (("ABCDE".indexOf(itempair[0]) + 1) + (5 * (itempair[1] - 1)) - 1);
						actualGlyphs.push("ABCDEFGH".charAt(Math.floor(index / 7)) + ((index + 1) % 7 == 0 ? 7 : (index + 1) % 7).toString());
					});
					for (var i = 0; i < actualGlyphs.length; i++) {
						div.append(`<img class='bioscanner-image' src='img/The Bioscanner/${actualGlyphs[i]}.png' height='100'/>`);
					}
					module.push({ label:matches[1], obj:div });
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
						obj: pre(readTaggedLines(9).join('\n'))
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

					var svg = $(`<svg class='boolean-venn-diagram' viewBox="0 0 348 348">
									<g transform="matrix(1.260512,0,0,1.260512,-59.613368,-83.043883)">
										<path class='section' d="m254 179.9c-11.8-6.8-25.5-10.6-40-10.6-14.7 0-28.4 3.9-40.2 10.8-11.8-6.9-25.6-10.8-40.2-10.8-14.8 0-28.6 4-40.5 10.9 0-44.4 36.1-80.5 80.5-80.5 44.3 0 80.3 35.9 80.4 80.2z"></path>
										<circle class='section' cx="280" cy="110" r="24"></circle>
										<path class='section' d="m173.7 180.1c-0.1 0.1-0.2 0.1-0.3 0.2-23.9 14-40 39.9-40 69.6v0.3l-0.1-0.1c-24.1-13.9-40.3-40-40.3-69.8v-0.1c11.9-6.9 25.7-10.9 40.5-10.9 14.6 0 28.4 3.9 40.2 10.8z"></path>
										<path class='section' d="m254 180.2c0 29.7-16.1 55.7-40 69.6v-0.1-0.3c-0.1-29.6-16.1-55.4-40-69.3-0.1-0.1-0.2-0.1-0.3-0.2 11.8-6.9 25.6-10.8 40.2-10.8s28.2 3.9 40 10.6c0.1 0.3 0.1 0.4 0.1 0.5z""></path>
										<path class='section' d="m214 249.5c-0.1 0.2-0.2 0.3-0.3 0.5-11.8 6.8-25.5 10.7-40.2 10.7-14.6 0-28.2-3.9-40-10.6v-0.3c0-29.7 16.1-55.6 40-69.6h0.1 0.5c23.7 14 39.8 39.7 39.9 69.3z""></path>
										<path class='section' d="m173.7 319.5c-11.8 6.9-25.6 10.8-40.2 10.8-44.5 0-80.5-36-80.5-80.5 0-29.7 16.1-55.7 40-69.6v0.1c0 29.8 16.2 55.9 40.3 69.8 0 0.1 0.1 0.1 0.1 0.2 0.2 29.6 16.4 55.4 40.3 69.2z"></path>
										<path class='section' d="m294.5 249.8c0 44.5-36.1 80.5-80.5 80.5-14.7 0-28.4-3.9-40.2-10.8 24-13.9 40.2-39.9 40.2-69.7 24-14 40-39.9 40-69.6v-0.3c24.2 13.9 40.5 40 40.5 69.9z"></path>
										<path class='section' d="m214 249.9c0 29.8-16.2 55.8-40.2 69.7-23.9-13.8-40.1-39.7-40.2-69.3v-0.1c11.8 6.8 25.5 10.6 40 10.6 14.6 0 28.4-3.9 40.2-10.7 0-0.1 0.1-0.2 0.2-0.2z""></path>
									</g>
								</svg>`)
						.appendTo("body");

					var sections = ["A", "NONE", "AB", "AC", "ABC", "B", "C", "BC"];
					var positions = {
						"AB": "translate(125px, 200px)",
						"AC": "translate(225px, 200px)",
						"B": "translate(93px, 275px)",
						"C": "translate(254px, 275px)"
					};

					readMultiple(16).match(/[UL]/g).forEach(function (letter, index) {
						var elem = svg.find(".section").eq(index);
						elem.attr("fill", letter == "L" ? "#FF8F8F" : "#8FFF8F");

						var bbox = elem[0].getBBox();
						var text = sections[index];
						$SVG("<text class='section-text'>")
							.text(text)
							.css({
								transform: positions[text] || "translate(" + (bbox.x + bbox.width / 2) + "px, " + (bbox.y + bbox.height / 2) + "px)",
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
					module.push({ label: matches[0], obj: pre(readTaggedLines(8).join('\n').replace(/_/g, " ").split("\n").filter(l => l.trim()).join("\n")) });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: 'BoozleageModule',
		loggingTag: 'Boozleage',
		matches: [
			{
				regex: /Square [A-C] has letter ([A-Z]) with vertices at ([A-H][1-8]), ([A-H][1-8]), ([A-H][1-8]), ([A-H][1-8])/,
				handler: function (matches, module) {
					const letters = [ 'A','B','C','D','E','F','G','H' ];
					if (!module.squares)
						module.squares = [ ];
					let vs = [ ];
					for (let i = 0; i < 4; i++) {
						vs.push({ x:letters.indexOf(matches[i + 2][0]), y: matches[i + 2][1] - '1'});
					}
					module.squares.push( { letter: matches[1], vertices: vs } );
				}
			},
			{
				regex: /Full grid/,
				handler: function(_, module){
					const grid = readTaggedLines(8).map(l => l.split(' '));;
					const colors = { 'R':'#F00', 'Y':'#FF0', 'G':'#0F0', 'B':'#00F', 'M':'#F0F', 'W':'#FFF' };
					const octagonPath = 'M0 5l5-5h10l5 5v10l-5 5h-10l-5-5z';
					let svg = `<svg class='boozleage' viewbox='-2 -2 172 172'>`;

					for (let row = 0; row < 8; row++) {
						for (let col = 0; col < 8; col++) {
							const cell = grid[row][col];
							const glyphName = `Set ${cell[1]} - ${cell[0]}`;
							svg += `<path class='button' d='${octagonPath}' fill='${colors[cell[2]]}' transform='translate(${20 * col}, ${20 * row})'/>`;
							svg += `<image href='../HTML/img/Boozleglyphs/${glyphName}.svg' x='${20 * col + 4}' y='${20 * row + 4}' width='12' height='12'/>`;
						}
					}
					for (let square of module.squares){
						let d = `	M ${20 * square.vertices[0].x + 10} ${20 * square.vertices[0].y + 10}
									L ${20 * square.vertices[1].x + 10} ${20 * square.vertices[1].y + 10}
									L ${20 * square.vertices[3].x + 10} ${20 * square.vertices[3].y + 10}
									L ${20 * square.vertices[2].x + 10} ${20 * square.vertices[2].y + 10} z`;
						svg += `<path class='square' d='${d}'/>`;
					}
					for (let square of module.squares) {
						const cx = 20 * square.vertices[3].x + 20;
						const cy = 20 * square.vertices[3].y + 20
						svg += `<circle class='letter-circle' r='7' cx='${cx}' cy='${cy}'/>
								<text class='letter' x='${cx}' y='${cy}'>${square.letter}</text>`;
					}
					module.push({ label:'Displayed grid:', obj: svg });
				}
			},
			{
				regex: /The button at|Pressed/
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
						var braille = $('<svg class="braille-pattern" viewBox="-0.5 -0.5 2 3"></svg>').appendTo(div);

						spots.split("-").forEach(function (posStr) {
							var pos = parseInt(posStr) - 1;
							$SVG('<circle class="dot" r="0.4"></circle>').attr("cx", Math.floor(pos / 3)).attr("cy", pos % 3).appendTo(braille);
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
							var highlight = $SVG('<rect class="highlight" width="1" height="1"></rect>').attr("x", Math.floor(dotPos / 3) - 0.5).attr("y", dotPos % 3 - 0.5).prependTo(module.braille[char]);
							text = $SVG('<text class="on-dot"></text>').text(flipNumber + 1).attr("x", Math.floor(dotPos / 3)).attr("y", dotPos % 3).appendTo(module.braille[char]);

							module.flippedSVG[absPos] = [highlight, text];
						} else {
							var svg = module.flippedSVG[absPos];
							svg[0].attr("fill", "rgba(255, 0, 0, 0.5)");
							svg[1].text(`${svg[1].text()} ${flipNumber + 1}`).attr("font-size", parseFloat(svg[1].attr("font-size")) - 0.15);
							text = svg[1];
						}

						var noDot = module.braille[char].children("circle").filter(function (_, circle) { return $(circle).attr("cx") == text.attr("x") && $(circle).attr("cy") == text.attr("y"); }).length == 0;
						if (noDot) {
							text.addClass('no-dot');
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
		//IN NEED OF REMOVING INLINE CSS. THE MODULE HAS NOT BEEN REUPLOADED AT THIS POINT.	
		displayName: "Brown's Shadow",
		moduleID: "brownsShadow",
		loggingTag: "Brown's Shadow",
		matches: [
			{
				regex: /^Chose net: \((.*)\)$/,
				handler: function (matches, module) {
					let coords = matches[1].split('), (')
						.map(str => str.split(', ').map(c => parseInt(c)))
						.map(arr => ({ x: arr[0], y: arr[1], z: arr[2] }));
					for (let c of coords)
						c.p = { x: 21 * c.x - 15 * c.y, y: -5 * c.x - 6 * c.y - 24 * c.z };
					module.BrownsShadowInfo = { coords: coords };
					return true;
				}
			},
			{
				regex: /^(Cube|The correct cell to submit is) \((.*)\)(?: (corresponds to|is displaying) (.*))?\.$/,
				handler: function (matches, module) {
					let inf = module.BrownsShadowInfo;
					let coords = matches[2].split(', ').map(c => parseInt(c));
					let ix = inf.coords.findIndex(c => c.x === coords[0] && c.y === coords[1] && c.z === coords[2]);
					let isSolution = matches[1] !== 'Cube';
					if (!isSolution) {
						if (matches[3] === 'corresponds to')
							inf.coords[ix].label = ['left', 'front', 'back', 'right', 'up', 'zig', 'down', 'zag'][matches[4]];
						else
							inf.coords[ix].label2 = matches[4];
					}
					else {
						inf.coords[ix].label2 = 'solution';
						inf.coords[ix].isSolution = true;
						inf.coords.sort((one, two) => (two.y - one.y) || (one.z - two.z) || (two.x - one.x));

						let txt = c.label2 ? `<text x='3' y='${c.label2.length === 1 ? -7 : -9}' font-size='${c.label2.length === 1 ? 6 : 4}' fill='${c.isSolution ? '#0a0' : '#a00'}'>${c.label2}</text>` : '';
						let cubes = inf.coords.map(c => `<g transform='translate(${c.p.x} ${c.p.y})'><path d='M 21,-5 6,-11 m -21,5 21,-5 m 0,-24 v 24' fill='none' stroke='black' stroke-width='.5' opacity='.2' /><text x='3' y='-14'>${c.label}</text>${txt}<path opacity='.3' d='m 0,-24 -15,-6 21,-5 15,6 z M 0 0 -15,-6 v -24 l 15,6 z m 0,0 v -24 l 21,-5 v 24 z' fill='#eee' stroke='#000' stroke-width='.5' /></g>`).join('');
						inf.coords.sort((one, two) => one.p.x - two.p.x);
						let minX = inf.coords[0].p.x;
						let maxX = inf.coords[7].p.x;
						inf.coords.sort((one, two) => one.p.y - two.p.y);
						let minY = inf.coords[0].p.y;
						let maxY = inf.coords[7].p.y;
						let svg = `<svg viewBox='${minX - 16} ${minY - 36} ${maxX - minX + 138} ${maxY - minY + 37}' stroke-linejoin='round' text-anchor='middle' font-size='9'>${cubes}</svg>`;
						module.push({ label: 'Chosen net:', obj: $(svg) });
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
		moduleID: 'buttonageModule',
		loggingTag: 'Buttonage',
		matches: [
			{
				regex: /Buttons:/,
				handler: function(_, module) {
					const grid = readTaggedLines(8).map(l => l.split(' '));;
					const colors = { 'R':'#F00', 'G':'#0F0', 'B':'#00F', 'Y':'#FF0', 'K':'#000', 'W':'#FFF', 'I':'#FFA8F3', 'O':'#EE5716', 'A':'#777' };
					const textColors = { 'R':'#FFF', 'G':'#FFF', 'B':'#FFF', 'W':'#F00', 'Y':'#FF8F00' };
					let svg = `<svg class='buttonage' viewbox='-1 -1 162 162'>`;
					for (let row = 0; row < 8; row++){
						for (let col = 0; col < 8; col++) {
							const cell = grid[row][col];
							const cx = 20 * col + 10;
							const cy = 20 * row + 10;
							svg += `<circle class='button' r='10' cx='${cx}' cy='${cy}' fill='${colors[cell[1]]}'/>
									<circle class='button' r='8'  cx='${cx}' cy='${cy}' fill='${colors[cell[0]]}'/>`;
							if (cell.length > 2)
								svg += `<text class='button-text' x='${cx}', y='${cy}' fill='${textColors[cell[0]]}'>${cell[2]}</text>`;
						}
					}
					module.push({ label:'Buttons:', obj:svg + '</svg>' });
					linen++;
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
		moduleID: 'caRPS',
		loggingTag: 'CA-RPS',
		matches: [
			{
				regex: /The (initial|target) grid:/,
				handler: function(matches, module) {

					const colors = { 'R':'#F00', 'P':'#0F0', 'S':'#00F', 'X':'#000' };
					const pics = { 'R':'Rock', 'P':'Paper', 'S':'Scissors', 'X':'WEEDNUTS' };
					const grid = readTaggedLines(8);
					let svg = `<svg class='ca-rps' viewbox='0 0 60 80'>`;

					for (let row = 0; row < 8; row++){
						for (let col = 0; col < 6; col++) {
							const sign = grid[row][col];
							const color = colors[sign];
							svg += `<rect class='tile' x='${10 * col}' y='${10 * row}' width='10' height='10' fill='${color}'/>`;
							if (sign != 'X')
								svg += `<image href='img/CA-RPS/${pics[sign]}.png' x='${10 * col + 1}' y='${10 * row + 1}' width='8' height='8'/>`;
						}
					}
					svg += `</svg>`;
					module.push({label:matches[0], obj:svg});
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
					var table = $('<table class="chess-table">');
					$('<tr class="coordinate-indicator-row"><td></td><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f</td></tr>').appendTo(table);
					for (var y = 0; y < 6; y++) {
						var tr = $('<tr>').appendTo(table).append($('<td class="coordinate-indicator-cell-left">' + (6 - y) + '</td>'));
						for (var x = 0; x < 6; x++) {
							var td = $('<td class="tile">').appendTo(tr);
							if (x == 0)
								td.addClass('left-edge');
							else if (x == 5)
								td.addClass('right-edge');
							if (y == 0)
								td.addClass('top-edge');
							else if (y == 5)
								td.addClass('bottom-edge');
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
								td.addClass('solution-red');
							else if ((x + y) % 2 !== 0)
								td.addClass('gray');
							else 
								td.addClass('white');
							if (svg !== null)
								td.css({ 'background-image': 'url(\'data:image/svg+xml,' + svg.replace('#', '%23') + '\')' });
							
						}
						tr.append($('<td class="coordinate-indicator-cell-right">' + (6 - y) + '</td>'));
					}
					$('<tr class="coordinate-indicator-row"><td></td><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td><td>f</td></tr>').appendTo(table);

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
		moduleID: "colorGrid",
		loggingTag: "Color Grid",
		matches: [
			{
				regex: /reading/,
				handler: function (matches, module) {
					module.buttonGroup = [matches.input, []];
					for (let i = 0; i < 25; i++) {
						let line = readLine();
						module.buttonGroup[1].push(line.replace(/\[Color Grid #\d+\]/, ((i + 1) + "").padStart(2, '0') + "."));
					}
					module.push("The buttons are:", { obj: this.parseButtons(module.buttonGroup[1]), nobullet: true });
					return true;
				},
				parseButtons: buttons => {
					let groups = "";
					for (let i = 0; i < 5; i++) {
						for (let j = 0; j < 5; j++) {
							let color = /\[(\w+)\]/.exec(buttons[j * 5 + i])[1];
							color = color === "Inactive" ? "black" : color.toLowerCase();
							groups += `<circle class='button' r="9" cx="${10 + 20 * i}" cy="${10 + 20 * j}"/>`;
							groups += `<rect width="10" height="10" x="${5 + 20 * i}" y="${5 + 20 * j}" transform="rotate(45 ${5 + 20 * i + 5} ${5 + 20 * j + 5})" fill="${color}"/>`; //https://stackoverflow.com/a/62403727/18917656
						}
					}
					const svg = $(`<svg class='color-grid-stage' viewBox="0 0 100 100">${groups}</svg>`);
					return svg;
				}
			},
			{
				regex: /.+/
			}
		]
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
								module.SwitchInfo.dom.obj = $("<svg class='colored-switches' stroke-width='0.25' stroke='black' viewBox='-5 -5 135 " + (50 * module.SwitchInfo.y + 5) + "'>" + module.SwitchInfo.svg + "</svg>")
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
							"<ellipse class='switch-base' cx='5.5' cy='17.5' rx='4.2' ry='2' />" +
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
								"<line class='connector' x1='{x}' y1='{y1}' x2='{x}' y2='{y2}' />"
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
							module.SwitchInfo.svg = "<text class='desired-state' x='70' y='" + (50 * module.SwitchInfo.y - 3) + "'>Desired state:</text>" + module.SwitchInfo.svg;
							break;
					}

					svg = "<g transform='translate(" + x + "," + (50 * module.SwitchInfo.y) + ")'><rect class='state' x='0' y='0' width='55' height='35' />" + svg + "</g>";

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
						"<line class='connector' x1='{x}' y1='{y1}' x2='{x}' y2='{y2}' /><g class='incorrect' transform='translate({x}, {y2})'><line x1='-4' y1='-4' x2='4' y2='4' /><line x1='4' y1='-4' x2='-4' y2='4' /></g>"
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
		displayName: "Color One Two",
		moduleID: "colorOneTwo",
		loggingTag: "Color One Two",
		matches: [
			{
				regex: /The \w+ led's color is \w+/,
				handler: function (matches, module) {
					module.push(matches[0] + '.');
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
				regex: /Module ge/,
				handler: function (matches, module) {
					let table = $('<table class="colour-flash-table">');
					let rowHeader = $('<tr>').appendTo(table);
					$('<th>').text("#").appendTo(rowHeader);
					$('<th>').text("Word").appendTo(rowHeader);
					$('<th>').text("Color").appendTo(rowHeader);
					$('<th>').text("Valid Response").appendTo(rowHeader);
					let count = 0;
					let exp = /(?:\[Colour Flash Translated #\d+\] )?(\d)\s?(?:\||:)(?: Word)? ([^\s]+)\s+(?:\||,)(?: Color)? ([^\s]+)\s+(?:\||:)(?: Valid Response)?\s+(.+)/;
					for (let i = 0; i < 15; i++) {
						let line = readLine();
						if (exp.test(line)) {
							count++;
							let tr = $('<tr>').appendTo(table);
							let match = exp.exec(line);
							for (let j = 1; j <= 4; j++) {
								let td = $('<td>').text(match[j]).appendTo(tr);
								if (j == 4)
									td.addClass('centered');
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
							module.diagram = $SVG(`<svg class='comp-wires'>`);
							module.splice(0, 0, { obj: module.diagram, nobullet: true, });
						}

						const wireIndex = parseInt(wireData[1]);
						if (module.parsedWires == undefined) module.parsedWires = [];
						if (module.parsedWires[wireIndex] == true) return;
						module.parsedWires[wireIndex] = true;

						const x = wireIndex * 0.6;
						module.diagram.attr("viewBox", `-0.05 -0.05 ${x + 1.1} 2.75`);

						// LED
						$SVG(`<circle class='led ${wireData[6] == "True" ? 'lit' : 'unlit'}' cx=${x + 0.25} cy=.25 r=.25 >`).appendTo(module.diagram);

						// Wire
						const wireColors = wireData[2].split(", ");
						$SVG(`<rect x=${x} y=.55 width=.5 height=1 fill=${wireColors[0]} class='wire'>`).appendTo(module.diagram);
						if (wireColors.length == 2) $SVG(`<rect x=${x + 0.0125} y=${0.55 + (1 / 3)} width=0.475 height=${1 / 3} fill=${wireColors[1]}>`).appendTo(module.diagram);

						// Star
						if (wireData[5] == "True") $SVG(`<path class='star' d="m55,237 74-228 74,228L9,96h240" transform="translate(${x}, 1.6) scale(0.00208333333)">`).appendTo(module.diagram);

						// Rule/Should cut
						$SVG(`<text class='cut ${wireData[8] == "True" ? "green" : "red"}' x=${x + 0.25} y=2.45>${rules[wireData[7]].split("\n").map((a, i) => `<tspan x=${x + 0.25} dy=${i * .2}>${a}</tspan>`).join("")}</text>`).appendTo(module.diagram);
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
						var table = $('<table class="connected-monitors">');
						module.infoTable = table;
						var trHead = $('<tr>').appendTo(table);
						$('<th>').addClass('w60').text("Monitor").appendTo(trHead);
						$('<th>').addClass('w60').text("Number").appendTo(trHead);
						$('<th>').addClass('w60').text("Color").appendTo(trHead);
						$('<th>').addClass('w300').text("Indicator Color(s)").appendTo(trHead);
						$('<th>').addClass('w60').text("Display Color").appendTo(trHead);
						module.push({ label: "Monitors Information:", obj: table });
					}
					var moniPos = matches[1];
					var moniNum = matches[2];
					var moniCol = matches[3];
					var moniInd = matches[4].replace(/Index: (\d): Color: /g, "").replace(/, It is /g, " ").replace(/;/g, ", ");
					var moniDispCol = matches[5];
					var tr = $('<tr>').appendTo(module.infoTable);

					$('<td>').addClass('w60').text(moniPos).appendTo(tr);
					$('<td>').addClass('w60').text(moniNum).appendTo(tr);
					$('<td>').addClass('w60').text(moniCol).appendTo(tr);
					$('<td>').addClass('w60').text(moniInd).appendTo(tr);
					$('<td>').addClass('w60').text(moniDispCol).appendTo(tr);
					return true;
				}
			},
			{
				regex: /Monitor: (\d+):/,
				handler: function (matches, module) {
					if (!('calculationTable' in module)) {
						var table = $('<table class="connected-monitors">')
						module.calculationTable = table;
						var trHead = $('<tr>').appendTo(table);
						
						$('<th>').addClass('w60').text("Monitor").appendTo(trHead);
						$('<th>').addClass('w40').text("S1").appendTo(trHead);
						$('<th>').addClass('w40').text("S2").appendTo(trHead);
						$('<th>').addClass('w40').text("S3").appendTo(trHead);
						$('<th>').addClass('w40').text("S4").appendTo(trHead);
						$('<th>').addClass('w40').text("S5").appendTo(trHead);
						$('<th>').addClass('w80').text("Final").appendTo(trHead);
						module.push({ label: "Calculation:", obj: table });
					}
					var Monitor = matches[1];
					var Sec1 = readTaggedLine().replace(/Monitor: (\d+), Section: 1, Score: /, "");
					var Sec2 = readTaggedLine().replace(/Monitor: (\d+), Section: 2, Score: /, "");
					var Sec3 = readTaggedLine().replace(/Monitor: (\d+), Section: 3, Score: /, "");
					var Sec4 = readTaggedLine().replace(/Monitor: (\d+), Section: 4, Score: /, "");
					var Sec5 = readTaggedLine().replace(/Monitor: (\d+), Section: 5, Score: /, "");
					var TScr = readTaggedLine().replace(/Monitor: (\d+), Total score: /, "");
					var tr = $('<tr>').appendTo(module.calculationTable);

					$('<td>').addClass('w60').text(Monitor).appendTo(tr);
					$('<td>').addClass('w40').text(Sec1).appendTo(tr);
					$('<td>').addClass('w40').text(Sec2).appendTo(tr);
					$('<td>').addClass('w40').text(Sec3).appendTo(tr);
					$('<td>').addClass('w40').text(Sec4).appendTo(tr);
					$('<td>').addClass('w40').text(Sec5).appendTo(tr);
					$('<th>').addClass('w80').text(TScr).appendTo(tr);
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

					var table = $('<table class="coordinates-table">');
					for (x = 0; x < module.Width; x++)
						$('<col>').attr('width', (99 / module.Width) + '%').appendTo(table);
					for (var y = 0; y < module.Height; y++) {
						var tr = $('<tr>').appendTo(table);
						for (x = 0; x < module.Width; x++) {
							var key = String.fromCharCode(65 + x) + (y + 1);
							var td = $('<td>').appendTo(tr);
							if (key in module.Coordinates)
								td.text(module.Coordinates[key].Text).addClass(`clue 
																			${module.Coordinates[key].Legal ? 'green' : 'red'} 
																			${module.Coordinates[key].Text.length > 6 ? 'small' : 'large'}`);
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
					var table = $('<table class="crackbox">');
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
								$('<td>').addClass('black').text(' ').appendTo(tr);
							}
							else if (gridinitial[c + 4 * r] === gridfinal[c + 4 * r]) {
								if (gridfinal[c + 4 * r] === "0")
									$('<td>').addClass('number submitted').text('10').appendTo(tr);
								else $('<td>').addClass('number submitted').text(gridfinal[c + 4 * r]).appendTo(tr);
							}
							else {
								if (gridfinal[c + 4 * r] === "0") 
									$('<td>').addClass('number given').text('10').appendTo(tr);
								else $('<td>').addClass('number given').text(gridfinal[c + 4 * r]).appendTo(tr);
							}
						}
					};
					module.push({ label: "Possible solution:", obj: table });
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
		moduleID: "CrittersModule",
		loggingTag: "Critters",
		matches: [
			{
				regex: /^(The grid was:|IP#\d: |The expected grid is: )$/,
				handler: function (matches, module) {
					let binary = readTaggedLine();
					let grid = binary.match(/.{1,8}/g);
					let table = $('<table>').addClass('critters');
					for (let x = 0; x < 8; x++) {
						let tr = $('<tr>').appendTo(table);
						for (let y = 0; y < 8; y++) {
							let td = $('<td>').text(' ').appendTo(tr)
							if (grid[x][y] == '0') 
								td.addClass('gray');
							else td.addClass(module.color.toLowerCase());
						}
					}
					module.push({ label: matches[0], obj: table });
					return true;
				}
			},
			{
				regex: /^The colour shown on the module is (Yellow|Pink|Blue), which indicates that we will be using the (reverse|standard|alternative) ruleset\.$/,
				handler: function (matches, module) {
					module.color = matches[1];
					module.push(matches[0]);
					return true;
				}
			},
			{
				regex: /^Submitted grid: ([10]{64})\. Expected grid: ([10]{64})\. Strike!$/,
				handler: function (matches, module) {
					let tables = [];
					for (let i = 0; i < 2; i++) {
						let grid = matches[i + 1].match(/.{1,8}/g);
						let table = $('<table>').addClass('critters');
						for (let x = 0; x < 8; x++) {
							let tr = $('<tr>').appendTo(table);
							for (let y = 0; y < 8; y++) {
								let td = $('<td>').text(' ').appendTo(tr)
								if (grid[x][y] == '0') 
									td.addClass('gray');
								else td.addClass(module.color.toLowerCase());
							}
						}
						tables.push(table);
					}
					module.push({ label: 'Submitted grid:', obj: tables[0] });
					module.push({ label: 'Expected grid:', obj: tables[1] });
					module.push('Strike!')
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "matchemcruel",
		loggingTag: "Cruel Match 'em",
		matches: [
						{
				regex: /The initial configuration of cards is:/,
				handler: function(_, module) {
					module.cardBacks = { 'R':'#F00', 'O':'#F80', 'Y':'#F8FF00', 'L':'#8F0', 'F':'#082', 'B':'#00F', 'C':'#0FF', 'V':'#80C', 'P':'#E0E', 'W':'#FFF', 'Z':'#A72', 'S':'#888'};
					module.textColors = { 'R':'#C00','O':'#D60', 'Y':'#C8CC00',    'L':'#4C0', 'F':'#040', 'B':'#009', 'C':'#0CC', 'V':'#408', 'P':'#B0B', 'W':'#CCC', 'Z':'#851', 'S':'#666'};
					module.invert = [ 'B', 'F', 'V', 'Z', 'S' ];
					module.grid = [ ];
					
					const abbrs = { 'Red':'R', 'Orange':'O', 'Yellow':'Y', 'Lime':'L', 'Forest':'F', 'Blue':'B', 'Cyan':'C', 'Violet':'V', 'Pink':'P', 'White':'W', 'Bronze':'Z', 'Silver':'S' };
					const paths = { 
									'Chevron':'M-19-38.5 0-23.5 19-38.5V24.5L0 38.5-19 24.5V-38.5Z', 
									'Club':'M1-38.2A16.5 16.5 0 00-.6-38.2 16.5 16.5 0 00-16.2-20.8 16.5 16.5 0 00-13.6-12.9 16.5 16.5 0 00-19.1-13.5 16.5 16.5 0 00-34.7 3.9 16.5 16.5 0 00-17.3 19.5 16.5 16.5 0 00-5.9 14C-5.6 22.6-6.6 30.9-11.5 38.3-3.1 38.3 2.5 38.7 11.6 38.5 6.6 30.9 5.8 22.3 6.1 13.6A16.5 16.5 0 0019.7 19.5 16.5 16.5 0 0035.3 2.1L35.3 2A16.5 16.5 0 0017.9-13.5 16.5 16.5 0 0014.3-12.9 16.5 16.5 0 0016.8-22.6L16.8-22.6A16.5 16.5 0 001-38.2Z', 
									'Diamond':'M.05-37.7-28.15.7.05 38.5 28.75.5Z', 
									'Coin':'M1.3-30.2 1.3-29.5 1.2-29.6 20.1-21.7 20.4-22.3C15.6-26.7 9.5-29.4 3-30.1L3-30.1H3C2.5-30.1 1.9-30.1 1.4-30.2L1.4-30.2H1.3 1.3ZM-1.3-30.1C-8.4-29.8-15.1-27-20.3-22.3L-20-21.7-1.2-29.5ZM-22.3-20.3-22.4-20.2C-26.7-15.4-29.4-9.3-30.1-2.9V-2.9-2.9C-30.1-2.4-30.1-1.9-30.2-1.4L-29.5-1.3-21.9-19.7H-22C-21.9-19.7-21.9-19.8-21.9-19.8L-21.4-20.3H-22.1ZM22.4-20.3 21.9-19.9 29.6-1.3 30.2-1.4C29.9-8.4 27.1-15.1 22.4-20.3ZM29.6 1.5 22 19.9 22.5 20.2C26.8 15.5 29.5 9.4 30.2 3L30.2 3V3 3C30.2 2.5 30.2 2.1 30.2 1.6ZM-29.5 1.6-30.1 1.7C-29.8 8.5-27.1 15.1-22.5 20.2L-21.9 19.9ZM20.2 21.9 19.8 22.1 1.6 29.6 1.8 30.2C8.6 29.8 15 27.2 20.1 22.6L20.2 22.5ZM-19.7 22.1-20 22.6C-15.3 26.9-9.3 29.5-2.9 30.2H-2.9-2.9C-2.5 30.2-2.1 30.2-1.7 30.2L-1.5 29.6ZM34.7-1.8A34.7 34.7 90 011.9 34.7 34.7 34.7 90 01-34.6 1.9 34.7 34.7 90 01-1.9-34.6 34.7 34.7 90 0134.7-1.9', 
									'Cup':'M29-38.5C29.2-13.6 29 3.1 9.5 19L9.4 32.1 23.9 38.5C14.7 38.4-13.4 38.5-22.6 38.5L-8.2 32.3-8.4 18.9C-28.8 3.9-29.1-14.5-29-38.5-8.3-38.5 9.2-38.3 29-38.5Z', 
									'Eye':'M1.4-24A38.2 23.6 0 00-2.4-24 38.2 23.6 0 00-38.4.9 38.2 23.6 0 001.8 23.2 38.2 23.6 0 0037.9-1.6L37.9-1.7A38.2 23.6 0 001.4-24ZM1.3-18.5A31.3 18.2 0 0131.2-1.4L31.2-1.3A31.3 18.2 0 011.6 17.8 31.3 18.2 0 01-31.3.6 31.3 18.2 0 01-1.8-18.5 31.3 18.2 0 011.3-18.5ZM.5-18A17.6 17.6 0 00-1.3-17.9 17.6 17.6 0 00-17.8.6 17.6 17.6 0 00.7 17.2 17.6 17.6 0 0017.3-1.3L17.3-1.4A17.6 17.6 0 00.5-18Z', 
									'Heart':'M15.21-34.65C9.54-34.92 4.05-32.58 0-28.26L-.09-28.35-.18-28.26C-5.22-33.48-12.42-35.55-19.17-33.75-26.37-31.86-32.04-25.92-34.11-18.18-37.62 6.21-1.8 10.53-.18 35.28 1.44 10.53 36.72 8.64 34.02-18.45 31.95-26.19 26.28-32.13 19.08-34.02 17.73-34.38 16.38-34.56 15.03-34.65Z', 
									'Pentacle':'M.8-34.75-9.4-13.95H11.1L.8-34.75ZM-11.9-12.15-34.9-8.85-18.2 7.35-11.8-12.25ZM14-12.05 20.3 7.15 36.7-8.85ZM-9.5-11.15-12.7-1.35-15.9 8.45-7.5 14.55.9 20.65 9.3 14.55 17.7 8.45 14.5-1.35 11.3-11.15ZM-17.4 10.65-21.3 33.25-.9 22.65-17.4 10.65ZM19.1 10.85 2.8 22.65 22.9 33.25Z', 
									'Shield':'M-34.6-29.1C-25-25.7-7.7-28.8 0-34.9 7.1-28.8 23.1-25.5 34.6-29.1 34.6-29.1 34.6-29.1 34.6-29.1 27-8.1 29.9 37.2 0 34.6-30.4 37.4-28.4-8.6-34.6-29.1-34.6-29.1-34.6-29.1-34.6-29.1Z',
									'star':'M-.5-37.5C7.1-23.8 14.2-18.6 32.2-18.6 23.3-5.1 24 4.2 32.2 19.1 14.9 18.9 6.7 22.4-.5 38-6.8 22.7-15.2 19.3-33.2 19.1-23.2 3.8-23.9-6.4-33.2-18.6-17.4-18.6-8.3-23.8-.5-37.5Z', 
									'Spade':'M-.15-38.5C-1.55-17.5-31.45-15.9-29.15 7.1-27.45 13.7-22.55 18.7-16.45 20.3-15.35 20.6-14.15 20.8-12.95 20.8-9.95 20.9-6.85 19.8-4.25 18.4-4.75 25.7-7.35 32.5-12.55 38.6-8.55 39.1 6.65 38.9 11.25 38.8 6.35 32.5 4.15 25.9 3.85 18.3 7.55 20.5 11.95 21.1 16.15 20 22.25 18.4 27.05 13.4 28.85 6.8 31.75-13.9 1.45-17.6.05-38.5Z', 
									'Sword':'M.55-37.9-19.25-23.6-11.35 16.1H-21.25V24.6H-4.75V39.2H5.75V24.6H21.75V16.1H12.55L19.45-23.6Z' };
					
					const config = readTaggedLines(5).map(l => l.split(', ').map(x => x.split(' ')));
					for (let row = 0; row < 5; row++) {
						module.grid.push( [ ] );
						for (let col = 0; col < 5; col++) {
							const cell  = config[row][col];
							module.grid[row].push( { color: abbrs[cell[0]], suitPath: paths[cell[cell.length - 1]] } );
						}
					}
					
					module.makeSvg = function (grid) {
						let svg = `<svg class='cruel-matchem' viewbox='-5 -5 130 180'> 
						<rect class='background' x='-5' y='-5' width='130' height='180' rx='5' ry='5'/>`;
					
						for (let row = 0; row < 5; row++) {
							for (let col = 0; col < 5; col++) {
								const cell = grid[row][col];
								
								let group = `<g transform='translate(${25 * col} ${35 * row	})'>`;
								const fill = module.cardBacks[cell.color];
								const inner = module.textColors[cell.color];

								group += `<rect class='card' width='20' height='30' fill='${fill}'/>
										<path class='symbol' transform='translate(10, 14) scale(0.225)' d='${cell.suitPath}' fill='${inner}'/>
										<text class='color-text' x='5' y='25' fill='${module.invert.includes(cell.color) ? '#FFF' : '#000'}'>${cell.color}</text>`;
								svg += group + '</g>';
							}
						}
						return svg + '</svg>';
					};
					
					module.push({ label: "The initial configuration of cards is:", obj:module.makeSvg(module.grid), nobullet:true });
					return true;
				}
			},
			{
				regex: /The final configuration of cards is:/,
				handler: function (_, module){ 
					module.push({ label: "The final configuration of cards is:", obj:module.makeSvg(module.grid) });
					linen += 5;
					return true;
				}
			},
			{
				regex: /Move \d : ([^+]+) \+ ([^+]+)/,
				handler: function (matches, module) {
					
					for (let movement = 0; movement < 2; movement++) {
						const cmd = matches[movement + 1];
						
						const swapMatch = cmd.match(/Swap (rows|columns) (\d) and (\d)/);
						const shiftMatch = cmd.match(/Shift (row|column) (\d) one space (\w+)/);
						const cycleMatch = cmd.match(/Cycle card (\d+) (anti)?clockwise/);
						const swapTwoMatch = cmd.match(/Swap cards (\d+) and (\d+)/);
						if (swapMatch) { 
							let store = [ ];
							let s1 = swapMatch[2] - '1';
							let s2 = swapMatch[3] - '1';
							for (let ix = 0; ix < 5; ix++) {
								if (swapMatch[1] == 'rows') {
									store.push(module.grid[s1][ix]);
									module.grid[s1][ix] = module.grid[s2][ix];
								}
								else {
									store.push(module.grid[ix][s1]);
									module.grid[ix][s1] = module.grid[ix][s2];
								}
							}
							for (let ix = 0; ix < 5; ix++) {
								if (swapMatch[1] == 'rows')
									module.grid[s2][ix] = store[ix];
								else module.grid[ix][s2] = store[ix];
							}
						}		
						else if (shiftMatch) {
							const digit = shiftMatch[2] - '1';
							const row = shiftMatch[1] == 'row'
							let section = [ ];
							for (let i = 0; i < 5; i++) {
								if (row) 
									section.push(module.grid[digit][i]);
								else section.push(module.grid[i][digit]);
							}
							const adder = shiftMatch[3] == 'up' || shiftMatch[3] == 'left' ? 1 : 4;
							for (let i = 0; i < 5; i++) {
								if (row)
									module.grid[digit][i] = section[(i + adder) % 5];
								else module.grid[i][digit] = section[(i + adder) % 5];
							}
						}
						else if (cycleMatch) {
							const root = { x: (cycleMatch[1] - '1') % 5, y: Math.floor((cycleMatch[1] - '1') / 5) };
							const x = root.x;
							const y = root.y;
							const order = cycleMatch[2] ? 
										[ root, { x: y, y: 4 - x }, { x: 4 - x, y: 4 - y }, { x: 4 - y, y: x } ] :
										[ root, { x: 4 - y, y: x }, { x: 4 - x, y: 4 - y }, { x: y, y: 4 - x } ];
							let store = [ ];
							for (let i = 0; i < 4; i++)
								store.push(module.grid[order[i].y][order[i].x]);
							for (let i = 0; i < 4; i++) 
								module.grid[order[(i + 1) % 4].y][order[(i + 1) % 4].x] = store[i];
						}
						else if (swapTwoMatch) {
							let a = { x: (swapTwoMatch[1] - '1') % 5, y: Math.floor((swapTwoMatch[1] - '1') / 5) };
							let b = { x: (swapTwoMatch[2] - '1') % 5, y: Math.floor((swapTwoMatch[2] - '1') / 5) };
							let temp = module.grid[b.y][b.x];
							module.grid[b.y][b.x] = module.grid[a.y][a.x];
							module.grid[a.y][a.x] = temp;
						}
					}
					
					
					module.push([ matches[0], [ {obj: module.makeSvg(module.grid) } ] ]);
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Cruel Synesthesia",
		moduleID: "cruelSynesthesia",
		loggingTag: "Cruel Synesthesia",
		matches: [
			{
				regex: /(The sequence played is|You submitted) ([\d,\s]+)/,
				handler: function(matches, module) {
					let order = [5, 6, 9, 10, 4, 7, 8, 11, 3, 2, 13, 12, 0, 1, 14, 15];
					let loggingInfo = matches[2].split(", ");
					let colourLayout = ["00", "55", "aa", "ff"];
					let cellSize = 125;
					
					let finalInfo = [];
					for(let i = 0; i < order.length; i++) {
						finalInfo.push(loggingInfo[order[i]]);
					}

					let colours = [];
					for(let i = 0; i < finalInfo.length; i++) {
						let colour = "";
						for(let j = 0; j < finalInfo[i].length; j++) {
							colour += colourLayout[parseInt(finalInfo[i][j])];
						}
						colours.push(colour);
					}

					console.log(colours)

					let svg = `<br><svg class='cruel-synesthesia' transform="translate(75 0)" width="400" height="200" viewbox="100 250 1125 275">`;
					for(let i = 0; i < finalInfo.length; i++) {
						svg += `<rect class="color-cell" x="${cellSize * (i % 4) + cellSize}" y="${cellSize * Math.floor(i / 4) + cellSize}" width="${cellSize}" height="${cellSize}" style="fill:#${colours[i]}"/>`;
						svg += `<rect class="gray-cell" x="${cellSize * (i % 4) + cellSize + 300 + 300}" y="${cellSize * Math.floor(i / 4) + cellSize}" width="${cellSize}" height="${cellSize}"/>
										<text x="${cellSize * (i % 4) + cellSize + 300 + 362}" y="${cellSize * Math.floor(i / 4) + cellSize + 80}">${finalInfo[i]}</text>`;
					}

					module.push({label: matches[1], obj: svg});
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
							<table class='cube-table'>
								<tr><th>Rotation</th>    ${many(6, x => `<td><div class='icon rotation rotation-${module.Rotations[x].replace(/ /g, '')}'></div><div>${module.RotationCodes[x]}</div></td>`)}</tr>
								<tr><th>Face digit</th>  ${many(6, x => `<td><div class='icon' style='background-position: -${x * 50}px -50px'></div><div>${module.Faces[5 - x]}</div></td>`)}</tr>
								<tr><th>Wires</th>       ${many(4, x => `<td><div class='wire' style='background-color: ${colors[module.Wires[wireMap[x]]]}'><div>${wireMap[x] + 1}${wireOrd[x]}</div></div><div>${module.WireCodes[wireMap[x]]}</div></td>`)}</tr>
								<tr><th>After modulo</th>${many(6, x => `<td>${module.Cipher1.substr(x, 1)}</td>`)}</tr>
								<tr><th>Display 1</th>   ${many(8, x => `<td><div class='symbol'>${module.Screens[0].substr(x, 1)}</div><div>${module.Cipher2.substr(x, 1)}</div></td>`)}</tr>
								<tr><th>Display 2</th>   ${many(8, x => `<td><div class='symbol'>${module.Screens[1].substr(x, 1)}</div><div>${module.Cipher3.substr(x, 1)}</div></td>`)}</tr>
								<tr class='final'><th>FINAL CIPHER</th>${many(8, x => `<td>${module.Cipherfinal.substr(x, 1)}</td>`)}</tr>
							</table>
						`);
						module.push({ label: 'Calculations:', obj: calcTable });
						module.push({
							label: 'Submit button:', obj:
								$(`<div class='cube-submit-button'><div class='inner'>${module.SubmitButton.color} <span>${module.SubmitButton.label}</span></div>	</div>`)
									.find('.inner').css({ backgroundColor: colors[module.SubmitButton.color] })
									.end().end()
						});

						const key = ix => `<td style='background: ${colors[module.Buttons[ix].color]}'>${module.Buttons[ix].label}</td>`;
						var keypad = $(`
							<table class='cube-keypad'">
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
						return `<td style='color: ${matches[ix + 3] === 'True' ? '#0F0' : '#F00'};'>${matches[ix + 3] === 'True' ? '✓' : '✗'}</td>`;
					}
					module.push({
						label: matches[2] ? matches[2] + ' solution:' : matches[1],
						obj: $(`<table class='cube-stage-solution'>${many(4, x => `<tr>${key(2 * x)}${key(2 * x + 1)}</tr>`)}</table>`)
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
				handler: function (matches, module) {
					let maze = readTaggedLines(9).slice(0, 8);
					let table = $('<table>').addClass('cursor-maze');
					for (let i = 0; i < 8; i++) {
						let tr = $('<tr>').appendTo(table);
						maze[i].split('').forEach(element => {
							let td = $('<td>').text(' ').appendTo(tr);
							switch (element) {
								case 'X': td.addClass('black'); break;
								case 'O': td.addClass('cyan'); break;
								case 'G': td.addClass('green'); break;
								case 'R': td.addClass('red'); break;
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
		displayName: "DACH Maze",
		moduleID: "DACH",
		loggingTag: "DACH Maze",
		matches: [
			{
				regex: /Using rule seed: (\d+)\.$/,
				handler: function (matches, module) {
					let sl = {
						" D (BB)": { X: 840, Y: 195 },
						" D (BE)": { X: 935, Y: 165 },
						" D (BW)": { X: 645, Y: 420 },
						" D (BY)": { X: 755, Y: 395 },
						" D (HB)": { X: 515, Y: 80 },
						" D (HE)": { X: 650, Y: 290 },
						" D (HH)": { X: 510, Y: 40 },
						" D (MV)": { X: 785, Y: 85 },
						" D (NI)": { X: 685, Y: 155 },
						" D (NW)": { X: 585, Y: 235 },
						" D (RP)": { X: 580, Y: 340 },
						" D (SH)": { X: 680, Y: 70 },
						" D (SL)": { X: 550, Y: 420 },
						" D (SN)": { X: 820, Y: 260 },
						" D (ST)": { X: 755, Y: 210 },
						" D (TH)": { X: 725, Y: 270 },
						" A (BU)": { X: 960, Y: 575 },
						" A (KN)": { X: 855, Y: 540 },
						" A (NO)": { X: 930, Y: 435 },
						" A (NT)": { X: 735, Y: 510 },
						" A (OO)": { X: 855, Y: 450 },
						" A (OT)": { X: 790, Y: 575 },
						" A (SA)": { X: 820, Y: 505 },
						" A (ST)": { X: 905, Y: 500 },
						" A (VO)": { X: 425, Y: 290 },
						" A (WI)": { X: 960, Y: 335 },
						"CH (AG)": { X: 245, Y: 265 },
						"CH (AI)": { X: 375, Y: 80 },
						"CH (AR)": { X: 340, Y: 40 },
						"CH (BE)": { X: 185, Y: 365 },
						"CH (BL)": { X: 110, Y: 80 },
						"CH (BS)": { X: 180, Y: 80 },
						"CH (FR)": { X: 130, Y: 385 },
						"CH (GE)": { X: 125, Y: 575 },
						"CH (GL)": { X: 380, Y: 570 },
						"CH (GR)": { X: 400, Y: 380 },
						"CH (JU)": { X: 80, Y: 35 },
						"CH (LU)": { X: 235, Y: 320 },
						"CH (NE)": { X: 45, Y: 85 },
						"CH (NW)": { X: 255, Y: 570 },
						"CH (OW)": { X: 185, Y: 570 },
						"CH (SG)": { X: 310, Y: 80 },
						"CH (SH)": { X: 240, Y: 85 },
						"CH (SO)": { X: 145, Y: 35 },
						"CH (SZ)": { X: 275, Y: 35 },
						"CH (TG)": { X: 335, Y: 245 },
						"CH (TI)": { X: 310, Y: 435 },
						"CH (UR)": { X: 320, Y: 570 },
						"CH (VD)": { X: 70, Y: 395 },
						"CH (VS)": { X: 175, Y: 460 },
						"CH (ZG)": { X: 205, Y: 35 },
						"CH (ZH)": { X: 295, Y: 265 },
						"in (FL)": { X: 437, Y: 80 }
					};

					module.push({ obj: $SVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="1603.3 445.8 996 602"/>`), nobullet: true, stateLoc: sl });

					let callback2 = () => {
						let mz = new DACHMaze();
						mz = mz.SetRules(new MonoRandom(parseInt(matches[1])));

						// let p = module.pop();
						// console.log(p);
						// module.push(p);
						module.push(module.pop().obj.prepend(mz.svg[0].querySelector(".DACHMap")));
					};

					let callback = () => {
						FileLoadCallbacks.Add('./js/DACHMaze/DACHMaze.js', callback2);
					};

					FileLoadCallbacks.Add('./js/MonoRandom.js', callback);

					return true;
				}

			},
			{
				regex: /Departing .+(.. \(..\)) to .+(.. \(..\))\.$/,
				handler: function (matches, module) {
					let svg = module.pop();

					svg.obj.append($SVG(`<g transform="translate(1603.3 445.8)"><circle cx='${svg.stateLoc[matches[1]].X}' cy='${svg.stateLoc[matches[1]].Y}' r='15' fill='none' stroke='#00ff00' stroke-width='5'/><circle cx='${svg.stateLoc[matches[1]].X}' cy='${svg.stateLoc[matches[1]].Y}' r='10' stroke='none' fill='#000000'/><circle id='loc' cx='${svg.stateLoc[matches[1]].X}' cy='${svg.stateLoc[matches[1]].Y}' r='10' stroke='none' fill='#ff00ff'/></g>`));
					svg.obj.append($SVG(`<circle transform="translate(1603.3 445.8)" cx='${svg.stateLoc[matches[2]].X}' cy='${svg.stateLoc[matches[2]].Y}' r='15' fill='none' stroke='#ff0000' stroke-width='5'/>`));

					module.push($(`<span>${matches[0]}</span>`))
					module.push(svg);
					return true;
				}
			},
			{
				regex: /.+ - traveled from .+(.. \(..\)) to .+(.. \(..\))\.$/,
				handler: function (matches, module) {
					let svg = module.pop();
					svg.obj.find("#loc").remove();

					svg.obj.append($SVG(`<g transform="translate(1603.3 445.8)"><path d='M${svg.stateLoc[matches[1]].X} ${svg.stateLoc[matches[1]].Y} ${svg.stateLoc[matches[2]].X} ${svg.stateLoc[matches[2]].Y}' fill='none' stroke='#0000ff' stroke-width='5'/><circle cx='${svg.stateLoc[matches[2]].X}' cy='${svg.stateLoc[matches[2]].Y}' r='10' stroke='none' fill='#000000'/><circle id='loc' cx='${svg.stateLoc[matches[2]].X}' cy='${svg.stateLoc[matches[2]].Y}' r='10' stroke='none' fill='#ff00ff'/></g>`));
					module.push($(`<span>${matches[0]}</span>`));
					module.push(svg);
					return true;
				}
			},
			{
				regex: /.+/,
				handler: function (matches, module) {
					let svg = module.pop();
					module.push($(`<span>${matches[0]}</span>`));
					module.push(svg);
					return true;
				}
			}
		]
	},
	{
		moduleID: "derivatives",
		loggingTag: "Derivatives",
		matches: [
			{
				regex: /generating (\d+) equations/,
				handler: function (matches, module) {
					module.eqs = parseInt(matches[1]);
				}
			},
			{
				regex: /the (equations|solutions) are:/,
				handler: function (matches, module) {
					const rows = readTaggedLines(module.eqs).map(l => ({ obj: pre(l), nobullet:true }));
					module.push([ matches.input, rows ]);
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Determinants",
		moduleID: "determinant",
		loggingTag: "Needy Determinants"
	},
	{
		displayName: "Diffusion",
		moduleID: "diffusion",
		loggingTag: "Diffusion",
		matches: [
			{
				regex: /The result of diffusion \(from tl cw\) is (.+)\./,
				handler: function(matches, module) {
					let partialInfo = matches[1].split(", ");
					partialInfo.push("A0B0");
					
					let order = [0, 1, 2, 3, 11, 12, 12, 4, 10, 12, 12, 5, 9, 8, 7, 6];
					let colourPalette = ["00", "40", "80", "c0", "ff"];
					let cellSize = 135;

					let info = [];
					for(let i = 0; i < order.length; i++) {
						info.push(partialInfo[order[i]]);
					}

					let svg = `<svg class='diffusion result' viewbox="130 130 550 550">`;
					for(let i = 0; i < 16; i++) {
						let redComponent = info[i].match(/A\d/);
						console.log(redComponent);
						redComponent = parseInt(redComponent[0].replace("A", ""));
						let blueComponent = info[i].match(/B\d/);
						blueComponent = parseInt(blueComponent[0].replace("B", ""));
						svg += `<rect class='tile' x="${cellSize * (i % 4) + cellSize}" y="${cellSize * Math.floor(i / 4) + cellSize}" width="${cellSize}" height="${cellSize}" fill="#${colourPalette[redComponent]}00${colourPalette[blueComponent]}"/>`;
						svg += `<text x="${cellSize * (i % 4) + cellSize + 67}" y="${cellSize * Math.floor(i / 4) + cellSize + 82}" font-size="${Math.floor(cellSize / 3)}">${order[i] != 12 ? info[i] : ""}</text>`;
					}
					module.push({label: "The result of diffusion is:", obj: svg});
				}
			},
			{
				regex: /A possible solution is (.+)\./,
				handler: function(matches, module) {
					let partialInfo = matches[1].split(", ");

					let order = [0, 1, 2, 3, 11, 12, 12, 4, 10, 12, 12, 5, 9, 8, 7, 6];
					let cellSize = 135;
					let info = [];

					for(let i = 0; i < order.length; i++) {
						info.push(partialInfo[order[i]]);
					}
					
					let svg = `<svg class='diffusion solution' viewbox="130 130 550 550">`;
					const hexCodes = { "0":"#000", "A":"#F00", "B":"#00F" };
					for (let i = 0; i < info.length; i++) {
						let colour = hexCodes[info[i]];
						svg += `<rect class='tile' x="${cellSize * (i % 4) + cellSize}" y="${cellSize * Math.floor(i / 4) + cellSize}" width="${cellSize}" height="${cellSize}" fill="${colour}" />`;
						svg += `<text x="${cellSize * (i % 4) + cellSize + 67}" y="${cellSize * Math.floor(i / 4) + cellSize + 90}" font-size="${Math.floor(cellSize / 2)}">${order[i] != 12 ? info[i] : ""}</text>`;
					}
					module.push({label: "A possible solution is:", obj: svg});
				}
			}
		]
	},
	{
		moduleID: 'digitalGrid',
		loggingTag: 'Digital Grid',
		matches: [		
			{
				regex: /The grid is now:/,
				handler: function(_, module) {
					const grid = readTaggedLines(5).map(l => l.substring(2).split(' '));
					const fills = { 'R':'#F00', 'G':'#0F0', 'B':'#00F', 'C':'#0FF', 'M':'#F0F', 'Y':'#FF0', 'W':'#FFF' };
					let contents = '';
					for (let row = 0; row < 5; row++) {
						for (let col = 0; col < 5; col++) {
							const color = grid[row][col][0];
							const num = grid[row][col][1];
							const textColor = color == 'B' ? '#FFF' : '#000'; 
							contents += `<g transform='translate(${12 * col}, ${12 * row})'>
									<rect class='tile' width='10' height='10' ry='1' fill='${fills[color]}'/>
									<text class='digit' x='5' y='5' fill='${textColor}'>${num}</text>
									<text class='color-name' x='2' y='2' fill='${textColor}'>${color}</text>
								</g>`;
						}
					}
					module.svgContents = contents;
					module.push({ label:'Displayed grid:', obj:`<svg class='digital-grid' viewbox='-1 -1 60 60'>${contents}</svg>` });
					return true;
				}
			},
			{
				regex: /Correct Presses|Presses Submitted/,
				handler: function(matches, module) {
					let pressed = readTaggedLines(5).map(l => l.substring(2).split('').map(t => t == 'O'));
					let contents = module.svgContents;
					for (let row = 0; row < 5; row++) {
						for (let col = 0; col < 5; col++) {
							if (!pressed[row][col])
								contents += `<rect class='cover' x='${12 * col}' y='${12 * row}' width='10' height='10' ry='1'/>`;
						}
					}
					if (matches[0][0] == 'C')
						module.push({ label:'Press the tiles shown below:', obj:`<svg class='digital-grid' viewbox='-1 -1 60 60'>${contents}</svg>` });
					else {
						if (readTaggedLine().startsWith(': Strike!')){
							const wrongs = readTaggedLines(5).map(l => l.substring(2).split('').map(t => t == '!'));
							for (let row = 0; row < 5; row++) {
								for (let col = 0; col < 5; col++) {
									if (wrongs[row][col])
										contents += `<path class='cross' transform='translate(${12 * col}, ${12 * row})' d='m1.5 2.9 1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z'/>`
								}
							}
							module.push({ label:'The tiles shown below were pressed. Strike! The tiles marked with an X were set incorrectly', obj:`<svg class='digital-grid' viewbox='-1 -1 60 60'>${contents}</svg>` }); 
						}
						else {
							linen--;
							module.push({ label:'The tiles shown below were pressed.', obj:`<svg class='digital-grid' viewbox='-1 -1 60 60'>${contents}</svg>` });
						}
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
		moduleID: 'GSDirectingButtons',
		loggingTag: 'Directing Buttons',
		matches: [
			{
				regex: /The grid of buttons:/,
				handler: function (match, module) {
					let grid = readLines(4).map(l => l.split(' '));
					let table = "<table class='blank-buttons'>";
					const rotations = { 'Y':0, 'G':90, 'B':180, 'R':270 };
					for (let row = 0; row < 4; row++) {
						table += "<tr>";
						for (let col = 0; col < 4; col++) {
							const color = grid[row][col];
							table += `<td class='${color.toLowerCase()}'>
										<svg class='arrow' viewbox='-6 -6 12 12'>
											<path class='arrow-shape' transform='rotate(${rotations[color]})' d='m-5 0h10l-3-2 3 2-3 2 3-2-10 0'/>
										</svg>
									</td>`;
						}
						table += "</tr>";
					}
					module.push({ label: match.input, obj:table });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "dischargeMaze",
		loggingTag: "Discharge Maze",
		matches: [
			{
				regex: /The starting position of the (\w+).+/,
				handler: function(matches, module) {
					const colorDict = { 'Red':'#FF0000', 'Green':'#00FF00', 'Blue':'#005FFF', 'Yellow':'#F5EA00' };
					module.color = colorDict[matches[1]];
					module.push(matches[0]);
					return true;
				}
			},
			{
				regex: /The maze to navigate through is:/,
				handler: function(_, module) {
					let grid = readTaggedLines(15).map(l => l.split(''));
					let svg = "<svg class='discharge-maze' viewbox='-10 -10 720 720'>";

					for (let row = 0; row < 7; row++) {
						for (let col = 0; col < 7; col++) {
							let g = `<g transform='translate(${100 * col}, ${100 * row})'>`;
							if (grid[2 * row + 0][2 * col + 1] == '■') //Up
								g += '<line x1=-3 y1=0 x2=103 y2=0/>';
							if (grid[2 * row + 1][2 * col + 0] == '■') //Left
								g += '<line x1=0 y1=-3 x2=0 y2=103/>';
							if (grid[2 * row + 1][2 * col + 2] == '■') //Right
								g += '<line x1=100 y1=-3 x2=100 y2=103/>';
							if (grid[2 * row + 2][2 * col + 1] == '■') //Down
								g += '<line x1=-3 y1=100 x2=103 y2=100/>';
							const center = grid[2 * row + 1][2 * col + 1];
							if (center == '◯' || center == '◉')
								g += '<circle class="indicator" cx=50 cy=50 r=30/>';
							if (center == '▣' || center == '◉')
								g += `<circle class='led' cx=50 cy=50 r=20 fill='${module.color}'>`;
							svg += g + '</g>';
						}
					}
					module.push({ label:'The maze to navigate through:', obj: svg + '</svg>' });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Dominosa",
		moduleID: "DominosaModule",
		loggingTag: "Dominosa",
		matches: [
			{
				regex: /Solution:/,
				handler: function (matches, module) {
					let lines = readTaggedLine();
					for (let i = 0; i < 14; i++) {
						lines += `\n${readTaggedLine()}`;
					}

					module.push({ label: "Solution:", obj: pre(lines) });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Doofenshmirtz Evil Inc.",
		moduleID: "doofenshmirtzEvilIncModule",
		loggingTag: "Doofenshmirtz Evil Inc.",
		matches: [
			{
				regex: /The displayed images are (-?\w+) & (-?\w+)./,
				handler: function (matches, module) {
					let img1 = `<img src='/HTML/img/Doofenshmirtz%20Evil%20Inc/${matches[1]}.png'>`;
					let img2 = `<img src='/HTML/img/Doofenshmirtz%20Evil%20Inc/${matches[2]}.png'>`;
					module.push({ label:'The displayed images are:', obj:`<div class='doofenshmirtz'>${img1} ${img2}</div>` });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "doubleExpert",
		loggingTag: "Double Expert",
		matches: [
			{
				regex: /^-+([\w\s]+)-+$/,
				handler: function(matches, module) {
					const label = matches[1];
					module[label] = new Array();
					if (label.match(/Instruction Set \d+/))
						module["Instruction Sets"].push([ label, module[label] ]);
					else 
						module.push([ label, module[label] ]);
					module.currentSection = label;
					return true;
				}
			},
			{
				regex: /Strike!|solved|handler/,
				handler: function(match, module) {
					module.push(match.input);
					return true;
				}
			},
			{
				regex: /.+/,
				handler: function(match, module) {
					module[module.currentSection].push(match.input);
				}
			}
		]
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
		displayName: "Dungeon",
		moduleID: "dungeon",
		loggingTag: "Dungeon",
		matches: [
			{
				regex: /^Stage ([1-9]|1[0-5])$/,
				handler: function (matches, module) {
					let stage = parseInt(matches[1]);
					let lines = readLines(2);

					if (stage === 1) {
						module.lines = [];
						let button;
						module.push({ obj: button = $(`<button class='dungeon-button'>Show Original Log</button>`), nobullet: true });
						button.click(() => {
							module.html.hide();
							button.parent().prop('outerHTML', module.lines.map(l => `<li>${l}</li>`).join(""));
						});
						module.push({ obj: module.html = $(`<div>`), nobullet: true });
					}
					let callback = () => {
						let map = stage === 1 ? new DungeonMap(module.html) : module.map;
						map.addStageData(stage, /^\[Dungeon #\d+\] Roll = (\d)$/.exec(lines[0])[1], /^\[Dungeon #\d+\] Level = (\d)$/.exec(lines[1])[1]);
						module.map = map;
					};

					FileLoadCallbacks.Add("./js/Dungeon/Dungeon.js", callback)

					module.lines.push(matches[0]);
					module.lines.push(/^\[Dungeon #\d+\] (Roll = \d)$/.exec(lines[0])[1])
					module.lines.push(/^\[Dungeon #\d+\] (Level = \d)$/.exec(lines[1])[1]);

					return true;
				}
			},
			{
				regex: /^Stage 16$/,
				handler: function (matches, module) {
					let lines = readLines(2);

					let callback = () => {
						module.html.parent().after($(`<li>Module solved!</li>`));
					};

					FileLoadCallbacks.Add("./js/Dungeon/Dungeon.js", callback)

					module.lines.push(matches[0]);
					module.lines.push(/^\[Dungeon #\d+\] (Roll = \d)$/.exec(lines[0])?.[1] ?? "");
					module.lines.push(/^\[Dungeon #\d+\] (Level = \d)$/.exec(lines[1])?.[1] ?? "");

					return true;
				}
			},
			{
				regex: /^Fighting (.+)$/,
				handler: function (matches, module) {
					module.lines.push(matches[0]);

					let callback = () => {
						let map = module.map;
						map.addFight(matches[1]);
					};

					FileLoadCallbacks.Add("./js/Dungeon/Dungeon.js", callback)

					return true;
				}
			},
			{
				regex: /^End of fight : Last monster fought = (\d+)$/,
				handler: function (matches, module) {
					module.lines.push(matches[0]);

					let callback = () => {
						let map = module.map;
						map.addNum(matches[1]);
					};

					FileLoadCallbacks.Add("./js/Dungeon/Dungeon.js", callback)

					return true;
				}
			},
			{
				regex: /^Wrong action : the action #(.+) against that monster was (.+)\.$/,
				handler: function (matches, module) {
					module.lines.push(matches[0]);

					let callback = () => {
						let map = module.map;
						map.addStrike(`Action #${matches[1]} was ${matches[2]}.`);
					};

					FileLoadCallbacks.Add("./js/Dungeon/Dungeon.js", callback)

					return true;
				}
			},
			{
				regex: /^Wrong move : the roll is (\d), the correct direction was (.+)\.$/,
				handler: function (matches, module) {
					module.lines.push(matches[0]);

					let callback = () => {
						let map = module.map;
						map.addMoveStrike();
					};

					FileLoadCallbacks.Add("./js/Dungeon/Dungeon.js", callback)

					return true;
				}
			},
			{
				regex: /.+/,
				handler: function (matches, module) {
					module.lines.push(matches[0]);
					throw "Unexpected log message";
				}
			}
		]
	},
	{
		displayName: "Echolocation",
		moduleID: "echolocation",
		loggingTag: "Echolocation",
		matches: [
			{
				regex: /Generating maze with (?:default )?size of (\d\d?)\.$/,
				handler: function (matches, module) {
					let lineCount = matches[1] * 2 + 1;
					let legend = readTaggedLine();
					module.push(matches.input);
					var maze = readTaggedLines(lineCount).join('\n');
					module.push({ label: legend, obj: pre(maze) });
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
					let span = $("span").addClass('emoticon-math').text(matches[1]);
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
		displayName: "ƎNA Cipher",
		moduleID: "enaCipher",
		loggingTag: "ƎNA Cipher",
		matches: [
			{
				regex: /Temptation Stairway Key: (.+)/,
				handler: function(matches, module) {
					let grid = [];
					for(let i = 0; i < parseInt(matches[1].length / 5); i++) {
						grid.push(matches[1].substring(i * 5, i * 5 + 5));
					}
					let svg = `<svg class='ena-cipher-stairway-key' viewbox="-5 -5 160 160 ">`;
					for(let i = 0; i < grid.length; i++) {
						for(let j = 0; j < grid[i].length; j++) {
							svg += `<rect x="${30 * j}" y="${30 * i}" width="30" height="30"/>
									<text x="${30 * j + 15}" y="${30 * i + 15}">${grid[i][j]}</text>`;
						}
					}
					module.push({label: "Temptation Stairway Grid: ", obj: svg});
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
		displayName: "Evil Word Search",
		moduleID: "EvilWordSearchModule",
		loggingTag: "Evil Word Search",
		matches: [
			{
				regex: /Grid A:/,
				handler: function (matches, module) {
					let lines = readTaggedLine();
					for (let i = 0; i < 5; i++) {
						lines += `\n${readTaggedLine()}`;
					}

					module.push({ label: "Grid A:", obj: pre(lines) });
					return true;
				}
			},
			{
				regex: /Grid B:/,
				handler: function (matches, module) {
					let lines = readTaggedLine();
					for (let i = 0; i < 5; i++) {
						lines += `\n${readTaggedLine()}`;
					}

					module.push({ label: "Grid B:", obj: pre(lines) });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Extended Boolean Venn Diagram",
		moduleID: "extendedBooleanVenn",
		loggingTag: "Extended Boolean Venn Diagram",
		matches: [
			{
				regex: /Final buttons to press \(\d+ total buttons?\): (.+)/,
				handler: function (matches, module) {
					let segments = matches[1].split(', ');
					let segmentColors = 'O, A, B, C, AB, AC, BC, ABC, D, AD, BD, CD, ABD, ACD, BCD, ABCD, E, AE, BE, CE, ABE, ACE, BCE, ABCE, DE, ADE, BDE, CDE, ABDE, ACDE, BCDE, ABCDE'.split(', ').map(x => segments.includes(x) ? 'rgb(127, 255, 127)' : 'rgb(255, 127, 127)');
					let svg = $SVG(`<svg class="extended-bvd" viewBox="40 70 100 80">
						<g class="outlines">
						  <ellipse ry="28.491" rx="14.245" cy="-115.123" cx="-74.75" transform="rotate(174.02)"/>
						  <ellipse transform="rotate(-113.98)" cx="-142.876" cy="37.45" rx="14.245" ry="28.491"/>
						  <ellipse transform="rotate(138.02)" cx="17.957" cy="-149.544" rx="14.245" ry="28.491"/>
						  <ellipse ry="28.491" rx="14.245" cy="-97.661" cx="93.106" transform="rotate(102.02)"/>
						  <ellipse ry="28.491" rx="14.245" cy="-66.362" cx="-128.176" transform="rotate(-149.98)"/>
						  <circle class="none-segment" fill="red" cx="109.271" cy="85.981" r="4.692"/>
						</g>
						<g class="segments" transform="scale(.26458)">
							<path d="M356.773 372.21c-1.725-2.619-7.317-6.863-11.279-8.561-9.607-4.118-22.84-2.85-36.004 3.45-2.553 1.222-3.861 1.487-5.329 1.08-4.014-1.117-19.679-3.834-24.724-4.29l-5.241-.473.414-2.435c2.405-14.13 5.126-24.18 8.946-33.043 10.12-23.473 26.133-34.392 42.65-29.08 18.989 6.105 36.773 31.636 46.158 66.264 1.447 5.341 1.492 5.904.468 5.91-.623.005-4.206.703-7.964 1.552l-6.831 1.543z"/>
							<path d="M393.54 462.62c-1.995-3.423-3.736-6.485-3.87-6.805-.135-.32.538-2.02 1.495-3.779 6.373-11.71 4.406-25.62-5.462-38.629l-3.415-4.502-1.089-10.54c-.599-5.798-1.69-13.638-2.425-17.423-.735-3.784-1.337-7.085-1.338-7.334-.003-.753 3.428-1.27 12.21-1.84 30.822-1.999 52.1 7.043 57.366 24.377 5.758 18.958-10.369 44.921-42.168 67.888-3.66 2.644-6.886 4.808-7.168 4.808-.281 0-2.143-2.8-4.137-6.222z"/>
							<path d="M365.362 550.772c-14.008-3.038-31.317-11.388-45.715-22.052l-5.526-4.093 4.265-4.788a3258.04 3258.04 0 0 1 6.19-6.933l1.926-2.145 4.285.731c12.509 2.134 25.427-5.217 34.674-19.73 2.287-3.59 2.734-3.902 12.4-8.658 5.516-2.714 11.771-5.99 13.9-7.282 2.13-1.291 4.15-2.176 4.491-1.965.34.21 1.988 3.645 3.662 7.633 15.158 36.128 9.92 63.218-13.397 69.291-4.89 1.274-15.261 1.27-21.155-.009z"/>
							<path d="M376.39 403.364c-2.032-2.087-8.663-7.536-10.286-8.452-.11-.062-.778-2.536-1.486-5.499-.707-2.963-2.035-7.079-2.95-9.147l-1.663-3.761 4.498-1.02c2.474-.562 5.756-1.222 7.293-1.466l2.796-.445.713 3.328c1.282 5.976 4.346 29.202 3.853 29.202-.056 0-1.301-1.233-2.768-2.74z"/>
							<path d="M330.004 508.83c-1.043-.157-1.801-.491-1.687-.743.976-2.138 6.448-9.54 7.062-9.55 1.495-.027 16.976-4.723 22.202-6.736 2.892-1.114 5.358-1.927 5.478-1.806.12.12-1.314 2.242-3.186 4.716-8.115 10.719-18.82 15.78-29.87 14.118z"/>
							<path d="M372.356 478.116c1.23-3.06 2.628-6.878 3.105-8.484.665-2.236 1.582-3.41 3.924-5.02 1.68-1.157 4.19-3.127 5.575-4.379l2.519-2.276 1.6 2.575c.881 1.416 2.573 4.29 3.76 6.388l2.158 3.813-5.24 3.016c-5.046 2.905-18.731 9.933-19.341 9.933-.164 0 .71-2.505 1.94-5.566z"/>
							<path d="M340.543 489.225c1.924-3.258 4.223-7.292 5.108-8.964l1.61-3.04 6.976-1.787c3.838-.983 9.564-2.842 12.726-4.131 3.162-1.29 5.749-2.226 5.749-2.081 0 .586-3.354 8.976-5.025 12.567l-1.786 3.842-6.882 2.657c-6.206 2.395-20.174 6.862-21.46 6.862-.283 0 1.06-2.666 2.984-5.925z"/>
							<path d="M246.453 553.937c-5.223-1.729-7.986-3.557-11.975-7.92-4.392-4.806-7.282-10.952-8.964-19.064-1.883-9.083-1.404-25.791 1.078-37.574 1.797-8.529 7.537-27.272 8.36-27.301.264-.01 2.983.977 6.041 2.192 5.499 2.185 5.56 2.236 5.565 4.598.007 3.504 1.811 9.843 3.906 13.723 4.303 7.968 14.147 14.598 26.223 17.662 3.562.903 7.068 1.643 7.79 1.643.776 0 4.249 2.986 8.514 7.323 3.961 4.028 9.433 9.29 12.16 11.693l4.959 4.37-6.71 5.908c-12.817 11.286-24.52 18.516-35.587 21.987-6.685 2.097-16.29 2.438-21.36.76z"/>
							<path d="M337.58 379.131c-1.752-1.025-16.807-6.453-21.703-7.825-2.504-.702-4.553-1.48-4.553-1.731 0-.519 7.592-3.454 12.142-4.695 4.963-1.354 14.54-1.057 19.074.591 4.312 1.568 9.885 5.36 11.503 7.83l1.048 1.6-7.633 2.447c-8.37 2.683-8.347 2.679-9.878 1.783z"/>
							<path d="M277.594 497.784c-11.517-2.9-21.41-9.808-25.232-17.62-1.696-3.466-3.698-11.625-3.02-12.304.175-.175 3.43.692 7.231 1.926l6.913 2.243 4.983 7.344c2.74 4.04 7.146 10.034 9.79 13.322 2.644 3.288 4.714 6.065 4.6 6.17-.113.107-2.482-.38-5.265-1.08z"/>
							<path d="M306.583 518.321c-5.699-5.002-15.497-14.525-15.496-15.06 0-.194 4.63-.353 10.287-.353h10.287l4.284 2.843c2.356 1.563 4.86 3.026 5.565 3.25.705.223 1.282.643 1.282.932 0 .595-7.872 9.898-9.868 11.663-1.246 1.102-1.508.967-6.34-3.275z"/>
							<path d="M359.06 390.208c-1.385-.908-5.482-3.234-9.103-5.169l-6.583-3.517 6.742-2.128 6.743-2.128 1.499 2.782c1.212 2.25 4.235 10.545 4.235 11.623 0 .58-1.125.113-3.532-1.463z"/>
							<path d="M322.318 506.299c-1.189-.516-3.219-1.657-4.511-2.536l-2.351-1.597 7.164-1.136c3.94-.625 7.25-1.05 7.356-.945.267.268-4.44 6.838-5.023 7.011-.26.077-1.447-.281-2.635-.797z"/>
							<path d="M290.779 499.935c-3.306-.396-3.41-.483-9.283-7.768-6.913-8.575-13.619-18.18-12.86-18.42.289-.091 5.602.82 11.806 2.025l11.28 2.19 2.43 4.04c3.037 5.05 7.137 10.526 10.919 14.583 2.806 3.01 2.855 3.137 1.377 3.533-1.821.488-10.953.381-15.67-.183z"/>
							<path d="M307.33 494.731c-4.15-4.445-12.436-15.757-11.919-16.274.102-.101 4.103.16 8.892.579 8.793.77 28.02.387 35.354-.704 2.04-.303 3.78-.494 3.868-.423.233.191-8.44 15.299-9.815 17.097-.952 1.246-2.54 1.782-8.241 2.784-3.884.683-8.482 1.422-10.218 1.642l-3.156.401z"/>
							<path d="M226.425 454.293c-21.407-11.364-36.062-25.452-41.407-39.802-1.125-3.023-1.493-5.488-1.501-10.074-.01-5.44.213-6.546 2.15-10.65 6.554-13.892 24.096-23.433 50.103-27.25 7.279-1.068 34.513-1.751 35.262-.884.158.183.106 2.75-.117 5.704l-.404 5.371-4.716 1.616c-17.877 6.123-25.243 23.642-20.53 48.831l.846 4.524-4.252 8.226c-2.338 4.524-5.213 10.438-6.389 13.14l-2.137 4.916z"/>
							<path d="M286.364 377.062c-1.67-.297-5.237-.563-7.926-.59l-4.891-.05.01-4.216c.016-6.317.046-6.337 7.875-5.36 3.64.453 9.877 1.47 13.86 2.257l7.24 1.432-5.217 3.605c-5.376 3.715-5.824 3.834-10.951 2.922z"/>
							<path d="m384.088 448.021-3.127-4.561.561-5.355c.309-2.945.578-9.755.598-15.134l.036-9.78 2.388 3.36c4.886 6.871 7.708 14.552 7.723 21.019.009 3.995-2.155 11.604-3.878 13.63-1.157 1.363-1.219 1.317-4.3-3.179z"/>
							<path d="M247.33 422.74c-2.764-19.787 2.901-34.416 15.575-40.215 7.827-3.581 7.162-4.136 7.4 6.175l.206 8.972-5.953 7.42c-3.273 4.081-8.316 10.96-11.205 15.287l-5.253 7.866z"/>
							<path d="M376.299 437.575c-1.18-1.54-4.159-5.032-6.618-7.76l-4.47-4.957.546-5.498c.3-3.024.546-8.884.546-13.022 0-6.684.12-7.459 1.078-6.945 1.277.684 10.028 8.521 11.212 10.04.896 1.152 1.121 22.032.3 27.805l-.447 3.139z"/>
							<path d="M272.872 387.007v-8.078l7.454.353c4.099.195 7.632.533 7.851.752.22.219-1.238 1.835-3.237 3.592-2 1.756-5.533 5.053-7.852 7.326l-4.216 4.134z"/>
							<path d="M378.804 456.192c.657-3.246 1.313-6.51 1.456-7.252.208-1.071.809-.532 2.924 2.625l2.662 3.974-3.66 3.278c-2.013 1.803-3.866 3.278-4.119 3.278-.252 0 .08-2.656.737-5.903z"/>
							<path d="M350.857 469.684c5.362-11.963 9.914-25.069 12.125-34.91.667-2.968 1.308-5.524 1.426-5.68.388-.515 3.636 2.89 8.748 9.172l5.038 6.191-1.383 7.639c-2.295 12.669-2.154 12.38-7.338 14.986-4.763 2.393-16.76 6.481-19.022 6.481-1.28 0-1.264-.153.406-3.879z"/>
							<path d="M240.72 461.263c-3.67-1.573-4.742-2.329-4.463-3.149.978-2.877 10.351-21.651 10.802-21.637.284.01 1.36 2.666 2.392 5.903l1.877 5.886-2.036 5.734c-1.12 3.154-2.04 6.569-2.045 7.589-.012 2.292-.469 2.269-6.526-.326z"/>
							<path d="M314.027 386c-2.78-1.35-8.08-3.573-11.78-4.937l-6.724-2.481 5.37-3.441c2.955-1.893 5.637-3.441 5.963-3.441 2.366 0 29.32 9.184 28.63 9.756-.254.21-14.752 6.458-15.73 6.78-.37.121-2.949-.885-5.73-2.236z"/>
							<path d="M254.51 466.289c-4.92-1.66-5.188-1.852-4.84-3.481.7-3.276 3.047-10.974 3.273-10.735 1.1 1.169 8.1 16.079 7.526 16.033-.413-.033-3.095-.851-5.96-1.817z"/>
							<path d="m250.914 438.1-1.763-5.78 3.26-5.367c2.862-4.712 11.275-16.372 16.517-22.89l1.79-2.227.458 4.664a213.96 213.96 0 0 0 1.092 8.889l.633 4.225-6.146 6.906c-3.38 3.797-7.71 9.257-9.62 12.133-1.91 2.875-3.694 5.228-3.965 5.228-.27 0-1.286-2.601-2.256-5.78z"/>
							<path d="M354.498 414.343c-8.097-7.37-20.402-16.836-27.708-21.312l-4.27-2.618 3.003-1.502c1.651-.826 5.507-2.516 8.566-3.755l5.564-2.252 6.242 3.163c3.433 1.74 8.723 4.696 11.756 6.569l5.515 3.405.477 4.46c.505 4.711-.145 18.844-.927 20.14-.287.476-3.388-1.9-8.218-6.298z"/>
							<path d="M274.673 414.03c-.224-1.948-.611-6.025-.86-9.06l-.453-5.52 2.251-2.842c2.845-3.591 16.188-15.464 17.38-15.464 1.669 0 11.198 3.456 17.137 6.216l5.916 2.749-8.18 4.658c-11.661 6.64-19.736 12.213-28.338 19.558-2.09 1.786-3.946 3.247-4.123 3.247-.177 0-.505-1.594-.73-3.542z"/>
							<path d="M286.027 474.108c-1.855-.31-7.134-1.374-11.73-2.364l-8.358-1.802-1.96-3.08c-1.079-1.694-3.627-6.487-5.662-10.65l-3.702-7.57 1.679-3.311c1.94-3.828 8.155-12.164 13.341-17.894l3.588-3.963 2.222 9.902c2.69 11.995 6.52 23.78 10.952 33.714 1.818 4.074 3.237 7.446 3.154 7.495-.083.048-1.67-.167-3.524-.477z"/>
							<path d="M301.205 476.204c-3.525-.35-6.807-.781-7.293-.959-1.002-.365-5.263-9.277-8.586-17.96-2.91-7.602-6.167-19.107-8.065-28.489l-1.52-7.514 2.728-2.36c6.22-5.387 12.022-9.79 19.026-14.443 7.18-4.77 20.695-12.542 21.811-12.542 1.157 0 16.956 10.795 23.409 15.994 3.722 3 9.637 8.173 13.143 11.498l6.375 6.044-1.57 7.012c-2.665 11.908-7.386 25.313-13.664 38.8l-1.608 3.456-5.397.821c-7.012 1.067-30.581 1.457-38.789.642z"/>
						  </g>
					  </svg>`);
					for (let i = 0; i < 32; i++) {
						let elem = svg.find(".segments path, circle.none-segment").eq(i);
						elem.attr("fill", segmentColors[i]);
					}
					module.push({ obj: svg, nobullet: true });
					return true;
				}
			},
			{
				regex: /.+/,
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
					module.push({ label: "The maze generated with its walls as follows:", obj: pre(readTaggedLines(9).join('\n')) });
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
		moduleID: "GSFaultyButtons",
		loggingTag: "Faulty Buttons",
		matches: [
			{
				regex: /The referred buttons for each button in reading order are:/,
				handler: function(match, module) {
					let grid = readLines(4).map(l => l.split(' '));
					let table = "<table class='blank-buttons faulty'>";
					for (let row = 0; row < 4; row++) {
						table += "<tr>";
						for (let col = 0; col < 4; col++)
							table += `<td>${grid[row][col]}</td>`;
						table += "</tr>";
					}
					module.push({ label: match.input, obj:table });
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
		moduleID: 'FittingInModule',
		loggingTag: 'Fitting In',
		matches: [
			{
				regex: /Piece color: (.{6})/,
				handler: function(matches, module) {
					module.color = matches[1];
				}
			},
			{
				regex: /Piece:/,
				handler: function (_, module) {					
					
					module.rows = [ ];
					let line;
					while ((line = readTaggedLine()).match(/^[#*]+/)) {
						let row = line.split('').map(x => x == '#');
						module.rows.push(row);
					}
					linen--;
					
					const height = module.rows.length;
					const width = module.rows[0].length;
					//each square 10 units wide. 1 unit gap between. 5 units padding on edges.
					let svg = `<svg class='fitting-in' viewbox='-5 -5 ${11 * width + 9} ${11 * height + 9}' style='width: ${width / 2}in' >`;
					svg += `<rect class='background' x='-5' y='-5' width='${11 * width + 9}' height='${11 * height + 9}' rx='5' ry='5'/>`;
					for (let y = 0; y < height; y++) {
						for (let x = 0; x < width; x++) {
							if (module.rows[y][x])
								svg += `<rect x='${11 * x}' y='${11 * y}' width='10' height='10' fill='#${module.color ?? 'C6F'}'/>`;
						}
					}
					module.push({ label:'Piece:', obj:svg + '</svg>'});
				}
			},
			{
				regex: /Grid:/,
				handler: function(_, module) {
					let rows = [ ];
					for (let i = 0; i < 10; i++)
						rows.push(readTaggedLine().split('').map(x => x == '*'));
					let cells = readTaggedLine().substring(15).split(', ').map(cell => 
						({ x: 'ABCDEFGHIJ'.indexOf(cell[0]), y: cell.substring(1) - '1' }));
					let svg = `<svg class='fitting-in grid' viewbox='-5 -5 119 119'>`;
					svg += `<rect class='background' x='-5' y='-5' width='119' height='119' rx='5' ry='5'/>`;
					for (let row = 0; row < 10; row++){
						for (let col = 0; col < 10; col++) {
							const type = rows[row][col] ? 'black' : 'white';
							svg += `<rect class='${type}' x='${11 * col}' y='${11 * row}' width='10' height='10'/>`;
						}
					}
					for (let cell of cells)
						svg += `<rect x='${11 * cell.x}' y='${11 * cell.y}' width='10' height='10' fill='#${module.color ?? 'C6F'}'/>`;
					module.push({ label:'Grid & Solution:', obj:svg + '</svg>' });
				}
			},
			{
				regex: /Correctly pressed|Incorrectly pressed|Pressed all correct/
			}
		]
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
		displayName: "Flipping Squares",
		moduleID: "FlippingSquaresModule",
		loggingTag: "Flipping Squares",
		matches: [
			{
				regex: /^(Initial state:|Intended solution:)$/,
				handler: function (matches, module) {
					let lns = readLines(3);
					let arrowPathD = 'm 2.01e-4,-4.902 c -0.632551,1.2651 -1.2651,2.5302 -2.530201,3.795302 0.793599,-0.340114 1.382063,-0.553566 1.914947,-0.649848 0.298978,2.231223 -0.333571,4.761423 -0.966122,6.659074 0.948825,-0.316275 2.213927,-0.316275 3.162752,0 -0.632551,-1.897651 -1.2651,-4.427851 -0.966122,-6.659074 0.532884,0.09628 1.121348,0.309734 1.914947,0.649848 C 1.265301,-2.3718 0.632752,-3.6369 2.01e-4,-4.902 z';
					let colors = {
						R: '#ff5252',
						O: '#ffa952',
						Y: '#ffff52',
						G: '#8bff52',
						C: '#52ffc6',
						Z: '#52a7ff',
						B: '#5452ff',
						P: '#ab52ff',
						I: '#ff52fc'
					};
					let rotations = "↑↗→↘↓↙←↖";
					let svgGroups = Array(18).fill(null).map((_, sq) => {
						let ch = lns[((sq / 3) | 0) % 3][(sq % 3) * 3 + ((sq / 9) | 0) * 12 + 1];
						return `
							<g transform='translate(${10 * (sq % 3) + 50 * ((sq / 9) | 0)}, ${10 * (((sq / 3) | 0) % 3)})'>
								<rect fill='${colors[lns[((sq / 3) | 0) % 3][(sq % 3) * 3 + ((sq / 9) | 0) * 12]]}' width='10' height='10'/>
								<path fill='black' fill-opacity='.3' d='M10 0v10h-10l1 -1h8v-8z'/>
								<path fill='white' fill-opacity='.5' d='M0 10v-10h10l-1 1h-8v8z'/>
								${ch === '·' ? '' : ch === '•' ? `<circle cx='5' cy='5' r='1.5' />` : `<path d='${arrowPathD}' transform='translate(5, 5) scale(.7) rotate(${45 * rotations.indexOf(ch)})'/>`}
							</g>
						`;
					}).join('');
					let svg = $(`<svg style='display:block;width:16cm' viewBox='-.5 -4.5 81 35' font-size='4' text-anchor='middle'>
						<text x='15' y='-1'>FRONT</text>
						<text x='65' y='-1'>BACK</text>
						${svgGroups}</svg>`);
					module.push({ label: matches[1], obj: svg });
					return true;
				}
			},
			{
				regex: /^Flips:$/,
				handler: function (matches, module) {
					let lns = readLines(9)
						.map(line => /Squares \[(.*)\], Dir (\d+)/.exec(line))
						.map(match => ({ sq: match[1].split(',').map(s => s.split('↔').map(v => parseInt(v))), dir: parseInt(match[2]) }));
					let lnsSvg = lns.map((ln, lnIx) => {
						let inner = ln.sq.map(sq => sq[0] === sq[1] ?
							`<g transform='translate(${10 * (sq[0] % 3) + 5}, ${10 * ((sq[0] / 3) | 0) + 5}) rotate(${45 * ln.dir})'>
								<path d='M0 -1v2' fill='none' stroke='black' stroke-width='1' />
								<path d='M-1 -1 h2 l-1 -2zM-1 1 h2 l-1 2z' fill='black' stroke='none' />
							</g>`: `
								<path data-dir='${ln.dir}' d='M${10 * (sq[0] % 3) + 5} ${10 * ((sq[0] / 3) | 0) + 5} ${10 * (sq[1] % 3) + 5} ${10 * ((sq[1] / 3) | 0) + 5}' fill='none' stroke='black' stroke-width='1' />
								<path transform='translate(${10 * (sq[0] % 3) + 5}, ${10 * ((sq[0] / 3) | 0) + 5}) rotate(${ln.dir < 2 ? 180 + 45 * ln.dir : 45 * ln.dir})' d='M-1 0 h2 l-1 2z' fill='black' stroke='none' />
								<path transform='translate(${10 * (sq[1] % 3) + 5}, ${10 * ((sq[1] / 3) | 0) + 5}) rotate(${ln.dir < 2 ? 180 + 45 * ln.dir : 45 * ln.dir})' d='M-1 0 h2 l-1 -2z' fill='black' stroke='none' />
							`).join('');
						return `
							<g transform='translate(${35 * (lnIx % 3)}, ${35 * ((lnIx / 3) | 0)})'>
								<text x='15' y='-1'>${lnIx + 1}</text>
								${Array(9).fill(null).map((_, sq) => `
									<g transform='translate(${10 * (sq % 3)}, ${10 * ((sq / 3) | 0)})'>
										<rect fill='${ln.sq.some(tup => tup[0] === sq || tup[1] === sq) ? '#bdf' : '#ddd'}' width='10' height='10'/>
										<path fill='black' fill-opacity='.3' d='M10 0v10h-10l1 -1h8v-8z'/>
										<path fill='white' fill-opacity='.5' d='M0 10v-10h10l-1 1h-8v8z'/>
									</g>
								`).join('')}
								${inner}
							</g>
						`;
					}).join('');
					let svg = $(`<svg style='display:block;width:16cm' viewBox='-.5 -5.5 101 106' font-size='4' text-anchor='middle'>${lnsSvg}<${''}/svg>`);
					module.push({ label: "Flips:", obj: svg });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Floor Lights",
		moduleID: "FloorLights",
		loggingTag: "Floor Lights",
		matches: [
			{
				regex: /^Stage (\d+): (Generated ((?:[RGB] at [ABCDEF][1-6](?:|, )){3}))$/,
				handler: function (matches, module) {
					let stageInfo = matches[3].split(", ").map(x => x[0].concat(x.slice(4, 7)).split(' ')).map(x => [x[0]].concat(x[1] = (x[1][1] - 1) * 6 + "ABCDEF".indexOf(x[1][0])));
					let table = $('<table>').css('border-collapse', 'collapse');
					for (let row = 0; row < 6; row++) {
						let tr = $('<tr>').appendTo(table);
						for (let col = 0; col < 6; col++) {
							let td = $('<td>')
								.text(' ')
								.css('text-align', 'center')
								.css('border', 'solid')
								.css('border-width', '1px')
								.css('width', '15px')
								.css('height', '15px')
								.css('background-color', '#858585')
								.appendTo(tr);

							for (let i = 0; i < 3; i++) {
								if (stageInfo[i][1] == row * 6 + col) {
									switch (stageInfo[i][0]) {
										case 'R':
											td.css('background-color', '#FF0000')
											break;
										case 'G':
											td.css('background-color', '#00FF00')
											break;
										case 'B':
											td.css('background-color', '#0000FF')
											break
									}
								}
							}
						}
					}
					module.FloorLightsStage = [`Stage ${matches[1]}:`, table, matches[2]];
					return true;
				}
			},
			{
				regex: /^(Submitted|Grid:) ([#*]{36})\.?$/,
				handler: function (matches, module) {
					let grid = Array.from(new Array(6), (_, i) => matches[2].slice(i * 6, i * 6 + 6))
					let table = $('<table>').css('border-collapse', 'collapse');
					for (let row = 0; row < grid.length; row++) {
						let tr = $('<tr>').appendTo(table);
						for (let col = 0; col < grid.length; col++) {
							let td = $('<td>')
								.text(' ')
								.css('text-align', 'center')
								.css('border', 'solid')
								.css('border-width', '1px')
								.css('width', '15px')
								.css('height', '15px')
								.appendTo(tr);
							switch (grid[row][col]) {
								case '#':
									td.css('background-color', '#FFFF00')
									break;
								case '*':
									td.css('background-color', '#858585')
									break;
							}
						}
					}
					if (matches[1] === 'Grid:') {
						module.push([module.FloorLightsStage[0], [{ label: module.FloorLightsStage[2], obj: module.FloorLightsStage[1] }, { label: 'Grid:', obj: table }]])
					}
					else {
						module.push({ label: 'Submitted:', obj: table })
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
				handler: function (matches, module) {
					const COL_COUNT = parseInt(matches[1]);
					const ROW_COUNT = parseInt(matches[2]);

					let maze = readLines(ROW_COUNT + 1).slice(1, ROW_COUNT + 1);
					let table = $('<table>').css('border-collapse', 'collapse');

					for (let row = 0; row < ROW_COUNT; row++) {
						let tr = $('<tr>').appendTo(table);
						for (let col = 0; col < COL_COUNT; col++) {
							let td = $('<td>')
								.text(' ')
								.css('text-align', 'center')
								.css('border', 'solid')
								.css('width', '25px')
								.css('height', '25px')
								.appendTo(tr);

							let current = maze[row].split(' ')[col].split('');
							current.forEach(element => {
								switch (element) {
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
				handler: function (matches, module) {
					const COL_COUNT = 5;
					const ROW_COUNT = 5;

					let maze = readLines(ROW_COUNT);
					let table = $('<table>').css('border-collapse', 'collapse');

					for (let row = 0; row < ROW_COUNT; row++) {
						let tr = $('<tr>').appendTo(table);
						for (let col = 0; col < COL_COUNT; col++) {
							let td = $('<td>')
								.text(' ')
								.css('text-align', 'center')
								.css('border', 'solid')
								.css('width', '25px')
								.css('height', '25px')
								.appendTo(tr);

							let current = maze[row].split(' ')[col].split('');
							current.forEach(element => {
								switch (element) {
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
		moduleID: "MemoryV2",
		loggingTag: "Forget Me Not",
		matches: [
			{
				regex: /(Display|Solution): ([\d\s]+)/,
				handler: function(matches, module) {
					let nums = matches[2].replace(/\s+/g, '').split('');
					let full = '';
					let three = '';
					let five = '';
					
					for (let i = 0; i < nums.length; i++){
						if (i % 3 == 0 && i != 0)
							three += ' ';
						if (i % 5 == 0 && i != 0)
							five += ' ';
						full += nums[i];
						three += nums[i];
						five += nums[i];
					}
					module.push([ matches[1] + ": (in different group sizes)", [ pre(full), three, five ]]);
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
		moduleID: "gameChangerModule",
		loggingTag: "Game Changer",
		matches: [
			{
				regex: /Initial Board State:|Expected board state after \d+ iterations?:/,
				handler: function (matches, module) {
					let grid = readTaggedLines(6);
					let svg = `<svg style='display: block; width: 2in' viewbox='0 0 38 74'>`;
					svg += `<rect fill='#89b' x='0' y='0' width='38' height='74'/>`;
					for (let row = 0; row < 6; row++){
						for (let col = 0; col < 3; col++){
							let color = grid[row][col] == 'W' ? '#FFF' : '#000';
							let x = 10 * col + 2 * (col + 1);
							let y = 10 * row + 2 * (row + 1);
							svg += `<rect fill='${color}' x='${x}' y='${y}' width='10' height='10'/>`;
						}
					}
					svg += '</svg>';
					module.push({ label:matches, obj:svg });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "GameOfColors",
		loggingTag: "Game of Colors",
		matches: [
			{
				regex: /^The (?:goal )?grid for (magenta|yellow|cyan) is:$/,
				handler: function (matches, module) {
					const color = {
						"magenta": "#FF00FF",
						"yellow": "#FFFF00",
						"cyan": "#00FFFF"
					}[matches[1]];
					let grid = readTaggedLines(5);
					let table = $('<table>').css('border-collapse', 'collapse');
					for (let x = 0; x < 5; x++) {
						let tr = $('<tr>').appendTo(table);
						for (let y = 0; y < 5; y++) {
							let td = $('<td>')
								.text(' ')
								.css('text-align', 'center')
								.css('border', 'solid')
								.css('border-width', 'thick')
								.css('width', '25px')
								.css('height', '25px')
								.css('background-color', grid[x][y] == '.' ? "#000000" : color)
								.appendTo(tr);
						}
					}
					module.push({ label: matches[0], obj: table });
					return true;
				}
			},
			{
				regex: /^The final answer is:$/,
				handler: function (matches, module) {
					const colorCodes = {
						'R': "#FF0000",
						'G': "#00FF00",
						'B': "#0000FF",
						'M': "#FF00FF",
						'Y': "#FFFF00",
						'C': "#00FFFF",
						'W': "#FFFFFF",
						'K': "#000000"
					};
					let grid = readTaggedLines(5);
					let table = $('<table>').css('border-collapse', 'collapse');
					for (let x = 0; x < 5; x++) {
						let tr = $('<tr>').appendTo(table);
						for (let y = 0; y < 5; y++) {
							let td = $('<td>')
								.text(' ')
								.css('text-align', 'center')
								.css('border', 'solid')
								.css('border-width', 'thick')
								.css('width', '25px')
								.css('height', '25px')
								.css('background-color', colorCodes[grid[x][y]])
								.appendTo(tr);
						}
					}
					module.push({ label: matches[0], obj: table });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: ["GameOfLifeCruel", "GameOfLifeSimple", "LifeIteration", "wackGameOfLife"],
		loggingTag: ["Game of Life Cruel", "Game of Life Simple", "Life Iteration", "Wack Game of Life"],
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
				regex: /All solutions the computer could find.*/,
				handler: function (matches, module) {
					let solutions = [];
					while (linen < lines.length) {
						let mmm = (/\d-\d, \d/).exec(readLine());
						if (mmm == null)
							break;
						solutions.push(mmm[0]);
					}
					linen--;
					module.push({ label: matches.input, obj: pre(solutions.join('\n')) });
				}
			},
			{
				regex: /((?:Answer for|Submitted at) .+):/,
				handler: function (matches, module) {
					module.push([matches[1], module.answer = []]);
				}
			},
			{
				regex: /(Initial state|Iteration \d+|Grid \w+|Solution|Colored square states|Submitted|Intended solution|Inputted):/,
				handler: function (matches, module, moduleInfo) {
					if (moduleInfo.moduleData.moduleID === 'wackGameOfLife') {
						linen++;
						module.reference = { '#': 'White', 'O': 'Black' };
					}
					const grid = $SVG('<svg viewBox="0 0 6 8" width="20%">').css({ border: "2px gray solid", display: "block" });
					readLines(8).map(row => row.split("")).forEach((row, y) => {
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
		displayName: "The Grand Prix",
		moduleID: "KritGrandPrix",
		loggingTag: "Grand Prix",
		matches: [
			{
				regex: /^\(Initial\) The starting order is: (.+)\.$/,
				handler: function (matches, module) {
					module.startup = matches[1];
					module.stages = $(`<table style='width: 100%; border: black solid 2px; text-align: center;'><tr><th style="border-right: black solid 2px;">#:</th><th style="border-right: gray solid 1px;">Flag:</th><th style="border-right: gray solid 1px;">Sector:</th><th style="border-right: gray solid 1px;">Driver:</th><th>Action</th></tr></table>`);
					return true;
				}
			},
			{
				regex: /^\(Initial\) The starting deltas are as follows: $/,
				handler: function (_, module) {
					let lines = readLines(20);

					let offsets = [0.0];
					for (let i = 1; i < 20; ++i)
						offsets[i] = offsets[i - 1] + parseFloat(lines[i]);
					offsets = offsets.map(i => i.toFixed(3));
					offsets[0] = lines[0] = "Inter.";

					module.startup = $(`<table style='border: black solid 2px; text-align: center;'><tr><th>#:</th><th>NAME:</th><th>DELTA:</th><th>OFFSET:</th></tr>${module.startup.split(", ").map((m, i) => `<tr style='border: black solid 2px;'><td style="border-right: black solid 2px;">${i + 1}</td><td style="border-right: gray solid 1px;">${m}</td><td style="border-right: gray solid 1px;">${lines[i]}</td><td>${offsets[i]}</td></tr>`).join("")}</table>`);
					module.push("Beginning standings:");
					module.push({ obj: module.startup, nobullet: true });
					module.push("Stages:");
					module.push({ obj: module.stages, nobullet: true });
					return true;
				}
			},
			{
				regex: /^\(Lap (\d+)\) Lap info:$/,
				handler: function (matches, module) {
					let lines = readLines(4);

					let color = /^\[Grand Prix #\d+\]: \(Lap \d+\) The flag shown this lap is (.+)$/.exec(lines[0])[1];
					let sector = /^\[Grand Prix #\d+\]: \(Lap \d+\) The associated sector is sector (.+)$/.exec(lines[1])[1];
					let driver = /^\[Grand Prix #\d+\]: \(Lap \d+\) The driver associated with the flag is (.+)\.$/.exec(lines[2])?.[1] ?? "N/A";
					let action = /^\[Grand Prix #\d+\]: \(Lap \d+\) (.*)$/.exec(lines[3])[1];

					let affected = "";
					if (color == "Yellow")
						affected = /^\[Grand Prix #\d+\]: \(Lap \d+\) The drivers involved with this are: (.*)$/.exec(readLine())[1];

					let struct;
					module.stages.append(struct = $(`
					<tr style='border: black solid 2px;'>
						<th style="border-right: black solid 2px;">${matches[1]}</th>
						<td style="border-right: gray solid 1px;">${color}</td>
						<td style="border-right: gray solid 1px;">${sector}</td>
						<td style='${driver == "N/A" ? "background-color: #fbb; " : ""}border-right: gray solid 1px'>${driver}</td>
						<td${action != "" ? "" : " style='background-color: #fbb;'"}>
							${action != "" ? `<ul>
								<li class="expandable">
									<a href="#" class="expander">View</a>
									<ul style="padding: 0;">
										<li class="no-bullet">${action}</li>
										${affected != "" ? `<li class="no-bullet">Drivers involved: ${affected}</li>` : ""}
									</ul>
								</li>
							</ul>` : "N/A"}
						</td>
					</tr>`));

					let expanders = struct.find(".expander");
					for (let i = 0; i < expanders.length; i++)
						$(expanders[i]).on("click", function () { $(expanders[i]).parent().toggleClass("expanded"); return false; });

					return true;
				}
			},
			{
				regex: /^\(Lap (\d+)\) Arrived at green flag lap\.$/,
				handler: function (matches, module) {
					module.stages.append(struct = $(`
					<tr style='border: black solid 2px;'>
						<th style="border-right: black solid 2px;">${matches[1]}</th>
						<td style="border-right: gray solid 1px;">Green</td>
						<td style='background-color: #fbb; border-right: gray solid 1px;'>N/A</td>
						<td style='background-color: #fbb; border-right: gray solid 1px;'>N/A</td>
						<td style='background-color: #fbb;'>N/A</td>
					</tr>`));

					return true;
				}
			},
			{
				regex: /^\(Final lap\) The exptected result is (.+)$/,
				handler: function (matches, module) {
					module.push("Expected results:");
					module.push({ obj: $(`<table style='border: black solid 2px; text-align: center;'>${matches[1].split(", ").map((m, i) => `<tr style='border: black solid 2px;'><th style="border-right: black solid 2px;">${i + 1}</th><td>${m}</td></tr>`).join("")}</table>`), nobullet: true });

					return true;
				}
			},
			{
				regex: /^\(Final lap\) (.+)$/,
				handler: function (matches, module) {
					module.push(matches[1]);

					return true;
				}
			},
			{
				regex: /^(\(Initial\) (Total lap count: \d+|The green flag lap is at lap \d+)|\(Final lap\) Reached the final lap\.)$/,
				handler: function (_, _) {
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
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
					let rawData = readLines(9);
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
		moduleID: ["BlueHuffmanCipherModule", "YellowHuffmanCipherModule"],
		displayName: ["Blue Huffman Cipher", "Yellow Huffman Cipher"],
		loggingTag: ["Blue Huffman Cipher", "Yellow Huffman Cipher"],
		matches: [
			{
				regex: /^Letters (.*)$/,
				handler: function (matches, module) { module.HuffmanPages = [{ labels: ['Letters on module:', matches[1].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')] }]; return true; }
			},
			{
				regex: /^Combining (\d+) (\d+) (.*)$/,
				handler: function (matches, module) { module.HuffmanPages.push({ label: `Combining #${parseInt(matches[1])} and #${parseInt(matches[2])}`, svg: matches[3] }); return true; }
			},
			{
				regex: /^Final ([01]) (.*)$/,
				handler: function (matches, module) {
					module.HuffmanTree = matches[2];
					module.HuffmanCount = 0;
					if (matches[1] === '1')
						for (var i = 0; i < 51; i++)
							module.HuffmanPages.push({ depth: i, svg: true });
					else
						module.HuffmanPages.push({ label: 'Final tree', svg: true });
					return true;
				}
			},
			{
				regex: /^Binary ([01]) (.*)$/,
				handler: function (matches, module) {
					let allPieces = matches[2].split(';').map(str => str.split('='));
					let table = `<table style='border: 2px solid black; margin: .5cm auto; text-align: center;'>`;
					for (let i = 0; i < (((allPieces.length + 6) / 7) | 0); i++) {
						let pieces = allPieces.slice(7 * i, 7 * (i + 1));
						table += `<tr>${pieces.map(p => `<td style='border: 1px solid black; border-top-width: 2px'>${p[0]}</td>`).join('')}</tr>`;
						table += `<tr style='font-weight: bold'>${pieces.map(p => `<td style='border: 1px solid black; padding: .1cm .3cm'>${p[1]}</td>`).join('')}</tr>`;
					}
					table += `</table>`;
					module.HuffmanPages.push({ label: `Encrypted data to binary`, table: table, svg: matches[1] === '1' });
					module.HuffmanBinary = allPieces.map(p => p[1].replace(/[^01]/g, '')).join('');
					return true;
				}
			},
			{
				regex: /^Decode (\d+) (\d+) ([A-Z])$/,
				handler: function (matches, module) {
					module.HuffmanPages.push({
						s: matches[1] | 0,
						e: matches[2] | 0,
						c: module.HuffmanCount,
						svg: true
					});
					module.HuffmanCount++;
					return true;
				}
			},
			{
				regex: /^Solution ([A-Z]+)$/,
				handler: function (matches, module) {
					module.HuffmanPages.push({ label: `Solution: ${matches[1]}`, svg: true });

					let div = document.createElement('div');
					div.innerHTML = `
						<div class='top' style='position: relative; background: #eef; padding: .1cm .25cm; margin: 0 auto .5cm; min-height: 1.5cm'>
							<button type='button' class='left' style='position: absolute; left: .1cm; top: 50%; transform: translateY(-50%); background: #ccf; border: 1px solid #88d; width: 1cm; height: 1cm; text-align: center;'>◀</button>
							<button type='button' class='right' style='position: absolute; right: .1cm; top: 50%; transform: translateY(-50%); background: #ccf; border: 1px solid #88d; width: 1cm; height: 1cm; text-align: center;'>▶</button>
							<div class='label' style='text-align: center; font-weight: bold; font-size: 18pt; position: absolute; left: 1.2cm; right: 1.2cm; top: 50%; transform: translateY(-50%)'></div>
						</div>
						<div class='bottom'></div>
					`;
					let label = div.querySelector('.label');
					let bottom = div.querySelector('.bottom');

					let curPage = 0;
					function setPage() {
						let page = module.HuffmanPages[curPage];
						bottom.innerHTML = `${page.table || ''}${'svg' in page ? page.svg === true ? module.HuffmanTree : page.svg === false ? '' : page.svg : ''}`;
						if (page.labels) {
							label.innerHTML = page.labels.map((_, ix) => `<div class='s-${ix}'></div>`).join('');
							page.labels.forEach((lbl, ix) => { label.querySelector(`.s-${ix}`).innerText = lbl; });
						}
						else if (page.label)
							label.innerText = page.label;
						else if ('depth' in page) {
							Array.from(bottom.querySelectorAll('*'))
								.map(e => ({ elem: e, match: /\bnode-d(\d+)\b/.exec(e.getAttribute('class')) }))
								.filter(inf => inf.match !== null && parseInt(inf.match[1]) >= page.depth)
								.forEach(inf => {
									if (parseInt(inf.match[1]) === page.depth) {
										if (inf.elem.nodeName === 'circle')
											inf.elem.setAttribute('fill', '#f88');
									}
									else
										inf.elem.setAttribute('opacity', '0');
								});
							let restBinary = module.HuffmanBinary.substr(page.depth + 1);
							if (restBinary.length > 11)
								restBinary = restBinary.substr(0, 10) + "...";
							let prevBinary = module.HuffmanBinary.substr(0, page.depth);
							if (prevBinary.length > 11)
								prevBinary = "..." + prevBinary.substr(prevBinary.length - 10);
							label.innerHTML = `<div>Decoding tree...</div><div>${prevBinary}<span style='margin:0 .1cm; padding:0 .1cm; background: #fdd; border: 2px solid #a00;'>${module.HuffmanBinary[page.depth]}</span>${restBinary}</div>`;
						}
						else {
							let highlights = Array(page.e - page.s + 1).fill(null).map((_, ix) => `.node-b${module.HuffmanBinary.substr(page.s, ix).split('').reverse().join('')}`).join(',');
							let restBinary = module.HuffmanBinary.substr(page.e);
							if (restBinary.length > 15)
								restBinary = restBinary.substr(0, 10) + "...";
							label.innerHTML = `${matches[1].substr(0, page.c)}<span style='margin:0 .1cm; padding:0 .1cm; background: #fdd; border: 2px solid #a00;'>${module.HuffmanBinary.substr(page.s, page.e - page.s)}</span>${restBinary}<br>→ ${matches[1][page.c]}`;
							Array.from(bottom.querySelectorAll(highlights)).forEach(elem => { elem.style.fill = '#fc8'; });
						}
					}

					div.querySelector('.left').onclick = function () {
						curPage = Math.max(curPage - 1, 0);
						setPage();
					};
					div.querySelector('.right').onclick = function () {
						curPage = Math.min(curPage + 1, module.HuffmanPages.length - 1);
						setPage();
					};

					module.push({ obj: div, nobullet: true });
					setPage();
					return true;
				}
			},
			{ regex: /.+/ }
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
				regex: /^Cube (\w+) is/,
				handler: function (matches, module) {
					let lines = readTaggedLines(9);
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
					let colors = { 'K': '#000', 'R':'#F00', 'M':'#800', 'G':'#0F0', 'F':'#080', 'B':'#00F', 'I':'#008' };
					
					const radius = .4;
					for (let v of vertices) {
						svg.push(`<path stroke='black' stroke-width='.02' fill='${colors[lines[v.line][v.col]]}' d='M ${v.x + radius * Math.cos(-Math.PI / 4)} ${v.y + radius * Math.sin(-Math.PI / 4)} A .4 .4 0 0 0 ${v.x + radius * Math.cos(Math.PI * 3 / 4)} ${v.y + radius * Math.sin(Math.PI * 3 / 4)} z' />`);
						svg.push(`<path stroke='black' stroke-width='.02' fill='${colors[lines[v.line][v.col + 2]]}' d='M ${v.x + radius * Math.cos(Math.PI * 3 / 4)} ${v.y + radius * Math.sin(Math.PI * 3 / 4)} A .4 .4 0 0 0 ${v.x + radius * Math.cos(Math.PI * 7 / 4)} ${v.y + radius * Math.sin(Math.PI * 7 / 4)} z' />`);
					}
					module.push({ label: 'Cube ' + matches[1] + ':', obj: $('<svg>').html(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='-.6 -.6 10 4.2'>${svg.join('')}</svg>`) });
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
					module.push([matches.input, readLines(3)]);
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
						div.append(`<img src='../HTML/img/The Icon Kit/${photos[i]}.png' height='100' style='display: inline-block; margin-right: 5px; margin-bottom: 5px' />`);
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
		moduleID: "IKEADocuments",
		loggingTag: "IKEA Documents",
		matches: [
			{
				regex: /^Selected: Page (\d+?) of (.+?) \((.+)\)/,
				handler: (matches, module) => {
					module.push({ label: `Selected: ${matches[2]} (page ${matches[1]})`, obj: $("<div>").append($("<img>").attr("src", `../HTML/img/IKEA%20Documents/${matches[3]}.png`).css({ width: 400, maxWidth: "100%", backgroundColor: "#fff", border: "2px solid #000", margin: "5px 0 10px" })) });
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
		loggingTag: "The Jack-O'-Lantern",
		matches: [
			{
				regex: /Eye pattern: (\d). Mouth pattern: (\d)./,
				handler: function(matches, module) {
					module.solveBased = matches[1] == '2' && matches[2] == '3';
				}
			},
			{
				regex: /Press (trick|treat)./,
				handler: function(matches, module) {
					if (module.solveBased){
						if (matches[1] == 'trick'){
							module.push('Even solves answer: Press trick');
							module.push('Odd solves answer: Press treat');
						}
						else {
							module.push('Even solves answer: Press treat');
							module.push('Odd solves answer: Press trick');
						}
						return true;
					}
				}
			},
			{
				regex: /A module has been solved. The answer is being recalculated./,
				handler: function(_, module){
					linen += 3;
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
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
		moduleID: 'juxtacolourFlash',
		loggingTag: 'Juxtacolour Flash',
		matches: [
			{
				regex: /The configuration of the walls that must be avoided:/,
				handler: function (match, module) {
					const grid = readTaggedLines(23).map(l => l.split(''));
					let svg = "<svg class='juxtacolour-flash' viewBox='-20 -20 1140 1140'>"
					for (let row = 0; row < 11; row++) {
						for (let col = 0; col < 11; col++) {
							let g = `<g transform='translate(${100 * col}, ${100 * row})'>`;
							if (grid[2 * row][2 * col + 1] == '■') //Up
								g += '<line x1=-10 y1=0 x2=110 y2=0/>';
							if (grid[2 * row + 1][2 * col] == '■') //Left
								g += '<line x1=0 y1=-10 x2=0 y2=110/>';
							svg += g + '</g>';
						}
					}
					svg += "<line x1=0 y1=1100 x2=1110 y2=1100 />";
					svg += "<line x1=1100 y1=0 x2=1100 y2=1110 />";
					module.push({ label:match.input, obj:svg + '</svg>' });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
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
					var lines = readLines(4).map(l => l.split(' '));
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
				regex: /^(Solution|Codings|New codings):$/,
				handler: function (matches, module) {
					var lines = readTaggedLines(6).map(l => l.trim().replace(/\]\[/g, "] [").replace(/  +/g, ' ').split(' '));
					module.push({ label: matches.input, obj: $(`<table style='border-collapse: collapse; text-align: center;'>${lines.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`).find('td').css({ border: '1px solid black', padding: '.1em .5em' }).end() });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "kugelblitz",
		displayName: "Kugelblitz",
		loggingTag: "Kugelblitz",
		matches: [
			{
				regex: /^Found \d+ solvable modules?\.$/,
				handler: function () {
					return true;
				}
			},
			{
				regex: /^Generated binary numbers are (([01]{7}[,.] )+)This will result in ([01]{7}).$/,
				handler: function (matches, module) {
					let rows = `<tr id="kugel-title"><th style="text-align: center;">#</th><th style="outline: black solid 2px;">Black:</th></tr>${matches[1]}`;
					let i = 1;
					while (/([01]{7})[,.] /g.test(rows)) {
						rows = rows.replace(/([01]{7})[,.] /, `<tr id="kugel-row-${i}"><td style="text-align: center;">${i}</td><td style="outline: black solid 2px;">$1</td></tr>`);
						i++;
					}
					rows += `<tr id="kugel-final"><th /><th style="outline: black solid 2px;"><strong>Final:</strong></th></tr><tr id="kugel-final-number"><td /><td style="outline: black solid 2px;">${matches[3]}</td><tr>`;
					let table = $(`<table style="border-collapse: collapse; background-color: #aaa; outline: black solid 2px; text-align: center;">${rows}<table>`);
					module.table = table;
					return true;
				}
			},
			{
				regex: /^Generated binary numbers for extra Kugelblitz \((red|orange|yellow|green|blue|indigo)\) are (([01]{7}[,.] )+)This will result in ([0-7]{6,7}).$/,
				handler: function (matches, module) {
					let cs = function (string) {
						switch (string) {
							case "red":
								return "#f00";
							case "orange":
								return "#f80";
							case "yellow":
								return "#ff0";
							case "green":
								return "#0f0";
							case "blue":
								return "#0cf";
							case "indigo":
								return "#40f";
						}
						return string;
					}
					let table = module.table;
					table.find("#kugel-title").append(`<td style="background-color: ${cs(matches[1])}; outline: black solid 2px; text-align: center;"><strong>${matches[1].charAt(0).toUpperCase() + matches[1].slice(1)}:</strong></td>`);
					let stages = matches[2].split(/[,.] /);
					for (let i = 1; i < stages.length; i++) {
						table.find(`#kugel-row-${i}`).append(`<td style="background-color: ${cs(matches[1])}; outline: black solid 2px; text-align: center;">${stages[i - 1]}</td>`);
					}
					table.find("#kugel-final").append(`<th style="background-color: ${cs(matches[1])}; outline: black solid 2px; text-align: center;"><strong>Final:</strong></th>`);
					table.find("#kugel-final-number").append(`<td style="background-color: ${cs(matches[1])}; outline: black solid 2px; text-align: center;">${matches[4]}</td>`);
					return true;
				}
			},
			{
				regex: /^Generated binary numbers for extra Kugelblitz \((violet)\) are (([01]{7}[,.] )+)This will result in horzontally placed modifier ([0-7]{7}) and vertically placed modifier ([0-7]{7})\.$/,
				handler: function (matches, module) {
					let table = module.table;
					table.find("#kugel-title").append($.parseHTML(`<td style="background-color: #c0f; outline: black solid 2px; text-align: center;"><strong>Violet: (Horiz)</strong></td><td style="background-color: #c0f; outline: black solid 2px; text-align: center;"><strong>Violet: (Vert)</strong></td>`));
					let stages = matches[2].split(/[,.] /);
					for (let i = 1; i < stages.length; i++) {
						if (i % 2 === 0) {
							table.find(`#kugel-row-${i}`).append(`<td style="background-color: #c0f; outline: black solid 2px; text-align: center;" />`);
						}
						table.find(`#kugel-row-${i}`).append(`<td style="background-color: #c0f; outline: black solid 2px; text-align: center;">${stages[i - 1]}</td>`);
						if (i % 2 === 1) {
							table.find(`#kugel-row-${i}`).append(`<td style="background-color: #c0f; outline: black solid 2px; text-align: center;" />`);
						}
					}
					table.find("#kugel-final").append($.parseHTML(`<th style="background-color: #c0f; outline: black solid 2px; text-align: center;"><strong>Final:</strong></th><th style="background-color: #c0f; outline: black solid 2px; text-align: center;"><strong>Final:</strong></th>`));
					table.find("#kugel-final-number").append($.parseHTML(`<td style="background-color: #c0f; outline: black solid 2px; text-align: center;">${matches[4]}</td><td style="background-color: #c0f; outline: black solid 2px; text-align: center;">${matches[5]}</td>`));

					const tbl = [
						[5, 1, 4, 3, 0, 6, 2],
						[1, 2, 0, 5, 3, 4, 6],
						[3, 6, 5, 2, 4, 0, 1],
						[6, 4, 1, 0, 2, 5, 3],
						[4, 0, 3, 1, 6, 2, 5],
						[0, 5, 2, 6, 1, 3, 4],
						[2, 3, 6, 4, 5, 1, 0]
					];

					let cols = [matches[5][0], matches[5][1], matches[5][2], matches[5][3], matches[5][4], matches[5][5], matches[5][6]].map(c => parseInt(c));
					let rows = [matches[4][0], matches[4][1], matches[4][2], matches[4][3], matches[4][4], matches[4][5], matches[4][6]].map(c => parseInt(c));
					let vm = [];

					for (let i = 0; i < 7; i++) {
						vm.push(rows.map((j, ix) => (j + cols[i] + tbl[ix][i]) % 7));
					}

					module.violetMod = vm;
					return true;
				}
			},
			{
				regex: /^Starting at \(\d, \d\) in direction .+\.$/,
				handler: function (_, module) {
					module.table.find("td, th").css("padding", "6px");
					module.push({ obj: module.table, nobullet: true });
					if (module.violetMod) {
						module.push("Modified table (violet):");
						module.push({
							obj: $(`<table>${module.violetMod.map(a => `<tr>${a.map(i => `<td style="border: black solid 2px; padding: 2px 6px 2px 6px;">${i}</td>`).join("")}</tr>`).join("")}</table>`),
							nobullet: true
						});
					}
					return false;
				}
			},
			{
				regex: /The calculated sequence is [ip]+, which translates to ([\[\]∙]+)\./,
				handler: function (matches, module) {
					module.push(matches[0]);
					let dotssvg = `<circle cx='0' cy='0' r='.25' fill='black' stroke='none' />`;
					let linessvg = "";
					let line = "";
					let pos = 0.5;
					let working = matches[1];
					const eps = 0.0001
					while (working.length > 0) {
						switch (working[0]) {
							case "[":
								line += `M${pos} .25v.5`
								break;
							case "∙":
								dotssvg += `<circle cx='${pos + 0.5}' cy='0' r='.25' fill='black' stroke='none' />`;
								pos += 1;
								break;
							case "]":
								linessvg += `<path d='${line}H${pos + eps}v-.5' fill='none' stroke='black' stroke-width='0.15' stroke-linecap="square" />`
								line = "";
								if (working[1] !== "∙")
									pos += 0.25
								break;
						}
						working = working.substring(1);
					}
					dotssvg += `<circle cx='${pos + .25}' cy='0' r='.25' fill='black' stroke='none' />`;

					module.push({
						nobullet: true,
						obj: $SVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${pos + 2} 2">${dotssvg}${linessvg}</svg>`)
					});
					return true;
				}
			},
			{
				regex: /You submitted ([\[\]∙]+), but I expected [\[\]∙]+\./,
				handler: function (matches, module) {
					module.push(matches[0]);
					let dotssvg = `<circle cx='0' cy='0' r='.25' fill='#800' stroke='none' />`;
					let linessvg = "";
					let line = "";
					let pos = 0.5;
					let working = matches[1];
					const eps = 0.0001
					while (working.length > 0) {
						switch (working[0]) {
							case "[":
								line += `M${pos} .25v.5`
								break;
							case "∙":
								dotssvg += `<circle cx='${pos + 0.5}' cy='0' r='.25' fill='#800' stroke='none' />`;
								pos += 1;
								break;
							case "]":
								linessvg += `<path d='${line}H${pos + eps}v-.5' fill='none' stroke='#800' stroke-width='0.15' stroke-linecap="square" />`
								line = "";
								if (working[1] !== "∙")
									pos += 0.25
								break;
						}
						working = working.substring(1);
					}
					dotssvg += `<circle cx='${pos + .25}' cy='0' r='.25' fill='#800' stroke='none' />`;

					module.push({
						nobullet: true,
						obj: $SVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${pos + 2} 2">${dotssvg}${linessvg}</svg>`)
					});
					return true;
				}
			},
			{
				regex: /Logging can be found at 'Kugelblitz #(\d+)'./,
				handler: function (matches, module) {
					let callback = () => {
						$("div").filter((_, d) => d.innerText == `Kugelblitz #${matches[1]}`).parent().click();
						return false;
					};
					module.push({ obj: $(`<p>Logging can be found at <a href=''>Kugelblitz #${matches[1]}</a>.</p>`).find("a").click(callback).end() });
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
		moduleID: 'latinHypercube',
		loggingTag: 'Latin Hypercube',
		matches: [ 
			{
				regex: /The given shapes are:|Solution:/,
				handler: function(matches, module){
					
					const paths = { 
						'T':'M0 10 0-30 34.6 30 0 10 34.6 30-34.6 30 0 10 0-30-34.6 30M0 10 0-30 34.6 30 0 10 34.6 30-34.6 30 0 10 0-30-34.6 30',
						'H':'M0-2.2 37.6-21 0-39.8-37.6-21 0-2.2 0 39.8 37.6 21 37.6-21M-37.6-21-37.6 21 0 39.8 0-2.2 0-2.2',
						'O':'M0 40 40 0 0-40-40 0zV-40M-40 0h80',
						'D':'M0-26.7 25.3-8.3 15.7 21.6-15.7 21.6-25.3-8.3ZM15.7 21.6 23.5 32.4 38 12.4 37.3-12 25.3-8.3ZM-15.7 21.6-23.5 32.4 0 40 23.5 32.4 15.7 21.6M-23.5 32.4-38 12.4-37.3-12-25.3-8.3-15.7 21.6M0-26.7 0-40-23.5-32.4-37.3-12-25.3-8.3M0-40 23.5-32.4 37.3-12 25.3-8.3 0-26.7'
					};
					const fills = { 'T':'#FF0000', 'H':'#FF5800', 'O':'#FF9E00', 'D':'#FFFF00' };
					const arrowHead = 'M-30 30 0 0 30 30 0 0';
					
					let svg = "<svg viewbox='-225 -225 2100 2100' style='display: block; width: 6.5in; margin: 0.25cm auto'>";
					svg += "<rect x='-50' y='-50' width='1925' height='1925' fill='#222' rx='50' ry='50'/>";
					
					let grid = readTaggedLines(19).map(l => l.replace(/ /g, '').split('')
												 ).filter(l => l.length > 0);
					for (let w = 0; w < 4; w++) {
						for (let z = 0; z < 4; z++) {
							for (let y = 0; y < 4; y++) {
								for (let x = 0; x < 4; x++) {
									let xPosition = 475 * y + 100 * x;
									let yPosition = 475 * w + 100 * z;
									svg += `<rect x='${xPosition}' y='${yPosition}' width='100' height='100' fill='none' stroke='#47E9D4' stroke-width='15'/>`;
									let shape = grid[4 * w + z][4 * y + x];
									if (shape != '#')
										svg += `<path transform='translate(${xPosition + 50}, ${yPosition + 50}) scale(0.8)' d='${paths[shape]}' 
													fill='${fills[shape]}' stroke='#FFF' stroke-width='5' stroke-linejoin='round'/>`;
								}
							}
						}
					}
					svg += `<line x1='35' x2='400' y1='-100' y2='-100' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(400, -100) rotate(90)'/>
							<text x='0' y='-100' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>X</text>
							
							<line x1='45' x2='1825' y1='-175' y2='-175' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(1825, -175) rotate(90)'/>
							<text x='0' y='-175' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>Y</text>
							
							<line x1='-100' x2='-100' y1='45' y2='400' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(-100, 400) rotate(180)'/>
							<text x='-100' y='0' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>Z</text>
							
							<line x1='-175' x2='-175' y1='45' y2='1825' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(-175, 1825) rotate(180)'/>
							<text x='-175' y='0' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>W</text>`;
					module.push({ label:matches[0], obj:svg + '</svg>' });
				}
			},
			{
				regex: /Placed|does not belong/
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
					const board = readLines(8);
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
		moduleID: "levenshteinDistance",
		loggingTag: "Levenshtein Distance",
		matches: [
			{
				regex: /The matrix for words (\w+) and (\w+):/,
				handler: function (matches, module) {
					let rowCount = 2 * matches[1].length + 5;
					const grid = readTaggedLines(rowCount);
					let rows = [ ];
					for (let ix = 3; ix < rowCount; ix += 2) {
						let row = grid[ix].split('|').map(x => parseInt(x)).filter(x => !isNaN(x));
						console.log(row);
						rows.push(row);
					}
					let table = "<table class='levenshtein'> <tr> <td class='empty'></td> <td class='empty'></td>";
					for (let ch of matches[2]) 
						table += `<th>${ch}</th>`;
					table += "</tr> <tr> <td class='empty'></td>";
					for (let num of rows[0])
						table += `<td>${num}</td>`;
					table += "</tr>";
					for (let row = 1; row < rows.length; row++) {
						table += `<tr> <th>${matches[1][row - 1]}</th>`;
						for (let num of rows[row])
							table += `<td>${num}</td>`;
						table += "</tr>";
					}
					module.push({ label:matches.input, obj:table });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "LightBulbs",
		loggingTag: "Light Bulbs",
		matches: [
			{
				regex: /Table for Ruleseed Number/,
				handler: function (match, module) {
					const data = readTaggedLines(8).map(l => l.split(', '));
					readLine();
					const order = [ 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Cyan', 'Magenta' ];
					let table = "<table class='light-bulbs'> <tr> <th class='corner'></th>";
					for (let i = 0; i < 8; i++) 
						table += `<th>${order[i]}</th>`;
					table += '</tr>';
					for (let row = 0; row < 8; row++) {
						table += `<tr> <th>${order[row]}</th>`;
						for (let col = 0; col < 8; col++)
							table += `<td>${data[row][col]}</td>`;
						table += "</tr>";
					}
					module.push([ match.input, [{ obj: table + '</table>', nobullet: true }] ]);
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
		moduleID: "linesOfCode",
		loggingTag: "Lines of Code",
		matches: [
			{
				regex: /The code: '(.+)'/,
				handler: function(matches, module) {
					let code = matches[1].replace(/; /g, ';\n')
						.replace(' if', '\nif')
						.replace("{   Pass();\n} else {   Strike();\n}", "{\n  Pass();\n} else {\n  Strike();\n}");
					module.push({ label:"The code:", obj: pre(code) });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "matchem",
		loggingTag: "Match 'em",
		matches: [ 
			{
				regex: /The initial configuration of cards is:/,
				handler: function(_, module) {
					module.cardBacks = { 'R':'#F00', 'O':'#F80', 'Y':'#F8FF00', 'L':'#8F0', 'F':'#082', 'B':'#00F', 'C':'#0FF', 'V':'#80C', 'P':'#E0E', 'W':'#FFF'};
					module.textColors = { 'R':'#C00','O':'#D60', 'Y':'#C8CC00', 'L':'#4C0', 'F':'#040', 'B':'#009', 'C':'#0CC', 'V':'#408', 'P':'#B0B', 'W':'#CCC' };
					module.invert = [ 'B', 'F', 'V' ];
					module.grid = [ ];
					
					const config = readTaggedLines(5).map(l => l.split(' '));
					for (let row = 0; row < 5; row++) {
						module.grid.push( [ ] );
						for (let col = 0; col < 5; col++) {
							const cell = config[row][col];
							module.grid[row].push( { color: cell[0], suit: cell[1] } );
						}
					}
					
					module.makeSvg = function (grid) {
						let svg = `<svg style='display: block; width: 3in' viewbox='-5 -5 130 180'> 
						<rect x='-5' y='-5' width='130' height='180' fill='#4C4' rx='5' ry='5'/>`;
					
						for (let row = 0; row < 5; row++) {
							for (let col = 0; col < 5; col++) {
								const cell = grid[row][col];
								
								let group = `<g transform='translate(${25 * col} ${35 * row	})'>`;
								const fill = module.cardBacks[cell.color];
								const inner = module.textColors[cell.color];
								group += `<rect width='20' height='30' fill='${fill}' stroke='#000' stroke-width='1.5'/>
										<text x='10' y='12' style='font-size: 24px' fill='${inner}' stroke='#000' stroke-width='0.5' text-anchor='middle' dominant-baseline='central'>${cell.suit}</text>
										<text x='5' y='25' style='font-size: 9px' fill='${module.invert.includes(cell.color) ? '#FFF' : '#000'}' text-anchor='middle' dominant-baseline='central'>${cell.color}</text>`;
								svg += group + '</g>';
							}
						}
						return svg + '</svg>';
					};
					
					module.push({ label: "The initial configuration of cards is:", obj:module.makeSvg(module.grid), nobullet: true});
					return true;
				}
			},
			{
				regex: /The final configuration of cards is:/,
				handler: function (_, module){ 
					module.push({ label: "The final configuration of cards is:", obj:module.makeSvg(module.grid) });
					linen += 5;
					return true;
				}
			},
			{
				regex: /Move \d: (.+)/,
				handler: function (matches, module) {
					
					const cmd = matches[1];
					const swapMatch = cmd.match(/Swap (rows|columns) (\d) and (\d)/);
					const shiftMatch = cmd.match(/Shift (row|column) (\d) one space (\w+)/);
					const cycleMatch = cmd.match(/Cycle card (\d+) (anti)?clockwise/);
					const swapTwoMatch = cmd.match(/Swap cards (\d+) and (\d+)/);
					if (swapMatch) { 
						let store = [ ];
						let s1 = swapMatch[2] - '1';
						let s2 = swapMatch[3] - '1';
						for (let ix = 0; ix < 5; ix++) {
							if (swapMatch[1] == 'rows') {
								store.push(module.grid[s1][ix]);
								module.grid[s1][ix] = module.grid[s2][ix];
							}
							else {
								store.push(module.grid[ix][s1]);
								module.grid[ix][s1] = module.grid[ix][s2];
							}
						}
						for (let ix = 0; ix < 5; ix++) {
							if (swapMatch[1] == 'rows')
								module.grid[s2][ix] = store[ix];
							else module.grid[ix][s2] = store[ix];
						}
					}		
					else if (shiftMatch) {
						const digit = shiftMatch[2] - '1';
						const row = shiftMatch[1] == 'row'
						let section = [ ];
						for (let i = 0; i < 5; i++) {
							if (row) 
								section.push(module.grid[digit][i]);
							else section.push(module.grid[i][digit]);
						}
						const adder = shiftMatch[3] == 'up' || shiftMatch[3] == 'left' ? 1 : 4;
						for (let i = 0; i < 5; i++) {
							if (row)
								module.grid[digit][i] = section[(i + adder) % 5];
							else module.grid[i][digit] = section[(i + adder) % 5];
						}
					}
					else if (cycleMatch) {
						const root = { x: (cycleMatch[1] - '1') % 5, y: Math.floor((cycleMatch[1] - '1') / 5) };
						const x = root.x;
						const y = root.y;
						const order = cycleMatch[2] ? 
									[ root, { x: y, y: 4 - x }, { x: 4 - x, y: 4 - y }, { x: 4 - y, y: x } ] :
									[ root, { x: 4 - y, y: x }, { x: 4 - x, y: 4 - y }, { x: y, y: 4 - x } ];
						let store = [ ];
						for (let i = 0; i < 4; i++)
							store.push(module.grid[order[i].y][order[i].x]);
						for (let i = 0; i < 4; i++) 
							module.grid[order[(i + 1) % 4].y][order[(i + 1) % 4].x] = store[i];
					}
					else if (swapTwoMatch) {
						let a = { x: (swapTwoMatch[1] - '1') % 5, y: Math.floor((swapTwoMatch[1] - '1') / 5) };
						let b = { x: (swapTwoMatch[2] - '1') % 5, y: Math.floor((swapTwoMatch[2] - '1') / 5) };
						let temp = module.grid[b.y][b.x];
						module.grid[b.y][b.x] = module.grid[a.y][a.x];
						module.grid[a.y][a.x] = temp;
					}
					
					module.push([ matches[0], [ {obj: module.makeSvg(module.grid) } ] ]);
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: 'matchematics',
		loggingTag: 'Matchematics',
		matches: [
			{
				regex: /(Equation|Possible answer|Submitting):/,
				handler: function (matches, module) {
					const m = readLine().match(/([01]{7}) ([-+*%/]) ([01]{7}) = ([01]{7})/);
					const seqs = [ m[1], m[3], m[4] ];
					const tfs = [  '7.5, 30', '14, 22.5',  '0, 22.5',  '7.5, 15',  '14, 7.5',  '0, 7.5',  '7.5, 0' ];
					const verts = [ 1, 2, 4, 5 ];
					const matchObj = "<rect x='-4' y='-.375' width='8' height='0.75' fill='#FE9'/> <rect x='-4.5' y='-0.75' width='2' height='1.5' fill='#D33' rx='1' ry='0.5'/>";
					
					let svg = `<svg viewbox='-4 -3 80 36' style='display: block; width: 3.5in;'>
								<rect x='-4' y='-3' width='70' height='36' fill='#000' rx='2' ry='2'/>`;
					for (let i = 0; i < 3; i++) {
						let g = `<g transform='translate(${24 * i}, 0)'>`;
						for (let stick = 0; stick < 7; stick++) {
							if (seqs[i][stick] == '1') {
								let tf = `translate(${tfs[stick]})`;
								if (verts.includes(stick))
									tf += ' rotate(90)'
								g += `<g transform='${tf}'>${matchObj}</g>`;
							}
						}
						svg += g + '</g>';
					}
					svg += `<text x='19' y='15' style='font-size: 7px' font-weight='bold' fill='#FFF' text-anchor='middle' dominant-baseline='central'>${m[2]}</text>`
					svg += `<text x='43' y='14.5' style='font-size: 8px' font-weight='bold' fill='#FFF' text-anchor='middle' dominant-baseline='central'>=</text>`
					module.push({ label:matches[0], obj:svg + '</svg>' });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "MatchingSigns",
		loggingTag: "Matching Signs",
		matches: [
			{
				regex: /(\w+) -> (\w+)/,
				handler: function (matches, module) {
					let a = `<img style='display: inline-block; width: 1.5cm' src='../HTML/img/Astrological/${matches[1]}.png'/>`;
					let b = `<img style='display: inline-block; width: 1.5cm' src='../HTML/img/Astrological/${matches[2]}.png'/>`;
					let style = '<style>.dark-mode .msigns img { filter: invert(87%) }</style>';
					module.push({obj: `${style} <span class='msigns' style='display: flex; align-items: center; font-size: 36px'>${a} → ${b}</span>` });
				}
			}
		]
	},
	{
		moduleID: "mathem",
		loggingTag: "Math 'em",
		matches: [ 
			{
				regex: /The arrangement of the tiles is:/,
				handler: function (_, module) {
					module.cardBacks = { 'W':'#FFFFFF', 'S':'#AFAFAF', 'G':'#E6C832', 'B':'#C89632' };
					module.grid = [ ];
					const nameReplace = { '+':'Plus', '-':'Diff', '^':'Xor', '/':'Mod' };
					
					const config = readTaggedLines(4).map(l => l.split(' '));
					for (let row = 0; row < 4; row++) {
						module.grid.push( [ ] );
						for (let col = 0; col < 4; col++) {
							const cell = config[row][col];
							const suit = nameReplace[cell[1]] ?? cell[1];
							module.grid[row].push( { color: cell[0], suit: suit, ch: cell[1] } );
						}
					}
					
					module.makeSvg = function (grid) {
						let svg = `<svg style='display: block; width: 3in' viewbox='-5 -5 105 130'> 
						<rect x='-5' y='-5' width='105' height='130' fill='#458' rx='5' ry='5'/>`;
						
						for (let row = 0; row < 4; row++) {
							for (let col = 0; col < 4; col++) {
								const cell = grid[row][col];
								
								let group = `<g transform='translate(${25 * col} ${30 * row	})'>`;
								const fill = module.cardBacks[cell.color];
								group += `<image href='../HTML/img/Math em/${cell.suit}.svg' width='20' height='30' style='background-color: ${fill}'	/>
										<rect width='20' height='25' y='2.5' fill='${fill}AA' stroke='#223' stroke-width='1.5'/>
										<text x='4.5' y='23.5' style='font-size: 8px' fill='#000' text-anchor='middle' dominant-baseline='central'>${cell.color}</text>
										<text x='15.5' y='7.5' style='font-size: 8px' fill='#000' text-anchor='middle' dominant-baseline='central'>${cell.ch}</text>`;
								svg += group + '</g>';
							}
						}
						return svg + '</svg>';
					};
					
					module.push({ label: "The arrangement of tiles is:", obj:module.makeSvg(module.grid), nobullet:true });
					return true;
				}
			},
			{
				regex: /Swap (rows|columns) (\d) and (\d)/,
				handler: function (matches, module) {
					let store = [ ];
					let s1 = matches[2] - '1';
					let s2 = matches[3] - '1';
					for (let ix = 0; ix < 4; ix++) {
						if (matches[1] == 'rows') {
							store.push(module.grid[s1][ix]);
							module.grid[s1][ix] = module.grid[s2][ix];
						}
						else {
							store.push(module.grid[ix][s1]);
							module.grid[ix][s1] = module.grid[ix][s2];
						}
					}
					for (let ix = 0; ix < 4; ix++) {
						if (matches[1] == 'rows')
							module.grid[s2][ix] = store[ix];
						else module.grid[ix][s2] = store[ix];
					}
					module.push([ matches[0], [ {obj: module.makeSvg(module.grid) } ] ]);
					return true;
				}
			},
			{
				regex: /Shift (row|column) (\d) (\w+)/,
				handler: function (matches, module) {
					const digit = matches[2] - '1';
					const row = matches[1] == 'row'
					let section = [ ];
					for (let i = 0; i < 4; i++) {
						if (row) 
							section.push(module.grid[digit][i]);
						else section.push(module.grid[i][digit]);
					}
					const adder = matches[3] == 'up' || matches[3] == 'left' ? 1 : 3;
					for (let i = 0; i < 4; i++) {
						if (row)
							module.grid[digit][i] = section[(i + adder) % 4];
						else module.grid[i][digit] = section[(i + adder) % 4];
					}
					module.push([ matches[0], [ {obj: module.makeSvg(module.grid) } ] ]);
					return true;
				}
			},
			{
				regex: /Cycle tiles ([A-D][1-4]) . ([A-D][1-4]) . ([A-D][1-4]) . ([A-D][1-4])/,
				handler: function (matches, module) {
					
					let order = [ ];
					let store = [ ];
					for (let i = 0; i < 4; i++) {
						order.push( { x: "ABCD".indexOf(matches[i + 1][0]), y: matches[i + 1][1] - '1' } );
						store.push(module.grid[order[i].y][order[i].x]);
					}
					for (let i = 0; i < 4; i++) 
						module.grid[order[(i + 1) % 4].y][order[(i + 1) % 4].x] = store[i];
					
					module.push([ matches[0], [ {obj: module.makeSvg(module.grid) } ] ]);
					return true;
				}
			},
			{
				regex: /.+/
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
				handler: function (matches, module) {;
					module.push({ label: "Solution:", obj: pre(readTaggedLines(15).join('\n')) });
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
		moduleID: ["MahjongQuizEasy", "MahjongQuizHard", "MahjongQuizScrambled"],
		loggingTag: ["Mahjong Quiz Easy", "Mahjong Quiz Hard", "Mahjong Quiz Scrambled"],
		matches: [
			{
				regex: /(Given hand:|Scrambled hand:|Solution:|Strike! Answer submitted:|Solved! Answer submitted:) ((\d[mpsz] ?)+).*$/,
				handler: function (matches, module) {
					const fileNames = {
						"1m": "Char 1", "2m": "Char 2", "3m": "Char 3", "4m": "Char 4", "5m": "Char 5", "6m": "Char 6", "7m": "Char 7", "8m": "Char 8", "9m": "Char 9",
						"1p": "Wheel 1", "2p": "Wheel 2", "3p": "Wheel 3", "4p": "Wheel 4", "5p": "Wheel 5", "6p": "Wheel 6", "7p": "Wheel 7", "8p": "Wheel 8", "9p": "Wheel 9",
						"1s": "Bamboo 1", "2s": "Bamboo 2", "3s": "Bamboo 3", "4s": "Bamboo 4", "5s": "Bamboo 5", "6s": "Bamboo 6", "7s": "Bamboo 7", "8s": "Bamboo 8", "9s": "Bamboo 9",
						"1z": "East", "2z": "South", "3z": "West", "4z": "North", "5z": "White Dragon", "6z": "Green Dragon", "7z": "Red Dragon"
					}
					const tiles = matches[2].trim().split(' ');
					let div = $('<div>');
					tiles.forEach(tile => {
						div.append(`<img src='../HTML/img/Mahjong/${fileNames[tile]}.png' height='30' style='border: 1px solid; border-radius: 15%;' />`);
					});
					module.push({ label: matches[1], obj: div });
				}
			},
			{
				regex: /(Solution:|Strike! Answer submitted:|Solved! Answer submitted:) ?$/,
				handler: function (matches, module) {
					module.push(matches[0] + ' No tiles');
				}
			},
			{
				regex: /(Explanation:) (.*)$/,
				handler: function (matches, module) {
					const fileNames = {
						"1m": "Char 1", "2m": "Char 2", "3m": "Char 3", "4m": "Char 4", "5m": "Char 5", "6m": "Char 6", "7m": "Char 7", "8m": "Char 8", "9m": "Char 9",
						"1p": "Wheel 1", "2p": "Wheel 2", "3p": "Wheel 3", "4p": "Wheel 4", "5p": "Wheel 5", "6p": "Wheel 6", "7p": "Wheel 7", "8p": "Wheel 8", "9p": "Wheel 9",
						"1s": "Bamboo 1", "2s": "Bamboo 2", "3s": "Bamboo 3", "4s": "Bamboo 4", "5s": "Bamboo 5", "6s": "Bamboo 6", "7s": "Bamboo 7", "8s": "Bamboo 8", "9s": "Bamboo 9",
						"1z": "East", "2z": "South", "3z": "West", "4z": "North", "5z": "White Dragon", "6z": "Green Dragon", "7z": "Red Dragon"
					}
					let div = $(`<div style='display: flex;'>`);
					const tileStrings = matches[2].replace(/\s/g, "").split("|").filter(x => x != "");
					for (var i = 0; i < tileStrings.length; i++) {
						const tiles = tileStrings[i].match(/.{2}/g);
						if (i == 0) {
							div.append(`<img src='../HTML/img/Mahjong/${fileNames[tiles[0]]}.png' height='30' style='border: 1px solid; border-radius: 15%;' />`);
							div.append(`<span style='padding-top: 4px;'>-><span>`);
						} else {
							for (var j = 0; j < tiles.length; j++) {
								if (j == tiles.length - 1) {
									div.append(`<img src='../HTML/img/Mahjong/${fileNames[tiles[j]]}.png' height='30' style='border: 1px solid; border-radius: 15%; margin-right: 15px;' />`);
								} else {
									div.append(`<img src='../HTML/img/Mahjong/${fileNames[tiles[j]]}.png' height='30' style='border: 1px solid; border-radius: 15%;' />`);
								}
							}
						}
					}
					module.push({ label: matches[1], obj: div });
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
					var board = readTaggedLines(8).join('\n');
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
        moduleID: "matrixMapping",
		loggingTag: "Matrix Mapping",
        matches: [
            {
                regex: /The chosen colour sets are: (.+)\./,
                handler: function(matches, module) {
                    let colourData = matches[1];
                    let colours = colourData.split("}, {");
                    for(let i = 0; i < colours.length; i++) {
                        colours[i] = colours[i].replace(/[{}]/, "").toLowerCase().split("), ");
                        for(let j = 0; j < colours[i].length - 1; j++) {
                            colours[i][j] += ")";
                        }
                    }
                    module.Colours = colours;
					return true;
                }
            },
            {
                regex: /The grids are: (.+)\./,
                handler: function(matches, module) {
                    let puzzleData = matches[1].split(", ");
                    for(let i = 0; i < puzzleData.length; i++) {
                        puzzleData[i] = puzzleData[i].split("/");
                    }

					module.convertedModuleColours = [[], []];
					for(let i = 0; i < module.Colours.length; i++) {
						for(let j = 0; j < module.Colours[i].length; j++) {
							let split = module.Colours[i][j].split(", ");
							let regex = /\d.\d{3}/;
							r = Math.floor(parseFloat(split[0].match(regex)) * 255);
							g = Math.floor(parseFloat(split[1].match(regex)) * 255);
							b = Math.floor(parseFloat(split[2].match(regex)) * 255);
							module.convertedModuleColours[i].push(`rgb(${r}, ${g}, ${b})`);
						}
					}
                    
                    let svg = `<svg width="630" height="320" viewbox="-30 135 600 100">`;

					for(let i = 0; i < puzzleData.length; i++) {
						for(let j = 0; j < puzzleData[i].length; j++) {
							for(let k = 0; k < puzzleData[i][j].length; k++) {
								svg += `<rect transform="rotate(45)" x="${300 * i + 95 * (1 - i) + 30 * k + 37}" y="${30 * j + 37 - 285 * i - 80 * (1 - i)}" width="30" height="30" style="fill:${module.convertedModuleColours[i][parseInt(puzzleData[i][j][k]) - 1]};stroke:#202020;stroke-width:6" />`
							}
						}
					}
					module.push({label: "The grids shown on the module: ", obj: svg});
					return true;
                }
            },
			{
				regex: /The calculated matrix is: (.+)\./,
				handler: function(matches, module) {
					let solutionData = matches[1].split("/");
					let solutionColours = ["rgb(191, 191, 191)", "rgb(63, 63, 63)", "rgb(176, 11, 30)"];

					let svg = `<svg width="600" height="300" viewbox="0 0 200 200">`;

					for(let i = 0; i < solutionData.length + 1; i++) {
						if(i == 0) {
							let rect = `<rect x="30" y="30" width="27" height="27" style="fill:#222;stroke:#202020;stroke-width:4"/>`;
							for(let j = 0; j < solutionData.length; j++) {
								rect += `<rect x="${60 + 30 * j}" y="30" width="27" height="27" style="fill:${module.convertedModuleColours[1][j]};stroke:#202020;stroke-width:4" />`
							}
							svg += rect
						} else {
							let rect = ``;
							for(let j = 0; j < solutionData.length; j++) {
								for(let k = 0; k < solutionData.length + 1; k++) {
									if(k == 0) {
										rect += `<rect x="30" y="${60 + 30 * j}" width="27" height="27" style="fill:${module.convertedModuleColours[0][j]};stroke:#222;stroke-width:4" />`;
									} else {
										rect += `<rect x="${30 + 30 * k}" y="${30 + 30 * (j + 1)}" width="27" height="27" style="fill:${solutionColours["10-".indexOf(solutionData[j][k - 1])]};stroke:#202020;stroke-width:4" />`
									}
									if(solutionData[j][k - 1] == "-") {
										rect += `<path fill="none" stroke="#222" stroke-width="4" d="M ${30 + 30 * k},${30 + 30 * (j + 1)} ${30 + 30 * k + 27},${30 + 30 * (j + 1) + 27} M ${30 + 30 * k + 27},${30 + 30 * (j + 1)} ${30 + 30 * k},${30 + 30 * (j + 1) + 27}" />`
									}
								}
							}
							svg += rect
						}
					}
					module.push({label: "The solution: ", obj: svg});
					module.push({label: "Further logging on this module in the form of x-y is in row-column format with respect to the solution table, 1-indexed."})
					return true;
				}
			},
			{
				regex: /.+/
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
		displayName: "Mazematics",
		moduleID: "mazematics",
		loggingTag: "Mazematics",
		matches: [
			{
				regex: /([A-Z][a-z]+) = (\d)/,
				handler: function (matches, module) {
					if (module[1] && module[1].includes(matches[1])) //start again. issue: 63b36c5ee42dc68938df17881421ec98bc6896e5 (LFA file id)
					{
						module.Counter = null;
						module.ShapeNumbers = null;
						module.push("-------------------------------------");
					}
					/*
					const regex = /[A-Z][a-z]+/;
					console.log(module[1].includes(matches[1]));*/
					if (typeof module.Counter !== "number") {
						module.push(null);
						module.Counter = 0;
					} else module.Counter++;
					module.push(this.names[module.Counter] + ": " + matches[2]);
					(module.ShapeNumbers ??= [])[this.order[module.Counter]] = matches[2];
					return true;
				},
				names: ["Circle", "Square", "Mountain", "Triangle", "Diamond", "Hexagon", "Star", "Heart"],
				order: [0, 5, 7, 2, 1, 4, 6, 3]
			},
			{
				regex: /STRIKE!/,
				handler: function (_, module) {
					module.Struck = true;
				}
			},
			{
				regex: /Attempted/,
				handler: function (_, module) {
					module.Rule49 = true;
				}
			},
			{
				regex: /BEGIN|MODULE RESET/,
				handler: function (_, module) {
					(module.CoordsGroups ??= []).push([]);
					(module.Strikes ??= []).push([]);
					module.Attempts = ++module.Attempts | 0; //equiv. to (var ??= 0)++ except it works
					module.IsContinuing = false;
					module.Section = [];
					return true;
				}
			},
			{
				regex: /SOLVED!/,
				handler: function (matches, module) {
					module.Solved = true;
					module.JSON["solved"] = module.Solved;
					const style = "font-size:large;font-style:italic;border:3px dashed gold;padding:5px;margin:100px;border-radius:10px";
					module[0] = { label: `<a style="${style}" href='../HTML/Mazematics interactive (MásQuéÉlite).html#${JSON.stringify(module.JSON)}'>View the solution interactively</a>`, nobullet: true };
					module.push(matches.input);
					return true;
				}
			},
			{
				regex: /([A-Z][0-9])[^,]+(-?\d)/,
				handler: function (matches, module) {
					if (!module.IsContinuing) {
						module.push([["ATTEMPT " + (module.Attempts + 1)], []]);
						module.IsContinuing = true;
					}
					let correctLine = matches.input;
					const currentStrikes = module.Strikes[module.Strikes.length - 1];
					if (module.Rule49) {
						currentStrikes.push(matches[1][0] + module.CurrentRow);
						[module.Struck, module.Rule49] = [false, false];
					}
					else {
						const currentMoves = module.CoordsGroups[module.CoordsGroups.length - 1];
						if (!currentMoves.length) {
							currentMoves.push(matches[1]);
							module.CurrentRow = +matches[1][1];
						}
						else {
							const goodCoordinate = this.fixCoordinate(currentMoves, arguments, this.shapes, this.shapesSign);
							currentMoves.push(goodCoordinate);
							correctLine = matches.input.replace(matches[1], goodCoordinate);
							if (module.Struck) { currentStrikes.push(goodCoordinate); module.Struck = false; }
						}
					}
					module.Section.push(correctLine);
					return true;
				},
				//I shouldn't be making this function but whatever.
				//fixes a bug the module has when displaying which coordinates have been visites: it doesn't show them properly
				fixCoordinate: (cm, hArgs, s, ss) => {
					const [matches, module] = hArgs
						, [curr, next] = [cm[cm.length - 1], matches[1]];
					if (curr[0] === next[0]) {
						const letters = "ABCDEFGH"
							, toNumber = l => letters.search(l)
							, toCoordsFixed = c => [module.CurrentRow - 1, toNumber(c[0])] //<a, b>
							, maintainInRange = n => (n + 8) % 8 //ensures n € [0,7], n € Z
							, getValueOfPossibleCells = c => {
								const indexUp = maintainInRange(c[0] - 1) * 8 + c[1]
									, indexDown = maintainInRange(c[0] + 1) * 8 + c[1];
								return [ss[indexUp] + module.ShapeNumbers[s[indexUp]],
								ss[indexDown] + module.ShapeNumbers[s[indexDown]]];
							}
							, clue = matches[2]
							, dir = getValueOfPossibleCells(toCoordsFixed(curr)).map(possibility => possibility.includes(clue));
						module.CurrentRow = maintainInRange(module.CurrentRow - 1 + Math.ceil(Math.tan(dir[1]) - 1)) + 1;
					}
					return `${next[0]}${module.CurrentRow}`;
				},
				shapes: [
					4, 6, 2, 5, 0, 1, 7, 3,
					7, 3, 1, 0, 2, 5, 4, 6,
					6, 7, 5, 2, 1, 0, 3, 4,
					3, 4, 0, 1, 6, 2, 5, 7,
					2, 5, 6, 3, 7, 4, 1, 0,
					1, 0, 4, 7, 3, 6, 2, 5,
					0, 1, 3, 4, 5, 7, 6, 2,
					5, 2, 7, 6, 4, 3, 0, 1],
				shapesSign: [
					'+', '+', '-', '-', '+', '+', '-', '-',
					'-', '+', '-', '-', '+', '+', '-', '+',
					'+', '-', '+', '+', '-', '-', '+', '-',
					'+', '-', '-', '+', '-', '+', '+', '-',
					'-', '+', '+', '-', '+', '-', '-', '+',
					'-', '+', '-', '+', '-', '-', '+', '+',
					'+', '-', '+', '+', '-', '+', '-', '-',
					'-', '-', '+', '-', '+', '-', '+', '+']
			},
			{
				regex: /.+/, //this is fairly expensive, but the module doesn't guarantee a consistent log ending.
				handler: function (matched, module) {
					if (module.Section) {
						module.Section.push(matched.input);
						module.JSON = {
							shapeNumbers: module.ShapeNumbers,
							coordsGroups: module.CoordsGroups,
							strikes: module.Strikes,
							solved: module.Solved,
							restricted: module.Restricted
						}
						const style = "font-size:large;font-style:italic;border:3px dashed gold;padding:5px;margin:100px;border-radius:10px";
						module[0] = { label: `<a style="${style}" href='../HTML/Mazematics interactive (MásQuéÉlite).html#${JSON.stringify(module.JSON)}'>View the solution interactively</a>`, nobullet: true };
						module[module.length - 1][1] = module.Section;
					} else {
						if (!module.Restricted && matched.input.includes("Restricted"))
							module.Restricted = this.detectRestriction(matched.input);
						module.push(matched.input);
					}
				},
				detectRestriction: line => {
					for (let i = 0; i < 4; i++)
						if (line.includes(["Triangular", "Multiples", "Primes", "Fibonacci"][i])) return i;
				}
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
		displayName: 'Mazeseeker',
		loggingTag: 'Mazeseeker',
		moduleID: 'GSMazeseeker',
		matches: [
			{
				regex: /The maze is as follows:/,
				handler: function (matches, module) {
					module.push({ label: matches.input, obj: pre(readMultiple(13)) });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: 'Mazeswapper',
		loggingTag: 'Mazeswapper',
		moduleID: 'mazeswapper',
		matches: [
			{
				regex: /The (source tile|sphere|tetrahedron|icosahedron) belongs at ([A-F][1-6])/,
				handler: function(matches, module){
					const letters = ['A','B','C','D','E','F'];
					const col = letters.indexOf(matches[2][0]);
					const row = matches[2][1] - '1';
					const cell = 6 * row + col;
					if (matches[1] == 'source tile')
						module.source = cell;
					else if (matches[1] == 'sphere')
						module.sphere = cell;
					else if (matches[1] == 'tetrahedron')
						module.tetrahedron = cell;
					else module.icosahedron = cell;
				}
			},
			{
				regex: /Solution:/,
				handler: function(_, module){
					let grid = readTaggedLines(18).map(l => l.split(' '));

					let svg = `<svg viewbox='-5 -5 670 670' style='display: block; width: 4in'>`;

					for (let row = 0; row < 6; row++){
						for (let col = 0; col < 6; col++) {
							const cell = 6 * row + col;
							const fill = module.source == cell ? '#507ADC' : '#FFF';
							let group = `<g transform='translate(${110 * col}, ${110 * row})'>`;
							group += `<rect x='0' y='0' width='100' height='100' fill='${fill}' stroke='#000' stroke-width='3'/>`;

							let shape = null;
							if (module.sphere == cell)
								shape = 'sph';
							else if (module.tetrahedron == cell)
								shape = 'tet';
							else if (module.icosahedron == cell)
								shape = 'ico';

							if (shape)
								group += `<image x='25' y='25' height='50' width='50' href='img/Mazeswapper/${shape}.svg'/>`;

							let corners = [ false, false, false, false ];

							if (grid[3 * row + 0] [3 * col + 1] == '■') {
								group += `<rect x='10' y='10' width='80' height='15'/>`; //up;
								corners[0] = true;
								corners[1] = true;
							}
							if (grid[3 * row + 1][3 * col] == '■') {
								group += `<rect x='10' y='10' width='15' height='80'/>`; //Right
								corners[1] = true;
								corners[3] = true;
							}
							if (grid[3 * row + 1][3 * col + 2] == '■') {
								group += `<rect x='75' y='10' width='15' height='80'/>`; //Left
								corners[0] = true;
								corners[2] = true;
							}
							if (grid[3 * row + 2][3 * col + 1] == '■') {
								group += `<rect x='10' y='75' width='80' height='15'/>`; //Down
								corners[2] = true;
								corners[3] = true;
							}

							if (!corners[0])
								group += `<rect x='75' y='10' width='15' height='15' fill='#000'/>`;
							if (!corners[1])
								group += `<rect x='10' y='10' width='15' height='15' fill='#000'/>`;
							if (!corners[2])
								group += `<rect x='75' y='75' width='15' height='15' fill='#000'/>`;
							if (!corners[3])
								group += `<rect x='10' y='75' width='15' height='15' fill='#000'/>`;
							group += '</g>';
							svg += group;
						}
					}

					module.push({label:'Solution:',obj:svg});
				}
			},
			{
				regex: /The display reads.+/
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
		moduleID: 'memoryPoker',
		loggingTag: 'Memory Poker',
		matches: [
			{
				regex: /The (suit|rank) table used is:/,
				handler: function (matches, module) {
					const grid = readTaggedLines(4).map(l => l.split(' '));
					const tdStyle = 'width: 0.9cm; height: 0.9cm; text-align: center; vertical-align: middle; border: 2px solid black; padding: 0;';
					
					let table = '<table>';
					for (let row = 0; row < 4; row++) {
						table += '<tr>';
						for (let col = 0; col < 4; col++) {
							let cell = grid[row][col];
							if (matches[1] == 'suit') {
								if (cell == '♦' || cell == '♥')
									table += `<td style='${tdStyle} font-size: 		24px'><span style='color: red'>${cell}</span></td>`;
								else table += `<td style='${tdStyle} font-size: 	24px'>${cell}</td>`;
							}
							else table += `<td style='${tdStyle}'>${cell}</td>`;
						}
						table += '</tr>';
					}
					module.push({ label: matches[0], obj: table });
					return true;
				}
			},
			{
				regex: /The face-up cards are:|The starting grid is:/,
				handler: function (match, module) {
					const grid = readTaggedLines(4).map(l => l.split(' '));
					let svg = `<svg viewbox='-5 -5 101 101' style='width: 2.5in; display: block;'>
							   <rect x='-5' y='-5' width='101' height='101' rx='5' ry='5' fill='#084'/>`;
					for (let row = 0; row < 4; row++) {
						for (let col = 0; col < 4; col++) {
							let g = `<g transform='translate(${24 * col}, ${24 * row})'>`;
							g += '<rect width=20 height=20 fill=#FFF rx=3 ry=3/>';
							
							const cell = grid[row][col];
							if (cell == '..'){
								g += '<rect x=1 y=1 width=18 height=18 fill=#CCC rx=2 ry=2/>'
							}
							else {
								const color = cell[1] == '♥' || cell[1] == '♦' ? '#F00' : '#000';
								g += `<text style='font-size: 12px' x='5' y='5' text-anchor='middle' dominant-baseline='central'>${cell[0]}</text>
									  <text style='font-size: 16px' x='14' y='13' text-anchor='middle' dominant-baseline='central' fill='${color}'>${cell[1]}</text>`;
							}
							svg += g + '</g>';
						}
					}
					module.push({ label:match[0], obj:svg + '</svg>' });
					return true;
				}
			},
			{
				regex: /.+/,
				handler: function (match, module) {
					module.push({ obj:match[0].replace(/([♦♥])/, "<span style='color: red'>$1</span>") });
				}
			}
		]
	},
	{
		displayName: "Mega Man 2",
		moduleID: "megaMan2",
		loggingTag: "Megaman 2"
	},
	{
		moduleID: "metapuzzle",
		loggingTag: "Metapuzzle",
		matches: [
			{
				regex: /.+/,
				handler: function (matches, module) {
					const header = /--- ([\w\s]+) ---/;
					let line = '';
					module.stuff = [ ];

					if (module.done)
						module.push(matches[0]);
					else {
						while ((line = readLine()).startsWith('[Metapuzzle #')){
							line = line.replace(/^\[Metapuzzle #\d+\] /, '');
							let match = line.match(header);
							if (match) {
								if (module.header)
									module.push( [ module.header, module.stuff ] );
								module.header = match[1];
								module.stuff = [ ];
							}
							else {
								if (module.header)
									module.stuff.push(line);
								else
									module.push(line);
							}
						}
						module.push( [ module.header, module.stuff ] );
						module.done = true;
						linen--;
					}

				}
			}
		]
	},
	{
		displayName: "Minecraft Survival",
		moduleID: "kataMinecraftSurvival",
		loggingTag: "Minecraft Survival",
		matches: [
			{
				regex: /Gathered (\d+|a|an) (.+)\.$/,
				handler: function (matches, module) {
					function cparseInt(string) {
						if (string === "a" || string === "an") {
							return 1
						}
						return parseInt(string)
					}

					if (module.prev == null) {
						module.prev = { type: "gather", material: matches[2], count: cparseInt(matches[1]) };
					}
					else if (module.prev.type === "gather" && module.prev.material === matches[2]) {
						module.prev = { type: "gather", material: matches[2], count: module.prev.count + cparseInt(matches[1]) };
					}
					else if (module.prev.type === "gather") {
						module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
						module.prev = { type: "gather", material: matches[2], count: cparseInt(matches[1]) };
					}
					else if (module.prev.type === "craft") {
						module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
						module.prev = { type: "gather", material: matches[2], count: cparseInt(matches[1]) };
					}

					return true;
				}
			},
			{
				regex: /Crafted (\d+|a|an) (.+)\.$|Crafted (Iron|Diamond) Armor\.$/,
				handler: function (matches, module) {
					function cparseInt(string) {
						if (string === "a" || string === "an") {
							return 1
						}
						return parseInt(string)
					}

					if (module.prev == null) {
						module.prev = { type: "craft", material: matches[2], count: cparseInt(matches[1]) };
					}
					else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
						module.prev = { type: "craft", material: matches[2], count: module.prev.count + cparseInt(matches[1]) };
					}
					else if (module.prev.type === "craft") {
						module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
						module.prev = { type: "craft", material: matches[2], count: cparseInt(matches[1]) };
					}
					else if (module.prev.type === "gather") {
						module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
						module.prev = { type: "craft", material: matches[2], count: cparseInt(matches[1]) };
					}
					return true;
				}
			},
			{
				regex: /The monster you are fighting is (.+) and it has (\d+) health and (\d+) damage\.$/,
				handler: function (matches, module) {
					function cparseInt(string) {
						if (string === "a" || string === "an") {
							return 1
						}
						return parseInt(string)
					}

					if (module.prev == null) {
						module.prev = { type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3]) };
					}
					else if (module.prev.type === "fight") {
						console.error("Minecraft Survival: fight started before it ended!");
						module.push($(`<span style="background-color:#ff0000">Error in LFA!</span>`));
						module.prev = { type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3]) };
					}
					else if (module.prev.type === "craft" && module.prev.material === matches[2]) {
						module.push($(`<span style="background-color: #ccccff">Crafting: ${module.prev.material}: ${module.prev.count}</span>`));
						module.prev = { type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3]) };
					}
					else if (module.prev.type === "gather") {
						module.push($(`<span style="background-color: #ccffcc">Gathering: ${module.prev.material}: ${module.prev.count}</span>`));
						module.prev = { type: "fight", enemy: matches[1], health: cparseInt(matches[2]), damage: cparseInt(matches[3]) };
					}

					return true;
				}
			},
			{
				regex: /You (attacked|have been attacked by) the (.+) for -?(\d+) damage and now ha(s|ve) (\d+) health remaining\.$/,
				handler: function (matches, module) {
					function cparseInt(string) {
						if (string === "a" || string === "an") {
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
					else if (module.prev.type === "gather") {
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
					function cparseInt(string) {
						if (string === "a" || string === "an") {
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
					else if (module.prev.type === "gather") {
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
					else if (module.prev.type === "gather") {
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
		loggingTag: "Mineswapper",
		moduleID: "mineswapper",
		matches: [
			{
				regex: /(Row|Column) (\d) has (\d) mines\./,
				handler: function(matches, module) {
					if (matches[1] == 'Row'){
						if (!module.rows)
							module.rows = [ 0, 0, 0, 0, 0, 0 ];
						module.rows[matches[2] - '1'] = matches[3] - '0';
					}
					else {
						if (!module.cols)
							module.cols = [ 0, 0, 0, 0, 0, 0 ];
						module.cols[matches[2] - '1'] = matches[3] - '0';
					}
					return true;
				}
			},
			{
				regex: /Initial state:|Particular solution:/,
				handler: function(matches, module) {
					const lines = readTaggedLines(6).map(l => l.split('|'));
					const nums = lines.map(row => row.map(cell => cell[1]));
					const mines = lines.map(row => row.map(cell => cell[0] == '*'));
					const minePath = 'm49.55 5a4.95 4.95 90 00-4.8 4.95l0 10.05a30 30 90 00-12.6 5.1l-7.05-7.05a4.95 4.95 90 00-7.05 7.05l7.05 7.2a30 30 90 00-5.1 12.45l-10.05 0a4.95 4.95 90 000 10.05l10.05 0a30 30 90 005.1 12.45l-7.05 7.05a4.95 4.95 90 007.05 7.05l7.2-7.05a30 30 90 0012.45 5.25l0 9.9a4.95 4.95 90 0010.05 0l0-9.9a30 30 90 0012.45-5.25l7.05 7.05a4.95 4.95 90 007.05-7.05l-7.05-7.05a30 30 90 005.25-12.45l9.9 0a4.95 4.95 90 000-10.05l-9.9 0a30 30 90 00-5.25-12.45l7.05-7.2a4.95 4.95 90 00-7.05-7.05l-7.05 7.05a30 30 90 00-12.45-5.1l0-10.05a4.95 4.95 90 00-5.25-4.95z';
					const arrowPath = 'M35 0H0L50 40 100 0h-35l-15 12z';
					let svg = `<svg viewbox='-5 -100 770 770' style='display: block; width: 5in'>`;
					for (let y = 0; y < 6; y++) {
						for (let x = 0; x < 6; x++) {
							let group = `<g transform='translate(${110 * x}, ${110 * y})'>`;
							group += `<rect x='0' y='0' width='100' height='100' fill='#FFF' stroke='#000' stroke-width='3'/>`;
							if (mines[y][x])
								group += `<path d='${minePath}' fill='#AAA'/>`;
							group += `<text style='font-size: 50' x='50' y='50' text-anchor='middle' dominant-baseline='central'>${nums[y][x]}</text>`;
							svg += group + '</g>';
						}

						let colGroup = `<g transform='translate(${110 * y}, -50)'>
										<path d='${arrowPath}' fill='#555'/>
										<text style='font-size: 50' x='50' y='-20' text-anchor='middle' dominant-baseline='central'>${module.cols[y]}</text>
										</g>`;
						let rowGroup = `<g transform='translate(700, ${110 * y})'>
										<path d='${arrowPath}' fill='#555' transform='rotate(90)'/>
										<text style='font-size: 50' x='20' y='50'  text-anchor='middle' dominant-baseline='central'>${module.rows[y]}</text>
										</g>`

						svg += colGroup + rowGroup;
					}

					module.push({ label:matches[0], obj:svg + '</svg>'});
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
					var table = $('<table>').css({ 'border-collapse': "collapse", "width": "10cm", "display":"block" });
					var maze = readLines(17);
					for (var i = 0; i < 8; i++) {
						var row = $('<tr>').appendTo(table);
						for (var j = 0; j < 8; j++) {
							var width = "";
							width += maze[2 * i][2 * j + 1] !== "■" ? "0px" : "5px";
							width += maze[2 * i + 1][2 * j + 2] !== "■" ? " 0px" : " 5px";
							width += maze[2 * i + 2][2 * j + 1] !== "■" ? " 0px" : " 5px";
							width += maze[2 * i + 1][2 * j] !== "■" ? " 0px" : " 5px";
							var cell = $('<td>').css({ "border": "solid black", "border-width": width, "width": "1.25cm", "padding-bottom": "12.5%" }).appendTo(row);
							var cellValue = /[IKYE]/.exec(maze[2 * i + 1][2 * j + 1]);
							if (cellValue !== null) {
								cell.css("padding-bottom", "0%");
								$('<div>').text(cellValue.input).css({ "margin": "auto", "overflow": "hidden", "text-align": "center", "font-size": "18pt", "height": "12.5%" }).appendTo(cell);
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
		moduleID: "NavyButtonModule",
		loggingTag: "The Navy Button",
		matches: [
			{
				regex: /(Puzzle (?:grid|solution):)/,
				handler: function (matches, module) {
					module.push({ label: matches[1], obj: pre(readMultiple(7)) });
					return true;
				}
			},
			{
				regex: /.+/
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
		moduleID: 'nomai',
		loggingTag: 'Nomai',
		matches: [
			{
				regex: /#0: (\w+) #1: (\w+) #2: (\w+) #3: (\w+) #4: (\w+) #5\(main\): (\w+)/,
				handler: function(matches, module) {
					module.planets = [ ];
					for (let i = 0; i < 6; i++) {
						module.planets.push(matches[i + 1]);
					}
					return true;
				}
			},
			{
				regex: /Action table:/,
				handler: function(_, module){
					readLine();
					const grid = readLines(6).map(l => l.replace(/\[Nomai #\d+\] \d /, ''));
					console.log(grid);
					const values = grid.map(r => r.substring(1, 12).split(' '));
					const fills = { 'x':'#222', '0':'#A00', '1':'#888' };
					const imgStyle = 'margin: 0; width: 1.5cm; vertical-align: top;';
					const tdStyle = 'padding: 0; width: 1.5cm; border: 0;';

					let table = `<table style='margin: 0.25cm 0.5cm'> <tr> <td style='width: 1cm; text-align: center'>from→<br>to↓</td>`;

					for (let ix = 0; ix < 6; ix++) {
						table += `<td style='padding: 0; width: 1cm'><img src='../HTML/img/Nomai/${module.planets[ix]}.png' style='${imgStyle}'/></td>`;
					}
					table += '</tr>';

					for (let row = 0; row < 6; row++){
						table += `<tr> <td style='${tdStyle}'><img src='../HTML/img/Nomai/${module.planets[row]}.png' style='${imgStyle}'/>`;
						for (let col = 0; col < 6; col++) {
							if (values[row][col] == '2'){
								table += `<td style='${tdStyle}'><img src='../HTML/img/Nomai/PurpleSpiral.png' style='${imgStyle}'></td>`;
							}
							else table += `<td style='${tdStyle} background-color: ${fills[values[row][col]]}'></td>`;
						}
						table += '</tr>';
					}
					table += '</table>';
					module.push({ label:'Action Table:', obj:table });
					module.push(['Legend:', ['Dark Gray: Not possible', 'Light Gray: Nothing', 'Red: Strike', 'Purple: Sixth Location', 'Planets are numbered from left to right starting with #0']]);
					linen++;
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: 'nonbinaryPuzzle',
		loggingTag: 'Nonbinary Puzzle',
		matches: [
			{
				regex: /The (displayed grid|solution) is as follows:/,
				handler: function(matches, module) {
					const grid = readTaggedLines(6).map(l => l.split(''));
					const colors = { 'W':'#FFFFFF', 'K':'#000000', 'Y':'#FCF434', 'P':'#9C59D1', '.':'#989898' };
					const tdStyle = 'width: 1cm; height: 1cm; text-align: center; border: 0.25mm solid black; font-size: 125%;';
					let table = '<table>';
					for (let row = 0; row < 6; row++){
						table += '<tr>';
						for (let col = 0; col < 6; col++) {
							let color = grid[row][col];
							let textColor = color == 'K' || color == 'P' ? '#FFF' : '#000';
							table += `<td style='${tdStyle} background-color: ${colors[color]}; color: ${textColor}'>${color != '.' ? color : ''}</td>`;
						}
						table += '</tr>';
					}
					table += '</table>';
					module.push({ label:matches[0], obj:table });
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
		moduleID: 'notreDameCipher',
		loggingTag: 'Notre-Dame Cipher',
		matches: [ 
			{
				regex: /(Starting|Current|Final) matrix :/i,
				handler: function(matches, module) {
					const grid = readTaggedLines(5).map(l => l.split(''));
					const tdStyle = 'width: 0.75cm; height: 0.75cm; text-align: center; vertical-align: middle; border: 2px solid black';
					let table = '<table>';
					for (let row = 0; row < 5; row++) {
						table += '<tr>';
						for (let col = 0; col < 5; col++) {
							table += `<td style='${tdStyle}'>${grid[row][col]}</td>`;
						}
						table += '</tr>';
					}
					let logMessage = { label:matches[1] + ' Matrix:', obj:table }
					if (matches[1] == 'Final') {
						module.push([ module.dropdown.title, module.dropdown.items ]);
						module.push(logMessage)
						module.dropdown = null;
					}
					else{
						if (!module.dropdown)
							module.push(logMessage);
						else {
							module.dropdown.items.push(logMessage);
						}
					}
					return true;
				}
			},
			{
				regex: /(Rosace|Vitrail|Cross) Cipher :/,
				handler: function(matches, module) {
					if (module.dropdown) {
						module.push([ module.dropdown.title, module.dropdown.items ]);
					}
					module.dropdown = { title: matches[1] + ' Cipher', items: [ ] };
					return true;
				}
			},
			{
				regex: /.+/,
				handler: function (matches, module) {
					if (module.dropdown)
						module.dropdown.items.push(matches[0]);
					else module.push(matches[0]);
				}
			}
		]
	},
	{
		moduleID: 'notCoordinates',
		loggingTag: 'Not Coordinates',
		matches: [
			{
				regex: /The displays were: (.+)/,
				handler: function(matches, module) {
					
					const cardinals = [ 'NW', 'N', 'NE', 'W', 'centre', 'E', 'SW', 'S', 'SE' ];
					const displays = matches[1].split(' | ');
					
					getCoordinate = function(str) {
						let m;
						if (m = str.match(/\[(\d),(\d)\]/)) {
							return { x: m[1] - '0', y: m[2] - '0' };
						} else if (m = str.match(/([A-Z])(\d)/)) {
							return { x: 'ABCEFGHI'.indexOf(m[1]), y: m[2] - '1' };
						} else if (m = str.match(/<(\d), (\d)>/)) {
							return { x: m[2] - '0', y: m[1] - '0' };
						} else if (m = str.match(/^(\d), (\d)/)) {
							return { x: m[2] - '1', y: m[1] - '1' };
						} else if (m = str.match(/\((\d),(\d)\)/)) {
							return { x: m[1] - '0', y: 8 - (m[2] - '0') };
						} else if (m = str.match(/([A-Z])-(\d)/)) {
							return { x: 'ABCDEFGHI'.indexOf(m[1]), y: 8 - (m[2] - '1') };
						} else if (m = str.match(/"(\d), (\d)"/)) {
							return { x: m[2] - '0', y: 8 - (m[1] - '0') };
						} else if (m = str.match(/(\d)\/(\d)/)) {
							return { x: m[2] - '1', y: 8 - (m[1] - '1') };
						} else if (m = str.match(/\[(\d+)\]/)) {
							return { x: m[1] % 9, y: Math.floor(m[1] / 9) };
						} else if (m = str.match(/(\d+)(?:st|nd|rd|th)/)) {
							return { x: (m[1] - '1') % 9, y: Math.floor((m[1] - '1') / 9) };
						} else if (m = str.match(/#(\d+)/)) {
							return { x: (m[1] - '1') % 9, y: 8 - Math.floor((m[1] - '1') / 9) };
						} else if (m = str.match(/([一二三四五六七八九十]+)/)) {
							const getValue = (ch) => '一二三四五六七八九十'.indexOf(ch) + 1;
							let num = 0;
							for (let ch of m[1]) {
								if (ch == '十' && num != 0)
									num *= 10;
								else num += getValue(ch);
							}
							num--;
							return { x: 8 - Math.floor(num / 9), y: num % 9 };
						} else if (m = str.match(/(\d) (\w+), (\d) (\w+)/)) {
							return { x: m[4] == 'west' ? 4 - m[3] : 4 + parseInt(m[3]),
										y: m[2] == 'north' ? 4 - m[1] : 4 + parseInt(m[1]) };
						} else if (m = str.match(/(\d) (\w+)/)) {
							switch (m[2]){
								case 'north': return { x: 4, y: 4 - m[1] };
								case 'south': return { x: 4, y: 4 + parseInt(m[1]) };
								case 'west': return { x: 4 - m[1], y: 4 };
								case 'east': return { x: 4 + parseInt(m[1]), y: 4 };
							}
							throw 'Unexpected cardinal ' + m[2];
						} else if (m = str.match(/(\w+) from (\w+)/)) {
							let firstMove = cardinals.indexOf(m[2]);
							let secondMove = cardinals.indexOf(m[1]);
							return { x: 3 * (firstMove % 3) + (secondMove % 3), 
									y: 3 * Math.floor(firstMove / 3) + Math.floor(secondMove / 3) };
						} else if (m = str.match(/(\w+)/)) {
							let move = cardinals.indexOf(m[1]);
							return { x: 3 * (move % 3) + 1, y: 3 * Math.floor(move / 3) + 1 };
						} else 
							throw "Unexpected format with string " + str;
					}
					module.displays = [ ];
					for (let i = 0; i < 9; i++) 
						module.displays.push(Array(9));
					for (let disp of displays){
						let coord = getCoordinate(disp);
						module.displays[coord.y][coord.x] = disp;
					}
				}
			},
			{
				regex: /The square can be found in this location:/,
				handler: function(matches, module) {
					const grid = readTaggedLines(9).map(l => l.split(' '));
					let isVertex = [ ];
					for (let row = 0; row < 9; row++) {	
						isVertex.push(Array(9));
						for (let col = 0; col < 9; col++) {
							isVertex[row][col] = grid[row][col] != '○';
						}
					}
					
					let table = `<table class='not-coords-table'>`;
					
					for (let row = 0; row < 9; row++) {
						table += '<tr>';
						for (let col = 0; col < 9; col++) {
							const content = module.displays[row][col] ?? '';
							if (isVertex[row][col])
								table += `<td class='vertex'>${content}</td>`;
							else table += `<td>${content}</td>`;
						}
						table += '</tr>';
					}
					
					module.push({ label: 'Generated coordinates: (vertices of the square in green)', obj:table + '</table>' });
				}
			},
			{
				regex: /([A-Z]+)-([A-Z]+)/i,
				handler: function(matches, module) {
					const shapes = [ "Flat", "Round", "Point", "Ticket", "Bumps", "Ribbon", "Sawtooth", "Track", "Hammer" ];
					const a = shapes.indexOf(matches[1]);
					const b = shapes.indexOf(matches[2]);
					const msg = matches.input.replace(/([A-Z]+)-([A-Z]+)/i, `<img class='not-coords-shape' src='../HTML/img/Not Coordinates/${a}${b}.svg'>`);
					module.push({ obj: `<span>${msg}</span>` });
					return true;
				}
			},
			{
				regex:/submitted|second moves/
			}
		]
	},
	{
		moduleID: 'NotPokerModule',
		loggingTag: 'Not Poker',
		matches: [
			{
				regex: /Generating manual with rule seed \d+:/,
				handler: function(match, module){
					let rs = readTaggedLines(36);
					module.push([ match, [ { obj:pre(rs.join('\n')), nobullet:true } ] ] );
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
				regex: /Button colors are \(0–9\): (.+)/,
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
						obj: pre([matches[0]].concat(readTaggedLines(6)).join("\n"))
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
		moduleID: [ 'orderedKeys', 'unorderedKeys', 'reorderedKeys', 'misorderedKeys', 'borderedKeys', 'disorderedKeys' ],
		loggingTag: [ 'Ordered Keys', 'Unordered Keys', 'Reordered Keys', 'Misordered Keys', 'Bordered Keys', 'Disordered Keys' ],
		matches: [
			{
				regex: /After (\d+) reset/,
				handler: function(matches, module) {
					if (!module.stages)
						module.stages = { };
					let resets = matches[1] - '0';
					if (!module.stages[resets]){
						module.stages[resets] = [ ];
						module.push([ `After ${resets} reset${resets == 1 ? '' : 's'}:`, module.stages[resets] ]);
					}
					module.currentStage = resets;
				}
			},
			{
				regex: /.+/,
				handler: function(match, module) {
					let line = match.input.replace(/After \d+ reset\(s\), t/, 'T')
											.replace('had', 'have')
											.replace('was', 'is')
											.replace(/(buttons|labels|displays|keys) were/, '$1 are');
					module.stages[module.currentStage].push(line);
				}
			}
		]
	},
	{
		displayName: "Parallel Mazes",
		moduleID: "parallel_mazes",
		loggingTag: "Parallel Mazes",
		matches: [{
			regex: /^(Defuser|Expert) maze: (.+)$/,
			handler: function (matches, module) {
				const nonWallBorderColor = "#ffffff22";
				const data = matches[2].split(";").map(s => s.split(" ").map(v => Number(v)));
				const table = $("<table>").css("border-collapse", "collapse").css("text-align", "center");
				const firstTr = $("<tr>").appendTo(table);
				$("<td>").appendTo(firstTr);
				for (let i = 0; i < 7; i++) {
					$("<td>").text(String.fromCharCode(i + "A".charCodeAt(0))).appendTo(firstTr);
				}
				let start, end;
				const startPosText = readLine();
				const match1 = startPosText.match(/start position: ([A-G])([1-7])/);
				if (match1 && startPosText.includes(matches[1])) {
					start = { x: match1[1].charCodeAt(0) - "A".charCodeAt(0), y: Number(match1[2]) - 1 };
					const endPosText = readLine();
					const match2 = endPosText.match(/finish position: ([A-G])([1-7])/);
					if (match2 && endPosText.includes(matches[1])) {
						end = { x: match2[1].charCodeAt(0) - "A".charCodeAt(0), y: Number(match2[2]) - 1 };
					} else linen -= 2;
				} else linen -= 1;
				for (let row = 0; row < 7; row++) {
					const tr = $("<tr>").appendTo(table);
					$("<td>").text(row + 1).appendTo(tr);
					for (let col = 0; col < 7; col++) {
						const td = $("<td>")
							.css("color", "white")
							.css("background-color", "black")
							.css("border", "solid white")
							.css("width", "24px")
							.css("height", "24px")
							.appendTo(tr);
						if (start && start.x === col && start.y === row) td.text("S");
						if (end && end.x === col && end.y === row) td.append("F");
						const v = data[col][row];
						if ((v & (1 << 0)) > 0) td.css("border-right-color", nonWallBorderColor);
						if ((v & (1 << 1)) > 0) td.css("border-top-color", nonWallBorderColor);
						if ((v & (1 << 2)) > 0) td.css("border-left-color", nonWallBorderColor);
						if ((v & (1 << 3)) > 0) td.css("border-bottom-color", nonWallBorderColor);
					}
				}
				module.push({ label: matches[1] + " maze", obj: table });
				return true;
			},
		}, {
			regex: /Connecting to server/,
			handler: function (matches, module) {
				const nextLine = readLine();
				linen -= 1;
				return /Connected to server/.test(nextLine);
			},
		}, {
			regex: /Connected to server/,
			handler: function (matches, module) {
				const nextLine = readLine();
				linen -= 1;
				return /Game created/.test(nextLine);
			},
		}, {
			regex: /Connecting to expert (\d{7})/,
			handler: function (matches, module) {
				const nextLine = readLine();
				if (/Expert connected/.test(nextLine)) {
					module.push({ label: `Expert ${matches[1]} connected` });
					return true;
				}
				linen -= 1;
				return false;
			},
		}, {
			regex: /Moving/,
			handler: function (matches, module) {
				const nextLine = readLine();
				linen -= 1;
				return /Defuser moves/.test(nextLine);
			},
		}, {
			regex: /Disconnecting expert/,
			handler: function (matches, module) {
				const nextLine = readLine();
				linen -= 1;
				return /Expert disconnected/.test(nextLine);
			},
		}, {
			regex: /^.*moves.*Strike\!/,
			handler: function (matches, module) {
				module.push({
					label: [
						'<img height="20px" src="TDSBombRenderer/images/strike.png">',
						`<span style="font-weight:bold;font-size:20px">${matches[0]}</span>`,
					].join(" "),
				});
				return true;
			},
		}, {
			regex: /^.*ERROR:.*$/,
			handler: function (matches, module) {
				module.push({
					label: `<span style="background-color:black;color:red;font-size:24px">${matches[0]}</span>`
				});
				return true;
			},
		}, {
			regex: /^.*$/
		}],
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
		moduleID: "pawns",
		loggingTag: "Pawns",
		matches: [
			{
				regex: /Blocker placed at ([a-g])-([1-7])/,
				handler: function (matches, module) {

					if (!module.pieces)
						module.pieces = [ ];
					module.blockerNum = (module.blockerNum || 0) + 1;
					module.pieces.push( { number:module.blockerNum, type:'Blocker', column:matches[1].charCodeAt(0) - 97, row: 7 - (matches[2] - '0')});
				}
			},
			{
				regex: /Move #([1-8]): (Queen|King|Knight|Rook|Bishop) at ([a-g])-([1-7]) attempting to capture Pawn at ([a-g])-([1-7]). This move (is|cannot).+/,
				handler: function (matches, module) {

					if (!module.pieces)
						module.pieces = [ ];
					if (!module.captures)
						module.captures = [ ];
					let piece = { number:matches[1] - '0', type:matches[2],	column:matches[3].charCodeAt(0) - 97, row:7 - (matches[4] - '0')};
					let pawn  = { number:matches[1] - '0', type:'Pawn',		column:matches[5].charCodeAt(0) - 97, row:7 - (matches[6] - '0')};
					module.pieces.push(piece);
					module.pieces.push(pawn);
					module.captures.push( { start:piece, end:pawn, success:(matches[7] == 'is')} );
				}
			},
			{
				regex: /The full chessboard is as follows:/,
				handler: function (matches, module) {

					let svg = `<svg viewbox='-75 -75 950 950'>`
					svg += `<rect x='0' y='0' width='700' height='700' fill='none' stroke='#000' stroke-width='5'/>`
					for (let i = 0; i < 7; i++) {
						const textAttrs = "style='font-size: 50; pointer-events: none' width='100' height='100' text-anchor='middle' dominant-baseline='middle'"
						//rows
						svg += `<text x='-30' y='${100 * i + 50}' ${textAttrs}>${7 - i}</text>`;
						svg += `<text x='730' y='${100 * i + 50}' ${textAttrs}>${7 - i}</text>`;

						//columns
						svg += `<text x='${100 * i + 50}' y='-30' ${textAttrs}>${String.fromCharCode(97 + i)}</text>`;
						svg += `<text x='${100 * i + 50}' y='730' ${textAttrs}>${String.fromCharCode(97 + i)}</text>`;
					}

					const paths = {
							'Blocker':'M20.28 19.93H79.72V79.37H20.28ZM74.58 74.23V25.07H25.42V74.23ZM53.9 49.65 71.64 67.39 67.74 71.28 50 53.54 32.26 71.28 28.36 67.39 46.1 49.65 28.36 31.86 32.26 27.97 50 45.75 67.74 27.97l3.9 3.9z',
							'Pawn':'m21.42 90.78v-2.02q0-2.86.61-5.05.61-2.19 1.94-3.7 1.32-1.51 3.42-2.3 2.11-.78 5.08-.78h.39q-.29-.56-.29-1.34 0-1.02.37-1.94.37-.93 1.07-1.63.7-.7 1.82-1.15 1.12-.44 2.63-.44h.34q1.46-2.58 2.32-5.1.86-2.53 1.34-4.91.48-2.38.65-4.68.17-2.3.17-4.43V48.4q-2.02-.44-3.09-1.82-1.07-1.38-1.07-3.17 0-.34.05-.73.05-.39.17-.73h-.34q-3.93 0-5.89-1.96-1.96-1.96-1.96-4.93 0-2.86 2.13-4.77 2.13-1.91 5.89-2.13-.85-1.34-1.34-3.09-.5-1.75-.5-3.7 0-2.69.95-4.91.95-2.22 2.61-3.82 1.66-1.59 3.9-2.49 2.24-.9 4.82-.9h.73q2.58 0 4.82.9 2.24.9 3.9 2.49 1.66 1.59 2.61 3.82.95 2.22.95 4.91 0 1.96-.5 3.7-.5 1.75-1.34 3.09 3.76.23 5.89 2.13 2.13 1.91 2.13 4.77 0 2.97-1.96 4.93-1.96 1.96-5.89 1.96h-.34q.12.34.17.73.05.39.05.73 0 1.8-1.07 3.17-1.07 1.38-3.09 1.82v2.92q0 2.13.17 4.43.17 2.3.65 4.68.48 2.38 1.34 4.91.86 2.53 2.32 5.1h.34q1.51 0 2.63.44 1.13.44 1.82 1.15.7.7 1.07 1.63.37.93.37 1.94 0 .78-.29 1.34h.39q5.95 0 8.5 3.09 2.55 3.09 2.55 8.75v2.02zm10.99-10.04q-3.65 0-5.1 1.66-1.46 1.66-1.57 4.46h48.52q-.12-2.8-1.57-4.46-1.46-1.66-5.1-1.66zm8.8-59.4q0 2.07.78 3.84.78 1.76 2.19 2.95h11.61q1.4-1.17 2.19-2.95.78-1.76.78-3.84 0-1.91-.61-3.47-.61-1.57-1.71-2.72-1.1-1.15-2.66-1.76-1.57-.61-3.42-.61h-.73q-1.85 0-3.42.61-1.57.61-2.66 1.76-1.1 1.15-1.71 2.72-.61 1.57-.61 3.47zm-5.83 13.69q0 1.46.9 2.3.9.85 2.69.85h22.04q1.8 0 2.69-.85.9-.85.9-2.3 0-1.46-.9-2.27-.9-.81-2.69-.81h-22.04q-1.8 0-2.69.81-.9.81-.9 2.27zm11.84 16.21q0 5.33-1.02 10.3-1.02 4.97-2.8 8.89h13.18q-1.8-3.93-2.8-8.89-1.02-4.97-1.02-10.3V48.49h-5.55zm14.19 25.7q1.75 0 1.75-1.29 0-1.4-1.75-1.4h-22.82q-1.75 0-1.75 1.4 0 1.29 1.75 1.29zM43.4 43.32q0 1.34 1.8 1.34h9.59q1.8 0 1.8-1.34 0-1.4-1.8-1.4h-9.59q-1.8 0-1.8 1.4z',
							'King':'m46.47 38.68q0 2.95.41 5.45.41 2.48.94 5.13.53 2.63 1.12 5.68.58 3.04.97 7.07h.2q.34-4.01.94-7.07.61-3.04 1.14-5.68.53-2.63.94-5.13.41-2.48.41-5.45 0-1.5-.13-3.27-.13-1.76-.51-3.65-.39-1.89-1.07-3.85-.68-1.96-1.84-3.9-1.17 1.94-1.87 3.9-.7 1.96-1.07 3.85-.37 1.89-.49 3.65-.13 1.76-.13 3.27zm3.73 39.8q6.5 0 12.76-.03 6.25-.03 12.71-.27V73.98Q69.26 73.74 62.96 73.69 56.65 73.65 50.2 73.65h-.39q-6.44 0-12.76.04-6.3.04-12.71.29v4.2q6.44.24 12.71.27 6.25.03 12.76.03zm25.47 2.32q-6.4.29-12.71.39-6.3.1-12.76.1h-.39q-6.44 0-12.76-.1-6.3-.1-12.71-.39v4.79q5.92.82 12.54 1.23 6.62.41 13.08.41 3.2 0 6.53-.1 3.32-.1 6.62-.32 3.29-.22 6.47-.53 3.18-.32 6.08-.7zM24.35 71.33q6.5-.24 12.71-.37 6.2-.13 12.76-.13h.39q6.54 0 12.76.13 6.2.13 12.71.37v-5.66q-6.07-.34-12.73-.51-6.67-.17-13.12-.17-6.35 0-12.95.17-6.6.17-12.51.51zM80.57 42.31q0-2.03-.61-3.87-.61-1.84-1.82-3.19-1.22-1.35-3.01-2.15-1.8-.79-4.12-.79-2.86 0-5.22 1.3-2.35 1.3-4.19 3.51-1.84 2.21-3.22 5.1-1.39 2.9-2.32 6.11-.94 3.21-1.5 6.58-.56 3.36-.7 6.41 1.17.34 2.64.51 1.49.17 3.32.17 3.88 0 7.61-1.38 3.73-1.38 6.64-3.94 2.91-2.56 4.71-6.19 1.8-3.63 1.8-8.17zm-61.12 0q0 4.54 1.8 8.17 1.8 3.63 4.71 6.19 2.91 2.56 6.64 3.94 3.73 1.38 7.61 1.38 1.84 0 3.32-.17 1.49-.17 2.64-.51-.2-3.04-.73-6.41-.53-3.36-1.49-6.58-.94-3.21-2.32-6.11-1.39-2.9-3.22-5.1-1.84-2.21-4.19-3.51-2.35-1.3-5.22-1.3-2.32 0-4.12.79-1.8.8-3.01 2.15-1.22 1.35-1.82 3.19-.61 1.84-.61 3.87zM48.5 9.52h3.01v2.85h2.76v2.75h-2.76v4.99q2.48 3.63 3.98 7.98 1.5 4.35 1.5 9.58 1.02-1.75 2.42-3.29 1.41-1.55 3.15-2.73 1.75-1.18 3.83-1.86 2.08-.68 4.46-.68 2.91 0 5.36.99 2.45.99 4.25 2.78 1.8 1.79 2.79 4.23 1 2.44 1 5.39 0 3.24-.97 6.28-.97 3.04-2.66 5.63-1.7 2.58-4.08 4.62-2.38 2.03-5.14 3.24.77.04 1.8.13 1.02.07 2.06.14 1.04.07 2.06.14 1.02.07 1.84.13v25.92q-7.17 1.02-14.57 1.52-7.4.51-14.67.51-7.27 0-14.3-.51Q28.6 89.75 20.89 88.74V62.83q.83-.04 1.84-.13 1.02-.07 2.06-.14 1.04-.07 2.04-.14 1-.07 1.82-.13-2.76-1.21-5.14-3.24-2.38-2.03-4.08-4.62-1.7-2.58-2.66-5.63-.97-3.04-.97-6.28 0-2.95 1-5.39 1-2.44 2.79-4.23 1.8-1.79 4.25-2.78 2.45-.99 5.36-.99 2.38 0 4.46.68 2.08.68 3.83 1.86 1.75 1.18 3.15 2.73 1.41 1.55 2.42 3.29 0-5.22 1.5-9.58 1.5-4.35 3.98-7.98V15.14h-2.76v-2.75h2.76V9.52',
							'Queen':'m87.23 28.83q0-1.49-.92-2.21-.92-.72-2.05-.72-1.13 0-2.07.75-.94.75-.94 2.18 0 1.43.94 2.21.94.77 2.07.77 1.13 0 2.05-.75.92-.75.92-2.23zm-74.47 0q0 1.49.92 2.23.92.75 2.05.75 1.13 0 2.07-.77.94-.77.94-2.21 0-1.43-.94-2.18-.94-.75-2.07-.75-1.13 0-2.05.72-.92.72-.92 2.21zm57.87-7.02q0-1.53-.92-2.28-.92-.75-2.1-.75-1.13 0-2.02.77-.89.77-.89 2.25 0 1.39.89 2.15.89.77 2.02.77 1.19 0 2.1-.75.92-.75.92-2.18zm-41.25 0q0 1.43.92 2.18.92.75 2.1.75 1.13 0 2.02-.77.89-.77.89-2.15 0-1.49-.89-2.25-.89-.77-2.02-.77-1.19 0-2.1.75-.92.75-.92 2.28zm17.66-3.27q0 1.43.85 2.23.85.79 2.02.79 1.29 0 2.18-.77.89-.77.89-2.25 0-1.43-.89-2.23-.89-.79-2.18-.79-1.24 0-2.05.79-.82.79-.82 2.23zm32.28 24.48-9.49 15.73q.64 0 1.57.03.94.03 1.88.07.94.04 1.78.07.85.03 1.34.07zm-55.73 15.97q.49-.04 1.34-.07.85-.03 1.78-.07.94-.04 1.85-.07.92-.03 1.6-.03l-9.49-15.73zm42.38-23.09-7.47 22.36q2.42.1 4.91.17 2.49.07 4.77.17zm-34.17 22.7q2.28-.1 4.77-.17 2.49-.07 4.91-.17l-7.61-22.31zm18.1-.44q1.57 0 3.21.03 1.63.03 3.27.07L50 29.83l-6.38 28.44q1.63-.04 3.21-.07 1.57-.03 3.07-.03zm0 25.91q3.02 0 6.48-.13 3.46-.13 6.95-.35 3.48-.22 6.79-.52 3.31-.3 5.99-.69v-3.71q-2.82.14-6.16.25-3.34.1-6.77.17-3.44.07-6.85.1-3.41.03-6.43.03-2.96 0-6.36-.03-3.38-.03-6.79-.1-3.41-.07-6.72-.17-3.31-.1-6.13-.25v3.71q2.67.4 5.96.69 3.29.3 6.77.52 3.48.22 6.9.35 3.41.13 6.38.13zm0-8.51q3.02 0 6.43-.03 3.41-.03 6.85-.04 3.44-.03 6.77-.1 3.34-.07 6.16-.17v-4.1q-2.82-.1-6.16-.2-3.34-.1-6.77-.14-3.44-.04-6.85-.07-3.41-.03-6.43-.03-2.96 0-6.36.03-3.38.03-6.83.07-3.44.04-6.72.14-3.29.1-6.11.2v4.1q2.82.1 6.11.17 3.29.07 6.72.1 3.44.03 6.83.04 3.38.03 6.36.03zm-26.01-7.77q2.82-.14 6.11-.25 3.29-.1 6.7-.14 3.41-.04 6.79-.07 3.38-.03 6.41-.03 2.96 0 6.38.03 3.41.03 6.88.07 3.46.04 6.79.14 3.34.1 6.16.25v-5.79q-3.02-.14-6.38-.3-3.36-.14-6.77-.22-3.41-.07-6.75-.13-3.34-.04-6.3-.04-2.92 0-6.2.04-3.29.04-6.7.13-3.41.07-6.75.22-3.34.14-6.36.3zm19.88-49.25q0-1.53.54-2.7.54-1.16 1.41-1.95.86-.79 1.95-1.19 1.09-.4 2.23-.4 1.13 0 2.28.4 1.13.4 2.02 1.16.89.77 1.46 1.95.57 1.19.57 2.72 0 2.48-1.24 3.91-1.24 1.43-2.96 1.98l5.63 24.92 7.82-21.75q-1.88-.59-3.02-2.15-1.13-1.56-1.13-3.64 0-1.53.57-2.72.57-1.19 1.49-1.98.92-.79 2.02-1.19 1.11-.4 2.25-.4 1.13 0 2.28.4 1.13.4 2.02 1.19.89.79 1.43 1.98.54 1.19.54 2.72 0 1.09-.37 2.13-.37 1.03-1.06 1.85-.69.82-1.68 1.39-.99.57-2.23.72l2.08 22.41 10.43-15.97q-1.43-.79-2.28-2.25-.85-1.46-.85-3.24 0-1.53.57-2.7.57-1.16 1.46-1.95.89-.79 2.02-1.19 1.13-.4 2.28-.4 1.13 0 2.25.4 1.11.4 1.98 1.19.86.79 1.41 1.95.54 1.16.54 2.7 0 1.19-.42 2.3-.42 1.11-1.22 1.98-.79.86-1.93 1.36-1.13.49-2.56.49h-.85l-4.1 27.01v23.79q-7.16.99-14.81 1.46-7.64.47-14.71.47-7.26 0-14.79-.47-7.51-.47-14.63-1.46v-23.81l-3.99-27.01h-.85q-1.43 0-2.56-.49-1.14-.49-1.94-1.36-.79-.86-1.21-1.98-.42-1.12-.42-2.3 0-1.53.54-2.7.54-1.16 1.41-1.95.86-.79 1.98-1.19 1.11-.4 2.25-.4 1.13 0 2.28.4 1.13.4 2.02 1.19.89.79 1.46 1.95.57 1.16.57 2.7 0 1.78-.85 3.24-.85 1.46-2.28 2.25l10.43 15.97 2.07-22.4q-1.24-.14-2.23-.72-.99-.57-1.68-1.39-.69-.82-1.06-1.85-.37-1.03-.37-2.13 0-1.53.54-2.72.54-1.19 1.43-1.98.89-.79 2.02-1.19 1.13-.4 2.28-.4 1.09 0 2.23.4 1.13.4 2.05 1.19.92.79 1.49 1.98.57 1.19.57 2.72 0 2.07-1.13 3.64-1.13 1.56-3.02 2.15l7.82 21.75 5.63-24.92q-1.74-.54-2.96-1.98-1.24-1.43-1.24-3.91z',
							'Rook':'m34.24 34.81h31.52l3.05-4.29H31.02Zm-3.28 35.03h37.79l-3-4.35H34.24Zm42.64 8.36v-4.46H26.21v4.46zm7.79 8.36v-4.35H18.7v4.35zm-7.79-59.82v-13.51h-4.63v6.44H54.74v-6.44h-9.6v6.44H30.85v-6.44h-4.63v13.5zm-9.94 34.79v-22.77H36.39v22.76zm1.52-45.76v-6.27h12.48v21.02h-4.29l-5.81 8.24v22.76l5.81 8.3h4.29v8.36h7.68v12.31H14.63v-12.3h7.68v-8.36h4.07l6.05-8.3v-22.77l-5.99-8.24H22.32V9.5h12.26v6.27h6.78v-6.27h17.12v6.27z',
							'Bishop':'m50 9.22c-.97 0-1.86.17-2.67.51-.81.34-1.51.81-2.11 1.41-.6.6-1.07 1.31-1.41 2.12-.34.82-.51 1.69-.51 2.63l-.01.02c0 1.23.33 2.32.98 3.29-1.83 1.31-3.53 2.69-5.11 4.15-1.58 1.45-2.96 3.02-4.12 4.7-1.17 1.68-2.08 3.51-2.75 5.49-.67 1.98-1 4.13-1 6.47 0 1.85.19 3.57.57 5.15.38 1.58.88 3.04 1.47 4.36.6 1.32 1.28 2.52 2.03 3.59.76 1.07 1.5 2.03 2.24 2.88l-3.17 11.37c1.37.89 3.01 1.6 4.92 2.14 1.91.54 3.95.92 6.12 1.15-1.2.51-2.49.88-3.87 1.11-1.38.23-2.81.4-4.29.51-1.48.11-2.99.21-4.51.3-1.52.08-3.01.21-4.46.38l-5.26 4.96c.09 1.51.39 2.93.9 4.25.51 1.32 1.2 2.54 2.06 3.65.85 1.11 1.86 2.09 3.01 2.93 1.15.84 2.42 1.5 3.81 2l5.73-6.12c-.51-.23-1.09-.5-1.73-.81-.64-.31-1.26-.68-1.86-1.11-.6-.43-1.13-.93-1.6-1.5-.47-.57-.79-1.23-.97-1.97 2.05-.11 3.89-.31 5.52-.6 1.62-.29 3.13-.73 4.53-1.34 1.39-.61 2.69-1.43 3.89-2.46 1.19-1.03 2.39-2.36 3.59-4.02h.17c1.19 1.65 2.39 2.99 3.59 4.02 1.19 1.03 2.49 1.85 3.89 2.46 1.39.61 2.9 1.06 4.53 1.34 1.63.29 3.46.49 5.52.6-.17.74-.49 1.4-.96 1.97-.47.57-1 1.07-1.6 1.5-.6.43-1.22.8-1.86 1.11-.64.31-1.22.58-1.73.81l5.73 6.12c1.37-.51 2.63-1.19 3.78-2.03 1.16-.84 2.16-1.81 3.01-2.93.85-1.11 1.54-2.33 2.05-3.65.51-1.32.81-2.74.9-4.25L71.67 72.93C70.21 72.76 68.73 72.63 67.2 72.55c-1.53-.09-3.03-.19-4.51-.3-1.48-.11-2.91-.28-4.29-.51-1.38-.23-2.67-.6-3.87-1.11 2.17-.23 4.2-.61 6.12-1.15 1.91-.54 3.55-1.25 4.92-2.14L62.39 55.97c.74-.85 1.49-1.81 2.24-2.88.76-1.07 1.43-2.27 2.03-3.59.6-1.32 1.09-2.78 1.47-4.36.38-1.58.57-3.3.57-5.15 0-2.33-.33-4.49-1-6.47-.67-1.98-1.59-3.81-2.75-5.49-1.17-1.68-2.54-3.24-4.12-4.7-1.58-1.45-3.29-2.84-5.11-4.15.65-.97.98-2.06.98-3.29 0-.94-.17-1.82-.51-2.63-.34-.81-.81-1.52-1.41-2.12-.6-.6-1.3-1.07-2.11-1.41-.82-.34-1.71-.51-2.67-.51zm-.01 2.83c1.08 0 1.96.38 2.65 1.13.69.76 1.03 1.66 1.03 2.71 0 1.05-.21 1.86-.64 2.41-.43.56-.93 1.06-1.5 1.51 2.59 1.63 4.76 3.25 6.52 4.88 1.75 1.63 3.17 3.26 4.25 4.92 1.09 1.65 1.86 3.33 2.33 5.05.47 1.71.7 3.47.7 5.3 0 1.42-.11 2.75-.32 3.99-.21 1.24-.54 2.41-.98 3.52-.44 1.11-.99 2.17-1.64 3.18-.65 1.02-1.42 2.01-2.31 2.97H39.9c-.89-.97-1.65-1.96-2.31-2.97-.65-1.01-1.2-2.07-1.64-3.18-.44-1.11-.76-2.28-.98-3.52-.22-1.24-.32-2.57-.32-3.99 0-1.82.24-3.58.71-5.3.47-1.71 1.25-3.39 2.33-5.05 1.08-1.65 2.5-3.29 4.25-4.92 1.76-1.63 3.93-3.25 6.52-4.88-.57-.45-1.07-.96-1.5-1.51-.43-.56-.64-1.36-.64-2.41 0-1.05.34-1.96 1.03-2.71.68-.76 1.56-1.13 2.65-1.13zm-1.44 11.87v7.44h-7.01v2.78h7.01v16.46h2.91V34.14h7.01v-2.78h-7.01v-7.44zm-8.3 32.62h19.49l1.67 6.8c-.83-.17-1.72-.32-2.69-.43-.97-.11-1.96-.21-2.97-.28-1.01-.07-2.01-.13-2.99-.17-.98-.04-1.9-.06-2.75-.06h-.02c-.85 0-1.77.02-2.75.06-.98.04-1.98.1-2.99.17-1.01.07-2.01.16-2.99.28-.98.11-1.87.26-2.67.43zm9.75 8.42c3.02 0 5.55.13 7.59.38 2.04.26 3.51.52 4.42.77h-.02c0 .2-.33.43-.98.68-.65.25-1.54.49-2.65.7-1.11.22-2.39.4-3.85.56-1.45.16-2.96.23-4.53.23-1.6 0-3.12-.08-4.55-.23-1.44-.16-2.71-.34-3.82-.56-1.11-.22-1.99-.45-2.65-.7-.65-.25-.98-.48-.98-.68.91-.26 2.39-.52 4.42-.77 2.04-.25 4.57-.38 7.59-.38zm4.31 7.51c.91.57 2.11.99 3.59 1.28 1.48.29 3.02.5 4.62.64 1.6.15 3.14.25 4.62.32 1.48.08 2.7.18 3.64.32l2.27 2.1-1.24.04h-1.28c-1.37 0-2.8-.05-4.29-.15-1.5-.1-2.97-.31-4.42-.64-1.45-.33-2.84-.79-4.15-1.37-1.31-.58-2.48-1.37-3.51-2.37zm-8.63.01.16.18c-1.03 1-2.2 1.79-3.51 2.37-1.31.58-2.69 1.04-4.15 1.37-1.45.33-2.93.54-4.42.64-1.5.1-2.93.15-4.29.15h-1.28c-.43 0-.84-.01-1.24-.04l2.27-2.1c.94-.15 2.16-.25 3.64-.32 1.48-.08 3.02-.18 4.62-.32 1.6-.14 3.14-.35 4.62-.64 1.48-.28 2.68-.71 3.59-1.28zm-20.05 6.8c1.05.09 2.49.13 4.32.13v-.01c.55 1.54 1.3 2.78 2.27 3.72.97.94 1.9 1.64 2.82 2.1l-2.61 2.65c-2.08-.94-3.65-2.14-4.7-3.59-1.06-1.45-1.76-3.12-2.1-5zm48.73.01c-.35 1.88-1.04 3.55-2.1 5-1.05 1.45-2.62 2.65-4.7 3.59L64.96 85.22c.69-.37 1.35-.83 2.01-1.37.57-.49 1.13-1.09 1.68-1.8.56-.71 1.02-1.6 1.39-2.65v.01c1.79 0 3.23-.04 4.32-.13z',
							'Knight':'m63.51 33.58q3.87 4.3 6.93 9.89 1.29 2.42 2.55 5.32 1.26 2.9 2.26 6.29 1 3.38 1.58 7.25.59 3.87.59 8.17 0 3.02-.32 6.21-.32 3.2-1.08 6.59h-6.18q.76-2.63 1.26-5.06.51-2.42.84-4.75.32-2.34.45-4.65.14-2.3.14-4.79 0-8.12-2.26-15.51-2.26-7.4-6.77-14.97zm-36.02 14.52.05.32q-1.34.76-2.58 1.8-1.24 1.04-2.58 1.53-.43-.37-.81-1.02-.37-.65-.49-1.4zM45.61 19.76Q45.08 18.68 44.37 17.64 43.68 16.59 42.43 15.67l-.16.05q.32 1.08.43 2.21.11 1.13.16 2.53zm8.22 20.59q.59 1.77.94 3.63.35 1.85.35 3.79 0 3.71-1.5 6.56-1.5 2.85-3.76 5.32-2.26 2.48-4.9 4.75-2.63 2.29-4.9 4.79-2.26 2.5-3.76 5.4-1.5 2.9-1.5 6.67 0 1.88.22 3.29.22 1.4.49 2.48h42.96q.32-2.1.59-4.03.27-1.94.49-4.03.22-2.1.32-4.49.11-2.38.11-5.4 0-3.93-.77-8.28-.77-4.36-2.34-8.77-1.56-4.41-3.87-8.66-2.3-4.25-5.32-7.9-1.29-1.56-2.38-2.82-1.1-1.26-2.21-2.48-1.1-1.21-2.34-2.55-1.24-1.34-2.74-3.06-.65-3.11-2.14-5.97-1.5-2.85-3.18-4.63h-.32q-.16 1.72-.35 3.68-.19 1.96-.61 3.57-1.08.32-2.61.57-1.53.24-3.2.59-1.67.35-3.34.84-1.67.49-2.98 1.24-1.32.76-2.14 1.85-.84 1.1-.84 2.66 0 .37.05.77.05.41.16.77-4.19 3.71-7.52 7.66-3.34 3.95-5.8 7.24-.65.49-1.29 1-.65.51-1.18 1.04-.53.53-.89 1.1-.35.57-.35 1.1 0 .76.27 1.5.27.76.65 1.34.81 3.02 2.29 4.19 1.49 1.18 3.36 1.18 1.29 0 2.63-.89 1.34-.89 2.58-2.77 1.13-.43 2.1-.81.96-.37 1.85-.77.89-.41 1.77-.96.89-.57 1.91-1.37 2.26 0 4.54-.77 2.29-.77 4.11-2.1 1.83-1.32 2.98-3.14 1.16-1.83 1.16-3.93zM32.16 90.78q-.59-1.5-1.08-3.6-.49-2.1-.49-5.43 0-4.09 1.5-7.36 1.5-3.29 3.76-5.99 2.26-2.72 4.91-5.06 2.66-2.34 4.91-4.57 2.26-2.23 3.76-4.49 1.5-2.26 1.5-4.9-1.67 1.67-4.33 2.87-2.66 1.21-7.01 1.42-1.61 1.18-3.29 1.99-1.67.81-3.55 1.4-1.67 1.88-3.46 3.04-1.8 1.16-3.68 1.16-1.56 0-2.9-.59-1.34-.59-2.45-1.61-1.1-1.02-1.88-2.37-.77-1.34-1.16-2.85-.65-.96-.89-2.12-.24-1.16-.24-2.23 0-.85.53-1.8.53-.94 1.29-1.8.76-.85 1.56-1.5.81-.65 1.4-.96 1.83-2.42 3.26-4.19 1.42-1.77 2.79-3.3 1.37-1.53 2.85-3.04 1.49-1.5 3.53-3.38-.11-.43-.11-.81 0-1.67.69-2.96.69-1.29 1.75-2.23 1.04-.94 2.3-1.53 1.26-.59 2.38-.92 0-1.13-.05-2.12-.05-1-.19-1.96-.14-.96-.32-2.04-.19-1.08-.45-2.48L40.94 11.75q.81.37 1.83 1.04 1.02.68 2.07 1.58 1.04.92 2.02 2.1.96 1.18 1.72 2.53l.53-.11q.43-2.04.68-4.3.24-2.26.41-4.95l2.21-.43q1.18 1.08 2.38 2.45 1.21 1.37 2.3 3.04 1.1 1.67 2.07 3.68.96 2.02 1.61 4.33.85 1.08 1.85 2.21 1 1.13 2.18 2.42 1.18 1.29 2.55 2.79 1.37 1.5 2.98 3.38 2.14 2.53 4.54 6.48 2.38 3.95 4.36 8.71 1.96 4.75 3.26 9.97 1.29 5.22 1.29 10.21 0 3.29-.11 5.79-.11 2.5-.35 4.9-.24 2.38-.61 5.03-.37 2.63-.92 6.18zM39.32 31.91q-.27-.69-.27-1.18 0-.69.37-1.13.37-.43.92-.65.53-.22 1.18-.27.65-.05 1.13-.05 1.24 0 2.55.19 1.32.19 2.29.19-.69.76-1.69 1.29-1 .53-2.12.92-1.13.37-2.26.53-1.13.16-2.1.16z'
						};

					for (let y = 0; y < 7; y++) {
						for (let x = 0; x < 7; x++) {
							let fill = y % 2 == x % 2 ? '#EEE' : '#FFF';
							svg += `<rect x='${100 * x}' y='${100 * y}' width='100' height='100' fill='${fill}'/>`;
						}
					}
					for (let piece of module.pieces){
						svg += `<path d='${paths[piece.type]}' transform='translate(${100 * piece.column}, ${100 * piece.row})'/>`;
					}
					for (let capture of module.captures) {
						const color = capture.success ? '#0C0' : '#C00';
						const x1 = 100 * capture.start.column + 50;
						const y1 = 100 * capture.start.row + 50;
						const x2 = 100 * capture.end.column + 50;
						const y2 = 100 * capture.end.row + 50;
						const angle = Math.atan2(x2-x1, y2-y1) * 180 / Math.PI;

						svg += `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='${color}' stroke-width='8'/>`
						svg += `<path transform='translate(${x2}, ${y2}) rotate(${180 - angle})' d='M-20 30 0 0 20 30 0 0z' stroke='${color}' stroke-width='8'/>`;
					}
					for (let piece of module.pieces) {
						svg += `<text x='${100 * piece.column + 80}' y='${100 * piece.row + 22.5}' style='font-size: 20; pointer-events:none;'>${piece.number}</text>`;
					}
					svg += '</svg>';
					module.push({ label:matches, obj:svg});
					return true;
				}
			},
			{
				regex: /[.XPBKRNQ]+/,
				handler: function (_, module) {
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
						ascii = readLines(10);
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
					module.push(readLine().replace(/[|]/g, "").replace('Jurrasic', 'Jurassic'));
					module.push(["Key Presses", input]);

					return true;
				}
			},
			{
				regex: /Input .+ was received|The current valid sequence/,
				handler: function (matches, module) {
					module.Input.push(matches.input.replace('Jurrasic', 'Jurassic'));
				}
			}
		]
	},
	{
		moduleID: 'PineapplePenModule',
		loggingTag: 'Pineapple Pen',
		matches: [ 
			{
				regex: /Generated Grid:/,
				handler: function (_, module) {
					const icons = [ 'apple', 'pen', 'pineapple' ];
					const imgstyle = 'width: 1cm; margin: 0';
					const tdstyle = 'border: 1mm solid; text-align: center;	';

					let grid = readTaggedLines(6).map(l => l.split('').map(ch => ch - '1'));
					readLine();
					
					let start = readLine().match(/[A-F][1-6]/)[0];
					let startCol = 'ABCDEF'.indexOf(start[0]);
					let startRow = start[1] - '1';
					console.log(start);
					
					let table = "<table style='width: 3in;'>";
					for (let row = 0; row < 6; row++) {
						table += '<tr>'; 
						for (let col = 0; col < 6; col++) {
							const fill = row == startRow && col == startCol ? '#8F8' : 'none';
							table += `<td style='${tdstyle} background-color: ${fill}'>`;
							if (grid[row][col] != -1)
								table += `<img style='${imgstyle}' src='img/PPAP/${icons[grid[row][col]]}.png'/>`;
							table += '</td>';
						}
						table += '</tr>';
					}
					module.push({ label:'Grid: (starting on green)', obj:table });
					return true;
				}
			},
			{
				regex: /.+/
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
		displayName: "Plagiarism",
		moduleID: "plagiarism",
		loggingTag: "Plagiarism",
		matches: [
			{
				regex: /(Final sequence:|Shown sequence for stage \d:) ((?:[pbogr][tcxhs](?:, )?)+)(?:; answer is (Pass|Report).)?/,
				handler: function (matches, module) {

					//Each png in img/Plagiarism has the hsv of (0, 60, 100).
					//These numbers are the values to set the hue to get that color
					let colors = { 'p':'#cc66ff', 'b':'#6680ff', 'o':'#ffbf66', 'g':'#66ff7f', 'r':'#ff6680' };
					let shapes = { 'x':'hexagon', 't':'triangle', 'c':'circle', 's':'square', 'h':'heart' };

					let args = matches[2].split(', ');
					let holder = `<div style='display: flex; flex-flow: row wrap; gap: 0.1in;'>`;

					for (let disp of args){
						let color = colors[disp[0]];
						let shape = shapes[disp[1]];
						holder += `<img src='img/Plagiarism/${shape}.png' draggable='false' style='width: 0.5in; background-color: ${color}; user-select: none; pointer-events: none;'> `
					}

					holder += '</div>';
					module.push( { label:matches[1], obj:holder } );
					if (matches[3])
						module.push('The correct answer is to ' + matches[3]);
					return true;
				}
			},
			{
				regex: /.+/
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
					const matrix = readTaggedLines(6);
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
		moduleID: "pointerPointerModule",
		loggingTag: "Pointer Pointer",
		matches: [
			{
				regex: /Stage \d+/,
				handler: function (matches, module) {
					const colorDict = { 'R':'#F00', 'G':'#0F0', 'B':'#00F', 'C':'#0FF', 'M':'#F0F', 'Y':'#FF0', 'W':'#FFF', 'K':'#444' };
					const dirs = [ 'U', 'UR', 'R', 'DR', 'D', 'DL', 'L', 'DL' ];
					
					readLine();
					const colors = readTaggedLines(6).map(l => l.split(' '));
					readLine();
					const dispArrows = readTaggedLines(6).map(l => l.split(' '));
					readLine();
					const truthDir = readTaggedLines(6).map(l => l.split(' '));
					readLines(2);
					const path = readTaggedLine().substring(12).split(' -> ').map(c => ({ x: 'ABCDEF'.indexOf(c[0]), y: c[1] - '1' }));
					
					
					
					let svg = "<svg viewbox='-5 -5 610 610' style='display: block; width: 3in'>";
					const arrPath = 'M-15 40V10H-30L0-40 30 10H15V40Z';
					const triPath = 'M-15 30H15L0 4Z';
					for (let row = 0; row < 6; row++) {
						for (let col = 0; col < 6; col++) {
							
							const start = col == path[0].x && row == path[0].y;
							const end = col == path[path.length - 1].x && row == path[path.length - 1].y;
							const rectFill = start ? '#6C8' : '#888';
							 
							let g = `<g transform='translate(${100 * col}, ${100 * row})'> 
										<rect width='100', height='100' stroke='#222' stroke-width='5' fill='${rectFill}'/>`;
							if (end)
								g += `<circle cx='50' cy='50' r='45' fill='#F0F0F0'/> 
									  <circle cx='50' cy='50' r='30' fill='${rectFill}'/>`;
							
							const fill = colorDict[colors[row][col]];
							const dir = 45 * dirs.indexOf(dispArrows[row][col]);
							g += `<path d='${arrPath}' fill='${fill}' transform='translate(50, 50) rotate(${dir})'/>`;
							svg += g + '</g>';
						}
					}
					let prev = path[0];
					let line = `M ${100 * prev.x + 50} ${100 * prev.y + 50} `;
					svg += `<circle r='15' cx='${100 * prev.x + 50}' cy='${100 * prev.y + 50}' fill='#000'/>`;
					
					for (let i = 1; i < path.length; i++) 
					{
						let node = path[i];
						let cx = 100 * node.x + 50;
						let cy = 100 * node.y + 50;
						let xDiff = node.x - prev.x;
						let yDiff = node.y - prev.y;
						const xWrap = Math.abs(xDiff) == 5;
						const yWrap = Math.abs(yDiff) == 5;
						if (xWrap)
							xDiff /= -5;
						if (yWrap)
							yDiff /= -5;
						let midpointX = 100 * prev.x + 50 + 50 * xDiff;
						let midpointY = 100 * prev.y + 50 + 50 * yDiff;
						
						
						const angle = Math.atan2(yDiff, xDiff) * 180 / Math.PI + 90;
						
						line += `L ${midpointX} ${midpointY} `;
						svg += `<path transform='translate(${midpointX}, ${midpointY}) rotate(${angle})' 
									fill='#000' d='${triPath}'/>`;
						if (xWrap)
							midpointX = 600 - midpointX;
						if (yWrap)
							midpointY = 600 - midpointY;
						line += `M ${midpointX} ${midpointY} L ${cx} ${cy} `;
						prev = node;
						svg += `<circle r='15' cx='${cx}' cy='${cy}' fill='#000'/>`;
					}
					svg += `<path d='${line}' fill='none' stroke-width='7.5' stroke='#000'/>`;
					
					const last = 'ABCDEF'[path[path.length - 1].x] + '123456'[path[path.length - 1].y];
					
					module.push([ matches[0] + ': Press ' + last, [ { obj: svg + '</svg>', nobullet:true } ] ]);
					return true;
				}
			},
			{
				regex: /Total Stages Generatable/,
				handler: function (_, module) { 
					module.push('Stage Legend: Green cell = starting point, Ring = stage answer');
				}
			},
			{
				regex: /Actions Performed/,
				handler: function (_, module) {
					module.actions = [ ];
					module.push([ 'Actions Performed', module.actions ]);
					return true;
				}
			},
			{
				regex: /.+/,
				handler: function (match, module) {
					if (module.actions)
						module.actions.push(match[0]);
					else module.push(match[0]);
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
		moduleID: "polygrid",
		loggingTag: "Polygrid",
		matches: [
			{
				regex: /The displayed/,
				handler: function (_, module) {
						module.shapes = { 	'●':'M0 10a10 10 0 0020 0 10 10 0 00-20 0',
											'◆':'M10 0l10 10-10 10-10-10z',
											'▼':'M0 1h20l-10 17.3z',
											'♥':'M10 20Q-1 13 0 5T10 4Q19-3 20 5T10 20Z',
											'+':'M7 7v-7h6v7h7v6h-7v7h-6v-7h-7v-6z',
											'■':'M1 1h18v18h-18z',
											'▲':'M0 19h20l-10-17.3z',
											'✖':'M5 0l5 5 5-5 5 5-5 5 5 5-5 5-5-5-5 5-5-5 5-5-5-5z',
											' ': 'M0 0'}

						module.lines = readTaggedLines(10).map(l => l.substring(1,10).split('|'));
						const letters = ['A','B','C','D','E','F','G','H','I','J'];
						let div = "<div style='display: flex; flex-flow: row wrap'>";

						for (let line = 0; line < 10; line++) {
							let svg = `<svg viewBox='-25 0 160 30' style='width: 3in; background-color: black; border: 1.5mm solid blue; margin: 1mm'>`;

							svg += `<text x='-12.5' y='15' style='font-size: 20px' dominant-baseline='central' text-anchor='middle' fill='#FFF' font-weight='bold'>${letters[line]}</text>`;
							svg += `<line y1='-100' y2='100' stroke-width='3' stroke='#00F'/>`;
							for (let sym = 0; sym < 5; sym++) {
								svg += `<path transform='translate(${25 * sym + 5}, 5)' d='${module.shapes[module.lines[line][sym]]}' fill='#00F'/>`;
							}
							svg += '</svg>';
							div += svg;
						}
						div += '</div>';
						module.push({label:'The displayed rows/columns are:', obj:div });
						return true;
					}
			},
			{
				regex: /The rows and columns/,
				handler: function (_, module) {
					const grid = readTaggedLines(5).map(l => l.split(' '));
					const arrowPath = 'M-40-40h80l-40 69.3z';
					const letters = ['A','B','C','D','E','F','G','H','I','J'];
					let svg = `<svg viewbox='-100 -100 700 700' style='width: 5in; display: block'>`;

								//up right down left
					let arrows = [ Array(5), Array(5), Array(5), Array(5) ];

					next_line:
					for (let line = 0; line < 10; line++) {
						for (let dir = 0; dir < 4; dir++) {
							next_arrow:
							for (let arrow = 0; arrow < 5; arrow++) {
								next_slot:
								for (let slot = 0; slot < 5; slot++) {
									if (module.lines[line][slot] == ' ')
										continue next_slot; //Goto next slot
									let cell = '';
									switch (dir) {
										case 0: cell = grid[slot][arrow]; break;
										case 1: cell = grid[arrow][4 - slot]; break;
										case 2: cell = grid[4 - slot][arrow]; break;
										case 3: cell = grid[arrow][slot]; break;
									}
									if (cell != module.lines[line][slot] || arrows[dir][arrow])
										continue next_arrow;
								}
								arrows[dir][arrow] = letters[line];
								continue next_line;
							}
						}
					}
					for (let row = 0; row < 5; row++){
						for (let col = 0; col < 5; col++) {
							let g = `<g transform='translate(${100 * col}, ${100 * row})'>`;
							g += `<rect width='100' height='100' fill='#000' stroke='#00F' stroke-width='12'/>`;
							g += `<path transform='translate(20, 20) scale(3)' d='${module.shapes[grid[row][col]]}' fill='#00F'/>`;
							svg += g + '</g>';
						}
						const arrPos = 100 * row + 50;
						svg += `<path transform='translate(${arrPos}, -50) rotate(0)  ' d='${arrowPath}' fill='#00F' stroke='#000' stroke-width='6'/>`;
						svg += `<path transform='translate(550, ${arrPos}) rotate(90) ' d='${arrowPath}' fill='#00F' stroke='#000' stroke-width='6'/>`;
						svg += `<path transform='translate(${arrPos}, 550) rotate(180)' d='${arrowPath}' fill='#00F' stroke='#000' stroke-width='6'/>`;
						svg += `<path transform='translate(-50, ${arrPos}) rotate(270)' d='${arrowPath}' fill='#00F' stroke='#000' stroke-width='6'/>`;
						if (arrows[0][row])
							svg += `<text x='${arrPos}' y='-65' style='font-size:42px' dominant-baseline='central' text-anchor='middle' fill='#FFF' font-weight='bold'>${arrows[0][row]}</text>`;
						if (arrows[1][row])
							svg += `<text x='565' y='${arrPos}' style='font-size:42px' dominant-baseline='central' text-anchor='middle' fill='#FFF' font-weight='bold'>${arrows[1][row]}</text>`;
						if (arrows[2][row])
							svg += `<text x='${arrPos}' y='565' style='font-size:42px' dominant-baseline='central' text-anchor='middle' fill='#FFF' font-weight='bold'>${arrows[2][row]}</text>`;
						if (arrows[3][row])
							svg += `<text x='-65' y='${arrPos}' style='font-size:42px' dominant-baseline='central' text-anchor='middle' fill='#FFF' font-weight='bold'>${arrows[3][row]}</text>`;
					}

					module.push({ label:'The rows and columns fit into this 5×5 grid', obj:svg + '</svg>' });
					return true;
				}
			},
			{
				regex: /.+/
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
		displayName: "Quantum Ternary Converter",
		moduleID: "quTern",
		loggingTag: "Quantum Ternary Converter",
		matches: [
			{
				regex: /The display shows the superposition of the numbers: (-?)(\d+) and (-?)(\d+)\./,
				handler: function (matches, module) {
					let negA = matches[1] == '-';
					let a = matches[2];
					let negB = matches[3] == '-';
					let b = matches[4];

					let digits = { '0':[true,true,true,false,true,true,true], '1':[false,false,true,false,false,true,false], '2':[true,false,true,true,true,false,true], '3':[true,false,true,true,false,true,true], '4':[false,true,true,true,false,true,false], '5':[true,true,false,true,false,true,true], '6':[true,true,false,true,true,true,true], '7':[true,false,true,false,false,true,false], '8':[true,true,true,true,true,true,true], '9':[true,true,true,true,false,true,true], '/':[false,false,false,false,false,false,false] };
					let colors = { 0:'Black', 1:'Gray', 2:'White' };

					while (a.length < b.length)
						a = '/' + a;
					while (b.length < a.length)
						b = '/' + b;

					const pathTop = 'M-2 1-3 0-2-1 2-1 3 0 2 1Z';
					const transforms = [ 'translate(0,0)', 'translate(-3,3) rotate(90)', 'translate(3,3) rotate(90)', 'translate(0,6)', 'translate(-3,9) rotate(90)', 'translate(3,9) rotate(90)', 'translate(0, 12)'];
					const svgStyle = "background-color: black; width: 5in; display: block;"

					let groups = [];
					for (let i = 0; i < a.length; i++) {
						let setA = digits[a[i]];
						let setB = digits[b[i]];
						let group = [ ];

						for (let seg = 0; seg < 7; seg++) {
							let value = setA[seg] + setB[seg];
							group.push(`<path d='${pathTop}' transform='${transforms[seg]}' fill='${colors[value]}'></path>`);
						}
						groups.push(`<g transform='translate(${10 * i})'> ${group.join(' ')} </g>'`);
					}
					let neg = negA + negB; // Number
					groups.push(`<path d='M-5 6-6 5-10 5-11 6-10 7-6 7Z' fill='${colors[neg]}' ></path>`);
					let svg = `<svg viewbox="${neg == 0 ? -5 : -12} -2 ${10 * a.length + (neg == 0 ? 0 : 8)} 16" xmlns="http://www.w3.org/2000/svg" style="${svgStyle}">`;
					svg += groups.join(' ');
					svg += `</svg>`;

					module.push({ label:matches[0], obj:svg });
					return true;
				}
			},
			{
				regex: /(?!The display shows the).+/,
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
		displayName: "Repo Selector",
		moduleID: "qkRepoSelector",
		loggingTag: "Repo Selector",
		matches: [
			{
				regex: /Modules sorted by (.+): (.+)/,
				handler: function (matches, module) {
					module.push({ label: matches[1], obj: `<ul>${matches[2]}</ul>`, expandable: true })
				}
			},
			{
				regex: /All bomb modules \(A-Z\): (.+)/,
				handler: function (matches, module) {
					module.push({ label: "All bomb modules: (A-Z)", obj: `<ul>${matches[1]}</ul>`, expandable: true })
				}
			},
			{
				regex: /Light is (.+), Selector modules ordered by their sort keys: (.+)/,
				handler: function (matches, module) {
					module.push(`Light is ${matches[1]}`)
					module.push({ label: 'Selector modules ordered by their sort keys', obj: `<ul>${matches[2]}</ul>`, expandable: true })
				}
			},
			{
				regex: /(?:Waiting for service to finish)|(?:Service finished, generating question)|(?:Modules successfully fetched)/,
				handler: function (matches, module) { return true; }
			},
			{
				regex: /^((?!(?:Modules sorted by)|(?:All bomb modules)|(?:Light is)).)*$/
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
					module.push({ label: "The colors are as follows:", obj: pre(readTaggedLines(20).join('\n')) });
					return true;
				}
			},
			{
				regex: /ASCII2:/,
				handler: function (matches, module) {
					module.push({ label: "The colored cube's maze is as follows, where P = passage and W = wall:", obj: pre(readTaggedLines(20).join('\n')) });
					return true;
				}
			},
			{
				regex: /ASCII3:/,
				handler: function (matches, module) {
					module.push({ label: "The input cube's maze is as follows, where P = passage and W = wall:", obj: pre(readTaggedLines(20).join('\n')) });
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
		moduleID: 'robitProgramming',
		loggingTag: 'Robit Programming',
		matches: [
			{
				regex: /The maze has now been locked into the following:/,
				handler: function(match, module) {
					const grid = readTaggedLines(11).map(l => l.split('').map(ch => ch == 'X'));
					
					let svg = `<svg viewbox='0 0 26 26' style='display: block; width: 3in; margin: 2mm 0'>`;
					
					for (let row = 0; row < 5; row++){
						for (let col = 0; col < 5; col++) {
							let g = `<g fill='#000' transform='translate(${5 * col}, ${5 * row})'>`
							if (grid[2 * row][2 * col + 1])
								g += "<rect x='0' y='0' width='6' height='1'/>";
							if (grid[2 * row + 1][2 * col])
								g += "<rect x='0' y='0' width='1' height='6'/>";
							g += "<rect width='1' height='1' x='2.5' y='2.5' fill='#444'/>"
							svg += g + '</g>';
							
						}
					}
					svg += "<rect x='0' y='25' fill='#000' width='26' height='1'/>";
					svg += "<rect x='25' y='0' fill='#000' width='1' height='26'/>";
					module.push({ label:match, obj:svg + '</svg>' });
				}
			},
			{
				regex: /(.+(?:the following string, |quirks: ))\[?([01]+|[\w, ]+)/,
				handler: function(matches, module) {
					module.push({ label: matches[1], obj: pre(matches[2]) });
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
		displayName: [ "Rubik’s Clock", "Blindfolded Rubik’s Clock" ],
		moduleID: [ "rubiksClock", "blindfoldedRubiksClockModule" ], 
		loggingTag: [ "Rubik’s Clock", "Blindfolded Rubik’s Clock" ],
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
		displayName: "Synesthesia",
		moduleID: "synesthesia",
		loggingTag: "Synesthesia",
		matches: [
			{
				regex: /(The sequence played is|You submitted) ([\d,\s]+)/,
				handler: function(matches, module) {
					let order = [5, 6, 9, 10, 4, 7, 8, 11, 3, 2, 13, 12, 0, 1, 14, 15];
					let loggingInfo = matches[2].split(", ");
					let colourLayout = ["00", "80", "ff"];
					let cellSize = 125;
					
					let finalInfo = [];
					for(let i = 0; i < order.length; i++) {
						finalInfo.push(loggingInfo[order[i]]);
					}

					let colours = [];
					for(let i = 0; i < finalInfo.length; i++) {
						let colour = "";
						for(let j = 0; j < finalInfo[i].length; j++) {
							colour += colourLayout[parseInt(finalInfo[i][j])];
						}
						colours.push(colour);
					}

					let svg = `<br><svg transform="translate(75 0)" width="400" height="200" viewbox="100 250 1125 275">`;
					for(let i = 0; i < finalInfo.length; i++) {
						svg += `<rect x="${cellSize * (i % 4) + cellSize}" y="${cellSize * Math.floor(i / 4) + cellSize}" width="${cellSize}" height="${cellSize}" style="fill:#${colours[i]};stroke:#444;stroke-width:1" />`;
						svg += `<rect x="${cellSize * (i % 4) + cellSize + 300 + 300}" y="${cellSize * Math.floor(i / 4) + cellSize}" width="${cellSize}" height="${cellSize}" style="fill:#ccc;stroke:#888;stroke-width:1" /><text x="${cellSize * (i % 4) + cellSize + 300 + 362}" y="${cellSize * Math.floor(i / 4) + cellSize + 80}" text-anchor="middle" style="font-size:50px">${finalInfo[i]}</text>`;
					}

					module.push({label: matches[1], obj: svg});
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
					module.push(["SETTINGS", readTaggedLines(3)]);
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
		displayName: "The Sapphire Button",
		moduleID: "SapphireButtonModule",
		loggingTag: "The Sapphire Button",
		matches: [
			{
				regex: /(Bitmaps shown on module|Reconstructed bitmaps):/,
				handler: function(matches, module) {
					let allLines = readTaggedLines(15);
					let pixels = '', borders = '';
					let w = allLines[0].length >> 1;
					for (let bmp = 0; bmp < 3; bmp++)
					{
						let lines = allLines.slice(5*bmp, 5*bmp + 5);
						for (let x = 0; x < w; x++)
							for (let y = 0; y < 5; y++)
								if (lines[y][2*x] === '█')
									pixels += `M${x} ${y+6*bmp}h1v1h-1z`;
						borders += `M0 ${6*bmp}h${w}v5H0z`;
					}
					module.push({
						label: matches[0],
						obj: $(`<svg viewBox='-.1 -.1 ${w*1.5+.2} 17.7'><path fill='none' stroke='black' stroke-width='.05' d='${borders}' /><path d='${pixels}' /></svg>`)
					});
					return true;
				}
			},
			{
				regex: /(\w+)\/(\d) \^ (\w+)\/(\d) \^ (\w+)\/(\d) = (\w+)/,
				handler: function(matches, module) {
					// cw: M.5 2.5A2 2 0 0 1 2.5,.5
					let data = readLines(5).map(line => line.replace(/^\[The Sapphire Button #\d+\] /, ''));
					let pixels = '', borders = 'M21 7h5v5h-5z', svg = '';
					for (let bmp = 0; bmp < 3; bmp++)
					{
						for (let s = 0; s < 2; s++)
						{
							for (let x = 0; x < 5; x++)
								for (let y = 0; y < 5; y++)
										if (data[y][28*bmp + 13*s + 2*x] === '█')
											pixels += `M${7*bmp + x} ${7*s + y}h1v1h-1z`;
							borders += `M${7*bmp} ${7*s}h5v5h-5z`;
						}
						svg += `<text x='${7*bmp + 2.5}' y='6.3'>↓</text><text x='${7*bmp + 6}' y='9.8'>${bmp === 2 ? '=' : 'xor'}</text>`;
						svg += `<text x='${7*bmp + 2.5}' y='-.3'>${matches[1+2*bmp]}</text>`;
						svg += [
							`<g transform='translate(${7*bmp + 5} 0) scale(-1 1)' fill='none' stroke='#4b4'><path d='M0 0l5 5' stroke-width='.1' /><path d='M4 1C2.5 1.5 1.5 2.5 1 4' stroke-width='.2' /><path transform='translate(1 4) scale(.08) rotate(-71.56505119)' d='M0 0L5 -5L-12.5 0L5 5L0 0z' fill='#4b4' stroke='none' /><path transform='translate(4 1) scale(.08) rotate(161.5650512)' d='M0 0L5 -5L-12.5 0L5 5L0 0z' fill='#4b4' stroke='none' /></g>`,
							`<g transform='translate(${7*bmp} 0)'><path d='M.5 2.5A2 2 0 0 1 2.5 .5' fill='none' stroke='#4b4' stroke-width='.2' /><path transform='translate(2.5 .5) scale(-.08)' d='M0 0L5 -5L-12.5 0L5 5L0 0z' fill='#4b4' /></g>`,
							`<g transform='translate(${7*bmp + 5} 0) scale(-1 1)'><path d='M.5 2.5A2 2 0 0 1 2.5 .5' fill='none' stroke='#4b4' stroke-width='.2' /><path transform='translate(2.5 .5) scale(-.08)' d='M0 0L5 -5L-12.5 0L5 5L0 0z' fill='#4b4' /></g>`,
							`<g transform='translate(${7*bmp} 0)' fill='none' stroke='#4b4'><path d='M0 0l5 5' stroke-width='.1' /><path d='M4 1C2.5 1.5 1.5 2.5 1 4' stroke-width='.2' /><path transform='translate(1 4) scale(.08) rotate(-71.56505119)' d='M0 0L5 -5L-12.5 0L5 5L0 0z' fill='#4b4' stroke='none' /><path transform='translate(4 1) scale(.08) rotate(161.5650512)' d='M0 0L5 -5L-12.5 0L5 5L0 0z' fill='#4b4' stroke='none' /></g>`
						][matches[2+2*bmp]-1];
					}
					for (let x = 0; x < 5; x++)
						for (let y = 0; y < 5; y++)
								if (data[y][84 + 2*x] === '█')
									pixels += `M${21 + x} ${7 + y}h1v1h-1z`;

					module.push({
						label: 'Solving process:',
						obj: $(`<svg viewBox='-.1 -1.6 30.2 14.2' text-anchor='middle' font-size='1'><path fill='none' stroke='black' stroke-width='.05' d='${borders}' /><path d='${pixels}' />${svg}</svg>`)
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
		displayName: "Set Connections",
		moduleID: "setConnections",
		loggingTag: "Set Connections",
		matches: [
			{
				regex: /^Numbers:/,
				handler: function (matches, module) {
					module.nums = readLines(9).map(l => l.match(/([1-3])([1-3])([1-3])([1-3])([1-3])([1-3])([1-3])([1-3])([1-3])/).slice(1,10));
					return true;
				}
			},
			{
				regex: /^Colors:/,
				handler: function (matches, module) {
					module.cols = readLines(9).map(l => l.match(/([RBY])([RBY])([RBY])([RBY])([RBY])([RBY])([RBY])([RBY])([RBY])/).slice(1,10));
					return true;
				}
			},
			{
				regex: /^Fills:/,
				handler: function (matches, module) {
					module.fills = readLines(9).map(l => l.match(/([□■◪])([□■◪])([□■◪])([□■◪])([□■◪])([□■◪])([□■◪])([□■◪])([□■◪])/).slice(1,10));
					return true;
				}
			},
			{
				regex: /^Shapes:/,
				handler: function (matches, module) {
					module.shapes = readLines(9).map(l => l.match(/([CSD])([CSD])([CSD])([CSD])([CSD])([CSD])([CSD])([CSD])([CSD])/).slice(1,10));

					module.stripedRID = Math.floor(Math.random() * 2147483647);
					module.stripedBID = Math.floor(Math.random() * 2147483647);
					module.stripedYID = Math.floor(Math.random() * 2147483647);

					const shapes = {
							'D':'m5 20-5-10 5-10 5 10z',
							'C':'M0 15a5 5 0 0010 0v-10a5 5 0 00-10 0z',
							'S':'m4 0c-1.1 0-2.4.2-2.9 1.3s.5 2.4 1 3.4.8 3.8-.1 5.5-1.7 4.2-1.1 6.4 2.3 3.3 4.2 3.6 2.8.2 3.9-.4.9-1.6.5-2.3-1.3-2.3-1.4-3.6.4-2.8.9-4.2 1.5-3.9.9-5.9-3-3.8-5.9-3.8z'
						};
					const colors = {'R':'#F00', 'B':'#00F', 'Y':'#FF0'};
					const positions = { 1:[0], 2:[-7.5, 7.5], 3:[-15, 0, 15] };
					const stripedIds = { 'R':module.stripedRID, 'B':module.stripedBID, 'Y':module.stripedYID };
					const xs = [ 0, 55, 110, 175, 230, 285, 350, 405, 460 ];
					const ys = [ 0, 35, 70, 115, 150, 185, 230, 265, 300 ];

					let svg = `<svg viewbox='0 0 510 330'>`+
									`<defs>`+
										`<pattern id='striped${module.stripedRID}' height='3' width='50' patternUnits='userSpaceOnUse'><line x1='0', x2='50' y1='0' y2='0' stroke="#F00" stroke-width="2"/></pattern>`+
										`<pattern id='striped${module.stripedBID}' height='3' width='50' patternUnits='userSpaceOnUse'><line x1='0', x2='50' y1='0' y2='0' stroke="#00F" stroke-width="2"/></pattern>`+
										`<pattern id='striped${module.stripedYID}' height='3' width='50' patternUnits='userSpaceOnUse'><line x1='0', x2='50' y1='0' y2='0' stroke="#FF0" stroke-width="2"/></pattern>`+
									`</defs>`;

					for (let y = 0; y < 9; y++){
						for (let x = 0; x < 9; x++) {
							let index = 9 * y + x;
							let group = `<g transform='translate(${xs[x]}, ${ys[y]})'>`
							group += `<rect width='50' height='30' x='0' y='0' rx='5' fill='#DDD'/>`
							let color = colors[module.cols[index]];
							for (let symbol = 0; symbol < module.nums[y][x] - '0'; symbol++){
								let pos = positions[module.nums[y][x] - '0'][symbol];
								let color = colors[module.cols[y][x]];
								let shape = shapes[module.shapes[y][x]];
								let fill = null;

								let fillVal = module.fills[y][x];
								if (fillVal == '□')
									fill = 'none';
								else if (fillVal == '■')
									fill = color;
								else if (fillVal == '◪')
									fill = `url(#striped${stripedIds[module.cols[y][x]]})`;



								group += `<path d='${shape}' fill='${fill}' stroke='${color}' transform='translate(${pos + 20}, 5)' stroke-width='2'/>`;
							}
							group += '</g>';
							svg += group;
						}
					}
					svg += '</svg>';
					module.push( { label:'Completed grid:', obj:svg } );
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
		displayName: "Shape Fill",
		moduleID: "ShapeFillModule",
		loggingTag: "Shape Fill",
		matches: [
			{
				regex: /Grid:/,
				handler: function(matches, module) {
					let svg =
						`<svg viewBox='-5 -5 510 510' style='width: 5in'>
						<defs>
							<pattern id='cross' width='100' height='100' patternUnits='userSpaceOnUse'>
								<line x1='50' x2='50' y1='0' y2='100' stroke='#000' stroke-width='15'/>
								<line x1='0' x2='100' y1='50' y2='50' stroke='#000' stroke-width='15'/>
							</pattern>

							<pattern id='diagonal' width='25' height='25' patternUnits='userSpaceOnUse'>
								  <line x1='0' x2='25' y1='25' y2='0' stroke='#000' stroke-width='8'/>
								  <path d='M0 5.6569 5.6569 0 0 0Z' fill='#000'/>
								  <path d='M19.3431 25 25 19.3431 25 25Z' fill='#000'/>
							</pattern>

							<pattern id='dots' width='50' height='50' patternUnits='userSpaceOnUse'>
								<circle r='12.5' cx='12.5' cy='12.5' fill='#000'/>
								<circle r='12.5' cx='37.5' cy='37.5' fill='#000'/>
							</pattern>

							<pattern id='empty' width='100' height='100' patternUnits='userSpaceOnUse'>
							</pattern>

							<pattern id='filled' width='100' height='100' patternUnits='userSpaceOnUse'>
								<rect x='0' y='0' width='100' height='100' fill='#000'/>
							</pattern>

							<pattern id='horizontal' width='100' height='20' patternUnits='userSpaceOnUse'>
								<rect x='0' y='6' width='100' height='8' fill='#000'/>
							</pattern>

							<pattern id='vertical' width='20' height='100' patternUnits='userSpaceOnUse'>
								<rect x='6' y='0' width='8' height='100' fill='#000'/>
							</pattern>

							<pattern id='x' width='100' height='100' patternUnits='userSpaceOnUse'>
								<line x1='0' x2='100' y1='0' y2='100' stroke='#000' stroke-width='15'/>
								<line x1='0' x2='100' y1='100' y2='0' stroke='#000' stroke-width='15'/>
							</pattern>

							<path id='circle' d='M0 50A50 50 0 00100 50 50 50 0 000 50'/>
							<path id='diamond' d='m5 45 40-40a7 7 0 0110 0l40 40a7 7 0 010 10l-40 40a7 7 0 01-10 0l-40-40a7 7 0 010-10'/>
							<path id='heart' d='M50 100Q-5 65 0 25T50 20Q95-15 100 25T50 100Z'/>
							<path id='octagon' d='M96.2 69.1 69.1 96.2 30.9 96.2 3.8 69.1 3.8 30.9 30.9 3.8 69.1 3.8 96.2 30.9Z'/>
							<path id='square' d='M0 0H100V100H0Z'/>
							<path id='star' d='M50 0 61.8 38.2 100 38.2 69.1 61.8 80.9 100 50 76.4 19.1 100 30.9 61.8 0 38.2 38.2 38.2Z'/>
							<path id='trapezoid' d='M0 80 25 20 75 20 100 80z'/>
							<path id='triangle' d='M0 100 100 100 50 0z'/>
						</defs>`;
					let lines = readTaggedLines(6);
					const letters = ['A','B','C','D','E'];
					let ansRow = lines[5][lines[5].length - 1] - '1';
					let ansCol = letters.indexOf(lines[5][lines[5].length - 2]);

					const shapeAbbrs = { 'C':'circle', 'D':'diamond', 'H':'heart', 'O':'octagon', 'S':'square', 'R':'star', 'Z':'trapezoid', 'T':'triangle' };
					const fillAbbrs = { 'C':'cross', 'G':'diagonal', 'D':'dots', 'E':'empty', 'F':'filled', 'H':'horizontal', 'V':'vertical', 'X':'x' };

					let grid = lines.slice(0,5).map(row => row.split(' '));
					for (let row = 0; row < 5; row++){
						for (let col = 0; col < 5; col++) {
							let cell = grid[row][col];
							svg += `<rect x='${100 * col}' y='${100 * row}' width='100' height='100' fill='${row == ansRow && col == ansCol ? '#AFA' : '#FFF'}' stroke='#000' stroke-width='5'/>`;
							svg += `<g transform='translate(${100 * col + 10}, ${100 * row + 10})'><use href='#${shapeAbbrs[cell[0]]}' fill='url(#${fillAbbrs[cell[1]]})' stroke='#000' stroke-width='3' transform='scale(0.8)'/></g>`;
						}
					}
					module.push({ label:'Displayed grid and correct answer:', obj:svg});
				}
			},
			{
				regex: /(Stage \d shapes|Pressed correct|Incorrectly pressed).+/
			}
		]
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
		moduleID: 'shapesAndColors',
		loggingTag: 'Shapes and Colors',
		matches: [
			{
				regex: /Clue #\d+:/,
				handler: function(match, module) {
					let grid = readTaggedLines(3).map(l => l.split(' '));;
					let svg = "<svg viewbox='-20 -20 380 380' style='display: block; width: 1.5in; background-color: black'>";
					const colors = { 'R':'#F00', 'G':'#0A0', 'B':'#00F', 'Y':'#FF0' };
					const paths = { 'C':'M0 40a20 20 0 0080 0 20 20 0 00-80 0', 'D':'M0 40 40 0 80 40 40 80Z', 'T':'M40 5 0 74H80Z' };
					for (let row = 0; row < 3; row++) {
						for (let col = 0; col < 3; col++) {
							let g = `<g transform='translate(${120 * col}, ${120 * row})'>`;
							const cell = grid[row][col];
							if (!cell.match((/^-?[RGBY]$|KK/)))
								g += "<rect width='100' height='100' fill='#FFF'/>";
							if (cell.match(/[RGBY][CDT]/))
								g += `<path transform='translate(10, 10)' d='${paths[cell[1]]}' fill='${colors[cell[0]]}' stroke='#000' stroke-width='10'/>`;
							else if (cell.match(/-?[RGBY]/))
								g += `<rect width='100' height='100' fill='${colors[cell[cell.length - 1]]}'/>`;
							else if (cell.match(/-?[CDT]/))
								g += `<path transform='translate(10,10)' d='${paths[cell[cell.length - 1]]}' fill='#888' stroke='#000' stroke-width='10'/>`;
							if (cell[0] == '-')
								g += `<path d='M-5-5 105 105M105-5-5 105' stroke='#000' stroke-width='8'/>`;
							svg += g + '</g>';
						}
					}
					module.push({ label: match, obj: svg + '</svg>' });
				}
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
					var grid = readTaggedLines(7).join('\n');
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
		displayName: "Shuffled Strings",
		moduleID: "shuffledStrings",
		loggingTag: "String Order"
	},
	{
		moduleID: "Signals",
		loggingTag: "Signals",
		matches: [
			{
				regex: /S1 Mapping:/,
				handler: function(match, module) {
					const lines = [ match.input, readTaggedLine(), readTaggedLine() ];
					const signs = { 'NEGATIVE':'–', 'ZERO':'0', 'POSITIVE':'+' };
					let matches = lines.map(l => l.match(/S\d Mapping: UP->(\w+),DOWN->(\w+),CENTER->(\w+)/));
					let mappingMatch = readTaggedLine().match(/S1->C(\d),S2->C(\d),S3->C(\d)/);
					let switchBase = `<g class='switch-base'><rect width='10' height='30' ry='5'/> <circle r='2.5' cx='5' cy='15'/></g>`;
					let svg = `<svg class='signals-switches' viewbox='-1 -1 42 32'>`;
					for (let sw = 0; sw < 3; sw++ ){
						let g = `<g transform='translate(${15 * sw}, 0)'> ${switchBase}`;
						g += `<text class='channel' x='5' y='27'>C${mappingMatch[sw + 1]}</text>`;
						for (let i = 0; i < 3; i++) {
							g += `<text class='sign' x='5' y='${6 * i + 9}'>${signs[matches[sw][i + 1]]}</text>`;
						}
						svg += g + '</g>';
					}
					module.push({ label:'Switch Mappings:', obj:svg });
				}
			},
			{
				regex: /(INPUT|GENERATOR): (\(C1=(\w+),C2=(\w+),C3=(\w+)\))/,
				handler: function (matches, module) {
					
					module.generateState ??= function(str) {
						const nums = { 'NEGATIVE':-1, 'ZERO':0, 'POSITIVE':1 };
						const getFigureNum = (c1, c2, c3) => 9 * c1 + 3 * c2 + c3 + 1;
						
						let channels = str.match(/\(C1=(\w+),C2=(\w+),C3=(\w+)\)/);
						let values = [ nums[channels[1]], nums[channels[2]], nums[channels[3]] ];
						let tern = values.map(c => c == -1 ? 2 : c);
						let fig = getFigureNum(tern[0], tern[1], tern[2]);
						return `${values.join(',')} (fig.${fig})`;
					}
					
					let label = matches[1] == 'INPUT' ? "Input signal: " : "Current generator signal: ";
					module.push(label + module.generateState(matches[2]));
				}
			},
			{
				regex: /S(\d)->(UP|DOWN|CENTER)/,
				handler: function (matches, module) {
					module.push(`Switch ${matches[1]} set to ${matches[2].toLowerCase()}.`);
				}
			},
			{
				regex: /(PASS|STRIKE)! INPUT:([^\s]+) GENERATOR:([^\s]+) SOLUTION:([^\s]+)/,
				handler: function(matches, module) {
					let lines = [ ];
					lines.push("Input signal: " + module.generateState(matches[2]));
					lines.push("Generator signal: " + module.generateState(matches[3]));
					lines.push("Solution: " + module.generateState(matches[4]));
					lines.push(matches[1] == 'PASS' ? 'Module solved!' : 'Strike!');
					module.push([ 'Submission:', lines ]);
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
		moduleID: "SimonSignalsModule",
		loggingTag: "Simon Signals",
		matches: [
			{
				regex: /^\{.*\}$/,
				handler: function (matches, module) {
					let colors = [
						'#ec3535',
						'#35ec35',
						'#3535ec',
						'#5d5d5d',
					];
					let shapes = [
						'M -2.917,-1.847 -0.815,-1.846 -0.814,4.764 L 0.814,4.764 L 0.815,4.552 L 0.815,-1.846 L 2.917,-1.847 0,-4.764 z M -1.89,-2.273 0,-4.163 1.89,-2.273 L 0.389,-2.272 0.387,4.338 L -0.387,4.338 L -0.389,-2.272 z',
						'M 0.658,4.932 L 0.658,-2.302 L 2.63,-2.302 L 0,-4.932 -2.63,-2.302 L -0.658,-2.302 L -0.658,4.932 z',
						'M -3.527,-1.294 -3.359,-1.126 -2.183,0.049 -0.953,-1.181 -0.951,4.821 L 0.951,4.821 L 0.953,-1.181 2.183,0.049 3.527,-1.294 0,-4.821 z M -2.855,-1.294 0,-4.149 2.855,-1.294 2.183,-0.623 0.476,-2.329 0.475,4.345 -0.475,4.345 -0.476,-2.329 -2.183,-0.623 z',
						'M -3.493,-1.471 -2.39,-0.368 -0.781,-1.976 L -0.781,4.964 L 0.781,4.964 L 0.781,-1.976 L 2.39,-0.368 3.493,-1.471 L 0,-4.964 z',
						'M 0,-4.936 -0.19,-4.555 C -0.775,-3.387 -1.344,-2.247 -2.488,-1.103 L -3.268,-0.322 -2.254,-0.759 C -1.635,-1.024 -1.204,-1.158 -0.789,-1.257 -0.6,0.683 -1.108,2.867 -1.663,4.532 L -1.797,4.936 -1.395,4.801 C -0.572,4.526 0.572,4.526 1.395,4.801 L 1.797,4.936 1.663,4.532 C 1.108,2.867 0.6,0.683 0.789,-1.257 C 1.204,-1.158 1.635,-1.024 2.254,-0.759 L 3.268,-0.322 2.488,-1.103 C 1.344,-2.247 0.775,-3.387 0.19,-4.555 z M 0,-4.013 C 0.438,-3.146 0.977,-2.266 1.728,-1.383 1.344,-1.526 0.928,-1.705 0.607,-1.763 L 0.387,-1.801 0.358,-1.582 C 0.089,0.425 0.621,2.613 1.176,4.343 0.419,4.159 -0.419,4.159 -1.176,4.343 -0.621,2.613 -0.089,0.425 -0.358,-1.582 L -0.387,-1.801 -0.607,-1.763 C -0.928,-1.705 -1.344,-1.526 -1.728,-1.383 -0.977,-2.266 -0.438,-3.146 0,-4.013 z',
						'M 0,-4.902 C -0.633,-3.637 -1.265,-2.372 -2.53,-1.107 -1.737,-1.447 -1.148,-1.661 -0.615,-1.757 -0.316,0.474 -0.949,3.005 -1.581,4.902 -0.633,4.586 0.633,4.586 1.581,4.902 0.949,3.005 0.316,0.474 0.615,-1.757 1.148,-1.661 1.737,-1.447 2.53,-1.107 C 1.265,-2.372 0.633,-3.637 0,-4.902 z',
						'M 0,-4.962 -1.876,-0.836 -0.805,-1.194 -0.804,1.398 -1.398,1.992 L -1.398,4.962 L 0,3.564 1.398,4.962 1.399,4.455 1.398,1.992 0.804,1.398 0.805,-1.194 1.876,-0.836 z M 0,-3.946 1.094,-1.539 0.384,-1.776 L 0.384,1.573 L 0.978,2.166 0.977,3.947 0,2.97 -0.977,3.947 -0.978,2.166 -0.384,1.573 L -0.384,-1.776 L -1.094,-1.539 z',
						'M 1.315,4.932 0,3.617 -1.315,4.932 L -1.315,2.302 L -0.658,1.644 L -0.658,-1.644 L -1.644,-1.315 0,-4.932 1.644,-1.315 0.658,-1.644 L 0.658,1.644 L 1.315,2.302 z',
					];
					let angleOffsets = [180, 315, 0, 270];

					let j = JSON.parse(matches[0]);
					console.log(j);
					function svg(i, n, cs) {
						return `<td>
							<svg viewBox="-5 -5 10 10" style='width: 2cm'>
							  <path transform='rotate(${angleOffsets[n - 3] + 360 * i / n})' fill='${colors[cs >> 3]}' d='${shapes[cs & 7]}' />
							</svg>
							<div>(${n})</div>
						</td>`;
					}
					let table = $(`<table style='border-collapse: collapse; margin: .3cm auto 1cm 0;'>
						<tr><th>Initial</th>${Array(j.stage + 2).fill(null).map((_, i) => svg(j.arrows[i].initial, j.arrows[i].num, j.arrows[i].colorshape)).join('')}</tr>
						<tr><th>Expected</th>${Array(j.stage + 2).fill(null).map((_, i) => svg(j.arrows[i].expected, j.arrows[i].num, j.arrows[i].colorshape)).join('')}</tr>
						${j.strike ? `<tr><th>Your submission</th>${Array(j.stage + 2).fill(null).map((_, i) => svg(j.arrows[i].current, j.arrows[i].num, j.arrows[i].colorshape)).join('')}</tr>` : ''}
					</table>`);
					table.find('td,th').css({ border: '1px solid black', padding: '.1cm .25cm', textAlign: 'center' });
					module.push({ label: `Stage: ${j.stage}${j.strike ? ' — STRIKE' : ''}`, obj: $(table) });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: 'simonSmothers',
		loggingTag: 'Simon Smothers',
		matches: [		
			{
				regex: /Square (\d) color (\d) at \((-?\d+),(-?\d+)\)/,
				handler: function(matches, module) {
					module.squares ??= [ ];
					module.squares.push({ size: parseInt(matches[1]), color: parseInt(matches[2]), x: parseInt(matches[3]), y: parseInt(matches[4]) });
				}
			},
			{
				regex: /(Generated|Submitted) Grid: (.+)/,
				handler: function(matches, module) {
					const hexCodes = [ '#000', '#00F', '#0F0', '#0FF', '#F00', '#F0F', '#FF0', '#DDD' ];
					const strokeCodes = [ '#222', '#006', '#060', '#066', '#600', '#606', '#660', '#666' ];
					const colorLetters = 'KBGCRMYW';
					const triplets = matches[2].split('|').map(str => 
																 str.split(',').map(digit => 
																                    parseInt(digit)
																));
					const coords = triplets.map(t => ({ color: t[0], x: t[1], y: t[2] }));
					
					const xMin = Math.min(0, coords.reduce((acc, coord) => Math.min(acc, coord.x), +1000));
					const xMax = Math.max(0, coords.reduce((acc, coord) => Math.max(acc, coord.x), -1000));
					const yMin = Math.min(0, coords.reduce((acc, coord) => Math.min(acc, coord.y), +1000));
					const yMax = Math.max(0, coords.reduce((acc, coord) => Math.max(acc, coord.y), -1000));
					const width = xMax - xMin + 1;
					const height = yMax - yMin + 1;
					let svg = `<svg class='simon-smothers' viewbox='${xMin - 0.25} ${yMin - 0.25} ${width + 0.5} ${height + 0.5}'>`;
					for (let coord of coords) {
						if (matches[1] == 'Submitted') {
							svg += `<rect fill='#888' x='${coord.x}' y='${coord.y}' width='1.01' height='1.01'/>`;
						} else {
							svg += `<rect fill='${hexCodes[coord.color]}' x='${coord.x}' y='${coord.y}' width='1.05' height='1.05'/>
									<text class='tile-color' x='${coord.x + .5}' y='${coord.y + .5}'>${colorLetters[coord.color]}</text>`;
						}
					}
					if (matches[1] == 'Generated') {
						let i = 0;
						for (let square of module.squares ?? [ ]) {
							svg += `<rect class='square' x='${square.x}' y='${square.y}' width='${square.size}' height='${square.size}' stroke='${strokeCodes[square.color]}'/>
									<text class='square-color' x='${square.x + 0.1}' y='${square.y + 0.1}' fill='${square.color == 'Black' ? '#FFF' : '#000'}'
										>${colorLetters[square.color]}</text>`;						
						}						
						svg += "<circle cx='0.5' cy='0.5' r='0.125' fill='#444'/>";
					}
					else {
						const diffs = readTaggedLine().split(' / ').map(diff => 
								diff.match(/\((-?\d+),(-?\d+)\) != \((-?\d+),(-?\d+)\)/));
						for (let d of diffs) {
							const x = [ parseInt(d[1]) + xMin, parseInt(d[3]) + xMin ];
							const y = [ parseInt(d[2]) + yMin, parseInt(d[4]) + yMin ];
							
							if (x[0] < x[1]) //Right
								svg += `<line class='difference' x1='${x[0] + 1}' y1='${y[0]}' x2='${x[1]}' y2='${y[1] + 1}'/>`;
							else if (x[0] > x[1]) //Left
								svg += `<line class='difference' x1='${x[0]}' y1='${y[0]}' x2='${x[1] + 1}' y2='${y[1] + 1}'/>`;
							else if (y[0] < y[1]) //Down
								svg += `<line class='difference' x1='${x[0]}' y1='${y[0] + 1}' x2='${x[1] + 1}' y2='${y[1]}'/>`;
							else if (y[0] > y[1]) //Up
								svg += `<line class='difference' x1='${x[0]}' y1='${y[0]}' x2='${x[1] + 1}' y2='${y[1] + 1}'/>`;
								
						}
					}
					
					module.push({ label:`${matches[1]} grid: ${matches[1] == 'Generated' ? '(Dot markes the coordinate (0,0))' : '(Differences between cells marked in red)'}`, obj:svg });
				}
			},
			{
				regex: /Added|Total flash/
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
				regex: /The arrangement of colors is: (.+)/,
				handler: function(matches, module) {
					module.colorOrder = matches[1].replace(/[\s/,]+/g, '|').split('|');
				}
			},
			{
				regex: /There are no more|Inputs correct|Strike!|The arrangement/,
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
					let line = matches.input;
					const m = line.match(/(?:\w+(?:, |\.$)){2,}/);
					if (m && module.colorOrder)
					{
						let colors = m[0].substring(0,m[0].length - 1).split(', ');
						let nums = [ ];
						for (let color of colors)
							nums.push(module.colorOrder.indexOf(color) + 1);					
						line += ` (${nums.join(', ')})`;
					}
					if ('Stage' in module)
						module.Stage[1].push(line);
					else
						// Any messages logged before the start
						module.push(line);
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
		moduleID: 'Skewers',
		loggingTag: 'Skewers',
		matches: [
			{
				regex: /The colors are:/,
				handler: function(_, module) {
					const hexCodes = { 'blue':'#00F', 'cyan':'#0FF', 'green':'#00A651', 'magenta':'#F0F', 'red':'#F00', 'white':'#FFF', 'yellow':'#FF0', 'black':'#000' };
					const grid = readTaggedLines(4).map(l => l.split(' '));
					module.svgContents = '';
					module.svgContents += "<rect class='background' width='400' height='400' rx='25' ry='25'/>";
					for (let row = 0; row < 4; row++) {
						for (let col = 0; col < 4; col++) {
							let fill = hexCodes[grid[row][col]];
							
							let letter = grid[row][col][0].toUpperCase();
							let g = `<g class='cell' transform='translate(${100 * col + 50}, ${100 * row + 50})'>`;
							g += `<path class='diamond' d='M-35 0 0 35 35 0 0-35Z' fill='${fill}'/>`;
							if (grid[row][col] == 'black')
								g += `<text class='color' fill='#FFF'>K</text>`;
							else g += `<text class='color' fill='#000'>${letter}</text>`;
							module.svgContents += g + '</g>';
						}
					}
					const svg = `<svg class='skewers displayed' viewbox='-10 -10 420 420'>${module.svgContents}</svg>`;
					
					module.push({ label:'The colors are:', obj:svg });
				}
			},
			{
				regex: /will be always be at position (.)/,
				handler: function(matches, module) {
					module.firstSword = matches[1];
					module.push(matches.input);
				}
			},
			{
				regex: /At \d+ solves, the swords will be at: (.+)/,
				handler: function(matches, module) {
					let svg = `<svg class='skewers solution' viewbox='-100 -100 600 600'>` + module.svgContents;
					const swordParts = `<path class='handle' d='M-5 5a25 100 0 000 90l10 0a25 100 0 000-90z'/>
										<path class='blade' d='M-50 10l0 5a50 5 0 00100 0l0-5a50 15 0 01-40 0L10-250c0-10 0-25-10-50-10 25-10 40-10 50L-10 10a50 15 0 01-40 0z'/>
										<path class='bottom' d='M-10 97.5a20 15 0 0020 0l0-5a20 15 0 00-20 0z'/>`;
					let positions = { 
						'A':{ x:50, y:0, rot:180 },
						'9':{ x:150, y:0, rot:180 },
						'4':{ x:250, y:0, rot:180 },
						'C':{ x:350, y:0, rot:180 },
						'0':{ x:400, y:50, rot:-90 },
						'7':{ x:400, y:150, rot:-90 },
						'F':{ x:400, y:250, rot:-90 },
						'B':{ x:400, y:350, rot:-90 },
						'D':{ x:350, y:400, rot:0 },
						'8':{ x:250, y:400, rot:0 },
						'5':{ x:150, y:400, rot:0 },
						'1':{ x:50, y:400, rot:0 },
						'3':{ x:0, y:350, rot:90 },
						'E':{ x:0, y:250, rot:90 },
						'6':{ x:0, y:150, rot:90 },
						'2':{ x:0, y:50, rot:90 }
					};
					let swords = module.firstSword + matches[1];
					for (let sword of swords) {
						const position = positions[sword];
						svg += `<g class='sword' transform='translate(${position.x}, ${position.y}) rotate(${position.rot})'>${swordParts}</g>`
					}
					module.push([ matches.input, [{ obj:svg + '</svg>', nobullet:true }] ]);
				}
			},
			{
				regex: /You submitted/
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
		moduleID: 'starmap_reconstruction',
		loggingTag: 'Starmap Reconstruction',
		matches: [
			{
				regex: /(?:Answer example|Submitted map): ([\d\s-;]+)/,
				handler: function (matches, module) {
					const ans = matches[1];
					const r = 40;
					const diag = r * 0.707106781;
					const shrinkFactor = 0.1;
					let cncs = [ ];

					for (let i = 0; i < ans.length; i++) {
						if (ans[i] == '-')
							cncs.push( { a: ans[i - 1] - '0', b: ans[i + 1] - '0' } );
					}
					let svg = `<svg viewBox='-50 -50 100 100' style='width: 3.5in; margin: 0.5cm 0; display: block;'>
							   <circle r='50' fill='#222'/>
							   <circle r='40' fill='#000'/>`;

					let positions = [ {x:0, y:-r}, {x:diag, y:-diag}, {x:r, y:0}, {x:diag, y:diag}, {x:0, y:r}, {x:-diag, y:diag}, {x:-r, y:0}, {x:-diag, y:-diag} ];
					for (let con of cncs) {
						const dx = positions[con.b].x - positions[con.a].x;
						const dy = positions[con.b].y - positions[con.a].y;
						positions[con.a].x += shrinkFactor * dx;
						positions[con.b].x -= shrinkFactor * dx;
						positions[con.a].y += shrinkFactor * dy;
						positions[con.b].y -= shrinkFactor * dy;
					}
					let hue = 0;
					for (let con of cncs) {
						const p1 = positions[con.a];
						const p2 = positions[con.b];
						svg += `<line x1='${p1.x}' y1='${p1.y}' x2='${p2.x}' y2='${p2.y}' stroke='hsl(${hue}deg, 90%, 80%' stroke-width='2'/>`;
						hue += 360 / cncs.length;
					}

					for (let i = 0; i < 8; i++) {
						let color = Math.floor(Math.random() * 2) == 0 ? '#CDF' : '#FDB';
						svg += `<circle r='7.5' cx='${positions[i].x}' cy='${positions[i].y}' fill='${color}'/>`;
						svg += `<text x='${positions[i].x}' y='${positions[i].y}' text-anchor='middle' dominant-baseline='central' style='font-size: 95%'>${i}</text>`
					}
					module.push({ label:matches[0], obj:svg });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
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
		displayName: "Termite",
		moduleID: "termite",
		loggingTag: "Termite",
		matches: [
			{
				regex: /(The termite makes the moves:) (.+)/,
				handler: function (matches, module) {
					let div = $('<div>');
					div.text(matches[2]).css({ "white-space": "nowrap", "overflow-x": "scroll" });
					module.push({ label: matches[1], obj: div });
					return true;
				}
			},
			{
				//I = Light cyan | O = dark cyan
				regex: /The initial grid:/,
				handler: function (matches, module) {
					let lines = readTaggedLines(9).map(l => l.split(' '));;
					let table = $('<table>').css('table-collapse', 'collapse');
					for (let i = 0; i < 9; i++) {
						let tr = $('<tr>').appendTo(table);
						for (let j = 0; j < 9; j++)
							$('<td>').text(' ').css('text-align', 'center').css('border', 'solid').css('border-width', 'thin').css('width', '25px').css('height', '25px').css('background-color', lines[i][j] === 'I' ? '#00D9B9' : '#005B52').appendTo(tr);
					}
					module.push({ label: matches[0], obj: table });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: 'Tesseractivity',
		loggingTag: 'Tesseractivity',
		matches: [
			{
				regex: /Grid:/,
				handler: function(_, module) {
										const arrowHead = 'M-30 30 0 0 30 30 0 0';
					
					let svg = "<svg viewbox='-225 -225 2100 2100' style='display: block; width: 6.5in; margin: 0.25cm auto'>";
					svg += "<rect x='-50' y='-50' width='1925' height='1925' fill='#1B5EB2' rx='50' ry='50'/>";
					
					let grid = readTaggedLines(19).map(l => l.replace(/[^*#]/g, '').split('')
														).filter(l => l.length > 0);
					for (let w = 0; w < 4; w++) {
						for (let z = 0; z < 4; z++) {
							for (let y = 0; y < 4; y++) {
								for (let x = 0; x < 4; x++) {
									const xPosition = 475 * y + 100 * x;
									const yPosition = 475 * w + 100 * z;
									const fill = grid[4 * w + z][4 * y + x] == '#' ? '#FFF' : '#KKK'
									
									svg += `<rect x='${xPosition}' y='${yPosition}' width='100' height='100' fill='none' stroke='#5CF' stroke-width='15'/>`;	
									svg += `<circle r='20' cx='${xPosition + 50}' cy='${yPosition  + 50}' fill='${fill}'/>`;
								}
							}
						}
					}
					svg += `<line x1='35' x2='400' y1='-100' y2='-100' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(400, -100) rotate(90)'/>
							<text x='0' y='-100' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>X</text>
							
							<line x1='45' x2='1825' y1='-175' y2='-175' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(1825, -175) rotate(90)'/>
							<text x='0' y='-175' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>Y</text>
							
							<line x1='-100' x2='-100' y1='45' y2='400' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(-100, 400) rotate(180)'/>
							<text x='-100' y='0' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>Z</text>
							
							<line x1='-175' x2='-175' y1='45' y2='1825' stroke='#000' stroke-width='15'/>
							<path d='${arrowHead}' stroke='#000' stroke-width='15' transform='translate(-175, 1825) rotate(180)'/>
							<text x='-175' y='0' style='font-size: 100' font-style='italic' text-anchor='middle' dominant-baseline='central'>W</text>`;
					module.push({ label:'Grid', obj:svg + '</svg>' });
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
					module.push({ label: "Solution:", obj: pre(readTaggedLines(11).join('\n')) });
					return true;
				}
			},
			{
				regex: /Submitted solution:/,
				handler: function (matches, module) {
					module.push({ label: "Submitted:", obj: pre(readTaggedLines(11).join('\n')) });
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
		displayName: "The Tile Maze",
		moduleID: "theTileMazeModule",
		loggingTag: "The Tile Maze",
		matches: [
			{
				regex: /^Generated maze:$/,
				handler: function (matches, module) {
					let maze = readTaggedLines(7);
					module.tileMaze = maze;
					return true;
				}
			},
			{
				regex: /^Extra tile: (.)$/,
				handler: function (matches, module) {
					module.extraTile = matches[1];
					return true;
				}
			},
			{
				regex: /^Tile numbers:$/,
				handler: function (matches, module) {
					let tileNumbers = readTaggedLines(7);
					module.tileNumbers = tileNumbers;
					return true;
				}
			},
			{
				regex: /^Extra tile number: (.)$/,
				handler: function (matches, module) {
					module.extraNumber = matches[1];
					return true;
				}
			},
			{
				regex: /^Colors of corner tiles in reading order: ((?:(?:Red|Blue|Yellow|Green)(, |))+)$/,
				handler: function (matches, module) {
					const colorIndexes = ['00', '06', '60', '66']
					let cornerColors = matches[1].split(', ');
					let maze = [];
					for (let i = 0; i < 7; i++) {
						let mazeRow = [];
						for (let j = 0; j < 7; j++) {
							mazeRow.push(
								{
									'tile': module.tileMaze[i][j],
									'number': module.tileNumbers[i][j]
								}
							);
						}
						maze.push(mazeRow);
					}
					let table = $('<table>').css('border-collapse', 'collapse');
					for (let i = 0; i < 7; i++) {
						let tr = $('<tr>').appendTo(table);
						for (let j = 0; j < 7; j++) {
							let currentCell = maze[i][j];
							let cellColor = '';
							let td = $('<td>')
								.css('position', 'relative')
								.css('border', 'none')
								.css('width', '50px')
								.css('height', '50px')
								.css('background-color', '#103A86')
								.appendTo(tr);

							if (colorIndexes.includes(i.toString().concat(j)))
								cellColor = cornerColors[colorIndexes.indexOf(i.toString().concat(j))][0];

							let tile;
							let rotation;
							let number = currentCell.number == '-' ? ' ' : currentCell.number;
							switch (currentCell.tile) {
								case '╔':
								case '╚':
								case '╝':
								case '╗':
									tile = cellColor != '' ? `L tile ${cellColor}` : 'L tile';
									rotation = [0, 90, 180, 270]['╚╔╗╝'.indexOf(currentCell.tile)]
									break;
								case '═':
								case '║':
									tile = 'I tile';
									rotation = [0, 90]['║═'.indexOf(currentCell.tile)]
									break;
								case '╠':
								case '╩':
								case '╦':
								case '╣':
									tile = 'T tile';
									rotation = [0, 90, 180, 270]['╦╣╩╠'.indexOf(currentCell.tile)]
									break;
							}

							$('<img>')
								.attr('src', `img/The Tile Maze/${tile}.png`)
								.css('transform', `rotate(${rotation}deg)`)
								.css('height', '50px')
								.css('width', '50px')
								.css('vertical-align', 'middle')
								.appendTo(td);

							$('<div>')
								.text(number)
								.css('position', 'absolute')
								.css('left', '50%')
								.css('top', '50%')
								.css('transform', 'translate(-50%, -50%)')
								.css('font-weight', 'bold')
								.appendTo(td);
						}
					}
					module.push({ label: 'Generated maze:', obj: table });

					let div = $('<div>')
						.css('width', '50px')
						.css('height', '50px')
						.css('position', 'relative')
						.css('background-color', '#103A86');
					let tile;
					let rotation;
					let number = module.extraNumber == '-' ? ' ' : module.extraNumber;
					switch (module.extraTile) {
						case '╔':
						case '╚':
						case '╝':
						case '╗':
							tile = 'L tile';
							rotation = [0, 90, 180, 270]['╚╔╗╝'.indexOf(module.extraTile)]
							break;
						case '═':
						case '║':
							tile = 'I tile';
							rotation = [0, 180]['║═'.indexOf(module.extraTile)]
							break;
						case '╠':
						case '╩':
						case '╦':
						case '╣':
							tile = 'T tile';
							rotation = [0, 90, 180, 270]['╦╣╩╠'.indexOf(module.extraTile)]
							break;
					}

					$('<img>')
						.attr('src', `img/The Tile Maze/${tile}.png`)
						.css('transform', `rotate(${rotation}deg)`)
						.css('width', '50px').css('height', '50px')
						.appendTo(div);

					$('<div>')
						.text(number)
						.css('position', 'absolute')
						.css('left', '50%')
						.css('top', '50%')
						.css('transform', 'translate(-50%, -50%)')
						.css('font-weight', 'bold')
						.appendTo(div);
					module.push({ label: 'Extra tile:', obj: div });
					return true;
				}
			},
			{
				regex: /.+/,
			}
		]
	},
	{
		displayName: "Tombstone Maze",
		moduleID: "TombstoneMazeModule",
		loggingTag: "Tombstone Maze",
		matches: [
			{
				regex: /(Visible|Hidden) Maze:/,
				handler: function (matches, module){
					linen++;
					let grid = readTaggedLines(9).map(l => l.split(''));
					let svg = `<svg viewbox='0 0 20 20' style='display: block; width: 3in'>`;
					for (let row = 0; row < 4; row++){
						for (let col = 0; col < 4; col++) {
							let group = `<g transform='translate(${4 * col}, ${4 * row})'>`;
							if (grid[2 * row][2 * col + 1] == '─')
								group += `<rect x='0' y='0' width='5' height='1' fill='#000'/>`;
							if (grid[2 * row + 1][2 * col] == '│')
								group += `<rect x='0' y='0' width='1' height='5' fill='#000'/>`;
							if (row == 3)
								group += `<rect x='0' y='4' width='5' height='1' fill='#000'/>`;
							if (col == 3)
								group += `<rect x='4' y='0' width='1' height='5' fill='#000'/>`;
							svg += group + '</g>';
						}
					}
					module.push({label:matches[0], obj:svg});
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Torture",
		moduleID: "TortureModule",
		loggingTag: "Torture",
		matches: [
			{
				regex: /^(The initial state|The solution grid) is: (.+)$/,
				handler: function(matches, module)
				{
					let grid = [].concat.apply([], matches[2].split("|").map(x => x.split("")));
					let svg = `<br><svg width="200" height="200" viewbox="0 0 200 200">`
					for(let i = 0; i < 16; i++)
					{
						svg += `<rect x="${50 * (i % 4)}" y="${50 * Math.floor(i / 4)}" width="50" height="50" style="fill:${((i ^ (i >> 2)) & 1) == 1 ? "rgb(0, 192, 255)" : "rgb(0, 0, 0)"}" />`
						svg += `<text font-size='32' x="${50 * (i % 4) + 16}" y="${50 * Math.floor(i / 4) + 37}" style="fill:${((i ^ (i >> 2)) & 1) == 1 ? "rgb(0, 0, 0)" : "rgb(0, 192, 255)"}">${grid[i]}</text>`
					}
					module.largeSvg = `<br><svg width="900" height="900" viewbox="0 0 900 900">`
					module.push({label: `${matches[1]}` + (matches[1] == "The solution grid" ? " (press counts)" : "") + `: `, obj: svg});
				}
			},
			{
				regex: /^The matrix for tile ([ABCD][1234]) is: (.+)$/,
				handler: function(matches, module)
				{
					let grid = [].concat.apply([], matches[2].split("|").map(x => x.split("")));
					let partial = ``;
					let index = (matches[1].charCodeAt(0) - "A".charCodeAt(0)) * 4 + (matches[1].charCodeAt(1) - "1".charCodeAt(0));
					partial += `<rect x="${200 * (matches[1].charCodeAt(0) - "A".charCodeAt(0)) + 20 * (matches[1].charCodeAt(0) - "A".charCodeAt(0))}" y="${200 * (matches[1].charCodeAt(1) - "1".charCodeAt(0)) + 20 * (matches[1].charCodeAt(1) - "1".charCodeAt(0))}" width="220" height="220" style="fill:${((index ^ (index >> 2)) & 1) == 1 ? "rgb(0, 192, 255)" : "rgb(0, 0, 0)"}" />`
					for(let i = 0; i < 16; i++)
					{
						partial += `<rect x="${50 * (i % 4) + 200 * (matches[1].charCodeAt(0) - "A".charCodeAt(0)) + 20 * (matches[1].charCodeAt(0) - "A".charCodeAt(0)) + 10}" y="${50 * Math.floor(i / 4) + 200 * (matches[1].charCodeAt(1) - "1".charCodeAt(0)) + 20 * (matches[1].charCodeAt(1) - "1".charCodeAt(0)) + 10}" width="50" height="50" style="fill:${((i ^ (i >> 2)) & 1) == 1 ? "rgb(0, 192, 255)" : "rgb(0, 0, 0)"}" />`
						partial += `<text font-size='32' x="${50 * (i % 4) + 200 * (matches[1].charCodeAt(0) - "A".charCodeAt(0)) + 20 * (matches[1].charCodeAt(0) - "A".charCodeAt(0)) + 26}" y="${50 * (Math.floor(i / 4)) + 200 * (matches[1].charCodeAt(1) - "1".charCodeAt(0)) + 20 * (matches[1].charCodeAt(1) - "1".charCodeAt(0)) + 47}" style="fill:${((i ^ (i >> 2)) & 1) == 1 ? "rgb(0, 0, 0)" : "rgb(0, 192, 255)"}">${grid[i]}</text>`
						module.largeSvg += partial;
					}
					if(matches[1] == "D4")
					{
						module.push({label: "The offsets (larger tiles affect smaller tiles): ", obj: module.largeSvg});
					}
				}
			}
		]
	},
	{
		displayName: "Towers",
		moduleID: "Towers",
		loggingTag: "Towers",
		matches: [
			{
				regex: /^The puzzle is as follows:$/,
				handler: function (_, module) {
					let grid = readTaggedLines(5).map(l => l.split(' '));
					module.digits = [];
					module.grid = grid;
					return true;
				}
			},
			{
				regex: /^The clues along the (top|left|bottom|right) are ((?:\d ?){5})\.$/,
				handler: function (matches, module) {
					module.digits.push(matches[2].split(' '));
					if (matches[1] !== "right") {
						return true;
					}
					let table = $('<table>').css('table-collapse', 'collapse');
					for (let i = 0; i < 7; i++) {
						let tr = $('<tr>').appendTo(table);
						for (let j = 0; j < 7; j++) {
							let td = $('<td>').css('text-align', 'center').css('border', 'solid').css('border-width', 'thin').css('width', '25px').css('height', '25px').appendTo(tr);
							if (i === 0 || i === 6 || j === 0 || j === 6) {
								td.css('border', 'none');
							}
							if ((i === 0 || i === 6) && (j !== 0 || j !== 6)) {
								td.text(module.digits[i === 0 ? 0 : 2][j - 1]);
								continue;
							}
							if ((j === 0 || j === 6) && (i !== 0 || i !== 6)) {
								td.text(module.digits[j === 0 ? 1 : 3][i - 1]);
								continue;
							}
							if (i !== 0 && i !== 6 && j !== 0 && j !== 6)
								td.text(module.grid[i - 1][j - 1]);
						}
					}
					module.push({ label: "The puzzle is as follows:", obj: table });
					return true;
				}
			},
			{
				regex: /.+/,
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
		displayName: "Twister",
		moduleID: "TwisterModule",
		loggingTag: "Twister",
		matches: [
			{
				regex: /Placement #\d+ is a (.*) at (.*) dot #(\d) for Player (\d)/,
				handler: function (matches, module) {
					if (!("TwisterPages" in module))
						module.TwisterPages = [];
					module.TwisterPages.push({ message: matches[0], bodyPart: matches[1], color: matches[2], position: matches[3] - 1, player: matches[4] });
				}
			},
			{
				regex: /All stages have been completed./,
				handler: function (matches, module) {
					let paths = {
						hand: "m 33.961965,3.1344485 c -1.281461,0.6831352 -1.417781,3.301051 -1.47376,4.5779368 -0.195897,4.4732847 0.159077,8.9592367 0.157284,13.4201347 0,1.293413 0.219141,5.093277 -1.316481,5.626155 -2.043972,0.709297 -2.364685,-3.507735 -2.59647,-4.650572 C 27.910401,18.054338 27.808017,13.880772 26.964107,9.8399697 26.707113,8.6094162 26.192304,6.2250386 24.626006,6.0401756 22.488118,5.7878392 22.888842,9.7529351 23.036264,10.985594 c 0.510046,4.264718 1.21071,8.528496 1.904067,12.765501 0.179358,1.096021 0.707461,3.77089 -0.658681,4.319967 -1.188948,0.477885 -1.970938,-0.819609 -2.394811,-1.701407 -1.28437,-2.671917 -1.781489,-5.656267 -3.07556,-8.34603 -0.450657,-0.936741 -1.876014,-3.240095 -3.115505,-2.034398 -0.845333,0.822278 -0.275945,2.535598 -0.05139,3.506701 0.734362,3.175988 2.232213,6.152963 2.956508,9.328622 0.422342,1.851817 0.87281,3.694633 1.203215,5.564447 1.120759,6.342816 1.603375,15.45231 9.077194,17.641754 1.610207,0.471663 3.238013,0.68884 4.909812,0.688193 1.712205,-6.59e-4 3.65404,-0.312761 5.237124,-0.988345 3.587593,-1.531046 5.148256,-4.260236 7.23607,-7.343593 1.96768,-2.90628 3.896742,-5.881302 6.229069,-8.518684 1.034338,-1.169681 5.036815,-4.229795 3.327222,-6.005506 -0.768709,-0.798505 -2.114173,-0.610123 -3.044905,-0.227987 -2.310071,0.948576 -3.543245,2.893025 -5.24351,4.583962 -0.906511,0.901441 -2.660626,1.964092 -3.3318,0.16956 -0.566755,-1.515825 0.04294,-4.146667 0.220458,-5.727455 0.508648,-4.531429 1.396997,-9.048941 1.820715,-13.583802 0.147303,-1.576096 1.236777,-5.6743949 -0.833027,-6.4475156 -1.920558,-0.7173308 -2.499417,2.4309566 -2.815942,3.6652976 -0.954303,3.721829 -1.155765,7.577308 -2.171282,11.29255 -0.276579,1.011422 -0.92959,3.349467 -2.372084,3.031318 -1.61435,-0.355965 -1.148566,-3.326883 -1.148566,-4.504255 0,-4.652384 0.699802,-9.62568 0.09422,-14.2384354 -0.19002,-1.4465543 -0.312766,-6.1916633 -3.032959,-4.7416051 z",
						foot: "m 39.097924,1.3134231 c -4.216353,0.87897 -3.057448,7.35411 1.105825,6.47124 4.169592,-0.88424 3.007686,-7.32875998 -1.105825,-6.47124 m 9.464282,1.60022 c -1.710079,0.39535 -3.267713,1.49351 -3.84053,3.21509 -1.119885,3.36561 1.760789,7.7756869 5.592473,6.8564309 1.74357,-0.418287 3.271346,-1.34214 3.960433,-3.0650309 1.477066,-3.69241 -1.677537,-7.93921 -5.712376,-7.00649 m -17.994932,1.08535 c -4.19907,0.9178 -2.406085,7.2452549 1.737725,6.2875629 4.171014,-0.9639949 2.404696,-7.1929829 -1.737725,-6.2875629 m -6.63495,5.07348 c -4.30357,1.1907499 -2.635354,7.5282799 1.57975,6.4227399 3.974035,-1.04232 2.336087,-7.5061999 -1.57975,-6.4227399 m 14.691675,4.0742039 c -1.993644,0.262523 -4.012881,0.761929 -5.845075,1.636669 -1.252568,0.598014 -2.691483,1.453622 -3.678527,2.432862 -6.79065,6.73716 -5.007001,16.422607 -2.016013,24.614874 1.902587,5.211124 5.123334,13.425508 12.01354,12.432635 1.181179,-0.170297 2.21244,-0.692088 3.158868,-1.399026 4.146212,-3.096942 3.162343,-9.270608 1.079443,-13.245259 -1.091765,-2.083374 -2.779886,-4.29376 -2.683995,-6.792925 0.09652,-2.517647 1.799335,-3.8944 3.26945,-5.6871 2.546399,-3.104998 4.586804,-7.974104 1.337101,-11.373583 -0.787663,-0.824077 -1.499499,-1.394572 -2.527442,-1.887533 -1.308191,-0.627382 -2.648767,-0.92368 -4.10735,-0.731614 m -19.430924,3.334047 c -4.109467,0.950014 -2.381932,7.262063 1.737725,6.30979 4.100556,-0.948008 2.380288,-7.2617 -1.737725,-6.30979 z"
					};
					let div = document.createElement('div');
					div.innerHTML = `
						<div class='top' style='position: relative; background: #eef; padding: .1cm .25cm; margin: 0 auto .5cm; min-height: 1.5cm'>
							<button type='button' class='left' style='position: absolute; left: .1cm; top: 50%; transform: translateY(-50%); background: #ccf; border: 1px solid #88d; width: 1cm; height: 1cm; text-align: center;'>◀</button>
							<button type='button' class='right' style='position: absolute; right: .1cm; top: 50%; transform: translateY(-50%); background: #ccf; border: 1px solid #88d; width: 1cm; height: 1cm; text-align: center;'>▶</button>
							<div class='label' style='text-align: center; font-weight: bold; font-size: 18pt; position: absolute; left: 1.2cm; right: 1.2cm; top: 50%; transform: translateY(-50%)'></div>
						</div>
						<div class='bottom'></div>
					`;
					let label = div.querySelector('.label');
					let bottom = div.querySelector('.bottom');
					let curPage = 0;
					function setPage() {
						label.innerText = module.TwisterPages[curPage].message;
						let allDots = Array(24).fill(null);
						let colorNames = ["green", "yellow", "blue", "red"];
						for (let page = 0; page <= curPage; page++) {
							let bp = module.TwisterPages[page].bodyPart + " " + module.TwisterPages[page].player;
							let ix = allDots.indexOf(bp);
							if (ix !== -1)
								allDots[ix] = null;
							allDots[colorNames.indexOf(module.TwisterPages[page].color) + 4 * module.TwisterPages[page].position] = bp;
						}
						let svg = "";
						let colors = ["#00c850", "#ffb400", "#0096ff", "#ff3200"];
						for (let dot = 0; dot < 24; dot++) {
							svg += `<circle cx='${35 + 55 * (dot % 4)}' cy='${27 + 48 * ((dot / 4) | 0)}' r='20' fill='${colors[dot % 4]}' stroke='black' stroke-width='1.5'/>`;
							if (allDots[dot] !== null) {
								let data = allDots[dot].split(" ");
								//svg += `<path d='${paths[data[1]]}' fill='#a102ed' transform='translate(${55 * (dot % 4)}, ${48 * ((dot / 4) | 0)})'/>`;
								svg += `<path d='${paths[data[1]]}' fill='#a102ed' transform='translate(${55 * (dot % 4) + (data[0] === "right" ? 70 : 0)}, ${48 * ((dot / 4) | 0)})${data[0] === "right" ? " scale(-1 1)" : ""}'/>`;
								svg += `<text fill='white' stroke='black' stroke-width='1.5' paint-order='stroke' x='${35 + 55 * (dot % 4)}' y='${40 + 48 * ((dot / 4) | 0)}'>${data[2]}</text>`;
							}
						}
						bottom.innerHTML = `<svg viewBox='-30 0 300 296' text-anchor='middle'>${svg}</svg>`;
					}

					div.querySelector('.left').onclick = function () {
						curPage = Math.max(curPage - 1, 0);
						setPage();
					};
					div.querySelector('.right').onclick = function () {
						curPage = Math.min(curPage + 1, module.TwisterPages.length - 1);
						setPage();
					};

					module.push({ obj: div, nobullet: true });
					setPage();
					return true;
				}
			}
		]
	},
	{
		moduleID: 'twistyTerminals',
		loggingTag: 'Twisty Terminals',
		matches: [
			{
				regex: /(The initial configuration of the grid is|Solution|Submitted the following configuration):/,
				handler: function (matches, module) {
					const gap = 15;
					const grid = readTaggedLines(12).map(l => l.replace(/ /g, '').split(''));
					let svg = `<svg viewbox='-5 -5 470 470' style='width: 4in; display: block'>`;
					for (let row = 0; row < 4; row++) {
						for (let col = 0; col < 4; col++) {
							let group = `<g transform='translate(${(100 + gap) * col}, ${(100 + gap) * row})'>
											<rect width='100' height='100' stroke='#000' stroke-width='5' fill='#654'/>
											<circle r='12.5' cx='50' cy='50' stroke='#222' stroke-width='3' fill='#3C3333'/>`;
										//URDL
							const chars = [ grid[3*row + 0][3*col + 1], grid[3*row + 1][3*col + 2], grid[3*row + 2][3 * col + 1], grid[3*row + 1][3*col + 0] ];
							group += `<text font-size='37.5' transform='translate(50, 20) rotate(180)' fill='#FFF' text-anchor='middle' dominant-baseline='central'>${chars[0]}</text>`;
							group += `<text font-size='37.5' transform='translate(80, 50) rotate(270)' fill='#FFF' text-anchor='middle' dominant-baseline='central'>${chars[1]}</text>`;
							group += `<text font-size='37.5' transform='translate(50, 80) rotate(0)  ' fill='#FFF' text-anchor='middle' dominant-baseline='central'>${chars[2]}</text>`;
							group += `<text font-size='37.5' transform='translate(20, 50) rotate(90) ' fill='#FFF' text-anchor='middle' dominant-baseline='central'>${chars[3]}</text>`;

							svg += group + '</g>';
						}
					}
					module.push({ label:matches[0], obj:svg });
				}
			},
			{
				regex: /The following pairs/
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
		moduleID: 'GSUncolouredButtons',
		loggingTag: 'Uncoloured Buttons',
		matches: [
			{
				regex: /The grid of buttons:/,
				handler: function (match, module) {
					let grid = readLines(4).map(l => l.split(' '));
					let table = "<table class='blank-buttons'>";
					for (let row = 0; row < 4; row++) {
						table += "<tr>";
						for (let col = 0; col < 4; col++) {
							table += `<td class='${grid[row][col].toLowerCase()}'></td>`;
						}
						table += "</tr>";
					}
					module.push({ label: match.input, obj:table });
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		moduleID: "understand",
		loggingTag: "Understand",
		matches: [
			{
				regex: /Stage #\d+: (.+)/,
				handler: function (matches, module) {
					if (!module.stages)
						module.stages = [ ];
					const grid = matches[1].split(';').map(l => l.split(' '));
					const shapes = {
						'.':'M0 0',
						'Tu':'M-40 34.5H40L0-34.5Z',
						'Tr':'M34 0-34.5-40v80Z',
						'Td':'M-40-34.5H40L0 34.5Z',
						'Tl':'M-34 0 34.5-40v80Z',
						'St':'M0-35.9-7.4-10.1-34-11-11 3.7-21.2 29.4 0 12 21.2 29.4 11 3.7 34-11 7.4-10.1Z',
						'Sq':'M-36-36H36V36H-36Z',
						'H':'M0 36.8-33.1 3.7A11 11 90 010-30.4 11 11 90 0133.1 3.7Z',
						'D':'M0 36 36 0 0-36-36 0z',
						'O':'M-36 0A36 36 0 0036 0 36 36 0 00-36 0'
					};
					let svg = "<svg viewbox='-20 -20 860 860' style='display: block; width: 3in'>";
					svg += "<rect x='-20' y='-20' width='860' height='860' fill='#22222C' rx='20' ry='20'/>";
					let symbols = [ ];
					
					for (let row = 0; row < 7; row++) {
						for (let col = 0; col < 7; col++) {
							svg += `<rect x='${120 * row}' y='${120 * col}' width='100' height='100' fill='none' stroke='#888' stroke-width='5'/>`;
							if (grid[row][col] != '.')
								symbols.push(`<path transform='translate(${120 * row + 50}, ${120 * col + 50})' d='${shapes[grid[row][col]]}' fill='#222' stroke='#AAA' stroke-width='5' stroke-linejoin='round'/>`);
						}
					}
					module.stages.push(symbols);
					module.grid = svg;
				}
			},
			{
				regex: /Stage #(\d+) (solution|attempt): (..) ([urdl]+)(.*)/,
				handler: function(matches, module) {
					const stage = matches[1] - '1';
					let svg = module.grid;
					let symbols = module.stages[stage];
					let start = { x: 'ABCDEFG'.indexOf(matches[3][0]), y: matches[3][1] - '1' };
					let d = `M ${120 * start.x + 50} ${120 * start.y + 50} l `;
					for (let direction of matches[4]) {
						switch (direction){
							case 'u': d += '0 -120 '; break;
							case 'r': d += '120 0 '; break;
							case 'd': d += '0 120 '; break;
							case 'l': d += '-120 0 '; break;	
						}
					}
					svg += `<path d='${d}' stroke='#AAA' stroke-width='12' fill='none'/>`;
					for (let s of symbols)
						svg += s;
					svg += `<circle cx='${120 * start.x + 50}' cy='${120 * start.y + 50}' r='20' fill='#AAA'/>`
					
					if (matches[2] == 'solution')
						module.push({ label:`Stage #${matches[1]} solution:`, obj:svg});
					else module.push([ `Stage #${matches[1]} submission${matches[5]}`, [{ obj:svg + '</svg>', nobullet:true }] ]);
				}
			},
			{
				regex: /Rule #\d+.+/,
				handler: function (match, module) {
					if (!module.rules){
						module.rules = [ ];
						module.push([ 'Rules', module.rules ]);
					}
					module.rules.push(match[0]);
				}
			}
		]	
	},
	{
		moduleID: "unfairsForgottenCiphers",
		loggingTag: "Unfair's Forgotten Ciphers",
		displayName: "Unfair’s Forgotten Ciphers",
		matches: [
			{
				regex: /((?:Final binary string|Substituted Encodings|Binary string obtained from constucting up to this point|Encoded with the current Huffman Tree|Encoded With Keystring and Huffman Tree): )(.+)/,
				handler: function (matches, module) {
					module.push({ label: matches[1], obj:pre(matches[2]) });
					return true;
				}
			},
			{
				regex: /Constructing Huffman Tree for Digits/,
				handler: function(match, module) {
					module.buildDigits ??= [ ];
					module.buildMode = 'digits';
					module.push([ match.input, module.buildDigits ]);
					return true;
				}
			},
			{
				regex: /Resuming Constructing Huffman Tree for Letters/,
				handler: function(match, module) {
					module.buildLetters ??= [ ];
					module.buildMode = 'letters';
					module.push([ match.input, module.buildLetters ]);
					return true;
				}
			},
			{
				regex: /Leafing|Detected "/,
				handler: function(match, module) {
					if (module.buildMode == 'digits') 
						module.buildDigits.push(match.input);
					else if (module.buildMode == 'letters') 
						module.buildLetters.push(match.input);
					return true;
				}
			},
			{
				regex: /(Generated 3x3 Matrix in \d+ attempts: )(.+)/,
				handler: function(matches, module) {
					const data = matches[2].split(' ');
					module.push({ label: matches[0], obj: `<table class='ufc-matrix'>
						<tr> <td class='bracket top left'></td> <td>${data[0]}</td> <td>${data[1]}</td> <td>${data[2]}</td> <td class='bracket top right'></td> </tr>
						<tr> <td class='bracket left'></td> <td>${data[3]}</td> <td>${data[4]}</td> <td>${data[5]}</td> <td class='bracket right'></td> </tr>
						<tr> <td class='bracket bottom left'></td> <td>${data[6]}</td> <td>${data[7]}</td> <td>${data[8]}</td> <td class='bracket bottom right'></td> </tr> </table>` 
					});
					return true;
				}
			},
			{
				regex: /In Depth Huffman Key:/,
				handler: function(match, module) {
					const entries = readTaggedLine().split(', ');
					let table = "<table class='ufc-huffman-key'>";
					for (let entry of entries) {
						let entryMatch = entry.match(/\[([01]+): (\w)\]/);
						table += `<tr> <th>${entryMatch[1]}</th> <td>${entryMatch[2]}</td> </tr>`;
					}
					module.push([ match.input, [{ obj: table + '</table>', nobullet: true }]]);
					return true;
				}
			},
			{
				regex: /(In depth keystring to color: )(.+)/,
				handler: function(matches, module) {
					const entries = matches[2].split(', ');
					
					//Directly lifted from the manual with <text> elements removed
					let baseSVG = "<svg class='ufc-keystring-colors' viewBox='0 0 200 118.92'> <path d='M38.8 30.21v2.57h139.58V30.2z'></path> <path class='s' d='m32.48 109.15 1.2-1.2-4.2 1.2 4.2 1.2zm144.81 0-1.2 1.2 4.2-1.2-4.2-1.2z' fill-rule='evenodd' stroke='#000' stroke-width='2' transform='matrix(.95427 0 0 1 8.5 -77.65)'></path> <path d='M110.7 2.41q0 .76-.37 1.31t-1.08.82q.42.27.7.6.29.31.88 1.21l1.53 2.31h-1.48l-1.37-2.13q-.6-.97-1.06-1.3-.46-.34-.97-.34h-.56v3.77h-1.24V0h2.39q.82 0 1.42.34.6.32.9.88.3.55.3 1.2zm-1.27 0q0-.63-.38-.97-.37-.35-1.07-.35h-1.06V3.8h.8q.79 0 1.25-.29.46-.3.46-1.1z' aria-label='R'></path> <path class='s' d='M25.72 191.69v-2.25h5.73v2.25z' transform='matrix(1.85685 0 0 .53855 3.2 -81.36)' aria-label='-' stroke='#000' stroke-width='1.5'></path> <path class='s' d='M111.23 19.66q0 1.34-.38 2.36-.37 1-1.01 1.56-.63.54-1.4.54-.83 0-1.47-.56-.63-.56-.99-1.56-.35-1.01-.35-2.32 0-1.41.41-2.42.41-1 1.06-1.52.66-.5 1.38-.5.8 0 1.42.57.63.58.98 1.58t.35 2.27zm-2.81 3.32q.71 0 1.13-.87.43-.87.43-2.42 0-1.05-.2-1.8t-.56-1.13q-.36-.39-.8-.39-.44 0-.78.4-.35.38-.55 1.12-.2.74-.2 1.77 0 1.55.4 2.44.43.88 1.13.88z' stroke='#000' stroke-width='.8' aria-label='0'></path> <path d='M161.06 13.68h2.27v4.8h4.8v2.3h-4.8v4.79h-2.27v-4.8h-4.81V18.5h4.8z' aria-label='+'></path> <path d='M5.18 57.89q0 1.28-1.32 1.83.95.17 1.51.79.56.6.56 1.43 0 .81-.45 1.34-.45.54-1.17.78t-1.54.24H0v-8.66h2.5q1.28 0 1.98.62t.7 1.63zm-1.29.1q0-.66-.37-.96-.37-.3-1.23-.3H1.23v2.64h.88q.91 0 1.34-.39.44-.4.44-1zm.75 3.84q0-1.4-2.15-1.4H1.23v2.78h1.3q1.09 0 1.6-.34.52-.34.52-1.04z' aria-label='B'></path> <path d='M28.61 41.75h-2.57V80.8h2.57z'></path> <path class='s' d='m27.32 44.04 1.2 1.15-1.2-4.01-1.2 4zm0 34.47-1.2-1.14 1.2 4 1.2-4z' fill-rule='evenodd' stroke='#000' stroke-width='1.95'></path> <path class='s' d='M25.72 191.69v-2.25h5.73v2.25z' transform='matrix(1.85685 0 0 .53855 -37.57 -25.86)' aria-label='-' stroke='#000' stroke-width='1.5'></path> <path class='s' d='M18.47 60.7q0 1.35-.38 2.37-.37 1-1 1.55-.64.55-1.41.55-.83 0-1.47-.56-.63-.56-.98-1.56-.35-1.01-.35-2.32 0-1.41.4-2.42.42-1.01 1.07-1.52.65-.5 1.38-.5.8 0 1.42.57.62.58.97 1.58t.35 2.26zm-2.8 3.33q.7 0 1.13-.87.43-.87.43-2.42 0-1.05-.2-1.8-.21-.75-.57-1.13-.35-.39-.8-.39-.43 0-.78.4-.35.38-.55 1.12-.2.73-.2 1.76 0 1.56.41 2.45.42.88 1.12.88z' stroke='#000' stroke-width='.8' aria-label='0'></path> <path d='M14.81 38.26h2.27v4.8h4.81v2.3h-4.8v4.79H14.8v-4.8h-4.8v-2.28h4.8z' aria-label='+'></path> <path d='M75.03 90.63v-2.56H35.98v2.56z'></path> <path class='s' d='m72.74 89.35-1.14 1.2 4-1.2-4-1.2zm-34.47 0 1.15-1.2-4.01 1.2 4 1.2z' fill-rule='evenodd' stroke='#000' stroke-width='1.95'></path> <path d='M55.38 111.13q-.93 0-1.7.44-.77.44-1.22 1.2-.45.76-.45 1.7 0 .96.44 1.72t1.22 1.2q.78.44 1.76.44.48 0 .85-.08.37-.07 1.1-.3v-1.8h-1.66v-1.1h2.91v3.66q-1.55.7-3.17.7-1.57 0-2.63-.63-1.07-.64-1.6-1.64-.51-1.01-.51-2.09 0-1.22.58-2.26.59-1.03 1.66-1.65 1.08-.6 2.45-.6.75 0 1.42.15.67.16 1.62.58v1.26q-.73-.42-1.53-.66-.8-.24-1.54-.24z' aria-label='G'></path> <path d='M70.01 94.25h2.27v4.81h4.81v2.29h-4.8v4.8H70v-4.8h-4.8v-2.29H70z' aria-label='+'></path> <path class='s' d='M58.09 100.24q0 1.35-.38 2.36-.38 1.01-1.01 1.56-.64.54-1.41.54-.83 0-1.47-.55-.63-.56-.98-1.57-.35-1-.35-2.32 0-1.4.41-2.41.41-1.01 1.06-1.52.65-.51 1.38-.51.8 0 1.42.57.62.58.97 1.59.36 1 .36 2.26zm-2.82 3.32q.72 0 1.14-.86.43-.87.43-2.42 0-1.06-.2-1.8-.21-.76-.57-1.14-.35-.38-.8-.38-.43 0-.78.39-.34.39-.55 1.12-.2.74-.2 1.77 0 1.56.41 2.44.43.88 1.13.88z' stroke='#000' stroke-width='.8' aria-label='0'></path> <path class='s' d='M25.72 191.69v-2.25h5.73v2.25z' transform='matrix(1.85685 0 0 .53855 -13.58 -2.51)' aria-label='-' stroke='#000' stroke-width='1.5'></path> <rect x='32' y='38' width='14.5' height='14.5' fill='#44F'></rect><rect x='48.1' y='38' width='14.5' height='14.5' fill='#08F'></rect><rect x='64.2' y='38' width='14.5' height='14.5' fill='#0FF'></rect><rect x='85.30000000000001' y='38' width='14.5' height='14.5' fill='#80F'></rect><rect x='101.4' y='38' width='14.5' height='14.5' fill='#88F'></rect><rect x='117.5' y='38' width='14.5' height='14.5' fill='#8FF'></rect><rect x='138.60000000000002' y='38' width='14.5' height='14.5' fill='#F0F'></rect><rect x='154.70000000000002' y='38' width='14.5' height='14.5' fill='#F8F'></rect><rect x='170.8' y='38' width='14.5' height='14.5' fill='#FFF'></rect><rect x='32' y='54.1' width='14.5' height='14.5' fill='#448'></rect><rect x='48.1' y='54.1' width='14.5' height='14.5' fill='#088'></rect><rect x='64.2' y='54.1' width='14.5' height='14.5' fill='#0F8'></rect><rect x='85.30000000000001' y='54.1' width='14.5' height='14.5' fill='#808'></rect><rect x='101.4' y='54.1' width='14.5' height='14.5' fill='#888'></rect><rect x='117.5' y='54.1' width='14.5' height='14.5' fill='#8F8'></rect><rect x='138.60000000000002' y='54.1' width='14.5' height='14.5' fill='#F08'></rect><rect x='154.70000000000002' y='54.1' width='14.5' height='14.5' fill='#F88'></rect><rect x='170.8' y='54.1' width='14.5' height='14.5' fill='#FF8'></rect><rect x='32' y='70.2' width='14.5' height='14.5' fill='#000'></rect><rect x='48.1' y='70.2' width='14.5' height='14.5' fill='#080'></rect><rect x='64.2' y='70.2' width='14.5' height='14.5' fill='#0F0'></rect><rect x='85.30000000000001' y='70.2' width='14.5' height='14.5' fill='#844'></rect><rect x='101.4' y='70.2' width='14.5' height='14.5' fill='#880'></rect><rect x='117.5' y='70.2' width='14.5' height='14.5' fill='#8F0'></rect><rect x='138.60000000000002' y='70.2' width='14.5' height='14.5' fill='#F00'></rect><rect x='154.70000000000002' y='70.2' width='14.5' height='14.5' fill='#F80'></rect><rect x='170.8' y='70.2' width='14.5' height='14.5' fill='#FF0'></rect><rect x='170.9' y='38.1' width='14.3' height='14.3' fill='transparent' stroke='#000' stroke-width='0.3'></rect>";
					
					const positions = { 'Blue':[0,0,2], 'Azure':[0,1,2], 'Cyan':[0,2,2], 'Indigo':[0,0,1], 'Teal':[0,1,1], 'Jade':[0,2,1], 'Black':[0,0,0], 'Forest':[0,1,0], 'Green':[0,2,0], 'Violet':[1,0,2], 'Maya':[1,1,2], 'Aqua':[1,2,2], 'Plum':[1,0,1], 'Gray':[1,1,1], 'Mint':[1,2,1], 'Maroon':[1,0,0], 'Olive':[1,1,0], 'Lime':[1,2,0], 'Magenta':[2,0,2], 'Pink':[2,1,2], 'White':[2,2,2], 'Rose':[2,0,1], 'Salmon':[2,1,1], 'Cream':[2,2,1], 'Red':[2,0,0], 'Orange':[2,1,0], 'Yellow':[2,2,0] };
					const whiteText = [ 'Blue', 'Indigo', 'Black', 'Teal', 'Forest', 'Violet', 'Plum', 'Maroon', 'Olive', 'Rose', 'Red' ];
					const xBase = 39.2; //X POSITION OF BLACK
					const yBase = 78.7; //Y POSITION OF BLACK
					const xModBig = 53.3; //RED MODIFIER
					const xModSmall = 16.1; //GREEN MODIFIER
					const yMod = -16.1; //BLUE MODIFIER
					
					for (let entry of entries) {
						const entryMatch = entry.match(/\[([\w-]): (\w+)\]/);
						const channels = positions[entryMatch[2]];
						
						const xCoord = xBase + xModBig * channels[0] + xModSmall * channels[1];
						const yCoord = yBase + yMod * channels[2];
						const textColor = whiteText.includes(entryMatch[2]) ? '#FFF' : '#000';
						
						baseSVG += `<text x='${xCoord}' y='${yCoord}' fill='${textColor}'>${entryMatch[1]}</text>`;
					}
					module.push({ label:matches[1], obj:baseSVG + '</svg>' });
					return true;
				}
			},
			{
				regex: /.+/
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
					let sl = {
						"WA": { X: 125, Y: 50 },
						"OR": { X: 85, Y: 125 },
						"CA": { X: 65, Y: 285 },
						"NV": { X: 125, Y: 230 },
						"ID": { X: 185, Y: 155 },
						"MT": { X: 275, Y: 90 },
						"NM": { X: 300, Y: 385 },
						"WY": { X: 300, Y: 185 },
						"UT": { X: 220, Y: 260 },
						"AZ": { X: 200, Y: 375 },
						"CO": { X: 320, Y: 280 },
						"ND": { X: 420, Y: 90 },
						"SD": { X: 420, Y: 160 },
						"NE": { X: 430, Y: 230 },
						"KS": { X: 450, Y: 300 },
						"OK": { X: 455, Y: 365 },
						"TX": { X: 455, Y: 465 },
						"MN": { X: 515, Y: 130 },
						"IA": { X: 530, Y: 215 },
						"MO": { X: 555, Y: 300 },
						"AR": { X: 555, Y: 385 },
						"LA": { X: 560, Y: 470 },
						"WI": { X: 600, Y: 160 },
						"IL": { X: 605, Y: 260 },
						"MS": { X: 615, Y: 425 },
						"FL": { X: 780, Y: 510 },
						"AL": { X: 670, Y: 430 },
						"GA": { X: 735, Y: 420 },
						"SC": { X: 780, Y: 380 },
						"TN": { X: 670, Y: 355 },
						"NC": { X: 805, Y: 340 },
						"KY": { X: 700, Y: 310 },
						"WV": { X: 760, Y: 280 },
						"VA": { X: 810, Y: 300 },
						"MD": { X: 970, Y: 345 },
						"DE": { X: 970, Y: 310 },
						"IN": { X: 660, Y: 255 },
						"OH": { X: 720, Y: 245 },
						"PA": { X: 800, Y: 210 },
						"NJ": { X: 970, Y: 270 },
						"MI": { X: 685, Y: 190 },
						"NY": { X: 835, Y: 140 },
						"CT": { X: 970, Y: 225 },
						"RI": { X: 970, Y: 185 },
						"MA": { X: 970, Y: 145 },
						"VT": { X: 780, Y: 60 },
						"NH": { X: 850, Y: 60 },
						"ME": { X: 920, Y: 75 },
						"AK": { X: 100, Y: 500 },
						"HI": { X: 200, Y: 500 }
					};

					module.push({ obj: $SVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 996 602" id="main-map"/>`), nobullet: true, stateLoc: sl });

					let callback2 = () => {
						let mz = new USAMaze();
						if (parseInt(matches[1]) == 1) {
							mz = mz.USAMazeSetDefaultRules();
						} else {
							mz = mz.USAMazeSetRules(new MonoRandom(parseInt(matches[1])));
						}
						module.push(module.pop().obj.prepend(mz.svg[0].querySelector("#USAMap")));
					};

					let callback = () => {
						FileLoadCallbacks.Add('./js/USAMaze/USAMaze.js', callback2);
					};

					FileLoadCallbacks.Add('./js/MonoRandom.js', callback);

					return true;
				}

			},
			{
				regex: /Departing .+ \((..)\) to .+ \((..)\)\.$/,
				handler: function (matches, module) {
					let svg = module.pop();
					if (matches[1] == "HI" || matches[2] == "HI") {
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
					if (matches[1] == "HI" || matches[2] == "HI") {
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
				handler: function (matches, module) {
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
					let svg = "<svg class='valves' viewbox='0 0 30 10'> <rect width='30' height='10' ry='5' fill='#7F7F7F'/>";
					for (let i = 0; i < 3; i++)
						svg += `<circle cx='${5 + 10 * i}' cy='5' r='3.25' fill='${matches[2][i + 1] == 0 ? "#DDD" : "#222"}'/>`;
					module.push({ label:matches[1], obj:svg + '</svg>'});
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
					if (!module.Infos) {
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
						function setMaze(j) {
							Array.from(svg.querySelectorAll('.edgecircle')).forEach(ec => { ec.setAttribute('opacity', 0); });
							Array.from(svg.querySelectorAll('.edgelabel')).forEach(el => { el.textContent = ''; });
							Array.from(svg.querySelectorAll('.edgepath')).forEach(ep => { ep.setAttribute('stroke', 'black'); ep.setAttribute('stroke-width', '.0075'); });
							Array.from(svg.querySelectorAll('.room')).forEach(rl => { rl.setAttribute('fill', 'white'); });
							Array.from(svg.querySelectorAll('.roomlabel')).forEach(rl => { rl.textContent = ''; });
							Array.from(svg.querySelectorAll('.key')).forEach(key => { key.setAttribute('opacity', 0); });
							svg.querySelector('.arrow').setAttribute('opacity', 0);
							if (j.isRoom) {
								for (let rIx = 0; rIx < j.arr.length; rIx++) {
									svg.querySelector(`.roomlabel-${j.arr[rIx]}`).textContent = rIx;
									svg.querySelector(`.room-${j.arr[rIx]}`).setAttribute('fill', j.ix === rIx ? '#fdd' : '#dfd');
								}

								info1.innerText = `${j.old} % ${j.arr.length} = ${j.ix}`;
								info2.innerText = `Selecting room #${j.ix} out of ${j.arr.length} rooms`;
								info3.innerText = `${j.old} ÷ ${j.arr.length} = ${j.new}`;
							}
							else {
								for (let eIx = 0; eIx < j.passable.length; eIx++)
									svg.querySelector(`.edgepath-${j.passable[eIx]}`).setAttribute('stroke', 'rgba(0, 0, 0, .1)');

								if (j.isStep) {
									for (let eIx = 0; eIx < j.arr.length; eIx++) {
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
								else if (j.isFinal) {
									info1.innerText = ' ';
									info2.innerText = 'Final maze';
									info3.innerText = ' ';
									Array.from(svg.querySelectorAll('.key')).forEach(key => { key.setAttribute('opacity', 1); });
									svg.querySelector(`.room-${j.keys[0]}`).setAttribute('fill', '#ce2121');
									svg.querySelector(`.room-${j.keys[1]}`).setAttribute('fill', '#dddd41');
									svg.querySelector(`.room-${j.keys[2]}`).setAttribute('fill', '#3f7cf4');
								}
								else if (j.isStrike) {
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
								else if (j.isSolve) {
									info1.innerText = ' ';
									info2.innerText = 'Module solved!';
									info3.innerText = ' ';
								}
							}
						}
						setMaze(json);

						controlsDiv.querySelector('.left').onclick = function () {
							curPage = Math.max(curPage - 1, 0);
							setMaze(module.Infos[curPage]);
						};
						controlsDiv.querySelector('.right').onclick = function () {
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
		displayName: "Wander",
		moduleID: "WanderModule",
		loggingTag: "Wander",
		matches: [
			{
				regex: /Maze walls, (before|after) transformation:/,
				handler: function (matches, module) {
					if (matches[1] == 'before')
						module.beforeMaze = readTaggedLines(9);
					else 
						module.push({ label: matches[0], obj:module.genSVG(readTaggedLines(9)) });
					return true;
				}
			},
			{
				regex: /The color of the walls is (\w+)./,
				handler: function (matches, module) {
					module.genSVG = function (maze) {
						
						let svg = "<svg viewbox='-50 -50 500 500' style='width: 2in; display: block'>";
						svg += "<rect x='-50' y='-50' width='500' height='500' fill='#000' rx='33' ry='33'/>";
						
						const color = module.wallColor ?? '#FFF';
						for (let row = 0; row < 5; row++) {
							for (let col = 0; col < 5; col++) {
								let g = `<g transform='translate(${100 * col}, ${100 * row})'>`;
								g += `<circle r='15' fill='${color}'/>`;
								if (col != 4 && row != 4) {
									if (maze[2 * row][2 * col + 1] == '#')
										g += `<line x2='100' stroke='${color}' stroke-width='10'/>`;
									if (maze[2 * row + 1][2 * col] == '#')
										g += `<line y2='100' stroke='${color}' stroke-width='10'/>`;										
								}
								svg += g + '</g>';
							}
						}
						svg += `<line y1='400' x2='400' y2='400' stroke='${color}' stroke-width='10'/>`;
						svg += `<line x1='400' x2='400' y2='400' stroke='${color}' stroke-width='10'/>`;
						return svg + '</svg>';
					}
					const colors = { 'BLACK':'#888', 'RED':'#F00', 'GREEN':'#0F0', 'BLUE':'#00F', 'CYAN':'#0FF', 'MAGENTA':'#F0F', 'YELLOW':'#FF0', 'WHITE':'#FFF' };
					module.wallColor = colors[matches[1]];
					
					module.push(matches[0]);
					if (module.beforeMaze)
						module.push({ label:'Maze walls, before transformation:', obj:module.genSVG(module.beforeMaze) });
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
		displayName: 'Voltorb Flip',
		moduleID: 'VoltorbFlip',
		loggingTag: 'Voltorb Flip',
		matches: [
			{
				regex: /The grid on the module is as follows:/,
				handler: function (matches, module) {
					let linesRx = readLines(5).map(l => l.match(/([1-3*]) ([1-3*]) ([1-3*]) ([1-3*]) ([1-3*])/));
					let table = `<table>`;
					for (let row = 0; row < 5; row++){
						table += `<tr>`;
						for (let col = 0; col < 5; col++){
							let cell = linesRx[row][col + 1];
							if (cell == '*')
								cell = 'voltorb';
							table += `<td style="padding: 0"><img style="width: 1.5cm" src='img/Voltorb Flip/${cell}.png'></td>`;
						}
						table += `</td>`;
					}
					table += `</table>`;
					module.push({label:matches.input, obj:table});
				}
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
						'#101669', //'Indigo':
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
		moduleID: "wireTerminals",
		loggingTag: "Wire Terminals",
		matches: [
			{
				regex: /The configuration of wires is:/,
				handler: function (_, module) {
					let grid = readTaggedLines(15).map(l => l.split(''));
					module.hWires = [ ];
					for (let row = 0; row < 15; row += 2) {
						for (let col = 3; col < 15; col += 4) {
							module.hWires.push(grid[row][col]);
						}
					}
					module.vWires = [ ];
					for (let row = 3; row < 15; row += 4) {
						for (let col = 0; col < 15; col += 2) {
							module.vWires.push(grid[row][col]);
						}
					}
				}
			},
			{
				regex: /(.+)in these positions:/,
				handler: function (match, module) {
					let grid = readTaggedLines(15).map(l => l.split(''));
					if (!module.colors)
						module.colors = [ [], [], [], [] ];
					for (let row = 0; row < 4; row++) {
						for (let col = 0; col < 4; col++) {
							module.colors[row][col] = grid[row * 4 + 1][col * 4 + 1];
						}
					}

					module.hCut = [ ];
					for (let row = 0; row < 15; row += 2) {
						for (let col = 3; col < 15; col += 4) {
							module.hCut.push(grid[row][col]);
						}
					}
					module.vCut = [ ];
					for (let row = 3; row < 15; row += 4) {
						for (let col = 0; col < 15; col += 2) {
							module.vCut.push(grid[row][col]);
						}
					}

					const colors = { 'R':'#F00', 'B':'#00F', 'Y':'#FF0', 'W':'#EEE', 'K':'#222' };
					const xPath = 'M-30-8h60v16h-60z';

					let svg = `<svg viewbox='-5 -5 530 530' style='width: 4in; display: block'>`;
					for (let row = 0; row < 8; row++){
						for (let col = 0; col < 3; col++) {
							let ix = 3 * row + col;
							const hColor = colors[module.hWires[ix]];
							const x = 140 * col + 100;
							const y = 60 * row + 20 * Math.floor(row / 2) + 5;
							svg += `<rect x='${x - 5}' y='${y}' width='50' height='30' fill='${hColor}' stroke='#222' stroke-width='3'/>`;
							if (module.hCut[ix] == 'X'){
								svg += `<path transform='translate(${x + 20}, ${y + 15})' d='M-6.4-24v48h12.8v-48z' fill='#CCC' stroke='#000' stroke-width='3'/>`;
							} else if (module.hCut[ix] == '/') {
								svg += `<path transform='translate(${x + 20}, ${y + 15})' d='M-8-24v48h16v-48z' fill='#FFF' />`
							}
						}
					}
					for (let row = 0; row < 3; row++){
						for (let col = 0; col < 8; col++) {
							let ix = 8 * row + col;
							const vColor = colors[module.vWires[ix]];
							const x = 60 * col + 20 * Math.floor(col / 2) + 5;
							const y = 140 * row + 100;
							svg += `<rect x='${x}' y='${y - 5}' width='30' height='50' fill='${vColor}' stroke='#222' stroke-width='3'/>`;
							if (module.vCut[ix] == 'X'){
								svg += `<path transform='translate(${x + 15}, ${y + 20})' d='M-24-6.4h48v12.8h-48z' fill='#CCC' stroke='#000' stroke-width='3'/>`;
							} else if (module.vCut[ix] == '/') {
								svg += `<path transform='translate(${x + 15}, ${y + 20})' d='M-24-8h48v16h-48z' fill='#FFF'/>`;
							}
						}
					}
					for (let row = 0; row < 4; row++) {
						for (let col = 0; col < 4; col++) {
							const color = colors[module.colors[row][col]];
							svg += `<rect x='${140 * col}' y='${140 * row}' width='100' height='100' fill='#888' stroke='#222' stroke-width='5'/>
									<circle r='30' cx='${140 * col + 50}' cy='${140 * row + 50}' fill='${color}' stroke='#999' stroke-width='5'/>`;
						}
					}
					module.push({label:match[1] + 'in the positions marked below', obj:svg + '</svg>' });
				}
			},
			{
				regex: /The terminals transmit through these wires:/
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
		loggingTag: "The Witness",
		moduleID: "thewitness",
		matches: [
			{
				regex: /Generated Puzzle:/,
				handler: function (_, module) {
					let syms = readLines(4).map(l => l.replace(/\[The Witness #\d+\] \w\w Symbol: /, ''));
					
					let imgs = [ ];
					for (let row = 0; row < 2; row++){
						for (let col = 0; col < 2; col++) {
							let type = syms[2 * row + col].split(' ')[0];
							let transf = `translate(${100 * col + 15} ${100 * row + 15}) scale(0.7) `;
							if (type == 'LBlock'){
								let num = parseInt(syms[2 * row + col].match(/\d+/));
								transf += `rotate(${num} 50 50) `;
							}
							if (type == 'Empty')
								imgs.push(null);
							else imgs.push(`<g transform='${transf}'>
											<image href='img/The Witness/${type}.svg' width='100' height='100'/></g>`);
						}
					}
					
					let svg = `<svg style='display: block; width: 2in' viewbox='-30 -30 260 260'>
								<rect x='-30' y='-30' width='260' height='260' fill='#EDB' rx='5' ry='5' />
								<path d='m0 0h100v100h-100v-100zm100 0h100v100h-100v-100m-100 100h100v100h-100v-100m100 0h100v100h-100v-100zm100 100h20'
									stroke='#AAA' stroke-width='15' stroke-linejoin='round' stroke-linecap='round' fill='none'/>
								<circle r='20' fill='#AAA'/>`;
					for (let i = 0; i < 4; i++)
						if (imgs[i])
							svg += imgs[i];
					
					module.baseSvg = svg;
					module.push({ label:'Generated Puzzle:', obj:module.baseSvg + '</svg>' });
				}
			},
			{
				regex: /(Inputted|Possible solution) line crosses these intersections in reading order: "(.+)"/,
				handler: function (matches, module) {
					let nums = matches[2].split(', ').map(d => d - '1').map(num => num = { 
																				x: 100 * (num % 3), 
																				y: 100 * Math.floor(num / 3) });
					let svg = module.baseSvg + "<circle r='20' fill='#004'/>";
					let path = 'M 0 0';
					for (let num of nums) 
						path += ' L ' + num.x + ' ' + num.y;
					if (nums[nums.length - 1].x == '200' && nums[nums.length - 1].y == '200')
						path += ' h 20';
					svg += `<path d='${path}' stroke='#004' stroke-width='15' stroke-linejoin='round' stroke-linecap='round' fill='none'/>`;
					module.push( { label: matches[1] + ':', obj:svg + '</svg>'} );
				}
			},
			{
				regex: /That line is/
			}
		]
	},
	{
		displayName: "Who's That Monsplode?",
		moduleID: "monsplodeWho",
		loggingTag: "Who's that Monsplode?",
		icon: "Who's that Monsplode",
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
		moduleID: "Wordle",
		loggingTag: "Wordle",
		matches: [
			{
				regex: /Board reset/,
				handler: (_, module) => {
					const board = document.createElement("div");
					board.style.display = "inline-block";
					board.style.backgroundColor = "#121213";
					board.style.padding = "8px";
					board.style.margin = "20px 0";
					module.board = board;
					module.push({ obj: board });
					return true;
				}
			},
			{
				regex: /Board reveal start/,
				handler: (_, module) => {
					const row = document.createElement("div");
					row.style.whiteSpace = "nowrap";
					module.row = row;
					module.board.append(row);
					return true;
				}
			},
			{
				regex: /Board reveal letter (.) (.+)/,
				handler: (matches, module) => {
					const cell = document.createElement("div");
					cell.style.display = "inline-block";
					cell.style.whiteSpace = "nowrap";
					cell.style.fontSize = "30px";
					cell.style.fontWeight = 900;
					cell.style.textAlign = "center";
					cell.style.lineHeight = "40px";
					cell.style.margin = "2px";
					cell.style.width = "40px";
					cell.style.height = "40px";
					cell.innerText = matches[1];
					const state = matches[2];
					cell.style.backgroundColor = "#" + (state === "correct" ? "538d4e" : state === "present" ? "b59f3b" : "3a3a3c");
					module.row.append(cell);
					return true;
				}
			},
			{
				regex: /.+/
			}
		]
	},
	{
		displayName: "Wumbo",
		moduleID: "wumbo",
		loggingTag: "Wumbo",
		matches: [
			{
				regex: /.+/,
				handler: function (matches, module) {
					if (module.length === 0) {
						let button;
						module.push({ obj: button = $(`<button style='background: #ccf; border: 1px solid #88d; width: 3cm; height: 1cm; text-align: center;'>Show Log</button>`), nobullet: true });
						button.click(() => {
							button.parent().prop('outerHTML', module.hidden.map(o => `<li>${o}</li>`).join(""));
						});
						module.hidden = [];
					}
					module.hidden.push(`<span>${matches[0]}</span>`);
				}
			}
		]
	},
	{
		displayName: ["X-Ray", "Not X-Ray", "X-RGB"],
		moduleID: ["XRayModule", "NotXRayModule", "xrgb"],
		loggingTag: ["X-Ray", "Not X-Ray", "X-RGB"],
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
		icon: "Who's On First",
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
