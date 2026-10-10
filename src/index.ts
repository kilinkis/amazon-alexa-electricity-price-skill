import type { Context } from "aws-lambda";
import type { RequestEnvelope } from "ask-sdk-model";
import { skill } from "./skill";

// AWS Lambda entry point; Alexa authenticates the caller via the lambda permission.
export const handler = (event: RequestEnvelope, context: Context) => skill.invoke(event, context);
