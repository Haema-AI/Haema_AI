import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, Text, TextInput, View } from 'react-native';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUserId = useAuthStore((s) => s.setUserId);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    if (userId) {
      router.replace('/');
    }
  }, [userId]);

  const onSignIn = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('로그인 실패', error.message);
      return;
    }

    if (data.user) {
      setUserId(data.user.id);
      Alert.alert('로그인 성공', '메인 화면으로 이동합니다.');
      router.replace('/');
    }
  };

  const goToSignUp = () => {
    router.push('/auth/sign-up');
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 24 }}>로그인</Text>
      <TextInput
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          borderColor: '#ccc',
        }}
      />
      <TextInput
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          borderColor: '#ccc',
        }}
      />
      <Button title={loading ? '처리 중...' : '로그인'} onPress={onSignIn} disabled={loading} />
      <View style={{ height: 12 }} />
      <Button title="회원가입" onPress={goToSignUp} disabled={loading} />
    </View>
  );
}
