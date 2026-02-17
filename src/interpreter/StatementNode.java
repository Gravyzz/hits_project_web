// Для команд, которые выполняют определенные действия, например, присваивание, условные операторы и циклы
package interpreter;

public abstract class StatementNode {
    public abstract void execute(Context ctx);
}
