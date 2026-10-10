# Draft narration with the built-in Windows voice (replace with your own voice for the final cut).
# Usage: powershell -File video/tts.ps1 -Scenes video/scenes.json -Out video/out/audio [-Voice "Microsoft Zira Desktop"] [-Rate 0]
param(
  [string]$Scenes = "video/scenes.json",
  [string]$Out = "video/out/audio",
  [string]$Voice = "Microsoft Zira Desktop",
  [int]$Rate = 0
)
Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force $Out | Out-Null
$items = Get-Content $Scenes -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($s in $items) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($Voice)
  $synth.Rate = $Rate
  $path = Join-Path (Resolve-Path $Out) ($s.id + ".wav")
  $synth.SetOutputToWaveFile($path)
  $synth.Speak($s.say)
  $synth.Dispose()
  Write-Output "wrote $path"
}
