// OAuth Configuration
const TWITCH_CLIENT_ID = '3xvikrus4zshhm0o33684dtj6e98ao';
const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = ['chat:read', 'chat:edit', 'channel:moderate', 'moderator:manage:banned_users'];

let client;
let count = 0;
let acc = true;
let arr = [];
let a = 0;
let isHovering = false;
let activeUsers = new Set();
let autocompleteBox = null;
let emoteCache = new Map(); // Cache for emote URLs
let isResizing = false;
let initialX;
let initialWidth;
let customButtons = JSON.parse(localStorage.getItem('customButtons')) || [
    { text: "10m", action: "timeout", duration: 600, reason: "" },
    { text: "1h", action: "timeout", duration: 3600, reason: "" },
    { text: "Ban", action: "ban", duration: 0, reason: "" }
];
let userHasScrolled = false;
let lastScrollTop = 0;
let currentChannel = ''; // Add this line to define the channel variable

// Initialize the application
function initializeApp() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const accessToken = localStorage.getItem('access_token');
    
    // Get the channel parameter from the URL
    const channel = params.get('channel');

    // Set the currentChannel variable
    currentChannel = channel || ''; // Set to empty string if no channel is provided

    if (code) {
        handleCallback();
    } else if (!accessToken) {
        // Not logged in and no code - show login button
        document.getElementById('login').style.display = 'block';
        document.getElementById('welcome').style.display = 'none';
    } else {
        // Already have token - initialize chat and show welcome
        document.getElementById('login').style.display = 'none';
        document.getElementById('welcome').style.display = 'block';
        initializeTwitchClient(currentChannel); // Pass the currentChannel
    }
    
    setupScrollPause();
    createButtonEditor();
}

