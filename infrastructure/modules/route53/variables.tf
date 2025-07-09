variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "domain_name" {
  description = "The main domain name for the application"
  type        = string
}

variable "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  type        = string
  default     = ""
}

variable "cloudfront_hosted_zone_id" {
  description = "Route53 zone ID for CloudFront"
  type        = string
  default     = ""
}

variable "api_domain_name" {
  description = "Domain name of the API Gateway endpoint"
  type        = string
  default     = ""
}

variable "api_hosted_zone_id" {
  description = "Route53 zone ID for API Gateway"
  type        = string
  default     = ""
}

variable "contact_info" {
  description = "Contact information for domain registration"
  type = object({
    address_line_1 = string
    city          = string
    country_code  = string
    email         = string
    first_name    = string
    last_name     = string
    phone_number  = string
    state         = string
    zip_code      = string
  })
  sensitive = true
}
