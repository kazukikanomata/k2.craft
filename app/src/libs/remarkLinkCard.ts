// src/libs/remarkLinkCard.ts
import { buildCardHtml, fetchOgpData } from "./linkPreview";

type MdNode = {
  type: string;
  url?: string;
  value?: string;
  children?: MdNode[];
};

const getSoleUrl = (paragraph: MdNode): string | null => {
  const [child, ...rest] = paragraph.children ?? [];
  if (rest.length > 0 || child?.type !== "link" || !child.url) return null;

  // [表示テキスト](URL) は通常のリンクとして残し、URL単独の行(GFMが自動リンク化する)だけをカード化する
  const text = child.children?.length === 1 ? child.children[0].value : null;
  return text === child.url && child.url.startsWith("http") ? child.url : null;
};

/**
 * 単独の行に書かれたURLをOGPカードに変換する。
 * ネストした要素(引用やリストの中)は対象外で、トップレベルの段落のみ処理する。
 */
export const remarkLinkCard = () => {
  return async (tree: MdNode) => {
    await Promise.all(
      (tree.children ?? []).map(async (node, index) => {
        if (node.type !== "paragraph") return;

        const url = getSoleUrl(node);
        if (!url) return;

        const ogp = await fetchOgpData(url);
        if (!ogp) return;

        tree.children![index] = { type: "html", value: buildCardHtml(url, ogp) };
      })
    );
  };
};
