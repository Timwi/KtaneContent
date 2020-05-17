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
	"[Rules]",
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

class Groups {
	constructor() {
		this.groups = [];
		this.prefix = "Attempt #";
	}

	addGroup(avoidEmpty = false) {
		if (avoidEmpty && this.latest != null && this.latest.length == 0) return;
		this.groups.push(this.latest = []);
	}

	add(obj) {
		if (this.latest == null) {
			this.addGroup();
		}

		this.latest.push(obj);
	}
}

class ParsedMod {
	constructor(moduleData) {
		this.moduleData = moduleData;
		this.tree = undefined;
		this.counter = undefined;
		this.displayCounter = false;
		this.events = [];
	}
}

function convertID(id) {
	return (id.substring(0, 1).toUpperCase() + id.substring(1)).replace(/module$/i, "").replace(/^(spwiz|lgnd|Krit|ksm|R4Y|kata)/i, "").replace(/(?!\b)([A-Z])/g, " $1");
}

function $SVG(elem) {
	return $(`<svg>${elem}</svg>`).children().eq(0).unwrap();
}

function readHash() {
	var state = {};
	if (window.location.hash.length < 2) return state;

	window.location.hash.substr(1).split(";").forEach(function(param) {
		var parts = param.replace(/^bomb-/g, "bomb=").split("=");
		if (parts.length != 2) return;

		state[parts[0]] = parts[1];
	});

	return state;
}

function updateHash(state) {
	var newUrl = new URL(window.location.href);
	newUrl.hash = Object.entries(state).map(function(entry) { return entry.join("="); }).join(";");
	history.replaceState(null, null, newUrl.toString());
}

