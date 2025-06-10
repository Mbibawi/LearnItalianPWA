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
var SENTENCES;
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
function appendAudioPlayer() {
    const div = document.createElement('div');
    div.classList.add('audio');
    geminiOutput.insertAdjacentElement('beforebegin', div); // Insert the audio player before the output div
    const player = document.createElement('audio'); // Create or get the audio player
    div.appendChild(player);
    player.id = 'audioPlayer';
    player.style.display = 'block'; // Ensure the audio player is visible
    player.controls = true; // Enable controls for the audio player
    player.autoplay = false; // Disable autoplay
    player.playbackRate = voiceRate.valueAsNumber;
    voiceRate.onchange = () => player.playbackRate = voiceRate.valueAsNumber;
    (function loop() {
        const id = 'loop';
        const label = document.createElement('label');
        div.appendChild(label);
        label.textContent = 'Loop';
        const loop = document.createElement('input');
        loop.id = id;
        div.appendChild(loop);
        loop.type = 'checkbox';
        loop.onchange = () => player.loop = loop.checked;
    })();
    (function pause() {
        return;
        geminiOutput.onclick = () => {
            if (player.paused)
                player.play();
            else
                player.pause();
        };
    })();
    return player;
}
const preFilled = [
    sourceLangSelect,
    targetLangSelect,
    voiceName,
    pauseInput,
    repeatCountInput,
    voiceRate,
    voicePitch
];
const CLIENT_ID = '428231091257-9tmnknivkkmmtpei2k0jrrvc4kg4g4jh.apps.googleusercontent.com'; //Google Client ID for the gemini API
const REDIRECT_URI = 'https://mbibawi.github.io/LearnItalianPWA/';
const SCOPES = 'https://www.googleapis.com/auth/userinfo.email';
const API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // Or the specific Gemini API scope
const SENTENCES_API = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/sentences';
const ASK_API = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/ask';
const GEMINI_MODEL = "gemini-2.5-flash";
// Gemini Buttons Handleers
sentencesBtn.onclick = generateSentences;
sendQueryBtn.onclick = askGemini;
// Language selection handlers
(function populateVoiceOptions() {
    const voices = [
        //PreBuilt
        { text: "Zephyr (Bright)", name: "Chirp3-HD-Zephyr", lang: undefined },
        { text: "Puck (Upbeat)", name: "Chirp3-HD-Puck", lang: undefined },
        { text: "Charon (Informative)", name: "Chirp3-HD-Charon", lang: undefined },
        { text: "PreBuilt- Kore (Firm)", name: "Chirp3-HD-Kore", lang: undefined },
        { text: "Fenrir (Excitable)", name: "Chirp3-HD-Fenrir", lang: undefined },
        { text: "Leda (Youthful)", name: "Chirp3-HD-Leda", lang: undefined },
        { text: "Orus (Firm)", name: "Chirp3-HD-Orus", lang: undefined },
        { text: "Aoede (Breezy)", name: "Chirp3-HD-Aoede", lang: undefined },
        { text: "Callirrhoe (Easy going)", name: "Chirp3-HD-Callirrhoe", lang: undefined },
        { text: "Autonoe (Bright)", name: "Chirp3-HD-Autonoe", lang: undefined },
        { text: "Enceladus (Breathy)", name: "Chirp3-HD-Enceladus", lang: undefined },
        { text: "Iapetus (Clear)", name: "Chirp3-HD-Iapetus", lang: undefined },
        { text: "Umbriel (Easy going)", name: "Chirp3-HD-Umbriel", lang: undefined },
        { text: "Algieba (Smooth)", name: "Chirp3-HD-Algieba", lang: undefined },
        { text: "Despina (Smooth)", name: "Chirp3-HD-Despina", lang: undefined },
        { text: "Erinome (Clear)", name: "Chirp3-HD-Erinome", lang: undefined },
        { text: "Algenib (Gravelly)", name: "Chirp3-HD-Algenib", lang: undefined },
        { text: "Rasalgethi (Informative)", name: "Chirp3-HD-Rasalgethi", lang: undefined },
        { text: "Laomedeia (Upbeat)", name: "Chirp3-HD-Laomedeia", lang: undefined },
        { text: "Achernar (Soft)", name: "Chirp3-HD-Achernar", lang: undefined },
        { text: "Alnilam (Firm)", name: "Chirp3-HD-Alnilam", lang: undefined },
        { text: "Schedar (Even)", name: "Chirp3-HD-Schedar", lang: undefined },
        { text: "Gacrux (Mature)", name: "Chirp3-HD-Gacrux", lang: undefined },
        { text: "Pulcherrima (Forward)", name: "Chirp3-HD-Pulcherrima", lang: undefined },
        { text: "Achird (Friendly)", name: "Chirp3-HD-Achird", lang: undefined },
        { text: "Zubenelgenubi (Casual)", name: "Chirp3-HD-Zubenelgenubi", lang: undefined },
        { text: "Vindemiatrix (Gentle)", name: "Chirp3-HD-Vindemiatrix", lang: undefined },
        { text: "Sadachbia (Lively)", name: "Chirp3-HD-Sadachbia", lang: undefined },
        { text: "Sadaltager (Knowledgeable)", name: "Chirp3-HD-Sadaltager", lang: undefined },
        { text: "Sulafat (Warm)", name: "Chirp3-HD-Sulafat", lang: undefined },
        // English (US)
        { text: "English (US) (Male)", name: "US-Neural2-A", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Neural2-C", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Neural2-D", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Neural2-E", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Neural2-F", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Neural2-G", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Neural2-H", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Neural2-I", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Neural2-J", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Standard-A", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Standard-B", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Standard-C", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Standard-D", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Standard-E", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Standard-F", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Standard-G", lang: "EN" },
        { text: "English (US) (Female)", name: "US-Standard-H", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Standard-I", lang: "EN" },
        { text: "English (US) (Male)", name: "US-Standard-J", lang: "EN" },
        // English (GB)
        { text: "English (GB) (Female)", name: "GB-Neural2-A", lang: "EN" },
        { text: "English (GB) (Male)", name: "GB-Neural2-B", lang: "EN" },
        { text: "English (GB) (Female)", name: "GB-Neural2-C", lang: "EN" },
        { text: "English (GB) (Male)", name: "GB-Neural2-D", lang: "EN" },
        { text: "English (GB) (Female)", name: "GB-Neural2-F", lang: "EN" },
        { text: "English (GB) (Female)", name: "GB-Neural2-N", lang: "EN" },
        { text: "English (GB) (Male)", name: "GB-Neural2-O", lang: "EN" },
        { text: "English (GB) (Female)", name: "GB-Standard-A", lang: "EN" },
        { text: "English (GB) (Male)", name: "GB-Standard-B", lang: "EN" },
        { text: "English (GB) (Female)", name: "GB-Standard-C", lang: "EN" },
        { text: "English (GB) (Male)", name: "GB-Standard-D", lang: "EN" },
        { text: "English (GB) (Female)", name: "GB-Standard-F", lang: "EN" },
        // French (FR)
        { text: "French (FR) (Female)", name: "FR-Neural2-F", lang: "FR" },
        { text: "French (FR) (Male)", name: "FR-Neural2-G", lang: "FR" },
        { text: "French (FR) (Female)", name: "FR-Standard-A", lang: "FR" },
        { text: "French (FR) (Male)", name: "FR-Standard-B", lang: "FR" },
        { text: "French (FR) (Female)", name: "FR-Standard-C", lang: "FR" },
        { text: "French (FR) (Male)", name: "FR-Standard-D", lang: "FR" },
        // Italian (IT)
        { text: "Italian (IT) (Female)", name: "IT-Neural2-A", lang: "IT" },
        { text: "Italian (IT) (Female)", name: "IT-Neural2-E", lang: "IT" },
        { text: "Italian (IT) (Male)", name: "IT-Neural2-F", lang: "IT" },
        { text: "Italian (IT) (Female)", name: "IT-Standard-E", lang: "IT" },
        { text: "Italian (IT) (Male)", name: "IT-Standard-F", lang: "IT" },
    ];
    // Populate the voice selection dropdown with available voices
    voices.forEach(voice => {
        var _a;
        const option = document.createElement('option');
        if (voice.lang)
            option.lang = voice.lang; // Set the language attribute for the option
        if (voice.lang)
            option.dataset.country = voice.name.split('-')[0]; //e.g., 'GB' for British English
        if (voice.lang)
            option.value = `${(_a = voice.lang) === null || _a === void 0 ? void 0 : _a.toLowerCase()}-${voice.name}`; // e.g., 'en-US-Standard-A'
        else
            option.value = voice.name; //e.g. "Chirp3-HD-Zephyr"
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
    preFilled
        .forEach(input => { var _a; return input.value = ((_a = settings.find(el => el[0] === input.id)) === null || _a === void 0 ? void 0 : _a[1]) || input.value; }); // Set the value from localStorage or keep the default
})();
const audioPlayer = appendAudioPlayer(); //!This must come after the other fields were initialized.
/**
 * Asks Gemini API for a response based on the input query.
 * This function retrieves the access token, constructs the request,
 * and plays the audio response.
 * @returns {Promise<void>} A promise that resolves when the audio is played.
 */
async function __askGemini() {
    const sourceLanguage = sourceLangSelect.value || 'English';
    const voice = voiceName.options[voiceName.selectedIndex];
    const prompt = `${geminiInput.value.trim()}.\n
  Return the text and the audio file as a JSON object constructed as follows:
  {
  "text": ["your answer text"],
  "audio": ["audio base64 string of the text"]
  }\n
  Ensure the output is ONLY the JSON object as indicated.`; // Get the input query from the text area
    const speech = `Speak in an informative way, as if you were reading from a newspaper or a book. If your answer includes words or sentences in a foreign language other than ${sourceLanguage}, you must read and pronounce these words properly as a native speaker of this foreign language would do. You must read each word of the text in its relevant native language with the relevant accent and pronounciation.`;
    geminiOutput.textContent = 'Asking Gemini...';
    const schema = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "the text of your output",
            },
            "audio": {
                "type": "Uint8Array",
                "description": "the audio according to the speech instructions passed as parameters to the GenAI",
            },
        },
        "required": ["text", "audio"]
    };
    const lang = voice.lang || sourceLangSelect.options[sourceLangSelect.selectedIndex].value || 'en';
    const config = {
        responseMimeType: "audio/mpeg",
        responseSchema: schema,
        systemInstruction: speech, //Instruction about how to read the text 
        speechConfig: {
            languageCode: `${lang.toLowerCase()}-${voice.dataset.country || 'GB'}`, // e.g.: en-GB
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: voiceName.options[voiceName.selectedIndex].value,
                }
            },
        },
    };
    const content = [
        {
            "role": "user",
            "parts": [
                {
                    "text": prompt
                }
            ]
        }
    ];
    const data = await __callCloudFunction(ASK_API, { text: content }, { text: config }); // Call the askGemini function with the cloud function URL
    const response = data.response;
    if (!response)
        throw new Error('No response received from Gemini API');
    geminiOutput.textContent = "";
    debugger;
    SENTENCES = [response];
    await playSentences(SENTENCES, 1, 0, false);
}
/**
 * Asks Gemini API for a response based on the input query.
 * This function retrieves the access token, constructs the request,
 * and plays the audio response.
 * @returns {Promise<void>} A promise that resolves when the audio is played.
 */
