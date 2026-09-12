import { Button, Input, Text, View } from "@tarojs/components";
import type { PlanReminder } from "@starward/miniapp-contracts";
import { useEffect, useRef, useState } from "react";
import "./plan-reminder-editor.scss";

const id = () => `reminder:${Date.now()}:${Math.random().toString(36).slice(2)}`;

function ReminderOffsetInput({ value, label, onChange }: { value: number; label: string; onChange(value: number): void }) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(String(value)); }, [value]);
  return <Input type="digit" value={text} aria-label={label}
    onFocus={() => { focused.current = true; }}
    onBlur={() => { focused.current = false; }}
    onInput={event => {
      const next = event.detail.value;
      setText(next);
      const numeric = Number(next);
      onChange(Number.isFinite(numeric) ? numeric : 0);
    }} />;
}
export function PlanReminderEditor({ reminders, onChange }: {
  reminders: readonly PlanReminder[];
  onChange(value: readonly PlanReminder[]): void;
}) {
  const change = (reminderId: string, patch: Partial<PlanReminder>) => onChange(reminders.map(r => r.reminderId === reminderId ? { ...r, ...patch } : r));
  return <View className="plan-reminder-editor">
    <View className="plan-reminder-editor__heading"><Text>个人提醒</Text><Text>{reminders.length} / 5</Text></View>
    {reminders.map((reminder, index) => <View className="plan-reminder-editor__group" key={reminder.reminderId}>
      <Input value={reminder.title} maxlength={100} aria-label={`提醒 ${index + 1} 名称`} placeholder="提醒名称"
        onInput={event => change(reminder.reminderId, { title: event.detail.value })} />
      <View className="plan-reminder-editor__row">
        <Text>出发前</Text><ReminderOffsetInput value={reminder.hoursBeforeDeparture} label={`提醒 ${index + 1} 提前小时`}
          onChange={value => change(reminder.reminderId, { hoursBeforeDeparture: value })} /><Text>小时</Text>
        <Button aria-label={`删除提醒 ${index + 1}`} onClick={() => onChange(reminders.filter(r => r.reminderId !== reminder.reminderId))}>删除</Button>
      </View>
      {reminder.items.map((item, itemIndex) => <View className="plan-reminder-editor__row" key={item.itemId}>
        <Input value={item.text} maxlength={100} aria-label={`提醒 ${index + 1} 清单项 ${itemIndex + 1}`} placeholder="写下要确认的一件事"
          onInput={event => change(reminder.reminderId, { items: reminder.items.map(i => i.itemId === item.itemId ? { ...i, text: event.detail.value } : i) })} />
        <Button className="plan-reminder-editor__remove-item" aria-label={`删除清单项 ${itemIndex + 1}`} onClick={() => change(reminder.reminderId, { items: reminder.items.filter(i => i.itemId !== item.itemId) })}>×</Button>
      </View>)}
      <Button disabled={reminder.items.length >= 20} onClick={() => change(reminder.reminderId, { items: [...reminder.items, { itemId: id(), text: "", completed: false }] })}>＋ 添加清单项（{reminder.items.length}/20）</Button>
      <Button className="plan-reminder-editor__notification" aria-pressed={reminder.notifyOnWechat}
        onClick={() => change(reminder.reminderId, { notifyOnWechat: !reminder.notifyOnWechat })}>
        微信通知意向 · {reminder.notifyOnWechat ? "希望开启" : "不发送"}
      </Button>
      <Text className="plan-reminder-editor__notice">当前 AppID 尚无可用订阅模板；这里仅保存通知意向，清单内容可独立使用。</Text>
    </View>)}
    <Button disabled={reminders.length >= 5} onClick={() => onChange([...reminders, { reminderId: id(), title: `个人提醒 ${reminders.length + 1}`, hoursBeforeDeparture: 1, notifyOnWechat: false, items: [] }])}>＋ 添加提醒</Button>
  </View>;
}
