import pdfParse from 'pdf-parse';

export async function parseCVBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error al parsear el PDF del CV: ${message}`);
  }
}
