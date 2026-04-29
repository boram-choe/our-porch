import { supabase } from "./supabase";

export interface Comment {
  id: string;
  vacancy_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    nickname: string;
    neighborhood: string;
    persona_label: string;
  };
  likes_count: number;
  is_liked: boolean;
  reports_count: number;
}

export async function fetchComments(vacancyId: string, currentUserId?: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      profiles:user_profiles (
        nickname,
        neighborhood,
        persona_label
      ),
      likes:comment_likes (
        user_id
      ),
      reports:comment_reports (
        id
      )
    `)
    .eq("vacancy_id", vacancyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  return (data || []).map((comment: any) => ({
    ...comment,
    likes_count: comment.likes?.length || 0,
    is_liked: comment.likes?.some((l: any) => l.user_id === currentUserId) || false,
    reports_count: comment.reports?.length || 0,
  })) as Comment[];
}

export async function addComment(vacancyId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from("comments")
    .insert([{ vacancy_id: vacancyId, user_id: userId, content }])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      alert("이미 이 공간에 댓글을 남기셨습니다. 공간당 하나의 댓글만 작성 가능합니다.");
    }
    console.error("Error adding comment:", error);
    return null;
  }
  return data;
}

export async function reportComment(commentId: string, userId: string) {
  const { error } = await supabase
    .from("comment_reports")
    .insert([{ comment_id: commentId, user_id: userId }]);
  
  if (error) {
    if (error.code === "23505") {
      alert("이미 신고한 댓글입니다.");
    } else {
      console.error("Error reporting comment:", error);
    }
    return false;
  }
  return true;
}

export async function toggleCommentLike(commentId: string, userId: string, isLiked: boolean) {
  if (isLiked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    
    if (error) console.error("Error unliking:", error);
    return !error;
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .insert([{ comment_id: commentId, user_id: userId }]);
    
    if (error) console.error("Error liking:", error);
    return !error;
  }
}
