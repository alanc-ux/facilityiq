const { useState, useEffect, useRef } = React;

// ─── DATA ────────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { id:1, name:"Highmark Building", city:"Harrisburg, PA", health:84, sat:4.1, issues:5, operators:12, tier:"Enterprise", img:"HB" },
  { id:2, name:"Penn Manor Complex", city:"Lancaster, PA", health:91, sat:4.6, issues:1, operators:8, tier:"Enterprise", img:"PM" },
  { id:3, name:"Capital Blue HQ", city:"Camp Hill, PA", health:78, sat:3.9, issues:3, operators:6, tier:"Enterprise", img:"CB" },
  { id:4, name:"Federal Courthouse", city:"Philadelphia, PA", health:96, sat:4.8, issues:0, operators:5, tier:"Gov", img:"FC" },
  { id:5, name:"PPL Center", city:"Allentown, PA", health:88, sat:4.3, issues:2, operators:9, tier:"Enterprise", img:"PP" },
  { id:6, name:"Dauphin County Admin", city:"Harrisburg, PA", health:82, sat:4.0, issues:4, operators:7, tier:"Gov", img:"DC" },
];

const WORKERS = [
  { id:1, name:"Marcus Johnson", role:"Lead Janitor", account:"Highmark Building", status:"active", hours:2.7, tasks:31, rating:4.9 },
  { id:2, name:"Sofia Reyes", role:"Grounds Lead", account:"Penn Manor Complex", status:"active", hours:1.2, tasks:14, rating:4.8 },
  { id:3, name:"Derek Wilson", role:"Maintenance Tech", account:"Highmark Building", status:"en-route", hours:0, tasks:0, rating:4.7 },
  { id:4, name:"Keisha Lewis", role:"Janitor", account:"Capital Blue HQ", status:"active", hours:3.1, tasks:28, rating:4.6 },
  { id:5, name:"Tom Brandt", role:"Grounds", account:"PPL Center", status:"active", hours:2.0, tasks:18, rating:4.5 },
  { id:6, name:"Angela Park", role:"Janitor", account:"Federal Courthouse", status:"completed", hours:4.0, tasks:47, rating:5.0 },
  { id:7, name:"James Carter", role:"Maintenance Tech", account:"Capital Blue HQ", status:"active", hours:1.8, tasks:11, rating:4.4 },
  { id:8, name:"Lisa Monroe", role:"Lead Janitor", account:"Dauphin County Admin", status:"active", hours:2.3, tasks:22, rating:4.7 },
];

const TICKETS = [
  { id:1, title:"Restroom not cleaned — floor 3", account:"Highmark Building", type:"Complaint", priority:"high", status:"overdue", submitted:"2d ago", assignee:"Unassigned" },
  { id:2, title:"HVAC loud noise — suite 210", account:"Highmark Building", type:"Maintenance", priority:"high", status:"in-review", submitted:"1d ago", assignee:"Derek Wilson" },
  { id:3, title:"Trash not emptied — break room", account:"Highmark Building", type:"Complaint", priority:"med", status:"in-review", submitted:"5h ago", assignee:"Marcus Johnson" },
  { id:4, title:"Overgrown shrubs blocking entrance", account:"Penn Manor Complex", type:"Landscaping", priority:"med", status:"open", submitted:"3h ago", assignee:"Sofia Reyes" },
  { id:5, title:"Burned out lights — stairwell B", account:"Highmark Building", type:"Maintenance", priority:"low", status:"open", submitted:"2h ago", assignee:"Unassigned" },
  { id:6, title:"Spill on lobby floor — slipping hazard", account:"Capital Blue HQ", type:"Complaint", priority:"high", status:"open", submitted:"45m ago", assignee:"Keisha Lewis" },
  { id:7, title:"Window cleaning missed — east wing", account:"PPL Center", type:"Complaint", priority:"low", status:"open", submitted:"1d ago", assignee:"Unassigned" },
];

