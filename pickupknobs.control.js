// See documentation and latest code on http://github.com/phaethon/bitwig-pickup-controller
//


loadAPI(1);

host.defineController("Generic", "Pickup Knobs", "1.0", "1965a650-634a-11e5-a837-0800201c9a66");

host.defineMidiPorts(1, 1); //Defines the number of MIDI ports for
// input and output that the device uses.
// After calling this method the individual port objects can be accessed
// using getMidiInPort(int index) and getMidiInPort(int index).

var ROT_LOW = 32;
var ROT_HIGH = 39;

var MODENAMES = [ "Macro", "Common", "Envelope", "Parameter" ];
var MODE_MACRO = 0;
var MODE_COMMON = 1;
var MODE_ENVELOPE = 2;
var MODE_PARAMS = 3;
var MODE_CMACRO = 4;

var NUM_MODES = 5;
var PARAM_PAGE = 0;

var ROT_MODE = MODE_MACRO;

var CC_LOW = 72;
var CC_HIGH = 79;

var currentDeviceName = "";
var observed = []; // list of all parameters that are being observed

// an array of lists to track current values, changes and jumps for each "Mode"
for (var i = 0; i<NUM_MODES; i++) {
    observed[i] = { values: [], changes: [], jumps: []}
}

// assigns various controller types based on defined ranges
function isRotary(cc) {
    return cc >= ROT_LOW && cc <= ROT_HIGH;
}

function isCC(cc) {
    return cc >= CC_LOW && cc <= CC_HIGH;
}

function toPercentage(value) {
    return "" + (Math.round(value / 128 * 1000) / 10) + " %";
}

// enables changes to be indicated in Bitwig UI
function enableIndication() {
    for (var i = 0; i<8; i++ ) {
        cursorDevice.getCommonParameter(i).setIndication(ROT_MODE == MODE_COMMON);
        cursorDevice.getEnvelopeParameter(i).setIndication(ROT_MODE == MODE_ENVELOPE);
        cursorDevice.getParameter(i).setIndication(ROT_MODE == MODE_PARAMS);
    }
    if (ROT_MODE == MODE_MACRO)
        primaryDevice.isMacroSectionVisible().set(true);
    else if (ROT_MODE == MODE_CMACRO)
        cursorDevice.isMacroSectionVisible().set(true);
//    else
//        cursorDevice.isMacroSectionVisible().set(false);
}

/*
function deviceNameObserver(name) {
    if (name != currentDeviceName) {
        currentDeviceName = name;
        host.showPopupNotification("Changed device to " + name)
        for (var i = 0; i<8; i++) {
            observed[MODE_MACRO].jumps[i] = true;
        }
    }

}
*/

function makeValueObserver(type, index) {
    return function(value) {
        if (! observed[type].changes[index]) {
            observed[type].jumps[index] = true;
        } else
            observed[type].changes[index] = false;
        observed[type].values[index] = value;
    }
}


function init() {
    host.getMidiInPort(0).setMidiCallback(onMidiPort1); //Registers a callback for receiving short (normal) MIDI messages on this MIDI input port.
    //noteIn = host.getMidiInPort(0).createNoteInput("Notes"); //Creates an input for tracks called "Notes" - don't need this
    out = host.getMidiOutPort(0);
    noteIn.setShouldConsumeEvents(false);

    cursorTrack = host.createArrangerCursorTrack(2, 16);
    primaryDevice = cursorTrack.getPrimaryDevice();
    cursorDevice = host.createEditorCursorDevice();
    //cursorDevice.addNameObserver(50, "", deviceNameObserver);


// adds observers to various Device elements
    for (var i = 0; i < 8; i++ ) {
        primaryDevice.getMacro(i).getAmount().addValueObserver(128, makeValueObserver(MODE_MACRO, i));
        //cursorDevice.getCommonParameter(i).addValueObserver(128, makeValueObserver(MODE_COMMON, i)); // Deprecated The remote controls deprecate this feature. Instead create remote controls with createIndependentRemoteControls(String, int, String).
        cursorDevice.getEnvelopeParameter(i).addValueObserver(128, makeValueObserver(MODE_ENVELOPE, i));
        cursorDevice.getParameter(i).addValueObserver(128, makeValueObserver(MODE_PARAMS, i));
        cursorDevice.getMacro(i).getAmount().addValueObserver(128, makeValueObserver(MODE_CMACRO, i));

        for (var j = 0; j < NUM_MODES; j++) { // initializes  changes and jumps to false when Device elements are selected
            observed[j].changes[i] = false;
            observed[j].jumps[i] = false;
        }
    }

    transport = host.createTransport();
    masterTrack = host.createMasterTrack(0);
    tracks = host.createMainTrackBank(8, 2, 16);
    println("init");
    host.showPopupNotification("Connected Pickup Controller");
}


