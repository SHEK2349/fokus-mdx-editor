import { View, Text, TextInput, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export interface FrontmatterData {
  title: string;
  pubDatetime: string;
  description: string;
  draft: boolean;
  featured: boolean;
  tags: string[];
}

interface FrontmatterFormProps {
  initialData?: FrontmatterData;
  onChange: (data: FrontmatterData) => void;
}

export function FrontmatterForm({ initialData, onChange }: FrontmatterFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState<FrontmatterData>(
    initialData || {
      title: '',
      pubDatetime: new Date().toISOString(),
      description: '',
      draft: true,
      featured: false,
      tags: [],
    }
  );

  const updateField = <K extends keyof FrontmatterData>(
    field: K,
    value: FrontmatterData[K]
  ) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(updated);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>Frontmatter</Text>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {/* フォーム（展開時） */}
      {expanded && (
        <View style={styles.form}>
          {/* タイトル */}
          <View style={styles.field}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(value) => updateField('title', value)}
              placeholder="記事のタイトル"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* 説明 */}
          <View style={styles.field}>
            <Text style={styles.label}>説明</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              placeholder="記事の説明（SEO用）"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* 公開日時 */}
          <View style={styles.field}>
            <Text style={styles.label}>公開日時</Text>
            <Text style={styles.dateText}>{formatDate(formData.pubDatetime)}</Text>
          </View>

          {/* タグ */}
          <View style={styles.field}>
            <Text style={styles.label}>タグ（カンマ区切り）</Text>
            <TextInput
              style={styles.input}
              value={formData.tags.join(', ')}
              onChangeText={(value) =>
                updateField(
                  'tags',
                  value.split(',').map((t) => t.trim()).filter(Boolean)
                )
              }
              placeholder="react, typescript, expo"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* 下書きフラグ */}
          <View style={styles.switchField}>
            <Text style={styles.label}>下書き</Text>
            <Switch
              value={formData.draft}
              onValueChange={(value) => updateField('draft', value)}
              trackColor={{ false: '#d1d5db', true: '#fbbf24' }}
              thumbColor={formData.draft ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          {/* おすすめフラグ */}
          <View style={styles.switchField}>
            <Text style={styles.label}>おすすめ</Text>
            <Switch
              value={formData.featured}
              onValueChange={(value) => updateField('featured', value)}
              trackColor={{ false: '#d1d5db', true: '#a855f7' }}
              thumbColor={formData.featured ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3d3d3d',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6b7280',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#3d3d3d',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 16,
    color: '#3d3d3d',
    paddingVertical: 8,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
