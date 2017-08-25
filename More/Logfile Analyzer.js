// A list of internal port names used to convert to their display name.
var PortNames = {
	0: "Empty Port Plate",
	RJ45: "RJ-45",
	PS2: "PS/2",
	StereoRCA: "Stereo RCA",
	DVI: "DVI-D",
	Parallel: "Parallel",
	Serial: "Serial"
};

// A list of module ID's used to convert to their display name. If not put in this list convertID() will be used.
var ModuleNames = {
	// Vanilla
	Keypad: "Keypads",
	BigButton: "The Button",
	Venn: "Complicated Wires",
	Maze: "Mazes",
	Morse: "Morse Code",
	Password: "Passwords",
	Simon: "Simon Says",
	WireSequence: "Wire Sequences",
	WhosOnFirst: "Who’s on First",
	NeedyVentGas: "Venting Gas",
	NeedyCapacitor: "Capacitor Discharge",
	NeedyKnob: "Knobs",

	// Modded
	switchModule: "Switches",
	monsplodeFight: "Monsplode, Fight!",
	monsplodeWho: "Who's That Monsplode?",
	graphModule: "Connection Check",
	CryptModule: "Cryptography",
	MusicRhythms: "Rhythms",
	shapeshift: "Shape Shift",
	http: "HTTP Response",
	spwiz3DMaze: "3D Maze",
	DoubleOhModule: "Double-Oh",
	TicTacToeModule: "Tic-Tac-Toe",
	LetterKeys: "Lettered Keys",
	colormath: "Color Math",
	ColourFlash: "Color Flash",
	RubiksCubeModule: "Rubik’s Cube",
	RockPaperScissorsLizardSpockModule: "Rock-Paper-Scissors-Lizard-Spock",
	fizzBuzzModule: "FizzBuzz",
	ModuleAgainstHumanity: "Modules Against Humanity",
	BitOps: "Bitwise Operators",
	TurnTheKeyAdvanced: "Turn The Keys",
	LEDEnc: "LED Encryption",
	booleanVennModule: "Boolean Venn Diagram",
	XRayModule: "X-Ray",
	screw: "The Screw",
	MorseAMaze: "Morse-A-Maze",

	// Hexicube's Modules
	ButtonV2: "Square Button",
	PasswordV2: "Safety Safe",
	MemoryV2: "Forget Me Not",
	MazeV2: "Plumbing",
	KeypadV2: "Round Keypad",
	MorseV2: "Morsematics",
	SimonV2: "Simon States",
	NeedyKnobV2: "Rotary Phone",
	NeedyVentV2: "Answering Questions",
};

// A list of blacklisted strings for the filtered logs.
var blacklist = [
	"[Assets.Scripts.Pacing.PaceMaker]",
	"[Assets.Scripts.Services.Steam.ServicesSteam]",
	"[BombGenerator] Instantiated EmptyComponent",
	"[BombGenerator] Filling remaining spaces with empty components.",
	"[BombGenerator] BombTypeEnum: Default",
	"[Assets.Scripts.Stats.StatsManager]",
	"[Assets.Scripts.Platform.Common.IO.FileUtilityHelper]",
	"[Assets.Scripts.DossierMenu.MenuPage]",
	"[Assets.Scripts.Settings.PlayerSettingsManager]",
	"[Assets.Scripts.Leaderboards.LeaderboardBulkSubmissionWorker]",
	"[Assets.Scripts.Missions.MissionManager]",
	"[Assets.Scripts.Props.AlarmClock]",
	"[BombGenerator] Instantiated TimerComponent",
	"[BombGenerator] Instantiating RequiresTimerVisibility components on",
	"[BombGenerator] Instantiating remaining components on any valid face.",
	"[PrefabOverride]",
	"[Rules]",
	"Tick delay:",
	"Calculated FPS: "
];

// A list of modules that don't log.
var noLogging = [
	"alphabet",
	"AnagramsModule",
	"CrazyTalk",
	"EnglishTest",
	"Listening",
	"Microcontroller",
	"SeaShells",
	"TurnTheKeyAdvanced",
	"TurnTheKey",
	"WordScrambleModule",
	"ForeignExchangeRates",
	"Probing",
	"NumberPad",
	"OrientationCube",
	"shapeshift",
	"switchModule",
	"Simon"
];

// Search for 'var lineRegex' for the list of all the line matching regex & the reference.

