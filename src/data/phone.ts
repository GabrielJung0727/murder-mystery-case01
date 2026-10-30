// 스마트폰 에뮬레이터 표시용 데이터 (카드 원문을 앱 화면 형식으로 재구성)
export type PhoneEntry =
  | { app: 'messenger'; thread: string; note?: string; messages: { from: string; text: string; draft?: boolean }[] }
  | { app: 'call'; who: string; time: string; status: string }
  | { app: 'gallery'; caption: string; time: string; memo?: string; scene: 'docs' | 'yard' | 'reflection' };

export const PHONE: Record<string, PhoneEntry> = {
  '08': { app: 'messenger', thread: '남여진 → 김아린', note: '이후 대화는 잠겨 있음', messages: [{ from: '남여진', text: '정재우한테 보고했어. 호연이 오늘 규정집을 또 꺼낼 거래.' }] },
  '18': {
    app: 'messenger', thread: '남여진 ↔ 정재우', note: '앞뒤 대화 일부 삭제됨',
    messages: [
      { from: '남여진', text: '계속 지켜보고 있어. 규정집을 다시 꺼내면 바로 보낼게.' },
      { from: '정재우', text: '안 되면 우리 쪽에서 알아서 처리해야지.' },
    ],
  },
  '26': { app: 'messenger', thread: '정재구 → 강호연 (임시 보관함)', note: '전송 기록 없음', messages: [{ from: '정재구', text: '네가 내 친구라는 이유로 내 동의까지 당연하게 생각하지 마.', draft: true }] },
  '30': {
    app: 'messenger', thread: '정재우 ↔ 남여진 (복구됨)', note: '삭제 후 복구된 메시지',
    messages: [
      { from: '정재우', text: '오늘 안에 결론을 내자. 강호연이 끝까지 버티면 더는 기다릴 이유가 없어.' },
      { from: '남여진', text: '알겠어. 상황을 보고 이야기할게.' },
    ],
  },
  '24': { app: 'call', who: '이성철 → 강호연', time: '00:57', status: '연결되지 않음' },
  '19': { app: 'gallery', caption: '김아린 → 정재우 · 규정집 사진 전송', time: '23:48', memo: '쪽방 열쇠는 돌려놨어. 사진은 다 보냈어.', scene: 'docs' },
  '33': { app: 'gallery', caption: '정재구 · 어두운 뒤뜰', time: '00:29', scene: 'yard' },
  '34': { app: 'gallery', caption: '김아린 · 규정집 사진 (2층 계단 위)', time: '00:23', scene: 'reflection' },
};
