function changeFlavorTexts(languageCode){
    let flavorTexts;

    switch (languageCode){
        case "ENG":
            flavorTexts = [
                'I am the boss!',
                'Hope you don’t mind, but could you tell me-- WHERE THE HELL IS THE BOSS?!?!',
                'What had to be done was done, but... what hadn’t been done was done too. And now that it is done, it may be done again... ...done done done.',
                'I turned down another job opportunity to be here...',
                'I am so ready to cruise and party responsibly in every illegal way!',
                'L-listen to me! Regrettably, I’m v-very hard-working and sh-shouldn’t be in a place full of morons having FUN.',
                'GUYS, GUYS-WAIT! I’M NOT DOING WHAT YOU SAY I’M DOING! I’M NOT DOING ANYTHING! I’M NOT DOING ANYTHING AT ALL!',
                'May I offer you a divestment opportunity?',
                'Let me ask you: what if I offer you something that could change your life forever?',
                'If you know an entity, fax me a blood sample immediately!',
                'May the G0DS forgive me for what I’m about to do.',
                'Do you even know the ingredients of that word salad?',
                '"All it takes is a place and the right food."',
                'Time to get to work!',
                'Hey pal! My sympathy is gonna cost you for every condolence.',
                'It’s more of a lifestyle. That’s my destiny. What more could I do? G0D knows the rest.',
                'Are you poor with words or what?! Let’s TALK, YOU CHEAP ASSISTANT!',
                'Bless you for your business.',
                'Hah! Boss of what? Hogwash?',
                'Hey... Quit being so unprofessional, people will get the wrong idea!',
                'FOLLOW THE WHISTLE AND LET YOURSELF GO.',
                'I AM DRATULA!',
                'VHAT?!! DID YOU CALL ME A STINKY PENGVIN?!!',
                'I don care! I DON CARE!!! >:OO GO AWAY!!!',
                'The civil authorities got bored and left. And, as my hole in the ground was disappearing, I found I had to leave too. I am here now on this large object. It may be huge and empty and grey and there may be nothing interesting in the sky or on the ground and nobody to talk to and I may never be able to leave here for thousands of years. But at least I’m not in prison.'
            ];
            break;
    }

    document.querySelector('.flavour-text').innerHTML = flavorTexts[(Math.random() * flavorTexts.length) | 0];
}