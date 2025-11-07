import { BrandColors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

export default function LlmTestWebFallback() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BrandColors.background }}>
      <Stack.Screen options={{ title: 'LLM 테스트', headerShown: true }} />

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 16,
        }}>
        <View
          style={{
            borderRadius: 20,
            padding: 20,
            backgroundColor: BrandColors.surface,
            borderWidth: 1,
            borderColor: BrandColors.border,
            gap: 12,
          }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.textPrimary }}>웹에서는 지원하지 않아요</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: BrandColors.textSecondary }}>
            온디바이스 모델 테스트는 iOS 또는 Android 디바이스에서만 가능합니다. 실제 기기에서 Expo 앱을 실행해 주세요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
