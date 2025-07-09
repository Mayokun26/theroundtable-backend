variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "lambda_invoke_arn" {
  description = "Lambda function invoke ARN"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the API"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate"
  type        = string
}
