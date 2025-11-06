import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Converts a Blob object to a Base64 encoded string.
 * @param blob The blob to convert.
 * @returns A promise that resolves with the base64 string.
 */
function blobToBase64(blob: globalThis.Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Failed to read blob as a data URL."));
      }
      // The result includes the data URL prefix (e.g., "data:audio/webm;base64,").
      // We only need the base64 part, so we split and take the second part.
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribes an audio blob using the Gemini API.
 * This function sends the entire audio file for transcription.
 * @param audioBlob The recorded audio as a Blob.
 * @returns A promise that resolves to the transcription text.
 */
export async function transcribeAudio(audioBlob: globalThis.Blob): Promise<string> {
  try {
    const base64Audio = await blobToBase64(audioBlob);

    const audioPart = {
      inlineData: {
        mimeType: audioBlob.type, // Use the blob's actual mimeType (e.g., 'audio/webm')
        data: base64Audio,
      },
    };

    const textPart = {
      text: "請將此音訊轉錄為逐字稿文字。",
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Use a model that supports audio input
      contents: { parts: [audioPart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Transcription failed:", error);
    throw new Error('轉錄過程中發生錯誤。');
  }
}

/**
 * Summarizes a given text transcript using the Gemini API.
 * @param transcript The text to summarize.
 * @param subject The subject of the meeting.
 * @returns A promise that resolves to the summary text.
 */
export async function summarizeText(transcript: string, subject: string): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
        return "逐字稿為空，沒有可用的摘要。";
    }
    try {
        const today = new Date().toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const prompt = `
會議主旨：${subject || '未提供'}
會議日期：${today}
---
請從以下會議逐字稿中總結重點、決策和待辦事項。為每個部分使用清晰的標題（例如，“重點摘要”、“達成的決策”、“待辦事項”）。

逐字稿：
${transcript}
`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        // Prepend subject and date to the final summary
        const finalSummary = `**會議主旨：** ${subject || '未提供'}\n**會議日期：** ${today}\n\n${response.text}`;
        return finalSummary;

    } catch (error) {
        console.error("Summarization failed:", error);
        return "因 API 錯誤而無法生成摘要。";
    }
}