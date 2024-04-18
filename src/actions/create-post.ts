'use server';

import type { Post, Topic } from '@prisma/client';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';

import paths from '@/paths';

const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

interface CreatePostFormState {
  errors: {
    title?: string[];
    content?: string[];
    _form?: string[];
  };
}

export async function createPost(
  slug: string,
  formState: CreatePostFormState,
  formData: FormData
): Promise<CreatePostFormState> {
  const result = createPostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!result.success) {
    console.log(result.error.flatten().fieldErrors);

    return {
      errors: result.error.flatten().fieldErrors,
    };
  }
  const sussion = await auth();

  if (!sussion || !sussion.user || !sussion.user.id) {
    return {
      errors: {
        _form: ['You must be signed in to do this'],
      },
    };
  }

  let topic: Topic | null = await db.topic.findFirst({
    where: {
      slug,
    },
  });

  if (!topic) {
    return {
      errors: {
        _form: ['Can not find topic'],
      },
    };
  }

  let post: Post;

  try {
    post = await db.post.create({
      data: {
        title: result.data.title,
        content: result.data.content,
        userId: sussion.user.id,
        topicId: topic.id,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        errors: {
          _form: [err.message],
        },
      };
    } else {
      return {
        errors: {
          _form: ['Failed to create post'],
        },
      };
    }
  }

  revalidatePath(paths.topicShow(slug));
  redirect(paths.postShow(slug, post.id));
}
