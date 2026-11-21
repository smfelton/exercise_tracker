// Vendored copy of Dexie 4.0.11 so the app loads offline and never picks up an
// unexpected major version from a CDN.
import Dexie from './vendor/dexie.mjs';

const SEED_EXERCISES = [
  { name: 'Dips', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell bench press', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell press', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell incline press', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell incline fly', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell shoulder fly', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, machine', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, down, with straight handle', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, down, with rope', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, up, with rope', group: 'Upper Push', type: 'Reps' },
  { name: 'Pushup', group: 'Upper Push', type: 'Reps' },
  { name: 'Lateral pull-down, wide-grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Cable row, close grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Cable row, wide grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Barbell bicep curl', group: 'Upper Pull', type: 'Reps' },
  { name: 'Dumbbell bicep curl', group: 'Upper Pull', type: 'Reps' },
  { name: 'Machine bicep curl', group: 'Upper Pull', type: 'Reps' },
  { name: 'Rear deltoid machine', group: 'Upper Pull', type: 'Reps' },
  { name: 'Face pull, with rope', group: 'Upper Pull', type: 'Reps' },
  { name: 'Leg press', group: 'Legs', type: 'Reps' },
  { name: 'Single-leg leg press', group: 'Legs', type: 'Reps' },
  { name: 'Calf press', group: 'Legs', type: 'Reps' },
  { name: 'Single-leg calf press', group: 'Legs', type: 'Reps' },
  { name: 'Seated calf raise', group: 'Legs', type: 'Reps' },
  { name: 'Standing calf raise', group: 'Legs', type: 'Reps' },
  { name: 'Ankle cable', group: 'Legs', type: 'Reps' },
  { name: 'Abduction machine', group: 'Legs', type: 'Reps' },
  { name: 'Adduction machine', group: 'Legs', type: 'Reps' },
  { name: 'Torso rotation', group: 'Core', type: 'Reps' },
  { name: 'Roman chair', group: 'Core', type: 'Reps' },
  { name: 'Roman hold', group: 'Core', type: 'Duration' },
  { name: 'Back extension machine', group: 'Core', type: 'Reps' },
  { name: 'Spine lift, dumbbell', group: 'Core', type: 'Reps' },
  { name: 'Plank', group: 'Core', type: 'Duration' },
  { name: 'Side plank', group: 'Core', type: 'Duration' },
];

const db = new Dexie('ExerciseTrackerDB');

db.version(1).stores({
  exercises: '++id, name, group, type',
  entries: '++id, exerciseId, date',
});

// Migrate entries to use exerciseName (string) instead of exerciseId (number)
db.version(2).stores({
  exercises: '++id, name, group, type',
  entries: '++id, exerciseName, date',
}).upgrade(async tx => {
  const exercises = await tx.table('exercises').toArray();
  const idToName = Object.fromEntries(exercises.map(e => [e.id, e.name]));
  await tx.table('entries').toCollection().modify(entry => {
    if (entry.exerciseId !== undefined) {
      entry.exerciseName = idToName[entry.exerciseId] ?? null;
      delete entry.exerciseId;
    }
  });
});

export async function initDb() {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map(e => e.name));
  const toAdd = SEED_EXERCISES.filter(e => !existingNames.has(e.name));
  if (toAdd.length) {
    await db.exercises.bulkAdd(toAdd);
  }
}

export async function getExercises() {
  return await db.exercises.orderBy('name').toArray();
}

export class DuplicateExerciseError extends Error {}

export async function addExercise(exercise) {
  const wanted = exercise.name.toLowerCase();
  const clash = await db.exercises.filter(e => e.name.toLowerCase() === wanted).first();
  if (clash) throw new DuplicateExerciseError(`"${clash.name}" already exists`);
  return await db.exercises.add(exercise);
}

// Next free position for a day. Uses the highest existing position rather than
// the entry count, so deleting an entry never causes two entries to share a number.
async function nextOrderPosition(date) {
  const entries = await db.entries.where('date').equals(date).toArray();
  return entries.reduce((max, e) => Math.max(max, e.orderPosition || 0), 0) + 1;
}

export async function addEntry({ exerciseName, date, sets }) {
  return await db.transaction('rw', db.entries, async () => {
    const orderPosition = await nextOrderPosition(date);
    return await db.entries.add({ exerciseName, date, orderPosition, sets });
  });
}

