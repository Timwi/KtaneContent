// A list of internal port names used to convert to their display name.
var PortNames = {
    0: "Empty Port Plate",
    RJ45: "RJ-45",
    PS2: "PS/2",
    StereoRCA: "Stereo RCA",
    DVI: "DVI-D"
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
]

// Search for 'var lineRegex' for the list of all the line matching regex & the reference.

$(function() {
    function readPaste(clipText) {

        $('#full-screen-msg>span').text('Loading...');
        $('#full-screen-msg').addClass("hovering");

        window.setTimeout(function() {
            if (/^https?:\/\//.exec(clipText)) { // Very basic regex to detect a URL being pasted.
                $.get("https://cors-anywhere.herokuapp.com/" + clipText, function(data) {
                    parseLog(data);
                }).fail(function() {
                    toastr.error("Unable to get logfile from URL.", "Upload Error");
                });
            } else if (/^https?%3A%2F%2F/.exec(clipText)) { // URL-encoded URL...
                $.get("https://cors-anywhere.herokuapp.com/" + decodeURIComponent(clipText), function(data) {
                    parseLog(data);
                }).fail(function() {
                    toastr.error("Unable to get logfile from URL.", "Upload Error");
                });
            } else {
                parseLog(clipText);
            }

            window.setTimeout(function() {
                $('#full-screen-msg').removeClass("hovering");
                window.setTimeout(function() {
                    $('#full-screen-msg>span').text('Drop here!');
                }, 100);
            }, 100);
        }, 100);
    }

    // Read Logfile
    var readwarning = false;
    var buildwarning = false;
    var debugging = true;
    var linen = 0
    var lines = []

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

                    if (typeof(node) === "function") {
                        node($("<span>").appendTo(elem));
                    } else if (node instanceof $) {
                        elem.append(node);
                    } else if (typeof(node) === "string") {
                        elem.text(node);
                    } else if (node instanceof Array) {
                        makeExpandable(elem, node[0]);
                        if (node[2])
                            elem.addClass("expanded");
                        makeTree(node[1].length ? node[1] : [$('<em>').text("(none)")], $("<ul>").appendTo(elem));
                    } else if (typeof(node) === 'object' && 'label' in node && 'obj' in node) {
                        if (node.expandable) {
                            makeExpandable(elem, node.label);
                            if (node.expanded)
                                elem.addClass("expanded");
                            elem.append(node.obj);
                        } else {
                            elem.text(node.label).append(node.obj);
                        }
                    } else {
                        console.log('Unrecognized node: ' + node);
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

    function convertID(id) {
        return (id.substring(0, 1).toUpperCase() + id.substring(1)).replace(/module$/i, "").replace(/^spwiz/i, "").replace(/(?!\b)([A-Z])/g, " $1");
    }

    function getModuleName(name) {
        return ModuleNames[name] || convertID(name);
    }

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
        var infoCard = $(this)
        var parent = infoCard.parent()
        infoCard
        .click(function() {
            parent.parent().children(".module-info").hide()
            info.show()
            parent.children(".selected").removeClass("selected")
            infoCard.addClass("selected")

            return false
        }).mousedown(function() { return false })

        return infoCard
    }

    function BombGroup(total) {
        var current = this
        this.Bombs = [];
        this.Modules = {}
        this.TotalBombs = total;
        this.State = "Unsolved";
        this.Solved = 0;
        this.MissionName = "Unknown";
        this.StartLine = 0
        this.FilteredLog = ""
        this.ToHTML = function(id) {
            // Build up the bomb.
            var info = $("<div class='bomb-info' id='bomb-" + this.Bombs[0].Serial + "'>").hide().appendTo($("#wrap"))
            var bomb = $("<a href='#bomb-" + this.Bombs[0].Serial + "' class='bomb'>").appendTo($("#bombs")).click(function() {
                $(".bomb.selected").removeClass("selected");
                $(this).addClass("selected");
                $(".bomb-info").hide();
                info.show();
                return true;
            }).mousedown(function() { return false });

            var TotalModules = 0
            var Needies = 0
            this.Bombs.forEach(function(bomb) {
                TotalModules += bomb.TotalModules
                Needies += bomb.Needies
            })

            this.Bombs.forEach(function(bombinfo) {
                $("<div class='serial'>").text(bombinfo.Serial).appendTo(bomb)

                // Build the edgework.
                var edgework = $("<div class='edgework'>").appendTo(info)

                $("<div class='widget serial'>").text(bombinfo.Serial).appendTo(edgework)

                var group;
                if (bombinfo.Batteries.length > 0) {
                    group = $("<div class='widget-group'>").appendTo(edgework)

                    bombinfo.Batteries.forEach(function(val) {
                        $("<div class='widget battery'>")
                            .addClass(val == 1 ? "d" : "aa")
                            .appendTo(group)
                    })
                }

                if (bombinfo.Indicators.length > 0) {
                    group = $("<div class='widget-group'>").appendTo(edgework)

                    bombinfo.Indicators.forEach(function(val) {
                        $("<div class='widget indicator'>")
                            .addClass(val[0])
                            .appendTo(group)
                            .append($("<span class='label'>").text(val[1]))
                    })
                }

                if (bombinfo.PortPlates.length > 0) {
                    group = $("<div class='widget-group'>").appendTo(edgework)

                    bombinfo.PortPlates.forEach(function(val) {
                        var plate = $("<div class='widget portplate'>").appendTo(group)
                        val.forEach(function(port) {
                            $("<span>").addClass(port.toLowerCase()).appendTo(plate)
                        })
                    })
                }
            })

            $("<div class='module-count'>").text(TotalModules).appendTo(bomb)
            if (Needies > 0) {
                $("<div class='needy-count'>").text(Needies).appendTo(bomb)
            }

            // Modules
            var modules = $("<div class='modules'>").appendTo(info)

            // Edgework Information
            this.Bombs.forEach(function(bombinfo, n) {
                var ind = []

                bombinfo.Indicators.forEach(function(val) {
                    ind.push(val[0] + " " + val[1])
                })

                var ports = {}
                bombinfo.PortPlates.forEach(function(plate) {
                    plate.forEach(function(port) {
                        if (!ports[port]) {
                            ports[port] = 0
                        }

                        ports[port]++
                    })
                })

                var portlist = []
                Object.keys(ports).forEach(function(port) {
                    var count = ports[port]
                    portlist.push((count > 1 ? count + " × " : "") + port)
                })

                var batteries = 0
                bombinfo.Batteries.forEach(function(val) {
                    batteries += val
                })

                var edgeinfo = $("<div class='module-info'>").appendTo(info)
                makeTree([
                    "Serial: " + bombinfo.Serial,
                    "Batteries: " + batteries,
                    "Holders: " + bombinfo.Batteries.length,
                    "Ports: " + portlist.join(", "),
                    "Indicators: " + ind.join(", "),
                    "Port Plates: " + bombinfo.PortPlates.length,
                    "Widgets: " + (bombinfo.Batteries.length + ind.length + bombinfo.PortPlates.length + bombinfo.ModdedWidgets),
                ], $("<ul>").appendTo(edgeinfo))

                $("<a href='#' class='module'>")
                .text("Edgework #" + (n + 1))
                .appendTo(modules)
                .addCardClick(edgeinfo).click()
            })

            // Mission Information
            var missioninfo = $("<div class='module-info'>").appendTo(info)
            makeTree(["Mission: " + this.MissionName,
                "State: " + this.State,
                /*"Strikes: " + this.Strikes + "/" + this.TotalStrikes,
                "Total Time: " + formatTime(this.Time),
                "Time Left: ~" + formatTime(this.TimeLeft),*/
            ], $("<ul>").appendTo(missioninfo))

            $("<a href='#' class='module'>")
            .text("Mission Information")
            .appendTo(modules)
            .addCardClick(missioninfo)

            // Convert modules
            this.Bombs.forEach(function(bombinfo) {
                for (var m in bombinfo.Modules) {
                    if (bombinfo.Modules.hasOwnProperty(m)) {
                        var mod = bombinfo.Modules[m]
                        if (mod.IDs.length > 0 || mod.Info.length > 0 || !current.Modules[m]) {
                            current.Modules[m] = mod
                        }
                    }
                }
            })

            var mods = []
            for (var m in this.Modules) {
                if (this.Modules.hasOwnProperty(m)) {
                    var mod = this.Modules[m];
                    var name = ModuleNames[m] || convertID(m);

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
                    a = a[0] + a[2]
                } else {
                    a = a[0];
                }

                if (b[2]) {
                    b = b[0] + b[2]
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

            // Display modules
            mods.forEach(function(minfo, n) {
                // Information
                var modinfo = $("<div class='module-info'>").appendTo(info)
                $("<h3>").text(minfo[0]).appendTo(modinfo)
                if (minfo[1]) {
                    makeTree(minfo[1], $("<ul>").appendTo(modinfo))
                } else {
                    $("<p>").text("No information found.").appendTo(modinfo)
                }

                // Listing
                var mod = $("<a href='#' class='module'>")
                .text(minfo[0] + (minfo[2] ? " " + minfo[2] : ""))
                .appendTo(modules)
                .addCardClick(modinfo)
                $("<img>")
                .on("error", function() {
                    $(this).attr("src", "../Icons/Blind Alley.png").addClass("failed")
                }).attr("src", "../Icons/" + minfo[0] + ".png").appendTo(mod)
            })

            // Filtered log
            if (this.FilteredLog == "") {
                this.FilterLines()
            }

            var loginfo = $("<div class='module-info'>").appendTo(info)
            $("<h3>").text("Filtered Log").appendTo(loginfo)
            $("<textarea>").text(this.FilteredLog).appendTo(loginfo)

            $("<a href='#' class='module'>")
            .text("Filtered Log")
            .appendTo(modules)
            .addCardClick(loginfo)

            return bomb
        }
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
                return
            }

            var log = ""
            for (var i = this.StartLine; i < linen; i++) {
                var line = lines[i]

                var blacklisted = false
                blacklist.forEach(function(val) {
                    blacklisted = blacklisted || line.includes(val)
                })

                if (line.match(/\[BombGenerator\] Module type ".+" in component pool,/)) {
                    blacklisted = true
                    i += 3
                }

                if (!blacklisted) {
                    log += line + "\n"
                }
            }

            this.StartLine = undefined
            this.FilteredLog = log.replace(/\n{3,}/g, "\n\n")
        }
    }

    function Bomb(seed) {
        var current = this
        this.Seed = seed;
        this.Time = 0;
        this.TimeLeft = 0;
        this.Strikes = 0;
        this.TotalStrikes = 0;
        this.Modules = {};
        this.TotalModules = 0;
        this.Needies = 0;
        this.Solved = 0;
        this.Indicators = [];
        this.Batteries = [];
        this.ModdedWidgets = 0;
        this.PortPlates = [];
        this.Serial = "";
        this.State = "Unsolved";
        this.MissionName = "Unknown";
        this.StartLine = 0
        this.FilteredLog = ""
        this.ToHTML = function(id) {
            // Build up the bomb.
            var info = $("<div class='bomb-info' id='bomb-" + this.Serial + "'>").hide().appendTo($("#wrap"))
            var bomb = $("<a href='#bomb-" + this.Serial + "' class='bomb'>").appendTo($("#bombs")).click(function() {
                $(".bomb.selected").removeClass("selected");
                $(this).addClass("selected");
                $(".bomb-info").hide();
                info.show();
                return true;
            }).mousedown(function() { return false });

            $("<div class='serial'>").text(this.Serial).appendTo(bomb)

            $("<div class='module-count'>").text(this.TotalModules).appendTo(bomb)
            if (this.Needies > 0) {
                $("<div class='needy-count'>").text(this.Needies).appendTo(bomb)
            }

            // Build the edgework.
            var edgework = $("<div class='edgework'>").appendTo(info)

            $("<div class='widget serial'>").text(this.Serial).appendTo(edgework)

            if (this.Batteries.length > 0) {
                var group = $("<div class='widget-group'>").appendTo(edgework)

                this.Batteries.forEach(function(val) {
                    $("<div class='widget battery'>").addClass(val == 1 ? "d" : "aa").appendTo(group)
                })
            }

            if (this.Indicators.length > 0) {
                var group = $("<div class='widget-group'>").appendTo(edgework)

                this.Indicators.forEach(function(val) {
                    $("<div class='widget indicator'>").addClass(val[0]).appendTo(group)
                    .append($("<span class='label'>").text(val[1]))
                })
            }

            if (this.PortPlates.length > 0) {
                var group = $("<div class='widget-group'>").appendTo(edgework)

                this.PortPlates.forEach(function(val) {
                    var plate = $("<div class='widget portplate'>").appendTo(group)
                    val.forEach(function(port) {
                        $("<span>").addClass(port.toLowerCase()).appendTo(plate)
                    })
                })
            }

            // Modules
            var modules = $("<div class='modules'>").appendTo(info)

            // Edgework Information
            var ind = []
            this.Indicators.forEach(function(val) {
                ind.push(val[0] + " " + val[1])
            })

            var ports = {}
            this.PortPlates.forEach(function(plate) {
                plate.forEach(function(port) {
                    if (!ports[port]) {
                        ports[port] = 0
                    }

                    ports[port]++
                })
            })

            var portlist = []
            Object.keys(ports).forEach(function(port) {
                var count = ports[port]
                portlist.push((count > 1 ? count + " × " : "") + port)
            })

            var batteries = 0
            this.Batteries.forEach(function(val) {
                batteries += val
            })

            var edgeinfo = $("<div class='module-info'>").appendTo(info)
            makeTree([
                "Serial: " + this.Serial,
                "Batteries: " + batteries,
                "Holders: " + this.Batteries.length,
                "Ports: " + portlist.join(", "),
                "Indicators: " + ind.join(", "),
                "Port Plates: " + this.PortPlates.length,
                "Widgets: " + (this.Batteries.length + ind.length + this.PortPlates.length + this.ModdedWidgets),
            ], $("<ul>").appendTo(edgeinfo))

            $("<a href='#' class='module'>")
            .text("Edgework")
            .appendTo(modules)
            .addCardClick(edgeinfo).click()

            // Mission Information
            var missioninfo = $("<div class='module-info'>").appendTo(info)
            makeTree(["Mission: " + this.MissionName,
                "State: " + this.State,
                "Strikes: " + this.Strikes + "/" + this.TotalStrikes,
                "Total Time: " + formatTime(this.Time),
                "Time Left: ~" + formatTime(this.TimeLeft),
            ], $("<ul>").appendTo(missioninfo))

            $("<a href='#' class='module'>")
            .text("Mission Information")
            .appendTo(modules)
            .addCardClick(missioninfo)

            // Convert modules
            var mods = []
            for (var m in this.Modules) {
                if (this.Modules.hasOwnProperty(m)) {
                    var mod = this.Modules[m];
                    var name = ModuleNames[m] || convertID(m);

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
                    a = a[0] + a[2]
                } else {
                    a = a[0];
                }

                if (b[2]) {
                    b = b[0] + b[2]
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

            // Display modules
            mods.forEach(function(minfo, n) {
                // Information
                var modinfo = $("<div class='module-info'>").appendTo(info)
                $("<h3>").text(minfo[0]).appendTo(modinfo)
                if (minfo[1]) {
                    makeTree(minfo[1], $("<ul>").appendTo(modinfo))
                } else {
                    $("<p>").text("No information found.").appendTo(modinfo)
                }

                // Listing
                var mod = $("<a href='#' class='module'>")
                .text(minfo[0] + (minfo[2] ? " " + minfo[2] : ""))
                .appendTo(modules)
                .addCardClick(modinfo)
                $("<img>")
                .on("error", function() {
                    $(this).attr("src", "../Icons/Blind Alley.png").addClass("failed")
                }).attr("src", "../Icons/" + minfo[0] + ".png").appendTo(mod)
            })

            // Filtered log
            if (this.FilteredLog == "") {
                this.FilterLines()
            }

            var loginfo = $("<div class='module-info'>").appendTo(info)
            $("<h3>").text("Filtered Log").appendTo(loginfo)
            $("<textarea>").text(this.FilteredLog).appendTo(loginfo)

            $("<a href='#' class='module'>")
            .text("Filtered Log")
            .appendTo(modules)
            .addCardClick(loginfo)

            return bomb
        }
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
                return
            }

            var log = ""
            for (var i = this.StartLine; i < linen; i++) {
                var line = lines[i]

                var blacklisted = false
                blacklist.forEach(function(val) {
                    blacklisted = blacklisted || line.includes(val)
                })

                if (line.match(/\[BombGenerator\] Module type ".+" in component pool,/)) {
                    blacklisted = true
                    i += 3
                }

                if (!blacklisted) {
                    log += line + "\n"
                }
            }

            this.StartLine = undefined
            this.FilteredLog = log.replace(/\n{3,}/g, "\n\n")
        }
    }

    function parseLog(log) {
        log = log.replace(/\r/g, "");

        if (!(/^Initialize engine version: .+ (.+)/.exec(log))) {
            toastr.error("Invalid logfile.", "Reading Error");
            return false;
        }

        var tree = [];
        var bombgroup;
        var bomb;
        var parsed = [];
        var module;

        function GetBomb() {
            return bombgroup || bomb;
        }

        function monospace(line) {
            return $('<span>').addClass('monospaced').text(line);
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

        // A listed used for matching lines and executing a function if it matches the line.
        var lineRegex = {
            /*
            References

            Example Code
            "LineTag": {
                // matches: the return RegExp.exec() from the "Line Regex". [Array]
                // id: The ID of the line. Might be undefined if no ID can be found in that line. [string]
                // NOTE: All line regex is stored as a string, and then converted into a RegExp later, so to use a regex character class (ex: \d), type it as: \\d.
                "Line Regex": function(matches, id) {
                    return true // If a function returns true, it will stop trying to match regex after this one.
                },
                // If a string is used instead of a function, it will add the line to the module information if it matched the "Line Regex".
                "Line Regex": "ModuleID"
            }

            Useful Functions & Variables
             - GetBomb() gets the current BombGroup or current Bomb.
             - bomb is the current Bomb.
             - GetModule(modname) gets the information tree for that module.
             - GetModuleID(modname, id) gets the information tree for that module id.
             - readDirectly(object, modname, id) pushes information into the tree for the specified module. id is optional.
             - readLine() reads the next line.
             - readMultiple(count) reads multiple lines and returns them with a new line break inbetween.
             - readMultiple(count, fnc) reads multiple lines, maps them through the function fnc, and then returns them with a new line break inbetween.
             - monospace(line) wraps a line in a monospace font tag.
             - pre(line) returns a function to which makes an text element similar to the <pre> tag. Typically used in conjuction with readMultiple().

            Tree Format
            [
                "Line",
                ["Expandable Line",
                    [
                        "Embedded line",
                    ]
                ],
                function(span) {
                    span.text("Custom function line that doesn't have a bullet point.").css("color", "red")
                }
            ]

            Example Module Readers

            // Skewed Slots
            "Skewed Slots": {
                // Matches "[Skewed Slots #X] (Rule Log)".
                "Rule Log": function(_, id) {
                    // Read "Initial State: X, X, X." and adds it to the module information.
                    readDirectly(readLine(), "SkewedSlotsModule", id) // Initial

                    // Get the module for later use.
                    module = GetBomb().GetModuleID("SkewedSlotsModule", id)

                    // Read solutions for each of the 3 slots
                    for (var i = 0; i < 3; i++) {
                        // Skip blank line
                        readLine()

                        //Calculating starting at: X.
                        var start = new RegExp(/#(\d). Starting at: (\d)/).exec(readLine())
                        // Make a new tree entry for this slot number
                        var slot = ["Slot #" + start[1] + " (" + start[2] + ")", []]

                        // Skip another blank line
                        var line = readLine()

                        // Read lines about the slot until it hits a line containing "Final digit"
                        while (!(/Final digit/).exec(line)) {
                            // ush the line to the tree object.
                            slot[1].push(line)

                            // Read another line to check against.
                            line = readLine()
                        }
                        // Add the "Final digit: X" line.
                        slot[1].push(line)
                        // Push the tree object to the module information
                        module.push(slot)
                    }

                    // Skip a blank line
                    readLine()

                    // Read "Final State: X, X, X"
                    readDirectly(readLine(), "SkewedSlotsModule", id)
                }
            },

            // Chess
            "Chess": {
                // Matches [Chess #X] Selected Solution: " and anything that comes after it on that line.
                "Selected Solution: (.+)": function(matches, id) {
                    // Splits up the coordinates into an array.
                    var locations = matches[1].split(", ")

                    // The last coordinate is always the solution.
                    var solution = locations[locations.length - 1]

                    // Remove the last coordinate from the array.
                    locations.splice(locations.length - 1, 1)

                    // Display the rest of the coordinates.
                    readDirectly("Display: " + locations.join(", "), "ChessModule", id)

                    // Display the solution
                    readDirectly("Solution: " + solution, "ChessModule", id)

                    // Skip blank line
                    readLine()

                    // Add the board text so users know what it is.
                    readDirectly("Board:", "ChessModule", id)

                    // Read the next 13 lines for the board.
                    readDirectly(pre(readMultiple(13)), "ChessModule", id)
                },

                // Matches "[Chess #X] Entered answer: XX" and adds it to the module information.
                "Entered answer": "ChessModule"
            },

            */
            "BombGenerator": {
                "Generating bomb with seed (\\d+)": function(matches) {
                    bomb = new Bomb(parseInt(matches[1]));
                    if (bombgroup && bombgroup.Bombs.length == bombgroup.TotalBombs) {
                        bombgroup = undefined;
                    }

                    if (bombgroup) {
                        bombgroup.Bombs.push(bomb);
                    } else {
                        bomb.StartLine = linen
                        parsed.push(bomb);
                    }
                },
                "Generator settings: Time: (\\d+), NumStrikes: (\\d+)": function(matches) {
                    bomb.Time = parseInt(matches[1]);
                    bomb.TimeLeft = bomb.Time;
                    bomb.TotalStrikes = parseInt(matches[2]);
                },
                "Selected ([A-z0-9 ]+) \\(.+ \\((.+)\\)\\)": function(matches) {
                    bomb.Modules[matches[1]] = {
                        IDs: [],
                        Info: []
                    };

                    bomb.TotalModules++;
                    if (matches[2].includes("Needy")) {
                        bomb.Needies++;
                    }

                },
                "Instantiated CryptModule on face": function() {
                    var mod = bomb.GetModule("CryptModule")
                    mod.push("Phrase: " + lines[linen - 2])
                    mod.push("Answer: " + lines[linen - 1])
                }
            },
            "IndicatorWidget": {
                "Randomizing Indicator Widget: (unlit|lit) ([A-Z]{3})": function(matches) {
                    bomb.Indicators.push([matches[1], matches[2]]);
                }
            },
            "BatteryWidget": {
                "Randomizing Battery Widget: (\\d)": function(matches) {
                    bomb.Batteries.push(parseInt(matches[1]))
                }
            },
            "PortWidget": {
                "Randomizing Port Widget: (.+)": function(matches) {
                    if (matches[1] != "0") {
                        bomb.PortPlates.push(matches[1].split(", "))
                    } else {
                        bomb.PortPlates.push([])
                    }
                }
            },
            "SerialNumber": {
                "Randomizing Serial Number: ([A-Z0-9]{6})": function(matches) {
                    bomb.Serial = matches[1];
                }
            },
            "WidgetGenerator": {
                "Added widget: (.+) at": function(matches) {
                    if (matches[1] == "ModWidget") {
                        bomb.ModdedWidgets++;
                    }
                }
            },
            "Bomb": {
                "Strike! (\\d+) / \\d+ strikes": function(matches) {
                    if (!bombgroup) {
                        bomb.Strikes = parseInt(matches[1]);

                        if (bomb.Strikes == bomb.TotalStrikes) {
                            bomb.State = "Exploded (Strikes)";
                        }
                    }
                },
                "Boom": function(matches) {
                    GetBomb().FilterLines()
                    if (GetBomb().State == "Unsolved") {
                        GetBomb().State = "Exploded";

                        if (!bombgroup && bomb.Strikes != bomb.TotalStrikes) {
                            bomb.State = "Exploded (Time Ran Out)";
                            bomb.TimeLeft = 0;
                        }
                    }
                },
                "A winner is you!!": function(matches) {
                    var bomb = GetBomb();
                    bomb.FilterLines()
                    bomb.State = "Solved";
                    bomb.Solved = bomb.TotalModules;
                }
            },
            "BombComponent": {
                "Pass": function(matches) {
                    GetBomb().Solved++;
                }
            },
            "Assets.Scripts.Pacing.PaceMaker": {
                "PlayerSuccessRating: .+ \\(Factors: solved: (.+), strikes: (.+), time: (.+)\\)": function(matches) {
                    if (!bombgroup) {
                        bomb.TimeLeft = (parseFloat(matches[3]) / 0.2) * bomb.Time;

                        if (bomb.TimeLeft === 0) {
                            bomb.State = "Exploded (Time Ran Out)";
                        }
                    }
                },
                "Round start! Mission: (.+) Pacing Enabled: ": function(matches) {
                    GetBomb().MissionName = matches[1];
                }
            },
            "Assets.Scripts.DossierMenu.MenuPage": {
                "ReturnToSetupRoom": function() {
                    GetBomb().FilterLines()
                }
            },

            // Multiple Bombs
            "MultipleBombs": {
                "Bombs to spawn: (\\d+)": function(matches) {
                    if (matches[1] != "1") {
                        bombgroup = new BombGroup(parseInt(matches[1]));
                        bombgroup.Bombs.push(bomb);
                        bombgroup.StartLine = linen
                        parsed.splice(parsed.length - 1, 1);
                        parsed.push(bombgroup);
                    }
                },
                "All bombs solved, what a winner!": function() {
                    var bomb = GetBomb();
                    bomb.FilterLines()
                    bomb.State = "Solved";
                    bomb.Solved = bomb.TotalModules;
                }
            },

            // Modules
            "Light Cycle": {
                "Start sequence: ([A-Z]{6})": function(matches, id) {
                    var mod = GetBomb().GetModuleID("LightCycleModule", id);
                    mod.Presses = [];
                    mod.push("Starting Seq: " + matches[1]);
                    mod.push(["Buttons:", mod.Presses]);

                },
                "SN ([A-Z0-9]{2}), swap ([A-Z0-9]\/[A-Z0-9]), sequence now: ([A-Z]{6})": function(matches, id) {
                    readDirectly("Swap " + matches[2] + " (" + matches[1] + "). New Seq: " + matches[3], "LightCycleModule", id);
                },
                "Pressed button": function(matches, id) {
                    GetBomb().GetModuleID("LightCycleModule", id).Presses.push(matches.input);
                }
            },
            "Mystic Square": {
                "Field:": function(matches, id) {
                    readDirectly({ label: "Field:", obj: pre(readMultiple(3, function(str) { return str.replace('0', ' '); })) }, "MysticSquareModule", id);
                },
                "Last serial digit": "MysticSquareModule",
                "Skull path": "MysticSquareModule"
            },
            "Battleship": {
                ".+": "BattleshipModule",
                "Ships: .+": function(matches, id) {
                    readDirectly({ label: "Solution:", obj: pre(readMultiple(6)) }, "BattleshipModule", id);
                }
            },
            "ColoredSquares": {
                "First stage color is (.+); count=(\\d+).": function(matches, id) {
                    readDirectly("First stage is: " + matches[1] + ". Count: " + matches[2], "ColoredSquaresModule", id);
                },
                "\\d+ lit:": "ColoredSquaresModule",
                "Button #\\d": "ColoredSquaresModule"
            },
            "Broken Buttons": {
                "Buttons:": function(_, id) {
                    var module = GetBomb().GetModuleID("BrokenButtonsModule", id);
                    var step = module.Step || module;

                    step.push({ label: "Buttons:", obj: pre(readMultiple(4)) });
                },
                "Step: (.+)": function(matches, id) {
                    var module = GetBomb().GetModuleID("BrokenButtonsModule", id);
                    module.Steps = (module.Steps || 0) + 1;
                    module.Step = [matches[1]];
                    module.push(["Step #" + module.Steps, module.Step]);
                },
                "Press: (.+)": function(matches, id) {
                    var module = GetBomb().GetModuleID("BrokenButtonsModule", id);
                    var step = module.Step;
                    step.push("Press: " + matches[1]);

                    var line = readLine();
                    while ((/".+" at \d, \d/).exec(line)) {
                        step.push(line);
                        line = readLine();
                    }

                    linen--;
                },
                "Solution:": "BrokenButtonsModule"
            },
            "TheBulb": {
                "Initial state: Color=(.+), Opaque=(True|False), Initially on=(True|False)": function(matches, id) {
                    readDirectly([
                        "Color: " + matches[1],
                        "Visiblity: " + (matches[2] == "True" ? "Opaque" : "See-Through"),
                        "Initially: " + (matches[3] == "True" ? "On" : "Off")
                    ], "TheBulbModule", id);
                },
                "(?:Pressing|Unscrewing|Screwing|Module solved.) .+": "TheBulbModule"
            },
            "AdjacentLetters": {
                "Solution:": function(_, id) {
                    readDirectly(["Solution:", pre(readMultiple(3))], "AdjacentLettersModule", id);
                },
                "You submitted:": function(_, id) {
                    readDirectly(["You submitted:", pre(readMultiple(3))], "AdjacentLettersModule", id);
                },
            },
            "Skewed Slots": {
                "Rule Log": function(_, id) {
                    readDirectly(readLine(), "SkewedSlotsModule", id); // Initial
                    module = GetBomb().GetModuleID("SkewedSlotsModule", id);

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
                    readDirectly(readLine(), "SkewedSlotsModule", id); // Final
                }
            },
            "Coordinates": {
                "(\\d)×(\\d)": function(matches, id) {
                    GetBomb().GetModuleID("CoordinatesModule", id).Y = parseInt(matches[2]);
                },
                "Grid:": function(_, id) {
                    var grid = "";
                    var y = GetBomb().GetModuleID("CoordinatesModule", id).Y;
                    while (y > 0) {
                        grid += "\n" + readLine();
                        y--;
                    }

                    readDirectly({label: "Grid:", obj: pre(grid)}, "CoordinatesModule", id);
                    return true;
                },
                ".+": "CoordinatesModule"
            },
            "Murder": {
                "Number of batteries": function(matches) {
                    var id = GetBomb().GetMod("murder").IDs.length + 1;
                    var mod = GetBomb().GetModuleID("murder", id);
                    mod.BombInfo = [];
                    mod.Rows = [];
                    mod.push(["Bomb Info", mod.BombInfo]);
                },
                "Number of|Has": function(matches) {
                    GetBomb().GetModuleID("murder").BombInfo.push(matches.input);
                    return true;
                },
                "row": function(matches) {
                    GetBomb().GetModuleID("murder").Rows.push(matches.input);
                },
                "Body found in": function(matches) {
                    GetBomb().GetModuleID("murder").Body = matches.input;
                },
                "Actual solution:": function(matches) {
                    var mod = GetBomb().GetModuleID("murder");
                    mod.Suspects = ["Professor Plum", "Reverend Green", "Colonel Mustard", "Miss Scarlett", "Mrs Peacock", "Mrs White"];
                    mod.push(["Suspects", mod.Suspects]);
                    mod.Weapons = ["Rope", "Candlestick", "Dagger", "Spanner", "Pipe", "Revolver"];
                    mod.push(["Weapons", mod.Weapons]);
                    mod.push(mod.Body);
                    mod.Rows.forEach(function(row) {
                        mod.push(row);
                    });
                    mod.push(matches.input);
                },
                "Eliminating (.+) to re": function(matches) {
                    var mod = GetBomb().GetModuleID("murder");
                    var index = mod.Suspects.indexOf(matches[1]);
                    if (index > -1) {
                        mod.Suspects.splice(index, 1);
                    } else {
                        mod.Weapons.splice(mod.Weapons.indexOf(matches[1]), 1);
                    }
                },
            },
            "TicTacToe": {
                "Starting row": "TicTacToeModule",
                "Keypad is now": function(matches, id) {
                    var mod = GetBomb().GetModuleID("TicTacToeModule", id);
                    var step = [];
                    mod.Step = step;

                    mod.push(["Step " + mod.length + ":", step]);

                    step.push({ label: matches.input, obj: pre(readMultiple(3)) });

                    step.push(readLine()); // up next
                    step.push(readLine()); // current row
                },
                "Next expectation is|Clicked": function(matches, id) {
                    GetBomb().GetModuleID("TicTacToeModule", id).Step.push(matches.input);
                }
            },
            "Word Search": {
                "Correct word is (.+)": function(matches, id) {
                    readDirectly("Solution: " + matches[1], "WordSearchModule", id);
                },
                "Wrong words are (.+)": function(matches, id) {
                    readDirectly("Wrong Words: " + matches[1], "WordSearchModule", id);
                },
                "Field:": function(matches, id) {
                    GetBomb().GetModuleID("WordSearchModule", id).push({ label: 'Field:', obj: pre(readMultiple(6)) });
                },
                "Coordinates clicked": "WordSearchModule"
            },
            "Simon Screams": {
                "Colors in|Small table": function(matches, id) {
                    readDirectly(matches.input, "SimonScreamsModule", id);
                    return true;
                },
                "Stage (.) sequence": function(matches, id) {
                    var mod = GetBomb().GetModuleID("SimonScreamsModule", id);
                    mod.Stage = ["Stage #" + matches[1],
                        []
                    ];
                    mod.push(mod.Stage);
                },
                ".+": function(matches, id) {
                    GetBomb().GetModuleID("SimonScreamsModule", id).Stage[1].push(matches.input);
                }
            },
            "FollowTheLeader": {
                "Starting at wire:": "FollowTheLeaderModule",
                "Wire state:": function() {
                    var states = [];

                    var line = readLine();
                    while ((/^Wire \d+-to-\d+/).exec(line)) {
                        states.push(line);
                        line = readLine();
                    }
                    linen--;

                    GetBomb().GetModuleID("FollowTheLeaderModule", id).push(["Wire states:", states]);
                },
                "Expectation": function(matches) {
                    if (matches.input.match(/Expectation now is that you’re done./)) {
                        GetBomb().GetModuleID("FollowTheLeaderModule", id).push(matches.input);
                    } else {
                        var states = [];

                        var line = readLine();
                        while ((/^Wire \d+-to-\d+/).exec(line)) {
                            states.push(line);
                            line = readLine();
                        }
                        linen--;
                        GetBomb().GetModuleID("FollowTheLeaderModule", id).push([matches.input, states]);
                    }
                }
            },
            "Chess": {
                "Selected Solution: (.+)": function(matches, id) {
                    var locations = matches[1].split(", ");
                    var solution = locations[locations.length - 1];
                    locations.splice(locations.length - 1, 1);
                    readDirectly("Display: " + locations.join(", "), "ChessModule", id);
                    readDirectly("Solution: " + solution, "ChessModule", id);
                    readLine();
                    readDirectly({ label: "Board:", obj: pre(readMultiple(13)) }, "ChessModule", id);
                },
                "Entered answer": "ChessModule"
            },
            "Blind Alley": {
                "Region condition counts:": function(_, id) {
                    readDirectly({
                        label: "Region counts:",
                        obj: pre(readMultiple(3))
                    }, "BlindAlleyModule", id);
                },
                "Must press regions:|Region .+ is correct|You pressed region": "BlindAlleyModule"
            },
            "MonsplodeFight": {
                "Opponent: (.+)": function(matches) {
                    GetBomb().GetModule("monsplodeFight").push([matches[1],
                        []
                    ]);
                },
                ".+": function(matches) {
                    var mod = GetBomb().GetModule("monsplodeFight");
                    mod[mod.length - 1][1].push(matches.input);
                },
                "(?:Opponent|Move Name)": function(matches) {
                    var mod = GetBomb().GetModule("monsplodeFight");
                    mod[mod.length - 1][1].push(readLine());
                },
            },
            "Colour Flash": {
                "Module generated": function(matches, id) {
                    readDirectly({
                        label: "Color Sequence:",
                        obj: pre(readMultiple(10))
                    }, "ColourFlash", id);
                    readLine();
                    for (var i = 0; i < 3; i++) {
                        readDirectly(readLine(), "ColourFlash", id);
                    }
                },
                ".+ button was pressed": "ColourFlash",
                ".+ answer!": "ColourFlash"
            },
            "Cheap Checkout": {
                "Receipt": function(matches, id) {
                    readDirectly({ label: 'Receipt:', obj: pre(readMultiple(10)) }, "CheapCheckoutModule", id);
                    return true;
                },
                ".+": "CheapCheckoutModule",
            },
            "Plumbing": {
                "Module solved": function() {
                    return true;
                },
                "\\[[A-Z]{3}": function(matches, id) {
                    var mod = GetBomb().GetModuleID("MazeV2", id);
                    if (!mod.Conditions) {
                        mod.Conditions = [];
                    }

                    mod.Conditions.push(match.input);

                    return true;
                },
                "^[A-Z]+ (?:IN|OUT)": function(matches, id) {
                    var mod = GetBomb().GetModuleID("MazeV2", id);
                    if (mod.Conditions) {
                        mod.push([matches.input, mod.Conditions]);
                    } else {
                        mod.push(matches.input);
                    }
                    mod.Conditions = null;

                    return true;
                },
                ":": function(matches, id) {
                    var mod = GetBomb().GetModuleID("MazeV2", id);
                    mod.Pipes = [];
                    mod.Title = matches.input;

                    return true;
                },
                ".+": function(matches, id) {
                    var mod = GetBomb().GetModuleID("MazeV2", id);
                    mod.Pipes.push(matches.input);

                    if (mod.Pipes.length == 6) {
                        mod.push({ label: mod.Title, obj: pre(mod.Pipes.join("\n")) });
                    }
                },
            },
            "Safety Safe": {
                "offset|Answer|Input|solved": function(matches, id) {
                    GetBomb().GetModuleID("PasswordV2", id).push(matches.input.replace(/,/g, ", "));
                }
            },
            "Round Keypad": {
                ".+": function(matches, id) {
                    GetBomb().GetModuleID("KeypadV2", id).push(matches[0].replace(/,/g, " "));
                }
            },
            "Piano Keys": {
                "Module generated with the following symbols": "PianoKeys",
                "The correct rule is the following": function(matches, id) {
                    var input = [];
                    var mod = GetBomb().GetModuleID("PianoKeys", id);
                    mod.Input = input;
                    readDirectly(matches.input, "PianoKeys", id);
                    readDirectly(readLine().trim(), "PianoKeys", id);
                    readDirectly(readLine().trim(), "PianoKeys", id);
                    readLine();
                    readDirectly(readLine().replace(/[|]/g, ""), "PianoKeys", id);
                    mod.push(["Key Presses", input]);

                    return true;
                },
                "Input .+ was received|The current valid sequence": function(matches, id) {
                    GetBomb().GetModuleID("PianoKeys", id).Input.push(matches.input);
                },
            },
            "Resistors": {
                "Serial number digits": function(matches) {
                    var mod = GetBomb().GetModule("resistors");
                    mod.BombInfo = [];
                    mod.push(["Bomb Info", mod.BombInfo]);
                },
                "Serial number digits|batteries|Lit FRK": function(matches) {
                    GetBomb().GetModule("resistors").BombInfo.push(matches.input);
                    return true;
                },
                "Already placed": function() {
                    return true;
                },
                ".+": "resistors"
            },
            "Souvenir": {
                "Unleashing question .+: (.+) — (.+) — unleashAt=.+": function(matches, id) {
                    readDirectly("Question: " + matches[1], "SouvenirModule", id);
                    readDirectly("Answers: " + matches[2], "SouvenirModule", id);
                }
            },
            "Hexamaze": {
                "Moving from|Walking out|There’s an|However, we wanted": function(matches, id) {
                    var mod = GetBomb().GetModuleID("HexamazeModule", id);
                    if (!mod.Moves) {
                        mod.Moves = [];
                        mod.push(["Moves", mod.Moves]);
                    }

                    mod.Moves.push(matches.input);
                    return true;
                },
                ".+": "HexamazeModule"
            },
            "Laundry": {
                ".+": function(matches, id) {
                    readDirectly(matches.input, "Laundry", id);
                    for (var i = 0; i < 4; i++) {
                        readDirectly(readLine(), "Laundry", id);
                    }
                }
            },
            "Modules Against Humanity": {
                "Modules:": function(matches, id) {
                    var mod = GetBomb().GetModuleID("ModuleAgainstHumanity", id);
                    var lines = readMultiple(11);
                    while (/  \|/.test(lines) && !/[^ ] \|/.test(lines))
                        lines = lines.replace(/ \|/g, '|');
                    while (/\|  /.test(lines) && !/\| [^ ]/.test(lines))
                        lines = lines.replace(/\| /g, '|');
                    mod.push({ label: "Cards:", obj: pre(lines) });

                    var line;
                    do {
                        line = readLine();
                        mod.push(line.replace(/Black:/g, "Black: ").trim());
                    }
                    while (!/^Final cards/.test(line));
                },
                "Submitted:": "ModuleAgainstHumanity"
            },
            "Semaphore": {
                "Module generated": function(matches, id) {
                    GetBomb().GetModuleID("Semaphore", id).push({ label: "Flags", obj: pre(readMultiple(8)) });
                    return true;
                },
                ".+": "Semaphore"
            },
            "Friendship": {
                "Friendship symbol": function(matches, id) {
                    var mod = GetBomb().GetModuleID("FriendshipModule", id);
                    if (!mod.Symbols) {
                        mod.Symbols = [];
                        mod.push(["Symbols", mod.Symbols]);
                    }

                    mod.Symbols.push(matches.input.replace(/^Friendship symbol /, ""));
                    return true;
                },
                ".+": "FriendshipModule",
            },
            "Silly Slots": {
                "Stage": function(matches, id) {
                    readDirectly({ label: matches.input, obj: pre(readMultiple(2)) }, "SillySlots", id);
                    return true;
                },
                ".+": "SillySlots",
            },
            "Web design": {
                "For reference purpose": function(matches, id) {
                    var lines = "";
                    var line = readLine();
                    while (!line.match("}") && line) {
                        lines += line + "\n";
                        line = readLine();
                    }
                    lines += "}";

                    readDirectly({ label: matches.input, obj: pre(lines) }, "webDesign", id);

                    return true;
                },
                ".+": "webDesign"
            },

            // Read logging directly
            "Wire Placement": {
                ".+": "WirePlacementModule"
            },
            "Text Field": {
                ".+": "TextField"
            },
            "The Gamepad": {
                ".+": "TheGamepadModule"
            },
            "Double-Oh": {
                ".+": "DoubleOhModule"
            },
            "Mouse in the Maze": {
                ".+": "MouseInTheMaze"
            },
            "CaesarCipher": {
                ".+": "CaesarCipherModule"
            },
            "Simon States": {
                ".+": "SimonV2"
            },
            "Square Button": {
                ".+": "ButtonV2"
            },
            "Morsematics": {
                ".+": "MorseV2"
            },
            "Forget Me Not": {
                ".+": "MemoryV2"
            },
            "Logic": {
                ".+": "Logic"
            },
            "Rock-Paper-Scissors-Lizard-Spock": {
                ".+": "RockPaperScissorsLizardSpockModule",
            },
            "Color Math": {
                ".+": "colormath"
            },
            "Rhythms": {
                ".+": "MusicRhythms"
            },
            "Only Connect": {
                "Hieroglyph +Position +Serial# +Ports +num": function(matches, id) {
                    GetBomb().GetModuleID("OnlyConnectModule", id).push({
                        label: 'Egyptian Hieroglyphs:',
                        obj: pre([matches[0]].concat(readMultiple(6, function(str) { return str.replace(/^\[Only Connect #\d+\] /, ''); })).join("\n"))
                    });
                    return true;
                },
                ".+": "OnlyConnectModule"
            },
            "Neutralization": {
                ".+": "neutralization"
            },
            "Astrology": {
                ".+": "spwizAstrology"
            },
            "Perspective Pegs": {
                "Pegs:": function(matches, id) {
                    readDirectly({ label: matches.input, obj: pre(readMultiple(11).replace(/\n{2}/g, "\n")) }, "spwizPerspectivePegs", id);
                    return true;
                },
                ".+": "spwizPerspectivePegs"
            },
            "3D Maze": {
                "You walked into a wrong wall:": function(matches, id) {
                    readDirectly({ label: matches.input, obj: pre(readMultiple(13)) }, "spwiz3DMaze", id);
                    return true;
                },
                ".+": "spwiz3DMaze"
            },
            "Adventure Game": {
                ".+": "spwizAdventureGame"
            },
            "Creation": {
                ".+": function(matches, id) {
                    var mod = bomb.GetModuleID("CreationModule", id);
                    if (mod.length === 0) {
                        mod.push(["Initial State", []]);
                    }

                    mod[mod.length - 1][1].push(matches.input);
                },
                "Restarting module...": function(matches, id) {
                    var mod = bomb.GetModuleID("CreationModule", id);
                    mod.push(["Restart #" + mod.length, []]);
                }
            },
            "ChordQualities": {
                ".+": "ChordQualities"
            },
            "Rubik’s Cube": {
                ".+": "RubiksCubeModule"
            },
            "FizzBuzz": {
                ".+": "fizzBuzzModule"
            },
            "Bitmaps": {
                "Bitmap \\((red|green|blue|yellow|cyan|pink)\\):": function(matches, id) {
                    readDirectly({ 
                        label: matches.input, 
                        obj: pre(readMultiple(9, function(str) { return str.replace(/^\[Bitmaps #\d+\] /, ''); }))
                            .css('color', matches[1] === 'red'    ? '#800' :
                                          matches[1] === 'green'  ? '#080' :
                                          matches[1] === 'blue'   ? '#008' :
                                          matches[1] === 'yellow' ? '#880' :
                                          matches[1] === 'cyan'   ? '#088' : '#808')
                    }, "BitmapsModule", id);
                    return true;
                },
                ".+": "BitmapsModule"
            },
            "Connection Check": {
                ".+": "graphModule"
            },
            "Complicated Buttons": {
                ".+": "complicatedButtonsModule"
            },
            "Symbolic Password": {
                ".+": "symbolicPasswordModule"
            },
            "The Clock": {
                ".+": "TheClockModule"
            },
            "Bitwise Operators": {
                ".": "BitOps"
            }
        };

        var taglessRegex = {
            // TwoBits
            "Query(Responses|Lookups): (\\[[\\d\\w]{1,2}\\]: [\\d\\w]{1,2})": function(matches) {
                var id = GetBomb().GetMod("TwoBits").IDs.length;
                if (matches[1] == "Lookups") {
                    id = GetBomb().GetMod("TwoBits").IDs.length + 1;
                }

                var mod = bomb.GetModuleID("TwoBits", id);
                mod.push({ label: "Query " + matches[1], obj: pre(matches[2] + "\n" + readMultiple(99)), expandable: true });
                if (matches[1] == "Responses") {
                    mod.push(readLine());
                }
            },

            // Emoji Math
            "\\d{1,}[+-]\\d{1,}": function(matches) {
                readDirectly(matches.input, "Emoji Math")
            },
            "Enter button pressed": function() {
                readDirectly(readMultiple(2).replace(/^Answer:/, "Submitted:"), "Emoji Math")
            }
        }

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
                        Object.keys(obj).some(function(regex) {
                            var func = obj[regex];
                            var matches = new RegExp(regex).exec(match[2]);
                            if (matches) {
                                try {
                                    if (typeof(func) == "function") {
                                        if (func(matches, id)) {
                                            return true;
                                        }
                                    } else {
                                        readDirectly(match[2], func, id);
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
                } else {
                    Object.keys(taglessRegex).some(function(val) {
                        var func = taglessRegex[val]
                        var matches = new RegExp(val).exec(line)
                        if (matches) {
                            try {
                                if (typeof(func) == "function") {
                                    if (func(matches)) {
                                        return true;
                                    }
                                } else {
                                    readDirectly(match[2], func);
                                }
                            } catch (e) {
                                console.log(e);

                                if (!readwarning) {
                                    readwarning = true;
                                    toastr.warning("An error occurred while reading the logfile. Some information might be missing.", "Reading Warning");
                                }
                            }
                        }
                    })
                }
            }

            linen++;
        }

        $(".bomb, .bomb-info").remove()

        parsed.forEach(function(obj, n) {
            var bomb = obj.ToHTML(n)
            if (n == parsed.length - 1) {
                bomb.click()
            }
        });

        $('#ui').addClass('has-bomb');
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

    $('#paste-box').on("blur", function(oEvent) {
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
        if (window.location.hash.startsWith('#url=')) {
            readPaste(window.location.hash.substr(5));
        }
    };
    window.onhashchange();
});
