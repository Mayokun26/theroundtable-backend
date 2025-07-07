output "api_endpoint" {
  description = "The API Gateway endpoint"
  value       = module.api_gateway.api_endpoint
}

output "frontend_domain" {
  description = "The CloudFront distribution domain"
  value       = module.cloudfront.domain_name
}

output "domain_nameservers" {
  description = "The nameservers for the domain"
  value       = module.route53.name_servers
}

output "s3_bucket_name" {
  description = "The ID of the S3 bucket for hosting frontend"
  value       = module.s3.bucket_id
}

output "lambda_function_name" {
  description = "The name of the Lambda function"
  value       = module.lambda.function_name
}

output "cloudfront_distribution_arn" {
  description = "The ARN of the CloudFront distribution"
  value       = module.cloudfront.distribution_arn
}
