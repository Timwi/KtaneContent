class MonoRandom
{
    // Initializes a new instance of the class using the specified seed value.
    constructor(seed)
    {
        this.seed = seed;
        this.count = 0;
        this._seedArray = new Array(56);
        for (var i = 0; i < 56; i++)
            this._seedArray[i] = 0;
        var num = ((161803398 - (Math.abs(seed))) | 0);
        this._seedArray[55] = num;
        var num2 = 1;

        for (var i = 1; i < 55; i = ((i + 1) | 0))
        {
            var num3 = ((Math.imul(21, i) % 55) | 0);
            this._seedArray[num3] = num2;
            num2 = ((num - num2) | 0);
            if (num2 < 0)
                num2 = ((num2 + 2147483647) | 0);
            num = (this._seedArray[num3] | 0);
        }

        for (var j = 1; j < 5; j = ((j + 1) | 0))
        {
            for (var k = 1; k < 56; k = ((k + 1) | 0))
            {
                this._seedArray[k] = (((this._seedArray[k] | 0) - (this._seedArray[((1 + ((((k + 30) | 0) % 55) | 0)) | 0)] | 0)) | 0);
                if ((this._seedArray[k] | 0) < 0)
                    this._seedArray[k] = (((this._seedArray[k] | 0) + 2147483647) | 0);
            }
        }
        this._inext = 0;
        this._inextp = 31;
    }

    // Returns a random number between 0.0 and 1.0.
    nextDouble(logging)
    {
        this.count++;
        if (((++this._inext) | 0) >= (56 | 0))
            this._inext = 1 | 0;
        if (((++this._inextp) | 0) >= (56 | 0))
            this._inextp = 1 | 0;
        var num = ((this._seedArray[this._inext | 0] | 0) - (this._seedArray[this._inextp | 0] | 0)) | 0;
        if ((num | 0) < 0)
            num = ((num | 0) + 2147483647) | 0;
        this._seedArray[this._inext | 0] = num | 0;
        var result = +(num * 4.6566128752457969E-10);
        if (logging)
            console.log(`rnd.nextDouble() = ${result}`);
        return result;
    }

    // Returns a non-negative random integer.
    nextInt()
    {
        return ((+this.nextDouble() * 2147483647) | 0);
    }

    // Returns a non-negative random integer less than the specified maximum.
    nextMax(maxValue)
    {
        return ((+this.nextDouble() * +maxValue) | 0);
    }

    // Returns a random integer within the specified range (minValue is inclusive, maxValue is exclusive).
    next(minValue, maxValue, logging)
    {
        var result;
        if (maxValue - minValue <= 1)
            result = minValue;
        else
            result = this.nextMax(maxValue - minValue) + minValue;
        if (logging)
            console.log(`rnd.next(${minValue}, ${maxValue}) = ${result}`);
        return result;
    }

    // Brings an array into random order.
    // This method is equivalent to doing .OrderBy(x => rnd.NextDouble()) in C#.
    // Returns a new array and leaves the original array unmodified.
    shuffleArray(arr)
    {
        var sortArr = new Array(arr.length);
        for (var i = 0; i < arr.length; i++)
            sortArr[i] = { r: this.nextDouble(), v: arr[i] };
        sortArr.sort((a, b) => a.r - b.r);
        return sortArr.map(x => x.v);
    }

    // Brings an array into random order using the Fisher-Yates shuffle.
    // This is an inplace algorithm, i.e. the input array is modified.
    shuffleFisherYates(list)
    {
        var i = list.length;
        while (i > 1)
        {
            var index = this.next(0, i);
            i--;
            var value = list[index];
            list[index] = list[i];
            list[i] = value;
        }
        return list;
    }
}

const names = {};

function ruleseedInvokeSetRules()
{
	let sectionElements = Array.from(document.getElementsByClassName('page-header-section-title'));
	// Checking if the names object has a length of 0 so that we don't initialize it twice.
	if(Object.entries(names).length === 0) {
		let i = 0;
		// Stores the headers by the id indency.
		sectionElements.forEach(x => {
			names[i] = x.innerText;
			x.setAttribute('name-id', i);
			i++;
		});
	}
	
	// Whether the URL contains a seed.
    if (/^#(\d+)$/.exec(window.location.hash) && (RegExp.$1 | 0) !== 1)
    {
        var seed = RegExp.$1 | 0;
        document.body.classList.add('ruleseed-active');
        Array.from(document.getElementsByClassName('ruleseed-header')).forEach(x => { x.innerText = 'RULE SEED: ' + seed });
		
		// Iterate over each page header section title element, add the 'ruleseed-seeded' class, get the actual section title by using the custom 'name-id' attribute and appending the rule seed value.
        sectionElements.forEach(x => { 
			x.classList.add('ruleseed-seeded'); 
			x.innerText = names[x.getAttribute('name-id')] + ' — rule seed: ' + seed; 
		});
        setRules(new MonoRandom(seed));
    }
    else
    {
        document.body.classList.remove('ruleseed-active');
        sectionElements.forEach(x => { 
			x.classList.remove('ruleseed-seeded'); 
			x.innerText = names[x.getAttribute('name-id')];
		});
        setDefaultRules(new MonoRandom(1));
    }
}

document.addEventListener("DOMContentLoaded", function()
{
    Array.from(document.getElementsByClassName('section')).forEach(x =>
    {
        var div = document.createElement('div');
        div.className = 'ruleseed-header';
        x.insertBefore(div, x.firstChild);

        div = document.createElement('div');
        div.className = 'ruleseed-header';
        x.insertBefore(div, null);
    });
    ruleseedInvokeSetRules();
});

window.onhashchange = ruleseedInvokeSetRules;
