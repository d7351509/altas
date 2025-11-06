
// This function encodes raw audio bytes into a base64 string.
// It's necessary for formatting the audio data for the Gemini API.
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
