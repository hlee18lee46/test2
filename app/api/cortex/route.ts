import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. Read bio data
    // --------------------------------------------------

    const body = await req.json();

    const heartRate = Number(body.heartRate);
    const breathingRate = Number(body.breathingRate);

    if (
      !Number.isFinite(heartRate) ||
      !Number.isFinite(breathingRate)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "heartRate and breathingRate are required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2. Snowflake configuration
    // --------------------------------------------------

    const account = process.env.SNOWFLAKE_ACCOUNT;
    const token = process.env.SNOWFLAKE_PAT;

    if (!account || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Snowflake configuration missing",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 3. Create OpenAI-compatible Snowflake client
    // --------------------------------------------------

    const client = new OpenAI({
      apiKey: token,

      baseURL:
        `https://${account}.snowflakecomputing.com/api/v2/cortex/v1`,
    });

    // --------------------------------------------------
    // 4. Ask Cortex
    // --------------------------------------------------

    const completion = await client.chat.completions.create({
      model: "openai-gpt-5",

      messages: [
  {
    role: "system",
    content: `
You are the biometric analysis assistant for WhatTheHoot.

Analyze the provided heart rate and breathing rate.

Give a very short, friendly analysis in 1-2 sentences.

Mention:
- whether the heart rate appears low, normal, or high
- whether the breathing rate appears low, normal, or high
- If heart rate or breathing rate is high or low, give a suggestion as well.

Keep the response concise.
Do not diagnose medical conditions.
Do not provide medical advice.
Do not recommend treatment.

Return ONLY the analysis text.
    `.trim(),
  },
  {
    role: "user",
    content: `
Heart rate: ${heartRate} BPM
Breathing rate: ${breathingRate} breaths per minute
    `.trim(),
  },
],
    });

    // --------------------------------------------------
    // 5. Extract Cortex response
    // --------------------------------------------------

    const content =
      completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: "Snowflake Cortex returned no response",
        },
        { status: 502 }
      );
    }

    // Remove Markdown fences if Cortex adds them.

    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // --------------------------------------------------
    // 6. Parse JSON
    // --------------------------------------------------

    try {
      const result = JSON.parse(cleaned);

      return NextResponse.json({
        success: true,

        heartRate,
        breathingRate,

        summary: result.summary,
        mood: result.mood,
        pet: result.pet,

        poweredBy: "Snowflake Cortex AI",
      });
    } catch {
      // Cortex responded but didn't return valid JSON.

      return NextResponse.json({
        success: true,

        heartRate,
        breathingRate,

        summary: cleaned,
        mood: null,
        pet: null,

        poweredBy: "Snowflake Cortex AI",
      });
    }
  } catch (error: any) {
    console.error("Snowflake Cortex error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Snowflake Cortex request failed",

        status:
          error?.status ??
          error?.response?.status ??
          500,

        details:
          error?.message ??
          "Unknown Snowflake Cortex error",
      },
      {
        status:
          error?.status >= 400 &&
          error?.status < 600
            ? error.status
            : 500,
      }
    );
  }
}
