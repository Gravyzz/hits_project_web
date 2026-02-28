import { ExecutionContext } from '../types/blocks.js';
import { ExpressionParser } from './expression-parser.js';

export class ConditionParser {
  private ep: ExpressionParser;
  private s = '';
  private pos = 0;

  constructor(ctx: ExecutionContext) {
    this.ep = new ExpressionParser(ctx);
  }

  evaluate(cond: string): boolean {
    this.s = cond.trim();
    this.pos = 0;
    if (!this.s) throw new Error('Пустое условие');
    const r = this.parseOr();
    this.ws();
    if (this.pos < this.s.length) throw new Error(`Неожиданный символ в условии: '${this.s[this.pos]}'`);
    return r;
  }

  private ch(): string | null { return this.pos < this.s.length ? this.s[this.pos] : null; }
  private advance() { this.pos++; }
  private ws() { while (this.ch() === ' ' || this.ch() === '\t') this.advance(); }

  private parseOr(): boolean {
    let r = this.parseAnd();
    while (this.matchKw('OR')) { this.skipKw('OR'); r = this.parseAnd() || r; }
    return r;
  }

  private parseAnd(): boolean {
    let r = this.parseNot();
    while (this.matchKw('AND')) { this.skipKw('AND'); r = this.parseNot() && r; }
    return r;
  }

  private parseNot(): boolean {
    this.ws();
    if (this.matchKw('NOT')) { this.skipKw('NOT'); return !this.parseNot(); }
    return this.parsePrimary();
  }

  private parsePrimary(): boolean {
    this.ws();
    if (this.ch() === '(') {
      this.advance(); this.ws();
      const r = this.parseOr();
      this.ws();
      if (this.ch() !== ')') throw new Error('Ожидается ")" в условии');
      this.advance();
      return r;
    }
    return this.parseComparison();
  }

  private parseComparison(): boolean {
    const leftStr = this.extractArithExpr();
    const left = this.ep.evaluate(leftStr);
    this.ws();

    let op = '';
    const c = this.ch();
    const c2 = this.pos + 1 < this.s.length ? this.s[this.pos + 1] : null;

    if (c === '>' && c2 === '=') { op = '>='; this.advance(); this.advance(); }
    else if (c === '<' && c2 === '=') { op = '<='; this.advance(); this.advance(); }
    else if (c === '!' && c2 === '=') { op = '!='; this.advance(); this.advance(); }
    else if (c === '=' && c2 === '=') { op = '=='; this.advance(); this.advance(); }
    else if (c === '=') { op = '=='; this.advance(); }
    else if (c === '>') { op = '>'; this.advance(); }
    else if (c === '<') { op = '<'; this.advance(); }
    else throw new Error('Ожидается оператор сравнения (>, <, ==, !=, >=, <=)');

    this.ws();
    const rightStr = this.extractArithExpr();
    const right = this.ep.evaluate(rightStr);

 
    switch (op) {
      case '==': return this.compareValues(left, right, true) as boolean;
      case '!=': return !(this.compareValues(left, right, true) as boolean);
      case '>': return (this.compareValues(left, right, false) as number) > 0;
      case '<': return (this.compareValues(left, right, false) as number) < 0;
      case '>=': return (this.compareValues(left, right, false) as number) >= 0;
      case '<=': return (this.compareValues(left, right, false) as number) <= 0;
      default: throw new Error(`Неизвестный оператор: ${op}`);
    }
  }

  private compareValues(left: number | string, right: number | string, isEquality: boolean): number | boolean {

    if (isEquality) {
      if (typeof left === typeof right) return left === right;
      return String(left) === String(right);
    }
    

    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right);
    }
    
    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }
    
    throw new Error('Нельзя сравнивать строки и числа с операторами >, <, >=, <=');
  }

  private extractArithExpr(): string {
    const start = this.pos;
    let depth = 0;
    while (this.pos < this.s.length) {
      const c = this.s[this.pos];
      if (c === '(') { depth++; this.pos++; }
      else if (c === ')') {
        if (depth === 0) break;
        depth--; this.pos++;
      }
      else if (depth === 0 && this.isCompOp()) break;
      else if (depth === 0 && (this.matchKw('AND') || this.matchKw('OR'))) break;
      else this.pos++;
    }
    const expr = this.s.substring(start, this.pos).trim();
    if (!expr) throw new Error('Пустое выражение в условии');
    return expr;
  }

  private isCompOp(): boolean {
    const c = this.s[this.pos];
    return c === '>' || c === '<' || c === '=' || c === '!';
  }

  private matchKw(kw: string): boolean {
    this.ws();
    const p = this.pos;
    for (let i = 0; i < kw.length; i++) {
      if (p + i >= this.s.length || this.s[p + i].toUpperCase() !== kw[i]) return false;
    }
    const next = p + kw.length < this.s.length ? this.s[p + kw.length] : null;
    if (next && /[a-zA-Z0-9_]/.test(next)) return false;
    return true;
  }

  private skipKw(kw: string) {
    for (let i = 0; i < kw.length; i++) this.advance();
    this.ws();
  }
}
