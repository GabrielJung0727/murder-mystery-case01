// 판의 진범 변형에 맞는 엔딩·진상 나레이션을 고른다.
// 원작(v0)은 기존 녹음, 변형은 NAR-E-A-v1 처럼 변형 ID가 붙은 녹음이 있으면 그것을, 없으면 읽지 않는다.
// (엔딩 D 문구는 모든 변형이 같으므로 원작 녹음을 쓴다.) 대본: docs/나레이션_변형_대본.md
import type { EndingId } from '../data/story';
import type { VariantId } from '../data/variants';
import { hasVoice, type VoiceId } from './director';

export function endingVoice(variant: VariantId, ending: EndingId): VoiceId | null {
  const own = `NAR-E-${ending}-${variant}`;
  if (hasVoice(own)) return own;
  if (variant === 'v0' || ending === 'D') return `NAR-E-${ending}` as VoiceId;
  return null;
}

/** 진상(+후일담) 나레이션 */
export function truthVoices(variant: VariantId): VoiceId[] {
  if (variant === 'v0') return ['NAR-T01', 'NAR-T02'];
  return [`NAR-T-${variant}`, `NAR-T2-${variant}`].filter(hasVoice);
}

/** 후일담만 */
export function afterwordVoices(variant: VariantId): VoiceId[] {
  if (variant === 'v0') return ['NAR-T02'];
  return [`NAR-T2-${variant}`].filter(hasVoice);
}
