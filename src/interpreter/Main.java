package interpreter;

import java.util.List;

public class Main {

    public static void main(String[] args) {

        Context context = new Context();

        ProgramNode program = new ProgramNode(List.of(
                new VarDeclNode("a",
                        new ExpressionNode(List.of(
                                Token.constant(5)
                        ))
                ),
                new AssignNode("a",
                        new ExpressionNode(List.of(
                                Token.variable("a"),
                                Token.constant(3),
                                Token.operator("+")
                        ))
                )
        ));

        program.execute(context);

        System.out.println(context);
    }
}
