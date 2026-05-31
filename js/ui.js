const GROUPS = ['Upper Push', 'Upper Pull', 'Legs', 'Core'];

export function renderExerciseDropdown(selectEl, exercises) {
  const byGroup = {};
  for (const g of GROUPS) byGroup[g] = [];
  for (const ex of exercises) {
    if (byGroup[ex.group]) byGroup[ex.group].push(ex);
  }

  selectEl.innerHTML = '<option value="">Select exercise</option>';

  for (const group of GROUPS) {
    const exs = byGroup[group];
    if (!exs.length) continue;
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    for (const ex of exs) {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = `${group} › ${ex.name}${ex.type === 'Duration' ? ' [duration]' : ''}`;
      optgroup.appendChild(opt);
    }
    selectEl.appendChild(optgroup);
  }
}

function buildSetRow(index, exerciseType) {
  const div = document.createElement('div');
  div.className = 'set-row';
  div.dataset.index = index;

  const primaryLabel = exerciseType === 'Reps' ? 'Reps' : 'Time (s)';

  div.innerHTML = `
    <div class="set-row-header">
      <span class="set-label">Set ${index + 1}</span>
      <button class="remove-set" type="button" data-index="${index}">Remove</button>
    </div>
    <div class="field-grid field-grid-2">
      <div class="field-group">
        <label>${primaryLabel}</label>
        <input type="number" class="set-primary" min="0" placeholder="0">
      </div>
      <div class="field-group">
        <label>Weight (lbs)</label>
        <input type="number" class="set-weight" min="0" placeholder="0">
      </div>
    </div>
  `;

  return div;
}

function syncRemoveButtons(container) {
  const rows = container.querySelectorAll('.set-row');
  const isSingle = rows.length === 1;
  rows.forEach(row => {
    const btn = row.querySelector('.remove-set');
    if (btn) btn.disabled = isSingle;
  });
}

export function renderSets(container, exerciseType) {
  container.innerHTML = '';
  container.appendChild(buildSetRow(0, exerciseType));
  syncRemoveButtons(container);
}

export function addSetRow(container, exerciseType) {
  const index = container.querySelectorAll('.set-row').length;
  container.appendChild(buildSetRow(index, exerciseType));
  syncRemoveButtons(container);
}

export function removeSetRow(container, index) {
  const row = container.querySelector(`.set-row[data-index="${index}"]`);
  if (row) row.remove();

  container.querySelectorAll('.set-row').forEach((r, i) => {
    r.dataset.index = i;
    const label = r.querySelector('.set-label');
    if (label) label.textContent = `Set ${i + 1}`;
    const btn = r.querySelector('.remove-set');
    if (btn) btn.dataset.index = i;
  });

  syncRemoveButtons(container);
}

export function collectSets(container, exerciseType) {
  const sets = [];
  for (const row of container.querySelectorAll('.set-row')) {
    const primaryVal = parseFloat(row.querySelector('.set-primary')?.value);
    const weightVal = parseFloat(row.querySelector('.set-weight')?.value);

    if (isNaN(primaryVal) || primaryVal <= 0) continue;

    const set = exerciseType === 'Reps' ? { reps: primaryVal } : { timeSeconds: primaryVal };
    set.weightLbs = isNaN(weightVal) ? 0 : weightVal;
    sets.push(set);
  }
  return sets;
}

