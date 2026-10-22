import mongoose from 'mongoose';
import ForumPost from '../models/forum-model.js';

const forumController = {};

// Checks whether a user owns the content or is an admin.
function userCanEdit(user, authorId) {
  if (user.role === 'admin') {
    return true;
  }

  let id = authorId;
  if (authorId && authorId._id) {
    id = authorId._id;
  }
  return String(id) === String(user._id);
}

// Makes sure a value is text and removes extra spaces around it.
function getText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

// Gets every forum post and includes the usernames of their authors.
forumController.getPosts = async (req, res) => {
  try {
    const posts = await ForumPost.find()
      .populate('authorId', 'username')
      .populate('replies.authorId', 'username')
      .sort({ updatedAt: -1 });

    res.send(posts);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load forum posts' });
  }
};

// Checks the new post details and saves the post to the database.
forumController.createPost = async (req, res) => {
  try {
    const title = getText(req.body.title);
    const content = getText(req.body.content);
    let category = getText(req.body.category);

    if (category === '') {
      category = 'General';
    }

    if (title === '' || content === '') {
      return res.status(400).send({ message: 'Title and post content are required' });
    }

    if (title.length > 120 || content.length > 5000 || category.length > 40) {
      return res.status(400).send({ message: 'Title, content, or category is too long' });
    }

    const newPost = new ForumPost({
      authorId: req.session.user._id,
      title: title,
      content: content,
      category: category
    });

    await newPost.save();
    res.status(201).send({ message: 'Post created' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to create forum post' });
  }
};

// Finds a post, checks who owns it, and saves the edited details.
forumController.updatePost = async (req, res) => {
  try {
    const postId = req.params.postId;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    if (!userCanEdit(req.session.user, post.authorId)) {
      return res.status(403).send({ message: 'You cannot edit this post' });
    }

    const title = getText(req.body.title);
    const content = getText(req.body.content);
    let category = getText(req.body.category);

    if (category === '') {
      category = 'General';
    }

    if (title === '' || content === '') {
      return res.status(400).send({ message: 'Title and post content are required' });
    }

    if (title.length > 120 || content.length > 5000 || category.length > 40) {
      return res.status(400).send({ message: 'Title, content, or category is too long' });
    }

    post.title = title;
    post.content = content;
    post.category = category;
    post.updatedAt = new Date();

    await post.save();
    res.send({ message: 'Post updated' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to update forum post' });
  }
};

// Finds a post, checks who owns it, and removes it from the database.
forumController.deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    if (!userCanEdit(req.session.user, post.authorId)) {
      return res.status(403).send({ message: 'You cannot delete this post' });
    }

    await ForumPost.findByIdAndDelete(postId);
    res.send({ message: 'Forum post deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to delete forum post' });
  }
};

// Checks the reply text and adds the reply to the selected post.
forumController.createReply = async (req, res) => {
  try {
    const postId = req.params.postId;
    const content = getText(req.body.content);

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    if (content === '') {
      return res.status(400).send({ message: 'Reply content is required' });
    }

    if (content.length > 2000) {
      return res.status(400).send({ message: 'Reply content must be 2000 characters or fewer' });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    post.replies.push({
      authorId: req.session.user._id,
      content: content
    });
    post.updatedAt = new Date();

    await post.save();
    res.status(201).send({ message: 'Reply added' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to create reply' });
  }
};

// Finds a reply, checks who owns it, and saves the edited text.
forumController.updateReply = async (req, res) => {
  try {
    const postId = req.params.postId;
    const replyId = req.params.replyId;

    if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(replyId)) {
      return res.status(400).send({ message: 'Invalid post or reply id' });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    const reply = post.replies.id(replyId);

    if (!reply) {
      return res.status(404).send({ message: 'Reply not found' });
    }

    if (!userCanEdit(req.session.user, reply.authorId)) {
      return res.status(403).send({ message: 'You cannot edit this reply' });
    }

    const content = getText(req.body.content);

    if (content === '') {
      return res.status(400).send({ message: 'Reply content is required' });
    }

    if (content.length > 2000) {
      return res.status(400).send({ message: 'Reply content must be 2000 characters or fewer' });
    }

    reply.content = content;
    reply.updatedAt = new Date();
    post.updatedAt = new Date();

    await post.save();
    res.send({ message: 'Reply updated' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to update reply' });
  }
};

// Finds a reply, checks who owns it, and removes it from the post.
forumController.deleteReply = async (req, res) => {
  try {
    const postId = req.params.postId;
    const replyId = req.params.replyId;

    if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(replyId)) {
      return res.status(400).send({ message: 'Invalid post or reply id' });
    }

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    const reply = post.replies.id(replyId);

    if (!reply) {
      return res.status(404).send({ message: 'Reply not found' });
    }

    if (!userCanEdit(req.session.user, reply.authorId)) {
      return res.status(403).send({ message: 'You cannot delete this reply' });
    }

    reply.deleteOne();
    post.updatedAt = new Date();

    await post.save();
    res.send({ message: 'Reply deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to delete reply' });
  }
};

export default forumController;
