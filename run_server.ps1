$http = [System.Net.HttpListener]::new()
$port = 8082
$url = "http://localhost:$port/"
$http.Prefixes.Add($url)
try {
    $http.Start()
} catch {
    Write-Host "Error starting server: $_"
    exit
}

Write-Host "Server started at $url"
Write-Host "Press Ctrl+C to stop"

while ($http.IsListening) {
    $context = $http.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $path = $request.Url.LocalPath
    # Use current location
    $filePath = Join-Path $PWD $path.TrimStart('/')
    
    if ($path -eq "/") {
        $filePath = Join-Path $PWD "index.html"
    }
    
    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        
        $cType = "application/octet-stream"
        if ($filePath.EndsWith(".html")) { $cType = "text/html; charset=utf-8" }
        elseif ($filePath.EndsWith(".js")) { $cType = "application/javascript" }
        elseif ($filePath.EndsWith(".css")) { $cType = "text/css" }
        elseif ($filePath.EndsWith(".png")) { $cType = "image/png" }
        
        $response.ContentType = $cType
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
