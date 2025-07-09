variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_subnets" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "redis_host" {
  description = "Redis host endpoint"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  type        = string
}

variable "backend_target_group_arn" {
  description = "ARN of the backend target group"
  type        = string
}

variable "aws_region" {
  description = "AWS region where resources are being created"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "The domain name for the application"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID of the Application Load Balancer"
  type        = string
}
