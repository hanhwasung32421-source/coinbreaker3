#Requires AutoHotkey v2.0

; Random number helpers + weighted line-pool parsing.
; Ported from coinbreaker3/app.js (randInt, randFloat, linesToWeightedArray, pickFrom, cfgArrayToText, linesToTextList).
class RandomUtil {

    ; Integer in [min, max] inclusive. Mirrors app.js randInt() (Math.floor(Math.random()*(b-a+1))+a, ceil/floor bounds).
    static RandInt(min, max) {
        a := Ceil(min), b := Floor(max)
        if (b <= a)
            return a
        return Random(a, b)
    }

    ; Float in [min, max). Mirrors app.js randFloat().
    static RandFloat(min, max) {
        return Random() * (max - min) + min
    }

    static Clamp(n, a, b) {
        n := IsNumber(n) ? n + 0 : 0
        if (n < a)
            return a
        if (n > b)
            return b
        return n
    }

    ; Parse "123,456" or "12.5%" style text -> number, with fallback on NaN.
    static ParseNumber(text, fallback := 0) {
        s := StrReplace(StrReplace(text, ","), "%")
        if (s = "" || !IsNumber(s))
            return fallback
        return s + 0
    }

    ; 만원(10,000-won) text -> 원(won) integer.
    static ParseManWon(text, fallbackManWon := 0) {
        return Floor(RandomUtil.ParseNumber(text, fallbackManWon) * 10000)
    }

    ; Parses a newline-separated textarea pool where each line may end in "|N" (weight 1-50).
    ; Returns an expanded array (each string repeated per its weight) for uniform-random picking.
    ; Mirrors app.js linesToWeightedArray().
    static LinesToWeightedArray(text, fallbackArr) {
        out := []
        for line in StrSplit(text, "`n", "`r") {
            if (line = "")
                continue
            weight := 1
            body := line
            if RegExMatch(line, "^(.*)\|(\d+)$", &m) {
                body := m[1]
                weight := RandomUtil.Clamp(Integer(m[2]), 1, 50)
            }
            loop weight
                out.Push(body)
        }
        if (out.Length = 0) {
            for v in fallbackArr
                out.Push(v)
        }
        return out
    }

    ; Newline split, trim, filter blanks. Mirrors app.js linesToTextList() (used for congrats lines).
    static LinesToTextList(text, fallbackArr) {
        out := []
        for line in StrSplit(text, "`n", "`r") {
            t := Trim(line)
            if (t != "")
                out.Push(t)
        }
        if (out.Length = 0) {
            for v in fallbackArr
                out.Push(v)
        }
        return out
    }

    ; Array -> newline-joined text, for populating a textarea/edit control from config.
    static ArrayToText(arr) {
        s := ""
        for i, v in arr
            s .= (i > 1 ? "`n" : "") . v
        return s
    }

    ; Uniform random pick from an array, with fallback if empty.
    static PickFrom(arr, fallback := "") {
        if (arr.Length = 0)
            return fallback
        return arr[RandomUtil.RandInt(1, arr.Length)]
    }

    ; Fisher-Yates shuffle, in place. Mirrors app.js shuffleInPlace().
    static ShuffleInPlace(arr) {
        i := arr.Length
        while (i > 1) {
            j := RandomUtil.RandInt(1, i)
            tmp := arr[i], arr[i] := arr[j], arr[j] := tmp
            i -= 1
        }
        return arr
    }
}
