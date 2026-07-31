const expressionDisplay = document.querySelector("#expression");
const resultDisplay = document.querySelector("#result");
const angleModeButton = document.querySelector("#angleMode");
const keypad = document.querySelector(".keypad");

let expression = "";
let angleMode = "DEG";
let justEvaluated = false;

function prettify(value) {
  return value
    .replace(/sqrt\(/g, "√(")
    .replace(/\bpi\b/g, "π")
    .replace(/\*\*/g, "^")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−");
}

function updateDisplay(preview = null) {
  expressionDisplay.textContent = expression ? prettify(expression) : "계산을 시작해 보세요!";
  expressionDisplay.scrollLeft = expressionDisplay.scrollWidth;
  resultDisplay.textContent = preview ?? (expression ? "…" : "0");
}

function formatNumber(value) {
  if (!Number.isFinite(value)) throw new Error("계산할 수 없어요");
  if (Math.abs(value) < 1e-12) return "0";
  const rounded = Number.parseFloat(value.toPrecision(12));
  return Math.abs(rounded) >= 1e12 || (Math.abs(rounded) < 1e-9 && rounded !== 0)
    ? rounded.toExponential(8).replace(/\.?(0+)e/, "e")
    : rounded.toString();
}

function factorial(number) {
  if (!Number.isInteger(number) || number < 0 || number > 170) {
    throw new Error("팩토리얼은 0~170 사이 정수만 가능해요");
  }
  let result = 1;
  for (let i = 2; i <= number; i += 1) result *= i;
  return result;
}

function toRadians(number) {
  return angleMode === "DEG" ? number * Math.PI / 180 : number;
}

function evaluate(rawExpression) {
  if (!rawExpression) return 0;

  let safe = rawExpression
    .replace(/π/g, "pi")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\^/g, "**");

  if (!/^[0-9+\-*/().,!\s_a-zA-Z]*$/.test(safe)) throw new Error("올바른 식을 입력해 주세요");

  let previous;
  do {
    previous = safe;
    safe = safe.replace(/(\d+(?:\.\d+)?|\([^()]*\))!/g, (_, value) => `factorial(${value})`);
  } while (safe !== previous && safe.includes("!"));

  if (safe.includes("!")) throw new Error("팩토리얼 식을 확인해 주세요");

  const helpers = {
    sin: (x) => Math.sin(toRadians(x)),
    cos: (x) => Math.cos(toRadians(x)),
    tan: (x) => {
      const radians = toRadians(x);
      if (Math.abs(Math.cos(radians)) < 1e-12) throw new Error("이 각도의 tan 값은 정의되지 않아요");
      return Math.tan(radians);
    },
    sqrt: (x) => {
      if (x < 0) throw new Error("음수의 제곱근은 계산할 수 없어요");
      return Math.sqrt(x);
    },
    log: (x) => {
      if (x <= 0) throw new Error("로그에는 양수가 필요해요");
      return Math.log10(x);
    },
    ln: (x) => {
      if (x <= 0) throw new Error("로그에는 양수가 필요해요");
      return Math.log(x);
    },
    factorial,
    pi: Math.PI,
    e: Math.E,
  };

  const names = Object.keys(helpers);
  const values = Object.values(helpers);
  const calculate = Function(...names, `"use strict"; return (${safe});`);
  return calculate(...values);
}

function endsWithValue() {
  return /[0-9)e!]$/.test(expression) || expression.endsWith("pi");
}

function appendNumber(number) {
  if (justEvaluated) {
    expression = "";
    justEvaluated = false;
  }
  if (endsWithValue() && /[)e!]$/.test(expression)) expression += "*";
  if (expression === "0") expression = number;
  else expression += number;
  updateDisplay();
}

function appendDecimal() {
  if (justEvaluated) {
    expression = "";
    justEvaluated = false;
  }
  const lastNumber = expression.split(/[+\-*/()]/).pop();
  if (lastNumber.includes(".")) return;
  if (!lastNumber || /[a-z!]$/i.test(lastNumber)) expression += "0";
  expression += ".";
  updateDisplay();
}

