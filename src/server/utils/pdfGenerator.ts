//AI-Generated: Cursor
//Prompt: add a new function to handle PDF export

/**
 * PDF生成工具
 */
import * as htmlPdf from 'html-pdf-node';

interface PdfOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  landscape?: boolean;
}

/**
 * 将HTML内容转换为PDF Buffer
 */
export const generatePdf = async (
  htmlContent: string,
  options: PdfOptions = {}
): Promise<Buffer> => {
  try {
    // Create a file object with HTML content
    const file = { content: htmlContent };
    
    // Set default options
    const defaultOptions = {
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: true,
      ...options
    };
    
    // Generate PDF
    const pdfBuffer = await htmlPdf.generatePdf(file, defaultOptions);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}; 