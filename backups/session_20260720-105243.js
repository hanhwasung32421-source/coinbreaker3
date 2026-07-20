/**
 * 대화/작업 백업 (자동 생성)
 * - 목적: 다음 TASK에서도 현재 작업 맥락과 변경사항을 빠르게 복원
 * - 주의: 이 파일은 기록 보관용입니다.
 */

export const sessionBackup = {
  sessionId: "20260720-105243",
  project: "coinbreaker3",
  timezone: "Asia/Seoul",
  userRequest:
    "자동배율 규칙/배율 입력 내용도 Supabase에 저장되어 다시 열었을 때 유지되게 하고, 자동배율 체크 시 전체 배율을 회색 비활성화",
  summary: [
    "자동배율 규칙 데이터는 이미 상태 저장(collectState/applyState)로 Supabase 복원 경로에 포함되는 것을 확인",
    "자동배율 체크 시 전체 배율 입력을 disabled 처리하고 회색으로 표시되게 수정",
    "전체 배율 힌트 문구도 자동배율 활성 상태에 맞게 변경되도록 수정",
  ],
  persistedState: {
    fields: [
      "presetProfitAutoScale.enabled",
      "presetProfitAutoScale.rules[].enabled",
      "presetProfitAutoScale.rules[].minP",
      "presetProfitAutoScale.rules[].maxP",
      "presetProfitAutoScale.rules[].scalePct",
      "presetProfitScalePct",
    ],
    note: "홈페이지를 다시 열면 Supabase에서 마지막 값이 복원되도록 유지",
  },
  versionPolicy: {
    format: "YYYYMMDD-HHMMSS",
    currentVersion: "20260720-105243",
  },
  filesChanged: {
    added: ["backups/session_20260720-105243.js"],
    modified: ["app.js", "index.html", "style.css", "version.json", "control/index.html", "simple/index.html", "maker/index.html"],
  },
  conversation: [
    {
      role: "user",
      content:
        "자동배율 규칙 값도 저장되게 하고, 자동배율 켜지면 전체 배율은 회색으로 수정 못하게 해줘",
    },
    {
      role: "assistant",
      content:
        "자동배율 관련 값은 저장/복원 경로에 포함된 상태를 유지했고, 자동배율 활성 시 전체 배율 입력이 회색 비활성화되도록 수정했습니다.",
    },
  ],
};

