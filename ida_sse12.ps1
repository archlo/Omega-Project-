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

# Use py_eval with a simpler approach - write to file in IDA
$pythonCode = @"
import idaapi
import idautils
import idc
import re

def get_clean_decompilation(addr):
    func = idaapi.get_func(addr)
    if not func:
        return "Function not found at address"
    
    cfunc = idaapi.decompile(func)
    if not cfunc:
        return "Decompilation failed"
    
    # Get the pseudocode lines
    sv = cfunc.get_pseudocode()
    lines = []
    for i in range(len(sv)):
        text = sv[i].line
        # Remove all control characters except newline
        clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        lines.append(clean)
    return '\n'.join(lines)

result = get_clean_decompilation(0x866530)
# Write to a temp file
with open('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/decompiled_tmp.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(f"Written {len(result)} bytes")
"@

# Escape the Python code for JSON
$escapedCode = $pythonCode -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''

$jsonPayload = @"
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"py_eval","arguments":{"code":"$escapedCode"}}}
"@

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

# Check if file was written
if (Test-Path "C:\Users\jorge\OneDrive\Desktop\ts\ida_output\decompiled_tmp.txt") {
    $fileSize = (Get-Item "C:\Users\jorge\OneDrive\Desktop\ts\ida_output\decompiled_tmp.txt").Length
    Write-Output "TEMP_FILE_SIZE: $fileSize bytes"
    
    # Read and add header
    $code = Get-Content "C:\Users\jorge\OneDrive\Desktop\ts\ida_output\decompiled_tmp.txt" -Raw
    $header = "// CUIStat::CreateTip @ 0x866530`n// Decompiled from v95 IDB`n`n"
    $output = $header + $code
    [System.IO.File]::WriteAllText("C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt", $output, [System.Text.Encoding]::UTF8)
    Write-Output "FINAL_FILE_WRITTEN: $(([System.IO.FileInfo]"C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt").Length) bytes"
    Write-Output "LINE_COUNT: $($code.Split([char]10).Count)"
}

$client.Dispose()