async function askGemini() {
    var _a;
    //const accessToken = await getAccessToken();
    //if (!accessToken) return console.log('Could not get accessToken');
    const voice = voiceName.options[voiceName.selectedIndex];
    let ssml = '';
    if (!((_a = voice.value) === null || _a === void 0 ? void 0 : _a.includes('Chirp3')))
        ssml = 'The generated text must be formatted as  SSML. If the text includes words in a different language than the main language of the text, these words or sentences must be properly marked with SSML. I need the text-to-speech api to be able to detect and properly render these word in a native pronounciation and accent. ';
    const prompt = `You are a  teacher who is answering a question from a student. The answer must be put in plain text since it will be converted to an audio file by google's text-to-speech api. Remove any * or special charachters from the text, and prepare it to be read loudly by someone to an audience or as a speech in a meeting. ${ssml}The question is: ${geminiInput.value.trim()}.`; // Get the input query from the text area
    geminiOutput.textContent = 'Asking Gemini...';
    const data = await callCloudFunction(ASK_API, prompt); // Call the askGemini function with the cloud function URL
    const response = data.response;
    if (!response)
        throw new Error('No response received from Gemini API');
    geminiOutput.textContent = "";
    response.text = removeSsmlMarkup(response.text);
    SENTENCES = [response];
    await playSentences([response], 1, 0, false);
}
/**
 * Removes SSML tags and decodes HTML entities using the browser's DOM parser.
 * This is generally the simplest and most robust method for unescaping entities in a browser.
 *
 * @param ssmlText The input string potentially containing SSML markup and HTML entities.
 * @returns The string with SSML tags removed and HTML entities decoded.
 */
