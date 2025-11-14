import { BrandColors, Shadows } from '@/constants/theme';
import { calculateSpeechMetrics } from '@/lib/analysis/speechMetrics';
import { transcribeAudioDetailed } from '@/lib/stt';
import { startVoiceRecording, type RecordingHandle } from '@/lib/voice';
import { usePhotoNotesStore } from '@/store/photoNotesStore';
import type { DetailedTranscript, SpeechMetrics } from '@/types/speech';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const IMAGE_ID = 'test-image';
const IMAGE_SOURCE = require('@/assets/test_image.png');

type MetricDescriptor = {
  key: keyof SpeechMetrics;
  label: string;
  format?: (value: number) => string;
};

const METRIC_DESCRIPTORS: MetricDescriptor[] = [
  { key: 'speechRateWpm', label: '말 빠르기', format: (value) => `${value} wpm` },
  { key: 'meanPauseDurationSec', label: '평균 휴지', format: (value) => `${value}s` },
  { key: 'pausesPerMinute', label: '분당 휴지', format: (value) => `${value}` },
  { key: 'mlu', label: 'MLU', format: (value) => `${value}` },
  { key: 'ttr', label: 'TTR', format: (value) => `${value}` },
  { key: 'totalWords', label: '단어 수' },
];

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexBasis: '48%',
        flexGrow: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BrandColors.border,
        backgroundColor: BrandColors.surfaceSoft,
        padding: 12,
        gap: 4,
      }}>
      <Text style={{ fontSize: 12, color: BrandColors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary }}>{value}</Text>
    </View>
  );
}

function formatMetricValue(value: number, formatter?: (value: number) => string) {
  if (typeof formatter === 'function') {
    return formatter(value);
  }
  return Number.isFinite(value) ? `${value}` : '0';
}

