#!/usr/bin/env node
// =============================================================================
// Brilion - AWS One-Time Setup Script (Node/Bun)
// Creates: ECR repo, OIDC provider, IAM roles, App Runner service
// Usage: bun scripts/aws-setup.mjs
// =============================================================================

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const REGION = "us-east-1";
const APP_NAME = "brilion";
const GITHUB_ORG = "akashmahlaz";
const GITHUB_REPO = "brilion";

const tempDir = join(tmpdir(), "brilion-aws-setup");
mkdirSync(tempDir, { recursive: true });

// --- Helpers ---
function aws(cmd) {
  try {
    const out = execSync(`aws ${cmd}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return out.trim();
  } catch (e) {
    const stderr = e.stderr?.toString() || e.message;
    throw new Error(stderr.trim());
  }
}

function awsJson(cmd) {
  return JSON.parse(aws(cmd));
}

function step(msg) { console.log(`\n\x1b[36m==> ${msg}\x1b[0m`); }
function ok(msg)   { console.log(`  \x1b[32mOK: ${msg}\x1b[0m`); }
function info(msg) { console.log(`  \x1b[90m-> ${msg}\x1b[0m`); }
function warn(msg) { console.log(`  \x1b[33mWARN: ${msg}\x1b[0m`); }
function err(msg)  { console.log(`  \x1b[31mERROR: ${msg}\x1b[0m`); }

function writeJsonTemp(name, data) {
  const path = join(tempDir, name);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  return path;
}

// =============================================================================
// 0. Verify credentials
// =============================================================================
step("Verifying AWS credentials...");
let accountId;
try {
  const identity = awsJson("sts get-caller-identity --output json");
  accountId = identity.Account;
  ok(`Account: ${accountId} | Region: ${REGION}`);
} catch (e) {
  err("aws sts get-caller-identity failed. Run 'aws configure' first.");
  err(e.message);
  process.exit(1);
}

// =============================================================================
// 1. Create ECR Repository
// =============================================================================
step(`Creating ECR repository: ${APP_NAME}`);
let ecrUri;
try {
  const ecr = awsJson(`ecr describe-repositories --repository-names ${APP_NAME} --region ${REGION} --output json`);
  ecrUri = ecr.repositories[0].repositoryUri;
  info(`Already exists: ${ecrUri}`);
} catch {
  const ecr = awsJson(`ecr create-repository --repository-name ${APP_NAME} --region ${REGION} --image-scanning-configuration scanOnPush=true --output json`);
  ecrUri = ecr.repository.repositoryUri;
  ok(`Created: ${ecrUri}`);
}

// =============================================================================
// 2. ECR Lifecycle Policy
// =============================================================================
step("Setting ECR lifecycle policy...");
const lifecyclePolicy = {
  rules: [{
    rulePriority: 1,
    description: "Keep last 10 images",
    selection: { tagStatus: "any", countType: "imageCountMoreThan", countNumber: 10 },
    action: { type: "expire" },
  }],
};
const lifecycleFile = writeJsonTemp("lifecycle.json", lifecyclePolicy);
try {
  aws(`ecr put-lifecycle-policy --repository-name ${APP_NAME} --region ${REGION} --lifecycle-policy-text file://${lifecycleFile}`);
  ok("Lifecycle policy set");
} catch (e) {
  warn(`Lifecycle policy: ${e.message}`);
}

// =============================================================================
// 3. GitHub OIDC Provider
// =============================================================================
step("Setting up GitHub OIDC provider...");
const oidcArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`;
try {
  const providers = awsJson("iam list-open-id-connect-providers --output json");
  const exists = providers.OpenIDConnectProviderList?.some(p => p.Arn.includes("token.actions.githubusercontent.com"));
  if (exists) {
    info("OIDC provider already exists");
  } else {
    aws('iam create-open-id-connect-provider --url "https://token.actions.githubusercontent.com" --client-id-list "sts.amazonaws.com" --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"');
    ok("OIDC provider created");
  }
} catch (e) {
  err(`OIDC provider: ${e.message}`);
}

// =============================================================================
// 4. IAM Role for GitHub Actions
// =============================================================================
step(`Creating IAM role: github-actions-${APP_NAME}`);
const roleName = `github-actions-${APP_NAME}`;
const trustPolicy = {
  Version: "2012-10-17",
  Statement: [{
    Effect: "Allow",
    Principal: { Federated: oidcArn },
    Action: "sts:AssumeRoleWithWebIdentity",
    Condition: {
      StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      StringLike: { "token.actions.githubusercontent.com:sub": `repo:${GITHUB_ORG}/${GITHUB_REPO}:*` },
    },
  }],
};
const trustFile = writeJsonTemp("trust-policy.json", trustPolicy);

let roleArn = "";
try {
  const role = awsJson(`iam get-role --role-name ${roleName} --output json`);
  roleArn = role.Role.Arn;
  info(`Role already exists: ${roleArn}`);
} catch {
  try {
    const role = awsJson(`iam create-role --role-name ${roleName} --assume-role-policy-document file://${trustFile} --output json`);
    roleArn = role.Role.Arn;
    ok(`Created role: ${roleArn}`);
  } catch (e) {
    err(`Create role failed: ${e.message}`);
  }
}

// =============================================================================
// 5. Attach Policies
// =============================================================================
step("Attaching IAM policies...");
if (roleArn) {
  for (const policyArn of [
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser",
    "arn:aws:iam::aws:policy/AWSAppRunnerFullAccess",
  ]) {
    try {
      aws(`iam attach-role-policy --role-name ${roleName} --policy-arn ${policyArn}`);
      ok(`Attached: ${policyArn}`);
    } catch (e) {
      err(`Attach ${policyArn}: ${e.message}`);
    }
  }
} else {
  warn("Skipping - no role was created");
}

// =============================================================================
// 6. App Runner ECR Access Role
// =============================================================================
step("Creating App Runner ECR access role...");
const appRunnerRoleName = "AppRunnerECRAccessRole";
const appRunnerTrust = {
  Version: "2012-10-17",
  Statement: [{
    Effect: "Allow",
    Principal: { Service: "build.apprunner.amazonaws.com" },
    Action: "sts:AssumeRole",
  }],
};
const appRunnerTrustFile = writeJsonTemp("apprunner-trust.json", appRunnerTrust);

let appRunnerRoleArn = "";
try {
  const role = awsJson(`iam get-role --role-name ${appRunnerRoleName} --output json`);
  appRunnerRoleArn = role.Role.Arn;
  info(`Already exists: ${appRunnerRoleArn}`);
} catch {
  try {
    const role = awsJson(`iam create-role --role-name ${appRunnerRoleName} --assume-role-policy-document file://${appRunnerTrustFile} --output json`);
    appRunnerRoleArn = role.Role.Arn;
    aws(`iam attach-role-policy --role-name ${appRunnerRoleName} --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess`);
    ok(`Created: ${appRunnerRoleArn}`);
  } catch (e) {
    err(`App Runner role: ${e.message}`);
  }
}

// =============================================================================
// 7. App Runner Service
// =============================================================================
step(`Creating App Runner service: ${APP_NAME}`);
let appRunnerArn = "";
if (appRunnerRoleArn && ecrUri) {
  // Check if service already exists
  try {
    const list = awsJson(`apprunner list-services --region ${REGION} --output json`);
    const existing = list.ServiceSummaryList?.find(s => s.ServiceName === APP_NAME);
    if (existing) {
      appRunnerArn = existing.ServiceArn;
      info(`Already exists: ${appRunnerArn}`);
    }
  } catch {}

  if (!appRunnerArn) {
    // Check if ECR has an image (App Runner needs at least one)
    try {
      const images = awsJson(`ecr list-images --repository-name ${APP_NAME} --region ${REGION} --output json`);
      if (!images.imageIds || images.imageIds.length === 0) {
        warn("No images in ECR yet. Push an image first via GitHub Actions.");
        info("After first push, run this script again to create the App Runner service.");
      } else {
        const serviceConfig = {
          ServiceName: APP_NAME,
          SourceConfiguration: {
            AuthenticationConfiguration: { AccessRoleArn: appRunnerRoleArn },
            AutoDeploymentsEnabled: true,
            ImageRepository: {
              ImageIdentifier: `${ecrUri}:latest`,
              ImageConfiguration: { Port: "3000", RuntimeEnvironmentVariables: { NODE_ENV: "production" } },
              ImageRepositoryType: "ECR",
            },
          },
          InstanceConfiguration: { Cpu: "1024", Memory: "2048" },
          HealthCheckConfiguration: { Protocol: "HTTP", Path: "/api/health", Interval: 10, Timeout: 5, HealthyThreshold: 1, UnhealthyThreshold: 5 },
          Tags: [{ Key: "app", Value: APP_NAME }],
        };
        const serviceFile = writeJsonTemp("apprunner-service.json", serviceConfig);
        const svc = awsJson(`apprunner create-service --cli-input-json file://${serviceFile} --region ${REGION} --output json`);
        appRunnerArn = svc.Service.ServiceArn;
        ok(`Created: ${appRunnerArn}`);
        ok(`URL: https://${svc.Service.ServiceUrl}`);
      }
    } catch (e) {
      err(`App Runner service: ${e.message}`);
    }
  }
} else {
  warn("Skipping - missing App Runner role or ECR URI");
}

// =============================================================================
// 8. Summary
// =============================================================================
console.log("\n" + "=".repeat(70));
console.log("  SETUP COMPLETE");
console.log("=".repeat(70));
console.log(`\n  ECR Repository: ${ecrUri}`);
if (roleArn) {
  console.log(`\n  \x1b[33mAdd these GitHub Secrets:\x1b[0m`);
  console.log(`  https://github.com/${GITHUB_ORG}/${GITHUB_REPO}/settings/secrets/actions\n`);
  console.log(`  AWS_ROLE_ARN            = ${roleArn}`);
  if (appRunnerArn) {
    console.log(`  APP_RUNNER_SERVICE_ARN  = ${appRunnerArn}`);
  }
} else {
  console.log("\n  \x1b[31mWARNING: IAM role was not created. Check errors above.\x1b[0m");
}
console.log(`\n  Next steps:`);
console.log(`  1. Add the GitHub secrets above`);
console.log(`  2. Set env vars in App Runner console (MONGODB_URI, AUTH_SECRET, etc.)`);
console.log(`  3. git push origin main -> auto-deploy\n`);

// Cleanup
try { rmSync(tempDir, { recursive: true }); } catch {}
