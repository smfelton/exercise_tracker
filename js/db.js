import Dexie from 'https://cdn.jsdelivr.net/npm/dexie/dist/dexie.mjs';

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

export async function addExercise(exercise) {
  return await db.exercises.add(exercise);
}

export async function addEntry(entry) {
  return await db.entries.add(entry);
}

export async function getEntriesForDate(date) {
  return await db.entries.where('date').equals(date).toArray();
}

export async function getEntryCountForDate(date) {
  return await db.entries.where('date').equals(date).count();
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
  await db.entries.update(id, data);
}

export async function deleteEntry(id) {
  await db.entries.delete(id);
}

export async function importData({ exercises: importedExercises = [], entries: importedEntries = [] }) {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map(e => e.name));
  let newExerciseCount = 0;

  for (const ex of importedExercises) {
    if (!existingNames.has(ex.name)) {
      await db.exercises.add({ name: ex.name, group: ex.group, type: ex.type });
      existingNames.add(ex.name);
      newExerciseCount++;
    }
  }

  const sorted = [...importedEntries].sort((a, b) =>
    a.date.localeCompare(b.date) || a.orderPosition - b.orderPosition
  );

  const positionByDate = {};
  let entryCount = 0;

  for (const entry of sorted) {
    // Support both new format (exerciseName) and old format (exerciseId + exercises array)
    let exerciseName = entry.exerciseName;
    if (!exerciseName && entry.exerciseId !== undefined) {
      const match = importedExercises.find(e => e.id === entry.exerciseId);
      exerciseName = match?.name;
    }
    if (!exerciseName || !existingNames.has(exerciseName)) continue;

    if (positionByDate[entry.date] === undefined) {
      positionByDate[entry.date] = (await db.entries.where('date').equals(entry.date).count()) + 1;
    }
    await db.entries.add({
      exerciseName,
      date: entry.date,
      orderPosition: positionByDate[entry.date]++,
      sets: entry.sets,
    });
    entryCount++;
  }

  return { newExerciseCount, entryCount };
}

export default db;
