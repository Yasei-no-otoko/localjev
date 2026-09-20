#Requires -Version 5.1
<#
.SYNOPSIS
Build the pinned ROCmFPX server for gfx1151 with an installed Windows ROCm SDK.
.DESCRIPTION
Requires an existing source checkout, AMD ROCm SDK, Visual Studio C++ tools,
CMake and Ninja. Applies the repository's HTTP patches idempotently and runs
the standalone diffusion output regression test.
Does not download dependencies or alter the installed SDK.
#>
[CmdletBinding()]
param(
    [string] $SourcePath = '.runtime\ROCmFPX',
    [string] $BuildPath = '.runtime\rocmfpx-build',
    [string] $RocmPath = "$env:LOCALAPPDATA\Programs\Python\Python313\Lib\site-packages\_rocm_sdk_devel",
    [string] $VisualStudioPath = 'C:\Program Files\Microsoft Visual Studio\2022\Community',
    [string] $CMakePath = 'cmake.exe',
    [string] $NinjaPath = 'ninja.exe',
    [ValidateRange(32, 1024)]
    [int] $BuildJobs = 32,
    [switch] $ConfigureOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$revision = 'c49ebdbd5c9f01ec242369f9e7f7967855f80cba'

function Resolve-LocalPath([string] $Path) {
    if ([System.IO.Path]::IsPathRooted($Path)) { return [System.IO.Path]::GetFullPath($Path) }
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
}

function Resolve-BuildTool([string] $Path) {
    if ([System.IO.Path]::IsPathRooted($Path) -or $Path.Contains('\') -or $Path.Contains('/')) {
        $resolved = Resolve-LocalPath $Path
        if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw "Build tool not found: $resolved" }
        return $resolved
    }
    $command = Get-Command -Name $Path -CommandType Application -ErrorAction Stop
    return @($command)[0].Source
}

if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
    throw 'This helper requires Windows.'
}
$source = Resolve-LocalPath $SourcePath
$build = Resolve-LocalPath $BuildPath
$sdk = Resolve-LocalPath $RocmPath
$cmake = Resolve-BuildTool $CMakePath
$ninja = Resolve-BuildTool $NinjaPath
$git = Resolve-BuildTool 'git.exe'
$devShell = Join-Path (Resolve-LocalPath $VisualStudioPath) 'Common7\Tools\Launch-VsDevShell.ps1'
$clang = Join-Path $sdk 'lib\llvm\bin\clang.exe'
$clangCxx = Join-Path $sdk 'lib\llvm\bin\clang++.exe'
$patches = @(
    (Join-Path $PSScriptRoot 'rocmfpx-http.patch'),
    (Join-Path $PSScriptRoot 'rocmfpx-json-output.patch')
)
foreach ($required in @(
    (Join-Path $source 'CMakeLists.txt'), $devShell, $clang, $clangCxx,
    (Join-Path $sdk 'include\hip\hip_runtime.h'),
    (Join-Path $sdk 'lib\cmake\hip\hip-config.cmake'),
    (Join-Path $sdk 'lib\cmake\hipblas\hipblas-config.cmake'),
    (Join-Path $sdk 'lib\cmake\rocblas\rocblas-config.cmake'),
    (Join-Path $sdk 'lib\llvm\amdgcn\bitcode\oclc_abi_version_400.bc')
) + $patches) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Required build input missing: $required" }
}
if ($source.TrimEnd('\') -eq $build.TrimEnd('\')) { throw 'Use a separate build directory.' }
$actualRevision = & $git -C $source rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or "$actualRevision".Trim() -ne $revision) {
    throw "ROCmFPX must be checked out at $revision; observed $actualRevision."
}

# A failed reverse check is expected on a fresh checkout. PowerShell 5.1 treats
# native stderr as an error even when it is redirected, so handle that probe.
function Test-PatchApplied([string] $PatchPath) {
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $git -C $source apply --reverse --check --quiet $PatchPath 2>$null
        return $LASTEXITCODE -eq 0
    }
    finally { $ErrorActionPreference = $previousErrorAction }
}

