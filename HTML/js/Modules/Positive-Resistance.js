const diagram = document.querySelector(".diagram"),
    flavourText = document.querySelector(".flavour-text"),
    content = document.querySelector(".page-content");

let presses = 0;

const getFlavourText = () => {
    switch (presses) {
        case 6: return "Stop! What are you doing?!";
        case 15: return "<strong>STOP! PLEASE!</strong>";
        case 30: return "What have you done?";
    }
};

diagram.addEventListener("click", () => {
    presses++;
    const text = getFlavourText();
    if (text) flavourText.innerHTML = text;
    if (presses === 30) content.classList.add("reveal");
});