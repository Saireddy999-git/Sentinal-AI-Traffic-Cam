import { GoogleGenAI, Type } from "@google/genai";
import { BoundingBox, ObjectType } from "../types";

// Switch to known working model for real-time vision
const MODEL_ID = "gemini-2.0-flash";

export const analyzeFrame = async (base64Image: string): Promise<BoundingBox[]> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze this traffic surveillance frame. 
    Detect the following objects: Motorcycle, Rider, Helmet, License Plate.
    
    1. Check if a rider is NOT wearing a helmet. Label them as 'no_helmet'.
    2. If a rider IS wearing a helmet, label them as 'helmet'.
    3. Detect 'motorcycle' objects.
    4. Detect 'license_plate'. If a license plate is visible, you MUST read the alphanumeric text and return it in the 'text_content' field.
    
    Return a list of bounding boxes in normalized coordinates (0-1000).
    Estimate a confidence score (0.0 to 1.0) for each detection.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ymin: { type: Type.NUMBER, description: "Top coordinate (0-1000)" },
              xmin: { type: Type.NUMBER, description: "Left coordinate (0-1000)" },
              ymax: { type: Type.NUMBER, description: "Bottom coordinate (0-1000)" },
              xmax: { type: Type.NUMBER, description: "Right coordinate (0-1000)" },
              label: { 
                type: Type.STRING, 
                enum: [ObjectType.MOTORCYCLE, ObjectType.RIDER, ObjectType.HELMET, ObjectType.NO_HELMET, ObjectType.LICENSE_PLATE],
                description: "The detected object class" 
              },
              confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
              text_content: { type: Type.STRING, description: "The text content of the license plate if detected" }
            },
            required: ["ymin", "xmin", "ymax", "xmax", "label", "confidence"],
          },
        },
        // We set a low token limit to force brevity and speed
        maxOutputTokens: 1024,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as BoundingBox[];
    }
    return [];
  } catch (error) {
    console.error("Gemini Inference Error:", error);
    return [];
  }
};