import { cn } from "@/lib/utils";
import { avatarEmojis, type AvatarType } from "@/lib/mock-data";

const avatarOptions: { type: AvatarType; label: string }[] = [
  { type: "dragon", label: "Dragon" },
  { type: "tree", label: "Tree" },
  { type: "fox", label: "Fox" },
  { type: "owl", label: "Owl" },
  { type: "cat", label: "Cat" },
];

interface AvatarPickerProps {
  selected: AvatarType;
  onSelect: (avatar: AvatarType) => void;
}

export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {avatarOptions.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl p-3 transition-all",
            selected === type
              ? "bg-primary/10 ring-2 ring-primary"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <span className="text-2xl">{avatarEmojis[type][2]}</span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}
