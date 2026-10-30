; electron-builder 가 자동으로 포함하는 NSIS 사용자 스크립트 (build/installer.nsh)
; 설치 완료 화면에 "바탕화면에 바로가기 만들기" 체크박스를 단다.
; 바로가기는 설치 중에 만들어 두고(createDesktopShortcut), 체크를 끄고 [마침]을 누르면 지운다.
; 조용한 설치(/S, 자동 업데이트)는 이 화면을 거치지 않으므로 기존 바로가기를 그대로 둔다.

!macro customFinishPage
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "바탕화면에 바로가기 만들기"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "KeepDesktopShortcut"
  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE "FinishPageLeave"
  !insertmacro MUI_PAGE_FINISH

  ; 기본 완료 화면의 "공작소의 밤 실행" 체크박스 (electron-builder 템플릿과 같은 동작)
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  ; 체크박스를 켜 둔 경우: 설치 중에 만든 바로가기를 그대로 둔다
  Function KeepDesktopShortcut
  FunctionEnd

  ; 체크박스를 끈 채 [마침]을 누르면 바로가기를 지운다 (MUI 변수는 MUI_PAGE_FINISH 뒤에야 선언된다)
  Function FinishPageLeave
    SendMessage $mui.FinishPage.ShowReadme ${BM_GETCHECK} 0 0 $0
    ${if} $0 != ${BST_CHECKED}
      WinShell::UninstShortcut "$newDesktopLink"
      Delete "$newDesktopLink"
      System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
    ${endif}
  FunctionEnd
!macroend
