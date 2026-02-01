const diagram = document.querySelector(".diagram"),
    flavourText = document.querySelector(".flavour-text"),
    content = document.querySelector(".page-content");

let presses = 0;

const getFlavourText = () => {
    switch (presses) {
        case 2: return "Stop! What are you doing?!";
        case 4: return "<strong>STOP! PLEASE!</strong>";
        case 6: return "What have you done?";
    }
};

diagram.addEventListener("click", () => {
    presses++;

    // only set the text if we've hit the exact value of
    // `presses` required to trigger it
    // otherwise, we would be setting innerHTML on every
    // click regardless of whether the text is actually
    // changing, which is just a lot of unnecessary DOM
    // updates
    const text = getFlavourText();
    if (text) flavourText.innerHTML = text;

    if (presses === 6) content.classList.add("reveal");
});