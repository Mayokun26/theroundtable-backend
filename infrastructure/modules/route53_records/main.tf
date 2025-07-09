# Frontend CloudFront Record
resource "aws_route53_record" "frontend" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id               = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# API Gateway Record
resource "aws_route53_record" "api" {
  count = var.api_domain_name != "" ? 1 : 0
  
  zone_id = var.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.api_domain_name
    zone_id               = var.api_hosted_zone_id
    evaluate_target_health = false
  }
}
