import mongoose from 'mongoose';

const forumModel = {};

// Describes the information saved for each reply to a forum post.
const replySchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Describes the information saved for each forum post and its replies.
const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  category: {
    type: String,
    trim: true,
    maxlength: 40,
    default: 'General'
  },
  replies: {
    type: [replySchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Creates the Mongoose model used to read and save forum posts.
const ForumPost = mongoose.model('ForumPost', postSchema, 'forumPosts');

// Gets all forum posts with their authors, sorted by most recently updated.
forumModel.findAllForumPosts = function() {
  return ForumPost.find()
    .populate('authorId', 'username')
    .populate('replies.authorId', 'username')
    .sort({ updatedAt: -1 });
};

// Finds a forum post by its ID.
forumModel.findForumPostById = function(postId) {
  return ForumPost.findById(postId);
};

// Creates a forum post.
forumModel.createForumPost = function(post) {
  return ForumPost.create(post);
};

// Saves changes to an existing forum post.
forumModel.updateForumPost = function(post, updates) {
  post.title = updates.title;
  post.content = updates.content;
  post.category = updates.category;
  post.updatedAt = new Date();
  return post.save();
};

// Deletes a forum post by its ID.
forumModel.deleteForumPostById = function(postId) {
  return ForumPost.findByIdAndDelete(postId);
};

// Adds a reply to a post and saves the post.
forumModel.createForumReply = function(post, reply) {
  post.replies.push(reply);
  post.updatedAt = new Date();
  return post.save();
};

// Finds a reply in a forum post by its ID.
forumModel.findForumReplyById = function(post, replyId) {
  return post.replies.id(replyId);
};

// Updates a reply and saves its parent post.
forumModel.updateForumReply = function(post, reply, content) {
  reply.content = content;
  reply.updatedAt = new Date();
  post.updatedAt = new Date();
  return post.save();
};

// Deletes a reply and saves its parent post.
forumModel.deleteForumReply = function(post, reply) {
  reply.deleteOne();
  post.updatedAt = new Date();
  return post.save();
};

// Converts a value to trimmed text, or an empty string if it is not text.
forumModel.getText = function(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

// Cleans and checks the details for a forum post.
forumModel.getPostDetails = function(details) {
  const title = forumModel.getText(details.title);
  const content = forumModel.getText(details.content);
  let category = forumModel.getText(details.category);

  if (category === '') {
    category = 'General';
  }

  if (title === '' || content === '') {
    return {
      error: 'Title and post content are required'
    };
  }

  if (title.length > 120 || content.length > 5000 || category.length > 40) {
    return {
      error: 'Title, content, or category is too long'
    };
  }

  return {
    error: '',
    title: title,
    content: content,
    category: category
  };
};

// Cleans and checks the text for a forum reply.
forumModel.getReplyContent = function(value) {
  const content = forumModel.getText(value);

  if (content === '') {
    return {
      error: 'Reply content is required'
    };
  }

  if (content.length > 2000) {
    return {
      error: 'Reply content must be 2000 characters or fewer'
    };
  }

  return {
    error: '',
    content: content
  };
};

// Checks whether a user owns content or is an admin.
forumModel.userCanEdit = function(user, authorId) {
  if (user.role === 'admin') {
    return true;
  }

  let id = authorId;
  if (authorId && authorId._id) {
    id = authorId._id;
  }

  return String(id) === String(user._id);
};

export default forumModel;
