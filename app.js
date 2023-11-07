if (!localStorage.getItem("token") || localStorage.getItem("token") == "null") localStorage.setItem("loggedin", "false") let loggedin = localStorage.getItem("loggedin") let client = new tmi.Client({
    channels: ["ShortNoah"]
}) if (loggedin == "false") {
    console.log("hi") while (localStorage.getItem("username") == null || localStorage.getItem("username") == "null" || localStorage.getItem("token") == null || localStorage.getItem("token") == "null") {
        let token = prompt("Twitch oauth token - this can be obtained at https://twitchapps.com/tmi/") let username = prompt("Your Twitch username") localStorage.setItem("token", token) localStorage.setItem("username", username) if (username != null && token != null) localStorage.setItem("loggedin", "true")
    }
}
function b() {
    let token = prompt("Twitch oauth token - this can be obtained at https://twitchapps.com/tmi/") let username = prompt("Your Twitch username") localStorage.setItem("token", token) localStorage.setItem("username", username) if (username != null && token != null) localStorage.setItem("loggedin", "true")
}
if (localStorage.getItem("token")) loggedin = true
else loggedin = false
let params = (new URL(document.location)).searchParams
let token = params.get("channel") if (loggedin == true) {
    try {
        client = new tmi.Client({
            identity: {
                username: localStorage.getItem("username"),
                password: localStorage.getItem("token")
            },
            channels: [token]
        }) client.connect()
    } catch {
        alert("Your username/token is incorrect") b()
    }
}
let count = 0
let acc = true
let arr = []
let a = 0 client.on("message", (channel, tags, message, self) => {
    if (acc) {
        let english = document.createElement("button") english.innerText = "English"
        english.addEventListener("click", () => client.say(channel, "/timeout " + tags["display-name"] + " 600 English only, please!")) let ten = document.createElement("button") ten.innerText = "10 min"
        ten.addEventListener("click", () => client.say(channel, "/timeout " + tags["display-name"] + " 600")) let hour = document.createElement("button") hour.innerText = "1 hour"
        hour.addEventListener("click", () => client.say(channel, "/timeout " + tags["display-name"] + " 3600")) let ban = document.createElement("button") ban.innerText = "ban user"
        ban.addEventListener("click", () => client.say(channel, "/ban " + tags["display-name"])) let twitchMessage = document.createElement("ul") count++twitchMessage.id = "twitchMessage" + count
        let twitchMessageText = document.createTextNode(`${timeConverter(Date.now())}${tags["display-name"]}:${message}`) twitchMessage.appendChild(english) twitchMessage.appendChild(ten) twitchMessage.appendChild(hour) twitchMessage.appendChild(ban) twitchMessage.appendChild(twitchMessageText) document.getElementById("messagesComp").appendChild(twitchMessage) setFocusOnDivWithId("twitchMessage" + count)
    } else {
        arr[a] = `${timeConverter(Date.now())}${tags["display-name"]}:${message}`
        a++
    }
})
function search(ele) {
    if (loggedin) {
        if (ele.code == "Enter") {
            client.say(token, document.getElementById("chatbox").value) document.getElementById("chatbox").value = null
        }
    }
}
client.on("ban", (channel, username, reason, userstate) => {
    if (acc) {
        let twitchMessage = document.createElement("ul") count++twitchMessage.id = "twitchMessage" + count
        let twitchMessageText = document.createTextNode(`${timeConverter(Date.now())}[USER BAN]<${username}was banned from ${channel}>`) twitchMessage.appendChild(twitchMessageText) document.getElementById("messagesComp").appendChild(twitchMessage) setFocusOnDivWithId("twitchMessage" + count)
    } else {
        arr[a] = `${timeConverter(Date.now())}[USER BAN]<${username}was banned from ${channel}>`
        a++
    }
}) client.on("timeout", (channel, username, reason, duration, userstate) => {
    if (acc) {
        let twitchMessage = document.createElement("ul") count++twitchMessage.id = "twitchMessage" + count
        let twitchMessageText = document.createTextNode(`${timeConverter(Date.now())}[USER TIMEOUT]<${username}was timed out from ${channel}for ${duration}seconds>`) console.log(userstate) twitchMessage.appendChild(twitchMessageText) document.getElementById("messagesComp").appendChild(twitchMessage) setFocusOnDivWithId("twitchMessage" + count)
    } else {
        arr[a] = `${timeConverter(Date.now())}[USER TIMEOUT]<${username}was timed out from ${channel}for ${duration}seconds>`
        a++
    }
}) const u = localStorage.getItem("username") const t = localStorage.getItem("token")
function changeLoginInfo() {
    while (localStorage.getItem("username") == u || localStorage.getItem("token") == t) {
        let token = prompt("Twitch oauth token - this can be obtained at https://twitchapps.com/tmi/") let username = prompt("Your Twitch username") localStorage.setItem("token", token) localStorage.setItem("username", username) if (username != null && token != null) localStorage.setItem("loggedin", "true")
    }
}

function timeConverter(UNIX_timestamp) {
    let f = new Date(UNIX_timestamp).toLocaleTimeString("en-US") return `${f}|`
}

function setFocusOnDivWithId(elementId) {
    const scrollIntoViewOptions = {
        behavior: "auto",
        block: "center"
    }
    document.getElementById(elementId).scrollIntoView(scrollIntoViewOptions)
}

function go() {
    if (acc) {
        acc = false document.getElementById("pause").innerHTML = "Unpause chat"
    } else {
        acc = true document.getElementById("pause").innerHTML = "Pause chat"
        unpause()
    }
}

function unpause() {
    for (let i = 0; i < arr.length; i++) {
        let twitchMessage = document.createElement("ul") count++
        let button = document.createElement("button") button.innerText = "English"
        button.addEventListener("click", () => client.say(channel, "/timeout " + tags["display-name"] + " 600 English only, please!")) twitchMessage.id = "twitchMessage" + count
        let twitchMessageText = document.createTextNode(arr[i]) twitchMessage.appendChild(button) twitchMessage.appendChild(twitchMessageText) document.getElementById("messagesComp").appendChild(twitchMessage) setFocusOnDivWithId("twitchMessage" + count)
    }
    arr = [] a = 0
}

function login() {
    channel = prompt("Type the channel name below", "ShortNoah") window.location.href = ((window.location.href.includes("?channel=")) ? (window.location.href.replace(window.location.href.split("?")[1], "channel=" + channel)) : (window.location.href + "?channel=" + channel))
}
var sock = new WebSocket("wss://chat1.volume.com/ws/363/nxc5l112/websocket") sock.onopen = function() {
    console.log("Welcome to moderatorch.at!")
}
sock.onclose = function() {
    console.log("Closed")
}
