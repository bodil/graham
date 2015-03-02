/* @flow -*- mode: flow -*- */

type ParseResult<A> = ?[A, string];
type Parser<A> = (input: string) => ParseResult<A>;

function parse<A>(parser: Parser<A>, input: string): ParseResult<A> {
  return parser(input);
}

function seq<A, B>(p: Parser<A>, f: (a: A) => Parser<B>): Parser<B> {
  return (input) => {
    var out = parse(p, input);
    return out != null ? parse(f(out[0]), out[1]) : null;
  };
}

function either<A>(a: Parser<A>, b: Parser<A>): Parser<A> {
  return (input) => {
    return parse(a, input) || parse(b, input);
  };
}

function ret<A>(value: A): Parser<A> {
  return (input) => [value, input];
}

function fail<A>(input: string): ParseResult<A> {
  return null;
}

function item(input: string): ParseResult<string> {
  return input.length > 0 ? [input[0], input.slice(1)] : null;
}

function sat(p: (c: string) => boolean): Parser<string> {
  return seq(item, (v) => p(v) ? ret(v) : fail);
}

var isDigit = (c) => /^\d$/.test(c);
var isSpace = (c) => /^\s$/.test(c);
var isAlphanum = (c) => /^\w$/.test(c);
var isLetter = (c) => /^[a-zA-Z]$/.test(c);
var isUpper = (c) => isLetter(c) && c == c.toUpperCase();
var isLower = (c) => isLetter(c) && c == c.toLowerCase();

var digit = sat(isDigit);
var space = sat(isSpace);
var alphanum = sat(isAlphanum);
var letter = sat(isLetter);
var upper = sat(isUpper);
var lower = sat(isLower);

function char(c: string): Parser<string> {
  return sat((i) => i == c);
}

function string(s: string): Parser<string> {
  if (s.length > 0) {
    return seq(char(s[0]),
           (_) => seq(string(s.slice(1)),
           (_) => ret(s)));
  } else {
    return ret("");
  }
}

function manyA<A>(p: Parser<A>): Parser<Array<A>> {
  return either(many1A(p), ret([]));
}

function many1A<A>(p: Parser<A>): Parser<Array<A>> {
  return seq(p,
         (v) => seq(manyA(p),
         (vs) => ret([v].concat(vs))));
}

function many(p: Parser<string>): Parser<string> {
  return either(many1(p), ret(""));
}

function many1(p: Parser<string>): Parser<string> {
  return seq(p,
         (v) => seq(many(p),
         (vs) => ret(v + vs)));
}

function str(ps: Array<Parser<string>>): Parser<string> {
  return ps.length > 0 ? seq(ps[0], (v) => seq(str(ps.slice(1)), (vs) => ret(v + vs)))
      : ret("");
}

var spaces = many(space);
var spaces1 = many1(space);

var num: Parser<number> = seq(
  str([
    either(char("-"), ret("")),
    many(digit),
    either(str([
      char("."),
      many1(digit)
    ]), ret(""))
  ]), (s) => {
    var n = parseFloat(s);
    return isNaN(n) ? fail : ret(n);
  });

function makeParser<A>(p: Parser<A>): ((s: string) => A) {
  return (s) => {
    var parsed = parse(p, s);
    if (parsed == null) {
      throw new Error("Syntax error in descriptor: \"" + s + "\"");
    } else {
      if (parsed[1] === "") {
        return parsed[0];
      } else {
        throw new Error("In descriptor \"" + s + "\": expected EOF, saw \"" +
                        parsed[1] + "\"");
      }
    }
  };
}

module.exports = {
  parse: parse,
  seq: seq,
  bind: seq,
  either: either,
  ret: ret,
  fail: fail,
  item: item,
  sat: sat,
  digit: digit,
  letter: letter,
  space: space,
  upper: upper,
  lower: lower,
  alphanum: alphanum,
  char: char,
  string: string,
  manyA: manyA,
  many1A: many1A,
  many: many,
  many1: many1,
  str: str,
  spaces: spaces,
  spaces1: spaces1,
  num: num,
  makeParser: makeParser
};

try {
  module.exports.ParseResult = ParseResult;
  module.exports.Parser = Parser;
} catch(e) {}
