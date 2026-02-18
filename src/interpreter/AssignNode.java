package interpreter;

public class AssignNode implements StatementNode {

    private String name;
    private ExpressionNode expression;

    public AssignNode(String name, ExpressionNode expression) {
        this.name = name;
        this.expression = expression;
    }

    @Override
    public void execute(Context context) {
        int value = expression.evaluate(context);
        context.setVariable(name, value);
    }
}
