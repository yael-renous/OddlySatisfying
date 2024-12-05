//@author: yael renous
//@date: 2024-12-01


const ROLES = ["CONTROLLER", "SPEAKER", "STICKER", "NONE"];
const webcamRatioWidth = 4;
const webcamRatioHeight = 3;
const canvasRatioWidth = 4;
const canvasRatioHeight = 3;

const popupTime = 20000;

//all connections data 
let allConnectionsData = [];


let p5Live;


let userName = '';
let myCanvas;
let myAudio;
let uuid;

let currentFollowingId = null;
let myData;

// Add to your global variables
let repulsion = null;
let radiusSlider;

let audioStarted = false;


//***========================== Setup ============================================ */

function setup() {
    // if (windowWidth > windowHeight) {
    //     myCanvas = createCanvas(windowWidth, windowWidth * (canvasRatioHeight / canvasRatioWidth));
    // }
    // else {
    //     myCanvas = createCanvas(windowHeight * (canvasRatioWidth / canvasRatioHeight), windowHeight);
    // }

    myCanvas = createCanvas(windowWidth, windowHeight);

    // Use constraints to request audio from createCapture
    let constraints = {
        audio: true,
        video: true
    };

    // myVideo = createCapture(constraints, gotMineConnectOthers);
    myVideo = createCapture(VIDEO, gotMineConnectOthers);

    myVideo.size(myVideo.width, (webcamRatioHeight / webcamRatioWidth) * myVideo.width);
    myVideo.hide();

    uuid = crypto.randomUUID();
    console.log("uuid", uuid);
    myData = new ConnectionData(userName, ROLES[0], myVideo);

    // Initialize repulsion
    repulsion = new Repulsion(width, height);

    // Show initial role popup
    showRolePopup(ROLES[0]);

    // Show recording indicator if starting as CONTROLLER
    const recordingIndicator = document.getElementById('recording-indicator');
    if (myData.role === ROLES[0]) {
        recordingIndicator.classList.add('active');
    }

    // Create slider
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


    // let canvasStream = myCanvas.elt.captureStream(15);
    // let audioTrack = myStream.getAudioTracks()[0];
    // canvasStream.addTrack(audioTrack);

    // p5liveCanvas = new p5LiveMedia(this, "CANVAS", myCanvas, "oodlystatisfyingroomCanvas");
    // p5liveCanvas.on('stream', gotOtherCanvas);
    // p5liveCanvas.on('disconnect', lostOtherCanvas);
    // p5liveCanvas.on('data', gotDataCanvasStream);

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
        dataType: 'newUserConnection',
        userData: myData.toJSON()
    };
    let dataToSendString = JSON.stringify(dataToSend);
    // p5liveCanvas.send(dataToSendString);
    p5Live.send(dataToSendString);
    console.log("SendNewUserConnection sent", dataToSendString);
}

//***========================== Video Stream ============================================ */


function gotOtherVideo(stream, id) {
    console.log("gotOtherVideo");
    let otherVideo = stream;
    if (!allConnectionsData[id]) {
        allConnectionsData[id] = new ConnectionData( '', '', otherVideo);
    }
    else {
        allConnectionsData[id].video = otherVideo;
    }
    otherVideo.hide();
}


function gotDataVideoStream(data, id) {
    let d = JSON.parse(data);
    if (d.dataType == 'newUserConnection') {
        console.log("new user connection", data);
        if (allConnectionsData[id]) {
            allConnectionsData[id].role = d.userData.role;
            allConnectionsData[id].name = d.userData.name;
        }
        else {
            allConnectionsData[id] = new ConnectionData(d.userData.name, d.userData.role);
        }
        myData.nextRole();
        console.log("my new role", myData.role);
        handleRoleChange();
        SendRoleChange();
    }


    if (d.dataType == 'roleChange') {
        if (!allConnectionsData[id]) return;
        allConnectionsData[id].role = d.role;
        handleRoleChange();
        checkIfToFollow(id);
    }

    if (d.dataType == 'controllerMousePosition') {
        let realX = d.normalizedX * width;
        let realY = d.normalizedY * height;
        repulsion.updateRemotePosition(realX, realY);
    }

    if(d.dataType == 'repulsionRadius') {
        repulsion.setRepulsionRadius(d.radius);
    }
}

function lostOtherVideo(id) {
    print("lost connection " + id)
    if (!allConnectionsData[id]) return;
    delete allConnectionsData[id];
}

//=================================== Helpers ============================================ */
function checkIfToFollow(uuid) {
    if (myData.currentRoleIndex == 0) return;
    if (myData.currentRoleIndex == ROLES.length - 1) {
        return;
    }
    if (allConnectionsData[uuid].role == ROLES[myData.currentRoleIndex - 1]) {
        console.log("new following", allConnectionsData[uuid].name);
        currentFollowingId = uuid;
    }
}

