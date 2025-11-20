# Terraform Infrastructure for Architect Transcript Insights

This Terraform configuration provisions the AWS infrastructure needed for the Architect Transcript Insights tool.

## Prerequisites

1. **Terraform** >= 1.0 installed
2. **AWS CLI** configured with appropriate credentials
3. An AWS account with necessary permissions

## Quick Start

### 1. Configure Variables

Copy the example terraform variables file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific configuration:

```hcl
# Required
aws_region  = "us-east-1"
bucket_name = "your-unique-transcript-bucket-name"

# Optional
environment    = "production"
enable_cognito = false
deploy_ec2     = false
enable_alb     = false
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan the Deployment

```bash
terraform plan
```

### 4. Deploy Infrastructure

```bash
terraform apply
```

## Infrastructure Components

### Core Resources (Always Provisioned)

- **S3 Bucket**: Encrypted storage for transcripts with versioning
- **IAM Role & Policies**: Permissions for Transcribe, Bedrock, and S3
- **Security Group**: Network access control
- **CloudWatch Log Group**: Application logging
- **SSM Parameters**: Configuration storage

### Optional Resources

Enable these with variables in `terraform.tfvars`:

#### Cognito Authentication (`enable_cognito = true`)
- User Pool for application authentication
- User Pool Client for frontend integration

#### EC2 Deployment (`deploy_ec2 = true`)
- EC2 instance with application pre-configured
- Requires `key_pair_name` variable

#### Application Load Balancer (`enable_alb = true`)
- ALB for high availability
- Target group and listener configuration
- Requires `vpc_id` and `public_subnet_ids`

## Deployment Scenarios

### 1. Basic Infrastructure Only
```hcl
# terraform.tfvars
aws_region  = "us-east-1"
bucket_name = "my-transcript-bucket"
environment = "production"

# All optional features disabled (default)
```

### 2. Full EC2 Deployment
```hcl
# terraform.tfvars
aws_region     = "us-east-1"
bucket_name    = "my-transcript-bucket"
deploy_ec2     = true
key_pair_name  = "my-key-pair"
instance_type  = "t3.medium"
```

### 3. Production with Load Balancer
```hcl
# terraform.tfvars
aws_region  = "us-east-1"
bucket_name = "my-transcript-bucket"
deploy_ec2  = true
enable_alb  = true
vpc_id      = "vpc-12345678"
public_subnet_ids = ["subnet-12345", "subnet-67890"]
```

### 4. With Authentication
```hcl
# terraform.tfvars
aws_region     = "us-east-1"
bucket_name    = "my-transcript-bucket"
enable_cognito = true
deploy_ec2     = true
```

## Configuration Variables

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `aws_region` | string | AWS region | `"us-east-1"` |
| `bucket_name` | string | S3 bucket name (must be unique) | `"my-transcript-bucket"` |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `environment` | string | `"production"` | Environment name |
| `app_name` | string | `"architect-transcript-insights"` | Application name |
| `log_retention_days` | number | `30` | CloudWatch log retention |
| `allowed_ips` | list(string) | `["0.0.0.0/0"]` | Allowed IP addresses |
| `enable_cognito` | bool | `false` | Enable Cognito authentication |
| `deploy_ec2` | bool | `false` | Deploy on EC2 |
| `instance_type` | string | `"t3.medium"` | EC2 instance type |
| `key_pair_name` | string | `""` | EC2 key pair name |
| `enable_alb` | bool | `false` | Enable load balancer |
| `vpc_id` | string | `""` | VPC ID for ALB |
| `public_subnet_ids` | list(string) | `[]` | Subnet IDs for ALB |

## Outputs

After deployment, Terraform provides these outputs:

```bash
# View all outputs
terraform output

# View specific output
terraform output s3_bucket_name
```

### Key Outputs

- `s3_bucket_name`: S3 bucket for transcripts
- `iam_role_arn`: IAM role ARN for application
- `security_group_id`: Security group ID
- `ec2_public_ip`: EC2 instance IP (if deployed)
- `alb_dns_name`: Load balancer DNS (if enabled)
- `environment_config`: Environment variables for app

## Post-Deployment Steps

### 1. Configure Application

Use the Terraform outputs to configure your application:

```bash
# Get the configuration
terraform output environment_config

# Update your .env file with the values
```

### 2. Deploy Application (if using EC2)

```bash
# SSH to the instance
ssh -i your-key.pem ec2-user@$(terraform output -raw ec2_public_ip)

# Deploy your application
cd /opt/architect-transcript-insights
# Copy your application files here
npm install
cp .env.example .env
# Edit .env with your AWS credentials
npm run build
pm2 start npm --name 'transcript-app' -- start
```

### 3. Configure DNS (if using ALB)

Point your domain to the load balancer:

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Create CNAME record: app.yourdomain.com -> ALB DNS name
```

## Security Best Practices

### 1. Restrict IP Access

Update `allowed_ips` in `terraform.tfvars`:

```hcl
allowed_ips = [
  "203.0.113.0/24",  # Your office network
  "198.51.100.0/24"  # Another allowed network
]
```

### 2. Enable Encryption

The configuration automatically enables:
- S3 bucket encryption (AES256)
- S3 versioning for data protection
- Public access blocking on S3

### 3. Least Privilege IAM

IAM policies are scoped to minimum required permissions:
- Transcribe: Stream transcription only
- Bedrock: Claude model access only
- S3: Access to transcript bucket only

## Troubleshooting

### Common Issues

#### 1. S3 Bucket Name Already Exists
```bash
Error: BucketAlreadyExists
```
Solution: Change `bucket_name` to a unique value in `terraform.tfvars`

#### 2. Bedrock Model Access
```bash
Error: AccessDenied for bedrock:InvokeModel
```
Solution: Enable Bedrock model access in AWS console for your region

#### 3. EC2 Key Pair Not Found
```bash
Error: InvalidKeyPair.NotFound
```
Solution: Create an EC2 key pair or update `key_pair_name` in `terraform.tfvars`

### Destroy Infrastructure

To remove all resources:

```bash
terraform destroy
```

**Warning**: This will permanently delete all resources including S3 data.

## Support

For issues with the Terraform configuration, check:
1. AWS credentials and permissions
2. Region availability for services (especially Bedrock)
3. Variable validation in `variables.tf`

## Advanced Configuration

### Custom VPC

To deploy in a custom VPC, modify `main.tf` to accept VPC parameters or use data sources to reference existing VPC resources.

### Multi-Environment Setup

Use Terraform workspaces for multiple environments:

```bash
# Create workspace
terraform workspace new staging
terraform workspace new production

# Switch workspace
terraform workspace select staging

# Apply with workspace-specific tfvars
terraform apply -var-file="staging.tfvars"
```

### State Management

For team environments, configure remote state:

```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "architect-transcript-insights/terraform.tfstate"
    region = "us-east-1"
  }
}
```