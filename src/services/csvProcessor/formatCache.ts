// src/services/csvProcessor/formatCache.ts
import { supabase } from '../../lib/supabase';

/**
 * Interface for format mapping data structure
 */
interface FormatMapping {
  [key: string]: string | number | boolean | object;
}

/**
 * Interface for format record in the database
 */
interface FormatRecord {
  format_signature: string;
  format_mapping: FormatMapping;
  created_by: string;
  created_at: string;
  updated_at?: string;
  usage_count: number;
}

/**
 * Service responsible for storing and retrieving CSV format signatures
 * to improve performance and accuracy of CSV processing
 */
class FormatCache {
  private tableName: string;

  constructor() {
    this.tableName = 'format_mappings';
  }

  /**
   * Retrieve a format mapping using the format signature
   * @param formatSignature - The unique signature for this CSV format
   * @returns Format mapping if found, null otherwise
   */
  async getFormat(formatSignature: string): Promise<FormatMapping | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('format_signature', formatSignature)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, not an error for our purposes
          return null;
        }
        console.error('Error retrieving format mapping:', error);
        throw error;
      }

      return data?.format_mapping || null;
    } catch (error) {
      console.error('Format cache retrieval error:', error);
      // Return null instead of throwing to make this a non-critical failure
      return null;
    }
  }

  /**
   * Save a format mapping for future use
   * @param formatSignature - The unique signature for this CSV format
   * @param formatMapping - The format mapping configuration
   * @param userId - The user ID who provided this format
   * @returns Success indicator
   */
  async saveFormat(
    formatSignature: string,
    formatMapping: FormatMapping,
    userId: string
  ): Promise<boolean> {
    try {
      // Check if this format signature already exists
      const existingFormat = await this.getFormat(formatSignature);

      if (existingFormat) {
        // Update existing format if it's changed
        const { error } = await supabase
          .from(this.tableName)
          .update({
            format_mapping: formatMapping,
            updated_at: new Date().toISOString(),
            usage_count: supabase.sql`usage_count + 1`,
          })
          .eq('format_signature', formatSignature);

        if (error) {
          console.error('Error updating format mapping:', error);
          throw error;
        }
      } else {
        // Insert new format mapping
        const { error } = await supabase.from(this.tableName).insert({
          format_signature: formatSignature,
          format_mapping: formatMapping,
          created_by: userId,
          created_at: new Date().toISOString(),
          usage_count: 1,
        });

        if (error) {
          console.error('Error saving format mapping:', error);
          throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('Format cache save error:', error);
      // Return false instead of throwing to make this a non-critical failure
      return false;
    }
  }

  /**
   * Get popular format mappings to optimize processing for common formats
   * @param limit - Maximum number of formats to retrieve
   * @returns Array of popular format mappings
   */
  async getPopularFormats(limit = 10): Promise<
    Array<{
      format_signature: string;
      format_mapping: FormatMapping;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('format_signature, format_mapping')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error retrieving popular formats:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting popular formats:', error);
      return [];
    }
  }

  /**
   * Delete a format mapping that's no longer accurate or useful
   * @param formatSignature - The unique signature for this CSV format
   * @returns Success indicator
   */
  async deleteFormat(formatSignature: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('format_signature', formatSignature);

      if (error) {
        console.error('Error deleting format mapping:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Format cache delete error:', error);
      return false;
    }
  }

  /**
   * Get all formats created by a specific user
   * @param userId - The user ID
   * @returns Array of format mappings for this user
   */
  async getUserFormats(userId: string): Promise<
    Array<{
      format_signature: string;
      format_mapping: FormatMapping;
      created_at: string;
      usage_count: number;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('format_signature, format_mapping, created_at, usage_count')
        .eq('created_by', userId);

      if (error) {
        console.error('Error retrieving user formats:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user formats:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const formatCache = new FormatCache();

// Export class for testing or custom instantiation
export default FormatCache;
