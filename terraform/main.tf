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

# Security Group for EC2 Instance
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg-${var.environment}"
  description = "Security group for Architect Transcript Insights EC2 instance"
  vpc_id      = var.vpc_id

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_ips
  }

  # HTTP from ALB
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Application ports from ALB
  ingress {
    description     = "App port from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  ingress {
    description     = "API port from ALB"
    from_port       = var.api_port
    to_port         = var.api_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.app_name}-ec2-sg"
    Environment = var.environment
  })
}

# Security Group for ALB
resource "aws_security_group" "alb_sg" {
  name        = "${var.app_name}-alb-sg-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTP from anywhere
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS from anywhere
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name        = "${var.app_name}-alb-sg"
    Environment = var.environment
  })
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

# Route 53 Hosted Zone (assumes melvin-jones.com already exists)
data "aws_route53_zone" "main" {
  name         = "melvin-jones.com"
  private_zone = false
}

# ACM Certificate for insights.melvin-jones.com
resource "aws_acm_certificate" "insights_cert" {
  domain_name       = "insights.melvin-jones.com"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.insights.melvin-jones.com"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "insights.melvin-jones.com"
    Environment = var.environment
  }
}

# Certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.insights_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "insights_cert" {
  certificate_arn         = aws_acm_certificate.insights_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Cognito User Pool for Authentication (now required)
resource "aws_cognito_user_pool" "app_pool" {
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
  username_attributes      = ["email"]

  # Add admin user configuration
  admin_create_user_config {
    allow_admin_create_user_only = false
    
    invite_message_template {
      email_message = "Your username is {username} and temporary password is {####}. Please login at https://insights.melvin-jones.com"
      email_subject = "Your Architect Transcript Insights account"
    }
  }

  # Email verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code for Architect Transcript Insights is {####}"
    email_subject        = "Verify your Architect Transcript Insights account"
  }

  tags = {
    Name        = "${var.app_name}-cognito"
    Environment = var.environment
    Domain      = "insights.melvin-jones.com"
  }
}

resource "aws_cognito_user_pool_client" "app_client" {
  name         = "${var.app_name}-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.app_pool.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"

  # OAuth configuration for web app
  supported_identity_providers = ["COGNITO"]
  
  callback_urls = [
    "https://insights.melvin-jones.com/auth/callback",
    "http://localhost:3000/auth/callback"
  ]
  
  logout_urls = [
    "https://insights.melvin-jones.com/auth/logout",
    "http://localhost:3000/auth/logout"
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  generate_secret = true

  # Token validity in hours (AWS Provider 5.x default unit)
  access_token_validity  = 1     # 1 hour (valid: 0.083-24 hours)
  id_token_validity      = 1     # 1 hour (valid: 0.083-24 hours)
  refresh_token_validity = 720   # 30 days in hours (valid: 1-87600 hours)
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "app_domain" {
  domain       = "insights-${var.environment}-${random_string.cognito_suffix.result}"
  user_pool_id = aws_cognito_user_pool.app_pool.id
}

resource "random_string" "cognito_suffix" {
  length  = 8
  special = false
  upper   = false
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
    bucket_name  = aws_s3_bucket.transcripts.id
    region       = var.aws_region
    environment  = var.environment
    SERVICE_NAME = "architect-transcript"
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

# Application Load Balancer (required for custom domain)
resource "aws_lb" "app_alb" {
  name               = "architect-transcript-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false
  enable_http2              = true

  tags = merge(var.tags, {
    Name        = "${var.app_name}-alb"
    Environment = var.environment
    Domain      = "insights.melvin-jones.com"
  })
}

# Target Group for Frontend (React App)
resource "aws_lb_target_group" "app_tg" {
  name     = "architect-transcript-app-tg"
  port     = var.app_port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = "/"
    matcher             = "200"
    protocol            = "HTTP"
    port                = "traffic-port"
  }

  tags = merge(var.tags, {
    Name        = "${var.app_name}-app-tg"
    Environment = var.environment
  })
}

# Target Group for API Server
resource "aws_lb_target_group" "api_tg" {
  name     = "architect-transcript-api-tg"
  port     = var.api_port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = "/health"
    matcher             = "200"
    protocol            = "HTTP"
    port                = "traffic-port"
  }

  tags = merge(var.tags, {
    Name        = "${var.app_name}-api-tg"
    Environment = var.environment
  })
}

# HTTP Listener (redirects to HTTPS)
resource "aws_lb_listener" "app_listener_http" {
  load_balancer_arn = aws_lb.app_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener with routing rules
resource "aws_lb_listener" "app_listener_https" {
  load_balancer_arn = aws_lb.app_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate_validation.insights_cert.certificate_arn

  # Default action - forward to frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app_tg.arn
  }
}

# HTTPS Listener Rule for API paths
resource "aws_lb_listener_rule" "api_rule" {
  listener_arn = aws_lb_listener.app_listener_https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health"]
    }
  }
}

# Route 53 Record for insights.melvin-jones.com
resource "aws_route53_record" "insights" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "insights.melvin-jones.com"
  type    = "A"

  alias {
    name                   = aws_lb.app_alb.dns_name
    zone_id                = aws_lb.app_alb.zone_id
    evaluate_target_health = true
  }
}

# Attach EC2 instance to frontend target group
resource "aws_lb_target_group_attachment" "app_target_attachment" {
  count            = var.deploy_ec2 ? 1 : 0
  target_group_arn = aws_lb_target_group.app_tg.arn
  target_id        = aws_instance.app_server[0].id
  port             = var.app_port
}

# Attach EC2 instance to API target group
resource "aws_lb_target_group_attachment" "api_target_attachment" {
  count            = var.deploy_ec2 ? 1 : 0
  target_group_arn = aws_lb_target_group.api_tg.arn
  target_id        = aws_instance.app_server[0].id
  port             = var.api_port
}