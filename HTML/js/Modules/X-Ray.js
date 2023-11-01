function setDefaultRules(rnd)
{
    var convert = "a1,a1 flipped,b1,b1 flipped,c1,c1 flipped,d1,d1 flipped,e1,e1 flipped,h2 flipped,h2,d7,j1,h6,g1,a6,a2,k2,h1,a7,e2,d6,b3,a10,b10,c10,d10,e10,f10,i10,h9,i9".split(',');

    var list1 = Array.from(document.querySelectorAll('.xray-table-1 td>.icon'));
    for (var i = 0; i < 9; i++)
        list1[i].className = 'icon ' + convert[i + 24];

    var list2 = Array.from(document.querySelectorAll('.xray-table-2 th>.icon'));
    for (var i = 0; i < 24; i++)
        list2[i].className = 'icon ' + convert[i];

    generateGrid(rnd);
}

function numbers(n)
{
    var arr = [];
    for (var i = 0; i < n; i++)
        arr.push(i);
    return arr;
}

function setRules(rnd)
{
    // Decide on the icons for the 3×3 table up top
    var smallTable = rnd.shuffleFisherYates(numbers(22)).slice(0, 9).map(x => ({ icon: x + 88, flipped: false }));

    // For the rows, we can use any non-symmetric icon
    var rows = rnd.shuffleFisherYates(numbers(88)).slice(0, 12).map(x => ({ icon: x, flipped: x < 55 ? rnd.next(0, 2) != 0 : false }));

    // For the columns, we can only use flippable icons that we haven’t already used for rows
    var columnsRaw = rnd.shuffleFisherYates(numbers(55).filter(x => rows.filter(r => r.icon === x).length === 0));
    var columns = [];
    for (var i = 0; i < 6; i++)
    {
        var f = rnd.next(0, 2);
        columns.push({ icon: columnsRaw[i], flipped: f === 0 });
        columns.push({ icon: columnsRaw[i], flipped: f === 1 });
    }

    var list1 = Array.from(document.querySelectorAll('.xray-table-1 td>.icon'));
    var list2 = Array.from(document.querySelectorAll('.xray-table-2 th>.icon'));

    function convert(icon)
    {
        return String.fromCharCode(97 + (icon.icon % 11)) + (Math.floor(icon.icon / 11) + 1) + (icon.flipped ? ' flipped' : '');
    }

    for (var i = 0; i < 9; i++)
        list1[i].className = 'icon ' + convert(smallTable[i]);
    for (var i = 0; i < 24; i++)
        list2[i].className = 'icon ' + convert(i < 12 ? columns[i] : rows[i-12]);
    generateGrid(rnd);
}

function generateGrid(rnd)
{
    var list = Array.from(document.querySelectorAll('.xray-table-2 td:not(.corner)'));
    var grid = [];
    for (var i = 0; i < 144; i++)
    {
        var nmbrs = [];
        var x = i % 12;
        var y = (i / 12) | 0;
        for (var j = 0; j < 5; j++)
            if ((x == 0 || j != grid[i - 1]) &&
                (y == 0 || j != grid[i - 12]) &&
                (x == 0 || y == 0 || j != grid[i - 13]))
                nmbrs.push(j);
        var n = nmbrs[rnd.next(0, nmbrs.length)];
        grid.push(n);
        list[i].innerText = n + 1;
    }
}