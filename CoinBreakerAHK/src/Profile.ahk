#Requires AutoHotkey v2.0
#Include ..\lib\JSON.ahk
#Include Constants.ahk

; Local JSON persistence for one profile ("main" or "maker"), schema v3 --
; mirrors app.js's collectState()/applyState()/DEFAULTS. This is the local
; source of truth (replaces localStorage); CloudSync layers Supabase sync on
; top of it later (M6) and never has to be consulted for the app to function.
class Profile {
    static SCHEMA_VERSION := 3

    static Defaults() {
        d := Constants.Defaults()
        return Map(
            "v", Profile.SCHEMA_VERSION,
            "inputs", Map(
                "percentMin", d["percentMin"], "percentMax", d["percentMax"],
                "profitMin", d["profitMin"], "profitMax", d["profitMax"],
                "symbol", d["symbol"], "side", d["side"], "leverage", d["leverage"],
                "entry", d["entry"],
                "entryRandPlace", d["entryRandPlace"], "entryRandGap", d["entryRandGap"],
                "entryZeroProb", d["entryZeroProb"], "exitZeroProb", d["exitZeroProb"],
                "bgZoom", d["bgZoom"]
            ),
            "bg", Map("path", "", "shiftX", d["bgShiftX"], "shiftY", d["bgShiftY"]),
            "overlay", Map("path", "", "opacity", 0.5, "scale", 1, "x", 0, "y", 0),
            "phraseCfg", Constants.DefaultPhraseCfg(),
            "congratsCfg", Constants.DefaultCongratsCfg(),
            "cropCfg", Constants.DefaultCropCfg(),
            "presetProfitCfg", Constants.DefaultPresetProfitCfg(),
            "presetProfitScalePct", Constants.DefaultPresetProfitScalePct,
            "presetProfitAutoScale", Constants.DefaultPresetProfitAutoScale(),
            "cardCustomStyles", Map()
        )
    }

    ; Deep-merge `loaded` on top of `defaults` (loaded values win; missing keys
    ; fall back to defaults) -- mirrors the original's tolerant/forward-compatible
    ; merge in applyState() so old/partial JSON never crashes the app.
    static Migrate(loaded) {
        defaults := Profile.Defaults()
        if (loaded = "" || Type(loaded) != "Map")
            return defaults
        return Profile._DeepMerge(defaults, loaded)
    }

    static _DeepMerge(base, override) {
        out := Map()
        for k, v in base
            out[k] := v
        for k, v in override {
            if (out.Has(k) && Type(out[k]) = "Map" && Type(v) = "Map")
                out[k] := Profile._DeepMerge(out[k], v)
            else
                out[k] := v
        }
        return out
    }

    static Load(path) {
        if (!FileExist(path))
            return Profile.Defaults()
        try {
            text := FileRead(path, "UTF-8")
            data := JSON.parse(text, false, true)
            return Profile.Migrate(data)
        } catch as e {
            ; corrupt/unreadable file -- fail open to defaults rather than crash
            return Profile.Defaults()
        }
    }

    static Save(path, state) {
        dir := ""
        SplitPath(path, , &dir)
        if (dir != "" && !DirExist(dir))
            DirCreate(dir)
        text := JSON.stringify(state, , "  ")
        f := FileOpen(path, "w", "UTF-8")
        if (!f)
            return false
        f.Write(text)
        f.Close()
        return true
    }

    ; maker profile inherits bg/overlay/cardCustomStyles from main, always
    ; (mirrors mergeSharedLayoutState() in app.js).
    static ApplyMainLayoutOverride(makerState, mainState) {
        makerState["bg"] := mainState["bg"]
        makerState["overlay"] := mainState["overlay"]
        makerState["cardCustomStyles"] := mainState["cardCustomStyles"]
        return makerState
    }
}
