import Dexie from 'https://cdn.jsdelivr.net/npm/dexie/dist/dexie.mjs';

const SEED_EXERCISES = [
  { name: 'Dips', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell bench press', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell press', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell incline press', group: 'Upper Push', type: 'Reps' },
  { name: 'Dumbbell incline fly', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, machine', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, down, with straight handle', group: 'Upper Push', type: 'Reps' },
  { name: 'Tricep extension, down, with rope', group: 'Upper Push', type: 'Reps' },
  { name: 'Lateral pull-down, wide-grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Cable row, close grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Barbell bicep curl', group: 'Upper Pull', type: 'Reps' },
  { name: 'Dumbbell bicep curl', group: 'Upper Pull', type: 'Reps' },
  { name: 'Machine bicep curl', group: 'Upper Pull', type: 'Reps' },
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

export async function initDb() {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkAdd(SEED_EXERCISES);
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

export async function getRecentEntriesForExercise(exerciseId, limit = 2) {
  const all = await db.entries.where('exerciseId').equals(exerciseId).toArray();
  return all
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, limit);
}

export default db;