const PM_TASKS = [
  { id:1, title:"HVAC filter replacement", account:"Highmark Building", area:"Floors 2–4", freq:"Every 90 days", last:"Apr 15", due:"Overdue 4d", urgency:"red", icon:"ti-wind" },
  { id:2, title:"Landscaping cut", account:"Penn Manor Complex", area:"Exterior grounds", freq:"Every 14 days", last:"Jun 1", due:"Jun 12", urgency:"amber", icon:"ti-plant" },
  { id:3, title:"Plumbing inspection", account:"Highmark Building", area:"All restrooms", freq:"Every 90 days", last:"Mar 1", due:"Jun 15", urgency:"amber", icon:"ti-droplet" },
  { id:4, title:"Exterior window cleaning", account:"PPL Center", area:"Full exterior", freq:"Quarterly", last:"Mar 20", due:"Jun 20", urgency:"amber", icon:"ti-building" },
  { id:5, title:"Pest control treatment", account:"Capital Blue HQ", area:"Full building", freq:"Quarterly", last:"Mar 5", due:"Jun 25", urgency:"green", icon:"ti-spray" },
  { id:6, title:"Fire extinguisher inspection", account:"Federal Courthouse", area:"All floors", freq:"Annual", last:"Dec 8", due:"Dec 2026", urgency:"green", icon:"ti-flame" },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const C = {
  green:  { bg:"var(--green-dim)",  border:"var(--green-border)",             text:"var(--green)"  },
  amber:  { bg:"var(--amber-dim)",  border:"rgba(245,158,11,0.25)",           text:"var(--amber)"  },
  red:    { bg:"var(--red-dim)",    border:"rgba(239,68,68,0.25)",            text:"var(--red)"    },
  blue:   { bg:"var(--blue-dim)",   border:"rgba(59,130,246,0.25)",           text:"var(--blue)"   },
  purple: { bg:"var(--purple-dim)", border:"rgba(168,85,247,0.25)",           text:"var(--purple)" },
};

function Badge({ color="green", children, style={} }) {
  const c = C[color] || C.green;
  return (
    <span style={{ background:c.bg, border:`0.5px solid ${c.border}`, color:c.text, borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:500, whiteSpace:"nowrap", ...style }}>
      {children}
    </span>
  );
}

function Avatar({ initials, color="green", size=28 }) {
  const c = C[color] || C.green;
  return (
    <div style={{ width:size, height:size, minWidth:size, borderRadius:"50%", background:c.bg, border:`1px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:500, color:c.text }}>
      {initials}
    </div>
  );
}

function Card({ children, style={}, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?"var(--bg2)":"var(--bg1)", border:`0.5px solid ${hov?"var(--border2)":"var(--border)"}`, borderRadius:"var(--radius-lg)", padding:16, transition:"all 0.15s", cursor:onClick?"pointer":"default", ...style }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, delta, deltaColor="green", icon, iconColor="green" }) {
  const c = C[iconColor] || C.green;
  return (
    <div style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:12, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
        <div style={{ width:28, height:28, borderRadius:8, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className={`ti ${icon}`} style={{ fontSize:14, color:c.text }} />
        </div>
      </div>
      <div style={{ fontSize:26, fontWeight:500, color:"var(--text)", lineHeight:1 }}>{value}</div>
      {delta && <div style={{ fontSize:11, color:C[deltaColor]?.text||"var(--text3)", marginTop:6 }}>{delta}</div>}
    </div>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
      <span style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>{title}</span>
      {action && <button onClick={onAction} style={{ fontSize:12, color:"var(--green)", background:"none", border:"none", cursor:"pointer" }}>{action}</button>}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:"overview",   icon:"ti-layout-dashboard", label:"Overview" },
  { id:"accounts",   icon:"ti-building",          label:"Accounts" },
  { id:"workorders", icon:"ti-list-check",         label:"Work orders",       badge:12 },
  { id:"schedule",   icon:"ti-calendar-event",     label:"Schedule" },
  { id:"tickets",    icon:"ti-ticket",             label:"Tickets",           badge:7,  badgeColor:"red" },
  { id:"pm",         icon:"ti-settings",           label:"Preventive PM",     badge:3,  badgeColor:"amber" },
  { id:"workforce",  icon:"ti-users",              label:"Workforce" },
  { id:"fleet",      icon:"ti-truck",              label:"Fleet" },
  { id:"invoices",   icon:"ti-file-invoice",       label:"Invoices" },
  { id:"vendors",    icon:"ti-building-store",     label:"Vendor mgmt" },
  { id:"reports",    icon:"ti-chart-bar",          label:"Reports" },
];

function Sidebar({ active, onNav }) {
  return (
    <div style={{ width:210, minWidth:210, height:"100vh", background:"var(--bg1)", borderRight:"0.5px solid var(--border)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"18px 16px 14px", borderBottom:"0.5px solid var(--border)" }}>
        <div style={{ fontSize:17, fontWeight:500, color:"var(--text)", letterSpacing:"-0.02em" }}>
          inperium<span style={{ color:"var(--green)" }}>.</span>
        </div>
        <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>DSC Solutions · Admin</div>
      </div>
      <div style={{ padding:"10px 8px 0", flex:1, overflowY:"auto" }}>
        <div style={{ fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", padding:"6px 8px 4px" }}>Platform</div>
        {NAV.slice(0,2).map(n=><NavItem key={n.id} item={n} active={active===n.id} onClick={()=>onNav(n.id)} />)}
        <div style={{ fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", padding:"14px 8px 4px" }}>Operations</div>
        {NAV.slice(2,8).map(n=><NavItem key={n.id} item={n} active={active===n.id} onClick={()=>onNav(n.id)} />)}
        <div style={{ fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", padding:"14px 8px 4px" }}>Finance & Data</div>
        {NAV.slice(8).map(n=><NavItem key={n.id} item={n} active={active===n.id} onClick={()=>onNav(n.id)} />)}
      </div>
      <div style={{ padding:"12px 16px", borderTop:"0.5px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Avatar initials="AC" color="green" size={30} />
          <div>
            <div style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>Alan Chachapoya</div>
            <div style={{ fontSize:11, color:"var(--text3)" }}>Managing Director</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  const [hov, setHov] = useState(false);
  const bg    = active ? "rgba(34,197,94,0.1)"  : hov ? "var(--bg2)" : "transparent";
  const col   = active ? "var(--green)"          : hov ? "var(--text)" : "var(--text2)";
  const bdCol = active ? "rgba(34,197,94,0.4)"  : "transparent";
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:"var(--radius)", background:bg, cursor:"pointer", marginBottom:1, borderLeft:`2px solid ${bdCol}`, transition:"all 0.1s" }}>
      <i className={`ti ${item.icon}`} style={{ fontSize:15, color:col, minWidth:16 }} />
      <span style={{ fontSize:13, color:col, flex:1 }}>{item.label}</span>
      {item.badge && (
        <span style={{ background:item.badgeColor==="red"?"var(--red-dim)":item.badgeColor==="amber"?"var(--amber-dim)":"var(--bg3)", color:item.badgeColor==="red"?"var(--red)":item.badgeColor==="amber"?"var(--amber)":"var(--text3)", fontSize:10, borderRadius:20, padding:"1px 6px", fontWeight:500 }}>
          {item.badge}
        </span>
      )}
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function Topbar({ title, subtitle }) {
  return (
    <div style={{ height:54, borderBottom:"0.5px solid var(--border)", display:"flex", alignItems:"center", padding:"0 24px", gap:12, background:"var(--bg1)" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:500, color:"var(--text)" }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:"var(--text3)" }}>{subtitle}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--bg2)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"6px 12px" }}>
        <i className="ti ti-search" style={{ fontSize:13, color:"var(--text3)" }} />
        <span style={{ fontSize:12, color:"var(--text3)" }}>Search accounts, jobs…</span>
        <span style={{ fontSize:11, color:"var(--text3)", marginLeft:8, opacity:0.5 }}>⌘K</span>
      </div>
      <button style={{ background:"var(--green)", border:"none", borderRadius:"var(--radius)", padding:"7px 14px", fontSize:12, color:"#000", fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
        <i className="ti ti-plus" style={{ fontSize:14 }} /> New work order
      </button>
      <div style={{ position:"relative" }}>
        <i className="ti ti-bell" style={{ fontSize:18, color:"var(--text2)", cursor:"pointer" }} />
        <span style={{ position:"absolute", top:-2, right:-2, width:7, height:7, borderRadius:"50%", background:"var(--red)", border:"1.5px solid var(--bg1)" }} />
      </div>
    </div>
  );
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function Overview({ onNav }) {
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ background:"var(--bg1)", border:"0.5px solid rgba(168,85,247,0.2)", borderRadius:"var(--radius-lg)", padding:16, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <i className="ti ti-sparkles" style={{ fontSize:15, color:"var(--purple)" }} />
          <span style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>AI facility intelligence</span>
          <Badge color="purple" style={{ marginLeft:"auto" }}>3 alerts</Badge>
        </div>
        {[
          { col:"red",   text:"HVAC filter at Highmark Building is 4 days overdue. Estimated 8–12% energy waste. Recommend scheduling this week to prevent occupant complaints." },
          { col:"amber", text:"Occupant satisfaction at Capital Blue HQ dropped 0.6 pts. Root cause: restroom cleanliness floor 3. Two unresolved complaints >48h." },
          { col:"green", text:"Landscaping cut at Penn Manor due in 3 days. Thursday forecast shows rain — move crew to Wednesday to protect curb appeal score." },
        ].map((a,i)=>(
          <div key={i} style={{ background:"var(--bg)", border:`0.5px solid ${C[a.col].border}`, borderLeft:`3px solid ${C[a.col].text}`, borderRadius:"var(--radius)", padding:"10px 12px", marginBottom:8, fontSize:12, color:"var(--text2)", lineHeight:1.6 }}>
            {a.text}
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
          {["Schedule HVAC now","Resolve open tickets","View landscaping schedule","Full building report"].map(a=>(
            <button key={a} style={{ background:"var(--bg2)", border:"0.5px solid rgba(168,85,247,0.25)", borderRadius:"var(--radius)", padding:"6px 12px", fontSize:11, color:"var(--purple)", cursor:"pointer" }}>{a}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,minmax(0,1fr))", gap:10, marginBottom:20 }}>
        <MetricCard label="Active jobs"     value="38"    delta="↑ 4 vs yesterday"   icon="ti-list-check"   iconColor="green"  />
        <MetricCard label="Open tickets"    value="7"     delta="2 overdue >48h"      deltaColor="red"   icon="ti-ticket"       iconColor="red"    />
        <MetricCard label="Workers on-site" value="124"   delta="92% coverage"        icon="ti-users"        iconColor="blue"   />
        <MetricCard label="PM tasks due"    value="3"     delta="1 overdue"           deltaColor="amber" icon="ti-settings"     iconColor="amber"  />
        <MetricCard label="Invoiced MTD"    value="$284k" delta="↑ 11% vs last mo."  icon="ti-file-invoice" iconColor="purple" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16 }}>
        <div>
          <SectionHeader title="Active work orders" action="View all" onAction={()=>onNav("workorders")} />
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {[
              { title:"Janitorial — Highmark Building",      loc:"Harrisburg, PA · 3 operators", status:"In progress", color:"green",  time:"7:00 AM"  },
              { title:"Landscaping — Penn Manor Complex",    loc:"Lancaster, PA · 5 operators",  status:"Delayed",     color:"amber",  time:"8:30 AM"  },
              { title:"HVAC maintenance — Fed. Courthouse",  loc:"Philadelphia, PA · 2 operators",status:"Dispatched", color:"blue",   time:"9:15 AM"  },
              { title:"Supply restocking — Capital Blue HQ", loc:"Camp Hill, PA · 1 operator",   status:"In progress", color:"green",  time:"10:00 AM" },
              { title:"Window cleaning — PPL Center",        loc:"Allentown, PA · 4 operators",  status:"Scheduled",   color:"purple", time:"1:00 PM"  },
            ].map((j,i)=>(
              <div key={i} style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:8, height:8, minWidth:8, borderRadius:"50%", background:C[j.color]?.text||"var(--text3)" }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:"var(--text)", fontWeight:500 }}>{j.title}</div>
                  <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{j.loc}</div>
                </div>
                <Badge color={j.color}>{j.status}</Badge>
                <span style={{ fontSize:11, color:"var(--text3)", minWidth:50, textAlign:"right" }}>{j.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <SectionHeader title="Open tickets" action="View all" onAction={()=>onNav("tickets")} />
            <div style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden" }}>
              {TICKETS.slice(0,4).map((t,i)=>(
                <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px", borderBottom:i<3?"0.5px solid var(--border)":"none" }}>
                  <div style={{ width:28, height:28, minWidth:28, borderRadius:8, background:t.priority==="high"?"var(--red-dim)":t.priority==="med"?"var(--amber-dim)":"var(--blue-dim)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <i className="ti ti-alert-circle" style={{ fontSize:13, color:t.priority==="high"?"var(--red)":t.priority==="med"?"var(--amber)":"var(--blue)" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>{t.title}</div>
                    <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{t.account}</div>
                  </div>
                  <Badge color={t.status==="overdue"?"red":t.status==="in-review"?"amber":"blue"}>
                    {t.status==="overdue"?"Overdue":t.status==="in-review"?"In review":"New"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="On-site now" action="View all" onAction={()=>onNav("workforce")} />
            <div style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden" }}>
              {WORKERS.filter(w=>w.status==="active").slice(0,3).map((w,i)=>(
                <div key={w.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:i<2?"0.5px solid var(--border)":"none" }}>
                  <Avatar initials={w.name.split(" ").map(n=>n[0]).join("")} color="green" size={26} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>{w.name}</div>
                    <div style={{ fontSize:11, color:"var(--text3)" }}>{w.role} · {w.account.split(" ")[0]}</div>
                  </div>
                  <Badge color="green">Active</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Accounts() {
  const [search, setSearch] = useState("");
  const filtered = ACCOUNTS.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())||a.city.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"8px 12px" }}>
          <i className="ti ti-search" style={{ fontSize:14, color:"var(--text3)" }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search accounts…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:"var(--text)" }} />
        </div>
        <button style={{ background:"var(--green)", border:"none", borderRadius:"var(--radius)", padding:"8px 14px", fontSize:12, color:"#000", fontWeight:500, cursor:"pointer" }}>+ Add account</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
        {filtered.map(a=>(
          <div key={a.id} style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:16, cursor:"pointer", transition:"border-color 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border2)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Avatar initials={a.img} color={a.tier==="Gov"?"blue":"green"} size={36} />
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>{a.name}</div>
                  <div style={{ fontSize:11, color:"var(--text3)" }}>{a.city}</div>
                </div>
              </div>
              <Badge color={a.tier==="Gov"?"blue":"green"}>{a.tier}</Badge>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { label:"Health",  value:a.health, color:a.health>=85?"green":a.health>=75?"amber":"red" },
                { label:"Sat.",    value:a.sat,    color:a.sat>=4.2?"green":a.sat>=3.8?"amber":"red" },
                { label:"Issues",  value:a.issues, color:a.issues===0?"green":a.issues<=2?"amber":"red" },
              ].map(m=>(
                <div key={m.label} style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>{m.label}</div>
                  <div style={{ fontSize:16, fontWeight:500, color:C[m.color]?.text }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6 }}>
              <i className="ti ti-users" style={{ fontSize:12, color:"var(--text3)" }} />
              <span style={{ fontSize:11, color:"var(--text3)" }}>{a.operators} operators assigned</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tickets() {
  const [filter, setFilter] = useState("all");
  const filtered = filter==="all" ? TICKETS : TICKETS.filter(t=>t.status===filter||t.priority===filter);
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["all","overdue","in-review","open","high","med"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?"var(--green-dim)":"var(--bg1)", border:`0.5px solid ${filter===f?"var(--green-border)":"var(--border)"}`, borderRadius:20, padding:"5px 12px", fontSize:12, color:filter===f?"var(--green)":"var(--text2)", cursor:"pointer", textTransform:"capitalize" }}>
            {f}
          </button>
        ))}
        <button style={{ marginLeft:"auto", background:"var(--green)", border:"none", borderRadius:"var(--radius)", padding:"6px 14px", fontSize:12, color:"#000", fontWeight:500, cursor:"pointer" }}>+ New ticket</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(t=>(
          <div key={t.id} style={{ background:"var(--bg1)", border:`0.5px solid ${t.status==="overdue"?"rgba(239,68,68,0.2)":"var(--border)"}`, borderRadius:"var(--radius-lg)", padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:36, height:36, minWidth:36, borderRadius:10, background:t.priority==="high"?"var(--red-dim)":t.priority==="med"?"var(--amber-dim)":"var(--blue-dim)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize:16, color:t.priority==="high"?"var(--red)":t.priority==="med"?"var(--amber)":"var(--blue)" }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", marginBottom:3 }}>{t.title}</div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"var(--text3)" }}>{t.account}</span>
                <span style={{ fontSize:11, color:"var(--text3)" }}>·</span>
                <span style={{ fontSize:11, color:"var(--text3)" }}>{t.type}</span>
                <span style={{ fontSize:11, color:"var(--text3)" }}>·</span>
                <span style={{ fontSize:11, color:"var(--text3)" }}>{t.submitted}</span>
              </div>
            </div>
            <div style={{ fontSize:12, color:"var(--text3)" }}>{t.assignee}</div>
            <Badge color={t.status==="overdue"?"red":t.status==="in-review"?"amber":"blue"}>
              {t.status.replace("-"," ")}
            </Badge>
            <button style={{ background:"var(--green-dim)", border:"0.5px solid var(--green-border)", borderRadius:"var(--radius)", padding:"5px 12px", fontSize:11, color:"var(--green)", cursor:"pointer" }}>
              Resolve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreventiveMaintenance() {
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ background:"var(--bg1)", border:"0.5px solid rgba(168,85,247,0.2)", borderRadius:"var(--radius-lg)", padding:14, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <i className="ti ti-sparkles" style={{ fontSize:14, color:"var(--purple)" }} />
          <span style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>AI recommendation</span>
        </div>
        <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.6, borderLeft:"3px solid var(--purple)", paddingLeft:10, marginBottom:10 }}>
          Bundle the HVAC filter change (overdue) with the plumbing inspection (due Jun 15) to reduce operator trips. Estimated savings: <strong style={{ color:"var(--green)" }}>$340</strong> in labor and travel.
        </div>
        <button style={{ background:"var(--purple-dim)", border:"0.5px solid rgba(168,85,247,0.25)", borderRadius:"var(--radius)", padding:"6px 14px", fontSize:12, color:"var(--purple)", cursor:"pointer" }}>
          Create bundled work order
        </button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {PM_TASKS.map(t=>(
          <div key={t.id} style={{ background:"var(--bg1)", border:`0.5px solid ${t.urgency==="red"?"rgba(239,68,68,0.2)":t.urgency==="amber"?"rgba(245,158,11,0.15)":"var(--border)"}`, borderRadius:"var(--radius-lg)", padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:38, height:38, minWidth:38, borderRadius:10, background:C[t.urgency]?.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className={`ti ${t.icon}`} style={{ fontSize:17, color:C[t.urgency]?.text }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", marginBottom:3 }}>{t.title}</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>{t.account} · {t.area} · {t.freq}</div>
            </div>
            <div style={{ textAlign:"right", marginRight:12 }}>
              <div style={{ fontSize:11, color:"var(--text3)" }}>Last: {t.last}</div>
            </div>
            <Badge color={t.urgency}>{t.due}</Badge>
            <button style={{ background:t.urgency==="green"?"var(--bg2)":"var(--green)", border:t.urgency==="green"?"0.5px solid var(--border)":"none", borderRadius:"var(--radius)", padding:"6px 14px", fontSize:12, color:t.urgency==="green"?"var(--text2)":"#000", fontWeight:500, cursor:"pointer" }}>
              Schedule
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Workforce() {
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:10, marginBottom:20 }}>
        <MetricCard label="Total workforce" value="450"  delta="Across 17 states"    icon="ti-users"      iconColor="blue"   />
        <MetricCard label="On-site today"   value="124"  delta="92% coverage rate"   icon="ti-map-pin"    iconColor="green"  />
        <MetricCard label="Avg tasks/shift" value="31"   delta="↑ 3 vs last month"   icon="ti-list-check" iconColor="purple" />
        <MetricCard label="Avg rating"      value="4.7"  delta="Top quartile"         icon="ti-star"       iconColor="amber"  />
      </div>
      <SectionHeader title="Operators on-site now" />
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {WORKERS.map(w=>(
          <div key={w.id} style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"12px 16px", display:"flex", alignItems:"center", gap:14 }}>
            <Avatar initials={w.name.split(" ").map(n=>n[0]).join("")} color={w.status==="active"?"green":w.status==="en-route"?"amber":"blue"} size={34} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>{w.name}</div>
              <div style={{ fontSize:11, color:"var(--text3)" }}>{w.role} · {w.account}</div>
            </div>
            <div style={{ textAlign:"center", minWidth:60 }}>
              <div style={{ fontSize:14, fontWeight:500, color:"var(--text)" }}>{w.tasks}</div>
              <div style={{ fontSize:10, color:"var(--text3)" }}>tasks</div>
            </div>
            <div style={{ textAlign:"center", minWidth:60 }}>
              <div style={{ fontSize:14, fontWeight:500, color:"var(--text)" }}>{w.hours}h</div>
              <div style={{ fontSize:10, color:"var(--text3)" }}>on-site</div>
            </div>
            <div style={{ textAlign:"center", minWidth:50 }}>
              <div style={{ fontSize:13, color:"var(--amber)" }}>{"★".repeat(Math.round(w.rating))}</div>
              <div style={{ fontSize:10, color:"var(--text3)" }}>{w.rating}</div>
            </div>
            <Badge color={w.status==="active"?"green":w.status==="en-route"?"amber":"blue"}>
              {w.status==="en-route"?"En route":w.status.charAt(0).toUpperCase()+w.status.slice(1)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function Schedule() {
  const days = ["Mon 9","Tue 10","Wed 11","Thu 12","Fri 13","Sat 14","Sun 15"];
  const events = {
    "Mon 9":  [{ label:"Night clean",  sub:"Highmark · 7–10pm",   col:"green" }, { label:"HVAC service", sub:"Highmark · 11am",     col:"red"   }],
    "Tue 10": [{ label:"Night clean",  sub:"Highmark · 7–10pm",   col:"green" }, { label:"Day clean",    sub:"Capital Blue · 9am",  col:"green" }],
    "Wed 11": [{ label:"Night clean",  sub:"Penn Manor · 7–10pm", col:"green" }],
    "Thu 12": [{ label:"Landscaping",  sub:"Penn Manor · 8am",    col:"amber" }, { label:"Night clean",  sub:"Highmark · 7–10pm",   col:"green" }],
    "Fri 13": [{ label:"Night clean",  sub:"Highmark · 7–10pm",   col:"green" }, { label:"Plumbing",     sub:"Highmark · 9am",      col:"blue"  }],
    "Sat 14": [],
    "Sun 15": [],
  };
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"6px 10px", cursor:"pointer", color:"var(--text2)" }}><i className="ti ti-chevron-left" /></button>
          <span style={{ fontSize:15, fontWeight:500, color:"var(--text)" }}>June 2026</span>
          <button style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius)", padding:"6px 10px", cursor:"pointer", color:"var(--text2)" }}><i className="ti ti-chevron-right" /></button>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          {[{col:"green",label:"Janitorial"},{col:"amber",label:"Landscaping"},{col:"blue",label:"Maintenance"},{col:"red",label:"Urgent"}].map(l=>(
            <div key={l.col} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:C[l.col]?.text }} />
              <span style={{ fontSize:11, color:"var(--text3)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:6 }}>
        {days.map(d=>(
          <div key={d}>
            <div style={{ fontSize:11, textAlign:"center", padding:"4px 0 8px", fontWeight:d==="Mon 9"?500:400, color:d==="Mon 9"?"var(--green)":"var(--text3)" }}>{d}</div>
            <div style={{ background:d.startsWith("Sat")||d.startsWith("Sun")?"var(--bg)":"var(--bg1)", border:`0.5px solid ${d==="Mon 9"?"var(--green-border)":"var(--border)"}`, borderRadius:"var(--radius-lg)", padding:8, minHeight:120 }}>
              {(events[d]||[]).map((ev,i)=>(
                <div key={i} style={{ background:C[ev.col]?.bg, border:`0.5px solid ${C[ev.col]?.border}`, borderRadius:6, padding:"4px 7px", marginBottom:5, cursor:"pointer" }}>
                  <div style={{ fontSize:11, fontWeight:500, color:C[ev.col]?.text }}>{ev.label}</div>
                  <div style={{ fontSize:10, color:C[ev.col]?.text, opacity:0.7 }}>{ev.sub}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Vendors() {
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ background:"var(--bg1)", border:"0.5px solid rgba(34,197,94,0.2)", borderRadius:"var(--radius-lg)", padding:14, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <i className="ti ti-sparkles" style={{ fontSize:14, color:"var(--green)" }} />
          <span style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>Vendor consolidation — the DSC advantage</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:10 }}>
          {[
            { label:"Vendors replaced",         value:"23",   col:"green"  },
            { label:"Annual savings delivered",  value:"$847k",col:"green"  },
            { label:"Services self-performed",   value:"7",    col:"purple" },
          ].map(m=>(
            <div key={m.label} style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:12 }}>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:22, fontWeight:500, color:C[m.col]?.text }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {[
          { name:"DSC Solutions — janitorial",     sub:"Full service · 5 operators · Daily clean",      score:4.3, tagCol:"green",  tag:"DSC self-perform"    },
          { name:"DSC Solutions — landscaping",    sub:"Bi-weekly cut + bed maintenance",               score:4.5, tagCol:"green",  tag:"DSC self-perform"    },
          { name:"DSC Solutions — HVAC maint.",    sub:"Filter changes, coil cleaning, inspection",     score:4.1, tagCol:"green",  tag:"DSC self-perform"    },
          { name:"Precision Pest Control",         sub:"Quarterly treatment · $1,400/qtr",              score:4.0, tagCol:"amber",  tag:"Candidate for DSC"   },
          { name:"ABC Cleaning Co.",               sub:"Former vendor · Terminated Feb 2026",            score:2.9, tagCol:"red",    tag:"Replaced"            },
          { name:"Green Grounds LLC",              sub:"Former vendor · Terminated Apr 2026",            score:3.1, tagCol:"red",    tag:"Replaced"            },
          { name:"Elite Electric Inc.",            sub:"Licensed inspection · $2,100/yr · Keep",        score:4.4, tagCol:"blue",   tag:"Licensed — keep"     },
        ].map((v,i)=>(
          <div key={i} style={{ background:"var(--bg1)", border:"0.5px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"12px 16px", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:36, height:36, minWidth:36, borderRadius:10, background:"var(--bg2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:500, color:"var(--text2)" }}>
              {v.name.split(" ").slice(0,2).map(w=>w[0]).join("")}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>{v.name}</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{v.sub}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, minWidth:60 }}>
              <i className="ti ti-star" style={{ fontSize:12, color:"var(--amber)" }} />
              <span style={{ fontSize:13, fontWeight:500, color:v.score>=4.0?"var(--green)":v.score>=3.5?"var(--amber)":"var(--red)" }}>{v.score}</span>
            </div>
            <Badge color={v.tagCol}>{v.tag}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ title }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
      <i className="ti ti-tools" style={{ fontSize:32, color:"var(--text3)" }} />
      <div style={{ fontSize:16, fontWeight:500, color:"var(--text2)" }}>{title}</div>
      <div style={{ fontSize:13, color:"var(--text3)" }}>Module in development</div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState("overview");

  const titles = {
    overview:   ["Overview",             "Monday, June 9, 2026 · 47 active accounts"],
    accounts:   ["Accounts",             "47 locations across 17 states"],
    workorders: ["Work orders",          "38 active today"],
    schedule:   ["Schedule",             "June 2026"],
    tickets:    ["Tickets",              "7 open · 2 overdue"],
    pm:         ["Preventive maintenance","3 tasks due · 1 overdue"],
    workforce:  ["Workforce",            "450 employees · 124 on-site"],
    fleet:      ["Fleet",                "DSC Solutions · Select Building · Clean Energy"],
    invoices:   ["Invoices",             ""],
    vendors:    ["Vendor management",    "7 service categories · 23 vendors consolidated"],
    reports:    ["Reports & analytics",  ""],
  };

  const screens = {
    overview:   <Overview onNav={setPage} />,
    accounts:   <Accounts />,
    workorders: <ComingSoon title="Work orders" />,
    schedule:   <Schedule />,
    tickets:    <Tickets />,
    pm:         <PreventiveMaintenance />,
    workforce:  <Workforce />,
    fleet:      <ComingSoon title="Fleet management" />,
    invoices:   <ComingSoon title="Invoices" />,
    vendors:    <Vendors />,
    reports:    <ComingSoon title="Reports & analytics" />,
  };

  const [t, sub] = titles[page] || ["",""];

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar active={page} onNav={setPage} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <Topbar title={t} subtitle={sub} />
        <div style={{ flex:1, overflow:"hidden", background:"var(--bg)" }}>
          {screens[page]}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
