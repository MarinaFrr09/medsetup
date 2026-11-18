$WshShell = New-Object -ComObject WScript.Shell

$appDir = "C:\Users\marin\.gemini\antigravity\scratch\medsetup"
$iconPath = Join-Path $appDir "icon.ico"
$launcherVbs = Join-Path $appDir "Iniciar_MedSetup.vbs"
$startupVbs = Join-Path $appDir "MedSetup_Startup.vbs"
$stopVbs = Join-Path $appDir "Encerrar_MedSetup.vbs"

$desktop = [Environment]::GetFolderPath('Desktop')
$startup = [Environment]::GetFolderPath('Startup')

# 1. Atalho na Área de Trabalho: Iniciar MedSetup
$desktopLnkPath = Join-Path $desktop "MedSetup.lnk"
$shortcut = $WshShell.CreateShortcut($desktopLnkPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$launcherVbs`""
$shortcut.WorkingDirectory = $appDir
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Description = "MedSetup - Plataforma de Estudos Médicos"
$shortcut.Save()
Write-Output "Atalho criado na Área de Trabalho: $desktopLnkPath"

# 2. Atalho de Inicialização com o Windows (Pasta Inicializar)
$startupLnkPath = Join-Path $startup "MedSetup-AutoStart.lnk"
$startupShortcut = $WshShell.CreateShortcut($startupLnkPath)
$startupShortcut.TargetPath = "wscript.exe"
$startupShortcut.Arguments = "`"$startupVbs`""
$startupShortcut.WorkingDirectory = $appDir
$startupShortcut.Description = "Inicialização em Segundo Plano do MedSetup"
$startupShortcut.Save()
Write-Output "Atalho criado na pasta Inicializar do Windows: $startupLnkPath"
