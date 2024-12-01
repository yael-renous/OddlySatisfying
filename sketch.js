const ROLES = ["CONTROLLER", "SPEAKER", "STICKER", "NONE"];
let allConnections = [];

let p5live;

let currentRoleIndex = 0;
let userName = '';

function setup() {
    createCanvas(windowWidth, windowHeight);
    let sharedCanvas = createGraphics(windowWidth, windowHeight);

    userName = prompt("enter username");
    if (userName == null || userName.trim() === "") {
        userName = "Anonymous" + Math.floor(Math.random() * 1000);
    }

    myVideo = createCapture(VIDEO, gotMineConnectOthers);
    myVideo.hide();
    allConnections['Me'] = {
        'canvas': sharedCanvas,
        'video': myVideo,
        'name': userName,
        'role': ROLES[currentRoleIndex]
    }
}

function gotMineConnectOthers(myStream) {
    p5live = new p5LiveMedia(this, "CAPTURE", myStream, "oodlystatisfyingroom");
    p5live.on('connect', (id) => {
        console.log("connected");
        // SendNewUserConnection();
    });
    p5live.on('stream', gotOtherStream);
    p5live.on('disconnect', lostOtherStream);
    p5live.on('data', (data, id) => {
        console.log("Data event received for ID:", id);
        gotData(data, id);
    });
  
}


function mousePressed(){
    SendNewUserConnection();
}

function SendNewUserConnection() {
    if (!p5live || !p5live.socket || !p5live.socket.connected) {
        alert("not connected");
        return;
    }
    let dataToSend = {
        dataType: 'newUserConnection',
        userData: {
            name: userName,
            role: ROLES[currentRoleIndex]
        }
    };
    console.log("SendNewUserConnection ", userName, dataToSend);
    let dataToSendString = JSON.stringify(dataToSend);
    p5live.send(dataToSendString);
    console.log("SendNewUserConnection sent", dataToSendString);
}
let i = 0;
function draw() {
    background('blue');
    fill('red');
    textSize(20);

    switch (ROLES[currentRoleIndex]) {
        case ROLES[0]:
            text("CONTROLLER", width / 2, height / 2);
            break;
        case ROLES[1]:
            text("SPEAKER", 100, 100);
            break;
        case ROLES[2]:
            text("STICKER", 100, 100);
            break;
        case ROLES[3]:
            text("NONE", 100, 100);
            break;
    }
}

// We got a new stream!
function gotOtherStream(stream, id) {
    console.log("gotOtherStream ", allConnections[id]);
    otherVideo = stream;
    allConnections[id] = {
        'video': otherVideo,
        'name': id,
    }
    otherVideo.hide();
}

function lostOtherStream(id) {
    print("lost connection " + id)
    delete allConnections[id];
}


function gotData(data, id) {
    console.log("got data", data);

    let d = JSON.parse(data);

    if (d.dataType == 'newUserConnection') {
        allConnections[id] = {
            'name': d.userData.name,
            'role': d.userData.role
        };

        allConnections['Me'].role = GetNextRole();
        SendRoleChange();
    }

    if (d.dataType == 'roleChange' && allConnections[id]) {
        allConnections[id].role = d.role;
    }

    console.log(allConnections);
}
function GetNextRole() {
    if (currentRoleIndex == ROLES.length - 1) {
        return ROLES[currentRoleIndex];
    }
    currentRoleIndex++;
    let nextRole = ROLES[currentRoleIndex];
    return nextRole;
}

function SendRoleChange() {
    let dataToSend = {
        dataType: 'roleChange',
        role: allConnections['Me'].role
    };
    p5live.send(JSON.stringify(dataToSend));
}
