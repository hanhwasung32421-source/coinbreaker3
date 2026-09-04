# Coin Breaker (AutoHotkey v2)

Native Windows rewrite of the Coin Breaker web app (see repo root) — brings up
its own GUI, no browser required. Full design/roadmap: see the plan at
`C:\Users\m5\.claude\plans\serene-whistling-perlis.md`.

## Status: M1 (core rendering + randomization + clipboard export) — done

- `src/Algorithms.ahk` — exact port of the web app's value-generation math,
  verified against `tools/VerifyAlgorithms.ahk` (run it directly with
  AutoHotkey64.exe; all checks currently pass).
- `src/CardRenderer.ahk` + `src/CardModel.ahk` — GDI+ card renderer, visually
  validated against the live web app's card layout.
- `gui/MainWindow.ahk` + `CoinBreaker.ahk` — minimal window: core numeric
  inputs, live preview, "생성" button that rolls new values and copies the
  card to the clipboard as an image.
- `src/Profile.ahk` — local JSON persistence (schema v3, mirrors the web
  app's `collectState()`), used for the `main` profile.

Not yet implemented (see plan's M2-M7): preset buttons/phrase engine,
Navigator per-element style editor, crop-rect cropping on export, comparison
overlay tool, maker profile split, Supabase cloud sync, packaging.

## Running

```
"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe" CoinBreaker.ahk
```

## Third-party code

- `lib/Gdip_All.ahk` — GDI+ wrapper (buliasz/AHKv2-Gdip)
- `lib/JSON.ahk` — JSON serialization (thqby/ahk2_lib)
- `assets/fonts/Pretendard/*.ttf` — Pretendard v1.3.9 (OFL-1.1, orioncactus/pretendard)
- `assets/Noto_Sans_KR/*.ttf` — copied from the repo root's `Noto_Sans_KR/` (OFL-1.1)
