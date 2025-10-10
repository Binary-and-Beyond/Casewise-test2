"use client";

interface ChatInputProps {
  message: string;
  onMessageChange: (message: string) => void;
  onSend: () => void;
}

export function ChatInput({
  message,
  onMessageChange,
  onSend,
}: ChatInputProps) {
  return (
    <div className="flex items-center border border-gray-300 rounded-lg">
      <input
        type="text"
        placeholder="Type something here!"
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        className="flex-1 p-3 border-0 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        className="p-3 text-gray-400 hover:text-gray-600"
        onClick={onSend}
      >
        <svg
          className="w-5 h-5 rotate-90"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </div>
  );
}
