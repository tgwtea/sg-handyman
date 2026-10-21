import mongoose from 'mongoose';

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

const ForumPost = mongoose.model('ForumPost', postSchema, 'forumPosts');

export default ForumPost;
