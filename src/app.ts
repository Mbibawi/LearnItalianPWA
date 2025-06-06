(function() { // Self-executing anonymous function
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
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    });
  }

  // Automatically call the function when this script loads
  ensureServiceWorkerRegisteredInternal();
})();

type Sentence = { text: string;  audio: string };
const sourceLangSelect = document.getElementById('sourceLanguage') as HTMLSelectElement;
const targetLangSelect = document.getElementById('targetLanguage') as HTMLSelectElement;
const repeatCountInput = document.getElementById('repeatCount') as HTMLInputElement;
const voiceRate = document.getElementById('voiceRate') as HTMLInputElement;
const voicePitch = document.getElementById('voicePitch') as HTMLInputElement;
const pauseInput = document.getElementById('pauseDuration') as HTMLInputElement;
const voiceName = document.getElementById('voiceName') as HTMLSelectElement;

const geminiInput = document.getElementById('geminiQuery') as HTMLInputElement;
const geminiOutput = document.getElementById('geminiResponse') as HTMLDivElement;
const sendQueryBtn = document.getElementById('askGemini') as HTMLButtonElement;
const sentencesBtn = document.getElementById('getSentences') as HTMLButtonElement;

const preFilled = [
  sourceLangSelect,
  targetLangSelect,
  voiceName,
  pauseInput,
  repeatCountInput,
  voiceRate,
];

const CLIENT_ID = '428231091257-9tmnknivkkmmtpei2k0jrrvc4kg4g4jh.apps.googleusercontent.com';//Google Client ID for the gemini API
const REDIRECT_URI = 'https://mbibawi.github.io/LearnItalianPWA/';
const SCOPES = 'https://www.googleapis.com/auth/userinfo.email';
const API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // Or the specific Gemini API scope

const SENTENCES_API = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/sentences'
const ASK_API = 'https://gemini-proxy-428231091257.europe-west1.run.app/api/ask'


// Gemini Buttons Handleers
sentencesBtn.onclick = getSentences;
sendQueryBtn.onclick = askGemini;

// Language selection handlers
(function populateVoiceOptions() {
  // Array of available voice options for the Text-to-Speech API
  // This list is manually curated based on Google Cloud Text-to-Speech standard voices.
  type Option = {
    text: string; name: string; lang: string};
  const voices: Option[] = [
    // English (US)
    { text: "English (US) (Male)", name: "US-Neural2-A", lang:"EN" },
    { text: "English (US) (Female)", name: "US-Neural2-C", lang:"EN" },
    { text: "English (US) (Male)", name: "US-Neural2-D", lang:"EN" },
    { text: "English (US) (Female)", name: "US-Neural2-E", lang:"EN" },
    { text: "English (US) (Female)", name: "US-Neural2-F", lang:"EN" },
    { text: "English (US) (Female)", name: "US-Neural2-G", lang:"EN" },
    { text: "English (US) (Female)", name: "US-Neural2-H", lang:"EN" },
    { text: "English (US) (Male)", name: "US-Neural2-I", lang:"EN" },
    { text: "English (US) (Male)", name: "US-Neural2-J", lang:"EN" },
    { text: "English (US) (Male)", name: "US-Standard-A", lang:"EN" },
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
    const option = document.createElement('option');
    option.lang = voice.lang; // Set the language attribute for the option
    option.dataset.country = voice.name.split('-')[0]; //e.g., 'GB' for British English
    option.value = `${voice.lang.toLowerCase()}-${voice.name}`; // e.g., 'en-US-Standard-A'
    option.textContent = voice.text;
    voiceName.appendChild(option);
  });
})();



// Initialize the voice selection dropdown with the first option as default
(function initializeInputs() {
  // Load settings from localStorage if available 
  const settings = localStorage.geminiSettings ? JSON.parse(localStorage.geminiSettings) : null;
  if (!settings) return;
  preFilled.forEach(input => input.value = settings[input.id]); // Set the value from localStorage or keep the default
  })();

/**
 * Asks Gemini API for a response based on the input query.
 * This function retrieves the access token, constructs the request,
 * and plays the audio response.
 * @returns {Promise<void>} A promise that resolves when the audio is played.
 */
