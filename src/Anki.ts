
async function generateDeck() {
    const sentences = geminiInput.value
        .trim()
        .split('\n')
        .entries();
    
    const now = new Date().getTime();
    const deck = [];

    for (const [index, sentence] of sentences) { 
        const card = await processSentence(sentence, index, 'Italian', 'French', now);
        deck.push(card);
    }
   
    const csvContent = deck
        .map(card => `${card.text}`)
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });

    downloadFile(blob, 'deck.csv');
    
   await downloadAudioFilesAsZip(deck, 'deckAudios.zip');
    
    return deck
}

async function processSentence(sentence: string, index: number, sourceLang: string, targetLang: string, started: number): Promise<ankiCard> {
    const batchNumber = Math.floor(index / 200);
    await pauseExecution(batchNumber, started); //Pausing the execution to respect quota limit of the Text-To-Speech API requests per minute which is 200 requests

    let audioFileName = `italian15K-${index}.mp3`;
    const translation = await translateSentence(sentence, targetLang);
    const read = await readText(sentence);
    
    let card:ankiCard = {
        text: `[sound:${audioFileName}], ${sentence}, ${translation}`,
        audio: {
            blob: new Blob(),
            name: audioFileName
        },
    };

    //@ts-expect-error
    const uint8Array = new Uint8Array(read.audio.data);
    card.audio.blob = new Blob([uint8Array], { type: 'audio/mp3' });
    

    return card;

}

async function pauseExecution(batchNumber:number, started:number) {
    if (!batchNumber) return;
    const minute = 60 * 1000;
    
    // Calculate the ideal time this sentence should be processed.
        const startNewBatch = started + (minute * batchNumber);
        
    // Calculate how long to wait to align with the rate limit.
    const waitTime = startNewBatch - new Date().getTime();

    if(waitTime <= 0) return;
    
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
