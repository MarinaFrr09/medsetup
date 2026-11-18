Set WshShell = CreateObject("WScript.Shell")
appDir = "C:\Users\marin\.gemini\antigravity\scratch\medsetup"
WshShell.CurrentDirectory = appDir

' Inicia silenciosamente o servidor apenas se ele nao estiver em execucao
cmd = "cmd /c netstat -ano | findstr :3000 | findstr LISTENING >nul || powershell -NoProfile -ExecutionPolicy Bypass -Command ""Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run start' -WorkingDirectory '" & appDir & "' -WindowStyle Hidden"""
WshShell.Run cmd, 0, False
