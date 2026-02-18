// Память для хранения переменных и их значений во время выполнения программы
package interpreter;

import java.util.HashMap;
import java.util.Map;

public class Context {

    private Map<String, Integer> variables = new HashMap<>();

    public void declareVariable(String name, int value) {
        if (variables.containsKey(name)) {
            throw new RuntimeException("Переменная уже объявлена: " + name);
        }
        variables.put(name, value);
    }

    public void setVariable(String name, int value) {
        if (!variables.containsKey(name)) {
            throw new RuntimeException("Переменная не объявлена: " + name);
        }
        variables.put(name, value);
    }

    public int getVariable(String name) {
        if (!variables.containsKey(name)) {
            throw new RuntimeException("Переменная не объявлена: " + name);
        }
        return variables.get(name);
    }

    @Override
    public String toString() {
        return variables.toString();
    }
}