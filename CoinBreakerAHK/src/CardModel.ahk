#Requires AutoHotkey v2.0
#Include Constants.ahk

; Element registry for the card. Each entry is the DEFAULT geometry/style for
; one visual element, keyed by a stable id mirroring the web version's CSS
; selectors (so an exported Supabase cardCustomStyles blob maps over 1:1).
;
; Layout is a static approximation of the original flex-column CSS (style.css /
; index.html :root vars) baked into fixed pixel offsets -- there is no flex
; engine here. Coordinates are top-left anchors within the 425x380 card canvas.
; NOTE: these y-offsets are a first-pass approximation; expect to nudge them
; after visually comparing the M1 render against the live web app.
;
; category: "text" | "badge_text" | "badge_box" | "divider"
class CardModel {
    static Elements() {
        C := Constants
        return Map(
            "cardTitle", Map("category","text", "x",C.CARD_PAD, "y",22, "size",18, "weight","semibold",
                "color",C.COLOR_TITLE, "font",C.FONT_CARD, "align","left"),
            "cardClose", Map("category","icon", "x",C.CARD_W-40, "y",16, "size",24,
                "color",C.COLOR_CLOSE_ICON),

            "pnlPercent", Map("category","text", "x",C.CARD_PAD, "y",54, "size",30, "weight","bold",
                "color",C.COLOR_GREEN, "font",C.FONT_CARD, "align","left"),
            "pnlPercentSign", Map("category","text", "x",0, "y",64, "size",20, "weight","bold",
                "color",C.COLOR_GREEN, "font",C.FONT_CARD, "align","left", "followsRight","pnlPercent"),
            "pnlProfit", Map("category","text", "x",C.CARD_PAD, "y",92, "size",20, "weight","medium",
                "color",C.COLOR_PROFIT_TEXT, "font",C.FONT_CARD, "align","left"),

            "profitDivider", Map("category","divider", "x",C.CARD_W/2, "y",130, "size",300, "weight",4,
                "color",C.COLOR_DIVIDER),

            "gridLabelSymbol",  Map("category","text", "x",C.CARD_PAD, "y",152, "size",14, "weight","medium",
                "color",C.COLOR_LABEL, "font",C.FONT_CARD, "align","left", "text","코인"),
            "txtSymbol",        Map("category","text", "x",C.CARD_PAD, "y",173, "size",16, "weight","bold",
                "color",C.COLOR_VALUE, "font",C.FONT_CARD, "align","left"),
            "txtSide",          Map("category","badge_text", "x",C.CARD_PAD+110, "y",173, "size",14, "weight","medium",
                "color",C.COLOR_GREEN, "font",C.FONT_CARD, "align","center"),
            "txtSideBox",       Map("category","badge_box", "x",C.CARD_PAD+110, "y",183, "size",34, "height",40,
                "weight",2, "color",C.COLOR_BADGE_BOX, "opacity",1.0),

            "gridLabelLeverage", Map("category","text", "x",C.CARD_PAD, "y",205, "size",14, "weight","medium",
                "color",C.COLOR_LABEL, "font",C.FONT_CARD, "align","left", "text","레버리지"),
            "txtLeverage",       Map("category","text", "x",C.CARD_PAD, "y",226, "size",16, "weight","bold",
                "color",C.COLOR_VALUE, "font",C.FONT_CARD, "align","left"),

            "gridLabelEntry", Map("category","text", "x",C.CARD_PAD, "y",258, "size",14, "weight","medium",
                "color",C.COLOR_LABEL, "font",C.FONT_CARD, "align","left", "text","진입가격"),
            "txtEntry",       Map("category","text", "x",C.CARD_PAD, "y",279, "size",16, "weight","bold",
                "color",C.COLOR_VALUE, "font",C.FONT_CARD, "align","left"),

            "gridLabelExit", Map("category","text", "x",C.CARD_PAD, "y",311, "size",14, "weight","medium",
                "color",C.COLOR_LABEL, "font",C.FONT_CARD, "align","left", "text","종료가격"),
            "txtExit",       Map("category","text", "x",C.CARD_PAD, "y",332, "size",16, "weight","bold",
                "color",C.COLOR_VALUE, "font",C.FONT_CARD, "align","left"),
        )
    }

    ; z-order for drawing (also used in reverse for click-to-select hit testing).
    static DrawOrder() {
        return ["cardTitle", "profitDivider",
            "gridLabelSymbol", "txtSymbol", "txtSideBox", "txtSide",
            "gridLabelLeverage", "txtLeverage",
            "gridLabelEntry", "txtEntry",
            "gridLabelExit", "txtExit",
            "pnlPercent", "pnlPercentSign", "pnlProfit",
            "cardClose"]
    }

    ; Human-readable labels for the Navigator target dropdown.
    static DisplayNames() {
        return Map(
            "cardTitle","로고", "cardClose","닫기 버튼",
            "pnlPercent","수익률(%)", "pnlPercentSign","% 기호", "pnlProfit","수익금(원)",
            "profitDivider","가로 구분선",
            "gridLabelSymbol","코인 라벨", "txtSymbol","코인명", "txtSide","롱/숏 텍스트", "txtSideBox","롱/숏 박스선",
            "gridLabelLeverage","레버리지 라벨", "txtLeverage","레버리지 값",
            "gridLabelEntry","진입가격 라벨", "txtEntry","진입가격 값",
            "gridLabelExit","종료가격 라벨", "txtExit","종료가격 값"
        )
    }
}
