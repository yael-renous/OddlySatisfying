//@author: yael renous
//@date: 2024-12-01

const ROLES = ["CONTROLLER", "SPEAKER", "STICKER", "NONE"];
const webcamRatioWidth = 4;
const webcamRatioHeight = 3;
const canvasRatioWidth = 4;
const canvasRatioHeight = 3;

//all connections data 
let allConnectionsData = [];

let videoStreamIDs = [];
let canvasStreamIDs = [];

let p5liveCanvas;
let p5LiveVideo;


let userName = '';
let myCanvas;
let uuid;

let currentFollowingId = null;
let myData;

// Add to your global variables
let repulsion = null;

let audioStarted = false;

//***========================== Setup ============================================ */

function setup() {
    if (windowWidth > windowHeight) {
        myCanvas = createCanvas(windowWidth, windowWidth * (canvasRatioHeight / canvasRatioWidth));
    }
    else {
        myCanvas = createCanvas(windowHeight * (canvasRatioWidth / canvasRatioHeight), windowHeight);
    }

    // userName = prompt("enter username");
    // if (userName == null || userName.trim() === "") {
    //     userName = "Anonymous" + Math.floor(Math.random() * 1000);
    // }

    myVideo = createCapture(VIDEO, gotMineConnectOthers);
    myVideo.size(myVideo.width, (webcamRatioHeight / webcamRatioWidth )* myVideo.width);
    myVideo.hide();

    uuid = crypto.randomUUID();
    console.log("uuid", uuid);
    myData = new ConnectionData(uuid, userName, ROLES[0], myCanvas, myVideo);

    // Initialize repulsion
    repulsion = new Repulsion(width, height);

    // Show initial role popup
    showRolePopup(ROLES[0]);

    // Show recording indicator if starting as CONTROLLER
    const recordingIndicator = document.getElementById('recording-indicator');
    if (myData.role === ROLES[0]) {
        recordingIndicator.classList.add('active');
    }
}

function gotMineConnectOthers(myStream) {
    p5LiveVideo = new p5LiveMedia(this, "CAPTURE", myStream, "oodlystatisfyingroomVideo");
    p5LiveVideo.on('stream', gotOtherVideo);
    p5LiveVideo.on('data', gotDataVideoStream);
    p5LiveVideo.on('disconnect', lostOtherVideo);


    p5liveCanvas = new p5LiveMedia(this, "CANVAS", myCanvas, "oodlystatisfyingroomCanvas");
    p5liveCanvas.on('stream', gotOtherCanvas);
    p5liveCanvas.on('disconnect', lostOtherCanvas);
    p5liveCanvas.on('data', gotDataCanvasStream);

    trySendNewUserConnection();
}

