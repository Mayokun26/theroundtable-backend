resource "aws_lambda_function" "backend" {
  filename         = "../theroundtable-backend/dist/lambda.zip"
  function_name    = "${var.project_name}-backend-${var.environment}"
  role            = aws_iam_role.lambda_exec.arn
  handler         = "lambda.handler"
  runtime         = "nodejs18.x"
  memory_size     = 256
  timeout         = 30
  
  environment {
    variables = {
      NODE_ENV = var.environment
      DYNAMODB_TABLE_PREFIX = "${var.project_name}-${var.environment}"
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.project_name}-dynamodb-access-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/${var.project_name}-${var.environment}*"
        ]
      }
    ]
  })
}
