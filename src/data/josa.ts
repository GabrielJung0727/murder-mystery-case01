// 받침 유무에 따라 조사를 고른다: josa('이선빈', '이/가') → '이선빈이'
const DIGIT_BATCHIM = [true, true, false, true, false, false, true, true, true, false]; // 영일이삼사오육칠팔구

function hasBatchim(word: string): boolean {
  const ch = [...word.replace(/[\s」』)\]"'.]+$/u, '')].pop() ?? '';
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (ch >= '0' && ch <= '9') return DIGIT_BATCHIM[Number(ch)];
  return false;
}

export type JosaPair = '이/가' | '을/를' | '은/는' | '과/와';

export function josa(word: string, pair: JosaPair): string {
  const [withB, withoutB] = pair.split('/');
  return word + (hasBatchim(word) ? withB : withoutB);
}
