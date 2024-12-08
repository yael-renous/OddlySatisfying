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
let repulsionGraphics;

// let currentFollowingId = null;
let currentControllerId = null;
let myData;

// Add to your global variables
let repulsion = null;
let radiusSlider;

let audioStarted = false;


// Add at the top with other global variables
let hasStarted = false;
let firstConnectionTime;

let bg;
// Add at the top with other constants
const MOUSE_POSITION_SEND_INTERVAL = 100; // Send every 100ms
let lastMousePositionSent = 0;

// Add to your global variables at the top
let bgColorPicker;
let backgroundColor;

//***========================== Setup ============================================ */

function setup() {
    // Show instructions first
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', startExperience);
    // Create canvas and initialize everything
    myCanvas = createCanvas(windowWidth, windowHeight);
    myCanvas.parent('canvas-container');
    bg = loadImage('pg.png');
    repulsionGraphics = createGraphics(width, height);
    repulsion = new Repulsion(width, height);

    // // Create and position the color picker
    // bgColorPicker = createColorPicker(color(2, 22, 3));
    // bgColorPicker.position(20, height - 50);
    // bgColorPicker.addClass('color-picker');
    
    // // Initialize background color
    // backgroundColor = bgColorPicker.color();
}

function startExperience() {
    if (hasStarted) return;
    hasStarted = true;
    // Hide instructions
    const instructionsPopup = document.getElementById('instructions-popup');
    instructionsPopup.classList.add('hidden');

    myVideo = createCapture(VIDEO, gotMineConnectOthers);
    myVideo.size(myVideo.width, (webcamRatioHeight / webcamRatioWidth) * myVideo.width);
    myVideo.hide();

    myData = new ConnectionData(userName, ROLES[0], myVideo);
    showRolePopup(ROLES[0]);

    const recordingIndicator = document.getElementById('recording-indicator');
    if (myData.role === ROLES[0]) {
        recordingIndicator.classList.add('active');
    }

    radiusSlider = createSlider(20, 200, 80);
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

let sentNewUserConnection = false;
function SendNewUserConnection() {
    if (!p5Live || !p5Live.socket || !p5Live.socket.connected) return;
    let dataToSend = {
        dataType: NEW_CONNECTION_STRING,
        userData: myData.toJSON()
    };
    let dataToSendString = JSON.stringify(dataToSend);
    try {
        p5Live.send(dataToSendString);
        console.log("SendNewUserConnection sent", dataToSendString);
    } catch (error) {
        console.warn("Failed to send new user connection:", error);
    }
    sentNewUserConnection = true;
}

//***========================== Video Stream ============================================ */


function gotOtherVideo(stream, id) {
    console.log("gotOtherVideo");
    let otherVideo = stream;
    if (!allConnectionsData[id]) {
        allConnectionsData[id] = new ConnectionData('', '', false, otherVideo);
    }
    else {
        allConnectionsData[id].video = otherVideo;
    }
    otherVideo.hide();
}


function gotDataVideoStream(data, id) {
    // console.log("gotDataVideoStream", data);
    try {
        let d = JSON.parse(data);
        if (d.dataType == NEW_CONNECTION_STRING) {
            console.log("new user connection", data);
            if (allConnectionsData[id]) {
                allConnectionsData[id].role = d.userData.role;
                allConnectionsData[id].name = d.userData.name;
                allConnectionsData[id].afterMe = true;
            }
            else {
                allConnectionsData[id] = new ConnectionData(d.userData.name, d.userData.role, true);
            }
            currentControllerId = id;
            updateRole();
        }

        if (d.dataType == ROLE_CHANGE_STRING) {
            console.log("gotRoleChange", d.role);
            if (!allConnectionsData[id]) return;
            allConnectionsData[id].role = d.role;
            handleRoleChange();
        }

        if (d.dataType == MOUSE_POSITION_STRING) {
            if (myData.role == ROLES[0]) {
                return;
            }
            let realX = d.normalizedX * width;
            let realY = d.normalizedY * height;
            repulsion.updateRemotePosition(realX, realY);
        }

        if (d.dataType == REPULSION_RADIUS_STRING && myData.role != ROLES[1]) {
            repulsion.setRepulsionRadius(d.radius);
        }
    } catch (error) {
        console.warn("Failed to parse data:", error);
    }
}


function lostOtherVideo(id) {
    console.log("lost connection " + id);
    if (!allConnectionsData[id]) return;
    delete allConnectionsData[id];
    if (Object.keys(allConnectionsData).length == 0) {
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
    // background('white');

    // // Use the color picker value for background
    // repulsionGraphics.background(255, 254, 240);
    // repulsionGraphics.background(bgColorPicker.color());
    repulsionGraphics.image(bg, 0, 0, repulsionGraphics.width, repulsionGraphics.height);
    repulsion.draw(repulsionGraphics); // Pass graphics object to draw method

    if (!hasStarted) {
        repulsion.updateRemotePosition(0, 0);
        image(repulsionGraphics, 0, 0, repulsionGraphics.width, repulsionGraphics.height); // Display full-size
        return;
    }

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
    if (repulsionGraphics.width != width || repulsionGraphics.height != height || myCanvas.width == 0 || myCanvas.height == 0) return;
    repulsion.updateRemotePosition(mouseX, mouseY);
    sendMousePositionData();
    imageMode(CORNER);
    image(repulsionGraphics, 0, 0, repulsionGraphics.width, repulsionGraphics.height); // Display full-size
}


function drawSpeakerView() {
    background('black');
    // console.log("drawSpeakerView", currentControllerId, allConnectionsData[currentControllerId]);
    if (currentControllerId && allConnectionsData[currentControllerId]) {
        image(repulsionGraphics, 0, 0, width, height); // Display full-size
        if (allConnectionsData[currentControllerId].video) {
            image(allConnectionsData[currentControllerId].video, width - width * 0.2 - width * 0.1, height * 0.1, width * 0.2, width * 0.2 * (webcamRatioHeight / webcamRatioWidth));
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
        if (connection.afterMe && connection.video) {

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

    let repulsionWidth = currentSize * 2;
    let repulsionHeight = repulsionWidth * (webcamRatioHeight / webcamRatioWidth);
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
    // Check if enough time has passed since last send
    const currentTime = Date.now();
    if (currentTime - lastMousePositionSent < MOUSE_POSITION_SEND_INTERVAL) return;

    if (!p5Live || !p5Live.socket || !p5Live.socket.connected) return;

    let normalizedX = mouseX / width;
    let normalizedY = mouseY / height;
    let dataToSend = {
        dataType: MOUSE_POSITION_STRING,
        userData: myData.toJSON(),
        normalizedX: normalizedX,
        normalizedY: normalizedY
    };
    try {
        p5Live.send(JSON.stringify(dataToSend));
        lastMousePositionSent = currentTime;  // Update last sent timestamp
    } catch (error) {
        console.warn("Failed to send mouse position:", error);
    }
}

// Add this function to handle role changes
function handleRoleChange() {
    // Only show slider for SPEAKER role
    if (myData.role != ROLES[1] && myData.role != ROLES[0]) {
        radiusSlider.hide();
    }

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
        message = 'A new user has joined.\nYou can subtly influence the interaction by adjusting the circle radius in the slider be.';
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
    if (myData.role == ROLES[0]) {
        let dataToSend = {
            dataType: REPULSION_RADIUS_STRING,
            radius: radiusSlider.value()
        };
        p5Live.send(JSON.stringify(dataToSend));
    }
}