import { ensureModelAsset, type ModelAssetConfig } from '@/lib/llm/modelLoader';
import type { ChatMessage } from '@/types/chat';
import { initLlama, type ContextParams, type LlamaContext, type TokenData } from 'llama.rn';
import { Platform } from 'react-native';

const DEFAULT_SUMMARY_MODEL_ID = 'gemma-3-270m-it-Q4_K_S';
const DEFAULT_SUMMARY_BUNDLE_PATH = `models/${DEFAULT_SUMMARY_MODEL_ID}.gguf`;

const SUMMARY_MODEL_ID = process.env.EXPO_PUBLIC_LOCAL_SUMMARY_MODEL_ID ?? DEFAULT_SUMMARY_MODEL_ID;
const SUMMARY_MODEL_BUNDLE_PATH =
  process.env.EXPO_PUBLIC_LOCAL_SUMMARY_MODEL_PATH ?? `models/${SUMMARY_MODEL_ID === DEFAULT_SUMMARY_MODEL_ID ? DEFAULT_SUMMARY_MODEL_ID : SUMMARY_MODEL_ID}.gguf`;
const SUMMARY_MODEL_FILENAME = process.env.EXPO_PUBLIC_LOCAL_SUMMARY_MODEL_FILENAME ?? undefined;

const LOCAL_SUMMARY_TEMPERATURE = Number(process.env.EXPO_PUBLIC_LOCAL_SUMMARY_TEMPERATURE ?? '0.3');
const LOCAL_SUMMARY_MAX_TOKENS = Number(process.env.EXPO_PUBLIC_LOCAL_SUMMARY_MAX_TOKENS ?? '220');
const LOCAL_SUMMARY_CTX = Number(process.env.EXPO_PUBLIC_LOCAL_SUMMARY_CTX ?? '2048');
const LOCAL_SUMMARY_THREADS = Number(process.env.EXPO_PUBLIC_LOCAL_SUMMARY_THREADS ?? '4');

const SUMMARY_MODEL: {
  asset: ModelAssetConfig;
  params: Pick<ContextParams, 'n_ctx' | 'n_threads'> & { temperature: number; maxTokens: number };
} = {
  asset: {
    id: SUMMARY_MODEL_ID,
    bundleRelativePath: SUMMARY_MODEL_BUNDLE_PATH,
    ...(SUMMARY_MODEL_FILENAME ? { filename: SUMMARY_MODEL_FILENAME } : {}),
  },
  params: {
    n_ctx: LOCAL_SUMMARY_CTX,
    n_threads: LOCAL_SUMMARY_THREADS,
    temperature: LOCAL_SUMMARY_TEMPERATURE,
    maxTokens: LOCAL_SUMMARY_MAX_TOKENS,
  },
};

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

let summaryContextPromise: Promise<LlamaContext> | null = null;

async function loadSummaryContext(): Promise<LlamaContext> {
  if (!summaryContextPromise) {
    summaryContextPromise = (async () => {
      const modelPath = await ensureModelAsset(SUMMARY_MODEL.asset);
      const context = await initLlama({
        model: modelPath,
        n_ctx: SUMMARY_MODEL.params.n_ctx,
        n_threads: SUMMARY_MODEL.params.n_threads,
      });
      return context;
    })().catch((error) => {
      summaryContextPromise = null;
      throw error;
    });
  }
  return summaryContextPromise;
}

function buildConversationTranscript(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      const speaker = message.role === 'user' ? '사용자' : '해마';
      return `${speaker}: ${message.text}`;
    })
    .join('\n');
}

function buildSummaryPrompt(messages: ChatMessage[], keywords: string[]): string {
  const transcript = buildConversationTranscript(messages);
  const keywordLine = keywords.length > 0 ? `핵심 키워드: ${keywords.slice(0, 5).join(', ')}` : '핵심 키워드 없음';

  return `다음은 돌봄 도우미 해마와 사용자 간의 대화 기록입니다.
대화를 간결하고 따뜻한 톤으로 2~3문장 안에서 요약하세요.
- 위험 신호나 후속 행동이 있다면 꼭 포함합니다.
- 메타 정보나 번호 매기기는 사용하지 않습니다.

${keywordLine}

대화 기록:
${transcript}

요약:`;
}

export async function generateLocalSummary(messages: ChatMessage[], keywords: string[]): Promise<string | null> {
  if (Platform.OS === 'web' || messages.length === 0) {
    return null;
  }

  try {
    const trimmedMessages = messages.slice(-24);
    const prompt = buildSummaryPrompt(trimmedMessages, keywords);
    const context = await loadSummaryContext();

    let output = '';
    const result = await context.completion(
      {
        messages: [
          {
            role: 'system',
            content:
              '당신은 치매 초기 또는 경도 인지장애를 가진 어르신의 보호 기록 작성 보조 도우미입니다. 친절하고 따뜻한 톤으로, 구체적인 행동 안내와 위험 신호를 놓치지 않고 정리합니다.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        n_predict: SUMMARY_MODEL.params.maxTokens,
        temperature: SUMMARY_MODEL.params.temperature,
        stop: STOP_WORDS,
      },
      (tokenData: TokenData) => {
        if (tokenData.token) {
          output += tokenData.token;
        }
      }
    );

    if (!output && result?.content) {
      output = result.content;
    } else if (!output && result?.text) {
      output = result.text;
    }

    const cleaned = output.trim();
    if (!cleaned) {
      return null;
    }

    return cleaned.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('로컬 요약 생성 실패', error);
    return null;
  }
}