export function renderHistory(container, entries, exercises) {
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));

  if (!entries.length) {
    container.innerHTML = '<p class="muted-text">No history found for this exercise.</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'history-list';

  for (const entry of entries) {
    const ex = exerciseMap[entry.exerciseId];
    const card = document.createElement('div');
    card.className = 'history-card';

    const setRows = entry.sets.map((set, i) => {
      let summary = `Set ${i + 1}: `;
      if (set.reps !== undefined) summary += `${set.reps} reps`;
      else if (set.timeSeconds !== undefined) summary += `${set.timeSeconds}s`;
      if (set.weightLbs !== undefined && set.weightLbs > 0) summary += ` • ${set.weightLbs} lbs`;
      return `<p class="set-summary">${summary}</p>`;
    }).join('');

    card.innerHTML = `
      <h3>${ex ? ex.name : 'Unknown exercise'}</h3>
      <p class="entry-meta">Date: ${entry.date}, position: ${entry.orderPosition}</p>
      <div class="history-item">${setRows}</div>
    `;

    list.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(list);
}

export function renderSummary(container, entries, exercises) {
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));

  if (!entries.length) {
    container.innerHTML = '<p class="muted-text">No entries recorded for today.</p>';
    return;
  }

  const groupTotals = {};
  for (const entry of entries) {
    const ex = exerciseMap[entry.exerciseId];
    if (!ex) continue;
    if (!groupTotals[ex.group]) groupTotals[ex.group] = { reps: 0, duration: 0 };
    for (const set of entry.sets) {
      if (set.reps !== undefined) groupTotals[ex.group].reps += set.reps;
      if (set.timeSeconds !== undefined) groupTotals[ex.group].duration += set.timeSeconds;
    }
  }

  const activeGroups = GROUPS.filter(g => groupTotals[g]);
  if (!activeGroups.length) {
    container.innerHTML = '<p class="muted-text">No entries recorded for today.</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'totals-list';

  for (const group of activeGroups) {
    const { reps, duration } = groupTotals[group];
    const card = document.createElement('div');
    card.className = 'total-card';

    let html = `<h3>${group}</h3>`;
    if (reps > 0) html += `<p>Total reps: ${reps}</p>`;
    if (duration > 0) html += `<p>Total duration: ${duration}s</p>`;
    card.innerHTML = html;

    list.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(list);
}

export function renderDateList(container, dates, onDateClick) {
  if (!dates.length) {
    container.innerHTML = '<p class="muted-text">No workout history yet.</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'date-list';

  for (const date of dates) {
    const row = document.createElement('button');
    row.className = 'date-row';
    row.textContent = date;
    row.addEventListener('click', () => onDateClick(date));
    list.appendChild(row);
  }

  container.innerHTML = '';
  container.appendChild(list);
}

export function renderDayDetail(container, entries, exercises, date, { onEdit, onDelete } = {}) {
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const sorted = [...entries].sort((a, b) => a.orderPosition - b.orderPosition);

  const heading = document.createElement('h3');
  heading.className = 'day-detail-heading';
  heading.textContent = date;

  const list = document.createElement('div');
  list.className = 'session-list';

  for (const entry of sorted) {
    const ex = exerciseMap[entry.exerciseId];
    const card = document.createElement('div');
    card.className = 'session-card';

    const setRows = entry.sets.map((set, i) => {
      let summary = '';
      if (set.reps !== undefined) summary += `${set.reps} reps`;
      else if (set.timeSeconds !== undefined) summary += `${set.timeSeconds}s`;
      if (set.weightLbs !== undefined && set.weightLbs > 0) summary += ` • ${set.weightLbs} lbs`;
      return `<p class="set-summary">Set ${i + 1}: ${summary}</p>`;
    }).join('');

    card.innerHTML = `
      <p class="entry-meta">Position ${entry.orderPosition}</p>
      <h3>${ex ? ex.name : 'Unknown exercise'}</h3>
      <div class="session-sets">${setRows}</div>
      <div class="card-actions">
        <button class="secondary edit-entry-btn" data-id="${entry.id}">Edit</button>
        <button class="danger delete-entry-btn" data-id="${entry.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  }

  list.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-entry-btn');
    if (editBtn && onEdit) { onEdit(parseInt(editBtn.dataset.id, 10)); return; }
    const deleteBtn = e.target.closest('.delete-entry-btn');
    if (deleteBtn && onDelete) { onDelete(parseInt(deleteBtn.dataset.id, 10)); }
  });

  container.innerHTML = '';
  container.appendChild(heading);
  container.appendChild(list);
}

export function renderCurrentSession(container, entries, exercises, { onEdit, onDelete } = {}) {
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));

  if (!entries.length) {
    container.innerHTML = '<p class="muted-text">No exercises logged today.</p>';
    return;
  }

  const sorted = [...entries].sort((a, b) => a.orderPosition - b.orderPosition);

  const list = document.createElement('div');
  list.className = 'session-list';

  for (const entry of sorted) {
    const ex = exerciseMap[entry.exerciseId];
    const card = document.createElement('div');
    card.className = 'session-card';

    const setRows = entry.sets.map((set, i) => {
      let summary = '';
      if (set.reps !== undefined) summary += `${set.reps} reps`;
      else if (set.timeSeconds !== undefined) summary += `${set.timeSeconds}s`;
      if (set.weightLbs !== undefined && set.weightLbs > 0) summary += ` • ${set.weightLbs} lbs`;
      return `<p class="set-summary">Set ${i + 1}: ${summary}</p>`;
    }).join('');

    card.innerHTML = `
      <h3>${ex ? ex.name : 'Unknown exercise'}</h3>
      <div class="session-sets">${setRows}</div>
      <div class="card-actions">
        <button class="secondary edit-entry-btn" data-id="${entry.id}">Edit</button>
        <button class="danger delete-entry-btn" data-id="${entry.id}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  }

  list.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-entry-btn');
    if (editBtn && onEdit) { onEdit(parseInt(editBtn.dataset.id, 10)); return; }
    const deleteBtn = e.target.closest('.delete-entry-btn');
    if (deleteBtn && onDelete) { onDelete(parseInt(deleteBtn.dataset.id, 10)); }
  });

  container.innerHTML = '';
  container.appendChild(list);
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}