function login() {
    if (!localStorage.getItem('access_token')) {
        // If not logged in, proceed with OAuth flow
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('oauth_state', state);
        
        const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
            `client_id=${TWITCH_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
            `&state=${state}` +
            `&force_verify=true`;
        
        window.location.href = authUrl;
    }
}

async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = localStorage.getItem('oauth_state');
    const channel = params.get('channel');

    if (!code) return;

    if (state !== storedState) {
        console.error('State mismatch - possible CSRF attack');
        return;
    }

    try {
        // Exchange code for token using our backend
        const response = await fetch(`/auth/twitch/token?code=${code}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message);
        }

        localStorage.setItem('access_token', data.access_token);

        // Get user info
        const userResponse = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${data.access_token}`,
                'Client-Id': TWITCH_CLIENT_ID
            }
        });
        
        const userData = await userResponse.json();
        localStorage.setItem('username', userData.data[0].login);
        localStorage.setItem('user_id', userData.data[0].id);
        localStorage.setItem('loggedin', 'true');

        // Clear the OAuth state
        localStorage.removeItem('oauth_state');

        // Remove code from URL but keep channel parameter if it exists
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('code');
        cleanUrl.searchParams.delete('scope');
        cleanUrl.searchParams.delete('state');
        window.history.replaceState({}, document.title, cleanUrl);

        // Initialize chat client
        initializeTwitchClient(channel);

        // Show welcome message immediately after login
        document.getElementById('login').style.display = 'none';
        document.getElementById('welcome').style.display = 'block';
    } catch (error) {
        console.error('Authentication error:', error);
        alert('Authentication failed. Please try again.');
    }
}

async function initializeTwitchClient(channelParam) {
    const accessToken = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');
    
    if (!accessToken || !username) {
        return;
    }

    const channel = channelParam || 'NoahEHin'; // Default channel if none provided
    console.log('Initializing Twitch client for channel:', channel); // Log the channel

    const broadcasterId = await getBroadcasterId(channel); // Fetch broadcaster ID

    if (!broadcasterId) {
        console.error('Failed to retrieve broadcaster ID for channel:', channel);
        return; // Exit if broadcaster ID is not found
    }

    // Initialize emotes
    fetchGlobalEmotes();
    
    // Enable IRCv3 capabilities for emote support
    client = new tmi.Client({
        identity: {
            username: username,
            password: `oauth:${accessToken}`
        },
        channels: [channel]
    });

    // Add connected event handler
    client.on('connected', () => {
        showAlert(`Successfully connected to channel "${channel}"`);
    });

    // Move event handlers inside here
    client.on("message", (channel, tags, message, self) => {
        // Add username to active users set
        activeUsers.add(tags["display-name"]);
        
        if (acc) {
            const messageContainer = document.createElement("ul");
            messageContainer.id = "twitchMessage" + (++count);
            
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "message-actions";
            
            createModButtons(actionsDiv);
            
            const messageContent = document.createElement("div");
            messageContent.className = "message-content";
            
            const timestamp = document.createElement("span");
            timestamp.className = "timestamp";
            timestamp.textContent = timeConverter(Date.now());
            
            const username = document.createElement("span");
            username.className = "username";
            username.textContent = tags["display-name"];

            // Parse message with emotes
            const messageText = document.createElement("span");
            messageText.className = "message-text";
            messageText.innerHTML = `: ${parseEmotes(tags, message)}`;
            
            messageContent.appendChild(timestamp);
            messageContent.appendChild(username);
            messageContent.appendChild(messageText);
            
            messageContainer.appendChild(actionsDiv);
            messageContainer.appendChild(messageContent);
            
            document.getElementById("messagesComp").appendChild(messageContainer);
            setFocusOnDivWithId("twitchMessage" + count);
        } else {
            arr[a] = `${timeConverter(Date.now())} ${tags["display-name"]}: ${message}`;
            a++;
        }
    });

    client.on("ban", (channel, username, reason, userstate) => {
        if (acc) {
            const messageContainer = document.createElement("ul");
            messageContainer.id = "twitchMessage" + (++count);
            messageContainer.className = "system-message";
            const messageContent = document.createElement("div");
            messageContent.className = "message-content";
            messageContent.textContent = `${timeConverter(Date.now())} [USER BAN] <${username} was banned from ${channel}>`;
            messageContainer.appendChild(messageContent);
            document.getElementById("messagesComp").appendChild(messageContainer);
            setFocusOnDivWithId("twitchMessage" + count);
        } else {
            arr[a] = `${timeConverter(Date.now())} [USER BAN] <${username} was banned from ${channel}>`;
            a++;
        }
    });

    client.on("timeout", (channel, username, reason, duration, userstate) => {
        if (acc) {
            const messageContainer = document.createElement("ul");
            messageContainer.id = "twitchMessage" + (++count);
            messageContainer.className = "system-message";
            const messageContent = document.createElement("div");
            messageContent.className = "message-content";
            messageContent.textContent = `${timeConverter(Date.now())} [USER TIMEOUT] <${username} was timed out from ${channel} for ${duration} seconds>`;
            messageContainer.appendChild(messageContent);
            document.getElementById("messagesComp").appendChild(messageContainer);
            setFocusOnDivWithId("twitchMessage" + count);
        } else {
            arr[a] = `${timeConverter(Date.now())} [USER TIMEOUT] <${username} was timed out from ${channel} for ${duration} seconds>`;
            a++;
        }
    });

    // Connect to Twitch
    client.connect().catch(error => {
        console.error('Connection error:', error);
        if (error.message.includes('authentication failed')) {
            localStorage.clear();
            window.location.reload();
        }
    });

    // Update UI to show connected state
    const loginButton = document.getElementById('login');
    if (loginButton) {
        loginButton.innerHTML = 'Login with Twitch';
    }

    console.log('Access Token:', accessToken);
}

function applyChannel() {
    const channelInput = document.getElementById('channelInput');
    const channel = channelInput.value.trim();
    
    if (channel) {
        activeUsers.clear(); // Clear the users when changing channels
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.set('channel', channel);
        window.location.href = cleanUrl.toString();
    }
}

function search(ele) {
    const chatbox = document.getElementById("chatbox");
    
    if (ele.key === '@') {
        // Only show matches if @ is at start or after a space
        if (chatbox.value === '' || chatbox.value.endsWith(' ')) {
            showUserMatches(chatbox.value + '@');
        }
    } else if (ele.code === "Enter") {
        hideAutocompleteBox();
        const channel = new URLSearchParams(window.location.search).get('channel');
        
        if (!channel) {
            showAlert("Please enter a channel name before sending a message.", true);
            return;
        }
        
        client.say(channel, chatbox.value);
        chatbox.value = null;
    } else if (ele.code === "Backspace") {
        // Check if we should hide the box after backspace
        setTimeout(() => {
            if (!chatbox.value.includes('@')) {
                hideAutocompleteBox();
            } else {
                showUserMatches(chatbox.value);
            }
        }, 0);
    } else {
        showUserMatches(chatbox.value);
    }
}

function showAlert(message, highlightInput = false) {
    // Only add red border if highlightInput is true
    if (highlightInput) {
        const channelInput = document.getElementById('channelInput');
        channelInput.classList.add('alert-border');
        
        // Remove red border after delay
        setTimeout(() => {
            channelInput.classList.remove('alert-border');
        }, 3000);
    }

    // Create chat-style message
    let twitchMessage = document.createElement("ul");
    twitchMessage.id = "twitchMessage";
    twitchMessage.className = "system-message";
    
    // Create message container without gap
    let messageContainer = document.createElement("div");
    messageContainer.style.display = "flex";
    messageContainer.style.gap = "0";
    
    // Create username span with green color
    let username = document.createElement("span");
    username.style.color = "#2ecc71";
    username.textContent = "moderatorch.at";
    
    // Create colon with default color
    let colon = document.createElement("span");
    colon.textContent = ":";
    
    // Create message text
    let messageText = document.createTextNode(" " + message);
    
    // Append elements to container
    messageContainer.appendChild(username);
    messageContainer.appendChild(colon);
    
    // Append container and message to twitchMessage
    twitchMessage.appendChild(messageContainer);
    twitchMessage.appendChild(messageText);
    
    document.getElementById("messagesComp").appendChild(twitchMessage);
}

function go() {
    acc = !acc;
    document.getElementById("pause").innerHTML = acc ? "Pause Chat" : "Resume Chat";
    if (acc) {
        arr.forEach(message => {
            let twitchMessage = document.createElement("ul");
            count++;
            twitchMessage.id = "twitchMessage" + count;
            let twitchMessageText = document.createTextNode(message);
            twitchMessage.appendChild(twitchMessageText);
            document.getElementById("messagesComp").appendChild(twitchMessage);
        });
        arr = [];
        a = 0;
    }
}

function timeConverter(UNIX_timestamp) {
    let f = new Date(UNIX_timestamp).toLocaleTimeString("en-US");
    return `${f} | `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupResize();
    setupScrollPause();
    setupPageScrollDetection();
});

function setupScrollPause() {
    const messagesBox = document.getElementById("box");
    const chatContainer = document.querySelector('.main-content');
    
    // Handle hover on the chat box
    messagesBox.addEventListener('mouseenter', () => {
        isHovering = true;
    });
    
    messagesBox.addEventListener('mouseleave', () => {
        isHovering = false;
        // When mouse leaves, scroll to the latest message
        const latestMessage = document.getElementById("twitchMessage" + count);
        if (latestMessage) {
            messagesBox.scrollTo({
                top: messagesBox.scrollHeight,
                behavior: 'smooth'
            });
        }
    });
}

function setupPageScrollDetection() {
    window.addEventListener('scroll', () => {
        userHasScrolled = true;
    });
}

function setFocusOnDivWithId(elementId) {
    if (isHovering) return; // Don't scroll if hovering
    
    const messagesBox = document.getElementById("box");
    if (messagesBox) {
        messagesBox.scrollTo({
            top: messagesBox.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Add this function to create the autocomplete box
function createAutocompleteBox() {
    if (!autocompleteBox) {
        autocompleteBox = document.createElement('div');
        autocompleteBox.className = 'autocomplete-box';
        document.querySelector('.main-content').appendChild(autocompleteBox);
    }
}

// Add this function to handle username matching
function showUserMatches(input) {
    // Check if @ is preceded by any character (no space)
    const lastAtSymbolIndex = input.lastIndexOf('@');
    if (lastAtSymbolIndex > 0 && input[lastAtSymbolIndex - 1] !== ' ') {
        hideAutocompleteBox();
        return;
    }

    // Check if there's still an @ symbol in the input
    if (!input.includes('@')) {
        hideAutocompleteBox();
        return;
    }

    const match = input.match(/(?:^|\s)@(\w*)$/);
    if (!match) {
        hideAutocompleteBox();
        return;
    }

    const prefix = match[1].toLowerCase();
    const matches = Array.from(activeUsers)
        .filter(user => user.toLowerCase().startsWith(prefix))
        .slice(0, 5);

    if (matches.length === 0) {
        hideAutocompleteBox();
        return;
    }

    showAutocompleteBox(matches, prefix.length);
}

function showAutocompleteBox(matches, prefixLength) {
    createAutocompleteBox();
    const chatbox = document.getElementById('chatbox');
    const rect = chatbox.getBoundingClientRect();
    
    autocompleteBox.innerHTML = matches
        .map(user => `<div class="autocomplete-item">${user}</div>`)
        .join('');
    
    autocompleteBox.style.display = 'block';
    autocompleteBox.style.left = `${rect.left}px`;
    autocompleteBox.style.top = `${rect.top - autocompleteBox.offsetHeight}px`;

    // Add click handlers
    autocompleteBox.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const currentText = chatbox.value;
            const newText = currentText.replace(/@\w*$/, `@${item.textContent} `);
            chatbox.value = newText;
            hideAutocompleteBox();
            chatbox.focus();
        });
    });
}

function hideAutocompleteBox() {
    if (autocompleteBox) {
        autocompleteBox.style.display = 'none';
    }
}

// Add function to fetch global emotes when initializing
async function fetchGlobalEmotes() {
    try {
        const accessToken = localStorage.getItem('access_token');
        const response = await fetch('https://api.twitch.tv/helix/chat/emotes/global', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': TWITCH_CLIENT_ID
            }
        });
        const data = await response.json();
        
        // Cache the emotes
        data.data.forEach(emote => {
            emoteCache.set(emote.name, emote.images.url_1x);
        });
    } catch (error) {
        console.error('Error fetching global emotes:', error);
    }
}

// Function to parse emotes from tags
function parseEmotes(tags, message) {
    if (!tags.emotes) return message;

    // Sort emotes by position to replace from end to start
    let replacements = [];
    for (let emoteId in tags.emotes) {
        tags.emotes[emoteId].forEach(position => {
            const [start, end] = position.split('-').map(Number);
            replacements.push({
                id: emoteId,
                start,
                end,
                text: message.substring(start, end + 1)
            });
        });
    }
    replacements.sort((a, b) => b.start - a.start);

    // Replace emotes with img tags
    let html = message;
    replacements.forEach(({ id, start, end, text }) => {
        const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/light/1.0`;
        const imgTag = `<img src="${emoteUrl}" alt="${text}" class="chat-emote" />`;
        html = html.substring(0, start) + imgTag + html.substring(end + 1);
    });

    return html;
}

