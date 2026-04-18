/*
    MIT License

    Copyright 2017 samfundev and Timwi

    Permission is hereby granted, free of charge, to any person obtaining a copy of this file (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

let protocol = location.protocol;
let currentScript = document.currentScript || (function() {
    let scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
})();

let currentScriptSrc = currentScript.src;
let scriptDir = currentScriptSrc.substring(0, currentScriptSrc.lastIndexOf('/') + 1);
let e = document.createElement("script");
e.src = scriptDir + "jquery.3.7.0.min.js";

// The Manual Merger implements its own version of ktane-utils in order
// to work globally across all loaded manuals, so we shouldn't initialize
// utils here if the `merger` query parameter is present.
// We still load jquery as some manuals use it independently.
if (!new URLSearchParams(window.location.search).has("merger")) {
    e.onload = function()
    {
        $(function()
        {
            let alertTimeout;
            let notification = $('<div id="notification">').appendTo("body").hide();
            function showNotification(str, color)
            {
                if (alertTimeout)
                    clearTimeout(alertTimeout);

                notification.css("background-color", color).text(str).fadeIn(200);
                alertTimeout = setTimeout(function() { notification.fadeOut(500); }, 2000);
            }

            // Some users can't use Alt+<number> to select highlight colors. Setting this localStorage item (to anything) allows them to use Ctrl instead.
            // There's no option in the UI to enable this, because of how rarely it's necessary.
            // Note: this change _only_ applies to the highlight color selection; other keybinds like Alt-O and Alt-C remain on Alt.
            let ctrlSelectsColors = localStorage.getItem('ktane-ctrl-selects-colors') !== null;

            // Freeform draw variables
            let strokes = []; // Each stroke contains {erase, color, width, points:[{x,y}], centerX}
            let currentStroke = null;
            let sizingCanvas = false;
            let modifiersHeld = false;
            let mobileEraserMode = false;

            // OPTIONS MENU
            let options = $(`<div id="optionsMenu">
                <h2>Options (Alt-O)</h2>
                <div class='option-group'>
                    <h3>Highlighter</h3>
                    <div><input type='checkbox' id='highlighter-enabled'>&nbsp;<label for='highlighter-enabled' accesskey='h'>Enabled</label> (Alt-H)</div>
                    <div>Color: <select id='highlighter-color'></select> (${ctrlSelectsColors ? 'Ctrl' : 'Alt'}-<span id='highlighter-color-index'>1</span>)</div>
                    <div>Highlights: <button id='clear-highlights' accesskey='c'>Clear</button> (Alt-C)</div>
                </div>
                <div class='option-group'>
                    <h3>Page layout</h3>
                    <div><input type='radio' name='page-layout' class='page-layout' id='page-layout-vertical'>&nbsp;<label for='page-layout-vertical' accesskey='v'><kbd>V</kbd>ertical</label></div>
                    <div><input type='radio' name='page-layout' class='page-layout' id='page-layout-side-by-side'>&nbsp;<label for='page-layout-side-by-side' accesskey='s'><kbd>S</kbd>ide by side</label></div>
                </div>
                <div class='option-group'>
                    <h3>Dark Mode</h3>
                    <div><input type='checkbox' id='dark-mode-enabled'>&nbsp;<label for='dark-mode-enabled'>Enabled</label> (Alt-W)</div>
                </div>
                <div class='option-group'>
                    <h3>Freeform Drawing</h3>
                    <div><input type='checkbox' id='freeform-drawing-enabled'>&nbsp;<label for='freeform-drawing-enabled'>Enabled</label> (Alt-D)</div>
                    <div>Brush size: (Alt-Minus / Alt-Plus)</div>
                    <div><input type='range' id='draw-width' min='5' max='50' step='5' value='20'></div>
                </div>
                <div class='option-group'>
                    <h3>Developer mode</h3>
                    <div><input type='checkbox' id='developer-mode-enabled'>&nbsp;<label for='developer-mode-enabled'>Enabled</label> (Alt-P)</div>
                </div>
            </div>`).appendTo("body");

            // DARK MODE
            function updateDarkMode()
            {
                if ($('#dark-mode-enabled').prop('checked'))
                {
                    $("body,.darkable").addClass("dark");
                    localStorage.setItem('ktane-dark-mode', true);
                }
                else
                {
                    $("body,.darkable").removeClass("dark");
                    localStorage.setItem('ktane-dark-mode', false);
                }
            }
            $('#dark-mode-enabled').click(updateDarkMode);
            // DEVELOPER MODE: Highlight overflow, matching module name headers, only one flavour text.
            function updateDeveloperMode()
            {
                if ($('#developer-mode-enabled').prop('checked'))
                {
                    $("body").addClass("developer-mode");
                    const infoDiv = $("<div>").addClass("developer-mode-warning").append($("<h3>").text("DEVELOPER MODE (Alt-P)")).insertAfter($(".section"));
                    const flavourTextCounts = document.getElementsByClassName("flavour-text").length;
                    if (flavourTextCounts > 1) {
                        $(".flavour-text").addClass("developer-mode-warning");
                        $("<p>").text("There is more than one element with the \"flavour-text\" class. Use the \"comment\" class for all but the actual flavour text immediately following the title.").appendTo(infoDiv);
                    } else if (flavourTextCounts === 0)
                        $("<p>").text("There is no flavour text. There must be exactly one flavour text, which must have the \"flavour-text\" class.").appendTo(infoDiv);
                    const sectionTitles = document.getElementsByClassName("page-header-section-title");
                    for (let ix = 0; ix < sectionTitles.length; ix++) {
                        if (sectionTitles[ix].textContent != sectionTitles[(ix + 1) % sectionTitles.length].textContent || sectionTitles[ix].textContent === "Module Name") {
                            $(".page-header-section-title").addClass("developer-mode-warning");
                            $("<p>").text("The section titles do not match or have not been changed from the default. (Ignore this if intentional)").appendTo(infoDiv);
                            break;
                        }
                    }
                    localStorage.setItem('ktane-developer-mode', true);
                }
                else
                {
                    $("body").removeClass("developer-mode");
                    $(".flavour-text").removeClass("developer-mode-warning");
                    $(".page-header-section-title").removeClass("developer-mode-warning");
                    $(".developer-mode-warning").remove();
                    localStorage.setItem('ktane-developer-mode', false);
                }
            }
            $('#developer-mode-enabled').click(updateDeveloperMode);

            // PAGE-LAYOUT OPTIONS
            function updateMultipageView()
            {
                if (strokes.length !== 0) {
                    let continueUpdate = confirm("Are you sure you want to change the page layout? This will clear all of your freeform drawings.")
                    if (!continueUpdate) { return }
                    clearStrokes()
                }
                if ($('#page-layout-side-by-side').prop('checked'))
                {
                    $("body").addClass("multipage");
                    localStorage.setItem('ktane-page-layout', 'side-by-side');
                }
                else
                {
                    $("body").removeClass("multipage");
                    localStorage.setItem('ktane-page-layout', 'vertical');
                }
                $('.ktane-highlight').each(function(_, e) {
                    setPosition($(e));
                });
            }
            $('.page-layout').click(function() { updateMultipageView(); });

            // HIGHLIGHTER
            let colors = [
                { color: "rgba(128, 128, 128, 0.4)", name: 'Gray' },
                { color: "rgba(68, 130, 255, 0.4)", name: 'Blue' },
                { color: "rgba(223, 32, 32, 0.4)", name: 'Red' },
                { color: "rgba(34, 195, 34, 0.4)", name: 'Green' },
                { color: "rgba(223, 223, 32, 0.4)", name: 'Yellow' },
                { color: "rgba(223, 0, 223, 0.4)", name: 'Magenta' },
                { color: "rgba(223, 128, 0, 0.4)", name: 'Orange' },
                { color: "rgba(0, 223, 223, 0.4)", name: 'Cyan' },
                { color: "rgba(255, 255, 255, 0.4)", name: 'White' },
                { color: "rgba(0, 0, 0, 0.4)", name: 'Black' }];
            let currentColor = 1;
            let setColor = function(color) { currentColor = color; };   // The mobile UI overrides this function

            $('#highlighter-enabled').click(function() { localStorage.setItem('ktane-highlighter-enabled', $('#highlighter-enabled').prop('checked')); });
            const colorSelect = $('#highlighter-color')
            for (const [index, color] of colors.entries()) {
                $(`<option value="${index}">`).attr("selected", index == currentColor ? "" : undefined).text(color.name).appendTo(colorSelect);
            }

            colorSelect.on("change", function(e)
            {
                setColor(parseInt(colorSelect.val()));
                $("#highlighter-color-index").text(currentColor);
                showNotification(`Highlighter color: ${colors[currentColor].name.toLowerCase()}`, colors[currentColor].color);
            });

            // An array of elementHighlights.
            const highlights = [];
            const clearHighlights = $("#clear-highlights");
            clearHighlights.click(() => {
                for (const elementHighlights of highlights) {
                    for (const highlight of elementHighlights) {
                        highlight.remove();
                    }
                }
                $("svg .svgIsHighlighted").each(function() {
                    if ($(this).hasClass("stroke-highlightable")) {
                        $(this).css("stroke", $(this).data('origStroke'));
                    }
                    else {
                        $(this).css("fill", $(this).data('origFill'));
                    }
                }).removeClass("svgIsHighlighted");
                clearStrokes();
            });

            // Takes a keypress event; returns a number 0-9 if a number key was pressed (ignoring modifiers), else null.
            function extractNumberKey(event) {
                let n = parseInt(event.key);
                if (n >= 0 && n <= 9) {
                    return n;
                }
                else if (event.keyCode >= 48 && event.keyCode <= 57) {
                    return event.keyCode - 48;
                }
                return null;
            }

            $(document).keydown(function(event)
            {
                let n = extractNumberKey(event);

                // Special case: Ctrl+# instead of Alt+#
                if(
                    ctrlSelectsColors && n !== null
                    && event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey
                ) {
                    colorSelect.val(n).change();
                    event.preventDefault();
                    return;
                }

                // Only accept shortcuts with Alt or Ctrl+Shift
                if (!event.altKey && !(event.shiftKey && (event.ctrlKey || event.metaKey)))
                    return;

                let k = event.key.toLowerCase();
                // Alt-O: Open options menu
                if (k == "o" || event.keyCode === 0x4F)
                {
                    options.toggleClass('open');
                }
                // Alt-C: Clear highlights
                else if (k == "c" || event.keyCode === 67)
                {
                    clearHighlights.click();
                }
                // Alt-W: Dark mode
                else if (k == "w" || event.keyCode === 87)
                {
                    $('#dark-mode-enabled').click();
                }
                // Alt-P: Developer mode
                else if (k == "p" || event.keyCode === 80)
                {
                    $('#developer-mode-enabled').click();
                }
                // Alt-D: Toggle freeform drawing mode
                else if (k == "d" || event.keyCode == 68) {
                    $('#freeform-drawing-enabled').prop('checked', !drawEnabled())
                    .trigger('change');
                }
                // Alt-Plus: Increash draw mode brush size
                else if ([187,61,171,107].includes(event.keyCode) || ["=","+","Add"].includes(event.key)) {
                    changeBrushSize(+5)
                }
                // Alt-Minus: Decrease draw mode brush size
                else if ([189,173,109].includes(event.keyCode) || ["-","Subtract"].includes(event.key)) {
                    changeBrushSize(-5)
                }
                // Alt-#: Select highlight color
                else if (!ctrlSelectsColors && n !== null)
                {
                    colorSelect.val(n).change();
                } else {
                    // No valid keybind detected.
                    return;
                }
                event.preventDefault();
            });

            // Highlighter mobile controls
            let mode = null;
            let mobileControls = false;
            let btnRightPos = 5;
            const nextIconPos = () => {
                const current = btnRightPos;
                btnRightPos += 55;
                return current;
            }
            if ((/mobi/i.test(navigator.userAgent) || window.location.hash.indexOf('highlight') !== -1) && window.location.hash.indexOf('nohighlight') === -1)
            {
                let styleTag = $("<style>").appendTo($("head"));
                setColor = function(color)
                {
                    currentColor = color;
                    styleTag.text((
                        ".ktane-highlight-svg { width: 50px; height: 50px; }" +
                        ".ktane-highlight-pen { fill: !0!; }" +
                        ".ktane-highlight-btn { position: fixed; top: 5px; width: 50px; height: 50px; border: 3px solid transparent; border-radius: 10px; z-Index: 10000; }" +
                        ".ktane-highlight-btn.selected { border-color: #4c6; }" +
                        "@media print { .ktane-highlight-btn { display: none; }  }")
                        .replace(/!0!/g, colors[color].color));
                };

                $('<div class="ktane-highlight-btn theme">')
                    .data("mode", "theme")
                    .css({ right: nextIconPos() })
                    .appendTo(document.body)
                    .append(
                        $("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class='ktane-highlight-svg'><path fill='none' d='M0 0h24v24H0z'/><path style='stroke:#000;stroke-linecap:round;stroke-linejoin:round;fill:#fff;fill-opacity:.5' d='M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1h0z'/></svg>")
                    );

                let penSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-50 -50 1100 1100' class='ktane-highlight-svg'>{0}<path d='M816.3 32.7c-9.6 0-14.8 1-21 4.2C791 39.3 659 153 501.7 289.6c-247.8 215.5-291.3 254-328 291-56.7 57.4-55.6 53.8-37 115.6 5 17 6.3 24.5 6.3 38.3.3 33.5-6 43-74.4 111.6-29.7 30-54.8 56.2-56 58.5-1.4 2.3-2.4 5.7-2.6 7.6 0 5.2 5.4 14.4 10 17 9 4.6 125.4 38 133.4 38 8.3 0 8.7-.4 43-34 36.5-35.7 47-43.6 67.2-49.3 17.8-5.2 43.6-3.3 76.8 5.7 29.3 8 42.3 8.2 54.7 2 3.8-2 24.3-20.8 45.7-42 32.6-32.2 79.7-85.2 288-324.8C865.6 367.4 980 234.7 983 230c7.4-11.2 9-25 4.7-39.7-3.3-11-4.8-12.8-71.5-79.8-76.2-76.5-78-78-100-78zm1 38.3c2.2 0 27 23.2 68.5 64.6 57.5 57.4 64.5 65.2 64.2 70-.4 4-60.2 74.2-239 280L472.4 760.3l-105-104.8C310 598 263 550.2 263.3 549.5c.4-.7 124.3-108.5 275.4-240C704.6 165.6 815 71 817.2 71zM233 576.6L339.5 683 445.7 789l-33.5 33.5c-26.8 26.8-34.5 33.5-38.7 33.5-3 0-17.3-3-32-6.5-14.6-3.7-32.8-7.3-40-8-27-2.5-62.7 6-83.5 20-5 3.3-9.6 6-10.4 6-.7 0-13.2-12-27.7-26.4l-26.4-26.5 5-6.5c8.3-11 17.8-31.8 21-45.5 5.3-21.3 3-49-6.6-81.8-4.2-14.8-8-29-8-31.6 0-3.7 8.2-13 34-38.7l34-34zM127 844.6c.6 0 12.5 11.6 26.5 25.6l25.2 25.3-15.7 15.7-16 15.7-39.7-11.8-39.8-12L96.7 874c16-16 29.6-29.3 30.2-29.3z' fill='black'/><path d='M885.8 135.6c57.5 57.4 64.5 65.3 64.2 70-.4 4-60.2 74.2-239 280L472.4 760.3l-105-104.8C310 598 263 550.2 263.3 549.5c.4-.7 124.3-108.5 275.4-240C704.6 165.6 815 71 817.2 71c2.3 0 27 23.2 68.6 64.5zm-473.6 687c-26.8 27-34.5 33.6-38.7 33.6-3 0-17.2-3-32-6.5-14.6-3.6-32.7-7.3-40-7.8-27-2.8-62.6 5.6-83.5 19.6-5 3.4-9.6 6-10.4 6-.7 0-13.2-11.8-27.7-26.3L153.5 815l5-6.7c8.2-11 17.8-31.7 21-45.5 5.2-21.3 3-49-6.6-81.8-4.2-14.8-8-29-8-31.6 0-3.7 8.2-12.8 34-38.7l34-34 106.4 106.2L445.7 789l-33.5 33.5zm-259 47.6l25.3 25.3-15.7 15.7-16 15.7-39.7-11.8-39.7-12L96.6 874c16-16 29.7-29.3 30.2-29.3.6 0 12.5 11.5 26.5 25.5z' class='ktane-highlight-pen'/></svg>";

                if ($('td, th, li, .highlightable').length)
                {
                    $('<div class="ktane-highlight-btn color">')
                        .data('mode', 'color')
                        .css({ right: nextIconPos() })
                        .appendTo(document.body)
                        .append($((
                            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10.5 10.5' class='ktane-highlight-svg'>" +
                            "<rect x='0.5' y='0.5' width='4.5' height='4.5' fill='!0!' rx='1' ry='1' />" +
                            "<rect x='5.5' y='0.5' width='4.5' height='4.5' fill='!1!' rx='1' ry='1' />" +
                            "<rect x='0.5' y='5.5' width='4.5' height='4.5' fill='!2!' rx='1' ry='1' />" +
                            "<rect x='5.5' y='5.5' width='4.5' height='4.5' fill='!3!' rx='1' ry='1' />" +
                            "</svg>").replace(/!(\d+)!/g, function(_, m) { return colors[+m].color; }
                        )));
                    $('<div class="ktane-highlight-btn element">')
                        .data('mode', 'element')
                        .css({ right: nextIconPos() })
                        .appendTo(document.body)
                        .append($(penSvg.replace(/\{0\}/g, '')));
                    if ($('td, th').length)
                    {
                        $('<div class="ktane-highlight-btn row">')
                            .data('mode', 'row')
                            .css({ right: nextIconPos() })
                            .appendTo(document.body)
                            .append($(penSvg.replace(/\{0\}/g, "<path d='M 0 600 0 400 1000 400 1000 600 z' class='ktane-highlight-pen'/>")));
                        $('<div class="ktane-highlight-btn column">')
                            .data('mode', 'column')
                            .css({ right: nextIconPos() })
                            .appendTo(document.body)
                            .append($(penSvg.replace(/\{0\}/g, "<path d='M 400 0 600 0 600 1000 400 1000 z' class='ktane-highlight-pen'/>")));
                    }
                }
                // Draw button
                drawIconRightPos = btnRightPos;
                $('<div class="ktane-highlight-btn draw">')
                    .data('mode','draw')
                    .css({right: nextIconPos()})
                    .appendTo(document.body)
                    .append(
                        $('<svg viewBox="0 0 938 822" fill="none" xmlns="http://www.w3.org/2000/svg" class="ktane-highlight-svg"> <path class="ktane-highlight-pen" d="M378.5 446.494C426.602 468.915 458.654 492.087 493.5 553.494M278.5 599.201C312 612.701 327 629.201 325.5 666.201C582.334 483.605 713.321 350.451 916 39.7014C921.658 31.0271 905.687 15.5636 897 21.2014C576.595 229.139 445.807 356.741 278.5 599.201ZM20 712.201C19.999 819.715 335.5 866.201 308 638.201C171 530.701 120 689.201 80.9999 702.201C31.4918 698.221 20.0001 700.201 20 712.201Z" stroke="black" stroke-width="30"/></svg>')
                    )
                $('<div class="ktane-highlight-btn erase">')
                    .data('mode', 'erase')
                    .css({ right: drawIconRightPos, top: 60 })
                    .appendTo(document.body)                                                                 
                    .append($(
                        '<svg width="810" height="775" viewBox="0 0 810 775" fill="none" xmlns="http://www.w3.org/2000/svg" class="ktane-highlight-svg">'+
                            '<path class="ktane-highlight-pen" d="M227.217 750.541L22.2501 524.313C12.1672 513.185 12.6589 496.083 23.3646 485.552L148.457 362.501L493.55 23.0388C504.439 12.3272 521.904 12.3194 532.803 23.0213L571.542 61.0603L738.103 224.611L786.048 271.69C797.152 282.593 797.235 300.458 786.233 311.464L441.836 655.984L338.116 759.741H247.967C240.062 759.741 232.525 756.399 227.217 750.541Z"/>'+
                            '<path d="M227.217 750.541L238.333 740.47L238.333 740.469L227.217 750.541ZM22.2501 524.313L33.3661 514.242H33.3661L22.2501 524.313ZM662.772 774.741C671.056 774.741 677.772 768.025 677.772 759.741C677.772 751.457 671.056 744.741 662.772 744.741V759.741V774.741ZM786.233 311.464L796.842 322.069V322.069L786.233 311.464ZM23.3646 485.552L12.8456 474.859H12.8456L23.3646 485.552ZM493.55 23.0388L504.069 33.7323V33.7323L493.55 23.0388ZM209.333 423.398L198.725 434.003V434.003L209.333 423.398ZM532.803 23.0213L543.312 12.3184V12.3184L532.803 23.0213ZM738.103 224.611L748.613 213.908V213.908L738.103 224.611ZM786.048 271.69L775.539 282.393V282.393L786.048 271.69ZM227.217 750.541L238.333 740.469L33.3661 514.242L22.2501 524.313L11.134 534.385L216.101 760.612L227.217 750.541ZM247.967 759.741V774.741H338.116V759.741V744.741H247.967V759.741ZM338.116 759.741V774.741H662.772V759.741V744.741H338.116V759.741ZM786.233 311.464L775.625 300.859L431.228 645.379L441.836 655.984L452.445 666.589L796.842 322.069L786.233 311.464ZM441.836 655.984L431.228 645.379L327.507 749.136L338.116 759.741L348.724 770.346L452.445 666.589L441.836 655.984ZM23.3646 485.552L33.8836 496.246L158.976 373.194L148.457 362.501L137.938 351.807L12.8456 474.859L23.3646 485.552ZM148.457 362.501L158.976 373.194L504.069 33.7323L493.55 23.0388L483.031 12.3453L137.938 351.807L148.457 362.501ZM209.333 423.398L219.942 412.793L159.066 351.896L148.457 362.501L137.849 373.105L198.725 434.003L209.333 423.398ZM532.803 23.0213L522.294 33.7242L561.033 71.7631L571.542 61.0603L582.052 50.3574L543.312 12.3184L532.803 23.0213ZM209.333 423.398L219.942 434.003L582.151 71.665L571.542 61.0603L560.934 50.4555L198.725 412.793L209.333 423.398ZM446.077 660.227L456.686 649.622L452.445 645.379L441.836 655.984L431.228 666.589L435.469 670.831L446.077 660.227ZM441.836 655.984L452.445 645.379L384.969 577.879L374.36 588.484L363.752 599.089L431.228 666.589L441.836 655.984ZM374.36 588.484L384.969 577.879L219.942 412.793L209.333 423.398L198.725 434.003L363.752 599.089L374.36 588.484ZM571.542 61.0603L561.033 71.7631L727.594 235.314L738.103 224.611L748.613 213.908L582.052 50.3574L571.542 61.0603ZM738.103 224.611L727.594 235.314L775.539 282.393L786.048 271.69L796.558 260.987L748.613 213.908L738.103 224.611ZM374.36 588.484L384.969 599.089L748.712 235.216L738.103 224.611L727.495 214.007L363.752 577.879L374.36 588.484ZM786.233 311.464L796.842 322.069C813.737 305.167 813.61 277.731 796.558 260.987L786.048 271.69L775.539 282.393C780.694 287.455 780.733 295.75 775.625 300.859L786.233 311.464ZM493.55 23.0388L504.069 33.7323C509.125 28.7591 517.233 28.7554 522.294 33.7242L532.803 23.0213L543.312 12.3184C526.575 -4.1166 499.754 -4.10468 483.031 12.3453L493.55 23.0388ZM22.2501 524.313L33.3661 514.242C28.6848 509.075 28.9131 501.135 33.8836 496.246L23.3646 485.552L12.8456 474.859C-3.59521 491.031 -4.35044 517.294 11.134 534.385L22.2501 524.313ZM227.217 750.541L216.101 760.612C224.252 769.609 235.827 774.741 247.967 774.741V759.741V744.741C244.297 744.741 240.797 743.189 238.333 740.47L227.217 750.541Z" fill="black"/>'+
                        '</svg>'
                    ))
                    .hide(); 

                $('.ktane-highlight-btn').click(function()
                {
                    let newMode = $(this).data('mode');
                    const drawingCheckbox = $('#freeform-drawing-enabled');
                    const uncheckAllTools = () => {
                        $('.ktane-highlight-btn').removeClass('selected');
                        if (drawingCheckbox.prop('checked')) {
                            drawingCheckbox.prop('checked',false);
                            updateDrawMode();
                        }
                    };
                    switch(newMode) {
                        case "theme":
                            const darkModeCheckbox = $('#dark-mode-enabled');
                            darkModeCheckbox.prop('checked', !darkModeCheckbox.prop('checked'));
                            updateDarkMode();
                            break;
                        case "color":
                            setColor((currentColor + 1) % colors.length);
                            break;
                        case "draw":
                            const enablingDraw = mobileEraserMode || !drawingCheckbox.prop('checked')
                            uncheckAllTools();
                            drawingCheckbox.prop('checked', enablingDraw);
                            updateDrawMode();
                            if (enablingDraw) {
                                mode = null;
                                $(this).addClass('selected');
                            }
                            break;
                        case "erase":
                            mobileEraserMode = !mobileEraserMode;
                            $(this).toggleClass('selected');
                            $('.ktane-highlight-btn.draw').toggleClass('selected',!mobileEraserMode);
                            break;
                        default:
                            uncheckAllTools();
                            if (newMode === mode)
                                mode = null;
                            else {
                                mode = newMode;
                                $(this).addClass('selected');
                            }
                    }
                    return false;
                });

                mobileControls = true;
            }

            function getMode(event)
            {
                if (mode !== null)
                    return mode;

                let ctrl = event.ctrlKey;
                let shift = event.shiftKey;

                // Make Alt+Click behave like Ctrl+Shift+Click
                if (event.altKey && !ctrl && !shift)
                {
                    ctrl = true;
                    shift = true;
                }

                // Make Command on a Mac behave like Ctrl
                if (event.metaKey)
                    ctrl = true;

                return ((ctrl && !shift) ? 'column' : (shift && !ctrl) ? 'row' : (shift && ctrl) ? 'element' : null);
            }

            function setPosition(highlight)
            {
                let a = highlight.data('obj-a'), b = highlight.data('obj-b');
                // Check to see if we're parented to any overflow elements.
                const overflowElement = a.parents().filter((_, element) => {
                    const jqueryElement = $(element);
                    const overflows = [jqueryElement.css("overflow-x"), jqueryElement.css("overflow-y")];
                    return ["hidden", "scroll", "auto", "overlay"].some(value => overflows.includes(value));
                });

                // If we have no overflow elements faster path.
                // We also don't support more than one overflow element so fallback if that happens.
                if (overflowElement.length !== 1) {
                    highlight.outerWidth(a.outerWidth());
                    highlight.outerHeight(b.outerHeight());
                    highlight.css("left", a.offset().left + "px");
                    highlight.css("top", b.offset().top + "px");
                    highlight.css("transform-origin", -a.offset().left + "px " + -b.offset().top + "px");
                    return;
                }

                // This is a whole bunch of math that tries to "clip" the highlight so that it's inside of its overflow element.
                const outerClipBox = overflowElement[0].getBoundingClientRect();
                const left = Math.max(a.offset().left, scrollX + outerClipBox.left);
                const top = Math.max(b.offset().top, scrollY + outerClipBox.top);

                highlight.css("left", left + "px");
                highlight.css("top", top + "px");
                highlight.css("transform-origin", -left + "px " + -top + "px");
                highlight.outerWidth(Math.min(a.outerWidth() - Math.max(0, scrollX + outerClipBox.left - a.offset().left), scrollX + outerClipBox.right - left));
                highlight.outerHeight(Math.min(b.outerHeight() - Math.max(0, scrollY + outerClipBox.top - b.offset().top), scrollY + outerClipBox.bottom - top));
            }

            function makeHighlightable(element)
            {
                // An array of highlights that have been created for this element.
                // This is required because there are different modes of highlights that a single element can have at the same time.
                let elementHighlights = [];
                highlights.push(elementHighlights);

                function findHighlight(h)
                {
                    for (let i = 0; i < elementHighlights.length; i++)
                        if (elementHighlights[i].element === h)
                            return i;
                    return -1;
                }

                element.click(function(event)
                {
                    let thisMode = getMode(event);
                    let highlighterEnabled = $('#highlighter-enabled').prop('checked');

                    // Allow elements to specify data-mode='element/row/column' to specify
                    // that it should trigger on Alt/Shift/Ctrl respectively
                    let reqMode = element.data('mode');

                    if (highlighterEnabled && thisMode !== null)
                    {
                        let svg = element.is("svg *");

                        if (svg && reqMode && reqMode !== thisMode) {
                            element.hide();
                            $(document.elementFromPoint(event.clientX, event.clientY)).trigger(event);
                            element.show();
                            return false;
                        }

                        if (svg && element.hasClass("svgIsHighlighted")) {
                            if (element.hasClass("stroke-highlightable")) {
                                element.css("stroke", element.data('origStroke'));
                            }
                            else {
                                element.css("fill", element.data('origFill'));
                            }
                            element.removeClass("svgIsHighlighted");
                            return false;
                        }

                        let ix = -1;
                        for (let i = 0; i < elementHighlights.length; i++)
                            if (elementHighlights[i].mode === thisMode)
                                ix = i;
                        if (ix !== -1)
                        {
                            elementHighlights[ix].element.remove();
                            elementHighlights.splice(ix, 1);
                        }
                        else
                        {
                            let table = element.parents("table, tbody, .highlightable-parent").first();

                            let a, b;
                            if (thisMode === 'column' && table.length)
                            {
                                a = element;
                                b = table;
                            }
                            else if (thisMode === 'row' && table.length)
                            {
                                a = table;
                                b = element;
                            }
                            else if (thisMode === (reqMode || 'element'))
                            {
                                a = element;
                                b = element;
                            }
                            else
                                return;


                            if (svg)
                            {
                                element.addClass("svgIsHighlighted");
                                if (element.hasClass("stroke-highlightable")) {
                                    element.data('origStroke', element.css("stroke"));
                                    element.css("stroke", colors[currentColor].color);
                                }
                                else {
                                    element.data('origFill', element.css("fill"));
                                    element.css("fill", colors[currentColor].color);
                                }
                            }
                            else
                            {
                                let highlight = $("<div>").addClass("ktane-highlight").data('obj-a', a).data('obj-b', b).css({ 'background-color': colors[currentColor].color, position: 'absolute' });
                                setPosition(highlight);

                                function removeHighlight()
                                {
                                    highlight.remove();

                                    window.getSelection().removeAllRanges();
                                    const ix2 = findHighlight(highlight);
                                    if (ix2 !== -1)
                                        elementHighlights.splice(ix2, 1);
                                }

                                highlight.click(function(event2)
                                {
                                    if (highlighterEnabled && getMode(event2) == thisMode)
                                    {
                                        removeHighlight();
                                    }
                                    else
                                    {
                                        highlight.hide();
                                        $(document.elementFromPoint(event2.clientX, event2.clientY)).trigger(event2);
                                        const ix2 = findHighlight(highlight);
                                        if (ix2 !== -1)
                                            highlight.show();
                                    }
                                    return false;
                                });
                                elementHighlights.push({ mode: thisMode, element: highlight, remove: removeHighlight });
                                let sections = $(".section");
                                highlight.insertAfter(sections[sections.length - 1]);
                            }
                        }
                        window.getSelection().removeAllRanges();
                        return false;
                    }
                });
            };

            $("td:not(.nohighlight, .corner), th:not(.nohighlight, .corner), li:not(.nohighlight), .highlightable, .stroke-highlightable").each(function() {
                makeHighlightable($(this));
            });

            new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof Element && node.matches("td, th, li, .highlightable, .stroke-highlightable"))
                            makeHighlightable($(node));
                    }
                }
            }).observe(document.body, { subtree: true, childList: true })

            $(window).resize(function()
            {
                $('.ktane-highlight').each(function(_, e)
                {
                    setPosition($(e));
                });
            });

            document.body.addEventListener('scroll', event => {
                $('.ktane-highlight').each(function(_, _e)
                {
                    const e = $(_e);
                    if (event.target.contains(e.data('obj-a')[0]) || event.target.contains(e.data('obj-b')[0])) {
                        setPosition(e);
                    }
                });
            }, true);

            // Read current preferences from local storage
            let highlighterEnabled = localStorage.getItem('ktane-highlighter-enabled');
            $('#highlighter-enabled').prop('checked', highlighterEnabled === null ? true : highlighterEnabled == "true");
            let pageLayout = localStorage.getItem('ktane-page-layout') || 'vertical';
            $(`#page-layout-${pageLayout}`).prop('checked', true);
            let darkModeEnabled = localStorage.getItem('ktane-dark-mode');
            $('#dark-mode-enabled').prop('checked', darkModeEnabled == null ? false : darkModeEnabled == "true");
            let developerModeEnabled = localStorage.getItem('ktane-developer-mode');
            $('#developer-mode-enabled').prop('checked', developerModeEnabled == null ? false : developerModeEnabled == "true");
            updateMultipageView();
            updateDarkMode();
            updateDeveloperMode();
            setColor(1);

            // FREEFORM DRAW
            // Setup canvas
            const drawCanvas = $('<canvas id="draw-canvas">').css({
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9000,
                opacity: 0.4,
                touchAction: 'none'
            }).appendTo(document.body)[0];
            drawCanvas.addEventListener('contextmenu', e => {
                if (drawEnabled()) e.preventDefault();
            });
            drawCanvas.addEventListener('pointerdown', e =>  { drawStart(e) });
            drawCanvas.addEventListener('pointermove', e => { drawMove(e) });
            ['pointerup','pointercancel'].forEach(ev =>
                drawCanvas.addEventListener(ev, clearCurrentStroke)
            );
            const drawCtx = drawCanvas.getContext('2d');

            // Add new events to the window
            window.addEventListener('resize', sizeCanvas);
            window.addEventListener('blur', () => {
                // On alt-tabbing, clear modifiers held
                if (!modifiersHeld)
                    return;
                modifiersHeld = false;
                updateDrawMode();
            });
            ['keydown','keyup'].forEach(evName => {
                window.addEventListener(evName, e => {
                    let hasModKey = eventHasModifierKeys(e)
                    if (hasModKey === modifiersHeld)
                        return;
                    modifiersHeld = hasModKey;
                    updateDrawMode();
                })
            });
            new MutationObserver(sizeCanvas).observe(
                document.body,
                { childList: true, subtree: true }
            );

            // Add events to options menu components
            $('#freeform-drawing-enabled').on('change',() => {updateDrawMode(true)});
            $('#draw-width').on('change', () => {
                showNotification( `Brush size: ${$('#draw-width').val()/5}`, colors[currentColor].color)
            });

            // Start freeform service
            sizeCanvas();
            updateDrawMode();

            function changeBrushSize(byAmount) {
                // Changes brush size, keeping the value between 5 and 50 pixels.
                if (!drawEnabled()) return
                let currentValue = +$('#draw-width').val()
                let newValue = Math.min(50, Math.max(5, currentValue+byAmount))
                $('#draw-width').val(newValue)
                if (currentValue != newValue) {
                    $('#draw-width').trigger('change')
                }
            }

            function clearCurrentStroke() { currentStroke = null; }

            function clearStrokes() {
                strokes = [];
                redrawStrokes();
            }

            function drawEnabled() {
                return $('#freeform-drawing-enabled').prop('checked');
            }

            function drawMove(e) {
                // Called when the mouse moves while drawing. Draws new points.
                if (!currentStroke) return;
                const p = {x: e.pageX, y: e.pageY}
                currentStroke.points.push(p);
                const prev = currentStroke.points[currentStroke.points.length-2];
                drawNewPoint(currentStroke,prev,p);
            }

            function drawStart(e) {
                // Called when the user first clicks to start a drawing.
                if (!drawEnabled()) return;
                drawCanvas.setPointerCapture(e.pointerId);
                const erase = e.button === 2 || mobileEraserMode;
                let solidColor = getSolidColor(colors[currentColor].color);
                currentStroke = {
                    erase,
                    color: erase ?  null : solidColor,
                    width: +$('#draw-width').val(),
                    points: [{x: e.pageX, y: e.pageY}],
                    centerX: drawCanvas.width / 2
                };
                strokes.push(currentStroke);
            }

            function drawNewPoint(s,prev,current) {
                setupStroke(s);
                drawCtx.beginPath();
                drawCtx.moveTo(prev.x,prev.y);
                drawCtx.lineTo(current.x,current.y);
                drawCtx.stroke();
            }

            function drawStroke(s) {
                // Called mainly while redrawing the user's brush strokes.
                setupStroke(s);
                const dx = (drawCanvas.width / 2) - s.centerX
                drawCtx.beginPath();
                s.points.forEach((p,i) =>
                    i ? drawCtx.lineTo(p.x+dx, p.y) : drawCtx.moveTo(p.x+dx,p.y));
                drawCtx.stroke();
            }

            function eventHasModifierKeys(event) {
                return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
            }

            function getSolidColor(c) {
                // Replaces a rgba string's alpha value with 1.0.
                let solidColor = c.replace(/(rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*)[\d.]+(\s*\))/, '$11.0$2');
                return solidColor;
            }

            function setupStroke(s) {
                // Setups current stroke with its color and width.
                drawCtx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
                drawCtx.strokeStyle = s.color || '#000';
                drawCtx.lineWidth = s.erase ? s.width*2 : s.width;
                drawCtx.lineCap = 'round';
                drawCtx.lineJoin = 'round';
            }

            function redrawStrokes() {
                drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
                for (const s of strokes) drawStroke(s);
            }

            function sizeCanvas() {
                // For initial canvas sizing, and for when the window resizes.
                if (sizingCanvas) return;
                sizingCanvas = true;
                drawCanvas.style.display = 'none';
                const root = document.documentElement; 
                const margin = 1; // It needs a non-zero margin to not show additional scrolls
                const w = Math.max(root.scrollWidth, root.clientWidth)-margin;
                const h = Math.max(root.scrollHeight, root.clientHeight)-margin;
                drawCanvas.style.display = '';
                drawCanvas.width = w;
                drawCanvas.height = h;
                redrawStrokes();
                sizingCanvas = false;
            }

            function updateDrawMode(showNotif = false) {
                // Called when enabling freeform draw mode, or when the user presses
                // a modifier key.
                const on = drawEnabled();
                if (showNotif) {
                    showNotification(
                        `Freeform draw ${on ? "enabled" : "disabled"}`,
                        colors[on ? 8 : 9].color
                    )
                }
                drawCanvas.style.cursor = on ? 'crosshair' : '';
                if (mobileControls) {
                    $('.ktane-highlight-btn.draw').toggleClass('selected', on);
                    $('.ktane-highlight-btn.erase').toggle(on);
                    $('html, body').css('overflow', on ? 'hidden' : '');

                    if (!on) {
                        mobileEraserMode = false;
                        $('.ktane-highlight-btn.erase').removeClass('selected');
                    }
                }
                const activeEvents = on && !modifiersHeld
                drawCanvas.style.pointerEvents = activeEvents ? 'auto' : 'none';
            }
        });
    };
}

document.head.appendChild(e);