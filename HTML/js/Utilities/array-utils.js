/* Library for array manipulation utilities. */

/**
 * Shuffle an array in place using the Fisher-Yates method.
 * @param {array} list - Array to be shuffled.
 * @returns {array} Another reference to the shuffled array.
 */
function ShuffleFisherYates(list)
{
    var i = list.length;
    while (i > 1)
    {
        var index = Math.floor(Math.random() * i);
        i--;
        var value = list[index];
        list[index] = list[i];
        list[i] = value;
    }
    return list;
}

/**
 * Apply mapping function to array and find element in original array that corresponds to the maximum in the transformed array.
 * @param {Array} arr - Array to apply transform to.
 * @param {Function} func - Mapping function to apply to array.
 * @returns Element that caused the maximum, or null if arr is invalid.
 */
function MaxElement(arr, func) {
    if (arr && arr.length > 0) {
        let max = arr[0];
        let mapped = arr.map(func);
        let maxV = mapped[0];
        for (let i = 1; i < arr.length; i++) {
            if (mapped[i] > maxV) {
                maxV = mapped[i];
                max = arr[i];
            }
        }
        return max;
    }
    return null;
}

/**
 * Apply mapping function to array and find element in original array that corresponds to the minimum in the transformed array.
 * @param {Array} arr - Array to apply transform to.
 * @param {Function} func - Mapping function to apply to array.
 * @returns Element that caused the minimum, or null if arr is invalid.
 */
function MinElement(arr, func) {
    if (arr && arr.length > 0) {
        let min = arr[0];
        let mapped = arr.map(func);
        let minV = mapped[0];
        for (let i = 1; i < arr.length; i++) {
            if (mapped[i] < minV) {
                minV = mapped[i];
                min = arr[i];
            }
        }
        return min;
    }
    return null;
}

// usage: array.filter(FilterOnlyUnique);
function FilterOnlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}
