import { Search, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ElementType } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: "search" | "inbox" | ElementType;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = "inbox",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  let Icon: ElementType;
  if (icon === "search") {
    Icon = Search;
  } else if (icon === "inbox") {
    Icon = Inbox;
  } else {
    Icon = icon;
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="empty-state">
      <div className="mb-4 rounded-full bg-muted p-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} data-testid="button-empty-action">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
