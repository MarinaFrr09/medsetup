import { NextRequest, NextResponse } from "next/server";
import { testAIConnection } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || apiKey.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Chave de API não informada." },
        { status: 400 }
      );
    }

    const result = await testAIConnection(apiKey.trim());

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, provider: result.provider },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      provider: result.provider,
    });
  } catch (error) {
    console.error("Test key API error:", error);
    const message = error instanceof Error ? error.message : "Falha ao validar chave.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}