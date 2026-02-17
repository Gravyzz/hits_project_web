// Лексер и парсер выражений: инфикс -> RPN (шантинг-ярд)
package interpreter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Stack;

public class Parser {
    private static final Set<String> OPS = Set.of("+", "-", "*", "/", "%", "(", ")");
    private static final Map<String,Integer> PRECEDENCE = Map.of(
            "+", 1,
            "-", 1,
            "*", 2,
            "/", 2,
            "%", 2
    );

    // Разбиваем строку на токены (числа, идентификаторы, операторы, скобки)
    public static List<Token> tokenize(String s) {
        List<Token> res = new ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (Character.isWhitespace(c)) { i++; continue; }

            if (Character.isDigit(c)) {
                int j = i + 1;
                while (j < s.length() && Character.isDigit(s.charAt(j))) j++;
                int val = Integer.parseInt(s.substring(i, j));
                res.add(Token.constToken(val));
                i = j;
                continue;
            }

            if (Character.isLetter(c) || c == '_') {
                int j = i + 1;
                while (j < s.length() && (Character.isLetterOrDigit(s.charAt(j)) || s.charAt(j) == '_')) j++;
                String name = s.substring(i, j);
                res.add(Token.varToken(name));
                i = j;
                continue;
            }

            String op = String.valueOf(c);
            if (OPS.contains(op)) {
                res.add(Token.opToken(op));
                i++;
                continue;
            }

            throw new RuntimeException("Неизвестный символ в выражении: '" + c + "' at pos " + i);
        }
        return res;
    }

    // Преобразуем инфиксное выражение в RPN (список токенов)
    public static List<Token> parseToRPN(String s) {
        List<Token> tokens = tokenize(s);
        List<Token> output = new ArrayList<>();
        Stack<Token> ops = new Stack<>();

        for (Token t : tokens) {
            switch (t.type) {
                case CONST -> output.add(t);
                case VAR -> output.add(t);
                case OP -> {
                    String op = t.op;
                    if ("(".equals(op)) {
                        ops.push(t);
                    } else if (")".equals(op)) {
                        while (!ops.isEmpty() && !"(".equals(ops.peek().op)) {
                            output.add(ops.pop());
                        }
                        if (ops.isEmpty() || !"(".equals(ops.peek().op)) {
                            throw new RuntimeException("Несоответствие скобок");
                        }
                        ops.pop(); // убрать '('
                    } else {
                        while (!ops.isEmpty() && !"(".equals(ops.peek().op)
                                && PRECEDENCE.getOrDefault(ops.peek().op, 0) >= PRECEDENCE.getOrDefault(op, 0)) {
                            output.add(ops.pop());
                        }
                        ops.push(t);
                    }
                }
            }
        }

        while (!ops.isEmpty()) {
            Token t = ops.pop();
            if ("(".equals(t.op) || ")".equals(t.op)) throw new RuntimeException("Несоответствие скобок");
            output.add(t);
        }

        return output;
    }
}
