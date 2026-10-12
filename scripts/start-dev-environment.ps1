# Sobe o ambiente local do Contferr sozinho no login do Windows: espera o
# Docker (que ja reinicia os containers do Supabase sozinho por causa da
# restart policy) ficar pronto, confirma o Supabase, sobe o "npm run dev" (o
# unico pedaco que NAO volta sozinho depois de reiniciar o PC) e abre o
# navegador quando a tela de login responder.
#
# Registrado como Tarefa Agendada ("ao fazer logon") - nao precisa mais pedir
# pro Claude "liberar o link" depois de reiniciar o computador.

$ErrorActionPreference = 'Continue'
$projeto = "D:\Projeto Contferr"
$logFile = Join-Path $projeto "scripts\start-dev-environment.log"
# Porta dedicada (D:\Projeto Contferr\package.json) - a 3000 tem outro
# projeto (Point07) que roda nessa mesma maquina e pode chegar la primeiro.
$url = "http://localhost:3010/login"

function Log($msg) {
    $linha = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $msg"
    Add-Content -Path $logFile -Value $linha
}

# So confia que "ja esta rodando" se quem respondeu de fato for o Contferr -
# uma porta poderia estar ocupada por outro projeto (ja aconteceu com o
# Point07 na 3000), e nesse caso o certo e subir o nosso mesmo assim, nao
# assumir que "algo respondeu" e desistir.
function EhContferr($resp) {
    return $resp.Content -match '<title>Contferr'
}

Log "Iniciando..."

# 1) Espera o Docker Desktop responder (o app ja esta configurado pra abrir
# sozinho no login do Windows; aqui so aguardamos o motor ficar pronto).
$maxEsperaDocker = 300
$esperado = 0
$dockerPronto = $false
while ($esperado -lt $maxEsperaDocker) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $dockerPronto = $true; break }
    Start-Sleep -Seconds 5
    $esperado += 5
}

if (-not $dockerPronto) {
    Log "Docker nao ficou pronto em $maxEsperaDocker s - abortando."
    exit 1
}
Log "Docker pronto apos $esperado s."

# 2) Confirma o Supabase local (idempotente - se os containers ja
# reiniciaram sozinhos, so confirma e retorna rapido).
Set-Location $projeto
$supabaseOut = & npx supabase start 2>&1
Log ("supabase start: " + ($supabaseOut -join ' | '))

# 3) So sobe o "npm run dev" se ele ainda nao estiver respondendo (evita
# abrir um segundo servidor se a tarefa rodar de novo ou o usuario ja tiver
# aberto manualmente).
$jaRespondia = $false
try {
    $resp = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing
    if (EhContferr $resp) {
        $jaRespondia = $true
        Log ("Contferr ja estava respondendo (status " + $resp.StatusCode + ") - nao abriu de novo.")
    }
    else {
        Log "Porta 3010 respondeu, mas nao e o Contferr (outro projeto?) - subindo o nosso mesmo assim."
    }
}
catch {
    Log "Contferr nao respondia - iniciando 'npm run dev'."
}

if (-not $jaRespondia) {
    Start-Process powershell -WindowStyle Minimized -ArgumentList "-NoExit", "-Command", "cd '$projeto'; npm run dev"

    # Espera a tela de login responder antes de abrir o navegador.
    $maxEsperaApp = 120
    $esperadoApp = 0
    $appPronto = $false
    while ($esperadoApp -lt $maxEsperaApp) {
        try {
            $r = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing
            if ($r.StatusCode -eq 200 -and (EhContferr $r)) { $appPronto = $true; break }
        }
        catch {}
        Start-Sleep -Seconds 3
        $esperadoApp += 3
    }
    if ($appPronto) {
        Log "Next.js pronto apos $esperadoApp s."
    }
    else {
        Log "Next.js nao respondeu em $maxEsperaApp s - abrindo o navegador mesmo assim."
    }
}

Start-Process $url
Log "Navegador aberto em $url. Fim."