function trySendNewUserConnection() {
    if (!p5liveCanvas || !p5liveCanvas.socket || !p5liveCanvas.socket.connected) {
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
    p5liveCanvas.send(dataToSendString);
    p5LiveVideo.send(dataToSendString);
    console.log("SendNewUserConnection sent", dataToSendString);
}

//***========================== Video Stream ============================================ */


function gotOtherVideo(stream, id) {
    console.log("gotOtherVideo ");
    let otherVideo = stream;
    if (!videoStreamIDs[id]) {
        videoStreamIDs[id] = {
            'uuid': '',
            'video': otherVideo
        };
        console.log("new video stream id");
    }
    else {
        let uuid = videoStreamIDs[id].uuid;
        if (!allConnectionsData[uuid]) allConnectionsData[uuid] = new ConnectionData(uuid, '', '', otherVideo);
        allConnectionsData[uuid].video = otherVideo;
        console.log("existing video stream id");
    }
    otherVideo.hide();
}


function gotDataVideoStream(data, id) {
    console.log("got video stream data", data);
    let d = JSON.parse(data);
    if (d.dataType == 'newUserConnection') {
        if (videoStreamIDs[id]) {
            videoStreamIDs[id].uuid = d.userData.uuid;
        }
        else {
            videoStreamIDs[id] = {
                'uuid': d.userData.uuid,
                'video': d.userData.video,
            };
        }

        if (allConnectionsData[d.userData.uuid]) {
            allConnectionsData[d.userData.uuid].video = videoStreamIDs[id].video;
        }
        else {
            allConnectionsData[d.userData.uuid] = new ConnectionData(d.userData.uuid, d.userData.name, d.userData.role, videoStreamIDs[id].video);
        }
        console.log(videoStreamIDs)
    }
}

function lostOtherVideo(id) {
    print("lost connection " + id)
    if (!videoStreamIDs[id]) return;
    let uuid = videoStreamIDs[id].uuid;
    delete allConnectionsData[uuid];
    delete videoStreamIDs[id];

}

//TODO update following when someone disconnects

//***========================== Canvas Stream ============================================ */


function gotOtherCanvas(stream, id) {
    console.log("gotOtherCanvas ");
    let otherCanvas = stream;
    if (!canvasStreamIDs[id]) {
        canvasStreamIDs[id] = {
            'uuid': '',
            'canvas': otherCanvas
        };
        console.log("new canvas stream id");
    }
    else {
        let uuid = canvasStreamIDs[id].uuid;
        if (!allConnectionsData[uuid]) allConnectionsData[uuid] = new ConnectionData(uuid, '', '', otherCanvas);
        allConnectionsData[uuid].canvas = otherCanvas;
        console.log("existing canvas stream id");
    }
    otherCanvas.hide();
}



function gotDataCanvasStream(data, id) {
    console.log("got canvas stream data", data.dataType);

    let d = JSON.parse(data);
    if (d.dataType == 'newUserConnection') {
        handleNewUserCanvasConnection(d.userData, id);
        console.log("changing my role");
        myData.nextRole();
        console.log("my new role", myData.role);
        handleRoleChange();
        SendRoleChange();
    }

    if (d.dataType == 'roleChange') {
        if (!canvasStreamIDs[id]) return;
        let uuid = canvasStreamIDs[id].uuid;
        if (!allConnectionsData[uuid]) return;
        allConnectionsData[uuid].role = d.role;
        handleRoleChange();
        checkIfToFollow(uuid);
    }

    // console.log(allConnectionsData);
}



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

function lostOtherCanvas(id) {
    print("lost connection " + id)
    if (!canvasStreamIDs[id]) return;
    let uuid = canvasStreamIDs[id].uuid;
    delete allConnectionsData[uuid];
    delete canvasStreamIDs[id];
}

function handleNewUserCanvasConnection(userData, id) {
    console.log("added new user canvas connection");
    let uuid = userData.uuid;
    if (canvasStreamIDs[id]) {
        canvasStreamIDs[id].uuid = uuid;
    }
    else {
        canvasStreamIDs[id] = {
            'uuid': uuid,
            'canvas': ''
        };
    }

    if (allConnectionsData[uuid]) {
        allConnectionsData[uuid].name = userData.name;
        allConnectionsData[uuid].role = userData.role;
        allConnectionsData[uuid].canvas = canvasStreamIDs[id].canvas;
    }
    else {
        allConnectionsData[uuid] = new ConnectionData(uuid, userData.name, userData.role, canvasStreamIDs[id].canvas);
    }
}


function findFollowing() {
    currentFollowingId = null;
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
    background(180, 80);
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
    // background('red');

    // Draw repulsion effect
    repulsion.draw();
    // // Draw recording indicator
    // let blinkRate = 1; // Blink once per second
    // let alpha = map(sin(frameCount * 0.05 * blinkRate), -1, 1, 0, 100);

    // fill(0, 255, 0, alpha);
    // noStroke();
    // circle(30, 30, 10);
}

function drawSpeakerView() {
    if (currentFollowingId && allConnectionsData[currentFollowingId] && allConnectionsData[currentFollowingId].canvas) {
        // Full canvas background
        image(allConnectionsData[currentFollowingId].canvas, 0, 0, width, width * (canvasRatioHeight / canvasRatioWidth));

        if (allConnectionsData[currentFollowingId].video) {
            // console.log("follwing video");
            image(allConnectionsData[currentFollowingId].video, width - 600, 100, 500, 500*(webcamRatioHeight / webcamRatioWidth));
        }
        else {
            console.log("no following video");
        }
    } else {
        findFollowing();
    }
    // fill('white');
    // text("SPEAKER", width / 2, height / 2);
}

function drawStickerView() {
    background('black');
    if (currentFollowingId && allConnectionsData[currentFollowingId]) {
        imageMode(CENTER);
        image(allConnectionsData[currentFollowingId].canvas, width/4, height / 2, width / 2, (width / 2) * (canvasRatioHeight / canvasRatioWidth));
        image(allConnectionsData[currentFollowingId].video, width * 3/4, height / 2, width / 2, (width / 2) * (webcamRatioHeight / webcamRatioWidth));
    } else {
        findFollowing();
    }
    // fill('white');
    // text("STICKER", width / 2, height / 2);
}

function drawNoneView() {
    if (currentFollowingId && allConnectionsData[currentFollowingId]) {
        imageMode(CENTER);
        image(allConnectionsData[currentFollowingId].canvas, width/4, height / 2, width / 2, (width / 2) * (canvasRatioHeight / canvasRatioWidth));
        image(allConnectionsData[currentFollowingId].video, width * 3/4, height / 2, width / 2, (width / 2) * (webcamRatioHeight / webcamRatioWidth));
    } else {
        findFollowing();
    }
    // fill('white');
    // text("NONE", width / 2, height / 2);
}



function SendRoleChange() {
    console.log("sending role change", myData.role);
    let dataToSend = {
        dataType: 'roleChange',
        role: myData.role,
        uuid: myData.uuid
    };
    p5liveCanvas.send(JSON.stringify(dataToSend));
}

// // Add window resize handler if you don't have one
// function windowResized() {
//     resizeCanvas(windowWidth, windowHeight);
//     repulsion.resize(width, height);
// }

// Add this function to handle role changes
function handleRoleChange() {
    // Clean up existing repulsion if changing from CONTROLLER
    if (myData.role !== ROLES[0] && repulsion) {
        console.log('Cleaning up repulsion - role changed from CONTROLLER');
        repulsion = null;
    }

    // Create new repulsion only if changing to CONTROLLER
    if (myData.role === ROLES[0] && !repulsion) {
        console.log('Creating new repulsion - role changed to CONTROLLER');
        repulsion = new Repulsion(width, height);
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
    console.log("mouse pressed");
    if (!audioStarted) {
        Tone.start().then(() => {
            console.log('Audio is ready');
            audioStarted = true;
        });
    }
}

function showRolePopup(newRole) {
    const popup = document.getElementById('role-popup');
    // Make the initial role message more welcoming
    const isInitialRole = newRole === ROLES[0];
    popup.textContent = isInitialRole ? 
        `Welcome! You are the ${newRole}` : 
        `New Role: ${newRole}`;
    
    popup.classList.add('visible');

    setTimeout(() => {
        popup.classList.remove('visible');
    }, 3000); // Show for 3 seconds
}

