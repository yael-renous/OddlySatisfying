//@author: yael renous
//@date: 2024-12-01


const ROLES = ["CONTROLLER", "SPEAKER", "NONE"];
const NEW_CONNECTION_STRING = "newUserConnection";
const MOUSE_POSITION_STRING = "controllerMousePosition";
const REPULSION_RADIUS_STRING = "repulsionRadius";
const ROLE_CHANGE_STRING = "roleChange";

const webcamRatioWidth = 4;
const webcamRatioHeight = 3;
const repulsionRatioWidth = 4;
const repulsionRatioHeight = 3;

const popupTime = 20000;

//all connections data 
let allConnectionsData = [];


let p5Live;


let userName = '';
let myCanvas;
let myAudio;
let uuid;

// let currentFollowingId = null;
let currentControllerId = null;
let myData;

// Add to your global variables
let repulsion = null;
let radiusSlider;

let audioStarted = false;

let repulsionGraphics;

// Add at the top with other global variables
let hasStarted = false;

//***========================== Setup ============================================ */

function setup() {
    // Show instructions first
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', startExperience);
}

function startExperience() {
    if (hasStarted) return;
    hasStarted = true;
    
    // Hide instructions
    const instructionsPopup = document.getElementById('instructions-popup');
    instructionsPopup.classList.add('hidden');

    // Create canvas and initialize everything
    myCanvas = createCanvas(windowWidth, windowHeight);
    repulsionGraphics = createGraphics(width, height);

    let constraints = {
        audio: true,
        video: true
    };

    myVideo = createCapture(VIDEO, gotMineConnectOthers);
    myVideo.size(myVideo.width, (webcamRatioHeight / webcamRatioWidth) * myVideo.width);
    myVideo.hide();

    uuid = crypto.randomUUID();
    console.log("uuid", uuid);
    myData = new ConnectionData(userName, ROLES[0], myVideo);

    repulsion = new Repulsion(width, height);

    showRolePopup(ROLES[0]);

    const recordingIndicator = document.getElementById('recording-indicator');
    if (myData.role === ROLES[0]) {
        recordingIndicator.classList.add('active');
    }

    radiusSlider = createSlider(20, 200, 80);
    radiusSlider.position(20, 20);
    radiusSlider.style('width', '200px');
    radiusSlider.addClass('custom-slider');
    radiusSlider.input(OnRadiusSliderChange);
}

function gotMineConnectOthers(myStream) {
    p5Live = new p5LiveMedia(this, "CAPTURE", myStream, "oodlystatisfyingroom");
    p5Live.on('stream', gotOtherVideo);
    p5Live.on('data', gotDataVideoStream);
    p5Live.on('disconnect', lostOtherVideo);
    trySendNewUserConnection();
}

function trySendNewUserConnection() {
    if (!p5Live || !p5Live.socket || !p5Live.socket.connected) {
        console.log("Connection not ready, retrying in 2 seconds...");
        setTimeout(trySendNewUserConnection, 2000);
    } else {
        SendNewUserConnection();
    }
}

function SendNewUserConnection() {
    let dataToSend = {
        dataType: NEW_CONNECTION_STRING,
        userData: myData.toJSON()
    };
    let dataToSendString = JSON.stringify(dataToSend);
    p5Live.send(dataToSendString);
    console.log("SendNewUserConnection sent", dataToSendString);
}

//***========================== Video Stream ============================================ */


function gotOtherVideo(stream, id) {
    console.log("gotOtherVideo");
    let otherVideo = stream;
    if (!allConnectionsData[id]) {
        allConnectionsData[id] = new ConnectionData('', '', otherVideo);
    }
    else {
        allConnectionsData[id].video = otherVideo;
    }
    otherVideo.hide();
}


