import mongoose from 'mongoose';
import Forum from '../models/forum-model.js';

const forumController = {};

// Trims text and returns an empty string if the value is not text.
function getText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

// Trims and checks the title, content, and category for a post.
function getPostDetails(details) {
  const title = getText(details.title);
  const content = getText(details.content);
  let category = getText(details.category);

  if (category === '') {
    category = 'General';
  }

  if (title === '' || content === '') {
    return { error: 'Title and post content are required' };
  }

  if (title.length > 120 || content.length > 5000 || category.length > 40) {
    return { error: 'Title, content, or category is too long' };
  }

  return { error: '', title, content, category };
}

// Trims and checks the text for a reply.
function getReplyContent(value) {
  const content = getText(value);

  if (content === '') {
    return { error: 'Reply content is required' };
  }

  if (content.length > 2000) {
    return { error: 'Reply content must be 2000 characters or fewer' };
  }

  return { error: '', content };
}

// Checks the uploaded image and prepares it to be saved with a post.
function getPostMedia(files) {
  if (!files || !files.media) {
    return { error: '', media: [] };
  }

  if (Array.isArray(files.media)) {
    return { error: 'You can attach only 1 image', media: [] };
  }

  const file = files.media;
  if (!Buffer.isBuffer(file.data) || file.size > 5 * 1024 * 1024) {
    return { error: 'Image must be 5 MB or smaller', media: [] };
  }

  const isJpeg = file.mimetype === 'image/jpeg'
    && file.data[0] === 0xff
    && file.data[1] === 0xd8
    && file.data[2] === 0xff;
  const isPng = file.mimetype === 'image/png'
    && file.data[0] === 0x89
    && file.data[1] === 0x50
    && file.data[2] === 0x4e
    && file.data[3] === 0x47
    && file.data[4] === 0x0d
    && file.data[5] === 0x0a
    && file.data[6] === 0x1a
    && file.data[7] === 0x0a;

  if (!isJpeg && !isPng) {
    return { error: 'Only JPG and PNG images are allowed', media: [] };
  }

  return {
    error: '',
    media: [{
      name: file.name,
      data: file.data,
      mimetype: file.mimetype
    }]
  };
}

// Checks whether the user owns the post or reply, or is an admin.
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
    const postDetails = getPostDetails(req.body);
    if (postDetails.error) {
      return res.status(400).send({ message: postDetails.error });
    }

    const postMedia = getPostMedia(req.files);
    if (postMedia.error) {
      return res.status(400).send({ message: postMedia.error });
    }

    await Forum.createForumPost({
      authorId: req.session.user._id,
      title: postDetails.title,
      content: postDetails.content,
      category: postDetails.category,
      media: postMedia.media
    });

    res.status(201).send({ message: 'Post created' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to create forum post' });
  }
};

// Sends one saved post image to the browser.
forumController.getPostMedia = async (req, res) => {
  try {
    const postId = req.params.postId;
    const mediaIndex = Number(req.params.mediaIndex);

    if (!mongoose.isValidObjectId(postId) || !Number.isInteger(mediaIndex) || mediaIndex < 0) {
      return res.status(400).send({ message: 'Invalid post or image id' });
    }

    const post = await Forum.findForumPostById(postId);
    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    const media = post.media[mediaIndex];
    if (!media) {
      return res.status(404).send({ message: 'Post image not found' });
    }

    res.type(media.mimetype).send(media.data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load post image' });
  }
};

// Finds a post, checks who owns it, and saves the edited details.
forumController.updatePost = async (req, res) => {
  try {
    if (req.files && Object.keys(req.files).length > 0) {
      return res.status(400).send({ message: 'Post images cannot be changed after posting' });
    }

    const postId = req.params.postId;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    if (!userCanEdit(req.session.user, post.authorId)) {
      return res.status(403).send({ message: 'You cannot edit this post' });
    }

    const postDetails = getPostDetails(req.body);
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

    if (!userCanEdit(req.session.user, post.authorId)) {
      return res.status(403).send({ message: 'You cannot delete this post' });
    }

    await Forum.deleteForumPostById(postId);
    res.send({ message: 'Forum post deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to delete forum post' });
  }
};

// Adds the signed-in user's thumbs-up to a forum post.
forumController.likePost = async (req, res) => {
  try {
    const postId = req.params.postId;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    const likeIndex = post.likes.findIndex(like => String(like) === String(req.session.user._id));
    if (likeIndex >= 0) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.session.user._id);
    }

    await Forum.saveForumPost(post);
    res.send({
      likes: post.likes
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to like forum post' });
  }
};

// Checks the reply text and adds the reply to the selected post.
forumController.createReply = async (req, res) => {
  try {
    if (req.files && Object.keys(req.files).length > 0) {
      return res.status(400).send({ message: 'Replies cannot include images' });
    }

    const postId = req.params.postId;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).send({ message: 'Invalid post id' });
    }

    const replyDetails = getReplyContent(req.body.content);
    if (replyDetails.error) {
      return res.status(400).send({ message: replyDetails.error });
    }

    const post = await Forum.findForumPostById(postId);

    if (!post) {
      return res.status(404).send({ message: 'Forum post not found' });
    }

    if (post.replies.length >= 3) {
      return res.status(400).send({ message: 'This post already has the maximum of 3 replies' });
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
    if (req.files && Object.keys(req.files).length > 0) {
      return res.status(400).send({ message: 'Replies cannot include images' });
    }

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

    if (!userCanEdit(req.session.user, reply.authorId)) {
      return res.status(403).send({ message: 'You cannot edit this reply' });
    }

    const replyDetails = getReplyContent(req.body.content);
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

    if (!userCanEdit(req.session.user, reply.authorId)) {
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
