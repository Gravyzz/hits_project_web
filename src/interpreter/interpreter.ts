import { 
  ExecutionContext, 
  InterpreterError,
  ASTNode
} from '../types/blocks.js';
import { ExpressionParser } from './expression-parser.js';
import { ConditionParser } from './condition-parser.js';

export class Interpreter {
  private context: ExecutionContext;
  private expressionParser: ExpressionParser;
  private conditionParser: ConditionParser;
  private onOutput?: (message: string) => void;
  private onInput?: (prompt: string) => Promise<string>;
  private onError?: (error: InterpreterError) => void;

  private debugMode = false;
  private debugStepResolve?: () => void;
  private onDebugStep?: (node: ASTNode, context: ExecutionContext) => Promise<void>;

  constructor() {
    this.context = {
      variables: new Map(),
      floatVariables: new Map(),
      stringVariables: new Map(),
      variableTypes: new Map(),
      arrays: new Map(),
      functions: new Map(),
      output: [],
      currentLine: 0,
      maxIterations: 100000,
      iterationCount: 0
    };
    
    this.expressionParser = new ExpressionParser(this.context);
    this.conditionParser = new ConditionParser(this.context);
  }

  setCallbacks(
    onOutput: (message: string) => void,
    onInput: (prompt: string) => Promise<string>,
    onError: (error: InterpreterError) => void
  ) {
    this.onOutput = onOutput;
    this.onInput = onInput;
    this.onError = onError;
  }

  setDebugMode(enabled: boolean, onDebugStep?: (node: ASTNode, context: ExecutionContext) => Promise<void>) {
    this.debugMode = enabled;
    this.onDebugStep = onDebugStep;
  }

  async debugStep() {
    if (this.debugStepResolve) {
      this.debugStepResolve();
      this.debugStepResolve = undefined;
    }
  }

  async execute(astNodes: ASTNode[]): Promise<void> {
    this.context.variables.clear();
    this.context.floatVariables.clear();
    this.context.stringVariables.clear();
    this.context.variableTypes.clear();
    this.context.arrays.clear();
    this.context.functions.clear();
    this.context.output = [];
    this.context.currentLine = 0;
    this.context.iterationCount = 0;

    try {
 
      await this.collectFunctions(astNodes);
      
      await this.executeNodeList(astNodes);
    } catch (error) {
      const interpreterError: InterpreterError = {
        message: error instanceof Error ? error.message : String(error),
        blockId: this.context.currentLine.toString(),
        lineNumber: this.context.currentLine
      };
      
      if (this.onError) {
        this.onError(interpreterError);
      }
      throw interpreterError;
    }
  }

  private async collectFunctions(nodes: ASTNode[]): Promise<void> {
    for (const node of nodes) {
      if (node.kind === 'func-def' && node.functionName && node.parameters && node.body) {
        this.context.functions.set(node.functionName, {
          name: node.functionName,
          parameters: node.parameters,
          body: node.body
        });
      }
    }
  }

  private async executeNodeList(nodes: ASTNode[]): Promise<void> {
    for (const node of nodes) {
      await this.executeNode(node);
    }
  }

  private async executeNode(node: ASTNode): Promise<any> {
    this.context.currentLine++;
    this.context.iterationCount++;
    
    if (this.context.iterationCount > this.context.maxIterations) {
      throw new Error('Превышен лимит итераций. Возможна бесконечная петля.');
    }

    if (this.debugMode && this.onDebugStep) {
      await this.onDebugStep(node, this.context);
      if (this.debugMode) {

        await new Promise<void>((resolve) => {
          this.debugStepResolve = resolve;
        });
      }
    }

    try {
      switch (node.kind) {
        case 'variable':
          await this.executeVariableDecl(node);
          break;
        case 'array':
          await this.executeArrayDecl(node);
          break;
        case 'assignment':
          await this.executeAssignment(node);
          break;
        case 'if':
          await this.executeIf(node);
          break;
        case 'while':
          await this.executeWhile(node);
          break;
        case 'for':
          await this.executeFor(node);
          break;
        case 'input':
          await this.executeInput(node);
          break;
        case 'output':
          await this.executeOutput(node);
          break;
        case 'command':
          await this.executeCommand(node);
          break;
        case 'func-def':
          break;
        case 'return':
          return await this.executeReturn(node);
        default:
    
          break;
      }
    } catch (error) {
      const interpreterError: InterpreterError = {
        message: error instanceof Error ? error.message : String(error),
        blockId: node.element?.dataset?.id || 'unknown',
        lineNumber: this.context.currentLine
      };
      throw interpreterError;
    }
  }

