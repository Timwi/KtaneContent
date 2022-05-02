/* Library for common math utilities. */

/**
 * Find n mod d, with negative numerators also returning positive results, -1 % 5 = 4.
 * @param {int} n - Numerator.
 * @param {int} d - Divisor.
 * @returns {int} n mod d, unsigned.
 */
function UMod(n, d) {
    let div = Math.abs(d);
    return n - div * Math.floor(n / div);
}