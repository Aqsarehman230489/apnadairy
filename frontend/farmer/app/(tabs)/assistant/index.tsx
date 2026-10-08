// AI Assistant chat tab: simple question-and-answer help for the farmer.
// The reply comes from the backend endpoint /api/v1/farmer/assistant —
// nothing here is generated on the device.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '../../../src/components/common/Screen';
import { colors } from '../../../src/theme/colors';
import { askAssistant } from '../../../src/services/assistantService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const GREETING_TEXT =
  'Hello! I am the ApnaDairy Assistant. Ask me how to register with a manager, sell your milk, or how the AI price works.';
const GREETING_SUGGESTIONS = [
  'How do I register with a manager?',
  'How is the AI price calculated?',
  'How do I get verified?',
];
const ERROR_TEXT = 'Could not reach the assistant. Please try again.';

let nextId = 0;
function makeId() {
  nextId += 1;
  return `msg-${nextId}`;
}

export default function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: 'assistant', text: GREETING_TEXT },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(GREETING_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, sending, scrollToBottom]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || sending) return;
      setInput('');
      setSuggestions([]);
      setSending(true);
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'user', text: question },
      ]);
      try {
        const answer = await askAssistant(question);
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', text: answer.reply },
        ]);
        setSuggestions(answer.suggestions);
      } catch {
        // The input stays usable; the failure is shown honestly as a reply.
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', text: ERROR_TEXT },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}
      >
        {!isUser ? (
          <Text style={styles.assistantLabel}>ApnaDairy Assistant</Text>
        ) : null}
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen title="ApnaDairy Assistant">
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            sending ? (
              <View style={[styles.messageRow, styles.assistantRow]}>
                <Text style={styles.assistantLabel}>ApnaDairy Assistant</Text>
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <Text style={[styles.bubbleText, styles.assistantText]}>
                    …
                  </Text>
                </View>
              </View>
            ) : null
          }
        />
        {suggestions.length > 0 && !sending ? (
          <View style={styles.chipsRow}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => send(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your question"
            placeholderTextColor={colors.sage}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  list: { paddingVertical: 12 },
  messageRow: { marginBottom: 12, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  assistantRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  assistantLabel: {
    fontSize: 11,
    color: colors.sage,
    fontFamily: 'BricolageGrotesque_600SemiBold',
    marginBottom: 4,
  },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: colors.forest },
  assistantBubble: { backgroundColor: colors.ivory },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: colors.ivory, fontFamily: 'BricolageGrotesque_400Regular' },
  assistantText: { color: colors.ink, fontFamily: 'BricolageGrotesque_400Regular' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    backgroundColor: colors.amberTint,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
    fontFamily: 'BricolageGrotesque_600SemiBold',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.ivory,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_400Regular',
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: {
    color: colors.ivory,
    fontSize: 12,
    fontFamily: 'BricolageGrotesque_600SemiBold',
  },
});
