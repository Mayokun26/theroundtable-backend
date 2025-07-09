output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_stage.main.invoke_url
}

output "api_domain_name" {
  description = "Custom domain name for the API"
  value       = aws_apigatewayv2_domain_name.api.domain_name
}

output "api_hosted_zone_id" {
  description = "Hosted zone ID for API Gateway domain"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
}
