/// Code based on Ut.cs from github.com/Timwi

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

/// <summary>
///     Given a set of values and a function that returns true when given this set, will efficiently remove items from
///     this set which are not essential for making the function return true. The relative order of items is
///     preserved. This method cannot generally guarantee that the result is optimal, but for some types of functions
///     the result will be guaranteed optimal.</summary>
/// <param name="items">
///     The set of items to reduce.</param>
/// <param name="test">
///     The function that examines the set. Must always return the same value for the same set.</param>
/// <param name="breadthFirst">
///     A value selecting a breadth-first or a depth-first approach. Depth-first is best at quickly locating a single
///     value which will be present in the final required set. Breadth-first is best at quickly placing a lower bound
///     on the total number of individual items in the required set.</param>
/// <returns>
///     A hopefully smaller set of values that still causes the function to return true.</returns>
// IEnumerable<T> items, Func<ReduceRequiredSetState, bool> test, bool breadthFirst = false
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


/// <summary>
///     Encapsulates the state of the <see cref="Ut.ReduceRequiredSet"/> algorithm and exposes statistics about it.</summary>
class ReduceRequiredSetState
{
    //protected List<Range> this.Ranges;
    //protected List<T> Items;
    //protected Range ExcludedRange, IncludedRange;

    constructor(items) {
        this.Items = items;
        this.Ranges = [];
        this.Ranges.push(new InclusiveRange(0, this.Items.length - 1));
    }

    /// <summary>
    ///     Enumerates every item that is known to be in the final required set. "Definitely" doesn't mean that there
    ///     exists no subset resulting in "true" without these members. Rather, it means that the algorithm will
    ///     definitely return these values, and maybe some others too.</summary>
    get DefinitelyRequired() { return this.Ranges.filter(r => r.Item1 == r.Item2).map(r => this.Items[r.Item1]); }
    /// <summary>
    ///     Gets the current number of partitions containing uncertain items. The more of these, the slower the
    ///     algorithm will converge from here onwards.</summary>
    get PartitionsCount() { return this.Ranges.length - this.Ranges.filter(r => r.Item1 == r.Item2).length; }
    /// <summary>
    ///     Gets the number of items in the smallest partition. This is the value that is halved upon a successful
    ///     depth-first iteration.</summary>
    get SmallestPartitionSize() { return Math.min(this.Ranges.filter(r => r.Item1 != r.Item2).map(r => r.Item2 - r.Item1 + 1)); }
    /// <summary>
    ///     Gets the number of items in the largest partition. This is the value that is halved upon a successful
    ///     breadth-first iteration.</summary>
    get LargestPartitionSize() { return Math.max(this.Ranges.map(r => r.Item2 - r.Item1 + 1)); }
    /// <summary>Gets the total number of items about which the algorithm is currently undecided.</summary>
    get ItemsRemaining() { return this.Ranges.filter(r => r.Item1 != r.Item2).map(r => r.Item2 - r.Item1 + 1).reduce((a,b) => a + b, 0); }

    /// <summary>Gets the set of items for which the function should be evaluated in the current step.</summary>
    //IEnumerable<T> SetToTest
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

    get AnyPartitions() { return this.Ranges.some(r => r.Item1 != r.Item2); }
    get LargestRange() { return MaxElement(this.Ranges, t => t.Item2 - t.Item1); }
    get SmallestRange() { return MinElement(this.Ranges.filter(r => r.Item1 != r.Item2), t => t.Item2 - t.Item1); }

    AddRange(range) { this.Ranges.push(range); }
    RemoveRange(range) {
        let i = this.Ranges.findIndex(r => r.Equals(range));
        if (i >= 0)
            this.Ranges.splice(i, 1);
    }

    ResetTemporarySplit()
    {
        this.ExcludedRange = this.IncludedRange = null;
    }
    ApplyTemporarySplit(rangeToSplit, splitRange)
    {
        this.ExcludedRange = rangeToSplit;
        this.IncludedRange = splitRange;
    }
}

class InclusiveRange
{
    constructor(item1, item2) {
        this.Item1 = item1;
        this.Item2 = item2;
    }

    Equals(obj)
    {
        return obj != null && obj.Item1 == this.Item1 && obj.Item2 == this.Item2;
    }

    Enumerate()
    {
        let start = this.Item1;
        return [...Array(this.Item2 - this.Item1 + 1).keys()].map(x => x + start)
    }
}

class Range
{
    constructor(start, count) {
        this.Start = start;
        this.Count = count;
    }

    Equals(obj)
    {
        return obj != null && obj.Start == this.Start && obj.Count == this.Count;
    }

    Enumerate()
    {
        let start = this.Start;
        return [...Array(this.Count).keys()].map(x => x + start)
    }
}