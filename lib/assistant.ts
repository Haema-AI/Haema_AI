import { extractKeywords } from '@/lib/conversation';
import { ChatMessage } from '@/types/chat';

const OPENING_PROMPTS = [
  '오늘 하루는 어떠셨나요?',
  '최근 기억에 남는 일이 있으신가요?',
  '불편한 점이나 걱정되는 일이 있으면 말씀해주세요.',
];

const FOLLOW_UP_SUGGESTIONS = [
  '비슷한 상황이 있을 때 어떻게 대처하셨나요?',
  '해당 상황에서 도움이 될 만한 사람이나 도구가 있을까요?',
  '할 수 있는 작은 실천 한 가지를 정해보면 어떨까요?',
];

const ENCOURAGEMENTS = [
  '잘 하고 계세요. 천천히 함께 해보면 됩니다.',
  '스스로 챙기려는 마음이 너무 소중합니다.',
  '이야기해 주셔서 감사합니다. 큰 도움이 됩니다.',
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildPlanSuggestion(keywords: string[]) {
  const keyword = keywords[0];
  if (!keyword) return '오늘 기억하고 싶은 내용을 메모로 남겨보면 어떨까요?';
  if (keyword.includes('약')) return '약 복용 알람을 설정해두면 깜빡하지 않을 수 있어요.';
  if (keyword.includes('운동')) return '가벼운 스트레칭으로 몸을 깨우는 시간을 추천드려요.';
  if (keyword.includes('수면')) return '취침 전 조용한 음악을 틀고 마음을 가라앉혀보세요.';
  if (keyword.includes('기억')) return '최근 기억을 사진이나 글로 남기는 것도 도움이 됩니다.';
  return '오늘 대화를 바탕으로 일정을 정리해보는 건 어떨까요?';
}

export function generateAssistantDraft(messages: ChatMessage[], keywords?: string[]): string {
  const userMessages = messages.filter((message) => message.role === 'user');
  const lastUser = userMessages.at(-1);
  const safeKeywords = keywords ?? extractKeywords(messages);

  if (!lastUser) {
    return `${pick(OPENING_PROMPTS)} ${pick(ENCOURAGEMENTS)}`;
  }

  const intro = `말씀해주신 "${lastUser.text}" 내용을 잘 들었습니다.`;
  const guidance = buildPlanSuggestion(safeKeywords);
  const followUp = pick(FOLLOW_UP_SUGGESTIONS);
  const encouragement = pick(ENCOURAGEMENTS);

  return `${intro} ${encouragement} ${guidance} ${followUp}`;
}

export async function mockLLMReply(messages: ChatMessage[], keywords?: string[]): Promise<string> {
  const latency = 400 + Math.random() * 900;
  await new Promise((resolve) => setTimeout(resolve, latency));
  return generateAssistantDraft(messages, keywords);
}
