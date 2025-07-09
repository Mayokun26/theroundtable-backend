# Route 53 Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name
  comment = "Managed by Terraform for ${var.project_name}-${var.environment}"

  force_destroy = true  # Allow deletion of records when destroying zone

  tags = {
    Name        = "${var.project_name}-zone-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Nameserver records for the apex domain
resource "aws_route53_record" "ns" {
  allow_overwrite = true
  name            = var.domain_name
  ttl            = 30
  type           = "NS"
  zone_id        = aws_route53_zone.main.zone_id
  records        = aws_route53_zone.main.name_servers
}

# SOA record
resource "aws_route53_record" "soa" {
  allow_overwrite = true
  name            = var.domain_name
  ttl            = 30
  type           = "SOA"
  zone_id        = aws_route53_zone.main.zone_id
  records        = [
    "${aws_route53_zone.main.name_servers[0]}. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
  ]
}

# Records will be created by the route53_records module

# Domain Registration
resource "aws_route53domains_registered_domain" "domain" {
  domain_name = var.domain_name

  dynamic "name_server" {
    for_each = aws_route53_zone.main.name_servers
    content {
      name = name_server.value
    }
  }

  admin_privacy      = true
  registrant_privacy = true
  tech_privacy       = true
  admin_contact {
    address_line_1   = var.contact_info.address_line_1
    city            = var.contact_info.city
    country_code    = var.contact_info.country_code
    email           = var.contact_info.email
    first_name      = var.contact_info.first_name
    last_name       = var.contact_info.last_name
    phone_number    = var.contact_info.phone_number
    state           = var.contact_info.state
    zip_code        = var.contact_info.zip_code
    contact_type    = "PERSON"
  }

  registrant_contact {
    address_line_1   = var.contact_info.address_line_1
    city            = var.contact_info.city
    country_code    = var.contact_info.country_code
    email           = var.contact_info.email
    first_name      = var.contact_info.first_name
    last_name       = var.contact_info.last_name
    phone_number    = var.contact_info.phone_number
    state           = var.contact_info.state
    zip_code        = var.contact_info.zip_code
    contact_type    = "PERSON"
  }

  tech_contact {
    address_line_1   = var.contact_info.address_line_1
    city            = var.contact_info.city
    country_code    = var.contact_info.country_code
    email           = var.contact_info.email
    first_name      = var.contact_info.first_name
    last_name       = var.contact_info.last_name
    phone_number    = var.contact_info.phone_number
    state           = var.contact_info.state
    zip_code        = var.contact_info.zip_code
    contact_type    = "PERSON"
  }

  tags = {
    Name        = "${var.project_name}-domain-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
