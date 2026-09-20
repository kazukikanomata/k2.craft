import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { CATEGORIES, type CategoryName } from "./constants/index.ts";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(120),
    category: z.array(z.enum(Object.keys(CATEGORIES) as [CategoryName, ...CategoryName[]])).default([]),
    icon: z.emoji(),
    publishedAt: z.coerce.date(),
    published: z.boolean().default(true),
  }),
});

export const collections = { blog };
