// Do NOT modify nor translate those words in any way, or the audio files will break
const drumNames = ["Aura", "DontThinkNow", "Enucleation", "Goodbye", "Hurricane", "Scatter", "Sepia"];
const bassNames = ["BehindLateAndWorseOff", "DivineRiot", "Genius", "HeroicRiot", "Mirxen", "PipeMaze", "Sepia"];
const chordsNames = ["Blizzard", "FogEmeraldMoon", "Genius", "MovingForward", "MovingForward2", "Scatter", "Spirals"];
const leadNames = ["CloudRuin", "CloudRuin2", "FogEmeraldMoon", "Harmonies", "HeroicRiot", "MovingForward", "PipeMaze"];

// Those are used on the module, so it is also non recommended to translate them
const prefixes = ["Cyber", "Hyper-", "Hard", "Deep", "Bit-", "Hi-", "Drum", "Flash", "Auto", "Über", "Neo", "Off-", "Drop", "Lo-", "99-" ,"Speed", "Break", "Jump", "Acid", "Retro", "Sun-", "Ink-", "Micro", "Out", "Mix-", "Big", "Tera", "Self-", "Oily", "Primal"];
const adjectives = ["Electro", "Rush", "Colour", "Pop", "Funk", "Sonic", "Show", "Synk", "Delta", "Simon", "Cortex", "30k", "Heart", "Liquid", "Progressive", "Duster", "Wave", "Sound", "Soul", "Concrete", "Room", "Urban", "Indie", "Tune", "Blast", "Screen", "Chaos", "Thunder", "Frost", "Plasma"];
const styles = ["Bass", "Trance", "House", "Dance", "Fusion", "Symptom", "Spin", "& Crash", "Pulse", "Cipher", "Stack", "Dash", "Whiplash", "Murder", "Craftstep", "Trap", "Pride", "Beats", "Swing", "Pop", "Key", "Slab", "Burst", "Synchro", "Shot", "Forest", "Burn", "Cry", "Slap", "Drift"];

var selectedDrums;
var selectedBasses;
var selectedChords;
var selectedLeads;

var selectedPrefixes;
var selectedAdjectives;
var selectedStyles;

function setRules(rnd){
    // Slice to make a copy and not shuffle the original array, then shuffle, then slice again to take only the first 5 elements
    selectedDrums = rnd.shuffleFisherYates(drumNames.slice()).slice(0,5);
    selectedBasses = rnd.shuffleFisherYates(bassNames.slice()).slice(0,5);
    selectedChords = rnd.shuffleFisherYates(chordsNames.slice()).slice(0,5);
    selectedLeads = rnd.shuffleFisherYates(leadNames.slice()).slice(0,5);

    selectedPrefixes = rnd.shuffleFisherYates(prefixes.slice()).slice(0,25);
    selectedAdjectives = rnd.shuffleFisherYates(adjectives.slice()).slice(0,25);
    selectedStyles = rnd.shuffleFisherYates(styles.slice()).slice(0,25);

    setSounds(rnd.seed);
}

function setDefaultRules(){
    selectedDrums = ["Hurricane", "DontThinkNow", "Sepia", "Aura", "Goodbye"];
    selectedBasses = ["Sepia", "Genius", "PipeMaze", "BehindLateAndWorseOff", "Mirxen"];
    selectedChords = ["Scatter", "Genius", "FogEmeraldMoon", "MovingForward", "MovingForward2"];
    selectedLeads = ["CloudRuin2", "HeroicRiot", "MovingForward", "Harmonies", "PipeMaze"];
    selectedPrefixes = prefixes;
    selectedAdjectives = adjectives;
    selectedStyles = styles;
    setSounds(1);
}

function setSounds(ruleseedNumber){
    const Instruments = ["Drums", "Bass", "Chords", "Lead"];
    const InstrumentsSelection = [selectedDrums, selectedBasses, selectedChords, selectedLeads];
    for (var o = 0; o < 4; o ++){
        console.log("Selected " + Instruments[o] + " for Ruleseed " + ruleseedNumber + " are: " + InstrumentsSelection[o].join(" // "));
        var buttons = document.querySelectorAll(`.${Instruments[o]}`);
        for (var i = 0; i < 5; i ++){
            var parentTd = buttons[i].parentNode;
            const button = $(buttons[i]);

            // remove previously created audio on ruleseed change
            if (parentTd.children[0].localName == "audio"){
                parentTd.removeChild(parentTd.children[0]);
            }

            const createdAudio = $(document.createElement("audio"))
                .on("ended", function() {button.removeClass("playing");})
                .attr("src", "audio/Genre Divination/" + Instruments[o] + "_" + InstrumentsSelection[o][i] + ".mp3")
                .on("error", function() {button.addClass("failed");})
                .prop("volume", 0.3)
                .prependTo(parentTd);

            button.off("click"); // remove previously attached event on ruleseed change
            button.click(function() {
                if (button.hasClass("playing")) {
                    button.removeClass("playing");
                    createdAudio[0].pause();
                    createdAudio[0].currentTime = 0;
                } else {
                    button.addClass("playing");
                    createdAudio[0].play();
                }
                return false;
            });
        }
    }

    const PartsSelection = [selectedPrefixes, selectedAdjectives, selectedStyles];

    for (var o = 0; o < 3; o ++){
        const cells = document.querySelectorAll(`.genre-table td:nth-last-child(3n-${o})`);
        for (var i = 0; i < 25; i ++){
            cells[i].innerText = PartsSelection[o][i];
        }
    }
}