function removeSsmlMarkup(ssmlText) {
    if (!ssmlText)
        return '';
    // 1. Remove SSML tags using regex
    // This part remains the same as regex is efficient for tag removal.
    let cleanText = ssmlText.replace(/<[^>]+>/g, '');
    // 2. Decode HTML entities using a temporary DOM element
    const doc = new DOMParser().parseFromString(cleanText, 'text/html');
    cleanText = doc.documentElement.textContent || '';
    // Alternatively, for simpler cases, one could create a detached div:
    // const div = document.createElement('div');
    // div.innerHTML = cleanText;
    // cleanText = div.textContent || '';
    // Optional: Normalize whitespace
    cleanText = cleanText.trim().replace(/\s+/g, ' ');
    return cleanText;
}
/**
 * Retrieves the access token for Google APIs.
 * This function is a placeholder and should be implemented to fetch the token.
 * @returns {Promise<string>} A promise that resolves to the access token.
 */
async function generateSentences() {
    const number = prompt('How many sentences do you want to get from Gemini? (default is 3)');
    const words = prompt('Do you want to set the maximum number of words for each sentence ?');
    const targetLanguage = targetLangSelect.options[targetLangSelect.selectedIndex].text || prompt("You must define the target language, otherwise it will be set to \"English\"", "English") || "English";
    const query = `Generate ${isNaN(Number(number)) ? 3 : Number(number)} distinct sentences in the ${targetLanguage} language according to the following guidelines or instructions: ${geminiInput.value.trim()}. Each sentence should not exceed ${isNaN(Number(words)) ? 10 : Number(words)} words long. Return the sentences as a JSON array of strings. For example: ["Sentence one.", "Sentence two."]\nEnsure the output is ONLY the JSON array.`;
    geminiOutput.textContent = 'Waiting for the sente...'; // Update the UI to indicate fetching
    const data = await callCloudFunction(SENTENCES_API, query); // Call the askGemini function with the cloud function URL
    const sentences = data.sentences; // Extract sentences from the response
    if (!data.sentences)
        throw new Error('No sentences received from Gemini API');
    geminiOutput.textContent = "";
    SENTENCES = sentences;
    const repeatCount = parseInt(repeatCountInput.value) || 1;
    const pause = parseInt(pauseInput.value) * 1000 || 1000;
    await playSentences(sentences, repeatCount, pause, true);
}
;
async function __generateSentences() {
    const number = prompt('How many sentences do you want to get from Gemini? (default is 3)');
    const words = prompt('Do you want to set the maximum number of words for each sentence ?');
    geminiOutput.textContent = 'Waiting for the sente...'; // Update the UI to indicate fetching
    const targetLanguage = targetLangSelect.options[targetLangSelect.selectedIndex].text || prompt("You must define the target language, otherwise it will be set to \"English\"", "English") || "English";
    //Text Parameters
    const textPrompt = `Generate ${isNaN(Number(number)) ? 3 : Number(number)} distinct sentences in the ${targetLanguage} language according to the following guidelines or instructions: ${geminiInput.value.trim()}. Each sentence should not exceed ${isNaN(Number(words)) ? 10 : Number(words)} words long.\n
    Return the generated sentences in a JSON object  constructed like this:
    {"text": ["sentence 1", "sentence 2", "sentence 3", etc.]}\n
    Ensure the output is ONLY the JSON object as indicated.`;
    const textSchema = {
        "type": "object",
        "properties": {
            "text": {
                "type": "array",
                "description": "An array of text strings, where each string represents a sentence.",
                "items": {
                    "type": "string"
                }
            },
        },
        "required": ["text"]
    };
    const textConfig = {
        responseMimeType: "application/json",
        responseSchema: textSchema, //my JSON schema
    };
    //Audio Parameters
    const voice = voiceName.options[voiceName.selectedIndex];
    const audioSpeech = `Read the text as if you were a teacher dictating the sentence to a student who is taking notes. Ensure the text is being read in a native ${targetLanguage} accent and pronounciation.`;
    const lang = voice.lang || sourceLangSelect.options[sourceLangSelect.selectedIndex].value || 'en';
    const audioConfig = {
        responseMimeType: "audio/mpeg",
        systemInstruction: audioSpeech, //Instruction about how to read the text 
        speechConfig: {
            languageCode: `${lang.toLowerCase()}-${voice.dataset.country || 'GB'}`, // e.g.: en-GB
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: voiceName.value,
                }
            },
        },
    };
    const configs = {
        text: textConfig,
        audio: audioConfig
    };
    const prompts = {
        text: getContent(textPrompt),
        audio: getContent("")
    };
    function getContent(query) {
        return [
            {
                "role": "user",
                "parts": [
                    {
                        "text": query
                    }
                ]
            }
        ];
    }
    ;
    const data = await __callCloudFunction(SENTENCES_API, prompts, configs);
    debugger;
    const sentences = data;
    SENTENCES = sentences.text.map((sentence, i) => {
        return {
            text: sentence,
            audio: sentences.audio[i]
        };
    });
    const repeatCount = parseInt(repeatCountInput.value) || 1;
    const pause = parseInt(pauseInput.value) * 1000 || 1000;
    await playSentences(SENTENCES, repeatCount, pause, true);
}
;
async function playSentences(sentences, repeateCount, pause, translate, recurse = false) {
    for (const sentence of sentences) {
        await playAudio(sentence, repeateCount, pause, translate); // Collect results
    }
    ;
    if (recurse)
        return;
    geminiOutput.ondblclick = () => {
        geminiOutput.textContent = '';
        playSentences(sentences, repeateCount, pause, translate, true);
    }; //adding a "on double click" that will allow to repeat the audio again.
}
/**
 * Plays audio for a given text and Base64 encoded audio data.
 * @param {Object} params - The parameters for the audio playback.
 * @param {string} params.text - The text to display in the UI.
 * @param {string} params.audioBase64 - The Base64 encoded audio data.
 * @param {number} [repeatCount=1] - The number of times to repeat the audio playback.
 * @param {number} [pause=1000] - The pause duration between repetitions in milliseconds.
 */
