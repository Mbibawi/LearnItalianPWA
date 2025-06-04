"use strict";
const translationInput = document.getElementById('translationInput');
const languageSelect = document.getElementById('languageSelect');
const repeatCountInput = document.getElementById('repeatCount');
const pauseDurationInput = document.getElementById('pauseDuration');
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
    const response = await fetch('https://gemini-proxy-428231091257.europe-west1.run.app', {
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
async function askGemini() {
    const accessToken = await getAccessToken();
    if (!accessToken)
        return console.log('No access Token');
    const userQuery = geminiInput.value.trim();
    if (!userQuery)
        return console.log('Invalid user query');
    geminiOutput.textContent = 'Processing...';
    try {
        const result = await submitUserQuery(accessToken, userQuery);
        geminiOutput.textContent = result;
    }
    catch (error) {
        geminiOutput.textContent = 'Error: ' + error.message;
        console.error(error);
    }
}
;
async function submitUserQuery(accessToken, userQuery) {
    var _a, _b, _c, _d, _e, _f;
    const data = await fetchWithOAuth(accessToken, apiUrl, {
        contents: [{ parts: [{ text: userQuery }] }]
    });
    return ((_f = (_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) === null || _f === void 0 ? void 0 : _f.trim()) || 'No response';
}
async function fetchWithOAuth(accessToken, url, body) {
    if (!accessToken)
        return;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return await res.json();
}
// Function to generate a random state for CSRF protection
function generateState() {
    const array = new Uint32Array(10);
    window.crypto.getRandomValues(array);
    return Array.from(array, (dec) => dec.toString(16).padStart(8, '0')).join('');
}
// Function to initiate the OAuth 2.0 flow
function initiateOAuthFlow() {
    const state = generateState();
    localStorage.setItem('oauth_state', state); // Store state for verification
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = {
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'token', // Request an access token
        scope: SCOPES,
        state: state,
        include_granted_scopes: 'true',
        prompt: 'select_account', // Optional: Force account selection
    };
    const authUrl = `${oauth2Endpoint}?${new URLSearchParams(params).toString()}`;
    window.location.href = authUrl; // Redirect the user to Google's authorization server
    return handleOAuthCallback();
}
// Function to parse the access token and state from the redirect URI
function handleOAuthCallback() {
    const hash = window.location.hash.substring(1); // Remove the leading '#'
    const params = Object.fromEntries(new URLSearchParams(hash).entries());
    const accessToken = params.access_token || null;
    const state = params.state || null;
    const storedState = localStorage.getItem('oauth_state');
    localStorage.removeItem('oauth_state'); // Remove the stored state
    const isValidState = state === storedState;
    return { accessToken, isValidState };
}
// Function to call the Gemini API using the access token
async function translateWithGeminiApi(accessToken, text, targetLanguage) {
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: `Translate the following English text to ${targetLanguage}: ${text}`,
                    },
                ],
            },
        ],
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        else {
            throw new Error("Translation not found in response");
        }
    }
    catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}
