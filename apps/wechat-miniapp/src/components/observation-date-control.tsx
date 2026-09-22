import { Button, ScrollView, Text, View } from "@tarojs/components";
import { NativeBackBoundary } from "./native-back-boundary";
import "./observation-date-control.scss";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;

function formatDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const weekdayIndex = (new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay() + 6) % 7;
  return `${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日 周${WEEKDAYS[weekdayIndex]}`;
}

function monthGroups(dates: readonly string[]) {
  const groups = new Map<string, string[]>();
  for (const date of dates) {
    const month = date.slice(0, 7);
    const group = groups.get(month) ?? [];
    group.push(date);
    groups.set(month, group);
  }
  return [...groups.entries()];
}

function weekdayOffset(firstDate: string) {
  const [year, value, day] = firstDate.split("-").map(Number);
  return (new Date(Date.UTC(year!, value! - 1, day!)).getUTCDay() + 6) % 7;
}

export function ObservationDateControl({
  dates,
  selectedDate,
  today,
  open,
  busy,
  onOpenChange,
  onSelect,
  nativeBackBoundary = true,
}: {
  dates: readonly string[];
  selectedDate: string;
  today: string;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (date: string) => void;
  /** False when the parent already owns this page's single native Back layer. */
  nativeBackBoundary?: boolean;
}) {
  const selectedIndex = dates.indexOf(selectedDate);
  const choose = (date: string | undefined) => {
    if (!date || busy || date === selectedDate) return;
    onSelect(date);
  };
  return (
    <>
      {nativeBackBoundary ? <NativeBackBoundary
        active={open}
        onBack={() => {
          if (!busy) onOpenChange(false);
        }}
      /> : null}
      <View className="observation-date" data-control="observation-date-control">
        <Button
          className="observation-date__step"
          ariaLabel="前一天"
          disabled={busy || selectedIndex <= 0}
          onClick={() => choose(dates[selectedIndex - 1])}
        >‹</Button>
        <Button
          className="observation-date__open"
          ariaLabel={`选择日期，当前${formatDate(selectedDate)}`}
          aria-haspopup="dialog"
          disabled={busy}
          onClick={() => onOpenChange(true)}
        >
          <Text>{formatDate(selectedDate)}</Text>
          <View className="observation-date__calendar-icon" aria-hidden="true" />
        </Button>
        <Button
          className="observation-date__step"
          ariaLabel="后一天"
          disabled={busy || selectedIndex < 0 || selectedIndex >= dates.length - 1}
          onClick={() => choose(dates[selectedIndex + 1])}
        >›</Button>
        {selectedDate !== today ? (
          <Button className="observation-date__today" disabled={busy} onClick={() => choose(today)}>
            今晚
          </Button>
        ) : null}
      </View>
      {open ? (
        <View className="observation-calendar" role="dialog" aria-modal="true" aria-label="选择观测日期">
          <Button className="observation-calendar__backdrop" ariaLabel="关闭日期选择" onClick={() => onOpenChange(false)} />
          <View className="observation-calendar__sheet">
            <View className="observation-calendar__header">
              <Text>选择日期</Text>
              <Button ariaLabel="关闭日期选择" disabled={busy} onClick={() => onOpenChange(false)}>×</Button>
            </View>
            <ScrollView scrollY className="observation-calendar__scroll">
              {monthGroups(dates).map(([month, monthDates]) => {
                const [year, value] = month.split("-").map(Number);
                return (
                  <View className="observation-calendar__month" key={month}>
                    <Text className="observation-calendar__month-title">{year}年{value}月 · 地点当地时间</Text>
                    <View className="observation-calendar__week">
                      {WEEKDAYS.map(day => <Text key={day}>{day}</Text>)}
                    </View>
                    <View className="observation-calendar__days">
                      {Array.from({ length: weekdayOffset(monthDates[0]!) }, (_, index) => <View key={`blank:${index}`} />)}
                      {monthDates.map(date => {
                        const selected = date === selectedDate;
                        return (
                          <Button
                            key={date}
                            data-date={date}
                            className={selected ? "observation-calendar__day observation-calendar__day--selected" : "observation-calendar__day"}
                            ariaLabel={`${formatDate(date)}${date === today ? "，今天" : ""}${selected ? "，已选择" : ""}`}
                            aria-pressed={selected ? "true" : "false"}
                            disabled={busy}
                            onClick={() => choose(date)}
                          >
                            <Text>{Number(date.slice(8, 10))}</Text>
                            {date === today ? <Text className="observation-calendar__today">今天</Text> : null}
                          </Button>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              <Text className="observation-calendar__note">日期按地点当地时间显示；天文信息可用，天气覆盖按当日服务实际结果呈现。</Text>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </>
  );
}
