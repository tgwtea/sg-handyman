import mongoose from 'mongoose';
import Forum from '../models/forum-model.js';

const forumController = {};

// Gets every forum post and includes the usernames of their authors.
forumController.getPosts = async (req, res) => {
  try {
    const posts = await Forum.findAllForumPosts();
    res.send(posts);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load forum posts' });
  }
};

// Checks the new post details and saves the post to the database.
forumController.createPost = async (req, res) => {
  try {
    const postDetails = Forum.getPostDetails(req.body);
    if (postDetails.error) {
      return res.status(400).send({ message: postDetails.error });
    }

    await Forum.createForumPost({
      authorId: req.session.user._id,
      title: postDetails.title,
      content: postDetails.content,
      category: postDetails.category
    });

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

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    if (!Forum.userCanEdit(req.session.user, post.authorId)) {
      return res.status(403).send({ message: 'You cannot edit this post' });
    }

    const postDetails = Forum.getPostDetails(req.body);
    if (postDetails.error) {
      return res.status(400).send({ message: postDetails.error });
    }

    await Forum.updateForumPost(post, {
      title: postDetails.title,
      content: postDetails.content,
      category: postDetails.category
    });
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

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    if (!Forum.userCanEdit(req.session.user, post.authorId)) {
      return res.status(403).send({ message: 'You cannot delete this post' });
    }

    await Forum.deleteForumPostById(postId);
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

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    const replyDetails = Forum.getReplyContent(req.body.content);
    if (replyDetails.error) {
      return res.status(400).send({ message: replyDetails.error });
    }

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    await Forum.createForumReply(post, {
      authorId: req.session.user._id,
      content: replyDetails.content
    });

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

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    const reply = Forum.findForumReplyById(post, replyId);

    if (!reply) {
      return res.status(404).send({ message: 'Reply not found' });
    }

    if (!Forum.userCanEdit(req.session.user, reply.authorId)) {
      return res.status(403).send({ message: 'You cannot edit this reply' });
    }

    const replyDetails = Forum.getReplyContent(req.body.content);
    if (replyDetails.error) {
      return res.status(400).send({ message: replyDetails.error });
    }

    await Forum.updateForumReply(post, reply, replyDetails.content);
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

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    const reply = Forum.findForumReplyById(post, replyId);

    if (!reply) {
      return res.status(404).send({ message: 'Reply not found' });
    }

    if (!Forum.userCanEdit(req.session.user, reply.authorId)) {
      return res.status(403).send({ message: 'You cannot delete this reply' });
    }

    await Forum.deleteForumReply(post, reply);
    res.send({ message: 'Reply deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to delete reply' });
  }
};

export default forumController;
