// Присваивание значений переменным, например, x = 10;
package interpreter;

public class AssignNode extends StatementNode {
    private final String target;
    private final ExpressionNode expression;

    public AssignNode(String target, ExpressionNode expression) {
        this.target = target;
        this.expression = expression;
    }

    @Override
    public void execute(Context ctx) {
        int value = expression.evaluate(ctx);
        ctx.setVariable(target, value);
    }
}
