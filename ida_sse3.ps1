Add-Type -AssemblyName System.Net.Http

# Connect to SSE
$uri = [System.Uri]::new("http://127.0.0.1:13337/sse")
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [System.TimeSpan]::FromSeconds(300)
$request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $uri)
$request.Headers.Add("Accept", "text/event-stream")
$response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result
$stream = $response.Content.ReadAsStreamAsync().Result
$reader = [System.IO.StreamReader]::new($stream)

$endpointUrl = $null
for ($i = 0; $i -lt 5; $i++) {
    $line = $reader.ReadLine()
    if ($line -match "^data: (.+)") {
        $endpointUrl = $matches[1]
        break
    }
}
Write-Output "SESSION: $endpointUrl"

# POST the request
$jsonPayload = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"decompile","arguments":{"addr":"0x866530"}}}'
$postClient = [System.Net.Http.HttpClient]::new()
$postClient.Timeout = [System.TimeSpan]::FromSeconds(30)
$postUri = [System.Uri]::new("http://127.0.0.1:13337$endpointUrl")
$postRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $postUri)
$postRequest.Content = [System.Net.Http.StringContent]::new($jsonPayload, [System.Text.Encoding]::UTF8, "application/json")
$postResponse = $postClient.SendAsync($postRequest).Result
Write-Output "POST: $($postResponse.StatusCode)"
$postClient.Dispose()

# Read SSE with large buffer
$buffer = New-Object byte[] 131072  # 128KB buffer
$readTask = $stream.ReadAsync($buffer, 0, 131072)
$completed = $readTask.Wait(30000)
if ($completed) {
    $bytesRead = $readTask.Result
    $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
    Write-Output "BYTES: $bytesRead"
    
    # Find the data line
    if ($text -match "data: (\{.*\})") {
        $jsonData = $matches[1]
        Write-Output "JSON_LENGTH: $($jsonData.Length)"
        
        # Parse JSON
        $json = $jsonData | ConvertFrom-Json
        $code = $json.result.structuredContent.code
        Write-Output "CODE_LENGTH: $($code.Length)"
        
        # Write to file
        $header = "// CUIStat::CreateTip @ 0x866530`n// Decompiled from v95 IDB`n`n"
        $output = $header + $code
        $output | Out-File -FilePath "C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt" -Encoding UTF8
        Write-Output "FILE_WRITTEN"
    } else {
        Write-Output "NO_MATCH"
        Write-Output $text.Substring(0, [Math]::Min(1000, $text.Length))
    }
} else {
    Write-Output "TIMEOUT"
}

$client.Dispose()
