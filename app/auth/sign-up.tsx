import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert('입력 오류', '이메일, 비밀번호, 이름을 모두 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('비밀번호 확인', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);

    if (error) {
      Alert.alert('회원가입 실패', error.message);
      return;
    }

    Alert.alert('회원가입 완료', '이메일로 전송된 인증을 완료한 후 로그인해주세요.');
    router.replace('/auth/sign-in');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>회원가입</Text>
        <TextInput
          placeholder="이름"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            borderColor: '#ccc',
            backgroundColor: '#fff',
          }}
        />
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
            borderColor: '#ccc',
            backgroundColor: '#fff',
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
            borderColor: '#ccc',
            backgroundColor: '#fff',
          }}
        />
        <TextInput
          placeholder="비밀번호 확인"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            borderColor: '#ccc',
            backgroundColor: '#fff',
          }}
        />
        <Button title={loading ? '처리 중...' : '회원가입'} onPress={handleSignUp} disabled={loading} />
        <Button title="로그인으로 돌아가기" onPress={() => router.replace('/auth/sign-in')} disabled={loading} />
      </View>
    </ScrollView>
  );
}
