import { Client, Account, TablesDB, ID, Query, Permission, Role } from "https://cdn.jsdelivr.net/npm/appwrite@29.1.0/+esm";

/*
 * Set projectId and databaseId after creating the Appwrite resources.
 * When both IDs are unchanged, the UI runs in clearly labelled local demo
 * mode; it never pretends demo data was saved to Appwrite.
 */
const CONFIG = {
  endpoint: "https://sgp.cloud.appwrite.io/v1",
  projectId: "6adb066c00070d13ea61",
  databaseId: "6adb16fc0023ce04c07d",
  tableId: "6adb172f002522962fba"
};
const $ = (s) => document.querySelector(s);
const client = new Client().setEndpoint(CONFIG.endpoint).setProject(CONFIG.projectId);
const account = new Account(client);
const tablesDB = new TablesDB(client);
const DEMO_KEY = "studysprint-demo-tasks-v1";
let mode = "demo";
let currentUser = null;
let tasks = [];
let activeFilter = "all";
let editingId = null;
let toastTimer;

const todayISO = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const prettyDate = value => value ? new Date(value + "T12:00:00").toLocaleDateString(undefined, {month:"short",day:"numeric"}) : "No date";
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const showToast = message => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
};
const isConfigured = () => CONFIG.projectId && CONFIG.databaseId &&
  !CONFIG.projectId.startsWith("PASTE_") && !CONFIG.databaseId.startsWith("PASTE_");

