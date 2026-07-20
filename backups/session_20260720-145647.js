/**
 * 대화/작업 백업 (자동 생성)
 * - 목적: 다음 TASK에서도 현재 작업 맥락과 변경사항을 빠르게 복원
 * - 주의: 이 파일은 기록 보관용입니다.
 */

export const sessionBackup = {
  sessionId: "20260720-145647",
  project: "coinbreaker3",
  timezone: "Asia/Seoul",
  userRequest:
    "프리셋 10번 아래에 프리셋축하 버튼 추가, 누르면 축하 문구 1개 랜덤 표시, 문구 목록 추가/삭제 가능한 설정칸 추가",
  summary: [
    "프리셋10 아래에 `프리셋축하` 버튼과 결과 문구 영역을 추가",
    "버튼 클릭 시 축하 문구 목록 중 1개가 랜덤으로 표시되도록 구현",
    "스크린샷/크롭 없이 텍스트만 나오도록 별도 로직으로 분리",
    "축하 문구 목록을 수정할 수 있는 textarea 설정칸을 추가",
    "축하 문구 목록도 상태 저장에 포함되어 다시 열어도 유지되도록 반영",
  ],
  defaults: {
    congratsLines: [
      "축하합니다~",
      "수익 축하합니다",
      "수익 축하해요",
      "다들 시크가 크시네요. 수익 축하드립니다.",
      "모두들 수익 축하합니다.",
      "축하드립니다.",
    ],
  },
  versionPolicy: {
    format: "YYYYMMDD-HHMMSS",
    currentVersion: "20260720-145647",
  },
  filesChanged: {
    added: ["backups/session_20260720-145647.js"],
    modified: ["index.html", "app.js", "version.json", "control/index.html", "simple/index.html", "maker/index.html"],
  },
  conversation: [
    {
      role: "user",
      content:
        "프리셋축하 버튼 만들고 축하 문구 랜덤 표시, 문구 설정 추가/삭제 가능하게",
    },
    {
      role: "assistant",
      content:
        "프리셋10 아래에 축하 버튼과 결과 문구를 추가했고, 문구 목록을 수정할 수 있는 설정칸과 저장 로직도 같이 넣었습니다.",
    },
  ],
};

