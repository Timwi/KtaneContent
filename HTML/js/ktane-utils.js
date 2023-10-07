/*
    MIT License

    Copyright 2017 samfundev and Timwi

    Permission is hereby granted, free of charge, to any person obtaining a copy of this file (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

let protocol = location.protocol;
let e = document.createElement("script");
e.src = "../HTML/js/jquery.3.7.0.min.js";
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
                const infoDiv = $("<div>").addClass("developer-mode-warning").append($("<h3>").text("DEVELOPER MODE (Alt-P)")).appendTo($("body"));
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
        })

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
            // Alt-#: Select highlight color
            else if (!ctrlSelectsColors && n !== null)
            {
                colorSelect.val(n).change();
            }
        });

        // Highlighter mobile controls
        let mode = null;
        let mobileControls = false;
        if ((/mobi/i.test(navigator.userAgent) || window.location.hash.indexOf('highlight') !== -1) && window.location.hash.indexOf('nohighlight') === -1)
        {
            let styleTag = $("<style>").appendTo($("head"));
            setColor = function(color)
            {
                currentColor = color;
                styleTag.text((
                    ".ktane-highlight-svg { width: 50px; height: 50px; }" +
                    ".ktane-highlight-pen { fill: !0!; }" +
                    ".ktane-highlight-btn { position: fixed; top: 5px; width: 50px; height: 50px; border: 3px solid transparent; border-radius: 10px; }" +
                    ".ktane-highlight-btn.selected { border-color: #4c6; }" +
                    "@media print { .ktane-highlight-btn { display: none; }  }")
                    .replace(/!0!/g, colors[color].color));
            };

            $('<div class="ktane-highlight-btn theme">').data("mode", "theme").css({ right: 5 }).appendTo(document.body).append(
                $("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class='ktane-highlight-svg'><path fill='none' d='M0 0h24v24H0z'/><path style='stroke:#000;stroke-linecap:round;stroke-linejoin:round;fill:#fff;fill-opacity:.5' d='M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1h0z'/></svg>")
            );

            let penSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-50 -50 1100 1100' class='ktane-highlight-svg'>{0}<path d='M816.3 32.7c-9.6 0-14.8 1-21 4.2C791 39.3 659 153 501.7 289.6c-247.8 215.5-291.3 254-328 291-56.7 57.4-55.6 53.8-37 115.6 5 17 6.3 24.5 6.3 38.3.3 33.5-6 43-74.4 111.6-29.7 30-54.8 56.2-56 58.5-1.4 2.3-2.4 5.7-2.6 7.6 0 5.2 5.4 14.4 10 17 9 4.6 125.4 38 133.4 38 8.3 0 8.7-.4 43-34 36.5-35.7 47-43.6 67.2-49.3 17.8-5.2 43.6-3.3 76.8 5.7 29.3 8 42.3 8.2 54.7 2 3.8-2 24.3-20.8 45.7-42 32.6-32.2 79.7-85.2 288-324.8C865.6 367.4 980 234.7 983 230c7.4-11.2 9-25 4.7-39.7-3.3-11-4.8-12.8-71.5-79.8-76.2-76.5-78-78-100-78zm1 38.3c2.2 0 27 23.2 68.5 64.6 57.5 57.4 64.5 65.2 64.2 70-.4 4-60.2 74.2-239 280L472.4 760.3l-105-104.8C310 598 263 550.2 263.3 549.5c.4-.7 124.3-108.5 275.4-240C704.6 165.6 815 71 817.2 71zM233 576.6L339.5 683 445.7 789l-33.5 33.5c-26.8 26.8-34.5 33.5-38.7 33.5-3 0-17.3-3-32-6.5-14.6-3.7-32.8-7.3-40-8-27-2.5-62.7 6-83.5 20-5 3.3-9.6 6-10.4 6-.7 0-13.2-12-27.7-26.4l-26.4-26.5 5-6.5c8.3-11 17.8-31.8 21-45.5 5.3-21.3 3-49-6.6-81.8-4.2-14.8-8-29-8-31.6 0-3.7 8.2-13 34-38.7l34-34zM127 844.6c.6 0 12.5 11.6 26.5 25.6l25.2 25.3-15.7 15.7-16 15.7-39.7-11.8-39.8-12L96.7 874c16-16 29.6-29.3 30.2-29.3z' fill='black'/><path d='M885.8 135.6c57.5 57.4 64.5 65.3 64.2 70-.4 4-60.2 74.2-239 280L472.4 760.3l-105-104.8C310 598 263 550.2 263.3 549.5c.4-.7 124.3-108.5 275.4-240C704.6 165.6 815 71 817.2 71c2.3 0 27 23.2 68.6 64.5zm-473.6 687c-26.8 27-34.5 33.6-38.7 33.6-3 0-17.2-3-32-6.5-14.6-3.6-32.7-7.3-40-7.8-27-2.8-62.6 5.6-83.5 19.6-5 3.4-9.6 6-10.4 6-.7 0-13.2-11.8-27.7-26.3L153.5 815l5-6.7c8.2-11 17.8-31.7 21-45.5 5.2-21.3 3-49-6.6-81.8-4.2-14.8-8-29-8-31.6 0-3.7 8.2-12.8 34-38.7l34-34 106.4 106.2L445.7 789l-33.5 33.5zm-259 47.6l25.3 25.3-15.7 15.7-16 15.7-39.7-11.8-39.7-12L96.6 874c16-16 29.7-29.3 30.2-29.3.6 0 12.5 11.5 26.5 25.5z' class='ktane-highlight-pen'/></svg>";

            if ($('td, th, li, .highlightable').length)
            {
                $('<div class="ktane-highlight-btn color">').data('mode', 'color').css({ right: 60 }).appendTo(document.body).append($((
                    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10.5 10.5' class='ktane-highlight-svg'>" +
                    "<rect x='0.5' y='0.5' width='4.5' height='4.5' fill='!0!' rx='1' ry='1' />" +
                    "<rect x='5.5' y='0.5' width='4.5' height='4.5' fill='!1!' rx='1' ry='1' />" +
                    "<rect x='0.5' y='5.5' width='4.5' height='4.5' fill='!2!' rx='1' ry='1' />" +
                    "<rect x='5.5' y='5.5' width='4.5' height='4.5' fill='!3!' rx='1' ry='1' />" +
                    "</svg>").replace(/!(\d+)!/g, function(_, m) { return colors[+m].color; })));
                $('<div class="ktane-highlight-btn element">').data('mode', 'element').css({ right: 115 }).appendTo(document.body).append($(penSvg.replace(/\{0\}/g, '')));
                if ($('td, th').length)
                {
                    $('<div class="ktane-highlight-btn row">').data('mode', 'row').css({ right: 170 }).appendTo(document.body)
                        .append($(penSvg.replace(/\{0\}/g, "<path d='M 0 600 0 400 1000 400 1000 600 z' class='ktane-highlight-pen'/>")));
                    $('<div class="ktane-highlight-btn column">').data('mode', 'column').css({ right: 225 }).appendTo(document.body)
                        .append($(penSvg.replace(/\{0\}/g, "<path d='M 400 0 600 0 600 1000 400 1000 z' class='ktane-highlight-pen'/>")));
                }
            }

            $('.ktane-highlight-btn').click(function()
            {
                let newMode = $(this).data('mode');
                if (newMode === "theme") {
                    const checkbox = $('#dark-mode-enabled');
                    checkbox.prop('checked', !checkbox.prop('checked'));
                    updateDarkMode();
                } else if (newMode === 'color')
                    setColor((currentColor + 1) % colors.length);
                else
                {
                    $('.ktane-highlight-btn').removeClass('selected');
                    if (newMode === mode)
                        mode = null;
                    else
                    {
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
                        let table = element.parents("table, .highlightable-parent").first();

                        let a;
                        let b;
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

                            if (mobileControls)
                                highlight.insertAfter($('.ktane-highlight-btn').first());
                            else
                                highlight.appendTo(document.body);
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
    });
};
document.head.appendChild(e);
