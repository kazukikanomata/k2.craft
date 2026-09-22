// src/libs/rehypeHeadingSpan.ts
type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/**
 * h3の中身を<span>で包む。
 * h3の下線を「全幅のグレー線+文字幅だけのアクセント線」にするには、文字部分をinline-blockで
 * 囲む必要があるため。rehypeAutolinkHeadingsの前に実行すると、アンカー(#)は<span>の外に
 * 追加され、アクセント線の幅に含まれない。
 */
export const rehypeHeadingSpan = () => {
  const visit = (node: HastNode) => {
    if (node.type === "element" && node.tagName === "h3" && node.children) {
      node.children = [
        { type: "element", tagName: "span", properties: {}, children: node.children },
      ];
      return;
    }
    node.children?.forEach(visit);
  };

  return visit;
};
