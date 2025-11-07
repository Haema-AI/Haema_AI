import { ensureModelAsset, type ModelAssetConfig } from '@/lib/llm/modelLoader';
import type { ChatMessage } from '@/types/chat';
import { initLlama, type ContextParams, type LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';

const DEFAULT_KEYWORD_MODEL_ID = 'gemma-3-270m-it-Q4_K_S';
const DEFAULT_KEYWORD_BUNDLE_PATH = `models/${DEFAULT_KEYWORD_MODEL_ID}.gguf`;

const KEYWORD_MODEL_ID = process.env.EXPO_PUBLIC_LOCAL_KEYWORD_MODEL_ID ?? DEFAULT_KEYWORD_MODEL_ID;
const KEYWORD_MODEL_BUNDLE_PATH =
  process.env.EXPO_PUBLIC_LOCAL_KEYWORD_MODEL_PATH ?? `models/${KEYWORD_MODEL_ID === DEFAULT_KEYWORD_MODEL_ID ? DEFAULT_KEYWORD_MODEL_ID : KEYWORD_MODEL_ID}.gguf`;
const KEYWORD_MODEL_FILENAME = process.env.EXPO_PUBLIC_LOCAL_KEYWORD_MODEL_FILENAME ?? undefined;

const LOCAL_KEYWORD_TEMPERATURE = Number(process.env.EXPO_PUBLIC_LOCAL_KEYWORD_TEMPERATURE ?? '0.2');
const LOCAL_KEYWORD_MAX_TOKENS = Number(process.env.EXPO_PUBLIC_LOCAL_KEYWORD_MAX_TOKENS ?? '120');
const LOCAL_KEYWORD_CTX = Number(process.env.EXPO_PUBLIC_LOCAL_KEYWORD_CTX ?? '2048');
const LOCAL_KEYWORD_THREADS = Number(process.env.EXPO_PUBLIC_LOCAL_KEYWORD_THREADS ?? '4');

const KEYWORD_MODEL: {
  asset: ModelAssetConfig;
  params: Pick<ContextParams, 'n_ctx' | 'n_threads'> & { temperature: number; maxTokens: number };
} = {
  asset: {
    id: KEYWORD_MODEL_ID,
    bundleRelativePath: KEYWORD_MODEL_BUNDLE_PATH,
    ...(KEYWORD_MODEL_FILENAME ? { filename: KEYWORD_MODEL_FILENAME } : {}),
  },
  params: {
    n_ctx: LOCAL_KEYWORD_CTX,
    n_threads: LOCAL_KEYWORD_THREADS,
    temperature: LOCAL_KEYWORD_TEMPERATURE,
    maxTokens: LOCAL_KEYWORD_MAX_TOKENS,
  },
};

let keywordContextPromise: Promise<LlamaContext> | null = null;

async function loadKeywordContext(): Promise<LlamaContext> {
  if (!keywordContextPromise) {
    keywordContextPromise = (async () => {
      const modelPath = await ensureModelAsset(KEYWORD_MODEL.asset);
      const context = await initLlama({
        model: modelPath,
        n_ctx: KEYWORD_MODEL.params.n_ctx,
        n_threads: KEYWORD_MODEL.params.n_threads,
      });
      return context;
    })().catch((error) => {
      keywordContextPromise = null;
      throw error;
    });
  }
  return keywordContextPromise;
}

function buildTranscript(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      const speaker = message.role === 'user' ? '사용자' : '해마';
      return `${speaker}: ${message.text}`;
    })
    .join('\n');
}

function buildKeywordPrompt(messages: ChatMessage[]): string {
  const transcript = buildTranscript(messages);
  return `다음은 치매 돌봄 도우미 해마와 사용자 간의 대화 기록입니다.
핵심 키워드를 3~5개 도출해주세요.
- 키워드는 한글 위주로 1~3단어 사이로 작성합니다.
- 번호, 기호, 따옴표 없이 쉼표 기준의 나열로 출력합니다.
- 요약 문장을 만들지 말고 키워드만 출력합니다.

대화 기록:
${transcript}

키워드:`;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[,|\n]/)
    .map((token) => token.replace(/[#*"']/g, '').trim())
    .filter((token) => token.length > 0)
    .map((token) => token.slice(0, 20));
}

export async function generateLocalKeywords(messages: ChatMessage[]): Promise<string[] | null> {
  if (Platform.OS === 'web' || messages.length === 0) {
    return null;
  }

  try {
    const trimmedMessages = messages.slice(-24);
    const prompt = buildKeywordPrompt(trimmedMessages);
    const context = await loadKeywordContext();
    const result = await context.completion({
      messages: [
        {
          role: 'system',
          content:
            '당신은 치매 초기 또는 경도 인지장애 어르신을 지원하는 기록 보조 도우미입니다. 대화에서 핵심 키워드를 간결하게 추출하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      n_predict: KEYWORD_MODEL.params.maxTokens,
      temperature: KEYWORD_MODEL.params.temperature,
    });

    const output = (result?.content ?? result?.text ?? '').trim();
    if (!output) {
      return null;
    }

    const parsed = parseKeywords(output);
    if (parsed.length === 0) {
      return null;
    }
    const unique: string[] = [];
    for (const keyword of parsed) {
      if (!unique.includes(keyword)) {
        unique.push(keyword);
      }
      if (unique.length >= 5) break;
    }
    return unique;
  } catch (error) {
    console.error('로컬 키워드 추출 실패', error);
    return null;
  }
}
