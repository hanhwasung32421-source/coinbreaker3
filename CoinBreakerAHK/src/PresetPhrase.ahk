#Requires AutoHotkey v2.0
#Include RandomUtil.ahk

; Port of app.js's makePresetPhrase()/ensurePresetPart4Assignment()/makeCongratsPhrase().
; phraseCfg shape: Map("fmt",[...], "unit",[...], "part3",[...], "part4",[...], "part4Prob", 0-100)
; (fmt/unit/part3/part4 are the RAW pool arrays -- weighting via "|N" suffix is expanded
; by RandomUtil.LinesToWeightedArray() when the cfg is read from its UI textarea, so by
; the time it reaches here each array is already the expanded weighted pool.)
class PresetPhrase {
    ; per-instance cache for the stable preset-button -> part4 assignment
    __New() {
        this.assignment := ""
        this.poolKey := ""
    }

    ; Returns cfg.part4 trimmed, unfiltered (kept as-is; caller pool is already expanded).
    GetPart4ListAll(cfg) {
        list := []
        for v in cfg["part4"]
            list.Push(Trim(v))
        return list
    }

    ; Memoized stable shuffle of the part4 pool (first 10 slots), keyed by pool identity.
    ; Regenerated only when the pool's contents change (caller should reset via ResetAssignment()
    ; whenever the part4 textarea is edited, mirroring app.js's onEdit behavior).
    EnsureAssignment(cfg) {
        list := this.GetPart4ListAll(cfg)
        key := ""
        for v in list
            key .= v . "`x01"
        if (this.assignment != "" && this.poolKey = key && this.assignment.Length = 10)
            return this.assignment
        if (list.Length < 10) {
            this.assignment := ""
            this.poolKey := key
            return ""
        }
        shuffled := RandomUtil.ShuffleInPlace(list.Clone())
        this.assignment := []
        loop 10
            this.assignment.Push(shuffled[A_Index])
        this.poolKey := key
        return this.assignment
    }

    ResetAssignment() {
        this.assignment := ""
        this.poolKey := ""
    }

    ; presetId: 1-10 for a numbered preset button (stable part4 assignment), or "" for the
    ; generic Generate button (independent random roll each time, per part4Prob).
    Make(percentValue, presetId, cfg) {
        fmt := RandomUtil.PickFrom(cfg["fmt"], "int")
        absP := Abs(percentValue + 0)
        if (fmt = "int")
            numText := String(Floor(absP))
        else if (fmt = "1")
            numText := Format("{:.1f}", Floor(absP * 10) / 10)
        else
            numText := Format("{:.2f}", Floor(absP * 100) / 100)
        if InStr(numText, ".") {
            numText := RegExReplace(numText, "0+$", "")
            numText := RegExReplace(numText, "\.$", "")
        }

        unit := RandomUtil.PickFrom(cfg["unit"], "%")
        part3 := RandomUtil.PickFrom(cfg["part3"], "감사합니다")

        part4 := ""
        if (presetId != "" && presetId != 0) {
            assign := this.EnsureAssignment(cfg)
            idx := Max(1, Min(10, Integer(presetId)))
            part4 := (assign != "") ? Trim(assign[idx]) : ""
        } else if (Random() < RandomUtil.Clamp(cfg["part4Prob"], 0, 100) / 100) {
            part4 := RandomUtil.PickFrom(cfg["part4"], "")
        }

        head := Trim(numText . unit)
        tail := (part4 != "") ? (part3 . " " . part4) : part3
        return Trim(head . " " . tail)
    }

    ; Uniform random pick from congratsCfg.lines.
    static MakeCongrats(congratsCfg) {
        lines := congratsCfg.Has("lines") ? congratsCfg["lines"] : []
        return RandomUtil.PickFrom(lines, "축하합니다~")
    }
}
