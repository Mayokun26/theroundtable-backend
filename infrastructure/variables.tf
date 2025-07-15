variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "theroundtable"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "alternative_domain_names" {
  description = "Alternative domain names for the SSL certificate"
  type        = list(string)
  default     = []
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
