import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        publishDate: z.string().transform((str) => new Date(str))
    })
});

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        tags: z.array(z.string()),
    })
})

export const collections = {
    'blog': blogCollection,
    'notes': notesCollection
};