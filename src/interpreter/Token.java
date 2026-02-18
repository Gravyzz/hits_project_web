package interpreter;

public class Token {

    public enum Type {
        CONST,
        VAR,
        OP
    }

    public Type type;

    public int value;
    public String name;
    public String op;

    private Token(Type type) {
        this.type = type;
    }

    public static Token constant(int value) {
        Token t = new Token(Type.CONST);
        t.value = value;
        return t;
    }

    public static Token variable(String name) {
        Token t = new Token(Type.VAR);
        t.name = name;
        return t;
    }

    public static Token operator(String op) {
        Token t = new Token(Type.OP);
        t.op = op;
        return t;
    }
}
