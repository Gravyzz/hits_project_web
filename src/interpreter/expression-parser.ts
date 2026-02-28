import { ExecutionContext, FunctionDefinition } from '../types/blocks.js';

export class ExpressionParser {
  private ctx: ExecutionContext;
  private s = '';
  private pos = 0;

  constructor(ctx: ExecutionContext) { this.ctx = ctx; }

  evaluate(expr: string): number | string {
    this.s = expr.trim();
    this.pos = 0;
    if (!this.s) throw new Error('Пустое выражение');
    const r = this.parseExpr();
    this.ws();
    if (this.pos < this.s.length) throw new Error(`Неожиданный символ: '${this.s[this.pos]}'`);
    return r;
  }

  evaluateNumeric(expr: string): number {
    const result = this.evaluate(expr);
    if (typeof result === 'string') {

      const num = parseFloat(result);
      if (isNaN(num)) throw new Error(`Не удалось преобразовать "${result}" в число`);
      return num;
    }
    return result;
  }

  private ch(): string | null { return this.pos < this.s.length ? this.s[this.pos] : null; }
  private advance() { this.pos++; }
  private ws() { while (this.ch() === ' ' || this.ch() === '\t') this.advance(); }

  private parseExpr(): number | string {
    let r = this.parseTerm();
    this.ws();
    while (this.ch() === '+' || this.ch() === '-') {
      const op = this.ch()!;
      this.advance(); this.ws();
      const right = this.parseTerm();
      
      if (op === '+') {

        if (typeof r === 'string' || typeof right === 'string') {
          r = String(r) + String(right);
        } else {
          r = r + right;
        }
      } else {

        if (typeof r === 'string' || typeof right === 'string') {
          throw new Error('Вычитание строк не поддерживается');
        }
        r = r - right;
      }
      this.ws();
    }
    return r;
  }

  private parseTerm(): number | string {
    let r = this.parseFactor();
    this.ws();
    while (this.ch() === '*' || this.ch() === '/' || this.ch() === '%') {
      const op = this.ch()!;
      this.advance(); this.ws();
      const right = this.parseFactor();

      if (typeof r === 'string' || typeof right === 'string') {
        throw new Error('Операции *, /, % не поддерживаются для строк');
      }
      
      if (op === '*') {
        r = r * right;
      } else if (op === '/') {
        if (right === 0) throw new Error('Деление на ноль');

        r = this.shouldUseFloatDivision() ? r / right : Math.trunc(r / right);
      } else {
        if (right === 0) throw new Error('Деление на ноль');
        r = r % right;
      }
      this.ws();
    }
    return r;
  }

  private parseFactor(): number | string {
    this.ws();

    if (this.ch() === '"' || this.ch() === "'") {
      return this.parseString();
    }
    
    if (this.ch() === '-') { 
      this.advance(); 
      const val = this.parseFactor();
      if (typeof val === 'string') throw new Error('Унарный минус не может применяться к строкам');
      return -val;
    }
    if (this.ch() === '+') { 
      this.advance(); 
      const val = this.parseFactor();
      if (typeof val === 'string') throw new Error('Унарный плюс не может применяться к строкам');
      return val;
    }
    if (this.ch() === '(') {
      this.advance(); this.ws();
      const r = this.parseExpr();
      this.ws();
      if (this.ch() !== ')') throw new Error('Ожидается ")"');
      this.advance();
      return r;
    }
    if (this.isDigit(this.ch()) || (this.ch() === '.' && this.isDigit(this.peek()))) {
      return this.parseNum();
    }
    if (this.isAlpha(this.ch())) return this.parseIdent();
    throw new Error(`Неожиданный символ: '${this.ch()}'`);
  }

  private parseNum(): number {
    let numStr = '';
    

    while (this.isDigit(this.ch())) {
      numStr += this.ch()!;
      this.advance();
    }
    

    if (this.ch() === '.') {
      numStr += '.';
      this.advance();
      while (this.isDigit(this.ch())) {
        numStr += this.ch()!;
        this.advance();
      }
    }
    
    return parseFloat(numStr);
  }

  private parseString(): string {
    const quote = this.ch()!;
    this.advance();
    let str = '';
    
    while (this.ch() !== null && this.ch() !== quote) {
      str += this.ch()!;
      this.advance();
    }
    
    if (this.ch() !== quote) {
      throw new Error(`Незакрытая строка, ожидается ${quote}`);
    }
    
    this.advance(); 
    return str;
  }