async function playAudio({ text, audio }, repeatCount = 1, pause = 1000, translate = false) {
    console.log('Playing audio for sentence:', text);
    // Display the text in the UI
    geminiOutput.textContent = `${geminiOutput.textContent} ${text}\n`;
    const translation = await translateSentence(text, "English", translate);
    if (translation)
        geminiOutput.textContent = `${geminiOutput.textContent} (English Translation: ${translation})\n`; // Display the translation if available
    if (!audio)
        return alert('No audio to play.');
    const repeat = Array(repeatCount).fill(0).map((_, i) => i); // Create an array to repeat the audio
    const audioSrc = `data:audio/mp3;base64,${audio}`;
    audioPlayer.src = '';
    audioPlayer.src = audioSrc;
    audioPlayer.playbackRate = voiceRate.valueAsNumber;
    //audioPlayer.load();
    for (const play of repeat) {
        audioPlayer.currentTime = 0; // Reset to start
        await audioPlayer.play();
        await delay(pause);
    }
    console.log('Audio sentences played successfully.');
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function translateSentence(text, targetLang, translate) {
        if (!translate)
            return null;
        const query = `Translate the following sentence to ${targetLang}: "${text}". Return only the translated sentence without any additional text."`;
        const data = await callCloudFunction(ASK_API, query, { noAudio: true });
        const response = data.response;
        return response.text || null; // Return the translation text or null if not available
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
async function __callCloudFunction(url, content, config, params) {
    // const accessToken = await getAccessToken();
    if (!prompt)
        return alert('Please enter a query to send to Gemini');
    saveToLocalStorage(); // Save settings to localStorage
    //console.log('Calling Gemini with query:', query, 'and voice params:', voiceConfig, 'and audio config:', audioConfig);
    try {
        return await fetchGemini();
    }
    catch (error) {
        console.log('Error fetching Gemini Query: ', error);
        return null;
    }
    async function fetchGemini() {
        const body = {
            content: content,
            config: config,
            model: GEMINI_MODEL,
            ...params, // Include ansy additional parameters if needed
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                //'Authorization': `Bearer ${accessToken}` // If you add authentication
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            return;
        }
        return await response.json(); // Parse the JSON response
    }
}
/**
 * Calls a cloud function with the provided URL and parameters.
 * @param {string} url - The URL of the cloud function to call.
 * @param {Object} [params] - Optional parameters to include in the request body.
 * @returns {Promise<any>} A promise that resolves to the response from the cloud function.
 */
async function callCloudFunction(url, query, params) {
    // const accessToken = await getAccessToken();
    if (!query)
        return alert('Please enter a query to send to Gemini');
    if (voiceName.selectedIndex < 0)
        return alert('Please select a voice to use for the audio playback');
    const voice = voiceName.options[voiceName.selectedIndex];
    function languageCode() {
        if (voice.lang && voice.dataset.country)
            return `${voice.lang.toLowerCase()}-${voice.dataset.country}`;
        const targetLang = targetLangSelect.options[targetLangSelect.selectedIndex];
        if (!targetLang)
            return "en-GB";
        let lang = targetLang.value;
        if (lang === 'en')
            return `${lang.toLowerCase()}-GB`;
        else
            return `${lang.toLowerCase()}-${lang.toUpperCase()}`;
    }
    const code = languageCode(); //e.g.: 'en-US', 'it-IT'
    const name = voice.lang ? voice.value : `${code}-${voice.value}`; //If the voide does not have its language property set, it means we are using one of the Chirp2-HD voices, e.g.: en-GB-Chirp3-HD-Achernar
    const voiceParams = {
        languageCode: code, // e.g., 'en-GB' for Grand Britain English
        name: name,
    };
    const audioConfig = {
        audioEncoding: 'MP3', // Or 'LINEAR16' for uncompressed WAV
        speakingRate: voiceRate.valueAsNumber || 1.0, // 0.25 to 4.0 (1.0 is normal)
        //  volumeGainDb: 0.0,  // -96.0 to 16.0 (0.0 is normal)
        // effectsProfileId: ['small-bluetooth-speaker-effect'], // Optional, for specific audio profiles
    };
    if (voice.lang) {
        //!pitch is not available for the prebuilt-voices. This will give an error.
        //@ts-ignore
        audioConfig.pitch = voicePitch.valueAsNumber || 1.0; // -20.0 to 20.0 (0.0 is normal)
    }
    saveToLocalStorage(); // Save settings to localStorage
    console.log('Calling Gemini with query:', query, 'and voice params:', voiceParams, 'and audio config:', audioConfig);
    try {
        return await fetchGemini();
    }
    catch (error) {
        console.log('Error fetching Gemini Query: ', error);
        return null;
    }
    async function fetchGemini() {
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
function saveToLocalStorage() {
    const values = preFilled.map(input => [input.id, input.value]); // Create an object with the input IDs and their values
    localStorage.geminiSettings = JSON.stringify(values);
    console.log('Settings saved to localStorage:', values);
}
//# sourceMappingURL=app.js.map