// Add resize functionality setup
function setupResize() {
    const mainContent = document.querySelector('.main-content');
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    mainContent.appendChild(handle);

    handle.addEventListener('mousedown', initResize);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
}

function initResize(e) {
    isResizing = true;
    initialX = e.clientX;
    const mainContent = document.querySelector('.main-content');
    initialWidth = mainContent.offsetWidth;
    e.target.classList.add('active');
    e.preventDefault();
}

function handleResize(e) {
    if (!isResizing) return;
    
    const mainContent = document.querySelector('.main-content');
    const width = initialWidth + (e.clientX - initialX);
    
    // Enforce minimum and maximum widths
    const minWidth = 400;
    const maxWidth = window.innerWidth - 340; // Account for control panel and gaps
    mainContent.style.width = `${Math.min(Math.max(width, minWidth), maxWidth)}px`;
}

function stopResize(e) {
    if (isResizing) {
        document.querySelector('.resize-handle').classList.remove('active');
        isResizing = false;
    }
}

// Add function to save buttons to localStorage
function saveButtons() {
    localStorage.setItem('customButtons', JSON.stringify(customButtons));
}

// Add function to create button editor UI
function createButtonEditor() {
    const editorSection = document.createElement('div');
    editorSection.className = 'button-editor-section';
    editorSection.innerHTML = `
        <h3>Customize Moderation Buttons</h3>
        <div id="buttonList"></div>
        <button onclick="addNewButton()" class="secondary-button">Add New Button</button>
    `;
    
    document.querySelector('.control-buttons').appendChild(editorSection);
    updateButtonList();
}

