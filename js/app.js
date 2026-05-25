import {
  initDb, getExercises, addExercise, addEntry,
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

let recordsState = 'dates';

async function openRecords() {
  mainView.hidden = true;
  recordsView.hidden = false;
  recordsState = 'dates';
  const dates = await getAllEntryDates();
  renderDateList(recordsContent, dates, showDayDetail);
}

function closeRecords() {
  recordsView.hidden = true;
  mainView.hidden = false;
}

async function showDayDetail(date) {
  recordsState = 'detail';
  const entries = await getEntriesForDate(date);
  renderDayDetail(recordsContent, entries, exercises, date);
}

document.getElementById('records-btn').addEventListener('click', openRecords);

recordsBackBtn.addEventListener('click', async () => {
  if (recordsState === 'detail') {
    recordsState = 'dates';
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

let exercises = [];
let selectedExercise = null;

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
  renderCurrentSession(sessionContent, entries, exercises);
}

async function refreshHistory() {
  if (!selectedExercise) {
    historyContent.innerHTML = '<p class="muted-text">Select an exercise to see recent history.</p>';
    return;
  }
  const entries = await getRecentEntriesForExercise(selectedExercise.id);
  renderHistory(historyContent, entries, exercises);
}

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

async function init() {
  await initDb();
  exercises = await getExercises();
  renderExerciseDropdown(exerciseSelect, exercises);
  entryDate.value = today();
  await Promise.all([refreshSummary(), refreshCurrentSession()]);
}

init().catch(console.error);
