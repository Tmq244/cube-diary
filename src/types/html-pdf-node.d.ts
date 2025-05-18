//AI-Generated: Cursor
//Prompt: add a new function to handle PDF export

declare module 'html-pdf-node' {
  interface File {
    content?: string;
    url?: string;
  }

  interface Options {
    format?: string;
    height?: string;
    width?: string;
    path?: string;
    scale?: number;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    printBackground?: boolean;
    landscape?: boolean;
    pageRanges?: string;
    headerTemplate?: string;
    footerTemplate?: string;
    displayHeaderFooter?: boolean;
    preferCSSPageSize?: boolean;
  }

  export function generatePdf(
    file: File,
    options?: Options
  ): Promise<Buffer>;
} 