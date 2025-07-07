output "domain_name" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "Domain name of the CloudFront distribution"
}

output "hosted_zone_id" {
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
  description = "Route 53 zone ID of the CloudFront distribution"
}

output "distribution_arn" {
  value       = aws_cloudfront_distribution.frontend.arn
  description = "ARN of the CloudFront distribution"
}
