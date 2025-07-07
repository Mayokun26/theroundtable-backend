output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.backend.function_name
}

output "invoke_arn" {
  description = "ARN to be used for invoking Lambda Function from API Gateway"
  value       = aws_lambda_function.backend.invoke_arn
}
