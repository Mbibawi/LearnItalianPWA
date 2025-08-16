"use strict";
/**
 * This script provides functionality for interacting with the Gemini API to generate sentences,
 * ask questions, and play audio responses. It includes features such as service worker registration,
 * voice selection, and audio playback customization. The script is designed for use in a Progressive
 * Web Application (PWA) for language learning.

 * Key Features:
 * - Service Worker Registration: Ensures the service worker is registered for offline capabilities.
 * - Voice Selection: Populates a dropdown with available voices for text-to-speech functionality.
 * - Sentence Generation: Generates sentences based on user input and plays them as audio.
 * - Query Handling: Sends user queries to the Gemini API and retrieves responses in text and audio formats.
 * - Audio Playback: Plays audio responses with customizable playback rate, pitch, and looping options.
 * - Local Storage: Saves user settings to localStorage for persistence across sessions.

 * Types:
 * - `Sentence`: Represents a sentence with text and audio data.
 * - `RequestContent`: Defines the structure for request content sent to the Gemini API.
 * - `RequestConfig`: Specifies configuration options for text and audio responses.
 * - `PromptContent`: Represents the structure of prompts sent to the Gemini API.

 * Functions:
 * - `ensureServiceWorkerRegisteredInternal`: Registers a service worker if not already registered.
 * - `appendAudioPlayer`: Creates and appends an audio player element to the DOM.
 * - `askGemini`: Sends a query to the Gemini API and plays the audio response.
 * - `generateSentences`: Generates sentences using the Gemini API and plays them as audio.
 * - `playSentences`: Plays a list of sentences with customizable repeat count and pause duration.
 * - `playAudio`: Plays a single sentence's audio with optional translation and repetition.
 * - `removeSsmlMarkup`: Removes SSML tags and decodes HTML entities from a string.
 * - `translateSentence`: Translates a sentence into a specified target language.
 * - `callCloudFunction`: Sends a request to a cloud function with specified parameters.
 * - `getAccessToken`: Retrieves an access token for Google APIs.
 * - `saveToLocalStorage`: Saves user settings to localStorage.

 * Constants:
 * - `CLIENT_ID`: Google Client ID for authentication.
 * - `REDIRECT_URI`: Redirect URI for Google Sign-In.
 * - `SCOPES`: Scopes for Google APIs.
 * - `API_SCOPE`: Scope for the Gemini API.
 * - `SENTENCES_API`: URL for the Gemini sentences API.
 * - `ASK_API`: URL for the Gemini ask API.
 * - `GEMINI_MODEL`: Model name for the Gemini API.

 * DOM Elements:
 * - Various input fields and buttons for user interaction, such as language selection, voice configuration, and query submission.

 * Usage:
 * - Initialize the script by loading the page, which registers the service worker and populates voice options.
 * - Use the provided buttons to generate sentences or ask questions, and listen to the audio responses.
 * - Customize playback settings such as voice rate, pitch, and looping using the input fields.
 */
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
const readBtn = document.getElementById('readText');
const transcribeBtn = document.getElementById('transcribeAudio');
const preFilled = [
    sourceLangSelect,
    targetLangSelect,
    voiceName,
    pauseInput,
    repeatCountInput,
    voiceRate,
    voicePitch
];
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
    geminiOutput.onclick = () => player.paused ? player.play() : player.pause();
    (function loop() {
        const id = 'loop';
        const label = document.createElement('label');
        div.appendChild(label);
        label.textContent = 'Loop';
        const loop = document.createElement('input');
        loop.id = id;
        div.appendChild(loop);
        preFilled.push(loop);
        loop.type = 'checkbox';
        loop.onchange = () => player.loop = loop.checked;
    })();
    return player;
}
const CLIENT_ID = '428231091257-9tmnknivkkmmtpei2k0jrrvc4kg4g4jh.apps.googleusercontent.com'; //Google Client ID for the gemini API
const REDIRECT_URI = 'https://mbibawi.github.io/LearnItalianPWA/';
const SCOPES = ['https://www.googleapis.com/auth/userinfo.email'];
const API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // Or the specific Gemini API scope
const BASE_URL = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/';
//const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_MODEL = "gemini-2.5-flash-preview-05-20";
const DB_NAME = 'LearnItalian'; // The name of your database
const DB_VERSION = 1; // Increment this if you change your object stores (e.g., add new ones)
const STORE_NAME = 'queries';
// Gemini Buttons Handleers
sentencesBtn.onclick = generateSentences;
sendQueryBtn.onclick = askGemini;
readBtn.onclick = () => readText();
transcribeBtn.onclick = getTranscriptionFromLinkToAudio;
// Language selection handlers
(function populateVoiceOptions() {
    // Array of available voice options for the Text-to-Speech API
    // This list is manually curated based on Google Cloud Text-to-Speech standard voices.
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
(async function ListSavedQueries() {
    const savedQueries = await getSavedQueries();
    if (!savedQueries.length)
        return;
    const queriesSelect = document.createElement('select');
    geminiInput.insertAdjacentElement('beforebegin', queriesSelect);
    queriesSelect.id = 'savedQueries';
    updateListOfSavedQueries(savedQueries, queriesSelect);
    queriesSelect.onchange = async () => {
        var _a;
        const savedQueries = await getSavedQueries();
        if (!savedQueries.length)
            return;
        const selected = queriesSelect.options[queriesSelect.selectedIndex];
        if (!selected)
            return;
        geminiOutput.innerHTML = '';
        geminiInput.textContent = selected.textContent;
        SENTENCES = ((_a = savedQueries.find(query => query.DBKey === selected.value)) === null || _a === void 0 ? void 0 : _a.sentences) || [];
        playSentences(SENTENCES, false, true); // Play the saved sentences if available
    };
})();
const audioPlayer = appendAudioPlayer(); //!This must come after the other fields were initialized.
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
    const query = geminiInput.value.trim();
    let ssml = '';
    if (!((_a = voice.value) === null || _a === void 0 ? void 0 : _a.includes('Chirp3')))
        ssml = 'The generated text must be formatted as  SSML. If the text includes words in a different language than the main language of the text, these words or sentences must be properly marked with SSML. I need the text-to-speech api to be able to detect and properly render these words in a native pronounciation and accent. ';
    const prompt = `You are a  teacher who is answering a question from a student. The answer must be put in plain text since it will be converted into an audio file by google's text-to-speech api. Remove any * or special charachters from the text, and prepare it for being read loudly by someone to an audience or as a speech in a meeting. ${ssml}The question is: ${query}.`; // Get the input query from the text area
    showProgress('Asking Gemini...', true);
    const data = await callCloudFunction('ask', prompt); // Call the askGemini function with the cloud function URL
    const response = data.response;
    if (!response) {
        const error = 'No response received from Gemini API';
        showProgress(error);
        throw new Error(error);
    }
    ;
    showProgress(null, true); //We empty the output 
    response.text = removeSsmlMarkup(response.text);
    await playSentences([response], true);
    await saveSentences([response], `Ask Gemini: ${query}`);
}
async function readText(text) {
    if (text)
        return await getAudio();
    if (!text) {
        text = geminiInput.value;
        text = text.slice(geminiInput.selectionStart || 0, geminiInput.selectionEnd || text.length - 1).trim();
        if (!text || !text.length)
            text = geminiInput.value;
    }
    //if(!language) language = targetLangSelect.options[targetLangSelect.selectedIndex]?.textContent || 'English';
    const response = await getAudio();
    await playSentences([response], false, false);
    await saveSentences([response], `Read this text: ${text.substring(30)}`);
    async function getAudio() {
        const sentence = await callCloudFunction('read', text); // Call the askGemini function with the cloud function URL
        if (sentence === null || sentence === void 0 ? void 0 : sentence.audio)
            return sentence;
        const error = `Could not get audio from Gemini Text-to-Speech API`;
        alert(error);
        throw new Error(error);
    }
}
function _getSavedQueries() {
    if (!localStorage.queries)
        return [];
    return JSON.parse(localStorage.queries).map((query) => query.query);
}
async function saveSentences(sentences, queryText) {
    if (!sentences || !sentences.length)
        return alert('No sentences to save');
    const query = {
        query: queryText || geminiInput.value.trim(),
        sentences: sentences
    };
    SENTENCES = sentences;
    await saveToDB();
    return;
    //saveToLocalStorage();
    async function saveToDB() {
        const savedQueries = await updateSavedQueries(query);
        if (!savedQueries)
            return alert('No saved queries found');
        updateListOfSavedQueries(savedQueries, document.getElementById('savedQueries'));
    }
    function saveToLocalStorage() {
        const savedQueries = JSON.parse(localStorage.queries) || [];
        if (savedQueries.length) {
            savedQueries.push(query);
            localStorage.queries = JSON.stringify(savedQueries);
        }
        else {
            savedQueries.push(query);
            localStorage.queries = JSON.stringify(savedQueries);
        }
        updateListOfSavedQueries(savedQueries, document.getElementById('savedQueries'));
    }
}
function updateListOfSavedQueries(savedQueries, queriesSelect) {
    if (!queriesSelect)
        return;
    queriesSelect.options.length = 0; // Clear existing options
    savedQueries
        .reverse()
        .forEach((query) => {
        if (!query.query || !query.DBKey)
            return;
        const option = document.createElement('option');
        option.textContent = query.query;
        option.value = query.DBKey;
        queriesSelect.appendChild(option);
    });
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
    showProgress('Waiting for the sentences....', true);
    const data = await callCloudFunction('sentences', query); // Call the askGemini function with the cloud function URL
    const sentences = data === null || data === void 0 ? void 0 : data.sentences; // Extract sentences from the response
    if (!data.sentences) {
        const error = 'No sentences received from Gemini API';
        showProgress(error);
        throw new Error(error);
    }
    ;
    showProgress(null, true);
    await playSentences(sentences, true);
    await saveSentences(sentences, `Generate ${isNaN(Number(number)) ? 3 : Number(number)} distinct sentences in the ${targetLanguage} language according to the following guidelines or instructions: ${geminiInput.value.trim()}`);
}
;
/**
 * Plays a sequence of sentences using an audio player, with options for repetition, pauses, and translation.
 *
 * @param sentences - An array of `Sentence` objects to be played sequentially.
 * @param repeateCount - The number of times each sentence should be repeated during playback.
 * @param pause - The duration of the pause (in milliseconds) between sentences.
 * @param translate - A boolean indicating whether translations should be included during playback.
 *
 * The function temporarily disables the audio player's loop setting to ensure the entire set of sentences is played
 * sequentially without looping individual sentences. After playback, the loop setting is restored to its original state.
 *
 * If the loop setting is enabled, the function recursively replays the entire set of sentences.
 * Additionally, a double-click event listener is added to `geminiOutput` to allow replaying the sentences by double-clicking.
 *
 * Note: The function is asynchronous and relies on `playAudio` for individual sentence playback.
 */
async function playSentences(sentences, translate, edit = true) {
    var _a;
    if (!(sentences === null || sentences === void 0 ? void 0 : sentences.length))
        return;
    const lang = ((_a = sourceLangSelect.options[sourceLangSelect.selectedIndex]) === null || _a === void 0 ? void 0 : _a.textContent) || 'English'; //We will use the source language and translate the text to it
    const loop = document.getElementById('loop');
    audioPlayer.loop = false;
    geminiOutput.ondblclick = () => play(false); // Allow replaying the sentences by double-clicking on the output div
    try {
        if (translate) {
            for (const sentence of sentences) {
                sentence.translation = await translateSentence(sentence.text, lang) || '';
                if (sentence.translation)
                    sentence.translation = `(${lang} = ${sentence.translation})\n`;
            }
        }
        await play(edit); // Play the sentences with the specified parameters
    }
    catch (error) {
        const message = `Failed to play sentences. Got error: ${error}`;
        showProgress(message);
        console.log(message);
    }
    audioPlayer.loop = (loop === null || loop === void 0 ? void 0 : loop.checked) || false;
    async function play(edit) {
        const repeatCount = parseInt(repeatCountInput.value) || 1;
        const pause = parseInt(pauseInput.value) * 1000 || 1000;
        for (const sentence of sentences) {
            if (edit)
                showText(sentence); // Insert the sentence text and translation into the output div
            await playAudio(sentence, repeatCount, pause);
        }
        if (loop === null || loop === void 0 ? void 0 : loop.checked)
            await play(false); //We replay the whole set of sentences again;
    }
    /**
     * Displays a sentence and its translation in the output div.
     * @param sentence
     * @returns
     */
    function showText(sentence) {
        const p1 = document.createElement('p');
        p1.classList.add('sentence');
        p1.textContent = sentence.text;
        geminiOutput.appendChild(p1);
        if (!sentence.translation)
            return;
        const p2 = document.createElement('p');
        p2.textContent = sentence.translation;
        p2.classList.add('translation'); // Add a class for styling the translation
        p2.lang = lang.toLowerCase(); // Set the language attribute for the translation
        geminiOutput.appendChild(p2);
        const x = `${100 / geminiOutput.children.length}%`;
        geminiOutput.style.gridTemplateColumns =
            Array.from(geminiOutput.children)
                .map(p => x)
                .join(' ');
    }
}
/**
 * Translates a given sentence into the specified target language.
 *
 * @param text - The sentence to be translated.
 * @param targetLang - The target language for translation (e.g., "Italian", "French").
 * @returns A promise that resolves to the translated sentence as a string, or `null` if the target language is not provided or the translation is unavailable.
 *
 * @throws An error if the cloud function call fails or returns an unexpected response.
 */
async function translateSentence(text, targetLang) {
    if (!targetLang)
        return '';
    const query = `Translate the following sentence into ${targetLang}: "${text}". Return only the translated sentence without any additional text or comment."`;
    const data = await callCloudFunction('ask', query, { noAudio: true });
    const response = data === null || data === void 0 ? void 0 : data.response;
    return (response === null || response === void 0 ? void 0 : response.text) || 'translation failed'; // Return the translation text or null if not available
}
/**
 * Plays an audio file associated with a given sentence, optionally translating the sentence and repeating the audio.
 *
 * @param {Sentence} params - An object containing the sentence text and audio data.
 * @param {string} params.text - The text of the sentence to be displayed and optionally translated.
 * @param {string} params.audio - The Base64-encoded audio data for the sentence.
 * @param {number} [repeatCount=1] - The number of times to repeat the audio playback.
 * @param {number} [pause=1000] - The pause duration (in milliseconds) between audio repetitions.
 * @param {boolean} [getTranslation=false] - Whether to translate the sentence text before playing the audio.
 * @returns {Promise<void>} A promise that resolves when the audio playback and optional translation are complete.
 *
 * @throws {Error} Throws an alert if no audio data is provided.
 *
 * @example
 * const sentence = { text: "Ciao", audio: "BASE64_AUDIO_DATA" };
 * await playAudio(sentence, 2, 1500, true);
 */
async function playAudio(sentence, repeatCount = 1, pause = 1000) {
    const { text, audio } = sentence;
    // Display the text in the UI
    if (!audio)
        return alert('No audio to play.');
    console.log('Playing audio for sentence:', text);
    let src = `data:audio/mp3;base64,${Buffer.from(audio).toString('base64')}`;
    if (!src.startsWith('data:'))
        src = `data:audio/mp3;base64,${src}`;
    audioPlayer.src = src;
    audioPlayer.playbackRate = voiceRate.valueAsNumber;
    return new Promise((resolve, reject) => {
        audioPlayer.onended = onEnded;
        audioPlayer.onerror = onError; // Handle errors during playback
        audioPlayer.play();
        async function onEnded() {
            repeatCount--;
            if (repeatCount < 1) {
                audioPlayer.onended = null; // Remove the event listener to prevent multiple calls
                audioPlayer.onerror = null; // Remove the error handler
                console.log('Audio sentences played successfully.');
                resolve(); // Resolve the promise when playback is done
            }
            ;
            await delay(pause);
            //audioPlayer.currentTime = 0; // Reset the audio player to the beginning
            await audioPlayer.play();
        }
        ;
        function onError() {
            var _a;
            audioPlayer.onended = null; // Remove the event listener to prevent multiple calls
            const error = `Error playing audio: ${(_a = audioPlayer.error) === null || _a === void 0 ? void 0 : _a.message}`;
            showProgress(error);
            reject(new Error(error));
        }
    });
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
 * Sends a query to a cloud function with specified voice and audio configuration parameters.
 *
 * @param {string} url - The URL of the cloud function to call.
 * @param {string} [query] - The query string to send to the cloud function. Must be provided.
 * @param {{ [key: string]: any }} [params] - Additional parameters to include in the request body.
 * @returns {Promise<any>} - A promise that resolves with the response from the cloud function.
 *
 * @throws {Error} - Throws an error if the query is not provided or if a voice is not selected.
 *
 * @remarks
 * - The function dynamically determines the language code and voice name based on user selections.
 * - Audio configuration includes properties such as `audioEncoding`, `speakingRate`, and optionally `pitch`.
 * - Saves settings to localStorage before making the request.
 * - Handles errors during the fetch operation and logs them to the console.
 *
 * @example
 * ```typescript
 * const response = await callCloudFunction(
 *   'https://example.com/cloud-function',
 *   'Translate this text',
 *   { additionalParam: 'value' }
 * );
 * console.log(response);
 * ```
 */
async function callCloudFunction(url, query, params) {
    // const accessToken = await getAccessToken();
    if (!query)
        return alert('Please enter a query to send to Gemini');
    if (!(params === null || params === void 0 ? void 0 : params.audioConfig) && voiceName.selectedIndex < 0)
        return alert('Please select a voice to use for the audio playback');
    const { code, name, voice } = getLanguageCode(); //e.g.: 'en-US', 'it-IT'
    const voiceParams = {
        languageCode: code, // e.g., 'en-GB' for Grand Britain English
        name: name,
    };
    saveToLocalStorage(); // Save settings to localStorage
    try {
        return await fetchGemini();
    }
    catch (error) {
        const message = `Error fetching Gemini Query: ${error}`;
        showProgress(message);
        console.log(message);
        return null;
    }
    /**
     * Fetches data from the Gemini API using a POST request.
     *
     * This function sends a JSON payload containing the query, parameters, voice settings,
     * and audio configuration to the specified URL. It returns the parsed JSON response
     * from the server.
     *
     * @async
     * @function fetchGemini
     * @returns {Promise<any>} The parsed JSON response from the Gemini API.
     *
     * @example
     * const response = await fetchGemini();
     * console.log(response);
     */
    async function fetchGemini() {
        const body = {
            query: query,
            voiceParams: voiceParams,
            ...params, // Include any additional parameters if needed
        };
        if (!body.audioConfig)
            body.audioConfig = getAudioConfig(voice); // Include audioConfig only if not already provided
        const response = await fetch(`${BASE_URL}${url}`, {
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
    ;
    function getAudioConfig(voice) {
        const config = {
            audioEncoding: 'MP3', // Or 'LINEAR16' for uncompressed WAV
            speakingRate: voiceRate.valueAsNumber || 1.0, // 0.25 to 4.0 (1.0 is normal)
            //  volumeGainDb: 0.0,  // -96.0 to 16.0 (0.0 is normal)
            // effectsProfileId: ['small-bluetooth-speaker-effect'], // Optional, for specific audio profiles
        };
        if (voice.lang) {
            //!pitch is not available for the prebuilt-voices. This will give an error.
            //@ts-ignore
            config.pitch = voicePitch.valueAsNumber || 1.0; // -20.0 to 20.0 (0.0 is normal)
        }
        return config;
    }
}
function getLanguageCode() {
    const voice = voiceName.options[voiceName.selectedIndex] || voiceName.options[0]; // Get the selected voice or the first one if none is selected
    let code;
    if (voice.lang && voice.dataset.country)
        code = `${voice.lang.toLowerCase()}-${voice.dataset.country}`;
    const targetLang = targetLangSelect.options[targetLangSelect.selectedIndex];
    if (!targetLang)
        code = "en-GB";
    let lang = targetLang.value;
    if (lang === 'en')
        code = `${lang.toLowerCase()}-GB`;
    else
        code = `${lang.toLowerCase()}-${lang.toUpperCase()}`;
    const name = voice.lang ? voice.value : `${code}-${voice.value}`; //If the voice does not have its language property set, it means we are using one of the Chirp3-HD voices, e.g.: en-GB-Chirp3-HD-Achernar
    return { code: code, name: name, voice: voice };
}
let tokenClient = null;
async function getGoogleAccessTokenSilently(scopes) {
    return new Promise((resolve, reject) => {
        if (!window.google || !google.accounts || !google.accounts.oauth2) {
            return reject(new Error('Google Identity Services not loaded.'));
        }
        // Initialize the token client once
        if (!tokenClient) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES.join(' '), // Join scopes with a space
                prompt: '', // Important for silent flow
                callback: (resp) => {
                    if (resp.error || !resp.access_token) {
                        resolve(null); // user not signed in or consent not granted
                    }
                    else {
                        resolve(resp.access_token);
                    }
                }
            });
        }
        // Attempt silent token request
        tokenClient.requestAccessToken({ prompt: 'none' });
    });
}
/**
 * Retrieves an access token using Google's OAuth2 client.
 *
 * @param {boolean} [prompt=false] - Indicates whether to prompt the user for interaction.
 *                                   If `true`, the user will be prompted to manually log in
 *                                   or grant consent if required.
 * @returns {Promise<string>} A promise that resolves to the access token if successful,
 *                            or rejects with an error if token acquisition fails.
 *
 * @throws {Error} If `CLIENT_ID` or `REDIRECT_URI` is not defined, or if user interaction
 *                 is required but not provided.
 *
 * @remarks
 * - The function attempts to acquire the token silently first. If silent acquisition fails
 *   due to errors like `consent_required`, `login_required`, or `interaction_required`,
 *   the user is prompted for interaction.
 * - Ensure that `CLIENT_ID` and `REDIRECT_URI` are properly defined in your code before
 *   calling this function.
 * - The Google Sign-In client (`google.accounts.oauth2.initTokenClient`) must be available
 *   and properly initialized.
 *
 * @example
 * ```typescript
 * const token = await getAccessToken();
 * console.log('Access Token:', token);
 * ```
 */
async function _getAccessToken(prompt = false) {
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
                //redirect_uri: REDIRECT_URI,
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
                                _getAccessToken(true);
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
/**
 * Saves the current values of pre-filled inputs to localStorage.
 *
 * This function iterates over the `preFilled` array, which contains input elements,
 * and creates an array of key-value pairs where the key is the input's ID and the value
 * is the input's current value. The resulting array is then serialized into a JSON string
 * and stored in `localStorage` under the key `geminiSettings`.
 *
 * Additionally, the function logs the saved settings to the console for debugging purposes.
 */
function saveToLocalStorage() {
    const values = preFilled.map(input => [input.id, input.value]); // Create an object with the input IDs and their values
    localStorage.geminiSettings = JSON.stringify(values);
    console.log('Settings saved to localStorage:', values);
}
/**
 * Opens a connection to the IndexedDB database.
 * If the database or object store doesn't exist, it will be created.
 * @returns A Promise that resolves with the IDBDatabase instance.
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { autoIncrement: true });
                // Still create an index on 'timestamp' for efficient sorting by age
                store.createIndex('timestamp', 'timestamp', { unique: true });
                console.log(`Object store '${STORE_NAME}' created with autoIncrement and 'timestamp' index.`);
            }
            else {
                // If the store already exists but needs an index (e.g., upgrading from v2 to v3)
                const store = request.transaction.objectStore(STORE_NAME);
                if (!store.indexNames.contains('timestamp')) {
                    // CRITICAL FIX: Changed unique to false for consistency.
                    store.createIndex('timestamp', 'timestamp', { unique: true });
                    console.log(`'timestamp' index added to '${STORE_NAME}'.`);
                }
            }
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject('Failed to open IndexedDB.');
        };
    });
}
/**
* Saves a new record to the store using autoIncrement.
* If the number of records exceeds MAX_RECORDS, the oldest record (based on timestamp)
* is replaced by the new one. Otherwise, the new record is simply added.
* Assumes data has a 'timestamp' property.
* @param newEntry The new data object to save. It must have a 'timestamp' property.
* @returns A Promise that resolves when the operation is complete.
*/
async function updateSavedQueries(newEntry) {
    const MAX_RECORDS = 20;
    // Ensure the new data has a timestamp
    newEntry.timestamp = Date.now();
    const db = await openDatabase(); // Open DB connection
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const timestampIndex = store.index('timestamp'); // Access the timestamp index
        const currentQueries = []; // To build the final list of items
        const cursorRequest = timestampIndex.openCursor(null, 'next'); // 'next' for ascending timestamp order
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const query = cursor.value;
                query.DBKey = cursor.primaryKey.toString(); // Attach the key to the query object for
                currentQueries.push(query);
                cursor.continue();
            }
            else {
                // All records have been iterated. Now perform the delete/add logic.
                if (currentQueries.length >= MAX_RECORDS)
                    aboveMax();
                else
                    belowMax();
            }
            function aboveMax() {
                console.warn(`Record count (${currentQueries.length}) has reached its limit: (${MAX_RECORDS} saved queries). Capping will be applied.`);
                const toDelete = currentQueries.slice(0, currentQueries.length + 1 - MAX_RECORDS); //Removing any extra items from the array: e.g.: if length = 18 this will give slice(0, 9), which will return array of 9 elements fom 0 to 8
                toDelete
                    .forEach(query => deleteQuery(query.DBKey || null, currentQueries.indexOf(query)));
                addNew(); // After deletion, add the new record
                function deleteQuery(dbKey, index) {
                    const deleteRequest = store.delete(Number(dbKey));
                    deleteRequest.onsuccess = () => {
                        currentQueries.splice(index, 1);
                        console.log(`Oldest record with key ${dbKey} deleted successfully.`);
                    };
                    deleteRequest.onerror = (event) => {
                        const message = `Error deleting the record which key is ${dbKey}:\n${event.target.error}`;
                        console.error(message);
                        alert(message);
                        reject('Failed to delete one or more of the oldest records.');
                    };
                }
            }
            function belowMax() {
                console.log(`Record count (${currentQueries.length}) is below the limit (${MAX_RECORDS} saved queries). Adding new record without capping.`);
                addNew(); // Add the new record without capping
            }
            function addNew() {
                const addRequest = store.add(newEntry);
                addRequest.onsuccess = (addEvent) => {
                    const newKey = addEvent.target.result;
                    console.log('New record added successfully with key:', newKey);
                    newEntry.DBKey = newKey.toString(); // Attach the key to the new entry
                    currentQueries.push(newEntry);
                };
                addRequest.onerror = (addEvent) => {
                    console.error('Error adding new data:', addEvent.target.error);
                    reject('Failed to add new data.');
                };
            }
        };
        cursorRequest.onerror = (event) => {
            console.error('Error during cursor iteration for capping:', event.target.error);
            reject('Failed to iterate records for capping.');
        };
        // Important: Ensure the transaction completes and handles DB closing
        transaction.oncomplete = () => {
            db.close(); // Close DB only when the *main* transaction completes
            console.log('Transaction completed successfully.');
            // Sort the final array by timestamp before resolving, for consistent output
            resolve(currentQueries);
        };
        transaction.onerror = (event) => {
            db.close(); // Close on error too
            console.error('Transaction error during capped autoIncrement save:', event.target.error);
            reject('Transaction failed during capped autoIncrement save.');
        };
        transaction.onabort = (event) => {
            db.close(); // Close on abort too
            console.warn('Transaction aborted:', event.target.error);
            reject('Transaction aborted.');
        };
    });
}
/**
* Retrieves all items from the specified IndexedDB object store.
* @param transaction (Optional) An existing IDBTransaction to use.
* @returns A Promise that resolves with an array of all retrieved data objects.
*/
async function getSavedQueries(transaction) {
    let db = null;
    let ownTransaction = transaction ? false : true; // Track if we opened the transaction ourselves
    // If no transaction is provided, open a new connection and create a transaction
    if (!transaction) {
        db = await openDatabase(); // Await openDatabase
        transaction = db.transaction(STORE_NAME, 'readonly');
    }
    const store = transaction.objectStore(STORE_NAME);
    const savedQueries = []; // Collect data with keys
    return new Promise((resolve, reject) => {
        const request = store.openCursor(); // Cursor by primary key
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // Attach the key to the item for debugging/display
                const query = cursor.value;
                query.DBKey = cursor.primaryKey.toString(); // Attach the key to the query object
                savedQueries.push(query);
                cursor.continue(); // Move to the next record
            }
            else {
                resolve(savedQueries); // Resolve when all records are iterated
            }
        };
        request.onerror = (event) => {
            console.error('Error retrieving all data from IndexedDB:', event.target.error);
            reject('Failed to retrieve all data.');
        };
        // Ensure the transaction's completion is handled, especially for own transactions
        if (ownTransaction) {
            transaction.oncomplete = () => {
                db === null || db === void 0 ? void 0 : db.close(); // Close the connection if this function opened it
                console.log('Standalone getAllIndexedDBData transaction completed and DB closed.');
            };
            transaction.onerror = (event) => {
                db === null || db === void 0 ? void 0 : db.close(); // Close on error too
                console.error('Standalone getAllIndexedDBData transaction error:', event.target.error);
                reject('Transaction failed during getAll (standalone).');
            };
            transaction.onabort = (event) => {
                db === null || db === void 0 ? void 0 : db.close(); // Close on abort too
                console.warn('Standalone getAllIndexedDBData transaction aborted.');
                reject('Transaction aborted during getAll (standalone).');
            };
        }
    });
}
async function getTranscriptionFromLinkToAudio() {
    //const podcastUrl = prompt('Please enter the URL of the audio file you want to transcribe:');
    //if (!podcastUrl) return alert('No URL provided. Please enter a valid URL.');
    const podcastUrl = prompt('Please enter the URL of the podcast audio file:') || '';
    console.log(`Podcast URL = ${podcastUrl}`);
    const audioUrl = await extractAudioURLfromRaiPodcast(podcastUrl) || prompt('Please provide the URL of the online audio you want to transcribe');
    showProgress(`Transcribing audio from url: ${audioUrl}`);
    if (!audioUrl)
        return showProgress(`Failed to extract the mp3 url of the Rai Radio url, or you did not provide a valid url`);
    if (voiceName.selectedIndex < 0)
        return alert('Please select a voice to use for the audio playback');
    const langCode = getLanguageCode().code;
    const audioConfig = {
        encoding: 'MP3',
        sampleRateHertz: 44100, // Or 16000, 48000 etc.,
        //audioChannelCount: integer,
        //enableSeparateRecognitionPerChannel: boolean,
        languageCode: langCode, // e.g., 'en-US', 'it-IT'
        //alternativeLanguageCodes: ['en-US', 'fr-FR', 'en-GB'].filter(lang=>lang !==langCode), // Optional, for multilingual audio
        //"maxAlternatives": integer,
        //"profanityFilter": boolean,
        /*adaptation: {
          object (SpeechAdaptation)
        },*/
        /*speechContexts: [
          {
            object (SpeechContext)
          }
        ],*/
        //enableWordTimeOffsets: boolean,
        //enableWordConfidence: boolean,
        enableAutomaticPunctuation: true,
        //enableSpokenPunctuation: true,
        //enableSpokenEmojis: boolean,
        /*diarizationConfig: {
          object (SpeakerDiarizationConfig)
        },*/
        /*metadata: {
          object (RecognitionMetadata)
        },*/
        //model: string,
        //useEnhanced: boolean
    };
    showProgress('Getting the audio transcription form Google Speech...', true);
    const query = `Transcribe the audio file from the following URL: ${audioUrl}. Please return the transcription as a single sentence without any additional text.`;
    const data = await callCloudFunction('transcribe', query, { audioUrl: audioUrl, audioConfig: audioConfig, isShort: false }); // Call the askGemini function with the cloud function URL
    const response = data === null || data === void 0 ? void 0 : data.response;
    if (!response) {
        const message = `No response received from Gemini API. data.response = ${data === null || data === void 0 ? void 0 : data.response}`;
        showProgress(message);
        throw new Error(message);
    }
    ;
    SENTENCES = [response];
    if (response.uri) {
        // If the response contains a URI, fetch the audio from that URI
        const audioResponse = await fetch(response.uri);
        if (!audioResponse.ok) {
            const message = `Failed to fetch audio from URI: ${response.uri}`;
            throw new Error(message);
        }
        const audioBlob = await audioResponse.blob();
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => processResponse(reader.result);
        return;
    }
    processResponse();
    async function processResponse(audio) {
        showProgress(null, true);
        if (audio)
            response.audio = audio; // Convert the ArrayBuffer to Uint8Array
        await playSentences([response], true, true);
        const ask = prompt('If you want to save the audio and the transcription, please provide the name of the program', 'Rai Radio 3');
        if (ask)
            await saveSentences([response], `Transcription: ${ask}`);
    }
}
async function deleteFileFromGoogleStorageBucket(fileURI) {
    const fileName = fileURI.split('/')[0];
    const response = await callCloudFunction('deleteFile', 'delete file from storage', { fileName: fileName });
}
function showProgress(message, clear = false) {
    if (clear)
        geminiOutput.innerHTML = "";
    if (!message)
        return;
    const p = document.createElement('p');
    p.textContent = message;
    geminiOutput.appendChild(p);
}
/**
 * Fetches an HTML document from a URL, parses it, and then extracts
 * the 'contentUrl' (audio URL) from the Schema.org JSON-LD script within.
 *
 * @param {string} url The URL of the HTML document to fetch.
 * @returns {Promise<string | null>} A Promise that resolves with the extracted audio URL (string),
 * or null if the URL cannot be fetched, parsed, or the audio URL
 * is not found in the Schema.org data.
 */
