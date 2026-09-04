#Requires AutoHotkey v2.0
#Include ..\lib\Gdip_All.ahk

; Copies a GDI+ bitmap to the Windows clipboard as CF_DIB (widest compatibility
; with paste targets -- chat apps, image editors, etc).
class ClipboardImage {
    static CF_DIB := 8

    ; pBitmap: a GDI+ bitmap handle (as returned by CardRenderer.Draw()["pBitmap"]).
    ; Caller retains ownership of pBitmap (not disposed here).
    static CopyBitmapToClipboard(pBitmap) {
        hBitmap := Gdip_CreateHBITMAPFromBitmap(pBitmap)
        if (!hBitmap)
            return false
        ok := this._CopyHBitmapAsDib(hBitmap)
        DllCall("DeleteObject", "UPtr", hBitmap)
        return ok
    }

    static _CopyHBitmapAsDib(hBitmap) {
        ; GetObject to find bitmap dimensions/bpp
        bm := Buffer(A_PtrSize = 8 ? 32 : 24, 0)
        if (!DllCall("GetObject", "UPtr", hBitmap, "Int", bm.Size, "Ptr", bm.Ptr))
            return false
        bmWidth := NumGet(bm, 4, "Int")
        bmHeight := NumGet(bm, 8, "Int")

        hdc := DllCall("GetDC", "Ptr", 0, "UPtr")
        biSize := 40
        bi := Buffer(biSize, 0)
        NumPut("UInt", biSize, bi, 0)
        NumPut("Int", bmWidth, bi, 4)
        NumPut("Int", -bmHeight, bi, 8)   ; negative height = top-down DIB
        NumPut("UShort", 1, bi, 12)
        NumPut("UShort", 32, bi, 14)      ; 32bpp
        NumPut("UInt", 0, bi, 16)         ; BI_RGB

        rowBytes := bmWidth * 4
        imgSize := rowBytes * bmHeight
        pixels := Buffer(imgSize, 0)
        got := DllCall("GetDIBits", "Ptr", hdc, "Ptr", hBitmap, "UInt", 0, "UInt", bmHeight,
            "Ptr", pixels.Ptr, "Ptr", bi.Ptr, "UInt", 0, "Int")
        DllCall("ReleaseDC", "Ptr", 0, "Ptr", hdc)
        if (!got)
            return false

        totalSize := biSize + imgSize
        GMEM_MOVEABLE := 0x2
        hMem := DllCall("GlobalAlloc", "UInt", GMEM_MOVEABLE, "UPtr", totalSize, "UPtr")
        if (!hMem)
            return false
        pMem := DllCall("GlobalLock", "UPtr", hMem, "UPtr")
        DllCall("RtlMoveMemory", "UPtr", pMem, "UPtr", bi.Ptr, "UPtr", biSize)
        DllCall("RtlMoveMemory", "UPtr", pMem + biSize, "UPtr", pixels.Ptr, "UPtr", imgSize)
        DllCall("GlobalUnlock", "UPtr", hMem)

        if (!DllCall("OpenClipboard", "Ptr", 0)) {
            DllCall("GlobalFree", "UPtr", hMem)
            return false
        }
        DllCall("EmptyClipboard")
        ok := DllCall("SetClipboardData", "UInt", this.CF_DIB, "UPtr", hMem, "UPtr")
        DllCall("CloseClipboard")
        return !!ok
    }
}
