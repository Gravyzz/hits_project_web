// Объявление переменных, например, var x, y;
package interpreter;

import java.util.List;

public class VarDeclNode extends StatementNode {
    private final List<String> names;

    public VarDeclNode(List<String> names) {
        this.names = names;
    }

    @Override
    public void execute(Context ctx) {
        for (String name : names) {
            ctx.declareVariable(name);
        }
    }
}