function appendOperator(operator) {
  justEvaluated = false;
  const token = operator;
  if (!expression && token === "−") expression = "-";
  else if (!expression) return;
  else if (/[+\-*/^]$/.test(expression)) expression = expression.slice(0, -1) + operator;
  else expression += operator;
  updateDisplay();
}

function appendFunction(name) {
  if (justEvaluated) justEvaluated = false;
  if (endsWithValue()) expression += "*";
  expression += `${name}(`;
  updateDisplay();
}

function appendConstant(constant) {
  if (justEvaluated) {
    expression = "";
    justEvaluated = false;
  }
  if (endsWithValue()) expression += "*";
  expression += constant === "pi" ? "pi" : "e";
  updateDisplay();
}

function appendParenthesis(parenthesis) {
  if (justEvaluated && parenthesis === "(") {
    expression = "";
    justEvaluated = false;
  }
  if (parenthesis === "(") {
    if (endsWithValue()) expression += "*";
    expression += "(";
  } else {
    const opens = (expression.match(/\(/g) || []).length;
    const closes = (expression.match(/\)/g) || []).length;
    if (opens > closes && !/[+\-*/^(]$/.test(expression)) expression += ")";
  }
  updateDisplay();
}

function applyPostfix(type) {
  if (!endsWithValue()) return;
  if (type === "square") expression += "^2";
  if (type === "factorial") expression += "!";
  if (type === "percent") expression += "/100";
  justEvaluated = false;
  updateDisplay();
}

function calculateResult() {
  if (!expression) return;
  try {
    const original = expression;
    const answer = formatNumber(evaluate(expression));
    expressionDisplay.textContent = `${prettify(original)} =`;
    resultDisplay.textContent = answer;
    expression = answer;
    justEvaluated = true;
  } catch (error) {
    resultDisplay.textContent = "앗!";
    expressionDisplay.textContent = error.message || "식을 다시 확인해 주세요";
    justEvaluated = false;
  }
}

function clearCalculator() {
  expression = "";
  justEvaluated = false;
  updateDisplay();
}

function deleteLast() {
  if (justEvaluated) return clearCalculator();
  const functionMatch = expression.match(/(sqrt|sin|cos|tan|log|ln)\($/);
  if (functionMatch) expression = expression.slice(0, -functionMatch[0].length);
  else if (expression.endsWith("pi")) expression = expression.slice(0, -2);
  else expression = expression.slice(0, -1);
  updateDisplay();
}

keypad.addEventListener("click", (event) => {
  const key = event.target.closest("button");
  if (!key) return;

  if (key.dataset.number !== undefined) appendNumber(key.dataset.number);
  else if (key.dataset.function) appendFunction(key.dataset.function);
  else if (key.dataset.constant) appendConstant(key.dataset.constant);
  else if (key.dataset.action === "decimal") appendDecimal();
  else if (key.dataset.action === "operator") appendOperator({ "×": "*", "÷": "/", "−": "-" }[key.dataset.value] || key.dataset.value);
  else if (key.dataset.action === "parenthesis") appendParenthesis(key.dataset.value);
  else if (key.dataset.action === "power") appendOperator("^");
  else if (["square", "factorial", "percent"].includes(key.dataset.action)) applyPostfix(key.dataset.action);
  else if (key.dataset.action === "equals") calculateResult();
  else if (key.dataset.action === "clear") clearCalculator();
  else if (key.dataset.action === "delete") deleteLast();
});

angleModeButton.addEventListener("click", () => {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleModeButton.textContent = angleMode;
  angleModeButton.setAttribute("aria-label", `각도 단위 ${angleMode}`);
});

document.addEventListener("keydown", (event) => {
  if (/^[0-9]$/.test(event.key)) appendNumber(event.key);
  else if (event.key === ".") appendDecimal();
  else if (["+", "-", "*", "/", "^"].includes(event.key)) appendOperator(event.key);
  else if (event.key === "(") appendParenthesis("(");
  else if (event.key === ")") appendParenthesis(")");
  else if (event.key === "!") applyPostfix("factorial");
  else if (event.key === "%") applyPostfix("percent");
  else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculateResult();
  } else if (event.key === "Backspace") deleteLast();
  else if (event.key === "Escape") clearCalculator();
});

updateDisplay();
