import { useRecordsStore } from '@/store/recordsStore';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';

export default function RecordDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const getRecord = useRecordsStore((state) => state.getRecord);
  const removeRecord = useRecordsStore((state) => state.removeRecord);
  const updateRecordTitle = useRecordsStore((state) => state.updateRecordTitle);

  const record = id ? getRecord(id) : undefined;
  const [title, setTitle] = useState(record?.title ?? '');

  useEffect(() => {
    setTitle(record?.title ?? '');
  }, [record?.title]);

  if (!record) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>찾을 수 없는 기록입니다.</Text>
        <Text style={{ color: '#666', textAlign: 'center' }}>
          기록이 삭제되었거나 아직 저장되지 않았을 수 있습니다.
        </Text>
        <Button title="기록 목록으로" onPress={() => router.replace('/records')} />
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert('기록 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          removeRecord(record.id);
          router.replace('/records');
        },
      },
    ]);
  };

  const handleUpdateTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('제목', '제목은 비워둘 수 없습니다.');
      setTitle(record.title);
      return;
    }
    if (trimmed !== record.title) {
      updateRecordTitle(record.id, trimmed);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <View style={{ gap: 12 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onBlur={handleUpdateTitle}
          style={{
            fontSize: 26,
            fontWeight: '700',
            borderBottomWidth: 1,
            borderColor: '#e4e7eb',
            paddingBottom: 6,
          }}
        />
        <Text style={{ color: '#999' }}>
          {new Date(record.createdAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{ flex: 1, backgroundColor: '#f1f3f5', borderRadius: 14, padding: 16, gap: 4, alignItems: 'center' }}>
          <Text style={{ color: '#555' }}>치매 위험 지수</Text>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>{record.stats.riskScore}</Text>
        </View>
        <View
          style={{ flex: 1, backgroundColor: '#f8f9fa', borderRadius: 14, padding: 16, gap: 4, alignItems: 'center' }}>
          <Text style={{ color: '#555' }}>감정 점수</Text>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>{record.stats.moodScore}</Text>
        </View>
        <View
          style={{ flex: 1, backgroundColor: '#f1f3f5', borderRadius: 14, padding: 16, gap: 4, alignItems: 'center' }}>
          <Text style={{ color: '#555' }}>대화 횟수</Text>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>{record.stats.totalTurns}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: '#f1f3f5' }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>요약</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: '#333' }}>{record.summary}</Text>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 8, borderWidth: 1, borderColor: '#f1f3f5' }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>핵심 메모</Text>
        {record.highlights.map((highlight) => (
          <View key={highlight} style={{ paddingVertical: 6 }}>
            <Text style={{ color: '#4c6ef5', fontWeight: '600' }}>• {highlight}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
        {record.keywords.map((keyword) => (
          <View key={keyword} style={{ backgroundColor: '#f1f3f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
            <Text style={{ color: '#555', fontSize: 13 }}>#{keyword}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <Button
          title="이 기록으로 게임 풀기"
          onPress={() => router.push({ pathname: '/games', params: { recordId: record.id } })}
        />
        <Button title="기록 삭제" color="#f03e3e" onPress={handleDelete} />
      </View>
    </ScrollView>
  );
}
