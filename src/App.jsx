import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const REMINDER_OPTIONS = [
  { label: "3 days", value: 3 }, { label: "Weekly", value: 7 },
  { label: "2 weeks", value: 14 }, { label: "Monthly", value: 30 }, { label: "2 months", value: 60 },
];
const CYCLE_OPTIONS = [21, 24, 26, 28, 30, 32, 35];
const EMOJIS = ["🧑","👩","👦","👧","🧓","👨","👵","👴","🧔","👱","🧑‍🦱","🧑‍🦳"];

const TIERS = {
  inner:  { label: "Inner Circle", icon: "⭐", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", desc: "Family & closest people — high priority" },
  close:  { label: "Close",        icon: "💛", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", desc: "Good friends — regular check-ins" },
  casual: { label: "Casual",       icon: "💬", color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", desc: "Acquaintances — occasional touch base" },
};

const GIFT_SUGGESTIONS = {
  wine:      ["🍷 Their favorite red wine", "🥂 A nice rosé", "🍾 Sparkling wine + nice glass"],
  chocolate: ["🍫 Dark chocolate bar", "🍬 Assorted truffles", "🧁 Chocolate-covered strawberries"],
  food:      ["🍕 Order from their favorite restaurant", "🥡 Their comfort food takeout", "🍜 Their go-to comfort meal"],
  flowers:   ["💐 Fresh flowers", "🌹 A small bouquet", "🌸 Their favorite blooms"],
  comfort:   ["🛁 Bath salts & a candle", "🧸 Cozy blanket", "☕ Their favorite tea or coffee"],
};

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_CONTACTS = [
  { id: 1, name: "Sarah", emoji: "👩", phone: "", tier: "inner", lastContactDate: Date.now() - 86400000 * 4, reminderDays: 7, notes: "Wife. Loves red wine and dark chocolate.", cycleTracking: true, lastPeriodDate: Date.now() - 86400000 * 20, cycleLength: 28, cycleGifts: ["wine", "chocolate"], cycleNote: "Loves Malbec and Lindt 90% dark" },
  { id: 2, name: "Jake",   emoji: "👦", phone: "", tier: "close",  lastContactDate: Date.now() - 86400000 * 5, reminderDays: 7,  notes: "Best friend. New job in finance. Soccer fan.", cycleTracking: false },
  { id: 3, name: "Emma",   emoji: "👧", phone: "", tier: "inner", lastContactDate: Date.now() - 86400000 * 3, reminderDays: 10, notes: "Daughter. College sophomore. Loves sushi.", cycleTracking: true, lastPeriodDate: Date.now() - 86400000 * 25, cycleLength: 30, cycleGifts: ["food","comfort"], cycleNote: "DoorDash sushi from Nobu" },
  { id: 4, name: "Dev",    emoji: "🧑", phone: "", tier: "close",  lastContactDate: Date.now() - 86400000 * 7, reminderDays: 10, notes: "College friend. Hiking and photography.", cycleTracking: false },
  { id: 5, name: "Grandpa",emoji: "👴", phone: "", tier: "inner", lastContactDate: Date.now() - 86400000 * 1, reminderDays: 7,  notes: "Veteran. History and baseball.", cycleTracking: false },
  { id: 6, name: "Marcus", emoji: "🧑", phone: "", tier: "casual", lastContactDate: Date.now() - 86400000 * 30, reminderDays: 30, notes: "Old coworker.", cycleTracking: false },
];

const SEED_LOG = [
  { id: 1, contactId: 1, direction: "out", text: "Hey love! Just thinking about you 💙", timestamp: Date.now() - 86400000 * 4 },
  { id: 2, contactId: 1, direction: "in",  text: "Aw you're sweet 😊 Dinner tonight?",   timestamp: Date.now() - 86400000 * 4 + 3600000 },
  { id: 3, contactId: 3, direction: "out", text: "Emma! Everything okay at school?",     timestamp: Date.now() - 86400000 * 3 },
  { id: 4, contactId: 3, direction: "in",  text: "Dad 😂 Midterms are rough but fine",   timestamp: Date.now() - 86400000 * 3 + 7200000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return "Never";
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.floor(d/7)}w ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`; return `${Math.floor(d/365)}y ago`;
}
function computeStatus(lastContactDate, reminderDays) {
  if (!lastContactDate) return "overdue";
  const d = (Date.now() - lastContactDate) / 86400000;
  if (d >= reminderDays) return "overdue"; if (d >= reminderDays * 0.6) return "soon"; return "good";
}
function statusColor(s) { return s==="overdue"?"#f97316":s==="soon"?"#d97706":"#16a34a"; }
function openSMS(phone, text) {
  const body = encodeURIComponent(text);
  const isAndroid = /android/i.test(navigator.userAgent);
  const sep = isAndroid ? "?" : "&";
  window.open(phone ? `sms:${phone}${sep}body=${body}` : `sms:${sep}body=${body}`, "_blank");
}
function getCycleDayInfo(c) {
  if (!c.cycleTracking || !c.lastPeriodDate || !c.cycleLength) return null;
  const days = (Date.now() - c.lastPeriodDate) / 86400000;
  return { daysUntilNext: Math.round(c.cycleLength - days), currentDay: Math.floor(days) + 1 };
}
function getCycleAlert(c) {
  const i = getCycleDayInfo(c); if (!i) return null;
  if (i.daysUntilNext <= 0 && i.daysUntilNext > -7) return "active";
  if (i.daysUntilNext <= 2 && i.daysUntilNext > 0) return "imminent";
  if (i.daysUntilNext <= 5) return "approaching"; return null;
}
function formatNextPeriod(d) {
  if (d <= 0) return "likely started"; if (d === 1) return "tomorrow"; return `in ${Math.round(d)} days`;
}
const contactPickerSupported = () => "contacts" in navigator && "ContactsManager" in window;

// ─── Swipeable Card ───────────────────────────────────────────────────────────
function SwipeCard({ onEdit, onDelete, children, tier }) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(null);
  const ACTION_W = 130;

  function onTouchStart(e) { startX.current = e.touches[0].clientX; setSwiping(true); }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -ACTION_W));
  }
  function onTouchEnd() {
    setSwiping(false); startX.current = null;
    setOffset(prev => prev < -ACTION_W / 2 ? -ACTION_W : 0);
  }
  function close() { setOffset(0); }

  const tierInfo = TIERS[tier] || TIERS.casual;

  return (
    <div style={{ position: "relative", marginBottom: 10, borderRadius: 16, overflow: "hidden" }}>
      {/* Action buttons revealed behind */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: ACTION_W, display: "flex" }}>
        <button onClick={() => { close(); onEdit(); }} style={{ flex: 1, background: "#3b82f6", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: 18 }}>✏️</span>Edit
        </button>
        <button onClick={() => { close(); onDelete(); }} style={{ flex: 1, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: 18 }}>🗑️</span>Delete
        </button>
      </div>
      {/* Sliding content */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${offset}px)`, transition: swiping ? "none" : "transform 0.25s ease", position: "relative", zIndex: 1, borderLeft: `3px solid ${tierInfo.color}`, borderRadius: 16, background: "#fff" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function KitApp() {
  const [contacts, setContacts] = useState(() =>
    SEED_CONTACTS.map(c => ({ ...c, status: computeStatus(c.lastContactDate, c.reminderDays) }))
  );
  const [log, setLog] = useState(SEED_LOG);
  const [view, setView] = useState("home");
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("people");
  const [tierFilter, setTierFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToast, setSentToast] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [importingContacts, setImportingContacts] = useState(false);
  const [importToast, setImportToast] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // contact id pending delete
  const chatBottom = useRef(null);

  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: "smooth" }); }, [view, log, sentToast]);

  const contactLog = selected
    ? [...log].filter(m => m.contactId === selected.id).sort((a,b) => a.timestamp - b.timestamp)
    : [];

  const overdueList = contacts.filter(c => c.status === "overdue");
  const cycleAlerts = contacts.filter(c => ["imminent","active"].includes(getCycleAlert(c)));

  function goChat(c) { setSelected(c); setView("chat"); setDraft(""); setShowReplyBox(false); setSentToast(false); }
  function goHome() { setView("home"); setSelected(null); }

  function updateContact(id, patch) {
    setContacts(prev => prev.map(c => {
      if (c.id !== id) return c;
      const u = { ...c, ...patch };
      u.status = computeStatus(u.lastContactDate, u.reminderDays);
      return u;
    }));
    setSelected(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }

  function addContact(fields) {
    const nc = { id: Date.now(), ...fields, lastContactDate: null, status: "overdue" };
    setContacts(prev => [...prev, nc]);
    setView("home");
  }

  function deleteContact(id) {
    setContacts(prev => prev.filter(c => c.id !== id));
    setLog(prev => prev.filter(m => m.contactId !== id));
    setDeleteConfirm(null);
    if (view !== "home") goHome();
  }

  // ── Contact Picker API ────────────────────────────────────────────────────
  async function handleImportContacts() {
    if (!contactPickerSupported()) {
      setImportToast("Contact Picker is only supported in Chrome on Android. Add contacts manually below.");
      setTimeout(() => setImportToast(""), 4000);
      return;
    }
    setImportingContacts(true);
    try {
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      if (!picked || picked.length === 0) { setImportingContacts(false); return; }
      const existing = new Set(contacts.map(c => c.phone?.replace(/\D/g, "")));
      let added = 0;
      const newContacts = picked
        .filter(p => p.name?.[0] && p.tel?.[0])
        .filter(p => !existing.has(p.tel[0].replace(/\D/g, "")))
        .map(p => ({
          id: Date.now() + Math.random(),
          name: p.name[0],
          phone: p.tel[0],
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          tier: "casual",
          reminderDays: 14,
          notes: "",
          cycleTracking: false,
          lastContactDate: null,
          status: "overdue",
        }));
      added = newContacts.length;
      setContacts(prev => [...prev, ...newContacts]);
      setImportToast(added > 0 ? `✓ Imported ${added} contact${added > 1 ? "s" : ""}! Swipe left to edit their tier & details.` : "No new contacts to import.");
      setTimeout(() => setImportToast(""), 4000);
    } catch (e) {
      setImportToast("Permission denied or cancelled.");
      setTimeout(() => setImportToast(""), 3000);
    }
    setImportingContacts(false);
  }

  // ── AI message generate ───────────────────────────────────────────────────
  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true); setDraft("");
    const ctx = contactLog.slice(-4).map(m => `${m.direction==="out"?"You":selected.name}: ${m.text}`).join("\n");
    const cycleInfo = getCycleDayInfo(selected);
    const cyclePart = cycleInfo && selected.cycleTracking ? `\nNote: ${selected.name}'s period is expected ${formatNextPeriod(cycleInfo.daysUntilNext)}. Be warm and caring.` : "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You help people stay in touch with those they love. Write a single warm, casual, genuine text message (1–3 sentences) that checks in and shows care. Sound like a real person. Reference their life details if provided. No hashtags, no formality. Output only the message.`,
          messages: [{ role: "user", content: `Write a check-in text to ${selected.name}.\n${selected.notes?`About them: ${selected.notes}`:""}${cyclePart}\n${ctx?`Recent convo:\n${ctx}`:""}` }],
        }),
      });
      const data = await res.json();
      setDraft(data.content?.[0]?.text || `Hey ${selected.name}! Thinking of you — how've you been? 💙`);
    } catch { setDraft(`Hey ${selected.name}! Just wanted to check in — how are you? 💙`); }
    setGenerating(false);
  }

  function handleSend() {
    if (!draft.trim() || !selected) return;
    setSending(true);
    const now = Date.now();
    setTimeout(() => {
      setLog(prev => [...prev, { id: now, contactId: selected.id, direction: "out", text: draft.trim(), timestamp: now }]);
      updateContact(selected.id, { lastContactDate: now });
      openSMS(selected.phone, draft.trim());
      setDraft(""); setSending(false); setSentToast(true);
      setTimeout(() => setSentToast(false), 3000);
    }, 600);
  }

  function handleLogReply() {
    if (!replyText.trim() || !selected) return;
    const now = Date.now();
    setLog(prev => [...prev, { id: now, contactId: selected.id, direction: "in", text: replyText.trim(), timestamp: now }]);
    setReplyText(""); setShowReplyBox(false);
  }

  return (
    <div style={S.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;} textarea,input{font-family:'DM Sans',sans-serif;}
        ::-webkit-scrollbar{width:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.55}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={S.statusBar}><span style={{fontWeight:600}}>9:41</span><span>●●● 🔋</span></div>

      {/* Delete confirm modal */}
      {deleteConfirm && (() => {
        const c = contacts.find(x => x.id === deleteConfirm);
        return (
          <div style={S.modalOverlay}>
            <div style={S.modal}>
              <div style={{fontSize:40,marginBottom:10}}>{c?.emoji}</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:600,marginBottom:8}}>Remove {c?.name}?</div>
              <div style={{fontSize:13,color:"#a08060",marginBottom:20,lineHeight:1.5}}>This will delete all message history with {c?.name}. This can't be undone.</div>
              <div style={{display:"flex",gap:10}}>
                <button style={{...S.btnSecondary,flex:1}} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button style={{...S.btnDanger,flex:1}} onClick={() => deleteContact(deleteConfirm)}>Yes, remove</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Import toast */}
      {importToast && (
        <div style={S.importToast}>{importToast}</div>
      )}

      {view === "home" && (
        <HomeView
          contacts={contacts} log={log} overdueList={overdueList} cycleAlerts={cycleAlerts}
          activeTab={activeTab} setActiveTab={setActiveTab} tierFilter={tierFilter} setTierFilter={setTierFilter}
          onSelect={goChat} onAdd={() => setView("addContact")}
          onEdit={(c) => { setSelected(c); setView("profile"); }}
          onDelete={(id) => setDeleteConfirm(id)}
          onImport={handleImportContacts} importing={importingContacts}
          contactPickerSupported={contactPickerSupported()}
        />
      )}
      {view === "chat" && selected && (
        <ChatView contact={selected} contactLog={contactLog} draft={draft} setDraft={setDraft} generating={generating} sending={sending} sentToast={sentToast} onGenerate={handleGenerate} onSend={handleSend} showReplyBox={showReplyBox} setShowReplyBox={setShowReplyBox} replyText={replyText} setReplyText={setReplyText} onLogReply={handleLogReply} onBack={goHome} onProfile={() => setView("profile")} onDelete={() => setDeleteConfirm(selected.id)} chatBottom={chatBottom}
        />
      )}
      {view === "profile" && selected && (
        <ProfileView contact={selected} onBack={() => view==="profile" && selected ? (selected.lastContactDate !== undefined ? setView("chat") : goHome()) : goHome()} onBackToHome={goHome} onUpdate={patch => updateContact(selected.id, patch)} onDelete={() => setDeleteConfirm(selected.id)} onCycleEdit={() => setView("cycle")} />
      )}
      {view === "addContact" && <AddContactView onBack={goHome} onAdd={addContact} />}
      {view === "cycle" && selected && <CycleView contact={selected} onBack={() => setView("profile")} onUpdate={patch => updateContact(selected.id, patch)} />}
    </div>
  );
}

