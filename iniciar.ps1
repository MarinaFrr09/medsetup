$port = 3000
$url = "http://localhost:3000"
$workDir = "C:\Users\marin\.gemini\antigravity\scratch\medsetup"

# 1. Verifica se já está escutando na porta 3000
$conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($conn) {
    Start-Process $url
    exit 0
}

# 2. Inicia o servidor Next.js em segundo plano (100% invisível, sem CMD)
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start" -WorkingDirectory $workDir -WindowStyle Hidden

# 3. Aguarda o servidor responder
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 400
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        break
    }
}

# 4. Abre o aplicativo no navegador padrão
Start-Process $url
exit 0
