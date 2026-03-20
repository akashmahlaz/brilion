# AWS Deployment — One-Time Setup Guide

## Option A: App Runner (Recommended — Simplest)

App Runner is AWS's managed container service — no servers, no clusters.  
Auto-deploys every time you push to `main`.

### Step 1 — Create IAM Role for GitHub OIDC

```bash
# Trust policy for GitHub Actions OIDC
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/brilion:*" }
    }
  }]
}
EOF

aws iam create-role --role-name github-actions-brilion --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name github-actions-brilion --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
aws iam attach-role-policy --role-name github-actions-brilion --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess
```

### Step 2 — Create ECR Repository

```bash
aws ecr create-repository --repository-name brilion --region us-east-1
# Note the repositoryUri from output
```

### Step 3 — Create App Runner Service (Console or CLI)

**In AWS Console:**
1. Go to App Runner → Create service
2. Source: Container registry → Amazon ECR
3. Repository: select `brilion`, tag: `latest`
4. Deployment trigger: **Automatic** (deploys on new image push)
5. CPU: 1 vCPU, Memory: 2 GB (minimum for Baileys/AI)
6. Port: 3000
7. Health check: `/api/health`
8. Add all env vars from `.env.example`

### Step 4 — Add GitHub Secrets

In GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/github-actions-brilion` |
| `APP_RUNNER_SERVICE_ARN` | From App Runner console after creation |

### Step 5 — Push to deploy

```bash
git push origin main
# GitHub Actions builds → pushes to ECR → App Runner auto-deploys
```

---

## Option B: ECS Fargate (For Persistent Uploads via EFS)

Use this if you need `/app/uploads` to persist across deployments.

### Step 1 — Create EFS Filesystem

```bash
aws efs create-file-system --creation-token brilion-uploads --tags Key=Name,Value=brilion-uploads
# Note the FileSystemId (fs-XXXXXXXX) → update ecs-task-definition.json
```

### Step 2 — Create ECS Cluster + Service

```bash
aws ecs create-cluster --cluster-name brilion

# Register task definition (edit ACCOUNT_ID first)
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service (needs ALB/VPC setup — see AWS ECS docs)
```

### Step 3 — Add ECS deploy step to GitHub Actions

Add to `.github/workflows/deploy.yml` after the ECR push:

```yaml
- name: Fill in new image in ECS task definition
  id: task-def
  uses: aws-actions/amazon-ecs-render-task-definition@v1
  with:
    task-definition: ecs-task-definition.json
    container-name: brilion
    image: ${{ steps.build-image.outputs.image }}

- name: Deploy to ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: ${{ steps.task-def.outputs.task-definition }}
    service: brilion-service
    cluster: brilion
    wait-for-service-stability: true
```

---

## Comparing AWS Options

| Feature | App Runner | ECS Fargate |
|---------|-----------|-------------|
| Setup complexity | Low | High |
| Auto-deploy from ECR | ✅ Native | Via GitHub Actions |
| Persistent file storage | ❌ No | ✅ EFS |
| Custom VPC config | Optional | Required |
| Min cost (always on) | ~$5/mo | ~$15/mo |
| WhatsApp sessions | Restart on redeploy | Survives if ECS rolling deploy |

**Recommendation:** Start with App Runner. Move to ECS if you need EFS for uploads persistence.

---

## Secrets Manager (Production Recommendation)

Instead of setting env vars in the console, use AWS SSM Parameter Store:

```bash
aws ssm put-parameter --name /brilion/MONGODB_URI --value "mongodb+srv://..." --type SecureString
aws ssm put-parameter --name /brilion/AUTH_SECRET --value "$(openssl rand -base64 32)" --type SecureString
# repeat for all secrets
```

Then update `ecs-task-definition.json` with your actual `ACCOUNT_ID` and region — the `secrets` array already references SSM paths.
