// src/libs/remarkAlertTitle.ts
type MdNode = {
  type: string;
  value?: string;
  data?: { hProperties?: { className?: string } };
  children?: MdNode[];
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

/**
 * アラートのタイトル(NOTE, WARNINGなど)をアッパーキャメルケース(Note, Warning)にする。
 * remark-github-blockquote-alertはタイトルを大文字で出力し、オプションでも変更できないため、
 * remarkAlertの後に実行してテキストだけを書き換える。
 */
export const remarkAlertTitle = () => {
  const visit = (node: MdNode) => {
    if (node.data?.hProperties?.className === "markdown-alert-title") {
      for (const child of node.children ?? []) {
        if (child.type === "text" && child.value) child.value = capitalize(child.value);
      }
      return;
    }
    node.children?.forEach(visit);
  };

  return visit;
};