async function translateAndRepeat() {
    const accessToken = await getAccessToken();
    if (!accessToken)
        return console.log('Could not get accessToken');
    const text = translationInput.value.trim();
    const targetLang = languageSelect.value;
    const sourceLanguage = 'en'; // Default to English, can be modified as needed
    const count = parseInt(repeatCountInput.value);
    const pause = parseInt(pauseDurationInput.value);
    resultOutput.textContent = 'Translating with Gemini...';
    //const translation = await translateText(accessToken, text, targetLang);
    const translation = await translateUsingGoogleFunction(accessToken, text, sourceLanguage, targetLang);
    if (!text || isNaN(count) || isNaN(pause))
        return;
    if (!translation)
        return;
    resultOutput.textContent = translation;
    repeatText(translation, count, pause);
}
// Repetition logic with pause
async function repeatText(text, count, pause) {
    for (let i = 0; i < count; i++) {
        speak(text);
        await new Promise(resolve => setTimeout(resolve, (pause + 1) * 1000));
    }
}
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        // Ensure that CLIENT_ID and REDIRECT_URI are defined elsewhere in your code
        if (!CLIENT_ID || !REDIRECT_URI) {
            reject(new Error('CLIENT_ID or REDIRECT_URI is not defined.'));
            return;
        }
        // Initialize the Google Sign-In client
        try {
            const client = google.accounts.oauth2.initCodeClient({
                client_id: CLIENT_ID,
                scope: 'openid profile email', // Adjust scopes as needed
                redirect_uri: REDIRECT_URI,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        resolve(tokenResponse.access_token);
                    }
                    else {
                        reject(new Error('Failed to retrieve access token.'));
                    }
                },
            });
            // Attempt to get a token by displaying a popup
            client.popup();
        }
        catch (error) {
            reject(new Error(`Failed to initialize or display popup: ${error.message}`));
        }
    });
}
async function _getAccessToken() {
    return 'ya29.a0AW4XtxgkjhpIw3bW--snd_zp_lEgIXcBpIMxMCseznf3L1kI_ixCO4M4KUwsnSj5EYQZeZSVoN0ulVS-ntTDdrlORwo5VmibOXhIl4GBpvOsEh-yHGJqKeVS0DteqwnLyUTg4qi9lxXxjZ7YwQa0JpJxU18skviF1Z5eYuCY3waCgYKAUoSARUSFQHGX2MiD79Fg4JyZ2jZ3tdy6cT7zg0177';
    const oauthCallback = window.location.pathname === '/LearnItalianPWA/'; // Check if it's the redirect URI
    if (!oauthCallback)
        return;
    const { accessToken, isValidState } = initiateOAuthFlow();
    if (accessToken && isValidState) {
        console.log('Successfully authenticated!');
        localStorage.setItem('access_token', accessToken); // Store the access token
        //Remove the fragment identifier from the URL
        history.replaceState({}, document.title, window.location.pathname);
        return accessToken;
    }
    else {
        console.error('Authentication failed.');
        // Handle authentication failure (e.g., display an error message)
    }
    // Check if there's an existing access token
    const storedAccessToken = localStorage.getItem('access_token');
}
// Speak text using SpeechSynthesis API
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    speechSynthesis.speak(utterance);
}
// Main application logic
async function translateText(accessToken, textToTranslate, targetLanguage) {
    if (!accessToken)
        return;
    // Use the access token to call the Gemini API
    try {
        const translatedText = await translateWithGeminiApi(accessToken, textToTranslate, targetLanguage);
        console.log(`Translated Text: ${translatedText}`);
        return translatedText; // Return the translated text to be displayed or used
    }
    catch (error) {
        console.error('Error during translation:', error);
        // Handle API error (e.g., display an error message)
    }
}
/*
Explanation:

OAuth 2.0 Flow Initiation:

The initiateOAuthFlow() function generates a random state value for CSRF protection and stores it in localStorage.

It constructs the authorization URL with the necessary parameters(client ID, redirect URI, response type, scope, and state).

It redirects the user to Google's authorization server.

OAuth 2.0 Callback Handling:

The handleOAuthCallback() function is called when the user is redirected back to your PWA after authentication.

It parses the access token and state from the URL fragment(window.location.hash).

It verifies that the state matches the stored state to prevent CSRF attacks.

If the state is valid, it stores the access token in localStorage.

Gemini API Call:

The callGeminiApi() function takes the access token, text to translate, and target language as input.

It constructs the API URL and the request body.

It makes the API call using fetch, setting the Authorization header with the access token.

It parses the response and returns the translated text.

Main Application Logic:

The main() function checks if the current URL is the OAuth 2.0 redirect URI.

If it is, it calls handleOAuthCallback() to process the access token.

It checks if there's an existing access token in localStorage.

If there is, it calls callGeminiApi() to translate the text.

If there isn't, it calls initiateOAuthFlow() to start the OAuth 2.0 flow.

Key Points and Cautions:

Replace Placeholders: Replace YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com and https://your-pwa-domain.com/oauth2callback with your actual client ID and redirect URI.

State Management: The state parameter is crucial for CSRF protection.Ensure that you generate a strong, random state and verify it in the callback.

Error Handling: Implement robust error handling throughout the code to catch API errors, authentication failures, and other issues.

    Storage: localStorage is used for simplicity, but it's not the most secure option for storing access tokens. Consider using the sessionStorage or other more secure options if your PWA is not meant to work offline.

Refresh Tokens: This example only retrieves an access token, which expires after a certain period.In a real - world application, you'll need to implement a mechanism to refresh the access token using a refresh token (if the Gemini API supports it with OAuth). The Implicit grant type does not provide Refresh Token.

Security:

Never store the client secret in the client - side code.The client secret is only used on the server - side.

Validate the redirect URI: Ensure that the redirect URI is properly configured in your Google Cloud project and that it matches the URL of your PWA's OAuth 2.0 callback page.

Use HTTPS: Your PWA must be served over HTTPS for security.

Consider using PKCE: Proof Key for Code Exchange(PKCE) is a security extension to OAuth 2.0 that helps to protect against authorization code interception attacks.It's highly recommended for browser-based applications. This example does not implement it.

CORS: In this scenario, the Google OAuth 2.0 endpoint handles the CORS headers, assuming your Authorized JavaScript origins are correctly configured in your Google Cloud project.

Permissions and Scope: Set the API_SCOPE correctly to give access to the correct endpoint

oauth2callback Route: Make sure the oauth2callback route exists in your PWA and handles the logic as described.

Additional Improvements(Beyond this example):

PKCE(Proof Key for Code Exchange): Implement PKCE for enhanced security.

Token Refresh: Implement a mechanism to refresh the access token when it expires(using refresh tokens).

User Interface: Provide a user - friendly interface for initiating the OAuth 2.0 flow and displaying the translated text.

Error Handling: Implement more robust error handling and display informative error messages to the user.

Backend Proxy(Recommended): As mentioned before, the most secure approach is to use a backend proxy to handle authentication and API calls.

This code provides a foundation for implementing OAuth 2.0 authentication in your PWA to access the Gemini API.Remember to prioritize security and follow best practices.Be aware of the limitations of client - side OAuth and strongly consider using a backend proxy for a more secure solution.
*/ 
//# sourceMappingURL=app.js.map