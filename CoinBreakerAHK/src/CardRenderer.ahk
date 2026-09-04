#Requires AutoHotkey v2.0
#Include ..\lib\Gdip_All.ahk
#Include Constants.ahk
#Include CardModel.ahk
#Include Fonts.ahk

; Renders the 425x380 trading-card bitmap via GDI+.
; Draw() is the single source of truth for both the live preview and the
; exported PNG/clipboard image -- same buffer, same pixels, no separate
; "preview vs export" render path (aside from the comparison-overlay image,
; which is only ever composited for on-screen preview).
class CardRenderer {

    ; values: Map with percent(number), profitWon(number, already scaled), symbol,
    ;         side("LONG"/"SHORT"), leverage(text), entry(text), exit(text)
    ; styleOverrides: Map elementId -> Map(x?,y?,size?,weight?,color?,font?,text?,opacity?,tracking?,height?)
    ; bg: Map("path", "zoom", "shiftX", "shiftY") or "" for none
    ; Returns Map("pBitmap", "lastRects") -- caller owns pBitmap and must Gdip_DisposeImage() it.
    static Draw(values, styleOverrides := "", bg := "") {
        if (styleOverrides = "")
            styleOverrides := Map()
        W := Constants.CARD_W, H := Constants.CARD_H
        pBitmap := Gdip_CreateBitmap(W, H)
        G := Gdip_GraphicsFromImage(pBitmap)
        Gdip_SetSmoothingMode(G, 4)          ; AntiAlias
        Gdip_SetTextRenderingHint(G, 4)      ; AntiAliasGridFit

        ; 1) background fill
        bgBrush := Gdip_BrushCreateSolid(Constants.COLOR_BG)
        Gdip_FillRectangle(G, bgBrush, 0, 0, W, H)
        Gdip_DeleteBrush(bgBrush)

