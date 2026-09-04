#Requires AutoHotkey v2.0
#Include ..\src\Constants.ahk
#Include ..\src\RandomUtil.ahk
#Include ..\src\Algorithms.ahk
#Include ..\src\CardModel.ahk
#Include ..\src\CardRenderer.ahk
#Include ..\src\ClipboardImage.ahk
#Include ..\src\Profile.ahk

; M1 main window: core numeric-grid panel + live preview + Generate/clipboard-copy.
; Presets/phrases/Navigator/crop/overlay/cloud panels land in later milestones
; (see plan file) -- this is the walking skeleton the rest builds on.
class MainWindow {
    __New(profilePath) {
        this.profilePath := profilePath
        this.state := Profile.Load(profilePath)
        this.pBitmap := 0   ; currently-displayed Gdip bitmap (owned here until replaced)
        this.lastRects := Map()

        this.gui := Gui("+Resize", "Coin Breaker (AHK)")
        this.gui.SetFont("s10", "Noto Sans KR")
        this.gui.OnEvent("Close", (*) => ExitApp())

        this._BuildPreviewArea()
        this._BuildCorePanel()

        this.gui.Show("w" (Constants.CARD_W + 380) " h" (Constants.CARD_H + 160))
        this._LoadStateIntoUi()
        this.Regenerate()
    }

    _BuildPreviewArea() {
        this.previewPic := this.gui.Add("Picture", "x20 y20 w" Constants.CARD_W " h" Constants.CARD_H " Border")
        this.btnGenerate := this.gui.Add("Button", "x20 y" (Constants.CARD_H + 30) " w200 h32", "생성 (클립보드로 복사)")
        this.btnGenerate.OnEvent("Click", (*) => this.OnGenerateClick())
        this.statusText := this.gui.Add("Text", "x230 y" (Constants.CARD_H + 36) " w180", "")
    }

    _BuildCorePanel() {
        x0 := Constants.CARD_W + 40
        y := 20
        g := this.gui

        g.Add("Text", "x" x0 " y" y, "수익률 최소/최대 (%)")
        y += 20
        this.eqPercentMin := g.Add("Edit", "x" x0 " y" y " w70")
        this.eqPercentMax := g.Add("Edit", "x" (x0+80) " y" y " w70")
        y += 32

        g.Add("Text", "x" x0 " y" y, "수익금 최소/최대 (만원)")
        y += 20
        this.eqProfitMin := g.Add("Edit", "x" x0 " y" y " w70")
        this.eqProfitMax := g.Add("Edit", "x" (x0+80) " y" y " w70")
        y += 32

        g.Add("Text", "x" x0 " y" y, "코인")
        y += 20
        this.eqSymbol := g.Add("Edit", "x" x0 " y" y " w150")
        y += 32

        g.Add("Text", "x" x0 " y" y, "방향")
        y += 20
        this.btnLong := g.Add("Button", "x" x0 " y" y " w70 h26", "LONG")
        this.btnShort := g.Add("Button", "x" (x0+80) " y" y " w70 h26", "SHORT")
        this.btnLong.OnEvent("Click", (*) => this.SetSide("LONG"))
        this.btnShort.OnEvent("Click", (*) => this.SetSide("SHORT"))
        y += 34

        g.Add("Text", "x" x0 " y" y, "레버리지")
        y += 20
        this.eqLeverage := g.Add("Edit", "x" x0 " y" y " w100")
        y += 32

        g.Add("Text", "x" x0 " y" y, "진입가격 (기준)")
        y += 20
        this.eqEntry := g.Add("Edit", "x" x0 " y" y " w150")
        y += 32

        g.Add("Text", "x" x0 " y" y " w160", "실제 진입가 / 종료가 (자동)")
        y += 20
        this.txReal := g.Add("Text", "x" x0 " y" y " w160 cGray", "-")
        y += 32

        g.Add("Text", "x" x0 " y" y, "진입가 랜덤 설정")
        y += 20
        g.Add("Text", "x" x0 " y" y " w60", "자리수")
        this.eqRandPlace := g.Add("Edit", "x" (x0+60) " y" (y-4) " w40")
        g.Add("Text", "x" (x0+110) " y" y " w40", "갭")
        this.eqRandGap := g.Add("Edit", "x" (x0+140) " y" (y-4) " w40")
        y += 28
        g.Add("Text", "x" x0 " y" y " w80", "진입 000확률%")
        this.eqEntryZeroProb := g.Add("Edit", "x" (x0+90) " y" (y-4) " w50")
        y += 28
        g.Add("Text", "x" x0 " y" y " w80", "종료 000확률%")
        this.eqExitZeroProb := g.Add("Edit", "x" (x0+90) " y" (y-4) " w50")
        y += 34

        for ctrl in [this.eqPercentMin, this.eqPercentMax, this.eqProfitMin, this.eqProfitMax,
                     this.eqSymbol, this.eqLeverage, this.eqEntry, this.eqRandPlace, this.eqRandGap,
                     this.eqEntryZeroProb, this.eqExitZeroProb]
            ctrl.OnEvent("Change", (*) => this.OnInputsChanged())
    }

