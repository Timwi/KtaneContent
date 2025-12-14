function changeFlavorTexts(languageCode) {
    let flavorTexts;

    switch (languageCode) {
        case "ENG":
            flavorTexts = [
              'Who would’ve thought a ghost would possess an machine from the 80’s?',
              'This ain’t your ordinary terminal computer...',
              'HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME HELP ME',
              'I could see why nobody dares to buy strange computers from eBay anymore.',
              '49 20 43 41 4E 20 53 45 45 20 59 4F 55',
              'I wonder why nobody knows about this.',
              'If the terminal is in good condition, then why is it-- Oh.',
              'GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT GET ME OUT',
              'Every copy of the operating system is personalized.',
              'NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT NO TIME LEFT'
            ];
            break;
    }

    document.querySelector('.flavour-text').innerHTML = flavorTexts[(Math.random() * flavorTexts.length) | 0];
}