import { translate } from "@vitalets/google-translate-api";

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const GUJARATI_REGEX = /[\u0A80-\u0AFF]/;

export const detectIndicSourceLanguage = (text = "") => {
  const input = String(text || "");

  if (GUJARATI_REGEX.test(input)) return "gu";
  if (DEVANAGARI_REGEX.test(input)) return "hi";
  return "auto";
};

export const translateText = async (text, targetLanguage = "en", sourceLanguage = "auto") => {
  const input = String(text || "").trim();

  if (!input) {
    throw new Error("Text is required for translation");
  }

  const result = await translate(input, { to: targetLanguage, from: sourceLanguage || "auto" });
  return result.text;
};
