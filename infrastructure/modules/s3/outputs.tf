output "bucket_id" {
  value       = aws_s3_bucket.frontend.id
  description = "ID of the S3 bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.frontend.arn
  description = "ARN of the S3 bucket"
}

output "website_endpoint" {
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
  description = "Website endpoint for the S3 bucket"
}