$(function() {
	// Read Logfile
	var readwarning = false;
	var buildwarning = false;
	var debugging = (window.location.protocol == "file:");
	var linen = 0;
	var lines = [];

	function readPaste(clipText, bombSerial) {
		var url = clipText;
		try { url = decodeURIComponent(clipText); } catch (e) {}

		if (/^https?:\/\//.exec(url)) { // Very basic regex to detect a URL being pasted.
			$.get("/proxy/" + url, function(data) {
				parseLog(data, url, bombSerial);
			}).fail(function() {
				toastr.error("Unable to get logfile from URL.", "Upload Error");
			});
		} else {
			parseLog(clipText, null, bombSerial);
		}
	}

	function makeExpandable(parent, label) {
		parent
			.addClass('expandable')
			.append($("<a href='#'>")
				.addClass("expander")
				.text(label)
				.click(function() { parent.toggleClass("expanded"); return false; }));
	}

	function makeTree(tree, parent) {
		try {
			tree.forEach(function(node) {
				if (node !== null) {
					var elem = $("<li>").appendTo(parent);

					if (typeof (node) === "function") {
						node($("<span>").appendTo(elem));
					} else if (node instanceof $) {
						elem.append(node);
					} else if (typeof (node) === "string") {
						elem.text(node);
					} else if (node instanceof Array) {
						makeExpandable(elem, node[0]);
						if (node[2])
							elem.addClass("expanded");
						makeTree(node[1].length ? node[1] : [$("<em>").text("(none)")], $("<ul>").appendTo(elem));
					} else if (typeof (node) === "object" && "label" in node && "obj" in node) {
						if (node.expandable) {
							makeExpandable(elem, node.label);
							if (node.expanded)
								elem.addClass("expanded");
							elem.append(node.obj);
						} else {
							elem.text(node.label).append(node.obj);
						}
					} else if (typeof(node) === "object" && "label" in node) {
						elem.html(node.label);
					} else {
						console.log("Unrecognized node: " + node);
						console.log(node);
					}
				}
			});
		} catch (e) {
			console.log(e);

			if (!buildwarning) {
				buildwarning = true;
				toastr.warning("An error occurred while generating the page. Some information might be missing.", "Page Generation Warning");
			}
		}
	}

	function selectBomb(serial) {
		var a = $(".bomb[data-serial='" + serial + "']");
		var div = $("#bomb-" + serial);
		if ((!a.length || !div.length) && $('a.bomb').length) {
			serial = $('a.bomb').last().data('serial');
			a = $(".bomb[data-serial='" + serial + "']");
			div = $("#bomb-" + serial);
		}
		if (!a.length || !div.length)
			return false;
		$(".bomb.selected").removeClass("selected");
		a.addClass("selected");
		$(".bomb-info").hide();
		div.show();
		window.location.hash = '#bomb-' + serial;
		return false;
	}

	function convertID(id) {
		return (id.substring(0, 1).toUpperCase() + id.substring(1)).replace(/module$/i, "").replace(/^spwiz/i, "").replace(/(?!\b)([A-Z])/g, " $1");
	}

	function getModuleName(name) {
		return ModuleNames[name] || convertID(name);
	}

	// Convert noLogging to display names.
	noLogging = noLogging.map(getModuleName);


	// http://stackoverflow.com/a/1267338
	function zeroFill(number, width) {
		width -= number.toString().length;
		if (width > 0) {
			return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
		}
		return number + ""; // always return a string
	}

	function formatTime(seconds) {
		var date = new Date(seconds * 1000);

		return zeroFill(date.getUTCMinutes(), 2) + ":" + zeroFill(date.getUTCSeconds(), 2) + "." + zeroFill(date.getUTCMilliseconds(), 2).substring(0, 2);
	}

	$.fn.addCardClick = function(info) {
		var infoCard = $(this);
		var parent = infoCard.parent();
		infoCard
		.click(function() {
			parent.parent().children(".module-info").hide();
			info.show();
			parent.children(".selected").removeClass("selected");
			infoCard.addClass("selected");

			return false;
		}).mousedown(function() { return false; });

		return infoCard;
	};

	function BombGroup() {
		var current = this;
		this.Bombs = [];
		this.Modules = {};
		this.State = "Unsolved";
		this.Solved = 0;
		this.MissionName = "Unknown";
		this.StartLine = 0;
		this.FilteredLog = "";

		this.PacingEvents = [];

		Object.defineProperty(this, "isSingleBomb", {
			get: function() {
				return this.Bombs.length == 1;
			}
		});

		this.ToHTML = function(url) {
			// Build up the bomb.
			var serial = this.Bombs[0].Serial;
			var info = $("<div class='bomb-info' id='bomb-" + serial + "'>").hide().appendTo($("#wrap"));
			var fragment = (url ? '#url=' + url + ';' : '#') + 'bomb-' + serial;
			var bombHTML = $("<a href='" + fragment + "' class='bomb' data-serial='" + serial + "'>")
				.appendTo($("#bombs"))
				.click(function() { selectBomb(serial); return false; })
				.mousedown(function() { return false; });

			var TotalModules = 0;
			var Needies = 0;
			this.Bombs.forEach(function(bomb) {
				TotalModules += bomb.TotalModules;
				Needies += bomb.Needies;
			});

			this.Bombs.forEach(function(bomb) {
				$("<div class='serial'>").text(bomb.Serial).appendTo(bombHTML);

				// Build the edgework.
				var edgework = $("<div class='edgework'>").appendTo(info);

				$("<div class='widget serial'>").text(bomb.Serial).appendTo(edgework);

				if (bomb.Batteries.length > 0) {
					edgework.append("<div class='widget separator'>");

					bomb.Batteries.sort().reverse();
					bomb.Batteries.forEach(function(val) {
						$("<div class='widget battery'>")
							.addClass(val == 1 ? "d" : "aa")
							.appendTo(edgework);
					});
				}

				if (bomb.Indicators.length > 0) {
					edgework.append("<div class='widget separator'>");

					bomb.Indicators.sort(function(ind1, ind2) {
						if (ind1[0] < ind2[0]) return -1;
						if (ind1[0] > ind2[0]) return 1;
						if (ind1[1] < ind2[1]) return -1;
						if (ind1[1] > ind2[1]) return 1;
						return 0;
					});

					bomb.Indicators.forEach(function(val) {
						$("<div class='widget indicator'>")
							.addClass(val[0])
							.appendTo(edgework)
							.append($("<span class='label'>").text(val[1]));
					});
				}

				if (bomb.PortPlates.length > 0) {
					edgework.append("<div class='widget separator'>");

					bomb.PortPlates.forEach(function(val) {
						var plate = $("<div class='widget portplate'>").appendTo(edgework);
						val.forEach(function(port) {
							$("<span>").addClass(port.toLowerCase()).appendTo(plate);
						});
					});
				}
			});

			$("<div class='module-count'>").text(TotalModules).appendTo(bombHTML);
			if (Needies > 0) {
				$("<div class='needy-count'>").text(Needies).appendTo(bombHTML);
			}

			// Modules
			var modules = $("<div class='modules'>").appendTo(info);

			// Mission Information
			var missioninfo = $("<div class='module-info'>").appendTo(info);

			var missionInfoTree = [
				"Mission: " + this.MissionName
			];

			if (this.isSingleBomb) {
				var singleBomb = this.Bombs[0];
				missionInfoTree.push(
					"State: " + singleBomb.State,
					"Strikes: " + singleBomb.Strikes + "/" + singleBomb.TotalStrikes,
					"Total Time: " + formatTime(singleBomb.Time),
					"Time Left: ~" + formatTime(singleBomb.TimeLeft)
				);
			} else {
				missionInfoTree.push("State: " + this.State);
			}
			makeTree(missionInfoTree, $("<ul>").appendTo(missioninfo));

			$("<a href='#' class='module'>")
			.text("Mission Information")
			.appendTo(modules)
			.addCardClick(missioninfo).click();

			// Edgework Information
			this.Bombs.forEach(function(bomb, n) {
				var ind = [];

				bomb.Indicators.forEach(function(val) {
					ind.push(val[0] + " " + val[1]);
				});

				var ports = {};
				bomb.PortPlates.forEach(function(plate) {
					plate.forEach(function(port) {
						if (!ports[port]) {
							ports[port] = 0;
						}

						ports[port]++;
					});
				});

				var portlist = [];
				Object.keys(ports).forEach(function(port) {
					var count = ports[port];
					portlist.push((count > 1 ? count + " × " : "") + PortNames[port]);
				});

				var batteries = 0;
				bomb.Batteries.forEach(function(val) {
					batteries += val;
				});

				var edgeinfo = $("<div class='module-info'>").appendTo(info);
				makeTree([
					"Serial: " + bomb.Serial,
					"Batteries: " + batteries,
					"Holders: " + bomb.Batteries.length,
					"Ports: " + portlist.join(", "),
					"Indicators: " + ind.join(", "),
					"Port Plates: " + bomb.PortPlates.length,
					"Widgets: " + (bomb.Batteries.length + ind.length + bomb.PortPlates.length + bomb.ModdedWidgets),
				], $("<ul>").appendTo(edgeinfo));

				$("<a href='#' class='module'>")
				.text(!current.isSingleBomb ? "Edgework #" + (n + 1) : "Edgework")
				.appendTo(modules)
				.addCardClick(edgeinfo);
			});

			// Convert modules
			this.Bombs.forEach(function(bomb) {
				for (var m in bomb.Modules) {
					if (bomb.Modules.hasOwnProperty(m)) {
						var mod = bomb.Modules[m];
						if (mod.IDs.length > 0 || mod.Info.length > 0 || !current.Modules[m]) {
							current.Modules[m] = mod;
						}
					}
				}
			});

			var mods = [];
			for (var m in this.Modules) {
				if (this.Modules.hasOwnProperty(m)) {
					var mod = this.Modules[m];
					var name = getModuleName(m);

					if (mod.IDs.length === 0) {
						if (mod.Info.length === 0) {
							mods.push([name]);
						} else {
							mods.push([name, mod.Info]);
						}
					} else if (mod.IDs.length == 1) {
						mods.push([name, mod.IDs[0][1]]);
					} else {
						mod.IDs.forEach(function(info) {
							mods.push([name, info[1], info[0]]);
						});
					}
				}
			}

			mods = mods.sort(function(a, b) {
				if (a[2]) {
					a = a[0] + a[2];
				} else {
					a = a[0];
				}

				if (b[2]) {
					b = b[0] + b[2];
				} else {
					b = b[0];
				}

				if (a < b) {
					return -1;
				} else if (a > b) {
					return 1;
				}

				return 0;
			});

			// Filtered log
			if (this.FilteredLog === "") {
				this.FilterLines();
			}

			var loginfo = $("<div class='module-info'>").appendTo(info);
			$("<h3>").text("Filtered Log").appendTo(loginfo);
			$("<pre>").css("white-space", "pre-wrap").text(this.FilteredLog).appendTo(loginfo);

			var filteredTab = $("<a href='#' class='module'>")
			.text("Filtered Log");

			// Display modules
			mods.forEach(function(minfo) {
				// Information
				var modinfo = $("<div class='module-info'>").appendTo(info);
				$("<h3>").text(minfo[0]).appendTo(modinfo);
				if (minfo[1]) {
					makeTree(minfo[1], $("<ul>").appendTo(modinfo));
				} else if (noLogging.indexOf(minfo[0]) > -1) {
					$("<p>").text("No information logged.").appendTo(modinfo);
				} else {
					$("<p>")
					.text("No information could be parsed. Please check the ")
					.append($('<a href="#' + serial + '">Filtered Log</a>').click(function() {
						filteredTab.click();
					}))
					.append('.')
					.appendTo(modinfo);
				}

				// Listing
				var mod = $("<a href='#' class='module'>")
				.text(minfo[0] + (minfo[2] ? " " + minfo[2] : ""))
				.appendTo(modules)
				.addCardClick(modinfo);
				$("<img>")
				.on("error", function() {
					$(this).attr("src", "../Icons/blank.png");
				}).attr("src", "../Icons/" + minfo[0] + ".png").appendTo(mod);
			});

			filteredTab
			.appendTo(modules)
			.addCardClick(loginfo);

			var pacinginfo = $("<div class='module-info'>").appendTo(info);
			$("<h3>").text("Pacing Info").appendTo(pacinginfo);
			$("<pre>").css("white-space", "pre-wrap").text(this.PacingEvents.join("\n")).appendTo(pacinginfo);

			$("<a href='#' class='module'>")
			.text("Pacing Info")
			.appendTo(modules)
			.addCardClick(pacinginfo);

			return bombHTML;
		};
		this.GetMod = function(name, id) {
			var mod;
			this.Bombs.forEach(function(bomb) {
				mod = (mod || bomb.GetMod(name, id));
			});

			return mod;
		};
		this.GetModule = function(name) {
			var mod;
			this.Bombs.forEach(function(bomb) {
				mod = (mod || bomb.GetModule(name));
			});

			return mod;
		};
		this.GetModuleID = function(name, id) {
			var mod;
			this.Bombs.forEach(function(bomb) {
				mod = (mod || bomb.GetModuleID(name, id));
			});

			return mod;
		};
		this.FilterLines = function() {
			if (!this.StartLine) {
				return;
			}

			var log = "";
			for (var i = this.StartLine; i < linen; i++) {
				var line = lines[i];

				var blacklisted = false;
				blacklist.forEach(function(val) {
					blacklisted = blacklisted || line.includes(val);
				});

				if (line.match(/\[BombGenerator\] Module type ".+" in component pool,/)) {
					blacklisted = true;
					i += 3;
				}

				if (!blacklisted) {
					log += line + "\n";
				}
			}

			this.StartLine = undefined;
			this.FilteredLog = log.replace(/\n{3,}/g, "\n\n");
		};
	}

	function Bomb(seed) {
		this.Seed = seed;
		this.Time = 0;
		this.TimeLeft = 0;
		this.Strikes = 0;
		this.TotalStrikes = 0;
		this.Modules = {};
		this.TotalModules = 0;
		this.Needies = 0;
		this.Indicators = [];
		this.Batteries = [];
		this.ModdedWidgets = 0;
		this.PortPlates = [];
		this.Serial = "";
		this.State = "Unsolved";
		this.StartLine = 0;
		this.FilteredLog = "";

		this.PacingEvents = [];

		this.GetMod = function(name) {
			if (!(name in this.Modules) && debugging) {
				console.warn("Unable to find module: " + name);
			}

			return this.Modules[name];
		};
		this.GetModule = function(name) {
			var mod = this.GetMod(name);
			return mod ? mod.Info : undefined;
		};
		this.GetModuleID = function(name, id) {
			var mod = this.GetMod(name);
			if (!mod) {
				return undefined;
			}

			var module = this.GetMod(name).IDs;

			if (parseInt(id) > 2147483646) {
				console.error("ID is larger than a 32 bit int, make sure your module counts from 1.");
				return null;
			}

			if (id === undefined) {
				id = this.GetMod(name).IDs.length;
			}

			module.forEach(function(mod) {
				if (mod[0] == "#" + id) {
					info = mod[1];
				}
			});

			if (info) {
				return info;
			}

			var info = ["#" + id, []];
			module.push(info);

			return info[1];
		};
		this.FilterLines = function() {
			if (!this.StartLine) {
				return;
			}

			var log = "";
			for (var i = this.StartLine; i < linen; i++) {
				var line = lines[i];

				var blacklisted = false;
				blacklist.forEach(function(val) {
					blacklisted = blacklisted || line.includes(val);
				});

				if (line.match(/\[BombGenerator\] Module type ".+" in component pool,/)) {
					blacklisted = true;
					i += 3;
				}

				if (!blacklisted) {
					log += line + "\n";
				}
			}

			this.StartLine = undefined;
			this.FilteredLog = log.replace(/\n{3,}/g, "\n\n");
		};
	}

	function parseLog(log, url, bombSerial) {
		//log = $("<div>").text(log).html(); // Escape any HTML.
		log = log.replace(/\r/g, "");

		if (!(/^Initialize engine version: .+ (.+)/.exec(log))) {
			toastr.error("Invalid logfile.", "Reading Error");
			return false;
		}

		var bombgroup;
		var bomb;
		var parsed = [];

		function GetBomb() {
			return bombgroup || bomb;
		}

		function pre(line) {
			return $('<pre>').text(line.replace(/^\n/g, ""));
		}

		function readDirectly(line, name, id) {
			if (line instanceof Array) {
				line.forEach(function(val) {
					readDirectly(val, name, id);
				});
				return;
			}

			if (id) {
				GetBomb().GetModuleID(name, id).push(line);
			} else {
				GetBomb().GetModule(name).push(line);
			}
		}

		lines = log.split("\n");
		linen = 0;

		function readLine() {
			linen++;
			return lines[linen];
		}

		function readMultiple(count, fnc) {
			var lines = '';
			for (var i = 0; i < count; i++) {
				lines += (i === 0 ? '' : "\n") + (fnc ? fnc(readLine()) : readLine());
			}
			return lines;
		}

		// A list used for matching lines and executing a function if it matches the line.
		var lineRegex = {
			// Reset Bomb Group
			"State": [
				{
					regex: /Enter GameplayState/,
					value: function() {
						bombgroup = undefined;
					}
				}
			],

			// Bombs
			"Bomb": [
				{
					regex: /Strike! (\d+) \/ \d+ strikes/,
					value: function(matches) {
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
					value: function() {
						GetBomb().FilterLines();
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
					value: function() {
						if (bombgroup.isSingleBomb) {
							bomb.FilterLines();
							bomb.State = "Solved";
							bomb.Solved = bomb.TotalModules;
						}
					}
				}
			],
			"BombComponent": [
				{
					regex: /Pass/,
					value: function() {
						GetBomb().Solved++;
					}
				}
			],
			"BombGenerator": [
				{
					regex: /Generating bomb with seed (\d+)/,
					value: function(matches) {
						bomb = new Bomb(parseInt(matches[1]));

						if (!bombgroup) {
							bombgroup = new BombGroup();
							bombgroup.StartLine = linen;

							parsed.push(bombgroup);
						}

						bombgroup.Bombs.push(bomb);
					}
				},
				{
					regex: /Generator settings: Time: (\d+), NumStrikes: (\d+)/,
					value: function(matches) {
						bomb.Time = parseInt(matches[1]);
						bomb.TimeLeft = bomb.Time;
						bomb.TotalStrikes = parseInt(matches[2]);
					}
				},
				{
					regex: /Selected ([\w ]+) \(.+ \((.+)\)\)/,
					value: function(matches) {
						bomb.Modules[matches[1]] = {
							IDs: [],
							Info: []
						};

						bomb.TotalModules++;
						if (matches[2].includes("Needy")) {
							bomb.Needies++;
						}

					}
				},
				{
					regex: /Instantiated CryptModule on face/,
					value: function() {
						var mod = bomb.GetModule("CryptModule");
						mod.push("Phrase: " + lines[linen - 2]);
						mod.push("Answer: " + lines[linen - 1]);
					}
				}
			],

			// Widgets
			"WidgetGenerator": [
				{
					regex: /Added widget: (.+) at/,
					value: function(matches) {
						if (matches[1] == "ModWidget") {
							bomb.ModdedWidgets++;
						}
					}
				}
			],
			"BatteryWidget": [
				{
					regex: /Randomizing Battery Widget: (\d)/,
					value: function(matches) {
						bomb.Batteries.push(parseInt(matches[1]));
					}
				}
			],
			"PortWidget": [
				{
					regex: /Randomizing Port Widget: (.+)/,
					value: function(matches) {
						if (matches[1] != "0") {
							bomb.PortPlates.push(matches[1].split(", "));
						} else {
							bomb.PortPlates.push([]);
						}
					}
				}
			],
			"IndicatorWidget": [
				{
					regex: /Randomizing Indicator Widget: (unlit|lit) ([A-Z]{3})/,
					value: function(matches) {
						bomb.Indicators.push([matches[1], matches[2]]);
					}
				}
			],
			"SerialNumber": [
				{
					regex: /Randomizing Serial Number: ([A-Z0-9]{6})/,
					value: function(matches) {
						bomb.Serial = matches[1];
					}
				}
			],

			// Multiple Bombs
			"MultipleBombs": [
				{
					regex: /All bombs solved, what a winner!/,
					value: function() {
						var currentBomb = GetBomb();
						currentBomb.FilterLines();
						currentBomb.State = "Solved";
						currentBomb.Solved = currentBomb.TotalModules;
					}
				}
			],

			// Pacing Extender
			"PacingExtender": [
				{
					value: function(matches) {
						if (!GetBomb()) { return; }
						GetBomb().PacingEvents.push(matches.input);
					}
				}
			],
			"Assets.Scripts.Pacing.PaceMaker": [
				{
					regex: /PlayerSuccessRating: .+ \(Factors: solved: (.+), strikes: (.+), time: (.+)\)/,
					value: function(matches) {
						GetBomb().PacingEvents.push(matches.input);
						if (bombgroup.isSingleBomb) {
							bomb.TimeLeft = (parseFloat(matches[3]) / 0.2) * bomb.Time;

							if (bomb.TimeLeft === 0) {
								bomb.State = "Exploded (Time Ran Out)";
							}
						}
					}
				},
				{
					regex: /Executing|Next idle action in/,
					value: function(matches) {
						GetBomb().PacingEvents.push(matches.input);
					}
				},
				{
					regex: /Round start! Mission: (.+) Pacing Enabled: /,
					value: function(matches) {
						GetBomb().MissionName = matches[1];
					}
				}
			],

			// Line filtering
			"Assets.Scripts.DossierMenu.MenuPage": [
				{
					regex: /ReturnToSetupRoom/,
					value: function() {
						GetBomb().FilterLines();
					}
				}
			],

			// Modules
			"3D Maze": {
				ID: "spwiz3DMaze",
				Lines: [
					{
						regex: /You walked into a wrong wall:/,
						value: function(matches, module) {
							module.push({ label: matches.input, obj: pre(readMultiple(18)) });
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"AdjacentLetters": {
				ID: "AdjacentLettersModule",
				Lines: [
					{
						regex: /Solution:/,
						value: function(_, module) {
							module.push({ label: "Solution:", obj: pre(readMultiple(3)) });
						}
					},
					{
						regex: /You submitted:/,
						value: function(_, module) {
							module.push({ label: "You submitted:", obj: pre(readMultiple(3)) });
						}
					}
				]
			},
			//"Adventure Game": "spwizAdventureGame",
			"Assets.Scripts.Rules.KeypadRuleSet": {
				ID: "Keypad",
				Lines: [
					{
						regex: /Keypad button (\d) symbol (.+)/,
						value: function(matches, module) {
							module.push("Keypad button " + (parseInt(matches[1]) + 1) + " symbol " + matches[2]);
						}
					}
				]
			},
			/*
			"Assets.Scripts.Rules.VennWireRuleSet": {
				ID: "Venn",
				Lines: [
					{
						regex: /Checking cut wire: index=(\d), color=.+\. Red=(True|False), Blue=(True|False), Symbol=(True|False), LED=(True|False), Rule=(\w+), Cut=(True|False)/,
						value: function(matches, _, mod) {
							var index = parseInt(matches[1]);
							var id = mod.IDs.length;

							if (index == 0) {
								id++;
								GetBomb().GetModuleID("Venn", id);
							}

							if (mod.IDs.length > 0) {
								matches.forEach(function(val, index) {
									matches[index] = (val == "True");
								});

								var rule = {
									DoNotCut: "Don't cut",
									CutIfParallelPortPresent: "Cut if you have a parallel port"
								};

								var module = GetBomb().GetModuleID("Venn", id);
								module[index] = ["Wire " + (index + 1),
									[
										"Colors: " + (matches[2] ? (matches[3] ? "Red and Blue" : "Red") : (matches[3] ? "Blue" : "White")),
										"Features: " + (matches[4] ? (matches[5] ? "Star and Light" : "Star") : (matches[5] ? "Light" : "None")),
										"Rule: " + rule[matches[6]] || matches[6],
										"Should be cut: " + (matches[7] ? "Yes" : "No")
									]
								];
							}
						}
					},
					{
						regex: /Wire snipped|All wires snipped correctly!/
					}
				]
			},
			*/
			"Astrology": "spwizAstrology",
			"Battleship": {
				ID: "BattleshipModule",
				Lines: [
					{
						regex: /.+/
					},
					{
						regex: /Ships: .+/,
						value: function(matches, module) {

							var fieldStr = readMultiple(6);
							var field = fieldStr.replace('\r', '').split('\n');

							var r, tr, c, td;

							var stuff = [];
							for (r = 0; r < 6; r++) {
								stuff[r] = [];
								tr = $('<tr>').appendTo(table);
								for (c = 0; c < 6; c++) {
									td = $('<td>').appendTo(tr);
									var ch = field[r][2 * c + 2];
									if (c > 0 && r > 0)
										stuff[r][c] = { IsShip: ch === '#' || ch === '%', IsSafeLocation: ch === '•' || ch === '%' };
									else
										stuff[r][c] = ch;
								}
							}

							var table = $('<table>').css('border-spacing', '0');
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
			"Binary LEDs": "BinaryLeds",
			"Bitmaps": {
				ID: "BitmapsModule",
				Lines: [
					{
						regex: /Bitmap \((red|green|blue|yellow|cyan|pink)\):/,
						value: function(matches, module) {
							module.push({
								label: matches.input,
								obj: pre(readMultiple(9, function(str) { return str.replace(/^\[Bitmaps #\d+\] /, ''); }))
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
			"Bitwise Operators": "BitOps",
			"Big Circle": {
				ID: "BigCircle",
				Lines: [
					{
						regex: /(?:Getting|Updating) solution/,
						value: function(matches, module) {
							module.Group = [matches.input.replace(/(?:Getting|Updating) solution for /, ""), []];
							module.push(module.Group);
							return true;
						}
					},
					{
						regex: /.+/,
						value: function(matches, module) {
							if (module.Group) {
								module.Group[1].push(matches.input);
							} else {
								module.push(matches.input);
							}
						}
					}
				]
			},
			"Blind Alley": {
				ID: "BlindAlleyModule",
				Lines: [
					{
						regex: /Region condition counts:/,
						value: function(_, module) {
							var line1 = readLine();
							var line2 = readLine();
							var line3 = readLine();
							var numbers = [line1[0], line1[2], line2[0], line2[2], line2[4], line3[0], line3[2], line3[4]];
							var max = 0;
							for (var i = 0; i < numbers.length; i++)
								if (numbers[i] > max)
									max = numbers[i];
							var table = $('<table><tr><td>0<td>1</tr><tr><td>2<td>3<td>4</tr><tr><td>5<td>6<td>7</tr></table>'.replace(/\d/g, function(i) { return numbers[i]; })).css({ borderCollapse: 'collapse' });
							table.find('td').each(function(_, elem) {
								$(elem).css({
									padding: '.5em 1em',
									fontSize: '150%',
									border: '1px solid black',
									background: $(elem).text() == max ? '#dfd' : null,
									fontWeight: $(elem).text() == max ? 'bold' : null
								});
							});
							module.push({ label: "Region counts:", obj: table });
						}
					},
					{
						regex: /Region .+ is correct|You pressed region/
					}
				]
			},
			"Boolean Venn Diagram": {
				ID: "booleanVennModule",
				Lines: [
					{
						regex: /Expression|button pressed|Module Solved!/,
						value: function(matches, module) {
							module.push(matches.input);
						}
					},
					{
						regex: /Expression/,
						value: function(matches, module) {
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

							readMultiple(16).match(/[UL]/g).forEach(function(letter, index) {
								var elem = svg.find("path, circle").eq(index);
								elem.attr("fill", letter == "L" ? "rgb(255, 127, 127)" : "rgb(127, 255, 127)");

								var bbox = elem[0].getBBox();
								var text = sections[index];
								$("<svg><text></svg>").children().eq(0).unwrap()
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
			"Broken Buttons": {
				ID: "BrokenButtonsModule",
				Lines: [
					{
						regex: /Buttons:/,
						value: function(_, module) {
							var step = module.Step || module;

							step.push({ label: "Buttons:", obj: pre(readMultiple(4)) });
						}
					},
					{
						regex: /Step: (.+)/,
						value: function(matches, module) {
							module.Steps = (module.Steps || 0) + 1;
							module.Step = [matches[1]];
							module.push(["Step #" + module.Steps, module.Step]);
						}
					},
					{
						regex: /Press: (.+)/,
						value: function(matches, module) {
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
			"CaesarCipher": "CaesarCipherModule",
			"Cheap Checkout": {
				ID: "CheapCheckoutModule",
				Lines: [
					{
						regex: /Receipt/,
						value: function(matches, module) {
							module.push({ label: 'Receipt:', obj: pre(readMultiple(10)) });
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"Chess": {
				ID: "ChessModule",
				Lines: [
					{
						regex: /Selected Solution: (.+)/,
						value: function(matches, module) {
							var locations = matches[1].split(", ");
							var solution = locations[locations.length - 1];
							locations.splice(locations.length - 1, 1);
							module.push("Display: " + locations.join(", "));
							module.push("Solution: " + solution);
							readLine();
							var board = readMultiple(13);
							var table = $('<table>').css({ borderCollapse: 'collapse', border: '3px solid black' });
							for (var y = 0; y < 6; y++)
							{
								var tr = $('<tr>').appendTo(table);
								for (var x = 0; x < 6; x++)
								{
									var td = $('<td>').appendTo(tr).css({ width: '75px', height: '75px', border: '1px solid black' });
									var svg = null;
									var ch = board[26*(2*y+1) + (4*x+2)];
									switch (ch)
									{
										case 'B': svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M85.4 25.2c0-2 .4-4 1-5.8 1-1.8 2-3.3 3.2-4.6 1.3-1.3 3-2.4 4.6-3 2-1 4-1.2 6-1.2s4 .3 6 1c1.6.8 3.2 2 4.5 3.2 1.3 1.3 2.3 2.8 3 4.6.8 1.8 1.2 3.7 1.2 5.8 0 2.7-.8 5-2 7.2 4 3 7.5 6 11 9 3.4 3.3 6.4 6.7 9 10.4 2.6 3.7 4.6 7.7 6 12 1.4 4.4 2 9 2 14.3 0 4-.3 8-1 11.5-1 3.4-2 6.6-3.3 9.5-1.4 2.8-2.8 5.5-4.5 7.8-1.5 2.3-3.2 4.5-4.8 6.3l7 25c-3 2-6.7 3.7-11 5-4 1-8.5 2-13.3 2.4 2.7 1 5.5 2 8.5 2.4 3 .5 6.2 1 9.4 1 3.2.4 6.5.6 10 .8l9.6.8 11.6 11c0 3.2-.8 6.3-2 9.2-1 3-2.5 5.6-4.4 8-2 2.5-4 4.6-6.6 6.5-2.5 2-5.3 3.4-8.3 4.5L125 176l4-1.7c1.3-.7 2.7-1.5 4-2.5 1.3-1 2.5-2 3.5-3.3 1-1.2 1.7-2.7 2-4.3-4.4-.2-8.4-.7-12-1.3-3.5-.8-6.8-1.8-10-3-3-1.5-5.8-3.3-8.4-5.5-2.5-2.3-5-5.2-7.7-8.8h-.4c-2.7 3.6-5.3 6.5-8 8.8-2.6 2.2-5.4 4-8.5 5.4-3 1.2-6.4 2.2-10 3-3.5.4-7.5 1-12 1 .3 1.7 1 3 2 4.4 1 1.3 2.3 2.4 3.6 3.3 1.4 1 2.8 1.8 4 2.5l4 1.7-12.6 13.3c-3-1-5.8-2.6-8.3-4.4-2.4-2-4.6-4-6.5-6.5-2-2.5-3.4-5-4.5-8-1.2-3-2-6-2-9.4l11.5-11 9.8-.6 10-.7c3-.2 6.2-.6 9.3-1 3-.6 5.8-1.4 8.5-2.5-4.6-.5-9-1.4-13.2-2.6-4.2-1-7.8-2.7-10.8-4.6l6.8-25c-1.6-1.7-3.3-4-5-6.2-1.6-2.3-3-5-4.4-8-1.3-2.8-2.4-6-3.2-9.4C59.4 86 59 82 59 78c0-5 .7-9.8 2-14 1.6-4.5 3.6-8.5 6.2-12.2 2.5-3.7 5.6-7 9-10.3 3.5-3.2 7.2-6.2 11.2-9-1.4-2.2-2-4.6-2-7.3z"/><path d="M109 149.7c2.3 2.2 5 4 7.8 5.2l9 3c3.3.5 6.5 1 9.8 1.2l9.4.3h5.5l-5-4.7c-2-.4-4.7-.6-8-.8-3.2 0-6.5-.4-10-.7-3.5-.3-7-.7-10.2-1.4-3.2-.6-5.8-1.5-7.8-2.8zM90.5 149.3c-2 1.3-4.6 2.2-7.8 2.8-3.3 1-6.7 1.3-10.2 1.6-3.5.3-6.8.6-10 .7-3.3.2-6 .4-8 .7l-5 4.5H55c3 0 6 0 9.4-.2 3.3-.2 6.5-.7 9.7-1.4l9.3-3c3-1.5 5.5-3 7.7-5.4zM144 164.5c-.8 2.3-2 4.3-3 5.8-1.3 1.6-2.5 3-3.8 4l-4.4 3 5.7 5.8c4.6-2 8-4.5 10.3-7.7 2.4-3.2 4-7 4.6-11-2.3.2-5.5.3-9.4.3zM56 164.5c-4 0-7 0-9.4-.3.7 4 2.2 7.8 4.6 11 2.3 3.2 5.7 5.8 10.3 8l5.7-6c-2-1-4-2.5-6.2-4.5-2-2-3.8-4.8-5-8.2zM126.3 135.3c-2-.5-5.2-1-9.7-1.6-4.4-.6-10-1-16.6-1-6.6 0-12.2.4-16.6 1-4.5.5-7.7 1-9.7 1.6 0 .5.7 1 2 1.5 1.5.6 3.5 1 6 1.6 2.4.5 5.2 1 8.3 1.2 3.2.4 6.5.5 10 .5 3.4 0 6.7 0 10-.3 3-.3 6-.7 8.4-1.2 2.4-.5 4.3-1 5.8-1.6 1.4-.6 2-1 2-1.6zM100 127.3h6c2.2 0 4.4.2 6.6.4l6.5.6 6 1-3.5-15h-43l-3.5 15c1.7-.4 3.7-.7 5.8-1l6.6-.6 6.6-.4h6zM122 108c2-2.2 3.7-4.3 5.2-6.5 1.4-2.3 2.6-4.6 3.6-7 1-2.5 1.7-5 2.2-7.8.4-2.7.7-5.6.7-8.7 0-4-.6-8-1.6-11.7-1-3.7-2.5-7.4-5-11-2.3-3.6-5.4-7.2-9.2-10.8-4-3.6-8.6-7-14.3-10.7 1.2-1 2.3-2 3.3-3.3 1-1.2 1.4-3 1.4-5.3s-.7-4.3-2.2-6c-1.5-1.6-3.4-2.4-5.8-2.4s-4.3.8-5.8 2.4C92.7 21 92 23 92 25.2s.4 4 1.3 5.3c1 1.2 2 2.3 3.3 3.3-5.7 3.6-10.4 7-14.3 10.7-3.8 3.6-7 7.2-9.3 10.8-2.4 3.6-4 7.3-5 11S66.2 74 66.2 78c0 3 .3 6 .7 8.7.4 2.8 1 5.3 2 7.8 1 2.4 2.3 4.7 3.7 7 1.4 2.2 3 4.3 5 6.5z" fill="#fff"/><path d="M118.7 59.2v6h-15.4v36H97v-36H81.3v-6h15.4V42.7h6.4V59z"/></svg>'; break;
										case 'K': svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M97 21.5h6V27h5.3v5H103v10c3 4.7 5.6 9.8 7.5 15.5 2 5.6 3 11.8 3 18.5 1.2-2.2 2.8-4.4 4.6-6.4 2-2 4-3.7 6-5.3 2.4-1.4 5-2.6 7.6-3.5 2.7-.8 5.5-1.3 8.6-1.3 3.8 0 7.2.7 10.4 2 3 1.2 6 3 8.2 5.3 2.2 2.3 4 5 5.3 8.2 1.3 3.2 2 6.7 2 10.5 0 4.2-.6 8.2-2 12.2-1 4-3 7.6-5 11-2.2 3.2-5 6.2-8 8.8-3 2.7-6.3 4.8-10 6.3l3.6.3 4 .3 4 .3c1.3 0 2.5.2 3.5.3v50c-9 1.4-18.5 2.4-28 3-9.6.7-19 1-28.4 1-9.4 0-18.6-.3-27.6-1-9-.6-18.6-1.6-28.5-3v-50l3.5-.4 4-.3c1.3 0 2.7 0 4-.2 1.2 0 2.4 0 3.5-.2-3.6-1.5-7-3.6-10-6.3-3-2.6-5.7-5.6-8-9-2-3.2-3.8-7-5-10.8-1.3-4-2-8-2-12.2 0-3.8.8-7.3 2-10.5 1.3-3 3-6 5.4-8.2 2.3-2.3 5-4 8.2-5.4 3.2-1 6.6-1.8 10.4-1.8 3 0 6 .5 8.6 1.3 2.7 1 5.2 2 7.4 3.5 2.3 1.7 4.3 3.4 6 5.4 2 2 3.5 4 4.8 6.3 0-6.7 1-13 3-18.5C91.2 52 93.8 47 97 42.3V32h-5.3v-5H97z"/><path d="M93.2 77.8c0 3.8.2 7.3.8 10.5.5 3.2 1 6.6 1.8 10 .7 3.4 1.4 7 2 11 1 4 1.5 8.5 2 13.7h.4c.4-5.2 1-9.8 1.8-13.7l2.2-11 1.8-10c.6-3.2.8-6.7.8-10.5 0-2 0-4-.2-6.3 0-2.3-.5-4.7-1-7-.5-2.6-1.2-5-2-7.6-1-2.7-2-5-3.6-7.7-1.5 2.5-2.7 5-3.6 7.5-1 2.5-1.6 5-2 7.4-.5 2.4-1 4.8-1 7-.2 2.3-.2 4.4-.2 6.4zM100.4 154.8H125c8 0 16.3 0 24.6-.4v-8.2c-8.3-.3-16.4-.5-24.6-.5H75c-8.2 0-16.3.2-24.6.5v8.2c8.3.3 16.5.5 24.6.5h24.6zM149.6 159.4c-8.3.4-16.4.7-24.6.8l-24.6.2h-.8c-8.3 0-16.5 0-24.6-.2-8.2 0-16.3-.4-24.6-.8v9.3c7.6 1 15.7 2 24.2 2.4 8.6.7 17 1 25.3 1l12.4-.2c4.3 0 8.6-.3 12.8-.6 4.3-.2 8.4-.5 12.5-1 4-.3 8-.8 11.8-1.3zM50.4 141l24.6-.6c8-.2 16.2-.3 24.6-.3h.8c8.4 0 16.6.3 24.6.5 8 0 16.2.4 24.6.7v-11l-24.6-1-25.4-.2c-8.2 0-16.5 0-25 .3l-24.2 1zM159 85c0-2.6-.3-5-1-7.5-1-2.4-2-4.4-3.6-6.2-1.6-1.6-3.5-3-5.8-4-2.4-1-5-1.6-8-1.6-3.7 0-7 1-10 2.5-3 1.6-5.8 4-8.2 6.7-2.4 3-4.4 6-6.2 10-1.8 3.6-3.3 7.5-4.5 11.7-1.2 4-2.2 8.4-3 12.7-.7 4.4-1 8.5-1.3 12.5l5 1 6.5.2c5 0 9.7-1 14.6-2.7 4.8-1.8 9-4.3 12.8-7.6 3.7-3.5 6.8-7.5 9-12 2.4-4.8 3.6-10 3.6-16zM41 85c0 6 1 11.2 3.4 16 2.3 4.5 5.3 8.5 9 12 3.8 3.2 8 5.7 13 7.5C71 122 76 123 81 123c2.4 0 4.6 0 6.5-.4 2-.2 3.6-.5 5-1-.2-4-.6-8-1.3-12.4-.7-4.3-1.7-8.6-3-12.7-1-4.2-2.6-8-4.4-12-1.8-3.6-3.8-7-6.2-9.8-2.4-2.8-5-5-8-6.8-3-1.8-6.5-2.7-10.2-2.7-3 0-5.7.5-8 1.6-2.3 1-4.2 2.3-5.8 4C44 73 43 75 42 77c-.6 2.4-1 5-1 7.5z" fill="#fff"/></svg>'; break;
										case 'N': svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M69 171c-.8-1.6-1.4-3.7-2-6.2-.5-2.4-.8-5.6-.8-9.4 0-4.8 1-9 2.6-13 1.8-3.7 4-7.2 6.6-10.3 2.6-3 5.5-6 8.6-8.7 3-2.7 6-5.3 8.5-8 2.7-2.5 5-5 6.6-7.7 2-2.7 2.8-5.5 2.8-8.6-2 2-4.4 3.5-7.5 5-3 1.3-7.2 2.2-12.2 2.4-2 1.4-3.7 2.6-5.7 3.5L70 112c-2 2.2-4 4-6 5.3-2 1.4-4 2-6.3 2-1.8 0-3.5-.3-5-1-1.6-.7-3-1.6-4.3-2.8-1.3-1.2-2.4-2.6-3.3-4-1-1.7-1.5-3.3-2-5-.7-1.2-1.2-2.5-1.5-3.8-.3-1.4-.4-2.7-.4-4 0-1 .4-2 1-3s1.4-2.3 2.3-3.3C45 91.7 46 91 47 90l2.3-1.6L55 81c1.7-2 3.3-4 5-5.7 1.5-1.7 3-3.5 4.8-5.3l6.2-5.8-.2-1.4c0-2 .4-3.6 1.2-5 .8-1.6 1.8-3 3-4 1.3-1 2.6-2 4-2.7l4.3-1.4V46l-.5-3.5c0-1-.3-2.3-.5-3.6l-.8-4.4 2.8-1.2c1 .4 2 1 3.2 1.8 1.2 1 2.4 1.8 3.6 3 1.4 1 2.6 2.2 3.7 3.5l3 4.5 1-.2c.4-2.4.8-5 1-7.5.4-2.7.6-5.5.8-8.7l4-.7c1.2 1 2.6 2.7 4 4.3 1.4 1.6 2.8 3.3 4 5.3 1.3 2 2.6 4 3.7 6.4 1.2 2.2 2 4.7 3 7.4l3 4 4 4 4.4 5 5.2 6c2.5 2.8 5 6.6 8 11.2 2.7 4.6 5.2 9.6 7.5 15.2 2.4 5.5 4.3 11.3 5.8 17.3 1.6 6.3 2.3 12 2.3 18 0 4 0 7-.2 10 0 3-.2 6-.5 8.7l-1 8.7-1.7 10.8z"/><path d="M92.4 47.3l-2.2-3.7c-.8-1.3-2-2.4-3.4-3.5l-.3.3c.4 1.3.7 2.6.8 4l.3 4.3zM106.7 83.3c.7 2 1.2 4 1.6 6.2.4 2.2.7 4.4.7 6.6 0 4.5-1 8.3-2.7 11.6-1.7 3.4-4 6.5-6.5 9.3-2.7 3-5.5 5.6-8.6 8.2-3 2.8-6 5.6-8.5 8.5-2.6 3-4.8 6-6.6 9.4-1.5 3.4-2.4 7-2.4 11.6 0 2.2 0 4 .4 5.7 0 1.7.4 3 .7 4.3h75l1-7 .8-7c.3-2.5.5-5 .6-7.8.3-2.8.4-6 .4-9.5 0-4.5-.5-9.3-1.4-14.4-1-5-2.4-10.3-4.2-15.4-1.8-5-4-10-6.7-15-2.5-5-5.6-9.6-9-14l-4.3-4.8c-1.3-1.4-2.5-3-3.8-4.3l-4-4.4c-1.6-1.5-3-3.3-5-5.3-.7-3.6-2-7-3.7-10.4-1.8-3.3-3.6-6-5.6-8h-.5c0 2-.3 4-.5 6.4l-1 6.2-4.7 1-5.5 1c-2 .3-4 1-5.8 1.4-2 .5-3.7 1.2-5.2 2-1.6 1-2.8 2-3.8 3.4-1 1.2-1.5 2.8-1.5 4.6v1.4l.4 1.3c-5 4.4-9.2 9-13 13.5C59.3 84 56 88.2 53 92l-2 1.7c-.8.6-1.5 1.2-2 1.8-.8.7-1.3 1.3-1.7 2-.4.6-.6 1.3-.6 2 0 .8.2 1.6.5 2.5.3 1 .7 1.7 1 2.4 1 3.5 2.4 6 4 7.3 1.8 1.3 3.8 2 6 2 1.4 0 3-.5 4.5-1.5 1.6-1 3-2.7 4.5-4.8L71 106l3-1.4c1.2-.5 2.2-1 3.2-1.7 1-.8 2.2-1.6 3.3-2.6 2.7 0 5.3-.4 8-1.3 2.6-1 5-2 7-3.6C98 94 99.5 92 101 90c1.4-2 2-4.4 2-6.8z" fill="#fff"/><path d="M123.6 71.4c4.5 5 8.5 10.7 12 17.2 1.6 2.8 3 6 4.5 9.3 1.7 3.2 3 7 4 11 1.3 3.7 2 8 3 12.4.6 4.5 1 9.3 1 14.3 0 3.5 0 7-.6 10.8-.4 3.7-1 7.5-2 11.5h-10.7c1-3 1.6-6 2.2-8.7l1.4-8.3c.4-2.7.6-5.5.8-8 .2-2.8.3-5.6.3-8.5 0-9.4-1.3-18.4-4-27-2.5-8.6-6.5-17.3-11.7-26zM60.8 96.7v.5c-1.5 1-3 2-4.4 3.2-1.5 1.2-3 2-4.5 2.6-.7-.4-1-1-1.6-1.7-.5-.8-.8-1.6-1-2.5zM81.3 68.6c-.3-1-.5-1.5-.5-2 0-1 0-1.6.6-2 .4-.6 1-1 1.6-1.2.6-.3 1.3-.4 2-.5h2c1.4 0 3 0 4.5.2 1.5.3 2.8.4 4 .4-1 1-2 1.6-3 2.2-1.2.7-2.4 1.2-3.7 1.6-1.3.5-2.6.8-4 1l-3.6.3z"/></svg>'; break;
										case 'Q': svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M88.2 40.4c0-2 .3-3.7 1-5 .7-1.6 1.6-2.8 2.7-3.8 1-1 2-1.8 3.5-2.3 1.4-.5 2.8-.7 4.2-.7 1.4 0 3 .2 4.3.7 1.6.5 2.8 1.2 4 2.2 1 1 2 2.2 2.7 3.7.8 1.5 1 3.2 1 5.2 0 3-.7 5.6-2.2 7.4-1.6 1.8-3.5 3-5.7 3.7l10.7 47.3 14.8-41.3c-2.3-.7-4.2-2-5.7-4-1.4-2-2-4.3-2-7 0-2 .2-3.6 1-5 .7-1.6 1.6-2.8 2.8-3.8 1-1 2.4-1.8 3.8-2.3 1.4-.5 2.8-.7 4.3-.7 1.4 0 2.8.2 4.3.7 1.4.5 2.7 1.3 3.8 2.3 1 1 2 2.2 2.7 3.7.7 1.5 1 3.2 1 5.2 0 1.3-.2 2.7-.6 4-.5 1.3-1.2 2.5-2 3.5-1 1-2 2-3.2 2.8-1.3.8-2.7 1.2-4.3 1.4l4 42.6L159 70.3c-1.8-1-3.3-2.4-4.3-4.3-1-1.8-1.6-4-1.6-6s.5-3.8 1-5.2c1-1.5 2-2.7 3-3.7s2.4-1.6 4-2c1.3-.6 2.7-.8 4.2-.8s3 .3 4.3.8c1.4.5 2.7 1.3 3.8 2.3 1.2 1 2 2.3 2.8 3.8.7 1.5 1 3 1 5 0 1.7-.2 3-.7 4.5-.5 1.4-1.3 2.7-2.3 3.8-1 1-2.2 2-3.7 2.6-1.4.5-3 1-4.8 1H164l-8 51v45c-9 1.2-18.3 2.2-28 2.7-9.7.6-19 1-28 1s-18.4-.4-28-1c-9.4-.5-18.7-1.5-27.7-2.7v-45l-7.6-51.3H35c-1.7 0-3.3-.3-4.7-1-1.5-.6-2.7-1.4-3.7-2.5-1-1-1.8-2.4-2.3-3.8-.5-1.4-.8-2.8-.8-4.3 0-2 .4-3.7 1-5 .5-1.7 1.5-3 2.5-4s2.3-1.7 3.7-2.2c1.4-.5 2.8-.7 4.2-.7 1.3 0 2.7.4 4.2 1 1.4.4 2.7 1.2 3.8 2.2 1.2 1 2 2.3 3 3.8.6 1.4 1 3 1 5 0 2.3-.6 4.4-1.7 6.2-1 2-2.5 3.3-4.3 4.3l19.8 30.3 4-42.5c-1.6 0-3-.5-4.3-1.3-1.2-.7-2.3-1.6-3.2-2.6-.8-1-1.5-2-2-3.4-.4-1.3-.7-2.7-.7-4 0-2 .4-3.7 1-5.2.7-1.5 1.6-2.7 2.8-3.7 1-1 2.4-1.7 3.8-2.2 1.5-.5 3-.7 4.3-.7 1.4 0 2.8.3 4.3.8 1.4.5 2.7 1.3 3.8 2.3 1.2 1 2 2.3 3 3.8.6 1.5 1 3.2 1 5.2 0 2.6-.8 5-2.2 7-1.5 1.8-3.4 3.2-5.7 4l14.8 41.2L96.2 52c-2.2-.8-4-2-5.7-3.8-1.5-1.8-2.3-4.3-2.3-7.4z"/><path d="M170.6 60c0-2-.6-3.4-1.7-4.3-1.4-1-2.7-1.4-4-1.4-1.6 0-3 .5-4 1.5-1.3 1-2 2.3-2 4 0 2 .7 3.3 2 4.2 1 1 2.4 1.5 4 1.5 1.3 0 2.6-.5 4-1.4 1-.7 1.5-2 1.5-4zM29.4 60c0 1.8.6 3.2 1.7 4 1.4 1 2.7 1.5 4 1.5 1.6 0 3-.5 4-1.5 1.3-1 1.8-2.3 2-4 0-2-.7-3.3-2-4.3-1-1-2.4-1.4-4-1.4-1.3 0-2.6.5-4 1.4-1 1-1.5 2.3-1.5 4.2zM139 46.5c0-2-.5-3.4-1.6-4.4-1.2-1-2.5-1.3-4-1.3s-2.7.5-4 1.5c-1 1-1.6 2.4-1.6 4.3 0 1.7.6 3 1.7 4 1.2 1 2.4 1.5 4 1.5 1.4 0 2.7-.4 4-1.3 1-1 1.6-2.3 1.6-4zM61 46.5c0 1.8.5 3.2 1.6 4 1.2 1 2.5 1.5 4 1.5s2.7-.4 4-1.4c1-1 1.6-2.3 1.6-4 0-2-.6-3.3-1.7-4.3-1.2-1-2.4-1.5-4-1.5-1.4 0-2.7.5-4 1.5-1 1-1.6 2.3-1.6 4.3zM94.4 40.3c0 1.8.5 3.2 1.6 4.2 1 1 2.3 1.5 3.8 1.5 1.6 0 3-.4 4-1.4 1.3-1 1.8-2.3 1.8-4.2 0-1.8-.5-3.2-1.7-4.2-1.3-1-2.7-1.5-4.3-1.5-1.6 0-2.8.5-4 1.5-1 1-1.4 2.4-1.4 4.2zM155.6 86.7l-18 29.8h3c1.2 0 2.4 0 3.6.2h3.3l2.6.3zM50 117h2.5l3.3-.2c1.2 0 2.4 0 3.6-.2h3l-18-29.8zM130.3 73.3L116 115.7c3.2 0 6.3.2 9.5.3l9 .3zM65.5 116.3l9-.3c3.2 0 6.3-.2 9.4-.3L69.2 73.4zM99.8 115.5h6c2.2 0 4.2 0 6.3.2l-12-54-12 54 6-.2h6zM99.8 164.5H112l13.3-.8 13-1c4-.4 7.8-.8 11.2-1.3v-7l-11.7.4-12.8.4c-4.4 0-8.7 0-13 .2H87.8c-4.3 0-8.6 0-13-.2-4.2 0-8.5-.2-12.7-.4-4 0-8-.2-11.4-.4v7c3.4.5 7 1 11.3 1.3l12.7 1 13 .7 12.2.2zM99.8 148.5H112c4.3 0 8.6 0 13-.2 4.3 0 8.6 0 12.8-.2h11.7v-8l-11.7-.3c-4.2-.2-8.5-.3-12.8-.3-4.4 0-8.7 0-13-.2H87.8c-4.3 0-8.6 0-13 .2-4.3 0-8.6 0-12.7.3-4 0-8 .2-11.4.3v7.8l11.6.3c4.2.3 8.5.4 12.8.4h13c4.2.2 8.3.2 12 .2zM50.5 133.7c3.6 0 7.4-.3 11.6-.4l13-.3h13c4.2-.2 8.2-.2 12-.2h12c4.4 0 8.8 0 13 .2 4.5 0 8.8.2 13 .3 4.2 0 8 .3 11.7.4v-11c-3.8 0-7.8-.3-12-.5l-13-.4-12.7-.2H88c-4 0-8.3 0-12.7.2-4.3 0-8.5.2-12.8.4l-12 .6z" fill="#fff"/></svg>'; break;
										case 'R': svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M125.2 43.2V32.8H146v35h-7.2l-9.6 13.5V119l9.6 14h7v13.8h13v20.4H41.2v-20.4H54v-14h7L71 119V81.5L61 67.8h-6.7v-35h20.4v10.5H86V32.8h28v10.4z"/><path d="M73.8 74.8h52.4l5-7H68.5zM68.4 132.8H131l-4.8-7H73.8zM139.2 146.8v-7.4H60.5v7.4zM152.2 160.8v-7.4H48v7.3zM139.2 61.4V39h-7.7v10.7H108V39H92v10.7H68V39h-7.7v22.4zM122.7 119V81.4H77.4V119z" fill="#fff"/></svg>'; break;
									}
									if (svg !== null)
										td.append('<img src=\'data:image/svg+xml,' + svg.replace('#', '%23') + '\' width="75" />');
									if (ch === '×')
										td.css({ backgroundColor: '#fcc' });
									else if ((x + y) % 2 !== 0)
										td.css({ backgroundColor: '#eee' });
								}
							}

							module.push({ label: "Board:", obj: table });
						}
					},
					{
						regex: /Entered answer/
					}
				]
			},
			"ChordQualities": "ChordQualities",
			//"Color Math": "colormath",
			"ColoredSquares": {
				ID: "ColoredSquaresModule",
				Lines: [
					{
						regex: /First stage color is (.+); count=(\d+)./,
						value: function(matches, module) {
							module.push("First stage is: " + matches[1] + ". Count: " + matches[2]);
						}
					},
					{
						regex: /\d+ lit:|Button #\d/
					}
				]
			},
			"Colour Flash": {
				ID: "ColourFlash",
				Lines: [
					{
						regex: /Module generated/,
						value: function(matches, module) {
							module.push({
								label: "Color Sequence:",
								obj: pre(readMultiple(10))
							});
							readLine();
							for (var i = 0; i < 3; i++) {
								module.push(readLine());
							}
						}
					},
					{
						regex: /.+ button was pressed|.+ answer!/
					}
				]
			},
			//"Complicated Buttons": "complicatedButtonsModule",
			"Connection Check": "graphModule",
			"Coordinates": {
				ID: "CoordinatesModule",
				Lines: [
					{
						regex: /(\d)×(\d)/,
						value: function(matches, module) {
							module.Width = parseInt(matches[1]);
							module.Height = parseInt(matches[2]);
							module.Coordinates = {};
						}
					},
					{
						regex: /(illegal|correct) coordinate .=\[(\d+), (\d+)\] as (.+?)( \(.+\))?$/,
						value: function(matches, module) {
							var key = matches[2] + ',' + matches[3];
							if (key in module.Coordinates)
								module.Coordinates[key].Text += '\n' + matches[4];
							else
								module.Coordinates[key] = { Text: matches[4], Legal: matches[1] === 'correct' };
						}
					},
					{
						regex: /Grid:/,
						value: function(_, module) {
							var x;

							var table = $('<table>').css({ borderCollapse: 'collapse', width: '99%', tableLayout: 'fixed' });
							for (x = 0; x < module.Width; x++)
								$('<col>').attr('width', (99 / module.Width) + '%').appendTo(table);
							for (var y = 0; y < module.Height; y++) {
								var tr = $('<tr>').css('height', '4em').appendTo(table);
								for (x = 0; x < module.Width; x++) {
									var key = x + ',' + y;
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
			"Creation": {
				ID: "CreationModule",
				Lines: [
					{
						regex: /.+/,
						value: function(matches, module) {
							if (module.length === 0) {
								module.push(["Initial attempt", [], true]);
							}

							module[module.length - 1][1].push(matches.input);
						}
					},
					{
						regex: /Restarting module.../,
						value: function(matches, module) {
							module.push(["Restart #" + module.length, []]);
						}
					}
				]
			},
			"Cruel Piano Keys": {
				ID: "CruelPianoKeys",
				Lines: [
					{
						regex: /Module generated with the following symbols/
					},
					{
						regex: /The correct rule is the following/,
						value: function(matches, module) {
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
						value: function(matches, module) {
							module.Input.push(matches.input);
						}
					}
				]
			},
			"Fast Math": {
				ID: "fastMath",
				Lines: [
					{
						regex: /(<Stage (\d+)> (.+)|Pressed GO! Let the madness begin!)/,
						value: function(matches, module) {
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
			"FizzBuzz": {
				ID: "fizzBuzzModule",
				Lines: [
					{
						regex: /^Button \d/,
						value: function(matches, module) {
							module.push([matches.input, []]);
							return true;
						}
					},
					{
						regex: /^— (.+)/,
						value: function(matches, module) {
							module[module.length - 1][1].push(matches[1]);
							if (matches[1].startsWith("solution is"))
								module[module.length - 1][0] += matches[1].substr("solution is".length);
							return true;
						}
					},
					{
						regex: /.+/,
						value: "fizzBuzzModule"
					}
				]
			},
			"FollowTheLeader": {
				ID: "FollowTheLeaderModule",
				Lines: [
					{
						regex: /Starting at wire:|Strike because you cut/
					},
					{
						regex: /Wire state:/,
						value: function(_, module) {
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
						value: function(matches, module) {
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
			"Forget Me Not": "MemoryV2",
			"Friendship": {
				ID: "FriendshipModule",
				Lines: [
					{
						regex: /^Friendship symbol/,
						value: function(matches, module) {
							if (!module.SymbolsText) {
								module.SymbolsText = [];
								module.push(["Symbols", module.SymbolsText]);
							}

							module.SymbolsText.push(matches.input.replace(/^Friendship symbol /, ""));

							var m2 = /^Friendship symbol #\d: \(X=(\d+), Y=(\d+), Pony=(.*) \((row|col)\)\)$/.exec(matches.input);
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
						value: function(matches, module) {
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
						value: function(matches, module) {
							if (module.SkipSvg)
								return false;

							var ponyNames = [
								"Amethyst Star", "Apple Cinnamon", "Apple Fritter", "Babs Seed", "Berry Punch", "Big McIntosh", "Bulk Biceps",
								"Cadance", "Carrot Top", "Celestia", "Cheerilee", "Cheese Sandwich", "Cherry Jubilee", "Coco Pommel",
								"Coloratura", "Daisy", "Daring Do", "Derpy", "Diamond Tiara", "Double Diamond", "Filthy Rich",
								"Granny Smith", "Hoity Toity", "Lightning Dust", "Lily", "Luna", "Lyra Heartstrings", "Maud Pie",
								"Mayor Mare", "Moon Dancer", "Ms. Harshwhinny", "Night Light", "Nurse Redheart", "Octavia Melody", "Rose",
								"Screwball", "Shining Armor", "Silver Shill", "Silver Spoon", "Silverstar", "Spoiled Rich", "Starlight Glimmer",
								"Sunburst", "Sunset Shimmer", "Suri Polomare", "Sweetie Drops", "Thunderlane", "Time Turner", "Toe Tapper",
								"Tree Hugger", "Trenderhoof", "Trixie", "Trouble Shoes", "Twilight Velvet", "Twist", "Vinyl Scratch"];

							function imgHref(num) {
								if (num < 10)
									num = "0" + num;
								return "../HTML/img/Friendship/Friendship Symbol " + num + ".png";
							}

							var cutieMarks = '';
							var colDisregards = '';
							var rowDisregards = '';
							for (var i = 0; i < module.Symbols.length; i++) {
								cutieMarks += "<img src='" + imgHref(ponyNames.indexOf(module.Symbols[i].Pony)) + "' style='position: absolute; left: " + (30 * module.Symbols[i].X + 23) + "px; top: " + (30 * module.Symbols[i].Y + 23) + "px; width: 84px; height: 84px;' />";

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
			"Hexamaze": {
				ID: "HexamazeModule",
				Lines: [
					{
						regex: /Moving from|Walking out|There’s an|However, we wanted/,
						value: function(matches, module) {
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
						value: function(matches, module) {
							module.Link = { label: "" };
							module.JSON = {
								stencil: [parseInt(matches[1]), parseInt(matches[2])],
								rotation: parseInt(matches[3]),
								pawn: [parseInt(matches[4]), parseInt(matches[5])],
								color: matches[6],
								markings: []
							};

							module.push(module.Link);
						}
					},
					{
						regex: /Marking at \((\d), (\d)\) \(screen\)\/\(\d+, \d+\) \(maze\): \w+, after rotation: (\w+)/,
						value: function(matches, module) {
							module.JSON.markings.push({
								pos: [parseInt(matches[1]), parseInt(matches[2])],
								type: matches[3]
							});
							module.Link.label = "Click <a href='../HTML/Hexamaze interactive (samfun123).html#" + JSON.stringify(module.JSON) + "'>here</a> to view the solution interactively.";
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"Ice Cream": {
				ID: "iceCreamModule",
				Lines: [
					{
						regex: /Stage \d/,
						value: function(matches, module) {
							module.push([matches.input, readMultiple(3).split("\n")]);
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"InvisibleWallsComponent": "Maze",
			"KeypadComponent": "Keypad",
			"LED Encryption": "LEDEnc",
			"Laundry": {
				ID: "Laundry",
				Lines: [
					{
						regex: /.+/,
						value: function(matches, module) {
							module.push(matches.input);
							for (var i = 0; i < 4; i++) {
								module.push(readLine());
							}
						}
					}
				]
			},
			"Light Cycle": {
				ID: "LightCycleModule",
				Lines: [
					{
						regex: /Start sequence: ([A-Z]{6})/,
						value: function(matches, module) {
							module.Presses = [];
							module.push("Starting Seq: " + matches[1]);
							module.push(["Buttons:", module.Presses]);
						}
					},
					{
						regex: /SN ([A-Z0-9]{2}), swap ([A-Z0-9]\/[A-Z0-9]), sequence now: ([A-Z]{6})/,
						value: function(matches, module) {
							module.push("Swap " + matches[2] + " (" + matches[1] + "). New Seq: " + matches[3]);
						}
					},
					{
						regex: /Pressed button/,
						value: function(matches, module) {
							module.Presses.push(matches.input);
						}
					}
				]
			},
			//"Logic": "Logic",
			"Minesweeper": {
				ID: "MinesweeperModule",
				Lines: [
					{
						regex: /Board:|Legend:/,
						value: function(matches, module) {
							module.push({ label: matches.input, obj: pre(readMultiple(matches.input.includes("Board") ? 10 : 4)) });
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"Modules Against Humanity": {
				ID: "ModuleAgainstHumanity",
				Lines: [
					{
						regex: /Modules:/,
						value: function(matches, module) {
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
			"MonsplodeFight": {
				ID: "monsplodeFight",
				Lines: [
					{
						regex: /Opponent/,
						value: function(matches, module) {
							module.MoveInfo = null;
						}
					},
					{
						regex: /Move name/,
						value: function(matches, module) {
							module.push([matches.input.replace(/\(\d\)/, ""), module.MoveInfo]);
							module.MoveInfo = [];
							return true;
						}
					},
					{
						regex: /.+/,
						value: function(matches, module) {
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
			"MorseCodeComponent": [
				{
					regex: /Chosen word is:|Transmit button pressed when selected frequency is/,
					value: "Morse"
				}
			],
			"Morsematics": "MorseV2",
			"Morse-A-Maze": {
				ID: "MorseAMaze",
				Lines: [
					{
						regex: /Solved - Turning off the Status light Kappa/,
						value: function(_, module) {
							module.push("Module Solved");
							return true;
						}
					},
					{
						regex: /Moving from/,
						value: function(matches, module) {
							if (!module.Moves) {
								module.push(module.Moves = ["Moves", []]);
							}
							module.Moves[1].push(matches.input);

							return true;
						}
					},
					{
						regex: /.+/
					},
					{
						regex: /Maze Solution from ([A-F])([1-6]) to ([A-F])([1-6]) in maze "(\d)/,
						value: function(matches, module) {
							var container = $("<div>").css("position", "relative");
							var maze = $("<img>").css({ width: "210px", height: "210px" }).attr("src", "../HTML/img/Morse-A-Maze/maze" + matches[5] + ".svg").appendTo(container);
							var marker = $("<div>").css({
								width: "10px",
								height: "10px",
								position: "absolute",
								"border-radius": "50%"
							});

							marker
								.clone()
								.css({
									top: 12.5 + 35.5 * (matches[1].charCodeAt() - 65) + "px",
									left: 12.5 + 35 * (parseInt(matches[2]) - 1) + "px",
									background: "green"
								}).appendTo(container);
							
							marker
								.clone()
								.css({
									top: 12.5 + 35.5 * (matches[3].charCodeAt() - 65) + "px",
									left: 12.5 + 35 * (parseInt(matches[4]) - 1) + "px",
									background: "red"
								}).appendTo(container);

							module.push({ label: container });
						}
					}
				]
			},
			"Mouse in the Maze": "MouseInTheMaze",
			"Murder": {
				ID: "murder",
				Lines: [
					{
						regex: /Number of batteries/,
						value: function() {
							var id = GetBomb().GetMod("murder").IDs.length + 1;
							var mod = GetBomb().GetModuleID("murder", id);
							mod.BombInfo = [];
							mod.Rows = [];
							mod.push(["Bomb Info", mod.BombInfo]);
						}
					},
					{
						regex: /Number of|Has/,
						value: function(matches) {
							GetBomb().GetModuleID("murder").BombInfo.push(matches.input);
							return true;
						}
					},
					{
						regex: /row/,
						value: function(matches) {
							GetBomb().GetModuleID("murder").Rows.push(matches.input);
						}
					},
					{
						regex: /Body found in/,
						value: function(matches) {
							GetBomb().GetModuleID("murder").Body = matches.input;
						}
					},
					{
						regex: /Actual solution:/,
						value: function(matches) {
							var mod = GetBomb().GetModuleID("murder");
							mod.Suspects = ["Professor Plum", "Reverend Green", "Colonel Mustard", "Miss Scarlett", "Mrs Peacock", "Mrs White"];
							mod.push(["Suspects", mod.Suspects]);
							mod.Weapons = ["Rope", "Candlestick", "Dagger", "Spanner", "Lead Pipe", "Revolver"];
							mod.push(["Weapons", mod.Weapons]);
							mod.push(mod.Body);
							mod.Rows.forEach(function(row) {
								mod.push(row);
							});
							mod.push(matches.input);
						}
					},
					{
						regex: /Eliminating (.+) to re/,
						value: function(matches) {
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
			"Mystic Square": {
				ID: "MysticSquareModule",
				Lines: [
					{
						regex: /Field:/,
						value: function(matches, module) {
							module.push({ label: "Field:", obj: pre(readMultiple(3, function(str) { return str.replace('0', ' '); })) });
						}
					},
					{
						regex: /Last serial digit|Skull path/
					}
				]
			},
			//"Neutralization": "neutralization",
			"Only Connect": {
				ID: "OnlyConnectModule",
				Lines: [
					{
						regex: /Hieroglyph +Position +Serial# +Ports +num/,
						value: function(matches, module) {
							module.push({
								label: 'Egyptian Hieroglyphs:',
								obj: pre([matches[0]].concat(readMultiple(6, function(str) { return str.replace(/^\[Only Connect #\d+\] /, ''); })).join("\n"))
							});
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"PasswordRuleset": "Password",
			"Perspective Pegs": {
				ID: "spwizPerspectivePegs",
				Lines: [
					{
						regex: /Pegs:/,
						value: function(matches, module) {
							module.push({ label: matches.input, obj: pre(readMultiple(11).replace(/\n{2}/g, "\n")) });
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"Piano Keys": {
				ID: "PianoKeys",
				Lines: [
					{
						regex: /Module generated with the following symbols/
					},
					{
						regex: /The correct rule is the following/,
						value: function(matches, module) {
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
						value: function(matches, module) {
							module.Input.push(matches.input);
						}
					}
				]
			},
			"Plumbing": {
				ID: "MazeV2",
				Lines: [
					{
						regex: /Module solved/,
						value: function() {
							return true;
						}
					},
					{
						regex: /\[[A-Z]{3}[-+]\].*/,
						value: function(matches, module) {
							if (!module.Conditions) {
								module.Conditions = [];
							}

							module.Conditions.push(matches[0]);

							return true;
						}
					},
					{
						regex: /^[A-Z]+ (?:IN|OUT)/,
						value: function(matches, module) {
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
						value: function(matches, module) {
							module.Pipes = [];
							module.Title = matches.input;

							return true;
						}
					},
					{
						regex: /.+/,
						value: function(matches, module) {
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

								var svgGrid = $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6" width="200" height="200" style="display: block; border: red solid 4px; background: rgb(30, 30, 30)">');
								for (var y in module.Pipes) {
									for (var x in module.Pipes[y]) {
										var char = module.Pipes[y][x];
										if (char != " ") {
											var data = charMap[char];
											if (!data) {
												console.warn("Unknown char: " + char);
											} else {
												$("<svg><path d='" + pipeSVG[data[0]] + "'></svg>")
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
			"Point of Order": {
				ID: "PointOfOrderModule",
				Lines: [
					{
						regex: /.+/,
						value: function(matches, module) {
							var span = $("<span>").text(matches.input);
							span.html(span.html().replace(/([♥♦])/g, "<span style='color: red'>$1</span>"));
							module.push({ label: "", obj: span });
						}
					}
				]
			},
			"Resistors": {
				ID: "resistors",
				Lines: [
					{
						regex: /batteries/,
						value: function(matches, module) {
							module.push("Bomb Info: " + matches.input);
						}
					},
					{
						regex: /Already placed/,
						value: function() {
							return true;
						}
					},
					{
						regex: /.+/,
						value: "resistors"
					}
				]
			},
			"Rhythms": "MusicRhythms",
			//"Rock-Paper-Scissors-Lizard-Spock": "RockPaperScissorsLizardSpockModule",
			"Round Keypad": {
				ID: "KeypadV2",
				Lines: [
					{
						regex: /.+/,
						value: function(matches, module) {
							module.push(matches[0].replace(/,/g, " "));
						}
					}
				]
			},
			//"Rubik’s Cube": "RubiksCubeModule",
			"Rules": [
				{
					regex: /Getting solution index for component (.+)Component\(Clone\)/,
					value: function(matches) {
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
			],
			"Rules.WhosOnFirst": {
				ID: "WhosOnFirst",
				Lines: [
					{
						regex: /Precedence List is:/
					},
					{
						regex: /Top precedence label is (.+) \(button index \d\)\. Button pushed was \d\. Result: (\w+)/,
						value: function(matches, module) {
							module.push("Top precedence label is " + matches[1] + ". Result: " + matches[2]);
						}
					}
				]
			},
			"Safety Safe": {
				ID: "PasswordV2",
				Lines: [
					{
						regex: /offset|Answer|Input|solved/,
						value: function(matches, module) {
							module.push(matches.input.replace(/,/g, ", "));
						}
					}
				]
			},
			"Screw": {
				ID: "screw",
				Lines: [
					{
						regex: /Stage \d of 5/,
						value: function(matches, module) {
							module.Stage = [matches.input, []];
							module.push(module.Stage);
							return true;
						}
					},
					{
						regex: /.+/,
						value: function(matches, module) {
							(module.Stage ? module.Stage[1] : module).push(matches.input);
						}
					}
				]
			},
			"Semaphore": {
				ID: "Semaphore",
				Lines: [
					{
						regex: /Module generated/,
						value: function(matches, module) {
							module.push({ label: "Flags", obj: pre(readMultiple(8)) });
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"Silly Slots": {
				ID: "SillySlots",
				Lines: [
					{
						regex: /Stage/,
						value: function(matches, module) {
							module.push({ label: matches.input, obj: pre(readMultiple(2)) });
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			"Simon Screams": {
				ID: "SimonScreamsModule",
				Lines: [
					{
						regex: /Colors in|Small table/,
						value: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /Stage (.) sequence/,
						value: function(matches, module) {
							module.Stage = ["Stage #" + matches[1],
										[]
							];
							module.push(module.Stage);
						}
					},
					{
						regex: /.+/,
						value: function(matches, module) {
							module.Stage[1].push(matches.input);
						}
					}
				]
			},
			"Simon States": "SimonV2",
			"Skewed Slots": {
				ID: "SkewedSlotsModule",
				Lines: [
					{
						regex: /Rule Log/,
						value: function(_, module) {
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
			"Souvenir": {
				ID: "SouvenirModule",
				Lines: [
					{
						regex: /Unleashing question .+: (.+) — (.+) — unleashAt=.+/,
						value: function(matches, module) {
							module.push("Question: " + matches[1]);
							module.push("Answers: " + matches[2]);
						}
					}
				]
			},
			"Square Button": "ButtonV2",
			//"Symbolic Password": "symbolicPasswordModule",
			//"Text Field": "TextField",
			//"The Clock": "TheClockModule",
			//"The Gamepad": "TheGamepadModule",
			//"TheBulb": "TheBulbModule",
			"TicTacToe": {
				ID: "TicTacToeModule",
				Lines: [
					{
						regex: /Starting row/
					},
					{
						regex: /Keypad is now/,
						value: function(matches, module) {
							var step = [];
							module.Step = step;

							module.push(["Step " + module.length + ":", step]);

							step.push({ label: matches.input, obj: pre(readMultiple(3)) });

							step.push(readLine()); // up next
							step.push(readLine()); // current row
						}
					},
					{
						regex: /Next expectation is|Clicked/,
						value: function(matches, module) {
							module.Step.push(matches.input);
						}
					}
				]
			},
			"Web design": {
				ID: "webDesign",
				Lines: [
					{
						regex: /For reference purpose/,
						value: function(matches, module) {
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
			"WhosOnFirstComponent": {
				ID: "WhosOnFirst",
				Lines: [
					{
						regex: /State randomized: Phase: (\d), Keypads: (.+)/,
						value: function(matches, module) {
							module.push("Current state: Phase: " + (parseInt(matches[1]) + 1) + " Keypads: " + matches[2].split(",").splice(0, 6).toString().replace(/,/g, ", "));
						}
					},
					{
						regex: /State randomized: Display word: (.+), DisplayWordIndex: \d+, Phase: \d/,
						value: function(matches, module) {
							module.push("Displayed word: " + matches[1]);
						}
					}
				]
			},
			//"Wire Placement": "WirePlacementModule",
			"WireSequencePage": {
				ID: "WireSequence",
				Lines: [
					{
						regex: /Snipped wire of color (\w+) of number (\d+)/,
						value: function(matches, module) {
							module.push("Snipped " + matches[1] + " wire #" + (parseInt(matches[2]) + 1));
						}
					}
				]
			},
			"WireSetComponent": {
				ID: "Wires",
				Lines: [
					{
						regex: /Wires.Count is now (\d)/,
						value: function(matches, module) {
							module.push("There are " + matches[1] + " wires");
						}
					}
				]
			},
			"Word Search": {
				ID: "WordSearchModule",
				Lines: [
					{
						regex: /Correct word is (.+)/,
						value: function(matches, module) {
							module.push("Solution: " + matches[1]);
						}
					},
					{
						regex: /Wrong words are (.+)/,
						value: function(matches, module) {
							module.push("Wrong Words: " + matches[1]);
						}
					},
					{
						regex: /Field:/,
						value: function(matches, module) {
							module.push({ label: 'Field:', obj: pre(readMultiple(6)) });
						}
					},
					{
						regex: /Coordinates clicked/
					}
				]
			},
			"X-Ray": {
				ID: "XRayModule",
				Lines: [
					{
						regex: /^(\d+)( = .*\. Solution symbol is )(\d+)\.$/,
						value: function(matches, module) {
							var span = $('<span>');
							span.append($("<img src='../HTML/img/X-Ray/Icon C" + matches[1] + ".png' width='20' />"));
							span.append($('<span>').text(matches[2]));
							span.append($("<img src='../HTML/img/X-Ray/Icon " + "ABC"[(matches[3] / 12) | 0] + (matches[3] % 12 + 1) + ".png' width='20' />"));
							span.append($('<span>').text("."));
							module.push(span);
							return true;
						}
					},
					{
						regex: /^Column (\d+), Row (\d+): symbol there is (\d+).$/,
						value: function(matches, module) {
							var span = $('<span>');
							span.append($("<img src='../HTML/img/X-Ray/Icon A" + matches[1] + ".png' width='20' />"));
							span.append($('<span>').text(" = Column " + matches[1] + ", "));
							span.append($("<img src='../HTML/img/X-Ray/Icon B" + matches[2] + ".png' width='20' />"));
							span.append($('<span>').text(" = Row " + matches[2] + ": symbol there is "));
							span.append($("<img src='../HTML/img/X-Ray/Icon " + "ABC"[(matches[3] / 12) | 0] + (matches[3] % 12 + 1) + ".png' width='20' />"));
							span.append($('<span>').text("."));
							module.push(span);
							return true;
						}
					},
					{
						regex: /.+/
					}
				]
			},
			//"Yahtzee": "YahtzeeModule",
			//"Zoo": "ZooModule"
		};

		var taglessRegex = [
			// TwoBits
			{
				regex: /Query(Responses|Lookups): (\[[\d\w]{1,2}\]: [\d\w]{1,2})/,
				value: function(matches) {
					var id = GetBomb().GetMod("TwoBits").IDs.length;
					if (matches[1] == "Lookups") {
						id = GetBomb().GetMod("TwoBits").IDs.length + 1;
					}

					var mod = GetBomb().GetModuleID("TwoBits", id);
					mod.push({ label: "Query " + matches[1], obj: pre(matches[2] + "\n" + readMultiple(99)), expandable: true });
					if (matches[1] == "Responses") {
						mod.push(readLine());
					}
				},
			},

			// Emoji Math
			// This has been removed due to the fact that both Emoji Math and Needy Math use the same logging.
			/*
			{
				regex: /\\d{1,}[+-]\\d{1,}/,
				value: function(matches) {
					readDirectly(matches.input, "Emoji Math");
				},
			},
			{
				regex: /Enter button pressed/,
				value: function() {
					readDirectly(readMultiple(2).replace(/^Answer:/, "Submitted:"), "Emoji Math");
				}
			}*/
		];

		readwarning = false;
		buildwarning = false;
		while (linen < lines.length) {
			var line = lines[linen];

			var pool = /(\d+) Pools:/.exec(line);
			if (pool) {
				linen += parseInt(pool[1]);
			}

			if (line !== "") {
				var match = /^[ \t]*\[(.+?)\] ?(.+)/.exec(line);
				if (match) {
					var obj = undefined;
					var id = undefined;

					var submatch = /(.+?) #(\d+)/.exec(match[1]);
					if (submatch) {
						obj = lineRegex[submatch[1]];
						id = submatch[2];
					} else obj = lineRegex[match[1]];

					if (obj) {
						if (typeof (obj) != "string") {
							var regex = (obj.Lines || obj);
							regex.some(function(handler) {
								var value = handler.value;
								var matches = (handler.regex || /.+/).exec(match[2]);
								if (matches) {
									try {
										if (value instanceof Function) {
											if (obj.Lines) {
												var module = id ? GetBomb().GetModuleID(obj.ID, id) : GetBomb().GetModule(obj.ID);
												if (value(matches, module, bomb.GetMod(obj.ID))) {
													return true;
												}
											} else if (value(matches, id)) {
												return true;
											}
										} else {
											readDirectly(match[2], obj.ID || value, id);
										}
									} catch (e) {
										console.log(e);

										if (!readwarning) {
											readwarning = true;
											toastr.warning("An error occurred while reading the logfile. Some information might be missing.", "Reading Warning");
										}
									}
								}
							});
						} else {
							readDirectly(match[2], obj, id);
						}
					} else if (bombgroup) {
						var modName = submatch ? submatch[1] : match[1];

						bombgroup.Bombs.some(function(bomb) {
							for (var modID in bomb.Modules) {
								if (getModuleName(modID) == modName) {
									readDirectly(match[2], modID, id);
									return true;
								}
							}
						});
					}
				} else {
					taglessRegex.some(function(handler) {
						var value = handler.value;
						var matches = handler.regex.exec(line);
						if (matches) {
							try {
								if (value instanceof Function) {
									value(matches);
								} else {
									readDirectly(match[2], value);
								}
							} catch (e) {
								console.log(e);

								if (!readwarning) {
									readwarning = true;
									toastr.warning("An error occurred while reading the logfile. Some information might be missing.", "Reading Warning");
								}
							}
						}
					});
				}
			}

			linen++;
		}

		$(".bomb, .bomb-info").remove();
		parsed.forEach(function(obj) { obj.ToHTML(url); });
		$('#ui').addClass('has-bomb');
		selectBomb(bombSerial);
		toastr.success("Log read successfully!");
	}

	function uploadFiles(files) {
		if (files.length === 1) {
			var fr = new FileReader();
			fr.onload = function() {
				dropMsg.removeClass("hovering");
				parseLog(fr.result);
			};
			fr.readAsText(files[0]);
		} else if (files.length === 0) {
			toastr.error("No file found.", "Upload Error");
			dropMsg.removeClass("hovering");
		} else {
			toastr.error("Please only upload 1 file at a time.", "Upload Error");
			dropMsg.removeClass("hovering");
		}
	}


	// EVENTS GO HERE

	// Handle uploading
	var dropMsg = $("#full-screen-msg");
	$(document).on("dragover", function(event) {
		event.preventDefault();
		event.stopPropagation();
		dropMsg.addClass("hovering");
	}).on("dragleave", function(event) {
		event.preventDefault();
		event.stopPropagation();

		dropMsg.removeClass("hovering");
	}).on("drop", function(event) {
		event.preventDefault();
		event.stopPropagation();

		var text = event.originalEvent.dataTransfer.getData("Text");
		if (!text) {
			uploadFiles(event.originalEvent.dataTransfer.files);
		} else {
			readPaste(text);
			dropMsg.removeClass("hovering");
		}
	}).on("paste", function(event) {
		var oEvent = event.originalEvent;
		event.preventDefault();

		var clipText = "";
		if (window.clipboardData) {
			clipText = window.clipboardData.getData("Text");
		} else if (typeof oEvent == "object" && oEvent.clipboardData) {
			clipText = oEvent.clipboardData.getData("text/plain");
		}
		readPaste(clipText);
		$('#paste').show();
		$('#paste-box').hide();
	});

	$('#paste-box').on("blur", function() {
		$('#paste').show();
		$('#paste-box').hide();
		return false;
	});
	$('#paste').click(function() {
		$('#paste').hide();
		$('#paste-box').show().focus();
		return false;
	});

	$("#upload").change(function() {
		uploadFiles(this.files);
	});

	window.onhashchange = function() {
		if (window.location.hash.length < 2)
			return;
		var pieces = window.location.hash.substr(1).split(';');
		var readUrl = null;
		var bombSerial = null;
		for (var i = 0; i < pieces.length; i++) {
			if (pieces[i].startsWith('url=')) {
				readUrl = pieces[i].substr(4);
			} else if (pieces[i].startsWith('bomb-')) {
				bombSerial = pieces[i].substr(5);
			}
		}
		if (readUrl)
			readPaste(readUrl, bombSerial);
		else if (bombSerial)
			selectBomb(bombSerial);
	};
	window.onhashchange();
});
