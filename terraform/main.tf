terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Bucket for Transcripts
resource "aws_s3_bucket" "transcripts" {
  bucket = var.bucket_name

  tags = {
    Name        = "Architect Transcript Storage"
    Application = "ArchitectTranscriptInsights"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Role for Application
resource "aws_iam_role" "app_role" {
  name = "${var.app_name}-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "ec2.amazonaws.com",
            "lambda.amazonaws.com",
            "ecs-tasks.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-role"
    Environment = var.environment
  }
}

# IAM Policy for Transcribe
resource "aws_iam_policy" "transcribe_policy" {
  name        = "${var.app_name}-transcribe-policy-${var.environment}"
  description = "Policy for AWS Transcribe access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartStreamTranscription",
          "transcribe:StartStreamTranscriptionWebSocket"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for Bedrock
resource "aws_iam_policy" "bedrock_policy" {
  name        = "${var.app_name}-bedrock-policy-${var.environment}"
  description = "Policy for AWS Bedrock access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet*"
      }
    ]
  })
}

# IAM Policy for S3
resource "aws_iam_policy" "s3_policy" {
  name        = "${var.app_name}-s3-policy-${var.environment}"
  description = "Policy for S3 bucket access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:PutObjectTagging",
          "s3:GetObjectTagging"
        ]
        Resource = [
          aws_s3_bucket.transcripts.arn,
          "${aws_s3_bucket.transcripts.arn}/*"
        ]
      }
    ]
  })
}

# IAM Policy for CloudWatch Logs
resource "aws_iam_policy" "logs_policy" {
  name        = "${var.app_name}-logs-policy-${var.environment}"
  description = "Policy for CloudWatch Logs access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      }
    ]
  })
}

# Attach policies to role
resource "aws_iam_role_policy_attachment" "transcribe_attachment" {
  policy_arn = aws_iam_policy.transcribe_policy.arn
  role       = aws_iam_role.app_role.name
}

resource "aws_iam_role_policy_attachment" "bedrock_attachment" {
  policy_arn = aws_iam_policy.bedrock_policy.arn
  role       = aws_iam_role.app_role.name
}

resource "aws_iam_role_policy_attachment" "s3_attachment" {
  policy_arn = aws_iam_policy.s3_policy.arn
  role       = aws_iam_role.app_role.name
}

resource "aws_iam_role_policy_attachment" "logs_attachment" {
  policy_arn = aws_iam_policy.logs_policy.arn
  role       = aws_iam_role.app_role.name
}

# Instance Profile for EC2
resource "aws_iam_instance_profile" "app_profile" {
  name = "${var.app_name}-profile-${var.environment}"
  role = aws_iam_role.app_role.name
}

# Security Group
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg-${var.environment}"
  description = "Security group for Architect Transcript Insights application"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Application Ports"
    from_port   = 3000
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = var.allowed_ips
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-sg"
    Environment = var.environment
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/application/${var.app_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.app_name}-logs"
    Environment = var.environment
  }
}

# SSM Parameters for Configuration
resource "aws_ssm_parameter" "s3_bucket" {
  name        = "/${var.app_name}/${var.environment}/s3-bucket"
  description = "S3 bucket name for transcript storage"
  type        = "String"
  value       = aws_s3_bucket.transcripts.id

  tags = {
    Name        = "${var.app_name}-s3-bucket-param"
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "aws_region" {
  name        = "/${var.app_name}/${var.environment}/aws-region"
  description = "AWS region for services"
  type        = "String"
  value       = var.aws_region

  tags = {
    Name        = "${var.app_name}-region-param"
    Environment = var.environment
  }
}

# Optional: Cognito User Pool for Authentication
resource "aws_cognito_user_pool" "app_pool" {
  count = var.enable_cognito ? 1 : 0
  
  name = "${var.app_name}-users-${var.environment}"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  auto_verified_attributes = ["email"]
  
  username_attributes = ["email"]

  tags = {
    Name        = "${var.app_name}-cognito"
    Environment = var.environment
  }
}

resource "aws_cognito_user_pool_client" "app_client" {
  count = var.enable_cognito ? 1 : 0

  name         = "${var.app_name}-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.app_pool[0].id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
}

# Optional: EC2 Instance for deployment
resource "aws_instance" "app_server" {
  count = var.deploy_ec2 ? 1 : 0

  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = var.instance_type
  iam_instance_profile   = aws_iam_instance_profile.app_profile.name
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  key_name              = var.key_pair_name

  user_data = templatefile("${path.module}/user_data.sh", {
    bucket_name = aws_s3_bucket.transcripts.id
    region      = var.aws_region
    environment = var.environment
  })

  tags = {
    Name        = "${var.app_name}-server-${var.environment}"
    Environment = var.environment
  }
}

# Data source for AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Optional: Application Load Balancer
resource "aws_lb" "app_alb" {
  count = var.enable_alb ? 1 : 0

  name               = "${var.app_name}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app_sg.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false
  enable_http2              = true

  tags = {
    Name        = "${var.app_name}-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "app_tg" {
  count = var.enable_alb ? 1 : 0

  name     = "${var.app_name}-tg-${var.environment}"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name        = "${var.app_name}-tg"
    Environment = var.environment
  }
}

resource "aws_lb_listener" "app_listener" {
  count = var.enable_alb ? 1 : 0

  load_balancer_arn = aws_lb.app_alb[0].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg[0].arn
  }
}