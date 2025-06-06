export interface MoveFunction { name: string; body: string; }
export interface MoveAST { functions: MoveFunction[]; }
export function parse(source: string): MoveAST {
  const functions: MoveFunction[] = [];
  const fnRegex = /fun\s+(\w+)\s*\([^)]*\)\s*{([\s\S]*?)}/g;
  let match: RegExpExecArray | null;
  while ((match = fnRegex.exec(source)) !== null) {
    functions.push({ name: match[1], body: match[2] });
  }
  return { functions };
}
