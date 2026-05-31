import {
  initDb, getExercises, addExercise, addEntry, updateEntry, deleteEntry,
  getEntriesForDate, getEntryCountForDate, getRecentEntriesForExercise,
  getAllEntryDates, getAllEntries,
} from './db.js';
import {
  renderExerciseDropdown, renderSets, addSetRow, removeSetRow,
  collectSets, renderHistory, renderSummary, renderCurrentSession,
  renderDateList, renderDayDetail, showToast,
} from './ui.js';

const exerciseSelect  = document.getElementById('exercise-select');
const newExerciseBtn  = document.getElementById('new-exercise-btn');
const newExerciseRow  = document.getElementById('new-exercise-row');
const newExerciseName = document.getElementById('new-exercise-name');
const newExerciseGroup = document.getElementById('new-exercise-group');
const newExerciseDuration = document.getElementById('new-exercise-duration');
const saveExerciseBtn = document.getElementById('save-exercise-btn');

const entryPanel  = document.getElementById('entry-panel');
const entryDate   = document.getElementById('entry-date');
const setsListEl  = document.getElementById('sets-list');
const addSetBtn   = document.getElementById('add-set-btn');
const saveEntryBtn = document.getElementById('save-entry-btn');
const clearBtn    = document.getElementById('clear-btn');

const historyContent = document.getElementById('history-content');
const summaryContent = document.getElementById('summary-content');
const sessionContent = document.getElementById('session-content');

const mainView      = document.getElementById('main-view');
const recordsView   = document.getElementById('records-view');
const recordsContent = document.getElementById('records-content');
const recordsBackBtn = document.getElementById('records-back-btn');
const exportJsonBtn  = document.getElementById('export-json-btn');

