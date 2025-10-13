import { mockLLMReply } from '@/lib/assistant';
import { extractKeywords } from '@/lib/conversation';
import { say } from '@/lib/speech';
import { useChatStore } from '@/store/chatStore';
import { useRecordsStore } from '@/store/recordsStore';
import type { ChatMessage } from '@/types/chat';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View
      style={{
        marginVertical: 6,
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
      }}>
      <View
        style={{
          backgroundColor: isUser ? '#4c6ef5' : '#f1f3f5',
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 0 : 16,
          borderBottomLeftRadius: isUser ? 16 : 0,
        }}>
        <Text style={{ color: isUser ? '#fff' : '#111', fontSize: 16, lineHeight: 22 }}>{message.text}</Text>
      </View>
      <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
        {new Date(message.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

export default function Chat() {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { messages, addMessage, addAssistantMessage, isResponding, setResponding, reset } = useChatStore();
  const addRecord = useRecordsStore((state) => state.addRecordFromMessages);
  const [input, setInput] = useState('');

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  );

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ animated: true, offset: Number.MAX_SAFE_INTEGER });
    });
  };

  const send = async () => {
    if (!input.trim() || isResponding) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: input.trim(),
      ts: Date.now(),
    };

    const conversation = [...messages, userMessage];

    addMessage(userMessage);
    setInput('');
    scrollToEnd();
    setResponding(true);

    try {
      const keywords = extractKeywords(conversation);
      const assistantReply = await mockLLMReply(conversation, keywords);
      const assistantMessage = addAssistantMessage(assistantReply);
      scrollToEnd();
      await say(assistantMessage.text);
    } catch (error) {
      console.error(error);
      Alert.alert('대화 오류', '응답을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setResponding(false);
    }
  };

  const handleSaveRecord = () => {
    const chatMessages = useChatStore.getState().messages;
    if (chatMessages.length < 2) {
      Alert.alert('저장 불가', '대화가 조금 더 쌓인 후에 기록을 저장할 수 있어요.');
      return;
    }

    const record = addRecord({
      messages: chatMessages.map((message) => ({ ...message })),
      title: chatMessages.find((message) => message.role === 'user')?.text.slice(0, 18) ?? undefined,
    });

    Alert.alert('저장 완료', '기록 페이지에서 대화 요약을 확인할 수 있어요.', [
      { text: '기록 보기', onPress: () => router.push(`/records/${record.id}`) },
      { text: '계속 대화하기' },
    ]);
  };

  const handleReset = () => {
    Alert.alert('새 대화 시작', '현재 대화를 초기화할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          reset();
          setInput('');
        },
      },
    ]);
  };

  const replayAssistantVoice = () => {
    if (lastAssistantMessage) {
      say(lastAssistantMessage.text);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700' }}>기억 코치</Text>
            <Text style={{ color: '#666' }}>AI와 대화하며 기억력을 관리해보세요.</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Button title="요약 저장" onPress={handleSaveRecord} />
            <Button title="새 대화" onPress={handleReset} />
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>첫 대화를 시작해보세요</Text>
              <Text style={{ color: '#666', textAlign: 'center', lineHeight: 20 }}>
                오늘 기억하고 싶은 일이나 걱정되는 점을 이야기하면, 기억 코치가 함께 정리해드려요.
              </Text>
            </View>
          }
          ListFooterComponent={
            isResponding ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 }}>
                <ActivityIndicator size="small" color="#4c6ef5" />
                <Text style={{ color: '#4c6ef5' }}>기억 코치가 생각을 정리하고 있어요...</Text>
              </View>
            ) : null
          }
        />
      </View>

      <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#f1f3f5', backgroundColor: '#fff', gap: 8 }}>
        {lastAssistantMessage ? (
          <Pressable
            onPress={replayAssistantVoice}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: '#f1f3f5',
              borderRadius: 999,
            }}>
            <Text style={{ color: '#4c6ef5', fontWeight: '600' }}>마지막 답변 다시 듣기</Text>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#d7dce2', borderRadius: 16, padding: 8 }}>
          <TextInput
            style={{ flex: 1, paddingHorizontal: 12, fontSize: 16 }}
            value={input}
            placeholder="오늘은 어떤 이야기를 나눌까요?"
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || isResponding}
            style={{
              backgroundColor: !input.trim() || isResponding ? '#adb5bd' : '#4c6ef5',
              borderRadius: 12,
              paddingHorizontal: 16,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 8,
            }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{isResponding ? '전송중' : '전송'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
