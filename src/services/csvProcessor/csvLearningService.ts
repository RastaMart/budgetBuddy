import { formatCache } from './formatCache';

interface MappingFeedback {
  formatSignature: string;
  mapping: any;
  isCorrect: boolean;
  correctedMapping?: any;
  userId: string;
}

/**
 * Service for improving CSV mapping through user feedback
 */
export class CsvLearningService {
  /**
   * Process user feedback on a mapping result
   * @param feedback - The user's feedback on the mapping
   */
  async processFeedback(feedback: MappingFeedback): Promise<boolean> {
    try {
      if (feedback.isCorrect) {
        // Increase confidence in this mapping
        await formatCache.saveFormat(
          feedback.formatSignature,
          feedback.mapping,
          feedback.userId
        );
        return true;
      } else if (feedback.correctedMapping) {
        // Save the corrected mapping
        await formatCache.saveFormat(
          feedback.formatSignature,
          feedback.correctedMapping,
          feedback.userId
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error processing mapping feedback:', error);
      return false;
    }
  }

  /**
   * Get mapping suggestions for a specific CSV format
   * @param sampleData - Sample of the CSV data
   * @returns Potential mappings ordered by relevance
   */
  async getSuggestions(sampleData: any[]): Promise<any[]> {
    try {
      // Get popular formats from cache
      const popularFormats = await formatCache.getPopularFormats(5);

      // Implement logic to rank these formats by similarity to the sample data
      // ...existing code...

      return popularFormats;
    } catch (error) {
      console.error('Error getting mapping suggestions:', error);
      return [];
    }
  }
}

export const csvLearningService = new CsvLearningService();
export default CsvLearningService;
