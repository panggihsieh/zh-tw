$ErrorActionPreference='Stop'
$rootDirectory=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $rootDirectory
$cacheDirectory=Join-Path $rootDirectory '.local/qa/kangxuan-books'
New-Item -ItemType Directory -Force -Path $cacheDirectory | Out-Null
foreach($gradeNumber in @(5,6)) {
  foreach($yearSemester in @('115_1','115_2','114_2')) {
    $indexFile=Join-Path $cacheDirectory "$gradeNumber-$yearSemester.html"
    if(-not (Test-Path -LiteralPath $indexFile)) {
      $query='https://pedia.cloud.edu.tw/Bookmark/Textword?category=%E5%9C%8B%E8%AA%9E&degree='+$gradeNumber+'&press=%E5%BA%B7%E8%BB%92%E7%89%88&year='+$yearSemester
      Invoke-WebRequest -Uri $query -OutFile $indexFile -UseBasicParsing
    }
    $htmlText=Get-Content -LiteralPath $indexFile -Raw -Encoding UTF8
    $lessonIds=[regex]::Matches($htmlText,'class="textname[^>]*id="(\d+)"') | ForEach-Object {$_.Groups[1].Value}
    foreach($lessonId in $lessonIds) {
      $lessonFile=Join-Path $cacheDirectory ($lessonId+'.html')
      if(-not (Test-Path -LiteralPath $lessonFile)) {Invoke-WebRequest -Uri ('https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId='+$lessonId) -OutFile $lessonFile -UseBasicParsing}
    }
    Write-Host ($gradeNumber.ToString()+' '+$yearSemester+' lessons: '+@($lessonIds).Count)
  }
}
