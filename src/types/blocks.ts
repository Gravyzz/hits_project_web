export interface BaseBlock {
  id: string;
  type: string;
  prev: string | null;
  next: string | null;
  element: HTMLElement;
}

export type AnyBlock = BaseBlock;

export interface ASTNode {
  kind: string;
  element?: HTMLElement;
  dataType?: 'int' | 'float' | 'str';
  names?: string[];
  initialValue?: string | null;
  name?: string;
  size?: string;
  initialValues?: string;
  variable?: string;
  expression?: string;
  command?: string;
  condition?: string;
  body?: ASTNode[];
  elseBody?: ASTNode[];
  from?: string;
  to?: string;
  step?: string;
  functionName?: string;
  parameters?: string[];
  returnValue?: string;
}

export interface FunctionDefinition {
  name: string;
  parameters: string[];
  body: ASTNode[];
}

export interface ExecutionContext {
  variables: Map<string, number>;
  floatVariables: Map<string, number>;
  stringVariables: Map<string, string>;
  variableTypes: Map<string, 'int' | 'float' | 'str'>;
  arrays: Map<string, number[]>;
  functions: Map<string, FunctionDefinition>;
  output: string[];
  currentLine: number;
  maxIterations: number;
  iterationCount: number;
}

export interface InterpreterError {
  message: string;
  blockId: string;
  lineNumber: number;
}
