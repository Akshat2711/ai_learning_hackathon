
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, image, history, apiKey } = await req.json();

    // Use the provided API key or fallback to environment variable
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: "API Key is missing. Please provide it in settings or environment." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // Prepare image part
    const imagePart = {
      inlineData: {
        data: image, // Base64 string (without prefix)
        mimeType: "image/png",
      },
    };

    // Construct prompt with history if needed, but for image context, we usually just send the current image + prompt
    // We can append history to the text prompt to give context.
    let fullPrompt = "You are a helpful AI tutor assistant. The user has provided an image of a document, often with annotations (red drawings/circles) highlighting specific parts. " +
    "Focus primarily on the annotated/encircled area if present. Answer the user's question based on this context. " +
    "IMPORTANT: Provide a direct answer without third-person phrasing (e.g., 'You have circled...'). Do not use asterisks (*) or markdown bullet points. Use plain text or numbers if needed.\n\n";
    
    // Add history context simplistically
    if (history && history.length > 0) {
      fullPrompt += "Previous conversation:\n" + history.map((msg: any) => `${msg.role}: ${msg.content}`).join("\n") + "\n\n";
    }
    
    fullPrompt += `User Question: ${prompt}`;

    const result = await model.generateContent([fullPrompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response." },
      { status: 500 }
    );
  }
}
