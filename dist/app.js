"use strict";
const translationInput = document.getElementById('translationInput');
const sourceLangSelect = document.getElementById('sourceLanguage');
const targetlangSelect = document.getElementById('targetLanguage');
const repeatCountInput = document.getElementById('repeatCount');
const voiceRate = document.getElementById('voiceRate');
const voicePitch = document.getElementById('voicePitch');
const pauseDurationInput = document.getElementById('pauseDuration');
const voiceName = document.getElementById('voiceName');
const translateButton = document.getElementById('translateButton');
const resultOutput = document.getElementById('translatedResult');
const geminiInput = document.getElementById('geminiQuery');
const geminiButton = document.getElementById('askGemini');
const geminiOutput = document.getElementById('geminiResponse');
const apiUrl = 'https://generativeai.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent'; // Or the Gemini API endpoint
// Replace with your actual client ID and redirect URI
const CLIENT_ID = '428231091257-9tmnknivkkmmtpei2k0jrrvc4kg4g4jh.apps.googleusercontent.com';
const REDIRECT_URI = 'https://mbibawi.github.io/LearnItalianPWA/';
const SCOPES = 'https://www.googleapis.com/auth/userinfo.email';
const API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // Or the specific Gemini API scope
// Gemini query handler
geminiButton.onclick = async () => await askGemini();
translateButton.onclick = translateAndRepeat;
async function translateUsingGoogleFunction(accessToken, text, sourceLanguage, targetLanguage) {
    const body = {
        text: text,
        targetLanguage: targetLanguage || 'it', // Default to Italian if no target language is provided
        sourceLanguage: sourceLanguage || 'en', // Default to English if no source language is provided
        accessToken: accessToken,
    };
    const response = await fetch('https://translation-proxy-428231091257.europe-west1.run.app', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
    }
    return data.translatedText;
}
async function translateAndRepeat() {
    const accessToken = await getAccessToken();
    if (!accessToken)
        return console.log('Could not get accessToken');
    const text = translationInput.value;
    const targetLang = targetlangSelect.value;
    const sourceLanguage = sourceLangSelect.value;
    const pause = parseInt(pauseDurationInput.value) || 1;
    const count = parseInt(repeatCountInput.value) || 1;
    if (!text || !targetLang || !sourceLanguage)
        return;
    resultOutput.textContent = 'Translating with Gemini...';
    //const translation = await translateText(accessToken, text, targetLang);
    const rate = voiceRate.valueAsNumber || 1.0;
    const pitch = voicePitch.valueAsNumber || 1.0;
    const voice = getVoice(); // Get the selected voice
    const sentences = text.split('//');
    for (const sentence of sentences) {
        await processSentence(sentence.trim());
    }
    async function processSentence(sentence) {
        const translation = await translateUsingGoogleFunction(accessToken, sentence, sourceLanguage, targetLang);
        if (!translation)
            return;
        resultOutput.textContent = translation;
        await repeatText(translation, targetLang, count, pause, voice, rate, pitch); // Call the repeatText function with the translation
    }
    function getVoice() {
        const voice = voiceName.value;
        const voices = speechSynthesis.getVoices();
        return voices.find(v => v.name === voice);
    }
}
// Repetition logic with pause
async function repeatText(text, lang, count, pause, voice, rate = 1, pitch = 1) {
    for (let i = 0; i < count; i++) {
        speak(text, lang, voice, rate, pitch); // Speak the text with default rate and pitch
        await new Promise(resolve => setTimeout(resolve, (pause + 1) * 1000));
    }
}
// Speak text using SpeechSynthesis API
function speak(text, lang, voice, rate = 1, pitch = 1) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = `${lang.toLocaleLowerCase()}-${lang.toUpperCase()}`; // Set language for the utterance
    utterance.pitch = pitch; // Set the pitch for the utterance
    utterance.rate = rate; // Set the speaking rate
    if (voice) {
        utterance.voice = voice;
    }
    else {
        console.log(`Voice "${voiceName}" not found. Using default voice.`);
    }
    speechSynthesis.speak(utterance);
}
async function getAccessToken(prompt = false) {
    return new Promise((resolve, reject) => {
        // Ensure that CLIENT_ID and REDIRECT_URI are defined elsewhere in your code
        if (!CLIENT_ID || !REDIRECT_URI) {
            reject(new Error('CLIENT_ID or REDIRECT_URI is not defined.'));
            return;
        }
        // Initialize the Google Sign-In client
        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'openid profile email', // Adjust scopes as needed
                redirect_uri: REDIRECT_URI,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        resolve(tokenResponse.access_token);
                    }
                    else {
                        // Determine if user interaction is needed
                        const requiresInteraction = tokenResponse.error === 'consent_required' || tokenResponse.error === 'login_required' || tokenResponse.error === 'interaction_required';
                        // Handle errors from silent attempt
                        if (requiresInteraction) {
                            // User needs to grant consent or log in/select account
                            // Trigger the interactive flow with a user gesture
                            // (e.g., a button click)
                            console.log("Silent token acquisition failed. User interaction needed.");
                            // We DO NOT automatically call client.requestAccessToken() here again without a user gesture. This would lead to pop-up blockers.
                            if (confirm("Silent token acquisition failed. User interaction needed. Do you agree to manually login to your google account?"))
                                getAccessToken(true);
                            else
                                reject(new Error(`Failed to retrieve access token: ${tokenResponse.error || 'Unknown error'}`));
                        }
                    }
                },
            });
            client.requestAccessToken();
            // Attempt to get a token silently, prompting the user to select an account if needed
            //if (!prompt) client.requestAccessToken({ prompt: 'none' });
            //else client.requestAccessToken();
        }
        catch (error) {
            reject(new Error('User interaction required for token acquisition.'));
        }
    });
}
async function askGemini() {
}
//# sourceMappingURL=app.js.map