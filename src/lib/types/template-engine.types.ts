// src/lib/types/template-engine.types.ts

export interface CompiledTemplate {
  id: string;
  name: string;
  compiledSubject: HandlebarsTemplateDelegate;
  compiledBodyHtml: HandlebarsTemplateDelegate;
  compiledBodyText?: HandlebarsTemplateDelegate;
  requiredVariables: string[];
}

export interface TemplateRenderResult {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

export interface TemplateCompilationError {
  field: 'subject' | 'bodyHtml' | 'bodyText';
  error: string;
  line?: number;
  column?: number;
}

export interface HandlebarsTemplateDelegate {
  (context: unknown, options?: unknown): string;
}
