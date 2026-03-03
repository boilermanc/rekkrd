import { supabase } from './supabaseService';

export type PageContent = Record<string, unknown>;

export async function getPageContent(page: string): Promise<PageContent> {
  if (!supabase) return {};

  try {
    const { data, error } = await supabase
      .from('cms_content')
      .select('section, content')
      .eq('page', page);

    if (error || !data) return {};

    const result: PageContent = {};
    for (const row of data) {
      result[row.section] = row.content;
    }
    return result;
  } catch {
    return {};
  }
}
