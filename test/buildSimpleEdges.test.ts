import { expect } from 'chai';
import { buildSimpleEdges, SimpleAST } from '../src/languages/simple';

describe('buildSimpleEdges', () => {
  it('handles names with special regex characters', () => {
    const ast: SimpleAST = {
      functions: [
        { name: 'foo$bar', body: '' },
        { name: 'baz', body: 'foo$bar();' }
      ]
    };
    const edges = buildSimpleEdges(ast);
    expect(edges).to.deep.equal([{ from: 'baz', to: 'foo$bar' }]);
  });
});
