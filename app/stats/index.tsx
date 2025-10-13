import { useRecordsStore } from '@/store/recordsStore';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine, VictoryTheme } from 'victory-native';

interface DailyDataPoint {
  label: string;
  risk: number;
  count: number;
}

const getLastNDays = (n: number) => {
  const days: Date[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
};

const formatDayKey = (date: Date) => date.toISOString().slice(0, 10);

export default function Stats() {
  const { records } = useRecordsStore();

  const { summary, dailyTrend } = useMemo(() => {
    if (records.length === 0) {
      const emptyDays = getLastNDays(7).map((date) => ({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        risk: 0,
        count: 0,
      }));

      return {
        summary: {
          total: 0,
          averageRisk: 0,
          peakRisk: 0,
          averageMood: 0,
          lastConversation: undefined as string | undefined,
        },
        dailyTrend: emptyDays,
      };
    }

    const total = records.length;
    const averageRisk = Math.round(records.reduce((acc, record) => acc + record.stats.riskScore, 0) / total);
    const averageMood = Math.round(records.reduce((acc, record) => acc + record.stats.moodScore, 0) / total);
    const peakRecord = records.reduce((prev, current) =>
      current.stats.riskScore > prev.stats.riskScore ? current : prev,
    );

    const lastConversation = records[0]?.summary;

    const days = getLastNDays(7);
    const buckets = new Map<string, { riskSum: number; count: number }>();

    days.forEach((day) => {
      buckets.set(formatDayKey(day), { riskSum: 0, count: 0 });
    });

    records.forEach((record) => {
      const dayKey = formatDayKey(new Date(record.createdAt));
      const bucket = buckets.get(dayKey);
      if (bucket) {
        bucket.riskSum += record.stats.riskScore;
        bucket.count += 1;
      }
    });

    const dailyTrend: DailyDataPoint[] = days.map((day) => {
      const key = formatDayKey(day);
      const bucket = buckets.get(key) ?? { riskSum: 0, count: 0 };
      return {
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        risk: bucket.count === 0 ? 0 : Math.round(bucket.riskSum / bucket.count),
        count: bucket.count,
      };
    });

    return {
      summary: {
        total,
        averageRisk,
        peakRisk: peakRecord.stats.riskScore,
        averageMood,
        lastConversation,
      },
      dailyTrend,
    };
  }, [records]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 4 }}>건강 통계</Text>
        <Text style={{ color: '#666' }}>최근 대화 기록을 기반으로 활동과 위험 지수를 확인하세요.</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#f1f3f5', borderRadius: 14, padding: 16, gap: 6 }}>
          <Text style={{ color: '#555' }}>저장된 대화</Text>
          <Text style={{ fontSize: 26, fontWeight: '700' }}>{summary.total}회</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#f8f9fa', borderRadius: 14, padding: 16, gap: 6 }}>
          <Text style={{ color: '#555' }}>평균 위험 지수</Text>
          <Text style={{ fontSize: 26, fontWeight: '700' }}>{summary.averageRisk}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#f1f3f5', borderRadius: 14, padding: 16, gap: 6 }}>
          <Text style={{ color: '#555' }}>평균 감정 점수</Text>
          <Text style={{ fontSize: 26, fontWeight: '700' }}>{summary.averageMood}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f3f5' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>주간 위험 지수 추이</Text>
        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 20, y: 20 }}
          padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
          height={240}>
          <VictoryAxis style={{ tickLabels: { fontSize: 12 } }} />
          <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 12 } }} tickFormat={(y) => `${y}`} />
          <VictoryLine
            data={dailyTrend}
            x="label"
            y="risk"
            style={{ data: { stroke: '#4c6ef5', strokeWidth: 3 } }}
            interpolation="monotoneX"
          />
        </VictoryChart>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f3f5' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>주간 대화 횟수</Text>
        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 20 }}
          padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
          height={240}>
          <VictoryAxis style={{ tickLabels: { fontSize: 12 } }} />
          <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 12 } }} />
          <VictoryBar
            data={dailyTrend}
            x="label"
            y="count"
            style={{ data: { fill: '#82c91e', width: 22 } }}
            cornerRadius={6}
          />
        </VictoryChart>
      </View>

      {summary.lastConversation ? (
        <View
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: 16,
            padding: 18,
            gap: 8,
            borderWidth: 1,
            borderColor: '#edf0f5',
          }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>최근 대화 요약</Text>
          <Text style={{ color: '#444', lineHeight: 22 }}>{summary.lastConversation}</Text>
        </View>
      ) : (
        <Text style={{ color: '#666' }}>기록이 저장되면 맞춤 통계를 보여드릴게요.</Text>
      )}
    </ScrollView>
  );
}
