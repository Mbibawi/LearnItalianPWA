"use strict";
(function () {
    const swPath = './service-worker.js'; // Define your service worker path here
    /**
     * Checks if a service worker is registered. If not, it attempts to register it.
     * This function logs its actions and does not return a value directly,
     * but the underlying registration process is asynchronous.
     */
    async function ensureServiceWorkerRegisteredInternal() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Workers are not supported in this browser.');
            return; // Exit if not supported
        }
        // Check if a service worker is already controlling this page
        if (navigator.serviceWorker.controller) {
            console.log('Service Worker is already registered and active.');
            // Optionally, you could still wait for it to be ready if you need the registration object
            // navigator.serviceWorker.ready.then(registration => {
            //   console.log('Existing Service Worker Registration:', registration);
            // });
            return; // Exit if already active
        }
        // If no service worker is controlling, attempt to register
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register(swPath);
                console.log('Service Worker registered successfully:', registration.scope);
            }
            catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        });
    }
    // Automatically call the function when this script loads
    ensureServiceWorkerRegisteredInternal();
})();
const sourceLangSelect = document.getElementById('sourceLanguage');
const targetLangSelect = document.getElementById('targetLanguage');
const repeatCountInput = document.getElementById('repeatCount');
const voiceRate = document.getElementById('voiceRate');
const voicePitch = document.getElementById('voicePitch');
const pauseInput = document.getElementById('pauseDuration');
const voiceName = document.getElementById('voiceName');
const geminiInput = document.getElementById('geminiQuery');
const geminiOutput = document.getElementById('geminiResponse');
const sendQueryBtn = document.getElementById('askGemini');
const sentencesBtn = document.getElementById('getSentences');
const CLIENT_ID = '428231091257-9tmnknivkkmmtpei2k0jrrvc4kg4g4jh.apps.googleusercontent.com'; //Google Client ID for the gemini API
const REDIRECT_URI = 'https://mbibawi.github.io/LearnItalianPWA/';
const SCOPES = 'https://www.googleapis.com/auth/userinfo.email';
const API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // Or the specific Gemini API scope
// Gemini Buttons Handleers
sentencesBtn.onclick = getSentences;
sendQueryBtn.onclick = askGemini;
// Language selection handlers
(function populateVoiceOptions() {
    const voices = [
        // English (US)
        { text: "English (US) (Male)", name: "Standard-A", lang: "US" },
        { text: "English (US) (Male)", name: "Standard-B", lang: "US" },
        { text: "English (US) (Female)", name: "Standard-C", lang: "US" },
        { text: "English (US) (Male)", name: "Standard-D", lang: "US" },
        { text: "English (US) (Female)", name: "Standard-E", lang: "US" },
        { text: "English (US) (Female)", name: "Standard-F", lang: "US" },
        { text: "English (US) (Female)", name: "Standard-G", lang: "US" },
        { text: "English (US) (Female)", name: "Standard-H", lang: "US" },
        { text: "English (US) (Male)", name: "Standard-I", lang: "US" },
        { text: "English (US) (Male)", name: "Standard-J", lang: "US" },
        // English (GB)
        { text: "English (GB) (Female)", name: "Standard-A", lang: "GB" },
        { text: "English (GB) (Male)", name: "Standard-B", lang: "GB" },
        { text: "English (GB) (Female)", name: "Standard-C", lang: "GB" },
        { text: "English (GB) (Male)", name: "Standard-D", lang: "GB" },
        { text: "English (GB) (Female)", name: "Standard-F", lang: "GB" },
        // French (FR)
        { text: "French (FR) (Female)", name: "Standard-A", lang: "FR" },
        { text: "French (FR) (Male)", name: "Standard-B", lang: "FR" },
        { text: "French (FR) (Female)", name: "Standard-C", lang: "FR" },
        { text: "French (FR) (Male)", name: "Standard-D", lang: "FR" },
        // Italian (IT)
        { text: "Italian (IT) (Female)", name: "Standard-A", lang: "IT" },
        { text: "Italian (IT) (Female)", name: "Standard-B", lang: "IT" },
        { text: "Italian (IT) (Female)", name: "Standard-C", lang: "IT" },
        { text: "Italian (IT) (Female)", name: "Standard-D", lang: "IT" },
        { text: "Italian (IT) (Female)", name: "Standard-E", lang: "IT" },
    ];
    // Populate the voice selection dropdown with available voices
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.lang = voice.lang; // Set the language attribute for the option
        option.value = `${voice.lang.toLowerCase()}-${voice.lang.toLowerCase()}-${voice.name}`; // e.g., 'en-US-Standard-A'
        option.textContent = voice.text;
        voiceName.appendChild(option);
    });
})();
// Initialize the voice selection dropdown with the first option as default
(function initializeInputs() {
    // Load settings from localStorage if available 
    const settings = localStorage.geminiSettings ? JSON.parse(localStorage.geminiSettings) : null;
    if (!settings)
        return;
    sourceLangSelect.value = settings.sourceLanguage; // Default to English
    targetLangSelect.value = settings.targetLanguage; // Default to English
    pauseInput.value = settings.pauseDuration || '1.0'; // Default to 1 second
    repeatCountInput.value = settings.repeatCount || '1'; // Default to 1
    voiceRate.value = settings.voiceRate || '1'; // Default to normal rate 
    voiceName.value = settings.voiceName || ''; // Default voice
})();
/**
 * Asks Gemini API for a response based on the input query.
 * This function retrieves the access token, constructs the request,
 * and plays the audio response.
 * @returns {Promise<void>} A promise that resolves when the audio is played.
 */
