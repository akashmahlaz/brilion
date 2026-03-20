# =============================================================================
# Brilion — AWS One-Time Setup Script
# Run once to create: IAM OIDC role, ECR repo, App Runner service
# =============================================================================
# Prerequisites:
#   1. Install AWS CLI: https://aws.amazon.com/cli/
#   2. Configure credentials: aws configure
#      (needs AdministratorAccess or scoped IAM + ECR + AppRunner permissions)
# Then run: .\scripts\aws-setup.ps1
# =============================================================================

param(
    [string]$Region = "us-east-1",
    [string]$AppName = "brilion",
    [string]$GitHubOrg = "akashmahlaz",
    [string]$GitHubRepo = "brilion"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  -> $msg" -ForegroundColor Gray }

# ── 0. Get Account ID ──────────────────────────────────────────────────────
Write-Step "Verifying AWS credentials..."
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
$AccountId = $identity.Account
Write-OK "Account: $AccountId | Region: $Region"

# ── 1. Create ECR Repository ───────────────────────────────────────────────
Write-Step "Creating ECR repository: $AppName"
try {
    $ecr = aws ecr describe-repositories --repository-names $AppName --region $Region --output json 2>$null | ConvertFrom-Json
    $EcrUri = $ecr.repositories[0].repositoryUri
    Write-Info "Already exists: $EcrUri"
} catch {
    $ecr = aws ecr create-repository `
        --repository-name $AppName `
        --region $Region `
        --image-scanning-configuration scanOnPush=true `
        --output json | ConvertFrom-Json
    $EcrUri = $ecr.repository.repositoryUri
    Write-OK "Created: $EcrUri"
}

# ── 2. Set ECR lifecycle policy (keep last 10 images) ─────────────────────
Write-Step "Setting ECR lifecycle policy..."
$lifecyclePolicy = @{
    rules = @(@{
        rulePriority = 1
        description = "Keep last 10 images"
        selection = @{ tagStatus = "any"; countType = "imageCountMoreThan"; countNumber = 10 }
        action = @{ type = "expire" }
    })
} | ConvertTo-Json -Depth 10 -Compress

aws ecr put-lifecycle-policy `
    --repository-name $AppName `
    --region $Region `
    --lifecycle-policy-text $lifecyclePolicy | Out-Null
Write-OK "Lifecycle policy set"

# ── 3. Create GitHub OIDC Provider (idempotent) ───────────────────────────
Write-Step "Setting up GitHub OIDC provider..."
$oidcArn = "arn:aws:iam::${AccountId}:oidc-provider/token.actions.githubusercontent.com"
$existingProviders = aws iam list-open-id-connect-providers --output json | ConvertFrom-Json
$oidcExists = $existingProviders.OpenIDConnectProviderList | Where-Object { $_.Arn -eq $oidcArn }

if (-not $oidcExists) {
    aws iam create-open-id-connect-provider `
        --url "https://token.actions.githubusercontent.com" `
        --client-id-list "sts.amazonaws.com" `
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" | Out-Null
    Write-OK "OIDC provider created"
} else {
    Write-Info "OIDC provider already exists"
}

# ── 4. Create IAM Role for GitHub Actions ─────────────────────────────────
Write-Step "Creating IAM role: github-actions-$AppName"
$roleName = "github-actions-$AppName"

$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(@{
        Effect = "Allow"
        Principal = @{ Federated = $oidcArn }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = @{
            StringEquals = @{ "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
            StringLike   = @{ "token.actions.githubusercontent.com:sub" = "repo:${GitHubOrg}/${GitHubRepo}:*" }
        }
    })
} | ConvertTo-Json -Depth 10 -Compress