function gotDataVideoStream(data, id) {
    console.log("gotDataVideoStream", data);
    let d = JSON.parse(data);
    if (d.dataType == NEW_CONNECTION_STRING) {
        console.log("new user connection", data);
        if (allConnectionsData[id]) {
            allConnectionsData[id].role = d.userData.role;
            allConnectionsData[id].name = d.userData.name;
        }
        else {
            allConnectionsData[id] = new ConnectionData(d.userData.name, d.userData.role);
        }
        currentControllerId = id;
        updateRole();
    }


    if (d.dataType == ROLE_CHANGE_STRING) {
        if (!allConnectionsData[id]) return;
        allConnectionsData[id].role = d.role;
        handleRoleChange();
        // checkIfToFollow(id);
    }

    if (d.dataType == MOUSE_POSITION_STRING) {
        // if (myData.role == ROLES[0]) {
        //     currentControllerId = id;
        //     updateRole();
        // }
        let realX = d.normalizedX * width;
        let realY = d.normalizedY * height;
        repulsion.updateRemotePosition(realX, realY);
    }

    if (d.dataType == REPULSION_RADIUS_STRING) {
        repulsion.setRepulsionRadius(d.radius);
    }
}


function lostOtherVideo(id) {
    print("lost connection " + id)
    if (!allConnectionsData[id]) return;
    delete allConnectionsData[id];
    if (allConnectionsData.length == 0) {
        console.log("no more connections, becoming controller");
        myData.role = ROLES[0];
        radiusSlider.show();
    }
}

//=================================== Helpers ============================================ */
function updateRole() {
    myData.nextRole();
    console.log("my new role", myData.role);
    handleRoleChange();
    SendRoleChange();
}

//***========================== Draw ============================================ */

function draw() {
    if (!myCanvas || !repulsionGraphics || myCanvas.width == 0 || myCanvas.height == 0 || repulsionGraphics.width == 0 || repulsionGraphics.height == 0) return;
    background(0);

    // Draw repulsion on the graphics object

    repulsionGraphics.background(0);
    repulsion.draw(repulsionGraphics); // Pass graphics object to draw method


    // Display the graphics object according to the role
    switch (myData.role) {
        case ROLES[0]:
            drawControllerView();
            break;
        case ROLES[1]:
            drawSpeakerView();
            break;
        case ROLES[ROLES.length - 1]:
            drawNoneView();
            break;
    }
}

function drawControllerView() {
    if (!repulsion || !repulsionGraphics) return;
    if (repulsionGraphics.width != width || repulsionGraphics.height != height) {
        console.log("repulsionGraphics", repulsionGraphics.width, repulsionGraphics.height);
        repulsionGraphics.clear();
        repulsionGraphics = createGraphics(width, height);
        return;
    }
    if (myCanvas.width == 0 || myCanvas.height == 0) {
        console.log("myCanvas", myCanvas.width, myCanvas.height);
        return;
    }
    repulsion.updateRemotePosition(mouseX, mouseY);
    sendMousePositionData();
    imageMode(CORNER);
    fill('red');
    image(repulsionGraphics, 0, 0, repulsionGraphics.width, repulsionGraphics.height); // Display full-size
}


function drawSpeakerView() {
    background('black');
    if (currentControllerId && allConnectionsData[currentControllerId]) {
        image(repulsionGraphics, 0, 0, width, height); // Display full-size
        if (allConnectionsData[currentControllerId].video) {
            image(allConnectionsData[currentControllerId].video, width - 600, 10, 500, 500 * (webcamRatioHeight / webcamRatioWidth));
        }
    }
    else {
        findController();
    }
}
function drawNoneView() {
    background('black');
    let connections = Object.values(allConnectionsData);
    if (connections.length === 0) return;


    let currentSize = width / 2;
    imageMode(CENTER);

    // Define some colors for the strokes
    // const strokeColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

    connections.forEach((connection, index) => {
        if (connection.video) {

            // // Set stroke properties
            // stroke(strokeColors[index % strokeColors.length]);
            // strokeWeight(4);

            image(connection.video, currentSize + currentSize / 2, height / 2, currentSize, currentSize * (webcamRatioHeight / webcamRatioWidth));

            // // Draw the stroke rectangle around the video
            // noFill();
            // rect(currentSize + currentSize / 2 - currentSize / 2,
            //     height / 2 - (currentSize * (webcamRatioHeight / webcamRatioWidth)) / 2,
            //     currentSize,
            //     currentSize * (webcamRatioHeight / webcamRatioWidth));

            currentSize = currentSize / 2;
        }
    });

    // Reset stroke settings
    noStroke();

    let repulsionWidth = currentSize*2;
    let repulsionHeight = repulsionWidth * (repulsionGraphics.height / repulsionGraphics.width);
    image(repulsionGraphics, repulsionWidth / 2, height / 2, repulsionWidth, repulsionHeight);

}

