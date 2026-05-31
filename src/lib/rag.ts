/**
 * RAG (Retrieval-Augmented Generation) module
 * Reads all PDF files from /docs and injects them as Gemini context.
 * Caches result in memory — reloads on server restart.
 */
import fs from 'fs';
import path from 'path';

let cachedContext: string | null = null;
let cachedFileList: string[] = [];

// Fallback ethical framework if no PDFs are present
const FALLBACK_FRAMEWORK = `
=== MARCO ÉTICO BASE (Integrado) ===

CLASIFICACIONES ÉTICAS FUNDAMENTALES:

1. ACTO MORAL: Acción realizada con plena conciencia y voluntad dirigida hacia el bien,
   siguiendo principios éticos reconocidos. El agente conoce la norma moral y la cumple 
   intencionalmente.

2. ACTO INMORAL: Acción realizada con plena conciencia y voluntad, dirigida hacia el mal
   o la violación deliberada de principios éticos. El agente conoce que su acción está mal
   y la realiza de todas formas.

3. ACTO AMORAL: Acción que ocurre fuera del dominio moral, propia de seres que no poseen
   conciencia moral (animales, infantes muy pequeños, personas sin capacidad de discernimiento).
   No implica juicio moral positivo ni negativo.

4. NEGLIGENCIA POR VOLUNTAD PEREZOSA (Akrasia aplicada): El agente CONOCE cuál es la conducta
   correcta pero no actúa conforme a ella por pereza, comodidad o debilidad de voluntad.
   Hay conciencia del deber pero falta la determinación de actuar. Diferente de la ignorancia:
   aquí el sujeto sabe pero no quiere el esfuerzo de actuar correctamente.

5. IGNORANCIA VENCIBLE: El agente desconoce la norma moral, pero ese desconocimiento es
   superable con esfuerzo razonable. Si hubiera indagado, habría podido conocer lo correcto.
   A diferencia de la ignorancia invencible, esta genera responsabilidad moral parcial porque
   el sujeto tenía los medios para informarse y no lo hizo.

PRINCIPIOS DEL MÉTODO SOCRÁTICO APLICADO A LA ÉTICA:
- La verdad mora en el interlocutor y debe ser extraída mediante preguntas, no impuesta.
- Cada respuesta del alumno debe ser cuestionada con benevolencia, no con juicio.
- El objetivo es que el alumno llegue por sí mismo a la clasificación correcta.
- Las preguntas deben progresar: de lo concreto a lo abstracto, de lo personal a lo universal.

EJES DE ANÁLISIS ÉTICO:
- Intencionalidad del acto
- Conocimiento previo del agente
- Consecuencias previsibles
- Contexto social y normativo
- Alternativas disponibles para el agente
`;

export async function loadKnowledgeBase(): Promise<string> {
  // Return cache if available
  if (cachedContext !== null) return cachedContext;

  const docsDir = path.join(process.cwd(), 'docs');
  const rootDir = process.cwd();
  
  const pdfFiles: { name: string; path: string }[] = [];

  // Check /docs directory
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(
      (f) => f.toLowerCase().endsWith('.pdf')
    );
    files.forEach(f => pdfFiles.push({ name: f, path: path.join(docsDir, f) }));
  }

  // Check root directory for specific PDFs (like marco_etico_base.pdf.pdf or others)
  if (fs.existsSync(rootDir)) {
    const rootFiles = fs.readdirSync(rootDir).filter(
      (f) => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.pdf.pdf')
    );
    rootFiles.forEach(f => {
      // Avoid adding duplicates if they happen to be the same file/name
      if (!pdfFiles.some(p => p.name === f)) {
        pdfFiles.push({ name: f, path: path.join(rootDir, f) });
      }
    });
  }

  if (pdfFiles.length === 0) {
    console.log('[RAG] No PDFs found in /docs or root. Using fallback framework.');
    cachedContext = FALLBACK_FRAMEWORK;
    return cachedContext;
  }

  cachedFileList = pdfFiles.map(p => p.name);
  console.log(`[RAG] Loading ${pdfFiles.length} PDF(s):`, cachedFileList);

  const texts: string[] = [FALLBACK_FRAMEWORK]; // Always include base framework

  for (const fileObj of pdfFiles) {
    try {
      const buffer = fs.readFileSync(fileObj.path);
      // Dynamic import to avoid webpack bundling issues
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      const excerpt = data.text.slice(0, 15000); // Limit to ~15k chars per PDF
      texts.push(`\n\n=== Documento: ${fileObj.name} ===\n${excerpt}`);
      console.log(`[RAG] Loaded ${fileObj.name}: ${data.numpages} pages, ${excerpt.length} chars`);
    } catch (err) {
      console.error(`[RAG] Failed to parse ${fileObj.name}:`, err);
    }
  }

  cachedContext = texts.join('\n');
  return cachedContext;
}

/** Force cache refresh (useful in development) */
export function clearKnowledgeBaseCache(): void {
  cachedContext = null;
  cachedFileList = [];
  console.log('[RAG] Cache cleared.');
}

export function getLoadedFiles(): string[] {
  return cachedFileList;
}
