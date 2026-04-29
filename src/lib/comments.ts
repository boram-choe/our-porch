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
  // 1. Fetch comments (Base data only to guarantee success)
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("vacancy_id", vacancyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  // 2. Fetch profiles separately to avoid join errors
  const userIds = [...new Set((data || []).map(c => c.user_id))];
  const { data: profilesData } = await supabase
    .from("user_profiles")
    .select("id, nickname, neighborhood, persona_label")
    .in("id", userIds);

  // 3. Fetch likes and reports
  const { data: likesData } = await supabase
    .from("comment_likes")
    .select("comment_id, user_id");

  const { data: reportsData } = await supabase
    .from("comment_reports")
    .select("comment_id");

  return (data || []).map((comment: any) => {
    const profile = (profilesData || []).find(p => p.id === comment.user_id);
    const commentLikes = (likesData || []).filter(l => l.comment_id === comment.id);
    const commentReports = (reportsData || []).filter(r => r.comment_id === comment.id);
    
    return {
      ...comment,
      profiles: profile,
      likes_count: commentLikes.length,
      is_liked: commentLikes.some(l => l.user_id === currentUserId),
      reports_count: commentReports.length,
    };
  })
  .sort((a: any, b: any) => {
    // 1. Sort by likes count (descending)
    if (b.likes_count !== a.likes_count) {
      return b.likes_count - a.likes_count;
    }
    // 2. Then by date (descending)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) as Comment[];
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
