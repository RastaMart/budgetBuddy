import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Service for AI-assisted CSV processing for complex formats
 */
export class AiCsvProcessor {
  /**
   * Use AI to identify columns in a complex CSV format
   * @param csvSample - Sample of the CSV content to analyze
   * @returns AI-suggested column mapping
   */
  async identifyColumns(csvSample: string): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4', // or your preferred model
        messages: [
          {
            role: 'system',
            content: `You are a financial data processing assistant. Analyze the provided CSV sample from a bank statement and identify the following columns:
            1. Date column
            2. Description/memo column
            3. Amount column(s) - identify if there's a single amount column or separate income/expense columns
            4. Any transaction type indicators
            
            Respond in JSON format with column indexes and confidence levels.`,
          },
          {
            role: 'user',
            content: `Here's a sample from a CSV file (first 5 rows): \n\n${csvSample}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      // Parse the AI response
      const aiSuggestion = JSON.parse(
        response.choices[0].message.content || '{}'
      );

      return {
        mapping: aiSuggestion.mapping,
        confidence: aiSuggestion.confidence || 0.5,
      };
    } catch (error) {
      console.error('AI processing error:', error);
      return { mapping: {}, confidence: 0 };
    }
  }
}

export const aiCsvProcessor = new AiCsvProcessor();
export default AiCsvProcessor;
