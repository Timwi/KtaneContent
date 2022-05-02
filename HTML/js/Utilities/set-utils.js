/* Library for common set manipulation utilities.
 * Code based on Ut.cs from github.com/Timwi
 */

/**
 * Given a set of values and a function that returns true when given this set, will efficiently remove items from
 *  this set which are not essential for making the function return true. The relative order of items is
 *  preserved. This method cannot generally guarantee that the result is optimal, but for some types of functions
 *  the result will be guaranteed optimal.
 * @param {Array} items - The set of items to reduce.
 * @param {Function} test - The function that examines the set. Must always return the same value for the same set.
 * @param {boolean} breadthFirst - A value selecting a breadth-first or a depth-first approach. Depth-first is best at quickly locating a single
 *  value which will be present in the final required set. Breadth-first is best at quickly placing a lower bound
 *  on the total number of individual items in the required set.
 * @returns {Function} A hopefully smaller set of values that still causes the function to return true.
 */
function ReduceRequiredSet(items, test, breadthFirst = false)
{
    var state = new ReduceRequiredSetState(items);

    while (state.AnyPartitions)
    {
        let rangeToSplit = breadthFirst ? state.LargestRange : state.SmallestRange;
        let mid = Math.floor((rangeToSplit.Item1 + rangeToSplit.Item2) / 2);
        let split1 = new InclusiveRange(rangeToSplit.Item1, mid);
        let split2 = new InclusiveRange(mid + 1, rangeToSplit.Item2);

        state.ApplyTemporarySplit(rangeToSplit, split1);
        if (test(state))
        {
            state.RemoveRange(rangeToSplit);
            state.AddRange(split1);
            continue;
        }
        state.ApplyTemporarySplit(rangeToSplit, split2);
        if (test(state))
        {
            state.RemoveRange(rangeToSplit);
            state.AddRange(split2);
            continue;
        }
        state.ResetTemporarySplit();
        state.RemoveRange(rangeToSplit);
        state.AddRange(split1);
        state.AddRange(split2);
    }

    state.ResetTemporarySplit();
    return state.SetToTest;
}

/**
 * Encapsulates the state of the {@link ReduceRequiredSet} algorithm and exposes statistics about it.
 * @class
 */
class ReduceRequiredSetState
{
    //protected List<T> Items;
    //protected List<Range> this.Ranges;
    //protected Range ExcludedRange, IncludedRange;

    /**
     * @constructs
     */
    constructor(items) {
        this.Items = items;
        this.Ranges = [];
        this.Ranges.push(new InclusiveRange(0, this.Items.length - 1));
    }

    _MaxElement(arr, func) {
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

    _MinElement(arr, func) {
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

    /**
     * Enumerates every item that is known to be in the final required set. "Definitely" doesn't mean that there
     *  exists no subset resulting in "true" without these members. Rather, it means that the algorithm will
     *  definitely return these values, and maybe some others too.
     */
    get DefinitelyRequired() { return this.Ranges.filter(r => r.Item1 == r.Item2).map(r => this.Items[r.Item1]); }
    /**
     * Gets the current number of partitions containing uncertain items. The more of these, the slower the
     *  algorithm will converge from here onwards.
     */
    get PartitionsCount() { return this.Ranges.length - this.Ranges.filter(r => r.Item1 == r.Item2).length; }
    /**
     * Gets the number of items in the smallest partition. This is the value that is halved upon a successful
     *  depth-first iteration.
     */
    get SmallestPartitionSize() { return Math.min(this.Ranges.filter(r => r.Item1 != r.Item2).map(r => r.Item2 - r.Item1 + 1)); }
    /**
     * Gets the number of items in the largest partition. This is the value that is halved upon a successful
     *  breadth-first iteration.
     */
    get LargestPartitionSize() { return Math.max(this.Ranges.map(r => r.Item2 - r.Item1 + 1)); }
    /**
     * Gets the total number of items about which the algorithm is currently undecided.
     */
    get ItemsRemaining() { return this.Ranges.filter(r => r.Item1 != r.Item2).map(r => r.Item2 - r.Item1 + 1).reduce((a,b) => a + b, 0); }
    /**
     * Gets the set of items for which the function should be evaluated in the current step.
     */
    get SetToTest() {
        let ranges = Array(this.Ranges.length);
        Object.assign(ranges, this.Ranges);
        if (this.ExcludedRange) {
            let ex = this.ExcludedRange;
            ranges = ranges.filter(r => !r.Equals(ex));
        }
        if (this.IncludedRange) {
            let inc = this.IncludedRange;
            ranges = ranges.concat(inc);
        }
        let a = [];
        ranges.forEach((r, i) => { a = a.concat(r.Enumerate()); });
        a.sort(function(a, b) {
            return a - b;
        });
        let b = a.map(i => this.Items[i]);
        return b;
    }

    /**
     * @todo doc
     */
    get AnyPartitions() { return this.Ranges.some(r => r.Item1 != r.Item2); }
    /**
     * @todo doc
     */
    get LargestRange() { return this._MaxElement(this.Ranges, t => t.Item2 - t.Item1); }
    /**
     * @todo doc
     */
    get SmallestRange() { return this._MinElement(this.Ranges.filter(r => r.Item1 != r.Item2), t => t.Item2 - t.Item1); }

    /**
     * @todo doc
     */
    AddRange(range) { this.Ranges.push(range); }
    /**
     * @todo doc
     */
    RemoveRange(range) {
        let i = this.Ranges.findIndex(r => r.Equals(range));
        if (i >= 0)
            this.Ranges.splice(i, 1);
    }

    /**
     * @todo doc
     */
    ResetTemporarySplit()
    {
        this.ExcludedRange = this.IncludedRange = null;
    }
    /**
     * @todo doc
     */
    ApplyTemporarySplit(rangeToSplit, splitRange)
    {
        this.ExcludedRange = rangeToSplit;
        this.IncludedRange = splitRange;
    }
}

/**
 * Class for keeping track of a range of integers from item1 to item2
 * @class
 */
class InclusiveRange
{
    /**
     * @constructs
     */
    constructor(item1, item2) {
        this.Item1 = item1;
        this.Item2 = item2;
    }

    /**
     * Compares an object with this {@link InclusiveRange} instance.
     * @param {object} obj - The object to be compared.
     * @returns {boolean} Whether the object is equal or not.
     */
    Equals(obj)
    {
        return obj != null && obj.Item1 == this.Item1 && obj.Item2 == this.Item2;
    }

    /**
     * Make array of every integer in the range.
     * @returns Array representing the range.
     */
    Enumerate()
    {
        let start = this.Item1;
        return [...Array(this.Item2 - this.Item1 + 1).keys()].map(x => x + start)
    }
}

/**
 * Class for keeping track of a range of integers from a start value and count of how many integers it represents
 * @class
 */
class CtRange
{
    /**
     * @constructs
     */
    constructor(start, count) {
        this.Start = start;
        this.Count = count;
    }

    /**
     * Compares an object with this {@link Range} instance.
     * @param {object} obj - The object to be compared.
     * @returns {boolean} Whether the object is equal or not.
     */
    Equals(obj)
    {
        return obj != null && obj.Start == this.Start && obj.Count == this.Count;
    }

    /**
     * Make array of every integer in the range.
     * @returns Array representing the range.
     */
    Enumerate()
    {
        let start = this.Start;
        return [...Array(this.Count).keys()].map(x => x + start)
    }
}