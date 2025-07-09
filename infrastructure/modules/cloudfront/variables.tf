variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the CloudFront distribution"
  type        = string
}

variable "s3_bucket_id" {
  description = "ID of the S3 bucket to use as origin"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket to use as origin"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
}