//Function provides three integer parameters for MidiCallback:
// 1. the status byte 2. the data1 value 2. the data2 value @
function onMidiPort1(status, data1, data2) {
    if(isChannelController(status)) {
        if (isRotary(data1)) {
            var index = data1 - ROT_LOW;
            var diff = data2 - observed[ROT_MODE].values[index];
            if (! observed[ROT_MODE].jumps[index] || (Math.abs(diff) < 2)) {
                observed[ROT_MODE].changes[index] = true;
                observed[ROT_MODE].jumps[index] = false;
                var value;
                switch(ROT_MODE) {
                    case MODE_MACRO:
                        value = primaryDevice.getMacro(index).getAmount();
                        value.set(data2, 128);
                        break;
                    case MODE_COMMON:
                        value = cursorDevice.getCommonParameter(index);
                        value.set(data2, 128);
                        break;
                    case MODE_ENVELOPE:
                        value = cursorDevice.getEnvelopeParameter(index);
                        value.set(data2, 128);
                        break;
                    case MODE_PARAMS:
                        value = cursorDevice.getParameter(index);
                        value.set(data2, 128);
                        break;
                    case MODE_CMACRO:
                        value = cursorDevice.getMacro(index).getAmount();
                        value.set(data2, 128);
                        break;
                };
            } else {
                host.showPopupNotification("Pickup " + MODENAMES[ROT_MODE] + " " + (index + 1) + ": " +
                    toPercentage(observed[ROT_MODE].values[index]) + (diff > 0 ? "<<" : ">>") + toPercentage(data2));

            }
        } else if (isCC(data1)) {
            var index = data1 - CC_LOW;
            if (data2 > 0) {
                out.sendMidi(0xb0, CC_LOW + PARAM_PAGE, 0);
                if (ROT_MODE == MODE_PARAMS && PARAM_PAGE == index) {
                    switch(index) {
                        case 0: ROT_MODE = MODE_MACRO; host.showPopupNotification("Macros (Primary Device)"); break;
                        case 1: ROT_MODE = MODE_COMMON; host.showPopupNotification("Common");break;
                        case 2: ROT_MODE = MODE_ENVELOPE; host.showPopupNotification("Envelope"); break;
                        case 3: ROT_MODE = MODE_CMACRO; host.showPopupNotification("Macros (Current Device)"); break;
                        default: PARAM_PAGE = index + 4; host.showPopupNotification("Parameters Page " + (PARAM_PAGE + 1)); cursorDevice.setParameterPage(PARAM_PAGE); break;
                    }
                } else {
                    PARAM_PAGE = index;
                    host.showPopupNotification("Parameters Page " + (PARAM_PAGE + 1));
                    ROT_MODE = MODE_PARAMS;
                    cursorDevice.setParameterPage(PARAM_PAGE);
                }
                enableIndication();
            } else {
                if (ROT_MODE == MODE_PARAMS)
                    out.sendMidi(0xb0, data1, 1);
            }
        } else {
            println("Uknown CC " + data1);
        }
    } else {
        println("Uknown status " + status);
    }
}

function exit() {
    println("exit");
}
