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

# Use disasm with 1000 instructions
$jsonPayload = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"disasm","arguments":{"addr":"0x866530","max_instructions":1000}}}'
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
$buffer = New-Object byte[] 262144  # 256KB
$timeout = [System.Diagnostics.Stopwatch]::StartNew()

while ($timeout.Elapsed.TotalSeconds -lt 30) {
    try {
        $readTask = $stream.ReadAsync($buffer, 0, 262144)
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

# Parse and save
if ($fullData -match "data: (\{.*\})") {
    $jsonData = $matches[1]
    try {
        $json = $jsonData | ConvertFrom-Json
        $innerJson = $json.result.content[0].text | ConvertFrom-Json
        $asm = $innerJson.asm
        Write-Output "Function: $($asm.name)"
        Write-Output "Lines: $($asm.lines.Count)"
        
        # Build assembly text
        $lines = @()
        foreach ($line in $asm.lines) {
            $lines += "0x$($line.addr): $($line.instruction)"
        }
        $asmText = $lines -join "`n"
        
        # Get the decompiled code from the earlier response (partial)
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
        
        $output = $decompileHeader + "`n// === DISASSEMBLY (complete) ===`n`n" + $asmText
        [System.IO.File]::WriteAllText("C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt", $output, [System.Text.Encoding]::UTF8)
        Write-Output "FILE_WRITTEN: $(([System.IO.FileInfo]"C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuistat_CreateTip_clean.txt").Length) bytes"
    } catch {
        Write-Output "JSON_PARSE_ERROR: $_"
    }
}

$client.Dispose()