function setStatus(state, label, subtitle) {
  $("#dot").className = state;
  $("#connection").textContent = label;
  $("#session-state").textContent = subtitle;
}
function getDemoTasks() {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
function saveDemoTasks() {
  localStorage.setItem(DEMO_KEY, JSON.stringify(tasks));
}
async function initialise() {
  $("#today-label").textContent = new Date().toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"});
  if (!isConfigured()) {
    mode = "demo";
    tasks = getDemoTasks();
    setStatus("offline", "Demo mode · local storage", "Demo session");
    render();
    showToast("Demo mode is active. Configure Appwrite to enable cloud storage.");
    return;
  }
  mode = "appwrite";
  setStatus("", "Connecting to Appwrite…", "Starting session");
  try {
    try {
      currentUser = await account.get();
    } catch {
      currentUser = await account.createAnonymousSession();
    }
    // createAnonymousSession returns a token/session object; retrieve the current user for its ID.
    currentUser = await account.get();
    setStatus("online", "Connected to Appwrite", "Anonymous study session");
    await loadTasks();
  } catch (error) {
    console.error("Appwrite initialization failed:", error);
    setStatus("offline", "Appwrite connection failed", "Needs setup");
    $("#tasks").innerHTML = "";
    $("#empty").classList.remove("hidden");
    $("#empty").querySelector("h3").textContent = "Couldn't connect to Appwrite";
    $("#empty").querySelector("p").textContent = "Check your project ID, database/table IDs, platform domain, columns, and permissions.";
    $("#first-add").classList.add("hidden");
    showToast("Connection failed. Check Appwrite setup and reload.");
  }
}
async function loadTasks() {
  if (mode === "demo") {
    tasks = getDemoTasks();
  } else {
    const result = await tablesDB.listRows({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      queries: [
        Query.equal("ownerId", currentUser.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(100)
      ]
    });
    tasks = result.rows || [];
  }
  $("#first-add").classList.remove("hidden");
  render();
}
async function createTask(data) {
  if (mode === "demo") {
    tasks.unshift({$id: crypto.randomUUID(), ...data, completed:false, $createdAt:new Date().toISOString()});
    saveDemoTasks();
    return;
  }
  await tablesDB.createRow({
    databaseId: CONFIG.databaseId,
    tableId: CONFIG.tableId,
    rowId: ID.unique(),
    data: {...data, completed:false, ownerId:currentUser.$id},
    permissions: [
      Permission.read(Role.user(currentUser.$id)),
      Permission.update(Role.user(currentUser.$id)),
      Permission.delete(Role.user(currentUser.$id))
    ]
  });
}
async function updateTask(task, patch) {
  if (mode === "demo") {
    tasks = tasks.map(item => item.$id === task.$id ? {...item, ...patch} : item);
    saveDemoTasks();
    return;
  }
  await tablesDB.updateRow({
    databaseId:CONFIG.databaseId, tableId:CONFIG.tableId, rowId:task.$id, data:patch
  });
}
async function removeTask(task) {
  if (mode === "demo") {
    tasks = tasks.filter(item => item.$id !== task.$id);
    saveDemoTasks();
    return;
  }
  await tablesDB.deleteRow({databaseId:CONFIG.databaseId, tableId:CONFIG.tableId, rowId:task.$id});
}
function visibleTasks() {
  const term = $("#search").value.trim().toLowerCase();
  const subject = $("#subject").value;
  return tasks.filter(task => {
    const matchFilter = activeFilter === "all" ||
      (activeFilter === "today" && task.dueDate === todayISO() && !task.completed) ||
      (activeFilter === "pending" && !task.completed) ||
      (activeFilter === "completed" && task.completed);
    const matchTerm = !term || `${task.title} ${task.subject}`.toLowerCase().includes(term);
    return matchFilter && matchTerm && (subject === "all" || task.subject === subject);
  });
}
function render() {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const dueToday = tasks.filter(t => !t.completed && t.dueDate === todayISO()).length;
  const pending = total - done;
  const pct = total ? Math.round(done / total * 100) : 0;
  $("#total").textContent = total;
  $("#completed").textContent = done;
  $("#today").textContent = dueToday;
  $("#pending").textContent = pending;
  $("#rate").textContent = pct + "%";
  $("#percent").textContent = pct + "%";
  $("#ring").style.background = `conic-gradient(var(--purple) ${pct*3.6}deg, #eeecf8 0deg)`;
  $("#progress-note").textContent = pct === 100 && total ? "Amazing work — every task is complete!" : total ? `${pending} task${pending===1?"":"s"} left. Keep your momentum going.` : "Start with one task. You've got this.";

  const subjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))].sort();
  const selectedSubject = $("#subject").value;
  $("#subject").innerHTML = '<option value="all">All subjects</option>' +
    subjects.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");
  if (subjects.includes(selectedSubject)) $("#subject").value = selectedSubject;

  const groups = subjects.map(subject => {
    const group = tasks.filter(t => t.subject === subject);
    const completed = group.filter(t => t.completed).length;
    return {subject, total:group.length, completed, pct:Math.round(completed/group.length*100)};
  });
  $("#subject-progress").innerHTML = groups.length ? groups.map(s =>
    `<div class="subject-line"><div class="subject-line-top"><span>${escapeHTML(s.subject)}</span><span>${s.completed}/${s.total}</span></div><div class="bar-track"><div class="bar-fill" style="width:${s.pct}%"></div></div></div>`
  ).join("") : '<p class="muted">Add a task to see your subject breakdown.</p>';

  const shown = visibleTasks();
  $("#tasks").innerHTML = shown.map(task => {
    const overdue = !task.completed && task.dueDate && task.dueDate < todayISO();
    return `<article class="task-row">
      <button class="check ${task.completed?"done":""}" data-action="toggle" data-id="${escapeHTML(task.$id)}" aria-label="${task.completed?"Mark incomplete":"Mark complete"}">${task.completed?"✓":""}</button>
      <div class="task-main"><div class="task-title ${task.completed?"is-done":""}">${escapeHTML(task.title)}</div><div class="task-meta"><span class="subject-tag">${escapeHTML(task.subject)}</span><span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)} priority</span></div></div>
      <div class="task-date ${overdue?"overdue":""}">${overdue?"Overdue · ":""}${prettyDate(task.dueDate)}</div>
      <div class="row-actions"><button class="mini" data-action="edit" data-id="${escapeHTML(task.$id)}">Edit</button><button class="mini" data-action="delete" data-id="${escapeHTML(task.$id)}">Delete</button></div>
    </article>`;
  }).join("");
  $("#empty").classList.toggle("hidden", shown.length > 0);
  $("#tasks").classList.toggle("hidden", shown.length === 0);
  $("#summary").textContent = `${shown.length} task${shown.length===1?"":"s"} shown · ${done} completed overall`;
  const labels = {all:"Overview",today:"Due today",pending:"In progress",completed:"Completed"};
  $("#view-name").textContent = labels[activeFilter];
  $("#heading").textContent = ({all:"Study tasks",today:"Due today",pending:"In progress",completed:"Completed tasks"})[activeFilter];
}
function openModal(task = null) {
  editingId = task?.$id || null;
  $("#modal-title").textContent = task ? "Edit study task" : "Add a study task";
  $("#save").textContent = task ? "Save changes →" : "Save task →";
  $("#title").value = task?.title || "";
  $("#subject-name").value = task?.subject || "";
  $("#due").value = task?.dueDate || todayISO();
  $("#priority").value = task?.priority || "medium";
  $("#form-error").classList.add("hidden");
  $("#backdrop").classList.remove("hidden");
  setTimeout(() => $("#title").focus(), 20);
}
function closeModal() {
  $("#backdrop").classList.add("hidden");
  editingId = null;
}
$("#add").addEventListener("click", () => openModal());
$("#first-add").addEventListener("click", () => openModal());
$("#close").addEventListener("click", closeModal);
$("#cancel").addEventListener("click", closeModal);
$("#backdrop").addEventListener("click", e => { if (e.target === $("#backdrop")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
$("#search").addEventListener("input", render);
$("#subject").addEventListener("change", render);
$("#clear").addEventListener("click", () => {
  $("#search").value = "";
  $("#subject").value = "all";
  activeFilter = "all";
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  render();
});
document.querySelectorAll(".nav").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b === button));
  render();
}));
$("#tasks").addEventListener("click", async e => {
  const button = e.target.closest("button[data-action]");
  if (!button) return;
  const task = tasks.find(t => t.$id === button.dataset.id);
  if (!task) return;
  try {
    if (button.dataset.action === "toggle") {
      await updateTask(task, {completed:!task.completed});
      showToast(task.completed ? "Task moved back to in progress." : "Nice work — task completed!");
    } else if (button.dataset.action === "edit") {
      openModal(task);
      return;
    } else if (button.dataset.action === "delete") {
      if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
      await removeTask(task);
      showToast("Task deleted.");
    }
    await loadTasks();
  } catch (error) {
    console.error(error);
    showToast(error.message || "That action failed. Check your table permissions.");
  }
});
$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  const data = {title:$("#title").value.trim(), subject:$("#subject-name").value.trim(), dueDate:$("#due").value, priority:$("#priority").value};
  if (!data.title || !data.subject || !data.dueDate) {
    $("#form-error").textContent = "Please complete every field.";
    $("#form-error").classList.remove("hidden");
    return;
  }
  const wasEditing = Boolean(editingId);
  const save = $("#save");
  save.disabled = true;
  save.textContent = "Saving…";
  try {
    if (editingId) {
      const task = tasks.find(t => t.$id === editingId);
      if (!task) throw new Error("This task is no longer available. Refresh and try again.");
      await updateTask(task, data);
      showToast(mode === "demo" ? "Task updated in this browser." : "Task updated in Appwrite.");
    } else {
      await createTask(data);
      showToast(mode === "demo" ? "Saved in demo mode on this browser." : "Task saved to Appwrite.");
    }
    closeModal();
    await loadTasks();
  } catch (error) {
    console.error(error);
    $("#form-error").textContent = error.message || "Couldn't save. Check the database columns and permissions.";
    $("#form-error").classList.remove("hidden");
  } finally {
    save.disabled = false;
    save.textContent = wasEditing ? "Save changes →" : "Save task →";
  }
});
initialise();
