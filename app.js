
const DB_NAME = "MailTextLibraryDB";
const DB_VERSION = 1;
const ITEMS_STORE = "items";
const FOLDERS_STORE = "folders";
const LEGACY_LOCALSTORAGE_KEY = "mailTextLibraryWebApp_v1";
const VIEW_MODE_KEY = "mailTextLibraryViewMode";
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE = 50 * 1024 * 1024;

const state = {
  items: [],
  folders: [],
  currentView: "all",
  viewMode: localStorage.getItem(VIEW_MODE_KEY) === "line" ? "line" : "card",
  editingId: null,
  viewerId: null,
  editorAttachments: [],
  draggingFolderId: null
};

const el = id => document.getElementById(id);
const E = {
  countAll: el("countAll"),
  countFavorites: el("countFavorites"),
  countUnfiled: el("countUnfiled"),
  folderList: el("folderList"),
  addFolderBtn: el("addFolderBtn"),
  exportBtn: el("exportBtn"),
  exportFolderBtn: el("exportFolderBtn"),
  importInput: el("importInput"),
  searchInput: el("searchInput"),
  tagFilter: el("tagFilter"),
  txtImportDrop: el("txtImportDrop"),
  txtImportInput: el("txtImportInput"),
  newBtn: el("newBtn"),
  editorPanel: el("editorPanel"),
  editorHeading: el("editorHeading"),
  closeEditorBtn: el("closeEditorBtn"),
  titleInput: el("titleInput"),
  counterpartInput: el("counterpartInput"),
  folderSelect: el("folderSelect"),
  mailDateInput: el("mailDateInput"),
  nowBtn: el("nowBtn"),
  bodyInput: el("bodyInput"),
  attachmentDropZone: el("attachmentDropZone"),
  attachmentInput: el("attachmentInput"),
  attachmentList: el("attachmentList"),
  tagsInput: el("tagsInput"),
  favoriteInput: el("favoriteInput"),
  cancelBtn: el("cancelBtn"),
  saveBtn: el("saveBtn"),
  viewTitle: el("viewTitle"),
  resultCount: el("resultCount"),
  cardViewBtn: el("cardViewBtn"),
  lineViewBtn: el("lineViewBtn"),
  cardList: el("cardList"),
  viewerOverlay: el("viewerOverlay"),
  viewerModal: el("viewerModal"),
  viewerFavoriteBtn: el("viewerFavoriteBtn"),
  viewerTitle: el("viewerTitle"),
  viewerMeta: el("viewerMeta"),
  viewerTags: el("viewerTags"),
  viewerHeaderBtn: el("viewerHeaderBtn"),
  viewerHeaderDetails: el("viewerHeaderDetails"),
  viewerBody: el("viewerBody"),
  viewerAttachments: el("viewerAttachments"),
  viewerMaxBtn: el("viewerMaxBtn"),
  viewerCloseBtn: el("viewerCloseBtn"),
  viewerCopyBtn: el("viewerCopyBtn"),
  viewerEditBtn: el("viewerEditBtn"),
  viewerDeleteBtn: el("viewerDeleteBtn"),
  toast: el("toast")
};

