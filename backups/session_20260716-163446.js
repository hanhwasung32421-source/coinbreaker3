/**
 * 대화/작업 백업 (자동 생성)
 * - 목적: 다음 TASK에서도 현재 작업 맥락과 변경사항을 빠르게 복원
 * - 주의: 이 파일은 기록 보관용입니다.
 */

export const sessionBackup = {
  sessionId: "20260716-163446",
  project: "coinbreaker3",
  timezone: "Asia/Seoul",
  userRequest:
    "자동배율적용 체크박스 + 5개 수익률 구간별 배율 규칙을 만들고, 구간이 겹치면 중복 체크 불가(경고 + 나중 체크는 체크 해제) 처리",
  summary: [
    "프리셋 수익금 범위 설정에 '자동배율적용' 체크박스 추가 (체크 시 5개 규칙 UI 노출)",
    "규칙: '수익률 min~max% = 배율 %' 형태로 5개까지 설정/저장",
    "구간이 겹치면 중복 체크할 수 없도록 하고, 나중에 체크한 항목은 자동으로 체크 해제 + 경고 토스트 표시",
    "배율 적용은 생성 시점에 수익률(percent)에 따라 수익금을 자동/수동 배율로 스케일링하여 실제 스크린샷에 반영",
    "미리보기/ZIP 저장에서도 동일한 배율 로직이 적용되도록 반영",
  ],
  defaults: {
    autoEnabled: false,
    rules: [
      { enabled: true, range: "20~30%", scale: "100%" },
      { enabled: true, range: "30~40%", scale: "120%" },
      { enabled: true, range: "40~60%", scale: "140%" },
      { enabled: false, range: "60~80%", scale: "100%" },
      { enabled: false, range: "80~100%", scale: "100%" },
    ],
    note: "구간 판정은 [min, max) 기준이라 20~30과 30~40은 겹치지 않는 것으로 처리",
  },
  versionPolicy: {
    format: "YYYYMMDD-HHMMSS",
    currentVersion: "20260716-163446",
  },
  filesChanged: {
    added: ["backups/session_20260716-163446.js"],
    modified: ["index.html", "app.js", "version.json", "control/index.html", "simple/index.html", "maker/index.html"],
  },
  conversation: [
    {
      role: "user",
      content:
        "자동배율적용 체크박스 만들고 5개 수익률 구간별 배율 규칙, 겹치면 중복 체크 불가/경고/나중 체크는 체크 해제",
    },
    {
      role: "assistant",
      content:
        "자동배율 UI 5개와 겹침 방지 로직을 추가했고, 생성/미리보기/ZIP 저장에 동일한 배율 적용이 되도록 반영했습니다.",
    },
  ],
};