async function askGemini(): Promise<void | any[]> {
 
  //const accessToken = await getAccessToken();
  //if (!accessToken) return console.log('Could not get accessToken');

  const prompt = geminiInput.value.trim(); // Get the input query from the text area 

  geminiOutput.textContent = 'Asking Gemini...';


  const data = await callCloudFunction(ASK_API, prompt); // Call the askGemini function with the cloud function URL

  const response:Sentence = data.response;

  if (!response) throw new Error('No response received from Gemini API');
  
  geminiOutput.textContent = "";
  
  await playAudio(response);
  
}

/**
 * Retrieves the access token for Google APIs.
 * This function is a placeholder and should be implemented to fetch the token.
 * @returns {Promise<string>} A promise that resolves to the access token.
 */
async function getSentences(){
  
  const number = prompt('How many sentences do you want to get from Gemini? (default is 3)');

  const words = prompt('Do you want to set the maximum number of words for each sentence ?');
  
  const targetLanguage = targetLangSelect.options[targetLangSelect.selectedIndex].text || prompt("You must define the target language, otherwise it will be set to \"English\"", "English") || "English";
    
  
  let query = geminiInput.value.trim(); // Get the input query from the text area

  query = `Generate ${isNaN(Number(number)) ? 3 : Number(number)} distinct sentences in the ${targetLanguage} language according to the following guidelines or instructions: ${query}. Each sentence should not exceed ${isNaN(Number(words))?10:Number(words)} words long. Return the sentences as a JSON array of strings. For example: ["Sentence one.", "Sentence two."]\nEnsure the output is ONLY the JSON array.`;
  
  
  const data = await callCloudFunction(SENTENCES_API, query); // Call the askGemini function with the cloud function URL
  
  const sentences:Sentence[] = data.sentences; // Extract sentences from the response
  
  if (!data.sentences) throw new Error('No sentences received from Gemini API');
  
  geminiOutput.textContent = "";
  
  const repeatCount = parseInt(repeatCountInput.value) || 1;
  const pause = parseInt(pauseInput.value) * 1000 || 1000

  const results = [];
  
  for (const sentence of sentences) {
    results.push(await playAudio(sentence, repeatCount, pause, true)); // Collect results
  };

};


/**
 * Plays audio for a given text and Base64 encoded audio data.
 * @param {Object} params - The parameters for the audio playback.
 * @param {string} params.text - The text to display in the UI.
 * @param {string} params.audioBase64 - The Base64 encoded audio data.
 * @param {number} [repeatCount=1] - The number of times to repeat the audio playback.
 * @param {number} [pause=1000] - The pause duration between repetitions in milliseconds.
 */
