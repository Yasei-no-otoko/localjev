#Requires -Version 5.1
<#
.SYNOPSIS
Annotate a stopped evaluation with Windows hardware and explicit backend metadata.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $RunPath,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $BackendName,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $BackendVersion
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
    throw 'This metadata helper requires Windows.'
}
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$directory = if ([IO.Path]::IsPathRooted($RunPath)) { $RunPath } else { Join-Path $repoRoot $RunPath }
$directory = (Resolve-Path -LiteralPath $directory).Path
$manifestPath = Join-Path $directory 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Evaluation manifest not found: $manifestPath"
}
$lockPath = Join-Path $directory '.lock'
try {
    # Share the evaluator's lock convention, including its exclusive creation.
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
}
catch [IO.IOException] {
    throw "Cannot lock $directory. Wait for the evaluation to stop and its .lock to disappear."
}
try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $manifest.PSObject.Properties['environment'] -or $null -eq $manifest.environment) {
        throw 'The manifest has no environment object to annotate.'
    }
    $processorNames = @(Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty Name -Unique | ForEach-Object { $_.Trim() })
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    if (-not $processorNames.Count -or $os.TotalVisibleMemorySize -le 0) {
        throw 'Windows did not report a CPU name and usable RAM capacity.'
    }
    if (-not $manifest.PSObject.Properties['originalEnvironment']) {
        $original = $manifest.environment | ConvertTo-Json -Depth 100 | ConvertFrom-Json
        $manifest | Add-Member -NotePropertyName originalEnvironment -NotePropertyValue $original
    }
    $manifest.environment | Add-Member -NotePropertyName cpu -NotePropertyValue ($processorNames -join '; ') -Force
    $manifest.environment | Add-Member -NotePropertyName os -NotePropertyValue "$($os.Caption) $($os.Version) (build $($os.BuildNumber))" -Force
    $manifest.environment | Add-Member -NotePropertyName memoryGiB -NotePropertyValue ([Math]::Round($os.TotalVisibleMemorySize / 1MB, 3)) -Force
    $manifest | Add-Member -NotePropertyName backendName -NotePropertyValue $BackendName -Force
    $manifest | Add-Member -NotePropertyName backendVersion -NotePropertyValue $BackendVersion -Force
    [IO.File]::WriteAllText($manifestPath, (($manifest | ConvertTo-Json -Depth 100) + "`n"), [Text.UTF8Encoding]::new($false))
    Write-Host "Annotated $manifestPath. Regenerate its report with scripts/eval/report.ts."
}
finally {
    $lock.Dispose()
    Remove-Item -LiteralPath $lockPath -Force
}
