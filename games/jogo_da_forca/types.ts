// Source - https://stackoverflow.com/a/77736636
// Posted by antitoxic, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-23, License - CC BY-SA 4.0

// this is a utility type for our purposes:
export type OnlyFirstChar<S extends string> = S extends `${infer $TFirstChar}${string}`
  ? $TFirstChar
  : string;
// this is the type you are after:
export type SingleChar<S extends string> = S extends S & OnlyFirstChar<S>
  ? S & OnlyFirstChar<S>
  : string & { length: 1 };
