terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  # Alexa custom skills for Europe call endpoints in eu-west-1 (Ireland).
  region = var.region
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "skill_id" {
  type        = string
  description = "Alexa skill ID (amzn1.ask.skill.xxxx). Only this skill may invoke the Lambda."
  validation {
    condition     = startswith(var.skill_id, "amzn1.ask.skill.")
    error_message = "skill_id must look like amzn1.ask.skill.<uuid>."
  }
}

variable "supplier_markup_dkk" {
  type        = number
  default     = 0
  description = "Your provider's margin in DKK/kWh excl. VAT. 0 means the answer excludes it."
}

variable "price_area" {
  type    = string
  default = "DK2"
  validation {
    condition     = contains(["DK1", "DK2"], var.price_area)
    error_message = "price_area must be DK1 or DK2."
  }
}

locals {
  name = "alexa-electricity-price"
  zip  = "${path.module}/../lambda.zip" # produced by `pnpm build`
}

resource "aws_iam_role" "lambda" {
  name = "${local.name}-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "skill" {
  function_name    = local.name
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = local.zip
  source_code_hash = filebase64sha256(local.zip)
  timeout          = 8 # Alexa gives up after 8s
  memory_size      = 256

  environment {
    variables = {
      PRICE_AREA          = var.price_area
      SUPPLIER_MARKUP_DKK = tostring(var.supplier_markup_dkk)
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda, aws_iam_role_policy_attachment.logs]
}

resource "aws_lambda_permission" "alexa" {
  statement_id       = "AllowAlexaSkill"
  action             = "lambda:InvokeFunction"
  function_name      = aws_lambda_function.skill.function_name
  principal          = "alexa-appkit.amazon.com"
  event_source_token = var.skill_id
}

output "lambda_arn" {
  value       = aws_lambda_function.skill.arn
  description = "Paste into the Alexa console as the skill's Default Region endpoint."
}
