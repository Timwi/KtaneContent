/* Library for common user interface utilities. */

/**
 * Setup a function to repeatedly call when holding down a button or object.
 * @param {Any} btn - Object to be held down with mouse cursor.
 * @param {function} func - Functon to repeatedly call while holding the button.
 * @param {int} startTime - Starting milliseconds, before acceleration, between repeats.
 * @param {float} speedup - Rate of acceleration, divides the delay between repeats.
 * @param {int} min - Minimum milliseconds between repeats to accelerate to.
 */
function WhenHoldDown(btn, func, startTime, speedup = 1.2, min = 10) {
    let tm;
    let s = startTime;
    let repeat = function () {
        func();
        tm = setTimeout(repeat, s);
        s = Math.max(s / speedup, min);
    };
    function clearTheRepeat() {
        clearTimeout(tm);
        s = startTime;
    }

    btn.onmousedown = function () { repeat(); };
    btn.onmouseup = function () { clearTheRepeat(); };
    btn.onmouseleave = function () { clearTheRepeat(); };
}

/**
 * Requires jquery. Check that interaction event included none of shift, ctrl, alt, or cmd.
 * @param {event} event - Event object from click or keydown function.
 * @returns {Boolean} No special keys are pressed.
 */
function NoSpecialKeys(event) {
    return !(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey);
}

/**
 * Checks if string represents a single letter A-Z or a-z.
 * @param {String} str - String to check.
 * @returns {Boolean} True if string represents a single letter.
 */
function IsLetter(str) {
    return str.length === 1 && str.match(/[a-z]/i);;
}

function getHighlighterMode(event) {
    let ctrl = event.ctrlKey;
    let shift = event.shiftKey;

    if (event.altKey && !ctrl && !shift) {
        ctrl = true;
        shift = true;
    }

    if (event.metaKey)
        ctrl = true;

    return ((ctrl && !shift) ? 'column' : (shift && !ctrl) ? 'row' : (shift && ctrl) ? 'element' : null);
}
