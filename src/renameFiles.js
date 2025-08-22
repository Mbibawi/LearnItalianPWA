const fs = require('fs/promises');
const path = require('path');
const readline = require('readline/promises');

async function renameFiles() {
  try {
    // Setup prompt interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Prompt user for inputs
    //D:/OneDrive/Miscellenious/Downloads/Anki/Italian Articles/Deck2 Generated from books_1to500/;
    const folderPath = await rl.question('📁 Enter folder path: ');
    const replaceWhat = await rl.question('🔤 Enter string to replace: ');
    const replaceWith = await rl.question('🔁 Enter replacement string: ');
    rl.close();

    // Read files in the folder
    const files = await fs.readdir(folderPath);
    //D:OneDrive/Miscellenious/Downloads/Anki/Italian Articles/Deck2 Generated from books_1to500/
    for (const file of files) {
      if (file.includes(replaceWhat)) {
        const newName = file.replace(new RegExp(replaceWhat, 'g'), replaceWith);
        const oldPath = path.join(folderPath, file);
        const newPath = path.join(folderPath, newName);

        await fs.rename(oldPath, newPath);
        console.log(`✅ Renamed: ${file} → ${newName}`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

renameFiles();