//Google Function index.js
//@ts-check
// Import necessary modules

const { GoogleGenAI } = require("@google/genai");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const { SpeechClient } = require("@google-cloud/speech");
const { Storage } = require("@google-cloud/storage");
const { TranslationServiceClient } = require('@google-cloud/translate');
const mm = require("music-metadata");

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PROJECT_ID = process.env.GEMINI_PROJECT_ID;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash";


// Initialize the Google Generative AI client
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Initialize the Text-to-Speech client
const textToSpeechClient = new TextToSpeechClient();

// Create a client object to interact with the API
// The project ID is automatically inferred from the environment
const translate = new TranslationServiceClient();

// Initialize the Speech-to-Text client
const speechClient = new SpeechClient();
//Initialize Storage Client
const storageClient = new Storage();

const MB = 1024 * 1024;

// --- Helper Functions (Shared by multiple endpoints) ---

async function getAudioFromSentence(
  sentence,
  voiceParams,
  audioConfig,
  ssml,
  generate = false
) {
  if (!sentence) {
    console.warn("Attempted to get audio for an empty sentence.");
    return null;
  }

  return await callTextToSpeechAPI();

  //return await usingGeminiTtsAPI();

  async function callTextToSpeechAPI() {
    console.log("voiceParams = ", voiceParams);
    if (voiceParams.name?.includes("Chirp3")) ssml = false;
    const input = ssml ? { ssml: sentence } : { text: sentence };
    const request = {
      input: input,
      voice: voiceParams,
      audioConfig: audioConfig,
    };
    try {
      const [response] = await textToSpeechClient.synthesizeSpeech(request);
      //@ts-ignore
      const audioContent = response.audioContent;
      console.log(
        `Text-to-Speech API successful for sentence: "${sentence.substring(
          0,
          50
        )}..."`
      );
      return {
        text: sentence,
        audio: audioContent,
      };
    } catch (ttsError) {
      console.error(
        `Error synthesizing speech for sentence: "${sentence.substring(
          0,
          50
        )}...`
      );
      throw new Error(`Text-to-Speech failed: ${ttsError.message}`);
    }
  }
}

async function __callGemini(content, config, model) {
  if (!content || !config) return;
  if (!genAI) throw new Error("genAI is undefined");

  const generateContentRequest = {
    model: model || GEMINI_MODEL_NAME,
    contents: content,
    config: config,
  };

  try {
    return await genAI.models.generateContent(generateContentRequest);
  } catch (geminiError) {
    console.error("Error during Gemini API call:", geminiError.message);
    if (geminiError.response && geminiError.response.error) {
      console.error(
        "Gemini API raw error response:",
        JSON.stringify(geminiError.response.error)
      );
    }
    throw new Error(`Gemini API failed: ${geminiError.message}`);
  }
}

