# DynamoDB Tables
resource "aws_dynamodb_table" "conversations" {
  name           = "${var.project_name}-conversations-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "conversationId"
  range_key      = "timestamp"

  attribute {
    name = "conversationId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name               = "UserIdIndex"
    hash_key          = "userId"
    range_key         = "timestamp"
    projection_type    = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-conversations-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "characters" {
  name           = "${var.project_name}-characters-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "characterId"

  attribute {
    name = "characterId"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-characters-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-users-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name               = "EmailIndex"
    hash_key          = "email"
    projection_type    = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-users-${var.environment}"
    Environment = var.environment
  }
}
