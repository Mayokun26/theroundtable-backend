# Route 53 Zone
resource "aws_route53_zone" "main" {
  name = "theroundtable-ai.dev"

  tags = {
    Name        = "${var.project_name}-zone-${var.environment}"
    Environment = var.environment
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "theroundtable-ai.dev"
  validation_method = "DNS"

  tags = {
    Name        = "${var.project_name}-cert-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

# DNS Validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      record  = dvo.resource_record_value
      type    = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Certificate Validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ALB DNS Record
resource "aws_route53_record" "alb" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "theroundtable-ai.dev"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id               = var.alb_zone_id
    evaluate_target_health = true
  }
}
