Add-Type -AssemblyName System.Net.Http

function Get-SSESession {
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
    return @{ Client = $client; Stream = $stream; EndpointUrl = $endpointUrl }
}

function Send-Request {
    param([string]$endpointUrl, [string]$jsonPayload)
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [System.TimeSpan]::FromSeconds(60)
    $postUri = [System.Uri]::new("http://127.0.0.1:13337$endpointUrl")
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $postUri)
    $request.Content = [System.Net.Http.StringContent]::new($jsonPayload, [System.Text.Encoding]::UTF8, "application/json")
    $response = $client.SendAsync($request).Result
    $client.Dispose()
    return $response.StatusCode
}

function Read-SSEResponse {
    param([System.IO.Stream]$stream)
    $allData = New-Object System.Text.StringBuilder
    $buffer = New-Object byte[] 262144
    $timeout = [System.Diagnostics.Stopwatch]::StartNew()
    
    while ($timeout.Elapsed.TotalSeconds -lt 30) {
        try {
            $readTask = $stream.ReadAsync($buffer, 0, 262144)
            if ($readTask.Wait(5000)) {
                $bytesRead = $readTask.Result
                if ($bytesRead -gt 0) {
                    $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
                    [void]$allData.Append($text)
                    
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
                            return $allData.ToString()
                        }
                    }
                }
            }
        } catch {
            break
        }
    }
    return $allData.ToString()
}

# Main execution
$allAssembly = @()
$offset = 0
$maxPerRequest = 200

Write-Output "Starting disassembly collection..."

while ($true) {
    $session = Get-SSESession
    Write-Output "Session $($offset): $($session.EndpointUrl)"
    
    $payload = "{`"jsonrpc`":`"2.0`",`"id`":1,`"method`":`"tools/call`",`"params`":{`"name`":`"disasm`",`"arguments`":{`"addr`":`"0x866530`",`"max_instructions`":$maxPerRequest,`"offset`":$offset}}}"
    
    Send-Request -endpointUrl $session.EndpointUrl -jsonPayload $payload | Out-Null
    
    $responseData = Read-SSEResponse -stream $session.Stream
    $session.Client.Dispose()
    
    if ($responseData -match "data: (\{.*\})") {
        $jsonData = $matches[1]
        try {
            $json = $jsonData | ConvertFrom-Json
            $innerJson = $json.result.content[0].text | ConvertFrom-Json
            $lines = $innerJson.asm.lines
            
            Write-Output "  Got $($lines.Count) lines"
            
            foreach ($line in $lines) {
                $allAssembly += "0x$($line.addr): $($line.instruction)"
            }
            
            if ($lines.Count -lt $maxPerRequest) {
                Write-Output "  No more lines"
                break
            }
            
            $offset += $maxPerRequest
        } catch {
            Write-Output "  Parse error: $_"
            break
        }
    } else {
        Write-Output "  No data match"
        break
    }
}

Write-Output "Total assembly lines: $($allAssembly.Count)"

# Build output
$decompileHeader = @"
// CUIStat::CreateTip @ 0x866530
// Decompiled from v95 IDB
// NOTE: Full decompilation truncated by MCP server (function is 4140 bytes)
// Partial decompilation (variable declarations only):

void __thiscall CUIStat::CreateTip(CUIStat *this)
{
  StringPool *Instance; // eax
  ZXString<char> *v3; // eax
  StringPool *v4; // eax
  ZXString<char> *v5; // eax
  IWzGr2DLayer *v6; // ecx
  IWzGr2DLayer *m_pInterface; // eax
  _com_ptr_t<_com_IIID<IWzFont,&_GUID_2bef046d_ccd6_445a_88c4_929fc35d30ac> > *p_m_pFont; // ebp
  void (*AddRef)(void); // edx
  IWzGr2DLayer *v10; // eax
  IWzGr2DLayer *v11; // edi
  int v12; // eax
  int v13; // eax
  StringPool *v14; // eax
  ZXString<char> *v15; // eax
  StringPool *v16; // eax
  ZXString<char> *v17; // eax
  StringPool *v18; // eax
  ZXString<char> *v19; // eax
  IWzGr2DLayer *v20; // ecx
  IWzFont *v21; // ecx
  const _com_ptr_t<_com_IIID<IWzGr2DLayer,&_GUID_6dc8c7ce_8e81_4420_b4f6_4b60b7d5fcdf> > *v22; // eax
  void *m_pStr; // eax
  StringPool *v24; // eax
  ZXString<char> *v25; // eax
  StringPool *v26; // eax
  ZXString<char> *v27; // eax
  StringPool *v28; // eax
  ZXString<char> *v29; // eax
  IWzGr2DLayer *v30; // ecx
  // ... (truncated - 90+ more variables)

"@

$output = $decompileHeader + "`n// === DISASSEMBLY (complete) ===`n`n" + ($allAssembly -join "`n")
[System.IO.File]::WriteAllText("C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt", $output, [System.Text.Encoding]::UTF8)
Write-Output "FILE_WRITTEN: $(([System.IO.FileInfo]"C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt").Length) bytes"
