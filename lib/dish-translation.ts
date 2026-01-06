// Utility functions for dish translation

export async function getDishTranslations(): Promise<Record<string, string>> {
  try {
    const response = await fetch('/api/dishes');
    const result = await response.json();
    
    if (result.success && result.data) {
      // Create a map of Chinese name -> English name
      const translationsMap: Record<string, string> = {};
      result.data.forEach((dish: any) => {
        if (dish.nameEn) {
          translationsMap[dish.name] = dish.nameEn;
        }
      });
      return translationsMap;
    }
    return {};
  } catch (error) {
    console.error('Error fetching dish translations:', error);
    return {};
  }
}

export function translateDish(dishName: string, translations: Record<string, string>, language: string): string {
  if (language === 'zh' || !translations[dishName]) {
    return dishName;
  }
  return translations[dishName] || dishName;
}

