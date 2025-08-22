
async function generateDeck() {
    const sentences = geminiInput.value
        .trim()
        .split('\n')
        .entries();

    const now = new Date().getTime();
    const deck = [];
    
    for (const [index, sentence] of sentences) {
        //!We need the "for of" loop to pause execution for each sentence to respect the rate limit of the Text-To-Speech API.
        if ((index + 1) % 500 === 0) {
            //Each 500 decks, we will process the translation and download the card that have been created so far.
            console.log('=======>Processing sentence:', index);
            deck
                .filter(card => !card.translation)
                .filter((card, index)=>index<1000)
                .forEach(card => addTranslation(card, 'French'));
                downloadDeck(deck);
        };
        if (!sentence) continue; // Skip empty lines
        const card = await addAudioBlob(sentence, index, now);
        if(!card) continue; // Skip if card creation failed
        deck.push(card);
    }

    const translations = deck.map((card) => addTranslation(card, 'French'));

    await Promise.all(translations);
    
    downloadDeck(deck);
    return deck
}

function downloadDeck(deck: ankiCard[]) {
        const csvContent = deck
        .map(card => `${card.csv}`)
        .join('\n');
        
    const blob = new Blob([csvContent], { type: 'text/csv' });

    downloadFile(blob, `DeckCSV_1to${deck.length}.csv`);

    downloadAudioFilesAsZip(deck, `DeckAudios_1to${deck.length}.zip`);

}

async function addAudioBlob(sentence: string, index: number, started: number): Promise<ankiCard|undefined> {
    const batchNumber = Math.floor(index / 200);
    await pauseExecution(batchNumber, started); //Pausing the execution to respect quota limit of the Text-To-Speech API requests per minute which is 200 requests

    const card: ankiCard = {
        sentence: sentence,
        translation: null,
        csv: '',
        audio: {
            blob: null,
            name: `Deck${started}-${index+1}.mp3`//e.g 'Deck1755483404267-200.mp3'
        },
    };
    
    const speech = await readText(sentence);
    if (!speech) return undefined; // Skip if speech generation failed
    //@ts-ignore
    const uint8Array = new Uint8Array(speech.audio.data);
    card.audio.blob = new Blob([uint8Array], { type: 'audio/mp3' });
    return card;
}

async function addTranslation(card: ankiCard, targetLang: string) {
    if(card.translation) return; // Skip if translation already exists
    const translation = await translateSentence(card.sentence, targetLang);
    if (!translation) return console.warn(`Translation failed for: ${card.sentence}`);
    card.translation = translation;
    card.csv = `[sound:${card.audio.name}] | ${card.sentence} | ${translation}`;
}

async function pauseExecution(batchNumber: number, started: number) {
    if (!batchNumber) return;
    const minute = 60 * 1000;

    // Calculate the ideal time this sentence should be processed.
    const startNewBatch = started + (minute * batchNumber);

    // Calculate how long to wait to align with the rate limit.
    const waitTime = startNewBatch - new Date().getTime();

    if (waitTime <= 0) return;

    console.log(`Waiting for ${waitTime}ms to respect rate limit.`);
    // Pause execution without blocking the main thread.
    await new Promise(resolve => setTimeout(resolve, waitTime));
}

function downloadFile(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

}

/**
 * Downloads multiple audio files from Anki cards and zips them for a single download.
 * @param deck An array of AnkiCard objects, each containing audio information.
 * @param zipFileName The name for the final zip file (e.g., 'anki_audio.zip').
 */
async function downloadAudioFilesAsZip(deck: ankiCard[], zipFileName: string) {
    //@ts-expect-error
    const zip = new JSZip();

    // Create an array of promises, each representing the addition of a file to the zip.
    const fetchPromises = deck.map(async card => {
        if (!card.audio.blob) return;
        // Add the file to the zip instance
        zip.file(card.audio.name, card.audio.blob);
        console.log(`Added ${card.audio.name} to the zip archive.`);
    });

    // Wait for all promises to settle (all files to be processed, regardless of success or failure).
    await Promise.all(fetchPromises);

    // Generate the zip file as a Blob.
    const blob = await zip.generateAsync({ type: "blob" }) as Blob;

    downloadFile(blob, zipFileName);

}

async function _FixTranslationFailed() {
    const deck = [];
    const sentences = geminiInput.value
        .trim()
        .split('\n');
    debugger
    for (const sentence of sentences) { 
        if (!sentence.includes('TranslationFailed')) {
            deck.push(sentence)
            continue
        }
        const italian = sentence.split(',')[1].trim();
        const translation = await translateSentence(italian, 'French') || 'TranslationFailed';
        const fixed = sentence.replace('TranslationFailed', translation);
        deck.push(fixed);

    }

    const csvContent = deck.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadFile(blob, `FixedTranslations_1to${deck.length +1}.csv`);

    }
