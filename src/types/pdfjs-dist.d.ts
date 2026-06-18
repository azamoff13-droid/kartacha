declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export * from 'pdfjs-dist/types/src/pdf';
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: {
    setup(handler: unknown, port: unknown): void;
  };
}