export async function getEntriesForDate(date) {
  return await db.entries.where('date').equals(date).toArray();
}

export async function getAllEntryDates() {
  const entries = await db.entries.toArray();
  const dates = [...new Set(entries.map(e => e.date))];
  return dates.sort((a, b) => b.localeCompare(a));
}

export async function getAllEntries() {
  return await db.entries.toArray();
}

export async function getRecentEntriesForExercise(exerciseName, limit = 2) {
  const all = await db.entries.where('exerciseName').equals(exerciseName).toArray();
  return all
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, limit);
}

export async function updateEntry(id, data) {
  await db.transaction('rw', db.entries, async () => {
    const current = await db.entries.get(id);
    if (!current) return;
    const changes = { ...data };
    // Moving an entry to another day puts it at the end of that day.
    if (data.date && data.date !== current.date) {
      changes.orderPosition = await nextOrderPosition(data.date);
    }
    await db.entries.update(id, changes);
  });
}

export async function deleteEntry(id) {
  await db.entries.delete(id);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GROUPS = ['Upper Push', 'Upper Pull', 'Legs', 'Core'];
const TYPES = ['Reps', 'Duration'];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Keep only well-formed sets, with numeric fields only.
function cleanSets(sets) {
  if (!Array.isArray(sets)) return [];
  const cleaned = [];
  for (const s of sets) {
    const reps = toNumber(s?.reps);
    const timeSeconds = toNumber(s?.timeSeconds);
    const weightLbs = toNumber(s?.weightLbs) ?? 0;
    if (reps !== undefined) cleaned.push({ reps, weightLbs });
    else if (timeSeconds !== undefined) cleaned.push({ timeSeconds, weightLbs });
  }
  return cleaned;
}

// Identifies an entry by its content, so importing the same file twice is harmless.
function entryKey(e) {
  return `${e.date}|${e.exerciseName}|${JSON.stringify(e.sets)}`;
}

export async function importData({ exercises: importedExercises = [], entries: importedEntries = [] }) {
  // One transaction: if anything fails, nothing is imported.
  return await db.transaction('rw', db.exercises, db.entries, async () => {
    const existing = await db.exercises.toArray();
    const existingNames = new Set(existing.map(e => e.name));
    const lowerNames = new Set(existing.map(e => e.name.toLowerCase()));

    const newExercises = [];
    for (const ex of importedExercises) {
      const name = typeof ex?.name === 'string' ? ex.name.trim() : '';
      if (!name || lowerNames.has(name.toLowerCase())) continue;
      newExercises.push({
        name,
        group: GROUPS.includes(ex.group) ? ex.group : 'Core',
        type: TYPES.includes(ex.type) ? ex.type : 'Reps',
      });
      existingNames.add(name);
      lowerNames.add(name.toLowerCase());
    }
    await db.exercises.bulkAdd(newExercises);

    const allEntries = await db.entries.toArray();
    const seen = new Set(allEntries.map(entryKey));
    const nextPosition = {};
    for (const e of allEntries) {
      nextPosition[e.date] = Math.max(nextPosition[e.date] || 1, (e.orderPosition || 0) + 1);
    }

    const sorted = importedEntries
      .filter(e => typeof e?.date === 'string' && DATE_RE.test(e.date))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.orderPosition || 0) - (b.orderPosition || 0));

    const newEntries = [];
    for (const entry of sorted) {
      // Support both new format (exerciseName) and old format (exerciseId + exercises array)
      let exerciseName = entry.exerciseName;
      if (!exerciseName && entry.exerciseId !== undefined) {
        exerciseName = importedExercises.find(e => e.id === entry.exerciseId)?.name;
      }
      if (!exerciseName || !existingNames.has(exerciseName)) continue;

      const sets = cleanSets(entry.sets);
      if (!sets.length) continue;

      const candidate = { exerciseName, date: entry.date, sets };
      const key = entryKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);

      const orderPosition = nextPosition[entry.date] || 1;
      nextPosition[entry.date] = orderPosition + 1;
      newEntries.push({ ...candidate, orderPosition });
    }
    await db.entries.bulkAdd(newEntries);

    return { newExerciseCount: newExercises.length, entryCount: newEntries.length };
  });
}

// Ask the browser not to clear this app's data when the device is low on space.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (e) {
    console.warn('Persistent storage request failed', e);
  }
}

export default db;
