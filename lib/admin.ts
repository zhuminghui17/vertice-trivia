import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

/**
 * Check if a user is an admin
 * @param userId - The user ID to check
 * @returns boolean indicating if the user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking admin status:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}