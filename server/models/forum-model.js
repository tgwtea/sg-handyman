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

const mediaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  data: {
    type: Buffer,
    required: true
  },
  mimetype: {
    type: String,
    required: true
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
  likes: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: []
  },
  replies: {
    type: [replySchema],
    default: []
  },
  media: {
    type: [mediaSchema],
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
    .select('-media.data')
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

// Saves changes made to a forum post.
forumModel.saveForumPost = function(post) {
  return post.save();
};

// Deletes a forum post by its ID
forumModel.deleteForumPostById = function(postId) {
  return ForumPost.findByIdAndDelete(postId);
};

// Inserts many forum posts at once (used by the seed script)
forumModel.insertManyForumPosts = function(posts) {
  return ForumPost.insertMany(posts);
};

// Deletes every forum post
forumModel.deleteAllForumPosts = function() {
  return ForumPost.deleteMany({});
};

// Adds a reply to a post and saves the post
forumModel.createForumReply = function(post, reply) {
  post.replies.push(reply);
  post.updatedAt = new Date();
  return post.save();
};

// Finds a reply in a forum post by its ID
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

export default forumModel;
