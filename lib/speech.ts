import * as Speech from 'expo-speech';

export async function say(text: string) {
  return Speech.speak(text, { language: 'ko-KR', pitch: 1.0, rate: 0.95 });
}