#Requires AutoHotkey v2.0
#SingleInstance Force

#Include %A_ScriptDir%\lib\Gdip_All.ahk
#Include %A_ScriptDir%\src\Fonts.ahk
#Include %A_ScriptDir%\gui\MainWindow.ahk

global g_GdipToken := Gdip_Startup()
Fonts.Init(A_ScriptDir "\assets")

profilePath := A_ScriptDir "\profiles\main.json"
global g_MainWindow := MainWindow(profilePath)

OnExit((*) => (Gdip_Shutdown(g_GdipToken)))
