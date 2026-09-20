// サイトのタイトルと説明(ヘッダー・<title>・meta descriptionに使う)
export const SITE_TITLE = "k2.craft";
export const SITE_DESCRIPTION = "設計思想とか作ったものの紹介とかを提供する";

// 1ページの表示件数
export const LIMIT = 10;

// カテゴリ名(記事のfrontmatterに書く値) → URLのslug。
// slugはmicroCMS時代の既存URL(/category/<slug>)を壊さないよう、当時のidを引き継いでいる。
export const CATEGORIES = {
  生成AI: "8_nr4vpky",
  "IT tech": "y2_6-g_6v5",
  学び: "g-j4mlf0u",
  心理: "p82ku1f8sh",
  エンタメ: "9j-mkrb-6",
  本: "mzvjr5skl8w",
  ニュース: "fsvfz9-m9j",
  就活: "a94ukva9br_m",
} as const;

export type CategoryName = keyof typeof CATEGORIES;
