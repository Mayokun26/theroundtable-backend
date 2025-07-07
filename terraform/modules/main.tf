# AWS Provider configuration
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
module "vpc" {
  source = "../modules/vpc"
  environment = var.environment
  project_name = var.project_name
}

# ECS Cluster
module "ecs" {
  source = "../modules/ecs"
  environment = var.environment
  project_name = var.project_name
  vpc_id = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  public_subnets = module.vpc.public_subnets
  redis_host = module.elasticache.redis_endpoint
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  backend_target_group_arn = module.alb.backend_target_group_arn
  aws_region = var.aws_region
}

# DynamoDB Tables
module "dynamodb" {
  source = "./modules/dynamodb"
  environment = var.environment
  project_name = var.project_name
}

# ElastiCache (Redis)
module "elasticache" {
  source = "./modules/elasticache"
  environment = var.environment
  project_name = var.project_name
  vpc_id = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  environment = var.environment
  project_name = var.project_name
  vpc_id = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
}

# Route53 and ACM Configuration
module "route53" {
  source = "./modules/route53"
  environment = var.environment
  project_name = var.project_name
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id = module.alb.alb_zone_id
}
