param(
    [int]$Port = 8000,
    [string]$Root = $PSScriptRoot
)

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".webp" = "image/webp"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png" = "image/png"
    ".gif" = "image/gif"
    ".svg" = "image/svg+xml"
    ".css" = "text/css; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".md" = "text/plain; charset=utf-8"
    ".txt" = "text/plain; charset=utf-8"
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [string]$Status,
        [string]$ContentType,
        [byte[]]$Body,
        [bool]$HeadersOnly = $false
    )

    $header = "HTTP/1.1 $Status`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)

    if (-not $HeadersOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

Write-Host "Serving $resolvedRoot"
Write-Host "Open http://127.0.0.1:$Port/"
Write-Host "Press Ctrl+C to stop."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()

        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $requestLine = $reader.ReadLine()

            while ($true) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) {
                    break
                }
            }

            if ($requestLine -notmatch "^(GET|HEAD)\s+([^\s]+)") {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
                Send-Response $stream "400 Bad Request" "text/plain; charset=utf-8" $body
                continue
            }

            $method = $matches[1]
            $requestPath = $matches[2].Split("?")[0]
            $requestPath = [Uri]::UnescapeDataString($requestPath.TrimStart("/"))

            if ([string]::IsNullOrWhiteSpace($requestPath)) {
                $requestPath = "index.html"
            }

            $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($resolvedRoot, $requestPath))
            $isInsideRoot = $fullPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)

            if (-not $isInsideRoot -or -not [System.IO.File]::Exists($fullPath)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                Send-Response $stream "404 Not Found" "text/plain; charset=utf-8" $body ($method -eq "HEAD")
                continue
            }

            $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
            $body = [System.IO.File]::ReadAllBytes($fullPath)
            Send-Response $stream "200 OK" $contentType $body ($method -eq "HEAD")
        } catch {
            try {
                if ($stream) {
                    $body = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
                    Send-Response $stream "500 Internal Server Error" "text/plain; charset=utf-8" $body
                }
            } catch {
                # Browser disconnects can happen during reloads; keep the server alive.
            }
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
