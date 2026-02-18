package interpreter;

import java.util.List;
import java.util.Stack;

public class ExpressionNode {

    private List<Token> tokens;

    public ExpressionNode(List<Token> tokens) {
        this.tokens = tokens;
    }

    public int evaluate(Context context) {
        Stack<Integer> stack = new Stack<>();

        for (Token token : tokens) {
            switch (token.type) {

                case CONST -> stack.push(token.value);

                case VAR -> stack.push(context.getVariable(token.name));

                case OP -> {
                    int b = stack.pop();
                    int a = stack.pop();

                    switch (token.op) {
                        case "+" -> stack.push(a + b);
                        case "-" -> stack.push(a - b);
                        case "*" -> stack.push(a * b);
                        case "/" -> stack.push(a / b);
                        default -> throw new RuntimeException("Неизвестный оператор");
                    }
                }
            }
        }

        return stack.pop();
    }
}