async function callGemini(prompt, jsonResponse = false) {
  console.log("Calling Gemini API with query:", prompt);

  if (!genAI) throw new Error("genAI is undefined");

  //const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

  const generateContentRequest = {
    model: GEMINI_MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  if (jsonResponse) {
    generateContentRequest.generationConfig = {
      responseMimeType: "application/json",
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

    if (
      !Array.isArray(sentences) ||
      !sentences.every((s) => typeof s === "string") ||
      sentences.length === 0
    ) {
      throw new Error(
        `Gemini did not return a valid JSON array of strings. Response: \n ${text}`
      );
    }

    return sentences;
  } catch (geminiError) {
    console.error("Error during Gemini API call:", geminiError.message);
    if (geminiError.response && geminiError.response.error) {
      console.error(
        "Gemini API raw error response:",
        JSON.stringify(geminiError.response.error)
      );
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

async function __generateSentences(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  console.log("Received request for /api/sentences. Request body:", req.body);
  //!content her is an object that contains 2 genAi prompts: 1 for the text and the other for the audio: content = {text:textContentObject, audio:audioContentObject}.
  // !Similarly config is an object like {text:textConfigObject, audio:audioConfigObject}
  const { content, config, model } = req.body;

  if (!content || !config) {
    return res.status(400).json({
      message:
        "Missing required parameters. Ensure content and config are provided.",
    });
  }

  if (!GEMINI_API_KEY) {
    console.error("Gemini API Key is not configured on the server.");
    return res
      .status(500)
      .json({ error: "Server configuration error: Gemini API Key missing." });
  }

  try {
    const sentences = await getSentences(); //This should return a string[]
    //@ts-ignore
    if (!sentences || !Array.isArray(sentences) || !sentences.length)
      return res.status(500).json({
        error: `Gemini did not return an array of sentences as expected. It returned ${
          JSON.stringify(sentences) || "undefined"
        }`,
      });
    const audios = [];
    //@ts-ignore
    for (const sentence of sentences) {
      audios.push(await getAudioForSentence(sentence));
    }
    return res.status(200).json({ text: sentences, audio: audios });
  } catch (error) {
    res.status(500).json({
      error:
        "Something went wrong on the server side while fetching the sentences or the audios",
    });
  }

  async function getSentences() {
    try {
      const sentences = await __callGemini(content.text, config.text, model); //we send the prompt contents and request configuration for the generation of the sentences

      console.log("returned sentences = ", sentences);

      return sentences?.text; //This should be a string[]
    } catch (error) {
      console.log("GenAi failed to return the sentences");
    }
  }

  async function getAudioForSentence(sentence) {
    const conent = content.audio;
    const prompt = content[0].parts[0];
    prompt.text = sentence; //We replace
    const audio = await __callGemini(content.audio, config.audio, model);
    if (!audio) console.log(`Failed to get the audio for; ${sentence}`);
    return audio;
  }
}

async function generateSentences(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  console.log("Received request for /api/sentences. Request body:", req.body);

  const { query, voiceParams, audioConfig } = req.body;

  if (!query || !voiceParams || !audioConfig) {
    return res.status(400).json({
      message:
        "Missing required parameters. Ensure query, sourceLanguage, targetLanguage, voiceParams, audioConfig, sentencesNumber, and wordsNumber are provided.",
    });
  }

  if (!GEMINI_API_KEY) {
    console.error("Gemini API Key is not configured on the server.");
    return res
      .status(500)
      .json({ error: "Server configuration error: Gemini API Key missing." });
  }

  try {
    const sentences = await callGemini(query, true);
    console.log("Gemini API successful. Generated text:", sentences);

    console.log("Calling Text-to-Speech API for text:");
    const audios = [];
    for (let sentence of sentences) {
      audios.push(
        await getAudioFromSentence(
          sentence.trim(),
          voiceParams,
          audioConfig,
          false,
          true
        )
      );
    }
    return res.status(200).json({ sentences: audios });
  } catch (error) {
    console.error("Error in /api/sentences route:", error.message);
    console.error("Error details:", JSON.stringify(error));
    return res.status(500).json({
      error: "Failed to process request for sentences.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Handles requests to /api/ask to get a single answer and its audio.
 * @param {object} req The HTTP request object.
 * @param {object} res The HTTP response object.
 */
async function __askAPI(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  console.log("Received request for /api/ask. Request body:", req.body);

  const { content, config, model } = req.body;

  if (!content || !config) {
    return res.status(400).json({
      message:
        "Missing required parameters. Ensure content and config are provided.",
    });
  }

  if (!GEMINI_API_KEY) {
    console.error("Gemini API Key is not configured on the server.");
    return res
      .status(500)
      .json({ error: "Server configuration error: Gemini API Key missing." });
  }

  try {
    const response = await __callGemini(content.text, config.text, model);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in /api/ask route:", error.message);
    console.error("Error details:", JSON.stringify(error));
    return res.status(500).json({
      error: "Failed to process request for ask.",
      // @ts-ignore
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

async function askAPI(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  console.log("Received request for /api/ask. Request body:", req.body);

  const { query, voiceParams, audioConfig, noAudio } = req.body;

  if (!query || !voiceParams || !audioConfig) {
    return res.status(400).json({
      message:
        "Missing required parameters. Ensure query, voiceParams, and audioConfig are provided.",
    });
  }

  if (!GEMINI_API_KEY) {
    console.error("Gemini API Key is not configured on the server.");
    return res
      .status(500)
      .json({ error: "Server configuration error: Gemini API Key missing." });
  }

  try {
    const responseText = await callGemini(query);
    console.log("Gemini API successful. Generated text:", responseText);

    if (responseText && noAudio)
      return res
        .status(200)
        .json({ response: { text: responseText, audio: null } });

    console.log("Calling Text-to-Speech API for text");
    const audio = await getAudioFromSentence(
      //@ts-expect-error
      responseText?.trim(),
      voiceParams,
      audioConfig,
      true,
      false
    );
    return res.status(200).json({ response: audio });
  } catch (error) {
    console.error("Error in /api/ask route:", error.message);
    console.error("Error details:", JSON.stringify(error));
    return res.status(500).json({
      error: "Failed to process request for ask.",
      // @ts-ignore
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Google Cloud Function to fetch an audio file, transcribe it using
 * Google Cloud Speech-to-Text, and return the transcription.
 *
 * @param {object} req The HTTP request object.
 * @param {object} res The HTTP response object.
 */
async function transcribeAPI(req, res) {
  // Ensure it's a POST request and has the expected body structure
  if (req.method !== "POST") {
    return res
      .status(405)
      .send("Method Not Allowed. Only POST requests are accepted.");
  }

  const { audioUrl, audioConfig, base64, isShort } = req.body;

  if (!audioConfig) {
    return res.status(400).json({ error: "audioConfig in request body." });
  } else if (!audioUrl && !base64) {
    // If neither audioUrl nor base64 is provided, return an error
    return res
      .status(400)
      .json({ error: "Missing audioUrl or base64 in request body." });
  }

  try {
    const transcription = await fetchTranscription();
    if (transcription) res.status(200).json({ response: transcription});
  } catch (error) {
    console.error(
      "[Cloud Function] Error during audio processing or transcription:",
      error
    );
    res.status(500).json({
      error: "Failed to process audio or get transcription.",
      details: error.message,
    });
  }

  async function fetchTranscription() {
    // --- Optional: Validate or set default transcription config ---
    // If you don't provide 'config' from the frontend, use sensible defaults.
    // This allows the frontend to specify encoding, sampleRateHertz, languageCode etc.

    //console.log(`[Cloud Function] Received request for URL: ${audioUrl}`);
    console.log(`[Cloud Function] Transcription config:`, audioConfig);

    const audioBase64 = base64 || (await getAudioBase64OrURI());

    if (!audioBase64) {
      throw new Error(
        `Failed to fetch audioBase64 from ${audioUrl}. Base64 conversion failed.`
      );
    }
   
    console.log(
      "[Cloud Function] Sending audio to Google Cloud Speech-to-Text API..."
    );

    // 1. Fetch the audio file from the provided URL or use base64
    const audio = audioBase64.uri ? { uri: audioBase64.uri } : { content: audioBase64 };
    const [response] = await getTranscription(audio);
    
    if (!response.results || response.results.length === 0) {
      throw new Error(
        "No transcription results returned from Google Cloud Speech-to-Text API."
      );
    }
    console.log(
      "[Cloud Function] Received transcription response from Google Cloud Speech-to-Text API."
    );

    // 2. Extract transcription
    const transcription = response.results
      .map((result) => result.alternatives?.[0]?.transcript)
      .join("\n");

    console.log("[Cloud Function] Transcription successful.");

    // 3. If the audio was uploaded to Google Cloud Storage, delete the temporary file
    // This is only necessary if you uploaded the audio to GCS for processing.
    
    if (audioBase64.fileName && audioBase64.audioBuffer?.length > 10 * MB) {
      const storage = storageClient.bucket(process.env.GCS_BUCKET_NAME || "");
      const file = storage.file(audioBase64.fileName);
      try {
        // Get a v4 signed URL for reading the file
        const signedUrlResponse = await file.getSignedUrl({
          version: 'v4', // Use V4 for newer, more secure signing
          action: 'read', // Ensure this matches the allowed string literals
          expires: Date.now() + 30 * 60 * 1000, // Current timestamp + minutes in milliseconds
          //responseDisposition: 'attachment', // Optional: Forces browser to download instead of play/display
        });
        const url = signedUrlResponse[0];
        console.log(`Generated signed URL for ${audioBase64.fileName}: ${url}`);
        return {
          text: transcription,
          uri: url, // Return the URI of the audio file
        }
      } catch (error) {
        console.error(`Error generating signed URL for ${audioBase64.fileName}:`, error);
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }
    } else if (audioBase64.bucketName && audioBase64.fileName) {
      await deleteFileFromStorageBucket(audioBase64.bucketName, audioBase64.fileName); // Delete the temporary file from GCS if it was uploaded
      // 4. Return the transcription and audio in base64 format
      return {
        text: transcription,
        audio: audioBase64.audioBuffer?.toString("base64") || audioBase64, // Return audio in base64 format
      }; // Return transcription and audio in base64 format  
    }
    


    async function getTranscription(audio) {
      console.log(
        `[Cloud Function] "audio" parameter passed to getTranscription() = ${audio}`
      );

      // 1. Prepare the request for Google Cloud Speech-to-Text
      const request = {
        audio: audio,
        config: audioConfig, // Use the audioConfig provided by the frontend
      };

      if (audio.uri) {
        const gscUri = `${audio.uri.split('.')[0]}.json`;
        request.outputConfig = {gscUri: gscUri} ;//This will save the transcription text to the google storage bucket
        audioBase64.transciptionUri = gscUri
      }

      console.log(`[Cloud Function] isShort =${isShort}`);
      console.log(`[Cloud Function] request =${JSON.stringify(request)}`);
      if (isShort) return await speechClient.recognize(request);
      const [operation] = await speechClient.longRunningRecognize(request);
      // Get a Promise representation of the final result of the job
      return await operation.promise();
    }
  }

  async function getAudioBase64OrURI() {
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      throw new Error(
        `Failed to fetch audio from ${audioUrl}: HTTP ${
          audioResponse.status
        } - ${errorText.substring(0, 200)}`
      );
    }
    // 2. Get the audio content as an ArrayBuffer
    // This is efficient for binary data and easily convertible to Node.js Buffer
    const audioArrayBuffer = await audioResponse.arrayBuffer();

    //if audiobuffer is too large, we will throw and error and will not process it 
    if (audioArrayBuffer.byteLength > 70 * MB) {
      const message = `Audio file is too large (${audioArrayBuffer.byteLength} bytes). Maximum allowed size is 70 MB.`;
      throw new Error(`[Cloud Function] ${message}`);
    }
 
    const audioBuffer = Buffer.from(audioArrayBuffer); // Convert ArrayBuffer to Node.js Buffer
    console.log(
      `[Cloud Function] Audio fetched successfully. Size: ${audioBuffer.length} bytes.`
    );

    const codec = await extractMetaData();

    async function extractMetaData() {
      try {
        const metadata = await mm.parseBuffer(
          audioBuffer,
          audioResponse.headers.get("Content-Type") ||
            "application/octet-stream"
        );

        const format = metadata.format,
          sampleRate = format.sampleRate,
          duration = format.duration,
          codec = format.container?.toUpperCase(),
          channels = format.numberOfChannels || 1,// Default to 1 channel if not specified
          chapters = format.chapters;

        
        switch (codec) {
          case "MPEG":
            audioConfig.encoding = "MP3";
            break;
          case "PCM":
            audioConfig.encoding = "LINEAR16";
            break;
          case "FLAC":
            audioConfig.encoding = "FLAC";
            break;
          case "OPUS":
            audioConfig.encoding = "OGG_OPUS";
            break;
          default: audioConfig.encoding = "ENCODING_UNSPECIFIED"; // Default encoding if not recognized
        }

        console.log("[Cloud Function] Audio metadata detected:", {
          format: format,
          sampleRate: sampleRate,
          duration: duration,
          codec: codec,
        });

        if(sampleRate) audioConfig.sampleRateHertz = sampleRate; // Set default sample rate if not provided
        // if(channels) audioConfig.audioChannelCount = channels; // Set default channel count if not provided
        return codec?.toLowerCase();
      } catch (error) {
        console.log(`[Cloud Function] error in parsing audio metadata: ${error}` );
      }
    }

    // 3. If base64 is provided, return it directly
    if (!isShort)
      return {
        ...(await getGoogleBucketURI(audioResponse, audioBuffer, codec?.toLowerCase())),
        audioBuffer: audioBuffer,
      };
    //Google storage URI
    else return audioBuffer.toString("base64"); // Convert Buffer to base64 string for Speech-to-Text API
  }

  async function getGoogleBucketURI(audioResponse, audioBuffer, extension) {
    const bucketName = process.env.GCS_BUCKET_NAME || "";
    const fileName = `TranscribeAudio${Date.now().toString()}.${extension}`; // Generate a unique file name
    const file = storageClient.bucket(bucketName).file(fileName);

    const uri = `gs://${bucketName}/${fileName}`;

    console.log(`[Cloud Function] Uploading audio to ${uri}...`);
    

    await file.save(audioBuffer, {
      contentType:
        audioResponse.headers.get("Content-Type") || "application/octet-stream",
    });
    console.log("[Cloud Function] Audio uploaded to GCS.");

    return { uri: uri, bucketName: bucketName, fileName: fileName }; // Return the URI of the uploaded file
  }

};

async function translateTextAPI(req, res) {
  const { contents, sourceLanguageCode, targetLanguageCode } = req.body;
  
  if (!contents || !sourceLanguageCode || !targetLanguageCode) {
    return res.status(400).send('Bad Request. Please provide "query", "sourceLanguageCode", and "targetLanguageCode" in the request body.');
  }

  const parent = `projects/${PROJECT_ID}/locations/global`;

    try {
       // Translate a single piece of text
    const [response] = await translate.translateText({
      parent,
      contents,
      sourceLanguageCode,
      targetLanguageCode,
      mimeType: 'text/plain',
    });

      // The translated text is within the "translations" array of the response
      //@ts-ignore
    const translatedText = response.translations?.map(t=>t.translatedText);//this is a string[]

    res.status(200).json({ text: translatedText });

    } catch (error) {
      // Log the error for debugging
      console.error('ERROR:', error);
      // Send a 500 status code with a descriptive error message
      res.status(500).send(`Error: Could not translate text. ${error.message}`);
    }
};


async function readTextAPI(req, res) {
  const { query, voiceParams, audioConfig } = req.body;//The query is the sentence that we want the Text-To-Speech API to read aloud.

  if (!query || !voiceParams || !audioConfig) {
    return res.status(400).json({
      message:
        "Missing required parameters. Ensure query, voiceParams, audioConfig, are provided in the request body.",
    });
  }

  const sentence =  await getAudioFromSentence(
    query.trim(),
    voiceParams,
    audioConfig,
    false,
    true
  );
  return res.status(200).json(sentence);
}

async function deleteFileFromStorageBucketAPI(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .send("Method Not Allowed. Only POST requests are accepted.");
  }

  const { fileName} = req.body;
  if (!fileName) throw new Error('The file name is missing in the request');
  
  const bucketName = process.env.GCS_BUCKET_NAME || "";

  if (!bucketName) throw new Error('Could not retrieve the bucket name');

  await deleteFileFromStorageBucket(bucketName, fileName);

  }



async function deleteFileFromStorageBucket(bucketName, fileName) {
  try {
    console.log(`[Cloud Function] Deleting temporary GCS file: ${fileName}`);
    await storageClient.bucket(bucketName).file(fileName).delete();
    console.log("[Cloud Function] Temporary GCS file deleted.");
  } catch (gcsError) {
    console.error(
      `[Cloud Function] Failed to delete GCS file ${fileName}:`,
      gcsError.message
    );
    // Do not fail the main request if cleanup fails
  }
}
// --- Main Cloud Function Entry Point ---
exports.geminiProxy = async (req, res) => {
  // Manually handle CORS headers (essential for your PWA)
  res.set("Access-Control-Allow-Origin", "https://mbibawi.github.io"); // Adjust this to your PWA's domain for security
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600"); // Cache preflight response for 1 hour

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // --- Centralized Routing Logic ---
  if (req.path === "/") {
    if (req.method === "GET") {
      res.status(200).send("Gemini proxy with TTS function is running.");
    } else {
      res.status(405).send("Method Not Allowed");
    }
  } else if (req.path === "/api/sentences") {
    await generateSentences(req, res); // Call the dedicated handler function
  } else if (req.path === "/api/ask") {
    await askAPI(req, res); // Call the dedicated handler function
  } else if (req.path === "/api/transcribe") {
    await transcribeAPI(req, res); // Call the dedicated handler function
  } else if (req.path === "/api/translate") {
    await translateTextAPI(req, res); // Call the dedicated handler function
  } else if (req.path === "/api/read") {
    await readTextAPI(req, res); // Call the dedicated handler function
  } else if (req.path === "/api/deleteFile") {
    await deleteFileFromStorageBucketAPI(req, res); // Call the dedicated handler function
  } else {
    // Default catch-all for unknown paths
    res.status(404).send("Not Found");
  }
};
