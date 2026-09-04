#Requires AutoHotkey v2.0
#Include RandomUtil.ahk

; Pure port of coinbreaker3/app.js's value-generation algorithms.
; No GUI/GDI dependency -- keep it that way so it can be verified standalone
; against the web app's behavior before any rendering code depends on it.
class Algorithms {

    ; ---- Percent ----------------------------------------------------------

    ; Picks a random percent in [pMin,pMax] (2 decimals) whose 2nd decimal digit
    ; is never exactly 0 (e.g. 20.10 disallowed, 20.13 fine), unless the range
    ; collapses to a single point. Mirrors pickPercent2NoZeroSecondDigit().
    static PickPercent2NoZeroSecondDigit(pMin, pMax) {
        minI := Ceil(Min(pMin, pMax) * 100)
        maxI := Floor(Max(pMin, pMax) * 100)
        pi := minI
        if (minI != maxI) {
            loop 60 {
                cand := RandomUtil.RandInt(minI, maxI)
                if (Mod(Abs(cand), 10) != 0) {
                    pi := cand
                    break
                }
                pi := cand
            }
            if (Mod(Abs(pi), 10) = 0) {
                if (pi + 1 <= maxI)
                    pi += 1
                else if (pi - 1 >= minI)
                    pi -= 1
            }
        }
        return pi / 100
    }

    ; percentMinMax = {minP, maxP}, profitMinMax = {minWon, maxWon} (already 원, not 만원).
    ; Mirrors randomPercentProfit() (profit here is raw 원, unscaled by preset multiplier).
    static RandomPercentProfit(minP, maxP, minWon, maxWon) {
        p := Algorithms.PickPercent2NoZeroSecondDigit(minP, maxP)
        f := (minWon = maxWon) ? minWon : RandomUtil.RandInt(minWon, maxWon)
        return { percent: p, profit: f }
    }

    ; ---- Fixed-point (5-decimal) price helpers -----------------------------

    ; "0.11445" -> 11445 (round(Number(text)*100000)). Returns "" if not parseable.
    static ParseEntryToInt(entryText) {
        s := Trim(entryText)
        if (s = "" || !IsNumber(s))
            return ""
        return Round((s + 0) * 100000)
    }

    ; 11445 -> "0.11445" ((int/100000).toFixed(5))
    static EntryIntToText(intVal) {
        return Format("{:.5f}", intVal / 100000)
    }

    ; Zeroes out digits below `decimalPlace`, then with probability zeroProb%
    ; leaves the truncated "head" (trailing zeros); otherwise fills a random
    ; tail in [0, step-1]. Used identically for entry and exit.
    static ApplyPriceTailVariation(intVal, decimalPlace, zeroProb) {
        safeInt := Max(0, Round(intVal + 0))
        place := Round(RandomUtil.Clamp(decimalPlace, 1, 5))
        step := 10 ** (5 - place)
        if (step <= 1)
            return safeInt
        head := Floor(safeInt / step) * step
        if (Random() < RandomUtil.Clamp(zeroProb, 0, 100) / 100)
            return head
        return head + RandomUtil.RandInt(0, step - 1)
    }

    ; entryBaseText + variation cfg -> new randomized entry price text.
    ; Mirrors randomEntryFromBase().
    static RandomEntryFromBase(entryBaseText, decimalPlace, gap, entryZeroProb) {
        baseInt := Algorithms.ParseEntryToInt(entryBaseText)
        if (baseInt = "")
            return Trim(entryBaseText)
        step := 10 ** (5 - decimalPlace)
        shifted := Max(0, baseInt + RandomUtil.RandInt(-gap, gap) * step)
        finalInt := Algorithms.ApplyPriceTailVariation(shifted, decimalPlace, entryZeroProb)
        return Algorithms.EntryIntToText(finalInt)
    }

    ; "100x" / "격리 x100" -> 100 (first number found, else 1 if invalid/<=0).
    static ParseLeverage(text) {
        if RegExMatch(text, "(\d+(\.\d+)?)", &m) {
            n := m[1] + 0
            return (n > 0) ? n : 1
        }
        return 1
    }

    ; Computes the exit price from entry/pnl%/side/leverage, then re-applies
    ; tail variation (exitZeroProb, same decimalPlace as entry).
    ; Mirrors computeExit().
    static ComputeExit(entry, pnlPercent, side, leverageText, decimalPlace, exitZeroProb) {
        e := entry + 0
        lev := Algorithms.ParseLeverage(leverageText)
        p := (pnlPercent / 100) / lev
        isShort := (StrUpper(side) = "SHORT")
        raw := isShort ? e * (1 - p) : e * (1 + p)
        baseInt := Max(0, Round(raw * 100000))
        finalInt := Algorithms.ApplyPriceTailVariation(baseInt, decimalPlace, exitZeroProb)
        return Algorithms.EntryIntToText(finalInt)
    }

    ; ---- Profit scaling -----------------------------------------------------

    ; autoScale = {enabled, rules:[{enabled,minP,maxP,scalePct}...]} (half-open [minP,maxP) match, first wins).
    ; Mirrors getEffectiveProfitScalePctForPercent().
    static GetEffectiveProfitScalePctForPercent(percentValue, autoScale, globalScalePct) {
        p := Abs(percentValue + 0)
        if (autoScale != "" && autoScale.Has("enabled") && autoScale["enabled"]) {
            for r in autoScale["rules"] {
                if (!r.Has("enabled") || !r["enabled"])
                    continue
                mn := r["minP"] + 0, mx := r["maxP"] + 0
                lo := Min(mn, mx), hi := Max(mn, mx)
                if (p >= lo && p < hi)
                    return RandomUtil.Clamp(r["scalePct"], 0, 1000)
            }
        }
        return RandomUtil.Clamp(globalScalePct = "" ? 100 : globalScalePct, 0, 1000)
    }

    ; floor(won * scalePct/100 + 1e-9). Mirrors applyProfitScale().
    static ApplyProfitScale(won, scalePct) {
        s := RandomUtil.Clamp(scalePct, 0, 1000)
        return Floor((won * s) / 100 + 0.000000001)
    }

    ; Two half-open [min,max) ranges overlap iff a0<b1 && a1>b0. Mirrors rangesOverlap().
    static RangesOverlap(a0, a1, b0, b1) {
        return (a0 < b1 && a1 > b0)
    }

    ; ---- Formatting -----------------------------------------------------

    ; "10,229,614 원"
    static FormatProfit(won) {
        return Algorithms.NumberWithCommas(Round(won)) . " 원"
    }

    static NumberWithCommas(n) {
        neg := (n < 0)
        s := String(Abs(n))
        len := StrLen(s)
        rev := ""
        loop len {
            idx := len - A_Index + 1
            rev .= SubStr(s, idx, 1)
            if (Mod(A_Index, 3) = 0 && A_Index != len)
                rev .= ","
        }
        out := ""
        loop StrLen(rev)
            out := SubStr(rev, A_Index, 1) . out
        return (neg ? "-" : "") . out
    }

    ; toFixed(2) then strip trailing zeros/dot.
    static FormatPercentText(value) {
        s := Format("{:.2f}", value)
        if InStr(s, ".") {
            s := RegExReplace(s, "0+$", "")
            s := RegExReplace(s, "\.$", "")
        }
        return s
    }
}
