// Точка входа в программу, которая создает контекст, строит абстрактное синтаксическое дерево и выполняет его
package interpreter;

import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        System.out.println("=== Пример 1: простое выражение 7 + 13 ===");
        {
            Context ctx = new Context();
            List<String> vars = new ArrayList<>();
            vars.add("a");
            VarDeclNode decl = new VarDeclNode(vars);

            ExpressionNode expr = new ExpressionNode(Parser.parseToRPN("7 + 13"));
            AssignNode assign = new AssignNode("a", expr);

            List<StatementNode> statements = new ArrayList<>();
            statements.add(decl);
            statements.add(assign);

            ProgramNode program = new ProgramNode(statements);
            program.execute(ctx);
            
            if (expr.errors.isEmpty()) {
                System.out.println("✓ Успешно: ");
                ctx.printVariables();
            } else {
                System.out.println("✗ Ошибки:");
                for (ParseError err : expr.errors) {
                    System.out.println("  " + err);
                }
            }
        }

        System.out.println("\n=== Пример 2: выражение с остатком 17 % 5 ===");
        {
            Context ctx = new Context();
            List<String> vars = new ArrayList<>();
            vars.add("b");
            VarDeclNode decl = new VarDeclNode(vars);

            ExpressionNode expr = new ExpressionNode(Parser.parseToRPN("17 % 5"));
            AssignNode assign = new AssignNode("b", expr);

            List<StatementNode> statements = new ArrayList<>();
            statements.add(decl);
            statements.add(assign);

            ProgramNode program = new ProgramNode(statements);
            program.execute(ctx);
            
            if (expr.errors.isEmpty()) {
                System.out.println("✓ Успешно: ");
                ctx.printVariables();
            } else {
                System.out.println("✗ Ошибки:");
                for (ParseError err : expr.errors) {
                    System.out.println("  " + err);
                }
            }
        }

        System.out.println("\n=== Пример 3: деление на ноль (должна быть ошибка) ===");
        {
            Context ctx = new Context();
            List<String> vars = new ArrayList<>();
            vars.add("c");
            VarDeclNode decl = new VarDeclNode(vars);

            ExpressionNode expr = new ExpressionNode(Parser.parseToRPN("10 / 0"));
            AssignNode assign = new AssignNode("c", expr);

            List<StatementNode> statements = new ArrayList<>();
            statements.add(decl);
            statements.add(assign);

            ProgramNode program = new ProgramNode(statements);
            
            try {
                program.execute(ctx);
                if (expr.errors.isEmpty()) {
                    System.out.println("✓ Успешно: ");
                    ctx.printVariables();
                } else {
                    System.out.println("✗ Ошибки:");
                    for (ParseError err : expr.errors) {
                        System.out.println("  " + err);
                    }
                }
            } catch (Exception e) {
                System.out.println("✗ Ошибка выполнения: " + e.getMessage());
                for (ParseError err : expr.errors) {
                    System.out.println("  " + err);
                }
            }
        }

        System.out.println("\n=== Пример 4: сложное выражение 3 * (2 + 5) % 7 ===");
        {
            Context ctx = new Context();
            List<String> vars = new ArrayList<>();
            vars.add("d");
            VarDeclNode decl = new VarDeclNode(vars);

            ExpressionNode expr = new ExpressionNode(Parser.parseToRPN("3 * (2 + 5) % 7"));
            AssignNode assign = new AssignNode("d", expr);

            List<StatementNode> statements = new ArrayList<>();
            statements.add(decl);
            statements.add(assign);

            ProgramNode program = new ProgramNode(statements);
            program.execute(ctx);
            
            if (expr.errors.isEmpty()) {
                System.out.println("✓ Успешно: ");
                ctx.printVariables();
            } else {
                System.out.println("✗ Ошибки:");
                for (ParseError err : expr.errors) {
                    System.out.println("  " + err);
                }
            }
        }
    }
}