export default function PhotoNoteScreen() {
  const notes = usePhotoNotesStore((state) => state.notes);
  const hydrate = usePhotoNotesStore((state) => state.hydrate);
  const addNote = usePhotoNotesStore((state) => state.addNote);

  const [recordingHandle, setRecordingHandle] = useState<RecordingHandle | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [description, setDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [latestAudioUri, setLatestAudioUri] = useState<string | undefined>();
  const [latestTranscript, setLatestTranscript] = useState<DetailedTranscript | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<SpeechMetrics | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    return () => {
      if (recordingHandle) {
        void recordingHandle.stop({ discard: true }).catch(() => undefined);
      }
    };
  }, [recordingHandle]);

  const imageNotes = useMemo(() => notes.filter((note) => note.imageId === IMAGE_ID), [notes]);

  const handleStartRecording = useCallback(async () => {
    try {
      setStatusMessage(null);
      setLatestMetrics(null);
      setLatestTranscript(null);
      setLatestAudioUri(undefined);
      const handle = await startVoiceRecording();
      setRecordingHandle(handle);
      setIsRecording(true);
    } catch (error) {
      console.error('녹음 시작 실패', error);
      Alert.alert('녹음 실패', error instanceof Error ? error.message : '마이크를 사용할 수 없습니다.');
    }
  }, []);

  const handleCancelRecording = useCallback(async () => {
    if (!recordingHandle) return;
    setIsRecording(false);
    try {
      await recordingHandle.stop({ discard: true });
      setStatusMessage('녹음을 취소했습니다.');
    } catch (error) {
      console.error('녹음 취소 실패', error);
    } finally {
      setRecordingHandle(null);
      setLatestMetrics(null);
      setLatestTranscript(null);
      setLatestAudioUri(undefined);
    }
  }, [recordingHandle]);

  const processAudioFile = useCallback(
    async (uri: string) => {
      setIsTranscribing(true);
      try {
        setLatestAudioUri(uri);
        const transcript = await transcribeAudioDetailed(uri, { language: 'en' });
        setDescription(transcript.text);
        setLatestTranscript(transcript);
        setLatestMetrics(calculateSpeechMetrics(transcript));
        setStatusMessage('음성 인식이 완료되었습니다.');
      } catch (error) {
        console.error('오디오 처리 실패', error);
        setStatusMessage('음성을 문자로 변환하지 못했습니다. 직접 내용을 적어주세요.');
        Alert.alert('인식 실패', error instanceof Error ? error.message : '파일 처리 중 문제가 발생했습니다.');
      } finally {
        setIsTranscribing(false);
      }
    },
    [],
  );

  const handleStopRecording = useCallback(async () => {
    if (!recordingHandle) return;
    setIsRecording(false);
    try {
      const result = await recordingHandle.stop();
      if (!result?.fileUri) {
        setStatusMessage('녹음이 취소되었습니다.');
        return;
      }
      await processAudioFile(result.fileUri);
    } catch (error) {
      console.error('녹음 정지 실패', error);
      setStatusMessage('음성을 문자로 변환하지 못했습니다. 직접 내용을 적어주세요.');
      Alert.alert('인식 실패', error instanceof Error ? error.message : '녹음 처리 중 문제가 발생했습니다.');
    } finally {
      setRecordingHandle(null);
    }
  }, [processAudioFile, recordingHandle]);

  const handlePickAudioFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await processAudioFile(result.assets[0].uri);
    } catch (error) {
      console.error('오디오 파일 선택 실패', error);
      Alert.alert('파일 선택 실패', error instanceof Error ? error.message : '오디오 파일을 불러오지 못했습니다.');
    }
  }, [processAudioFile]);

  const handleSave = useCallback(async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      Alert.alert('설명 필요', '음성 인식 결과가 없다면 직접 내용을 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await addNote({
        imageId: IMAGE_ID,
        description: trimmed,
        audioUri: latestAudioUri,
        transcript: latestTranscript?.text ?? trimmed,
        metrics: latestMetrics ?? undefined,
      });
      setDescription('');
      setLatestAudioUri(undefined);
      setLatestTranscript(null);
      setLatestMetrics(null);
      setStatusMessage('설명이 저장되었습니다.');
    } catch (error) {
      console.error('사진 노트 저장 실패', error);
      Alert.alert('저장 실패', error instanceof Error ? error.message : '설명을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [description, addNote, latestAudioUri, latestTranscript, latestMetrics]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BrandColors.background }} edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: '사진 설명 메모',
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: Math.max(40, insets.bottom + 24),
            gap: 24,
          }}
          keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: BrandColors.textPrimary }}>사진 설명 기록</Text>
            <Text style={{ color: BrandColors.textSecondary, lineHeight: 20 }}>
              사진을 보며 떠오른 이야기를 음성으로 남기고 텍스트로 정리해 보세요.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 26,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: BrandColors.border,
              ...Shadows.card,
            }}>
            <Image source={IMAGE_SOURCE} style={{ width: '100%', aspectRatio: 3 / 2 }} contentFit="cover" transition={200} />
          </View>

          <View
            style={{
              backgroundColor: BrandColors.surface,
              borderRadius: 24,
              padding: 20,
              gap: 16,
              borderWidth: 1,
              borderColor: BrandColors.border,
              ...Shadows.card,
            }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.textPrimary }}>음성으로 설명 남기기</Text>
              <Text style={{ color: BrandColors.textSecondary }}>
                버튼을 눌러 녹음을 시작하고 설명을 들려주세요. 종료하면 자동으로 글자로 변환돼요.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isRecording ? '#FF6B6B' : BrandColors.primary,
                }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{isRecording ? '녹음 멈추기' : '녹음 시작'}</Text>
              </Pressable>
              {isRecording ? (
                <Pressable
                  onPress={handleCancelRecording}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: BrandColors.border,
                    backgroundColor: BrandColors.surface,
                  }}>
                  <Text style={{ color: BrandColors.textSecondary, fontWeight: '600' }}>취소</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={handlePickAudioFile}
              disabled={isTranscribing}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: BrandColors.border,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: isTranscribing ? BrandColors.surface : BrandColors.surfaceSoft,
              }}>
              <Text style={{ color: BrandColors.textPrimary, fontWeight: '600' }}>
                오디오 파일 불러오기
              </Text>
            </Pressable>

            {isTranscribing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
                <Text style={{ color: BrandColors.textSecondary }}>음성을 변환하는 중이에요…</Text>
              </View>
            ) : null}

            {statusMessage ? <Text style={{ color: BrandColors.textSecondary }}>{statusMessage}</Text> : null}
            {latestMetrics ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: BrandColors.textPrimary }}>말하기 지표</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {METRIC_DESCRIPTORS.map((descriptor) => (
                    <MetricBadge
                      key={descriptor.key}
                      label={descriptor.label}
                      value={formatMetricValue(latestMetrics[descriptor.key], descriptor.format)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View
            style={{
              backgroundColor: BrandColors.surface,
              borderRadius: 24,
              padding: 20,
              gap: 12,
              borderWidth: 1,
              borderColor: BrandColors.border,
              ...Shadows.card,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.textPrimary }}>텍스트 편집</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="음성 인식으로 작성된 설명이 여기에 표시됩니다."
              placeholderTextColor={BrandColors.textSecondary}
              style={{
                minHeight: 140,
                borderWidth: 1,
                borderColor: BrandColors.border,
                borderRadius: 18,
                padding: 16,
                backgroundColor: BrandColors.surfaceSoft,
                color: BrandColors.textPrimary,
                textAlignVertical: 'top',
                lineHeight: 20,
              }}
            />
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={{
                borderRadius: 18,
                paddingVertical: 16,
                alignItems: 'center',
                backgroundColor: isSaving ? BrandColors.border : BrandColors.primary,
              }}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>설명 저장하기</Text>}
            </Pressable>
          </View>

          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.textPrimary }}>저장된 설명</Text>
            {imageNotes.length === 0 ? (
              <View
                style={{
                  backgroundColor: BrandColors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: BrandColors.border,
                }}>
                <Text style={{ color: BrandColors.textSecondary }}>아직 저장된 설명이 없습니다.</Text>
              </View>
            ) : (
              imageNotes.map((note) => (
                <View
                  key={note.id}
                  style={{
                    backgroundColor: BrandColors.surface,
                    borderRadius: 20,
                    padding: 20,
                    gap: 8,
                    borderWidth: 1,
                    borderColor: BrandColors.border,
                    ...Shadows.card,
                  }}>
                  <Text style={{ fontSize: 13, color: BrandColors.textSecondary }}>
                    {new Date(note.updatedAt).toLocaleString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={{ color: BrandColors.textPrimary, lineHeight: 22 }}>{note.description}</Text>
                  {note.metrics ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: BrandColors.textPrimary }}>기록된 지표</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {METRIC_DESCRIPTORS.map((descriptor) => (
                          <MetricBadge
                            key={`${note.id}-${descriptor.key}`}
                            label={descriptor.label}
                            value={formatMetricValue(note.metrics?.[descriptor.key] ?? 0, descriptor.format)}
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
