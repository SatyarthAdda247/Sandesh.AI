// Minimal offline mock for Supabase used when env is missing.
// Supports the subset of APIs used by the app: auth and table ops for
// `verticals` and `suggestions`.

type MockUser = {
  id: string;
  email: string;
};

type MockSession = {
  user: MockUser;
};

type SelectResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type UpdateResult = {
  error: { message: string } | null;
};

type SuggestionsRow = {
  id: string;
  vertical_id: string;
  suggestion_date: string;
  hook: string;
  push_copy: string;
  cta: string;
  channel: string;
  urgency: string;
  link: string | null;
  score: number;
  status: string;
  approved_at?: string | null;
  published_at?: string | null;
  publish_payload?: unknown;
  verticals?: { name: string };
};

type VerticalsRow = {
  id: string;
  name: string;
};

type TableName = "verticals" | "suggestions";

function generateTodayISODate(): string {
  return new Date().toISOString().split("T")[0]!;
}

function createMockData() {
  const verticals: VerticalsRow[] = [
    { id: "v1", name: "Banking" },
    { id: "v2", name: "SSC" },
    { id: "v3", name: "Railway" },
  ];

  const today = generateTodayISODate();

  const suggestions: SuggestionsRow[] = [
    {
      id: "s1",
      vertical_id: "v1",
      suggestion_date: today,
      hook: "Big exam update just dropped!",
      push_copy: "New vacancies announced. Check eligibility and apply now.",
      cta: "View Details",
      channel: "push",
      urgency: "High",
      link: "https://example.com/banking/update",
      score: 0.92,
      status: "pending",
      verticals: { name: "Banking" },
    },
    {
      id: "s2",
      vertical_id: "v2",
      suggestion_date: today,
      hook: "Top-scoring SSC bundle discount",
      push_copy: "Save 30% on the most popular SSC bundle today.",
      cta: "Grab Offer",
      channel: "push",
      urgency: "Medium",
      link: "https://example.com/ssc/offer",
      score: 0.81,
      status: "approved",
      verticals: { name: "SSC" },
    },
    {
      id: "s3",
      vertical_id: "v3",
      suggestion_date: today,
      hook: "Railway mock test marathon",
      push_copy: "Boost your prep with 5 full-length mocks.",
      cta: "Start Now",
      channel: "push",
      urgency: "Low",
      link: "https://example.com/railway/mocks",
      score: 0.73,
      status: "pending",
      verticals: { name: "Railway" },
    },
  ];

  return { verticals, suggestions };
}

