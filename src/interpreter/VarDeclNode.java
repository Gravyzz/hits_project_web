package interpreter;

public class VarDeclNode implements StatementNode {

    private String name;
    private ExpressionNode expression;

    public VarDeclNode(String name, ExpressionNode expression) {
        this.name = name;
        this.expression = expression;
    }

    @Override
    public void execute(Context context) {
        int value = expression.evaluate(context);
        context.declareVariable(name, value);
    }
}
