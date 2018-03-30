// See documentation and latest code on http://github.com/phaethon/bitwig-pickup-controller
//


loadAPI(1);

host.defineController("Monster", "Pickup Frankenstein", "1.0", "1965a650-634a-11e5-a837-0800201c9a66");

host.defineMidiPorts(1, 1);

var ROT_LOW = 32;
var ROT_HIGH = 39;

var MODENAMES = [ "Delay", "Off"];
var MODE_DELAY = 0;
var MODE_OFF = 1;


var NUM_MODES = 2;
var PARAM_PAGE = 0;

var ROT_MODE = MODE_DELAY;

var CC_LOW = 72;
var CC_HIGH = 79;

var currentDeviceName = "";
var observed = [];

for (var i = 0; i<NUM_MODES; i++) {
    observed[i] = { values: [], changes: [], jumps: []}
}

// BASIC SETUP
function isRotary(cc) {
    return cc >= ROT_LOW && cc <= ROT_HIGH;
}

function isCC(cc) {
    return cc >= CC_LOW && cc <= CC_HIGH;
}

function toPercentage(value) {
    return "" + (Math.round(value / 128 * 1000) / 10) + " %";
}
//--<



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
    host.getMidiInPort(0).setMidiCallback(onMidiPort1);
    noteIn = host.getMidiInPort(0).createNoteInput("Notes");
    out = host.getMidiOutPort(0);
    noteIn.setShouldConsumeEvents(false);


  // DON'T WANT A CURSOR TRACK / PRIMARY DEVICE
    cursorTrack = host.createArrangerCursorTrack(2, 16);
    primaryDevice = cursorTrack.getPrimaryDevice();
    cursorDevice = host.createEditorCursorDevice();
    //cursorDevice.addNameObserver(50, "", deviceNameObserver);

    for (var i = 0; i < 8; i++ ) {
        primaryDevice.getMacro(i).getAmount().addValueObserver(128, makeValueObserver(MODE_DELAY, i));
        for (var j = 0; j < NUM_MODES; j++) {
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
// <--

function onMidiPort1(status, data1, data2) {

    if(isChannelController(status)) {
            var index = data1 - ROT_LOW;
            var diff = data2 - observed[ROT_MODE].values[index];
            if (! observed[ROT_MODE].jumps[index] || (Math.abs(diff) < 2)) {
                observed[ROT_MODE].changes[index] = true;
                observed[ROT_MODE].jumps[index] = false;
                var value;
                value = primaryDevice.getMacro(index).getAmount();
                value.set(data2, 128);
                break;

 // showing param difference
            } else {
                host.showPopupNotification("Pickup " + MODENAMES[ROT_MODE] + " " + (index + 1) + ": " +
                    toPercentage(observed[ROT_MODE].values[index]) + (diff > 0 ? "<<" : ">>") + toPercentage(data2));

            }
}

function exit() {
    println("exit");
}