const editModal          = document.getElementById('edit-modal');
const editExerciseSelect = document.getElementById('edit-exercise-select');
const editEntryDateEl    = document.getElementById('edit-entry-date');
const editSetsList     = document.getElementById('edit-sets-list');
const editAddSetBtn    = document.getElementById('edit-add-set-btn');
const editSaveBtn      = document.getElementById('edit-save-btn');
const editCancelBtn    = document.getElementById('edit-cancel-btn');
const confirmModal     = document.getElementById('confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

let exercises = [];
let selectedExercise = null;
let recordsState = 'dates';
let currentDetailDate = null;
let sessionEntries = [];
let detailEntries = [];
let editingEntry = null;
let editExerciseType = null;
let pendingDeleteId = null;

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function refreshSummary() {
  const date = entryDate.value || today();
  const entries = await getEntriesForDate(date);
  renderSummary(summaryContent, entries, exercises);
}

async function refreshCurrentSession() {
  const date = entryDate.value || today();
  const entries = await getEntriesForDate(date);
  sessionEntries = entries;
  renderCurrentSession(sessionContent, entries, exercises, {
    onEdit: handleEditEntry,
    onDelete: handleDeleteEntry,
  });
}

async function refreshHistory() {
  if (!selectedExercise) {
    historyContent.innerHTML = '<p class="muted-text">Select an exercise to see recent history.</p>';
    return;
  }
  const entries = await getRecentEntriesForExercise(selectedExercise.id);
  renderHistory(historyContent, entries, exercises);
}

// ── Records view ────────────────────────────────────────────────────────────

async function openRecords() {
  mainView.hidden = true;
  recordsView.hidden = false;
  recordsState = 'dates';
  currentDetailDate = null;
  detailEntries = [];
  const dates = await getAllEntryDates();
  renderDateList(recordsContent, dates, showDayDetail);
}

function closeRecords() {
  recordsView.hidden = true;
  mainView.hidden = false;
  currentDetailDate = null;
  detailEntries = [];
}

async function showDayDetail(date) {
  recordsState = 'detail';
  currentDetailDate = date;
  const entries = await getEntriesForDate(date);
  detailEntries = entries;
  renderDayDetail(recordsContent, entries, exercises, date, {
    onEdit: handleEditEntry,
    onDelete: handleDeleteEntry,
  });
}

document.getElementById('records-btn').addEventListener('click', openRecords);

recordsBackBtn.addEventListener('click', async () => {
  if (recordsState === 'detail') {
    recordsState = 'dates';
    currentDetailDate = null;
    detailEntries = [];
    const dates = await getAllEntryDates();
    renderDateList(recordsContent, dates, showDayDetail);
  } else {
    closeRecords();
  }
});

exportJsonBtn.addEventListener('click', async () => {
  const [allEntries, allExercises] = await Promise.all([getAllEntries(), getExercises()]);
  const data = { exercises: allExercises, entries: allEntries };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exercise-tracker-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── New exercise ─────────────────────────────────────────────────────────────

newExerciseBtn.addEventListener('click', () => {
  newExerciseRow.hidden = !newExerciseRow.hidden;
});

saveExerciseBtn.addEventListener('click', async () => {
  const name = newExerciseName.value.trim();
  if (!name) {
    showToast('Please enter an exercise name.');
    return;
  }

  try {
    const id = await addExercise({
      name,
      group: newExerciseGroup.value,
      type: newExerciseDuration.checked ? 'Duration' : 'Reps',
    });

    exercises = await getExercises();
    renderExerciseDropdown(exerciseSelect, exercises);
    exerciseSelect.value = String(id);
    exerciseSelect.dispatchEvent(new Event('change'));

    newExerciseRow.hidden = true;
    newExerciseName.value = '';
    newExerciseDuration.checked = false;

    showToast('Exercise added.');
  } catch (e) {
    showToast('Error saving exercise.');
    console.error(e);
  }
});

// ── Exercise selection ────────────────────────────────────────────────────────

exerciseSelect.addEventListener('change', async () => {
  const id = parseInt(exerciseSelect.value, 10);
  selectedExercise = exercises.find(e => e.id === id) || null;

  if (selectedExercise) {
    entryPanel.hidden = false;
    renderSets(setsListEl, selectedExercise.type);
    await refreshHistory();
  } else {
    entryPanel.hidden = true;
    historyContent.innerHTML = '<p class="muted-text">Select an exercise to see recent history.</p>';
  }
});

entryDate.addEventListener('change', () => { refreshSummary(); refreshCurrentSession(); });

// ── Entry form ────────────────────────────────────────────────────────────────

addSetBtn.addEventListener('click', () => {
  if (selectedExercise) addSetRow(setsListEl, selectedExercise.type);
});

setsListEl.addEventListener('click', e => {
  const btn = e.target.closest('.remove-set');
  if (!btn) return;
  removeSetRow(setsListEl, parseInt(btn.dataset.index, 10));
});

saveEntryBtn.addEventListener('click', async () => {
  if (!selectedExercise) {
    showToast('Please select an exercise.');
    return;
  }

  const date = entryDate.value;
  if (!date) {
    showToast('Please select a date.');
    return;
  }

  const sets = collectSets(setsListEl, selectedExercise.type);
  if (!sets.length) {
    const field = selectedExercise.type === 'Reps' ? 'reps' : 'time';
    showToast(`At least one set needs a ${field} value.`);
    return;
  }

  try {
    const orderPosition = (await getEntryCountForDate(date)) + 1;
    await addEntry({ exerciseId: selectedExercise.id, date, orderPosition, sets });
    renderSets(setsListEl, selectedExercise.type);
    await Promise.all([refreshHistory(), refreshSummary(), refreshCurrentSession()]);
    showToast('Entry saved.');
  } catch (e) {
    showToast('Error saving entry.');
    console.error(e);
  }
});

clearBtn.addEventListener('click', () => {
  if (selectedExercise) renderSets(setsListEl, selectedExercise.type);
});

// ── Edit modal ────────────────────────────────────────────────────────────────

function handleEditEntry(id) {
  const entry = [...sessionEntries, ...detailEntries].find(e => e.id === id);
  if (!entry) return;
  const exercise = exercises.find(e => e.id === entry.exerciseId);
  editingEntry = entry;
  editExerciseType = exercise?.type || 'Reps';

  renderExerciseDropdown(editExerciseSelect, exercises);
  editExerciseSelect.value = String(entry.exerciseId);

  editEntryDateEl.value = entry.date;
  editSetsList.innerHTML = '';
  for (const _set of entry.sets) {
    addSetRow(editSetsList, editExerciseType);
  }
  const rows = editSetsList.querySelectorAll('.set-row');
  entry.sets.forEach((set, i) => {
    rows[i].querySelector('.set-primary').value = set.reps ?? set.timeSeconds ?? '';
    rows[i].querySelector('.set-weight').value = set.weightLbs ?? '';
  });
  editModal.hidden = false;
}

editExerciseSelect.addEventListener('change', () => {
  const id = parseInt(editExerciseSelect.value, 10);
  const ex = exercises.find(e => e.id === id);
  if (!ex) return;
  if (ex.type !== editExerciseType) {
    editExerciseType = ex.type;
    editSetsList.innerHTML = '';
    addSetRow(editSetsList, ex.type);
  }
});

editAddSetBtn.addEventListener('click', () => {
  if (!editingEntry) return;
  addSetRow(editSetsList, editExerciseType || 'Reps');
});

editSetsList.addEventListener('click', e => {
  const btn = e.target.closest('.remove-set');
  if (!btn) return;
  removeSetRow(editSetsList, parseInt(btn.dataset.index, 10));
});

editCancelBtn.addEventListener('click', () => {
  editModal.hidden = true;
  editingEntry = null;
});

editModal.addEventListener('click', e => {
  if (e.target === editModal) {
    editModal.hidden = true;
    editingEntry = null;
  }
});

editSaveBtn.addEventListener('click', async () => {
  if (!editingEntry) return;
  const exerciseId = parseInt(editExerciseSelect.value, 10);
  const exercise = exercises.find(e => e.id === exerciseId);
  const date = editEntryDateEl.value;
  if (!date) {
    showToast('Please select a date.');
    return;
  }
  const sets = collectSets(editSetsList, exercise?.type || 'Reps');
  if (!sets.length) {
    const field = exercise?.type === 'Reps' ? 'reps' : 'time';
    showToast(`At least one set needs a ${field} value.`);
    return;
  }
  try {
    await updateEntry(editingEntry.id, { exerciseId, date, sets });
    editModal.hidden = true;
    editingEntry = null;
    await Promise.all([refreshSummary(), refreshCurrentSession(), refreshHistory()]);
    if (currentDetailDate) {
      const entries = await getEntriesForDate(currentDetailDate);
      detailEntries = entries;
      renderDayDetail(recordsContent, entries, exercises, currentDetailDate, {
        onEdit: handleEditEntry,
        onDelete: handleDeleteEntry,
      });
    }
    showToast('Entry updated.');
  } catch (e) {
    showToast('Error saving changes.');
    console.error(e);
  }
});

// ── Delete confirm modal ──────────────────────────────────────────────────────

function handleDeleteEntry(id) {
  pendingDeleteId = id;
  confirmModal.hidden = false;
}

confirmCancelBtn.addEventListener('click', () => {
  confirmModal.hidden = true;
  pendingDeleteId = null;
});

confirmModal.addEventListener('click', e => {
  if (e.target === confirmModal) {
    confirmModal.hidden = true;
    pendingDeleteId = null;
  }
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (pendingDeleteId == null) return;
  const id = pendingDeleteId;
  pendingDeleteId = null;
  confirmModal.hidden = true;
  try {
    await deleteEntry(id);
    await Promise.all([refreshSummary(), refreshCurrentSession()]);
    if (currentDetailDate) {
      const entries = await getEntriesForDate(currentDetailDate);
      detailEntries = entries;
      renderDayDetail(recordsContent, entries, exercises, currentDetailDate, {
        onEdit: handleEditEntry,
        onDelete: handleDeleteEntry,
      });
    }
    showToast('Entry deleted.');
  } catch (e) {
    showToast('Error deleting entry.');
    console.error(e);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  await initDb();
  exercises = await getExercises();
  renderExerciseDropdown(exerciseSelect, exercises);
  entryDate.value = today();
  await Promise.all([refreshSummary(), refreshCurrentSession()]);
}

init().catch(console.error);
