export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({openaiConfigured:Boolean(process.env.OPENAI_API_KEY),outfitProvider:process.env.OPENAI_API_KEY?"openai":process.env.GEMINI_API_KEY?"gemini":"fallback"},{headers:{"Cache-Control":"no-store"}});}
