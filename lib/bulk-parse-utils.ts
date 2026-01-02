/**
 * Parse bulk input text into an array of items
 * Supports tab-separated, comma-separated, and newline-separated formats
 * 
 * @param bulkText - The raw text input from textarea
 * @returns Array of cleaned item names
 */
export function parseBulkInput(bulkText: string): string[] {
  if (!bulkText.trim()) return [];
  
  // Split by newlines first to handle multi-line input
  const lines = bulkText.split('\n').filter(line => line.trim());
  
  const allItems: string[] = [];
  
  lines.forEach(line => {
    // For each line, split by tabs first, then by commas if no tabs
    let lineItems: string[];
    
    if (line.includes('\t')) {
      // Tab-separated
      lineItems = line.split('\t');
    } else if (line.includes(',')) {
      // Comma-separated, but need to handle parentheses
      // Don't split commas inside parentheses
      lineItems = line.split(/,(?![^(]*\))/).map(item => item.trim());
    } else {
      // Single item per line
      lineItems = [line];
    }
    
    // Clean and add to all items
    lineItems.forEach(item => {
      const cleaned = item.trim();
      if (cleaned) {
        allItems.push(cleaned);
      }
    });
  });
  
  return allItems;
}

