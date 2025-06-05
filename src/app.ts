
const translationInput = document.getElementById('translationInput') as HTMLInputElement;
const sourceLangSelect = document.getElementById('sourceLanguage') as HTMLSelectElement;
const targetLangSelect = document.getElementById('targetLanguage') as HTMLSelectElement;
const repeatCountInput = document.getElementById('repeatCount') as HTMLInputElement;
const voiceRate = document.getElementById('voiceRate') as HTMLInputElement;
const voicePitch = document.getElementById('voicePitch') as HTMLInputElement;
const pauseDurationInput = document.getElementById('pauseDuration') as HTMLInputElement;
const voiceName = document.getElementById('voiceName') as HTMLSelectElement;
const translateButton = document.getElementById('translateButton') as HTMLButtonElement;
const resultOutput = document.getElementById('translatedResult') as HTMLDivElement;

const geminiInput = document.getElementById('geminiQuery') as HTMLInputElement;
const geminiButton = document.getElementById('askGemini') as HTMLButtonElement;
const geminiOutput = document.getElementById('geminiResponse') as HTMLDivElement;

(function initializeFields() {
  // Load settings from localStorage if available 
  const settings = localStorage.geminiSettings ? JSON.parse(localStorage.geminiSettings) : null;
  if (!settings) return;
  sourceLangSelect.value = settings.sourceLanguage || 'en'; // Default to English
  targetLangSelect.value = settings.targetLanguage || 'en'; // Default to English
  repeatCountInput.value = settings.repeatCount || '1'; // Default to 1
  voiceRate.value = settings.voiceRate || '1'; // Default to normal rate 
  voiceName.value = settings.voiceName || 'en-US-Standard-A'; // Default voice
})();

const apiUrl = 'https://generativeai.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent'; // Or the Gemini API endpoint
// Replace with your actual client ID and redirect URI
const CLIENT_ID = '428231091257-9tmnknivkkmmtpei2k0jrrvc4kg4g4jh.apps.googleusercontent.com';
const REDIRECT_URI = 'https://mbibawi.github.io/LearnItalianPWA/';
const SCOPES = 'https://www.googleapis.com/auth/userinfo.email';
const API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'; // Or the specific Gemini API scope

let currentAudioPlayer: HTMLAudioElement;

// Gemini query handler
geminiButton.onclick = async () =>await askGemini();
translateButton.onclick = translateAndRepeat;
  
async function translateUsingGoogleFunction(accessToken: string, text: string, sourceLanguage:string, targetLanguage: string): Promise<string> {
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
  if (!accessToken) return console.log('Could not get accessToken');
  const text = translationInput.value;
  const targetLang = targetLangSelect.value;
  const sourceLanguage = sourceLangSelect.value;
  const pause = parseInt(pauseDurationInput.value) || 1;
  const count = parseInt(repeatCountInput.value) || 1;
  if (!text || !targetLang || !sourceLanguage) return;
  
  resultOutput.textContent = 'Translating with Gemini...';
  //const translation = await translateText(accessToken, text, targetLang);

  const rate = voiceRate.valueAsNumber || 1.0;
  const pitch = voicePitch.valueAsNumber || 1.0;

  const voice = getVoice(); // Get the selected voice
  const sentences = text.split('//');

  for (const sentence of sentences) { 
    await processSentence(sentence.trim())
  }
  
  setLocalStorage(); // Save settings to localStorage

  async function processSentence(sentence: string) {
    const translation = await translateUsingGoogleFunction(accessToken, sentence, sourceLanguage, targetLang);
    if (!translation) return;
    resultOutput.textContent = translation;
    await repeatText(translation, targetLang, count, pause, voice, rate, pitch); // Call the repeatText function with the translation

  }

  function getVoice() {
    const voice = voiceName.value;
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.name === voice)
    }
    
  
}

// Repetition logic with pause
async function repeatText(text: string, lang:string, count: number, pause: number, voice:SpeechSynthesisVoice | undefined, rate:number = 1, pitch:number = 1) {
    for (let i = 0; i < count; i++) {
      speak(text, lang, voice, rate, pitch); // Speak the text with default rate and pitch
      await new Promise(resolve => setTimeout(resolve, (pause + 1) * 1000));
    }
}

// Speak text using SpeechSynthesis API
function speak(text: string, lang: string, voice?: SpeechSynthesisVoice, rate: number = 1, pitch: number = 1) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = `${lang.toLocaleLowerCase()}-${lang.toUpperCase()}`; // Set language for the utterance
  utterance.pitch = pitch; // Set the pitch for the utterance
  utterance.rate = rate; // Set the speaking rate

    if (voice) {
      utterance.voice = voice;
    } else {
      console.log(`Voice "${voiceName}" not found. Using default voice.`);
    }
  
  speechSynthesis.speak(utterance);
}

