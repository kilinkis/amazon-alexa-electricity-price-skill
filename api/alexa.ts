import { SkillRequestSignatureVerifier, TimestampVerifier } from "ask-sdk-express-adapter";
import type { RequestEnvelope } from "ask-sdk-model";
import { skill } from "../src/skill";

// Vercel entry point. Alexa HTTPS endpoints must verify the request signature and timestamp.
export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);
  try {
    await new SkillRequestSignatureVerifier().verify(body, headers);
    await new TimestampVerifier().verify(body);
  } catch {
    return new Response("Invalid Alexa request", { status: 400 });
  }

  const envelope = JSON.parse(body) as RequestEnvelope;
  const expected = process.env.ALEXA_SKILL_ID;
  if (expected && envelope.context.System.application.applicationId !== expected) {
    return new Response("Unknown skill", { status: 403 });
  }
  return Response.json(await skill.invoke(envelope));
}
