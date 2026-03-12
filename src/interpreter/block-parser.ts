import { ASTNode } from '../types/blocks.js';

interface RawBlock {
  type: string;
  element: HTMLElement;
  y: number;
}

export class BlockParser {
  static parseFromCanvas(canvas: HTMLElement): ASTNode[] {
    const elements = Array.from(canvas.querySelectorAll('.placed-block')) as HTMLElement[];
    
    const rawBlocks: RawBlock[] = elements.map(el => ({
      type: this.getBlockType(el),
      element: el,
      y: parseFloat(el.style.top) || el.getBoundingClientRect().top,
    })).sort((a, b) => a.y - b.y);

    this.checkForParallelGroups(elements);

    return this.buildAST(rawBlocks, 0, rawBlocks.length);
  }


  private static checkForParallelGroups(elements: HTMLElement[]) {
    if (elements.length < 2) return;

    const positions = elements.map(el => ({
      el,
      top: parseFloat(el.style.top) || 0,
      left: parseFloat(el.style.left) || 0,
    }));

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const deltaY = Math.abs(a.top - b.top);
        const deltaX = Math.abs(a.left - b.left);


        if (deltaY < 30 && deltaX > 300) {

          a.el.classList.add('error');
          b.el.classList.add('error');
          throw new Error(
            'Обнаружено несколько независимых групп блоков. ' +
            'Программа должна быть одной последовательностью сверху вниз. ' +
            'Расположите все блоки в одну вертикальную цепочку.'
          );
        }
      }
    }
  }

  private static getBlockType(el: HTMLElement): string {
    if (el.classList.contains('make-variable')) return 'variable';
    if (el.classList.contains('make-array')) return 'array-block';
    if (el.classList.contains('if-part')) return 'if';
    if (el.classList.contains('else-part')) return 'else';
    if (el.classList.contains('while-part')) return 'while';
    if (el.classList.contains('for-part')) return 'for';
    if (el.classList.contains('input-part')) return 'input';
    if (el.classList.contains('output-part')) return 'output';
    if (el.classList.contains('command-part')) return 'command';
    if (el.classList.contains('func-def-part')) return 'func-def';
    if (el.classList.contains('return-part')) return 'return';
    if (el.classList.contains('toint-part')) return 'toint';
    if (el.classList.contains('tofloat-part')) return 'tofloat';
    if (el.classList.contains('tostring-part')) return 'tostring';
    if (el.classList.contains('end-part-if') || el.classList.contains('end-part-for')) return 'end';
    return 'unknown';
  }

  private static buildAST(blocks: RawBlock[], start: number, end: number): ASTNode[] {
    // First pass: validate else without if
    this.validateNoOrphanElse(blocks, start, end);
    
    const nodes: ASTNode[] = [];
    let i = start;

    while (i < end) {
      const b = blocks[i];

      if (b.type === 'variable') {
        nodes.push(this.parseVariable(b.element));
        i++;
      } else if (b.type === 'array-block') {
        const arrName = this.getInput(b.element, 'Имя');
        const arrSize = this.getInput(b.element, 'Размер');
        const arrValues = this.getInput(b.element, 'Значения: 1,2,3');
        nodes.push({ kind: 'array', name: arrName, size: arrSize, initialValues: arrValues || undefined, element: b.element });
        i++;
      } else if (b.type === 'if') {
        const { node, nextIndex } = this.parseIf(blocks, i, end);
        nodes.push(node);
        i = nextIndex;
      } else if (b.type === 'while') {
        const { node, nextIndex } = this.parseWhile(blocks, i, end);
        nodes.push(node);
        i = nextIndex;
      } else if (b.type === 'for') {
        const { node, nextIndex } = this.parseFor(blocks, i, end);
        nodes.push(node);
        i = nextIndex;
      } else if (b.type === 'input') {
        const inp = this.getInput(b.element, 'Куда вводим?');
        nodes.push({ kind: 'input', variable: inp, element: b.element });
        i++;
      } else if (b.type === 'output') {
        const expr = this.getInput(b.element, 'Что выводим?');
        nodes.push({ kind: 'output', expression: expr, element: b.element });
        i++;
      } else if (b.type === 'command') {
        const cmd = this.getInput(b.element, 'Введите действие');
        const eqIdx = cmd.indexOf('=');
        if (eqIdx > 0 && cmd[eqIdx - 1] !== '!' && cmd[eqIdx - 1] !== '<' && cmd[eqIdx - 1] !== '>' && (eqIdx + 1 >= cmd.length || cmd[eqIdx + 1] !== '=')) {
          const varPart = cmd.substring(0, eqIdx).trim();
          const exprPart = cmd.substring(eqIdx + 1).trim();
          nodes.push({ kind: 'assignment', variable: varPart, expression: exprPart, element: b.element });
        } else {
          nodes.push({ kind: 'command', command: cmd, element: b.element });
        }
        i++;
      } else if (b.type === 'func-def') {
        const { node, nextIndex } = this.parseFunction(blocks, i, end);
        nodes.push(node);
        i = nextIndex;
      } else if (b.type === 'return') {
        const returnValue = this.getInput(b.element, 'Значение');
        nodes.push({ kind: 'return', returnValue, element: b.element });
        i++;
      } else if (b.type === 'toint') {
        const variable = this.getInput(b.element, 'переменная');
        nodes.push({ kind: 'convert', convertType: 'toInt', variable, element: b.element });
        i++;
      } else if (b.type === 'tofloat') {
        const variable = this.getInput(b.element, 'переменная');
        nodes.push({ kind: 'convert', convertType: 'toFloat', variable, element: b.element });
        i++;
      } else if (b.type === 'tostring') {
        const variable = this.getInput(b.element, 'переменная');
        nodes.push({ kind: 'convert', convertType: 'toString', variable, element: b.element });
        i++;
      } else {
        i++; 
      }
    }

    return nodes;
  }

  private static parseVariable(el: HTMLElement): ASTNode {
    const nameStr = this.getInput(el, 'Имя');
    const valStr = this.getInput(el, 'Введите знач.');
    const sel = el.querySelector('select') as HTMLSelectElement | null;
    const dataType = (sel?.value || 'int') as 'int' | 'float' | 'str';

    const arrMatch = nameStr.match(/^(\w+)\[(.+)\]$/);
    if (arrMatch) {
      return { kind: 'array', name: arrMatch[1], size: arrMatch[2], element: el };
    }

    const names = nameStr.split(',').map(n => n.trim()).filter(n => n);
    return { kind: 'variable', dataType, names, initialValue: valStr || null, element: el };
  }

  private static parseFunction(blocks: RawBlock[], start: number, end: number): { node: ASTNode; nextIndex: number } {
    const funcBlock = blocks[start];
    const funcDecl = this.getInput(funcBlock.element, 'имя(арг1, арг2)');
    

    const match = funcDecl.match(/^(\w+)\s*\(([^)]*)\)$/);
    if (!match) {
      throw new Error(`Неверный формат объявления функции: ${funcDecl}`);
    }
    
    const functionName = match[1];
    const paramString = match[2].trim();
    const parameters = paramString ? paramString.split(',').map(p => p.trim()) : [];
    

    // Функция заканчивается на блоке return, end не требуется
    // Берём последний return в функции
    let bodyEnd = -1;
    for (let i = start + 1; i < end; i++) {
      if (blocks[i].type === 'return') {
        bodyEnd = i;  // Перезаписываем, чтобы найти последний return
      }
    }
    
    if (bodyEnd === -1) {
      throw new Error(`Функция "${functionName}" должна возвращать значение (используйте блок return)`);
    }
    
    const body = this.buildAST(blocks, start + 1, bodyEnd + 1);
    
    return {
      node: { kind: 'func-def', functionName, parameters, body, element: funcBlock.element },
      nextIndex: bodyEnd + 1,
    };
  }

  private static parseIf(blocks: RawBlock[], start: number, end: number): { node: ASTNode; nextIndex: number } {
    const ifBlock = blocks[start];
    const condition = this.getInput(ifBlock.element, 'Условие');
    let depth = 1;
    let elseIdx = -1;
    let endIdx = -1;

    for (let i = start + 1; i < end; i++) {
      const t = blocks[i].type;
      if (t === 'if' || t === 'while' || t === 'for') depth++;
      else if (t === 'end') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      } else if (t === 'else' && depth === 1) {
        elseIdx = i;
      }
    }

    if (endIdx === -1) {

      ifBlock.element.classList.add('error');
      throw new Error('Блок if не закрыт — добавьте блок end');
    }

    let thenBody: ASTNode[];
    let elseBodyNodes: ASTNode[] | undefined;

    if (elseIdx >= 0) {
      thenBody = this.buildAST(blocks, start + 1, elseIdx);
      elseBodyNodes = this.buildAST(blocks, elseIdx + 1, endIdx);
    } else {
      thenBody = this.buildAST(blocks, start + 1, endIdx);
    }

    return {
      node: { kind: 'if', condition, body: thenBody, elseBody: elseBodyNodes, element: ifBlock.element },
      nextIndex: endIdx < end ? endIdx + 1 : endIdx,
    };
  }

  // Check if else is used without if - validation
  private static validateNoOrphanElse(blocks: RawBlock[], start: number, end: number): void {
    // Track if blocks: stack of if block indices
    const ifStack: number[] = [];
    
    for (let i = start; i < end; i++) {
      const t = blocks[i].type;
      if (t === 'if' || t === 'while' || t === 'for' || t === 'func-def') {
        ifStack.push(i);
      } else if (t === 'end') {
        ifStack.pop();
      } else if (t === 'else') {
        // Check if there's a matching if on the stack without else
        let foundIfWithoutElse = false;
        for (let j = ifStack.length - 1; j >= 0; j--) {
          const ifIdx = ifStack[j];
          if (blocks[ifIdx].type === 'if') {
            // Check if this if already has an else between ifIdx and current position
            let hasElse = false;
            for (let k = ifIdx + 1; k < i; k++) {
              if (blocks[k].type === 'else') {
                hasElse = true;
                break;
              }
            }
            if (!hasElse) {
              foundIfWithoutElse = true;
              break;
            }
          }
        }
        
        if (!foundIfWithoutElse) {
          // Else without matching if
          blocks[i].element.classList.add('error');
          throw new Error('Блок else не может использоваться без предшествующего блока if');
        }
      }
    }
  }

  private static parseWhile(blocks: RawBlock[], start: number, end: number): { node: ASTNode; nextIndex: number } {
    const whileBlock = blocks[start];
    const condition = this.getInput(whileBlock.element, 'Условие');
    const { bodyEnd } = this.findEnd(blocks, start, end, 'while');
    const body = this.buildAST(blocks, start + 1, bodyEnd);
    return {
      node: { kind: 'while', condition, body, element: whileBlock.element },
      nextIndex: bodyEnd < end ? bodyEnd + 1 : bodyEnd,
    };
  }

  private static parseFor(blocks: RawBlock[], start: number, end: number): { node: ASTNode; nextIndex: number } {
    const forBlock = blocks[start];
    const inputs = forBlock.element.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const variable = inputs[0]?.value || 'i';
    const from = inputs[1]?.value || '0';
    const to = inputs[2]?.value || '10';
    const step = inputs[3]?.value || '1';
    const { bodyEnd } = this.findEnd(blocks, start, end, 'for');
    const body = this.buildAST(blocks, start + 1, bodyEnd);
    return {
      node: { kind: 'for', variable, from, to, step, body, element: forBlock.element },
      nextIndex: bodyEnd < end ? bodyEnd + 1 : bodyEnd,
    };
  }




  private static findEnd(blocks: RawBlock[], start: number, end: number, blockType: string = 'блок'): { bodyEnd: number } {
    let depth = 1;
    for (let i = start + 1; i < end; i++) {
      const t = blocks[i].type;
      if (t === 'if' || t === 'while' || t === 'for' || t === 'func-def') depth++;
      else if (t === 'end') { depth--; if (depth === 0) return { bodyEnd: i }; }
    }


    const messages: Record<string, string> = {
      'while': 'Цикл while не закрыт — добавьте блок end',
      'for': 'Цикл for не закрыт — добавьте блок end',
      'if': 'Блок if не закрыт — добавьте блок end',
      'func': 'Функция не закрыта — добавьте блок end',
    };
    const errorMsg = messages[blockType] || `Блок ${blockType} не закрыт — добавьте блок end`;

    if (blocks[start]?.element) {
      blocks[start].element.classList.add('error');
    }

    throw new Error(errorMsg);
  }

  static getInput(el: HTMLElement, placeholder: string): string {
    const inp = Array.from(el.querySelectorAll('input')).find(
      i => (i as HTMLInputElement).placeholder === placeholder
    ) as HTMLInputElement | undefined;
    return inp?.value?.trim() ?? '';
  }
}
