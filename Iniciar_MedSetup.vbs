Set WshShell = CreateObject("WScript.Shell")
appDir = "C:\Users\marin\.gemini\antigravity\scratch\medsetup"
WshShell.CurrentDirectory = appDir

Function IsServerRunning()
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 500, 500, 500, 500
    http.open "GET", "http://localhost:3000", False
    http.send
    If Err.Number = 0 And http.status = 200 Then
        IsServerRunning = True
    Else
        IsServerRunning = False
    End If
    Set http = Nothing
    On Error GoTo 0
End Function

If IsServerRunning() Then
    WshShell.Run "http://localhost:3000", 1, False
    WScript.Quit
End If

' Inicia o servidor Next.js em segundo plano completamente invisivel (janela 0 = oculta)
WshShell.Run "cmd /c npm start", 0, False

' Aguarda o servidor responder na porta 3000
For i = 1 To 30
    WScript.Sleep 400
    If IsServerRunning() Then
        Exit For
    End If
Next

WshShell.Run "http://localhost:3000", 1, False
