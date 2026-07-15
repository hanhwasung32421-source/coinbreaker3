/**
 * 대화/작업 백업 (자동 생성)
 * - 목적: 다음 TASK에서도 현재 작업 맥락과 폴더 분석 결과를 빠르게 복원
 * - 주의: 이 파일은 기록 보관용입니다.
 */

export const sessionBackup = {
  sessionId: "20260715-184246",
  project: "coinbreaker3",
  timezone: "Asia/Seoul",
  userRequest: "폴더안 내용 파악해",
  summary: [
    "프로젝트 루트를 스캔해 정적 웹앱 구조인지 확인함",
    "핵심 파일 `index.html`, `app.js`, `style.css`, `version.json`, `vercel.json`과 서브 페이지 `maker/index.html`, `control/index.html`, `simple/index.html` 성격을 파악함",
    "메인 앱은 Coin Breaker라는 정적 페이지이며, 카드형 수익 화면을 생성/캡처하고 ZIP 저장하는 기능을 가짐",
    "상태 저장은 `localStorage`와 Supabase(`coinbreaker_state`)를 함께 사용함",
    "배포는 Vercel 정적 라우팅이며, 모든 경로를 `index.html`로 보내는 설정이 있음",
  ],
  folderSnapshot: {
    root: [
      ".github/workflows/bump-version.yml",
      "Noto_Sans_KR/",
      "control/index.html",
      "maker/index.html",
      "simple/index.html",
      "app.js",
      "index.html",
      "style.css",
      "version.json",
      "vercel.json",
      "bg.jpg",
      "bg2.webp",
      "trading_bg2.webp",
      "deploy.bat",
    ],
  },
  findings: {
    appType: "정적 HTML/CSS/JS 기반 웹앱",
    mainTitle: "Coin Breaker",
    mainFeatures: [
      "수익률/수익금/심볼/포지션/레버리지/진입가/종료가 생성",
      "프리셋 버튼 기반 자동 생성",
      "html2canvas 기반 카드 캡처",
      "JSZip 기반 ZIP 저장",
      "배경/오버레이/텍스트 위치 및 스타일 미세 조정",
      "Supabase 클라우드 저장/불러오기",
    ],
    pages: {
      "/": "메인 생성기/편집기",
      "/maker/": "메인 렌더링 CSS를 재사용하는 메이커 전용 페이지",
      "/control/": "더 많은 세부 제어 UI가 포함된 확장 편집 페이지",
      "/simple/": "간소화된 편집 페이지",
    },
    versioning: {
      versionJson: "t26070903",
      notes: [
        "`app.js` 안의 `BUILD_VERSION`과 `version.json`을 함께 사용",
        "`maker/index.html`, `control/index.html`, `simple/index.html`에는 서로 다른 하드코딩 버전 문자열 흔적이 보임",
      ],
    },
  },
  filesChecked: [
    "index.html",
    "app.js",
    "style.css",
    "version.json",
    "vercel.json",
    "maker/index.html",
    "control/index.html",
    "simple/index.html",
  ],
  filesChanged: {
    added: ["backups/session_20260715-184246.js"],
    modified: [],
  },
  conversation: [
    { role: "user", content: "폴더안 내용 파악해" },
    {
      role: "assistant",
      content:
        "루트 구조와 핵심 파일을 확인했고, Coin Breaker라는 정적 웹앱으로 판단했습니다. 생성/캡처/ZIP 저장과 Supabase 상태 저장 기능이 중심입니다.",
    },
  ],
};
