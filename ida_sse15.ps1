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

# Use disasm tool with pagination
$jsonPayload = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"disasm","arguments":{"addr":"0x866530","max_instructions":200}}}'
$postClient = [System.Net.Http.HttpClient]::new()
$postClient.Timeout = [System.TimeSpan]::FromSeconds(60)
$postUri = [System.Uri]::new("http://127.0.0.1:13337$endpointUrl")
$postRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $postUri)
$postRequest.Content = [System.Net.Http.StringContent]::new($jsonPayload, [System.Text.Encoding]::UTF8, "application/json")
$postResponse = $postClient.SendAsync($postRequest).Result
Write-Output "POST: $($postResponse.StatusCode)"
$postClient.Dispose()

# Read all data
$allData = New-Object System.Text.StringBuilder
$buffer = New-Object byte[] 131072
$timeout = [System.Diagnostics.Stopwatch]::StartNew()

while ($timeout.Elapsed.TotalSeconds -lt 30) {
    try {
        $readTask = $stream.ReadAsync($buffer, 0, 131072)
        if ($readTask.Wait(5000)) {
            $bytesRead = $readTask.Result
            if ($bytesRead -gt 0) {
                $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
                [void]$allData.Append($text)
                Write-Output "CHUNK: $bytesRead bytes (total: $($allData.Length))"
                
                # Check for complete JSON
                $fullText = $allData.ToString()
                if ($fullText -match "data: ") {
                    $jsonStart = $fullText.IndexOf("data: ") + 6
                    $jsonPart = $fullText.Substring($jsonStart)
                    
                    $braceCount = 0
                    $inString = $false
                    $escapeNext = $false
                    foreach ($char in $jsonPart.ToCharArray()) {
                        if ($escapeNext) { $escapeNext = $false; continue }
                        if ($char -eq '\') { $escapeNext = $true; continue }
                        if ($char -eq '"') { $inString = -not $inString; continue }
                        if (-not $inString) {
                            if ($char -eq '{') { $braceCount++ }
                            if ($char -eq '}') { $braceCount-- }
                        }
                    }
                    if ($braceCount -eq 0 -and $jsonPart.Length -gt 10) {
                        Write-Output "JSON_COMPLETE"
                        break
                    }
                }
            }
        }
    } catch {
        Write-Output "READ_ERROR: $_"
        break
    }
}

$fullData = $allData.ToString()
Write-Output "TOTAL: $($fullData.Length) bytes"

# Save raw response
[System.IO.File]::WriteAllText("C:\Users\jorge\OneDrive\Desktop\ts\ida_output\raw_disasm.txt", $fullData, [System.Text.Encoding]::UTF8)

# Parse and save
if ($fullData -match "data: (\{.*\})") {
    $jsonData = $matches[1]
    try {
        $json = $jsonData | ConvertFrom-Json
        if ($json.result.structuredContent) {
            $sc = $json.result.structuredContent
            Write-Output "INSTRUCTIONS: $($sc.total_instructions)"
            Write-Output "FUNCTION_SIZE: $($sc.function_size)"
            
            # Get the disassembly text
            $disasmText = $sc.text
            Write-Output "TEXT_LENGTH: $($disasmText.Length)"
            Write-Output "TEXT_LINES: $($disasmText.Split([char]10).Count)"
            
            # Save to file
            $header = "// CUIStat::CreateTip @ 0x866530`n// Disassembly from v95 IDB`n// Function size: $($sc.function_size) bytes`n`n"
            $output = $header + $disasmText
            [System.IO.File]::WriteAllText("C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_disasm.txt", $output, [System.Text.Encoding]::UTF8)
            Write-Output "FILE_WRITTEN: $(([System.IO.FileInfo]"C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_disasm.txt").Length) bytes"
        }
    } catch {
        Write-Output "JSON_PARSE_ERROR: $_"
    }
}

$client.Dispose()
