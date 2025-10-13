import CardButton from '@/components/CardButton';
import { useRecordsStore } from '@/store/recordsStore';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Records() {
  const { records } = useRecordsStore();

  const averageRisk = useMemo(() => {
    if (records.length === 0) return 0;
    return Math.round(records.reduce((acc, record) => acc + record.stats.riskScore, 0) / records.length);
  }, [records]);

  return (
    <View style={{ flex: 1, padding: 20, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 4 }}>대화 기록 보관함</Text>
        <Text style={{ color: '#666' }}>저장된 대화를 요약과 함께 확인해보세요.</Text>
      </View>

      <View
        style={{
          backgroundColor: '#f1f3f5',
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <View>
          <Text style={{ fontSize: 16, color: '#555' }}>총 기록</Text>
          <Text style={{ fontSize: 28, fontWeight: '700' }}>{records.length}개</Text>
        </View>
        <View>
          <Text style={{ fontSize: 16, color: '#555' }}>평균 위험 지수</Text>
          <Text style={{ fontSize: 28, fontWeight: '700' }}>{averageRisk}</Text>
        </View>
      </View>

      {records.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ color: '#666', fontSize: 16 }}>아직 저장된 대화가 없습니다.</Text>
          <CardButton title="대화 시작하러 가기" onPress={() => router.push('/chat')} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/records/${item.id}`)}
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 18,
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                gap: 8,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#4c6ef5', fontWeight: '600' }}>{item.stats.riskScore}점</Text>
              </View>
              <Text style={{ color: '#999', fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
              <Text style={{ color: '#444', lineHeight: 20 }} numberOfLines={2}>
                {item.summary}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {item.keywords.map((keyword) => (
                  <View
                    key={keyword}
                    style={{ backgroundColor: '#f1f3f5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: '#555', fontSize: 12 }}>#{keyword}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
