import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useState } from "react";
import { Sticker, Smile } from "lucide-react";

// Apple-style sticker set (served as images so they render identically everywhere).
// Swap these URLs for your own sticker pack later.
const STICKERS: { id: string; label: string; url: string }[] = [
  { id: "applause", label: "Applause", url: "https://media.tenor.com/GYlLrOJvZUsAAAAd/applause-clapping.gif" },
  { id: "party", label: "Party", url: "https://media.tenor.com/o-F8B6uW_4gAAAAd/party-party-time.gif" },
  { id: "thumb", label: "Thumbs Up", url: "https://media.tenor.com/oM0uZZl0ZJ0AAAAd/ok-thumbs-up.gif" },
  { id: "fire", label: "Fire", url: "https://media.tenor.com/6V4mGZ9MpG8AAAAd/fire-burning.gif" },
  { id: "love", label: "Love", url: "https://media.tenor.com/6LfJc2cFmyQAAAAd/hearts-heart.gif" },
  { id: "celebrate", label: "Celebrate", url: "https://media.tenor.com/mT7qNnSfOUsAAAAd/celebration-confetti.gif" },
  { id: "laugh", label: "Laughing", url: "https://media.tenor.com/HDv1YUrGqjsAAAAd/laughing-lol.gif" },
  { id: "sad", label: "Sad", url: "https://media.tenor.com/q0hW9Z5NbKAAAAAd/cry-crying.gif" },
];

export default function EmojiPickerPanel({
  onEmoji,
  onSticker,
}: {
  onEmoji: (emoji: string) => void;
  onSticker: (sticker: { label: string; url: string }) => void;
}) {
  const [tab, setTab] = useState<"emoji" | "sticker">("emoji");

  return (
    <div className="absolute bottom-full left-0 z-30 w-80 overflow-hidden rounded-xl border border-border bg-[var(--gc-card)] shadow-2xl">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("emoji")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium ${tab === "emoji" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
        >
          <Smile className="h-4 w-4" /> Emoji
        </button>
        <button
          type="button"
          onClick={() => setTab("sticker")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium ${tab === "sticker" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
        >
          <Sticker className="h-4 w-4" /> Stickers
        </button>
      </div>

      {tab === "emoji" ? (
        <Picker
          data={data}
          onEmojiSelect={(e: { native: string }) => onEmoji(e.native)}
          theme="auto"
          previewPosition="none"
          skinTonePosition="none"
          navPosition="top"
          perLine={8}
          emojiSize={22}
          className="!w-full !h-72"
          autoFocus={false}
        />
      ) : (
        <div className="h-72 overflow-y-auto p-3">
          <div className="mb-2 text-[11px] text-muted">Pick a sticker to send</div>
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.label}
                onClick={() => onSticker({ label: s.label, url: s.url })}
                className="rounded-lg border border-border p-1 transition-transform hover:scale-105"
              >
                <img src={s.url} alt={s.label} className="h-14 w-14 rounded object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
