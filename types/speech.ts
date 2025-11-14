export type STTWord = {
  word: string;
  start: number;
  end: number;
};

export type STTSegment = {
  text: string;
  start?: number;
  end?: number;
  words?: STTWord[];
};

export type DetailedTranscript = {
  text: string;
  words: STTWord[];
  segments: STTSegment[];
};

export type SpeechMetrics = {
  speechRateWpm: number;
  meanPauseDurationSec: number;
  pausesPerMinute: number;
  mlu: number;
  ttr: number;
  totalWords: number;
  speakingDurationSec: number;
  utteranceCount: number;
  pauseCount: number;
};