async function playAudio({text, audio}: Sentence, repeatCount: number = 1, pause:number = 1000, translate:boolean = false): Promise<void> {
  console.log('Playing audio for sentence:', text);
  // Display the text in the UI
  geminiOutput.textContent = `${geminiOutput.textContent}\n${text}`;
  const translation = await translateSentence(text, "English", translate);

  if (translation)
    geminiOutput.textContent += ` (English Translation: ${translation})`; // Display the translation if available

  if (!audio) return alert('No audio to play.');

  const repeat = Array(repeatCount).fill(0).map((_, i) => i); // Create an array to repeat the audio
  const player = document.getElementById('audioPlayer') as HTMLAudioElement || document.createElement('audio'); // Create or get the audio player

  player.id = 'audioPlayer';
  player.src = ''; // Clear the source initially
  player.style.display = 'block'; // Ensure the audio player is visible
  player.controls = true; // Enable controls for the audio player
  player.autoplay = false; // Disable autoplay
  geminiOutput.insertAdjacentElement('beforebegin', player); // Insert the audio player before the output div

  const audioSrc = `data:audio/mp3;base64,${audio}`;
  player.src = audioSrc;

    for (const play of repeat) {
      player.currentTime = 0; // Reset to start
      await player.play();
      await delay(pause);
    }
    
  console.log('Audio sentences played successfully.');

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function translateSentence(text: string, targetLang: string, translate: boolean): Promise<string | null> {
    if (!translate) return null;
    const query = `Translate the following sentence to ${targetLang}: "${text}". Return only the translated sentence without any additional text."`;
    const data = await callCloudFunction(ASK_API, query, { noAudio: true });
    const response:Sentence = data.response;
    return response.text|| null; // Return the translation text or null if not available
  }

  function getAudioURL(audio:string, mimeType: string): string {
    // Decode the Base64 audio string
    const audioBlob = b64toBlob(audio, mimeType);
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl // Return both if needed
  }
  function b64toBlob(base64: string, mimeType: string): Blob {
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
async function callCloudFunction(url: string, query?:string, params?:{ [key: string]: any }): Promise<any> {
  // const accessToken = await getAccessToken();
  
  if (!query) return alert('Please enter a query to send to Gemini');
  
  if (voiceName.selectedIndex < 0) return alert('Please select a voice to use for the audio playback');
  
  const voice = voiceName.options[voiceName.selectedIndex];
  if (!voice.lang || !voice.dataset.country || !voice.value) return alert('The selected voice is missing language or country information. Please select a valid voice.');
  
  const voiceParams = {
    languageCode: `${voice.lang.toLowerCase()}-${voice.dataset.country}`, // e.g., 'en-GB' for Grand Britain English
    name: voice.value,
  };
  
  const audioConfig = {
    audioEncoding: 'MP3',// Or 'LINEAR16' for uncompressed WAV
    speakingRate: voiceRate.valueAsNumber || 1.0,  // 0.25 to 4.0 (1.0 is normal)
    // pitch: voicePitch.valueAsNumber || 1.0,  // -20.0 to 20.0 (0.0 is normal)
    //  volumeGainDb: 0.0,  // -96.0 to 16.0 (0.0 is normal)
    // effectsProfileId: ['small-bluetooth-speaker-effect'], // Optional, for specific audio profiles
  }
  
  setLocalStorage(); // Save settings to localStorage
  console.log('Calling Gemini with query:', query, 'and voice params:', voiceParams, 'and audio config:', audioConfig);
  geminiOutput.textContent = 'Fetching Gemini Query...'; // Update the UI to indicate fetching
  try {
    return await fetchGemini();
  } catch (error) {
    console.log('Error fetching Gemini Query: ', error)
    return null
  }
  
  async function fetchGemini() {
    geminiOutput.textContent = '';
    const body = {
      query: query,
      ...params, // Include any additional parameters if needed
      voiceParams: voiceParams,
      audioConfig: audioConfig,
    };
    const response = await fetch(url, { // <-- This is your "client" call
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
async function getAccessToken(prompt: boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    // Ensure that CLIENT_ID and REDIRECT_URI are defined elsewhere in your code
    if (!CLIENT_ID || !REDIRECT_URI) {
      reject(new Error('CLIENT_ID or REDIRECT_URI is not defined.'));
      return;
    }
    type token = { access_token?: string; error?: string; error_description?: string }
    // Initialize the Google Sign-In client
    try {
      //@ts-expect-error
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid profile email', // Adjust scopes as needed
        redirect_uri: REDIRECT_URI,
        callback: (tokenResponse: token) => {
          if (tokenResponse && tokenResponse.access_token) {
            resolve(tokenResponse.access_token);
          } else {
            // Determine if user interaction is needed
            const requiresInteraction = tokenResponse.error === 'consent_required' || tokenResponse.error === 'login_required' || tokenResponse.error === 'interaction_required';

            // Handle errors from silent attempt
            if (requiresInteraction) {
              // User needs to grant consent or log in/select account
              // Trigger the interactive flow with a user gesture
              // (e.g., a button click)
              console.log("Silent token acquisition failed. User interaction needed.");
              // We DO NOT automatically call client.requestAccessToken() here again without a user gesture. This would lead to pop-up blockers.

              if (confirm("Silent token acquisition failed. User interaction needed. Do you agree to manually login to your google account?")) getAccessToken(true);
              else reject(new Error(`Failed to retrieve access token: ${tokenResponse.error || 'Unknown error'}`));

            }
          }
        },
      });

      client.requestAccessToken();
      // Attempt to get a token silently, prompting the user to select an account if needed
      //if (!prompt) client.requestAccessToken({ prompt: 'none' });
      //else client.requestAccessToken();
    } catch (error: any) {
      reject(new Error('User interaction required for token acquisition.'));
    }
  });
}

function setLocalStorage() {
  const values = preFilled.forEach(input => [input.id, input.value]); // Create an object with the input IDs and their values
  localStorage.geminiSettings = JSON.stringify(values);
  console.log('Settings saved to localStorage:', values);
}