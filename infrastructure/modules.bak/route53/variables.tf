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

variable "alb_dns_name" {
  description = "DNS name of the application load balancer"
  type        = string
}

variable "alb_zone_id" {
  description = "Route53 zone ID of the application load balancer"
  type        = string
}

variable "create_certificate" {
  description = "Whether to create an SSL certificate"
  type        = bool
  default     = true
}

variable "alternative_names" {
  description = "Alternative domain names for the SSL certificate"
  type        = list(string)
  default     = []
}
