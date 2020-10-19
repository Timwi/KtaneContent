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
	this.BatteryWidgets = 0;
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

			// The game will log out batteries that don't actually exist on the bomb. 
			var actualBatteries = this.Batteries.slice(0, this.BatteryWidgets);
			actualBatteries.sort().reverse();
			actualBatteries.forEach(function(val) {
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

		function GetManual(parseData) {
			let manual = parseData.moduleData.displayName
				.replace("'", "’")
				.replace(/[<>:"/\\|?*]/g, "");

			if (parseData.tree && parseData.tree.length != 0 && typeof parseData.tree[0] === "string" && parseData.tree[0].startsWith("Language is ")) {
				manual += ` (${parseData.tree[0].split(" ")[2]} — *)`;

				manual = manual
					.replace("Big Button", "The Button")
					.replace("Vent Gas", "Venting Gas")
					.replace("Passwords", "Password")
					.replace("Who's on First", "Who’s on First")
					.replace(" Translated", " translated");
			}

			return manual;
		}

		// Display modules
		mods.forEach(function(parseData) {
			// Information
			var moduleInfo = $("<div class='module-info'>").appendTo(info).data('module-id', parseData.moduleID);
			$("<h3>").text(parseData.moduleData.displayName).appendTo(moduleInfo);
			$("<a>").text("Manual").attr("href", `../HTML/${GetManual(parseData)}.html`).css({ top: 0, right: 0, position: "absolute" }).appendTo(moduleInfo);
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

			const icon = $("<img>")
				.on("error", function() {
					console.warn("Couldn't find a module icon for %s. More information: %o", parseData.moduleData.displayName, parseData);
					$(this).attr("src", "../Icons/blank.png");
				}).appendTo(buttonGrid);

			if (parseData.moduleData.iconPosition == null) {
				icon.attr("src", `../Icons/${encodeURI(parseData.moduleData.icon)}.png`);
			} else {
				const position = parseData.moduleData.iconPosition;
				icon.attr("src", "https://ktane.timwi.de/iconsprite").css({ "object-position": `${position.X * -32}px ${position.Y * -32}px`, "object-fit": "none" });
			}
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
		const fields = ["loggingTag", "moduleID", "displayName", "icon", "iconPosition"];

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

// Read Logfile
var readwarning = false;
var buildwarning = false;
var debugging = (window.location.protocol == "file:" || window.location.hostname == "127.0.0.1");
var linen = 0;
var lines = [];
var bombgroup;
var lastBombGroup;
var bomb;
var bombSerialIndex = 0;
var parsed = [];
var ruleseed;
let websiteParseData;

function GetBomb() {
	return bombgroup || lastBombGroup || bomb;
}

function pre(line) {
	return $('<pre>').text(line.replace(/^\n/g, ""));
}

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

	bombgroup = null;
	lastBombGroup = null;
	bomb = null;
	bombSerialIndex = 0;
	parsed = [];
	ruleseed = null;

	lines = log.split("\n");
	linen = 0;

	function getWebsiteData(opt) {
		websiteParseData = [];

		$.get("https://ktane.timwi.de/json/raw", function(websiteData) {
			for (const module of websiteData.KtaneModules) {
				const matches = parseData.filter(data => Array.isArray(data.moduleID) ? data.moduleID.includes(module.ModuleID) : data.moduleID == module.ModuleID);
				if (matches.length === 0) {
					websiteParseData.push({
						moduleID: module.ModuleID,
						displayName: module.Name,
						loggingTag: module.Name,
						iconPosition: { X: module.X, Y: module.Y }
					});
				} else if (matches.length === 1) {
					const match = matches[0];
					if (match.matches == null && match.hasLogging !== false && (match.displayName == module.Name || match.displayName == null) && (match.loggingTag == module.Name || match.loggingTag == null) && (match.icon == module.Name || match.icon == null)) {
						console.warn(`Unnecessary module: ${module.Name}`);
					}

					if (Array.isArray(match.moduleID)) {
						if (match.iconPosition == null)
							match.iconPosition = [];

						match.iconPosition[match.moduleID.indexOf(module.ModuleID)] = { X: module.X, Y: module.Y };
					} else {
						match.iconPosition = { X: module.X, Y: module.Y };
					}
				}
			}
		}, "json")
			.always(() => {
				parseData.push(...websiteParseData);
				parseLog(opt);
			});
	}

	if (websiteParseData == null) {
		getWebsiteData(opt);
		return;
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
							if (getModuleName(modID) == modName || bomb.Modules[modID].moduleData.displayName == modName) {
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

$(function() {
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
			if ($("#upload-to-server").prop('checked'))
			{
				$('#upload')[0].files = files;
				$('#upload-form').submit();
				return;
			}

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