async function getAccessToken(prompt:boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    // Ensure that CLIENT_ID and REDIRECT_URI are defined elsewhere in your code
    if (!CLIENT_ID ||! REDIRECT_URI) {
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

async function askGemini() {
  const cloudFunctionUrl = 'https://gemini-proxy-428231091257.europe-west1.run.app/generate-audio-content';
 // const accessToken = await getAccessToken();
  const queryText = geminiInput.value.trim();
  let lang = targetLangSelect.options[targetLangSelect.selectedIndex].value || 'en'; // Default to Italian if no target language is selected
  lang = `${lang.toLowerCase()}-${lang.toUpperCase()}`; // e.g., 'it-IT' for Italian
  const voiceParams = {
    languageCode: lang,
    name: prompt('Provide the voice name', `${lang}-Standard-E`) || `${lang}-Standard-E`, // Example standard voice
  };
  const audioConfig = {
    audioEncoding: 'MP3',// Or 'LINEAR16' for uncompressed WAV
    speakingRate: voiceRate.valueAsNumber || 1.0,  // 0.25 to 4.0 (1.0 is normal)
   // pitch: voicePitch.valueAsNumber || 1.0,  // -20.0 to 20.0 (0.0 is normal)
  //  volumeGainDb: 0.0,  // -96.0 to 16.0 (0.0 is normal)
   // effectsProfileId: ['small-bluetooth-speaker-effect'], // Optional, for specific audio profiles
  }

  voiceName.value = voiceParams.name; // Set the voice name in the UI;
  
  setLocalStorage(); // Save settings to localStorage
  
  try {
    await fetchGemini();
  } catch (error) {
    console.log('Error fetching Gemini Query: ', error)
  }
  

  async function fetchGemini() {
    geminiOutput.textContent = '';
      const body = {
        query: queryText,
        voiceParams: voiceParams,
        audioConfig: audioConfig,
      };
      const response = await fetch(cloudFunctionUrl, { // <-- This is your "client" call
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                //'Authorization': `Bearer ${accessToken}` // If you add authentication
            },
            body: JSON.stringify(body)
        });
      
      // ... handle response ...
      const data = await response.json(); // Parse the JSON response
      const { sentences, audioMimeType } = data; // Destructure the response
      if (!sentences) throw new Error('No sentences received from Gemini API');
      type sentence = { text: string; audio: string };
      const pause = parseInt(pauseDurationInput.value) || 1;
      const repeatCount = parseInt(repeatCountInput.value) || 1;
      const repeat = Array(repeatCount).fill(0).map((_,i)=>i); // Create an array to repeat the audio
          // If there's an existing player, stop it before creating a new one
        if (currentAudioPlayer) {
          currentAudioPlayer.pause();
          currentAudioPlayer.currentTime = 0; // Rewind
          URL.revokeObjectURL(currentAudioPlayer.src); // Revoke old URL
      }
      const audioPlayer = new Audio();
      currentAudioPlayer = audioPlayer; // Store the reference
    const results = [];

    for (const sentence of sentences) {
      results.push(await playSentence(sentence)); // Collect results
    };

    return results;
  
    async function playSentence({text, audio}:sentence) {
        console.log('Received text from Gemini:', text);
        // Display the text in the UI
        geminiOutput.textContent = `${geminiOutput.textContent}\n${text}`;

        if (!audio || !audioMimeType) {
          console.warn('No audio data received or MIME type missing.');
          return text
        };

          // Decode the Base64 audio string
          const audioBlob = b64toBlob(audio, audioMimeType);
          const audioUrl = URL.createObjectURL(audioBlob);
        // Create the new audio player
        audioPlayer.src = audioUrl;
        
        for (const play of repeat) { 
          audioPlayer.currentTime = 0; // Reset to start
          await audioPlayer.play();
          await delay(Math.floor(pause) * 1000);
        }
        console.log('Audio played successfully.');
          URL.revokeObjectURL(audioUrl);
          return { text, audioUrl }; // Return both if needed
    }
        
  }

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
    
};

function b64toBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function setLocalStorage() {
  const values = {
    sourceLanguage: sourceLangSelect.value,
    targetlanguage: targetLangSelect.value,
    repeatCount: repeatCountInput.value,
    voiceRate: voiceRate.value,
    voicePitch: voicePitch.value,
    pauseDuration: pauseDurationInput.value,
    voiceName: voiceName.value,
  }
  localStorage.geminiSettings = JSON.stringify(values);
  console.log('Settings saved to localStorage:', values);
}