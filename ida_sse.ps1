Add-Type -AssemblyName System.Net.Http

function Connect-SSE {
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
    return @{ Client = $client; Reader = $reader; SessionUrl = $endpointUrl }
}

function Send-DecompileRequest {
    param([string]$sessionUrl)
    $jsonPayload = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"decompile","arguments":{"addr":"0x866530"}}}'
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [System.TimeSpan]::FromSeconds(30)
    $uri = [System.Uri]::new("http://127.0.0.1:13337$sessionUrl")
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $uri)
    $request.Content = [System.Net.Http.StringContent]::new($jsonPayload, [System.Text.Encoding]::UTF8, "application/json")
    $response = $client.SendAsync($request).Result
    return @{ Status = $response.StatusCode; Body = $response.Content.ReadAsStringAsync().Result }
}

function Read-SSEEvents {
    param([System.IO.StreamReader]$reader, [int]$maxEvents = 10)
    $events = @()
    for ($i = 0; $i -lt $maxEvents; $i++) {
        try {
            $line = $reader.ReadLine()
            if ($line -match "^data: (.+)") {
                $events += $matches[1]
            }
        } catch {
            break
        }
    }
    return $events
}

# Main execution
Write-Output "Connecting to SSE..."
$sse = Connect-SSE
Write-Output "Session URL: $($sse.SessionUrl)"

Write-Output "Sending decompile request..."
$result = Send-DecompileRequest -sessionUrl $sse.SessionUrl
Write-Output "POST Status: $($result.Status)"
Write-Output "POST Body: $($result.Body)"

Write-Output "Reading SSE events..."
$events = Read-SSEEvents -reader $sse.Reader -maxEvents 20
Write-Output "Events received: $($events.Count)"
foreach ($event in $events) {
    Write-Output "EVENT: $event"
}

$sse.Client.Dispose()
