        let face = document.getElementById("face");
        let presses = 0;
        updateVisuals();

        face.onclick = () => {
            presses++;
            updateVisuals();
        };
        function updateVisuals() {
            if (presses < 6){
                document.getElementById("proper").hidden = true;
                document.getElementById("init").hidden = false;
            }
            else if (presses < 15){
                document.getElementById("flavour-text").innerHTML = "Stop! What are you doing?!";
            }
            else if (presses < 30){
                document.getElementById("flavour-text").innerHTML = "<strong>STOP! PLEASE!</strong>";
            }
            else{
                document.getElementById("flavour-text").innerHTML = "What have you done?";
                document.getElementById("proper").hidden = false;
                document.getElementById("init").hidden = true;
            }
            //document.getElementById("flavour-text").innerHTML = `${presses == 0 ? "" : ` You pressed SVG ${presses} time${presses == 1 ? "" : "s"}.`}`;
        }