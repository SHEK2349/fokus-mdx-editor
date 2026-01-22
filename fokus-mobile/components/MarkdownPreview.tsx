import { ScrollView, StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

export interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Markdown style={markdownStyles}>{content}</Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  content: {
    padding: 16,
  },
});

const markdownStyles = StyleSheet.create({
  // Body
  body: {
    color: '#3d3d3d',
    fontSize: 16,
    lineHeight: 24,
  },

  // Headings
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 36,
  },
  heading3: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 10,
    lineHeight: 32,
  },
  heading4: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 28,
  },
  heading5: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 10,
    marginBottom: 6,
    lineHeight: 26,
  },
  heading6: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 24,
  },

  // Paragraph
  paragraph: {
    marginTop: 0,
    marginBottom: 16,
    lineHeight: 24,
  },

  // Code
  code_inline: {
    backgroundColor: '#f3f4f6',
    color: '#d97706',
    fontFamily: 'Courier New',
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    fontFamily: 'Courier New',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  fence: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    fontFamily: 'Courier New',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },

  // Blockquote
  blockquote: {
    backgroundColor: '#f9fafb',
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
    paddingLeft: 16,
    paddingVertical: 8,
    marginVertical: 12,
  },

  // Lists
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  list_item: {
    marginVertical: 4,
  },
  bullet_list_icon: {
    color: '#d97706',
    fontSize: 16,
    marginRight: 8,
  },

  // Links
  link: {
    color: '#d97706',
    textDecorationLine: 'underline',
  },

  // Strong/Em
  strong: {
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },

  // HR
  hr: {
    backgroundColor: '#e5e7eb',
    height: 1,
    marginVertical: 16,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginVertical: 12,
  },
  thead: {
    backgroundColor: '#f9fafb',
  },
  tbody: {},
  th: {
    fontWeight: '600',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  td: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
});
