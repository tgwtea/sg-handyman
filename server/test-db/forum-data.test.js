import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import forumRouter from '../routes/forum-routes.js';
import Forum from '../models/forum-model.js';

test('logged-in user creates a forum post through the API', async (t) => {
  const savedUser = { _id: 'test-user', role: 'customer' };
  let savedPost;
  const createForumPost = Forum.createForumPost;
  Forum.createForumPost = async (post) => {
    savedPost = post;
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = { user: savedUser };
    next();
  });
  app.use('/api/forum', forumRouter);

  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    Forum.createForumPost = createForumPost;
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });
  await once(server, 'listening');

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/forum`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'API test post',
      content: 'Created through the forum API.',
      category: 'General'
    })
  });

  assert.equal(response.status, 201); 
  assert.deepEqual(await response.json(), { message: 'Post created' }); // object have the same contents 
  assert.equal(savedPost.title, 'API test post');
  assert.equal(savedPost.content, 'Created through the forum API.');
  assert.equal(savedPost.authorId, savedUser._id);
});
