-- Allow post owners to delete their own posts
CREATE POLICY "Post owners can delete their posts"
ON public.community_posts
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);