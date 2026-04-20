import { useEffect, type ReactNode } from "react";
import { MONO, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  heightPct?: number;
};

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  heightPct = 82,
}: Props) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: `${heightPct}dvh`,
          background: t.bg2,
          borderTop: `1px solid ${t.lineHi}`,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            padding: "8px 0 6px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              display: "block",
              width: 40,
              height: 3,
              background: t.line,
              borderRadius: 2,
            }}
          />
        </div>
        <div
          style={{
            padding: "0 16px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${t.line}`,
            paddingBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: 0.8,
              color: t.textDim,
              textTransform: "uppercase",
            }}
          >
            ▸ {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "4px 10px",
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: 0.5,
              background: "transparent",
              color: t.textDim,
              border: `1px solid ${t.line}`,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            cerrar
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