export function createMockSupabaseClient() {
  const remoteUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
  const remoteAnonKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || "";
  const enableRemoteFunctions =
    ((import.meta.env.VITE_REMOTE_FUNCTIONS as string | undefined)?.toLowerCase() ?? "true") !==
    "false";

  const mockUser: MockUser = {
    id: "mock-user-id",
    email: "mock.user@example.com",
  };
  const mockSession: MockSession = { user: mockUser };
  const store = createMockData();

  function from(table: TableName) {
    // Select chain
    let pipeline: any[] = [];
    let selected: "all" | "withVerticalJoin" = "all";
    return {
      select(_columns?: string) {
        if (table === "suggestions" && _columns?.includes("verticals(")) {
          selected = "withVerticalJoin";
        }
        pipeline.push({ op: "select" });
        return this;
      },
      eq(column: string, value: any) {
        pipeline.push({ op: "eq", column, value });
        return this;
      },
      order(_column: string, _opts?: { ascending?: boolean }) {
        pipeline.push({ op: "order", column: _column, opts: _opts });
        return this;
      },
      async then(onFulfilled: any, onRejected?: any) {
        try {
          let result: any[] = [];
          if (table === "verticals") {
            result = store.verticals.slice();
          } else if (table === "suggestions") {
            result = store.suggestions.slice();
          }

          // Simple filters
          for (const step of pipeline) {
            if (step.op === "eq") {
              if (table === "suggestions" && step.column === "suggestion_date") {
                result = result.filter((r) => r.suggestion_date === step.value);
              }
              if (table === "suggestions" && step.column === "id") {
                result = result.filter((r) => r.id === step.value);
              }
            }
            if (step.op === "order") {
              if (step.column === "score") {
                result.sort((a, b) =>
                  (step.opts?.ascending ? a.score - b.score : b.score - a.score)
                );
              }
            }
          }

          // Emulate join shape
          if (table === "suggestions" && selected === "withVerticalJoin") {
            result = result.map((r) => {
              const v = store.verticals.find((vv) => vv.id === r.vertical_id);
              return {
                ...r,
                verticals: { name: v?.name ?? "Unknown" },
              };
            });
          }

          const payload: SelectResult<any> = { data: result, error: null };
          return onFulfilled(payload);
        } catch (e: any) {
          const errPayload: SelectResult<any> = {
            data: null,
            error: { message: e?.message ?? "Mock select error" },
          };
          if (onRejected) return onRejected(errPayload);
          return onFulfilled(errPayload);
        }
      },
      // Update operation
      update(values: Partial<SuggestionsRow>) {
        return {
          eq(_col: string, id: string) {
            const list = table === "suggestions" ? store.suggestions : [];
            const idx = list.findIndex((r) => r.id === id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...values };
            }
            return {
              async then(onFulfilled: any) {
                const payload: UpdateResult = { error: null };
                return onFulfilled(payload);
              },
            };
          },
        };
      },
      // Insert operation
      insert(rows: Partial<SuggestionsRow>[]) {
        return {
          async then(onFulfilled: any) {
            if (table !== "suggestions") {
              return onFulfilled({ error: { message: "Mock insert only supports suggestions" } });
            }
            const today = generateTodayISODate();
            const created: SuggestionsRow[] = rows.map((r) => {
              const id = `s_${Math.random().toString(36).slice(2, 10)}`;
              const verticalId = (r as any).vertical_id as string;
              const base: SuggestionsRow = {
                id,
                vertical_id: verticalId,
                suggestion_date: (r.suggestion_date as string) || today,
                hook: (r.hook as string) || "Generated hook",
                push_copy: (r.push_copy as string) || "Generated push copy",
                cta: (r.cta as string) || "Learn More",
                channel: (r.channel as string) || "push",
                urgency: (r.urgency as string) || "Medium",
                link: (r.link as string) || null,
                score: typeof r.score === "number" ? (r.score as number) : Math.random(),
                status: (r.status as string) || "pending",
              };
              return base;
            });
            store.suggestions.push(...created);
            return onFulfilled({ data: created, error: null });
          },
        };
      },
    };
  }

  const auth = {
    // Sign in always "succeeds" in offline mode
    async signInWithPassword(_opts: { email: string; password: string }) {
      return { data: { user: mockUser, session: mockSession }, error: null };
    },
    async signUp(_opts: any) {
      return { data: { user: mockUser, session: mockSession }, error: null };
    },
    async signOut() {
      return { error: null };
    },
    async getSession() {
      return { data: { session: mockSession }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
      // Immediately call with a valid session so protected routes are accessible
      const timeoutId = setTimeout(() => callback("SIGNED_IN", mockSession), 0);
      return {
        data: {
        subscription: {
          unsubscribe() {
            clearTimeout(timeoutId);
          },
        },
        },
        error: null,
      };
    },
  };

  function buildMockCampaignMessage(params: any) {
    const tone = String(params?.tonality || "friendly").toLowerCase();
    const language = String(params?.language || "Hinglish");
    const vertical = params?.vertical || "Adda247 Learners";
    const campaignType = params?.campaignType || "Revenue";
    const offer = params?.offer || "FLAT 50% OFF + 1% Extra with Coins";
    const promo = params?.promoCode ? `Use Code: {{${params.promoCode}}}` : "Use Code: {{SMART50}}";
    const occasion = params?.occasion ? `${params.occasion} Special` : "Today Only";
    let base =
`🌟 ${occasion}! 🌟

Hey {{FIRST_NAME}}, ${vertical} aspirants are on FIRE right now! 🔥

${offer}
${promo}

🎯 Campaign Type: ${campaignType}
👥 Audience: ${params?.audience || "High intent learners"}

📞 Call: {{9667589247}}
👉 Tap now and own your prep!`;

    if (language === "Hindi") {
      base =
`🌟 ${occasion}! 🌟

नमस्ते {{FIRST_NAME}} 👋
${vertical} की तैयारी कर रहे विद्यार्थियों के लिए जबरदस्त मौका! 🔥

${offer}
${promo}

🎯 अभियान प्रकार: ${campaignType}
👥 ऑडियंस: ${params?.audience || "गंभीर और हाई-इंटेंट विद्यार्थी"}

📞 कॉल करें: {{9667589247}}
👉 अभी टैप करें और अपनी तैयारी को अगला स्तर दें!`;
    } else if (language === "Hinglish") {
      base =
`🌟 ${occasion}! 🌟

Hey {{FIRST_NAME}} 👋
${vertical} ke aspirants ke liye ek dhamakedaar mauka! 🔥

${offer}
${promo}

🎯 Campaign Type: ${campaignType}
👥 Audience: ${params?.audience || "serious + high-intent learners"}

📞 Call karo: {{9667589247}}
👉 Tap karo aur apni prep ko next level pe le jao!`;
    }

    if (tone === "funny") {
      return `😂 LOL Alert! 😂\n\n${base}\n\nPS: Miss this and your friends will flex rank screenshots without you!`;
    }
    if (tone === "fomo") {
      return `⏰ FINAL CALL ⏰\n\n${base}\n\nTimer already started... {{03:00:00}} left!`;
    }
    if (tone === "premium") {
      return `💎 Elite Access Only 💎\n\n${base}\n\nThis seat is reserved for serious achievers.`;
    }
    return base;
  }

  async function invokeRemoteFunction(name: string, body: any) {
    if (!enableRemoteFunctions || !remoteUrl || !remoteAnonKey) return null;
    try {
      const resp = await fetch(`${remoteUrl}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: remoteAnonKey,
          Authorization: `Bearer ${remoteAnonKey}`,
        },
        body: JSON.stringify(body ?? {}),
      });

      const text = await resp.text();
      if (!resp.ok) {
        console.warn(`Remote function ${name} responded with ${resp.status}:`, text);
        return null;
      }
      return text ? JSON.parse(text) : {};
    } catch (err) {
      console.warn(`Remote function ${name} failed:`, err);
      return null;
    }
  }

  const functions = {
    async invoke(name: string, options: { body?: any }) {
      const remote = await invokeRemoteFunction(name, options?.body);
      if (remote) {
        return { data: remote, error: null };
      }

      if (name === "generate-comms") {
      const records = Array.isArray(options?.body?.records) ? options.body.records : [];
      const date = typeof options?.body?.date === "string" && options.body.date
        ? options.body.date
        : generateTodayISODate();

      // Simple scoring per vertical based on revenue/orders
      const byVertical = new Map<string, Array<any>>();
      for (const r of records) {
        const v = String(r.vertical || "").trim();
        if (!v) continue;
        if (!byVertical.has(v)) byVertical.set(v, []);
        byVertical.get(v)!.push(r);
      }
      const suggestions: Array<any> = [];
      for (const [nameKey, list] of byVertical) {
        const totalRevenue = list.reduce((s, r) => s + Number(r.revenue || 0), 0);
        const totalOrders = list.reduce((s, r) => s + Number(r.orders || 0), 0);
        const strength = totalOrders > 0 ? Math.min(1, totalRevenue / (totalOrders * 1000)) : 0.5;
        const score = Math.round((0.6 + 0.4 * strength) * 1000) / 1000;
        const v = store.verticals.find((vv) => vv.name === nameKey) ?? store.verticals[0];
        const urgency = score >= 0.85 ? "High" : score >= 0.7 ? "Medium" : "Low";
        suggestions.push({
          suggestion_date: date,
          vertical_id: v.id,
          hook: `${nameKey}: Fresh opportunity today`,
          push_copy: `Recent performance indicates momentum. Revenue ₹${Math.round(totalRevenue)} across ${totalOrders} orders.`,
          cta: "View Now",
          channel: "push",
          urgency,
          link: null,
          score,
          status: "pending",
        });
      }
      return { data: { suggestions }, error: null };
      }

      if (name === "generate-campaign-ai") {
        const message = buildMockCampaignMessage(options?.body || {});
        return {
          data: {
            message,
            model: "mock-gpt-5-mini",
            tokens: { prompt_tokens: 150, completion_tokens: 120, total_tokens: 270 },
          },
          error: null,
        };
      }

      return { data: null, error: { message: "Unknown mock function" } };
    },
  };

  return { from, auth, functions };
}