async function extractAudioURLfromRaiPodcast(url) {
    if (!(url === null || url === void 0 ? void 0 : url.includes('raiplaysound')))
        return null;
    try {
        const podcastPage = await fetchHtmlDocument(url);
        // 5. Locate the JSON-LD script tag
        if (!podcastPage)
            return null;
        function extractVideo(podcastPage) {
            var _a;
            const videos = Array.from(podcastPage.querySelectorAll('VIDEO'));
            if (!videos.length) {
                showProgress('No video elements were found on the page parsed from the url you provided');
                return null;
            }
            const src = ((_a = Array.from(videos).find(v => v.id === 'vjs_video_3_html5_api')) === null || _a === void 0 ? void 0 : _a.src) || null;
            showProgress(`Successfully extracted the mp3 url from the provided link. The mp3 url is:\n ${src}`);
            return src;
        }
        const scriptTag = podcastPage === null || podcastPage === void 0 ? void 0 : podcastPage.querySelector('script[type="application/ld+json"]');
        if (!scriptTag) {
            const error = `No <script type="application/ld+json"> tag found in the document from: ${url}`;
            showProgress(error);
            throw new Error(error);
        }
        // 6. Extract and parse the JSON content
        const jsonString = scriptTag === null || scriptTag === void 0 ? void 0 : scriptTag.textContent;
        if (!jsonString)
            return null;
        const schemaData = JSON.parse(jsonString);
        // 7. Access the 'associatedMedia.contentUrl' property
        if (schemaData && schemaData.associatedMedia && schemaData.associatedMedia.contentUrl) {
            return schemaData.associatedMedia.contentUrl;
        }
        else {
            const error = `The "associatedMedia.contentUrl" property was not found in the Schema.org data for: ${url}`;
            showProgress(error);
            throw new Error(error);
        }
    }
    catch (error) {
        showProgress(`An unexpected error occurred while fetching or processing: ${url}\n error: ${error}`);
        return null;
    }
    async function fetchHtmlDocument(url) {
        var _a;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const error = `failed to fetch html document from the url: ${url}`;
                showProgress(error);
                throw new Error(error);
            }
            // 2. Check if the Content-Type header suggests HTML
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('text/html')) {
                console.warn(`Response content type is not HTML: ${contentType || 'N/A'} for URL: ${url}`);
                return null;
            }
            // 3. Get the entire response body as text
            const htmlText = await response.text();
            // 4. Parse the HTML text into a Document object
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(htmlText, 'text/html');
            // Optional: Check for HTML parsing errors
            if (htmlDoc.querySelector('parsererror')) {
                const error = `HTML parsing errors detected in document from url: ${url}\n${(_a = htmlDoc.querySelector('parsererror')) === null || _a === void 0 ? void 0 : _a.textContent}`;
                showProgress(error);
                throw new Error(error);
            }
            return htmlDoc;
        }
        catch (error) {
            const message = `Failed to parse html document from url, and got an error: ${error}`;
            showProgress(message);
            console.error(message);
        }
    }
    async function getPodcastUrl(url) {
        var _a;
        const doc = await fetchHtmlDocument(url);
        if (!doc)
            return null;
        const players = doc.getElementsByTagName('video');
        if (!players.length)
            return null;
        return (_a = players[1]) === null || _a === void 0 ? void 0 : _a.src;
    }
}
;
//# sourceMappingURL=app.js.map