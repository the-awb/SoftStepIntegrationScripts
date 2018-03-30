/*To put in code
Device.name() // gets the name of the Device
Device (??) void selectInEditor	() //Selects the device in Bitwig Studio.

*/

/*
Prep) Parse Presets in Setlist, Define things to go to script with SoftStepUtil.py. Update script with all Parameters I want to include, providing:
        Channel, CC, Range, Parameter name, Display preferences
1) Define script parameters to be controlled, with relevant preset values
2) Create observers for all parameters to be included in script
3) Create a variable for each parameter to hold an array with the SS value and the current true parameter value
4) Define range of each parameter
5) Define what display values are generated when the parameter value changes based on presets
6) Create function to listen for and handle relevant MIDI messages from SoftStep:
    a. Update CurrentPreset value from midi messages defined in Preset config.
    b. Update parameter modline current value.
    c. Compare with real value.
    d. Generate a DisplayMessage showing whether SoftStepValue is higher or lower than real value [e.g. "vvvv" / "^^^^" ].
    e. Once SoftStepValue has passed through real value, give control to SoftStepValue and generate DisplayMessage.
    showing the current value.
7) Create function to generate and send a DisplayMessage where the associated parameter is being changed externally from SoftStep where:
    a. Parameter is in current Preset and has an LED associated with it's value >> Update LEDs
    b. Parameter is in current Preset, and was last modline changed on SoftStep (in focus) and has a DispalyMessage defined
    c. Flush LEDs for new Preset when Preset is changed

 */


// ---- Adapt this to create ValueObservers

// A function to create an indexed function for the Observers
function getValueObserverFunc(index, varToStore) {
    return function(value) {
        varToStore[index] = value;
    }
}
var ccValue = initArray(0, ((HIGHEST_CC - LOWEST_CC + 1)*16)); // Note sure about initArray() syntax...
var ccValueSoftStep = initArray(0, ((HIGHEST_CC - LOWEST_CC + 1)*16));
/// ***Part of init() functioin
// Make CCs 1-119 freely mappable for all 16 Channels
userControls = host.createUserControls((HIGHEST_CC - LOWEST_CC + 1)*16);

for(var i = LOWEST_CC; i <= HIGHEST_CC; i++) {
    for (var j = 1; j <= 16; j++) {
        // Create the index variable c
        var c = i - LOWEST_CC + (j - 1) * (HIGHEST_CC-LOWEST_CC + 1);
        // Set a label/name for each userControl
        userControls.getControl(c).setLabel("CC " + i + " - Channel " + j);
        // Add a ValueObserver for each userControl
        userControls.getControl(c).value().addValueObserver(127, getValueObserverFunc(c, ccValue));
    }
}



// --- Adapt this bit of code so that the script gives control once the SS value passes through the current value

// Update the UserControlls when Midi Data is received
function onMidi(status, data1, data2) {
    //printMidi(status, data1, data2);

    if (isChannelController(status)) {
        if (data1 >= LOWEST_CC && data1 <= HIGHEST_CC) {
            var index = data1 - LOWEST_CC + ((HIGHEST_CC-LOWEST_CC+1) * MIDIChannel(status));
            userControls.getControl(index).set(data2, 128);
        }
    }
}

// --- Adapt this to send the require display messages in place of the actual CC values


// Updates the controller in an orderly manner when needed
// so that LEDs, Motors etc. react to changes in the Software
// without drowning the Controller with data
function flush() {
    for(var i=LOWEST_CC; i<=HIGHEST_CC; i++) {
        for (var j=1; j<=16; j++) {
            var c = i - LOWEST_CC + (j-1) * (HIGHEST_CC-LOWEST_CC+1);
            // Check if something has changed
            if (ccValue[c] != ccValueOld[c]) {
                // If yes, send the updated value
                sendChannelController(j-1, i, ccValue[c]);
                // And update the value for the next check
                ccValueOld[c] = ccValue[c];
            }
        }
    }