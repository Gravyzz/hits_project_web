package interpreter;

import java.util.List;

public class ProgramNode {

    private List<StatementNode> statements;

    public ProgramNode(List<StatementNode> statements) {
        this.statements = statements;
    }

    public void execute(Context context) {
        for (StatementNode stmt : statements) {
            stmt.execute(context);
        }
    }
}
