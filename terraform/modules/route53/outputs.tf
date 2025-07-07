output "zone_id" {
  description = "Route53 zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "Name servers for the domain"
  value       = aws_route53_zone.main.name_servers
}
