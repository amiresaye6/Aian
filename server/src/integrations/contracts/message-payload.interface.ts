/**
 * Generic outgoing message payload.
 *
 * Used by MessagesService to dispatch messages through any provider.
 * Keep this normalized so every provider client translates it into
 * their own API format (Slack chat.postMessage, Teams, etc.).
 */
export interface MessagePayload {
  /**
   * The destination target — depends on provider.
   * - Slack: channel ID (e.g., "C12345"), user ID (e.g., "U12345"), or DM ID (e.g., "D12345")
   */
  targetId: string;

  /**
   * The message body. Supports Slack mrkdwn syntax by default.
   * Used as the fallback text when blocks are provided.
   */
  text: string;

  /**
   * Optional structured Block Kit blocks (Slack-specific for now).
   * When provided, `text` acts as the notification/accessibility fallback.
   */
  blocks?: Record<string, unknown>[];

  /**
   * Reply to a specific message thread. Provider-specific value.
   * - Slack: the `ts` (timestamp) of the parent message.
   */
  threadId?: string;

  /**
   * If true, a threaded reply is also posted to the main channel.
   * Only relevant when threadId is set.
   */
  broadcastReply?: boolean;
}

/**
 * Response returned after a message is sent.
 */
export interface MessageSendResult {
  /** Whether the send was successful */
  success: boolean;
  /** Provider-specific message identifier (e.g., Slack `ts`) */
  messageId?: string;
  /** Provider-specific channel identifier where the message was posted */
  channelId?: string;
  /** Human-readable error detail, if failed */
  error?: string;
}
