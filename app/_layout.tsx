import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useRecordsStore } from '@/store/recordsStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

export default function RootLayout() {
  const setUserId = useAuthStore((state) => state.setUserId);
  const hydrateChat = useChatStore((state) => state.hydrate);
  const hydrateRecords = useRecordsStore((state) => state.hydrate);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserId]);

  useEffect(() => {
    void hydrateChat();
    void hydrateRecords();
  }, [hydrateChat, hydrateRecords]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
