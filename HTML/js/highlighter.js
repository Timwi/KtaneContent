/*
	MIT License

	Copyright 2017 samfun123 and Timwi

	Permission is hereby granted, free of charge, to any person obtaining a copy of this file (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var protocol = location.protocol;
var e = document.createElement("script");
e.src = (protocol != "file:" ? protocol : "https:") + "//code.jquery.com/jquery-3.1.1.min.js";
e.onload = function()
{
	$(function()
	{
		/// Temporary fix for symbols being converted into emoji ///
		$("*").contents().filter(function() { 
			return (this.nodeType == 3); 
		}).each(function() {
			var elem = $(this);
			elem.text(elem.text().replace(/[◀▶↘↙↗↖]/g, function(char) { return char + "&#xFE0E;" }));
		});
		/// Temporary fix for symbols being converted into emoji ///

		var enabled = true;
		$(document).keypress(function(event)
		{
			if (event.shiftKey && event.key == "T")
			{
				enabled = !enabled;
			}
		});

		$("<style> .ktane-highlight { background-color: rgba(68, 130, 255, 0.4); position: absolute; } </style>").appendTo($("head"));

		var mode = null;
		var mobileControls = false;
		if ((/mobi/i.test(navigator.userAgent) || window.location.hash.indexOf('highlight') !== -1) && window.location.hash.indexOf('nohighlight') === -1)
		{
			$(
				"<style>" +
				"   .ktane-highlight-btn { position: fixed; top: 5px; width: 50px; height: 50px; opacity: .2; border-radius: 10px; }" +
				"   .ktane-highlight-btn::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\"><path d=\"M795.4 36.92c-4.4 2.49-136.55 116.25-293.78 252.8-247.82 215.45-291.3 253.95-328.07 291.1-56.69 57.26-55.54 53.62-36.96 115.48 4.98 16.85 6.32 24.51 6.32 38.3.38 33.51-5.94 42.9-74.31 111.65-29.69 29.88-54.77 56.11-56.11 58.41-1.34 2.3-2.3 5.75-2.49 7.66 0 5.17 5.36 14.36 9.96 16.85 9 4.79 125.44 38.11 133.48 38.11 8.24 0 8.62-.38 43.09-34.09 36.39-35.62 46.92-43.47 67.03-49.22 17.81-5.17 43.67-3.26 76.8 5.75 29.3 7.85 42.33 8.23 54.77 1.92 3.64-1.92 24.13-20.68 45.58-41.94 32.56-32.17 79.67-85.22 287.85-324.81 137.12-157.42 251.46-290.14 254.52-294.74 7.28-11.11 8.81-25.09 4.6-39.64-3.26-11.11-4.79-12.83-71.43-79.86-76.22-76.42-78.14-77.95-99.97-77.95-9.58 0-14.75 1.15-20.88 4.22z\"/><path d=\"M885.8 135.55c57.45 57.45 64.54 65.31 64.16 70.09-.38 4.02-60.13 74.12-239.01 279.99L472.51 760.27 367.56 655.51c-57.65-57.65-104.57-105.33-104.38-105.91.38-.77 124.29-108.59 275.4-239.97C704.62 165.42 814.94 71 817.23 71c2.29 0 27.01 23.18 68.57 64.55zM412.18 822.7c-26.81 26.81-34.47 33.51-38.69 33.51-2.87 0-17.24-2.87-31.98-6.51-14.56-3.64-32.75-7.28-40.03-7.85-27-2.68-62.63 5.75-83.5 19.73-4.98 3.45-9.58 6.13-10.34 6.13-.77 0-13.22-11.87-27.77-26.43l-26.24-26.43 4.98-6.51c8.23-11.11 17.81-31.79 21.07-45.58 5.17-21.26 2.87-49.03-6.7-81.78-4.21-14.75-7.85-28.92-7.85-31.6 0-3.64 8.04-12.83 33.9-38.69l34.09-34.09 106.29 106.3L445.7 789.19l-33.52 33.51zM153.25 870.2l25.28 25.28-15.7 15.71-15.9 15.7-39.83-11.69-39.84-11.87 29.3-29.3c16.09-16.09 29.69-29.3 30.26-29.3.57 0 12.45 11.49 26.43 25.47z\" fill=\"%2377a4ff\"/></svg>') center center no-repeat; }" +
				"   .ktane-highlight-btn.column { background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><path d=\"M 4 0 6 0 6 10 4 10 z\" fill=\"%234482ff\"/></svg>') center center no-repeat; }" +
				"   .ktane-highlight-btn.row { background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><path d=\"M 0 6 0 4 10 4 10 6 z\" fill=\"%234482ff\"/></svg>') center center no-repeat; }" +
				"   .ktane-highlight-btn.selected { background-color: #afa; opacity: .6; }" +
				"</style>").appendTo($("head"));

			if ($('td, th, li, .highlightable').length)
			{
				$('<div class="ktane-highlight-btn element">').data('mode', 'element').css({ right: 5 }).appendTo(document.body);
				if ($('td, th').length)
				{
					$('<div class="ktane-highlight-btn row">').data('mode', 'row').css({ right: 60 }).appendTo(document.body);
					$('<div class="ktane-highlight-btn column">').data('mode', 'column').css({ right: 115 }).appendTo(document.body);
				}
			}

			$('.ktane-highlight-btn').click(function()
			{
				$('.ktane-highlight-btn').removeClass('selected');
				var newMode = $(this).data('mode');
				if (newMode === mode)
				{
					mode = null;
					return false;
				}

				mode = newMode;
				$(this).addClass('selected');
			});

			mobileControls = true;
		}

		function getMode(event)
		{
			if (mode !== null)
				return mode;

			var ctrl = event.ctrlKey;
			var shift = event.shiftKey;

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
            var a = highlight.data('obj-a'), b = highlight.data('obj-b');
            highlight.outerWidth(a.outerWidth());
            highlight.outerHeight(b.outerHeight());
            highlight.css("left", a.offset().left + "px");
            highlight.css("top", b.offset().top + "px");
            highlight.css("transform-origin", -a.offset().left + "px " + -b.offset().top + "px");
        }

		$("td, th, li, .highlightable").each(function()
		{
			var element = $(this);
			var highlights = [];

			function findHighlight(h)
			{
				for (var i = 0; i < highlights.length; i++)
					if (highlights[i].element === h)
						return i;
				return -1;
			}

			element.click(function(event)
			{
				var thisMode = getMode(event);

				if (enabled && thisMode !== null)
				{
					var ix = -1;
					for (var i = 0; i < highlights.length; i++)
						if (highlights[i].mode === thisMode)
							ix = i;
					if (ix !== -1)
					{
						highlights[ix].element.remove();
						highlights.splice(ix, 1);
					}
					else
					{
						var table = element.parents("table").first();

						var a;
						var b;
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
						else if (thisMode === 'element')
						{
							a = element;
							b = element;
						} else
							return;

						var svg = element.is("svg *");
						var fill;

						var highlight = $("<div>").addClass("ktane-highlight").data('obj-a', a).data('obj-b', b);
                        setPosition(highlight);

						if (svg)
						{
							fill = element.css("fill");
							element.css("fill", "rgba(68, 130, 255, 0.4)");
							highlight.css("background-color", "rgba(0, 0, 0, 0)");
						}

						highlight.click(function(event2)
						{
							var ix2;
							if (enabled && getMode(event2) == thisMode)
							{
								highlight.remove();

								if (svg)
								{
									element.css("fill", fill);
								}

								window.getSelection().removeAllRanges();
								ix2 = findHighlight(highlight);
								if (ix2 !== -1)
									highlights.splice(ix2, 1);
							}
							else
							{
								highlight.hide();
								$(document.elementFromPoint(event2.clientX, event2.clientY)).trigger(event2);
								ix2 = findHighlight(highlight);
								if (ix2 !== -1)
									highlight.show();
							}
							return false;
						});
						highlights.push({ mode: thisMode, element: highlight });

						if (mobileControls)
							highlight.insertAfter($('.ktane-highlight-btn').first());
						else
							highlight.appendTo(document.body);
					}
					window.getSelection().removeAllRanges();
					return false;
				}
			});
		});

        $(window).resize(function() 
        {
            $('.ktane-highlight').each(function(_, e) 
            {
                setPosition($(e));
            });
        });
	});
};
document.head.appendChild(e);