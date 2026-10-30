// 게임 화면의 글자 복사·선택과 이미지 끌어내기를 막는다.
// 입력칸(이름·IP·보고서)과 [data-selectable](오류 내용 등)은 그대로 두고, 게임 규칙상 끌어다 놓는 카드([draggable="true"])도 그대로 둔다.

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"], [data-selectable]');

export function protectContent(): void {
  const block = (e: Event) => {
    if (!editable(e.target)) e.preventDefault();
  };
  document.addEventListener('copy', block);
  document.addEventListener('cut', block);
  document.addEventListener('selectstart', block);
  document.addEventListener('contextmenu', block);
  document.addEventListener('dragstart', (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.closest('[draggable="true"]')) return;
    e.preventDefault();
  });
}