    _LoadStateIntoUi() {
        inp := this.state["inputs"]
        this.eqPercentMin.Value := inp["percentMin"]
        this.eqPercentMax.Value := inp["percentMax"]
        this.eqProfitMin.Value := inp["profitMin"]
        this.eqProfitMax.Value := inp["profitMax"]
        this.eqSymbol.Value := inp["symbol"]
        this.eqLeverage.Value := inp["leverage"]
        this.eqEntry.Value := inp["entry"]
        this.eqRandPlace.Value := inp["entryRandPlace"]
        this.eqRandGap.Value := inp["entryRandGap"]
        this.eqEntryZeroProb.Value := inp["entryZeroProb"]
        this.eqExitZeroProb.Value := inp["exitZeroProb"]
        this.side := inp["side"]
        this._UpdateSideButtons()
    }

    SetSide(side) {
        this.side := side
        this._UpdateSideButtons()
        this.SaveState()
        this.Regenerate()
    }

    _UpdateSideButtons() {
        this.btnLong.Opt(this.side = "LONG" ? "+Default" : "-Default")
        this.btnShort.Opt(this.side = "SHORT" ? "+Default" : "-Default")
    }

    OnInputsChanged() {
        this.SaveState()
        this.Regenerate()
    }

    CollectInputsFromUi() {
        return Map(
            "percentMin", this.eqPercentMin.Value, "percentMax", this.eqPercentMax.Value,
            "profitMin", this.eqProfitMin.Value, "profitMax", this.eqProfitMax.Value,
            "symbol", this.eqSymbol.Value, "side", this.side, "leverage", this.eqLeverage.Value,
            "entry", this.eqEntry.Value,
            "entryRandPlace", this.eqRandPlace.Value, "entryRandGap", this.eqRandGap.Value,
            "entryZeroProb", this.eqEntryZeroProb.Value, "exitZeroProb", this.eqExitZeroProb.Value,
            "bgZoom", this.state["inputs"]["bgZoom"]
        )
    }

    SaveState() {
        this.state["inputs"] := this.CollectInputsFromUi()
        Profile.Save(this.profilePath, this.state)
    }

    ; Rolls new random values from current settings and re-renders the preview
    ; (does NOT copy to clipboard -- see OnGenerateClick for that).
    Regenerate() {
        inp := this.CollectInputsFromUi()
        minP := RandomUtil.ParseNumber(inp["percentMin"], 0)
        maxP := RandomUtil.ParseNumber(inp["percentMax"], 0)
        minWon := RandomUtil.ParseManWon(inp["profitMin"], 0)
        maxWon := RandomUtil.ParseManWon(inp["profitMax"], 0)
        if (minP > maxP) {
            tmp := minP, minP := maxP, maxP := tmp
        }
        if (minWon > maxWon) {
            tmp := minWon, minWon := maxWon, maxWon := tmp
        }

        rp := Algorithms.RandomPercentProfit(minP, maxP, minWon, maxWon)
        scalePct := Algorithms.GetEffectiveProfitScalePctForPercent(rp.percent, this.state["presetProfitAutoScale"], this.state["presetProfitScalePct"])
        profitWon := Algorithms.ApplyProfitScale(rp.profit, scalePct)

        decimalPlace := RandomUtil.Clamp(Integer(inp["entryRandPlace"]), 1, 5)
        gap := RandomUtil.Clamp(Integer(inp["entryRandGap"]), 0, 20)
        entryText := Algorithms.RandomEntryFromBase(inp["entry"], decimalPlace, gap, inp["entryZeroProb"])
        exitText := Algorithms.ComputeExit(entryText + 0, rp.percent, inp["side"], inp["leverage"], decimalPlace, inp["exitZeroProb"])

        leverageNum := Algorithms.ParseLeverage(inp["leverage"])
        leverageText := InStr(inp["leverage"], "격리") || InStr(inp["leverage"], "교차")
            ? inp["leverage"] : "격리 x" . leverageNum

        values := Map(
            "percentText", Algorithms.FormatPercentText(rp.percent),
            "profitText", Algorithms.FormatProfit(profitWon),
            "symbol", inp["symbol"], "side", inp["side"],
            "leverageText", leverageText,
            "entryText", entryText . " USDT",
            "exitText", exitText . " USDT"
        )

        this.txReal.Text := entryText . "  /  " . exitText

        bg := this.state["bg"]
        bgCfg := (bg["path"] != "") ? Map("path", bg["path"], "zoom", inp["bgZoom"], "shiftX", bg["shiftX"], "shiftY", bg["shiftY"]) : ""

        result := CardRenderer.Draw(values, this.state["cardCustomStyles"], bgCfg)
        this._SetPreviewBitmap(result["pBitmap"])
        this.lastRects := result["lastRects"]
    }

    _SetPreviewBitmap(pBitmap) {
        hBitmap := Gdip_CreateHBITMAPFromBitmap(pBitmap)
        this.previewPic.Value := "HBITMAP:" hBitmap   ; control takes ownership of hBitmap
        if (this.pBitmap)
            Gdip_DisposeImage(this.pBitmap)
        this.pBitmap := pBitmap
    }

    OnGenerateClick() {
        this.Regenerate()
        ok := ClipboardImage.CopyBitmapToClipboard(this.pBitmap)
        this.statusText.Text := ok ? "클립보드에 복사됨" : "복사 실패"
    }
}
