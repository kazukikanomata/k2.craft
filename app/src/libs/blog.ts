// src/libs/blog.ts
import { getCollection, type CollectionEntry } from "astro:content";
import { CATEGORIES, LIMIT } from "@constants/index.ts";

export type Post = CollectionEntry<"blog">;

export const categories = Object.entries(CATEGORIES).map(([name, slug]) => ({
  name,
  slug,
}));

// 公開済みの記事を新しい順に返す。下書き(published: false)はローカル開発(dev)のときだけ含める
export const getPosts = async (): Promise<Post[]> => {
  const posts = await getCollection("blog", ({ data }) => import.meta.env.DEV || data.published);
  return posts.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
};

export const getPostsByCategory = async (slug: string): Promise<Post[]> => {
  const posts = await getPosts();
  return posts.filter((post) => post.data.category.some((name) => CATEGORIES[name] === slug));
};

// 関連記事: 最初のカテゴリが同じ記事を新着順に
export const getRelatedPosts = async (post: Post, limit = 4): Promise<Post[]> => {
  const [firstCategory] = post.data.category;
  if (!firstCategory) return [];

  const posts = await getPostsByCategory(CATEGORIES[firstCategory]);
  return posts.filter((related) => related.id !== post.id).slice(0, limit);
};

export const paginate = (posts: Post[], page: number): Post[] =>
  posts.slice((page - 1) * LIMIT, page * LIMIT);

export const totalPages = (count: number): number => Math.ceil(count / LIMIT);
