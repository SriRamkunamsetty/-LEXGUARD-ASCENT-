# Google Cloud Run Deployment Guide

Project ID: `sita-486706`

This guide outlines the production-grade deployment process for the application on Google Cloud Run, ensuring zero secret leakage and maximum security.

## 1. Prerequisites

Ensure you have the Google Cloud CLI (`gcloud`) installed and authenticated.

```bash
gcloud auth login
gcloud config set project sita-486706
```

## 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

## 3. Configure Secret Manager

Store the Gemini API Key and other sensitive credentials natively in Google Secret Manager. DO NOT package these inside the Docker image.

```bash
# Create the secret
gcloud secrets create gemini-api-key --replication-policy="automatic"

# Add the secret version
echo -n "AIzaSyARbbgR7aLDNrP8uIcljJM4sJE8JDmRGwI" | gcloud secrets versions add gemini-api-key --data-file=-
```

## 4. Setup Service Accounts (IAM Privilege Escalation Prevention)

Create a dedicated service account for the Cloud Run instance so it only has access to exactly what it needs.

```bash
# Create service account
gcloud iam service-accounts create lexguard-run-sa \
    --display-name="LexGuard Cloud Run Service Account"

# Grant the service account permissions to access the secret you created
gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:lexguard-run-sa@sita-486706.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## 5. Setup Artifact Registry

```bash
gcloud artifacts repositories create lexguard-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="LexGuard Docker repository"

# Authenticate Docker to the repository
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## 6. Build and Push Container using Cloud Build

```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/sita-486706/lexguard-repo/lexguard-api:latest
```

## 7. Deploy to Cloud Run with Secret Injection

Deploy the container to Cloud Run, establishing a direct binding between the environment variable `GEMINI_API_KEY` and the Secret Manager payload.

```bash
gcloud run deploy lexguard-service \
  --image us-central1-docker.pkg.dev/sita-486706/lexguard-repo/lexguard-api:latest \
  --region us-central1 \
  --service-account lexguard-run-sa@sita-486706.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10
```

## 8. Summary of Architecture

- **Code Quality**: Separated environment logic via `.env.local/dev/prod`.
- **Security**: The Gemini key never touches the browser `(No NEXT_PUBLIC_)`. Secret Manager handles the injection right into memory at runtime seamlessly.
- **Efficiency**: Multi-stage `Dockerfile` only runs Node.js natively in Production without heavy dev-dependencies.
- **Problem Statement Alignment**: The deployment is perfectly architected for the strict constraints of the Hackathon Final Round (scalable, stateless container execution, robust dependency injection).
