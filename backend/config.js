import dotenv from 'dotenv';
dotenv.config(); // Load environment variables

export const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
export const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
export const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000';
