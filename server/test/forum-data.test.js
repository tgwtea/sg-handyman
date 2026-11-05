import { test } from 'node:test';
import assert from 'node:assert/strict';
import forumController from '../controllers/forum-controller.js';
import Forum from '../models/forum-model.js';

const user = { _id: '507f1f77bcf86cd799439011', role: 'customer' };
const postId = '507f1f77bcf86cd799439012';

async function call(handler, body = {}, params = {}) {
  let code = 200;
  let responseBody;
  const response = {
    status(statusCode) {
      code = statusCode;
      return this;
    },
    send(data) {
      responseBody = data;
    }
  };

  await handler({ session: { user }, body, params }, response);
  return { code, body: responseBody };
}

test('create post returns a success message', async (t) => { // help object to replace real database functions with fake once 
  let savedPost;
  t.mock.method(Forum, 'createForumPost', async (post) => {
    savedPost = post;
  });

  const response = await call(forumController.createPost, {
    title: 'API test post',
    content: 'Post content',
    category: 'General'
  });

  assert.equal(response.code, 201);
  assert.deepEqual(response.body, { message: 'Post created' });
  assert.equal(savedPost.title, 'API test post');
  assert.equal(savedPost.authorId, user._id);
});

test('read posts returns the forum posts', async (t) => {
  const posts = [{ title: 'API test post', content: 'Post content' }];
  t.mock.method(Forum, 'findAllForumPosts', async () => posts);

  const response = await call(forumController.getPosts);

  assert.equal(response.code, 200);
  assert.deepEqual(response.body, posts);
});

test('update post returns a success message', async (t) => {
  const post = { authorId: user._id };
  let updatedDetails;
  t.mock.method(Forum, 'findForumPostById', async () => post);
  t.mock.method(Forum, 'updateForumPost', async (_post, details) => {
    updatedDetails = details;
  });

  const response = await call(
    forumController.updatePost,
    {
      title: 'Updated title',
      content: 'Updated content',
      category: 'General'
    },
    { postId }
  );

  assert.equal(response.code, 200);
  assert.deepEqual(response.body, { message: 'Post updated' });
  assert.equal(updatedDetails.title, 'Updated title');
});

test('delete post returns a success message', async (t) => {
  const post = { authorId: user._id };
  let deletedPostId;
  t.mock.method(Forum, 'findForumPostById', async () => post);
  t.mock.method(Forum, 'deleteForumPostById', async (id) => {
    deletedPostId = id;
  });

  const response = await call(forumController.deletePost, {}, { postId });

  assert.equal(response.code, 200);
  assert.deepEqual(response.body, { message: 'Forum post deleted' });
  assert.equal(deletedPostId, postId);
});
