param([string]$Path)

$stream = New-Object System.IO.FileStream $Path, 'Open', 'Read'
$bytes = New-Object byte[] 4
$stream.Read($bytes, 0, 4) | Out-Null
$header = [System.Text.Encoding]::ASCII.GetString($bytes)
$stream.Close()

Write-Host "File: $Path"
Write-Host "Header: $header"
$item = Get-Item $Path
Write-Host "Size: $($item.Length) bytes"
Write-Host "Is GGUF: $($header -eq 'GGUF')"