$(function() {
	// Read Logfile
	var readwarning = false;
	var buildwarning = false;
	var debugging = (window.location.protocol == "file:" || window.location.hostname == "127.0.0.1");
	var linen = 0;
	var lines = [];
	let websiteParseData;

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
					} else if (typeof (node) === "object" && "obj" in node) {
						if (node.expandable) {
							makeExpandable(elem, node.label === undefined ? "" : node.label);
							if (node.expanded)
								elem.addClass("expanded");
							elem.append(node.obj);
						} else {
							elem.text(node.label).append(node.obj);
						}
					} else if (typeof (node) === "object" && "label" in node) {
						elem.html(node.label);
						if (node.css)
							elem.css(node.css);
					} else if (typeof (node) === "object" && "linebreak" in node) {
						elem.remove();
						$("<br>").appendTo(parent);
					} else {
						console.log("Unrecognized node: " + node);
						console.log(node);
					}

					if (typeof (node) === "object" && "nobullet" in node) elem.addClass("no-bullet");
				}
			});

			if (typeof (tree) === "object" && "groups" in tree) {
				var groups = tree.groups.groups;
				if (groups.length == 1) {
					makeTree(groups[0], parent);
				} else {
					groups.forEach(function(group, i) {
						var elem = $("<li>").appendTo(parent);
						makeExpandable(elem, tree.groups.prefix + (i + 1));
						makeTree(group, $("<ul>").appendTo(elem));
					});
				}
			}
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

		if (!a.length || !div.length) return false;

		$(".bomb.selected").removeClass("selected");
		a.addClass("selected");
		$(".bomb-group").hide();
		div.parent().show();

		$("body").scrollTop(div.offset().top);
		div.find('.autopress').click();

		// Update hash
		var state = readHash();
		state.bomb = serial;
		updateHash(state);

		return false;
	}

	function formatTime(seconds) {
		const timeParts = [];

		const negative = seconds < 0;
		if (negative) seconds = -seconds;

		let showRemaining = false;
		for (const part of [3600, 60, 1]) {
			if (showRemaining || seconds / part >= 1 || part == 1) {
				timeParts.push(Math.floor(seconds / part).toString().padStart(2, "0"));
				seconds -= Math.floor(seconds / part) * part;
				showRemaining = true;
			}
		}

		return `${negative ? "-" : ""}${timeParts.join(":")}.${Math.round(seconds * 100).toString().padStart(2, "0")}`;
	}

	$.fn.addCardClick = function(info) {
		var infoCard = $(this);
		infoCard
			.click(function() {
				const parent = infoCard.parent().parent().parent();
				parent.find(".module-info").hide();
				info.show();
				parent.find(".selected").removeClass("selected");
				infoCard.addClass("selected");

				return false;
			})
			.mousedown(function() { return false; });

		return infoCard;
	};

	class BombGroup {
		constructor() {
			this.Bombs = [];
			this.Modules = {};
			this.State = "Unsolved";
			this.MissionName = "Unknown";
			this.StartLine = 0;
			this.FilteredLog = "";
			this.ParseAgain = []; // Lines that might be for a module but couldn't be matched by name. If Tweaks is installed, it'll try to parse these again once the LFABombInfo is logged.
			this.LoggedSerials = [];
			this.Events = [];
		}

		get loggedBombs() {
			return this.Bombs.filter(bomb => this.LoggedSerials.length == 0 || this.LoggedSerials.includes(bomb.Serial));
		}

		get isSingleBomb() {
			return this.loggedBombs.length == 1;
		}

		// opt: { url: '' } or { file: '' }
		ToHTML(opt) {
			// Build up the bomb.
			var serial = this.Bombs[0].Serial;
			var fragment = `#bomb=${serial}`;
			if (opt.url)
				fragment += `;#url=${opt.url}`;
			else if (opt.file)
				fragment += `;#file=${opt.file}`;
			var bombHTML = $("<a href='" + fragment + "' class='bomb' data-serial='" + serial + "'>")
				.appendTo($("#bombs"))
				.click(function() { selectBomb(serial); return false; })
				.mousedown(function() { return false; });
			var bombGroupHTML = $("<div class='bomb-group'>").hide().appendTo("#wrap");

			var totalModules = 0;
			var totalNeedies = 0;
			this.loggedBombs.forEach(function(bomb) {
				totalModules += bomb.TotalModules;
				totalNeedies += bomb.Needies;

				$("<div class='serial'>").text(bomb.Serial).appendTo(bombHTML);
			});

			$("<div class='module-count'>").text(totalModules).appendTo(bombHTML);
			if (totalNeedies > 0) {
				$("<div class='needy-count'>").text(totalNeedies).appendTo(bombHTML);
			}
			if (this.RuleSeed && this.RuleSeed != 1) {
				$("<div class='rule-seed'>").text(this.RuleSeed).appendTo(bombHTML);
			}

			var filteredTab = $("<button class='module'>").text("Filtered Log");


			var info = $("<div class='bomb-info'>").css("padding-top", "10px").appendTo(bombGroupHTML);
			var modules = $("<div class='modules'>").appendTo(info);

			// Mission Information
			var missionInfo = $("<div class='module-info'>").appendTo(info);
			$("<h3>").css("margin-top", "10px").text("Mission Information").appendTo(missionInfo);

			var missionInfoTree = [
				"Mission: " + this.MissionName
			];

			if (this.isSingleBomb) {
				var singleBomb = this.Bombs[0];
				missionInfoTree.push(
					"State: " + singleBomb.State,
					`Solved: ${singleBomb.Solved}/${singleBomb.TotalModules}`,
					"Strikes: " + singleBomb.Strikes + "/" + singleBomb.TotalStrikes,
					"Total Time: " + formatTime(singleBomb.Time),
					"Time Left: ~" + formatTime(singleBomb.TimeLeft)
				);
			} else {
				missionInfoTree.push("State: " + this.State);
			}
			makeTree(missionInfoTree, $("<ul>").appendTo(missionInfo));

			$("<button class='module'>")
				.text("Mission Information")
				.appendTo(modules)
				.addCardClick(missionInfo).click();

			// Events
			var eventInfo = $("<div class='module-info'>").appendTo(info);
			$("<h3>").css("margin-top", "10px").text("Events").appendTo(eventInfo);
			makeTree(this.Events.length > 0 ? this.Events : ["No events."], $("<ul>").appendTo(eventInfo));

			$("<button class='module'>")
				.text("Events")
				.appendTo(modules)
				.addCardClick(eventInfo);

			this.loggedBombs.forEach(function(bomb) {
				bomb.ToHTML(filteredTab).appendTo(bombGroupHTML);
			});

			$("<hr color=#ccc size=1>").appendTo(bombGroupHTML);

			var info = $("<div class='bomb-info'>").appendTo(bombGroupHTML);
			var modules = $("<div class='modules'>").appendTo(info);

			// Filtered log
			if (this.FilteredLog === "") {
				this.FilterLines();
			}

			var logInfo = $("<div class='module-info'>").appendTo(info);
			$("<h3>").css("margin-top", "10px").text("Filtered Log").appendTo(logInfo);
			$("<pre>").css("white-space", "pre-wrap").text(this.FilteredLog).appendTo(logInfo);
			filteredTab.appendTo(modules).addCardClick(logInfo);

			return bombHTML;
		}

		GetMod(name, id) {
			var mod;
			this.Bombs.forEach(function(bomb) {
				mod = (mod || bomb.GetMod(name, id));
			});

			if (!mod && debugging) {
				console.warn("Unable to find module: " + name);
			}

			return mod;
		}

		GetModule(name) {
			var mod;
			this.Bombs.forEach(function(bomb) {
				mod = (mod || bomb.GetModule(name));
			});

			return mod;
		}

		GetModuleID(name, id) {
			var mod;
			this.Bombs.forEach(function(bomb) {
				mod = (mod || bomb.GetModuleID(name, id, false));
			});

			if (mod) return mod;

			for (const bomb of this.Bombs) {
				mod = bomb.GetModuleID(name, id);
				if (mod) return mod;
			}
		}

		FilterLines() {
			if (!this.StartLine) {
				return;
			}

			var log = "";
			for (var i = this.StartLine; i < linen; i++) {
				const line = lines[i].replace(/^([ \t]*)\[(?:Assets\.Scripts\.(?:\w+\.)+)?(.+?)\]( ?(.+))/, "$1[$2]$3");

				if (line == "[AlarmClockExtender] Settings loaded. Settings = {") {
					i += 15;
					continue;
				}

				if (line.match(/\[BombGenerator\] Module type ".+" in component pool,/)) {
					i += 3;
					continue;
				}

				var blacklisted = blacklist.some(val => line.includes(val));
				if (blacklisted) continue;

				log += lines[i] + "\n";
			}

			this.StartLine = undefined;
			this.FilteredLog = log.replace(/\n{3,}/g, "\n\n");
		}
	}

	function Bomb(seed) {
		this.Seed = seed;
		this.Time = 0;
		this.TimeLeft = 0;
		this.Strikes = 0;
		this.TotalStrikes = 0;
		this.Modules = {};
		this.Solved = 0;
		this.TotalModules = 0;
		this.Needies = 0;
		this.Indicators = [];
		this.Batteries = [];
		this.ModdedWidgets = 0;
		this.ModdedWidgetInfo = [];
		this.PortPlates = [];
		this.ModdedBatteries = [];
		this.ModdedIndicators = [];
		this.ModdedPortPlates = [];
		this.ModdedTwoFactor = [];
		this.DayTimeWidgets = [];
		this.Serial = "";
		this.State = "Unsolved";
		this.StartLine = 0;
		this.FilteredLog = "";

		this.Anchors = null;
		this.ModuleOrder = null;

		this.LoggingIDs = {};

		this.GetMod = function(name, id) {
			var mod = this.Modules[name];

			return mod != null && (id == undefined || mod.IDs.some(mod => mod[0] == "#" + id)) ? mod : null;
		};
		this.GetModule = function(name) {
			var mod = this.GetMod(name);
			return mod ? mod.Tree : undefined;
		};
		this.GetModuleID = function(name, id, createIfMissing = true) {
			var mod = this.GetMod(name);
			if (!mod) {
				return undefined;
			}

			var module = mod.IDs;

			if (parseInt(id) > 2147483646) {
				console.error("ID is larger than a 32 bit int, make sure your module counts from 1.");
				return null;
			}

			if (id === undefined) {
				id = mod.IDs.length;
			}

			var info;
			module.forEach(function(mod) {
				if (mod[0] == "#" + id) {
					info = mod[1];
				}
			});

			if (info || !createIfMissing) {
				return info;
			}

			info = ["#" + id, []];
			info[1].groups = new Groups();
			module.push(info);

			return info[1];
		};
		this.ToHTML = function(filteredTab) {
			var serial = this.Serial;
			var info = $("<div class='bomb-info' id='bomb-" + serial + "'>");

			// Build the edgework.
			var edgework = $("<div class='edgework'>").appendTo(info);

			$("<div class='widget serial'>").text(serial).appendTo(edgework);

			if (this.DayTimeWidgets.length > 0) {
				edgework.append("<div class='widget separator'>");

				this.DayTimeWidgets.forEach(function(val) {
					const widget = $("<div class='widget'>")
						.addClass(val[0].toLowerCase())
						.appendTo(edgework);

					switch (val[0]) {
						case "RandomizedTime":
							widget.append(
								$("<span class='shadow'>").text(`⠃${val[1].replace(/\d/g, "8")}`),
								$("<span class='label'>").html(`${val[2] == "MIL" ? "<span style='visibility: hidden'>⠃</span>" : val[2] == "AM" ? "⠁" : "⠂"}${val[1]}`)
							);
							break;
						case "ManufactureDate":
							widget.append($("<span class='label'>").text(val[1].replace("-", " ")));
							break;
						case "DayoftheWeek": {
							const split = val[1].split("-");
							const colors = {
								"Yellow": "yellow",
								"Brown": "rgb(135, 85, 52)",
								"Blue": "rgb(0, 148, 255)",
								"White": "white",
								"Magenta": "magenta",
								"Green": "rgb(0, 255, 44)",
								"Orange": "rgb(255, 195, 0)"
							};

							widget.toggleClass("colored", val[3]).append(
								$("<span class='weekday'>").css("color", colors[val[2]]).text(split[0] + " "),
								$("<span>").addClass(val[4] == "(DD/MM)" ? "day" : "month").text(split[1]),
								$("<span>-</span>"),
								$("<span>").addClass(val[4] == "(DD/MM)" ? "month" : "day").text(split[2])
							);
							break;
						}
					}
				});
			}

			var edgeworkSeparator = false;
			if (this.Batteries.length > 0) {
				edgeworkSeparator = true;
				edgework.append("<div class='widget separator'>");

				this.Batteries.sort().reverse();
				this.Batteries.forEach(function(val) {
					$("<div class='widget battery'>")
						.addClass(val == 1 ? "d" : "aa")
						.appendTo(edgework);
				});
			}

			//Multiple Widget Batteries
			if (this.ModdedBatteries.length > 0) {
				if (!edgeworkSeparator) {
					edgework.append("<div class='widget separator'>");
				}

				this.ModdedBatteries.sort(function(batt1, batt2) {
					if (batt1[0] < batt2[0]) return -1;
					if (batt1[0] > batt2[0]) return 1;
					if (batt1[1] < batt2[1]) return -1;
					if (batt1[1] > batt2[1]) return 1;
					if (batt1[2] < batt2[2]) return -1;
					if (batt1[2] > batt2[2]) return 1;
					return 0;
				}).reverse();

				this.ModdedBatteries.forEach(function(val) {
					if (val[0] == "MultipleWidgets:Batteries") {
						if (val[1] > 0) {
							$("<div class='widget multiplewidgets battery'>")
								.addClass(val[1] == 4 ? "fouraa" : val[1] == 3 ? "threeaa" : val[1] == 2 ? "twoaa" : "ninevolt")
								.appendTo(edgework);
						} else {
							$("<div class='widget multiplewidgets battery'>")
								.addClass(val[2] == 4 ? "emptyfouraa" : val[2] == 3 ? "emptythreeaa" : val[2] == 2 ? "emptytwoaa" : "emptyninevolt")
								.appendTo(edgework);
						}
					}
				});
			}

			edgeworkSeparator = false;
			if (this.Indicators.length > 0) {
				edgeworkSeparator = true;
				edgework.append("<div class='widget separator'>");

				this.Indicators.sort(function(ind1, ind2) {
					if (ind1[0] < ind2[0]) return -1;
					if (ind1[0] > ind2[0]) return 1;
					if (ind1[1] < ind2[1]) return -1;
					if (ind1[1] > ind2[1]) return 1;
					return 0;
				});

				this.Indicators.forEach(function(val) {
					$("<div class='widget indicator'>")
						.addClass(val[0])
						.appendTo(edgework)
						.append($("<span class='label'>").text(val[1]));
				});
			}
			//Multiple Widgets Indicator
			//Encrypted Indicator
			if (this.ModdedIndicators.length > 0) {
				if (!edgeworkSeparator) {
					edgework.append("<div class='widget separator'>");
				}

				this.ModdedIndicators.sort(function(ind1, ind2) {
					if (ind1[0] < ind2[0]) return -1;
					if (ind1[0] > ind2[0]) return 1;
					if (ind1[1] < ind2[1]) return -1;
					if (ind1[1] > ind2[1]) return 1;
					if (ind1[2] < ind2[2]) return -1;
					if (ind1[2] > ind2[2]) return 1;
					return 0;
				});

				this.ModdedIndicators.forEach(function(val) {
					switch (val[0]) {
						case "MultipleWidgets:EncryptedIndicator":
						case "MultipleWidgets:Indicator":
							$("<div class='widget multiplewidgets indicator'>")
								.addClass(val[1].toLowerCase())
								.appendTo(edgework)
								.append($("<span class='label'>").text(val[2]));
							break;
						case "EncryptedIndicatorWidget":
							$("<div class='widget encryptedindicator'>")
								.addClass(val[1])
								.appendTo(edgework)
								.append($("<span class='label'>").text(val[2]));
							break;
						case "NumberedIndicator": {
							const colors = {
								red: "225, 3, 3",
								orange: "6, 107, 27",
								yellow: "255, 248, 0",
								green: "6, 107, 27",
								blue: "12, 0, 152",
								purple: "172, 14, 206",
								black: "0, 0, 0",
								white: "255, 255, 255",
								brown: "129, 66, 9"
							};

							$("<div class='widget numberedindicator'>")
								.addClass(val[1])
								.css("background-color", `rgb(${colors[val[4]]})`)
								.appendTo(edgework)
								.append($("<span class='label'>").text(val[3]));
							break;
						}
					}
				});
			}
			edgeworkSeparator = false;

			if (this.PortPlates.length > 0) {
				edgework.append("<div class='widget separator'>");
				edgeworkSeparator = true;

				this.PortPlates.forEach(function(val) {
					var plate = $("<div class='widget portplate'>").appendTo(edgework);
					val.forEach(function(port) {
						$("<span>").addClass(port.toLowerCase()).appendTo(plate);
					});
				});
			}

			if (this.ModdedPortPlates.length > 0) {
				if (!edgeworkSeparator) {
					edgework.append("<div class='widget separator'>");
				}

				this.ModdedPortPlates.sort(function(pp1, pp2) {
					if (pp1[0] < pp2[0]) return -1;
					if (pp1[0] > pp2[0]) return 1;
					return 0;
				});

				this.ModdedPortPlates.forEach(function(val) {
					if (val[0] == "MultipleWidgets:Ports") {
						var plate = $("<div class='widget multiplewidgets portplate'>").appendTo(edgework);
						val[1].forEach(function(port) {
							$("<span>").addClass(port.toLowerCase()).appendTo(plate);
						});
					}
				});
			}

			if (this.ModdedTwoFactor.length > 0) {
				edgework.append("<div class='widget separator'>");

				this.ModdedTwoFactor.sort(function(tfa1, tfa2) {
					if (tfa1[0] < tfa2[0]) return -1;
					if (tfa1[0] > tfa2[0]) return 1;
					return 0;
				});

				this.ModdedTwoFactor.forEach(function(val) {
					if (val == "TwoFactorWidget") {
						edgework.append("<div class='widget twofactor'>");
					}
					if (val == "MultipleWidgets:TwoFactor") {
						edgework.append("<div class='widget multiplewidgets twofactor'>");
					}
				});
			}

			// Modules
			var modules = $("<div class='modules'>").appendTo(info);

			// Edgework Information
			var indicators = this.Indicators.map(function(val) { return val.join(" "); });

			var ports = {};
			this.PortPlates.forEach(function(plate) {
				plate.forEach(function(port) {
					if (!ports[port]) {
						ports[port] = 0;
					}

					ports[port]++;
				});
			});

			var portList = [];
			Object.keys(ports).forEach(function(port) {
				var count = ports[port];
				portList.push((count > 1 ? count + " × " : "") + (PortNames[port] || port));
			});

			var caseHTML = $("<span>").text("Unknown");

			var edgeworkInfo = $("<div class='module-info'>").appendTo(info);
			$("<h3>").text("Edgework").appendTo(edgeworkInfo);
			makeTree([
				"Serial: " + this.Serial,
				"Batteries: " + this.Batteries.reduce(function(a, b) { return a + b; }, 0),
				"Holders: " + this.Batteries.length,
				"Ports: " + (portList.length > 0 ? portList.join(", ") : "None"),
				"Indicators: " + (indicators.length > 0 ? indicators.join(", ") : "None"),
				"Port Plates: " + this.PortPlates.length,
				"Widgets: " + (this.Batteries.length + indicators.length + this.PortPlates.length + this.ModdedWidgets),
				this.ModdedWidgetInfo.length > 0 ? ["Modded Widgets:", this.ModdedWidgetInfo] : null,
				{ label: "Case: ", obj: caseHTML }
			], $("<ul>").appendTo(edgeworkInfo));

			$("<button class='module'>")
				.text("Edgework")
				.appendTo(modules)
				.addCardClick(edgeworkInfo);

			// Convert modules
			var mods = [];
			for (var moduleID in this.Modules) {
				if (this.Modules.hasOwnProperty(moduleID)) {
					var mod = this.Modules[moduleID];

					const parsedMod = new ParsedMod(mod.moduleData);
					parsedMod.events = mod.Events;

					if (mod.IDs.length === 0) {
						if (mod.Tree.length !== 0 || mod.Tree.groups.groups.length !== 0) {
							parsedMod.tree = mod.Tree;
						}
					} else {
						const IDs = mod.IDs.filter(info => this.LoggingIDs == null || this.LoggingIDs[moduleID] == null || this.LoggingIDs[moduleID].includes(parseInt(info[0].substring(1))));

						IDs.forEach(info => {
							const modClone = Object.assign({}, parsedMod);
							modClone.tree = info[1];
							modClone.counter = info[0];
							modClone.displayCounter = IDs.length != 1;
							modClone.events = IDs.length == 1 ? mod.Events : mod.Events.filter(event => "#" + event.loggingID == info[0]);
							mods.push(modClone);
						});

						continue;
					}

					mods.push(parsedMod);
				}
			}

			mods.sort(function(modA, modB) {
				let sortKeyA = modA.moduleData.displayName.toLowerCase();
				if (modA.counter) {
					sortKeyA += modA.counter;
				}

				let sortKeyB = modB.moduleData.displayName.toLowerCase();
				if (modB.counter) {
					sortKeyB += modB.counter;
				}

				sortKeyA = sortKeyA.replace(/^the /i, "");
				sortKeyB = sortKeyB.replace(/^the /i, "");

				if (sortKeyA < sortKeyB) {
					return -1;
				} else if (sortKeyA > sortKeyB) {
					return 1;
				}

				return 0;
			});

			// Display modules
			mods.forEach(function(parseData) {
				// Information
				var moduleInfo = $("<div class='module-info'>").appendTo(info).data('module-id', parseData.moduleID);
				$("<h3>").text(parseData.moduleData.displayName).appendTo(moduleInfo);
				if (parseData.tree && (parseData.tree.length !== 0 || parseData.tree.groups.groups.length !== 0)) {
					makeTree(parseData.tree, $("<ul>").appendTo(moduleInfo));
				} else if (parseData.moduleData.hasLogging === false) {
					$("<p>").text("Doesn't have logging.").appendTo(moduleInfo);
				} else {
					$("<p>")
						.html("Please check the ")
						.append($('<a href="#bomb=' + serial + '">Filtered Log</a>').click(function() {
							filteredTab.click();
							return false;
						}))
						.append(' as the information for this module cannot be automatically parsed.')
						.appendTo(moduleInfo);
				}

				// Listing
				var modListing = $(`<button class='module module-${parseData.moduleData.moduleID.replace(/[^-_A-Za-z0-9]/g, '-')}'>`)
					.appendTo(modules)
					.addCardClick(moduleInfo);

				var buttonGrid = $("<div>")
					.text(parseData.moduleData.displayName + (parseData.displayCounter ? " " + parseData.counter : ""))
					.appendTo(modListing);

				const eventData = {
					"STRIKE": {
						symbol: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 100 100" height="30px"><path d="M96 14L82 0 48 34 14 0 0 14l34 34L0 82l14 14 34-34 34 34 14-14-34-34z" fill="red"/></svg>',
						color: "rgb(100, 0, 0)",
						scale: 1
					},
					"PASS": {
						symbol: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 270" height="30px"><path stroke="rgb(16, 229, 60)" stroke-width="60" fill="none" d="M30 170l80 60L245 20"></path></svg>',
						color: "rgb(0, 110, 20)",
						scale: 2.7
					}
				};

				const eventIndicator = $("<div class='event-indicators'>").appendTo(buttonGrid);
				let moduleColor = 0;
				for (const eventType in eventData) {
					const eventTotal = parseData.events.filter(event => event.type === eventType).length;
					const data = eventData[eventType];
					if (eventTotal < 4) {
						for (let i = 0; i < eventTotal; i++) {
							eventIndicator.append($SVG(data.symbol));
						}
					} else {
						eventIndicator.append(
							$SVG(data.symbol).append(
								$SVG('<text dominant-baseline="middle" text-anchor="middle" stroke="white" stroke-width="12">').text(eventTotal).css({ "paint-order": "stroke", "font-weight": "bold", "font-size": "57px", "transform": `translate(50%, 50%) scale(${data.scale})`, fill: data.color })
							)
						);
					}

					if (eventType == "PASS")
						moduleColor += eventTotal;
				}

				if (parseData.events.length > 0) {
					const strikes = parseData.events.length - moduleColor;
					modListing.css("border-right", `5px solid hsla(${moduleColor / parseData.events.length * 120}, 100%, 50%)`).attr("title", `(${moduleColor} solve${moduleColor == 1 ? "" : "s"}, ${strikes} strike${strikes == 1 ? "" : "s"})`);
				} else if (!(parseData.tree && (parseData.tree.length !== 0 || parseData.tree.groups.groups.length !== 0))) {
					modListing.css("border-right", "5px solid rgba(127, 127, 127, 0.25)").attr("title", "(No logging was parsed)");
				} else {
					modListing.css("padding-right", "10px");
				}

				$("<img>")
					.on("error", function() {
						console.warn("Couldn't find a module icon for %s. More information: %o", parseData.moduleData.displayName, parseData);
						$(this).attr("src", "../Icons/blank.png");
					}).attr("src", "../Icons/" + encodeURI(parseData.moduleData.icon) + ".png").appendTo(buttonGrid);
			});

			// Case representation
			if (this.Anchors != null && this.ModuleOrder != null) {
				const viewBox = [0, 0, 0, 0];

				const faceParent = $("<div>").css("position", "relative");
				caseHTML.replaceWith(faceParent);

				const faceStyle = { width: "50%", "transform-origin": "center", "backface-visibility": "hidden", "transition": "transform 0.5s" };
				let svg = $SVG("<svg>")
					.css(faceStyle)
					.appendTo(faceParent);

				// Build the faces.
				const frontFace = svg;
				for (let moduleIndex = 0; moduleIndex < this.ModuleOrder.length; moduleIndex++) {
					if (moduleIndex == this.ModuleOrder.length / 2) {
						svg = $SVG("<svg>")
							.css(faceStyle)
							.css({ "transform": "rotateY(180deg)", "display": "block", "position": "absolute", "top": 0 })
							.appendTo(faceParent);
					}

					if (this.ModuleOrder[moduleIndex] == null)
						continue;

					const moduleSplit = this.ModuleOrder[moduleIndex].split(" ");
					const ID = moduleSplit.splice(moduleSplit.length - 1);
					const moduleID = moduleSplit.join(" ");

					const matchingModules = mods.filter(mod => (ID == "-" || mod.counter == `#${ID}`) && mod.moduleData.moduleID == moduleID);
					const module = matchingModules.length >= 1 ? matchingModules[0] : {
						moduleData: {
							icon: (moduleID == "Empty" || moduleID == "Timer") ? moduleID : "blank"
						}
					};

					// The X axis needs to be flipped for the back face, so we multiply it by -1.
					// And the Y axis is always upside down, so we always multiply it by -1.
					const x = this.Anchors[moduleIndex][0] * (moduleIndex < this.ModuleOrder.length / 2 ? 1 : -1);
					const y = this.Anchors[moduleIndex][1] * -1;
					const image = $SVG(`<image x=${x} y=${y} xlink:href="../Icons/${encodeURI(module.moduleData.icon)}.png" width=.22 height=.22>`).appendTo(svg);
					$SVG(`<rect x=${x} y=${y} width=.22 height=.22 stroke=black stroke-width=0.005 fill=none>`).appendTo(svg);

					for (let j = 0; j < 4; j++) {
						viewBox[j] = Math[j < 2 ? "min" : "max"](viewBox[j], (j % 2 == 0 ? x : y) + (j < 2 ? 0 : 0.22));
					}
					svg.attr("viewBox", `${viewBox[0]} ${viewBox[1]} ${Math.abs(viewBox[0]) + viewBox[2]} ${Math.abs(viewBox[1]) + viewBox[3]}`);
					svg.width(`${0.5 * Math.min(Math.abs(viewBox[0]) + viewBox[2] / 0.66, 1) * 100}%`);

					// Attempt to make the image pixelated
					image.css("image-rendering", "crisp-edges");
					if (image.css("image-render") == null) {
						image.css("image-rendering", "pixelated");
					}
				}
				const backFace = svg;

				let currentFace = false; // false = front, back = true
				faceParent.click(() => {
					currentFace = !currentFace;
					const degrees = currentFace ? 180 : 0;
					frontFace.css("transform", `rotateY(${degrees}deg)`);
					backFace.css("transform", `rotateY(${180 - degrees}deg)`);
				}).after("(Click to flip)");
			}

			return info;
		};
	}

	// opt = {
	//      log:    entire file contents
	//      url:    URL of the file (if available and no 'file')
	//      file:   filename of the file (if available and no 'url')
	//      bomb:   bomb serial number to switch to when done
	//      module: module ID to find and switch to when done
	// }
	function parseLog(opt) {
		var log = opt.log.replace(/\r/g, "");

		if (!(/^Initialize engine version: .+ .+|Desktop is \d+ x \d+ @ \d+ Hz|Mono path\[0\] = '/.exec(log))) {
			toastr.error("Invalid logfile.", "Reading Error");
			return false;
		}

		var bombgroup;
		var lastBombGroup;
		var bomb;
		var ruleseed;
		var parsed = [];
		var bombSerialIndex = 0;
		let parseData = [];

		function GetBomb() {
			return bombgroup || bomb;
		}

		function pre(line) {
			return $('<pre>').text(line.replace(/^\n/g, ""));
		}

		function removeTag(str) {
			return str.replace(/^[ \t]*\[.+?\] /, '');
		}

		function readDirectly(line, name, id) {
			if (line instanceof Array) {
				line.forEach(function(val) {
					readDirectly(val, name, id);
				});
				return;
			}

			var match = /^=svg\[(.*?)\](<svg .*<\/svg>)$/.exec(line);
			if (match)
				line = {
					label: match[1],
					obj: $(match[2])
				};

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

		function readTaggedLine() {
			return /^[ \t]*\[(?:Assets\.Scripts\.(?:\w+\.)+)?.+?\] ?(.+)/.exec(readLine())[1];
		}

		function readMultiple(count, fnc) {
			var lines = '';
			for (var i = 0; i < count; i++) {
				lines += (i === 0 ? '' : "\n") + (fnc ? fnc(readLine()) : readLine());
			}
			return lines;
		}

		// (Store keys for the below function so it doesn't need to search through the entire parseData every time.)
		parseKeys = [];
		function generateParseDataKeys(field)
		{
			parseKeys[field] = [];
			parseData.forEach((moduleData, index) => {
				if (parseKeys[field][moduleData[field]] !== undefined) {
					return;
				} else if (Array.isArray(moduleData[field])) {
					moduleData[field].forEach((individual, secondIndex) => parseKeys[field][individual] = [index, secondIndex]);
				} else if (moduleData[field] !== undefined) {
					parseKeys[field][moduleData[field]] = index;
				}
			});
		}

		// Get module data based on a field.
		// Also changes fields that have multiple values into the one relevant to the field.
		function getModuleData(value, field = "loggingTag") {
			if (parseKeys[field] === undefined)
				generateParseDataKeys(field);


			if (Array.isArray(parseKeys[field][value])) {
				const singleModuleData = Object.assign({}, parseData[parseKeys[field][value][0]]);
				const index = parseKeys[field][value][1];
				const fields = ["loggingTag", "moduleID", "displayName", "icon"];

				for (const field of fields) {
					if (!Array.isArray(singleModuleData[field])) continue;

					singleModuleData[field] = singleModuleData[field][index];
				}
				return singleModuleData;
			} else if (parseKeys[field][value] !== undefined) {
				return Object.assign({}, parseData[parseKeys[field][value]]);
			}

			return null;
		}

		// All of the data used for parsing
		parseData = [
			{
				loggingTag: "State",
				matches: [
					{
						regex: /Enter GameplayState/,
						handler: function() {
							bombgroup = undefined;
						}
					},
					{
						regex: /OnRoundEnd\(\)/,
						handler: function() {
							bombgroup.FilterLines();
							bombgroup = undefined;
						}
					}
				]
			},
			{
				loggingTag: "Bomb",
				matches: [
					{
						regex: /Strike from (?:.+)! (\d+) \/ \d+ strikes/,
						handler: function(matches) {
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
						handler: function() {
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
						handler: function() {
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
						handler: function(matches) {
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
						handler: function(matches) {
							bomb.Time = parseInt(matches[1]);
							bomb.TimeLeft = bomb.Time;
							bomb.TotalStrikes = parseInt(matches[2]);
						}
					},
					{
						regex: /Selected ([\w ]+) \(.+ \((.+)\)\)/,
						handler: function(matches) {
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
						handler: function() {
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
						handler: function(matches) {
							if (matches[1] == "ModWidget") {
								bomb.ModdedWidgets++;
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
						handler: function(matches) {
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
						handler: function(matches) {
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
						handler: function(matches) {
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
						handler: function(matches) {
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
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`Day of the Week: ${matches[3]} ${matches[4]} Color: ${matches[2]} ${matches[1]}`);
							bomb.DayTimeWidgets.push(["DayoftheWeek", matches[3], matches[2], matches[1] == "(colors enabled)", matches[4]]);
							bomb.ModdedWidgetInfo.push(`Manufacture Date: ${matches[5]}`);
							bomb.DayTimeWidgets.push(["ManufactureDate", matches[5]]);
						}
					},
					{
						regex: /Day of the week: (\(colors(?: not)? enabled\)) (.+) (.+-.+-.+) (\(\w{2}\/\w{2}\))/,
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`Day of the Week: ${matches[3]} ${matches[4]} Color: ${matches[2]} ${matches[1]}`);
							bomb.DayTimeWidgets.push(["DayoftheWeek", matches[3], matches[2], matches[1] == "(colors enabled)", matches[4]]);
						}
					},
					{
						regex: /Manufacture Date: (.+-.+)/,
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`Manufacture Date: ${matches[1]}`);
							bomb.DayTimeWidgets.push(["ManufactureDate", matches[1]]);
						}
					},
					{
						regex: /Chosen time: (\d{2}:\d{2})(MIL|PM|AM)/,
						handler: function(matches) {
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
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`Encrypted Indicator: ${matches[1]} ${matches[2]} (${matches[3]})`);
							bomb.ModdedIndicators.push(["EncryptedIndicatorWidget", matches[1], matches[2]]);
						}
					},
					{
						regex: /Randomizing: ((?:un)?lit) ([A-Z]{3})/,
						handler: function(matches) {
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
						handler: function() {
							bomb.ModdedWidgetInfo.push(`MultipleWidgets: Two Factor`);
							bomb.ModdedTwoFactor.push(`MultipleWidgets:TwoFactor`);
						}
					},
					{
						regex: /Encrypted Indicator ((?:un)?lit|Black|White|Gray|Red|Orange|Yellow|Green|Blue|Purple|Magenta) ([ԒใɮʖฬนÞฏѨԈดลЖ]{3}) acting as (?:(?:un)?lit|Black|White|Gray|Red|Ornage|Yellow|Green|Blue|Purple|Magenta) ([A-Z]{3})/,
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`MultipleWidgets: Encrypted Indicator: ${matches[1]} ${matches[2]} (${matches[3]})`);
							bomb.ModdedIndicators.push(["MultipleWidgets:EncryptedIndicator", matches[1], matches[2]]);
						}
					},
					{
						regex: /Indicator ((?:un)?lit|Black|White|Gray|Red|Orange|Yellow|Green|Blue|Purple|Magenta) ([A-Z]{3})/,
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`MultipleWidgets: Indicator: ${matches[1]} ${matches[2]}`);
							bomb.ModdedIndicators.push(["MultipleWidgets:Indicator", matches[1], matches[2]]);
						}
					},
					{
						regex: /Putting ([0-4]) batter(?:ies|y) into a holder that fits ([1-4]) batter(?:ies|y)./,
						handler: function(matches) {
							bomb.ModdedWidgetInfo.push(`MultipleWidgets: Batteries: ${matches[1]} in ${matches[2]}`);
							bomb.ModdedBatteries.push(["MultipleWidgets:Batteries", parseInt(matches[1]), parseInt(matches[2])]);
						}
					},
					{
						regex: /Ports \((Vanilla 1|Vanilla 2|New Ports|TV\/Monitor Ports|Computer Ports|Everything)\): (.*)/,
						handler: function(matches) {
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
						handler: function() {
							bomb.ModdedWidgetInfo.push(`Two Factor`);
							bomb.ModdedTwoFactor.push(`TwoFactorWidget`);
						}
					}
				]
			},
			{
				loggingTag: "MultipleBombs",
				matches: [
					{
						regex: /All bombs solved, what a winner!/,
						handler: function() {
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
						handler: function(matches) {
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
						handler: function(matches) {
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
						handler: function(matches) {
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
						handler: function() {
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
						handler: function(m) {
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
						handler: function(m) {
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
						handler: function(matches) {
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
								targetBomb.Modules[moduleType].moduleData.displayName = bombInfo.displayNames[moduleType];
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
						handler: function(matches) {
							// Parse the JSON based on the number of lines specified in the log message.
							const eventInfo = JSON.parse(readMultiple(parseInt(matches[1])).replace(/\n/g, ""));
							switch (eventInfo.type) {
								case "STRIKE":
								case "PASS": {
									const mod = lastBombGroup.GetMod(eventInfo.moduleID, eventInfo.loggingID);
									mod.Events.push(eventInfo);

									const text = [
										`${mod.moduleData.displayName + (eventInfo.loggingID != null ? ` #${eventInfo.loggingID}` : "")} ${eventInfo.type == "PASS" ? "solved" : "struck" } at ${formatTime(eventInfo.realTime)}.`,
										[
											`Bomb time: ${formatTime(Math.max(eventInfo.bombTime, 0))}`,
											eventInfo.timeMode == null ? null : `Time mode: ${eventInfo.timeMode}`
										]
									];
									if (bombgroup != null) bombgroup.Events.push(text);
									else lastBombGroup.Events.splice(lastBombGroup.Events.length - 1, 0, text);

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

											bombgroup.Events.push([`Bomb (${bomb.Serial}) exploded at ${formatTime(eventInfo.realTime)} ${bomb.Strikes == bomb.TotalStrikes ? "due to strikes" : "because time ran out"}.`, [`Bomb time: ${formatTime(Math.max(eventInfo.bombTime, 0))}`]]);
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

											bombgroup.Events.push([`Bomb (${bomb.Serial}) solved at ${formatTime(eventInfo.realTime)}.`, [`Bomb time: ${formatTime(Math.max(eventInfo.bombTime, 0))}`]]);
										}
									}

									break;
							}
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
						handler: function(m, module) {
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
				moduleID: "OneDimensionalMaze",
				loggingTag: "1D Maze",
				displayName: "1D Maze"
			},
			{
				displayName: "14",
				moduleID: "14",
				loggingTag: "14",
				matches: [
					{
						regex: /The correct submission is:|Incorrect Submission:/,
						handler: function(matches, module){
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
								"M 8.1096029,8.1096358 16.06242,16.062435 c 47.178457,0 32.125547,0 79.304027,0 L 103.31926,8.1096358 95.366447,0.15681581 c -47.17848,0 -32.12557,0 -79.304027,0 L 8.1096029,8.1096358",
								"m 8.1096189,68.595748 7.9528011,-7.95281 c 0,-14.86016 0,-29.720333 0,-44.580503 L 8.1096179,8.1096358 0.15681581,16.062435 c 0,14.86017 0,29.720343 0,44.580503 l 7.95280009,7.95281",
								"m 27.30938,16.062445 -11.24696,-10e-6 v 11.24696 l 20.467477,33.333543 11.24696,2e-5 v -11.24696 z",
								"m 55.729667,68.595768 7.9528,-7.95281 V 16.062435 h -15.90561 v 44.580523 l 7.95281,7.95281",
								"m 84.149967,16.062445 11.24696,-10e-6 v 11.24696 l -20.46749,33.333543 -11.24697,2e-5 v -11.24696 z",
								"m 103.34974,68.595748 7.95279,-7.95282 c 0,-14.86016 0,-29.720323 0,-44.580493 l -7.95279,-7.9527992 -7.952813,7.9527992 c 0,14.86017 0,29.720333 0,44.580493 l 7.952813,7.95282",
								"m 47.776857,76.548538 7.95281,-7.95281 -7.95281,-7.95279 H 16.06242 l -7.9528161,7.95279 7.9528161,7.95281 z",
								"m 95.396907,76.548558 7.952823,-7.95281 -7.952823,-7.95279 h -31.71444 l -7.95281,7.95279 7.95281,7.95281 z",
								"M 8.1096199,129.08184 16.06242,121.12905 V 98.838788 76.548538 l -7.9528011,-7.95281 -7.95280209,7.95281 v 22.29025 22.290262 l 7.95280109,7.95279",
								"m 36.529897,76.548548 11.24696,-1e-5 v 11.24696 l -20.467477,33.333532 -11.246959,3e-5 v -11.24698 z",
								"m 55.729667,68.595738 7.9528,7.95282 V 121.12906 H 47.776857 V 76.548558 l 7.95281,-7.95282",
								"m 74.929437,76.548578 -11.24697,-2e-5 v 11.24696 l 20.46749,33.333542 11.24697,2e-5 v -11.24696 z",
								"m 103.34972,68.595738 -7.952813,7.95282 v 22.29022 22.290262 l 7.952813,7.9528 7.9528,-7.9528 V 98.838778 76.548558 l -7.9528,-7.95282",
								"m 8.1400989,129.08188 7.9528171,7.95281 h 22.290241 22.29025 -9.85698 22.29024 22.29026 l 7.952803,-7.95281 -7.952803,-7.9528 h -22.29026 -22.29024 9.85698 -22.29025 -22.290241 l -7.9528171,7.9528"
							];
							var display = readMultiple(5).replace(/\[14 #\d+\] |\r|\n|-/g, '');
							var div = $('<div>');
							var svg = $('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 111.45934 137.19151" width="30%">').appendTo(div);
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
						handler: function(matches, module) {
							var board = readMultiple(4);
							module.push({ label: matches.input, obj: pre(board)});
							return true;
						}
					},
					{
						regex: /.+/
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
						handler: function(matches, module) {
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
				moduleID: ["AdjacentLettersModule", "AdjacentLettersModule_Rus"],
				loggingTag: ["AdjacentLetters", "AdjacentLetters (Rus)"],
				displayName: ["Adjacent Letters", "Adjacent Letters (Rus)"],
				matches: [
					{
						regex: /Solution:/,
						handler: function(_, module) {
							module.push({ label: "Solution:", obj: pre(readMultiple(3)) });
						}
					},
					{
						regex: /You submitted:/,
						handler: function(_, module) {
							module.push({ label: "You submitted:", obj: pre(readMultiple(3)) });
						}
					}
				]
			},
			{
				moduleID: "algebra",
				loggingTag: "Algebra",
				matches: [
					{
						regex: /^(Equation \d+) is (.*)\.$/,
						handler: function(matches, module) {
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
						handler: function(_, module) {
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
						handler: function(matches, module) {
							module.push("Keypad button " + (parseInt(matches[1]) + 1) + " symbol " + matches[2]);
						}
					}
				]
			},
			{
				moduleID: "answerTo",
				loggingTag: "The Answer to ...",
				displayName: "Answer to..."
			},
			{
				moduleID: "lgndAudioMorse",
				loggingTag: "Audio Morse",
				displayName: "Audio Morse"
			},
			{
				moduleID: "babaIsWho",
				displayName: "Baba Is Who?",
				loggingTag: "Baba Is Who?"
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
						handler: function(matches, module) {

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
			{
				displayName: "Binary Puzzle",
				moduleID: "BinaryPuzzleModule",
				loggingTag: "Binary Puzzle",
				matches: [
					{
						regex: /(Puzzle:|Solution:) ([01?]{36})$/,
						handler: function(matches, module) {
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
				moduleID: "BitmapsModule",
				loggingTag: "Bitmaps",
				matches: [
					{
						regex: /Bitmap \((red|green|blue|yellow|cyan|pink)\):/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Group = [matches.input.replace(/(?:Getting|Updating) solution for /, ""), []];
							module.push(module.Group);
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
				displayName: "Bob Barks",
				moduleID: "ksmBobBarks",
				loggingTag: "Bob Barks",
				matches: [
					{
						regex: /.+/,
						handler: function(matches, module) {
							if (!matches[0].startsWith("Receive") && !matches[0].startsWith("Yielding")) module.push(matches.input);
						}
					}
				]
			},
			{
				displayName: "Book of Mario",
				moduleID: "BookOfMarioModule",
				loggingTag: "Book of Mario",
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
						handler: function(matches, module) {
							module.push(matches.input);
						}
					},
					{
						regex: /Expression/,
						handler: function(matches, module) {
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
				moduleID: "BrokenButtonsModule",
				loggingTag: "Broken Buttons",
				matches: [
					{
						regex: /Buttons:/,
						handler: function(_, module) {
							var step = module.Step || module;

							step.push({ label: "Buttons:", obj: pre(readMultiple(4)) });
						}
					},
					{
						regex: /Step: (.+)/,
						handler: function(matches, module) {
							module.Steps = (module.Steps || 0) + 1;
							module.Step = [matches[1]];
							module.push(["Step #" + module.Steps, module.Step]);
						}
					},
					{
						regex: /Press: (.+)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							var div = $("<div>");

							if (matches[2] == "on module") {
								module.braille = [];
							}

							matches[3].split("; ").forEach(function(spots, i) {
								var braille = $('<svg viewBox="-0.5 -0.5 2 3"></svg>').css({ width: "10%", border: "1px black solid" }).appendTo(div);

								spots.split("-").forEach(function(posStr) {
									var pos = parseInt(posStr) - 1;
									$SVG('<circle r="0.4"></circle>').attr("cx", Math.floor(pos / 3)).attr("cy", pos % 3).appendTo(braille);
								});

								if (matches[2] == "on module") {
									if (module.flipped) {
										module.flipped.forEach(function(pos) {
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
						handler: function(matches, module) {
							module.flipped = [];
							module.flippedSVG = [];
							matches[1].split(", ").forEach(function(posStr, flipNumber) {
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

								var noDot = module.braille[char].children("circle").filter(function(_, circle) { return $(circle).attr("cx") == text.attr("x") && $(circle).attr("cy") == text.attr("y"); }).length == 0;
								if (noDot) {
									text.attr("fill", "black");
								}
							});
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
							module.groups.add(matches.input);
						}
					},
					{
						regex: /Wrong letter pressed:/,
						handler: function(matches, module) {
							module.groups.addGroup();
						}
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
						handler: function(_, module) {
							module.push(["Solution", module.Solution = [], true]);
							module.push(["Actions", module.Actions = []]);
						}
					},
					{
						regex: /Panel [2-4] Button 1 \(/,
						handler: function(matches, module) {
							module.Solution.push({ linebreak: true });
						}
					},
					{
						regex: /Panel \d Button \d \(/,
						handler: function(matches, module) {
							module.Solution.push(matches.input);
						}
					},
					{
						regex: /Panel \d (?:Button \d (?:is being|released at|held successfully)|completed successfully)|Module Solved\.|Strike: /,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!('SwitchInfo' in module)) {
								module.SwitchInfo = {
									y: 0, svg: "", prevState: null,
									dom: { label: 'Progression', obj: null },
									lightColors: ['{L0}', '{L1}', '{L2}', '{L3}', '{L4}'],
									darkColors: ['{D0}', '{D1}', '{D2}', '{D3}', '{D4}'],
									set: function() {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
							module.SwitchInfo.svg = module.SwitchInfo.svg.replace(/\{[LD]\d\}/g, function(m) { return module.SwitchInfo[m[1] === 'L' ? 'lightColors' : 'darkColors'][parseInt(m[2])]; });
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
				displayName: "Colour Flash",
				moduleID: "ColourFlash",
				loggingTag: "Colour Flash",
				matches: [
					{
						regex: /Module generated/,
						handler: function(matches, module) {
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
			{
				moduleID: "complexKeypad",
				loggingTag: "Complex Keypad",
				matches: [
					{
						regex: /(.+: .+)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push(`Wire ${parseInt(matches[2]) + 1} snipped ${matches[1].toLowerCase()}`);
						}
					}
				]
			},
			{
				moduleID: "cooking",
				loggingTag: "Cooking",
				matches: [
					{
						regex: /(Solution|Submitted):/,
						handler: function(matches, module) {
							module.push([matches[1], module.items = []]);

							return true;
						}
					},
					{
						regex: /- (.+)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Width = parseInt(matches[1]);
							module.Height = parseInt(matches[2]);
							module.Coordinates = {};
						}
					},
					{
						regex: /(illegal|correct) coordinate .=([A-Z]\d+) as (.+?)( \(.+\))?$/,
						handler: function(matches, module) {
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
						handler: function(_, module) {
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
				moduleID: "CreationModule",
				loggingTag: "Creation",
				matches: [
					{
						regex: /.+/,
						handler: function(matches, module) {
							if (module.length === 0) {
								module.push(["Initial attempt", [], true]);
							}

							module[module.length - 1][1].push(matches.input);
						}
					},
					{
						regex: /Restarting module.../,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Rotations = matches.slice(1, 7);
							return true;
						}
					},
					{
						regex: /Cube faces: #1 is (.+)\. #2 is (.+)\. #3 is (.+)\. #4 is (.+)\. #5 is (.+)\. #6 is (.+)\./,
						handler: function(matches, module) {
							module.Faces = matches.slice(1, 7);
							return true;
						}
					},
					{
						regex: /Buttons: (.+)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Wires = matches.slice(1, 5);
							return true;
						}
					},
					{
						regex: /Screens: #1 says (.{8})\. #2 says (.{8})\./,
						handler: function(matches, module) {
							module.Screens = matches.slice(1, 3);
							return true;
						}
					},
					{
						regex: /The rotation codes are (\d+), (\d+), (\d+), (\d+), (\d+), (\d+)\./,
						handler: function(matches, module) {
							module.RotationCodes = matches.slice(1, 7);
							return true;
						}
					},
					{
						regex: /The wire codes are (\d+), (\d+), (\d+), (\d+)\./,
						handler: function(matches, module) {
							module.WireCodes = matches.slice(1, 5);
							return true;
						}
					},
					{
						regex: /(The (final) cipher|Cipher ([123])) is (\d+)\./,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				displayName: "The Dealmaker",
				moduleID: "thedealmaker",
				loggingTag: "TheDealmaker"
			},
			{
				displayName: "Dreamcipher",
				moduleID: "ksmDreamcipher",
				loggingTag: "Dreamcipher",
				matches: [
					{
						regex: /Glyph alphabet translation table:/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							var maze = readMultiple(13).replace(/\[Echolocation #\d+\] /g, '');
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
				moduleID: "EncryptedEquationsModule",
				loggingTag: "Encrypted Equations",
				matches: [
					{
						regex: /Equation:/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push({ label: "Operand:", obj: pre(readMultiple(2)) });
						}
					}
				]
			},
			{
				moduleID: "fastMath",
				loggingTag: "Fast Math",
				matches: [
					{
						regex: /(<Stage (\d+)> (.+)|Pressed GO! Let the madness begin!)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							let lines = readTaggedLine();
							for (let i = 0; i < 14; i++) {
								lines += `\n${readTaggedLine()}`;
							}

							module.push({ label: "The grid:", obj: pre(lines) });
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
						handler: function(_, module) {
							module.push({ linebreak: true });
						}
					},
					{
						regex: /^Button \d/,
						handler: function(matches, module) {
							module.push([matches.input, []]);
							return true;
						}
					},
					{
						regex: /^— (.+)/,
						handler: function(matches, module) {
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
						handler: function(_, module) {
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
						handler: function(_, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				displayName: "Forget Everything",
				moduleID: "HexiEvilFMN",
				loggingTag: "Forget Everything",
				matches: [
					{
						regex: /Initial answer \(stage 1 display\): (\d+)$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
										${
											inf.Valid === null ? `<td colspan='4'>INITIAL VALUE</td><td>${arr.map(i => `<span class='digit'>${inf.Answer.substr(i, 1)}</span>`).join('')}</td>` :
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
						handler: function() { return true; }
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
						handler: function(matches, module) {
							module.push({
								label: matches.input,
								obj: pre(readMultiple(2, removeTag))
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				moduleID: ["GameOfLifeCruel", "GameOfLifeSimple"],
				loggingTag: ["Game of Life Cruel", "Game of Life Simple"],
				matches: [
					{
						regex: /Cell color reference:/,
						handler: function(_, module) {
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
						handler: function(matches, module) {
							module.push([matches[1], module.answer = []]);
						}
					},
					{
						regex: /(Initial state|Solution|Colored square states|Submitted):/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						regex: /No errors found!/
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
						handler: function(matches, module) {
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
						regex:/(The initial number|The number after incrementing its base and subtracting 1,) in hereditary base-\d,? is:/,
						handler: function(matches, module){
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
						regex: /Moving from|Walking out|There’s an|However, we wanted/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				moduleID: "iceCreamModule",
				loggingTag: "Ice Cream",
				matches: [
					{
						regex: /Stage \d/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							var tiles = matches[1].split("/");

							const span = $('<span style="display: flex; flex-direction: column">')
								.append($('<span>').text("Expected solution:"));

							for(var i = 0; i < 5; i++) {
								var row = $('<span style="height: 20px;">');
								for(var j = 0; j < 5; j++) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!module.Pieces) module.push(["Pieces", module.Pieces = []]);
							module.Pieces.push(matches[1]);
							return true;
						}
					},
					{
						regex: /(Manual Page (\d+)) w\/(o)?|(Solution:|Submitting:)/,
						handler: function(matches, module) {
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
								window.setInterval(function() {
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
						handler: function(matches, module) {
							module.Presses = [];
							module.push("Starting Seq: " + matches[1]);
							module.push(["Buttons:", module.Presses]);
						}
					},
					{
						regex: /SN ([A-Z0-9]{2}), swap ([A-Z0-9]\/[A-Z0-9]), sequence now: ([A-Z]{6})/,
						handler: function(matches, module) {
							module.push($("<span>").css({ "font-family": "monospace", "font-size": "16px" }).text("Swap " + matches[2] + " (" + matches[1] + "). New Seq: " + matches[3]));
						}
					},
					{
						regex: /Pressed button/,
						handler: function(matches, module) {
							module.Presses.push(matches.input);
						}
					}
				]
			},
			{
				moduleID: "MandNs",
				loggingTag: "M&Ns",
				displayName: "M&Ns"
			},
			{
				displayName: "Matrices",
				moduleID: "MatrixQuiz",
				loggingTag: "Linear Algebra Matrix Quiz",
				matches: [
					{
						regex: /Generated question (\d+): Matrix:\[(-?\d+) (-?\d+) (-?\d+) \]\[(-?\d+) (-?\d+) (-?\d+) \]\[(-?\d+) (-?\d+) (-?\d+) \] Answer:(.*)Question:(.*)/,
						handler: function(matches, module) {
							//CSS style from https://stackoverflow.com/a/11561235
							var style = $("<style>.matrix {position: relative;} body {padding: 20px;} .matrix:before, .matrix:after {content: \"\"; position: absolute; top: 0; border: 2px solid #000; width: 6px; height: 100%;} .matrix:before { left: 0px; border-right: 0px;} .matrix:after { right: -8px; border-left: 0px;} .matrix td {padding: 5px; text-align: center;</style>");
							if (module.styleIsPush == null) {
								module.styleIsPush = true;
								module.push(style);
							}
							var table = $('<table>').addClass("matrix");
							$(`<tr><td></td><td>${matches[2]}</td><td>${matches[3]}</td><td>${matches[4]}</td></tr><tr><td></td><td>${matches[5]}</td><td>${matches[6]}</td><td>${matches[7]}</td></tr><tr><td></td><td>${matches[8]}</td><td>${matches[9]}</td><td>${matches[10]}</td></tr></table>`).appendTo(table);
							var div = $("<div>").css({"paddingBottom": "5px"}).append(table).append("</div>");
							module.push({label: `Generated Question ${matches[1]}: Matrix A is`, obj: div, expanded: true});
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Stage = ["Stage #" + matches[1], []];
							module.push(module.Stage);
							return true;
						}
					},
					{
						regex: /Completed stage/,
						handler: function() {
							return true;
						}
					},
					{
						regex: /All 3 stages/,
						handler: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						regex: /Solution:/,
						handler: function(matches, module) {
							module.push({ label: "Solution:", obj: pre(readMultiple(15).replace(/\[Logic Gates #\d\] {5}/g, "")) });
							return true;
						}
					},
					{
						handler: function(matches, module) {
							module.push(matches.input);
						}
					}
				]
			},
			{
				moduleID: "MafiaModule",
				loggingTag: "Mafia",
				matches: [
					{
						regex: /.+/,
						handler: function(matches, module) {
							module.groups.add(matches.input);
						}
					},
					{
						regex: /Clicked \w+: wrong./,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.data = { colors: matches[1].split(', ') };
							module.obj = $('<div>').append($(`<button class='autopress'>Show</button>`).click(function() {
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
											.mouseover(function() { $(this).css('background', bgOnHover); })
											.mouseout(function() { $(this).css('background', bgNoHover); })
											.click(function(ix, rotBefore, rotAfter, marbleBefore, marbleAfter) {
												return function() {
													for (var i = 0; i < 5; i++)
														imgs[i].css('transition', '');
													setRotations(rotBefore);
													setMarble(rotBefore, marbleBefore);
													window.setTimeout(function() {
														for (var i = 0; i < 5; i++)
															imgs[i].css('transition', 'transform linear 1s');
														marbleOuter.css('transition', 'transform linear 1s');
														window.setTimeout(function() {
															setRotations(rotAfter);
															setMarble(rotAfter, marbleBefore);
															window.setTimeout(function() {
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
										.mouseover(function(ix) { return function() { $(this).css('background', sel === ix ? '#fef' : '#bef'); }; }(i))
										.mouseout(function(ix) { return function() { $(this).css('background', sel === ix ? '#feb' : '#fff'); }; }(i))
										.click(function(ix, rot, marble) {
											return function() {
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
						handler: function(matches, module) {
							module.data.traps = matches[1].split(', ');
							return true;
						}
					},
					{
						regex: /^Rotations: (.*)$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.data.states.push({ rotations: matches[1].split(', '), clicked: '✗' });
							module.obj.find('button').data('data', module.data);
							return true;
						}
					},
					{
						regex: /^Clicked when last seconds digit was: (\d)$/,
						handler: function(matches, module) {
							module.data.states.push({ clicked: matches[1] });
							return true;
						}
					},
					{
						regex: /^Marble falls into (gap|trap) at level (\d)\.( Module solved\.| Strike!)?$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push([matches.input, module.GroupLines = []]);
							return true;
						}
					},
					{
						regex: /Submit:/,
						handler: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /Query result: A=(\d+), B=(\d+), C=(\d+)/,
						handler: function(matches, module) {
							module.LastResult = matches;
							return true;
						}
					},
					{
						regex: /Display shows: (\d+) (\w+), (\d+) (\w+)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
									switch(row[i][j]) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				displayName: "Memory",
				moduleID: "Memory",
				loggingTag: "MemoryComponent"
			},
			{
				moduleID: "memorableButtons",
				loggingTag: "Memorable Buttons",
				matches: [
					{
						regex: /(?:([ABCDEFGJKLPQ]), ([ABCDEFGJKLPQ]), ([ABCDEFGJKLPQ]) & ([ABCDEFGJKLPQ]))|(?:s | d)([ABCDEFGJKLPQ]+)|([ABCDEFGJKLPQ])(?:\.)/,
						handler: function(matches, module) {
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
				moduleID: "mineseeker",
				loggingTag: "Mineseeker",
				matches: [
					{
						regex: /Desired Bomb is (\d+|\d\D)$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!module.Stages) module.Stages = [];
							module.push([matches[1], module.Stage = []]);

							return true;
						}
					},
					{
						regex: /<Stage ?\d> /,
						handler: function(matches, module) {
							module.Stage.push(matches.input);

							return true;
						}
					},
					{
						regex: /^(Pressed OK|totalWords = 0)$/,
						handler: function() {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							const span = $('<span>').append($('<span>').text(matches[0]));
							module.Info.push(span);
							module.iStrike = true;
							return true;
						}
					},
					{
						regex: /Expected icon is (.+)$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push(module.Bullet = [matches.input, module.CardGen = []]);
						}
					},
					{
						regex: /Wrong! Deck card|Keeping your cards|You did the right trade!|Wrong! All of your cards|Value of (?:deck|offered) card/,
						handler: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.MoveInfo = null;
						}
					},
					{
						regex: /Move name/,
						handler: function(matches, module) {
							module.push([matches.input.replace(/\(\d\)/, ""), module.MoveInfo]);
							module.MoveInfo = [];
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push({ label: matches.input, obj: pre(readMultiple(3)) });
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
						handler: function(_, module) {
							module.push("Module Solved");
							return true;
						}
					},
					{
						regex: /Moving from|Tried to move from/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!module.Group) {
								matches[1] = "Initial solution";
							}

							module.push(module.Group = [matches[1], module.GroupLines = []]);
							return true;
						}
					},
					{
						regex: /(?:Maze updated for (\d+ [\w ]+|Two Factor 2nd least significant digit sum of \d+))/,
						handler: function(matches, module) {
							module.Group[0] = matches[1].replace(/Unsolved|Solved/, function(str) { return str.toLowerCase(); });
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
							(module.GroupLines || module).push(matches.input);
						}
					},
					{
						regex: /Maze Solution from ([A-F])([1-6]) to ([A-F])([1-6]) in maze "(\d{1,2})/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.groups.add(matches.input);
						}
					},
					{
						regex: /^Strike!/,
						handler: function(matches, module) {
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
				displayName: "Multi-Colored Switches",
				moduleID: "R4YMultiColoredSwitches",
				loggingTag: "Multicolored Switches"
			},
			{
				moduleID: "murder",
				loggingTag: "Murder",
				matches: [
					{
						regex: /Number of batteries/,
						handler: function() {
							var id = GetBomb().GetMod("murder").IDs.length + 1;
							var mod = GetBomb().GetModuleID("murder", id);
							mod.BombInfo = [];
							mod.Rows = [];
							mod.push(["Bomb Info", mod.BombInfo]);
						}
					},
					{
						regex: /Number of|Has/,
						handler: function(matches) {
							GetBomb().GetModuleID("murder").BombInfo.push(matches.input);
							return true;
						}
					},
					{
						regex: /row/,
						handler: function(matches) {
							GetBomb().GetModuleID("murder").Rows.push(matches.input);
						}
					},
					{
						regex: /Body found in/,
						handler: function(matches) {
							GetBomb().GetModuleID("murder").Body = matches.input;
						}
					},
					{
						regex: /Actual solution:/,
						handler: function(matches) {
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
						handler: function(matches) {
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
				moduleID: "MysticSquareModule",
				loggingTag: "Mystic Square",
				matches: [
					{
						regex: /Field:/,
						handler: function(matches, module) {
							module.push({ label: "Field:", obj: pre(readMultiple(3, function(str) { return str.replace('0', ' '); })) });
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
						handler: function(_, module) {
							module.push(["Detailed Calculation Report", module.Report = []]);
							return true;
						}
					},
					{
						regex: /End detailed calculation report\./,
						handler: function(_, module) {
							module.Report = undefined;
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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

								module.push({ label: "Button Colors:", obj: svg });

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
						handler: function(matches, module) {
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
			{
				moduleID: "Password",
				loggingTag: "PasswordComponent"
			},
			{
				moduleID: "Painting",
				loggingTag: "Painting",
				matches: [
					{
						regex: /Generating painting/,
						handler: function(_, module) {
							module.push(["Initial State", module.Cells = []],
								["Determining color-blind set", module.Rule = [], true],
								["Answer", module.Swaps = []],
								["Input", module.Input = []]);
							return true;
						}
					},
					{
						regex: /Cell #(\d) => (\w+)/,
						handler: function(matches, module) {
							module.Cells.push(`Cell ${matches[1]} is ${matches[2]}`);
							return true;
						}
					},
					{
						regex: /Cell #\d must (swap|remain)/,
						handler: function(matches, module) {
							module.Swaps.push(matches.input);
							return true;
						}
					},
					{
						regex: /rule \w/i,
						handler: function(matches, module) {
							module.Rule.push(matches.input);
							return true;
						}
					},
					{
						regex: /paint(ing)? cell #\d with/i,
						handler: function(matches, module) {
							module.Input.push(matches.input);
							return true;
						}
					},
					{
						regex: /Determining active color-blind set/,
						handler: function() {
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
						handler: function(matches, module) {
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
										.replace(/‹[01][io][xy]›/g, function(m) {
											var angle1 = (72 * (side + (+m[1])) - 126) / 180 * Math.PI;
											var coord1 = (m[2] === 'i' ? .5 : 1) * (m[3] === 'x' ? Math.cos(angle1) : Math.sin(angle1));
											var angle2 = (72 * peg - 90) / 180 * Math.PI;
											var coord2 = 3 * (m[3] === 'x' ? Math.cos(angle2) : Math.sin(angle2));
											return coord1 + coord2;
										})
										.replace(/‹f›/g, function() {
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
						handler: function(matches, module) {
							module.SequenceLine = matches.input;
							return true;
						}
					},
					{
						regex: /^Look from ((?:top|bottom)-(?:left|right)|top). Correct solution: ((?:top|bottom)-(?:left|right)|top), ((?:top|bottom)-(?:left|right)|top), ((?:top|bottom)-(?:left|right)|top)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Input.push(matches.input);
						}
					}
				]
			},
			{
				displayName: "Playfair Cipher",
				moduleID: "Playfair",
				loggingTag: "playFair",
				matches: [
					{
						regex: /^: Beginning of Matrix/,
						handler: function(matches, module) {
							const matrix = readMultiple(6).split("\n").map(line => line.replace(/^\[playFair #\d+\]: /, ""));
							matrix.splice(5, 1);

							module.push({ label: "Matrix:", obj: pre(matrix.join("\n")) });
							return true;
						}
					},
					{
						regex: /^:\s*(.+)/,
						handler: function(matches, module) {
							module.push(matches[1]);
							return true;
						}
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
						handler: function() {
							return true;
						}
					},
					{
						regex: /\[[A-Z]{3}[-+]\].*/,
						handler: function(matches, module) {
							if (!module.Conditions) {
								module.Conditions = [];
							}

							module.Conditions.push(matches[0]);

							return true;
						}
					},
					{
						regex: /^[A-Z]+ (?:IN|OUT)/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Pipes = [];
							module.Title = matches.input;

							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
				moduleID: "poetry",
				loggingTag: "Poetry",
				matches: [
					{
						regex: /Picked girl/,
						handler: function(matches, module) {
							module.stageNumber = 1;
							module.correctSolves = 1;
							module.push(["Stage 1", module.stage = []]);
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
							module.stage.push(matches.input);
						}
					},
					{
						regex: /(Correct|Wrong) Word!/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							var colours = matches[4].split(', ');
							if (matches[1] !== matches[3] || matches[2].length !== 5 || colours.length !== 5) {
								console.error("Quintuples logfile has unexpected format.");
								return;
							}
							if (!('Quintuples' in module))
								module.Quintuples = { numbers: new Array(25), colours: new Array(25), op: new Array(25), rowInf: new Array(5), solution: new Array(5) };
							var c = parseInt(matches[1]) - 1;
							for (var r = 0; r < 5; r++) {
								module.Quintuples.numbers[c + 5*r] = parseInt(matches[2].substr(r, 1));
								if (module.Quintuples.numbers[c + 5*r] === 0)
									module.Quintuples.numbers[c + 5*r] = 10;
								module.Quintuples.colours[c + 5*r] = colours[r];
							}
							return true;
						}
					},
					{
						regex: /Iteration (\d+), position (\d+) \(\d+\) is affected\. (.*)\.$/,
						handler: function(matches, module) {
							var r = parseInt(matches[1]) - 1;
							var c = parseInt(matches[2]) - 1;
							module.Quintuples.op[c + 5*r] = matches[3].replace(/x/g, '×').replace('Half and round down', '/2');
							return true;
						}
					},
					{
						regex: /The sum of the modified (.*) iteration numbers \((\d+)\), modulo (\(.*\))(?:, modulo 10)?,? is (\d+)\.$/,
						handler: function(matches, module) {
							var r = "first,second,third,fourth".split(',').indexOf(matches[1]);
							var inf = `(${matches[2]} % ${matches[3]}) % 10 =`;
							module.Quintuples.rowInf[r] = inf;
							module.Quintuples.solution[r] = matches[4];
							return true;
						}
					},
					{
						regex: /The tens column of the sum of the modified fifth iteration numbers \((\d+)\), (\+ \(.*\)), modulo 10 is (\d+)\.$/,
						handler: function(matches, module) {
							module.Quintuples.rowInf[4] = `${matches[1]} ${matches[2]} % 10 =`;
							module.Quintuples.solution[4] = matches[3];
							return true;
						}
					},
					{
						regex: /The correct number to input is \d+\.$/,
						handler: function(matches, module) {
							var arr = [0, 1, 2, 3, 4];
							var bgColours = {
								'red':      '#f88',
								'blue':     '#88f',
								'orange':   '#f80',
								'green':    '#8f8',
								'pink':     '#fae'
							};
							var txColours = {
								'red':      '#a00',
								'blue':     '#00a',
								'orange':   '#f80',
								'green':    '#0a0',
								'pink':     '#f6d'
							};
							module.push({
								label: 'Solution:',
								obj: $(`<table style='border-collapse: collapse;'>${arr.map(r => `<tr>${arr.map(c => {
									var tdStyle = '';
									if (module.Quintuples.op[c + 5*r])
										tdStyle = ` style='background:${bgColours[module.Quintuples.colours[c + 5*r]]}'`;
									else
										tdStyle = ` style='color:${txColours[module.Quintuples.colours[c + 5*r]]}'`;
									return `<td class='n'${tdStyle}>
										<div style='font-size: 15pt'>${module.Quintuples.numbers[c + 5*r]}${module.Quintuples.op[c + 5*r] || ''}</div>
										<div style='font-size: 10pt'>${module.Quintuples.colours[c + 5*r]}</div>
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							var tiles = matches[2].split(" ");

							const span = $('<span style="display: flex; flex-direction: column">')
								.append($('<span>').text("Stage " + matches[1] + " board:"));

							for(var i = 0; i < 7; i++) {
								var row = $('<span style="height: 20px;">');
								for(var j = 0; j < 7; j++) {
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
						handler: function(matches, module) {
							module.groups.add($('<li>').text(matches[0]));
							return true;
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
						handler: function(matches, module) {
							if (module.length === 0 || module[module.length-1][0] !== matches[1]) {
								module.push([matches[1], [], false]);
							}
							module[module.length-1][1].push(matches[2]);
							return true;
						}
					},
					{
						regex: /The above rule returned (.+), which wasn't unique. The closest unique arrow was (.+)./,
						handler: function(matches, module) {
							module[module.length-1][1].push("…but " + matches[1] + " was already pressed; the closest unpressed button is " + matches[2] + ".");
							return true;
						}
					},
					{
						regex: /^-+$/,
						handler: function() {
							return true;
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
						handler: function(matches, module) {
							module.push("Bomb Info: " + matches.input);
						}
					},
					{
						regex: /Already placed/,
						handler: function() {
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
						handler: function(matches, module) {
							let lines = readTaggedLine();
							for (let i = 0; i < 16; i++) {
								lines += `\n${readTaggedLine()}`;
							}

							module.push({ label: "The grid:", obj: pre(lines) });
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push([matches.input, readMultiple(4).replace(/^\[.*?\] - /mg, '').split('\n')]);
							return true;
						}
					},
					{
						regex: /Actions performed (to solve|before bomb exploded|before reset):/,
						handler: function(matches, module) {
							module.push([matches.input.replace(/None\./, ''), module.RCActions = []]);
							return true;
						}
					},
					{
						regex: /^- (.*)$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!module.Things)
								module.Things = [];
							module.Things.push([matches[1], []]);
							return true;
						}
					},
					{
						regex: /SETTINGS:/,
						handler: function(matches, module) {
							for (let thing of module.Things)
								module.push(thing);
							module.push(["SETTINGS", readMultiple(3).split('\n').map(entry => entry.replace(/^\[The Samsung #\d+\] /, ''))]);
							module.Things = false;
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Stage = [matches.input, []];
							module.push(module.Stage);
							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!('SetInfo' in module)) {
								module.SetInfo = {
									Symbols: [null, null, null, null, null, null, null, null, null],
									WavyId: Math.floor(Math.random() * 2147483647),
									Node: { label: 'Module:', obj: null },
									XY: function(str) { return { X: str.charCodeAt(0) - "A".charCodeAt(0), Y: str.charCodeAt(1) - "1".charCodeAt(0) }; }
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
						handler: function(matches, module) {

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
				loggingTag: "Shapes Bombs"
			},
			{
				moduleID: "shikaku",
				loggingTag: "Shikaku",
				matches: [
					{
						regex: /Possible solution:/,
						handler: function(matches, module) {
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
						handler: function() { }
					}
				]
			},
			{
				moduleID: "SillySlots",
				loggingTag: "Silly Slots",
				matches: [
					{
						regex: /Stage/,
						handler: function(matches, module) {
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
				moduleID: "SimonScreamsModule",
				loggingTag: "Simon Screams",
				matches: [
					{
						regex: /Colors in|Small table/,
						handler: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /Stage (.) sequence/,
						handler: function(matches, module) {
							module.Stage = ["Stage #" + matches[1], []];
							module.push(module.Stage);
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
							module.Stage[1].push(matches.input);
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
						handler: function(matches, module) {
							module.push(matches.input);
							return true;
						}
					},
					{
						regex: /STAGE #(.+):/,
						handler: function(matches, module) {
							module.Stage = ["Stage #" + matches[1], []];
							module.push(module.Stage);

							return true;
						}
					},
					{
						regex: /STAGE (.+) RESPONSE/,
						handler: function(matches, module) {
							module.Stage = ["Stage #" + matches[1] + " Response", []];
							module.push(module.Stage);

							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(_, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				matches:[
					{
						regex: /^board: ([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/([0-9]{10})\/$/,
						handler: function(matches, module) {
							var span=$('<span>');
							var svg=$('<svg viewBox="-4 -4 54 54" width="270" height="270"></svg>').appendTo(span);
							var rows=matches.slice(1,11).reverse();
							for(var i=0;i<rows.length;i++) {
								if(i%2==0)rows[i]=rows[i].split("").reverse().join("");
							}
							var numOrder=[
								100,99,98,97,96,95,94,93,92,91,
								81,82,83,84,85,86,87,88,89,90,
								80,79,78,77,76,75,74,73,72,71,
								61,62,63,64,65,66,67,68,69,70,
								60,59,58,57,56,55,54,53,52,51,
								41,42,43,44,45,46,47,48,49,50,
								40,39,38,37,36,35,34,33,32,31,
								21,22,23,24,25,26,27,28,29,30,
								20,19,18,17,16,15,14,13,12,11,
								1,2,3,4,5,6,7,8,9,10
							];
							for(var r=0;r<10;r++) {
								for(var c=0;c<10;c++) {
									var col=rows[r][c]==0?"red":rows[r][c]==1?"blue":rows[r][c]==2?"green":"yellow";
									if(c==0&&r==0) {
										$SVG(`<circle cx='0' cy='0' r='4' fill='#222'>`).appendTo(svg);
										continue;
									}
									$SVG(`<rect x='${c*5}' y='${r*5}' width='5' height='5' fill='${col}' />`).appendTo(svg);
									$SVG(`<text x="${c*5+2.5}" y="${r*5+3}" fill="${col=="yellow"?"black":"white"}" font-size="3px" dominant-baseline="middle" text-anchor="middle">${numOrder[r*10+c]}</text>`).appendTo(svg);
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
						handler: function(_, module) {
							module.groups.addGroup(true);
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							var answers = $("<div>").css({ margin: '.5em 0' });
							matches[2].split(" | ").forEach(function(answer) {
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
						handler: function(matches, module) {
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
						handler: function(_, module) {
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
						handler: function(matches, module) {
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
						handler: function() {
							return true;
						}
					},
					{
						regex: /^(Found solutions to:|Submitted:)$/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							if (!matches.input.includes(",")) {
								module.groups.add(matches.input);
							}

							module.groups.addGroup();

							return true;
						}
					},
					{
						regex: /.+/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				displayName: "TetraVex",
				moduleID: "ksmTetraVex",
				loggingTag: "TetraVex",
				matches: [
					{
						regex: /Intended solution:/,
						handler: function(matches, module) {
							module.push({ label: "Solution:", obj: pre(readMultiple(11).replace(/\[TetraVex #\d+\] /g, "")) });
							return true;
						}
					},
					{
						regex: /Submitted solution:/,
						handler: function(matches, module) {
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
				displayName: "Tic Tac Toe",
				moduleID: "TicTacToeModule",
				loggingTag: "TicTacToe",
				matches: [
					{
						regex: /Keypad is now/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.Step.push(matches.input);
						}
					},
					{
						regex: /.+/
					}
				]
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
						handler: function(matches, module) {
							module.push({ label: 'Initial score:', obj: $('<pre>').text(`        ${matches[1]}`) });
							return true;
						}
					},
					{
						regex: /^. = [01]{5}$/,
						handler: function(matches, module) {
							module.TennisLastHeading = matches.input;
							return true;
						}
					},
					{
						regex: /→/,
						handler: function(matches, module) {
							if (!('TennisLines' in module))
								module.TennisLines = [];
							module.TennisLines.push(matches.input);
							if (module.TennisLines.length % 5 === 0) {
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
						handler: function(matches, module) {
							var div = $('<div>');
							div.text(matches[2]).css({ "white-space": "nowrap", "overflow-x": "scroll "});
							module.push ({ label: matches[1], obj: div });
							return true;
						}
					},
					{
						regex: /.+/
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
						handler: function(matches, module) {
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
				moduleID: "webDesign",
				loggingTag: "Web design",
				matches: [
					{
						regex: /For reference purpose/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
				displayName: "Who’s on First",
				moduleID: "WhosOnFirst",
				loggingTag: "WhosOnFirstComponent",
				matches: [
					{
						regex: /State randomized: Phase: (\d), Keypads: (.+)/,
						handler: function(matches, module) {
							module.push("Current state: Phase: " + (parseInt(matches[1]) + 1) + " Keypads: " + matches[2].split(",").splice(0, 6).toString().replace(/,/g, ", "));
						}
					},
					{
						regex: /State randomized: Display word: (.+), DisplayWordIndex: \d+, Phase: \d/,
						handler: function(matches, module) {
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
						handler: function(matches, module) {
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
						handler: function(matches, module) {
							module.push("There are " + matches[1] + " wires");
						}
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
						handler: function(matches, module) {
							module.push("Solution: " + matches[1]);
						}
					},
					{
						regex: /Wrong words are (.+)/,
						handler: function(matches, module) {
							module.push("Wrong Words: " + matches[1]);
						}
					},
					{
						regex: /Field:/,
						handler: function(matches, module) {
							module.push({ label: 'Field:', obj: pre(readMultiple(6)) });
						}
					},
					{
						regex: /Coordinates clicked/
					}
				]
			},
			{
				displayName: "The World's Largest Button",
				moduleID: "WorldsLargestButton",
				icon: "The World’s Largest Button",
				loggingTag: "The World's Largest Button"
			},
			{
				displayName: "X-Ray",
				moduleID: "XRayModule",
				loggingTag: "X-Ray",
				matches: [
					{
						regex: /.+/,
						handler: function(matches, module) {
							var m, span = null, txt = matches[0];
							while (m = /^(.*?)\[(\d+)( flipped)?\]/.exec(txt)) {
								if (span === null)
									span = $('<span>');
								span
									.append($('<span>').text(m[1]))
									.append($(`<div style='display: inline-block; width: 20px; height: 20px; background-image: url(img/X-Ray/Icons.svg); background-size: 220px 200px; background-repeat: no-repeat; background-position: ${-20*(m[2] % 11)}px ${-20*Math.floor(m[2] / 11)}px; ${m[3] ? 'transform: scaleY(-1);' : ''}'></div>`));
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
						handler: function(matches, module) {
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
						handler: function(matches) {
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
						handler: function(matches) {
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
						handler: function(matches) {
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
				hasLogging: false
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
			{
				displayName: "複雑漢字",
				moduleID: "複雑漢字Module",
				loggingTag: "複雑漢字"
			}
		];

		function getWebsiteData(opt) {
			websiteParseData = [];

			$.get("https://ktane.timwi.de/json/raw", function(data) {
				for (const module of data.KtaneModules) {
					const matches = parseData.filter(data => data.moduleID == module.ModuleID);
					if (matches.length === 0) {
						websiteParseData.push({
							moduleID: module.ModuleID,
							displayName: module.Name,
							loggingTag: module.Name
						});
					} else if (matches.length === 1) {
						const match = matches[0];
						if (match.matches == null && match.hasLogging !== false && (match.displayName == module.Name || match.displayName == null) && (match.loggingTag == module.Name || match.loggingTag == null) && (match.icon == module.Name || match.icon == null)) {
							console.warn(`Unnecessary module: ${module.Name}`);
						}
					}
				}
			}, "json")
				.always(() => parseLog(opt));
		}

		if (websiteParseData == null) {
			getWebsiteData(opt);
			return;
		} else {
			parseData = parseData.concat(websiteParseData);
		}

		function getModuleName(moduleID) {
			const moduleData = getModuleData(moduleID, "moduleID");
			return moduleData ? moduleData.displayName : convertID(moduleID);
		}

		const taglessParsing = parseData.filter(data => data.loggingTag == undefined && data.matches != undefined);

		readwarning = false;
		buildwarning = false;
		while (linen < lines.length) {
			var line = lines[linen];

			var pool = /(\d+) Pools:/.exec(line);
			if (pool) {
				linen += parseInt(pool[1]) + 1;
				continue;
			}

			if (line !== "") {
				var match = /^[ \t]*\[(?:Assets\.Scripts\.(?:\w+\.)+)?(.+?)\]:? ?(.+)/.exec(line);
				if (match && !match[2].startsWith("(h)")) {
					var loggingTag = null;
					var id = null;

					var submatch = /(.+?) #(\d+)/.exec(match[1]);
					if (submatch) {
						loggingTag = submatch[1];
						id = submatch[2];
					} else
						loggingTag = match[1];

					const obj = getModuleData(loggingTag);

					if (obj) {
						try {
							if (obj.matches) {
								for (const matcher of obj.matches) {
									if (matcher.handler) {
										const matches = (matcher.regex || /.+/).exec(match[2]);
										if (matches) {
											if (obj.moduleID) {
												var parsedModule = id ? GetBomb().GetModuleID(obj.moduleID, id) : GetBomb().GetModule(obj.moduleID);
												if (matcher.handler(matches, parsedModule, bomb.GetMod(obj.moduleID))) {
													break;
												}
											} else if (matcher.handler(matches)) {
												break;
											}
										}
									} else if (matcher.regex && matcher.regex.test(match[2])) {
										readDirectly(match[2], obj.moduleID, id);
									}
								}
							} else if (obj.moduleID) {
								readDirectly(match[2], obj.moduleID, id);
							}
						} catch (e) {
							console.log(e);

							if (!readwarning) {
								readwarning = true;
								toastr.warning("An error occurred while reading the logfile. Some information might be missing.", "Reading Warning");
							}
						}
					} else if (bombgroup) {
						var modName = submatch ? submatch[1] : match[1];

						const parsed = bombgroup.Bombs.some(function(bomb) {
							for (var modID in bomb.Modules) {
								if (getModuleName(modID) == modName) {
									readDirectly(match[2], modID, id);
									return true;
								}
							}
						});

						if (!parsed) {
							bombgroup.ParseAgain.push({ modName: modName, line: match[2], id: id });
						}
					}
				} else {
					for (const data of taglessParsing) {
						if (data.matches == null) {
							console.error("A tagless parser doesn't have any .matches: %o", data.matches);
							continue;
						}

						data.matches.some(function(matcher) {
							var matches = matcher.regex.exec(line);
							if (matches) {
								try {
									if (matcher.handler) {
										return matcher.handler(matches);
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
			}

			linen++;
		}

		// Update hash
		var state = readHash();
		if (opt.url)
			state.url = opt.url;
		else if (opt.file)
			state.file = opt.file;
		if (opt.bomb)
			state.bomb = opt.bomb;
		else if (opt.module)
			state.module = opt.module;

		// Find bomb/module to switch to
		var bombSerial = null;
		var bombModule = null;
		if (opt.bomb && parsed.filter(prs => prs.Bombs.filter(b => b.Serial === opt.bomb).length).length) {
			bombSerial = opt.bomb;
		} else if (opt.module) {
			for (var i = 0; i < parsed.length; i++)
				for (var j = 0; j < parsed[i].Bombs.length; j++)
					if (opt.module in parsed[i].Bombs[j].Modules) {
						bombSerial = parsed[i].Bombs[j].Serial;
						bombModule = opt.module.replace(/[^-_A-Za-z0-9]/g, '-');
					}
		}
		updateHash(state);

		$(".bomb, .bomb-info").remove();
		parsed.forEach(function(obj) { obj.ToHTML(opt); });
		$('#ui').addClass('has-bomb');
		$('#wrap').toggleClass('has-empty-log', parsed.length < 1);
		selectBomb(bombSerial || parsed[parsed.length - 1].Bombs[0].Serial);
		if (bombSerial && bombModule)
			$(`#bomb-${bombSerial}>.modules>.module.module-${bombModule}`).click();
		toastr.success("Log read successfully!");
	}

	// Handle uploading
	const dropMsg = $("#full-screen-msg");
	const pasteButton = $("#paste");
	const pasteBox = $("#paste-box");

	// opt = {
	//      bomb: (bomb serial number to find)
	//      module: (module ID to find)
	// }
	function readPaste(clipText, opt = {}) {
		var url = clipText;
		try { url = decodeURIComponent(clipText); } catch (e) { }

		// Very basic regex to detect a URL being pasted.
		if (/^https?:\/\//.exec(url)) {
			$.get((debugging ? "https://ktane.timwi.de" : "") + "/proxy/" + url, function(data) {
				opt.log = data;
				opt.url = url;
				parseLog(opt);
			})
				.fail(function() { toastr.error("Unable to get logfile from URL.", "Upload Error"); });
		} else if (/^[0-9a-f]{40}$/.exec(url)) {
			$.get((debugging ? "https://ktane.timwi.de" : "") + `/Logfiles/${url}.txt`, function(data) {
				opt.log = data;
				opt.file = url;
				parseLog(opt);
			})
				.fail(function() { toastr.error("Unable to get logfile from URL.", "Upload Error"); });
		} else {
			opt.log = clipText;
			parseLog(opt);
		}
	}

	function uploadFiles(files) {
		if (files.length === 1) {
			var fr = new FileReader();
			fr.onload = function() {
				dropMsg.removeClass("hovering");
				parseLog({ log: fr.result });
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
	$(document).on("dragover", function() {
		dropMsg.addClass("hovering");
		return false;
	}).on("dragleave", function() {
		dropMsg.removeClass("hovering");
		return false;
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
		pasteButton.show();
		pasteBox.hide();
	});

	pasteBox.on("blur", function() {
		pasteButton.show();
		pasteBox.hide();
		return false;
	});
	pasteButton.click(function() {
		pasteButton.hide();
		pasteBox.show().focus();
		return false;
	});

	$("#upload").change(function() {
		if ($("#upload-to-server").prop('checked'))
			$('#upload-form').submit();
		else
			uploadFiles(this.files);
	});

	window.onhashchange = function() {
		var hashState = readHash();

		var logUrl = hashState.url;
		var logFile = hashState.file;
		var bombSerial = hashState.bomb;
		if (logUrl || logFile)
			readPaste(logUrl || logFile, hashState);
		else if (bombSerial)
			selectBomb(bombSerial);
	};
	window.onhashchange();
});
