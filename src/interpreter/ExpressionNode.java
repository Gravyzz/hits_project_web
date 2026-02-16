package interpreter;

import java.util.List;
import java.util.Stack;

public class ExpressionNode {
    public List<Token> tokens;

    public ExpressionNode(List<Token> tokens) {
        this.tokens = tokens;
    }

    public int evaluate(Context ctx) {
        Stack<Integer> stack = new Stack<>();

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
                        case "/" -> stack.push(a / b);
                        default -> throw new RuntimeException("Неизвестный оператор: " + token.op);
                    }
                }
            }
        }

        if (stack.size() != 1) {
            throw new RuntimeException("Ошибка в выражении: стек не пуст после вычисления");
        }

        return stack.pop();
    }
}
