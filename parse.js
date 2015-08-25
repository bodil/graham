/* @flow -*- mode: flow -*- */

type ParseResult<A> = ?[A, string];
type Parser<A> = (input: string) => ParseResult<A>;

export function parse<A>(parser: Parser<A>, input: string): ParseResult<A> {
  return parser(input);
}

export function run(genFunc) {
  return function(input) {
    const gen = genFunc();
    const runP = function runP(input, val) {
      const next = gen.next(val);
      if (next.done) {
        return [next.value, input];
      } else {
        const out = parse(next.value, input);
        if (out == null) {
          return null;
        } else {
          const [result, nextInput] = out;
          return runP(nextInput, result);
        }
      }
    }
    return runP(input);
  };
}

export function seq<A, B>(p: Parser<A>, f: (a: A) => Parser<B>): Parser<B> {
  return (input) => {
    const out = parse(p, input);
    return out != null ? parse(f(out[0]), out[1]) : null;
  };
}

export function either<A>(a: Parser<A>, b: Parser<A>): Parser<A> {
  return (input) => {
    return parse(a, input) || parse(b, input);
  };
}

export function ret<A>(value: A): Parser<A> {
  return (input) => [value, input];
}

export function fail<A>(input: string): ParseResult<A> {
  return null;
}

export function item(input: string): ParseResult<string> {
  return input.length > 0 ? [input[0], input.slice(1)] : null;
}

export function sat(p: (c: string) => boolean): Parser<string> {
  return seq(item, (v) => p(v) ? ret(v) : fail);
}

export const isDigit = (c) => /^\d$/.test(c);
export const isSpace = (c) => /^\s$/.test(c);
export const isAlphanum = (c) => /^\w$/.test(c);
export const isLetter = (c) => /^[a-zA-Z]$/.test(c);
export const isUpper = (c) => isLetter(c) && c == c.toUpperCase();
export const isLower = (c) => isLetter(c) && c == c.toLowerCase();

export const digit = sat(isDigit);
export const space = sat(isSpace);
export const alphanum = sat(isAlphanum);
export const letter = sat(isLetter);
export const upper = sat(isUpper);
export const lower = sat(isLower);

export function char(c: string): Parser<string> {
  return sat((i) => i == c);
}

export function string(s: string): Parser<string> {
  if (s.length > 0) {
    return seq(char(s[0]),
           (_) => seq(string(s.slice(1)),
           (_) => ret(s)));
  } else {
    return ret("");
  }
}

export function manyA<A>(p: Parser<A>): Parser<Array<A>> {
  return either(many1A(p), ret([]));
}

export function many1A<A>(p: Parser<A>): Parser<Array<A>> {
  return seq(p,
         (v) => seq(manyA(p),
         (vs) => ret([v].concat(vs))));
}

export function many(p: Parser<string>): Parser<string> {
  return either(many1(p), ret(""));
}

export function many1(p: Parser<string>): Parser<string> {
  return seq(p,
         (v) => seq(many(p),
         (vs) => ret(v + vs)));
}

export function str(ps: Array<Parser<string>>): Parser<string> {
  return ps.length > 0 ? seq(ps[0], (v) => seq(str(ps.slice(1)), (vs) => ret(v + vs)))
      : ret("");
}

export const spaces = many(space);
export const spaces1 = many1(space);

export const num: Parser<number> = seq(
  str([
    either(char("-"), ret("")),
    many(digit),
    either(str([
      char("."),
      many1(digit)
    ]), ret(""))
  ]), (s) => {
    const n = parseFloat(s);
    return isNaN(n) ? fail : ret(n);
  });

export function makeParser<A>(p: Parser<A>): ((s: string) => A) {
  return (s) => {
    const parsed = parse(p, s);
    if (parsed == null) {
      throw new Error(`Syntax error in descriptor: "${s}"`);
    } else {
      if (parsed[1] === "") {
        return parsed[0];
      } else {
        throw new Error(`In descriptor "${s}": expected EOF, saw "${parsed[1]}"`);
      }
    }
  };
}
