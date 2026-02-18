# HITS Project - Visual Algorithm Interpreter

Web-based visual algorithm interpreter for educational purposes. Build algorithms using visual blocks and execute them with a custom Java interpreter.

## 🎯 Features

- **Visual Block Programming**: Drag-and-drop algorithm construction
- **Custom Interpreter**: Parses visual blocks into AST and executes
- **Real-time Feedback**: Error detection and highlighting
- **Multiple Algorithms**: Support for variables, assignment, conditionals, loops, arrays

## 📋 Project Structure

```
.
├── src/interpreter/          # Java backend interpreter
│   ├── Main.java            # Entry point with examples
│   ├── Server.java          # HTTP server (JSON API)
│   ├── Parser.java          # Lexer + Shunting-yard algorithm
│   ├── Context.java         # Runtime memory (variables)
│   ├── Token.java           # Token representation
│   ├── ProgramNode.java     # Program executor
│   ├── ExpressionNode.java  # Expression evaluator
│   ├── AssignNode.java      # Assignment statement
│   ├── VarDeclNode.java     # Variable declaration
│   ├── IfNode.java          # If/if-else statement
│   ├── Condition.java       # Logical condition evaluator
│   ├── ParseError.java      # Structured error reporting
│   └── StatementNode.java   # Abstract statement class
├── index.html               # Frontend entry point
├── script.js                # Frontend logic
├── style.css                # Frontend styling
├── pom.xml                  # Maven project configuration
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- **Java 17+** installed
- **Maven 3.6+** (for dependency management)

### Build & Run

#### Option 1: Using Maven (Recommended)

```bash
# Install dependencies and build JAR
mvn clean install

# Run the server
mvn exec:java -Dexec.mainClass="interpreter.Server"
```

#### Option 2: Compile Manually

```bash
# Compile all Java files
javac -cp src src/interpreter/*.java -d out

# Run examples
java -cp out interpreter.Main
```

#### Option 3: Run with JDK only (no Maven)

```bash
# If you have org.json JAR (download from: https://mvnrepository.com/artifact/org.json/json/20231013)
# Place it in a 'lib' folder

javac -cp "lib/*" -d out src/interpreter/*.java
java -cp "out:lib/*" interpreter.Server
```

## 📡 API Endpoints

### 1. POST `/parse`

Parse an arithmetic expression to RPN tokens.

**Request:**
```json
{
  "expression": "3 * (2 + 5) % 7"
}
```

**Response:**
```json
{
  "success": true,
  "expression": "3 * (2 + 5) % 7",
  "rpn": [
    {"type": "CONST", "value": 3},
    {"type": "CONST", "value": 2},
    {"type": "CONST", "value": 5},
    {"type": "OP", "value": "+"},
    {"type": "OP", "value": "*"},
    {"type": "CONST", "value": 7},
    {"type": "OP", "value": "%"}
  ],
  "errors": []
}
```

### 2. POST `/execute`

Execute a complete program.

**Request:**
```json
{
  "program": {
    "variables": ["a", "b"],
    "statements": [
      {
        "type": "assign",
        "target": "a",
        "expression": "10"
      },
      {
        "type": "if",
        "condition": {
          "left": "a",
          "operator": ">",
          "right": "5"
        },
        "thenStatements": [
          {
            "type": "assign",
            "target": "b",
            "expression": "100"
          }
        ],
        "elseStatements": []
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "variables": {
    "a": 10,
    "b": 100
  },
  "errors": []
}
```

### 3. GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": 1708156800000
}
```

## 💡 Examples

### Running the server

```bash
# Start server on localhost:8080
mvn exec:java -Dexec.mainClass="interpreter.Server"
```

### Testing with curl

```bash
# Parse expression
curl -X POST http://localhost:8080/parse \
  -H "Content-Type: application/json" \
  -d '{"expression": "5 + 3 * 2"}'

# Execute program
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "program": {
      "variables": ["x"],
      "statements": [
        {"type": "assign", "target": "x", "expression": "42"}
      ]
    }
  }'

# Health check
curl http://localhost:8080/health
```

## 🎓 Supported Language Features

### Arithmetic Expressions
- Operators: `+`, `-`, `*`, `/`, `%`
- Parentheses for grouping: `(a + b) * c`
- Variables and constants: `2 * x + 5`

### Variables
- Declaration: `var a, b, c;`
- Assignment: `a = 10;`
- Used in expressions: `b = a + 5;`

### Conditionals
- If statements: `if (condition) { ... }`
- If-else: `if (condition) { ... } else { ... }`
- Comparison operators: `>`, `<`, `==`, `!=`, `>=`, `<=`

### Future Support
- Loops (while, for)
- Arrays
- Functions
- String operations
- Floating point numbers

## 📚 Development Notes

### Token Types
- **CONST**: Integer constant (e.g., `42`)
- **VAR**: Variable name (e.g., `x`)
- **OP**: Operator (e.g., `+`, `>`)

### Architecture
1. **Lexer** (Parser.tokenize): Text → Tokens
2. **Parser** (Parser.parseToRPN): Tokens → RPN using Shunting-yard algorithm
3. **Evaluator** (ExpressionNode.evaluate): RPN → Integer value
4. **Executor** (ProgramNode.execute): Statements → Program execution

### Error Handling
- Structured errors with position information (startPos, endPos)
- Error types: SyntaxError, RuntimeError
- Returns both to frontend for UI highlighting

## 🐛 Testing

Run the examples file:

```bash
javac -d out src/interpreter/*.java
java -cp out interpreter.Main
```

Expected output:
```
=== Пример 1: простое выражение 7 + 13 ===
✓ Успешно: 
{a=20}

=== Пример 2: выражение с остатком 17 % 5 ===
✓ Успешно: 
{b=2}
...
```

## 📝 License

Educational project for HITS (Higher IT School)

## 👥 Team

- Backend: Java Interpreter & Server
- Frontend: HTML/CSS/JS visual blocks