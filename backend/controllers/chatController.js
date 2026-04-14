const { GoogleGenAI } = require('@google/genai');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Default key or placeholder
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSy_YOUR_API_KEY_HERE';

// Standard initialization for the new SDK
const ai = new GoogleGenAI({ apiKey: apiKey });

exports.askGemini = async (req, res) => {
    try {
        const { message, role, fallbackEmail } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        let userEmail = fallbackEmail || null;

        // Try to decode JWT and fetch email if present
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123'); // Ensure this matches authController
                const user = await User.findById(decoded.id);
                if (user) {
                    userEmail = user.email;
                }
            } catch (e) {
                console.log('Token verification failed in chatController:', e.message);
                // Just continue without email
            }
        }

        // Trigger manual email fallback if missing (and required by context, e.g. role is not guest)
        if (!userEmail && role && role !== 'guest' && role !== 'unknown') {
            return res.status(200).json({
                requiresEmail: true,
                reply: 'I need your email address to assist with this. Please enter your email manually:'
            });
        }

        // System instructions to guide the bot's persona
        const systemInstruction = `You are a helpful, friendly, and concise chatbot assistant for the "Campus Event Hub" platform. 
    You help students and college administrators manage, discover, and organize college events.
    Keep your answers short (under 3 sentences) and formatted cleanly for a chat window. 
    Do not use complex markdown, but bolding and emojis are encouraged.
    If the user asks about logging in or registering (especially if they are a 'guest'), provide clear, step-by-step instructions. For example:
    Register: 1. Click 'Sign Up' 2. Fill in your details (Role, College, etc.) 3. Click 'Create Account'.
    Login: 1. Click 'Login' 2. Enter your email and password 3. Click 'Login'.
    The user asking this question is logged in as a: ${role || 'guest'}.
    The user's email is: ${userEmail || 'unknown'}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        res.status(200).json({ reply: response.text });
    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ message: 'Failed to generate response', error: error.message });
    }
};
