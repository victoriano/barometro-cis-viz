import { useMemo, useState } from "react";
import type { EventImpact, EventKind, PoliticalEvent } from "../lib/events";
import { EVENT_KIND_LABEL, POLITICAL_EVENTS } from "../lib/events";
import { PARTY_COLORS, MONO, SANS, TOKENS } from "../lib/theme";
import { useResolvedTheme } from "../lib/useResolvedTheme";

const KINDS: (EventKind | "all")[] = ["all", "election", "crisis", "policy", "moment"];
const RELEVANCE_THRESHOLDS = [3, 4, 5] as const;

type Props = {
  onEventClick?: (event: PoliticalEvent) => void;
  partyOrder?: string[];
  benefits?: string;
  harms?: string;
  onBenefitsChange?: (v: string) => void;
  onHarmsChange?: (v: string) => void;
  selectedEventId?: string | null;
  onEventSelect?: (id: string | null) => void;
};

export function NewsFeed({
  onEventClick,
  partyOrder,
  benefits: benefitsProp,
  harms: harmsProp,
  onBenefitsChange,
  onHarmsChange,
  selectedEventId,
  onEventSelect,
}: Props = {}) {
  const theme = useResolvedTheme();
  const t = TOKENS[theme];
  const [kindFilter, setKindFilter] = useState<EventKind | "all">("all");
  const [minRelevance, setMinRelevance] = useState<3 | 4 | 5>(4);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [benefitsLocal, setBenefitsLocal] = useState<string>("all");
  const [harmsLocal, setHarmsLocal] = useState<string>("all");
  const benefits = benefitsProp ?? benefitsLocal;
  const harms = harmsProp ?? harmsLocal;
  const setBenefits = onBenefitsChange ?? setBenefitsLocal;
  const setHarms = onHarmsChange ?? setHarmsLocal;
  const [expanded, setExpanded] = useState<string | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const e of POLITICAL_EVENTS) set.add(Number(e.date.slice(0, 4)));
    return Array.from(set).sort();
  }, []);

  const parties = useMemo(() => {
    if (partyOrder && partyOrder.length) return partyOrder;
    const set = new Set<string>();
    for (const e of POLITICAL_EVENTS) {
      for (const imp of e.impacts) if (imp.direction !== "0") set.add(imp.party);
    }
    return Array.from(set).sort();
  }, [partyOrder]);

  const events = useMemo(() => {
    return POLITICAL_EVENTS.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (e.relevance < minRelevance) return false;
      if (yearFilter !== "all" && !e.date.startsWith(String(yearFilter))) return false;
      if (
        benefits !== "all" &&
        !e.impacts.some((i) => i.party === benefits && i.direction === "+")
      )
        return false;
      if (
        harms !== "all" &&
        !e.impacts.some((i) => i.party === harms && i.direction === "-")
      )
        return false;
      return true;
    })
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [kindFilter, minRelevance, yearFilter, benefits, harms]);

  const dotColor = (kind: EventKind): string => {
    if (kind === "election") return t.accent;
    if (kind === "crisis") return t.bad;
    if (kind === "moment") return t.good;
    return "#8b8fa3";
  };

  const chipBtn = (active: boolean): React.CSSProperties => ({
    padding: "3px 8px",
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    background: active ? t.accent : "transparent",
    color: active ? "#0b0d10" : t.textDim,
    border: `1px solid ${active ? t.accent : t.line}`,
    borderRadius: 2,
    cursor: "pointer",
    marginRight: 2,
    marginBottom: 2,
    fontVariantNumeric: "tabular-nums",
  });

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
        <span style={{ color: t.textMute, fontVariantNumeric: "tabular-nums" }}>
          {events.length} / {POLITICAL_EVENTS.length}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "8px 10px 10px",
          borderBottom: `1px solid ${t.line}`,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              style={chipBtn(kindFilter === k)}
            >
              {EVENT_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              color: t.textMute,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              padding: "3px 4px",
              marginRight: 2,
            }}
          >
            rel·
          </span>
          {RELEVANCE_THRESHOLDS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMinRelevance(n)}
              style={chipBtn(minRelevance === n)}
              title={`relevancia ≥ ${n}`}
            >
              {renderDots(n)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              color: t.textMute,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              padding: "3px 4px",
              marginRight: 2,
            }}
          >
            año·
          </span>
          <button
            type="button"
            onClick={() => setYearFilter("all")}
            style={chipBtn(yearFilter === "all")}
          >
            todos
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYearFilter(y)}
              style={chipBtn(yearFilter === y)}
            >
              {String(y).slice(2)}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
            marginTop: 2,
          }}
        >
          <PartySelect
            label="beneficia"
            arrow="▲"
            color={t.good}
            value={benefits}
            options={parties}
            onChange={setBenefits}
            t={t}
          />
          <PartySelect
            label="perjudica"
            arrow="▼"
            color={t.bad}
            value={harms}
            options={parties}
            onChange={setHarms}
            t={t}
          />
        </div>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        {events.length === 0 && (
          <div
            style={{
              padding: "24px 14px",
              fontFamily: MONO,
              fontSize: 11,
              color: t.textMute,
              textAlign: "center",
            }}
          >
            Sin eventos con esos filtros
          </div>
        )}
        {events.map((e) => {
          const key = e.id || e.date;
          const isExp = expanded === key;
          const isSelected = selectedEventId === e.id;
          return (
            <div
              key={key}
              onClick={() => {
                setExpanded(isExp ? null : key);
                onEventClick?.(e);
                onEventSelect?.(isSelected ? null : e.id);
              }}
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${t.line}`,
                cursor: "pointer",
                background: isSelected
                  ? t.accentSoft
                  : isExp
                    ? t.panelHi
                    : "transparent",
                borderLeft: isSelected
                  ? `3px solid ${t.accent}`
                  : `3px solid transparent`,
                transition: "background 120ms",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: "wrap",
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
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {e.date}
                </span>
                <CategoryChip label={e.category} t={t} />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: 0.5,
                    color: t.textMute,
                    fontVariantNumeric: "tabular-nums",
                    marginLeft: "auto",
                  }}
                  title={`relevancia ${e.relevance}/5 · confianza ${e.confidence}`}
                >
                  {renderDots(e.relevance)}
                </span>
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 12.5,
                  color: t.text,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  marginBottom: 4,
                }}
              >
                {e.headline}
              </div>
              <ImpactRow impacts={e.impacts} t={t} />
              {isExp && (
                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 11.5,
                      color: t.textDim,
                      lineHeight: 1.45,
                    }}
                  >
                    {e.body}
                  </div>
                  {e.explanation && (
                    <div
                      style={{
                        fontFamily: SANS,
                        fontSize: 11.5,
                        color: t.textMute,
                        lineHeight: 1.45,
                        marginTop: 6,
                        paddingLeft: 8,
                        borderLeft: `2px solid ${t.accentLine}`,
                      }}
                    >
                      {e.explanation}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: MONO,
                      fontSize: 9.5,
                      letterSpacing: 0.4,
                      color: t.textMute,
                      textTransform: "uppercase",
                    }}
                  >
                    {e.ambito} · {e.mechanism}
                  </div>
                  {e.sources.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {e.sources.map((url, i) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          style={{
                            fontFamily: MONO,
                            fontSize: 9.5,
                            color: t.textDim,
                            letterSpacing: 0.3,
                            textDecoration: "underline",
                            marginRight: 8,
                            textTransform: "lowercase",
                          }}
                        >
                          fuente {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryChip({ label, t }: { label: string; t: (typeof TOKENS)["dark"] }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 9,
        color: t.textDim,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        padding: "1px 5px",
        border: `1px solid ${t.line}`,
        borderRadius: 2,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ImpactRow({
  impacts,
  t,
}: {
  impacts: EventImpact[];
  t: (typeof TOKENS)["dark"];
}) {
  if (!impacts.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 2,
      }}
    >
      {impacts.slice(0, 6).map((imp) => {
        const color =
          imp.direction === "+" ? t.good : imp.direction === "-" ? t.bad : t.textMute;
        const arrow =
          imp.direction === "+" ? "▲" : imp.direction === "-" ? "▼" : "—";
        const swatch = PARTY_COLORS[imp.party];
        return (
          <span
            key={imp.party}
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              color,
              letterSpacing: 0.3,
              padding: "1px 5px 1px 4px",
              border: `1px solid ${t.line}`,
              borderRadius: 2,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            {swatch && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: swatch,
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
            )}
            {imp.party}
            <span style={{ fontSize: 8 }}>{arrow}</span>
          </span>
        );
      })}
    </div>
  );
}

function renderDots(n: number): string {
  return "●".repeat(n) + "○".repeat(Math.max(0, 5 - n));
}

function PartySelect({
  label,
  arrow,
  color,
  value,
  options,
  onChange,
  t,
}: {
  label: string;
  arrow: string;
  color: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  t: (typeof TOKENS)["dark"];
}) {
  const active = value !== "all";
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontFamily: MONO,
        fontSize: 9.5,
        color: t.textMute,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        minWidth: 0,
      }}
    >
      <span style={{ color, fontSize: 9 }}>{arrow}</span>
      <span style={{ flexShrink: 0 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "2px 4px",
          fontFamily: MONO,
          fontSize: 9.5,
          background: active ? t.accent : "transparent",
          color: active ? "#0b0d10" : t.textDim,
          border: `1px solid ${active ? t.accent : t.line}`,
          borderRadius: 2,
          cursor: "pointer",
          textTransform: "none",
          letterSpacing: 0.2,
        }}
      >
        <option value="all">todos</option>
        {options.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  );
}