  private async executeVariableDecl(node: ASTNode): Promise<void> {
    const dataType = node.dataType || 'int';
    
    for (const name of node.names || []) {
      if (name.trim() === '') continue;
      const varName = name.trim();
      

      this.context.variableTypes.set(varName, dataType);
      

      if (node.initialValue && node.initialValue.trim() !== '') {
        const result = this.expressionParser.evaluate(node.initialValue);
        this.setVariableValue(varName, result, dataType);
      } else {

        switch (dataType) {
          case 'int':
            this.context.variables.set(varName, 0);
            break;
          case 'float':
            this.context.floatVariables.set(varName, 0.0);
            break;
          case 'str':
            this.context.stringVariables.set(varName, '');
            break;
        }
      }
    }
  }

  private setVariableValue(name: string, value: number | string, expectedType?: 'int' | 'float' | 'str'): void {
    const varType = expectedType || this.context.variableTypes.get(name);
    
    if (!varType) {
      throw new Error(`Тип переменной "${name}" неизвестен`);
    }
    
    switch (varType) {
      case 'int':
        const intVal = typeof value === 'string' ? parseInt(value, 10) : Math.trunc(value);
        if (typeof value === 'string' && isNaN(intVal)) {
          throw new Error(`Не удалось преобразовать "${value}" в целое число`);
        }
        this.context.variables.set(name, intVal);
        break;
        
      case 'float':
        const floatVal = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof value === 'string' && isNaN(floatVal)) {
          throw new Error(`Не удалось преобразовать "${value}" в число с плавающей запятой`);
        }
        this.context.floatVariables.set(name, typeof floatVal === 'number' ? floatVal : 0);
        break;
        
      case 'str':
        this.context.stringVariables.set(name, String(value));
        break;
    }
  }

  private async executeArrayDecl(node: ASTNode): Promise<void> {
    if (!node.name) return;
    

    let initValues: number[] = [];
    if (node.initialValues) {
      initValues = node.initialValues.split(',').map(v => {
        const trimmed = v.trim();
        const num = this.expressionParser.evaluate(trimmed);
        return num;
      });
    }
    
    let size: number;
    if (node.size && node.size.trim() !== '') {
      size = this.expressionParser.evaluate(node.size);
      if (initValues.length > size) {
        size = initValues.length;
      }
    } else if (initValues.length > 0) {
      size = initValues.length;
    } else {
      return; // no size and no values
    }
    
    if (size <= 0) {
      throw new Error('Размер массива должен быть больше нуля');
    }
    
    const arr = new Array(size).fill(0);
    for (let i = 0; i < initValues.length && i < size; i++) {
      arr[i] = initValues[i];
    }
    
    this.context.arrays.set(node.name, arr);
  }

  private async executeAssignment(node: ASTNode): Promise<void> {
    if (!node.variable || !node.expression) return;
    

    if (this.isArrayAssignment(node.variable)) {
      const value = this.expressionParser.evaluateNumeric(node.expression);
      this.setArrayValue(node.variable, value);
    } else {

      const varType = this.context.variableTypes.get(node.variable);
      if (!varType) {
        throw new Error(`Переменная ${node.variable} не объявлена`);
      }
      
      const value = this.expressionParser.evaluate(node.expression);
      this.setVariableValue(node.variable, value);
    }
  }

  private async executeIf(node: ASTNode): Promise<void> {
    if (!node.condition) return;
    
    const result = this.conditionParser.evaluate(node.condition);
    
    if (result) {
      await this.executeNodeList(node.body || []);
    } else if (node.elseBody) {
      await this.executeNodeList(node.elseBody);
    }
  }

  private async executeWhile(node: ASTNode): Promise<void> {
    if (!node.condition) return;
    
    let iterationLimit = 10000;
    let iterations = 0;
    

    while (this.conditionParser.evaluate(node.condition)) {
      iterations++;
      if (iterations > iterationLimit) {
        throw new Error('Превышен лимит итераций в цикле while');
      }
      
      await this.executeNodeList(node.body || []);
    }
  }

  private async executeFor(node: ASTNode): Promise<void> {
    if (!node.variable || !node.from || !node.to || !node.step) return;
    

    const from = this.expressionParser.evaluateNumeric(node.from);
    const to = this.expressionParser.evaluateNumeric(node.to);
    const step = this.expressionParser.evaluateNumeric(node.step);
    
    if (step === 0) {
      throw new Error('Шаг цикла не может быть равен нулю');
    }
    

    const originalType = this.context.variableTypes.get(node.variable);
    const originalValue = this.getVariableValue(node.variable);
    

    this.context.variableTypes.set(node.variable, 'int');
    
    let iterationLimit = 10000;
    let iterations = 0;
    
    for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
      iterations++;
      if (iterations > iterationLimit) {
        throw new Error('Превышен лимит итераций в цикле for');
      }
      
      this.context.variables.set(node.variable, i);
      await this.executeNodeList(node.body || []);
    }
    

    if (originalType !== undefined && originalValue !== undefined) {
      this.context.variableTypes.set(node.variable, originalType);
      this.setVariableValue(node.variable, originalValue);
    } else {
      this.context.variableTypes.delete(node.variable);
      this.context.variables.delete(node.variable);
      this.context.floatVariables.delete(node.variable);
      this.context.stringVariables.delete(node.variable);
    }
  }

  private getVariableValue(name: string): number | string | undefined {
    if (this.context.variables.has(name)) return this.context.variables.get(name);
    if (this.context.floatVariables.has(name)) return this.context.floatVariables.get(name);
    if (this.context.stringVariables.has(name)) return this.context.stringVariables.get(name);
    return undefined;
  }

  private async executeInput(node: ASTNode): Promise<void> {
    if (!node.variable) return;
    

    if (this.isArrayVariable(node.variable)) {
      if (!this.arrayExists(node.variable)) {
        throw new Error(`Массив для ${node.variable} не объявлен`);
      }
    } else {
      const varType = this.context.variableTypes.get(node.variable);
      if (!varType) {
        throw new Error(`Переменная ${node.variable} не объявлена`);
      }
    }
    
    if (this.onInput) {
      const input = await this.onInput(`Введите значение для ${node.variable}: `);
      
      if (this.isArrayVariable(node.variable)) {
        const value = parseFloat(input);
        if (isNaN(value)) {
          throw new Error('Введено некорректное число');
        }
        this.setArrayValue(node.variable, value);
      } else {
        this.setVariableValue(node.variable, input);
      }
    }
  }

  private async executeReturn(node: ASTNode): Promise<number | string | undefined> {
    if (!node.returnValue) return undefined;
    
    return this.expressionParser.evaluate(node.returnValue);
  }

  private async executeOutput(node: ASTNode): Promise<void> {
    if (!node.expression) return;
    
    const expr = node.expression.trim();
    let message: string;

    try {

      if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
        message = expr.slice(1, -1);
      } else {

        try {
          const value = this.expressionParser.evaluate(expr);
          message = value.toString();
        } catch {
          message = expr;
        }
      }
    } catch {
      message = expr;
    }
    
    this.context.output.push(message);
    
    if (this.onOutput) {
      this.onOutput(message);
    }
  }

  private async executeCommand(node: ASTNode): Promise<void> {
    if (!node.command) return;
    
    if (node.command.includes('=')) {
      const [variable, expression] = node.command.split('=').map(s => s.trim());
      
      if (this.isArrayAssignment(variable)) {
        if (!this.arrayExists(variable)) {
          throw new Error(`Массив для ${variable} не объявлен`);
        }
        const value = this.expressionParser.evaluateNumeric(expression);
        this.setArrayValue(variable, value);
      } else {
        const varType = this.context.variableTypes.get(variable);
        if (!varType) {
          throw new Error(`Переменная ${variable} не объявлена`);
        }
        const value = this.expressionParser.evaluate(expression);
        this.setVariableValue(variable, value);
      }
    } else {

      try {
        const value = this.expressionParser.evaluate(node.command);
        if (this.onOutput) {
          this.onOutput(String(value));
        }
      } catch (error) {
        throw new Error(`Неизвестная команда: ${node.command}`);
      }
    }
  }


  private isArrayAssignment(variable: string): boolean {
    return /\w+\[.+\]/.test(variable);
  }

  private isArrayVariable(variable: string): boolean {
    return /\w+\[.+\]/.test(variable);
  }

  private arrayExists(variable: string): boolean {
    const match = variable.match(/^(\w+)\[.+\]$/);
    if (!match) return false;
    
    const arrayName = match[1];
    return this.context.arrays.has(arrayName);
  }

  private setArrayValue(variable: string, value: number): void {
    const match = variable.match(/^(\w+)\[(.+)\]$/);
    if (!match) {
      throw new Error(`Неверный формат доступа к массиву: ${variable}`);
    }
    
    const arrayName = match[1];
    const indexExpr = match[2];
    
    const array = this.context.arrays.get(arrayName);
    if (!array) {
      throw new Error(`Массив ${arrayName} не объявлен`);
    }
    
    // Evaluate index expression using current context
    const index = this.expressionParser.evaluate(indexExpr);
    
    if (index < 0 || index >= array.length) {
      throw new Error(`Индекс ${index} выходит за границы массива ${arrayName}`);
    }
    
    array[index] = value;
  }
}