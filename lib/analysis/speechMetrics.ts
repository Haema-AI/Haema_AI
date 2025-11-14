import type { DetailedTranscript, SpeechMetrics, STTWord } from '@/types/speech';

const DEFAULT_METRICS: SpeechMetrics = {
  speechRateWpm: 0,
  meanPauseDurationSec: 0,
  pausesPerMinute: 0,
  mlu: 0,
  ttr: 0,
  totalWords: 0,
  speakingDurationSec: 0,
  utteranceCount: 0,
  pauseCount: 0,
};

export function calculateSpeechMetrics(transcript?: DetailedTranscript | null): SpeechMetrics {
  const words = normalizeWords(transcript);
  if (words.length === 0) {
    return DEFAULT_METRICS;
  }

  words.sort((a, b) => a.start - b.start);

  const tokens = words
    .map((word) => sanitizeToken(word.word))
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return DEFAULT_METRICS;
  }

  const speakingDurationSec = Math.max(words[words.length - 1].end - words[0].start, 1e-6);
  const speakingDurationMin = speakingDurationSec / 60;

  const pauseThreshold = 0.5;
  const longPauseThreshold = 1.0;
  const pauseDurations: number[] = [];
  let utteranceCount = 1;

  for (let i = 1; i < words.length; i += 1) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= pauseThreshold) {
      pauseDurations.push(gap);
    }
    if (gap >= longPauseThreshold) {
      utteranceCount += 1;
    }
  }

  const pauseCount = pauseDurations.length;
  const meanPauseDurationSec = pauseCount > 0 ? average(pauseDurations) : 0;

  const speechRateWpm = speakingDurationMin > 0 ? tokens.length / speakingDurationMin : 0;
  const pausesPerMinute = speakingDurationMin > 0 ? pauseCount / speakingDurationMin : 0;
  const mlu = utteranceCount > 0 ? tokens.length / utteranceCount : 0;
  const ttr = tokens.length > 0 ? uniqueCount(tokens) / tokens.length : 0;

  return {
    speechRateWpm: round(speechRateWpm),
    meanPauseDurationSec: round(meanPauseDurationSec),
    pausesPerMinute: round(pausesPerMinute),
    mlu: round(mlu),
    ttr: round(ttr, 3),
    totalWords: tokens.length,
    speakingDurationSec: round(speakingDurationSec, 2),
    utteranceCount,
    pauseCount,
  };
}

function normalizeWords(transcript?: DetailedTranscript | null): STTWord[] {
  if (!transcript) return [];
  const words = Array.isArray(transcript.words) ? transcript.words : [];
  return words.filter((word) => typeof word?.start === 'number' && typeof word?.end === 'number');
}

function sanitizeToken(input: string): string {
  return input.trim().toLowerCase().replace(/[.,!?\"'()\[\]{}:;]/g, '');
}

function uniqueCount(items: string[]): number {
  return new Set(items).size;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