        ; 2) optional tiled/zoomed/shifted background image
        if (bg != "" && bg.Has("path") && bg["path"] != "" && FileExist(bg["path"])) {
            this._DrawBackgroundImage(G, bg, W, H)
        }

        ; 3) dark overlay atop background
        ovBrush := Gdip_BrushCreateSolid(Constants.COLOR_OVERLAY)
        Gdip_FillRectangle(G, ovBrush, 0, 0, W, H)
        Gdip_DeleteBrush(ovBrush)

        ; 4) elements, in draw order, recording final rects for hit-testing/crop
        defs := CardModel.Elements()
        lastRects := Map()
        percentRectRef := ""

        for id in CardModel.DrawOrder() {
            base := defs[id]
            ov := styleOverrides.Has(id) ? styleOverrides[id] : Map()
            rect := this._DrawElement(G, id, base, ov, values, lastRects)
            if (rect != "")
                lastRects[id] := rect
        }

        Gdip_DeleteGraphics(G)
        return Map("pBitmap", pBitmap, "lastRects", lastRects)
    }

    static _DrawBackgroundImage(G, bg, W, H) {
        pImg := Gdip_CreateBitmapFromFile(bg["path"])
        if (!pImg)
            return
        iw := Gdip_GetImageWidth(pImg), ih := Gdip_GetImageHeight(pImg)
        zoom := bg.Has("zoom") ? bg["zoom"] : 1.0
        shiftX := bg.Has("shiftX") ? bg["shiftX"] : 0
        shiftY := bg.Has("shiftY") ? bg["shiftY"] : 0
        ; scale so the image covers at least the card width at `zoom` factor (mirrors
        ; app.js applyCardBackground(): background-size max(100,zoom*100)% width, auto height)
        scale := Max(1.0, zoom) * (W / iw)
        dw := iw * scale, dh := ih * scale
        dx := (W - dw) / 2 + shiftX
        dy := (H - dh) / 2 + shiftY
        Gdip_DrawImage(G, pImg, dx, dy, dw, dh, 0, 0, iw, ih)
        Gdip_DisposeImage(pImg)
    }

    ; Draws one element, applying overrides on top of its base def. Returns the
    ; final {x,y,w,h} bounding rect in card-canvas coordinates, or "" if not drawn.
    static _DrawElement(G, id, base, ov, values, lastRects) {
        cat := base["category"]
        x := base["x"] + (ov.Has("x") ? ov["x"] : 0)
        y := base["y"] + (ov.Has("y") ? ov["y"] : 0)
        opacity := ov.Has("opacity") ? ov["opacity"] : 1.0
        color := ov.Has("color") ? this._ParseColor(ov["color"]) : base["color"]
        color := this._WithOpacity(color, opacity)

        if (cat = "text" || cat = "badge_text") {
            size := ov.Has("size") ? ov["size"] : base["size"]
            weight := ov.Has("weight") ? ov["weight"] : (base.Has("weight") ? base["weight"] : "regular")
            fontKey := base.Has("font") ? base["font"] : Constants.FONT_CARD
            text := ov.Has("text") && ov["text"] != "" ? ov["text"] : this._ResolveText(id, base, values)
            if (text = "")
                return ""

            hFont := (fontKey = Constants.FONT_CARD)
                ? Fonts.GetCardFont(weight, size)
                : Fonts.GetFont(fontKey, (weight = "bold" ? 1 : 0), size)
            brush := Gdip_BrushCreateSolid(color)
            hFormat := Gdip_StringFormatCreate()

            ; measure first so we can report an accurate rect (and support
            ; right/center anchoring for the % sign / side badge text)
            CreateRectF(&mRect, 0, 0, 300, 60)
            m := StrSplit(Gdip_MeasureString(G, text, hFont, hFormat, &mRect), "|")
            tw := m[3] + 0, th := m[4] + 0

            drawX := x
            if (base.Has("followsRight")) {
                anchor := lastRects.Has(base["followsRight"]) ? lastRects[base["followsRight"]] : ""
                if (anchor != "")
                    drawX := anchor.x + anchor.w + 4
            }
            if (cat = "badge_text")
                drawX := x - tw / 2   ; center on the badge box's x anchor

            CreateRectF(&drawRect, drawX, y, tw + 4, th + 4)
            Gdip_DrawString(G, text, hFont, hFormat, brush, &drawRect)
            Gdip_DeleteStringFormat(hFormat)
            Gdip_DeleteBrush(brush)
            return { x: drawX, y: y, w: tw, h: th }
        }

        if (cat = "divider") {
            w := ov.Has("size") ? ov["size"] : base["size"]
            h := ov.Has("weight") ? ov["weight"] : base["weight"]
            cx := x, cy := y
            rx := cx - w / 2
            brush := Gdip_BrushCreateSolid(color)
            Gdip_FillRoundedRectangle(G, brush, rx, cy, w, h, 2)
            Gdip_DeleteBrush(brush)
            return { x: rx, y: cy, w: w, h: h }
        }

        if (cat = "badge_box") {
            w := ov.Has("size") ? ov["size"] : base["size"]
            h := ov.Has("height") ? ov["height"] : base["height"]
            borderW := ov.Has("weight") ? ov["weight"] : base["weight"]
            cx := x, cy := y
            rx := cx - w / 2, ry := cy - h / 2
            pen := Gdip_CreatePen(color, borderW)
            Gdip_DrawRoundedRectangle(G, pen, rx, ry, w, h, 2)
            Gdip_DeletePen(pen)
            return { x: rx, y: ry, w: w, h: h }
        }

        if (cat = "icon") {
            ; simple X icon (close button) drawn as two crossing lines
            size := ov.Has("size") ? ov["size"] : base["size"]
            pen := Gdip_CreatePen(color, 2)
            pad := size * 0.28
            DllCall("gdiplus\GdipDrawLine", "UPtr", G, "UPtr", pen, "Float", x + pad, "Float", y + pad, "Float", x + size - pad, "Float", y + size - pad)
            DllCall("gdiplus\GdipDrawLine", "UPtr", G, "UPtr", pen, "Float", x + size - pad, "Float", y + pad, "Float", x + pad, "Float", y + size - pad)
            Gdip_DeletePen(pen)
            return { x: x, y: y, w: size, h: size }
        }

        return ""
    }

    static _ResolveText(id, base, values) {
        switch id {
            case "pnlPercent": return values["percentText"]
            case "pnlPercentSign": return "%"
            case "pnlProfit": return values["profitText"]
            case "txtSymbol": return values["symbol"]
            case "txtSide": return (values["side"] = "SHORT") ? "숏" : "롱"
            case "txtLeverage": return values["leverageText"]
            case "txtEntry": return values["entryText"]
            case "txtExit": return values["exitText"]
            default: return base.Has("text") ? base["text"] : ""
        }
    }

    static _WithOpacity(argb, opacity) {
        a := Round(0xFF * RandomUtilClamp01(opacity))
        return (a << 24) | (argb & 0xFFFFFF)
    }

    ; Accepts either an existing 0xAARRGGBB integer or a "#rrggbb"/"rrggbb" hex string.
    static _ParseColor(c) {
        if (IsNumber(c))
            return c
        h := StrReplace(c, "#")
        if (StrLen(h) = 6)
            return 0xFF000000 | ("0x" . h)
        return "0x" . h
    }
}

; local helper (kept free-standing to avoid a hard dependency on RandomUtil here)
RandomUtilClamp01(v) {
    v := v + 0
    return v < 0 ? 0 : (v > 1 ? 1 : v)
}
