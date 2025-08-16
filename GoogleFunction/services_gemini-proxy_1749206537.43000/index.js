// Import necessary modules
const { GoogleGenAI } = require("@google/genai");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash";

// Initialize the Google Generative AI client
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Initialize the Text-to-Speech client
const textToSpeechClient = new TextToSpeechClient();

// --- Helper Functions (Shared by multiple endpoints) ---

async function getAudioFromSentence(sentence, voiceParams, audioConfig) {
    if (!sentence) {
        console.warn("Attempted to get audio for an empty sentence.");
        return null;
    }
    const request = {
        input: { ssml: sentence },
        voice: voiceParams,
        audioConfig: audioConfig,
    };
    try {
        const [response] = await textToSpeechClient.synthesizeSpeech(request);
        const audioContentBase64 = response.audioContent.toString("base64");
        console.log(`Text-to-Speech API successful for sentence: "${sentence.substring(0, 50)}..."`);
        return {
            text: sentence,
            audio: audioContentBase64,
        };
    } catch (ttsError) {
        console.error(`Error synthesizing speech for sentence: "${sentence.substring(0, 50)}..."`, ttsError);
        throw new Error(`Text-to-Speech failed: ${ttsError.message}`);
    }
}

async function callGemini(prompt, jsonResponse = false) {
    console.log("Calling Gemini API with query:", prompt);

    if(!genAI) throw new Error('genAI is undefined');

    //const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

    const generateContentRequest = {
        model: GEMINI_MODEL_NAME,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    if (jsonResponse) {
        generateContentRequest.generationConfig = {
            responseMimeType: "application/json"
        };
    }

    try {
        const result = await genAI.models.generateContent(generateContentRequest);
        console.log(result);
        let text = result.text;

        if (!text) throw new Error("Gemini API failed to return text content.");

        text = text.trim();

        if (!jsonResponse) return text;

        const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
        const match = text.match(fenceRegex);
        if (match && match[1]) {
            text = match[1].trim();
        }

        const sentences = JSON.parse(text);

        if (!Array.isArray(sentences) || !sentences.every(s => typeof s === 'string') || sentences.length === 0) {
            throw new Error(`Gemini did not return a valid JSON array of strings. Response: \n ${text}`);
        }

        return sentences;

    } catch (geminiError) {
        console.error("Error during Gemini API call:", geminiError.message);
        if (geminiError.response && geminiError.response.error) {
            console.error("Gemini API raw error response:", JSON.stringify(geminiError.response.error));
        }
        throw new Error(`Gemini API failed: ${geminiError.message}`);
    }
}

// --- Specific Route Handlers ---

/**
 * Handles requests to /api/sentences to generate multiple sentences and their audio.
 * @param {object} req The HTTP request object.
 * @param {object} res The HTTP response object.
 */
async function handleApiSentences(req, res) {
    if (req.method !== 'POST') {
        res.status(405).send("Method Not Allowed");
        return;
    }

    console.log("Received request for /api/sentences. Request body:", req.body);

    const { query, voiceParams, audioConfig } = req.body;

    if (!query || !voiceParams || !audioConfig) {
        return res.status(400).json({ message: "Missing required parameters. Ensure query, sourceLanguage, targetLanguage, voiceParams, audioConfig, sentencesNumber, and wordsNumber are provided." });
    }

    if (!GEMINI_API_KEY) {
        console.error("Gemini API Key is not configured on the server.");
        return res.status(500).json({ error: "Server configuration error: Gemini API Key missing." });
    }

    try {
        const sentences = await callGemini(query, true);
        console.log("Gemini API successful. Generated text:", sentences);

        console.log("Calling Text-to-Speech API for text:");
        const audios = [];
        for (let sentence of sentences) {
            audios.push(await getAudioFromSentence(sentence.trim(), voiceParams, audioConfig));
        }
        return res.status(200).json({ sentences: audios });
    } catch (error) {
        console.error("Error in /api/sentences route:", error.message);
        console.error("Error details:", JSON.stringify(error));
        return res.status(500).json({
            error: "Failed to process request for sentences.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
}

/**
 * Handles requests to /api/ask to get a single answer and its audio.
 * @param {object} req The HTTP request object.
 * @param {object} res The HTTP response object.
 */
async function handleApiAsk(req, res) {
    if (req.method !== 'POST') {
        res.status(405).send("Method Not Allowed");
        return;
    }

    console.log("Received request for /api/ask. Request body:", req.body);

    const { query, voiceParams, audioConfig, noAudio } = req.body;

    if (!query || !voiceParams || !audioConfig) {
        return res.status(400).json({ message: "Missing required parameters. Ensure query, voiceParams, and audioConfig are provided." });
    }

    if (!GEMINI_API_KEY) {
        console.error("Gemini API Key is not configured on the server.");
        return res.status(500).json({ error: "Server configuration error: Gemini API Key missing." });
    }

    try {
        const responseText = await callGemini(query);
        console.log("Gemini API successful. Generated text:", responseText);
        
        if(responseText && noAudio) return res.status(200).json({response:{text: responseText, audio: null}});
        
        console.log("Calling Text-to-Speech API for text");
        const audio = await getAudioFromSentence(responseText.trim(), voiceParams, audioConfig);
        return res.status(200).json({ response: audio });
    } catch (error) {
        console.error("Error in /api/ask route:", error.message);
        console.error("Error details:", JSON.stringify(error));
        return res.status(500).json({
            error: "Failed to process request for ask.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
}

// --- Main Cloud Function Entry Point ---
exports.geminiProxy = async (req, res) => {
    // Manually handle CORS headers (essential for your PWA)
    res.set('Access-Control-Allow-Origin', 'https://mbibawi.github.io'); // Adjust this to your PWA's domain for security
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600'); // Cache preflight response for 1 hour

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // --- Centralized Routing Logic ---
    if (req.path === '/') {
        if (req.method === 'GET') {
            res.status(200).send("Gemini proxy with TTS function is running.");
        } else {
            res.status(405).send("Method Not Allowed");
        }
    } else if (req.path === '/api/sentences') {
        await handleApiSentences(req, res); // Call the dedicated handler function
    } else if (req.path === '/api/ask') {
        await handleApiAsk(req, res); // Call the dedicated handler function
    } else {
        // Default catch-all for unknown paths
        res.status(404).send("Not Found");
    }
};