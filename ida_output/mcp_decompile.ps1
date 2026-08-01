param(
    [string]$Address = "0x53aca0"
)

$baseUrl = "http://127.0.0.1:13337"

# Connect to SSE
$request = [System.Net.HttpWebRequest]::Create("$baseUrl/sse")
$request.Timeout = 120000
$request.ReadWriteTimeout = 120000
$resp = $request.GetResponse()
$sseStream = $resp.GetResponseStream()
$reader = New-Object System.IO.StreamReader($sseStream)

# Read endpoint
$line1 = $reader.ReadLine()
$line2 = $reader.ReadLine()
$endpointData = $line2.Replace("data: ", "").Trim()

# POST JSON-RPC
$postUrl = "$baseUrl$endpointData"
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze_function","arguments":{"addr":"' + $Address + '"}}}'

$postReq = [System.Net.HttpWebRequest]::Create($postUrl)
$postReq.Method = "POST"
$postReq.ContentType = "application/json"
$postReq.Timeout = 60000
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$postReq.ContentLength = $bytes.Length
$pStream = $postReq.GetRequestStream()
$pStream.Write($bytes, 0, $bytes.Length)
$pStream.Close()
try { $pResp = $postReq.GetResponse(); $pResp.Close() } catch {}

# Read SSE response
for ($i = 0; $i -lt 2000; $i++) {
    $line = $reader.ReadLine()
    if ($null -eq $line) { break }
    Write-Output $line
}
$reader.Close()
$sseStream.Close()
$resp.Close()
