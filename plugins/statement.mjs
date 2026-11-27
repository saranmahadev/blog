// @ts-check
import { defineHastPlugin } from 'satteri';

/**
 * Sätteri hast plugin: a paragraph that is *entirely* bold text ("**Like this.**") becomes a
 * statement. CSS alone cannot tell that apart from a paragraph that merely contains some bold
 * words, so the decision is made here, once, at build time, and recorded as a class.
 */
export const statementPlugin = () =>
  defineHastPlugin({
    name: 'statement',
    element: {
      filter: ['p'],
      visit(node, ctx) {
        const content = node.children.filter((child) => !(child.type === 'text' && !child.value.trim()));
        if (content.length === 1 && content[0].type === 'element' && content[0].tagName === 'strong') {
          ctx.setProperty(node, 'className', ['statement']);
        }
      },
    },
  });
