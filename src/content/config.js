import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        publishDate: z.string().transform((str) => new Date(str)),
        draft: z.boolean()
    })
});

const notesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        draft: z.boolean()
    })
})

export const collections = {
    'blog': blogCollection,
    'notes': notesCollection
};