async function askGemini() {
    const cloudFunctionUrl = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/ask';
    //const accessToken = await getAccessToken();
    //if (!accessToken) return console.log('Could not get accessToken');
    geminiOutput.textContent = 'Asking Gemini...';
    const data = await callCloudFunction(cloudFunctionUrl); // Call the askGemini function with the cloud function URL
    const response = data.response;
    if (response)
        throw new Error('No response received from Gemini API');
    geminiOutput.textContent = "";
    await playAudio(response);
}
/**
 * Retrieves the access token for Google APIs.
 * This function is a placeholder and should be implemented to fetch the token.
 * @returns {Promise<string>} A promise that resolves to the access token.
 */
async function getSentences() {
    const cloudFunctionUrl = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/sentences';
    const sentencesNumber = prompt('How many sentences do you want to get from Gemini? (default is 3)');
    const wordsNumber = prompt('Do you want to set the maximum number of words for each sentence ?');
    const params = {
        sourceLanguage: sourceLangSelect.value || '', // Default to English if not selected
        targetLanguage: targetLangSelect.value || '',
        sentencesNumber: isNaN(Number(sentencesNumber)) ? 3 : Number(sentencesNumber), // Default to 5 sentences if not provided
        wordsNumber: isNaN(Number(wordsNumber)) ? 10 : Number(wordsNumber),
    };
    const data = await callCloudFunction(cloudFunctionUrl, params); // Call the askGemini function with the cloud function URL
    const sentences = data.sentences; // Extract sentences from the response
    if (!data.sentences)
        throw new Error('No sentences received from Gemini API');
    geminiOutput.textContent = "";
    const repeatCount = parseInt(repeatCountInput.value) || 1;
    const pause = parseInt(pauseInput.value) * 1000 || 1000;
    const results = [];
    for (const sentence of sentences) {
        results.push(await playAudio(sentence, repeatCount, pause)); // Collect results
    }
    ;
}
;
/**
 * Plays audio for a given text and Base64 encoded audio data.
 * @param {Object} params - The parameters for the audio playback.
 * @param {string} params.text - The text to display in the UI.
 * @param {string} params.audioBase64 - The Base64 encoded audio data.
 * @param {number} [repeatCount=1] - The number of times to repeat the audio playback.
 * @param {number} [pause=1000] - The pause duration between repetitions in milliseconds.
 */
