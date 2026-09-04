#Requires AutoHotkey v2.0

; Card geometry / color / default-value constants ported from coinbreaker3's
; style.css + app.js DEFAULT_* objects. Colors are 0xAARRGGBB for GDI+.
class Constants {
    static CARD_W := 425
    static CARD_H := 380
    static CARD_PAD := 24

    static COLOR_BG          := 0xFF0B0F17
    static COLOR_OVERLAY     := 0xE6030712   ; rgba(3,7,18,0.9) approx -- dark overlay atop bg image
    static COLOR_TITLE       := 0xFFF8FAFC
    static COLOR_CLOSE_ICON  := 0xFF9CA3AF
    static COLOR_GREEN       := 0xFF22C55E   ; percent text, LONG side
    static COLOR_RED         := 0xFFEF4444   ; SHORT side
    static COLOR_PROFIT_TEXT := 0xFF9CA3AF
    static COLOR_DIVIDER     := 0xFF38BDF8   ; sky blue accent bar
    static COLOR_SEPARATOR   := 0xFF374151
    static COLOR_LABEL       := 0xFF9CA3AF
    static COLOR_VALUE       := 0xFFFFFFFF
    static COLOR_BADGE_BOX   := 0xFFFACC15   ; gold badge border, default for both LONG/SHORT

    static FONT_CARD := "Pretendard"
    static FONT_UI   := "Noto Sans KR"

    ; ---- App defaults (mirrors app.js DEFAULTS) ----
    static Defaults() {
        return Map(
            "percentMin", "20", "percentMax", "25",
            "profitMin", "300", "profitMax", "1000",
            "symbol", "DOGE/USDT", "side", "LONG", "leverage", "100x",
            "entry", "0.11445",
            "entryRandPlace", 2, "entryRandGap", 2, "entryZeroProb", 50, "exitZeroProb", 50,
            "bgZoom", 1.0, "bgShiftX", 0, "bgShiftY", 0
        )
    }

    static DefaultPhraseCfg() {
        return Map(
            "fmt", ["int", "2", "1"],
            "unit", ["%", "프로", "퍼", ""],
            "part3", ["감사합니다", "감사합니다", "고맙습니다", "고맙습니다", "수익입니다"],
            "part4", ["", "", "", "", "", "", "", "대표님.", "대단하십니다.", "대박입니다."],
            "part4Prob", 25
        )
    }

    static DefaultCongratsCfg() {
        return Map("lines", ["축하합니다~", "수익 축하합니다", "수익 축하해요",
            "다들 시크가 크시네요. 수익 축하드립니다.", "모두들 수익 축하합니다.", "축하드립니다."])
    }

    static DefaultCropCfg() {
        return Map("fullCaptureProb", 5, "widthMinPct", 50, "widthMaxPct", 100,
            "startPadXMax", 28, "startPadYMax", 18, "bottomPadMin", 12, "bottomPadMax", 36)
    }

    static DefaultPresetProfitCfg() {
        return Map(
            "1", Map("min","50","max","100"),   "2", Map("min","100","max","200"),
            "3", Map("min","300","max","400"),  "4", Map("min","300","max","400"),
            "5", Map("min","500","max","700"),  "6", Map("min","1000","max","2000"),
            "7", Map("min","1500","max","2500"),"8", Map("min","2500","max","3500"),
            "9", Map("min","3500","max","4500"),"10", Map("min","5000","max","6000")
        )
    }

    static DefaultPresetProfitScalePct := 100

    static DefaultPresetProfitAutoScale() {
        return Map("enabled", false, "rules", [
            Map("enabled", true,  "minP", 20, "maxP", 30,  "scalePct", 100),
            Map("enabled", true,  "minP", 30, "maxP", 40,  "scalePct", 120),
            Map("enabled", true,  "minP", 40, "maxP", 60,  "scalePct", 140),
            Map("enabled", false, "minP", 60, "maxP", 80,  "scalePct", 100),
            Map("enabled", false, "minP", 80, "maxP", 100, "scalePct", 100),
        ])
    }
}
