//@author: yael renous
//@date: 2024-12-01

const ROLES = ["CONTROLLER", "SPEAKER", "STICKER", "NONE"];

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

//***========================== Setup ============================================ */

function setup() {
    myCanvas = createCanvas(windowWidth, windowHeight);

    userName = prompt("enter username");
    if (userName == null || userName.trim() === "") {
        userName = "Anonymous" + Math.floor(Math.random() * 1000);
    }

    myVideo = createCapture(VIDEO, gotMineConnectOthers);
    myVideo.hide();

    uuid = crypto.randomUUID();
    console.log("uuid", uuid);
    myData = new ConnectionData(uuid, userName, ROLES[0], myCanvas, myVideo);
}

function gotMineConnectOthers(myStream) {
    p5LiveVideo = new p5LiveMedia(this, "CAPTURE", myStream, "oodlystatisfyingroomVideo");
    p5LiveVideo.on('stream', gotOtherVideo);
    p5LiveVideo.on('data', gotDataVideoStream);
    p5LiveVideo.on('disconnect', lostOtherVideo);


    p5liveCanvas = new p5LiveMedia(this, "CAPTURE", myStream, "oodlystatisfyingroomCanvas");
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
    if(!videoStreamIDs[id]) {
        videoStreamIDs[id] = {
            'uuid':'',
            'video':otherVideo
        };
        console.log("new video stream id");
    }
    else {
        let uuid = videoStreamIDs[id].uuid;
        allConnectionsData[uuid] = {
            'video': otherVideo,
        };
        console.log("existing video stream id");
    }
    otherVideo.hide();
}


function gotDataVideoStream(data, id) {
    console.log("got video stream data", data);
    let d = JSON.parse(data);
    if (d.dataType == 'newUserConnection') {
        if(videoStreamIDs[id]){
            videoStreamIDs[id].uuid = d.userData.uuid;
        }
        else {
            videoStreamIDs[id] = {
                'uuid': d.userData.uuid,
                'video': d.userData.video,
            };
        }

        if(allConnectionsData[d.userData.uuid]) {
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
    if(!videoStreamIDs[id]) return;
    let uuid = videoStreamIDs[id].uuid;
    delete allConnectionsData[uuid];
    delete videoStreamIDs[id];

}

//TODO update following when someone disconnects

//***========================== Canvas Stream ============================================ */


function gotOtherCanvas(stream, id) {
    console.log("gotOtherCanvas ");
    let otherCanvas = stream;
    if(!canvasStreamIDs[id]) {
        canvasStreamIDs[id] = {
            'canvas':otherCanvas
        };
        console.log("new canvas stream id");
    }
    else {
        let uuid = canvasStreamIDs[id].uuid;
        allConnectionsData[uuid] = {
            'canvas': otherCanvas,
        };
        console.log("existing canvas stream id");
    }
    otherCanvas.hide();
}



function gotDataCanvasStream(data, id) {
    console.log("got canvas stream data", data);

    let d = JSON.parse(data);
    if (d.dataType == 'newUserConnection') {
        handleNewUserCanvasConnection(d.userData, id);
        myData.nextRole();
        SendRoleChange();
    }

    if (d.dataType == 'roleChange') {
      handleOthersRoleChange(id);
    }

    console.log(allConnectionsData);
}

function handleOthersRoleChange(canvasStreamID) {
    if (!canvasStreamIDs[canvasStreamID]) return;
    let uuid = canvasStreamIDs[canvasStreamID].uuid;
    if(!allConnectionsData[uuid]) return;
    allConnectionsData[uuid].role = d.role;

    checkIfToFollow(uuid);
}

function checkIfToFollow(uuid) {
    if(myData.currentRoleIndex == 0) return;
    if(myData.currentRoleIndex == ROLES.length-1){
        return;
    }
    if(allConnectionsData[uuid].role == ROLES[myData.currentRoleIndex-1]) {
        console.log("new following", allConnectionsData[uuid].name);
        currentFollowingId = uuid;
    }
}

function lostOtherCanvas(id) {
    print("lost connection " + id)
    if(!canvasStreamIDs[id]) return;
    let uuid = canvasStreamIDs[id].uuid;
    delete allConnectionsData[uuid];
    delete canvasStreamIDs[id];
}

function handleNewUserCanvasConnection(userData, id) {
    let uuid = userData.uuid;
    if(canvasStreamIDs[id]) {
        canvasStreamIDs[id].uuid = uuid;
    }
    else {
        canvasStreamIDs[id] = {
            'uuid': uuid,
            'canvas': userData.canvas
        };
    }

    if(allConnectionsData[uuid]) {
        allConnectionsData[uuid].canvas = canvasStreamIDs[id].canvas;
    }
    else {
        allConnectionsData[uuid] = new ConnectionData(uuid, userData.name, userData.role, canvasStreamIDs[id].canvas);
    }
}


function findFollowing() {
    for(let uuid in allConnectionsData) {
        if(allConnectionsData[uuid].role == ROLES[myData.currentRoleIndex-1]) {
            currentFollowingId = uuid;
        }
    }
}
//***========================== Draw ============================================ */

function draw() {
    background('blue');
    fill('red');
    textSize(20);

    background('black');
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
    text("CONTROLLER", width / 2, height / 2);
}

function drawSpeakerView() {
    text("SPEAKER", width / 2, height / 2);
    if(currentFollowingId) {
        image(allConnectionsData[currentFollowingId].video, 0, 0);
    }
    else{
        findFollowing();
        text("no one to follow", width / 2, height / 2+50);
    }
}

function drawStickerView() {
    text("STICKER", width / 2, height / 2);
}

function drawNoneView() {
    text("NONE", width / 2, height / 2);
}



function SendRoleChange() {
    let dataToSend = {
        dataType: 'roleChange',
        role: myData.role,
        uuid: myData.uuid
    };
    p5liveCanvas.send(JSON.stringify(dataToSend));
}
