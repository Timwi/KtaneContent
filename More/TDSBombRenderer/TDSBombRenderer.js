// TheDarkSid3r's Bomb Renderer

var BombRenderer = class {
    constructor(append, width, height) {
        this.append = $(append);
        this.wrapper = $("<div/>").addClass("bomb-rotator").appendTo(this.append);
        var d = () => {
            this.mouseDown = true;
            this.append.css({ cursor: "grabbing" });
        };
        this.append
            .on("mousedown", (e) => d(e))
            .on("touchstart", (e) => d(e));
        var r = () => {
            this.mouseDown = false;
            this.prevMousePosition = [];
            this.append.css({ cursor: "grab" });
        };
        window.addEventListener("touchmove", (e) => this.eventMove(e), {passive: false});
        $(window)
            .on("mousemove", (e) => this.eventMove(e))
            .on("mouseup", () => r())
            .on("touchend", () => r());
        r();
        anime.set(this.wrapper[0], { translateX: "-50%", translateY: "-50%" });
        this.width = width;
        this.height = height;
        this.isDefaultCase = width == 3 && height == 2;
        var sidePairs = [
            { sides: ["front", "back"], padding: [6, 5] },
            { sides: ["left", "right"], padding: [2, 2] },
            { sides: ["top", "bottom"], padding: [2, 2] }
        ];
        var sideTransforms = {
            front: "translateZ(90px)",
            back: "translateZ(-90px) rotateY(180deg)",
            left: "rotateY(270deg) translateZ(-5px) translateX(-92px) translateY(4px)",
            right: "rotateY(-270deg) translateZ(362px) translateX(92px) translateY(4px)",
            bottom: "rotateX(90deg) translateY(92px) translateZ(-375px) translateX(3px) rotateX(-180deg)",
            top: "rotateX(-90deg) translateZ(-185px) translateY(-97px) translateX(3px) rotateX(180deg)"
        };
        var nonDefaultLRTBSize = 186;
        var nonDefaultFBPadding = 20;
        var nonDefaultModuleSize = [169.4, 170];
        var nonDefaultFBWidth = nonDefaultFBPadding * 2 + nonDefaultModuleSize[0] * this.width;
        var nonDefaultFBHeight = nonDefaultFBPadding * 2 + nonDefaultModuleSize[1] * this.height;
        var nonDefaultSideTransforms = {
            front: "translateZ({lrtb}px)",
            back: "translateZ(-{lrtb}px) rotateY(180deg)",
            left: "rotateY(270deg) translateX(-{lrtb}px)",
            right: "translateX(-50%) rotateY(-270deg) translateX({lrtb}px) translateZ({fbw}px)",
            bottom: "translateY(-50%) rotateX(90deg) translateY({lrtb}px) translateZ(-{fbh}px) rotateX(-180deg)",
            top: "translateY(-50%) rotateX(-90deg) translateZ(-{fbh}px) translateY(-{lrtb}px) rotateX(180deg)"
        };
        var sideTransformOrigins = {
            left: "center left",
            right: "top right",
            bottom: "top center",
            top: "bottom center"
        };
        this.sideNames = ["front", "back", "left", "right", "top", "bottom"];
        this.sidesObject = {};
        this.sides = this.sideNames.map((n) => {
            var pair = sidePairs.find((s) => s.sides.includes(n));
            var transform = this.isDefaultCase ? sideTransforms[n] : nonDefaultSideTransforms[n].replace(/{lrtb}/g, nonDefaultLRTBSize / 2).replace(/{fbw}/g, nonDefaultFBWidth / 2 - nonDefaultLRTBSize / 2).replace(/{fbh}/g, nonDefaultFBHeight / 2 + nonDefaultLRTBSize / 2);
            var element = $("<div/>").addClass("bomb-rotator-side bomb-rotator-side-" + n).css({
                transform: transform,
                transformOrigin: sideTransformOrigins[n] || "unset"
            });
            element.addClass(this.isDefaultCase ? "default" : "non-default");
            if (this.isDefaultCase) $("<img/>").addClass("bomb-side-image").attr({ src: "images/bomb/" + n + ".png" }).appendTo(element);
            var content = $("<div/>").addClass("bomb-side-content bomb-side-content-" + n).appendTo(element);
            if (!this.isDefaultCase) {
                var apply = (width, height) => {
                    var whobj = { width, height };
                    content.css(whobj);
                    element.css(whobj);
                };
                switch (n) {
                    case "front":
                    case "back":
                        apply(nonDefaultFBWidth, nonDefaultFBHeight);
                        break;
                    case "left":
                    case "right":
                        apply(nonDefaultLRTBSize, nonDefaultFBHeight);
                        break;
                    case "top":
                    case "bottom":
                        apply(nonDefaultFBWidth, nonDefaultLRTBSize);
                        break;
                }
            }
            this.wrapper.append(element);
            var ret = { name: n, element, content, pair };
            this.sidesObject[n] = ret;
            return ret;
        });
        var edgeworkSlotPos = ["left", "left", "left", "left", "right", "right", "right", "right", "top", "top", "top", "top", "top", "top", "bottom", "bottom", "bottom", "bottom", "bottom", "bottom"];
        if (!this.isDefaultCase) {
            edgeworkSlotPos = [];
            for (var x = 0; x < this.width * 2; x++) edgeworkSlotPos.push("top", "bottom");
            for (var y = 0; y < this.height * 2; y++) edgeworkSlotPos.push("left", "right");
        }
        this.edgeworkSlots = edgeworkSlotPos.map((s) => {
            var slotElement = $("<div/>").addClass("bomb-edgework-slot bomb-edgework-slot-" + s).appendTo(this.sidesObject[s].content);
            return { side: s, empty: true, slotElement };
        });
        this.moduleSides = { front: this.sidesObject.front, rear: this.sidesObject.back };
        this.initModuleSlots();
        this.lastSide = "front";
        this.currentRot = [0, 0];
        setInterval(() => this.resize(), 1000);
        $(window).on("resize", () => this.resize());
        /* anime({
            targets: this.wrapper[0],
            rotateX: [0, -360],
            easing: "linear",
            duration: 20000,
            loop: true
        }); */
        //this.rotateToSide("top");
    }

    eventMove(e) {
        if (!this.mouseDown) return;
        e.preventDefault();
        var t = e.touches ? e.touches[0] : e;
        var offset = this.prevMousePosition.length ? [t.pageX - this.prevMousePosition[0], t.pageY - this.prevMousePosition[1]] : [0, 0];
        this.prevMousePosition = [t.pageX, t.pageY];
        this.addRotation(offset[0] * 0.5, offset[1] * 0.5);
    }

    formatTime(seconds, eights) {
        // eights replaces all the digits with 8 (for the number behind the display) eg. 88:88 would show all segments behind 12:34

        if (seconds < 60) {
            var s = Math.floor(seconds);
            var ns = Math.floor(seconds * 100 % 100);
            return (eights ? "88" : s < 10 ? "0" + s : s) + (eights ? ":" : ".") + (eights ? "88" : ns < 10 ? "0" + ns : ns);
        } else {
            var m = Math.floor(seconds / 60).toString();
            var rs = Math.floor(seconds % 60);
            return (eights ? "8".repeat(Math.max(m.length, 2)) : m < 10 ? "0" + m : m) + ":" + (eights ? "88" : rs < 10 ? "0" + rs : rs);
        }
    }

    resize() {
        var extraX = 150;
        var extraY = 250;
        var front = this.sidesObject.front.content;
        var fw = front.outerWidth();
        var fh = front.outerHeight();
        this.wrapper.css({ width: fw, height: fh });
        var x = this.append.innerWidth() / (fw + extraX);
        var y = this.append.innerHeight() / (fh + extraY);
        var scale = Math.min(x, y);
        anime.set(this.wrapper[0], { scaleX: scale, scaleY: scale, scaleZ: scale });
    }

    addRotation(xx, yy) {
        this.currentRot[0] += xx;
        this.currentRot[1] -= yy;
        var clamp = (n) => Math.min(Math.max(n, -90), 90);
        this.currentRot[1] = clamp(this.currentRot[1]);
        var x = this.currentRot[0];
        var y = this.currentRot[1];
        anime.set(this.wrapper[0], { rotateX: y, rotateY: x });
    }

    createEdgeworkElement(data) {
        switch (data.type) {
            case "serial":
                return $("<div/>").addClass("widget widget-serial").html(data.number);
            case "indicator":
                return $("<div/>").addClass("widget widget-indicator widget-indicator-" + (data.lit ? "lit" : "unlit")).html(data.name);
            case "battery":
                var battery = $("<div/>").addClass("widget-full widget-battery-" + data.battery + "-" + data.count);
                return $("<div/>").addClass("widget widget-battery widget-battery-" + data.battery).append(battery);
            case "port":
                var plate = $("<div/>").addClass("widget widget-port");
                data.ports.forEach((p) => $("<div/>").addClass("widget-full widget-port-" + p).appendTo(plate));
                return plate;
        }
    }

    addEdgeworkElement(data) {
        var e = this.createEdgeworkElement(data);
        var sts = this.edgeworkSlots.filter((s) => s.empty);
        var s = sts[Math.floor(Math.random() * sts.length)];
        if (!s) return console.warn("BombRenderer: Failed to add edgework component: not enough room\nComponent: %o", data);
        s.empty = false;
        s.slotElement.append(e);
        s.element = e;
        s.type = data.type;
    }

    addEdgework(widgets) {
        widgets.forEach((w) => this.addEdgeworkElement(w));
    }

    initModuleSlots() {
        this.moduleSlots = {};
        this.emptyModuleSlots = {};
        Object.keys(this.moduleSides).forEach((s) => {
            var a = new Array(this.width * this.height).fill(true).map((r, i) => {
                return $("<div/>").addClass("bomb-module-slot").appendTo(this.moduleSides[s].content);
            });
            this.moduleSlots[s] = a;
            this.emptyModuleSlots[s] = new Array(this.width * this.height).fill(true);
        });
    }

    addModules(modules) {
        this.modules = modules;
        this.modules.forEach((module) => {
            if (module.type == "empty") return;
            var errn = module.type == "module" ? "module " + module.id : module.type;
            if (!this.moduleSlots[module.face]) return console.warn('BombRenderer: Failed to add %s: no face exists with name "%s"', errn, module.face);
            if (!this.moduleSlots[module.face][module.index]) return console.warn('BombRenderer: Failed to add %s: not enough room on face "%s"', errn, module.face);
            var e = $("<div/>").addClass("bomb-module");
            if (module.type == "timer") {
                e.addClass("bomb-module-timer");
                var t = $("<div/>").addClass("bomb-module-timer-time").html(this.formatTime(module.time)).appendTo(e);
                $("<div/>").addClass("bomb-module-timer-time-backing").html(this.formatTime(module.time, true)).appendTo(t);
                $("<div/>").addClass("yellow-highlight bomb-module-strikes-highlight").appendTo(e);
                $("<div/>").addClass("yellow-highlight bomb-module-timer-highlight").appendTo(e);
                if (module.strikes < 3) {
                    for (var x = 0; x < module.strikes; x++) {
                        var i = x - 1;
                        $("<div/>").addClass("bomb-module-timer-strike").css({ transform: "translateX(-50%) translateX(" + i * 20 + "px)" }).appendTo(e);
                    }
                } else {
                    $("<div/>").addClass("bomb-module-timer-strikes").html(module.strikes).appendTo(e);
                }
            }
            if (module.type == "module") {
                var ic = null;
                var setIcon = (icon) => {
                    if (!ic) {
                        ic = $("<img/>").addClass("bomb-module-module-icon").on("error", () => setIcon("Blank"));
                        e.addClass("bomb-module-module").append(ic);
                        $("<div/>").addClass("yellow-highlight bomb-module-highlight").appendTo(e);
                    }
                    ic.attr({ src: "https://ktane.timwi.de/Icons/" + icon + ".png" });
                };
                //console.log(parseData);
                var data = module.data;
                if (!data) setIcon("Blank"); else {
                    //console.log(data);
                    setIcon(encodeURIComponent(data.icon || data.displayName));
                }
                var hov = null;
                var setHovPos = (ev) => hov.css({
                    top: ev.pageY,
                    left: ev.pageX
                });
                e.on("mouseenter", (ev) => {
                    var s = module.data.displayName;
                    if (module.parsed && module.parsed.displayCounter) s += " " + module.parsed.counter;
                    if (module.data.repo) {
                        var ex = ["by " + module.data.repo.Author].join("<br/>");
                        s += "<br/>"+ex;
                    }
                    hov = $("<div/>").addClass("bomb-module-hover-label").html(s).appendTo(document.body);
                    setHovPos(ev);
                }).on("mousemove", (ev) => {
                    if (!hov) return;
                    setHovPos(ev);
                }).on("mouseleave", () => {
                    if (hov) hov.remove();
                }).on("click", () => {
                    module.parsed.modListing[0].click();
                });
            }
            this.moduleSlots[module.face][module.index].append(e);
            this.emptyModuleSlots[module.face][module.index] = false;
        });
        Object.keys(this.emptyModuleSlots).forEach((s) => {
            this.emptyModuleSlots[s].forEach((q, y) => {
                if (q) $("<div/>").addClass("bomb-module bomb-module-empty").appendTo(this.moduleSlots[s][y]);
            });
        });
    }
};

var params = {};
window.location.search.slice(1).split("&").forEach((s) => {
    var r = s.split("=");
    params[decodeURIComponent(r[0])] = decodeURIComponent(r[1]);
});
if (params.width && params.height && params.modules && params.edgework) {
    var modules = JSON.parse(params.modules);
    var edgework = JSON.parse(params.edgework);
    var renderer = new BombRenderer(".wrapper", params.width, params.height);
    renderer.addModules(modules);
    renderer.addEdgework(edgework);
}