  private peek(): string | null {
    return this.pos + 1 < this.s.length ? this.s[this.pos + 1] : null;
  }

  private shouldUseFloatDivision(): boolean {

    return true; 
  }

  private parseIdent(): number | string {
    let name = '';
    while (this.ch() !== null && (this.isAlpha(this.ch()) || this.isDigit(this.ch()) || this.ch() === '_')) {
      name += this.ch(); this.advance();
    }
    this.ws();
    

    if (this.ch() === '(') {
      return this.parseFunctionCall(name);
    }
    

    if (this.ch() === '[') {
      this.advance(); this.ws();
      const idxResult = this.parseExpr();
      const idx = typeof idxResult === 'string' ? parseFloat(idxResult) : idxResult;
      if (isNaN(idx)) throw new Error('Индекс массива должен быть числом');
      this.ws();
      if (this.ch() !== ']') throw new Error('Ожидается "]"');
      this.advance();
      const arr = this.ctx.arrays.get(name);
      if (!arr) throw new Error(`Массив "${name}" не объявлен`);
      if (idx < 0 || idx >= arr.length) throw new Error(`Индекс ${idx} за границами массива "${name}" (размер ${arr.length})`);
      return arr[Math.floor(idx)];
    }
    

    if (this.ctx.stringVariables.has(name)) {
      return this.ctx.stringVariables.get(name)!;
    }
    if (this.ctx.floatVariables.has(name)) {
      return this.ctx.floatVariables.get(name)!;
    }
    if (this.ctx.variables.has(name)) {
      return this.ctx.variables.get(name)!;
    }
    
    throw new Error(`Переменная "${name}" не объявлена`);
  }

  private parseFunctionCall(functionName: string): number | string {

    if (['len', 'toInt', 'toFloat', 'toString'].includes(functionName)) {
      return this.parseBuiltinFunction(functionName);
    }
    
   
    const funcDef = this.ctx.functions.get(functionName);
    if (!funcDef) {
      throw new Error(`Функция "${functionName}" не определена`);
    }
    

    this.advance(); 
    this.ws();
    
    const args: (number | string)[] = [];
    while (this.ch() !== ')' && this.ch() !== null) {
      args.push(this.parseExpr());
      this.ws();
      if (this.ch() === ',') {
        this.advance();
        this.ws();
      } else if (this.ch() !== ')') {
        throw new Error('Ожидается "," или ")"');
      }
    }
    
    if (this.ch() !== ')') throw new Error('Ожидается ")"');
    this.advance();
    
    if (args.length !== funcDef.parameters.length) {
      throw new Error(`Функция "${functionName}" ожидает ${funcDef.parameters.length} аргументов, получено ${args.length}`);
    }

    throw new Error('Выполнение пользовательских функций в выражениях пока не поддерживается');
  }

  private parseBuiltinFunction(functionName: string): number | string {
    this.advance(); 
    this.ws();
    
    if (this.ch() === ')') {
      throw new Error(`Функция ${functionName} требует аргумент`);
    }
    
    const arg = this.parseExpr();
    this.ws();
    
    if (this.ch() !== ')') throw new Error('Ожидается ")"');
    this.advance();
    
    switch (functionName) {
      case 'len':
        if (typeof arg !== 'string') {
          throw new Error('len() может применяться только к строкам');
        }
        return arg.length;
        
      case 'toInt':
        if (typeof arg === 'string') {
          const num = parseInt(arg, 10);
          if (isNaN(num)) throw new Error(`Не удалось преобразовать "${arg}" в целое число`);
          return num;
        }
        return Math.trunc(arg);
        
      case 'toFloat':
        if (typeof arg === 'string') {
          const num = parseFloat(arg);
          if (isNaN(num)) throw new Error(`Не удалось преобразовать "${arg}" в число с плавающей запятой`);
          return num;
        }
        return arg;
        
      case 'toString':
        return String(arg);
        
      default:
        throw new Error(`Неизвестная встроенная функция: ${functionName}`);
    }
  }

  private isDigit(c: string | null): boolean { return c !== null && c >= '0' && c <= '9'; }
  private isAlpha(c: string | null): boolean { return c !== null && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'); }
}
