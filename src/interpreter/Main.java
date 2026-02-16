package interpreter;

import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        Context ctx = new Context();

        // --- объявление переменных ---
        List<String> vars = new ArrayList<>();
        vars.add("a");

        VarDeclNode decl = new VarDeclNode(vars);

        // --- выражение 5 3 + ---
        List<Token> exprTokens = new ArrayList<>();
        exprTokens.add(Token.constToken(5));
        exprTokens.add(Token.constToken(3));
        exprTokens.add(Token.opToken("+"));

        ExpressionNode expr = new ExpressionNode(exprTokens);
        AssignNode assign = new AssignNode("a", expr);

        // --- программа ---
        List<StatementNode> statements = new ArrayList<>();
        statements.add(decl);
        statements.add(assign);

        ProgramNode program = new ProgramNode(statements);

        // --- запуск ---
        program.execute(ctx);
        ctx.printVariables(); // {a=8}
    }
}