function esc(v=""){
  return String(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizeTags(value){
  const a = Array.isArray(value) ? value : String(value || "").split(/[,、\n]/);
  return [...new Set(a.map(v => String(v).trim()).filter(Boolean))];
}

function normalizeAttachments(value){
  if(!Array.isArray(value)) return [];
  return value.filter(x => x && x.data).map(x => ({
    id: x.id || crypto.randomUUID(),
    name: String(x.name || "添付ファイル"),
    type: String(x.type || "application/octet-stream"),
    size: Number(x.size) || 0,
    data: String(x.data)
  }));
}

function normalizeItem(x){
  return {
    id: x.id || crypto.randomUUID(),
    title: String(x.title || "無題"),
    counterpart: String(x.counterpart || ""),
    sender: String(x.sender || ""),
    recipients: String(x.recipients || ""),
    cc: String(x.cc || ""),
    body: String(x.body || ""),
    attachments: normalizeAttachments(x.attachments),
    tags: normalizeTags(x.tags || []),
    folderId: x.folderId || null,
    favorite: Boolean(x.favorite),
    mailDate: Number(x.mailDate) || Number(x.recordDate) || Number(x.updatedAt) || Number(x.createdAt) || Date.now(),
    createdAt: Number(x.createdAt) || Date.now(),
    updatedAt: Number(x.updatedAt) || Date.now()
  };
}

function normalizeFolder(x){
  return {
    id: x.id || crypto.randomUUID(),
    name: String(x.name || "無題フォルダ"),
    createdAt: Number(x.createdAt) || Date.now(),
    order: Number.isFinite(Number(x.order)) ? Number(x.order) : (Number(x.createdAt) || Date.now())
  };
}

function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if(!db.objectStoreNames.contains(ITEMS_STORE)){
        const items = db.createObjectStore(ITEMS_STORE, { keyPath: "id" });
        items.createIndex("mailDate", "mailDate", { unique: false });
        items.createIndex("folderId", "folderId", { unique: false });
        items.createIndex("favorite", "favorite", { unique: false });
      }

      if(!db.objectStoreNames.contains(FOLDERS_STORE)){
        db.createObjectStore(FOLDERS_STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(storeName){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbPut(storeName, value){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(storeName, key){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function dbReplaceAll(items, folders){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([ITEMS_STORE, FOLDERS_STORE], "readwrite");
    const itemStore = tx.objectStore(ITEMS_STORE);
    const folderStore = tx.objectStore(FOLDERS_STORE);

    itemStore.clear();
    folderStore.clear();

    folders.forEach(folder => folderStore.put(folder));
    items.forEach(item => itemStore.put(item));

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function migrateLegacyLocalStorageIfNeeded(){
  const [existingItems, existingFolders] = await Promise.all([
    dbGetAll(ITEMS_STORE),
    dbGetAll(FOLDERS_STORE)
  ]);

  if(existingItems.length || existingFolders.length) return false;

  const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
  if(!raw) return false;

  try{
    const data = JSON.parse(raw);
    const folders = Array.isArray(data.folders) ? data.folders.map(normalizeFolder) : [];
    const validFolderIds = new Set(folders.map(f => f.id));

    const items = Array.isArray(data.items)
      ? data.items.map(normalizeItem).map(item => {
          if(!validFolderIds.has(item.folderId)) item.folderId = null;
          return item;
        })
      : [];

    if(!items.length && !folders.length) return false;

    await dbReplaceAll(items, folders);
    return true;
  }catch(e){
    console.error("Legacy migration failed:", e);
    return false;
  }
}

async function reloadState(){
  state.items = (await dbGetAll(ITEMS_STORE)).map(normalizeItem);
  state.folders = (await dbGetAll(FOLDERS_STORE))
    .map(normalizeFolder)
    .sort((a,b) => a.order - b.order || a.createdAt - b.createdAt);
}

function pad(n){ return String(n).padStart(2,"0"); }

function toLocalInput(ts){
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalInput(v){
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function formatDate(ts){
  return new Intl.DateTimeFormat("ja-JP",{
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit"
  }).format(new Date(ts));
}

function formatFileSize(bytes){
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bodyExcerpt(body){
  return String(body || "").replace(/\s+/g, " ").trim();
}

function visibleCounterpart(item){
  return item.sender || item.recipients || item.cc ? "" : item.counterpart;
}

function decodeMimeHeader(value){
  return String(value || "").replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (all, charset, encoding, encoded) => {
    try{
      let bytes;
      if(encoding.toLowerCase() === "b"){
        bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      }else{
        const source = encoded.replaceAll("_", " ");
        const values = [];
        for(let i = 0; i < source.length; i++){
          if(source[i] === "=" && /^[0-9a-f]{2}$/i.test(source.slice(i + 1, i + 3))){
            values.push(parseInt(source.slice(i + 1, i + 3), 16));
            i += 2;
          }else{
            values.push(source.charCodeAt(i));
          }
        }
        bytes = new Uint8Array(values);
      }
      return new TextDecoder(charset).decode(bytes);
    }catch(e){
      return all;
    }
  });
}

async function readTextFile(file){
  const buffer = await file.arrayBuffer();
  try{
    return new TextDecoder("utf-8", {fatal:true}).decode(buffer);
  }catch(e){
    return new TextDecoder("shift_jis").decode(buffer);
  }
}

function parseCybozuText(text, fileName=""){
  const normalized = String(text).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const separator = normalized.search(/\n[ \t]*\n/);
  const headerText = separator >= 0 ? normalized.slice(0, separator) : normalized;
  const body = separator >= 0 ? normalized.slice(separator).replace(/^\n[ \t]*\n/, "") : "";
  const headers = {};
  let currentKey = "";

  for(const line of headerText.split("\n")){
    const match = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if(match){
      currentKey = match[1].toLowerCase();
      headers[currentKey] = match[2];
    }else if(currentKey && /^[ \t]/.test(line)){
      headers[currentKey] += ` ${line.trim()}`;
    }
  }

  if(!headers.subject && !headers.from && !headers.to && !headers.date){
    throw new Error(`${fileName || "TXT"}: サイボウズのメール形式を確認できません`);
  }

  const parsedDate = Date.parse(headers.date || "");
  const sender = decodeMimeHeader(headers.from);
  return {
    title: decodeMimeHeader(headers.subject) || fileName.replace(/\.txt$/i, "") || "無題",
    sender,
    counterpart: sender,
    recipients: decodeMimeHeader(headers.to),
    cc: decodeMimeHeader(headers.cc),
    body: body.replace(/\s+$/, ""),
    mailDate: Number.isNaN(parsedDate) ? Date.now() : parsedDate
  };
}

async function importTextFiles(fileList){
  const files = [...(fileList || [])].filter(file => file.name.toLowerCase().endsWith(".txt") || file.type === "text/plain");
  if(!files.length){
    alert("取り込めるTXTファイルがありません。");
    return;
  }

  const parsed = [];
  const errors = [];
  for(const file of files){
    try{
      parsed.push(parseCybozuText(await readTextFile(file), file.name));
    }catch(e){
      errors.push(e.message);
    }
  }

  if(!parsed.length){
    alert(`取り込みに失敗しました。\n${errors.join("\n")}`);
    return;
  }

  const folderId = state.currentView.startsWith("folder:") ? state.currentView.slice(7) : null;
  const destination = folderId ? `フォルダ「${folderName(folderId)}」` : "未分類";
  if(!confirm(`${parsed.length}件のメールを${destination}へ取り込みます。よろしいですか？`)) return;

  const now = Date.now();
  try{
    await Promise.all(parsed.map((mail, index) => dbPut(ITEMS_STORE, {
      id: crypto.randomUUID(),
      ...mail,
      folderId,
      tags: ["サイボウズ取込"],
      attachments: [],
      favorite: false,
      createdAt: now + index,
      updatedAt: now + index
    })));
    await reloadState();
    refreshFolders();
    refreshTags();
    render();
    showToast(`${parsed.length}件を取り込みました${errors.length ? `（${errors.length}件失敗）` : ""}`);
    if(errors.length) alert(`次のファイルは取り込めませんでした。\n${errors.join("\n")}`);
  }catch(e){
    console.error(e);
    alert("メールを保存できませんでした。ブラウザの保存容量をご確認ください。");
  }
}

function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downloadAttachment(attachment){
  const a = document.createElement("a");
  a.href = attachment.data;
  a.download = attachment.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function renderEditorAttachments(){
  const attachments = state.editorAttachments;
  E.attachmentList.classList.toggle("empty-attachments", !attachments.length);
  E.attachmentList.innerHTML = attachments.length ? attachments.map(file => `
    <div class="attachment-row">
      <span class="attachment-icon">📎</span>
      <span class="attachment-name" title="${esc(file.name)}">${esc(file.name)}</span>
      <span class="attachment-size">${esc(formatFileSize(file.size))}</span>
      <button type="button" class="attachment-remove" data-remove-attachment="${esc(file.id)}" title="添付を外す">×</button>
    </div>
  `).join("") : "添付ファイルはありません。ここへドラッグ＆ドロップできます";
}

async function addAttachmentFiles(fileList){
  const files = [...(fileList || [])];
  if(!files.length) return;

  const oversized = files.find(file => file.size > MAX_ATTACHMENT_SIZE);
  if(oversized){
    alert(`「${oversized.name}」は25MBを超えているため添付できません。`);
    return;
  }

  const currentSize = state.editorAttachments.reduce((sum, file) => sum + file.size, 0);
  const addedSize = files.reduce((sum, file) => sum + file.size, 0);
  if(currentSize + addedSize > MAX_TOTAL_ATTACHMENT_SIZE){
    alert("添付ファイルの合計は50MBまでです。");
    return;
  }

  try{
    const added = await Promise.all(files.map(async file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      data: await fileToDataUrl(file)
    })));
    state.editorAttachments.push(...added);
    renderEditorAttachments();
  }catch(e){
    console.error(e);
    alert("添付ファイルを読み込めませんでした。");
  }
}

function folderName(id){
  if(!id) return "未分類";
  return state.folders.find(f => f.id === id)?.name || "未分類";
}

function viewName(){
  if(state.currentView === "all") return "すべて";
  if(state.currentView === "favorites") return "お気に入り";
  if(state.currentView === "unfiled") return "未分類";
  if(state.currentView.startsWith("folder:")) return folderName(state.currentView.slice(7));
  return "すべて";
}

function showToast(message){
  E.toast.textContent = message;
  E.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => E.toast.classList.add("hidden"), 1800);
}

function refreshFolderSelect(selected=""){
  E.folderSelect.innerHTML =
    `<option value="">未分類</option>` +
    state.folders.map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join("");
  E.folderSelect.value = selected || "";
}

function refreshCounts(){
  E.countAll.textContent = state.items.length;
  E.countFavorites.textContent = state.items.filter(x => x.favorite).length;
  E.countUnfiled.textContent = state.items.filter(x => !x.folderId).length;
}

function refreshFolders(){
  refreshCounts();

  const folderSelected = state.currentView.startsWith("folder:");
  E.exportFolderBtn.disabled = !folderSelected;
  E.exportFolderBtn.title = folderSelected
    ? `「${folderName(state.currentView.slice(7))}」をバックアップ`
    : "フォルダを選択すると使用できます";

  E.folderList.innerHTML = state.folders.map(f => `
    <div class="folder-row" data-folder-row="${esc(f.id)}">
      <button class="folder-drag-handle" draggable="true" data-folder-drag="${esc(f.id)}" title="ドラッグして並べ替え" aria-label="${esc(f.name)}を並べ替え">⠿</button>
      <button class="folder-button ${state.currentView === `folder:${f.id}` ? "active" : ""}"
              data-view="folder:${esc(f.id)}"
              data-drop="folder:${esc(f.id)}">
        <span>📁 ${esc(f.name)}</span>
        <b>${state.items.filter(x => x.folderId === f.id).length}</b>
      </button>
      <button class="folder-delete" data-delete-folder="${esc(f.id)}" title="削除">×</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
  });

  bindDropTargets();
  bindFolderReordering();
}

function isFolderDrag(dataTransfer){
  return [...(dataTransfer?.types || [])].includes("application/x-mail-folder-id");
}

function clearFolderDragStyles(){
  document.querySelectorAll(".folder-dragging,.folder-drop-before,.folder-drop-after")
    .forEach(node => node.classList.remove("folder-dragging","folder-drop-before","folder-drop-after"));
}

function bindFolderReordering(){
  document.querySelectorAll("[data-folder-drag]").forEach(handle => {
    handle.addEventListener("dragstart", e => {
      e.stopPropagation();
      state.draggingFolderId = handle.dataset.folderDrag;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/x-mail-folder-id", handle.dataset.folderDrag);
      handle.closest(".folder-row")?.classList.add("folder-dragging");
    });
    handle.addEventListener("dragend", () => {
      state.draggingFolderId = null;
      clearFolderDragStyles();
    });
  });

  document.querySelectorAll("[data-folder-row]").forEach(row => {
    row.addEventListener("dragover", e => {
      if(!isFolderDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      clearFolderDragStyles();
      const draggedId = state.draggingFolderId;
      document.querySelector(`[data-folder-row="${CSS.escape(draggedId)}"]`)?.classList.add("folder-dragging");
      const after = e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
      row.classList.add(after ? "folder-drop-after" : "folder-drop-before");
      e.dataTransfer.dropEffect = "move";
    });

    row.addEventListener("drop", async e => {
      if(!isFolderDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData("application/x-mail-folder-id") || state.draggingFolderId;
      const targetId = row.dataset.folderRow;
      const placeAfter = row.classList.contains("folder-drop-after");
      state.draggingFolderId = null;
      clearFolderDragStyles();
      if(!draggedId || draggedId === targetId) return;

      const reordered = state.folders.filter(folder => folder.id !== draggedId);
      let targetIndex = reordered.findIndex(folder => folder.id === targetId);
      if(targetIndex < 0) return;
      if(placeAfter) targetIndex += 1;
      const draggedFolder = state.folders.find(folder => folder.id === draggedId);
      reordered.splice(targetIndex, 0, draggedFolder);

      await Promise.all(reordered.map((folder, order) => dbPut(FOLDERS_STORE, {...folder, order})));
      await reloadState();
      refreshFolders();
      refreshFolderSelect(E.folderSelect.value);
      showToast("フォルダの順番を変更しました");
    });
  });
}

function refreshTags(){
  const current = E.tagFilter.value;
  const tags = [...new Set(state.items.flatMap(x => x.tags || []))]
    .sort((a,b) => a.localeCompare(b,"ja"));

  E.tagFilter.innerHTML =
    `<option value="">すべてのタグ</option>` +
    tags.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");

  if(tags.includes(current)) E.tagFilter.value = current;
}

function matchesView(item){
  if(state.currentView === "all") return true;
  if(state.currentView === "favorites") return item.favorite;
  if(state.currentView === "unfiled") return !item.folderId;

  if(state.currentView.startsWith("folder:")){
    return item.folderId === state.currentView.slice(7);
  }

  return true;
}

function filteredItems(){
  const q = E.searchInput.value.trim().toLowerCase();
  const tag = E.tagFilter.value;

  return state.items
    .filter(item => {
      const haystack = [
        item.title,
        item.counterpart,
        item.sender,
        item.recipients,
        item.cc,
        item.body,
        ...(item.attachments || []).map(file => file.name),
        ...(item.tags || [])
      ].join("\n").toLowerCase();

      return matchesView(item)
        && (!q || haystack.includes(q))
        && (!tag || item.tags.includes(tag));
    })
    .sort((a,b) => b.mailDate - a.mailDate);
}

function render(){
  const items = filteredItems();
  E.viewTitle.textContent = viewName();
  E.resultCount.textContent = `${items.length}件`;
  E.cardList.classList.toggle("line-list", state.viewMode === "line");
  E.cardViewBtn.classList.toggle("active", state.viewMode === "card");
  E.lineViewBtn.classList.toggle("active", state.viewMode === "line");
  E.cardViewBtn.setAttribute("aria-pressed", String(state.viewMode === "card"));
  E.lineViewBtn.setAttribute("aria-pressed", String(state.viewMode === "line"));

  if(!items.length){
    E.cardList.innerHTML = `<div class="empty">該当するメール文章がありません。</div>`;
    return;
  }

  E.cardList.innerHTML = state.viewMode === "line"
    ? items.map(item => `
    <article class="card line-card" draggable="true" data-id="${esc(item.id)}">
      <button class="star-button ${item.favorite ? "on" : ""}" data-action="favorite" title="お気に入り">
        ${item.favorite ? "★" : "☆"}
      </button>
      <h3 title="${esc(item.title)}">${esc(item.title)}</h3>
      <span class="line-excerpt" title="${esc(bodyExcerpt(item.body))}">${esc(bodyExcerpt(item.body))}</span>
      <span class="line-counterpart" title="${esc(visibleCounterpart(item))}">${visibleCounterpart(item) ? `👤 ${esc(visibleCounterpart(item))}` : ""}</span>
      <span class="line-folder" title="${esc(folderName(item.folderId))}">📁 ${esc(folderName(item.folderId))}</span>
      <span class="line-tags" title="${esc(item.tags.join(", "))}">${item.tags.map(t => `#${esc(t)}`).join(" ")}</span>
      <span class="line-attachment">
        ${item.attachments.map(file => `
          <button type="button" class="attachment-link" data-item-id="${esc(item.id)}" data-download-attachment="${esc(file.id)}" title="${esc(file.name)} をダウンロード">📎 ${esc(file.name)}</button>
        `).join("")}
      </span>
      <span class="card-date">${esc(formatDate(item.mailDate))}</span>
      <div class="line-actions">
        <button class="sub-button" data-action="copy" title="本文コピー">コピー</button>
        <button class="sub-button" data-action="edit">編集</button>
        <button class="danger-button" data-action="delete">削除</button>
      </div>
    </article>
  `).join("")
    : items.map(item => `
    <article class="card" draggable="true" data-id="${esc(item.id)}">
      <div class="card-top">
        <div class="card-title-area">
          <button class="star-button ${item.favorite ? "on" : ""}" data-action="favorite">
            ${item.favorite ? "★" : "☆"}
          </button>
          <h3>${esc(item.title)}</h3>
          <div class="meta">
            <span class="pill">📁 ${esc(folderName(item.folderId))}</span>
            ${visibleCounterpart(item) ? `<span class="pill">👤 ${esc(visibleCounterpart(item))}</span>` : ""}
            ${item.attachments.length ? `<span class="pill">📎 ${item.attachments.length}件</span>` : ""}
          </div>
        </div>
        <span class="card-date">${esc(formatDate(item.mailDate))}</span>
      </div>

      <div class="card-body">${esc(item.body)}</div>

      ${item.attachments.length ? `
        <div class="card-attachments">
          ${item.attachments.map(file => `
            <button type="button" class="attachment-link" data-item-id="${esc(item.id)}" data-download-attachment="${esc(file.id)}" title="${esc(formatFileSize(file.size))}">📎 ${esc(file.name)}</button>
          `).join("")}
        </div>
      ` : ""}

      <div class="tags">
        ${item.tags.map(t => `<span class="pill">#${esc(t)}</span>`).join("")}
      </div>

      <div class="card-actions">
        <button class="sub-button" data-action="copy">本文コピー</button>
        <button class="sub-button" data-action="edit">編集</button>
        <button class="danger-button delete" data-action="delete">削除</button>
      </div>
    </article>
  `).join("");

  bindCards();
}

function openEditor(item=null){
  closeViewer();
  state.editingId = item?.id || null;
  E.editorHeading.textContent = item ? "メール文章を編集" : "メール文章を保存";
  E.titleInput.value = item?.title || "";
  E.counterpartInput.value = item?.counterpart || "";
  refreshFolderSelect(item?.folderId || "");
  E.mailDateInput.value = toLocalInput(item?.mailDate || Date.now());
  E.bodyInput.value = item?.body || "";
  state.editorAttachments = (item?.attachments || []).map(file => ({...file}));
  E.attachmentInput.value = "";
  renderEditorAttachments();
  E.tagsInput.value = item?.tags?.join(", ") || "";
  E.favoriteInput.checked = item?.favorite || false;
  E.editorPanel.classList.remove("hidden");
  E.titleInput.focus();
  window.scrollTo({top:0,behavior:"smooth"});
}

function closeEditor(){
  state.editingId = null;
  state.editorAttachments = [];
  E.attachmentInput.value = "";
  E.editorPanel.classList.add("hidden");
}

async function saveCurrent(){
  const body = E.bodyInput.value.trim();

  if(!body){
    alert("メール文章を入力してください。");
    return;
  }

  const now = Date.now();
  let item;

  if(state.editingId){
    const old = state.items.find(x => x.id === state.editingId);
    if(!old) return;

    item = {
      ...old,
      title: E.titleInput.value.trim() || "無題",
      counterpart: E.counterpartInput.value.trim(),
      folderId: E.folderSelect.value || null,
      mailDate: parseLocalInput(E.mailDateInput.value),
      body,
      attachments: state.editorAttachments,
      tags: normalizeTags(E.tagsInput.value),
      favorite: E.favoriteInput.checked,
      updatedAt: now
    };
  }else{
    item = {
      id: crypto.randomUUID(),
      title: E.titleInput.value.trim() || "無題",
      counterpart: E.counterpartInput.value.trim(),
      folderId: E.folderSelect.value || null,
      mailDate: parseLocalInput(E.mailDateInput.value),
      body,
      attachments: state.editorAttachments,
      tags: normalizeTags(E.tagsInput.value),
      favorite: E.favoriteInput.checked,
      createdAt: now,
      updatedAt: now
    };
  }

  try{
    await dbPut(ITEMS_STORE, item);
    await reloadState();

    closeEditor();
    refreshFolders();
    refreshTags();
    render();
    showToast("保存しました");
  }catch(e){
    console.error(e);
    alert("保存できませんでした。ブラウザの保存容量をご確認いただくか、添付ファイルを減らして再度お試しください。");
  }
}

function openViewer(item){
  state.viewerId = item.id;
  const hasImportedHeaders = Boolean(item.sender || item.recipients || item.cc);
  E.viewerTitle.textContent = item.title;
  E.viewerMeta.innerHTML =
    `<span>📁 ${esc(folderName(item.folderId))}</span>` +
    (!hasImportedHeaders && item.counterpart ? `<span>👤 ${esc(item.counterpart)}</span>` : "") +
    `<span>🕒 ${esc(formatDate(item.mailDate))}</span>`;
  E.viewerHeaderBtn.classList.toggle("hidden", !hasImportedHeaders);
  E.viewerHeaderBtn.setAttribute("aria-expanded", "false");
  E.viewerHeaderBtn.textContent = "メール情報";
  E.viewerHeaderDetails.classList.add("hidden");
  E.viewerHeaderDetails.innerHTML = hasImportedHeaders ? `
    ${item.sender ? `<div><b>From</b><span>${esc(item.sender)}</span></div>` : ""}
    ${item.recipients ? `<div><b>To</b><span>${esc(item.recipients)}</span></div>` : ""}
    ${item.cc ? `<div><b>Cc</b><span>${esc(item.cc)}</span></div>` : ""}
  ` : "";
  E.viewerTags.innerHTML = item.tags.map(t => `<span class="pill">#${esc(t)}</span>`).join("");
  E.viewerBody.textContent = item.body;
  E.viewerAttachments.classList.toggle("hidden", !item.attachments.length);
  E.viewerAttachments.innerHTML = item.attachments.length ? `
    <div class="viewer-attachment-title">📎 添付ファイル（${item.attachments.length}件）</div>
    <div class="viewer-attachment-list">
      ${item.attachments.map(file => `
        <button type="button" class="viewer-attachment" data-download-attachment="${esc(file.id)}">
          <span>${esc(file.name)}</span><small>${esc(formatFileSize(file.size))}</small><b>ダウンロード</b>
        </button>
      `).join("")}
    </div>
  ` : "";
  E.viewerFavoriteBtn.textContent = item.favorite ? "★" : "☆";
  E.viewerFavoriteBtn.classList.toggle("on", item.favorite);
  E.viewerModal.classList.remove("maximized");
  E.viewerMaxBtn.textContent = "⛶";
  E.viewerMaxBtn.title = "最大化";
  E.viewerOverlay.classList.remove("hidden");
  E.viewerOverlay.setAttribute("aria-hidden","false");
}

function closeViewer(){
  state.viewerId = null;
  E.viewerOverlay.classList.add("hidden");
  E.viewerOverlay.setAttribute("aria-hidden","true");
  E.viewerModal.classList.remove("maximized");
}

function viewerItem(){
  return state.items.find(x => x.id === state.viewerId);
}

function bindCards(){
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("dragstart", e => {
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.id);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(x => x.classList.remove("drag-over"));
    });

    card.addEventListener("click", e => {
      if(e.target.closest("button")) return;
      const item = state.items.find(x => x.id === card.dataset.id);
      if(item) openViewer(item);
    });
  });
}

function bindDropTargets(){
  document.querySelectorAll("[data-drop]").forEach(target => {
    target.addEventListener("dragover", e => {
      if(isFolderDrag(e.dataTransfer)) return;
      e.preventDefault();
      target.classList.add("drag-over");
    });

    target.addEventListener("dragleave", () => target.classList.remove("drag-over"));

    target.addEventListener("drop", async e => {
      if(isFolderDrag(e.dataTransfer)) return;
      e.preventDefault();
      target.classList.remove("drag-over");

      const item = state.items.find(x => x.id === e.dataTransfer.getData("text/plain"));
      if(!item) return;

      const drop = target.dataset.drop;
      const updated = {...item, updatedAt: Date.now()};

      if(drop === "favorites"){
        updated.favorite = true;
      }else if(drop === "unfiled"){
        updated.folderId = null;
      }else if(drop.startsWith("folder:")){
        updated.folderId = drop.slice(7);
      }

      await dbPut(ITEMS_STORE, updated);
      await reloadState();

      refreshFolders();
      render();
      showToast("移動しました");
    });
  });
}

E.newBtn.addEventListener("click", () => openEditor());
E.closeEditorBtn.addEventListener("click", closeEditor);
E.cancelBtn.addEventListener("click", closeEditor);
E.saveBtn.addEventListener("click", saveCurrent);
E.nowBtn.addEventListener("click", () => E.mailDateInput.value = toLocalInput(Date.now()));
E.attachmentInput.addEventListener("change", async () => {
  await addAttachmentFiles(E.attachmentInput.files);
  E.attachmentInput.value = "";
});

let attachmentDragDepth = 0;

E.attachmentDropZone.addEventListener("dragenter", e => {
  e.preventDefault();
  attachmentDragDepth += 1;
  E.attachmentDropZone.classList.add("drag-over");
});

E.attachmentDropZone.addEventListener("dragover", e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

E.attachmentDropZone.addEventListener("dragleave", e => {
  e.preventDefault();
  attachmentDragDepth = Math.max(0, attachmentDragDepth - 1);
  if(!attachmentDragDepth) E.attachmentDropZone.classList.remove("drag-over");
});

E.attachmentDropZone.addEventListener("drop", async e => {
  e.preventDefault();
  attachmentDragDepth = 0;
  E.attachmentDropZone.classList.remove("drag-over");
  await addAttachmentFiles(e.dataTransfer.files);
});
E.searchInput.addEventListener("input", render);
E.tagFilter.addEventListener("change", render);
E.txtImportInput.addEventListener("change", async () => {
  await importTextFiles(E.txtImportInput.files);
  E.txtImportInput.value = "";
});

E.txtImportDrop.addEventListener("dragover", e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
  E.txtImportDrop.classList.add("drag-over");
});
E.txtImportDrop.addEventListener("dragleave", () => E.txtImportDrop.classList.remove("drag-over"));
E.txtImportDrop.addEventListener("drop", async e => {
  e.preventDefault();
  E.txtImportDrop.classList.remove("drag-over");
  await importTextFiles(e.dataTransfer.files);
});
E.cardViewBtn.addEventListener("click", () => setViewMode("card"));
E.lineViewBtn.addEventListener("click", () => setViewMode("line"));

function setViewMode(mode){
  state.viewMode = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
  render();
}

E.addFolderBtn.addEventListener("click", async () => {
  const name = prompt("新しいフォルダ名を入力してください")?.trim();
  if(!name) return;

  if(state.folders.some(f => f.name === name)){
    alert("同じ名前のフォルダがあります。");
    return;
  }

  const folder = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    order: state.folders.length
      ? Math.max(...state.folders.map(folder => folder.order)) + 1
      : 0
  };

  await dbPut(FOLDERS_STORE, folder);
  await reloadState();

  refreshFolders();
  refreshFolderSelect();
  showToast("フォルダを作成しました");
});

document.addEventListener("click", async e => {
  const removeAttachment = e.target.closest("[data-remove-attachment]");
  if(removeAttachment){
    state.editorAttachments = state.editorAttachments.filter(file => file.id !== removeAttachment.dataset.removeAttachment);
    renderEditorAttachments();
    return;
  }

  const downloadBtn = e.target.closest("[data-download-attachment]");
  if(downloadBtn){
    const item = downloadBtn.dataset.itemId
      ? state.items.find(x => x.id === downloadBtn.dataset.itemId)
      : viewerItem();
    const attachment = item?.attachments.find(file => file.id === downloadBtn.dataset.downloadAttachment);
    if(attachment) downloadAttachment(attachment);
    return;
  }

  const view = e.target.closest("[data-view]");

  if(view){
    state.currentView = view.dataset.view;
    refreshFolders();
    render();
    return;
  }

  const delFolder = e.target.closest("[data-delete-folder]");

  if(delFolder){
    const id = delFolder.dataset.deleteFolder;
    const folder = state.folders.find(f => f.id === id);
    if(!folder) return;

    if(!confirm(`フォルダ「${folder.name}」を削除しますか？\n中の文章は未分類になります。`)) return;

    const affected = state.items.filter(item => item.folderId === id);

    for(const item of affected){
      await dbPut(ITEMS_STORE, {
        ...item,
        folderId: null,
        updatedAt: Date.now()
      });
    }

    await dbDelete(FOLDERS_STORE, id);
    await reloadState();

    if(state.currentView === `folder:${id}`) state.currentView = "all";

    refreshFolders();
    refreshFolderSelect();
    render();
    return;
  }

  const actionBtn = e.target.closest("[data-action]");
  if(!actionBtn) return;

  const card = actionBtn.closest(".card");
  const item = state.items.find(x => x.id === card?.dataset.id);
  if(!item) return;

  const action = actionBtn.dataset.action;

  if(action === "copy"){
    await navigator.clipboard.writeText(item.body);
    showToast("本文をコピーしました");
  }

  if(action === "edit"){
    openEditor(item);
  }

  if(action === "favorite"){
    await dbPut(ITEMS_STORE, {
      ...item,
      favorite: !item.favorite,
      updatedAt: Date.now()
    });

    await reloadState();
    refreshFolders();
    render();
  }

  if(action === "delete"){
    if(!confirm(`「${item.title}」を削除しますか？`)) return;

    await dbDelete(ITEMS_STORE, item.id);
    await reloadState();

    refreshFolders();
    refreshTags();
    render();
    showToast("削除しました");
  }
});

E.viewerCloseBtn.addEventListener("click", closeViewer);

E.viewerOverlay.addEventListener("click", e => {
  if(e.target === E.viewerOverlay) closeViewer();
});

document.addEventListener("keydown", e => {
  if(e.key === "Escape" && !E.viewerOverlay.classList.contains("hidden")){
    closeViewer();
  }
});

E.viewerMaxBtn.addEventListener("click", () => {
  const on = E.viewerModal.classList.toggle("maximized");
  E.viewerMaxBtn.textContent = on ? "🗗" : "⛶";
  E.viewerMaxBtn.title = on ? "元のサイズに戻す" : "最大化";
});

E.viewerHeaderBtn.addEventListener("click", () => {
  const expanded = E.viewerHeaderDetails.classList.toggle("hidden") === false;
  E.viewerHeaderBtn.setAttribute("aria-expanded", String(expanded));
  E.viewerHeaderBtn.textContent = expanded ? "メール情報を閉じる" : "メール情報";
});

E.viewerCopyBtn.addEventListener("click", async () => {
  const item = viewerItem();
  if(!item) return;

  await navigator.clipboard.writeText(item.body);
  showToast("本文をコピーしました");
});

E.viewerEditBtn.addEventListener("click", () => {
  const item = viewerItem();
  if(item) openEditor(item);
});

E.viewerDeleteBtn.addEventListener("click", async () => {
  const item = viewerItem();
  if(!item) return;

  if(!confirm(`「${item.title}」を削除しますか？`)) return;

  await dbDelete(ITEMS_STORE, item.id);
  await reloadState();

  closeViewer();
  refreshFolders();
  refreshTags();
  render();
  showToast("削除しました");
});

E.viewerFavoriteBtn.addEventListener("click", async () => {
  const item = viewerItem();
  if(!item) return;

  await dbPut(ITEMS_STORE, {
    ...item,
    favorite: !item.favorite,
    updatedAt: Date.now()
  });

  await reloadState();
  const updated = state.items.find(x => x.id === item.id);

  E.viewerFavoriteBtn.textContent = updated.favorite ? "★" : "☆";
  E.viewerFavoriteBtn.classList.toggle("on", updated.favorite);

  refreshFolders();
  render();
});

E.exportBtn.addEventListener("click", async () => {
  await reloadState();

  const data = {
    app: "メール文章ライブラリ",
    storage: "IndexedDB",
    version: 3,
    scope: "all",
    exportedAt: new Date().toISOString(),
    folders: state.folders,
    items: state.items
  };

  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `mail-text-library-${new Date().toISOString().slice(0,10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

E.exportFolderBtn.addEventListener("click", async () => {
  if(!state.currentView.startsWith("folder:")) return;

  await reloadState();
  const folderId = state.currentView.slice(7);
  const folder = state.folders.find(x => x.id === folderId);
  if(!folder){
    alert("選択中のフォルダが見つかりませんでした。");
    return;
  }

  const items = state.items.filter(item => item.folderId === folderId);
  const data = {
    app: "メール文章ライブラリ",
    storage: "IndexedDB",
    version: 3,
    scope: "folder",
    exportedAt: new Date().toISOString(),
    folders: [folder],
    items
  };

  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = folder.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "folder";

  a.href = url;
  a.download = `mail-folder-${safeName}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showToast(`「${folder.name}」をバックアップしました`);
});

E.importInput.addEventListener("change", async () => {
  const file = E.importInput.files?.[0];
  if(!file) return;

  try{
    const data = JSON.parse(await file.text());

    const folders =
      Array.isArray(data.folders) ? data.folders :
      Array.isArray(data.emailFolders) ? data.emailFolders :
      [];

    const rawItems =
      Array.isArray(data.items) ? data.items :
      Array.isArray(data.emailTemplates) ? data.emailTemplates :
      Array.isArray(data) ? data :
      null;

    if(!Array.isArray(rawItems)) throw new Error("invalid");

    const folderBackup = data.scope === "folder";
    const confirmMessage = folderBackup
      ? `${rawItems.length}件のフォルダバックアップを復元します。\n現在のデータへ追加・更新されます。よろしいですか？`
      : `${rawItems.length}件を復元します。\n現在のデータは置き換えられます。よろしいですか？`;
    if(!confirm(confirmMessage)) return;

    const normalizedFolders = folders
      .filter(f => f && f.name)
      .map(normalizeFolder);

    const validFolders = new Set(normalizedFolders.map(f => f.id));

    const normalizedItems = rawItems.map(x => {
      const item = normalizeItem(x);
      if(!validFolders.has(item.folderId)) item.folderId = null;
      return item;
    });

    if(folderBackup){
      const currentItems = (await dbGetAll(ITEMS_STORE)).map(normalizeItem);
      const currentFolders = (await dbGetAll(FOLDERS_STORE)).map(normalizeFolder);
      const mergedFolders = new Map(currentFolders.map(folder => [folder.id, folder]));
      const mergedItems = new Map(currentItems.map(item => [item.id, item]));
      normalizedFolders.forEach(folder => mergedFolders.set(folder.id, folder));
      normalizedItems.forEach(item => mergedItems.set(item.id, item));
      await dbReplaceAll([...mergedItems.values()], [...mergedFolders.values()]);
    }else{
      await dbReplaceAll(normalizedItems, normalizedFolders);
    }
    await reloadState();

    state.currentView = "all";
    refreshFolders();
    refreshTags();
    render();
    showToast("復元しました");
  }catch(e){
    console.error(e);
    alert("バックアップファイルを読み込めませんでした。");
  }finally{
    E.importInput.value = "";
  }
});

async function init(){
  try{
    const migrated = await migrateLegacyLocalStorageIfNeeded();
    await reloadState();

    refreshFolders();
    refreshTags();
    render();

    if(migrated){
      showToast("旧localStorageデータをIndexedDBへ移行しました");
    }
  }catch(e){
    console.error(e);
    alert("IndexedDBの初期化に失敗しました。ブラウザ設定をご確認ください。");
  }
}

init();
