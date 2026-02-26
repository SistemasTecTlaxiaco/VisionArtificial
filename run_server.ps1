# ============================================================
#  run_server.ps1 – Servidor local para desarrollo
#  Escucha en TODAS las interfaces (0.0.0.0) para que los
#  celulares en el mismo WiFi puedan conectarse.
# ============================================================

$port = 8082

# Get local LAN IP for display
$localIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^(127\.|169\.)' } |
    Select-Object -First 1).IPAddress

$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:$port/")
$http.Prefixes.Add("http://$($localIP):$port/")

try {
    $http.Start()
} catch {
    Write-Host "❌ Error al iniciar el servidor: $_" -ForegroundColor Red
    Write-Host "   Prueba ejecutar PowerShell como Administrador." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "  ✅ Servidor iniciado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "  📺 En la PC:     http://localhost:$port/" -ForegroundColor Cyan
Write-Host "  📱 En celulares: http://$($localIP):$port/" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ⚠️  NOTA: El QR en la pantalla apuntará a la IP de red ($localIP)." -ForegroundColor Gray
Write-Host "  Asegúrate de que todos los celulares estén en el MISMO WiFi." -ForegroundColor Gray
Write-Host ""
Write-Host "  Presiona Ctrl+C para detener el servidor." -ForegroundColor Gray
Write-Host ""

# MIME types
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.json' = 'application/json'
}

$rootDir = $PSScriptRoot

while ($http.IsListening) {
    $context  = $http.GetContext()
    $request  = $context.Request
    $response = $context.Response

    $urlPath  = $request.Url.LocalPath
    $filePath = Join-Path $rootDir $urlPath.TrimStart('/')

    # Default to index.html for directory requests
    if ($urlPath -eq '/' -or (Test-Path $filePath -PathType Container)) {
        $filePath = Join-Path $filePath 'index.html'
    }

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath)
        $response.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }

        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found: $urlPath")
        $response.ContentLength64 = $body.Length
        $response.OutputStream.Write($body, 0, $body.Length)
    }

    $response.Close()
}
