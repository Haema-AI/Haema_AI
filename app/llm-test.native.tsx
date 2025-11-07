import { BrandColors } from '@/constants/theme';
import { ensureModelAsset, type ModelAssetConfig } from '@/lib/llm/modelLoader';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { initLlama, type ContextParams, type LlamaContext } from 'llama.rn';

const GEMMA_1B_MODEL: ModelAssetConfig & {
  params: Pick<ContextParams, 'n_ctx' | 'n_threads'> & { temperature: number };
} = {
  id: 'gemma-3n-E2B-it-Q4_K_S',
  bundleRelativePath: 'models/gemma-3n-E2B-it-Q4_K_S.gguf',
  params: {
    n_ctx: 4096,
    n_threads: 4,
    temperature: 0.7,
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

type RunState = 'idle' | 'running';

export default function LlmTestScreen() {
  const [prompt, setPrompt] = useState('안녕 해마? 오늘 기분은 어때?');
  const [output, setOutput] = useState('');
  const [runState, setRunState] = useState<RunState>('idle');
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);

  useEffect(() => {
    return () => {
      if (contextRef.current) {
        void contextRef.current.stopCompletion().catch(() => {});
        void contextRef.current.release().catch(() => {});
        contextRef.current = null;
      }
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (runState === 'running') {
      await contextRef.current?.stopCompletion().catch(() => {});
      return;
    }

    setRunState('running');
    setOutput('');
    setError(null);

    let context: LlamaContext | null = null;
    try {
      const modelPath = await ensureModelAsset({
        id: GEMMA_1B_MODEL.id,
        bundleRelativePath: GEMMA_1B_MODEL.bundleRelativePath,
      });

      context = await initLlama({
        model: modelPath,
        n_ctx: GEMMA_1B_MODEL.params.n_ctx,
        n_threads: GEMMA_1B_MODEL.params.n_threads,
      });
      contextRef.current = context;

      const result = await context.completion(
        {
          messages: [
            {
              role: 'system',
              content: '당신은 돌봄 도우미 해마입니다. 따뜻하고 간결한 톤으로 한국어로만 답하세요.',
            },
            {
              role: 'user',
              content: prompt.trim(),
            },
          ],
          n_predict: 256,
          temperature: GEMMA_1B_MODEL.params.temperature,
          stop: STOP_WORDS,
        },
        (tokenData) => {
          if (tokenData.token) {
            setOutput((prev) => prev + tokenData.token);
          }
        }
      );

      if (result.text) {
        setOutput(result.text.trim());
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('번들에서 모델 파일')) {
        setError(
          `${err.message}\n\n터미널에서 \"npm run sync-models\" 실행 후, iOS/Android 빌드를 다시 만들어 주세요.`
        );
      } else {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      await context?.release().catch(() => {});
      contextRef.current = null;
      setRunState('idle');
    }
  }, [prompt, runState]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BrandColors.background }}>
      <Stack.Screen options={{ title: 'LLM 테스트', headerShown: true }} />

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
        }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.textPrimary }}>프롬프트</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: BrandColors.border,
              borderRadius: 16,
              padding: 12,
              backgroundColor: BrandColors.surface,
              color: BrandColors.textPrimary,
            }}
            placeholder="모델에게 질문을 입력하세요"
            placeholderTextColor={BrandColors.textSecondary}
          />
        </View>

        <RunButton runState={runState} onPress={handleRun} />

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.textPrimary }}>응답</Text>
          <View
            style={{
              minHeight: 160,
              borderWidth: 1,
              borderColor: BrandColors.border,
              borderRadius: 16,
              padding: 12,
              backgroundColor: BrandColors.surface,
            }}>
            {error ? (
              <Text style={{ color: 'tomato' }}>{error}</Text>
            ) : (
              <Text style={{ color: BrandColors.textPrimary, lineHeight: 22 }}>
                {output || (runState === 'running' ? '생성 중…' : '응답이 여기에 표시됩니다.')}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RunButton({ runState, onPress }: { runState: RunState; onPress: () => void }) {
  const isRunning = runState === 'running';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: BrandColors.primary,
          backgroundColor: isRunning ? BrandColors.surface : BrandColors.primary,
        }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: isRunning ? BrandColors.primary : BrandColors.textPrimary,
          }}>
          {isRunning ? '중단하기' : '모델 실행'}
        </Text>
      </Pressable>
      {isRunning ? <ActivityIndicator color={BrandColors.primary} /> : null}
    </View>
  );
}
