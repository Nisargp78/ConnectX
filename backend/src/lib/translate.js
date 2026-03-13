import { translate } from "@vitalets/google-translate-api";

export const translateText = async (text, targetLanguage = "en") => {
  const input = String(text || "").trim();

  if (!input) {
    throw new Error("Text is required for translation");
  }

  const result = await translate(input, { to: targetLanguage });
  return result.text;
};
