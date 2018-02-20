/*
	MIT License

	Copyright 2018 Timwi

	Permission is hereby granted, free of charge, to any person obtaining a copy of this file (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function()
{
    var hasOnUnloadEvent = false;
    var hasTranslator = false;

    function setTranslator()
    {
        var div = document.createElement('div');
        div.setAttribute('class', 'translating');
        var firstPage = document.querySelector('div.page:first-child');
        firstPage.parentElement.insertBefore(div, firstPage);

        var style = document.createElement('style');
        style.innerText = '.translatable{background-color:hsl(60,80%,80%)}.translatable-mod{background-color:hsl(0,80%,80%)}';
        document.head.appendChild(style);

        var elements = document.querySelectorAll('.translatable,.translatable-mod');
        if (elements.length === 0)
            div.innerHTML = '<p>Unfortunately, this manual has not been made ready for translation yet. Let <em>Timwi#0551</em> on Discord know that you want to translate this and we’ll get right to it!</p>';
        else
        {
            div.innerHTML = '<p><strong><em>Thank you for volunteering to translate this manual!</em></strong><p><ul><li>Click on any highlighted text to change it.</li><li>Text highlighted in red must match exactly the translated text in the module if the module is getting translated as well, or left in English otherwise.</li><li>You MUST save this page when you’re done; closing the tab will lose all of your work if you don’t.</li></ul>';
            for (var i = 0; i < elements.length; i++)
            {
                elements[i].onclick = (function(elem)
                {
                    return function()
                    {
                        var old = elem.getAttribute('data-old');
                        if (old === null)
                        {
                            old = elem.innerHTML.trim();
                            elem.setAttribute('data-old', old);
                        }
                        var newText = prompt(old, elem.innerHTML.trim());
                        if (newText !== null)
                        {
                            elem.innerHTML = newText.trim();
                            if (!hasOnUnloadEvent)
                            {
                                window.addEventListener("beforeunload", function(event)
                                {
                                    var msg = "Did you save the page? Closing this tab will lose all your translation effort. You need to use Ctrl+S to save the page before you close it.";
                                    event.returnValue = msg;
                                    return msg;
                                });
                                hasOnUnloadEvent = true;
                            }
                        }
                    };
                })(elements[i]);
            }
        }
        hasTranslator = true;
    }

    document.addEventListener('keydown', function(event)
    {
        if (event.altKey && event.keyCode === 48 && !hasTranslator)
        {
            setTranslator();
            event.preventDefault();
            return false;
        }
    });
})();
