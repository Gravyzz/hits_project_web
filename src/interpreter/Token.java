package interpreter;

public class Token {
    public enum Type { CONST, VAR, OP }

    public Type type;
    public int value;       // для CONST
    public String name;     // для VAR
    public String op;       // для OP

    // Конструкторы для удобства
    public static Token constToken(int value) {
        Token t = new Token();
        t.type = Type.CONST;
        t.value = value;
        return t;
    }

    public static Token varToken(String name) {
        Token t = new Token();
        t.type = Type.VAR;
        t.name = name;
        return t;
    }

    public static Token opToken(String op) {
        Token t = new Token();
        t.type = Type.OP;
        t.op = op;
        return t;
    }
}
