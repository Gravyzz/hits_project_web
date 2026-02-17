// Класс для хранения информации об ошибке парсинга или выполнения
package interpreter;

public class ParseError {
    public String message;        // Текст ошибки (например, "Деление на ноль")
    public String type;           // Тип ошибки: "SyntaxError" или "RuntimeError"
    public int startPos;          // Начало ошибки в строке (позиция символа)
    public int endPos;            // Конец ошибки в строке

    public ParseError(String message, String type, int startPos, int endPos) {
        this.message = message;
        this.type = type;
        this.startPos = startPos;
        this.endPos = endPos;
    }

    @Override
    public String toString() {
        return String.format("[%s] %s (позиция %d-%d)", type, message, startPos, endPos);
    }
}
