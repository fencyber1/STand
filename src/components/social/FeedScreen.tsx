import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebase';
import {
  subscribeToFeed,
  subscribeToFriends,
  subscribeToComments,
  createPost,
  likePost,
  unlikePost,
  deletePost,
  addComment,
  deleteComment,
} from '../../services/socialService';
import type { Post, PostComment, Friend } from '../../types';
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function FeedScreen() {
  const { user } = useAuth();
  const uid = auth.currentUser?.uid || '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  const commentUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!uid) return;
    const unsubFriends = subscribeToFriends(uid, (list) => setFriends(list));
    return unsubFriends();
  }, [uid]);

  const friendUids = friends.map((f) => f.uid);
  const friendUidsKey = friendUids.join(',');

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToFeed(uid, friendUids, (list) => {
      setPosts(list);
      setLoading(false);
    });
    return unsub;
  }, [uid, friendUidsKey]);

  useEffect(() => {
    const expanded = Array.from(expandedComments);
    const currentUnsubs = commentUnsubs.current;

    for (const postId of expanded) {
      if (!currentUnsubs[postId]) {
        currentUnsubs[postId] = subscribeToComments(postId, (list) => {
          setComments((prev) => ({ ...prev, [postId]: list }));
        });
      }
    }

    for (const postId of Object.keys(currentUnsubs)) {
      if (!expanded.includes(postId)) {
        currentUnsubs[postId]();
        delete currentUnsubs[postId];
      }
    }
  }, [expandedComments]);

  useEffect(() => {
    return () => {
      Object.values(commentUnsubs.current).forEach((unsub) => unsub());
    };
  }, []);

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !uid) return;
    setPosting(true);
    try {
      await createPost(
        { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null },
        newPostContent.trim()
      );
      setNewPostContent('');
      setShowComposer(false);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post: Post) => {
    if (!uid) return;
    const liked = post.likes.includes(uid);
    try {
      if (liked) {
        await unlikePost(post.id, uid);
      } else {
        await likePost(post.id, uid);
      }
    } catch {}
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !uid) return;
    setSubmittingComment(postId);
    try {
      await addComment(
        postId,
        { uid, name: user?.fullName || 'Student', photo: user?.photoURL || null },
        text
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    await deleteComment(postId, commentId);
  };

  const getAvatar = (photoURL: string | null, name: string, size: string = 'w-10 h-10') => {
    if (photoURL) {
      return <img src={photoURL} alt="" className={`${size} rounded-full object-cover`} />;
    }
    return (
      <div className={`${size} rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Feed</h1>
      </div>

      <button
        onClick={() => setShowComposer(true)}
        className="w-full mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-sm">What did you study today?</span>
        <Plus className="w-5 h-5 text-indigo-500 ml-auto" />
      </button>

      {showComposer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowComposer(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">New Post</h3>
              <button onClick={() => setShowComposer(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share your progress, ask a question, or motivate others..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-3 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none"
              autoFocus
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || posting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ImageIcon className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No posts yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add friends or create the first post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isLiked = post.likes.includes(uid);
            const postComments = comments[post.id] || [];
            const commentsExpanded = expandedComments.has(post.id);

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {getAvatar(post.authorPhoto, post.authorName)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                            {post.authorName}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {timeAgo(post.createdAt)}
                          </p>
                        </div>
                        {post.authorUid === uid && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-3 flex items-center gap-1 border-t border-gray-100 dark:border-gray-700/50 pt-2">
                  <button
                    onClick={() => handleLike(post)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isLiked
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    {post.likes.length > 0 && post.likes.length}
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      commentsExpanded
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.commentCount > 0 && post.commentCount}
                    {commentsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {commentsExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-750">
                    <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      {postComments.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                          No comments yet. Be the first!
                        </p>
                      ) : (
                        postComments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2">
                            {getAvatar(comment.authorPhoto, comment.authorName, 'w-7 h-7')}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                  {comment.authorName}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {timeAgo(comment.createdAt)}
                                </span>
                                {comment.authorUid === uid && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-3 pb-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim() || submittingComment === post.id}
                        className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingComment === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
