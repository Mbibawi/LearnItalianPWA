const express = require('express');
const { Translate } = require('@google-cloud/translate').v2;
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');

const corsOptions = {
  origin: 'https://mbibawi.github.io',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

const app = express();
app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON request bodies

const projectId = process.env.GCLOUD_PROJECT; // Or hardcode if necessary.

/**
 *  Handles translation requests.
 */
app.post('/', async (req, res) => {
  try {
    // 1. Input validation
    if (!req.body || !req.body.text || !req.body.accessToken) {
      return res.status(400).send({ error: 'Missing text or accessToken in request body' });
    }

    const text = req.body.text;
    const accessToken = req.body.accessToken;
    const sourceLanguage = req.body.sourceLanguage;
    const targetLanguage = req.body.targetLanguage;


    // 2. **Crucial Security Step: Verify the Access Token**
    //    This is a placeholder.  Replace with your actual token verification logic.
    //    See detailed authentication options below.
    try {
      const auth = new GoogleAuth();
      const client = await auth.verifyIdToken({
        idToken: accessToken,
        audience: projectId,
      });
      const payload = client.getPayload();
      const userid = payload['sub'];
      console.log("User is authenticated ", userid);
    } catch (e) {
      console.error("authentication failed", e);
      return res.status(403).send({ error: 'Unauthorized' });
    }

    // 3. Translate the text
    const translate = new Translate({ projectId: projectId });
    const [translation] = await translate.translate(text, { from: sourceLanguage, to: targetLanguage });

    // 4. Send the translated text back to the client
    res.status(200).send({ translatedText: translation });

  } catch (error) {
    console.error('Error during translation:', error);
    res.status(500).send({ error: 'Translation failed', details: error.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Translation service listening on port ${port}`);
});

exports.translateText = app;
