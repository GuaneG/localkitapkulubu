$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @('compose', '--project-name', 'localkitapkulubu-test', '--file', (Join-Path $projectRoot 'compose.yaml'))
$localDatabaseUrl = 'postgresql://local_test:local_test_only@127.0.0.1:55432/localkitapkulubu_test'

$dockerContextHost = & docker context inspect --format '{{.Endpoints.docker.Host}}'
if ($LASTEXITCODE -ne 0 -or $dockerContextHost -notmatch '^(npipe:////\./pipe/|unix:///)') {
    throw 'Select a local Docker context before running PostgreSQL tests.'
}
if ($env:DOCKER_HOST -and $env:DOCKER_HOST -notmatch '^(npipe:////\./pipe/|unix:///)') {
    throw 'DOCKER_HOST points outside the local Docker engine.'
}

& docker @composeArgs up --detach --wait --wait-timeout 90 postgres
if ($LASTEXITCODE -ne 0) { throw 'The dedicated PostgreSQL test container did not become healthy.' }

$publishedPort = & docker @composeArgs port postgres 5432
if ($LASTEXITCODE -ne 0 -or $publishedPort -ne '127.0.0.1:55432') {
    throw 'The Compose test service did not publish the expected loopback port.'
}

$previousTestUrl = $env:TEST_DATABASE_URL
$previousResetFlag = $env:ALLOW_TEST_DATABASE_RESET
Push-Location -LiteralPath $projectRoot
try {
    $env:TEST_DATABASE_URL = $localDatabaseUrl
    $env:ALLOW_TEST_DATABASE_RESET = '1'
    & pnpm test:integration
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL integration tests failed (exit $LASTEXITCODE)." }
} finally {
    $env:TEST_DATABASE_URL = $previousTestUrl
    $env:ALLOW_TEST_DATABASE_RESET = $previousResetFlag
    Pop-Location
}
