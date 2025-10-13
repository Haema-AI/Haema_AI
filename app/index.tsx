import CardButton from '@/components/CardButton';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

export default function Home() {
  const userId = useAuthStore((state) => state.userId);

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 6 }}>치매 관리 도우미</Text>
      <Text style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>대화와 게임으로 기억을 돌보고, 통계로 변화를 확인하세요.</Text>
      <View style={{ gap: 8 }}>
        <CardButton title="대화 시작하기" onPress={() => router.push('/chat')} />
        <CardButton title="기록 모아보기" onPress={() => router.push('/records')} />
        <CardButton title="통계 확인하기" onPress={() => router.push('/stats')} />
        <CardButton title="맞춤 퀴즈 (게임)" onPress={() => router.push('/games')} />
        {userId ? (
          <CardButton title="마이페이지" onPress={() => router.push('/mypage')} />
        ) : (
          <>
            <CardButton title="로그인" onPress={() => router.push('/auth/sign-in')} />
            <CardButton title="회원가입" onPress={() => router.push('/auth/sign-up')} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
