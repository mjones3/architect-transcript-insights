variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "architect-transcript-insights"
}

variable "bucket_name" {
  description = "S3 bucket name for storing transcripts"
  type        = string
  default     = "architect-transcripts"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "allowed_ips" {
  description = "List of allowed IP addresses for application access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_cognito" {
  description = "Enable AWS Cognito for authentication"
  type        = bool
  default     = true
}

variable "deploy_ec2" {
  description = "Deploy application on EC2 instance"
  type        = bool
  default     = true
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH access"
  type        = string
  default     = ""
}

variable "enable_alb" {
  description = "Enable Application Load Balancer"
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "VPC ID for ALB (required if enable_alb is true)"
  type        = string
  default     = ""
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB (required if enable_alb is true)"
  type        = list(string)
  default     = []
}

variable "ssh_allowed_ips" {
  description = "List of IP addresses allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Restrict this in production
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "api_port" {
  description = "API server port"
  type        = number
  default     = 3001
}

variable "enable_cloudwatch_agent" {
  description = "Install and configure CloudWatch agent"
  type        = bool
  default     = true
}

variable "enable_ssl_redirect" {
  description = "Force HTTPS redirect from HTTP"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {
    Project = "ArchitectTranscriptInsights"
    Owner   = "SolutionArchitect"
  }
}