// Память для хранения переменных и их значений во время выполнения программы
package interpreter;

import java.util.HashMap;
import java.util.Map;

public class Context {
    private final Map<String, Integer> variables = new HashMap<>();

    // Объявляем новую переменную
    public void declareVariable(String name) {
        variables.put(name, 0); // по умолчанию 0
    }

    // Устанавливаем значение переменной
    public void setVariable(String name, int value) {
        if (!variables.containsKey(name)) {
            throw new RuntimeException("Переменная " + name + " не объявлена");
        }
        variables.put(name, value);
    }

    // Получаем значение переменной
    public int getVariable(String name) {
        if (!variables.containsKey(name)) {
            throw new RuntimeException("Переменная " + name + " не объявлена");
        }
        return variables.get(name);
    }

    // Для отладки
    public void printVariables() {
        System.out.println(variables);
    }
}
