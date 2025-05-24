# AWS Provider configuration
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
module "vpc" {
  source = "./modules/vpc"
  environment = var.environment
  project_name = var.project_name
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  environment = var.environment
  project_name = var.project_name
  vpc_id = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  public_subnets = module.vpc.public_subnets
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