try {
    $role = aws iam get-role --role-name $roleName --output json 2>$null | ConvertFrom-Json
    $RoleArn = $role.Role.Arn
    Write-Info "Role already exists: $RoleArn"
} catch {
    $role = aws iam create-role `
        --role-name $roleName `
        --assume-role-policy-document $trustPolicy `
        --output json | ConvertFrom-Json
    $RoleArn = $role.Role.Arn
    Write-OK "Created role: $RoleArn"
}

# ── 5. Attach policies to IAM role ────────────────────────────────────────
Write-Step "Attaching IAM policies..."
@(
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser",
    "arn:aws:iam::aws:policy/AWSAppRunnerFullAccess"
) | ForEach-Object {
    aws iam attach-role-policy --role-name $roleName --policy-arn $_ | Out-Null
    Write-OK "Attached: $_"
}

# ── 6. Create App Runner ECR Access Role ──────────────────────────────────
Write-Step "Creating App Runner ECR access role..."
$appRunnerRoleName = "AppRunnerECRAccessRole"

$appRunnerTrust = @{
    Version = "2012-10-17"
    Statement = @(@{
        Effect = "Allow"
        Principal = @{ Service = "build.apprunner.amazonaws.com" }
        Action = "sts:AssumeRole"
    })
} | ConvertTo-Json -Depth 10 -Compress

try {
    $appRunnerRole = aws iam get-role --role-name $appRunnerRoleName --output json 2>$null | ConvertFrom-Json
    $AppRunnerRoleArn = $appRunnerRole.Role.Arn
    Write-Info "App Runner role already exists: $AppRunnerRoleArn"
} catch {
    $appRunnerRole = aws iam create-role `
        --role-name $appRunnerRoleName `
        --assume-role-policy-document $appRunnerTrust `
        --output json | ConvertFrom-Json
    $AppRunnerRoleArn = $appRunnerRole.Role.Arn
    aws iam attach-role-policy `
        --role-name $appRunnerRoleName `
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess" | Out-Null
    Write-OK "Created App Runner ECR role: $AppRunnerRoleArn"
}

# ── 7. Create App Runner Service ───────────────────────────────────────────
Write-Step "Creating App Runner service: $AppName"

# Build initial placeholder env vars (user must update in console)
$envVars = @(
    @{ name = "NODE_ENV"; value = "production" }
)

$serviceConfig = @{
    ServiceName = $AppName
    SourceConfiguration = @{
        AuthenticationConfiguration = @{ AccessRoleArn = $AppRunnerRoleArn }
        AutoDeploymentsEnabled = $true
        ImageRepository = @{
            ImageIdentifier = "${EcrUri}:latest"
            ImageConfiguration = @{
                Port = "3000"
                RuntimeEnvironmentVariables = @{ NODE_ENV = "production" }
            }
            ImageRepositoryType = "ECR"
        }
    }
    InstanceConfiguration = @{
        Cpu = "1024"      # 1 vCPU
        Memory = "2048"   # 2 GB
    }
    HealthCheckConfiguration = @{
        Protocol = "HTTP"
        Path = "/api/health"
        Interval = 10
        Timeout = 5
        HealthyThreshold = 1
        UnhealthyThreshold = 5
    }
    Tags = @(@{ Key = "app"; Value = $AppName })
} | ConvertTo-Json -Depth 10 -Compress

try {
    $existing = aws apprunner list-services --region $Region --output json | ConvertFrom-Json
    $existingService = $existing.ServiceSummaryList | Where-Object { $_.ServiceName -eq $AppName }
    
    if ($existingService) {
        $AppRunnerArn = $existingService.ServiceArn
        Write-Info "Service already exists: $AppRunnerArn"
    } else {
        $service = aws apprunner create-service `
            --region $Region `
            --cli-input-json $serviceConfig `
            --output json | ConvertFrom-Json
        $AppRunnerArn = $service.Service.ServiceArn
        Write-OK "Created App Runner service: $AppRunnerArn"
        Write-Info "Service is provisioning... check console for URL"
    }
} catch {
    Write-Host "  WARNING: Could not create App Runner service. Create it manually in the console." -ForegroundColor Yellow
    Write-Info "ECR image: ${EcrUri}:latest"
    $AppRunnerArn = ""
}

# ── 8. Print GitHub Secrets to configure ──────────────────────────────────
Write-Host "`n" + "="*70 -ForegroundColor White
Write-Host "  SETUP COMPLETE — Add these secrets to GitHub:" -ForegroundColor Yellow
Write-Host "  https://github.com/$GitHubOrg/$GitHubRepo/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "="*70 -ForegroundColor White
Write-Host ""
Write-Host "  AWS_ROLE_ARN            = $RoleArn" -ForegroundColor White
if ($AppRunnerArn) {
    Write-Host "  APP_RUNNER_SERVICE_ARN  = $AppRunnerArn" -ForegroundColor White
}
Write-Host ""
Write-Host "  ECR Repository URI: $EcrUri" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Add the GitHub secrets above" -ForegroundColor White 
Write-Host "  2. Set all env vars in App Runner console (MONGODB_URI, AUTH_SECRET, etc.)" -ForegroundColor White
Write-Host "     https://console.aws.amazon.com/apprunner/home?region=$Region" -ForegroundColor Cyan
Write-Host "  3. git push origin main  →  auto-deploy fires" -ForegroundColor White
Write-Host ""
