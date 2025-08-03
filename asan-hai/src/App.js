import React, { useState, useEffect } from "react";
import {
  format,
  isBefore,
  isAfter,
  isThisWeek,
  isToday,
  isTomorrow,
  addDays,
  startOfWeek,
  parseISO,
  differenceInCalendarDays
} from "date-fns";

function getInitialTasks() {
  const data = localStorage.getItem("asan-hai-tasks");
  if (data) return JSON.parse(data);
  return [];
}

function getInitialHistory() {
  const data = localStorage.getItem("asan-hai-history");
  if (data) return JSON.parse(data);
  return [];
}

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Day After Tomorrow", value: "dayaftertomorrow" },
  { label: "Pending", value: "pending" },
  { label: "Upcoming", value: "upcoming" }
];

export default function App() {
  const [tasks, setTasks] = useState(getInitialTasks());
  const [history, setHistory] = useState(getInitialHistory());
  const [newTask, setNewTask] = useState({ title: "", desc: "", deadline: "" });
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [showChangeDate, setShowChangeDate] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [filter, setFilter] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    localStorage.setItem("asan-hai-tasks", JSON.stringify(tasks));
    localStorage.setItem("asan-hai-history", JSON.stringify(history));
    document.title = "ASAN HAI";
  }, [tasks, history]);

  // Bulk add handler
  const handleBulkAdd = () => {
    const newTasks = [];
    bulkInput.split("\n").forEach(line => {
      const [title, desc = "", deadline = ""] = line.split(",").map(f => f.trim());
      if (title && deadline) {
        newTasks.push({
          id: Date.now() + Math.random(),
          title,
          desc,
          deadline,
          completed: false,
          created: new Date().toISOString(),
        });
      }
    });
    if (newTasks.length > 0) {
      setTasks([...tasks, ...newTasks]);
      setBulkInput("");
      setShowBulk(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title || !newTask.deadline) return;
    setTasks([
      ...tasks,
      {
        id: Date.now(),
        title: newTask.title,
        desc: newTask.desc,
        deadline: newTask.deadline,
        completed: false,
        created: new Date().toISOString(),
      },
    ]);
    setNewTask({ title: "", desc: "", deadline: "" });
  };

  const handleChangeDate = (id) => {
    setShowChangeDate(id);
    const t = tasks.find((t) => t.id === id);
    setNewDate(t.deadline);
  };

  const handleSaveNewDate = () => {
    setTasks(tasks.map((t) =>
      t.id === showChangeDate ? { ...t, deadline: newDate } : t
    ));
    const t = tasks.find((t) => t.id === showChangeDate);
    setHistory([
      ...history,
      { type: "date_change", title: t.title, from: t.deadline, to: newDate, date: new Date().toISOString() }
    ]);
    setShowChangeDate(null);
    setNewDate("");
  };

  const handleDeleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleToggleComplete = (id) => {
    setTasks(
      tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
    const t = tasks.find((t) => t.id === id);
    setHistory([
      ...history,
      { type: "completed", title: t.title, date: new Date().toISOString() }
    ]);
  };

  // Report logic
  const completed = history.filter(h => h.type === "completed" && isThisWeek(parseISO(h.date), { weekStartsOn: 1 }));
  const dateChanges = history.filter(h => h.type === "date_change" && isThisWeek(parseISO(h.date), { weekStartsOn: 1 }));
  const now = new Date();

  // Week navigation logic
  const weekStartDate = addDays(startOfWeek(now, { weekStartsOn: 1 }), weekOffset * 7);
  const calendarDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStartDate, i)
  );

  // Filtering logic
  const filteredTasks = tasks.filter((t) => {
    const d = parseISO(t.deadline);
    if (filter === "all") return true;
    if (filter === "today") return isToday(d);
    if (filter === "tomorrow") return isTomorrow(d);
    if (filter === "dayaftertomorrow") return differenceInCalendarDays(d, now) === 2;
    // NEW Pending filter: only today or earlier, not completed
    if (filter === "pending") return !t.completed && (isBefore(d, now) || isToday(d));
    if (filter === "upcoming") return isAfter(d, now);
    return true;
  });

  const pending = tasks.filter(
    (t) => !t.completed && (isBefore(parseISO(t.deadline), now) || isToday(parseISO(t.deadline)))
  );
  const overdue = tasks.filter(
    (t) => !t.completed && isBefore(parseISO(t.deadline), now)
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "Helvetica, Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", fontSize: 32 }}>ASAN HAI</h1>

      {/* Add Task Section */}
      <div style={{
        margin: "28px 0 20px 0", padding: 20, borderRadius: 16,
        border: "2px solid #bfc9f6", background: "#f6f8ff", display: "flex", flexDirection: "column", gap: 16
      }}>
        <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Add Task</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Task Title</label>
            <input
              placeholder="Task Title"
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 7, fontSize: 16, border: "1px solid #ccd" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Date</label>
            <input
              type="date"
              value={newTask.deadline}
              onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 7, fontSize: 16, border: "1px solid #ccd" }}
            />
          </div>
          <div style={{ flex: 3 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Description</label>
            <input
              placeholder="Description"
              value={newTask.desc}
              onChange={e => setNewTask({ ...newTask, desc: e.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 7, fontSize: 16, border: "1px solid #ccd" }}
            />
          </div>
          <button onClick={handleAddTask} style={{
            padding: "14px 28px", borderRadius: 10, fontWeight: 600, fontSize: 16,
            background: "#4056f4", color: "#fff", border: "none", marginTop: 20
          }}>Add</button>
        </div>
      </div>
      <div style={{ margin: "0 0 12px 0", textAlign: "right" }}>
        <button
          onClick={() => setShowBulk(true)}
          style={{
            padding: "9px 22px", borderRadius: 8, fontWeight: 500, fontSize: 15,
            background: "#fff", border: "1.5px solid #98b2fa", color: "#4056f4", marginRight: 6, cursor: "pointer"
          }}>
          Bulk Add Tasks
        </button>
      </div>
      {showBulk && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.14)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#fff", padding: 28, borderRadius: 14, minWidth: 350, width: 410, maxWidth: "80vw", boxShadow: "0 8px 44px #8fa0f845" }}>
            <h3 style={{ marginBottom: 14, color: "#253272" }}>Bulk Add Tasks</h3>
            <textarea
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              rows={8}
              placeholder='Paste tasks here:\nTitle 1, Description, 2025-08-12\nTitle 2, , 2025-08-13'
              style={{ width: "100%", padding: 10, borderRadius: 7, border: "1px solid #ccd", marginBottom: 14, fontSize: 15 }}
            />
            <div>
              <button onClick={handleBulkAdd}
                style={{ padding: "10px 20px", borderRadius: 7, background: "#4056f4", color: "#fff", fontWeight: 600, border: "none", marginRight: 10 }}>
                Add Bulk Tasks
              </button>
              <button onClick={() => setShowBulk(false)}
                style={{ padding: "10px 20px", borderRadius: 7, background: "#f4f4f6", color: "#222", border: "1px solid #ccd" }}>
                Cancel
              </button>
              <div style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
                Format: Title, Description, YYYY-MM-DD (one task per line)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY CALENDAR NAVIGATION */}
      <h3 style={{ marginTop: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <button onClick={() => setWeekOffset(weekOffset - 1)} style={{
          fontSize: 20, border: "none", background: "#f0f0f8", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", fontWeight: 700
        }}>&lt;</button>
        <span>
          {format(weekStartDate, "MMM dd")} – {format(addDays(weekStartDate, 6), "MMM dd, yyyy")}
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} style={{
          fontSize: 20, border: "none", background: "#f0f0f8", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", fontWeight: 700
        }}>&gt;</button>
      </h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {calendarDays.map(day => {
          const todaysTasks = tasks.filter(t => t.deadline === format(day, "yyyy-MM-dd"));
          return (
            <div key={day} style={{ flex: 1, minWidth: 90, background: "#fafafa", borderRadius: 8, border: "1px solid #eee", padding: 8 }}>
              <div style={{ fontWeight: "bold", textAlign: "center", fontSize: 13, marginBottom: 4 }}>
                {format(day, "EEE")}
                <br />
                <span style={{ fontSize: 11 }}>{format(day, "MM/dd")}</span>
              </div>
              <div style={{ color: todaysTasks.length === 0 ? "#bbb" : "#4056f4", textAlign: "center", fontSize: 16, fontWeight: 600, marginTop: 10 }}>
                {todaysTasks.length === 0 ? "No tasks" : `${todaysTasks.length} task${todaysTasks.length > 1 ? "s" : ""}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div style={{ display: "flex", gap: 12, margin: "18px 0", justifyContent: "center" }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: "10px 24px",
              fontWeight: filter === f.value ? 700 : 500,
              borderRadius: 8,
              border: "1px solid #ddd",
              background: filter === f.value ? "#e7e7fa" : "#fff",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* MY TASKS */}
      <div>
        <h2>My Tasks</h2>
        {filteredTasks.map((t) => (
          <div key={t.id} style={{
            border: "1px solid #ddd", borderRadius: 8, margin: "12px 0",
            padding: 16, display: "flex", alignItems: "center", background: t.completed ? "#e8ffe8" : "#fff",
            boxShadow: "0 2px 8px #f1f1f1"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <strong style={{ textDecoration: t.completed ? "line-through" : "", fontSize: 18 }}>
                  {t.title}
                </strong>
                <span style={{
                  color: "#4056f4", fontWeight: 600, fontSize: 15, marginLeft: 12,
                  border: "1px solid #cfd8fc", borderRadius: 6, padding: "2px 8px", background: "#f2f6fd"
                }}>
                  {format(parseISO(t.deadline), "dd/MM/yyyy")}
                </span>
              </div>
              {t.desc &&
                <div style={{ color: "#777", fontSize: 15, marginTop: 7, marginLeft: 2, textAlign: "left" }}>
                  {t.desc}
                </div>
              }
            </div>
            <div style={{
              display: "flex", gap: 12, background: "#f6f8ff", borderRadius: 8,
              padding: "7px 13px", boxShadow: "0 1px 3px #f0f4fb"
            }}>
              <button onClick={() => handleToggleComplete(t.id)} style={{
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: t.completed ? "#c8ebfa" : "#4056f4", color: t.completed ? "#4056f4" : "#fff", fontWeight: 600, cursor: "pointer"
              }}>
                {t.completed ? "Undo" : "Complete"}
              </button>
              <button onClick={() => handleChangeDate(t.id)} style={{
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: "#ffeecd", color: "#7a5b12", fontWeight: 600, cursor: "pointer"
              }}>
                Change Date
              </button>
              <button onClick={() => handleDeleteTask(t.id)} style={{
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: "#ffeded", color: "#d02222", fontWeight: 600, cursor: "pointer"
              }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CHANGE DATE MODAL */}
      {showChangeDate && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.14)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 10, boxShadow: "0 4px 32px #d5c98799", minWidth: 280 }}>
            <h3>Change Task Date</h3>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{ padding: 8, margin: "10px 0", borderRadius: 6, border: "1px solid #bbb", fontSize: 16, width: "100%" }}
            />
            <div style={{ marginTop: 12 }}>
              <button onClick={handleSaveNewDate} style={{
                padding: "8px 18px", marginRight: 10, background: "#4056f4", color: "#fff", border: "none", borderRadius: 7, fontWeight: 600
              }}>Save</button>
              <button onClick={() => setShowChangeDate(null)} style={{
                padding: "8px 18px", background: "#eee", color: "#222", border: "1px solid #aaa", borderRadius: 7, fontWeight: 500
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REPORT MODAL */}
      {showReport && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1003
        }}>
          <div style={{ background: "#fff", padding: 32, borderRadius: 16, minWidth: 320 }}>
            <h2>This Week's Report</h2>
            <div style={{ marginBottom: 12 }}>
              <strong>Completed tasks:</strong>
              {completed.length === 0 ? (
                <div style={{ color: "#888" }}>None</div>
              ) : (
                <ul>
                  {completed.map((h, i) => (
                    <li key={i}>
                      <b>{h.title}</b> on {format(parseISO(h.date), "dd/MM/yyyy HH:mm")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Date changes:</strong>
              {dateChanges.length === 0 ? (
                <div style={{ color: "#888" }}>None</div>
              ) : (
                <ul>
                  {dateChanges.map((h, i) => (
                    <li key={i}>
                      <b>{h.title}</b> changed from {format(parseISO(h.from), "dd/MM/yyyy")} to {format(parseISO(h.to), "dd/MM/yyyy")} ({format(parseISO(h.date), "dd/MM/yyyy HH:mm")})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <strong>Pending tasks:</strong> {pending.map(t => t.title).join(", ") || "None"}
            </div>
            <div>
              <strong>Overdue tasks:</strong> {overdue.map(t => t.title).join(", ") || "None"}
            </div>
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button onClick={() => setShowReport(false)} style={{
                padding: "8px 22px", background: "#4056f4", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <button onClick={() => setShowReport(true)}
          style={{
            padding: "9px 22px", borderRadius: 8, fontWeight: 500, fontSize: 15,
            background: "#fff", border: "1.5px solid #98b2fa", color: "#4056f4", marginRight: 6, cursor: "pointer"
          }}
        >Show Weekly Report</button>
      </div>
    </div>
  );
}
