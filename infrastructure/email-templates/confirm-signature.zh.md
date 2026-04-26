# Confirmation email — Chinese (Simplified)

**Sent by:** `netlify/functions/on-signature.ts` → Resend
**Triggered when:** signer's `locale` field starts with `zh`
**Source of truth:** `renderConfirmZh()` in `netlify/functions/on-signature.ts`. This file is a readable copy. Edits here do nothing on their own — change the function too.

> ⚠️ Translation note: this draft was machine-rendered from the EN version with editorial smoothing. Ben should review and adjust register before launch — phrasing in this language is sensitive to tone.

---

## Subject

```
再点一下：让你为本拿比孩子的签名生效
```

## Plain-text body

```
{{firstName}} 你好，

你刚刚在 fundburnabykids.ca 签下了请愿信，要求 BC 省政府在 SD41
学区于 5 月 27 日通过 2026-27 年度预算之前，全额拨付 940 万加元的
仲裁裁决款项。

为了让你的名字进入我们将向 MLA、教育部长和媒体公开展示的名单，
请点击确认：

  {{confirmUrl}}

为什么需要这一步。

我们公开在 fundburnabykids.ca 上的每一个名字，都是我们能站出来
背书的名字。当 MLA 办公室质疑「这些都是真的本拿比家长吗」，
已确认的签名就是回答。未确认的签名不会公开、也不进入计数。

此链接 48 小时后失效，过期后需重新签名。

关键截止：预算通过日为 5 月 27 日。

—
Fund Burnaby Kids
Burnaby Kids First 旗下的一个 campaign
{{MAILING_ADDRESS}}

你收到这封邮件，是因为你在 fundburnabykids.ca 签署了请愿。
除非你勾选了订阅后续更新，这是与本次签名相关的唯一一封邮件。
```

## Variables

Same as EN version — see `confirm-signature.en.md`.

## Phrasings to consider revising

| Current | Possible alternatives | Why review |
|---|---|---|
| 「让你的名字进入...名单」 | 「让你的名字真正出现在我们公开的名单上」 | "进入名单" reads like bureaucratic Chinese; less natural |
| 「能站出来背书的名字」 | 「我们敢公开承认是真实家长的名字」 | "背书" has a contractual feel; check if too formal |
| 「关键截止：预算通过日为 5 月 27 日」 | 「关键节点：5 月 27 日预算通过」 | "截止" might confuse — it's not a deadline for the signer |
| 「Burnaby Kids First 旗下的一个 campaign」 | 「Burnaby Kids First 联盟的一个倡导行动」 | English `campaign` may be unfamiliar; "倡导行动" is closer |

Apply Ben's edits to both this file AND `renderConfirmZh()` in `netlify/functions/on-signature.ts`.
