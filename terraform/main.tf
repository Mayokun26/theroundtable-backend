# AWS Provider configuration
provider "aws" {
  region = var.aws_region
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Infrastructure modules
module "dynamodb" {
  source      = "./modules/dynamodb"
  environment = var.environment
  project_name = var.project_name
}

# Route53 zone first
module "route53" {
  source       = "./modules/route53"
  environment  = var.environment
  project_name = var.project_name
  domain_name  = var.domain_name
  contact_info = {
    address_line_1 = "207 shady brook dr"
    city          = "Arlington"
    country_code  = "US"
    email         = "mayokun.orekoya@gmail.com"
    first_name    = "Mayokun"
    last_name     = "Orekoya"
    phone_number  = "+1.2144352081"
    state         = "TX"
    zip_code      = "76002"
  }
}

# Then ACM Certificate
module "acm" {
  source            = "./modules/acm"
  environment       = var.environment
  project_name      = var.project_name
  domain_name       = var.domain_name
  alternative_names = ["api.${var.domain_name}"]
  route53_zone_id   = module.route53.zone_id

  depends_on = [module.route53]
}

# CloudFront and S3 infrastructure
module "cloudfront" {
  source             = "./modules/cloudfront"
  environment        = var.environment
  project_name       = var.project_name
  domain_name        = var.domain_name
  s3_bucket_id       = var.domain_name
  s3_bucket_arn      = "arn:aws:s3:::${var.domain_name}"
  certificate_arn    = module.acm.certificate_arn

  depends_on = [module.acm]
}

# Route53 records after CloudFront is created
module "route53_records" {
  source                   = "./modules/route53_records"
  zone_id                  = module.route53.zone_id
  domain_name              = var.domain_name
  cloudfront_domain_name   = module.cloudfront.domain_name
  cloudfront_hosted_zone_id = module.cloudfront.hosted_zone_id

  depends_on = [module.cloudfront]
}

# Lambda and API Gateway after certificate is validated
module "lambda" {
  source       = "./modules/lambda"
  environment  = var.environment
  project_name = var.project_name

  depends_on = [module.acm]
}

module "api_gateway" {
  source               = "./modules/api_gateway"
  environment          = var.environment
  project_name         = var.project_name
  lambda_function_name = module.lambda.function_name
  lambda_invoke_arn    = module.lambda.invoke_arn
  domain_name          = var.domain_name
  certificate_arn      = module.acm.certificate_arn
  route53_zone_id      = module.route53.zone_id

  depends_on = [module.acm, module.lambda]
}

# Frontend infrastructure
module "s3" {
  source                      = "./modules/s3"
  environment                 = var.environment
  project_name               = var.project_name
  bucket_name                = var.domain_name
  cloudfront_distribution_arn = module.cloudfront.distribution_arn

  depends_on = [module.cloudfront]
}
