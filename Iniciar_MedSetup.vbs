Set WshShell = CreateObject("WScript.Shell")
appDir = "C:\Users\marin\.gemini\antigravity\scratch\medsetup"
WshShell.CurrentDirectory = appDir
WshShell.Run """" & appDir & "\start-production.bat""", 0, False