function updateButtonList() {
    const buttonList = document.getElementById('buttonList');
    buttonList.innerHTML = '';
    
    customButtons.forEach((btn, index) => {
        const buttonEditor = document.createElement('div');
        buttonEditor.className = 'button-editor';
        buttonEditor.innerHTML = `
            <div class="button-edit-row">
                <input type="text" value="${btn.text}" placeholder="Button Text" 
                       data-index="${index}" data-field="text">
                <select data-index="${index}" data-field="action">
                    <option value="timeout" ${btn.action === 'timeout' ? 'selected' : ''}>Timeout</option>
                    <option value="ban" ${btn.action === 'ban' ? 'selected' : ''}>Ban</option>
                </select>
                ${btn.action === 'timeout' ? `
                    <input type="number" value="${btn.duration}" placeholder="Duration (seconds)"
                           data-index="${index}" data-field="duration">
                ` : ''}
                <input type="text" value="${btn.reason}" placeholder="Reason (optional)"
                       data-index="${index}" data-field="reason">
                <div class="button-actions">
                    <button onclick="applyButtonChanges(${index})" class="secondary-button">Apply</button>
                    <button onclick="removeButton(${index})" class="secondary-button">Remove</button>
                    <span class="checkmark" id="checkmark-${index}">✓</span>
                </div>
            </div>
        `;
        buttonList.appendChild(buttonEditor);
    });
}

