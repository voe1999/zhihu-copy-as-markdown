import { lexer } from "../core/lexer";
import { parser } from "../core/parser";

export default async (dom: HTMLElement): Promise<string> => {
	const lex = lexer(dom.childNodes as NodeListOf<Element>);
	const markdown = parser(lex);
	return markdown.join("\n\n");
}; 