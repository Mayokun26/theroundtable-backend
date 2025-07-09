variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Redis cluster will be created"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs for Redis cluster"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group ID of the ECS tasks"
  type        = string
}
