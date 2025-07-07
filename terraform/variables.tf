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
