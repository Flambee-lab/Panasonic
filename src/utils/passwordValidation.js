const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^A-Za-z0-9]/;

export function evaluatePassword(password) {
  const len = password.length;
  return {
    length: len >= 8 && len <= 32,
    uppercase: UPPER.test(password),
    number: DIGIT.test(password),
    symbol: SYMBOL.test(password),
  };
}

export function isPasswordValid(password) {
  const r = evaluatePassword(password);
  return r.length && r.uppercase && r.number && r.symbol;
}

export function passwordsMatch(password, confirm) {
  return password.length > 0 && password === confirm;
}