async function playAudio({ text, audioBase64 }, repeatCount = 1, pause = 1000) {
    console.log('Playing audio for sentence:', text);
    // Display the text in the UI
    geminiOutput.textContent = `${geminiOutput.textContent}\n${text}`;
    if (!audioBase64)
        return alert('No audio data received or MIME type missing.');
    const repeat = Array(repeatCount).fill(0).map((_, i) => i); // Create an array to repeat the audio
    const player = document.getElementById('audioPlayer') || document.createElement('audio'); // Create or get the audio player
    player.id = 'audioPlayer';
    player.src = ''; // Clear the source initially
    player.style.display = 'block'; // Ensure the audio player is visible
    player.controls = true; // Enable controls for the audio player
    player.autoplay = false; // Disable autoplay
    geminiOutput.insertAdjacentElement('beforebegin', player); // Insert the audio player before the output div
    const audioSrc = `data:audio/mp3;base64,${audioBase64}`;
    player.src = audioSrc;
    for (const play of repeat) {
        player.currentTime = 0; // Reset to start
        await player.play();
        await delay(pause);
    }
    console.log('Audio sentences played successfully.');
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function getAudioURL(audio, mimeType) {
        // Decode the Base64 audio string
        const audioBlob = b64toBlob(audio, mimeType);
        const audioUrl = URL.createObjectURL(audioBlob);
        return audioUrl; // Return both if needed
    }
    function b64toBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }
}
/**
 * Calls a cloud function with the provided URL and parameters.
 * @param {string} url - The URL of the cloud function to call.
 * @param {Object} [params] - Optional parameters to include in the request body.
 * @returns {Promise<any>} A promise that resolves to the response from the cloud function.
 */
async function callCloudFunction(url, params) {
    // const accessToken = await getAccessToken();
    const query = geminiInput.value.trim();
    if (!query)
        return alert('Please enter a query to send to Gemini');
    let lang = targetLangSelect.options[targetLangSelect.selectedIndex].lang || prompt('You must select a target language'); // Default to Italian if no target language is selected
    if (!lang)
        return alert('No target language selected. We will exit the function');
    lang = `${lang.toLowerCase()}-${lang.toUpperCase()}`; // e.g., 'it-IT' for Italian 
    const defaultVoice = voiceName.options[0].value; // Default voice from the first option
    const voiceParams = {
        languageCode: lang,
        name: voiceName.value || prompt('Provide the voice name', defaultVoice) || defaultVoice, // Example standard voice
    };
    const audioConfig = {
        audioEncoding: 'MP3', // Or 'LINEAR16' for uncompressed WAV
        speakingRate: voiceRate.valueAsNumber || 1.0, // 0.25 to 4.0 (1.0 is normal)
        // pitch: voicePitch.valueAsNumber || 1.0,  // -20.0 to 20.0 (0.0 is normal)
        //  volumeGainDb: 0.0,  // -96.0 to 16.0 (0.0 is normal)
        // effectsProfileId: ['small-bluetooth-speaker-effect'], // Optional, for specific audio profiles
    };
    voiceName.value = voiceParams.name; // Set the voice name in the UI;
    setLocalStorage(); // Save settings to localStorage
    console.log('Calling Gemini with query:', query, 'and voice params:', voiceParams, 'and audio config:', audioConfig);
    geminiOutput.textContent = 'Fetching Gemini Query...'; // Update the UI to indicate fetching
    try {
        return await fetchGemini();
    }
    catch (error) {
        console.log('Error fetching Gemini Query: ', error);
    }
    async function fetchGemini() {
        geminiOutput.textContent = '';
        const body = {
            query: query,
            ...params, // Include any additional parameters if needed
            voiceParams: voiceParams,
            audioConfig: audioConfig,
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                //'Authorization': `Bearer ${accessToken}` // If you add authentication
            },
            body: JSON.stringify(body)
        });
        // ... handle response ...
        return await response.json(); // Parse the JSON response
    }
}
/**
 * Retrieves an access token using the Google Sign-In API.
 * If `prompt` is true, it will prompt the user for interaction if necessary.
 * @param {boolean} prompt - Whether to prompt the user for interaction.
 * @returns {Promise<string>} A promise that resolves to the access token.
 */
async function getAccessToken(prompt = false) {
    return new Promise((resolve, reject) => {
        // Ensure that CLIENT_ID and REDIRECT_URI are defined elsewhere in your code
        if (!CLIENT_ID || !REDIRECT_URI) {
            reject(new Error('CLIENT_ID or REDIRECT_URI is not defined.'));
            return;
        }
        // Initialize the Google Sign-In client
        try {
            //@ts-expect-error
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
function setLocalStorage() {
    const values = {
        sourceLanguage: sourceLangSelect.value,
        targetlanguage: targetLangSelect.value,
        repeatCount: repeatCountInput.value,
        voiceRate: voiceRate.value,
        voicePitch: voicePitch.value,
        pauseDuration: pauseInput.value,
        voiceName: voiceName.value,
    };
    localStorage.geminiSettings = JSON.stringify(values);
    console.log('Settings saved to localStorage:', values);
}
//# sourceMappingURL=app.js.map