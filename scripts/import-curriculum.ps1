param([string]$UpperYear = '115_1', [string]$LowerYear = '114_2')
$ErrorActionPreference = 'Stop'
if ($UpperYear -notmatch '^\d{3}_1$' -or $LowerYear -notmatch '^\d{3}_2$') { throw 'Use academic-year format, e.g. 115_1 / 114_2.' }
$cache = Join-Path $PSScriptRoot '../.local/handwriting-curriculum'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$cache = (Resolve-Path -LiteralPath $cache).Path
$requests = foreach ($publisher in @('康軒','南一','翰林')) {
  foreach ($grade in 1..6) { foreach ($term in @('上','下')) {
    $year = if ($term -eq '上') { $UpperYear } else { $LowerYear }
    $url = 'https://pedia.cloud.edu.tw/Bookmark/Textword?category=' + [uri]::EscapeDataString('國語') + '&degree=' + $grade + '&press=' + [uri]::EscapeDataString($publisher + '版') + '&year=' + $year
    [pscustomobject]@{publisher=$publisher;grade=$grade;term=$term;year=$year;source=$url;cache=$cache}
  }}
}
$books = $requests | ForEach-Object -Parallel {
  $item=$_
  $file=Join-Path $item.cache ($item.publisher+'-'+$item.grade+'-'+$item.term+'-'+$item.year+'.html')
  try {
    if (!(Test-Path -LiteralPath $file)) { (Invoke-WebRequest -Uri $item.source -TimeoutSec 30).Content | Set-Content -LiteralPath $file -Encoding utf8NoBOM }
    $content=Get-Content -LiteralPath $file -Raw -Encoding utf8
    $ids=@([regex]::Matches($content,'class="textname[^>]*id="(\d+)"') | ForEach-Object {$_.Groups[1].Value} | Select-Object -Unique)
    [pscustomobject]@{publisher=$item.publisher;grade=$item.grade;term=$item.term;year=$item.year;source=$item.source;ids=$ids}
  } catch { [pscustomobject]@{publisher=$item.publisher;grade=$item.grade;term=$item.term;year=$item.year;source=$item.source;ids=@();error=$_.Exception.Message} }
} -ThrottleLimit 3
$ids=@($books.ids | Select-Object -Unique)
$lessons = $ids | ForEach-Object -Parallel {
  $id=$_; $folder=$using:cache
  $url='https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId='+$id
  $file=Join-Path $folder ($id+'.html')
  try {
    if (!(Test-Path -LiteralPath $file)) { (Invoke-WebRequest -Uri $url -TimeoutSec 30).Content | Set-Content -LiteralPath $file -Encoding utf8NoBOM }
    $text=Get-Content -LiteralPath $file -Raw -Encoding utf8
    $title=[System.Net.WebUtility]::HtmlDecode([regex]::Match($text,'生字詞彙表：(.*?)\s*</').Groups[1].Value)
    if (!$title) { throw 'Missing lesson title' }
    $characters=@([regex]::Matches($text,'class="word_class[^"]*"[^>]*><a[^>]*>(.*?)</a>') | ForEach-Object { [System.Net.WebUtility]::HtmlDecode($_.Groups[1].Value).Trim() } | Where-Object { $_ -match '^\p{IsCJKUnifiedIdeographs}$' } | Select-Object -Unique)
    [pscustomobject]@{id=$id;title=$title;source=$url;characters=($characters -join '')}
  } catch { [pscustomobject]@{id=$id;source=$url;error=$_.Exception.Message} }
} -ThrottleLimit 3
$byId=@{}; foreach($item in $lessons){$byId[$item.id]=$item}
$result=foreach($book in $books){
  $items=@($book.ids | ForEach-Object {$byId[$_]})
  $failed=@($items | Where-Object { $_.error -or !$_.characters })
  [pscustomobject]@{publisher=$book.publisher;grade=$book.grade;term=$book.term;year=$book.year;source=$book.source;lessons=$items;complete=($items.Count -gt 0 -and $failed.Count -eq 0);error=$book.error}
}
$destination=Join-Path $cache 'curriculum.json'
@{collectedAt=(Get-Date -Format 'yyyy-MM-dd');books=@($result)} | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $destination -Encoding utf8NoBOM
Copy-Item -LiteralPath $destination -Destination (Join-Path $PSScriptRoot '../public/handwriting-curriculum.json')
[pscustomobject]@{books=$books.Count;lessons=$lessons.Count;completeBooks=@($result | Where-Object complete).Count;failedLessons=@($lessons | Where-Object error).Count;output=$destination} | ConvertTo-Json
