# moderatorch.at

## Description
A simple event chat moderation tool for Twitch streamers and moderators. This application allows moderators to manage chat effectively by providing features such as banning users, timing out users, and customizing moderation buttons.

## Features
- **User Management**: Ban or timeout users in the chat.
- **Customizable Buttons**: Create and manage custom moderation buttons.
- **Emote Support**: Support for Twitch emotes in chat.
- **User Autocomplete**: Autocomplete usernames while typing in the chat.

## Prerequisites
- Node.js (version 14 or higher)
- A Twitch Developer account to obtain your credentials.

## Setup Instructions
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/moderatorch.at.git
   cd moderatorch.at
   ```

2. **Install Dependencies**:
   Navigate to both the `backend` and `frontend` directories and run:
   ```bash
   npm install
   ```

3. **Create a `.env` File**:
   In the `backend` directory, create a `.env` file and add your Twitch credentials:
   ```
   TWITCH_CLIENT_ID=your_client_id
   TWITCH_CLIENT_SECRET=your_client_secret
   REDIRECT_URI=http://localhost:3000
   ```

4. **Run the Backend Server**:
   In the `backend` directory, start the server:
   ```bash
   npm start
   ```

5. **Run the Frontend**:
   Open `frontend/index.html` in your web browser.

## Usage Instructions
- Click the "Login with Twitch" button to authenticate.
- Enter the channel name you want to moderate in the input box.
- Use the moderation buttons to manage users in the chat.

## Important Notes
- Ensure that you have the necessary OAuth scopes for moderation:
  - `chat:read`
  - `chat:edit`
  - `channel:moderate`
  - `moderator:manage:banned_users`

- The application uses local storage to manage user sessions and settings.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## Why 'moderatorch.at'?
I call it moderatorch.at for two reasons\n
   a. The TLD '.at' is Austria, and I am an Austrian citizen\n
   b. I used to own the domain but no longer do