function findController() {
    currentControllerId = null;
    // Look through all connections to find the CONTROLLER
    for (let uuid in allConnectionsData) {
        if (allConnectionsData[uuid].role === ROLES[0]) { // ROLES[0] is "CONTROLLER"
            currentControllerId = uuid;
            break;
        }
    }
}




function SendRoleChange() {
    console.log("sending role change", myData.role);
    let dataToSend = {
        dataType: ROLE_CHANGE_STRING,
        role: myData.role,
    };
    p5Live.send(JSON.stringify(dataToSend));
}

function sendMousePositionData() {
    if (!p5Live || !p5Live.socket || !p5Live.socket.connected) return;
    let normalizedX = mouseX / width;
    let normalizedY = mouseY / height;
    let dataToSend = {
        dataType: MOUSE_POSITION_STRING,
        normalizedX: normalizedX,
        normalizedY: normalizedY
    };
    try {
        p5Live.send(JSON.stringify(dataToSend));
    } catch (error) {
        console.warn("Failed to send mouse position:", error);
    }
}

// Add this function to handle role changes
function handleRoleChange() {
    // Clean up existing repulsion if changing from CONTROLLER
    if (myData.role !== ROLES[0]) {
        radiusSlider.hide();  // Hide the slider when not CONTROLLER

    }

    // Show/hide recording indicator based on role
    // const recordingIndicator = document.getElementById('recording-indicator');
    // if (myData.role === ROLES[0]) {
    //     recordingIndicator.classList.add('active');
    // } else {
    //     recordingIndicator.classList.remove('active');
    // }

    // Show role popup
    showRolePopup(myData.role);
}

function mousePressed() {
    if (!audioStarted) {
        Tone.start().then(() => {
            console.log('Audio is ready');
            audioStarted = true;
        });
    }
}

function showRolePopup(newRole) {
    const popup = document.getElementById('role-popup');
    const popupMessage = document.getElementById('popup-message');
    const okButton = document.getElementById('popup-ok');
    
    let message = '';
    if (newRole === ROLES[0]) {
        message = "You are being recorded through your webcam.\nOther participants will be watching.\nDon't let this distract you.\nFocus on the interaction.\nEnjoy the experience fully.";
    } else if (newRole === ROLES[1]) {
        message = 'You are no longer in control, enjoy by observing';
    } else if (newRole === ROLES[ROLES.length - 1]) {
        message = 'Is this satisfying?';
    }

    popupMessage.textContent = message;
    popup.classList.add('visible');

    // Remove any existing event listener
    okButton.removeEventListener('click', closePopup);
    
    // Add new event listener
    okButton.addEventListener('click', closePopup);
}

function closePopup() {
    const popup = document.getElementById('role-popup');
    popup.classList.remove('visible');
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    console.log("windowResized", windowWidth, windowHeight);
    repulsionGraphics = createGraphics(windowWidth, windowHeight);
    repulsion = new Repulsion(width, height);

    console.log("repulsionGraphics", repulsionGraphics.width, repulsionGraphics.height);
}

function OnRadiusSliderChange() {
    repulsion.setRepulsionRadius(radiusSlider.value());
    let dataToSend = {
        dataType: REPULSION_RADIUS_STRING,
        radius: radiusSlider.value()
    };
    p5Live.send(JSON.stringify(dataToSend));
}