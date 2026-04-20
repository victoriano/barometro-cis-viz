import { useState } from "react";
import type { EventKind, PoliticalEvent } from "../lib/events";
import { EVENT_KIND_LABEL, POLITICAL_EVENTS } from "../lib/events";
import { MONO, SANS, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

const KINDS: (EventKind | "all")[] = ["all", "election", "crisis", "policy", "moment"];

export function NewsFeed() {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const dotColor = (kind: EventKind): string => {
    if (kind === "election") return t.accent;
    if (kind === "crisis") return t.bad;
    if (kind === "moment") return t.good;
    return "#8b8fa3";
  };

  const events: PoliticalEvent[] = [...POLITICAL_EVENTS]
    .filter((e) => filter === "all" || e.kind === filter)
    .reverse();

  return (
    <div
      style={{
        background: t.panel,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${t.line}`,
          borderTop: `1px solid ${t.lineHi}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 0.8,
          color: t.textDim,
          textTransform: "uppercase",
          background: t.bg2,
        }}
      >
        <span>▸ Eventos · qué explica los cambios</span>
        <span style={{ color: t.textMute }}>
          {events.length} · {EVENT_KIND_LABEL[filter]}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          padding: "8px 10px",
          gap: 2,
          borderBottom: `1px solid ${t.line}`,
          flexWrap: "wrap",
        }}
      >
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            style={{
              padding: "3px 8px",
              fontFamily: MONO,
              fontSize: 9.5,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              background: filter === k ? t.accent : "transparent",
              color: filter === k ? "#0b0d10" : t.textDim,
              border: `1px solid ${filter === k ? t.accent : t.line}`,
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            {EVENT_KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        {events.map((e) => {
          const isExp = expanded === e.date;
          return (
            <div
              key={e.date}
              onClick={() => setExpanded(isExp ? null : e.date)}
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${t.line}`,
                cursor: "pointer",
                background: isExp ? t.panelHi : "transparent",
                transition: "background 120ms",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 1,
                    flexShrink: 0,
                    background: dotColor(e.kind),
                  }}
                />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9.5,
                    letterSpacing: 0.5,
                    color: t.textMute,
                    textTransform: "uppercase",
                  }}
                >
                  {e.date} · {EVENT_KIND_LABEL[e.kind]}
                </span>
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 12.5,
                  color: t.text,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  marginBottom: isExp ? 6 : 0,
                }}
              >
                {e.headline}
              </div>
              {isExp && (
                <>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 11.5,
                      color: t.textDim,
                      lineHeight: 1.45,
                      marginTop: 4,
                    }}
                  >
                    {e.body}
                  </div>
                  <div>
                    {e.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: "inline-block",
                          padding: "1px 6px",
                          fontFamily: MONO,
                          fontSize: 9,
                          color: t.textMute,
                          border: `1px solid ${t.line}`,
                          borderRadius: 2,
                          marginRight: 4,
                          marginTop: 4,
                          letterSpacing: 0.3,
                          textTransform: "lowercase",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