# The output patch changes a line added by the first patch. Check the final
# patch first so an already upgraded checkout does not reapply the first patch.
if (Test-PatchApplied $patches[-1]) {
    Write-Host 'ROCmFPX HTTP and JSON output patches are already applied.'
}
else {
    foreach ($patch in $patches) {
        $patchName = Split-Path -Leaf $patch
        if (Test-PatchApplied $patch) {
            Write-Host "$patchName is already applied."
        }
        else {
            & $git -C $source apply --check $patch
            if ($LASTEXITCODE -ne 0) { throw "$patchName conflicts with this source checkout." }
            & $git -C $source apply $patch
            if ($LASTEXITCODE -ne 0) { throw "Unable to apply $patchName." }
        }
    }
}

$savedEnvironment = @{}
Get-ChildItem Env: | ForEach-Object { $savedEnvironment[$_.Name] = $_.Value }
try {
    & $devShell -Arch amd64 -HostArch amd64 -SkipAutomaticLocation
    if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) { throw 'MSVC x64 environment initialization failed.' }
    $env:HIP_PATH = $sdk
    $env:ROCM_PATH = $sdk
    $env:HIP_PLATFORM = 'amd'
    $env:HIP_DEVICE_LIB_PATH = Join-Path $sdk 'lib\llvm\amdgcn\bitcode'
    $env:CMAKE_BUILD_PARALLEL_LEVEL = "$BuildJobs"
    $env:PATH = "$sdk\bin;$sdk\lib\llvm\bin;$env:PATH"
    $sdkCmake = $sdk.Replace('\', '/')
    $configure = @(
        '-S', $source, '-B', $build, '-G', 'Ninja',
        "-DCMAKE_MAKE_PROGRAM=$ninja",
        "-DCMAKE_C_COMPILER=$clang", "-DCMAKE_CXX_COMPILER=$clangCxx",
        '-DCMAKE_BUILD_TYPE=Release', "-DCMAKE_PREFIX_PATH=$sdkCmake",
        "-DHIP_PATH=$sdkCmake", '-DHIP_PLATFORM=amd', '-DGPU_TARGETS=gfx1151',
        '-DGGML_HIP=ON', '-DGGML_HIP_FORCE_MMQ=ON', '-DGGML_HIP_ROCWMMA_FATTN=OFF',
        '-DGGML_HIP_ROCMI4_W4A4=OFF', '-DGGML_CUDA=OFF', '-DGGML_VULKAN=OFF',
        '-DGGML_STATIC=OFF', '-DGGML_BUILD_TESTS=OFF',
        '-DLLAMA_BUILD_SERVER=ON', '-DLLAMA_BUILD_EXAMPLES=OFF', '-DLLAMA_BUILD_TESTS=ON',
        '-DLLAMA_BUILD_WEBUI=OFF', '-DLLAMA_USE_PREBUILT_WEBUI=OFF', '-DLLAMA_OPENSSL=OFF'
    )
    Write-Host "Configuring ROCmFPX $revision for gfx1151 using $sdk"
    & $cmake @configure
    if ($LASTEXITCODE -ne 0) { throw 'ROCmFPX CMake configuration failed.' }
    if ($ConfigureOnly) { return }
    & $cmake --build $build --config Release --parallel $BuildJobs --target llama-server test-server-diffusion
    if ($LASTEXITCODE -ne 0) { throw 'ROCmFPX build failed.' }
    $server = Join-Path $build 'bin\llama-server.exe'
    if (-not (Test-Path -LiteralPath $server -PathType Leaf)) { throw "Build did not produce $server" }
    $outputTest = Join-Path $build 'bin\test-server-diffusion.exe'
    if (-not (Test-Path -LiteralPath $outputTest -PathType Leaf)) { throw "Build did not produce $outputTest" }
    & $outputTest
    if ($LASTEXITCODE -ne 0) { throw 'Diffusion output regression test failed.' }
    Write-Host "Built $server"
    Write-Host "Runtime DLL directory: $sdk\bin"
}
finally {
    foreach ($entry in @(Get-ChildItem Env:)) {
        if (-not $savedEnvironment.ContainsKey($entry.Name)) {
            [Environment]::SetEnvironmentVariable($entry.Name, $null, 'Process')
        }
    }
    foreach ($entry in $savedEnvironment.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
}
