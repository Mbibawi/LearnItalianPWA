type Sentence = { text: string; audio: Buffer, translation?: string, uri?: string };

type RequestContent = { text: any[]; audio?: any[] };

type RequestConfig = { text: { responseMimeType: string; responseSchema?: object; systemInstruction?: string; speechConfig?: object; responseModalities?: string[] }, audio?: { responseMimeType: string; systemInstruction?: string; speechConfig?: object } };

type PromptContent = {
  "role": string;
  "parts": [{ "text": string }]
}[];

type Option = {
  text: string; name: string; lang: string | undefined
};

type token = { access_token?: string; error?: string; error_description?: string };

type query = {
  query: string;
  sentences: Sentence[];
  timestamp?: number;
  DBKey?: string;
}

type ankiCard = {
  sentence: string;
  translation: string | null;
  csv: string;
  audio: {
    blob: Blob | null;
    name: string;
  };
}