function applyButtonChanges(index) {
    const editor = document.querySelector(`.button-editor:nth-child(${index + 1})`);
    const inputs = editor.querySelectorAll('input, select');
    let changed = false;

    inputs.forEach(input => {
        const field = input.dataset.field;
        const value = field === 'duration' ? parseInt(input.value) : input.value;
        
        if (customButtons[index][field] !== value) {
            customButtons[index][field] = value;
            changed = true;
        }
    });

    if (changed) {
        saveButtons();
        updateModButtons();
        showCheckmark(index);
    }
}

function showCheckmark(index) {
    const checkmark = document.getElementById(`checkmark-${index}`);
    checkmark.classList.add('show');
    
    setTimeout(() => {
        checkmark.classList.remove('show');
    }, 1500); // Hide checkmark after 1.5 seconds
}

function removeButton(index) {
    customButtons.splice(index, 1);
    saveButtons();
    updateButtonList();
    updateModButtons();
}

function addNewButton() {
    customButtons.push({
        text: "New Button",
        action: "timeout",
        duration: 600,
        reason: ""
    });
    saveButtons();
    updateButtonList();
    updateModButtons();
}

// Modify the existing message handler to use custom buttons
function updateModButtons() {
    // Update all existing message containers with new buttons
    document.querySelectorAll('.message-actions').forEach(actionsDiv => {
        actionsDiv.innerHTML = '';
        createModButtons(actionsDiv);
    });
}

function createModButtons(actionsDiv) {
    customButtons.forEach(btn => {
        const button = document.createElement("button");
        button.innerText = btn.text;
        button.addEventListener("click", async () => {
            const messageContainer = actionsDiv.closest('ul');
            const username = messageContainer.querySelector('.username').textContent;
            const userId = await getUserId(username); // Function to get user ID from username

            if (btn.action === 'timeout' || btn.action === 'ban') {
                const reason = btn.reason || ""; // Reason for ban or timeout
                const duration = btn.action === 'timeout' ? btn.duration : undefined; // Duration only for timeout

                if (!userId) {
                    console.error('Failed to retrieve user ID for:', username);
                    return; // Exit if user ID is not found
                }

                // Call the Twitch API to ban or timeout the user
                await manageUserBanOrTimeout(userId, btn.action, duration, reason);
            }
        });
        actionsDiv.appendChild(button);
    });
}

// Function to manage ban or timeout
async function manageUserBanOrTimeout(userId, action, duration, reason) {
    const accessToken = localStorage.getItem('access_token');
    const broadcasterId = await getBroadcasterId(currentChannel); // Get the broadcaster ID
    const moderatorId = localStorage.getItem('user_id'); // Get the stored user ID

    // Log the relevant information
    console.log('Broadcaster ID:', broadcasterId);
    console.log('Moderator ID:', moderatorId);
    console.log('Username:', localStorage.getItem('username'));

    const bodyData = {
        data: {
            user_id: userId,
            reason: reason
        }
    };

    // Include duration for timeout
    if (action === 'timeout') {
        bodyData.data.duration = duration; // Add duration for timeout
    }

    const response = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': TWITCH_CLIENT_ID,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
        const error = await response.json();
        console.error(`Error ${action === 'timeout' ? 'timing out' : 'banning'} user:`, error);
    } else {
        console.log(`User ${action === 'timeout' ? 'timed out' : 'banned'} successfully`);
    }
}

// Function to get user ID from username
async function getUserId(username) {
    const accessToken = localStorage.getItem('access_token');
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': TWITCH_CLIENT_ID
        }
    });

    if (!response.ok) {
        console.error('Error fetching user ID:', await response.text());
        return null; // Return null if there's an error
    }

    const data = await response.json();
    if (data.data.length === 0) {
        console.error('No user found for username:', username);
        return null; // Return null if no user is found
    }

    return data.data[0]?.id; // Return the user ID
}

async function validateToken(accessToken) {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await response.json();
    console.log('Token validation:', data);
}

// Function to get broadcaster ID from channel name
async function getBroadcasterId(channel) {
    const accessToken = localStorage.getItem('access_token');
    
    // Log the channel name to ensure it's correct
    console.log('Fetching broadcaster ID for channel:', channel);

    const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Client-Id': TWITCH_CLIENT_ID
        }
    });

    // Log the response status and text for debugging
    console.log('Response Status:', response.status);
    const responseText = await response.text();
    console.log('Response Text:', responseText);

    if (!response.ok) {
        console.error('Error fetching broadcaster ID:', responseText);
        return null; // Return null if there's an error
    }

    const data = JSON.parse(responseText);
    if (data.data.length === 0) {
        console.error('No user found for channel:', channel);
        return null; // Return null if no user is found
    }

    // Return the broadcaster ID
    return data.data[0].id; // Return the broadcaster ID
}
