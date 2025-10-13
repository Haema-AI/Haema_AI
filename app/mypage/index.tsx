import CardButton from '@/components/CardButton';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useRecordsStore } from '@/store/recordsStore';

interface Profile {
  email?: string;
  name?: string;
}

export default function MyPage() {
  const [profile, setProfile] = useState<Profile>({});
  const { reset: resetChat } = useChatStore();
  const { records } = useRecordsStore();
  const setUserId = useAuthStore((state) => state.setUserId);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const user = data.user;
        if (user) {
          setProfile({
            email: user.email ?? undefined,
            name: (user.user_metadata as { name?: string } | null)?.name ?? undefined,
          });
        }
      })
      .catch(() => {
        // ignore user fetch errors in offline mode
      });
  }, []);

  const metrics = useMemo(() => {
    if (records.length === 0) {
      return {
        totalConversations: 0,
        averageRisk: 35,
        averageMood: 65,
        weeklyTrend: 0,
      };
    }

    const totalConversations = records.length;
    const averageRisk =
      records.reduce((acc, record) => acc + record.stats.riskScore, 0) / totalConversations;
    const averageMood =
      records.reduce((acc, record) => acc + record.stats.moodScore, 0) / totalConversations;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const lastWeekCount = records.filter((record) => record.createdAt >= sevenDaysAgo).length;
    const previousWeekCount = records.filter(
      (record) => record.createdAt < sevenDaysAgo && record.createdAt >= sevenDaysAgo - 7 * 24 * 60 * 60 * 1000,
    ).length;
    const weeklyTrend =
      previousWeekCount === 0
        ? lastWeekCount > 0
          ? 100
          : 0
        : ((lastWeekCount - previousWeekCount) / previousWeekCount) * 100;

    return {
      totalConversations,
      averageRisk: Math.round(averageRisk),
      averageMood: Math.round(averageMood),
      weeklyTrend: Math.round(weeklyTrend),
    };
  }, [records]);

  const lastRecord = records[0];

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('로그아웃 실패', error.message);
      return;
    }
    setUserId(undefined);
    resetChat();
    Alert.alert('로그아웃 완료', '로그인 화면으로 이동합니다.');
    router.replace('/auth/sign-in');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '700' }}>
          {profile.name ? `${profile.name}님,` : '안녕하세요,'}
        </Text>
        <Text style={{ fontSize: 18, color: '#666' }}>
          오늘도 기억 코치와 함께 일상을 관리해보세요.
        </Text>
        {profile.email ? <Text style={{ color: '#888' }}>{profile.email}</Text> : null}
      </View>

      <View
        style={{
          backgroundColor: '#f2f4f8',
          borderRadius: 16,
          padding: 20,
          gap: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32, fontWeight: '700' }}>{records.length}</Text>
          <Text style={{ color: '#666' }}>저장된 대화</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 32, fontWeight: '700' }}>{metrics.averageRisk}</Text>
          <Text style={{ color: '#666' }}>치매 위험 지수</Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 12,
          gap: 12,
        }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>활동 요약</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#777' }}>주간 대화 변화</Text>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              {metrics.weeklyTrend >= 0 ? '+' : ''}
              {metrics.weeklyTrend}%
            </Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#777' }}>평균 감정 점수</Text>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>{metrics.averageMood}</Text>
          </View>
        </View>
        {lastRecord ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#777', marginBottom: 4 }}>최근 기록 요약</Text>
            <Text style={{ fontSize: 16, lineHeight: 22 }}>{lastRecord.summary}</Text>
          </View>
        ) : (
          <Text style={{ color: '#777' }}>아직 저장된 대화가 없습니다.</Text>
        )}
      </View>

      <View style={{ gap: 12 }}>
        <CardButton title="기록 보러가기" onPress={() => router.push('/records')} />
        <CardButton title="통계 확인하기" onPress={() => router.push('/stats')} />
        <CardButton title="치매 예방 게임" onPress={() => router.push('/games')} />
      </View>

      <CardButton title="로그아웃" onPress={logout} />
    </ScrollView>
  );
}
