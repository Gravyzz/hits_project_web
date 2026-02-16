package interpreter;

import java.util.List;

public class ProgramNode {
    public List<StatementNode> statements;

    public ProgramNode(List<StatementNode> statements) {
        this.statements = statements;
    }

    public void execute(Context ctx) {
        for (StatementNode stmt : statements) {
            stmt.execute(ctx);
        }
    }
}
