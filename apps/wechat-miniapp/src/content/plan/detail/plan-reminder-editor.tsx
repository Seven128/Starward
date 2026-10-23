import { Input, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import type { PlanReminder } from "@starward/miniapp-contracts";
import { useEffect, useRef, useState } from "react";
import "./plan-reminder-editor.scss";

const id = () => `reminder:${Date.now()}:${Math.random().toString(36).slice(2)}`;

function ReminderOffsetInput({ value, label, disabled, onChange }: { value: number; label: string; disabled: boolean; onChange(value: number): void }) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  return <Input type="digit" value={text} aria-label={label} disabled={disabled}
    onFocus={() => { focused.current = true; }}
    onBlur={() => { focused.current = false; }}
    onInput={event => {
      if (disabled) return;
      const next = event.detail.value;
      setText(next);
      const numeric = Number(next);
      onChange(Number.isFinite(numeric) ? numeric : 0);
    }} />;
}
export function PlanReminderEditor({ reminders, disabled = false, onChange }: {
  reminders: readonly PlanReminder[];
  disabled?: boolean;
  onChange(value: readonly PlanReminder[]): void;
}) {
  const update = (value: readonly PlanReminder[]) => { if (!disabled) onChange(value); };
  const change = (reminderId: string, patch: Partial<PlanReminder>) => update(reminders.map(r => r.reminderId === reminderId ? { ...r, ...patch } : r));
  return <View className="plan-reminder-editor">
    <View className="plan-reminder-editor__heading"><Text>个人提醒</Text><Text>{reminders.length} / 5</Text></View>
    {reminders.map((reminder, index) => <View className="plan-reminder-editor__group" key={reminder.reminderId}>
      <Input value={reminder.title} disabled={disabled} maxlength={100} aria-label={`提醒 ${index + 1} 名称`} placeholder="提醒名称"
        onInput={event => change(reminder.reminderId, { title: event.detail.value })} />
      <View className="plan-reminder-editor__row">
        <Text>出发前</Text><ReminderOffsetInput value={reminder.hoursBeforeDeparture} label={`提醒 ${index + 1} 提前小时`} disabled={disabled}
          onChange={value => change(reminder.reminderId, { hoursBeforeDeparture: value })} /><Text>小时</Text>
        <Button disabled={disabled} aria-label={`删除提醒 ${index + 1}`} onClick={() => update(reminders.filter(r => r.reminderId !== reminder.reminderId))}>删除</Button>
      </View>
      {reminder.items.map((item, itemIndex) => <View className="plan-reminder-editor__row" key={item.itemId}>
        <Input value={item.text} disabled={disabled} maxlength={100} aria-label={`提醒 ${index + 1} 清单项 ${itemIndex + 1}`} placeholder="写下要确认的一件事"
          onInput={event => change(reminder.reminderId, { items: reminder.items.map(i => i.itemId === item.itemId ? { ...i, text: event.detail.value } : i) })} />
        <Button disabled={disabled} className="plan-reminder-editor__remove-item" aria-label={`删除清单项 ${itemIndex + 1}`} onClick={() => change(reminder.reminderId, { items: reminder.items.filter(i => i.itemId !== item.itemId) })}>×</Button>
      </View>)}
      <Button className={reminder.items.length < 20 ? "plan-reminder-editor__add-item" : ""} disabled={disabled || reminder.items.length >= 20} onClick={() => change(reminder.reminderId, { items: [...reminder.items, { itemId: id(), text: "", completed: false }] })}>＋ 添加清单项（<Text className="plan-reminder-editor__item-count">{reminder.items.length}/20</Text>）</Button>
      <Button disabled={disabled} className="plan-reminder-editor__notification" aria-pressed={reminder.notifyOnWechat}
        onClick={() => change(reminder.reminderId, { notifyOnWechat: !reminder.notifyOnWechat })}>
        微信通知意向 · {reminder.notifyOnWechat ? "希望开启" : "不发送"}
      </Button>
      <Text className="plan-reminder-editor__notice">每个提醒最多 20 项。先保存清单，再按平台能力开启微信通知。</Text>
    </View>)}
    <Button className={reminders.length < 5 ? "plan-reminder-editor__add-reminder" : ""} disabled={disabled || reminders.length >= 5} onClick={() => update([...reminders, { reminderId: id(), title: `个人提醒 ${reminders.length + 1}`, hoursBeforeDeparture: 1, notifyOnWechat: false, items: [] }])}>＋ 添加提醒</Button>
  </View>;
}
