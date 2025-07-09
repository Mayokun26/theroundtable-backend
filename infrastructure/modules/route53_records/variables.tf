variable "zone_id" {
  description = "The Route53 zone ID"
  type        = string
}

variable "domain_name" {
  description = "The domain name"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "The CloudFront distribution domain name"
  type        = string
}

variable "cloudfront_hosted_zone_id" {
  description = "The CloudFront distribution hosted zone ID"
  type        = string
}

variable "api_domain_name" {
  description = "The API Gateway domain name"
  type        = string
  default     = ""
}

variable "api_hosted_zone_id" {
  description = "The API Gateway hosted zone ID"
  type        = string
  default     = ""
}
