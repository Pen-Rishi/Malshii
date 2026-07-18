import { supabase } from './supabase';

// camelCase ↔ snake_case conversion
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function keysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}
function keysToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toCamel(k)] = v;
  }
  return out;
}
function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => keysToCamel(r) as T);
}

// Table wrapper that mimics Dexie API surface used across the app
function createTable<T extends { id?: number }>(tableName: string) {
  return {
    async toArray(): Promise<T[]> {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      return rowsToCamel<T>(data || []);
    },

    async clear(): Promise<void> {
      const { error } = await supabase.from(tableName).delete().gte('id', 0);
      if (error) throw error;
    },

    async count(): Promise<number> {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },

    async add(item: Omit<T, 'id'>): Promise<number> {
      const snaked = keysToSnake(item as Record<string, unknown>);
      // Convert Date objects to ISO strings
      for (const [k, v] of Object.entries(snaked)) {
        if (v instanceof Date) snaked[k] = v.toISOString();
      }
      delete snaked.id;
      const { data, error } = await supabase
        .from(tableName)
        .insert(snaked)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },

    async bulkAdd(items: Omit<T, 'id'>[]): Promise<void> {
      const snaked = items.map((item) => {
        const s = keysToSnake(item as Record<string, unknown>);
        for (const [k, v] of Object.entries(s)) {
          if (v instanceof Date) s[k] = v.toISOString();
        }
        delete s.id;
        return s;
      });
      const { error } = await supabase.from(tableName).insert(snaked);
      if (error) throw error;
    },

    async update(id: number, changes: Partial<T>): Promise<void> {
      const snaked = keysToSnake(changes as Record<string, unknown>);
      for (const [k, v] of Object.entries(snaked)) {
        if (v instanceof Date) snaked[k] = v.toISOString();
      }
      delete snaked.id;
      const { error } = await supabase
        .from(tableName)
        .update(snaked)
        .eq('id', id);
      if (error) throw error;
    },

    async delete(id: number): Promise<void> {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    async get(id: number): Promise<T | undefined> {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      return keysToCamel(data) as T;
    },

    where(field: string) {
      const snakeField = toSnake(field);
      return {
        anyOf(values: unknown[]) {
          return {
            async toArray(): Promise<T[]> {
              if (values.length === 0) return [];
              const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .in(snakeField, values as (string | number)[]);
              if (error) throw error;
              return rowsToCamel<T>(data || []);
            },
          };
        },
        equals(value: unknown) {
          return {
            async toArray(): Promise<T[]> {
              const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq(snakeField, value);
              if (error) throw error;
              return rowsToCamel<T>(data || []);
            },
            async count(): Promise<number> {
              const { count, error } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true })
                .eq(snakeField, value);
              if (error) throw error;
              return count || 0;
            },
            async delete(): Promise<number> {
              const { data, error } = await supabase
                .from(tableName)
                .delete()
                .eq(snakeField, value)
                .select('id');
              if (error) throw error;
              return data?.length || 0;
            },
            async first(): Promise<T | undefined> {
              const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq(snakeField, value)
                .limit(1)
                .maybeSingle();
              if (error) throw error;
              if (!data) return undefined;
              return keysToCamel(data) as T;
            },
            reverse() {
              return {
                async sortBy(sortField: string): Promise<T[]> {
                  const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq(snakeField, value)
                    .order(toSnake(sortField), { ascending: false });
                  if (error) throw error;
                  return rowsToCamel<T>(data || []);
                },
              };
            },
          };
        },
      };
    },

    orderBy(field: string) {
      const snakeField = toSnake(field);
      return {
        async uniqueKeys(): Promise<unknown[]> {
          const { data, error } = await supabase
            .from(tableName)
            .select(snakeField)
            .order(snakeField, { ascending: true });
          if (error) throw error;
          const unique = [...new Set((data || []).map((r: any) => r[snakeField]))];
          return unique;
        },
        async toArray(): Promise<T[]> {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order(snakeField, { ascending: true });
          if (error) throw error;
          return rowsToCamel<T>(data || []);
        },
        reverse() {
          return {
            async toArray(): Promise<T[]> {
              const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order(snakeField, { ascending: false });
              if (error) throw error;
              return rowsToCamel<T>(data || []);
            },
          };
        },
      };
    },

    toCollection() {
      return {
        async toArray(): Promise<T[]> {
          const { data, error } = await supabase.from(tableName).select('*');
          if (error) throw error;
          return rowsToCamel<T>(data || []);
        },
      };
    },
  };
}

import type {
  Paper,
  Question,
  Attempt,
  Revision,
  Bookmark,
  Note,
  AnalyticsCache,
  Settings,
} from '@/types';

export const db = {
  papers: createTable<Paper>('papers'),
  questions: createTable<Question>('questions'),
  attempts: createTable<Attempt>('attempts'),
  revisions: createTable<Revision>('revisions'),
  bookmarks: createTable<Bookmark>('bookmarks'),
  notes: createTable<Note>('notes'),
  analyticsCache: createTable<AnalyticsCache>('analytics_cache'),
  settings: createTable<Settings>('settings'),
};