// ─── Home View ────────────────────────────────────────────────────────────────
function HomeView({ contacts, log, overdueList, cycleAlerts, activeTab, setActiveTab, tierFilter, setTierFilter, onSelect, onAdd, onEdit, onDelete, onImport, importing, contactPickerSupported }) {

  const tierOrder = { inner: 0, close: 1, casual: 2 };
  const filtered = [...contacts]
    .filter(c => tierFilter === "all" || c.tier === tierFilter)
    .sort((a, b) => {
      if (a.tier !== b.tier) return (tierOrder[a.tier]||2) - (tierOrder[b.tier]||2);
      const so = { overdue:0, soon:1, good:2 };
      return so[a.status] - so[b.status];
    });

  const tierCounts = { all: contacts.length, inner: 0, close: 0, casual: 0 };
  contacts.forEach(c => { if (tierCounts[c.tier] !== undefined) tierCounts[c.tier]++; });

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <Logo />
        <span style={S.tagline}>keep in touch</span>
        <button style={S.importBtn} onClick={onImport} disabled={importing} title="Import from contacts">
          {importing ? <span style={S.miniSpinner}/> : "📱"}
        </button>
      </div>

      <div style={S.body}>
        {/* Cycle alerts */}
        {cycleAlerts.map(c => {
          const info = getCycleDayInfo(c);
          const alert = getCycleAlert(c);
          return (
            <div key={c.id} style={S.cycleAlert} onClick={() => onSelect(c)}>
              <span style={{fontSize:24}}>🌸</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:"#9d174d",marginBottom:2}}>
                  {alert==="active"?`${c.name}'s period has likely started`:`${c.name}'s period is ${formatNextPeriod(info.daysUntilNext)}`}
                </div>
                <div style={{fontSize:12,color:"#be185d"}}>
                  💡 {c.cycleNote || "Stop and grab something thoughtful on the way home"}
                </div>
              </div>
              <span style={{color:"#be185d",fontSize:18}}>→</span>
            </div>
          );
        })}

        {/* Overdue nudge */}
        {overdueList.length > 0 && (
          <div style={S.nudge}>
            <span style={{fontSize:22}}>💛</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14,color:"#92400e"}}>
                {overdueList.length===1?`${overdueList[0].name} could use a check-in`:`${overdueList.length} people could use a check-in`}
              </div>
              <div style={{fontSize:12,color:"#b45309",marginTop:1}}>Tap to reach out →</div>
            </div>
            <button style={S.nudgeArrow} onClick={() => onSelect(overdueList[0])}>→</button>
          </div>
        )}

        {/* Import hint for non-Android */}
        {!contactPickerSupported && (
          <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18}}>📱</span>
            <div style={{fontSize:12,color:"#0369a1",lineHeight:1.5}}>
              <strong>Contact import</strong> works in Chrome on Android. On other devices, add people manually with "+ Add someone".
            </div>
          </div>
        )}

        <Tabs tabs={["people","recent"]} active={activeTab} onChange={setActiveTab} />

        {activeTab === "people" && <>
          {/* Tier filter pills */}
          <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
            {[["all","All",contacts.length],["inner","⭐ Inner",tierCounts.inner],["close","💛 Close",tierCounts.close],["casual","💬 Casual",tierCounts.casual]].map(([k,lbl,cnt])=>(
              <button key={k} style={{...S.filterPill,...(tierFilter===k?S.filterPillActive:{})}} onClick={()=>setTierFilter(k)}>
                {lbl} <span style={{opacity:0.7,fontSize:11}}>({cnt})</span>
              </button>
            ))}
          </div>

          {/* Tier legend */}
          {tierFilter==="all" && (
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              {Object.entries(TIERS).map(([k,t])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:t.color}}>
                  <span style={{width:10,height:10,borderRadius:2,background:t.color,display:"inline-block"}}/>
                  {t.icon} {t.label}
                </div>
              ))}
            </div>
          )}

          {/* Group by tier when showing all */}
          {tierFilter === "all"
            ? Object.entries(TIERS).map(([tierKey, tierInfo]) => {
                const group = filtered.filter(c => c.tier === tierKey);
                if (!group.length) return null;
                return (
                  <div key={tierKey}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,marginTop:6}}>
                      <span style={{fontSize:14}}>{tierInfo.icon}</span>
                      <span style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:tierInfo.color,fontWeight:600}}>{tierInfo.label}</span>
                      <span style={{fontSize:11,color:"#b09070"}}>— {tierInfo.desc}</span>
                    </div>
                    {group.map(c => (
                      <ContactRow key={c.id} c={c} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                  </div>
                );
              })
            : filtered.map(c => <ContactRow key={c.id} c={c} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />)
          }

          {filtered.length === 0 && (
            <div style={{textAlign:"center",color:"#b09070",padding:"30px 0",fontSize:14}}>
              No {tierFilter !== "all" ? TIERS[tierFilter]?.label : ""} contacts yet.
            </div>
          )}

          <button style={S.addBtn} onClick={onAdd}>+ Add someone</button>
        </>}

        {activeTab === "recent" && <>
          <SectionLabel>Recent messages</SectionLabel>
          {[...log].sort((a,b)=>b.timestamp-a.timestamp).slice(0,25).map(msg => {
            const c = contacts.find(x => x.id === msg.contactId);
            if (!c) return null;
            const t = TIERS[c.tier] || TIERS.casual;
            return (
              <div key={msg.id} style={{...S.logItem,borderLeft:`3px solid ${t.color}`}} onClick={() => onSelect(c)}>
                <span style={{fontSize:22,flexShrink:0}}>{c.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontWeight:600,fontSize:13}}>{c.name} <span style={{fontSize:11,opacity:0.6}}>{t.icon}</span></span>
                    <span style={{fontSize:11,color:"#b09070"}}>{timeAgo(msg.timestamp)}</span>
                  </div>
                  <div style={{fontSize:13,color:msg.direction==="out"?"#8a5030":"#3b6ea5",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {msg.direction==="out"?"You: ":""}{msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          {log.length===0 && <EmptyState icon="💌" text={"No messages yet.\nStart by reaching out!"} />}
        </>}
      </div>
    </div>
  );
}

// ─── Contact Row (swipeable) ─────────────────────────────────────────────────
function ContactRow({ c, onSelect, onEdit, onDelete }) {
  const cycleInfo = getCycleDayInfo(c);
  const alert = getCycleAlert(c);
  const t = TIERS[c.tier] || TIERS.casual;

  return (
    <SwipeCard tier={c.tier} onEdit={() => onEdit(c)} onDelete={() => onDelete(c.id)}>
      <div style={S.cardInner} onClick={() => onSelect(c)}>
        <span style={{fontSize:26,flexShrink:0}}>{c.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={S.cardName}>{c.name}</span>
            <span style={{fontSize:13}}>{t.icon}</span>
            {c.cycleTracking && <span style={{fontSize:12,animation:alert?"pulse 2s infinite":"none"}}>{alert==="active"?"🌸":alert==="imminent"?"🌷":alert==="approaching"?"🌿":""}</span>}
          </div>
          <div style={S.cardSub}>
            {c.lastContactDate?timeAgo(c.lastContactDate):"Never"} · every {c.reminderDays}d
            {cycleInfo&&<span style={{color:"#db2777",marginLeft:4}}>· day {cycleInfo.currentDay}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <StatusPill s={c.status}/>
          <span style={{fontSize:10,color:"#c0c0c0"}}>← swipe</span>
        </div>
      </div>
    </SwipeCard>
  );
}

// ─── Chat View ────────────────────────────────────────────────────────────────
function ChatView({ contact, contactLog, draft, setDraft, generating, sending, sentToast, onGenerate, onSend, showReplyBox, setShowReplyBox, replyText, setReplyText, onLogReply, onBack, onProfile, onDelete, chatBottom }) {
  const cycleInfo = getCycleDayInfo(contact);
  const alert = getCycleAlert(contact);
  const t = TIERS[contact.tier] || TIERS.casual;
  const alertColors = {
    active:     {bg:"#fff1f2",border:"#fda4af",text:"#9f1239",icon:"🌸"},
    imminent:   {bg:"#fdf2f8",border:"#f9a8d4",text:"#9d174d",icon:"🌷"},
    approaching:{bg:"#fdf4ff",border:"#e9d5ff",text:"#7e22ce",icon:"🌿"},
  };
  const ac = alert ? alertColors[alert] : null;

  return (
    <div style={{...S.screen,display:"flex",flexDirection:"column",height:"100vh"}}>
      <div style={{...S.header,borderLeft:`4px solid ${t.color}`}}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={onProfile}>
          <span style={{fontSize:22}}>{contact.emoji}</span>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:400,lineHeight:1.1}}>
              {contact.name} <span style={{fontSize:14}}>{t.icon}</span>
            </div>
            {contact.phone&&<div style={{fontSize:11,color:"#a08060"}}>{contact.phone}</div>}
          </div>
          <span style={{fontSize:11,color:"#c0622a",border:"1px solid #f0c0a0",borderRadius:6,padding:"2px 6px",marginLeft:2}}>edit ⚙</span>
        </div>
        <button style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#ef4444"}} onClick={onDelete} title="Remove contact">🗑️</button>
      </div>

      {ac && cycleInfo && (
        <div style={{background:ac.bg,borderBottom:`1px solid ${ac.border}`,padding:"10px 16px",flexShrink:0,animation:"fadeUp 0.3s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:20}}>{ac.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:ac.text,marginBottom:4}}>
                {alert==="active"?`${contact.name}'s period has likely started`:`${contact.name}'s period is ${formatNextPeriod(cycleInfo.daysUntilNext)}`}
              </div>
              <CycleSuggestions contact={contact} compact />
            </div>
          </div>
        </div>
      )}

      {contact.notes && (
        <div style={{background:"#fff7ed",borderBottom:"1px solid #fed7aa",padding:"8px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:14}}>📝</span>
          <span style={{fontSize:12,color:"#8a5030",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{contact.notes}</span>
          <span style={{fontSize:11,color:"#c0622a",cursor:"pointer",flexShrink:0}} onClick={onProfile}>edit</span>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
        {contactLog.length===0 && <EmptyState icon={contact.emoji} text={`No messages yet with ${contact.name}.\nLet KIT help you reach out!`} />}
        {contactLog.map(msg => (
          <div key={msg.id} style={{...S.bubble,...(msg.direction==="out"?S.bubbleOut:S.bubbleIn)}}>
            <div style={{fontSize:15,lineHeight:1.5}}>{msg.text}</div>
            <div style={{fontSize:11,opacity:0.65,textAlign:"right",marginTop:4}}>
              {msg.direction==="in"&&<span style={{marginRight:4}}>↩ logged</span>}{timeAgo(msg.timestamp)}
            </div>
          </div>
        ))}
        {sentToast && <div style={S.sentToast}>✓ Logged & Messages app opened!</div>}
        <div ref={chatBottom}/>
      </div>

      {showReplyBox && (
        <div style={{background:"#eff6ff",borderTop:"1px solid #bfdbfe",padding:"12px 16px",animation:"fadeUp 0.2s ease",flexShrink:0}}>
          <div style={{fontSize:12,fontWeight:600,color:"#3b82f6",marginBottom:6}}>📩 Log their reply</div>
          <textarea style={{...S.input,marginBottom:8}} rows={2} placeholder={`What did ${contact.name} say?`} value={replyText} onChange={e=>setReplyText(e.target.value)} autoFocus/>
          <div style={{display:"flex",gap:8}}>
            <button style={S.btnPrimary} onClick={onLogReply}>Save reply</button>
            <button style={S.btnSecondary} onClick={()=>setShowReplyBox(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{background:"#fff",borderTop:"1px solid #e8d8c4",padding:"12px 16px 22px",flexShrink:0}}>
        <textarea style={{...S.input,marginBottom:10}} rows={3} placeholder={`Message to ${contact.name}…`} value={draft} onChange={e=>setDraft(e.target.value)}/>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button style={S.btnGold} onClick={onGenerate} disabled={generating}>{generating?<Spinner/>:"✨ Craft message"}</button>
          <button style={{...S.btnSend,opacity:draft.trim()?1:0.4}} onClick={onSend} disabled={!draft.trim()||sending}>{sending?"…":"Send via Messages →"}</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={S.btnReply} onClick={()=>setShowReplyBox(v=>!v)}>↩ Log their reply</button>
          <span style={{fontSize:11,color:"#b09070",flex:1,fontStyle:"italic"}}>AI uses your notes</span>
        </div>
      </div>
    </div>
  );
}

// ─── Cycle Suggestions ────────────────────────────────────────────────────────
function CycleSuggestions({ contact, compact }) {
  const gifts = (contact.cycleGifts||["wine","chocolate"]).flatMap(k=>GIFT_SUGGESTIONS[k]||[]);
  if (!gifts.length) return null;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {contact.cycleNote&&<div style={{width:"100%",fontSize:12,color:"#7e22ce",fontWeight:500,marginBottom:2}}>⭐ {contact.cycleNote}</div>}
      {(compact?gifts.slice(0,2):gifts).map((g,i)=>(
        <span key={i} style={{fontSize:11,background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:20,padding:"3px 10px",color:"#7e22ce",fontWeight:500}}>{g}</span>
      ))}
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────
function ProfileView({ contact, onBack, onBackToHome, onUpdate, onDelete, onCycleEdit }) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone||"");
  const [notes, setNotes] = useState(contact.notes||"");
  const [reminderDays, setReminderDays] = useState(contact.reminderDays);
  const [tier, setTier] = useState(contact.tier||"casual");
  const [saved, setSaved] = useState(false);

  function save() {
    onUpdate({ name, phone, notes, reminderDays, tier });
    setSaved(true); setTimeout(()=>{setSaved(false); onBack();},700);
  }

  const cycleInfo = getCycleDayInfo(contact);
  const alert = getCycleAlert(contact);

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <span style={S.tagline}>edit contact</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#ef4444"}} onClick={onDelete} title="Delete">🗑️</button>
          <button style={{...S.btnPrimary,padding:"8px 18px",fontSize:13,borderRadius:10}} onClick={save}>{saved?"✓ Saved!":"Save"}</button>
        </div>
      </div>
      <div style={S.body}>
        <div style={{textAlign:"center",marginBottom:20,fontSize:52}}>{contact.emoji}</div>

        {/* Tier selector — prominent */}
        <div style={{marginBottom:22}}>
          <label style={S.fieldLabel}>Importance tier</label>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {Object.entries(TIERS).map(([k,t])=>(
              <button key={k} onClick={()=>setTier(k)}
                style={{flex:1,padding:"12px 8px",background:tier===k?t.color:"#fff",border:`2px solid ${tier===k?t.color:t.border}`,borderRadius:14,cursor:"pointer",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <span style={{fontSize:20}}>{t.icon}</span>
                <span style={{fontSize:11,fontWeight:700,color:tier===k?"#fff":t.color}}>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{fontSize:12,color:"#b09070",marginTop:8}}>{TIERS[tier]?.desc}</div>
        </div>

        <Field label="Name"><input style={S.input} value={name} onChange={e=>setName(e.target.value)}/></Field>
        <Field label={<>Phone <Muted>(for SMS/Messages)</Muted></>}><input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel"/></Field>

        <Field label="Check-in reminder">
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
            {REMINDER_OPTIONS.map(o=>(
              <button key={o.value} style={{...S.pill,...(reminderDays===o.value?S.pillActive:{})}} onClick={()=>setReminderDays(o.value)}>{o.label}</button>
            ))}
          </div>
        </Field>

        <Field label={<>Life notes <Muted>(AI uses these)</Muted></>}>
          <textarea style={{...S.input,resize:"none",minHeight:80,lineHeight:1.6}} rows={3} placeholder="Hobbies, job, family, big moments…" value={notes} onChange={e=>setNotes(e.target.value)}/>
        </Field>

        {/* Cycle Care card */}
        <div style={{background:contact.cycleTracking?"linear-gradient(135deg,#fdf2f8,#fce7f3)":"#fff",border:`1px solid ${contact.cycleTracking?"#f9a8d4":"#e8d8c4"}`,borderRadius:14,padding:16,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:contact.cycleTracking?12:0}}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:contact.cycleTracking?"#9d174d":"#2d1f0e"}}>🌸 Cycle Care</div>
              <div style={{fontSize:12,color:"#a08060",marginTop:2}}>{contact.cycleTracking?"Active — reminders on":"Track cycle for thoughtful reminders"}</div>
            </div>
            <button style={{...S.pill,...(contact.cycleTracking?{background:"#db2777",border:"1px solid #db2777",color:"#fff"}:{})}} onClick={()=>onUpdate({cycleTracking:!contact.cycleTracking})}>
              {contact.cycleTracking?"On":"Off"}
            </button>
          </div>
          {contact.cycleTracking && (
            <>
              {cycleInfo && (
                <div style={{background:"#fff",borderRadius:10,padding:"10px 12px",marginBottom:12,border:"1px solid #fce7f3"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                    <span style={{color:"#9d174d",fontWeight:600}}>Day {cycleInfo.currentDay} of {contact.cycleLength}</span>
                    <span style={{color:alert?"#db2777":"#a08060",fontWeight:alert?700:400}}>
                      {alert==="active"?"🌸 Period active":alert==="imminent"?"🌷 Coming tomorrow!":alert==="approaching"?`🌿 ${cycleInfo.daysUntilNext}d away`:`${cycleInfo.daysUntilNext}d until next`}
                    </span>
                  </div>
                  <div style={{marginTop:8}}><CycleProgressBar current={cycleInfo.currentDay} total={contact.cycleLength}/></div>
                </div>
              )}
              <button style={{width:"100%",padding:"11px",background:"#fdf2f8",border:"1px solid #f9a8d4",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,color:"#9d174d",cursor:"pointer"}} onClick={onCycleEdit}>
                🌸 Edit Cycle Settings →
              </button>
            </>
          )}
        </div>

        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:14,marginBottom:20}}>
          <button style={{width:"100%",background:"none",border:"none",color:"#dc2626",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={onDelete}>
            🗑️ Remove {contact.name} from KIT
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cycle Progress Bar ───────────────────────────────────────────────────────
function CycleProgressBar({ current, total }) {
  const pct = Math.min((current/total)*100,100);
  const phase = current<=5?{label:"Period",color:"#f43f5e"}:current<=13?{label:"Follicular",color:"#fb923c"}:current<=16?{label:"Ovulation",color:"#a3e635"}:{label:"Luteal",color:"#c084fc"};
  return (
    <div>
      <div style={{height:8,background:"#fce7f3",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:phase.color,borderRadius:99,transition:"width 0.5s ease"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:"#a08060"}}>
        <span style={{color:phase.color,fontWeight:600}}>{phase.label} phase</span>
        <span>Day {current} / {total}</span>
      </div>
    </div>
  );
}

// ─── Cycle View ───────────────────────────────────────────────────────────────
function CycleView({ contact, onBack, onUpdate }) {
  const [lastPeriodDate, setLastPeriodDate] = useState(contact.lastPeriodDate?new Date(contact.lastPeriodDate).toISOString().slice(0,10):"");
  const [cycleLength, setCycleLength] = useState(contact.cycleLength||28);
  const [cycleGifts, setCycleGifts] = useState(contact.cycleGifts||["wine","chocolate"]);
  const [cycleNote, setCycleNote] = useState(contact.cycleNote||"");
  const [saved, setSaved] = useState(false);
  const previewDate = lastPeriodDate?new Date(lastPeriodDate).getTime():null;
  function toggleGift(k){setCycleGifts(prev=>prev.includes(k)?prev.filter(x=>x!==k):[...prev,k]);}
  function save(){onUpdate({lastPeriodDate:previewDate,cycleLength,cycleGifts,cycleNote});setSaved(true);setTimeout(()=>{setSaved(false);onBack();},700);}
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <span style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",fontSize:15,color:"#9d174d"}}>🌸 Cycle Care</span>
        <button style={{...S.btnPrimary,padding:"8px 18px",fontSize:13,borderRadius:10,background:"#db2777"}} onClick={save}>{saved?"✓ Saved!":"Save"}</button>
      </div>
      <div style={S.body}>
        <div style={{background:"linear-gradient(135deg,#fdf2f8,#fce7f3)",border:"1px solid #f9a8d4",borderRadius:14,padding:16,marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:6}}>{contact.emoji}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:"#9d174d"}}>{contact.name}</div>
          {previewDate&&<div style={{fontSize:13,color:"#be185d",marginTop:6,fontWeight:500}}>
            {cycleLength-Math.floor((Date.now()-previewDate)/86400000)<=0?"🌸 Period likely active":`Next period in ~${Math.max(0,Math.round(cycleLength-(Date.now()-previewDate)/86400000))} days`}
          </div>}
        </div>
        {previewDate&&<div style={{marginBottom:20}}><CycleProgressBar current={Math.min(Math.floor((Date.now()-previewDate)/86400000)+1,cycleLength)} total={cycleLength}/></div>}
        <Field label="Last period started"><input type="date" style={S.input} value={lastPeriodDate} onChange={e=>setLastPeriodDate(e.target.value)}/></Field>
        <Field label="Average cycle length">
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
            {CYCLE_OPTIONS.map(n=><button key={n} style={{...S.pill,...(cycleLength===n?{background:"#db2777",border:"1px solid #db2777",color:"#fff"}:{})}} onClick={()=>setCycleLength(n)}>{n} days</button>)}
          </div>
        </Field>
        <Field label="What to bring home 🛍️">
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4,marginBottom:12}}>
            {Object.keys(GIFT_SUGGESTIONS).map(k=>(
              <button key={k} style={{...S.pill,...(cycleGifts.includes(k)?{background:"#db2777",border:"1px solid #db2777",color:"#fff"}:{})}} onClick={()=>toggleGift(k)}>
                {k==="wine"?"🍷 Wine":k==="chocolate"?"🍫 Chocolate":k==="food"?"🍕 Her fave food":k==="flowers"?"💐 Flowers":"🛁 Comfort"}
              </button>
            ))}
          </div>
          {cycleGifts.length>0&&<div style={{background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:12,padding:12}}>
            <div style={{fontSize:12,fontWeight:700,color:"#7e22ce",marginBottom:8}}>💡 KIT will remind you to grab:</div>
            {cycleGifts.flatMap(k=>GIFT_SUGGESTIONS[k]||[]).map((g,i)=>(
              <div key={i} style={{fontSize:13,color:"#6b21a8",marginBottom:6,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,background:"#c084fc",borderRadius:"50%",flexShrink:0}}/>{g}</div>
            ))}
          </div>}
        </Field>
        <Field label={<>Personal go-to <Muted>(shows first in reminders)</Muted></>}>
          <input style={S.input} value={cycleNote} onChange={e=>setCycleNote(e.target.value)} placeholder="e.g. 'The Malbec from Trader Joe's + dark Lindt'"/>
        </Field>
      </div>
    </div>
  );
}

// ─── Add Contact ──────────────────────────────────────────────────────────────
function AddContactView({ onBack, onAdd }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [notes, setNotes] = useState("");
  const [reminderDays, setReminderDays] = useState(14); const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [tier, setTier] = useState("close");
  const [cycleTracking, setCycleTracking] = useState(false);
  const [lastPeriodDate, setLastPeriodDate] = useState(""); const [cycleLength, setCycleLength] = useState(28);
  const [cycleGifts, setCycleGifts] = useState(["wine","chocolate"]); const [cycleNote, setCycleNote] = useState("");
  function toggleGift(k){setCycleGifts(prev=>prev.includes(k)?prev.filter(x=>x!==k):[...prev,k]);}
  function submit(){
    if(!name.trim())return;
    onAdd({name:name.trim(),phone:phone.trim(),notes:notes.trim(),reminderDays,emoji,tier,cycleTracking,lastPeriodDate:cycleTracking&&lastPeriodDate?new Date(lastPeriodDate).getTime():null,cycleLength:cycleTracking?cycleLength:28,cycleGifts:cycleTracking?cycleGifts:[],cycleNote:cycleTracking?cycleNote:""});
  }
  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <span style={S.tagline}>add someone</span>
        <button style={{...S.btnPrimary,padding:"8px 18px",fontSize:13,borderRadius:10,opacity:name.trim()?1:0.4}} onClick={submit} disabled={!name.trim()}>Add</button>
      </div>
      <div style={S.body}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20,justifyContent:"center"}}>
          {EMOJIS.map(e=><button key={e} style={{fontSize:24,background:emoji===e?"#fff7ed":"#fff",border:`2px solid ${emoji===e?"#c0622a":"#e8d8c4"}`,borderRadius:12,width:46,height:46,cursor:"pointer"}} onClick={()=>setEmoji(e)}>{e}</button>)}
        </div>
        {/* Tier */}
        <div style={{marginBottom:20}}>
          <label style={S.fieldLabel}>Importance tier</label>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {Object.entries(TIERS).map(([k,t])=>(
              <button key={k} onClick={()=>setTier(k)} style={{flex:1,padding:"10px 6px",background:tier===k?t.color:"#fff",border:`2px solid ${tier===k?t.color:t.border}`,borderRadius:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:18}}>{t.icon}</span>
                <span style={{fontSize:11,fontWeight:700,color:tier===k?"#fff":t.color}}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Field label="Their name *"><input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah, Emma…" autoFocus/></Field>
        <Field label={<>Phone <Muted>(for SMS)</Muted></>}><input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel"/></Field>
        <Field label="Remind me every">
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
            {REMINDER_OPTIONS.map(o=><button key={o.value} style={{...S.pill,...(reminderDays===o.value?S.pillActive:{})}} onClick={()=>setReminderDays(o.value)}>{o.label}</button>)}
          </div>
        </Field>
        <Field label={<>Life notes <Muted>(optional)</Muted></>}>
          <textarea style={{...S.input,resize:"none",minHeight:72,lineHeight:1.6}} rows={3} placeholder="Hobbies, family, job…" value={notes} onChange={e=>setNotes(e.target.value)}/>
        </Field>
        <div style={{background:cycleTracking?"linear-gradient(135deg,#fdf2f8,#fce7f3)":"#fff",border:`1px solid ${cycleTracking?"#f9a8d4":"#e8d8c4"}`,borderRadius:14,padding:14,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:cycleTracking?14:0}}>
            <div><div style={{fontWeight:700,fontSize:14,color:cycleTracking?"#9d174d":"#2d1f0e"}}>🌸 Cycle Care</div><div style={{fontSize:12,color:"#a08060",marginTop:2}}>Reminders when her period is near</div></div>
            <button style={{...S.pill,...(cycleTracking?{background:"#db2777",border:"1px solid #db2777",color:"#fff"}:{})}} onClick={()=>setCycleTracking(v=>!v)}>{cycleTracking?"On":"Off"}</button>
          </div>
          {cycleTracking&&<div style={{animation:"fadeUp 0.25s ease"}}>
            <Field label="Last period started"><input type="date" style={S.input} value={lastPeriodDate} onChange={e=>setLastPeriodDate(e.target.value)}/></Field>
            <Field label="Cycle length">
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
                {CYCLE_OPTIONS.map(n=><button key={n} style={{...S.pill,...(cycleLength===n?{background:"#db2777",border:"1px solid #db2777",color:"#fff"}:{})}} onClick={()=>setCycleLength(n)}>{n}d</button>)}
              </div>
            </Field>
            <Field label="What to bring home">
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
                {Object.keys(GIFT_SUGGESTIONS).map(k=><button key={k} style={{...S.pill,...(cycleGifts.includes(k)?{background:"#db2777",border:"1px solid #db2777",color:"#fff"}:{})}} onClick={()=>toggleGift(k)}>{k==="wine"?"🍷 Wine":k==="chocolate"?"🍫 Chocolate":k==="food"?"🍕 Food":k==="flowers"?"💐 Flowers":"🛁 Comfort"}</button>)}
              </div>
            </Field>
            <Field label={<>Personal go-to <Muted>(optional)</Muted></>}>
              <input style={S.input} value={cycleNote} onChange={e=>setCycleNote(e.target.value)} placeholder="e.g. Malbec + dark Lindt"/>
            </Field>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Small Components ─────────────────────────────────────────────────────────
function Logo() { return <div style={{display:"flex",alignItems:"baseline"}}><span style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:600,color:"#c0622a",letterSpacing:-1,lineHeight:1}}>K</span><span style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:300,fontStyle:"italic",color:"#8a5030",letterSpacing:-1,lineHeight:1}}>IT</span></div>; }
function Tabs({ tabs, active, onChange }) {
  return <div style={{display:"flex",gap:4,background:"#efe4d6",borderRadius:12,padding:4,marginBottom:18}}>{tabs.map(t=><button key={t} style={{flex:1,padding:"8px 0",background:active===t?"#fdf6ee":"none",border:"none",borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:active===t?"#c0622a":"#a08060",cursor:"pointer",boxShadow:active===t?"0 1px 4px rgba(0,0,0,0.08)":"none"}} onClick={()=>onChange(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>;
}
function SectionLabel({ children }) { return <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"#b09070",marginBottom:10,letterSpacing:0.3}}>{children}</div>; }
function StatusPill({ s }) {
  const bg = statusColor(s);
  return <div style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg+"18",color:bg,border:`1px solid ${bg}44`,flexShrink:0,letterSpacing:0.2}}>{s==="overdue"?"overdue":s==="soon"?"soon":"✓ good"}</div>;
}
function EmptyState({ icon, text }) { return <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>{icon}</div><div style={{fontFamily:"'Fraunces',serif",fontStyle:"italic",color:"#a08060",fontSize:16,lineHeight:1.7,whiteSpace:"pre-line"}}>{text}</div></div>; }
function Field({ label, children }) { return <div style={{marginBottom:20}}><label style={{display:"block",fontSize:13,fontWeight:600,color:"#7a5030",marginBottom:6,letterSpacing:0.2}}>{label}</label>{children}</div>; }
function Muted({ children }) { return <span style={{fontWeight:400,color:"#b09070"}}>{children}</span>; }
function Spinner() { return <span style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}><span style={{display:"inline-block",width:12,height:12,border:"2px solid #f59e0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Crafting…</span>; }

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  shell: { fontFamily:"'DM Sans',sans-serif", background:"#fdf6ee", minHeight:"100vh", maxWidth:420, margin:"0 auto", color:"#2d1f0e", display:"flex", flexDirection:"column", position:"relative" },
  screen: { flex:1, display:"flex", flexDirection:"column" },
  statusBar: { display:"flex", justifyContent:"space-between", padding:"8px 20px 4px", fontSize:12, color:"#a08060", fontWeight:500 },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px 12px", borderBottom:"1px solid #e8d8c4", background:"#fdf6ee", position:"sticky", top:0, zIndex:10, flexShrink:0 },
  tagline: { fontFamily:"'Fraunces',serif", fontStyle:"italic", fontSize:14, color:"#a08060", fontWeight:300 },
  backBtn: { background:"none", border:"none", fontSize:14, color:"#c0622a", cursor:"pointer", fontWeight:500, padding:"4px 0", width:60, textAlign:"left" },
  body: { flex:1, padding:"16px 16px 100px", overflowY:"auto" },
  importBtn: { width:38, height:38, background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  miniSpinner: { display:"inline-block", width:14, height:14, border:"2px solid #3b82f6", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  importToast: { position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", background:"#1e293b", color:"#fff", padding:"10px 18px", borderRadius:20, fontSize:13, fontWeight:500, zIndex:999, maxWidth:360, textAlign:"center", animation:"slideIn 0.3s ease", lineHeight:1.5 },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal: { background:"#fff", borderRadius:20, padding:28, textAlign:"center", maxWidth:340, width:"100%", animation:"pop 0.25s ease" },
  cycleAlert: { background:"linear-gradient(135deg,#fdf2f8,#fce7f3)", border:"1px solid #f9a8d4", borderRadius:14, padding:"13px 14px", display:"flex", alignItems:"flex-start", gap:12, marginBottom:12, cursor:"pointer", animation:"fadeUp 0.4s ease" },
  nudge: { background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"1px solid #f59e0b", borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:12, animation:"fadeUp 0.4s ease" },
  nudgeArrow: { background:"#f59e0b", border:"none", borderRadius:10, color:"#fff", fontWeight:700, fontSize:18, width:36, height:36, cursor:"pointer", flexShrink:0 },
  filterPill: { padding:"6px 14px", background:"#fff", border:"1px solid #e8d8c4", borderRadius:20, fontSize:12, color:"#8a5030", cursor:"pointer", fontWeight:500, whiteSpace:"nowrap" },
  filterPillActive: { background:"#c0622a", border:"1px solid #c0622a", color:"#fff" },
  cardInner: { padding:"13px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" },
  cardName: { fontWeight:600, fontSize:15, color:"#2d1f0e" },
  cardSub: { fontSize:12, color:"#a08060", marginTop:2 },
  logItem: { background:"#fff", borderRadius:14, padding:"11px 14px", display:"flex", gap:12, cursor:"pointer", border:"1px solid #f0e4d4", marginBottom:10, alignItems:"center" },
  addBtn: { width:"100%", padding:"13px", background:"none", border:"2px dashed #d4b898", borderRadius:14, fontSize:14, color:"#b09070", cursor:"pointer", fontWeight:500, marginTop:4 },
  bubble: { maxWidth:"82%", borderRadius:18, padding:"11px 14px", animation:"pop 0.25s ease" },
  bubbleOut: { alignSelf:"flex-end", background:"#c0622a", color:"#fff", borderBottomRightRadius:4 },
  bubbleIn: { alignSelf:"flex-start", background:"#fff", border:"1px solid #e8d8c4", color:"#2d1f0e", borderBottomLeftRadius:4 },
  sentToast: { alignSelf:"center", background:"#4ade80", color:"#14532d", padding:"7px 18px", borderRadius:20, fontSize:13, fontWeight:600, animation:"pop 0.2s ease" },
  input: { width:"100%", border:"1px solid #e8d8c4", borderRadius:12, padding:"11px 13px", fontSize:15, color:"#2d1f0e", background:"#fff", outline:"none" },
  fieldLabel: { display:"block", fontSize:13, fontWeight:600, color:"#7a5030", marginBottom:6, letterSpacing:0.2 },
  btnPrimary: { flex:1, padding:"11px", background:"#c0622a", border:"none", borderRadius:10, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer" },
  btnSecondary: { flex:1, padding:"11px", background:"#efe4d6", border:"none", borderRadius:10, color:"#8a5030", fontWeight:500, fontSize:14, cursor:"pointer" },
  btnDanger: { flex:1, padding:"11px", background:"#ef4444", border:"none", borderRadius:10, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer" },
  btnGold: { flex:1, padding:"11px", background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"1px solid #f59e0b", borderRadius:12, fontWeight:600, fontSize:13, color:"#92400e", cursor:"pointer" },
  btnSend: { padding:"11px 14px", background:"#c0622a", border:"none", borderRadius:12, fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer" },
  btnReply: { padding:"8px 14px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, fontSize:12, color:"#3b82f6", cursor:"pointer", fontWeight:500 },
  pill: { padding:"7px 14px", background:"#efe4d6", border:"1px solid #d4b898", borderRadius:20, fontSize:13, color:"#8a5030", cursor:"pointer", fontWeight:500 },
  pillActive: { background:"#c0622a", border:"1px solid #c0622a", color:"#fff" },
};
