
createDeck.onclick = generateDeck;
async function generateDeck() {
    const sourceLang = sourceLangSelect.selectedOptions[0]?.value;
    const targetLang = targetLangSelect.selectedOptions[0]?.value;

    if (!sourceLang || !targetLang || !confirm(`Source Language: ${sourceLang}\nTarget Language:${targetLang}`))
        return console.warn(`Canceled by user or for missing language: Source Language: ${sourceLang}\nTarget Language:${targetLang}`);

    const sentences = geminiInput.value
        .trim()
        .split('\n');

    const now = new Date().getTime();

    const n = 200;//This is the maximum number of sentences that will be translated in a same call
    const numBatches = new Array(Math.ceil(sentences.length / n));
    
    const batches = numBatches.map((el, index) => processBatch(index,  n * (index + 1)));
    
    const deck = await Promise.all(batches);
    downloadDeck(deck.flat());
    return deck;

    async function processBatch(batchNumber:number, end:number) {
        const batch: ankiCard[] = [];
        if (end > sentences.length) end = sentences.length;
        const slice = sentences.slice(batchNumber * n, end).entries();
        for (const sentence of slice) {
            if (!sentence) continue; // Skip empty lines
            const card = await addAudioBlob(sentence, batchNumber, now);
            if(!card) continue; // Skip if card creation failed
            batch.push(card);
        }  
        return await addTranslation(batch, targetLang, sourceLang)
    }
}

function downloadDeck(deck: ankiCard[]) {
        const csvContent = deck
        .map(card => `${card.csv}`)
        .join('\n');
        
    const blob = new Blob([csvContent], { type: 'text/csv' });

    downloadFile(blob, `DeckCSV_1to${deck.length}.csv`);

    downloadAudioFilesAsZip(deck, `DeckAudios_1to${deck.length}.zip`);

}

async function addAudioBlob([index, sentence]:[number, string], batchNumber: number, started: number): Promise<ankiCard|undefined> {
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

async function addTranslation(cards: ankiCard[], targetLang: string, sourceLang:string) {
    const sentences = cards.filter(card=>!card.translation).map(card => card.sentence);
    const translations =
        await translateSentence(sentences, targetLang, sourceLang);
    
    translations
        .forEach((translation, index) => {
                const card = cards[index];
                if (!translation) return console.warn(`Translation failed for: ${card.sentence}`);
                card.translation = translation;
                card.csv = `[sound:${card.audio.name}] | ${card.sentence} | ${translation}`;
        });
    return cards

}

async function pauseExecution(batchNumber: number, started: number) {
    if (!batchNumber) return;//If this is the first batch (index = 0) we do not pause
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
        const translation = await translateSentence([italian]) || 'TranslationFailed';
        const fixed = sentence.replace('TranslationFailed', [translation].join());
        deck.push(fixed);

    }

    const csvContent = deck.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadFile(blob, `FixedTranslations_1to${deck.length +1}.csv`);

    }

