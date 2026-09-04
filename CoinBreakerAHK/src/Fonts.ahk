#Requires AutoHotkey v2.0

; Loads Pretendard + Noto Sans KR from assets/ into a GDI+ private font
; collection (Gdip_All.ahk doesn't wrap the private-collection API, so this
; calls gdiplus.dll directly) and exposes cached Gdip font-family/font handles.
;
; Verified family names (via System.Drawing.Text.PrivateFontCollection probe):
;   Pretendard-Regular.ttf  -> family "Pretendard"          (Regular style)
;   Pretendard-Bold.ttf     -> family "Pretendard"          (Bold style)
;   Pretendard-Medium.ttf   -> family "Pretendard Medium"   (Regular style)
;   Pretendard-SemiBold.ttf -> family "Pretendard SemiBold" (Regular style)
;   NotoSansKR-Regular.ttf  -> family "Noto Sans KR"
;   NotoSansKR-Medium.ttf   -> family "Noto Sans KR Medium"
;   NotoSansKR-Bold.ttf     -> family "Noto Sans KR"        (Bold style)
class Fonts {
    static hCollection := 0
    static _families := Map()   ; familyName -> hFamily
    static _fonts := Map()      ; "familyName|style|size" -> hFont

    ; weight keyword -> {family, style} for card text (Style: 0=Regular,1=Bold)
    static _cardWeightMap := Map(
        "regular",   {family:"Pretendard",          style:0},
        "medium",    {family:"Pretendard Medium",   style:0},
        "semibold",  {family:"Pretendard SemiBold", style:0},
        "bold",      {family:"Pretendard",          style:1}
    )

    static Init(assetsDir) {
        this.hCollection := 0
        DllCall("gdiplus\GdipNewPrivateFontCollection", "UPtr*", &hCol := 0)
        this.hCollection := hCol

        files := [
            assetsDir "\fonts\Pretendard\Pretendard-Regular.ttf",
            assetsDir "\fonts\Pretendard\Pretendard-Medium.ttf",
            assetsDir "\fonts\Pretendard\Pretendard-SemiBold.ttf",
            assetsDir "\fonts\Pretendard\Pretendard-Bold.ttf",
            assetsDir "\Noto_Sans_KR\NotoSansKR-Regular.ttf",
            assetsDir "\Noto_Sans_KR\NotoSansKR-Medium.ttf",
            assetsDir "\Noto_Sans_KR\NotoSansKR-Bold.ttf",
        ]
        for f in files {
            if FileExist(f)
                DllCall("gdiplus\GdipPrivateAddFontFile", "UPtr", this.hCollection, "WStr", f)
        }
    }

    ; Returns a cached hFamily handle for a family name, trying the private
    ; collection first, then falling back to the system-installed collection.
    static GetFamily(name) {
        if this._families.Has(name)
            return this._families[name]
        hFamily := 0
        DllCall("gdiplus\GdipCreateFontFamilyFromName", "WStr", name, "UPtr", this.hCollection, "UPtr*", &hFamily)
        if (hFamily = 0)
            DllCall("gdiplus\GdipCreateFontFamilyFromName", "WStr", name, "UPtr", 0, "UPtr*", &hFamily)
        this._families[name] := hFamily
        return hFamily
    }

    ; Resolve a card-text weight keyword ("regular"/"medium"/"semibold"/"bold")
    ; to a cached Gdip font handle at the given pixel size.
    static GetCardFont(weight, sizePx) {
        entry := this._cardWeightMap.Has(weight) ? this._cardWeightMap[weight] : this._cardWeightMap["regular"]
        return this.GetFont(entry.family, entry.style, sizePx)
    }

    static GetFont(familyName, style, sizePx) {
        key := familyName "|" style "|" sizePx
        if this._fonts.Has(key)
            return this._fonts[key]
        hFamily := this.GetFamily(familyName)
        DllCall("gdiplus\GdipCreateFont", "UPtr", hFamily, "Float", sizePx, "Int", style, "Int", 0, "UPtr*", &hFont := 0)
        this._fonts[key] := hFont
        return hFont
    }

    static UiFont(sizePx, bold := false) {
        return this.GetFont(bold ? "Noto Sans KR" : "Noto Sans KR", bold ? 1 : 0, sizePx)
    }
}
