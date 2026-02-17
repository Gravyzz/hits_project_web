// Вычесление выражений, например, x + 5 * (y - 2)
package interpreter;

import java.util.List;
import java.util.Stack;

public class ExpressionNode {
    public List<Token> tokens;
    public List<ParseError> errors;  // Ошибки при вычислении

    public ExpressionNode(List<Token> tokens) {
        this.tokens = tokens;
        this.errors = new java.util.ArrayList<>();
    }

    public int evaluate(Context ctx) {
        Stack<Integer> stack = new Stack<>();

        try {
            for (Token token : tokens) {
                switch (token.type) {
                    case CONST -> stack.push(token.value);
                    case VAR -> stack.push(ctx.getVariable(token.name));
                    case OP -> {
                        int b = stack.pop();
                        int a = stack.pop();
                        switch (token.op) {
                            case "+" -> stack.push(a + b);
                            case "-" -> stack.push(a - b);
                            case "*" -> stack.push(a * b);
                            case "/" -> {
                                if (b == 0) {
                                    ParseError err = new ParseError(
                                        "Деление на ноль",
                                        "RuntimeError",
                                        0, 1
                                    );
                                    errors.add(err);
                                    throw new RuntimeException("Деление на ноль");
                                }
                                stack.push(a / b);
                            }
                            case "%" -> {
                                if (b == 0) {
                                    ParseError err = new ParseError(
                                        "Остаток от деления на ноль",
                                        "RuntimeError",
                                        0, 1
                                    );
                                    errors.add(err);
                                    throw new RuntimeException("Остаток от деления на ноль");
                                }
                                stack.push(a % b);
                            }
                            default -> throw new RuntimeException("Неизвестный оператор: " + token.op);
                        }
                    }
                }
            }

            if (stack.size() != 1) {
                ParseError err = new ParseError(
                    "Неверное выражение: некорректное количество операндов",
                    "SyntaxError",
                    0, 1
                );
                errors.add(err);
                throw new RuntimeException("Ошибка в выражении: стек не пуст после вычисления");
            }

            return stack.pop();
        } catch (RuntimeException e) {
            if (errors.isEmpty()) {
                ParseError err = new ParseError(e.getMessage(), "RuntimeError", 0, 1);
                errors.add(err);
            }
            throw e;
        }
    }
}
