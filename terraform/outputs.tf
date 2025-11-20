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
  value       = var.enable_cognito ? aws_cognito_user_pool.app_pool[0].id : null
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = var.enable_cognito ? aws_cognito_user_pool_client.app_client[0].id : null
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
  value       = var.enable_alb ? aws_lb.app_alb[0].dns_name : null
}

output "alb_zone_id" {
  description = "Application Load Balancer Zone ID"
  value       = var.enable_alb ? aws_lb.app_alb[0].zone_id : null
}

# Configuration values for environment variables
output "environment_config" {
  description = "Environment configuration for the application"
  value = {
    AWS_REGION         = var.aws_region
    S3_BUCKET_NAME     = aws_s3_bucket.transcripts.id
    CLOUDWATCH_LOG_GROUP = aws_cloudwatch_log_group.app_logs.name
    COGNITO_USER_POOL_ID = var.enable_cognito ? aws_cognito_user_pool.app_pool[0].id : null
    COGNITO_CLIENT_ID    = var.enable_cognito ? aws_cognito_user_pool_client.app_client[0].id : null
  }
  sensitive = false
}