function findFollowing() {
    currentFollowingId = null;

    // Special case for NONE role
    if (myData.role === ROLES[ROLES.length - 1]) {
        // First try to find another NONE role to follow
        for (let uuid in allConnectionsData) {
            if (allConnectionsData[uuid].role === ROLES[ROLES.length - 1]) {
                currentFollowingId = uuid;
                return;
            }
        }
    }

    // Original logic for other roles (and fallback for NONE)
    let distance = 1;
    while (!currentFollowingId) {
        if (myData.currentRoleIndex - distance < 0) break;
        for (let uuid in allConnectionsData) {
            if (allConnectionsData[uuid].role == ROLES[myData.currentRoleIndex - distance]) {
                currentFollowingId = uuid;
            }
        }
        distance++;
    }
}
//***========================== Draw ============================================ */

function draw() {
background(0);
    // fill('red');
    // textSize(20);
    //a sharedCanvas.image(myVideo, 0, 0);
    switch (myData.role) {
        case ROLES[0]:
            drawControllerView();
            break;
        case ROLES[1]:
            drawSpeakerView();
            break;
        case ROLES[2]:
            drawStickerView();
            break;
        case ROLES[3]:
            drawNoneView();
            break;
    }

 
}

function drawControllerView() {
    // console.log("drawControllerView");
    repulsion.updateRemotePosition(mouseX, mouseY);
    sendMousePositionData();
    repulsion.draw();
}

function drawSpeakerView() {
    background('black');
    if (currentFollowingId && allConnectionsData[currentFollowingId]) {
        repulsion.draw();
        if (allConnectionsData[currentFollowingId].video) {
            image(allConnectionsData[currentFollowingId].video, width-600, 10, 500, 500 * (webcamRatioHeight / webcamRatioWidth));
        }
        else {
            // console.log("no following video");
        }
    } else {
        findFollowing();
    }

}

function drawStickerView() {
    background('black');
    if (currentFollowingId && allConnectionsData[currentFollowingId]) {
        imageMode(CENTER);
        repulsion.draw();
        // image(allConnectionsData[currentFollowingId].canvas, width / 4, height / 2, width / 2, (width / 2) * (canvasRatioHeight / canvasRatioWidth));
        if (allConnectionsData[currentFollowingId].video) {
            image(allConnectionsData[currentFollowingId].video, width * 3 / 4, height / 2, width / 2, (width / 2) * (webcamRatioHeight / webcamRatioWidth));
        }
        else {
            // console.log("no following video");
        }
    } else {
        findFollowing();
    }
}

function drawNoneView() {
    background('black');
    if (currentFollowingId && allConnectionsData[currentFollowingId]) {
        imageMode(CENTER);
        image(allConnectionsData[currentFollowingId].video, width * 3 / 4, height / 2, width / 2, (width / 2) * (webcamRatioHeight / webcamRatioWidth));
    } else {
        findFollowing();
    }

}



function SendRoleChange() {
    console.log("sending role change", myData.role);
    let dataToSend = {
        dataType: 'roleChange',
        role: myData.role,
    };
    p5Live.send(JSON.stringify(dataToSend));
}

function sendMousePositionData() {
    if (!p5Live || !p5Live.socket || !p5Live.socket.connected) return;
    let normalizedX = mouseX / width;
    let normalizedY = mouseY / height;
    let dataToSend = {
        dataType: 'controllerMousePosition',
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
    const recordingIndicator = document.getElementById('recording-indicator');
    if (myData.role === ROLES[0]) {
        recordingIndicator.classList.add('active');
    } else {
        recordingIndicator.classList.remove('active');
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
    let message = '';

    if (newRole === ROLES[0]) { // CONTROLLER
        message = 'Play around this satisfying interaction';
    } else if (newRole === ROLES[1]) { // SPEAKER
        message = 'You are no longer in control, enjoy by observing';

    } else if (newRole === ROLES[3]) { // NONE
        message = 'Is this satisfying?';
    }

    popup.textContent = message;
    popup.classList.add('visible');

    setTimeout(() => {
        popup.classList.remove('visible');
    }, popupTime);
}

function windowResized() {
    // Resize canvas based on window dimensions and aspect ratio
    if (windowWidth > windowHeight) {
        resizeCanvas(windowWidth, windowWidth * (canvasRatioHeight / canvasRatioWidth));
    } else {
        resizeCanvas(windowHeight * (canvasRatioWidth / canvasRatioHeight), windowHeight);
    }

    // Update repulsion with new dimensions
    if (repulsion) {
        repulsion.resize(width, height);
    }
}

function OnRadiusSliderChange() {
    repulsion.setRepulsionRadius(radiusSlider.value());
    let dataToSend = {
        dataType: 'repulsionRadius',
        radius: radiusSlider.value()
    };
    p5Live.send(JSON.stringify(dataToSend));
}