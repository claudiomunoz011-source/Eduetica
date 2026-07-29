import { NextRequest, NextResponse } from 'next/server';
import { evaluateMultiplayerArgument } from '@/lib/gemini';
import { EvaluateArgumentPayload } from '@/types/debate';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateArgumentPayload;

    if (!body.dilemmaScenario || !body.selectedAnswer || !body.correctAnswer || !body.argumentText) {
      return NextResponse.json(
        { error: 'Missing required argument parameters' },
        { status: 400 }
      );
    }

    const evaluation = await evaluateMultiplayerArgument(body);

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: any) {
    console.error('[Debate Evaluate API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to evaluate argument',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
