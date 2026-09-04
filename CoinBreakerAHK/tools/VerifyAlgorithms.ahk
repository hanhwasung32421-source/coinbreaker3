#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\src\RandomUtil.ahk
#Include %A_ScriptDir%\..\src\Algorithms.ahk

; Standalone sanity check for the ported algorithms (no GUI/GDI dependency).
; Run with: AutoHotkey64.exe tools\VerifyAlgorithms.ahk
; Prints PASS/FAIL per check and writes a sample dump to VerifyAlgorithms.out.txt
; for manual distribution comparison against the live web app.

out := []
fail := 0

check(name, cond) {
    global fail
    out.Push((cond ? "PASS" : "FAIL***") . "  " . name)
    if (!cond)
        fail += 1
}

; ---- pickPercent2NoZeroSecondDigit: never ends in a 0 hundredths-digit over a wide range ----
badZero := 0
loop 2000 {
    p := Algorithms.PickPercent2NoZeroSecondDigit(20, 25)
    pi := Round(p * 100)
    if (Mod(Abs(pi), 10) = 0)
        badZero += 1
    if (p < 20 || p > 25)
        badZero += 1000  ; out of range is a hard failure
}
check("PickPercent2NoZeroSecondDigit: in range & rarely-zero-2nd-digit over 2000 draws (badZero=" badZero ")", badZero = 0)

; single-point range must return that point even if it ends in 0.
; Uses 20.25 (exact in binary FP) rather than e.g. 20.10 -- values like x.10
; aren't exactly representable in IEEE754 doubles, so ceil(min*100) can land one
; integer above floor(max*100) even for a "single point" range; this is an
; inherent property of the ceil/floor*100 approach (present in the original
; JS source too, not an AHK porting bug), not something to paper over here.
p2 := Algorithms.PickPercent2NoZeroSecondDigit(20.25, 20.25)
check("PickPercent2NoZeroSecondDigit: single point 20.25 returns 20.25 exactly", Abs(p2 - 20.25) < 0.0001)

; ---- fixed-point entry/exit ----
check("ParseEntryToInt('0.11445') = 11445", Algorithms.ParseEntryToInt("0.11445") = 11445)
check("EntryIntToText(11445) = '0.11445'", Algorithms.EntryIntToText(11445) = "0.11445")

; tail variation: zeroProb=100 always returns the truncated head
tailOk := true
loop 200 {
    v := Algorithms.ApplyPriceTailVariation(123456, 2, 100)  ; decimalPlace=2 -> step=1000
    if (Mod(v, 1000) != 0) {
        tailOk := false
        break
    }
}
check("ApplyPriceTailVariation zeroProb=100 always trailing-zero (200 draws)", tailOk)

; gap=0 means no shift at all
e1 := Algorithms.RandomEntryFromBase("0.11445", 5, 0, 0)
check("RandomEntryFromBase gap=0,decimalPlace=5 leaves tail untouched (== base, since step=1 → no variation range)", e1 = "0.11445")

; ---- computeExit: LONG profit means price goes up, SHORT profit means price goes down ----
exitLong := Algorithms.ComputeExit(0.10000, 10, "LONG", "100x", 5, 0)  ; p=10%/100=0.1% price move
check("ComputeExit LONG: exit > entry for positive pnl (" exitLong " > 0.10000)", (exitLong + 0) > 0.10000)
exitShort := Algorithms.ComputeExit(0.10000, 10, "SHORT", "100x", 5, 0)
check("ComputeExit SHORT: exit < entry for positive pnl (" exitShort " < 0.10000)", (exitShort + 0) < 0.10000)

; leverage parsing
check("ParseLeverage('100x') = 100", Algorithms.ParseLeverage("100x") = 100)
check("ParseLeverage('격리 x100') = 100", Algorithms.ParseLeverage("격리 x100") = 100)
check("ParseLeverage('bogus') = 1 (fallback)", Algorithms.ParseLeverage("bogus") = 1)

; ---- profit scaling ----
autoScale := Map("enabled", true, "rules", [
    Map("enabled", true, "minP", 20, "maxP", 30, "scalePct", 100),
    Map("enabled", true, "minP", 30, "maxP", 40, "scalePct", 120),
])
sc1 := Algorithms.GetEffectiveProfitScalePctForPercent(25, autoScale, 999)
check("Auto-scale rule match [20,30) for percent=25 -> 100%", sc1 = 100)
sc2 := Algorithms.GetEffectiveProfitScalePctForPercent(35, autoScale, 999)
check("Auto-scale rule match [30,40) for percent=35 -> 120%", sc2 = 120)
sc3 := Algorithms.GetEffectiveProfitScalePctForPercent(50, autoScale, 999)
check("Auto-scale no match for percent=50 -> falls back to global 999", sc3 = 999)
check("ApplyProfitScale(1000000, 150) = 1500000", Algorithms.ApplyProfitScale(1000000, 150) = 1500000)

; ---- formatting ----
check("FormatProfit(10229614) = '10,229,614 원'", Algorithms.FormatProfit(10229614) = "10,229,614 원")
check("FormatPercentText(19.70) strips trailing zero -> '19.7'", Algorithms.FormatPercentText(19.70) = "19.7")
check("FormatPercentText(20.00) strips to '20'", Algorithms.FormatPercentText(20.00) = "20")

; ---- weighted line pool ----
arr := RandomUtil.LinesToWeightedArray("a|1`nb|3`nc", ["x"])
check("LinesToWeightedArray weight expansion count = 1+3+1 = 5", arr.Length = 5)

; write results
text := ""
for line in out
    text .= line "`n"
text .= "`n" . (fail = 0 ? "ALL PASS" : (fail . " FAILURE(S)"))
outPath := A_ScriptDir "\VerifyAlgorithms.out.txt"
if FileExist(outPath)
    FileDelete outPath
FileAppend text, outPath, "UTF-8"

; Also print to stdout when run from a console host.
try FileAppend text "`n", "*", "UTF-8"

ExitApp(fail = 0 ? 0 : 1)
