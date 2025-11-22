output "s3_bucket_name" {
  description = "Name of the S3 bucket for transcripts"
  value       = aws_s3_bucket.transcripts.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for transcripts"
  value       = aws_s3_bucket.transcripts.arn
}

output "iam_role_name" {
  description = "Name of the IAM role"
  value       = aws_iam_role.app_role.name
}

output "iam_role_arn" {
  description = "ARN of the IAM role"
  value       = aws_iam_role.app_role.arn
}

output "instance_profile_name" {
  description = "Name of the IAM instance profile"
  value       = aws_iam_instance_profile.app_profile.name
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.app_sg.id
}

output "cloudwatch_log_group" {
  description = "CloudWatch Log Group name"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.app_pool.id
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.app_client.id
}

output "cognito_client_secret" {
  description = "Cognito User Pool Client Secret"
  value       = aws_cognito_user_pool_client.app_client.client_secret
  sensitive   = true
}

output "cognito_domain" {
  description = "Cognito User Pool Domain"
  value       = aws_cognito_user_pool_domain.app_domain.domain
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = var.deploy_ec2 ? aws_instance.app_server[0].id : null
}

output "ec2_public_ip" {
  description = "EC2 Instance Public IP"
  value       = var.deploy_ec2 ? aws_instance.app_server[0].public_ip : null
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.app_alb.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer Zone ID"
  value       = aws_lb.app_alb.zone_id
}

output "domain_name" {
  description = "Custom domain name"
  value       = "insights.melvin-jones.com"
}

output "ssl_certificate_arn" {
  description = "SSL Certificate ARN"
  value       = aws_acm_certificate_validation.insights_cert.certificate_arn
}

# Configuration values for environment variables
output "environment_config" {
  description = "Environment configuration for the application"
  value = {
    AWS_REGION           = var.aws_region
    S3_BUCKET_NAME       = aws_s3_bucket.transcripts.id
    CLOUDWATCH_LOG_GROUP = aws_cloudwatch_log_group.app_logs.name
    COGNITO_USER_POOL_ID = aws_cognito_user_pool.app_pool.id
    COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.app_client.id
    COGNITO_DOMAIN       = aws_cognito_user_pool_domain.app_domain.domain
    DOMAIN_NAME          = "insights.melvin-jones.com"
    SSL_CERTIFICATE_ARN  = aws_acm_certificate_validation.insights_cert.certificate_arn
  }
  sensitive = false
}