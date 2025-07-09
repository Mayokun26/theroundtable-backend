output "api_endpoint" {
  description = "The API Gateway endpoint"
  value       = module.api_gateway.api_endpoint
}

output "frontend_domain" {
  description = "The CloudFront distribution domain"
  value       = module.cloudfront.domain_name
}

output "domain_nameservers" {
  description = "The nameservers for the domain"
  value       = module.route53.name_servers
}
