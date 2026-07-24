/**
 * 대화/작업 백업 (자동 생성)
 * - 목적: 다음 TASK에서도 현재 작업 맥락과 버전 규칙을 빠르게 복원
 * - 주의: 이 파일은 기록 보관용입니다.
 */

export const sessionBackup = {
  sessionId: "20260724-103934",
  project: "coinbreaker3",
  timezone: "Asia/Seoul",
  userRequest: "버전은 앞으로 xxxx년 x월 xx일 - 1 이런식으로 끝에 숫자만 변경해줘. x는 항상 오늘 날짜로 써줘.",
  summary: [
    "앞으로 사용할 버전 문자열 규칙을 한국어 날짜 형식으로 변경함",
    "버전 형식은 `YYYY년 M월 DD일 - N`으로 고정",
    "같은 날짜에는 뒤 숫자만 증가시키고, 날짜가 바뀌면 `1`부터 다시 시작하는 규칙으로 저장함",
    "이 규칙을 프로젝트 기억 파일에 반영해 다음 작업부터 동일하게 사용하도록 설정함",
  ],
  versionPolicy: {
    format: "YYYY년 M월 DD일 - N",
    rule: [
      "오늘 날짜를 항상 앞에 씀",
      "같은 날의 추가 수정은 마지막 숫자만 1, 2, 3... 증가",
      "날짜가 바뀌면 마지막 숫자는 다시 1부터 시작",
    ],
  },
  filesChanged: {
    added: ["backups/session_20260724-103934.js"],
    modified: [],
    memoryUpdated: ["project_memory.md"],
  },
  conversation: [
    {
      role: "user",
      content: "버전은 앞으로 xxxx년 x월 xx일 - 1 이런식으로 끝에 숫자만 변경해줘. x는 항상 오늘 날짜로 써줘.",
    },
    {
      role: "assistant",
      content:
        "앞으로 버전은 `YYYY년 M월 DD일 - N` 형식으로 쓰고, 같은 날에는 마지막 숫자만 올리며 날짜가 바뀌면 다시 1부터 시작하는 규칙으로 적용하겠습니다.",
    },
  ],
};
